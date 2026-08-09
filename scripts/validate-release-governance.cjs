'use strict';

const fs = require('fs');
const path = require('path');
const policy = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'governance', 'release-policy.json'), 'utf8'));
if (policy.schema !== 1) throw new Error('Unsupported release policy schema');
if (policy.minimumHumanReviewers < 2) throw new Error('At least two protected-environment reviewers are required');
if (policy.allowMutableReleaseTags !== false || policy.immutableMigrationPolicy !== true) throw new Error('Immutable releases and migrations are required');
if (policy.rpoSeconds <= 0 || policy.rtoSeconds <= 0 || policy.restoreDrillMaximumAgeDays > 90) throw new Error('Invalid DR governance targets');
for (const arch of ['amd64', 'arm64']) if (!policy.supportedArchitectures.includes(arch)) throw new Error(`Missing supported architecture: ${arch}`);
for (const attestation of ['cyclonedx', 'slsaprovenance', 'https://aeroedu.vn/attestations/release/v1']) if (!policy.requiredAttestations.includes(attestation)) throw new Error(`Missing attestation policy: ${attestation}`);
if (process.env.GITHUB_REF?.startsWith('refs/tags/') && !(new RegExp(policy.releaseTagPattern)).test(process.env.GITHUB_REF_NAME || '')) throw new Error('Release tag violates governance policy');
console.log('Release governance policy: OK');
