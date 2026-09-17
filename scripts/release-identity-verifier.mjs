import crypto from 'node:crypto';

const SHA40 = /^[0-9a-f]{40}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;
const hex = (data) => crypto.createHash('sha256').update(data).digest('hex');

export function computeArtifactDigest(files) {
  const rows = [...files].sort((a, b) =>
    Buffer.compare(Buffer.from(String(a.path).normalize('NFC'), 'utf8'), Buffer.from(String(b.path).normalize('NFC'), 'utf8')),
  );
  const header = `ghrab-artifact-digest-v2\0${rows.length}\n`;
  const body = rows.map((file) => `${String(file.path).normalize('NFC')}\0${file.sha256}\0${file.size}\n`).join('');
  return hex(Buffer.from(header + body, 'utf8'));
}

async function fetchBytes(url, { timeoutMs = 12000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'AI-Studio-GHRAB-release-identity' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
    return Buffer.from(await response.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, options) {
  const bytes = await fetchBytes(url, options);
  try {
    return { value: JSON.parse(bytes.toString('utf8')), bytes };
  } catch (error) {
    throw new Error(`neplatný JSON ${url}: ${error.message}`);
  }
}

function assertSha256(label, value) {
  if (!SHA256.test(String(value || ''))) throw new Error(`${label} není SHA-256`);
}

function normalizeRepository(value) {
  return String(value || '').trim().toLowerCase();
}

export async function verifyDeploymentReleaseIdentity({ app, source }) {
  const contract = app?.releaseIdentity?.contract || null;
  if (!contract) {
    return {
      status: 'ABSENT',
      contract: null,
      assuranceMode: null,
    };
  }
  if (contract !== 'ghrab-release-integrity-v2') {
    throw new Error(`nepodporovaný releaseIdentity contract ${contract}`);
  }

  const baseUrl = new URL('.', source.url);
  const integrityUrl = new URL(app.releaseIdentity.url || './release-integrity.json', baseUrl).href;
  if (!integrityUrl.startsWith(baseUrl.href)) throw new Error('releaseIdentity URL opouští povolený deployment prefix');

  const { value: integrity } = await fetchJson(integrityUrl);
  if (integrity.schema !== 'ghrab-release-integrity-v2') throw new Error('release-integrity má neplatné schema');
  if (integrity.digestAlgorithmId !== 'ghrab-artifact-digest-v2') throw new Error('release-integrity má neplatný digestAlgorithmId');
  if (integrity.hashAlgorithm !== 'SHA-256') throw new Error('release-integrity nepoužívá SHA-256');
  if (integrity.appId !== app.id || integrity.version !== app.version) throw new Error('release-integrity appId/version drift');
  if (!SHA40.test(String(integrity.sourceCommit || ''))) throw new Error('release-integrity nemá platný sourceCommit');
  assertSha256('artifactDigest', integrity.artifactDigest);
  assertSha256('manifestSha256', integrity.manifestSha256);
  assertSha256('sbomSha256', integrity.sbomSha256);
  assertSha256('buildProvenanceSha256', integrity.buildProvenanceSha256);
  assertSha256('evidenceManifestSha256', integrity.evidenceManifestSha256);
  if (integrity.assuranceMode !== 'TRANSITIONAL') throw new Error('release-integrity musí být explicitně TRANSITIONAL, dokud není ověřen produkční podpisový řetězec');
  if (!Array.isArray(integrity.files) || !integrity.files.length) throw new Error('release-integrity nemá files');
  if (integrity.fileCount !== integrity.files.length) throw new Error('release-integrity fileCount drift');

  const seen = new Set();
  const verifiedRows = [];
  for (const file of integrity.files) {
    const rel = String(file?.path || '').normalize('NFC');
    if (!rel || rel.startsWith('/') || rel.includes('..') || seen.has(rel)) throw new Error(`neplatná/duplicitní artifact cesta ${rel || '?'}`);
    seen.add(rel);
    assertSha256(`file.sha256 ${rel}`, file.sha256);
    if (!Number.isInteger(file.size) || file.size < 0) throw new Error(`neplatná velikost ${rel}`);
    const fileUrl = new URL(rel.split('/').map(encodeURIComponent).join('/'), baseUrl).href;
    if (!fileUrl.startsWith(baseUrl.href)) throw new Error(`artifact cesta opouští deployment prefix: ${rel}`);
    const bytes = await fetchBytes(fileUrl);
    if (bytes.length !== file.size) throw new Error(`artifact size drift ${rel}`);
    const actualSha = hex(bytes);
    if (actualSha !== file.sha256) throw new Error(`artifact sha256 drift ${rel}`);
    verifiedRows.push({ path: rel, size: bytes.length, sha256: actualSha });
  }
  const computedArtifactDigest = computeArtifactDigest(verifiedRows);
  if (computedArtifactDigest !== integrity.artifactDigest) throw new Error('artifactDigest neodpovídá skutečně nasazeným souborům');

  const studioManifestBytes = await fetchBytes(source.url);
  if (hex(studioManifestBytes) !== integrity.manifestSha256) throw new Error('manifestSha256 neodpovídá nasazenému studio-manifest.json');

  const evidenceFiles = [
    ['sbom.cdx.json', integrity.sbomSha256],
    ['build-provenance.json', integrity.buildProvenanceSha256],
    ['security-evidence-manifest.json', integrity.evidenceManifestSha256],
  ];
  for (const [name, expectedSha] of evidenceFiles) {
    const bytes = await fetchBytes(new URL(name, baseUrl).href);
    if (hex(bytes) !== expectedSha) throw new Error(`${name} digest drift`);
  }

  const { value: provenance } = await fetchJson(new URL('build-provenance.json', baseUrl).href);
  if (provenance.schema !== 'ghrab-build-provenance-v1') throw new Error('build provenance schema drift');
  if (String(provenance.source?.revision || '').toLowerCase() !== String(integrity.sourceCommit).toLowerCase()) throw new Error('build provenance source commit drift');
  if (normalizeRepository(provenance.source?.repository) !== normalizeRepository(source.repository)) throw new Error('build provenance repository drift');

  const { value: evidence } = await fetchJson(new URL('security-evidence-manifest.json', baseUrl).href);
  if (evidence.schema !== 'ghrab-security-evidence-manifest-v1') throw new Error('security evidence schema drift');
  if (evidence.appId !== app.id || evidence.version !== app.version) throw new Error('security evidence app/version drift');
  if (String(evidence.sourceRevision || '').toLowerCase() !== String(integrity.sourceCommit).toLowerCase()) throw new Error('security evidence source commit drift');

  const repo = source.repository;
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo || '')) throw new Error('registrovaný repository identifikátor je neplatný');
  const sourcePackageUrl = `https://raw.githubusercontent.com/${repo}/${integrity.sourceCommit}/package.json`;
  const { value: sourcePackage } = await fetchJson(sourcePackageUrl);
  if (sourcePackage.version !== app.version) throw new Error(`source commit package version ${sourcePackage.version || '?'} != deployment ${app.version}`);

  return {
    status: 'VERIFIED',
    contract,
    assuranceMode: integrity.assuranceMode,
    appId: app.id,
    version: app.version,
    sourceCommit: integrity.sourceCommit.toLowerCase(),
    artifactDigest: integrity.artifactDigest,
    manifestSha256: integrity.manifestSha256,
    sbomSha256: integrity.sbomSha256,
    buildProvenanceSha256: integrity.buildProvenanceSha256,
    evidenceManifestSha256: integrity.evidenceManifestSha256,
    signatureStatus: integrity.signature?.status || 'UNKNOWN',
    releaseIdentityUrl: integrityUrl,
    verifiedFileCount: verifiedRows.length,
  };
}
