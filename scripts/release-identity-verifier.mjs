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

const TRANSIENT_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);

const retryDelay = (attempt) =>
  new Promise((resolve) => setTimeout(resolve, Math.min(2000, 350 * (2 ** (attempt - 1)))));

async function fetchBytes(url, { timeoutMs = 12000, maxAttempts = 3 } = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'user-agent': 'AI-Studio-GHRAB-release-identity' },
      });

      if (response.ok) return Buffer.from(await response.arrayBuffer());

      const error = new Error(`HTTP ${response.status} ${url}`);
      if (!TRANSIENT_HTTP.has(response.status) || attempt === maxAttempts) throw error;
      lastError = error;
      console.warn(
        `Release identity fetch retry ${attempt}/${maxAttempts - 1}: HTTP ${response.status} ${url}`,
      );
    } catch (error) {
      const retryableNetworkError =
        error?.name === 'AbortError' ||
        error?.name === 'TimeoutError' ||
        error instanceof TypeError;

      if (!retryableNetworkError || attempt === maxAttempts) throw error;
      lastError = error;
      console.warn(
        `Release identity fetch retry ${attempt}/${maxAttempts - 1}: ${error?.name || 'network error'} ${url}`,
      );
    } finally {
      clearTimeout(timer);
    }

    await retryDelay(attempt);
  }

  throw lastError || new Error(`fetch selhal ${url}`);
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
  const releaseContract = app?.releaseIdentity?.contract || null;
  const assuranceContract = app?.assurance?.schema || null;

  if (!releaseContract && assuranceContract === 'ghrab-patch-assurance-v1') {
    const baseUrl = new URL('.', source.url);
    const assuranceUrl = new URL(app.assurance.evidenceManifestUrl || './patch-assurance.json', baseUrl).href;
    if (!assuranceUrl.startsWith(baseUrl.href)) throw new Error('patch assurance URL opouští povolený deployment prefix');
    assertSha256('assurance.evidenceManifestSha256', app.assurance.evidenceManifestSha256);

    const assuranceBytes = await fetchBytes(assuranceUrl);
    if (hex(assuranceBytes) !== app.assurance.evidenceManifestSha256) throw new Error('patch-assurance digest neodpovídá Studio manifestu');

    let assurance;
    try {
      assurance = JSON.parse(assuranceBytes.toString('utf8'));
    } catch (error) {
      throw new Error(`neplatný patch-assurance JSON: ${error.message}`);
    }
    if (assurance.schema !== 'ghrab-patch-assurance-manifest-v1') throw new Error('patch-assurance má neplatné schema');
    if (assurance.appId !== app.id || assurance.version !== app.version) throw new Error('patch-assurance appId/version drift');
    if (assurance.algorithm !== 'SHA-256') throw new Error('patch-assurance nepoužívá SHA-256');
    if (!SHA40.test(String(assurance.sourceRevision || ''))) throw new Error('patch-assurance nemá platný sourceRevision');

    const requiredArtifacts = [
      ['securityEvidenceManifest', 'ghrab-security-evidence-manifest-v2'],
      ['sourceSbom', 'CycloneDX'],
      ['deploymentSbom', 'CycloneDX'],
      ['aiAssuranceFingerprint', 'ghrab-ai-assurance-fingerprint-v2'],
    ];
    const verifiedArtifacts = {};
    for (const [name] of requiredArtifacts) {
      const ref = assurance.artifacts?.[name];
      if (!ref?.url) throw new Error(`patch-assurance chybí artifact ${name}`);
      assertSha256(`patch-assurance ${name}.sha256`, ref.sha256);
      const artifactUrl = new URL(ref.url, baseUrl).href;
      if (!artifactUrl.startsWith(baseUrl.href)) throw new Error(`patch-assurance artifact ${name} opouští deployment prefix`);
      const bytes = await fetchBytes(artifactUrl);
      if (hex(bytes) !== ref.sha256) throw new Error(`patch-assurance artifact digest drift ${name}`);
      let value;
      try {
        value = JSON.parse(bytes.toString('utf8'));
      } catch (error) {
        throw new Error(`patch-assurance artifact ${name} není platný JSON: ${error.message}`);
      }
      verifiedArtifacts[name] = { ref, value };
    }

    const evidence = verifiedArtifacts.securityEvidenceManifest.value;
    if (evidence.schema !== 'ghrab-security-evidence-manifest-v2') throw new Error('patch-assurance security evidence schema drift');
    if (evidence.appId !== app.id || evidence.version !== app.version) throw new Error('patch-assurance security evidence app/version drift');
    if (!SHA40.test(String(evidence.sourceRevision || ''))) throw new Error('patch-assurance security evidence nemá platný sourceRevision');
    if (String(evidence.sourceRevision).toLowerCase() !== String(assurance.sourceRevision).toLowerCase()) throw new Error('patch-assurance sourceRevision/evidence drift');

    for (const name of ['sourceSbom','deploymentSbom']) {
      const sbom = verifiedArtifacts[name].value;
      if (sbom.bomFormat !== 'CycloneDX') throw new Error(`patch-assurance ${name} není CycloneDX`);
      const componentVersion = sbom.metadata?.component?.version;
      if (componentVersion && componentVersion !== app.version) throw new Error(`patch-assurance ${name} version drift`);
    }

    const fingerprint = verifiedArtifacts.aiAssuranceFingerprint.value;
    if (fingerprint.schema !== 'ghrab-ai-assurance-fingerprint-v2') throw new Error('patch-assurance AI fingerprint schema drift');
    if (fingerprint.appId !== app.id || fingerprint.appVersion !== app.version) throw new Error('patch-assurance AI fingerprint app/version drift');

    const repo = source.repository;
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo || '')) throw new Error('registrovaný repository identifikátor je neplatný');
    const sourcePackageUrl = `https://raw.githubusercontent.com/${repo}/${assurance.sourceRevision}/package.json`;
    const { value: sourcePackage } = await fetchJson(sourcePackageUrl);
    if (sourcePackage.version !== app.version) throw new Error(`source commit package version ${sourcePackage.version || '?'} != deployment ${app.version}`);

    return {
      status: 'VERIFIED',
      contract: 'ghrab-patch-assurance-v1',
      assuranceMode: 'FOUNDATION',
      appId: app.id,
      version: app.version,
      sourceCommit: String(assurance.sourceRevision).toLowerCase(),
      patchAssuranceSha256: hex(assuranceBytes),
      securityEvidenceManifestSha256: verifiedArtifacts.securityEvidenceManifest.ref.sha256,
      sourceSbomSha256: verifiedArtifacts.sourceSbom.ref.sha256,
      deploymentSbomSha256: verifiedArtifacts.deploymentSbom.ref.sha256,
      aiAssuranceFingerprintSha256: verifiedArtifacts.aiAssuranceFingerprint.ref.sha256,
      releaseIdentityUrl: assuranceUrl,
      signatureStatus: 'NOT_APPLICABLE',
    };
  }

  const contract = releaseContract;
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
