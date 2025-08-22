// src/app/providers/AppProviders.tsx
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../styles/theme';
import { type ReactNode } from 'react';
import { QueryProvider } from '@shared/platform/query';
import { WebSocketClientProvider } from './WebSocketClientProvider';

interface ApplicationProvidersProps {
  children: ReactNode;
}

const ApplicationProvider = ({ children }: ApplicationProvidersProps) => {
  return (
    <QueryProvider>
      <WebSocketClientProvider>
        <ThemeProvider theme={theme}>{children}</ThemeProvider>
      </WebSocketClientProvider>
    </QueryProvider>
  );
};

export default ApplicationProvider;
