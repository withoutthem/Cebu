import { CssBaseline } from '@mui/material'
import ApplicationProvider from './app/providers/ApplicationProvider'
import Layout from './shared/components/Layout'
import TestPage from './pages/test/TestPage'

function App() {
  return (
    <ApplicationProvider>
      <CssBaseline />
      <Layout>
        <TestPage />
        {/*<WebSocketTestPage />*/}
      </Layout>
    </ApplicationProvider>
  )
}

export default App
