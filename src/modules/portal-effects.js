function setupPortalMotion() {
  const stage = document.querySelector('.portal-stage');
  if (!stage || stage.dataset.portalMotionReady === 'true') return;
  stage.dataset.portalMotionReady = 'true';
  const reset = () => {
    stage.style.setProperty('--portal-tilt-x', '0deg'); stage.style.setProperty('--portal-tilt-y', '0deg');
    stage.style.setProperty('--portal-shift-x', '0px'); stage.style.setProperty('--portal-shift-y', '0px');
  };
  reset(); document.addEventListener('ghrab:motion', reset);
}

function setupStarfield(root) {
  const canvas = document.querySelector('#starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  let stars = [], raf = 0, running = false, lastFrame = 0;
  const frameInterval = 1000 / 30;
  const resize = () => {
    if (!running) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.35);
    canvas.width = Math.floor(innerWidth * dpr); canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`; ctx.setTransform(dpr,0,0,dpr,0,0);
    const count = Math.min(95, Math.max(38, Math.floor(innerWidth / 15)));
    stars = Array.from({ length: count }, () => ({ x: Math.random()*innerWidth, y: Math.random()*innerHeight, r: Math.random()*.9+.12, a: Math.random()*.52+.18, s: Math.random()*.055+.012 }));
  };
  const draw = (timestamp) => {
    if (!running) return; raf=requestAnimationFrame(draw);
    if (document.hidden || timestamp-lastFrame<frameInterval) return; lastFrame=timestamp;
    ctx.clearRect(0,0,innerWidth,innerHeight);
    for (const star of stars) { star.y+=star.s; if(star.y>innerHeight+2)star.y=-2; ctx.beginPath(); ctx.fillStyle=`rgba(166,235,255,${star.a})`; ctx.arc(star.x,star.y,star.r,0,Math.PI*2); ctx.fill(); }
  };
  const stop=()=>{ running=false; cancelAnimationFrame(raf); ctx.clearRect(0,0,canvas.width,canvas.height); canvas.hidden=true; };
  const start=()=>{ if(root.dataset.motion!=='full'){stop();return;} if(running)return; running=true; canvas.hidden=false; resize(); raf=requestAnimationFrame(draw); };
  addEventListener('resize',resize,{passive:true}); document.addEventListener('visibilitychange',()=>{if(!document.hidden&&running)lastFrame=0;});
  document.addEventListener('ghrab:motion',start); addEventListener('pagehide',stop,{once:true}); start();
}

export function setupPortalEffects({ root = document.documentElement } = {}) {
  setupPortalMotion(); setupStarfield(root);
  window.GHRAB_PLATFORM?.performance?.mark?.('studio:portal-effects-ready');
}
