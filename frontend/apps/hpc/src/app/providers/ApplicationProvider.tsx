// src/app/providers/AppProviders.tsx
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../styles/theme';
import { type ReactNode, StrictMode } from 'react';
import { QueryProvider } from '@shared/platform/query';

interface ApplicationProvidersProps {
  children: ReactNode;
}

const ApplicationProvider = ({ children }: ApplicationProvidersProps) => {
  return (
    <StrictMode>
      <QueryProvider>
        <ThemeProvider theme={theme}>
          {/* <BrowserRouter>가 여기서 제거됩니다. */}
          {children}
        </ThemeProvider>
      </QueryProvider>
    </StrictMode>
  );
};

export default ApplicationProvider;
