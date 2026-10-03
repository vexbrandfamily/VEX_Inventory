import BusinessStockOutView from '@/components/business/BusinessStockOutView';

export default function BusinessSalesPage() {
  return (
    <BusinessStockOutView
      defaultTab="sales"
      hideTabs
      titleOverride="Sales"
      subtitleOverride="Track customer sales and outgoing stock"
    />
  );
}
