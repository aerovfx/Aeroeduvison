'use strict';

const FEATURE_ROUTES = Object.freeze([
  { feature: 'ai', prefixes: ['/api/ai', '/api/ai-tutor', '/api/pcb/ai', '/api/ark-bot', '/api/openfang-service', '/api/exams/generate-from-matrix'] },
  { feature: 'integrations', prefixes: ['/api/integrations', '/api/telegram', '/api/admin/integrations'] },
  { feature: 'payments', prefixes: ['/api/payments', '/api/payment', '/api/admin/payments'] },
]);

function requiredFeature(pathname) {
  const path = String(pathname || '').split('?')[0];
  return FEATURE_ROUTES.find((rule) => rule.prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)))?.feature || null;
}

function hasFeature(payload, feature) {
  if (!feature) return true;
  const features = new Set(payload?.features || []);
  if (features.has('*') || features.has(feature)) return true;
  if (feature === 'ai') return features.has('ai-local') || features.has('ai-cloud');
  return false;
}

module.exports = { FEATURE_ROUTES, requiredFeature, hasFeature };
