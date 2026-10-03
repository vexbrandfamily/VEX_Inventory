function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDirection(direction) {
  const value = String(direction ?? '').toLowerCase();
  const inDirections = ['in', 'increase', 'purchase', 'receipt', 'adjustment_in', 'return'];
  const outDirections = ['out', 'decrease', 'sale', 'issue', 'adjustment_out'];
  const setDirections = ['set', 'absolute', 'adjustment'];

  if (inDirections.includes(value)) return 'in';
  if (outDirections.includes(value)) return 'out';
  if (setDirections.includes(value)) return 'set';
  return 'none';
}

function applyStockMovement(currentStock, quantity, direction) {
  const baseStock = Math.max(0, toNumber(currentStock));
  const delta = Math.max(0, toNumber(quantity));
  const normalizedDirection = normalizeDirection(direction);

  if (normalizedDirection === 'in') return baseStock + delta;
  if (normalizedDirection === 'out') return Math.max(0, baseStock - delta);
  if (normalizedDirection === 'set') return Math.max(0, delta);
  return baseStock;
}

function normalizeStatus(stock, minLevel) {
  const safeStock = Math.max(0, toNumber(stock));
  const safeMin = Math.max(0, toNumber(minLevel, 5));

  if (safeStock <= 0) return 'out-of-stock';
  if (safeStock <= safeMin) return 'low-stock';
  return 'available';
}

function getInventoryStatus(currentStock, reorderLevel, minimumStock, maximumStock) {
  const stock = Math.max(0, toNumber(currentStock));
  const reorder = Math.max(0, toNumber(reorderLevel));
  const minimum = Math.max(0, toNumber(minimumStock));
  const maximum = Math.max(0, toNumber(maximumStock));

  if (stock === 0) return 'Out of Stock';
  if (stock <= minimum) return 'Critical';
  if (stock <= reorder) return 'Low Stock';
  if (stock > maximum) return 'Overstocked';
  return 'Normal';
}

module.exports = { applyStockMovement, normalizeStatus, normalizeDirection, toNumber, getInventoryStatus };
