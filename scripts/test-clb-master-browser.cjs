'use strict';
// Built teacher bytes and the real content receipt are never stubbed. Only the
// access trust root and signed synthetic teacher permit are ephemeral QA inputs.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const pw=require(process.env.CLB_PLAYWRIGHT_MODULE||'playwright');
const root=process.cwd(),dist=path.join(root,'dist');
const ORIGIN='https://daniel22-dev.github.io',BASE='/AI-Studio-GHRAB/',PUBLIC='https://conversation-lab-ghrab.pages.dev';
const TEACHER=ORIGIN+BASE+'conversation-lab/';
const output=path.resolve(process.env.CLB_QA_OUT||'qa-results/clb-master-browser');fs.mkdirSync(output,{recursive:true});
const read=n=>fs.readFileSync(path.join(dist,n));
const json=n=>JSON.parse(read(n));
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
const enc=x=>new TextEncoder().encode(x),b64=x=>Buffer.from(x).toString('base64url');
const report={schema:'ghrab-clb-real-teacher-browser-v1',status:'RUNNING',scope:'BUILT_STUDIO_WITH_EPHEMERAL_QA_ACCESS_TRUST_NOT_PRODUCTION_IDENTITY',ownerReceipt:'ACTUAL_UNMODIFIED_PINNED_V2_ES256',releaseVerifier:'ACTUAL_NOT_STUBBED',applicationResponses:'EXACT_BUILT_FILES_EXCEPT_EXPLICIT_NEGATIVE_MUTATIONS',studentResponses:'ACTUAL_PUBLIC_HTTPS',cases:[],errors:[]};
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
(async()=>{
 let browser;
 try{
 const {CLB_STUDIO_CSP}=await import('./lib/clb-studio-adapter.mjs');
 const key=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const pub=await webcrypto.subtle.exportKey('jwk',key.publicKey);const kid='clb-ephemeral-qa-not-production';
 const sign=async s=>b64(await webcrypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key.privateKey,enc(s)));
 const bundle=json('config/access-config-bundle.json');
 const originalTraining=JSON.stringify(bundle.policy.applications['conversation-lab']);
 bundle.accessPublicKey={schema:'ghrab-access-public-key-v1',keyId:kid,algorithm:'ES256',publicKey:pub,keys:[{keyId:kid,algorithm:'ES256',publicKey:pub}]};
 const bundleSig={schema:'ghrab-access-config-signature-v1',algorithm:'ES256',keyId:kid,bundleVersion:bundle.version,signature:await sign(canonical(bundle))};
 assert.equal(JSON.stringify(bundle.policy.applications['conversation-lab']),originalTraining);
 const access=read('access/access-control.js').toString();
 assert.match(access,/const ACCESS_BUNDLE_VERIFY_KEY = Object\.freeze\(\{[\s\S]*?\}\);/);
 const qaAccess=access.replace(/const ACCESS_BUNDLE_VERIFY_KEY = Object\.freeze\(\{[\s\S]*?\}\);/,'const ACCESS_BUNDLE_VERIFY_KEY = Object.freeze('+JSON.stringify({...pub,kid,use:'sig',alg:'ES256'})+');');
 async function permit(kind){
  const now=Math.floor(Date.now()/1000);
  const payload={schema:'ghrab-access-permit-v1',iss:bundle.policy.issuer,aud:bundle.policy.audience,sub:'QA_ONLY_NOT_A_PERSON',jti:'CLB_QA_EPHEMERAL',kid,role:'teacher',iat:now-30,nbf:now-30,exp:now+3600,apps:kind==='no-app'?[]:['conversation-lab'],training:kind==='no-training'?{}:{'conversation-lab':{code:'CLB-01',version:kind==='old-training'?'2026-09':'2026-10'}}};
  const segment=b64(JSON.stringify(payload));return 'ghrab1.'+segment+'.'+await sign(segment);
 }
 for(const engine of (process.env.CLB_ENGINE||'chromium').split(',')){
  browser=await pw[engine].launch({headless:true,...(process.env.CLB_CHROMIUM_PATH&&engine==='chromium'?{executablePath:process.env.CLB_CHROMIUM_PATH}:{}),args:engine==='chromium'?['--no-sandbox']:[]});
  const scenarios=[{name:'actual-policy-no-permit',realTrust:true,deny:true},{name:'signed-permit-no-app',kind:'no-app',deny:true},{name:'signed-permit-missing-training',kind:'no-training',deny:true},{name:'signed-permit-outdated-training',kind:'old-training',deny:true},{name:'release-hold',hold:true,deny:true},{name:'tampered-owner-receipt',receipt:true,deny:true},{name:'tampered-loader-sri',loader:true,deny:true},{name:'actual-owner-release-and-qa-teacher',positive:true}];
  for(const scenario of scenarios){
   const item={engine,name:scenario.name,requests:[],errors:[],cspViolations:[],cspProbeViolations:[],variants:0,stations:0,qr:0,anonymousOpens:0,status:'RUNNING'};report.cases.push(item);
   const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
   let intentionalProbe=false;
   await context.exposeBinding('__clbQaCspEvent',(_source,event)=>{(intentionalProbe?item.cspProbeViolations:item.cspViolations).push(event);});
   await context.addInitScript(()=>{globalThis.__clbCspEvents=[];document.addEventListener('securitypolicyviolation',e=>{const event={directive:e.violatedDirective,blocked:e.blockedURI};globalThis.__clbCspEvents.push(event);globalThis.__clbQaCspEvent(event);});});
   const token=await permit(scenario.kind);
   await context.addInitScript(({token,origin})=>{if(location.origin===origin&&token)localStorage.setItem('ghrab.access.permit.v2',token);},{token:scenario.realTrust?null:token,origin:ORIGIN});
   await context.route('**/*',async route=>{
    const req=route.request(),u=new URL(req.url()),headers=await req.allHeaders();
    item.requests.push({origin:u.origin,path:u.pathname,method:req.method(),authorization:!!headers.authorization,cookie:!!headers.cookie,referrer:headers.referer||null});
    if(![ORIGIN,PUBLIC].includes(u.origin)||req.method()!=='GET')return route.abort();
    if(u.origin===PUBLIC) {assert.equal(headers.authorization,undefined);assert.equal(headers.cookie,undefined);assert.ok(!headers.referer||!headers.referer.startsWith(ORIGIN));return route.continue();}
    if(!u.pathname.startsWith(BASE))return route.abort();
    let n=decodeURIComponent(u.pathname.slice(BASE.length)||'index.html');
    if(n.endsWith('/'))n+='index.html';if(n.split('/').includes('..'))return route.abort();
    let bytes;try{bytes=read(n);}catch{return route.fulfill({status:404,body:'missing test resource: '+n});}
    if(!scenario.realTrust&&n==='access/access-control.js')bytes=Buffer.from(qaAccess);
    if(!scenario.realTrust&&n==='config/access-config-bundle.json')bytes=Buffer.from(JSON.stringify(bundle));
    if(!scenario.realTrust&&n==='config/access-config-bundle.sig.json')bytes=Buffer.from(JSON.stringify(bundleSig));
    if(scenario.hold&&n==='integration/conversation-lab/launch-control.v0.11.0.json'){const c=JSON.parse(bytes);c.stage='PRELIVE_HOLD';c.launchEnabled=false;bytes=Buffer.from(JSON.stringify(c));}
    if(scenario.receipt&&n==='integration/conversation-lab/owner-content-release.v0.11.0.signed.json'){const c=JSON.parse(bytes);c.statement.ownerPedagogicalApproval=false;bytes=Buffer.from(JSON.stringify(c));}
    if(scenario.loader&&n==='conversation-lab/assets/app.js')bytes=Buffer.concat([bytes,Buffer.from('\n/* QA tampered loader */')]);
    await route.fulfill({status:200,body:bytes,headers:{'Content-Type':mime[path.extname(n)]||'application/octet-stream','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
   });
   const page=await context.newPage();page.on('pageerror',e=>item.errors.push(e.message));page.setDefaultTimeout(12000);
   try{
    await page.goto(TEACHER+'#/l/artificial-intelligence/en/B2/s/s01');
    assert.equal(await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content'),CLB_STUDIO_CSP);
    if(scenario.deny){
     await page.waitForFunction(()=>document.documentElement.dataset.clbGate==='denied');
     item.gateMessage=await page.locator('#clb-gate-status').innerText();
     assert.equal(await page.locator('#sectionNav').count(),0);
     if(!scenario.loader)assert.ok(!item.requests.some(x=>x.path.includes('/conversation-lab/assets/app.js')),'Must refuse before loading runtime');
    }else{
     const catalog=json('conversation-lab/data/catalog.json');
     for(const entry of catalog.entries){
      await page.goto('about:blank');await page.goto(TEACHER+'#/l/'+entry.lessonId+'/'+entry.language+'/'+entry.cefr+'/s/s01');
      const lesson=json('conversation-lab/'+entry.path).lesson;
      await page.waitForFunction(text=>document.querySelector('#mainQuestion')?.textContent===text,lesson.stations[0].mainQuestion);
      assert.equal(await page.locator('html').getAttribute('lang'),entry.language);
      assert.ok(await page.title());assert.equal(await page.locator('meta[name="viewport"]').count(),1);
      assert.equal(await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content'),CLB_STUDIO_CSP);
      for(let i=0;i<8;i++){await page.locator('#sectionNav button').nth(i).evaluate(n=>n.click());assert.equal(await page.locator('#mainQuestion').textContent(),lesson.stations[i].mainQuestion);item.stations++;}item.variants++;
     }
     for(const topic of ['artificial-intelligence','the-pressure-to-succeed','summer-holidays']){
      await page.goto('about:blank');await page.goto(TEACHER+'#/l/'+topic+'/en/B2/s/s03');await page.waitForFunction(()=>document.querySelector('#stationNum')?.textContent==='3');
      await page.locator('#clb-share-open').click();await page.locator('#clb-share[open]').waitFor();
      const target=PUBLIC+'/#/l/'+topic+'/en/B2/s/s03';assert.equal(await page.locator('#clb-share-url').inputValue(),target);assert.equal(await page.locator('#clb-share-qr svg').count(),1);item.qr++;
      await page.screenshot({path:path.join(output,engine+'-'+topic+'-teacher.png')});
      const studentContext=await browser.newContext({serviceWorkers:'block'});
      try {const student=await studentContext.newPage();const bad=[];await studentContext.route('**/*',async r=>{const h=await r.request().allHeaders();if(!r.request().url().startsWith(PUBLIC+'/')||h.authorization||h.cookie||h.referer?.startsWith(ORIGIN)){bad.push(r.request().url());return r.abort();}return r.continue();});
       await student.goto(target);await student.waitForFunction(()=>document.querySelector('#stationNum')?.textContent==='3');
       assert.equal(await student.locator('#mainQuestion').textContent(),await page.locator('#mainQuestion').textContent());assert.deepEqual(await studentContext.cookies(),[]);assert.deepEqual(bad,[]);item.anonymousOpens++;
      }finally{await studentContext.close();}
     }
     assert.ok(item.requests.some(x=>x.path.endsWith('/owner-content-release.v0.11.0.signed.json')));
     assert.ok(item.requests.some(x=>x.path.endsWith('/governance/project-owner-release.v0.11.0.json')));
     assert.ok(item.requests.every(x=>x.origin===ORIGIN),'Teacher must never fetch Cloudflare with credentials');
     item.accessSnapshot=await page.evaluate(async()=>{const x=await import('../access/access-control.js');const a=x.hasAppAccess('conversation-lab');return {enabled:a.enabled,reason:a.reason,role:a.permit?.role};});
     assert.deepEqual(item.accessSnapshot,{enabled:true,reason:'permitted',role:'teacher'});assert.equal(item.variants,72);assert.equal(item.stations,576);assert.equal(item.qr,3);assert.equal(item.anonymousOpens,3);
     assert.deepEqual(item.cspViolations,[]);
     intentionalProbe=true;
     await page.evaluate(()=>{globalThis.__clbInlineProbe=0;globalThis.__clbCspEvents=[];const inline=document.createElement('script');inline.textContent='globalThis.__clbInlineProbe=1';document.head.append(inline);const foreign=document.createElement('script');foreign.src='https://example.invalid/clb-security-probe.js';document.head.append(foreign);});
     await page.waitForFunction(()=>globalThis.__clbCspEvents.length>=2);
     assert.equal(await page.evaluate(()=>globalThis.__clbInlineProbe),0);
     const probe=await page.evaluate(()=>globalThis.__clbCspEvents);
     assert.ok(probe.some(x=>x.blocked==='inline'&&x.directive.startsWith('script-src')));
     assert.ok(probe.some(x=>x.blocked.startsWith('https://example.invalid')&&x.directive.startsWith('script-src')));
     item.cspEnforcement={inlineScriptBlocked:true,foreignScriptBlocked:true,actualBrowserEvents:probe};
    }
    assert.deepEqual(item.cspViolations,[]);assert.deepEqual(item.errors,[]);item.status='PASS';
   }catch(e){item.status='FAIL';item.error=e.stack;throw e;}finally{await context.close();}
  }
  await browser.close();browser=null;
 }
 report.status='PASS';
 }catch(e){report.status='FAIL';report.errors.push(e.stack);console.error(e);process.exitCode=1;}
 finally{await browser?.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log('CLB_TEACHER_QA='+JSON.stringify({status:report.status,cases:report.cases.map(({engine,name,status,variants,stations,qr,gateMessage,error,cspViolations,cspEnforcement})=>({engine,name,status,variants,stations,qr,gateMessage,error,cspViolations,cspEnforcement})),errors:report.errors}));}
})();
