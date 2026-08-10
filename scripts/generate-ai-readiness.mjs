import { readFile,writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),".."),cfg=path.join(root,"src/config");
const read=n=>readFile(path.join(cfg,n),"utf8").then(JSON.parse);
const [apps,baseline,core,runtime]=await Promise.all([read("apps.generated.json"),read("ai-readiness-baseline.json"),read("ai-core.json"),read("ai-runtime.json")]);
const appById=new Map(apps.map(a=>[a.id,a]));const rows=[];
for(const item of baseline.applications){const app=appById.get(item.appId),live=app?.aiCore,cert=item.certification,classification=item.classification||"ai-consumer";let status=classification==="not-applicable"?"not-applicable":"not-migrated",coreVersion=null,contractVersion=null,conformancePassed=false,operationsManifestUrl=null;
 if(classification==="not-applicable"||live?.status==="not-applicable"){status="not-applicable";coreVersion=null;contractVersion=null;conformancePassed=false;operationsManifestUrl=null;}
 else if(live){coreVersion=live.coreVersion;contractVersion=String(live.contractVersion);conformancePassed=live.conformancePassed===true;operationsManifestUrl=live.operationsManifestUrl;status=live.serverReady&&conformancePassed&&coreVersion===core.activeRelease.coreVersion?"ready":"incompatible";}
 else if(cert){coreVersion=cert.coreVersion;contractVersion=String(cert.contractVersion);conformancePassed=cert.conformancePassed===true;status=app?.version===cert.appVersion?"certified-pending-manifest":"certified-pending-deployment";}
 rows.push({appId:item.appId,appVersion:app?.version||null,classification,status,coreVersion,contractVersion,conformancePassed,operationsManifestUrl,certifiedAppVersion:cert?.appVersion||null,operationsCount:cert?.operationsCount||null,evidence:cert?.evidence||null});
}
const count=s=>rows.filter(x=>x.status===s).length;const report={schema:"ghrab-ai-readiness-report-v1",generatedAt:new Date().toISOString(),activeCoreVersion:core.activeRelease.coreVersion,runtime:runtime.ai,summary:{totalApps:rows.length,readyApps:count("ready"),certifiedPendingApps:rows.filter(x=>x.status.startsWith("certified-")).length,notMigratedApps:count("not-migrated"),notApplicableApps:count("not-applicable"),incompatibleApps:count("incompatible")},applications:rows};
await writeFile(path.join(cfg,"ai-readiness.generated.json"),JSON.stringify(report,null,2)+"\n");console.log(`AI readiness: ${report.summary.readyApps} nasazeno, ${report.summary.certifiedPendingApps} certifikováno před nasazením, ${report.summary.notMigratedApps} bez migrace, ${report.summary.notApplicableApps} mimo rozsah AI Core.`);
