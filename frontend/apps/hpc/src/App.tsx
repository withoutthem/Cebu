import Layout from './shared/components/Layout';
import { CssBaseline } from '@mui/material';
import ApplicationProvider from './app/providers/ApplicationProvider';
import TestPage from './pages/test/TestPage';

function App() {
  return (
    <ApplicationProvider>
      <CssBaseline />
      <Layout>
        <TestPage />
      </Layout>
    </ApplicationProvider>
  );
}

export default App;
