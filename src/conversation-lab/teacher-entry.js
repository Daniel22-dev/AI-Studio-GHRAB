/** No MASTER runtime or content is loaded until the existing Studio access and release gates pass. */
import {initialiseAccess,hasAppAccess,requiredTraining} from '../access/access-control.js';
import {loadDeploymentConfig,applyDeploymentToAppRegistry} from '../access/deployment-config.js';
import {assertClbSignedTrainingPolicy,checkedConversationLabMasterTarget} from '../integration/conversation-lab/teacher-launch.js';
import releaseProfile from './release-profile.js';
const BASE=new URL('../',import.meta.url);
function denied(error){
  document.documentElement.dataset.clbGate='denied';
  const box=document.getElementById('clb-gate-status');box.hidden=false;
  const message=typeof error?.message==='string'?error.message:'';
  const code=/^CLB_[A-Z0-9_]+$/.test(message)?message:'CLB_STUDIO_UNAVAILABLE';
  box.textContent='Conversation Lab nelze otevřít. Toto vydání musí mít platné schválení a učitel oprávnění CLB‑01. '+code;
}
async function registry(){
  const deployment=await loadDeploymentConfig({appId:'ai-studio'});
  for(const path of ['config/apps.generated.json','config/apps.fallback.json']){
    const url=new URL(path,BASE);
    try{const response=await fetch(url,{cache:'no-store',credentials:'same-origin',redirect:'error'});
      if(!response.ok||response.redirected||response.url!==url.href)continue;
      const apps=applyDeploymentToAppRegistry(deployment,await response.json());
      if(!Array.isArray(apps))continue;const app=apps.find(x=>x.id==='conversation-lab');if(app)return app;
    }catch{/* Try the existing same-origin fallback registry. */}
  }
  throw Error('CLB_STUDIO_REGISTRY_UNAVAILABLE');
}
async function run(){
  try{
    const here=new URL(location.href);
    const moduleUrl=new URL(import.meta.url);
    const documentBase=new URL(document.baseURI);
    if(here.origin!=='https://daniel22-dev.github.io'||here.pathname!=='/AI-Studio-GHRAB/conversation-lab/'&&here.pathname!=='/AI-Studio-GHRAB/conversation-lab/index.html'||window.self!==window.top||here.search||here.username||here.password||BASE.username||BASE.password||moduleUrl.username||moduleUrl.password||documentBase.username||documentBase.password||BASE.origin!==here.origin||moduleUrl.origin!==here.origin||documentBase.origin!==here.origin)throw Error('CLB_STUDIO_ORIGIN_INVALID');
    await initialiseAccess();
    assertClbSignedTrainingPolicy(requiredTraining('conversation-lab'));
    const permission=hasAppAccess('conversation-lab');if(!permission.enabled)throw Error('CLB_STUDIO_TEACHER_ACCESS_REQUIRED');
    const app=await registry();
    const target=await checkedConversationLabMasterTarget(app,{studioOrigin:location.origin,releaseProfile});
    if(target!=='https://conversation-lab-ghrab.pages.dev/')throw Error('CLB_STUDIO_STUDENT_TARGET_INVALID');
    await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('./assets/app.js',import.meta.url).href;
      script.integrity='sha256-'+btoa(String.fromCharCode(...releaseProfile.publicAppJsSha256.match(/../g).map(x=>parseInt(x,16))));script.crossOrigin='anonymous';
      script.onload=resolve;script.onerror=()=>reject(Error('CLB_STUDIO_PLAYER_INTEGRITY_FAILED'));document.head.append(script);});
    await globalThis.__clbStartPlayer({teacher:true});
  }catch(error){denied(error);}
}
void run();
