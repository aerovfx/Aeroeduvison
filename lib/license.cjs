'use strict';

const crypto = require('crypto');
const fs = require('fs');

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).filter((key) => value[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}

function readPublicKey(options = {}, payload = {}) {
  const keyRingFile = options.keyRingFile || process.env.LICENSE_TRUSTED_KEYS_FILE;
  const keyRingB64 = options.keyRingB64 || process.env.LICENSE_TRUSTED_KEYS_JSON_B64;
  if (keyRingFile || keyRingB64) {
    const keyRing = JSON.parse(keyRingFile ? fs.readFileSync(keyRingFile, 'utf8') : Buffer.from(keyRingB64, 'base64').toString('utf8'));
    const selected = keyRing[`${payload.issuer}:${payload.keyId}`];
    if (!selected) throw new Error(`Untrusted license signing key: ${payload.issuer}:${payload.keyId}`);
    return selected;
  }
  const expectedIssuer = options.expectedIssuer || process.env.LICENSE_ISSUER || 'aeroedu';
  const expectedKeyId = options.expectedKeyId || process.env.LICENSE_KEY_ID || 'primary-2026';
  if (payload.issuer !== expectedIssuer || payload.keyId !== expectedKeyId) throw new Error(`Untrusted license signing key: ${payload.issuer}:${payload.keyId}`);
  if (options.publicKey) return options.publicKey;
  if (process.env.LICENSE_PUBLIC_KEY_B64) return Buffer.from(process.env.LICENSE_PUBLIC_KEY_B64, 'base64').toString('utf8');
  const file = process.env.LICENSE_PUBLIC_KEY_FILE || '/app/license-public.pem';
  return fs.readFileSync(file, 'utf8');
}

function validatePayload(payload, options = {}) {
  if (!payload || payload.schema !== 1) throw new Error('Unsupported license schema');
  for (const field of ['licenseId', 'customerId', 'installationId', 'issuer', 'keyId', 'issuedAt', 'expiresAt']) {
    if (!payload[field] || typeof payload[field] !== 'string') throw new Error(`License field missing: ${field}`);
  }
  const now = options.now ? new Date(options.now) : new Date();
  const issuedAt = new Date(payload.issuedAt);
  const expiresAt = new Date(payload.expiresAt);
  if (!Number.isFinite(issuedAt.getTime()) || !Number.isFinite(expiresAt.getTime())) throw new Error('Invalid license dates');
  if (issuedAt.getTime() > now.getTime() + 5 * 60_000) throw new Error('License is not active yet');
  if (expiresAt.getTime() <= now.getTime()) throw new Error('License expired');
  const installationId = options.installationId || process.env.INSTALLATION_ID;
  if (payload.installationId === '*') throw new Error('Wildcard installation licenses are not allowed');
  if (installationId && payload.installationId !== installationId) throw new Error('License installation mismatch');
  const imageDigest = options.imageDigest || process.env.AEROEDU_IMAGE_DIGEST;
  if (!payload.imageDigest || !/^sha256:[a-f0-9]{64}$/.test(payload.imageDigest)) throw new Error('License requires a valid sha256 image digest');
  if (!imageDigest) throw new Error('Runtime image digest is required');
  if (payload.imageDigest !== imageDigest) throw new Error('License image digest mismatch');
  if (!Array.isArray(payload.features)) throw new Error('License features must be an array');
  if (!payload.features.every((feature) => typeof feature === 'string' && /^[a-z0-9*-]+$/.test(feature))) throw new Error('License features contain an invalid value');
  if (!Number.isInteger(payload.seats) || payload.seats < 1) throw new Error('License seats must be a positive integer');
  return payload;
}

function verifyLicense(document, options = {}) {
  if (!document || typeof document !== 'object' || !document.payload || !document.signature) throw new Error('Malformed license document');
  const allowedIssuers = new Set(String(options.allowedIssuers || process.env.LICENSE_ALLOWED_ISSUERS || 'aeroedu').split(',').map((value) => value.trim()).filter(Boolean));
  if (!allowedIssuers.has(document.payload.issuer)) throw new Error('Untrusted license issuer');
  const revoked = new Set(String(options.revoked || process.env.LICENSE_REVOKED_IDS || '').split(',').map((value) => value.trim()).filter(Boolean));
  if (revoked.has(document.payload.licenseId) || revoked.has(document.payload.keyId) || revoked.has(`${document.payload.issuer}:${document.payload.keyId}`)) throw new Error('License or signing key has been revoked');
  const ok = crypto.verify(null, Buffer.from(canonical(document.payload)), readPublicKey(options, document.payload), Buffer.from(document.signature, 'base64'));
  if (!ok) throw new Error('Invalid license signature');
  return validatePayload(document.payload, options);
}

function loadAndVerifyLicense(options = {}) {
  const file = options.file || process.env.LICENSE_FILE || '/etc/aeroedu/license.json';
  const stateFile = options.stateFile || process.env.LICENSE_STATE_FILE || `${process.env.DATA_DIR || '/var/lib/aeroedu'}/license-state.json`;
  const now = Date.now();
  let effectiveNow = now;
  try {
    const previous = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    if (Number(previous.lastSeenMs) > now + 5 * 60_000) throw new Error('System clock rollback detected');
    effectiveNow = Math.max(Number(previous.lastSeenMs) || 0, now);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const payload = verifyLicense(JSON.parse(fs.readFileSync(file, 'utf8')), { ...options, now: new Date(effectiveNow) });
  fs.mkdirSync(require('path').dirname(stateFile), { recursive: true });
  const temporary = `${stateFile}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify({ lastSeenMs: effectiveNow, licenseId: payload.licenseId })}\n`, { mode: 0o600 });
  fs.renameSync(temporary, stateFile);
  return payload;
}

function signLicense(payload, privateKey) {
  const normalized = validatePayload(payload, { installationId: payload.installationId, imageDigest: payload.imageDigest, now: payload.issuedAt });
  return { payload: normalized, signature: crypto.sign(null, Buffer.from(canonical(normalized)), privateKey).toString('base64') };
}

module.exports = { canonical, signLicense, verifyLicense, loadAndVerifyLicense };
