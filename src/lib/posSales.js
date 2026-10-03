function createPosReferenceNumber() {
  return `POS-${Date.now().toString().slice(-8)}`;
}

function buildPosSaleRecord({
  accountId,
  referenceNumber,
  totalAmount = 0,
  itemCount = 0,
  discountAmount = 0,
  paymentMethod = 'Cash',
  detail = '',
}) {
  return {
    account_id: accountId,
    transaction_type: 'sale',
    movement_subtype: 'sale',
    reference_number: referenceNumber || createPosReferenceNumber(),
    total_amount: Number(totalAmount) || 0,
    item_count: Number(itemCount) || 0,
    quantity: Number(itemCount) || 0,
    discount_amount: Number(discountAmount) || 0,
    payment_method: paymentMethod || 'Cash',
    detail: detail || '',
    payment_status: 'Paid',
  };
}

function isPosSaleTransaction(record = {}) {
  const ref = String(record.reference_number || '');
  const subtype = String(record.movement_subtype || record.transaction_type || '').toLowerCase();
  return subtype === 'sale' && ref.toUpperCase().startsWith('POS-');
}

module.exports = {
  createPosReferenceNumber,
  buildPosSaleRecord,
  isPosSaleTransaction,
};
