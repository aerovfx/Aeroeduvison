#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { signLicense, verifyLicense } = require('../lib/license.cjs');

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}
function required(name) {
  const value = arg(name);
  if (!value) throw new Error(`Missing --${name}`);
  return value;
}
function writePrivate(file, data) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, data, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

const command = process.argv[2];
if (command === 'keygen') {
  const privateFile = arg('private', 'secrets/license-private.pem');
  const publicFile = arg('public', 'license-public.pem');
  if (fs.existsSync(privateFile) || fs.existsSync(publicFile)) throw new Error('Refusing to overwrite an existing key');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  writePrivate(privateFile, privateKey.export({ type: 'pkcs8', format: 'pem' }));
  fs.writeFileSync(publicFile, publicKey.export({ type: 'spki', format: 'pem' }), { mode: 0o644 });
  console.log(`Private key: ${privateFile}\nPublic key: ${publicFile}`);
} else if (command === 'issue') {
  const now = new Date();
  const days = Number(arg('days', '365'));
  if (!Number.isInteger(days) || days < 1) throw new Error('--days must be a positive integer');
  const payload = {
    schema: 1,
    licenseId: arg('license-id', crypto.randomUUID()),
    customerId: required('customer'),
    installationId: required('installation'),
    issuer: arg('issuer', 'aeroedu'),
    keyId: arg('key-id', 'primary-2026'),
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + days * 86400_000).toISOString(),
    features: arg('features', 'core').split(',').map((x) => x.trim()).filter(Boolean).sort(),
    seats: Number(arg('seats', '100')),
    imageDigest: required('image-digest'),
  };
  const privateKey = fs.readFileSync(required('private'), 'utf8');
  const output = required('out');
  fs.writeFileSync(output, `${JSON.stringify(signLicense(payload, privateKey), null, 2)}\n`, { mode: 0o600 });
  console.log(`License: ${output}`);
} else if (command === 'verify') {
  const document = JSON.parse(fs.readFileSync(required('license'), 'utf8'));
  const payload = verifyLicense(document, {
    publicKey: fs.readFileSync(required('public'), 'utf8'),
    installationId: arg('installation'),
    imageDigest: arg('image-digest'),
  });
  console.log(JSON.stringify({ valid: true, ...payload }, null, 2));
} else {
  console.error('Usage: license-cli.cjs keygen|issue|verify [options]');
  process.exitCode = 2;
}
