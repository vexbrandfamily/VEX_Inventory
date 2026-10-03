const assert = require('assert');
const { applyStockMovement, normalizeStatus, getInventoryStatus } = require('../src/lib/stockMath.js');

assert.strictEqual(applyStockMovement(20, 5, 'in'), 25, 'purchase/adjustment in should add to the current stock');
assert.strictEqual(applyStockMovement(20, 5, 'out'), 15, 'sale/adjustment out should subtract from the current stock');
assert.strictEqual(applyStockMovement(20, 6, 'set'), 6, 'absolute adjustment should replace the balance with the provided value');
assert.strictEqual(normalizeStatus(0, 5), 'out-of-stock');
assert.strictEqual(normalizeStatus(3, 5), 'low-stock');
assert.strictEqual(normalizeStatus(12, 5), 'available');

assert.strictEqual(getInventoryStatus(0, 10, 5, 100), 'Out of Stock');
assert.strictEqual(getInventoryStatus(5, 10, 5, 100), 'Critical');
assert.strictEqual(getInventoryStatus(8, 10, 5, 100), 'Low Stock');
assert.strictEqual(getInventoryStatus(25, 10, 5, 100), 'Normal');
assert.strictEqual(getInventoryStatus(120, 10, 5, 100), 'Overstocked');

console.log('PASS: stock movement math reflects net in/out quantities and correct stock status thresholds.');
