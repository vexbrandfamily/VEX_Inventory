import BusinessStockInView from '@/components/business/BusinessStockInView';

export default function BusinessPurchasesPage() {
  return (
    <BusinessStockInView
      defaultTab="purchases"
      hideTabs
      titleOverride="Purchases"
      subtitleOverride="Track incoming supplier purchases and stock entries"
    />
  );
}
