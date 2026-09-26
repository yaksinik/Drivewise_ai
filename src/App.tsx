import { useState } from 'react';
import { StoreProvider } from '@/store';
import { Layout, type PageId } from '@/components/Layout';
import { DashboardPage } from '@/pages/DashboardPage';
import { TripAnalysisPage } from '@/pages/TripAnalysisPage';
import { AssumptionsLabPage } from '@/pages/AssumptionsLabPage';
import { DatasetExplorerPage } from '@/pages/DatasetExplorerPage';
import { ModelsPage } from '@/pages/ModelsPage';
import { RoadmapPage } from '@/pages/RoadmapPage';

function App() {
  const [page, setPage] = useState<PageId>('dashboard');

  return (
    <StoreProvider>
      <Layout currentPage={page} onPageChange={setPage}>
        {page === 'dashboard' && <DashboardPage />}
        {page === 'trip' && <TripAnalysisPage />}
        {page === 'assumptions' && <AssumptionsLabPage />}
        {page === 'dataset' && <DatasetExplorerPage />}
        {page === 'models' && <ModelsPage />}
        {page === 'roadmap' && <RoadmapPage />}
      </Layout>
    </StoreProvider>
  );
}

export default App;
