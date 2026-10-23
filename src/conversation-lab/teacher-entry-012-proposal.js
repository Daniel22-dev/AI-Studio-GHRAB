/**
 * R4c10 proposal for AI Studio src/conversation-lab/teacher-entry.js.
 * PRIVATE SOURCE ONLY. NOT INSTALLED IN STUDIO. NOT DEPLOYABLE AS-IS.
 * Native signed training and teacher permit must precede ANY new player.
 * New 0.12 can NEVER be launched by this module: no trusted owner-v3/P5/
 * E9 0.12 control and no new teacher renderer are provisioned here.
 *
 * This file intentionally imports the EXISTING Studio access implementations.
 * The pure preflight below may be called by test doubles but always NO_GO;
 * such test inputs are not a signed teacher permit or release authority.
 */
import {initialiseAccess,hasAppAccess,requiredTraining}
 from '../access/access-control.js';
import {assertClbSignedTrainingPolicy}
 from '../integration/conversation-lab/teacher-launch.js';
import releaseProfile from './release-profile.js';

const ORIGIN='https://daniel22-dev.github.io';
const ROOT='/AI-Studio-GHRAB/conversation-lab/';
const ENTRY=ROOT+'teacher-entry.js';
const ROUTE=/^#\/l\/[a-z0-9]+(?:-[a-z0-9]+)*\/(?:en|es|de|fr)\/(?:A1|A2|B1|B2|C1|C2)\/s\/s0[1-8]$/;
const fail=x=>{throw Error('CLB_R4C10_TEACHER_'+x);};
const need=(x,code)=>{if(!x)fail(code);};
const cleanUrl=x=>{
  need(typeof x==='string'&&x.length<=512,'URL_TYPE');
  try{return new URL(x);}catch{fail('URL_INVALID');}
};

/**
 * Pre-release contract test only. Never returns authorization or executes JS.
 * A signed training predicate alone is not a valid 0.12 content release.
 */
export async function inspectTeacher012Proposal(context,access,profile){
  need(context&&typeof context==='object'&&
    context.topLevel===true,'TOP_LEVEL_ONLY');
  const page=cleanUrl(context.pageHref),module=cleanUrl(context.moduleHref),
    base=cleanUrl(context.documentBase);
  need(page.origin===ORIGIN&&page.protocol==='https:'&&
    (page.pathname===ROOT||page.pathname===ROOT+'index.html')&&
    !page.username&&!page.password&&!page.search&&
    (page.hash===''||page.hash==='#/library'||ROUTE.test(page.hash)),
    'STUDIO_PAGE_ORIGIN');
  need(module.origin===ORIGIN&&module.pathname===ENTRY&&
    !module.username&&!module.password&&!module.search&&!module.hash&&
    base.origin===ORIGIN&&base.pathname===ROOT&&
    !base.search&&!base.hash&&!base.username&&!base.password,
    'STUDIO_MODULE_OR_BASE');
  need(access&&typeof access.initialiseAccess==='function'&&
    typeof access.requiredTraining==='function'&&
    typeof access.assertClbSignedTrainingPolicy==='function'&&
    typeof access.hasAppAccess==='function','NATIVE_GATES_REQUIRED');
  await access.initialiseAccess();
  // Must be the real signed Studio access bundle, never QR/Cloudflare flags.
  access.assertClbSignedTrainingPolicy(access.requiredTraining('conversation-lab'));
  const permit=access.hasAppAccess('conversation-lab');
  need(permit?.enabled===true,'SIGNED_TEACHER_PERMIT_REQUIRED');
  need(profile?.appId==='conversation-lab'&&
    profile?.appVersion==='0.12.0', 'OWNER_012_PROFILE_NOT_INSTALLED');
  // Future gate must check exact 0.12 native E9 control, real owner ES256-v3,
  // independently pinned P5 report, distribution ZIPs and LIVE evidence.
  // None is installed here. Do not accept injected booleans or callback GO.
  fail('OWNER_V3_P5_E9_RELEASE_REQUIRED');
}

/** Native wrapper for a future Studio-only file; never transfer credentials. */
export async function inspectNativeTeacher012(){
  return inspectTeacher012Proposal({
    pageHref:globalThis.location?.href,
    moduleHref:import.meta.url,
    documentBase:globalThis.document?.baseURI,
    topLevel:globalThis.window?.top===globalThis.window?.self
  },{initialiseAccess,hasAppAccess,requiredTraining,
     assertClbSignedTrainingPolicy},releaseProfile);
}
// No auto-start and no player import. This source is not the live Studio E9.
