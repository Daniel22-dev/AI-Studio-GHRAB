#!/usr/bin/env node
/* My Groups v2: exercise the REAL Studio access verifier and signed bundle.
 * Synthetic negative authorization tests only: no school logins or tokens.
 * The sole positive server-session fixture is a MOCK backend response.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const root="/AI-Studio-GHRAB/";
const origin="https://signed-groups-contract.example";
const read=path=>readFileSync(path,"utf8");
const bundle=JSON.parse(read("src/config/access-config-bundle.json"));
const signature=JSON.parse(read("src/config/access-config-bundle.sig.json"));
const assets=new Map([
  [root+"groups/verified-client.js",["text/javascript",read("src/groups/verified-client.js")]],
  [root+"groups/group-service.js",["text/javascript",read("src/groups/group-service.js")]],
  [root+"access/access-control.js",["text/javascript",read("src/access/access-control.js")]],
  [root+"config/deployment-baked.js",["text/javascript",read("src/config/deployment-baked.js")]],
]);
const keyId=bundle.accessPublicKey?.activeKeyId || bundle.accessPublicKey?.keyId;
assert.ok(keyId,"real signed bundle contains the verification key ID");
const encode=x=>Buffer.from(JSON.stringify(x)).toString("base64url");
const now=Math.floor(Date.now()/1000);
const forgedPermit=[
  "ghrab1",
  encode({
    schema:"ghrab-access-permit-v1",iss:bundle.policy.issuer,
    aud:bundle.policy.audience,sub:"SYNTHETIC-NOT-REAL-TEACHER",
    role:"teacher",jti:"fake-test-token",kid:keyId,
    iat:now-60,exp:now+3600,apps:["essay-evaluator"],
    training:{"essay-evaluator":{code:"HOD-01",version:"2026-09"}},
  }),
  Buffer.alloc(64,7).toString("base64url"),
].join(".");
const validFakeServer={
  schema:"ghrab-session-v1",authenticated:true,
  user:{id:"synthetic-server-teacher",role:"teacher",apps:["essay-evaluator"]},
  expiresAt:new Date(Date.now()+3600000).toISOString(),
};
const browser=await chromium.launch({headless:true});
let passed=0;
async function scenario(name,{mode="signed-permit",token=null,tamperBundle=false,
  tamperSignature=false,serverStatus=200,serverResponse=null,exerciseLogout=false}={},assertResult){
  const context=await browser.newContext();
  const page=await context.newPage();
  const pageErrors=[];
  page.on("pageerror",e=>pageErrors.push(e.message));
  await page.addInitScript(({mode,token,version})=>{
    window.__GHRAB_DEPLOYMENT_CONFIG__={
      appId:"ai-studio",authMode:mode,sharedAccessVersion:version,
      access:{maxOfflineAgeHours:24,maxSignedBundleAgeDays:30},
    };
    if(token)localStorage.setItem("ghrab.access.permit.v2",token);
  },{mode,token,version:bundle.version});
  await page.route(origin+"/**",async route=>{
    const pathname=new URL(route.request().url()).pathname;
    const asset=assets.get(pathname);
    if(asset)return route.fulfill({status:200,contentType:asset[0],body:asset[1]});
    if(pathname===root+"config/access-config-bundle.json") {
      const payload=structuredClone(bundle);
      if(tamperBundle)payload.policy.defaultState="tampered-by-synthetic-test";
      return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(payload)});
    }
    if(pathname===root+"config/access-config-bundle.sig.json") {
      const payload=structuredClone(signature);
      if(tamperSignature)payload.signature=(payload.signature.startsWith("A")?"B":"A")+payload.signature.slice(1);
      return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(payload)});
    }
    if(pathname.endsWith("/session"))return route.fulfill({
      status:serverStatus,contentType:"application/json",
      body:JSON.stringify(serverResponse || {schema:"ghrab-session-v1",authenticated:false}),
    });
    if(pathname===root)return route.fulfill({status:200,contentType:"text/html",body:"<!doctype html><title>synthetic</title>"});
    return route.fulfill({status:404,body:"Missing synthetic route"});
  });
  try{
    await page.goto(origin+root);
    const result=await page.evaluate(async(exerciseLogout)=>{
      const {openVerifiedGroupsV2}=await import("/AI-Studio-GHRAB/groups/verified-client.js");
      const {getAccessSnapshot}=await import("/AI-Studio-GHRAB/access/access-control.js");
      let error=null,consumer=null,methods=[],opened=null;
      try{
        const ready=await openVerifiedGroupsV2("essay-evaluator");
        opened=ready;
        consumer=ready.schema;
        methods=Object.keys(ready.service);
      }catch(e){error=String(e?.message||e)}
      let revokedAfterLogout=null,subsequentOpenDenied=null;
      if(exerciseLogout && opened){
        const {endAccessSession}=await import("/AI-Studio-GHRAB/access/access-control.js");
        endAccessSession({broadcast:false});
        try{opened.service.listGroupMetadata("essay-evaluator");revokedAfterLogout=false}
        catch(e){revokedAfterLogout=e.message==="GROUP_ACCESS_DENIED"}
        try{await openVerifiedGroupsV2("essay-evaluator");subsequentOpenDenied=false}
        catch(e){subsequentOpenDenied=e.message==="GROUP_ACCESS_DENIED"}
      }
      const state=getAccessSnapshot();
      return {
        error,consumer,methods,revokedAfterLogout,subsequentOpenDenied,
        ready:state.ready,valid:state.valid,
        reason:state.reason,connectionState:state.connectionState,
        revocationCheckMode:state.revocationCheckMode,
        policySchema:state.policy?.schema||null,
        localRosterKeys:Object.keys(localStorage).filter(k=>k.startsWith("ghrab.ai-studio.groups.account.v2.")).length,
      };
    },exerciseLogout);
    assert.deepEqual(pageErrors,[],name+" must produce no uncaught errors");
    assertResult(result);
    console.log("PASS "+name+" / "+result.reason+" / "+(result.error||result.consumer));
    passed++;
  }finally{await context.close();}
}

try{
  await scenario("S01 genuine signed config + absent permit must deny",{},r=>{
    assert.equal(r.ready,true);assert.equal(r.valid,false);
    assert.equal(r.reason,"missing");
    assert.equal(r.connectionState,"online","real signed JSON bundle signature must verify");
    assert.equal(r.revocationCheckMode,"online-signed-bundle");
    assert.equal(r.policySchema,"ghrab-access-policy-v1");
    assert.equal(r.error,"GROUP_ACCESS_DENIED");assert.equal(r.localRosterKeys,0);
  });
  await scenario("S02 forged signed permit must fail real ECDSA verification",{token:forgedPermit},r=>{
    assert.equal(r.connectionState,"online");
    assert.equal(r.valid,false);assert.equal(r.reason,"invalid-signature");
    assert.equal(r.error,"GROUP_ACCESS_DENIED");assert.equal(r.localRosterKeys,0);
  });
  await scenario("S03 modified signed bundle must be refused",{token:forgedPermit,tamperBundle:true},r=>{
    assert.equal(r.valid,false);assert.equal(r.reason,"configuration-unavailable");
    assert.equal(r.error,"GROUP_ACCESS_DENIED");
  });
  await scenario("S04 corrupted bundle signature must be refused",{tamperSignature:true},r=>{
    assert.equal(r.valid,false);assert.equal(r.reason,"configuration-unavailable");
    assert.equal(r.error,"GROUP_ACCESS_DENIED");
  });
  await scenario("S05 server returns HTTP 401",{mode:"server-session",serverStatus:401},r=>{
    assert.equal(r.valid,false);assert.equal(r.reason,"session-required");
    assert.equal(r.error,"GROUP_ACCESS_DENIED");
  });
  await scenario("S06 server says authenticated:false",{mode:"server-session"},r=>{
    assert.equal(r.valid,false);assert.equal(r.reason,"session-required");
    assert.equal(r.error,"GROUP_ACCESS_DENIED");
  });
  await scenario("S07 server omits stable account identity",{
    mode:"server-session",serverResponse:{
      schema:"ghrab-session-v1",authenticated:true,
      user:{role:"teacher",apps:["essay-evaluator"]},
    },
  },r=>{
    assert.equal(r.valid,false);assert.equal(r.reason,"session-invalid");
    assert.equal(r.error,"GROUP_ACCESS_DENIED");
  });
  await scenario("S08 server session lacks essay-evaluator entitlement",{
    mode:"server-session",serverResponse:{
      ...validFakeServer,
      user:{...validFakeServer.user,apps:["lesson-hub"]},
    },
  },r=>{
    assert.equal(r.valid,true);assert.equal(r.error,"GROUP_ACCESS_DENIED");
  });
  await scenario("S09 MOCK server-authorized reader has no write API",{
    mode:"server-session",serverResponse:validFakeServer,
  },r=>{
    assert.equal(r.valid,true);assert.equal(r.reason,"valid");
    assert.equal(r.error,null);assert.equal(r.consumer,"ghrab-groups-verified-consumer-v2");
    assert.ok(r.methods.includes("getRosterProjection"));
    assert.equal(r.methods.includes("createGroup"),false);
    assert.equal(r.methods.includes("importBackup"),false);
  });
  await scenario("S10 session logout revokes already issued client facade",{
    mode:"server-session",serverResponse:validFakeServer,exerciseLogout:true,
  },r=>{
    assert.equal(r.consumer,"ghrab-groups-verified-consumer-v2");
    assert.equal(r.revokedAfterLogout,true);
    assert.equal(r.subsequentOpenDenied,true);
    assert.equal(r.valid,false);assert.equal(r.reason,"session-required");
  });
  console.log(JSON.stringify({
    suite:"real Studio access-control integration, no real credentials",
    status:"PASS",scenarios:passed,
    realSignedBundle:true,realPermitPrivateKey:false,
    realSchoolSSO:false,mockedServerPositive:true,
    physicalDeviceUAT:false,productionDeployment:false,
  }));
}finally{await browser.close();}
