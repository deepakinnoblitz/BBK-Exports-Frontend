import 'src/global.css';

import React, { useEffect, forwardRef } from 'react';
import { closeSnackbar, SnackbarProvider } from 'notistack';

import { Alert } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { usePathname } from 'src/routes/hooks';

import { SettingsProvider } from 'src/hooks/settings-context';
import { DashboardViewProvider } from 'src/hooks/dashboard-view-context';

import { ThemeProvider } from 'src/theme/theme-provider';

import { AuthProvider } from 'src/auth/auth-context';
// ----------------------------------------------------------------------

type AppProps = {
  children: React.ReactNode;
};

export default function App({ children }: AppProps) {
  useScrollToTop();


  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} dateFormats={{ normalDate: 'DD-MM-YYYY', keyboardDate: 'DD-MM-YYYY' }}>
      <AuthProvider>
        <SettingsProvider>
          <DashboardViewProvider>
            <ThemeProvider>
              <SnackbarProvider
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                autoHideDuration={3000}
                Components={{
                  success: forwardRef<HTMLDivElement, any>((props, ref) => (
                    <Alert
                      ref={ref}
                      severity="success"
                      variant="standard"
                      onClose={() => closeSnackbar(props.id)}
                      sx={{
                        width: '100%',
                        fontWeight: 500,
                        borderRadius: 1.5,
                        minWidth: 300,
                        boxShadow: (theme) => theme.customShadows.z8,
                        '& .MuiAlert-action': { padding: '0 8px', display: 'flex', alignItems: 'center' },
                      }}
                    >
                      {props.message}
                    </Alert>
                  )),
                  error: forwardRef<HTMLDivElement, any>((props, ref) => (
                    <Alert
                      ref={ref}
                      severity="error"
                      variant="standard"
                      onClose={() => closeSnackbar(props.id)}
                      sx={{
                        width: '100%',
                        fontWeight: 500,
                        borderRadius: 1.5,
                        minWidth: 300,
                        boxShadow: (theme) => theme.customShadows.z8,
                        '& .MuiAlert-action': { padding: '0 8px', display: 'flex', alignItems: 'center' },
                      }}
                    >
                      {props.message}
                    </Alert>
                  )),
                  warning: forwardRef<HTMLDivElement, any>((props, ref) => (
                    <Alert
                      ref={ref}
                      severity="warning"
                      variant="standard"
                      onClose={() => closeSnackbar(props.id)}
                      sx={{
                        width: '100%',
                        fontWeight: 500,
                        borderRadius: 1.5,
                        minWidth: 300,
                        boxShadow: (theme) => theme.customShadows.z8,
                        '& .MuiAlert-action': { padding: '0 8px', display: 'flex', alignItems: 'center' },
                      }}
                    >
                      {props.message}
                    </Alert>
                  )),
                  info: forwardRef<HTMLDivElement, any>((props, ref) => (
                    <Alert
                      ref={ref}
                      severity="info"
                      variant="standard"
                      onClose={() => closeSnackbar(props.id)}
                      sx={{
                        width: '100%',
                        fontWeight: 500,
                        borderRadius: 1.5,
                        minWidth: 300,
                        boxShadow: (theme) => theme.customShadows.z8,
                        '& .MuiAlert-action': { padding: '0 8px', display: 'flex', alignItems: 'center' },
                      }}
                    >
                      {props.message}
                    </Alert>
                  )),
                }}
              >
                {children}
              </SnackbarProvider>
            </ThemeProvider>
          </DashboardViewProvider>
        </SettingsProvider>
      </AuthProvider>
    </LocalizationProvider>
  );
}

// ----------------------------------------------------------------------

function useScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}