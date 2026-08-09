'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const directory = process.argv[2];
const releaseKeyHash = String(process.argv[3] || '').replace(/^sha256:/, '');
const approvedPolicyHash = String(process.argv[4] || '').replace(/^sha256:/, '');
if (!directory || !/^[a-f0-9]{64}$/.test(releaseKeyHash) || !/^[a-f0-9]{64}$/.test(approvedPolicyHash)) throw new Error('Usage: verify-offline-governance.cjs DIRECTORY RELEASE_KEY_SHA256 POLICY_SHA256');
const read = (name) => fs.readFileSync(path.join(directory, name));
const json = (name) => JSON.parse(read(name).toString('utf8'));
const hash = (name) => crypto.createHash('sha256').update(read(name)).digest('hex');
function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortJson(value[key])]));
  return value;
}
const hashJson = name => crypto.createHash('sha256').update(JSON.stringify(sortJson(json(name)))).digest('hex');
const manifest = json('release-manifest.json'); const policy = json('release-policy.json'); const approval = json('dr-approval.json');
if (manifest.schema !== 1 || policy.schema !== 1 || approval.schema !== 1) throw new Error('Unsupported governance schema');
if (!/^v[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$/.test(manifest.version)) throw new Error('Invalid governed release version');
if (manifest.trust.cosignPublicKeySha256 !== releaseKeyHash) throw new Error('Release trust fingerprint mismatch');
if (hash('release-policy.json') !== approvedPolicyHash) throw new Error('Site-approved release policy mismatch');
const expected = manifest.artifacts;
for (const [field, file] of [['sbomSha256','sbom.cdx.json'], ['provenanceSha256','provenance.json'], ['migrationManifestSha256','migration-manifest.json']]) {
  if (expected[field] !== hashJson(file)) throw new Error(`Governance artifact mismatch: ${file}`);
}
if (expected.releasePolicySha256 !== hash('release-policy.json')) throw new Error('Governance artifact mismatch: release-policy.json');
if (manifest.disasterRecovery.approvalSha256 !== hash('dr-approval.json')) throw new Error('DR approval hash mismatch');
if (manifest.disasterRecovery.evidenceSha256 !== approval.evidenceSha256 || manifest.disasterRecovery.lastDrillAt !== approval.completedAt) throw new Error('DR approval binding mismatch');
if (approval.repository !== manifest.source.repository || approval.elapsedSeconds > policy.rtoSeconds) throw new Error('DR approval policy mismatch');
const age = Date.now() - new Date(approval.completedAt).getTime();
if (!Number.isFinite(age) || age < 0 || age > policy.restoreDrillMaximumAgeDays * 86400_000) throw new Error('DR approval is stale');
if (!policy.requiredAttestations.includes('https://aeroedu.vn/attestations/release/v1') || !policy.requiredAttestations.includes('https://aeroedu.vn/attestations/migrations/v1') || policy.allowMutableReleaseTags !== false) throw new Error('Release policy is weaker than required');
console.log('Offline release governance: OK');
