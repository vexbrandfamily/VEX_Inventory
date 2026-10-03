import BusinessStockInView from '@/components/business/BusinessStockInView';

export default function BusinessAdjustmentsInPage() {
  return (
    <BusinessStockInView
      defaultTab="adjustments"
      hideTabs
      titleOverride="Adjustments In"
      subtitleOverride="Track stock entered through non-purchase adjustments such as returns and approved additions"
    />
  );
}
