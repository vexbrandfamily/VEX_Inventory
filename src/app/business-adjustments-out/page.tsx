import BusinessStockOutView from '@/components/business/BusinessStockOutView';

export default function BusinessAdjustmentsOutPage() {
  return (
    <BusinessStockOutView
      defaultTab="adjustments"
      hideTabs
      titleOverride="Adjustments Out"
      subtitleOverride="Track stock removed through non-sale adjustments such as damage, returns to supplier, and approved losses"
    />
  );
}
