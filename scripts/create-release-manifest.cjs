'use strict';

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
for (const name of ['GITHUB_REPOSITORY', 'GITHUB_SHA', 'GITHUB_REF', 'IMAGE', 'DIGEST', 'NODE_IMAGE', 'POSTGRES_IMAGE', 'COSIGN_PUBLIC_KEY_SHA256', 'DR_APPROVAL_FILE']) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}
const root = path.join(__dirname, '..');
const metadataDir = process.env.RELEASE_METADATA_DIR || root;
if (!/^refs\/tags\/v[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$/.test(process.env.GITHUB_REF)) throw new Error('Release manifest requires a SemVer tag ref');
if (!/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA)) throw new Error('GITHUB_SHA must be a 40-character commit');
if (!/^sha256:[a-f0-9]{64}$/.test(process.env.DIGEST)) throw new Error('DIGEST must be sha256:<64 hex>');
for (const name of ['NODE_IMAGE', 'POSTGRES_IMAGE']) if (!/@sha256:[a-f0-9]{64}$/.test(process.env[name])) throw new Error(`${name} must be digest-pinned`);
const drApproval = JSON.parse(fs.readFileSync(process.env.DR_APPROVAL_FILE, 'utf8'));
if (!/^sha256:[a-f0-9]{64}$/.test(drApproval.evidenceSha256 || '')) throw new Error('Invalid DR evidence digest');
const resolveFile = file => path.isAbsolute(file) ? file : path.join(metadataDir, file);
const hashFile = (file) => crypto.createHash('sha256').update(fs.readFileSync(resolveFile(file))).digest('hex');
function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortJson(value[key])]));
  return value;
}
const hashJson = (file) => crypto.createHash('sha256').update(JSON.stringify(sortJson(JSON.parse(fs.readFileSync(resolveFile(file), 'utf8'))))).digest('hex');
const manifest = {
  schema: 1,
  version: process.env.GITHUB_REF.replace(/^refs\/tags\//, ''),
  source: { repository: process.env.GITHUB_REPOSITORY, commit: process.env.GITHUB_SHA, ref: process.env.GITHUB_REF },
  image: { repository: process.env.IMAGE, digest: process.env.DIGEST },
  architectures: ['amd64', 'arm64'],
  inputs: { nodeImage: process.env.NODE_IMAGE, postgresImage: process.env.POSTGRES_IMAGE },
  artifacts: {
    sbomSha256: hashJson('sbom.cdx.json'),
    provenanceSha256: hashJson('provenance.json'),
    migrationManifestSha256: hashJson('migration-manifest.json'),
    releasePolicySha256: hashFile(path.join(root, 'governance/release-policy.json')),
  },
  trust: { cosignPublicKeySha256: process.env.COSIGN_PUBLIC_KEY_SHA256.replace(/^sha256:/, '') },
  disasterRecovery: { lastDrillAt: drApproval.completedAt, evidenceSha256: drApproval.evidenceSha256, approvalSha256: hashFile(process.env.DR_APPROVAL_FILE) },
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync(process.argv[2] || path.join(root, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
