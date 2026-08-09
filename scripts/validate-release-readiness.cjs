'use strict';

const fs = require('fs');
const path = require('path');
const policy = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'governance', 'release-policy.json'), 'utf8'));
const approvalFile = process.env.DR_APPROVAL_FILE || process.argv[2];
if (!approvalFile) throw new Error('DR approval file is required');
const approval = JSON.parse(fs.readFileSync(approvalFile, 'utf8'));
const completedAt = new Date(approval.completedAt || 'invalid');
const evidence = approval.evidenceSha256 || '';
if (!Number.isFinite(completedAt.getTime())) throw new Error('LAST_DR_DRILL_AT must be an ISO-8601 timestamp');
if (!/^sha256:[a-f0-9]{64}$/.test(evidence)) throw new Error('LAST_DR_EVIDENCE_SHA256 must be sha256:<64 hex>');
const ageMs = Date.now() - completedAt.getTime();
if (ageMs < 0 || ageMs > policy.restoreDrillMaximumAgeDays * 86400_000) throw new Error(`DR drill evidence is older than ${policy.restoreDrillMaximumAgeDays} days`);
if (!/^sha256:[a-f0-9]{64}$/.test(process.env.COSIGN_PUBLIC_KEY_SHA256 || '')) throw new Error('COSIGN_PUBLIC_KEY_SHA256 is required');
if (approval.schema !== 1 || approval.repository !== process.env.GITHUB_REPOSITORY) throw new Error('DR approval repository mismatch');
if (!Number.isInteger(approval.elapsedSeconds) || approval.elapsedSeconds > policy.rtoSeconds) throw new Error('DR approval exceeds RTO policy');
if (!/^https:\/\//.test(approval.ticketUrl || '')) throw new Error('DR approval ticket is invalid');
console.log(`Release readiness: DR evidence age ${Math.floor(ageMs / 86400_000)} day(s), policy OK`);
