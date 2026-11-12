import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Portal from '@mui/material/Portal';
import Backdrop from '@mui/material/Backdrop';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { useSettingsContext } from 'src/hooks/settings-context';

import {
    getSafeLogoUrl,
    DEFAULT_FULL_LOGO,
    handleLogoImgError,
    getCompanyDisplayName,
} from 'src/utils/branding';

import { logout } from 'src/api/auth';
import { hasValidRole } from 'src/layouts/nav-config-dashboard';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

// ----------------------------------------------------------------------

export function AccessDeniedView() {
    const router = useRouter();
    const { user, setUser } = useAuth();
    const { settings } = useSettingsContext();
    const logoUrl = getSafeLogoUrl(settings?.app_logo, DEFAULT_FULL_LOGO);
    const companyName = getCompanyDisplayName(settings);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Redirect to dashboard if user gains valid access
    useEffect(() => {
        if (user?.roles && hasValidRole(user.roles)) {
            console.log('User now has valid access, redirecting to dashboard');
            router.push('/');
        }
    }, [user, router]);

    const handleSignOut = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
            setUser(null);
            router.push('/sign-in');
        } catch (error) {
            console.error('Logout failed:', error);
            setIsLoggingOut(false);
        }
    };

    return (
        <Container>
            <Box
                sx={{
                    py: 12,
                    maxWidth: 480,
                    mx: 'auto',
                    display: 'flex',
                    minHeight: '100vh',
                    textAlign: 'center',
                    alignItems: 'center',
                    flexDirection: 'column',
                    justifyContent: 'center',
                }}
            >
                <Box
                    key={logoUrl}
                    component="img"
                    src={logoUrl}
                    alt={companyName || 'Company Logo'}
                    onError={(e) => handleLogoImgError(e, DEFAULT_FULL_LOGO)}
                    sx={{
                        width: 200,
                        height: 'auto',
                        maxHeight: 120,
                        objectFit: 'contain',
                        mb: 4,
                    }}
                />

                <Box
                    sx={{
                        width: 120,
                        height: 120,
                        mb: 3,
                        display: 'flex',
                        borderRadius: '50%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'error.lighter',
                    }}
                >
                    <Iconify icon={"solar:lock-bold" as any} width={64} sx={{ color: 'error.main' }} />
                </Box>

                <Typography variant="h3" sx={{ mb: 2 }}>
                    Access Denied
                </Typography>

                <Typography sx={{ color: 'text.secondary', mb: 1 }}>
                    You don&apos;t have access to see this resource.
                </Typography>

                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
                    Please contact your administrator for access.
                </Typography>

                <Button
                    size="large"
                    variant="contained"
                    onClick={handleSignOut}
                    startIcon={<Iconify icon={"solar:logout-2-bold" as any} />}
                >
                    Sign Out
                </Button>
            </Box>

            <Portal>
                <Backdrop
                    sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.modal + 1000 }}
                    open={isLoggingOut}
                >
                    <CircularProgress color="inherit" />
                </Backdrop>
            </Portal>
        </Container>
    );
}
