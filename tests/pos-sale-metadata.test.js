const assert = require('assert');
const { buildPosSaleRecord } = require('../src/lib/posSales.js');

const record = buildPosSaleRecord({
  accountId: 'acct-1',
  referenceNumber: 'POS-123456',
  totalAmount: 45.5,
  itemCount: 2,
  discountAmount: 5,
  paymentMethod: 'Transfers',
  detail: 'Widget x2',
});

assert.strictEqual(record.account_id, 'acct-1');
assert.strictEqual(record.transaction_type, 'sale');
assert.strictEqual(record.movement_subtype, 'sale');
assert.strictEqual(record.reference_number, 'POS-123456');
assert.strictEqual(record.total_amount, 45.5);
assert.strictEqual(record.discount_amount, 5);
assert.strictEqual(record.payment_method, 'Transfers');
assert.strictEqual(record.cashier_name, undefined);
assert.strictEqual(record.detail, 'Widget x2');

console.log('PASS: POS sale records keep payment method and discount metadata without cashier name.');
