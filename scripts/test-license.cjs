'use strict';

const assert = require('assert');
const crypto = require('crypto');
const { signLicense, verifyLicense } = require('../lib/license.cjs');

const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
const now = new Date('2026-08-09T00:00:00.000Z');
const payload = { schema: 1, licenseId: 'lic-test', customerId: 'school-test', installationId: 'host-01', issuer: 'aeroedu', keyId: 'test-1', issuedAt: now.toISOString(), expiresAt: '2027-08-09T00:00:00.000Z', features: ['core'], seats: 100, imageDigest: `sha256:${'a'.repeat(64)}` };
const license = signLicense(payload, privateKey);
assert.equal(verifyLicense(license, { publicKey, expectedKeyId: 'test-1', installationId: 'host-01', imageDigest: payload.imageDigest, now }).licenseId, 'lic-test');
const keyRingB64 = Buffer.from(JSON.stringify({ 'aeroedu:test-1': publicKey.export({ type: 'spki', format: 'pem' }) })).toString('base64');
assert.equal(verifyLicense(license, { keyRingB64, installationId: 'host-01', imageDigest: payload.imageDigest, now }).keyId, 'test-1');
assert.equal(verifyLicense(JSON.parse(JSON.stringify(license)), { publicKey, expectedKeyId: 'test-1', installationId: 'host-01', imageDigest: payload.imageDigest, now }).licenseId, 'lic-test');
assert.throws(() => verifyLicense(license, { publicKey, expectedKeyId: 'test-1', installationId: 'host-02', now }), /mismatch/);
assert.throws(() => verifyLicense(license, { publicKey, expectedKeyId: 'test-1', installationId: 'host-01', imageDigest: `sha256:${'b'.repeat(64)}`, now }), /image digest mismatch/);
assert.throws(() => verifyLicense(license, { publicKey, expectedKeyId: 'test-1', installationId: 'host-01', imageDigest: payload.imageDigest, revoked: 'lic-test', now }), /revoked/);
assert.throws(() => verifyLicense(license, { publicKey, expectedKeyId: 'different-key', installationId: 'host-01', imageDigest: payload.imageDigest, now }), /Untrusted license signing key/);
const tampered = JSON.parse(JSON.stringify(license)); tampered.payload.seats = 999;
assert.throws(() => verifyLicense(tampered, { publicKey, expectedKeyId: 'test-1', imageDigest: payload.imageDigest, now }), /signature/);
assert.throws(() => verifyLicense(license, { publicKey, expectedKeyId: 'test-1', imageDigest: payload.imageDigest, now: '2028-01-01T00:00:00Z' }), /expired/);
console.log('License tests: OK');
