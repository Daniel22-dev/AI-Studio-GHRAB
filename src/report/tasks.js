// Local task register. Approval is a reference to a separately retained agreement,
// never a digital signature or server authorisation.
export const TASK_KEY = 'ghrab.ai-studio.report.tasks.v1';
export const TASK_SCHEMA = 'ghrab-task-register-v1';
export const STATES = {
 draft: 'Rozepsáno', sent: 'K odsouhlasení', approved: 'Schváleno – evidence souhlasů', delivered: 'Předáno', launched: 'Nasazeno', cancelled: 'Zrušeno' }
;
export const RIGHTS = 'Podle čl. 3 a 4 rámcové dohody verze 9.2 vykonává majetková práva k vlastním autorským částem autor i při zaměstnaneckém díle (§ 58 odst. 1 autorského zákona). Škola získá bezúplatnou nevýhradní licenci k internímu užívání, úpravám a údržbě předaných verzí, která trvá i po skončení role. Práva třetí'
 + 'ch osob zůstávají zachována. Odchylný režim vyžaduje výslovnou oboustrannou písemnou dohodu. Nová aplikace uvedená v této schválené kartě doplňuje přílohu A rámcové dohody pod uvedeným ID; konkrétní verzi určí předávací záznam. Karta se použije až po účinnosti rámcové dohody, dohody o roli a pracovn'
 + 'ího dodatku.';
const FIELDS = [
 ['title','Název zadání',160,'Krátký název, podle kterého zadání později bezpečně poznáte.','např. AI Akademie – propojení se Studiem'],
 ['kind','Typ zadání',100,'Uveďte, zda jde o novou aplikaci, větší změnu, integraci, migraci nebo jiný samostatný projekt.','např. Nová aplikace / větší změna / integrace / migrace'],
 ['app','Aplikace / pracovní ID',180,'Název existující aplikace nebo pracovní název a ID nové aplikace.','např. AI Studio · Report / NEW · AI Akademie'],
 ['goal','Požadovaný výsledek a způsob převzetí',2200,'Popište konkrétní stav po dokončení a podle čeho škola pozná, že je zadání splněno.','Co přesně bude hotové, jak bude výsledek vypadat a kdo ho převezme.'],
 ['scope','Rozsah a co do zadání nepatří',1800,'Vymezte hranice práce. Pomáhá to zabránit tomu, aby se zadání během realizace nejasně rozšiřovalo.','Co je součástí zadání a které navazující věci už součástí nejsou.'],
 ['capacity','Kapacita a termín',1200,'Uveďte realistický odhad času a cílový termín nebo období.','např. 8–12 hodin, dokončení do 30. 9. 2026'],
 ['support','Součinnost školy / IT / přebírající osoba',1400,'Napište, kdo musí dodat podklady, provést zásah na serveru, rozhodnout nebo převzít výsledek; případně uveďte omezení dotace.','např. IT poskytne deployment parametry; výsledek převezme vedení školy.'],
 ['pay','Pracovní režim a odměňování',1400,'Zapište pouze skutečně dohodnutý režim. Pokud zatím dohodnutý není, zadání průběžně uložte, ale ještě ho neuzavírejte k odsouhlasení.','např. v rámci pracovní náplně a dohodnuté kapacity / dle samostatné dohody'],
 ['budget','Nástroje a rozpočet školy',1000,'Uveďte placené nástroje, licence, API nebo jiné přímé náklady. Pokud nejsou, napište to výslovně.','např. Bez dalších nákladů / OpenAI API z prostředků školy'],
 ['safety','Data, bezpečnost a podmínky nasazení',1800,'Shrňte typ zpracovávaných dat, bezpečnostní kontroly, GARP a případné podmínky IT před nasazením.','Jaká data se používají, jaké kontroly musí proběhnout a co je podmínkou provozu.'],
 ['components','Vlastní části, cizí komponenty a licence',1800,'Uveďte převzaté knihovny, předchozí vlastní části a jejich licence. Pokud nic takového není, napište „Žádné“.','např. Vlastní kód + knihovna X (MIT); žádné další cizí komponenty.'],
 ['rights','Práva a licence',2400,'Předvyplněno podle rámcového režimu. Měňte jen tehdy, pokud má být pro toto zadání výslovně sjednána odchylka.','']
];
const RECORDS = ['schoolName','schoolDate','schoolRef','authorName','authorDate','authorRef','version','archive','handoverDate','acceptedBy','acceptanceRef','launchDate','launchBy','assessmentRef','cancelReason'];
const tidy = (v) => typeof v === 'string' ? v.trim() : '';
const dateOK = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v;
const now = () => new Date().toISOString();
function wrapLines(ctx, text, width) {
  const lines = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? line + " " + word : word;
      if (ctx.measureText(candidate).width <= width) { line = candidate; continue; }
      if (line) lines.push(line);
      line = "";
      for (const char of word) {
        if (ctx.measureText(line + char).width > width) { lines.push(line); line = ""; }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}
export function taskRef(t) {
 return `${t.id} / v${t.revision}`;
 }
export function validateRegister(value) {
 if (!value || value.schema !== TASK_SCHEMA || !Array.isArray(value.tasks) || value.tasks.length > 500) throw Error('Neplatná záloha karet (nejvýše 500 verzí).');
 const seen = new Set();
 const tasks = value.tasks.map(raw => {
  if (!raw || !/^AI-[A-Z0-9-]{6,50}$/.test(raw.id) || !Number.isInteger(raw.revision) || raw.revision < 1 || raw.revision > 9999 || !Object.hasOwn(STATES, raw.state)) throw Error('Neplatné ID, verze nebo stav karty.');
  const ref = taskRef(raw);
 if (seen.has(ref)) throw Error('Duplicitní verze karty.');
 seen.add(ref);
  const t = {
id:raw.id, revision:raw.revision, state:raw.state}
;
  for (const [key,,max] of FIELDS) {
 if (typeof raw[key] !== 'string' || raw[key].length > max) throw Error('Neplatné pole zadání.');
 t[key]=raw[key];
 }
  for (const key of RECORDS) {
 if (typeof raw[key] !== 'string' || raw[key].length > 1200) throw Error('Neplatný záznam souhlasu či předání.');
 t[key]=raw[key];
 }
  for (const key of ['createdAt','updatedAt']) {
 if (typeof raw[key] !== 'string' || !Number.isFinite(Date.parse(raw[key]))) throw Error('Neplatné datum evidence.');
 t[key]=raw[key];
 }
  if (t.state !== 'draft' && t.state !== 'cancelled' && FIELDS.some(([k]) => !tidy(t[k]))) throw Error('Uzavřené zadání není úplné.');
  if (['approved','delivered','launched'].includes(t.state) && (!t.schoolName || !dateOK(t.schoolDate) || !t.schoolRef || !t.authorName || !dateOK(t.authorDate) || !t.authorRef)) throw Error('Chybí doložení souhlasů obou stran.');
  if (['delivered','launched'].includes(t.state) && (!t.version || !t.archive || !dateOK(t.handoverDate) || !t.acceptedBy || !t.acceptanceRef)) throw Error('Chybí evidence předání.');
  if (t.state === 'launched' && (!dateOK(t.launchDate) || !t.launchBy || !t.assessmentRef)) throw Error('Chybí rozhodnutí o nasazení.');
  if (t.state === 'cancelled' && !t.cancelReason) throw Error('Chybí důvod zrušení.');
  return t;
 }
);
 return {
schema:TASK_SCHEMA,tasks}
;
}
export function nextRevision(t, all) {
 return {
...t,revision:Math.max(...all.filter(x=>x.id===t.id).map(x=>x.revision))+1,state:'draft',...Object.fromEntries(RECORDS.map(k=>[k,''])),createdAt:now(),updatedAt:now()}
;
}
export function initTasks({
G,downloadBlob,canvasesPdf,onChange,onWork}
) {
 const $ = s=>document.querySelector(s), host=$('#report-tasks');
 let register={
schema:TASK_SCHEMA,tasks:[]}
, selected='', dirty=false, loadError=false;
 let baseline = G.safeGetItem(TASK_KEY);
 const status=$('#task-status');
 const feedback = (text,error=false)=> {
status.textContent=text;
status.className=`form-feedback ${error?'error':'success'}`;
}
;
 try {
 const raw=G.safeGetItem(TASK_KEY);
 if(raw) register=validateRegister(JSON.parse(raw));
 }
 catch {
loadError=true;
feedback('Uložené karty nelze načíst. Stáhněte původní data a obnovte ověřenou zálohu; registr nebude přepsán.',true);
}
 const current=()=>register.tasks.find(t=>taskRef(t)===selected);
 function persist(tasks) {
  if(G.safeGetItem(TASK_KEY)!==baseline) throw Error('Registr změnilo jiné okno. Zkopírujte neuložený text a obnovte stránku, abyste nepřepsali novější karty.');
  if(loadError) throw Error('Poškozený registr nejprve obnovte ze zálohy.');
  const next=validateRegister({
schema:TASK_SCHEMA,tasks}
);
  if(!G.safeSetJson(TASK_KEY,next)) throw Error('Kartu se nepodařilo uložit. Data ve formuláři zůstala zachována; uvolněte místo nebo stáhněte zálohu.');
  baseline=G.safeGetItem(TASK_KEY);
register=next;
dirty=false;
render();
onChange();
 }
 function replace(t) {
persist(register.tasks.map(x=>taskRef(x)===taskRef(t)?t:x));
}
 function safe(fn) {
return async()=>{
try{
await fn();
}
catch(e){
feedback(e.message||'Operace se nezdařila.',true);
}
}
;
}
 function btn(text,fn,cls='secondary'){
const b=document.createElement('button');
b.type='button';
b.className=`button ${cls}`;
b.textContent=text;
b.addEventListener('click',safe(fn));
return b;
}
 function element(tag,text,cls=''){
const e=document.createElement(tag);
e.textContent=text;
if(cls)e.className=cls;
return e;
}
 function field(form,key,label,value='',type='text',max=1200,required=true,help='',placeholder=''){
  const wrap=element('label',label);
wrap.className='task-field';
  if(help)wrap.append(element('small',help,'task-field-help'));
  const e=document.createElement(type==='textarea'?'textarea':'input');
if(type!=='textarea')e.type=type;
else e.rows=3;
  e.id=`task-${key}`;
e.name=key;
e.value=value;
e.maxLength=max;
e.required=required;
if(placeholder)e.placeholder=placeholder;
wrap.append(e);
form.append(wrap);
return e;
 }
 function callout(title,text,extra=''){
  const box=element('div','',`task-next-action${extra?` ${extra}`:''}`);
  box.append(element('strong',title),element('p',text));
  return box;
 }
 function progress(t){
  const stages=[['draft','Návrh'],['sent','K odsouhlasení'],['approved','Schváleno'],['delivered','Předáno'],['launched','Nasazeno']];
  const currentIndex=stages.findIndex(([state])=>state===t.state);
  const wrap=element('div','','task-progress');
  wrap.setAttribute('aria-label',`Stav zadání: ${STATES[t.state]}`);
  for(const [state,label] of stages){
   const index=stages.findIndex(([candidate])=>candidate===state);
   const item=element('div','','task-progress-step');
   if(t.state!=='cancelled'&&index<currentIndex)item.classList.add('done');
   if(t.state!=='cancelled'&&index===currentIndex){item.classList.add('current');item.setAttribute('aria-current','step');}
   item.append(element('span',index<currentIndex&&t.state!=='cancelled'?'✓':String(index+1),'task-progress-index'),element('span',label,'task-progress-label'));
   wrap.append(item);
  }
  if(t.state==='cancelled')wrap.classList.add('is-cancelled');
  return wrap;
 }
 function readFields(form,t,keys){
const copy={
...t,updatedAt:now()}
;
for(const k of keys)copy[k]=tidy(form.elements[k]?.value);
return copy;
}
 function unmodified(){
if(dirty)throw Error('Nejprve uložte rozepsané změny, nebo otevřete kartu znovu a změny zahoďte.');
}
 function choose(ref){
if(dirty&&!confirm('Zahodit neuložené změny formuláře?'))return;
selected=ref;
feedback('');
dirty=false;
render();
}
 function newTask(){
unmodified();
const t={
id:`AI-${crypto.randomUUID().slice(0,8).toUpperCase()}`,revision:1,state:'draft',...Object.fromEntries([...FIELDS.map(x=>x[0]),...RECORDS].map(k=>[k,''])),createdAt:now(),updatedAt:now()}
;
  t.kind='Nová aplikace';
t.rights=RIGHTS;
  // Remuneration is intentionally not pre-approved or priced.
  t.pay='';
selected=taskRef(t);
persist([...register.tasks,t]);feedback('Nové zadání založeno. Doplňte výsledek a podmínky.');
$('#task-title')?.focus();
 }
 function submitForm(form,handler){
form.addEventListener('input',()=>{
dirty=true;
}
);
form.addEventListener('submit',e=>{
e.preventDefault();
safe(()=>handler(form))();
}
);
const b=element('button','Uložit záznam','button primary');
b.type='submit';
form.append(b);
}
 function render(){
  const list=$('#task-list');
list.replaceChildren();
  const ordered=[...register.tasks].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  for(const t of ordered) {
const b=btn(`${taskRef(t)} · ${t.title||'Nové zadání'} · ${STATES[t.state]}`,()=>choose(taskRef(t)));
b.setAttribute('aria-pressed',String(taskRef(t)===selected));
list.append(b);
}
  if(!ordered.length)list.append(element('p','Zatím není založené zadání. Pro běžnou podporu stačí evidence práce. Novou aplikaci, migraci nebo centrální přihlášení založte tlačítkem Nové zadání.'));
  const panel=$('#task-editor');
panel.replaceChildren();
const t=current();
if(!t){
panel.hidden=true;
refreshLinks();
return;
}
panel.hidden=false;
  panel.append(element('h3',`${taskRef(t)} · ${t.title||'Nové zadání'}`));
  panel.append(progress(t));
  if(t.state==='cancelled')panel.append(callout('Tato verze byla zrušena nebo nahrazena',t.cancelReason,'warning'));
  const actions=element('div','','task-actions task-editor-actions');
  actions.append(btn(t.state==='draft'?'Stáhnout náhled karty PDF':'Stáhnout aktuální kartu PDF',async()=>{
unmodified();
await exportPdf(t);
}
));
  if(['approved','delivered','launched'].includes(t.state))actions.append(btn('Zapsat práci k zadání',()=>{
unmodified();
onWork(t);
$('#report-work-log')?.scrollIntoView({
behavior:'smooth'}
);
}
));
  if(t.state!=='draft')actions.append(btn('Vytvořit novou verzi zadání',()=>{
unmodified();
const rev=nextRevision(t,register.tasks);
selected=taskRef(rev);
persist([...register.tasks,rev]);feedback('Nová verze je rozepsaná. Vyžaduje nové odsouhlasení obou stran.');
}
));
  panel.append(actions);
  if(t.state==='draft'){
   panel.append(element('p','Vyplňte zadání tak, aby člověk, který u vývoje nebyl, přesně pochopil výsledek, hranice práce, čas, náklady a podmínky. Rozepsanou kartu lze kdykoli uložit i neúplnou.','task-section-intro'));
   const form=document.createElement('form');
form.className='task-grid';
form.noValidate=true;
   for(const [key,label,max,help,placeholder] of FIELDS) field(form,key,label,t[key],['title','kind','app'].includes(key)?'text':'textarea',max,false,help,placeholder);
   submitForm(form,f=>{
const n=readFields(f,t,FIELDS.map(x=>x[0]));
replace(n);
feedback('Rozepsané zadání uloženo.');
}
);
panel.append(form);
   const closing=callout('Co znamená uzavřít návrh?','Obsah této verze se zmrazí pro odsouhlasení. Neznamená to schválení, dokončení práce ani povolení nasazení. Po uzavření stáhnete PDF a pošlete přesně tuto verzi oprávněné osobě za školu.','important');
   closing.append(btn('Uzavřít návrh a připravit k odsouhlasení',()=>{
unmodified();
if(FIELDS.some(([k])=>!tidy(t[k])))throw Error('Před uzavřením doplňte všechna pole zadání včetně kapacity, pracovního režimu, práv a podmínek nasazení. Neúplný návrh můžete dál pouze ukládat.');
replace({
...t,state:'sent',updatedAt:now()}
);
feedback('Návrh je uzavřen k odsouhlasení. Další krok: stáhněte PDF a přiložte ho k e-mailu oprávněné osobě za školu.');
}
,'primary'));
   panel.append(closing);
  }
else{
   const details=document.createElement('details');
details.append(element('summary','Zobrazit celé uzavřené zadání'));
   for(const [key,label] of FIELDS){
details.append(element('h4',label),element('p',t[key],'task-prewrap'));
}
panel.append(details);
   if(t.state==='sent'){
    const next=callout('Další krok: pošlete kartu k odsouhlasení','Ano — stáhněte uzavřenou kartu PDF a přiložte ji k e-mailu ředitelce nebo jiné oprávněné osobě za školu. Měsíční report je jiný dokument a schválení zadání nenahrazuje. Po obdržení doložitelného souhlasu zapište údaje níže.','important');
    next.append(btn('Stáhnout PDF k odeslání',async()=>{
unmodified();
await exportPdf(t);
}
,'primary'));
    panel.append(next);
    const f=document.createElement('form');
f.className='task-grid';
    const approvalFields=[
      ['schoolName','Za školu – jméno a funkce','text','Osoba, která je oprávněná tuto konkrétní verzi zadání odsouhlasit.','např. jméno a funkce'],
      ['schoolDate','Datum souhlasu školy','date','Datum podpisu nebo doložitelného elektronického souhlasu.',''],
      ['schoolRef','Doklad souhlasu školy','text','Odkaz na uložený důkaz souhlasu: soubor, e-mail, číslo spisu nebo jiné dohledatelné označení.','např. e-mail ze dne … / podepsaná karta …'],
      ['authorName','Za autora / zaměstnance – jméno','text','Osoba, která zadání přijímá za autora nebo zaměstnance.','jméno autora / zaměstnance'],
      ['authorDate','Datum souhlasu autora','date','Datum podpisu nebo doložitelného elektronického souhlasu autora.',''],
      ['authorRef','Doklad souhlasu autora','text','Odkaz na uložený důkaz souhlasu autora.','např. podepsaná karta / e-mail ze dne …']
    ];
    for(const [k,l,type,help,placeholder] of approvalFields)field(f,k,l,t[k],type||'text',1200,true,help,placeholder);
    const check=element('label','Potvrzuji, že oba souhlasy se vztahují k této přesné verzi zadání a účinným smlouvám.');
const cb=document.createElement('input');
cb.type='checkbox';
cb.required=true;
check.prepend(cb);
f.append(check);
    submitForm(f,form=>{
replace({
...readFields(form,t,RECORDS.slice(0,6)),state:'approved'}
);
feedback('Souhlasy zaznamenány. Zadání je schválené; nyní můžete evidovat práci k této kartě a po dokončení zapsat předání.');
}
);
panel.append(f);
   }
   if(['approved','delivered','launched'].includes(t.state))panel.append(element('p',`Souhlasy: ${t.schoolName}, ${t.schoolDate} (${t.schoolRef}); ${t.authorName}, ${t.authorDate} (${t.authorRef}).`,'task-record-summary'));
   if(t.state==='approved'){
    const next=callout('Zadání je schválené','Práci na tomto zadání zapisujte přes „Zapsat práci k zadání“. Až bude výsledek skutečně předán škole, vyplňte níže přesnou předanou verzi a doklad převzetí. Schválení vývoje samo o sobě nepovoluje nasazení.');
    next.append(btn('Zapsat práci k zadání',()=>{
unmodified();
onWork(t);
$('#report-work-log')?.scrollIntoView({behavior:'smooth'});
}
,'primary'));
    panel.append(next);
    const f=document.createElement('form');
f.className='task-grid';
    const handoverFields=[
      ['version','Předávaná verze aplikace','text','Přesná verze nebo release, který škola skutečně přebírá.','např. 1.4.2'],
      ['archive','Neměnný archiv / commit a otisk zdrojů','text','Dohledatelná identifikace zdrojů, typicky Git commit/tag nebo archiv a případně SHA-256.','např. commit abc123 / release ZIP + SHA-256'],
      ['handoverDate','Datum předání','date','Datum, kdy byl konkrétní výsledek předán škole.',''],
      ['acceptedBy','Kdo převzal za školu','text','Jméno/funkce osoby, která výsledek převzala za školu.','jméno a funkce'],
      ['acceptanceRef','Doklad převzetí a případné výhrady','text','Odkaz na e-mail, protokol nebo jiný doklad. Pokud nebyly výhrady, uveďte „bez výhrad“.','např. e-mail ze dne …, bez výhrad']
    ];
    for(const [k,l,type,help,placeholder] of handoverFields)field(f,k,l,t[k],type||'text',1200,true,help,placeholder);
    submitForm(f,form=>{
replace({
...readFields(form,t,RECORDS.slice(6,11)),state:'delivered'}
);
feedback('Předání zaznamenáno. Karta nyní dokládá, která konkrétní verze byla škole předána; nasazení se eviduje zvlášť.');
}
);
panel.append(f);
   }
   if(['delivered','launched'].includes(t.state))panel.append(element('p',`Předáno: ${t.version}, ${t.handoverDate}; ${t.archive}. Převzal: ${t.acceptedBy}; ${t.acceptanceRef}.`,'task-record-summary'));
   if(t.state==='delivered'){
    panel.append(callout('Předání je hotové, nasazení je samostatné rozhodnutí','Pokud se předaná verze má používat v provozu, zaznamenejte až skutečné rozhodnutí školy po posouzení IT, dat a případných omezení. Samotné předání ani měsíční report provoz nepovolují.'));
    const f=document.createElement('form');
f.className='task-grid';
    const launchFields=[
      ['launchDate','Datum povolení nasazení','date','Datum rozhodnutí o provozním nasazení této konkrétní verze.',''],
      ['launchBy','Kdo povolil za školu','text','Osoba oprávněná rozhodnout o nasazení nebo jej potvrdit za školu.','jméno a funkce'],
      ['assessmentRef','Doklad kontroly IT a rozhodnutí školy','text','Uveďte verzi, povolené scénáře, typy dat, omezení a odkaz na rozhodnutí nebo kontrolu IT.','např. IT-01; verze 1.4.2; povolené interní scénáře; omezení …']
    ];
    for(const [k,l,type,help,placeholder] of launchFields)field(f,k,l,t[k],type||'text',1200,true,help,placeholder);
    submitForm(f,form=>{
replace({
...readFields(form,t,RECORDS.slice(11,14)),state:'launched'}
);
feedback('Rozhodnutí o nasazení zaznamenáno. Workflow této verze zadání je dokončené.');
}
);
panel.append(f);
   }
   if(t.state==='launched'){
    panel.append(element('p',`Nasazení: ${t.launchDate}, ${t.launchBy}; ${t.assessmentRef}.`,'task-record-summary'));
    panel.append(callout('Workflow této verze je dokončené','Karta zůstává jako dohledatelná evidence zadání, souhlasů, předání a nasazení. Další významnou změnu řešte novou verzí zadání; běžnou následnou práci zapisujte do evidence práce.','success'));
   }
  }
  if(t.state!=='cancelled')panel.append(btn('Zaznamenat zrušení / nahrazení',()=>{
unmodified();
const reason=prompt('Důvod a doklad dohody o zrušení či nahrazení této verze:');
if(!reason)return;
replace({
...t,state:'cancelled',cancelReason:reason,updatedAt:now()}
);
}
));
  else panel.append(element('p',`Zrušení: ${t.cancelReason}`));
  refreshLinks();
 }
 function refreshLinks(){
const s=$('#report-work-task');
if(!s)return;
const value=s.value;
s.replaceChildren(new Option('Bez karty – běžná agenda',''));
for(const t of register.tasks)s.add(new Option(`${taskRef(t)} · ${t.title||'Rozepsáno'} · ${STATES[t.state]}`,taskRef(t)));
s.value=value;
}
 function summary(workRefs=[]){
const tasks=register.tasks.filter(t=>t.state==='sent'&&!register.tasks.some(x=>x.id===t.id&&x.revision>t.revision));
const refs=[...new Set(workRefs.filter(Boolean))];
const work=refs.length ? `Vykázaná práce: ${refs.slice(0,2).join('; ')}${refs.length>2 ? '; další viz přehled karet' : ''}. ` : '';
return work + (tasks.length?`Aktuálně k odsouhlasení: ${tasks.length} ${tasks.length===1?'karta':'karet'}. ${tasks.slice(0,2).map(taskRef).join('; ')}${tasks.length>2?'; další viz přehled karet':''}. Zadání a souhlasy viz samostatné přílohy.`:'Karty k odsouhlasení: 0.');
}
 function lines(t){
return [
  ['Karta úkolu AI Studio GHRAB',true],[`${taskRef(t)} · ${STATES[t.state]}`,false],['Škola: Gymnázium, Ostrava-Hrabůvka, příspěvková organizace; IČO 00842745. Autor / zaměstnanec: Mgr. Daniel Baláž.',false],
  ...FIELDS.flatMap(([k,label])=>[[label,true],[t[k]||'[doplnit před schválením]',false]]),
  ['Souhlas s touto verzí zadání',true],['Za školu: '+(t.schoolName||'________________')+'; datum: '+(t.schoolDate||'________________')+'; podpis: ________________',false],['Za autora: '+(t.authorName||'________________')+'; datum: '+(t.authorDate||'________________')+'; podpis: ________________',false],
  ['Doklady souhlasů: '+(t.schoolRef||'[doplnit]')+' / '+(t.authorRef||'[doplnit]'),false],
  ['Záznam předání a nasazení',true],['Verze: '+(t.version||'[doplní se při předání]')+'; archiv / commit / otisk: '+(t.archive||'[doplnit]'),false],['Předání: '+(t.handoverDate||'[doplnit]')+'; převzal: '+(t.acceptedBy||'[doplnit]')+'; doklad a výhrady: '+(t.acceptanceRef||'[doplnit]'),false],['Nasazení: '+(t.launchDate||'[zatím nepovoleno]')+'; povolil: '+(t.launchBy||'[doplnit]')+'; posouzení a scénáře: '+(t.assessmentRef||'[doplnit]'),false],
  ...(t.cancelReason?[['Zrušení: '+t.cancelReason,false]]:[]),
  ['Studio eviduje odkazy na souhlasy a doklady; tento výstup bez podpisů nebo doložených elektronických souhlasů sám schválení neprokazuje. Změna uzavřeného zadání vyžaduje novou verzi a nové souhlasy. Report je pouze souhrn. Schválení zadání samo nepovoluje provoz.',false]
 ];
}
 async function exportPdf(t){
  const canvases=[];
let c,ctx,y;
  function page(){
c=document.createElement('canvas');
c.width=1240;
c.height=1754;
ctx=c.getContext('2d');
ctx.fillStyle='#fff';
ctx.fillRect(0,0,c.width,c.height);
ctx.fillStyle='#263954';
ctx.font='18px Arial';
ctx.fillText(`${taskRef(t)} · strana ${canvases.length+1}`,72,1687);
canvases.push(c);
y=84;
}
  page();
  const payload=JSON.stringify({
id:t.id,revision:t.revision,...Object.fromEntries(FIELDS.map(([k])=>[k,t[k]]))}
);
  const digest=crypto.subtle ? [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(payload)))].map(n=>n.toString(16).padStart(2,'0')).join('') : 'V tomto prostředí není výpočet dostupný; určující je schválená kopie zadání.';
  for(const [text,bold] of [...lines(t),['Otisk obsahu zadání SHA-256 (bez následných záznamů)',true],[digest,false]]){
   const font=bold?'bold 25px Arial':'22px Arial';
ctx.font=font;
   const rows=wrapLines(ctx,text,1090);
   if(bold&&y+85>1600){
page();
ctx.font=font;
}
for(const row of rows){
if(y>1600){
page();
ctx.font=font;
}
ctx.fillStyle=bold?'#162e52':'#17202c';
ctx.fillText(row,72,y);
y+=31;
}
y+=18;
  }
  downloadBlob(canvasesPdf(canvases),`${t.id}-v${t.revision}-${t.state}.pdf`);
 }
 $('#task-new').addEventListener('click',safe(newTask));
 $('#task-backup').addEventListener('click',safe(()=>{
unmodified();
const raw=loadError?G.safeGetItem(TASK_KEY):JSON.stringify(register,null,2);
downloadBlob(new Blob([raw],{
type:'application/json'}
),`AI-Studio-karty-${new Date().toISOString().slice(0,10)}.json`);
}
));
 $('#task-import').addEventListener('change',async e=>{
const file=e.target.files?.[0];
try{
  if(!file)return;
unmodified();
if(file.size>5*1024*1024)throw Error('Záloha je příliš velká (nejvýše 5 MB).');
  const incoming=validateRegister(JSON.parse(await file.text()));
  if(!confirm('Obnovit registr z této zálohy? Současné karty budou nahrazeny. Nejdříve si je stáhněte tlačítkem Záloha karet. Import sám neověřuje pravost souhlasů.'))return;
  if(!G.safeSetJson(TASK_KEY,incoming))throw Error('Zálohu se nepodařilo uložit. Původní karty zůstaly zachovány.');
baseline=G.safeGetItem(TASK_KEY);
register=incoming;
loadError=false;
selected='';
dirty=false;
render();
onChange();
feedback('Záloha obnovena. Pravost odkazovaných souhlasů ověřte z původních dokladů.');
 }
catch(err){
feedback(err.message,true);
}
finally{
e.target.value='';
}
}
);
 $('#task-overview').addEventListener('click',safe(async()=>{
unmodified();
const t={
id:'AI-PREHLED',revision:1,state:'draft'}
;
const pages=[];
let c,ctx,y;
const page=()=>{
c=document.createElement('canvas');
c.width=1240;
c.height=1754;
ctx=c.getContext('2d');
ctx.fillStyle='#fff';
ctx.fillRect(0,0,1240,1754);
ctx.fillStyle='#17202c';
ctx.font='22px Arial';
ctx.fillText(`Přehled karet · ${new Date().toLocaleDateString('cs-CZ')} · strana ${pages.length+1}`,70,70);
pages.push(c);
y=125;
}
;
page();
for(const t of register.tasks){
const text=`${taskRef(t)} · ${t.title} · ${STATES[t.state]}`;
for (const line of wrapLines(ctx,text,1090)) {
  if(y>1620)page(); ctx.fillText(line,70,y); y+=32;
}
y+=26;
}
if(!register.tasks.length)ctx.fillText('Zatím nejsou evidované karty.',70,y);
downloadBlob(canvasesPdf(pages),'AI-Studio-prehled-karet.pdf');
}
));
 window.addEventListener('beforeunload',e=>{
if(dirty){
e.preventDefault();
e.returnValue='';
}
}
);
 render();
return {
summary,refreshLinks,find:ref=>register.tasks.find(t=>taskRef(t)===ref),select:choose}
;
}
