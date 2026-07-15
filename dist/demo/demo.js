await window.GHRAB.accessReady;

if (window.GHRAB.isAdmin()) {
  const G = window.GHRAB;
  const root = document.documentElement;
  const steps = ['source', 'differentiator', 'generator', 'ludus', 'communication'];
  let index = Math.max(0, steps.indexOf(location.hash.slice(1)));
  let timer = null;
  let notesWindow = null;
  let presentationActive = false;

  const buttons = [...document.querySelectorAll('[data-step]')];
  const slides = [...document.querySelectorAll('[data-slide]')];
  const autoplay = document.querySelector('#demo-autoplay');
  const presentationButton = document.querySelector('#demo-presentation');
  const notesWindowButton = document.querySelector('#demo-notes-window');
  const exitPresentationButton = document.querySelector('#demo-presentation-exit');
  const progress = document.querySelector('#demo-progress-bar');
  const presentationProgress = document.querySelector('#demo-presentation-progress');
  const stepCounter = document.querySelector('#demo-step-counter');
  const presentationCounter = document.querySelector('#demo-presentation-counter');
  const presentationTitle = document.querySelector('#demo-presentation-title');
  const previousButton = document.querySelector('#demo-prev');
  const nextButton = document.querySelector('#demo-next');

  function currentId(){ return steps[index]; }
  function currentButton(){ return buttons.find(button => button.dataset.step === currentId()); }
  function currentSlide(){ return slides.find(slide => slide.dataset.slide === currentId()); }
  function currentTitle(){ return currentButton()?.querySelector('b')?.textContent?.trim() || currentId(); }
  function translated(node){
    if (!node) return '';
    return node.dataset?.[G.state.language] || node.textContent?.trim() || '';
  }
  function stepSummary(slide){
    const headline = slide?.querySelector('h2')?.textContent?.trim() || '';
    const paragraphs = [...(slide?.querySelectorAll(':scope > p:not(.eyebrow)') || [])];
    const detail = paragraphs[0]?.textContent?.trim() || '';
    return { headline, detail };
  }

  function stopAuto(){
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    autoplay.textContent = G.t('▶ Spustit automaticky', '▶ Start autoplay');
    autoplay.setAttribute('aria-pressed', 'false');
  }

  function updateNotesWindow(){
    if (!notesWindow || notesWindow.closed) return;
    try {
      const doc = notesWindow.document;
      const slide = currentSlide();
      const note = slide?.querySelector('.speaker-note');
      const summary = stepSummary(slide);
      const nextIndex = Math.min(index + 1, steps.length - 1);
      const nextTitle = buttons.find(button => button.dataset.step === steps[nextIndex])?.querySelector('b')?.textContent?.trim() || '';
      doc.documentElement.lang = G.state.language;
      const set = (selector, value) => {
        const target = doc.querySelector(selector);
        if (target) target.textContent = value;
      };
      set('[data-notes-step]', `${index + 1} / ${steps.length}`);
      set('[data-notes-title]', currentTitle());
      set('[data-notes-headline]', summary.headline);
      set('[data-notes-detail]', summary.detail);
      set('[data-notes-body]', translated(note));
      set('[data-notes-next-label]', G.t('Další krok', 'Next step'));
      set('[data-notes-next]', index === steps.length - 1 ? G.t('Konec prezentace', 'End of presentation') : nextTitle);
      set('[data-notes-hint]', G.t('Toto okno ponechte na svém monitoru. Publikum jej na projektoru neuvidí.', 'Keep this window on your own screen. The audience will not see it on the projector.'));
      const previous = doc.querySelector('[data-notes-prev]');
      const next = doc.querySelector('[data-notes-next-button]');
      if (previous) {
        previous.textContent = G.t('← Předchozí', '← Previous');
        previous.disabled = index === 0;
      }
      if (next) {
        next.textContent = index === steps.length - 1 ? G.t('Hotovo', 'Done') : G.t('Další →', 'Next →');
        next.disabled = index === steps.length - 1;
      }
      doc.title = `${G.t('Poznámky řečníka', 'Speaker notes')} · ${currentTitle()}`;
    } catch {
      notesWindow = null;
    }
  }

  function buildNotesWindow(){
    const popup = window.open('about:blank', 'ghrab-demo-speaker-notes', 'popup,width=540,height=780,resizable=yes,scrollbars=yes');
    if (!popup) {
      G.showToast(G.t('Prohlížeč zablokoval okno s poznámkami. Povolte vyskakovací okna pro AI Studio.', 'The browser blocked the notes window. Allow pop-ups for AI Studio.'));
      return;
    }
    notesWindow = popup;
    const doc = popup.document;
    doc.title = G.t('Poznámky řečníka', 'Speaker notes');
    doc.body.replaceChildren();
    const style = doc.createElement('style');
    style.textContent = `
      :root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#020813;color:#eafaff}
      *{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 50% 0,rgba(61,215,255,.13),transparent 34%),#020813;padding:22px}
      main{max-width:760px;margin:auto;display:grid;gap:16px}.top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.brand{display:flex;gap:12px;align-items:center}.brand img{width:46px;height:46px}.brand small{display:block;color:#72e8ff;font-weight:900;letter-spacing:.14em}.brand strong{display:block;font-size:1.2rem;margin-top:3px}.counter{padding:7px 10px;border:1px solid rgba(103,232,255,.28);border-radius:999px;color:#96eef9;font-weight:850}
      .hint{margin:0;padding:12px 14px;border-left:3px solid #53e5fa;border-radius:0 12px 12px 0;background:rgba(66,216,244,.07);color:#b8d4df;font-size:.86rem;line-height:1.5}.card{padding:20px;border:1px solid rgba(102,228,255,.18);border-radius:18px;background:linear-gradient(145deg,rgba(10,29,48,.9),rgba(3,13,24,.92));box-shadow:0 24px 60px rgba(0,0,0,.32)}.card small{color:#f2b864;font-weight:900;letter-spacing:.14em}.card h1{font-size:1.7rem;line-height:1.1;margin:10px 0}.card .detail{color:#9eb7c2;line-height:1.5}.say{border-color:rgba(243,184,100,.35);background:linear-gradient(145deg,rgba(47,33,18,.66),rgba(12,17,24,.94))}.say p{font-size:1.08rem;line-height:1.65;margin:12px 0 0;color:#ffe5bb}.next{display:grid;gap:5px;padding:14px 16px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.035)}.next small{color:#8eb2bf}.next strong{font-size:1rem}.controls{position:sticky;bottom:0;display:flex;justify-content:space-between;gap:12px;padding:13px;border:1px solid rgba(104,229,255,.2);border-radius:16px;background:rgba(2,10,18,.92);backdrop-filter:blur(14px)}button{border:1px solid rgba(98,229,255,.28);border-radius:11px;background:rgba(45,205,235,.1);color:#eaffff;padding:10px 14px;font:inherit;font-weight:850;cursor:pointer}button:disabled{opacity:.35;cursor:not-allowed}button:last-child{background:linear-gradient(135deg,#42dff5,#188eb8);color:#02111b}
    `;
    const main = doc.createElement('main');
    main.innerHTML = `
      <div class="top"><div class="brand"><img src="../assets/brand/brand-mark.svg" alt=""><span><small>AI STUDIO GHRAB</small><strong data-notes-title></strong></span></div><span class="counter" data-notes-step></span></div>
      <p class="hint" data-notes-hint></p>
      <section class="card"><small>OBSAH NA PLÁTNĚ</small><h1 data-notes-headline></h1><p class="detail" data-notes-detail></p></section>
      <section class="card say"><small>CO ŘÍCT</small><p data-notes-body></p></section>
      <section class="next"><small data-notes-next-label></small><strong data-notes-next></strong></section>
      <div class="controls"><button type="button" data-notes-prev></button><button type="button" data-notes-next-button></button></div>
    `;
    const logo = main.querySelector('img');
    if (logo) logo.src = new URL('../assets/brand/brand-mark.svg', location.href).href;
    doc.head.append(style);
    doc.body.append(main);
    doc.querySelector('[data-notes-prev]')?.addEventListener('click', () => { stopAuto(); show(index - 1); });
    doc.querySelector('[data-notes-next-button]')?.addEventListener('click', () => { stopAuto(); show(index + 1); });
    doc.addEventListener('keydown', event => {
      if (['ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); stopAuto(); show(index + 1); }
      if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); stopAuto(); show(index - 1); }
    });
    updateNotesWindow();
    popup.focus();
  }

  function setPresentationState(active){
    presentationActive = active;
    root.dataset.presentationMode = String(active);
    document.body.classList.toggle('demo-presentation-active', active);
    document.querySelector('.presentation-hud')?.setAttribute('aria-hidden', String(!active));
    presentationButton.setAttribute('aria-pressed', String(active));
    presentationButton.textContent = active ? G.t('Ukončit projekci', 'Exit presentation') : G.t('⛶ Spustit projekci', '⛶ Start presentation');
    if (active) root.dataset.speakerNotes = 'false';
  }

  async function enterPresentation(){
    setPresentationState(true);
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      }
    } catch {
      G.showToast(G.t('Režim projekce je aktivní. Pro úplnou celou obrazovku můžete použít klávesu F11.', 'Presentation mode is active. You can use F11 for full screen.'));
    }
  }

  async function exitPresentation(){
    setPresentationState(false);
    try {
      if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
    } catch { /* presentation layout is already disabled */ }
  }

  function show(next){
    index = Math.max(0, Math.min(steps.length - 1, next));
    const id = currentId();
    buttons.forEach(button => {
      const active = button.dataset.step === id;
      button.classList.toggle('active', active);
      button.setAttribute('aria-current', active ? 'step' : 'false');
    });
    slides.forEach(slide => slide.classList.toggle('active', slide.dataset.slide === id));
    history.replaceState(null, '', `#${id}`);
    previousButton.disabled = index === 0;
    nextButton.disabled = index === steps.length - 1;
    nextButton.textContent = index === steps.length - 1 ? G.t('Hotovo', 'Done') : G.t('Další →', 'Next →');
    const percentage = (index + 1) / steps.length * 100;
    progress.style.setProperty('--demo-progress', `${percentage}%`);
    if (presentationProgress) presentationProgress.style.width = `${percentage}%`;
    const counter = `${index + 1} / ${steps.length}`;
    if (stepCounter) stepCounter.textContent = counter;
    if (presentationCounter) presentationCounter.textContent = counter;
    if (presentationTitle) presentationTitle.textContent = currentTitle();
    updateNotesWindow();
    if (index === steps.length - 1) stopAuto();
  }

  buttons.forEach(button => button.addEventListener('click', () => {
    stopAuto();
    show(steps.indexOf(button.dataset.step));
  }));
  previousButton.addEventListener('click', () => { stopAuto(); show(index - 1); });
  nextButton.addEventListener('click', () => { stopAuto(); show(index + 1); });
  autoplay.addEventListener('click', () => {
    if (timer) { stopAuto(); return; }
    autoplay.textContent = G.t('⏸ Pozastavit', '⏸ Pause');
    autoplay.setAttribute('aria-pressed', 'true');
    timer = setInterval(() => show(index + 1), 12000);
  });
  presentationButton.addEventListener('click', () => presentationActive ? exitPresentation() : enterPresentation());
  exitPresentationButton.addEventListener('click', exitPresentation);
  notesWindowButton.addEventListener('click', buildNotesWindow);

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && presentationActive) setPresentationState(false);
  });
  document.addEventListener('keydown', event => {
    const interactiveTarget = event.target instanceof Element && event.target.closest('input,textarea,select,button,a');
    if (interactiveTarget) return;
    if (['ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); stopAuto(); show(index + 1); }
    if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); stopAuto(); show(index - 1); }
    if (event.key === 'Home') { stopAuto(); show(0); }
    if (event.key === 'End') { stopAuto(); show(steps.length - 1); }
    if (event.key.toLowerCase() === 'p') presentationActive ? exitPresentation() : enterPresentation();
    if (event.key.toLowerCase() === 'n') buildNotesWindow();
    if (event.key === 'Escape' && presentationActive && !document.fullscreenElement) setPresentationState(false);
  });
  document.addEventListener('ghrab:language', () => {
    setPresentationState(presentationActive);
    show(index);
  });
  window.addEventListener('pagehide', () => {
    if (notesWindow && !notesWindow.closed) notesWindow.close();
  });

  document.querySelector('[data-nav="demo"]')?.setAttribute('aria-current', 'page');
  setPresentationState(false);
  show(index);
}
