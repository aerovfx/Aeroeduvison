'use strict';

const assert = require('assert');
const { requiredFeature, hasFeature } = require('../lib/license-policy.cjs');

assert.equal(requiredFeature('/api/ai/chat'), 'ai');
assert.equal(requiredFeature('/api/integrations/lti'), 'integrations');
assert.equal(requiredFeature('/api/payment/orders'), 'payments');
assert.equal(requiredFeature('/api/admin/payments/refunds'), 'payments');
assert.equal(requiredFeature('/api/admin/integrations'), 'integrations');
assert.equal(requiredFeature('/api/ark-bot/chat'), 'ai');
assert.equal(requiredFeature('/api/openfang-service/chat'), 'ai');
assert.equal(requiredFeature('/api/exams/generate-from-matrix'), 'ai');
assert.equal(requiredFeature('/api/auth/login'), null);
assert.equal(hasFeature({ features: ['core'] }, null), true);
assert.equal(hasFeature({ features: ['ai-local'] }, 'ai'), true);
assert.equal(hasFeature({ features: ['core'] }, 'ai'), false);
assert.equal(hasFeature({ features: ['*'] }, 'payments'), true);
console.log('License policy tests: OK');
