import { testUtil } from '@shared/utils/test_util';
import Layout from './shared/components/Layout';
import MainTest from './domains/test/MainTest';
import { CssBaseline } from '@mui/material';
import ApplicationProvider from './app/providers/ApplicationProvider';

function App() {
  testUtil('asdfsadf', 123);

  return (
    <ApplicationProvider>
      <CssBaseline />
      <Layout>
        <MainTest />
      </Layout>
    </ApplicationProvider>
  );
}

export default App;
