#!/usr/bin/env python3
"""Recover both exact reviewed archives, then install the owner-bound teacher build.
GET-only Cloudflare access; no credentials, hosting writes, signatures or approval
are created here. The original teacher ZIP must match before binding its profile.
"""
from __future__ import annotations
import argparse, concurrent.futures, hashlib, io, json, zipfile
import urllib.request, urllib.error
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ORIGIN='https://conversation-lab-ghrab.pages.dev'
PUBLIC_SHA='7c226d23bd49d393440bff17a478932fed78f66dd7b0d3978e3999870403f338'
TEACHER_SHA='73599cdb3250652cd10c491ef81ee2102ce66aab350b3b3e0560ce260da8f5de'
INVENTORY_SHA='8d1468774044361a8217af2237eb44804bf07d440c6aac459970289cdfc9e6c8'
STATEMENT_SHA='7a5d3f31f0ebd146fc3c154f4ba16ddb26cbfa14b06313645ac8be54853f3d79'
sha=lambda b:hashlib.sha256(b).hexdigest()
def need(x,m):
 if not x:raise ValueError(m)
def canonical(x):return (json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None
def get(name):
 path='' if name=='index.html' else 'manual/' if name=='manual/index.html' else '__clb_0_11_0_missing__' if name=='404.html' else name
 url=ORIGIN+'/'+path
 request=urllib.request.Request(url,headers={'Accept-Encoding':'identity','Cache-Control':'no-cache','User-Agent':'CLB-TEACHER-INTEGRATION-READONLY'})
 try:r=urllib.request.build_opener(NoRedirect()).open(request,timeout=30)
 except urllib.error.HTTPError as e:r=e
 with r:
  need(r.status==(404 if name=='404.html' else 200) and r.geturl()==url,'Unexpected HTTP '+name)
  need(not r.headers.get('Set-Cookie') and not r.headers.get('Access-Control-Allow-Origin'),'Unexpected credential/CORS state')
  raw=r.read(2_000_001);need(len(raw)<=2_000_000,'Oversized response');return raw

def zipbytes(files):
 buf=io.BytesIO()
 with zipfile.ZipFile(buf,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as out:
  for name,raw in sorted(files.items()):
   i=zipfile.ZipInfo(name,(2026,10,19,14,0,0));i.external_attr=0o100644<<16;i.compress_type=zipfile.ZIP_DEFLATED;out.writestr(i,raw,compresslevel=9)
 return buf.getvalue()
def main(local=None):
 raw=(ROOT/'config/clb-master-public-inventory.json').read_bytes();need(sha(raw)==INVENTORY_SHA,'Public inventory pin')
 inv=json.loads(raw);files={}
 def one(n):
  b=(local/n).read_bytes() if local else get(n)
  rec=inv['files'][n];need(sha(b)==rec['sha256'] and len(b)==rec['size'],'Byte mismatch '+n);return n,b
 names=[n for n in inv['files'] if n!='_headers']
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
  for n,b in ex.map(one,names):files[n]=b
 files['_headers']=(ROOT/'scripts/fixtures/clb-original-headers.txt').read_bytes()
 files['release-integrity.json']=raw
 need(sha(zipbytes(files))==PUBLIC_SHA,'Exact original public ZIP reconstruction failed')
 teacher={n:b for n,b in files.items() if n not in ['_headers','robots.txt','assets/public-entry.js','release-integrity.json']}
 target=ROOT/'src/conversation-lab'
 for name in ['index.html','teacher-entry.js']:teacher[name]=(target/name).read_bytes()
 teacher['release-profile.js']=(ROOT/'scripts/fixtures/clb-original-release-profile.js').read_bytes()
 teacher['404.html']=teacher['404.html'].replace(b'href="/assets/catalog.css"',b'href="/AI-Studio-GHRAB/conversation-lab/assets/catalog.css"').replace(b'href="/"',b'href="/AI-Studio-GHRAB/conversation-lab/"')
 def recordset():return {n:{'sha256':sha(b),'size':len(b)} for n,b in teacher.items() if n!='teacher-integrity.json'}
 tinv={'schema':'ghrab-clb-studio-master-inventory-v1','version':'0.11.0','releaseId':'cl-master-72-20261019-r1','status':'PRELIVE_HOLD','publicZipSha256':PUBLIC_SHA,'files':recordset()}
 teacher['teacher-integrity.json']=canonical(tinv)
 need(sha(zipbytes(teacher))==TEACHER_SHA,'Exact original teacher ZIP reconstruction failed')
 profile=(target/'release-profile.js').read_bytes();need(STATEMENT_SHA.encode() in profile,'Current owner statement binding absent')
 teacher['release-profile.js']=profile
 tinv.update(status='OWNER_SIGNED_CONTENT_INSTALLED_RELEASE_GATES_REQUIRED',signedReleaseStatementSha256=STATEMENT_SHA,originalTeacherZipSha256=TEACHER_SHA,files=recordset())
 teacher['teacher-integrity.json']=canonical(tinv)
 need(len(teacher)==120,'Wrong teacher file count')
 existing={str(p.relative_to(target)) for p in target.rglob('*') if p.is_file()}
 need(not existing-set(teacher),'Unexpected existing teacher files')
 for name,raw in teacher.items():
  p=target/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw)
 print(json.dumps({'status':'PASS','exactOriginalPublicArchive':PUBLIC_SHA,'exactOriginalTeacherArchive':TEACHER_SHA,'teacherFiles':120,'preservedCommonFiles':115,'hostingWrites':False,'signatureCreated':False,'productionPromotion':False}))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--local-public',type=Path);a=p.parse_args();main(a.local_public)
