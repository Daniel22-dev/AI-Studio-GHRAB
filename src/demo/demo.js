const steps = ['source','differentiator','generator','ludus','communication'];
let index = Math.max(0, steps.indexOf(location.hash.slice(1)));
const buttons = [...document.querySelectorAll('[data-step]')];
const slides = [...document.querySelectorAll('[data-slide]')];
function show(next){
  index = Math.max(0, Math.min(steps.length - 1, next));
  const id = steps[index];
  buttons.forEach(btn => btn.setAttribute('aria-current', btn.dataset.step === id ? 'step' : 'false'));
  slides.forEach(slide => slide.classList.toggle('active', slide.dataset.slide === id));
  history.replaceState(null,'',`#${id}`);
  document.querySelector('#demo-prev').disabled = index === 0;
  const nextBtn = document.querySelector('#demo-next');
  nextBtn.disabled = index === steps.length - 1;
  nextBtn.textContent = index === steps.length - 1 ? window.GHRAB.t('Hotovo','Done') : window.GHRAB.t('Další →','Next →');
}
buttons.forEach(btn => btn.addEventListener('click', () => show(steps.indexOf(btn.dataset.step))));
document.querySelector('#demo-prev').addEventListener('click', () => show(index-1));
document.querySelector('#demo-next').addEventListener('click', () => show(index+1));
document.addEventListener('ghrab:language', () => show(index));
document.querySelector('[data-nav="demo"]')?.setAttribute('aria-current','page'); show(index);
