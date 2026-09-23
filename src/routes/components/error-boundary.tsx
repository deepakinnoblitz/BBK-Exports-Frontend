import type { Theme, CSSObject } from '@mui/material/styles';

import { varAlpha } from 'minimal-shared/utils';
import { useRouteError, isRouteErrorResponse } from 'react-router';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import GlobalStyles from '@mui/material/GlobalStyles';

import { Iconify } from 'src/components/iconify';

import { RouterLink } from './router-link';

// ----------------------------------------------------------------------

export function ErrorBoundary() {
  const error = useRouteError();

  return (
    <>
      <GlobalStyles styles={globalStyles} />
      <Box className={errorBoundaryClasses.root}>
        {renderErrorMessage(error)}
      </Box>
    </>
  );
}

function parseStackTrace(stack?: string) {
  if (!stack) return { filePath: null, functionName: null };
  const filePathMatch = stack.match(/\/src\/[^?]+/);
  return { filePath: filePathMatch ? filePathMatch[0] : null };
}

function renderErrorMessage(error: any) {
  const isChunkError =
    error instanceof Error &&
    (error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('ChunkLoadError'));

  if (isChunkError) {
    return (
      <Container className={errorBoundaryClasses.container}>
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Iconify
            icon={"solar:restart-square-bold-duotone" as any}
            width={120}
            sx={{ mb: 3, color: '#059669', opacity: 0.8 }}
          />

          <Typography variant="h3" sx={{ mb: 2, fontWeight: 800 }}>
            Updates Available
          </Typography>

          <Typography sx={{ color: 'text.secondary', mb: 4, maxWidth: 480, mx: 'auto' }}>
            The application has been updated with new features or the server was restarted. 
            Please reload the page to continue using the latest version.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => window.location.reload()}
              startIcon={<Iconify icon={"solar:refresh-bold" as any} />}
              sx={{
                px: 5,
                bgcolor: '#059669',
                '&:hover': { bgcolor: '#047857' },
                boxShadow: `0 8px 16px rgba(8, 163, 205, 0.24)`
              }}
            >
              Reload Application
            </Button>
            <Button
              component={RouterLink}
              href="/"
              variant="outlined"
              size="large"
              color="inherit"
              sx={{ px: 4, fontWeight: 600 }}
            >
              Go to Home
            </Button>
          </Box>
        </Box>
      </Container>
    );
  }

  if (isRouteErrorResponse(error)) {
    return (
      <Container className={errorBoundaryClasses.container}>
         <Box sx={{ p: 4, textAlign: 'center' }}>
          <Iconify
              icon={"solar:shield-warning-bold-duotone" as any}
              width={100}
              sx={{ mb: 3, color: '#ff5555' }}
            />
          <Typography variant="h3" sx={{ mb: 2 }}>{error.status}: {error.statusText}</Typography>
          <Typography sx={{ color: 'text.secondary', mb: 4 }}>{error.data}</Typography>
          <Button component={RouterLink} href="/" variant="contained" size="large" sx={{ bgcolor: '#059669' }}>
            Go to Home
          </Button>
        </Box>
      </Container>
    );
  }

  if (error instanceof Error) {
    const { filePath } = parseStackTrace(error.stack);

    return (
      <Container className={errorBoundaryClasses.container} sx={{ maxWidth: 800 }}>
        <Box sx={{ p: 4 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
             <Iconify icon={"solar:danger-bold-duotone" as any} width={48} sx={{ color: '#ff5555' }} />
             <Typography variant="h4">Unexpected Application Error!</Typography>
          </Stack>
          
          <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 2 }}>
             {filePath && `Location: ${filePath}`}
          </Typography>

          <Box sx={{ p: 2, bgcolor: '#2a1e1e', color: '#ff5555', borderRadius: 1, mb: 3, borderLeft: '4px solid #ff5555' }}>
             <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {error.name}: {error.message}
             </Typography>
          </Box>

          <pre className={errorBoundaryClasses.details}>{error.stack}</pre>

          <Box sx={{ mt: 5, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => window.location.reload()}
              startIcon={<Iconify icon={"solar:refresh-bold" as any} />}
              sx={{ px: 4, bgcolor: '#059669' }}
            >
              Try Again
            </Button>
            <Button component={RouterLink} href="/" variant="outlined" size="large" color="inherit" sx={{ px: 4 }}>
              Go to Home
            </Button>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container className={errorBoundaryClasses.container}>
       <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h3">Something went wrong</Typography>
          <Button component={RouterLink} href="/" variant="contained" sx={{ mt: 4, bgcolor: '#059669' }}>
              Go to Home
          </Button>
       </Box>
    </Container>
  );
}

const errorBoundaryClasses = {
  root: 'error-boundary-root',
  container: 'error-boundary-container',
  details: 'error-boundary-details',
};

const globalStyles = (theme: Theme) => {
  const isDark = theme.palette.mode === 'dark';
  
  // Safe fallbacks for colors
  const bgColor = theme.palette.background.default || (isDark ? '#161c24' : '#ffffff');
  const paperColor = theme.palette.background.paper || (isDark ? '#212b36' : '#ffffff');
  const primaryColor = '#059669';

  return {
    [`& .${errorBoundaryClasses.root}`]: {
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(135deg, ${bgColor} 0%, ${isDark ? '#000000' : '#f4f6f8'} 100%)`,
      padding: theme.spacing(3),
    },
    [`& .${errorBoundaryClasses.container}`]: {
      backgroundColor: paperColor,
      borderRadius: theme.spacing(2),
      boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.16)',
      padding: 0,
      overflow: 'hidden',
      position: 'relative' as any,
      '&::before': {
        content: '""',
        position: 'absolute' as any,
        top: 0,
        left: 0,
        right: 0,
        height: 6,
        background: `linear-gradient(90deg, ${primaryColor} 0%, #047857 100%)`,
      }
    },
    [`& .${errorBoundaryClasses.details}`]: {
      margin: 0,
      padding: theme.spacing(2),
      fontSize: theme.typography.pxToRem(12),
      fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace',
      overflow: 'auto',
      maxHeight: 320,
      borderRadius: theme.spacing(1),
      color: '#e2aa53',
      backgroundColor: '#111111',
    },
  };
};
