/** Studio-only deterministic envelope. The signed lesson payload is never rewritten. */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const sha = b => createHash('sha256').update(b).digest('hex');
const need = (ok, message) => { if (!ok) throw Error('CLB_STUDIO_ADAPTER_' + message); };
export const CLB_STUDIO_CSP = "default-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self'; style-src-attr 'none'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; worker-src 'none'; manifest-src 'none'";
export const CLB_STUDIO_DOCUMENTS = Object.freeze(['index.html', '404.html', 'manual/index.html']);
const topics = ['artificial-intelligence', 'summer-holidays', 'the-pressure-to-succeed'];
export const CLB_MASTER_FRAGMENTS = Object.freeze(topics.map(t => 'assets/masters/' + t + '.html'));
export const CLB_MASTER_RUNTIMES = Object.freeze(topics.map(t => 'assets/masters/' + t + '.js'));
export const CLB_STUDIO_TRANSFORMED = Object.freeze([...CLB_STUDIO_DOCUMENTS, 'teacher-entry.js', 'teacher-integrity.json']);
function revision(ref, version) {
  need(/^\d+\.\d+\.\d+$/.test(version), 'VERSION');
  need(!/^(?:[a-z]+:|\/\/|#|data:|blob:)/i.test(ref), 'NONLOCAL_ENVELOPE_REFERENCE');
  return ref + (ref.includes('?') ? '&' : '?') + 'v=' + version;
}
export function adaptClbStudioAsset(name, bytes, version) {
  need(Buffer.isBuffer(bytes), 'BUFFER_REQUIRED');
  need(/^\d+\.\d+\.\d+$/.test(version), 'VERSION');
  if (CLB_STUDIO_DOCUMENTS.includes(name)) {
    let text = bytes.toString('utf8');
    need((text.match(/<head>/gi) || []).length === 1 && !/http-equiv=["']Content-Security-Policy/i.test(text), 'SOURCE_ENVELOPE_DRIFT');
    // Meta CSP must precede every fetch. Unsupported meta directives such as
    // frame-ancestors are deliberately NOT claimed here; teacher top-frame gate remains enforced.
    text = text.replace(/<head>/i, '<head>\n<meta http-equiv="Content-Security-Policy" content="' + CLB_STUDIO_CSP + '">');
    text = text.replace(/(<script\b[^>]*\bsrc=["'])([^"']+\.js(?:\?[^"']*)?)(["'])/gi, (_m, a, ref, z) => a + revision(ref, version) + z);
    text = text.replace(/(<link\b(?=[^>]*\brel=["']stylesheet["'])[^>]*\bhref=["'])([^"']+\.css(?:\?[^"']*)?)(["'])/gi, (_m, a, ref, z) => a + revision(ref, version) + z);
    return Buffer.from(text);
  }
  if (name === 'teacher-entry.js') {
    const text = bytes.toString('utf8');
    let count = 0;
    const changed = text.replace(/(\bfrom\s*["'])(\.{1,2}\/[^"']+?\.js)(["'])/g, (_m, a, ref, z) => { count++; return a + revision(ref, version) + z; });
    need(count === 4, 'TEACHER_IMPORT_GRAPH_DRIFT');
    return Buffer.from(changed);
  }
  return bytes;
}
export async function readClbTree(directory) {
  const result = new Map();
  async function walk(dir, prefix = '') {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      need(!entry.isSymbolicLink(), 'SYMLINK');
      const name = prefix + entry.name;
      if (entry.isDirectory()) await walk(path.join(dir, entry.name), name + '/');
      else { need(entry.isFile(), 'NON_FILE'); result.set(name, await readFile(path.join(dir, entry.name))); }
    }
  }
  await walk(directory);
  return result;
}
export async function expectedClbStudioTree(root, version) {
  const source = await readClbTree(path.join(root, 'src/conversation-lab'));
  need(source.size === 120, 'SOURCE_FILE_COUNT');
  const expected = new Map([...source].map(([name, bytes]) => [name, adaptClbStudioAsset(name, bytes, version)]));
  const original = source.get('teacher-integrity.json');
  const inventory = JSON.parse(original);
  inventory.studioDeploymentAdapter = {
    schema: 'ghrab-clb-studio-csp-envelope-v1', studioVersion: version,
    sourceTeacherInventorySha256: sha(original),
    changedFiles: [...CLB_STUDIO_TRANSFORMED],
    publicLessonRuntimeOrContentChanged: false,
    originalContentSignatureExtendedToEnvelope: false,
    sourcePublicFilesPreserved: 115, deployedPublicFilesByteIdentical: 114,
    cspDelivery: 'HTML_META_BEFORE_RESOURCE_LOADS_NOT_HTTP_FRAME_ANCESTORS'
  };
  inventory.files = Object.fromEntries([...expected].filter(([n]) => n !== 'teacher-integrity.json').sort(([a], [b]) => a.localeCompare(b)).map(([n, b]) => [n, { size: b.length, sha256: sha(b) }]));
  expected.set('teacher-integrity.json', Buffer.from(JSON.stringify(inventory) + '\n'));
  return expected;
}
export async function applyClbStudioAdapter(root, destination, version) {
  need(path.resolve(destination) !== path.resolve(root, 'src'), 'REFUSE_SOURCE_WRITE');
  const expected = await expectedClbStudioTree(root, version);
  for (const name of CLB_STUDIO_TRANSFORMED) await writeFile(path.join(destination, 'conversation-lab', name), expected.get(name));
}
export function assertClbPreferenceSource(name, bytes) {
  need(CLB_MASTER_RUNTIMES.includes(name), 'PREFERENCE_SCOPE');
  const text = bytes.toString('utf8');
  need((text.match(/localStorage\.setItem\(/g) || []).length === 1 && (text.match(/localStorage\.getItem\(/g) || []).length === 1, 'PREFERENCE_IO_COUNT');
  need(/const STORAGE\s*=\s*['"]conversation-lab-[a-z-]+-v1['"]/.test(text), 'PREFERENCE_KEY');
  need(text.includes('function savePrefs(){try{localStorage.setItem(STORAGE,JSON.stringify({lang,level,theme,current}));}catch(_){}'), 'PREFERENCE_WRITE_NOT_BOUNDED');
  need(text.includes("function loadPrefs(){try{const x=JSON.parse(localStorage.getItem(STORAGE)||'{}');if(CONTENT[x.lang])lang=x.lang;if(ORDER.includes(x.level))level=x.level;if(['light','dark'].includes(x.theme))theme=x.theme;if(Number.isInteger(x.current)&&x.current>=0&&x.current<8)current=x.current;}catch(_){}}"), 'PREFERENCE_READ_NOT_BOUNDED');
  need(!/sessionStorage|indexedDB/.test(text), 'PREFERENCE_OTHER_STORAGE');
  return true;
}
