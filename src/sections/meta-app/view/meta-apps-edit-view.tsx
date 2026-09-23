import { useSnackbar } from 'notistack';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { IoMdArrowBack } from 'react-icons/io';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import { styled } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import Switch, { SwitchProps } from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { getMetaApp, updateMetaApp } from 'src/api/meta-app';

import { Iconify } from 'src/components/iconify';

// Custom Switch Style matching the CRM / WhatsApp style
export const CustomSwitch = styled((props: SwitchProps) => (
    <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
    width: 42,
    height: 24,
    padding: 0,
    '& .MuiSwitch-switchBase': {
        padding: 0,
        margin: 2,
        transitionDuration: '300ms',
        '&.Mui-checked': {
            transform: 'translateX(18px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
                backgroundColor: '#059669', // Match the #059669 theme color
                opacity: 1,
                border: 0,
            },
        },
    },
    '& .MuiSwitch-thumb': {
        boxSizing: 'border-box',
        width: 19,
        height: 19,
        boxShadow: '0 2px 4px 0 rgb(0 35 11 / 20%)',
    },
    '& .MuiSwitch-track': {
        borderRadius: 26 / 2,
        backgroundColor: '#E5E7EB', // Light Gray
        opacity: 1,
        transition: theme.transitions.create(['background-color'], {
            duration: 500,
        }),
    },
}));

// ----------------------------------------------------------------------

const GRAPH_API_VERSIONS = ['v23.0', 'v22.0', 'v21.0', 'v20.0'];
const APP_STATUS_OPTIONS = ['Development', 'Production'];

// ----------------------------------------------------------------------

export function MetaAppsEditView() {
    const { id } = useParams();
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const [appName, setAppName] = useState('');
    const [appId, setAppId] = useState('');
    const [appSecret, setAppSecret] = useState('');
    const [verifyToken, setVerifyToken] = useState('');
    const [graphApiVersion, setGraphApiVersion] = useState('v23.0');
    const [businessManagerId, setBusinessManagerId] = useState('');
    const [appStatus, setAppStatus] = useState('Development');
    const [webhookSecret, setWebhookSecret] = useState('');
    const [oauthRedirectUri, setOauthRedirectUri] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [signatureValidation, setSignatureValidation] = useState(true);
    const [isDefault, setIsDefault] = useState(false);
    const [isActive, setIsActive] = useState(true);

    const { enqueueSnackbar } = useSnackbar();
    const [errors, setErrors] = useState<{ appName?: boolean; appId?: boolean }>({});

    useEffect(() => {
        if (id) {
            setLoading(true);
            getMetaApp(id)
                .then((data) => {
                    setAppName(data.app_name || '');
                    setAppId(data.app_id || '');
                    setGraphApiVersion(data.graph_api_version || 'v23.0');
                    setBusinessManagerId(data.business_manager_id || '');
                    setAppStatus(data.app_status || 'Development');
                    setOauthRedirectUri(data.oauth_redirect_uri || '');
                    setWebhookUrl(data.webhook_url || '');
                    setSignatureValidation(data.signature_validation !== 0);
                    setIsDefault(!!data.is_default);
                    setIsActive(data.is_active !== 0);
                })
                .catch(() => enqueueSnackbar('Failed to load Meta App data.', { variant: 'error' }))
                .finally(() => setLoading(false));
        }
    }, [id]);

    const handleSave = async () => {
        const newErrors: typeof errors = {};
        if (!appName.trim()) newErrors.appName = true;
        if (!appId.trim()) newErrors.appId = true;
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            enqueueSnackbar('Please fill in all required fields.', { variant: 'error' });
            return;
        }

        setIsSaving(true);
        try {
            const updateData: any = {
                app_name: appName.trim(),
                app_id: appId.trim(),
                graph_api_version: graphApiVersion,
                business_manager_id: businessManagerId.trim() || '',
                app_status: appStatus,
                signature_validation: signatureValidation ? 1 : 0,
                is_default: isDefault ? 1 : 0,
                is_active: isActive ? 1 : 0,
                oauth_redirect_uri: oauthRedirectUri.trim() || '',
                webhook_url: webhookUrl.trim() || '',
            };
            if (appSecret.trim()) updateData.app_secret = appSecret.trim();
            if (verifyToken.trim()) updateData.verify_token = verifyToken.trim();
            if (webhookSecret.trim()) updateData.webhook_secret = webhookSecret.trim();

            await updateMetaApp(id!, updateData);
            sessionStorage.setItem('meta_app_success_message', 'Meta App updated successfully.');
            router.push('/lead-integration/meta-apps');
        } catch (error: any) {
            enqueueSnackbar(error.message || 'Failed to update Meta App.', { variant: 'error' });
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <CircularProgress sx={{ color: '#059669' }} />
            </DashboardContent>
        );
    }

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3}>
                <Stack spacing={0.5}>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        Edit Meta App
                    </Typography>
                </Stack>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => router.back()}
                        startIcon={<IoMdArrowBack size={20} />}
                        sx={{ borderRadius: 1.5, fontWeight: 600, textTransform: 'none', px: 2.5 }}
                    >
                        Go Back
                    </Button>
                    <LoadingButton
                        variant="contained"
                        onClick={handleSave}
                        loading={isSaving}
                        sx={{ borderRadius: 1.5, bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                    >
                        Save Changes
                    </LoadingButton>
                </Stack>
            </Stack>

            <Card sx={{ p: 3 }}>
                {/* Section: Credentials */}
                <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary', mb: 3 }}>
                    <Iconify icon={"logos:meta-icon" as any} width={18} />
                    <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>
                        Meta Developer App Credentials
                    </Typography>
                </Stack>

                <Stack spacing={3}>
                    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                        <FormControlLabel
                            control={<CustomSwitch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
                            label={<Stack spacing={0.2}><Typography variant="body2" sx={{ fontWeight: 600, pl: 2 }}>Is Active</Typography><Typography variant="caption" sx={{ color: 'text.secondary', pl: 2 }}>Enable this app for processing leads</Typography></Stack>}
                            sx={{ ml: 0.5 }}
                        />
                        <FormControlLabel
                            control={<CustomSwitch checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />}
                            label={<Stack spacing={0.2}><Typography variant="body2" sx={{ fontWeight: 600, pl: 2 }}>Is Default App</Typography><Typography variant="caption" sx={{ color: 'text.secondary', pl: 2 }}>Use as the default Meta integration</Typography></Stack>}
                            sx={{ ml: 0.5 }}
                        />
                        <TextField
                            fullWidth
                            label="App Name"
                            required
                            value={appName}
                            onChange={(e) => { setAppName(e.target.value); if (e.target.value) setErrors(p => ({ ...p, appName: false })); }}
                            error={errors.appName}
                            helperText={errors.appName ? 'App Name is required' : ''}
                        />
                        <TextField
                            fullWidth
                            label="App ID"
                            required
                            value={appId}
                            onChange={(e) => { setAppId(e.target.value); if (e.target.value) setErrors(p => ({ ...p, appId: false })); }}
                            error={errors.appId}
                            helperText={errors.appId ? 'App ID is required' : ''}
                        />
                    </Box>

                    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                        <TextField
                            fullWidth
                            label="App Secret"
                            type="password"
                            value={appSecret}
                            onChange={(e) => setAppSecret(e.target.value)}
                            helperText="Leave blank to keep existing value"
                            placeholder="••••••••"
                        />
                        <TextField
                            fullWidth
                            label="Verify Token"
                            type="password"
                            value={verifyToken}
                            onChange={(e) => setVerifyToken(e.target.value)}
                            helperText="Leave blank to keep existing value"
                            placeholder="••••••••"
                        />
                    </Box>

                    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                        <TextField
                            fullWidth
                            label="Business Manager ID"
                            value={businessManagerId}
                            onChange={(e) => setBusinessManagerId(e.target.value)}
                        />
                        <TextField
                            fullWidth
                            label="Webhook Secret"
                            type="password"
                            value={webhookSecret}
                            onChange={(e) => setWebhookSecret(e.target.value)}
                            helperText="Leave blank to keep existing value"
                            placeholder="••••••••"
                        />
                    </Box>

                    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                        <TextField
                            fullWidth
                            label="OAuth Redirect URI"
                            value={oauthRedirectUri}
                            onChange={(e) => setOauthRedirectUri(e.target.value)}
                            helperText="Callback URL used by Meta OAuth after Facebook login"
                        />
                        <TextField
                            fullWidth
                            label="Webhook Callback URL"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            helperText="Callback URL registered in Meta for webhook events"
                        />
                    </Box>

                    {/* Divider + Configuration */}
                    <Divider />

                    <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                        <Iconify icon={"solar:settings-bold" as any} width={16} />
                        <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>
                            Configuration
                        </Typography>
                    </Stack>

                    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                        <FormControl fullWidth>
                            <InputLabel>Graph API Version</InputLabel>
                            <Select
                                value={graphApiVersion}
                                onChange={(e) => setGraphApiVersion(e.target.value)}
                                label="Graph API Version"
                            >
                                {GRAPH_API_VERSIONS.map((v) => (
                                    <MenuItem key={v} value={v}>{v}</MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>Meta Graph API version to use</FormHelperText>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel>App Status</InputLabel>
                            <Select
                                value={appStatus}
                                onChange={(e) => setAppStatus(e.target.value)}
                                label="App Status"
                            >
                                {APP_STATUS_OPTIONS.map((s) => (
                                    <MenuItem key={s} value={s}>{s}</MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>Set app environment mode</FormHelperText>
                        </FormControl>
                        <FormControlLabel
                            control={<CustomSwitch checked={signatureValidation} onChange={(e) => setSignatureValidation(e.target.checked)} />}
                            label={<Stack spacing={0.2}><Typography variant="body2" sx={{ fontWeight: 600, pl: 2 }}>Enable Signature Validation</Typography><Typography variant="caption" sx={{ color: 'text.secondary', pl: 2  }}>Validate webhook payload signatures</Typography></Stack>}
                            sx={{ ml: 0.5 }}
                        />
                    </Box>
                </Stack>
            </Card>
        </DashboardContent>
    );
}
