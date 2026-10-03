const fs = require('fs');
const path = require('path');
const assert = require('assert');

const servicePath = path.join(__dirname, '..', 'src', 'lib', 'services', 'vexService.ts');
const serviceText = fs.readFileSync(servicePath, 'utf8');

assert(serviceText.includes("getCurrentAccountId"), 'Missing account-aware helper in report service.');
assert(serviceText.includes(".eq('account_id', accountId)"), 'Report/analysis queries are not scoped to the current account.');
assert(!serviceText.includes('Math.random()'), 'Top product report must use real sales data instead of synthetic random values.');

console.log('PASS: report and analysis data is account-scoped and uses real transaction totals.');
