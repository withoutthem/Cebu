import { ThemeProvider } from '@mui/material/styles'
import theme from '../../styles/theme'
import { type ReactNode } from 'react'
import { QueryProvider } from '@shared/platform/query'

interface ApplicationProvidersProps {
  children: ReactNode
}

const ApplicationProvider = ({ children }: ApplicationProvidersProps) => {
  return (
    <QueryProvider>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </QueryProvider>
  )
}

export default ApplicationProvider
