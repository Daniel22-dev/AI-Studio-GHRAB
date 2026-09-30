import { LocalGroupsProvider, installGlobalGroupsApi } from "./group-service.js";

const $ = (s, r=document) => r.querySelector(s);
const tr = (cs,en) => document.documentElement.lang === "en" ? en : cs;
const provider = new LocalGroupsProvider({ onDiagnostic: () => {} });
const api = installGlobalGroupsApi({ provider });
let selectedId = null;
let filter = "active";
let preview = null;

function schoolYear(){
  const d=new Date(), y=d.getMonth()>=7?d.getFullYear():d.getFullYear()-1;
  return `${y}/${String((y+1)%100).padStart(2,"0")}`;
}
function escText(v){ return String(v??""); }
function activeCount(g){ return (g.members||[]).filter(m=>m.status==="active").length; }
function openDialog(d){ typeof d.showModal==="function" ? d.showModal() : d.setAttribute("open",""); }
function closeDialog(d){ typeof d.close==="function" ? d.close() : d.removeAttribute("open"); }
function err(e){ return String(e?.message||e||tr("Operace se nepodařila.","Operation failed.")).split(":")[0]; }

function renderList(){
  const root=$("#groups-list"); root.replaceChildren();
  const list=api.listGroups({status:filter});
  if(!list.some(g=>g.groupId===selectedId)) selectedId=list[0]?.groupId||null;
  if(!list.length){
    const box=document.createElement("div"); box.className="groups-empty";
    box.textContent=filter==="active"?tr("Zatím nemáte žádné aktivní skupiny.","No active groups yet."):tr("Archiv je prázdný.","Archive is empty.");
    root.append(box); renderDetail(); return;
  }
  for(const g of list){
    const b=document.createElement("button"); b.type="button";
    b.className="group-card"+(g.groupId===selectedId?" is-selected":"");
    const name=document.createElement("strong"); name.textContent=g.displayName;
    const meta=document.createElement("span"); meta.textContent=`${g.schoolYear} · ${g.subject||"—"} · ${activeCount(g)} ${tr("studentů","students")}`;
    b.append(name,meta); b.addEventListener("click",()=>{selectedId=g.groupId;render();}); root.append(b);
  }
  renderDetail();
}

function renderDetail(){
  const root=$("#groups-detail"); root.replaceChildren();
  const g=selectedId?api.getGroup(selectedId):null;
  if(!g){ root.textContent=tr("Vyberte skupinu nebo vytvořte novou.","Select a group or create a new one."); return; }
  const head=document.createElement("div"); head.className="groups-detail-head";
  const title=document.createElement("div");
  const h=document.createElement("h2"); h.textContent=g.displayName;
  const meta=document.createElement("p"); meta.textContent=`${g.schoolYear} · ${g.subject||"—"} · ${g.grade||"—"} · rev. ${g.revision}`;
  title.append(h,meta);
  const actions=document.createElement("div"); actions.className="groups-actions";
  const edit=button(tr("Upravit","Edit"),()=>editGroup(g));
  const roster=button(tr("Import / aktualizace z IS","Import / update from IS"),()=>openRoster(g),"primary");
  actions.append(edit,roster);
  if(g.status==="active") actions.append(button(tr("Archivovat","Archive"),()=>archiveGroup(g),"danger"));
  else actions.append(button(tr("Znovu aktivovat","Reactivate"),()=>reactivate(g)));
  head.append(title,actions); root.append(head);

  const stat=document.createElement("div"); stat.className="groups-stats";
  stat.textContent=`${tr("Aktivní studenti","Active students")}: ${activeCount(g)} · ${tr("Archivovaní","Archived")}: ${g.members.length-activeCount(g)}`;
  root.append(stat);

  const table=document.createElement("table"); table.className="groups-table";
  const thead=document.createElement("thead"); thead.innerHTML="<tr><th>Student</th><th>E-mail</th><th>Status</th></tr>";
  const tbody=document.createElement("tbody");
  for(const m of [...g.members].sort((a,b)=>a.status===b.status?a.name.localeCompare(b.name,"cs"):a.status==="active"?-1:1)){
    const row=document.createElement("tr");
    for(const v of [m.name,m.schoolEmail||"—",m.status==="active"?tr("aktivní","active"):tr("archiv","archived")]){
      const td=document.createElement("td"); td.textContent=v; row.append(td);
    }
    tbody.append(row);
  }
  table.append(thead,tbody); root.append(table);
}

function button(label,fn,kind="secondary"){
  const b=document.createElement("button"); b.type="button"; b.className=`groups-button groups-button-${kind}`; b.textContent=label; b.addEventListener("click",fn); return b;
}
function render(){ document.querySelectorAll("[data-group-filter]").forEach(b=>b.classList.toggle("is-active",b.dataset.groupFilter===filter)); renderList(); }

function openGroupDialog(g=null){
  $("#group-edit-id").value=g?.groupId||""; $("#group-name").value=g?.displayName||""; $("#group-year").value=g?.schoolYear||schoolYear();
  $("#group-subject").value=g?.subject||""; $("#group-grade").value=g?.grade||""; $("#group-error").textContent=""; openDialog($("#group-dialog")); $("#group-name").focus();
}
function editGroup(g){ openGroupDialog(g); }
$("#group-form").addEventListener("submit",e=>{
  e.preventDefault(); const id=$("#group-edit-id").value;
  const data={displayName:$("#group-name").value,schoolYear:$("#group-year").value,subject:$("#group-subject").value,grade:$("#group-grade").value};
  try{
    const g=id?api.updateGroup(id,data,{expectedRevision:api.getRevision(id)}):api.createGroup(data);
    selectedId=g.groupId; filter=g.status; closeDialog($("#group-dialog")); render();
  }catch(ex){ $("#group-error").textContent=err(ex); }
});
async function archiveGroup(g){ if(!confirm(tr(`Archivovat skupinu „${g.displayName}“?`,`Archive “${g.displayName}”?`))) return; api.archiveGroup(g.groupId,{expectedRevision:g.revision}); selectedId=null; render(); }
function reactivate(g){ const n=api.updateGroup(g.groupId,{status:"active"},{expectedRevision:g.revision}); filter="active"; selectedId=n.groupId; render(); }

function openRoster(g){ preview=null; $("#roster-group-name").textContent=g.displayName; $("#roster-dialog").dataset.groupId=g.groupId; $("#roster-input").value=""; $("#roster-preview").replaceChildren(); $("#roster-confirm").disabled=true; $("#roster-error").textContent=""; openDialog($("#roster-dialog")); }
function showPreview(p){
  const root=$("#roster-preview"); root.replaceChildren();
  const s=document.createElement("p"); s.className="groups-preview-summary";
  s.textContent=`${tr("Rozpoznáno","Parsed")}: ${p.parsed.entries.length} · +${p.diff.added.length} · Δ${p.diff.changed.length} · ↺${p.diff.restored.length} · −${p.diff.removed.length} · ${tr("neplatné","invalid")}: ${p.parsed.invalid.length}`;
  root.append(s);
  for(const [kind,items] of [["+",p.diff.added],["Δ",p.diff.changed],["↺",p.diff.restored],["−",p.diff.removed]]){
    for(const item of items.slice(0,80)){
      const row=document.createElement("div"); row.className="preview-row";
      const value=item.name||item.after?.name||item.before?.name||""; row.textContent=`${kind} ${value}`; root.append(row);
    }
  }
  for(const item of p.parsed.invalid.slice(0,20)){ const row=document.createElement("div"); row.className="preview-row invalid"; row.textContent=`! ${item.value}`; root.append(row); }
}
$("#roster-preview-button").addEventListener("click",()=>{
  try{
    const id=$("#roster-dialog").dataset.groupId; preview=api.previewRosterImport(id,$("#roster-input").value,{replace:$("#roster-replace").checked});
    showPreview(preview); $("#roster-confirm").disabled=!preview.parsed.entries.length||!preview.diff.hasChanges; $("#roster-error").textContent="";
  }catch(ex){ preview=null; $("#roster-confirm").disabled=true; $("#roster-error").textContent=err(ex); }
});
$("#roster-form").addEventListener("submit",e=>{
  e.preventDefault(); if(!preview) return;
  try{
    const result=api.importRoster({groupId:preview.groupId,rawText:$("#roster-input").value,replace:$("#roster-replace").checked,expectedRevision:preview.currentRevision});
    selectedId=result.group.groupId; closeDialog($("#roster-dialog")); preview=null; render();
  }catch(ex){ $("#roster-error").textContent=err(ex); $("#roster-confirm").disabled=true; preview=null; }
});
document.querySelectorAll("[data-dialog-close]").forEach(b=>b.addEventListener("click",()=>closeDialog(b.closest("dialog"))));
document.querySelectorAll("[data-group-filter]").forEach(b=>b.addEventListener("click",()=>{filter=b.dataset.groupFilter;selectedId=null;render();}));
$("#group-create").addEventListener("click",()=>openGroupDialog());
$("#groups-export").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(api.exportBackup(),null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="ai-studio-moje-skupiny-backup.json"; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),0);
});
$("#groups-import-file").addEventListener("change",async e=>{
  const f=e.target.files?.[0]; e.target.value=""; if(!f) return;
  if(!confirm(tr("Obnova přepíše současná data skupin. Pokračovat?","Restore replaces current group data. Continue?"))) return;
  try{ api.importBackup(JSON.parse(await f.text())); selectedId=null; filter="active"; render(); }catch(ex){ alert(err(ex)); }
});
render();
