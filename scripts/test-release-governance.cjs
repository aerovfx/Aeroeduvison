'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const crypto = require('crypto');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aeroedu-release-test-'));
try {
  for (const file of ['sbom.cdx.json', 'provenance.json', 'migration-manifest.json']) fs.writeFileSync(path.join(directory, file), '{}\n');
  const approvalFile = path.join(directory, 'dr-approval.json');
  fs.writeFileSync(approvalFile, JSON.stringify({ schema: 1, evidenceSha256: `sha256:${'f'.repeat(64)}`, completedAt: new Date().toISOString(), elapsedSeconds: 60, ticketUrl: 'https://tickets.example/dr/1', repository: 'owner/repo' }));
  const output = path.join(directory, 'release-manifest.json');
  const env = { ...process.env, RELEASE_METADATA_DIR: directory, GITHUB_REPOSITORY: 'owner/repo', GITHUB_SHA: 'a'.repeat(40),
    GITHUB_REF: 'refs/tags/v1.2.3', IMAGE: 'ghcr.io/owner/aeroedu-onprem', DIGEST: `sha256:${'b'.repeat(64)}`,
    NODE_IMAGE: `node@sha256:${'c'.repeat(64)}`, POSTGRES_IMAGE: `postgres@sha256:${'d'.repeat(64)}`,
    COSIGN_PUBLIC_KEY_SHA256: `sha256:${'e'.repeat(64)}`, DR_APPROVAL_FILE: approvalFile };
  const result = spawnSync(process.execPath, [path.join(__dirname, 'create-release-manifest.cjs'), output], { env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(fs.readFileSync(output, 'utf8'));
  assert.equal(manifest.version, 'v1.2.3');
  assert.equal(manifest.disasterRecovery.evidenceSha256, `sha256:${'f'.repeat(64)}`);
  const readiness = spawnSync(process.execPath, [path.join(__dirname, 'validate-release-readiness.cjs')], { env, encoding: 'utf8' });
  assert.equal(readiness.status, 0, readiness.stderr);
  const evidenceFile = path.join(directory, 'dr-evidence.json');
  const evidence = { schema: 1, status: 'pass', cleanupStatus: 'pass', finishedAt: new Date().toISOString(), elapsedSeconds: 60,
    backup: { checksumSetSha256: '1'.repeat(64), ageSeconds: 120, rpoTargetSeconds: 86400 },
    reconciliation: { expectedSha256: '2'.repeat(64), actualSha256: '2'.repeat(64) } };
  evidence.sha256 = crypto.createHash('sha256').update(JSON.stringify(evidence)).digest('hex');
  fs.writeFileSync(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`);
  const approvalResult = spawnSync(process.execPath, [path.join(__dirname, 'approve-dr-evidence.cjs'), path.join(directory, 'verified-approval.json')],
    { env: { ...process.env, DR_EVIDENCE_FILE: evidenceFile, DR_TICKET_URL: 'https://tickets.example/dr/2', GITHUB_REPOSITORY: 'owner/repo', GITHUB_RUN_ID: '42' }, encoding: 'utf8' });
  assert.equal(approvalResult.status, 0, approvalResult.stderr);
  evidence.cleanupStatus = 'fail';
  evidence.sha256 = crypto.createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(evidence).filter(([key]) => key !== 'sha256')))).digest('hex');
  fs.writeFileSync(evidenceFile, `${JSON.stringify(evidence)}\n`);
  const rejected = spawnSync(process.execPath, [path.join(__dirname, 'approve-dr-evidence.cjs'), path.join(directory, 'rejected.json')],
    { env: { ...process.env, DR_EVIDENCE_FILE: evidenceFile, DR_TICKET_URL: 'https://tickets.example/dr/3' }, encoding: 'utf8' });
  assert.notEqual(rejected.status, 0);
  const policySource = path.join(__dirname, '..', 'governance', 'release-policy.json');
  fs.copyFileSync(policySource, path.join(directory, 'release-policy.json'));
  const policyHash = crypto.createHash('sha256').update(fs.readFileSync(policySource)).digest('hex');
  const offline = spawnSync(process.execPath, [path.join(__dirname, 'verify-offline-governance.cjs'), directory, `sha256:${'e'.repeat(64)}`, `sha256:${policyHash}`], { encoding: 'utf8' });
  assert.equal(offline.status, 0, offline.stderr);
  console.log('Release governance tests: OK');
} finally {
  fs.rmSync(directory, { recursive: true });
}
