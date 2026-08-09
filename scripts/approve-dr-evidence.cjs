'use strict';

const fs = require('fs');
const crypto = require('crypto');
const evidencePath = process.env.DR_EVIDENCE_FILE || 'dr-evidence.json';
const rawEvidence = fs.readFileSync(evidencePath);
const evidenceDocument = JSON.parse(rawEvidence);
const evidence = `sha256:${crypto.createHash('sha256').update(rawEvidence).digest('hex')}`;
const embeddedHash = evidenceDocument.sha256;
const unsignedEvidence = { ...evidenceDocument }; delete unsignedEvidence.sha256;
const completedAt = new Date(evidenceDocument.finishedAt || 'invalid');
const elapsed = Number(evidenceDocument.elapsedSeconds);
const ticket = process.env.DR_TICKET_URL || '';
if (evidenceDocument.schema !== 1 || evidenceDocument.status !== 'pass' || evidenceDocument.cleanupStatus !== 'pass') throw new Error('DR evidence did not pass all gates');
if (embeddedHash !== crypto.createHash('sha256').update(JSON.stringify(unsignedEvidence)).digest('hex')) throw new Error('DR evidence self-hash mismatch');
if (!Number.isFinite(completedAt.getTime()) || completedAt.getTime() > Date.now()) throw new Error('Invalid DR completion timestamp');
if (!Number.isInteger(elapsed) || elapsed < 0 || elapsed > 14400) throw new Error('DR drill did not meet the 4-hour RTO');
if (!evidenceDocument.reconciliation || evidenceDocument.reconciliation.expectedSha256 !== evidenceDocument.reconciliation.actualSha256 || !/^[a-f0-9]{64}$/.test(evidenceDocument.reconciliation.expectedSha256)) throw new Error('DR reconciliation mismatch');
if (!evidenceDocument.backup || !/^[a-f0-9]{64}$/.test(evidenceDocument.backup.checksumSetSha256 || '')) throw new Error('Invalid backup checksum-set binding');
if (!Number.isInteger(evidenceDocument.backup.ageSeconds) || !Number.isInteger(evidenceDocument.backup.rpoTargetSeconds) || evidenceDocument.backup.ageSeconds < 0 || evidenceDocument.backup.ageSeconds > evidenceDocument.backup.rpoTargetSeconds || evidenceDocument.backup.rpoTargetSeconds > 86400) throw new Error('DR evidence did not meet the 24-hour RPO');
if (!/^https:\/\//.test(ticket)) throw new Error('A HTTPS change/incident ticket URL is required');
const approval = { schema: 1, evidenceSha256: evidence, completedAt: completedAt.toISOString(), elapsedSeconds: elapsed,
  ticketUrl: ticket, approvedAt: new Date().toISOString(), repository: process.env.GITHUB_REPOSITORY, workflowRun: process.env.GITHUB_RUN_ID };
fs.writeFileSync(process.argv[2] || 'dr-approval.json', `${JSON.stringify(approval, null, 2)}\n`, { mode: 0o600 });
