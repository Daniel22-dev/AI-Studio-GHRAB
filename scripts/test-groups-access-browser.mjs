#!/usr/bin/env node
/* Synthetic browser validation of the My Groups UI guard. Not real school UAT. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const origin = "https://groups-guard.example";
const root = "/AI-Studio-GHRAB/";
const now = Math.floor(Date.now() / 1000);
const stamp = "2026-10-27T12:00:00.000Z";
const store = {
  schema: "ghrab-teaching-groups-store-v1",
  version: 1,
  updatedAt: stamp,
  groups: [{
    schema: "ghrab-teaching-group-v1",
    groupId: "grp_111111111111",
    revision: 1,
    displayName: "Synthetic Class",
    schoolYear: "2026/27",
    subject: "English",
    grade: "Year 1",
    status: "active",
    createdAt: stamp,
    updatedAt: stamp,
    members: [{
      memberId: "mem_111111111111",
      name: "Synthetic Pupil",
      schoolEmail: "synthetic@example.invalid",
      status: "active",
      createdAt: stamp,
      updatedAt: stamp,
    }],
  }],
};
const authorized = (sub = "teacher-A") => ({
  ready: true, valid: true,
  permit: { sub, role: "teacher", exp: now + 3600 },
});
const read = path => readFileSync(path, "utf8");
const sources = new Map([
  [root + "groups/", { type: "text/html", body: read("src/groups/index.html") }],
  [root + "groups/groups.js", { type: "text/javascript", body: read("src/groups/groups.js") }],
  [root + "groups/group-service.js", { type: "text/javascript", body: read("src/groups/group-service.js") }],
]);
const errors = [], checks = [];
const browser = await chromium.launch({ headless: true });
const contexts = [];

async function openScenario({ access, preview = false }) {
  const context = await browser.newContext();
  contexts.push(context);
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(({ access, preview, store }) => {
    localStorage.setItem("ghrab.ai-studio.groups.v1", JSON.stringify(store));
    window.__syntheticAccess = access;
    window.__syntheticPreview = preview;
    window.GHRAB = {
      accessReady: Promise.resolve(access),
      getAccessSnapshot: () => window.__syntheticAccess,
      isColleaguePreview: () => window.__syntheticPreview,
    };
  }, { access, preview, store });
  await page.route(origin + "/**", async route => {
    const pathname = new URL(route.request().url()).pathname;
    const source = sources.get(pathname);
    if (source) return route.fulfill({
      status: 200, contentType: source.type + "; charset=utf-8", body: source.body,
    });
    if (pathname.endsWith(".js")) return route.fulfill({
      status: 200, contentType: "text/javascript", body: "// isolated Studio shell stub",
    });
    if (pathname.endsWith(".css")) return route.fulfill({
      status: 200, contentType: "text/css", body: "",
    });
    if (pathname.endsWith(".webmanifest")) return route.fulfill({
      status: 200, contentType: "application/manifest+json", body: "{}",
    });
    return route.fulfill({ status: 204, body: "" });
  });
  await page.goto(origin + root + "groups/");
  return page;
}

async function verify(label, fn) {
  await fn();
  checks.push(label);
  console.log("PASS", label);
}

try {
  await verify("G01 missing/invalid permit denies stored roster", async () => {
    const page = await openScenario({ access: { ready: true, valid: false, permit: null } });
    await page.locator(".access-denied-page h1").waitFor();
    assert.ok(!(await page.locator("body").innerText()).includes("Synthetic Pupil"));
    assert.equal(await page.evaluate(() => typeof window.GHRAB_GROUPS), "undefined");
    assert.equal(await page.evaluate(() => !!localStorage.getItem("ghrab.ai-studio.groups.v1")), true);
  });

  const teacherPage = await openScenario({ access: authorized() });
  await verify("G02 valid teacher sees synthetic roster through guarded API", async () => {
    await teacherPage.locator("#groups-detail").getByText("Synthetic Pupil").waitFor();
    assert.equal(await teacherPage.evaluate(() => window.GHRAB_GROUPS.listGroups().length), 1);
    assert.ok((await teacherPage.locator("#groups-list").innerText()).includes("Synthetic Class"));
  });

  await verify("G03 account switch scrubs DOM and revokes previously bound API", async () => {
    await teacherPage.evaluate(access => {
      window.__syntheticAccess = access;
      document.dispatchEvent(new Event("ghrab:access-changed"));
    }, authorized("teacher-B"));
    await teacherPage.locator(".access-denied-page").waitFor();
    assert.ok(!(await teacherPage.locator("body").innerText()).includes("Synthetic Pupil"));
    assert.equal(await teacherPage.evaluate(() => {
      try { window.GHRAB_GROUPS.listGroups(); return "ALLOWED"; }
      catch (error) { return error.message; }
    }), "GROUP_ACCESS_DENIED");
    assert.equal(await teacherPage.locator("dialog").count(), 0);
  });

  await verify("G04 switch back cannot reopen the revoked page instance", async () => {
    await teacherPage.evaluate(access => {
      window.__syntheticAccess = access;
      document.dispatchEvent(new Event("ghrab:access-changed"));
    }, authorized());
    assert.equal(await teacherPage.evaluate(() => {
      try { window.GHRAB_GROUPS.listGroups(); return "ALLOWED"; }
      catch (error) { return error.message; }
    }), "GROUP_ACCESS_DENIED");
  });

  await verify("G05 colleague-preview simulation cannot mount private roster", async () => {
    const page = await openScenario({ access: authorized(), preview: true });
    await page.locator(".access-denied-page").waitFor();
    assert.ok(!(await page.locator("body").innerText()).includes("Synthetic Pupil"));
  });

  await verify("G06 expired permit or BFCache page return fails closed", async () => {
    const page = await openScenario({ access: authorized() });
    await page.locator("#groups-detail").getByText("Synthetic Pupil").waitFor();
    await page.evaluate(() => {
      window.__syntheticAccess = {
        ready: true, valid: true,
        permit: { sub: "teacher-A", role: "teacher", exp: 1 },
      };
      window.dispatchEvent(new Event("pageshow"));
    });
    await page.locator(".access-denied-page").waitFor();
    assert.ok(!(await page.locator("body").innerText()).includes("Synthetic Pupil"));
  });

  await verify("G07 Web Crypto v2 isolates browser-profile account sessions and backups", async () => {
    const page = await openScenario({ access: authorized() });
    await page.locator("#groups-detail").getByText("Synthetic Pupil").waitFor();
    const result = await page.evaluate(async () => {
      const mod = await import("/AI-Studio-GHRAB/groups/group-service.js");
      const a = await mod.createPrincipalGroupsSession({
        getSnapshot: () => window.__syntheticAccess,
      });
      const legacyPresent = a.legacyStorePresent;
      const beforeA = a.service.listGroups().length;
      const groupA = a.service.createGroup({
        displayName: "Private Account A", schoolYear: "2026/27",
      });
      const exportA = a.service.exportBackup();
      window.__syntheticAccess = {
        ready: true, valid: true,
        permit: { sub: "teacher-B", role: "teacher", exp: Math.floor(Date.now() / 1000) + 3600 },
      };
      let revokedA = false;
      try { a.service.listGroups(); } catch (e) { revokedA = e.message === "GROUP_ACCESS_DENIED"; }
      const b = await mod.createPrincipalGroupsSession({
        getSnapshot: () => window.__syntheticAccess,
      });
      const beforeB = b.service.listGroups().length;
      const groupB = b.service.createGroup({
        displayName: "Private Account B", schoolYear: "2026/27",
      });
      let foreignRejected = false;
      try { b.service.importBackup(exportA); }
      catch (e) { foreignRejected = e.message === "GROUP_SCOPE_BACKUP_OTHER_ACCOUNT"; }
      window.__syntheticAccess = {
        ready: true, valid: true,
        permit: { sub: "teacher-A", role: "teacher", exp: Math.floor(Date.now() / 1000) + 3600 },
      };
      const a2 = await mod.createPrincipalGroupsSession({
        getSnapshot: () => window.__syntheticAccess,
      });
      return {
        legacyPresent, beforeA, beforeB, revokedA, foreignRejected,
        sameId: a2.service.getGroup(groupA.groupId)?.groupId === groupA.groupId,
        bName: groupB.displayName,
        backupSchema: exportA.schema,
        aName: a2.service.listGroups()[0]?.displayName,
      };
    });
    assert.equal(result.legacyPresent, true);
    assert.equal(result.beforeA, 0);
    assert.equal(result.beforeB, 0);
    assert.equal(result.revokedA, true);
    assert.equal(result.foreignRejected, true);
    assert.equal(result.sameId, true);
    assert.equal(result.aName, "Private Account A");
    assert.equal(result.bName, "Private Account B");
    assert.equal(result.backupSchema, "ghrab-teaching-groups-account-backup-v2");
  });

  assert.deepEqual(errors, [], "browser must not have any uncaught page errors");
  console.log(JSON.stringify({
    suite: "Groups UI access guard, synthetic browser",
    status: "PASS", tests: checks.length,
    physicalSchoolUat: "NOT RUN", tenantStorageIsolation: "NOT IMPLEMENTED",
  }, null, 2));
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser.close();
}
