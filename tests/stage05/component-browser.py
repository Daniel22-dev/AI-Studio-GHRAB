from pathlib import Path
import os
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[2] / 'src/material-flow'
shot_dir=Path(os.environ.get('STAGE05_SCREENSHOT_DIR', '/mnt/data'))
shot_dir.mkdir(parents=True, exist_ok=True)
js=(root/'controller.js').read_text()
js='\n'.join(line for line in js.splitlines() if not line.lstrip().startswith('import '))
js=js.replace('export async function','async function').replace('export function','function').replace('import.meta.url','"https://daniel22-dev.github.io/AI-Studio-GHRAB/material-flow/controller.js"')
css=(root/'material-flow.css').read_text()
base='''<html><meta charset="utf-8"><style>body{margin:0;background:#08132a;color:#eff6ff;font:16px system-ui;padding:2rem}.workspace-card{max-width:790px;margin:auto;border:1px solid #50607d;border-radius:16px;padding:24px;background:#13203a}.button{background:#284d7e;color:white;border:1px solid #7793b6;border-radius:8px;padding:10px 16px;font:inherit;cursor:pointer}.button:disabled{opacity:.5}.button.ghost{background:transparent}h1{font-size:1.5rem}</style><style>'''+css+'''</style><body><article class="workspace-card"><h1>Sample material</h1><p>English / B1 / teaching material</p><div id="host"></div></article></body></html>'''
script=js+'''
const G={t:(cs,en)=>cs,VERSION:'0.21.253',localised:x=>x.cs,showToast:console.log,hasAppAccess:()=>({enabled:true})};
const controller={transport:{pending:()=>null,prepare:()=>({launchUrl:new URL('https://daniel22-dev.github.io/Ludus/')}),cancelOwn:()=>false},assess:()=>[
 {id:'generator',app:{name:{cs:'Gener\\u00e1tor'}},declaration:{bridgeVersion:2},compatible:true,reason:'compatible'},
 {id:'differentiator',app:{name:{cs:'Diferenci\\u00e1tor'}},declaration:{bridgeVersion:2},compatible:false,reason:'needs-source'},
 {id:'ludus',app:{name:{cs:'LUDUS'}},declaration:{bridgeVersion:2},compatible:false,reason:'needs-tasks'}
]};
const panel=materialFlowDetails(G,controller,{schema:'ghrab-material-v1',id:'foo',subject:'English',objectives:['Reading safely'],content:{sourceText:'<img src=x onerror=alert(1)>',tasks:[{prompt:'What is safe rendering?'}]}});
document.getElementById('host').append(panel.toggle,panel.detail);
'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':1280,'height':800})
 page=ctx.new_page();page.set_content(base)
 page.evaluate(script)
 page.locator('#host > button').click()
 assert page.locator('.material-flow-detail').is_visible()
 assert page.locator('.material-flow-target').count()==3
 assert page.locator('.material-flow-target button:enabled').count()==1
 assert page.locator('.material-flow-target button:disabled').count()==2
 page.locator('summary').click()
 assert '<img src=x onerror=alert(1)>' in page.locator('.material-flow-source').inner_text()
 assert page.locator('.material-flow-preview-body img').count()==0
 print('COMPONENT_DESKTOP PASS')
 page.screenshot(path=str(shot_dir/'stage05-material-flow-desktop.png'),full_page=True)
 page.set_viewport_size({'width':390,'height':844})
 page.wait_for_timeout(550)
 assert page.locator('.material-flow-target').count()==3
 assert page.locator('.material-flow-target h4').nth(2).inner_text() == 'LUDUS'
 page.screenshot(path=str(shot_dir/'stage05-material-flow-mobile.png'),full_page=True)
 print('COMPONENT_MOBILE PASS')
 browser.close()
