import ReportsListPage from '@/features/reports/ReportsListPage';

export default function BusinessReportsPage() {
  return (
    <ReportsListPage
      title="Mes rapports"
      scope="me"
      showTransmissionNotice
    />
  );
}

