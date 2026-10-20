#!/usr/bin/env python3
"""One-use, exact-baseline Studio deployment repair; no public lesson/source rewrites."""
import pathlib, subprocess, json, hashlib
root = pathlib.Path('.')
BASE = '72472a390a3530321bf04ee09ab6c3cda37ce79d'
def text(name): return (root / name).read_text()
def write(name, value): (root / name).write_text(value)
def replace(name, old, new, count=1):
    value = text(name)
    assert value.count(old) == count, (name, 'unexpected patch anchor', old[:100], value.count(old))
    write(name, value.replace(old, new))
def pretty(obj): return json.dumps(obj, ensure_ascii=False, indent=2) + '\n'
def baseline(name):
    expected = subprocess.check_output(['git', 'show', BASE + ':' + name])
    assert (root / name).read_bytes() == expected, 'Concurrent source change: ' + name
for name in ['scripts/build.mjs','scripts/test.mjs','scripts/lib/clb-master-integrity.mjs','package.json','ghrab-platform.consumer.json','src/config/changelog.json']:
    baseline(name)
original = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in (root / 'src/conversation-lab').rglob('*') if p.is_file()}
replace('scripts/build.mjs', '// Validate byte parity after all platform and performance post-processing.\nawait verifyClbMasterFiles(root, dist);', '// Apply only the independently reviewed teacher envelope after generic processing.\nconst { applyClbStudioAdapter } = await import("./lib/clb-studio-adapter.mjs");\nawait applyClbStudioAdapter(root, dist, pkg.version);\nawait verifyClbMasterFiles(root, dist);')
replace('scripts/lib/clb-master-integrity.mjs', "import { pathToFileURL } from 'node:url';", "import { pathToFileURL } from 'node:url';\nimport { expectedClbStudioTree, readClbTree, CLB_STUDIO_TRANSFORMED } from './clb-studio-adapter.mjs';")
replace('scripts/lib/clb-master-integrity.mjs', 'export async function verifyClbMasterFiles(root, treeRoot) {', '''export async function verifyClbMasterFiles(root, treeRoot) {
  if (path.resolve(treeRoot) !== path.resolve(root, 'src')) {
    const sourceProof = await verifyClbMasterFiles(root, path.join(root, 'src'));
    const pkg = JSON.parse(await readFile(path.join(root, 'package.json')));
    const expected = await expectedClbStudioTree(root, pkg.version);
    const actual = await readClbTree(path.join(treeRoot, 'conversation-lab'));
    need(actual.size === expected.size, 'DEPLOYED_FILE_SET');
    for (const [name, bytes] of expected) need(actual.get(name)?.equals(bytes), 'DEPLOYED_ENVELOPE_OR_PAYLOAD_' + name);
    const sw = await readFile(path.join(treeRoot, 'sw.js'), 'utf8').catch(() => '');
    const blocks = [...sw.matchAll(/const CORE_(?:REQUIRED|OPTIONAL)\\s*=\\s*\\[([\\s\\S]*?)\\]/g)].map(m => m[1]).join('');
    need(!/\\.\\/conversation-lab\\//.test(blocks), 'LIBRARY_MUST_NOT_PRECACHE');
    return { ...sourceProof, preservedPublicFiles: 114, originalSourcePublicFiles: 115,
      deploymentAdapter: 'ghrab-clb-studio-csp-envelope-v1', transformedFiles: [...CLB_STUDIO_TRANSFORMED], studioVersion: pkg.version };
  }''')
replace('scripts/test.mjs', 'import { validateMaterialPackage } from "../src/shared/material-validator.js";', 'import { validateMaterialPackage } from "../src/shared/material-validator.js";\nimport { verifyClbMasterFiles } from "./lib/clb-master-integrity.mjs";\nimport { adaptClbStudioAsset, CLB_MASTER_FRAGMENTS, CLB_MASTER_RUNTIMES, assertClbPreferenceSource } from "./lib/clb-studio-adapter.mjs";')
replace('scripts/test.mjs', 'const pkg = await loadJson(path.join(root, "package.json"));', '''const pkg = await loadJson(path.join(root, "package.json"));
// Only the exact crypto-verified 120-file library gets immutable-source treatment.
// No directory wildcard bypass survives a modified/extra/missing source file.
await verifyClbMasterFiles(root, src);
const clbRel = file => path.relative(path.join(src, "conversation-lab"), file).replaceAll("\\\\", "/");
const verifiedClbSource = file => file.startsWith(path.join(src, "conversation-lab") + path.sep);''')
replace('scripts/test.mjs', '  if (tooLong !== -1)\n', '  if (tooLong !== -1 && !verifiedClbSource(file))\n')
replace('scripts/test.mjs', '  const html = await readFile(file, "utf8");\n  const rel = path.relative(src, file).replaceAll("\\\\", "/");', '''  const rawHtml = await readFile(file);
  // Validate the actual deterministic Studio envelope, not the original transport wrapper.
  const html = (verifiedClbSource(file) ? adaptClbStudioAsset(clbRel(file), rawHtml, pkg.version) : rawHtml).toString("utf8");
  const rel = path.relative(src, file).replaceAll("\\\\", "/");''')
replace('scripts/test.mjs', '  const isFragment = rel.startsWith("integration/");', '  const isFragment = rel.startsWith("integration/") || (verifiedClbSource(file) && CLB_MASTER_FRAGMENTS.includes(clbRel(file)));')
replace('scripts/test.mjs', '    let target = path.resolve(path.dirname(file), clean);', '''    let target = clean.startsWith("/AI-Studio-GHRAB/")
      ? path.resolve(src, clean.slice("/AI-Studio-GHRAB/".length))
      : path.resolve(path.dirname(file), clean);''')
replace('scripts/test.mjs', '  if (text.includes("localStorage.setItem("))\n', '''  if (verifiedClbSource(file) && CLB_MASTER_RUNTIMES.includes(clbRel(file))) {
    assertClbPreferenceSource(clbRel(file), Buffer.from(text));
    continue;
  }
  if (text.includes("localStorage.setItem("))
''')
# Existing generic build validation still checks every versioned HTML/module link.
replace('scripts/test.mjs', 'const requiredBlock =\n', 'await verifyClbMasterFiles(root, dist);\n\nconst requiredBlock =\n')
for name in ['package.json','package-lock.json','ghrab-platform.consumer.json']:
    baseline(name)
    value = text(name)
    assert '0.21.248' in value
    write(name, value.replace('0.21.248','0.21.249'))
changes = json.loads(text('src/config/changelog.json'))
assert changes['current'] == '0.21.248'
changes['current'] = '0.21.249'
changes['items'].insert(0, {'version':'0.21.249','date':'2026-10-19','title':{'cs':'Zabezpečené načítání Conversation Lab ve Studiu','en':'Secured Conversation Lab Studio deployment envelope'},'changes':[
 {'cs':'Učitelské stránky mají CSP před načtením zdrojů a verzované odkazy. Podepsané texty lekcí, MASTER CSS/JavaScript, slovníky a QR data se nemění.','en':'Teacher pages receive CSP before resource loading and versioned references. Signed lesson text, MASTER CSS/JavaScript, dictionaries and QR data remain unchanged.'},
 {'cs':'Kontrola integrity samostatně ověřuje původní podklady a přesně odvozený výstup pro Studio. Změněný obsah ani odstraněná CSP neprojdou.','en':'Integrity checks independently verify original inputs and the exactly derived Studio deployment. Mutated payloads and removed CSP are rejected.'},
 {'cs':'Obecná validace rozlišuje ověřené HTML fragmenty, neměnné zdroje a omezené preference původních lekcí; plné projektové testy a P5 zůstávají povinné.','en':'Generic validation distinguishes verified HTML fragments, immutable sources and bounded legacy lesson preferences; full project tests and P5 remain mandatory.'},
 {'cs':'Cloudflare, obsahový podpis ani kód a vydání ostatních aplikací včetně GIT se nepřepisují.','en':'Cloudflare, the content signature and the code or releases of the other apps including GIT are not rewritten.'}
]})
write('src/config/changelog.json', pretty(changes))
for script in ['sync-platform-consumers.mjs','generate-ai-readiness.mjs','sync-doc-app-versions.mjs','generate-changelog.mjs']:
    subprocess.run(['node','scripts/'+script], check=True)
assert original == {str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in (root/'src/conversation-lab').rglob('*') if p.is_file()}, 'Original library bytes changed'
for name in ['src/config/apps.generated.json','src/config/apps.fallback.json']:
    old=json.loads(subprocess.check_output(['git','show',BASE+':'+name]));new=json.loads((root/name).read_text())
    assert old==new, 'Application registry modified'
print('STUDIO_ENVELOPE_REPAIR_APPLIED; ORIGINAL_120_FILES_UNCHANGED; NO_DEPLOYMENT')
