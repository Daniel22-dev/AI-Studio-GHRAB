#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const checkOnly = process.argv.includes('--check');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'src/config/apps.generated.json'), 'utf8'));
const versions = new Map(registry.map((app) => [app.id, String(app.version)]));
const v = (id) => {
  const value = versions.get(id);
  if (!value) throw new Error(`Registr neobsahuje aplikaci ${id}.`);
  return value;
};
const summary = `KS ${v('correspondence')}, SORTIO ${v('sortio')}, Lesson Hub ${v('lesson-hub')}, Diferenciátor ${v('differentiator')}, ACTIVA ${v('activity-builder')}, Hodnotitel ${v('essay-evaluator')}, LUDUS ${v('ludus')} a Generátor ${v('generator')}`;
const bootstrapSentence = `Ochranný bootstrap je integrován v Generátoru ${v('generator')}, Diferenciátoru ${v('differentiator')}, Hodnotiteli maturitních slohů ${v('essay-evaluator')}, LUDUSu ${v('ludus')}, Korespondenčním asistentovi ${v('correspondence')}, ACTIVA ${v('activity-builder')}, SORTIO ${v('sortio')} a Lesson Hubu ${v('lesson-hub')}.`;
const integrationSentence = `Integrace je dokončena v Generátoru ${v('generator')}, Diferenciátoru ${v('differentiator')}, Hodnotiteli maturitních slohů ${v('essay-evaluator')}, LUDUSu ${v('ludus')}, Korespondenčním asistentovi ${v('correspondence')}, ACTIVA ${v('activity-builder')}, SORTIO ${v('sortio')} a Lesson Hubu ${v('lesson-hub')}.`;
const integrationList = [
  `- Generátor interaktivních testů ${v('generator')} — ID \`generator\`,`,
  `- Diferenciátor ${v('differentiator')} — ID \`differentiator\`,`,
  `- Hodnotitel maturitních slohů ${v('essay-evaluator')} — ID \`essay-evaluator\`,`,
  `- LUDUS ${v('ludus')} — ID \`ludus\`,`,
  `- Korespondenční asistent ${v('correspondence')} — ID \`correspondence\`,`,
  `- ACTIVA ${v('activity-builder')} — ID \`activity-builder\`,`,
  `- SORTIO ${v('sortio')} — ID \`sortio\`,`,
  `- Lesson Hub ${v('lesson-hub')} — ID \`lesson-hub\`.`,
].join('\n');
const uploadList = [
  `1. Korespondenční asistent ${v('correspondence')}`,
  `2. SORTIO ${v('sortio')}`,
  `3. Lesson Hub ${v('lesson-hub')}`,
  `4. Diferenciátor ${v('differentiator')}`,
  `5. ACTIVA ${v('activity-builder')}`,
  `6. Hodnotitel maturitních slohů ${v('essay-evaluator')}`,
  `7. LUDUS ${v('ludus')}`,
  `8. Generátor interaktivních testů ${v('generator')}`,
].join('\n');

const transforms = {
  'README.md': (text) => text.replace(/^- Registr Studia je synchronizován s verzemi .*$/m, `- Registr Studia je synchronizován s verzemi ${summary}.`),
  'BEZPECNOST.md': (text) => text.replace(/^Ochranný bootstrap je integrován v .*?(?= Běžný vstupní bod)/m, bootstrapSentence),
  'POSTUP-NAHRANI.md': (text) => text.replace(/^Nejprve musí být nasazeny .*?(?= Jejich lokální reportér)/m, `Nejprve musí být nasazeny ${summary}.`),
  'NAHRANI-NA-GITHUB.md': (text) => text.replace(/^1\. Korespondenční asistent .*?^8\. Generátor interaktivních testů .*$/ms, uploadList),
  'docs/INTEGRACE-APLIKACI.md': (text) => text
    .replace(/^# Integrace samostatných aplikací — AI Studio .*$/m, '# Integrace samostatných aplikací — aktuální registr')
    .replace(/^Integrace je dokončena v .*?(?= Ochrana se nevztahuje)/m, integrationSentence),
  'src/integration/README.md': (text) => text
    .replace(/^## Stav ve verzi .*$/m, '## Aktuální stav registru')
    .replace(/^- Generátor interaktivních testů .*?^- Lesson Hub .*?\.$/ms, integrationList),
};

let changed = 0;
for (const [relative, transform] of Object.entries(transforms)) {
  const file = path.join(root, relative);
  const before = fs.readFileSync(file, 'utf8');
  const after = transform(before);
  if (after === before) continue;
  changed += 1;
  if (!checkOnly) fs.writeFileSync(file, after);
  else console.error(`Neaktuální aplikační verze v ${relative}.`);
}
if (checkOnly && changed) process.exit(1);
console.log(checkOnly ? `Dokumentace aplikací odpovídá registru (${registry.length} aplikací).` : `Synchronizováno ${changed} dokumentů podle registru (${registry.length} aplikací).`);
