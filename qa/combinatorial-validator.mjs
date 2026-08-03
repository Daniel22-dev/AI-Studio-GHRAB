import { readFile } from "node:fs/promises";
import path from "node:path";
export async function validateScenario(s,{root}) {
  const registry=await readFile(path.join(root,"src","config","apps.generated.json"),"utf8").catch(()=>"");
  const accessFiles=await Promise.all(["src/access/app-guard.js","src/access/index.html","src/access/access-control.js"].map(f=>readFile(path.join(root,f),"utf8").catch(()=>"")));
  const access=accessFiles.join("\n");
  const failClosed=/revok|zamítn|denied|blocked|neplat|offline/i.test(access);
  let registryValid=false; try { const items=JSON.parse(registry); registryValid=Array.isArray(items)&&items.length>=5&&items.every(x=>x.id&&x.version&&x.launchUrl); } catch {}
  return {pass: failClosed && registryValid, evidence:`role=${s.role}; permit=${s.permit}; app=${s.application}; failClosed=${failClosed}; registry=${registryValid}`};
}
