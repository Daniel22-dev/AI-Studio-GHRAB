import { createHandoffTransport, inspectOutboundMaterial, resolveTargets, validateRegistry } from './material-flow.js';

const reasons = {
  'compatible': ['Obsah lze bezpe\u010dn\u011b p\u0159ipravit pro tuto aplikaci.', 'The content can be prepared for this application.'],
  'no-import-contract': ['Aplikace nem\u00e1 ov\u011b\u0159en\u00fd importn\u00ed kontrakt.', 'No verified import contract.'],
  'unverified-inbound': ['P\u0159\u00edjem materi\u00e1lu je\u0161t\u011b nen\u00ed ov\u011b\u0159en.', 'Inbound material support is not verified.'],
  'inbound-disabled': ['P\u0159ed\u00e1v\u00e1n\u00ed je pro tuto aplikaci vypnuto.', 'Inbound flow is disabled.'],
  'different-origin': ['Aplikace pou\u017e\u00edv\u00e1 jinou webovou dom\u00e9nu. Lok\u00e1ln\u00ed p\u0159ed\u00e1n\u00ed nen\u00ed mo\u017en\u00e9.', 'The application uses another web origin; local transfer is unavailable.'],
  'invalid-launch-url': ['C\u00edlov\u00e1 adresa nen\u00ed bezpe\u010dn\u00e1.', 'The target URL is not safe.'],
  'launch-url-mismatch': ['C\u00edlov\u00e1 adresa neodpov\u00edd\u00e1 registru.', 'The launch URL does not match the registry.'],
  'privacy-not-confirmed': ['Materi\u00e1l nen\u00ed potvrzen jako anonymn\u00ed. Upravte jej v editoru.', 'The resource was not confirmed anonymous. Edit it first.'],
  'personal-information': ['Materi\u00e1l z\u0159ejm\u011b obsahuje e-mail nebo osobn\u00ed \u00fadaj.', 'Possible email or personal information detected.'],
  'student-record-field': ['Bal\u00ed\u010dek obsahuje pole se studentsk\u00fdmi \u00fadaji.', 'Student records must not be transferred.'],
  'unsafe-markup': ['Bal\u00ed\u010dek obsahuje nebezpe\u010dn\u00fd zna\u010dkovac\u00ed k\u00f3d.', 'Unsafe markup was detected.'],
  'material-too-large': ['Bal\u00ed\u010dek je pro jednor\u00e1zov\u00e9 p\u0159ed\u00e1n\u00ed p\u0159\u00edli\u0161 velk\u00fd.', 'The resource is too large for a transient handoff.'],
  'invalid-schema': ['Materi\u00e1l nem\u00e1 platn\u00e9 sch\u00e9ma.', 'The resource has an invalid schema.'],
  'needs-source': ['Chyb\u00ed zdrojov\u00fd text.', 'Source text is missing.'],
  'needs-objectives': ['Chyb\u00ed v\u00fdukov\u00fd c\u00edl.', 'A learning objective is missing.'],
  'needs-tasks': ['Chyb\u00ed dostate\u010dn\u00fd po\u010det podporovan\u00fdch \u00faloh.', 'Not enough supported tasks.'],
  'needs-content': ['Chyb\u00ed zdrojov\u00fd text nebo \u00falohy.', 'Source text or tasks are required.'],
  'unsupported-content': ['Materi\u00e1l nem\u00e1 obsah, kter\u00fd aplikace um\u00ed p\u0159evz\u00edt.', 'The content type is unsupported.'],
};
function btn(label, className='button secondary') {
  const node = document.createElement('button'); node.type = 'button'; node.className = className; node.textContent = label; return node;
}
function el(tag, cls, text) { const node=document.createElement(tag); if(cls)node.className=cls; if(text!=null)node.textContent=text; return node; }
export function reasonText(G, code) { return G.t(...(reasons[code] || ['Materi\u00e1l nelze p\u0159edat.', 'The material cannot be transferred.'])); }
export async function loadMaterialFlowController(G) {
  const [apps, response] = await Promise.all([G.loadApps(), fetch(new URL('../config/material-flow-registry.json', import.meta.url), { cache: 'no-store' })]);
  if (!response.ok) throw new Error(`Material registry unavailable: ${response.status}`);
  const registry = validateRegistry(await response.json());
  const studioUrl = new URL('../', import.meta.url).href;
  // The deployment may be mounted at a different path; use the current page root instead.
  const runtimeStudioUrl = new URL(document.body.dataset.base || '../', location.href).href;
  const bridge = globalThis.GHRAB_PLATFORM?.bridge || null;
  const transport = bridge ? createHandoffTransport({ bridge, validator: G.validateMaterialPackage, studioUrl: runtimeStudioUrl, apps, registry }) : null;
  const assess = (material) => resolveTargets(material, apps, registry, { validator: G.validateMaterialPackage, studioUrl: runtimeStudioUrl });
  return Object.freeze({ apps, registry, transport, assess, studioUrl: runtimeStudioUrl || studioUrl });
}
export function materialFlowDetails(G, controller, material, { onRefresh } = {}) {
  const detail = el('div','material-flow-detail'); detail.hidden = true;
  const heading = el('h4','',G.t('Pou\u017e\u00edt materi\u00e1l d\u00e1l','Use this resource next'));
  const summary = el('p','material-flow-info',G.t('Materi\u00e1l se nevkl\u00e1d\u00e1 do URL. Do aplikace jej p\u0159ed\u00e1 jednor\u00e1zov\u00fd Bridge v tomto prohl\u00ed\u017ee\u010di.','No material is placed in the URL. The one-time browser bridge performs the transfer.'));
  const preview = document.createElement('details');
  preview.className = 'material-flow-preview';
  const previewToggle = document.createElement('summary');
  previewToggle.textContent = G.t('Detail materiálu', 'Resource details');
  const previewBody = el('div','material-flow-preview-body');
  const objectives = Array.isArray(material.objectives) ? material.objectives.filter((value) => typeof value === 'string') : [];
  const source = typeof material.content?.sourceText === 'string' ? material.content.sourceText : '';
  const tasks = Array.isArray(material.content?.tasks) ? material.content.tasks : [];
  const metadata = el('p','material-flow-info', [material.subject, material.yearGroup, material.level].filter(Boolean).join(' · '));
  previewBody.append(metadata);
  if (objectives.length) {
    previewBody.append(el('h5','',G.t('Výukové cíle', 'Learning objectives')));
    const ul = document.createElement('ul');
    for (const objective of objectives.slice(0, 30)) {
      ul.append(el('li','',objective));
    }
    previewBody.append(ul);
  }
  if (source) {
    previewBody.append(el('h5','',G.t('Zdrojový text', 'Source text')));
    const output = el('pre','material-flow-source');
    output.textContent = source.slice(0, 6000);
    previewBody.append(output);
    if (source.length > 6000) previewBody.append(el('small','',G.t('Zobrazen náhled prvních 6 000 znaků. Celý text je dostupný v editoru.', 'Preview limited to 6,000 characters; the full text is available in the editor.')));
  }
  previewBody.append(el('p','material-flow-info',G.t(`Strukturované úlohy: ${tasks.length}`, `Structured tasks: ${tasks.length}`)));
  if (tasks.length) {
    const ul = document.createElement('ul');
    for (const task of tasks.slice(0, 15)) ul.append(el('li','',String(task?.prompt || '')));
    previewBody.append(ul);
    if (tasks.length > 15) previewBody.append(el('small','',G.t('Další úlohy jsou dostupné v editoru.', 'Additional tasks are available in the editor.')));
  }
  preview.append(previewToggle, previewBody);
  const status = el('div','material-flow-pending');
  const targets = el('div','material-flow-targets');
  const returnLink = document.createElement('a');
  returnLink.className = 'button ghost'; returnLink.href = '../';
  returnLink.textContent = G.t('Zp\u011bt do Studia','Back to Studio');
  detail.append(heading, summary, preview, status, targets, returnLink);
  function rerender() {
    status.replaceChildren();
    const pending = controller.transport?.pending();
    status.hidden = !pending;
    if (pending) {
      status.append(el('p','material-flow-status',G.t(`\u010cek\u00e1 p\u0159ed\u00e1n\u00ed pro ${pending.target}. Dokon\u010dete je, nebo jej zru\u0161te.`, `Pending handoff for ${pending.target}. Complete or cancel it.`)));
      if (pending.sourceAppId === 'ai-studio') {
        const cancel = btn(G.t('Zru\u0161it p\u0159ed\u00e1n\u00ed','Cancel handoff'),'button danger');
        cancel.addEventListener('click', () => { if(controller.transport.cancelOwn()) { rerender(); onRefresh?.(); } });
        status.append(cancel);
      }
    }
    targets.replaceChildren();
    // Unrelated apps are not rendered as material destinations.
    const resolved = controller.assess(material).filter((row) => row.declaration);
    if (!resolved.length) targets.append(el('p','material-flow-info',G.t('\u017d\u00e1dn\u00e1 aplikace nem\u00e1 aktivn\u00ed importn\u00ed kontrakt.','No application currently has an active import contract.')));
    for (const row of resolved) {
      const target = el('article',`material-flow-target ${row.compatible ? '' : 'is-incompatible'}`);
      const text = el('div');
      const appName = G.localised(row.app.name);
      text.append(el('h4','',appName),el('p','',reasonText(G,row.reason)));
      const access = G.hasAppAccess(row.id);
      const launch = btn(row.compatible ? G.t('P\u0159ipravit a otev\u0159\u00edt','Prepare and open') : G.t('Nekompatibiln\u00ed','Incompatible'));
      launch.disabled = !row.compatible || !access.enabled || Boolean(pending) || !controller.transport;
      if (!access.enabled) { launch.disabled = true; text.append(el('small','',G.t('P\u0159\u00edstup nen\u00ed aktivn\u00ed.','Access is not enabled.'))); }
      if (row.compatible && !controller.transport) text.append(el('small','',G.t('Platform Bridge nyn\u00ed nen\u00ed dostupn\u00fd.','Platform Bridge is unavailable.')));
      launch.addEventListener('click', () => {
        try {
          // Synchronous launch from a genuine click event, after all guards.
          const created = controller.transport.prepare({ targetId: row.id, material, sourceAppVersion: G.VERSION });
          const url = new URL(created.launchUrl);
          url.searchParams.set('studioHandoff','1');
          window.open(url.href,'_blank','noopener,noreferrer');
          G.showToast(G.t('Jednor\u00e1zov\u00e9 p\u0159ed\u00e1n\u00ed bylo p\u0159ipraveno.','A one-time handoff has been prepared.'));
          rerender(); onRefresh?.();
        } catch (error) {
          G.showToast(error.message || G.t('P\u0159ed\u00e1n\u00ed selhalo.','Handoff failed.'));
          rerender();
        }
      });
      target.append(text,launch); targets.append(target);
    }
  }
  const toggle = btn(G.t('Pou\u017e\u00edt d\u00e1l\u2026','Use next\u2026'));
  toggle.setAttribute('aria-expanded','false');
  toggle.addEventListener('click', () => { detail.hidden = !detail.hidden; toggle.setAttribute('aria-expanded',String(!detail.hidden)); if(!detail.hidden)rerender(); });
  return { toggle, detail, refresh: rerender };
}
