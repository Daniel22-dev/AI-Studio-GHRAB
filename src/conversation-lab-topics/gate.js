/** Studio-only same-origin CLB-01 teacher gate for local topic manager.
 * The portable standalone HTML has NO access to this privileged Studio route.
 * This guard never publishes lessons or transfers Studio credentials.
 */
import {initialiseAccess,hasAppAccess,requiredTraining}
  from '../access/access-control.js';
import {assertClbSignedTrainingPolicy}
  from '../integration/conversation-lab/teacher-launch.js';
const ROUTE=/^#\/l\/[a-z0-9]+(?:-[a-z0-9]+)*\/(?:en|es|de|fr)\/(?:A1|A2|B1|B2|C1|C2)\/s\/s0[1-8]$/;
const fail=code=>{throw Error('CLB_TOPIC_MANAGER_'+code);};
async function main(){
  const url=new URL(location.href),module=new URL(import.meta.url),
    origin='https://daniel22-dev.github.io',
    exact='/AI-Studio-GHRAB/conversation-lab-topics/';
  if(url.protocol!=='https:'||url.origin!==origin||
    ![exact,exact+'index.html'].includes(url.pathname)||
    url.username||url.password||url.search||
    (url.hash!==''&&url.hash!=='#/library'&&!ROUTE.test(url.hash))||
    module.origin!==origin||module.pathname!==exact+'gate.js'||
    window.top!==window.self)fail('UNTRUSTED_ORIGIN');
  await initialiseAccess();
  assertClbSignedTrainingPolicy(requiredTraining('conversation-lab'));
  if(hasAppAccess('conversation-lab')?.enabled!==true)
    fail('CLB01_ACCESS_REQUIRED');
  // Load the content-only export library AFTER the verified CLB-01 teacher gate.
  // The module neither uploads data nor grants public release authority.
  await new Promise((resolve,reject)=>{
    const publication=document.createElement('script');
    publication.src=new URL('./publication.js',import.meta.url).href;
    publication.async=false;
    publication.onload=resolve;
    publication.onerror=()=>reject(Error('CLB_PUBLICATION_MODULE_UNAVAILABLE'));
    document.body.append(publication);
  });
  const script=document.createElement('script');
  script.src=new URL('./app.js',import.meta.url).href;
  script.async=false;
  document.body.append(script);
}
main().catch(error=>{
  document.body.replaceChildren();
  const h=document.createElement('h1');h.textContent='Conversation Lab – přístup nebyl povolen';
  const p=document.createElement('p');p.textContent='Pro správu témat v AI Studiu je nutné platné oprávnění učitele a školení CLB-01. Přístupové údaje nebyly předány.';
  document.body.append(h,p);
  document.documentElement.dataset.clbGate='denied';
  // The rejected code is not used as visible HTML or a dynamic route.
});
