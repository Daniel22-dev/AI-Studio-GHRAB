#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFile(path.join(root, file), 'utf8');

const [ingest, deploy, p5, promotion] = await Promise.all([
  read('.github/workflows/auto-patch-ingest.yml'),
  read('.github/workflows/deploy.yml'),
  read('.github/workflows/p5-release-gate.yml'),
  read('.github/workflows/safe-promotion.yml'),
]);

const errors = [];
const requireText = (source, needle, label) => {
  if (!source.includes(needle)) errors.push(`${label}: chybi ${needle}`);
};
const rejectText = (source, needle, label) => {
  if (source.includes(needle)) errors.push(`${label}: zakazany obsah ${needle}`);
};

// Ingest owns external update discovery and may mutate only durable candidate.
requireText(ingest, 'repository_dispatch:', 'ingest');
requireText(ingest, 'app-updated', 'ingest');
requireText(ingest, 'cron: "17 3 * * *"', 'ingest');
requireText(ingest, 'ref: candidate', 'ingest');
requireText(ingest, 'SAFE_PROMOTION_TOKEN', 'ingest');
requireText(ingest, 'npm run qa:ecosystem:verified', 'ingest');
requireText(ingest, 'apply-auto-promotions.mjs', 'ingest');
requireText(ingest, 'git push origin HEAD:candidate', 'ingest');
rejectText(ingest, 'git push origin HEAD:main', 'ingest');

// Production deploy certifies an already-promoted main and never ingests/persists patches.
rejectText(deploy, 'repository_dispatch:', 'deploy');
rejectText(deploy, 'git push origin HEAD:main', 'deploy');
rejectText(deploy, 'apply-auto-promotions.mjs', 'deploy');
requireText(deploy, 'verify-safe-promotion-origin.mjs', 'deploy');
requireText(deploy, 'verify-github-deployment-governance.mjs', 'deploy');
requireText(deploy, 'qa:ecosystem:verified', 'deploy');
requireText(deploy, 'qa-ecosystem.mjs --require-source-verification', 'deploy');

// Candidate and PR must both pass the same stable required check.
if (!/push:\s*[\s\S]*branches:\s*\[candidate, main\]/m.test(p5)) {
  errors.push('p5: push trigger musi zahrnovat candidate a main');
}
if (!/pull_request:\s*[\s\S]*branches:\s*\[main\]/m.test(p5)) {
  errors.push('p5: pull_request trigger musi cilit na main');
}
requireText(p5, 'p5-release-gate:', 'p5');

// Promotion must be fail-closed, exact-SHA and Ruleset-aware.
requireText(promotion, 'SAFE_PROMOTION_TOKEN', 'safe-promotion');
requireText(promotion, 'head_branch == \'candidate\'', 'safe-promotion');
requireText(promotion, 'rules/branches/main', 'safe-promotion');
requireText(promotion, 'p5-release-gate', 'safe-promotion');
requireText(promotion, 'current_user_can_bypass', 'safe-promotion');
requireText(promotion, 'git/refs/heads/candidate', 'safe-promotion');

if (errors.length) {
  console.error('AUTO-PATCH WORKFLOW ARCHITECTURE: FAIL');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('AUTO-PATCH WORKFLOW ARCHITECTURE: PASS — dispatch/schedule -> candidate -> P5 -> PR -> P5 -> protected main -> deploy; direct main persistence zakazana.');
