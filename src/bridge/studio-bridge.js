/* AI Studio GHRAB — Studio Bridge v1.1
   Drop-in helper for applications hosted on the same origin as AI Studio.
   It never sends data over the network. Handoffs expire after 30 minutes. */
(function(global){
  'use strict';
  const HANDOFF_KEY='ghrab.handoff.v1';
  const WORKSPACE_KEY='ghrab.workspace.v1';
  const parse=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
  const validMaterial=m=>Boolean(m&&m.schema==='ghrab-material-v1'&&m.id&&m.title&&m.subject&&m.content&&typeof m.content==='object');
  function storageError(key,error){
    console.warn(`AI Studio Bridge: localStorage write failed for ${key}`,error);
    try{global.dispatchEvent(new CustomEvent('ghrab:storage-error',{detail:{key,name:error?.name||'StorageError'}}))}catch{}
  }
  function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(error){storageError(key,error);return false}}
  function remove(key){try{localStorage.removeItem(key);return true}catch{return false}}
  function peek(target){
    const payload=parse(HANDOFF_KEY,null);
    if(!payload||payload.schema!=='ghrab-handoff-v1'||!validMaterial(payload.material))return null;
    if(Date.parse(payload.expiresAt||'')<Date.now()){remove(HANDOFF_KEY);return null}
    if(target&&payload.target!==target)return null;
    return payload;
  }
  function consume(target){const payload=peek(target);if(payload)remove(HANDOFF_KEY);return payload}
  function defaultStudioUrl(){
    const path=location.pathname.split('/').filter(Boolean);const repo=path[0]||'';
    if(repo.toLowerCase()==='ai-studio-ghrab')return `${location.origin}/${repo}/`;
    return `${location.origin}/AI-Studio-GHRAB/`;
  }
  function studioUrl(payload){
    try{return payload?.studioUrl&&new URL(payload.studioUrl).origin===location.origin?payload.studioUrl:defaultStudioUrl()}
    catch{return defaultStudioUrl()}
  }
  function create(target,material,ttlMinutes=30){
    if(!validMaterial(material))throw new Error('Invalid GHRAB Material v1');
    const payload={schema:'ghrab-handoff-v1',target,source:'application',createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+ttlMinutes*60000).toISOString(),studioUrl:defaultStudioUrl(),material};
    return write(HANDOFF_KEY,payload)?payload:null;
  }
  function workspace(){const list=parse(WORKSPACE_KEY,[]);return Array.isArray(list)?list:[]}
  function save(material){if(!validMaterial(material))throw new Error('Invalid GHRAB Material v1');const list=workspace();const i=list.findIndex(x=>x.id===material.id);if(i>=0)list[i]=material;else list.unshift(material);return write(WORKSPACE_KEY,list.slice(0,20))?material:null}
  global.GHRABStudioBridge={version:'1.1.0',peek,consume,create,workspace,save,studioUrl,validMaterial};
})(window);
