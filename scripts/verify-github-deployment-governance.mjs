#!/usr/bin/env node

const REQUIRED_STATUS_CHECKS = ['p5-release-gate'];
const REQUIRED_RULE_TYPES = ['pull_request', 'deletion', 'non_fast_forward'];

const isActions = process.env.GITHUB_ACTIONS === 'true';
if (!isActions) {
  console.log('GITHUB GOVERNANCE SKIP: mimo GitHub Actions');
  process.exit(0);
}

const repo = String(process.env.GITHUB_REPOSITORY || '').trim();
const ref = String(process.env.GITHUB_REF_NAME || '').trim();
const token = String(process.env.GITHUB_TOKEN || '').trim();

if (!repo || !ref || !token) {
  console.error('GITHUB GOVERNANCE FAIL: chybi GITHUB_REPOSITORY/GITHUB_REF_NAME/GITHUB_TOKEN');
  process.exit(1);
}
if (ref !== 'main') {
  console.error('GITHUB GOVERNANCE FAIL: verejny deploy je povolen pouze z main');
  process.exit(1);
}

const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
};

async function github(pathname, label) {
  const response = await fetch(`https://api.github.com/repos/${repo}/${pathname}`, {
    headers,
    redirect: 'error',
  });
  if (!response.ok) {
    console.error(`GITHUB GOVERNANCE FAIL: ${label} HTTP ${response.status}`);
    process.exit(1);
  }
  return response.json();
}

const branch = await github('branches/main', 'branch metadata');
if (branch?.protected !== true) {
  console.error('GITHUB GOVERNANCE FAIL: main neni chranena; verejny deploy je zablokovan');
  process.exit(1);
}

// Rulesets are the authoritative protection model for AI Studio. GitHub's legacy
// branch.protection.required_status_checks fields do not reflect ruleset checks.
const rules = await github('rules/branches/main', 'active branch rules');
if (!Array.isArray(rules) || rules.length === 0) {
  console.error('GITHUB GOVERNANCE FAIL: pro main nejsou aktivni zadna Ruleset pravidla');
  process.exit(1);
}

const ruleTypes = new Set(rules.map((rule) => rule?.type).filter(Boolean));
const missingRuleTypes = REQUIRED_RULE_TYPES.filter((type) => !ruleTypes.has(type));
if (missingRuleTypes.length) {
  console.error(`GITHUB GOVERNANCE FAIL: chybi aktivni Ruleset pravidla: ${missingRuleTypes.join(', ')}`);
  process.exit(1);
}

const configuredChecks = new Set(
  rules
    .filter((rule) => rule?.type === 'required_status_checks')
    .flatMap((rule) => rule?.parameters?.required_status_checks || [])
    .map((item) => item?.context)
    .filter(Boolean),
);
const missingChecks = REQUIRED_STATUS_CHECKS.filter((name) => !configuredChecks.has(name));
if (missingChecks.length) {
  console.error(`GITHUB GOVERNANCE FAIL: Ruleset nema required check(s): ${missingChecks.join(', ')}`);
  process.exit(1);
}

// Every active rule returned for main is tied to a ruleset_id. Verify that the
// workflow identity itself has no bypass right and every referenced ruleset is active.
const rulesetIds = [...new Set(rules.map((rule) => rule?.ruleset_id).filter(Number.isInteger))];
if (rulesetIds.length === 0) {
  console.error('GITHUB GOVERNANCE FAIL: aktivni pravidla nemaji ruleset_id; audit nelze dokoncit fail-closed');
  process.exit(1);
}

for (const id of rulesetIds) {
  const detail = await github(`rulesets/${id}`, `ruleset ${id}`);
  if (detail?.enforcement !== 'active') {
    console.error(`GITHUB GOVERNANCE FAIL: ruleset ${id} neni active`);
    process.exit(1);
  }
  if (detail?.current_user_can_bypass !== 'never') {
    console.error(`GITHUB GOVERNANCE FAIL: workflow identita muze obejit ruleset ${id} (${detail?.current_user_can_bypass || 'unknown'})`);
    process.exit(1);
  }
  if (Array.isArray(detail?.bypass_actors) && detail.bypass_actors.length > 0) {
    console.error(`GITHUB GOVERNANCE FAIL: ruleset ${id} obsahuje bypass actors`);
    process.exit(1);
  }
}

console.log(
  `GITHUB GOVERNANCE PASS: main je chranena aktivnim Rulesetem, PR je povinny, deletion/force-push jsou blokovane a required checks jsou aktivni (${REQUIRED_STATUS_CHECKS.join(', ')})`,
);
