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

import { fetchMetaApps } from 'src/api/meta-app';
import { DashboardContent } from 'src/layouts/dashboard';
import { getMetaPage, updateMetaPage, fetchMetaAccounts } from 'src/api/meta-page';

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
                backgroundColor: '#059669',
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
        backgroundColor: '#E5E7EB',
        opacity: 1,
        transition: theme.transitions.create(['background-color'], {
            duration: 500,
        }),
    },
}));

const SUBSCRIPTION_STATUS_OPTIONS = ['Subscribed', 'Not Subscribed', 'Failed'];

export function MetaPagesEditView() {
    const { id } = useParams();
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const [pageName, setPageName] = useState('');
    const [pageId, setPageId] = useState('');
    const [metaApp, setMetaApp] = useState('');
    const [metaAccount, setMetaAccount] = useState('');
    const [category, setCategory] = useState('');
    const [pageAccessToken, setPageAccessToken] = useState('');
    const [longLivedToken, setLongLivedToken] = useState('');
    const [businessId, setBusinessId] = useState('');
    const [webhookEnabled, setWebhookEnabled] = useState(true);
    const [isActive, setIsActive] = useState(true);
    const [isConnected, setIsConnected] = useState(true);
    const [subscriptionStatus, setSubscriptionStatus] = useState('Not Subscribed');
    const [subscribedFields, setSubscribedFields] = useState('leadgen');
    const [lastSubscriptionCheck, setLastSubscriptionCheck] = useState('');

    const [metaApps, setMetaApps] = useState<any[]>([]);
    const [metaAccounts, setMetaAccounts] = useState<any[]>([]);
    const [loadingApps, setLoadingApps] = useState(true);

    const { enqueueSnackbar } = useSnackbar();
    const [errors, setErrors] = useState<{ pageName?: boolean; pageId?: boolean; metaApp?: boolean }>({});

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [appsRes, accountsRes] = await Promise.all([
                    fetchMetaApps({ page: 1, page_size: 1000 }),
                    fetchMetaAccounts(),
                ]);
                setMetaApps(appsRes.data);
                setMetaAccounts(accountsRes);
            } catch (err) {
                enqueueSnackbar('Failed to load Meta integration reference data', { variant: 'error' });
            } finally {
                setLoadingApps(false);
            }
        };
        loadInitialData();
    }, [enqueueSnackbar]);

    useEffect(() => {
        if (id) {
            setLoading(true);
            getMetaPage(id)
                .then((data) => {
                    setPageName(data.page_name || '');
                    setPageId(data.page_id || '');
                    setMetaApp(data.meta_app || '');
                    setMetaAccount(data.meta_account || '');
                    setCategory(data.category || '');
                    setPageAccessToken(data.page_access_token || '');
                    setLongLivedToken(data.long_lived_token || '');
                    setBusinessId(data.business_id || '');
                    setWebhookEnabled(data.webhook_enabled !== 0);
                    setIsActive(data.is_active !== 0);
                    setIsConnected(data.is_connected !== 0);
                    setSubscriptionStatus(data.subscription_status || 'Not Subscribed');
                    setSubscribedFields(data.subscribed_fields || 'leadgen');
                    setLastSubscriptionCheck(data.last_subscription_check || '');
                })
                .catch(() => enqueueSnackbar('Failed to load Meta Page data.', { variant: 'error' }))
                .finally(() => setLoading(false));
        }
    }, [id, enqueueSnackbar]);

    const handleSave = async () => {
        const newErrors: typeof errors = {};
        if (!pageName.trim()) newErrors.pageName = true;
        if (!pageId.trim()) newErrors.pageId = true;
        if (!metaApp) newErrors.metaApp = true;
        
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            enqueueSnackbar('Please fill in all required fields.', { variant: 'error' });
            return;
        }

        setIsSaving(true);
        try {
            const updateData: any = {
                page_name: pageName.trim(),
                page_id: pageId.trim(),
                meta_app: metaApp,
                meta_account: metaAccount || '',
                category: category.trim() || '',
                page_access_token: pageAccessToken.trim(),
                long_lived_token: longLivedToken.trim() || '',
                business_id: businessId.trim() || '',
                webhook_enabled: webhookEnabled ? 1 : 0,
                is_active: isActive ? 1 : 0,
                is_connected: isConnected ? 1 : 0,
                subscription_status: subscriptionStatus,
                subscribed_fields: subscribedFields.trim() || '',
            };

            await updateMetaPage(id!, updateData);
            sessionStorage.setItem('meta_page_success_message', 'Meta Page updated successfully.');
            router.push('/lead-integration/meta-pages');
        } catch (error: any) {
            enqueueSnackbar(error.message || 'Failed to update Meta Page.', { variant: 'error' });
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
                        Edit Meta Page
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
                        Meta Page Credentials
                    </Typography>
                </Stack>

                <Stack spacing={3}>
                    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' } }}>
                        <FormControlLabel
                            control={
                                <CustomSwitch
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                />
                            }
                            label={
                                <Stack spacing={0.2}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, pl: 2 }}>Is Active</Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', pl: 2 }}>Enable this page configuration</Typography>
                                </Stack>
                            }
                            sx={{ ml: 0.5 }}
                        />
                        <FormControlLabel
                            control={
                                <CustomSwitch
                                    checked={isConnected}
                                    onChange={(e) => setIsConnected(e.target.checked)}
                                />
                            }
                            label={
                                <Stack spacing={0.2}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, pl: 2 }}>Is Connected</Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', pl: 2 }}>Mark page as connected to Meta</Typography>
                                </Stack>
                            }
                            sx={{ ml: 0.5 }}
                        />
                        <FormControlLabel
                            control={
                                <CustomSwitch
                                    checked={webhookEnabled}
                                    onChange={(e) => setWebhookEnabled(e.target.checked)}
                                />
                            }
                            label={
                                <Stack spacing={0.2}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, pl: 2 }}>Webhook Enabled</Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', pl: 2 }}>Enable webhooks for lead streams</Typography>
                                </Stack>
                            }
                            sx={{ ml: 0.5 }}
                        />
                    </Box>

                    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                        <TextField
                            fullWidth
                            label="Page Name"
                            required
                            value={pageName}
                            onChange={(e) => { setPageName(e.target.value); if (e.target.value) setErrors(p => ({ ...p, pageName: false })); }}
                            error={errors.pageName}
                            helperText={errors.pageName ? 'Page Name is required' : ''}
                        />
                        <TextField
                            fullWidth
                            label="Page ID"
                            required
                            value={pageId}
                            onChange={(e) => { setPageId(e.target.value); if (e.target.value) setErrors(p => ({ ...p, pageId: false })); }}
                            error={errors.pageId}
                            helperText={errors.pageId ? 'Page ID is required' : ''}
                        />
                    </Box>

                    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' } }}>
                        <FormControl fullWidth required error={errors.metaApp}>
                            <InputLabel id="meta-app-label">Meta App</InputLabel>
                            <Select
                                labelId="meta-app-label"
                                value={metaApp}
                                label="Meta App"
                                onChange={(e) => { setMetaApp(e.target.value); setErrors(p => ({ ...p, metaApp: false })); }}
                            >
                                {metaApps.map((app) => (
                                    <MenuItem key={app.name} value={app.name}>
                                        {app.app_name}
                                    </MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>{errors.metaApp ? 'Meta App link is required' : ''}</FormHelperText>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel id="meta-account-label">Meta Account</InputLabel>
                            <Select
                                labelId="meta-account-label"
                                value={metaAccount}
                                label="Meta Account"
                                onChange={(e) => setMetaAccount(e.target.value)}
                            >
                                <MenuItem value=""><em>None</em></MenuItem>
                                {metaAccounts.map((acc) => (
                                    <MenuItem key={acc.name} value={acc.name}>
                                        {acc.facebook_user_name || acc.facebook_user_id || acc.name}
                                    </MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>Link to CRM Meta Account</FormHelperText>
                        </FormControl>

                        <TextField
                            fullWidth
                            label="Category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            helperText="Facebook Page category"
                        />
                    </Box>

                    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' } }}>
                        <FormControl fullWidth>
                            <InputLabel id="sub-status-label">Subscription Status</InputLabel>
                            <Select
                                labelId="sub-status-label"
                                value={subscriptionStatus}
                                label="Subscription Status"
                                onChange={(e) => setSubscriptionStatus(e.target.value)}
                            >
                                {SUBSCRIPTION_STATUS_OPTIONS.map((st) => (
                                    <MenuItem key={st} value={st}>{st}</MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>Webhook subscription state</FormHelperText>
                        </FormControl>

                        <TextField
                            fullWidth
                            label="Subscribed Fields"
                            value={subscribedFields}
                            onChange={(e) => setSubscribedFields(e.target.value)}
                            helperText="Subscribed fields (e.g. leadgen)"
                        />

                        <TextField
                            fullWidth
                            label="Business ID"
                            value={businessId}
                            onChange={(e) => setBusinessId(e.target.value)}
                        />
                    </Box>

                    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr' } }}>
                        <TextField
                            fullWidth
                            label="Page Access Token"
                            required
                            multiline
                            rows={3}
                            value={pageAccessToken}
                            onChange={(e) => setPageAccessToken(e.target.value)}
                            helperText="Leave blank to keep existing value"
                            placeholder="••••••••"
                        />
                    </Box>

                    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr' } }}>
                        <TextField
                            fullWidth
                            label="Long-lived Token"
                            multiline
                            rows={2}
                            value={longLivedToken}
                            onChange={(e) => setLongLivedToken(e.target.value)}
                            helperText="Leave blank to keep existing value"
                            placeholder="••••••••"
                        />
                    </Box>
                </Stack>
            </Card>
        </DashboardContent>
    );
}
