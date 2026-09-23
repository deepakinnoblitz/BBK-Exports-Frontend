import type { SwitchProps } from '@mui/material/Switch';
import type { WhatsAppSettings } from 'src/api/whatsapp-settings';

import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { MuiTelInput } from 'mui-tel-input';
import { MdContentCopy } from 'react-icons/md';
import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import { styled } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { DashboardContent } from 'src/layouts/dashboard';
import { sendWhatsappMessage, uploadWhatsappAttachment } from 'src/api/whatsapp';
import { getWhatsAppSettings, saveWhatsAppSettings, testWhatsAppConnection, getWhatsAppMessageCount } from 'src/api/whatsapp-settings';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

export const CustomSwitch = styled((props: SwitchProps) => (
    <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
    width: 38,
    height: 22,
    padding: 0,
    '& .MuiSwitch-switchBase': {
        padding: 0,
        margin: 2,
        transitionDuration: '300ms',
        '&.Mui-checked': {
            transform: 'translateX(16px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
                backgroundColor: '#059669',
                opacity: 1,
                border: 0,
            },
            '&.Mui-disabled + .MuiSwitch-track': {
                opacity: 0.5,
            },
        },
        '&.Mui-focusVisible .MuiSwitch-thumb': {
            color: '#059669',
            border: '6px solid #fff',
        },
        '&.Mui-disabled .MuiSwitch-thumb': {
            color: theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[600],
        },
        '&.Mui-disabled + .MuiSwitch-track': {
            opacity: theme.palette.mode === 'light' ? 0.7 : 0.3,
        },
    },
    '& .MuiSwitch-thumb': {
        boxSizing: 'border-box',
        width: 18,
        height: 18,
    },
    '& .MuiSwitch-track': {
        borderRadius: 26 / 2,
        backgroundColor: theme.palette.mode === 'light' ? '#E9E9EA' : '#39393D',
        opacity: 1,
        transition: theme.transitions.create(['background-color'], {
            duration: 500,
        }),
    },
}));

export function WhatsAppSettingsView() {
    const { enqueueSnackbar } = useSnackbar();

    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.whatsapp_settings;
    const displayCreate = hasCustomPerms ? !!user?.permissions?.actions?.whatsapp_settings?.create : true;
    const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.whatsapp_settings?.edit : true;

    const [settings, setSettings] = useState<Partial<WhatsAppSettings>>({
        enable_whatsapp: 1,
        token_type: 'Temporary',
        phone_number_id: '',
        business_account_id: '',
    });
    const [originalSettings, setOriginalSettings] = useState<Partial<WhatsAppSettings>>({});
    const [errors, setErrors] = useState<{ phone_number_id?: boolean; access_token?: boolean; webhook_verify_token?: boolean }>({});
    const [testing, setTesting] = useState(false);
    const [currentTab, setCurrentTab] = useState('settings');
    const [messageCount, setMessageCount] = useState<number>(0);

    // Modal state
    const [sendModalOpen, setSendModalOpen] = useState(false);
    const [recipientPhone, setRecipientPhone] = useState('');
    const [messageText, setMessageText] = useState('');
    const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
    const [attachmentName, setAttachmentName] = useState<string>('');
    const [uploadingFile, setUploadingFile] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (sendModalOpen && settings.whatsapp_number) {
            let phoneVal = settings.whatsapp_number.trim();
            if (phoneVal && !phoneVal.startsWith('+')) {
                phoneVal = `+${phoneVal}`;
            }
            setRecipientPhone(phoneVal);
        }
    }, [sendModalOpen, settings.whatsapp_number]);

    useEffect(() => {
        Promise.all([getWhatsAppSettings(), getWhatsAppMessageCount()])
            .then(([data, count]) => {
                if (data) {
                    setSettings(data);
                    setOriginalSettings(data);
                }
                setMessageCount(count);
            })
            .catch(err => enqueueSnackbar('Failed to load settings', { variant: 'error' }));
    }, [enqueueSnackbar]);

    const handleChange = (field: keyof WhatsAppSettings, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
        if (field === 'phone_number_id' || field === 'access_token' || field === 'webhook_verify_token') {
            setErrors(prev => ({ ...prev, [field]: false }));
        }
    };

    const hasChanges = () => {
        const fields: (keyof WhatsAppSettings)[] = [
            'enable_whatsapp',
            'token_type',
            'access_token',
            'phone_number_id',
            'business_account_id',
            'webhook_verify_token',
            'max_success_send_message_limit'
        ];
        return fields.some(field => settings[field] !== originalSettings[field]);
    };

    const handleSave = async () => {
        if (!settings.phone_number_id || !settings.access_token || !settings.webhook_verify_token) {
            setErrors({
                phone_number_id: !settings.phone_number_id,
                access_token: !settings.access_token,
                webhook_verify_token: !settings.webhook_verify_token,
            });
            enqueueSnackbar('Please fill all mandatory fields', { variant: 'error' });
            return;
        }

        if (!hasChanges()) {
            enqueueSnackbar('No changes to save', { variant: 'info' });
            return;
        }

        try {
            await saveWhatsAppSettings(settings);
            const updatedData = await getWhatsAppSettings();
            if (updatedData) {
                setSettings(updatedData);
                setOriginalSettings(updatedData);
            }
            enqueueSnackbar('Settings saved successfully', { variant: 'success' });
        } catch {
            enqueueSnackbar('Failed to save settings', { variant: 'error' });
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);

        try {
            const result = await testWhatsAppConnection();

            if (result?.success) {
                enqueueSnackbar(result.message || "WhatsApp API connected successfully.", {
                    variant: "success",
                });
            } else {
                let message = "Unable to connect to WhatsApp API.";

                if (result?.error) {
                    try {
                        const error =
                            typeof result.error === "string"
                                ? JSON.parse(result.error)
                                : result.error;

                        message =
                            error?.error?.message ||
                            error?.message ||
                            result.error;
                    } catch {
                        message = result.error;
                    }
                }

                enqueueSnackbar(message, {
                    variant: "error",
                    autoHideDuration: 6000,
                });
            }
        } catch (err: any) {
            enqueueSnackbar(
                err?.response?.data?.message ||
                err?.message ||
                "Unable to connect to WhatsApp API.",
                {
                    variant: "error",
                    autoHideDuration: 6000,
                }
            );
        } finally {
            getWhatsAppSettings()
                .then(data => {
                    if (data) {
                        setSettings(data);
                        setOriginalSettings(data);
                    }
                })
                .catch(err => {
                    console.error('Failed to refresh settings from DB:', err);
                })
                .finally(() => {
                    setTesting(false);
                });
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingFile(true);
        try {
            const url = await uploadWhatsappAttachment(file);
            setAttachmentUrl(url);
            setAttachmentName(file.name);
            enqueueSnackbar('Attachment uploaded successfully', { variant: 'success' });
        } catch (err: any) {
            enqueueSnackbar(err.message || 'Failed to upload attachment', { variant: 'error' });
        } finally {
            setUploadingFile(false);
        }
    };

    const handleSend = async () => {
        const cleanPhone = recipientPhone.replace(/\D/g, '');
        if (!cleanPhone) {
            enqueueSnackbar('Phone number is required', { variant: 'error' });
            return;
        }

        setSendingMessage(true);
        try {
            await sendWhatsappMessage(cleanPhone, messageText, attachmentUrl || undefined);
            enqueueSnackbar('WhatsApp message sent successfully', { variant: 'success' });
            setMessageText('');
            setAttachmentUrl(null);
            setAttachmentName('');
            setSendModalOpen(false);
        } catch (err: any) {
            enqueueSnackbar(err.message || 'Failed to send WhatsApp message', { variant: 'error' });
        } finally {
            setSendingMessage(false);
        }
    };

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                <Typography variant="h4">CRM WhatsApp Settings</Typography>
                <Stack direction="row" spacing={2}>
                    {displayEdit && displayCreate &&(
                        <>
                            <Button
                                variant="outlined"
                                onClick={handleTestConnection}
                                disabled={testing}
                                sx={{ borderRadius: 1.5 }}
                            >
                                {testing ? 'Testing...' : 'Test Connection'}
                            </Button>
                            <Button
                                variant="contained"
                                onClick={() => setSendModalOpen(true)}
                                sx={{
                                    bgcolor: '#25D366',
                                    color: '#FFFFFF',
                                    '&:hover': { bgcolor: '#1EBE5D' },
                                    '&:active': { bgcolor: '#128C7E' },
                                    borderRadius: 1.5,
                                }}
                            >
                                Send WhatsApp Message
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleSave}
                                sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' }, borderRadius: 1.5 }}
                            >
                                Save Settings
                            </Button>
                        </>
                    )}
                </Stack>
            </Stack>

            <Tabs value={currentTab} onChange={(e, val) => setCurrentTab(val)} sx={{ mb: 3 }}>
                <Tab label="Settings" value="settings" />
                <Tab label="Analytics" value="analytics" />
            </Tabs>

            {currentTab === 'settings' && (
                <Box display="grid" gridTemplateColumns={{ xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' }} gap={3}>
                    <Box gridColumn={{ xs: 'span 1', md: 'span 1' }}>
                        <Card sx={{ p: 3, mb: 3 }}>
                            <Typography variant="h6" sx={{ mb: 3 }}>WhatsApp Integration</Typography>
                            <Stack spacing={3}>
                                <FormControlLabel
                                    control={<CustomSwitch checked={!!settings.enable_whatsapp} onChange={(e) => handleChange('enable_whatsapp', e.target.checked ? 1 : 0)} />}
                                    label="Enable WhatsApp"
                                    sx={{ m: 0, '& .MuiFormControlLabel-label': { ml: 1 } }}
                                />
                                <TextField
                                    fullWidth
                                    select
                                    label="Token Type"
                                    value={settings.token_type || 'Temporary'}
                                    onChange={(e) => handleChange('token_type', e.target.value)}
                                >
                                    {['Temporary', 'Permanent'].map(opt => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                                <TextField
                                    fullWidth
                                    type="password"
                                    label="Access Token"
                                    value={settings.access_token || ''}
                                    onChange={(e) => handleChange('access_token', e.target.value)}
                                    required
                                    error={errors.access_token}
                                    helperText={errors.access_token ? 'This field is required' : ''}
                                />
                                <TextField
                                    fullWidth
                                    label="Phone Number ID"
                                    value={settings.phone_number_id || ''}
                                    onChange={(e) => handleChange('phone_number_id', e.target.value)}
                                    required
                                    error={errors.phone_number_id}
                                    helperText={errors.phone_number_id ? 'This field is required' : ''}
                                />
                                <TextField
                                    fullWidth
                                    label="Business Account ID"
                                    value={settings.business_account_id || ''}
                                    onChange={(e) => handleChange('business_account_id', e.target.value)}
                                    required
                                />
                                <TextField
                                    fullWidth
                                    label="WhatsApp Number"
                                    value={settings.whatsapp_number || ''}
                                    InputProps={{ readOnly: true }}
                                />
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Max Success Send Message Limit (Monthly)"
                                    value={settings.max_success_send_message_limit ?? ''}
                                    onChange={(e) => handleChange('max_success_send_message_limit', e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder="0"
                                    helperText="Leave empty or set to 0 for unlimited messages"
                                />
                            </Stack>
                        </Card>
                    </Box>

                    <Box gridColumn={{ xs: 'span 1', md: 'span 1' }}>
                        <Card sx={{ p: 3, mb: 3 }}>
                            <Typography variant="h6" sx={{ mb: 3 }}>Webhook Configuration</Typography>
                            <Stack spacing={3}>
                                <TextField
                                    fullWidth
                                    type="password"
                                    label="Webhook Verify Token"
                                    value={settings.webhook_verify_token || ''}
                                    onChange={(e) => handleChange('webhook_verify_token', e.target.value)}
                                    required
                                    error={errors.webhook_verify_token}
                                    helperText={errors.webhook_verify_token ? 'This field is required' : ''}
                                />
                                <TextField
                                    fullWidth
                                    label="Webhook URL"
                                    value={settings.webhook_url || ''}
                                    InputProps={{
                                        readOnly: true,
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    onClick={() => {
                                                        if (settings.webhook_url) {
                                                            navigator.clipboard.writeText(settings.webhook_url);
                                                            enqueueSnackbar('Webhook URL copied to clipboard', { variant: 'success' });
                                                        }
                                                    }}
                                                    edge="end"
                                                >
                                                    <MdContentCopy size={18} color="#059669" />
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                    helperText="Auto Generated - Configure this URL in your Facebook App dashboard"
                                />
                            </Stack>
                        </Card>

                        <Card sx={{ p: 3, mb: 3 }}>
                            <Typography variant="h6" sx={{ mb: 3 }}>Connection Status</Typography>
                            <Stack spacing={3}>
                                <TextField
                                    fullWidth
                                    label="Connection Status"
                                    value={settings.connection_status || 'Disconnected'}
                                    InputProps={{ readOnly: true }}
                                />
                                <TextField
                                    fullWidth
                                    label="Last Connected On"
                                    value={settings.last_connected_on ? dayjs(settings.last_connected_on).format('DD-MM-YYYY hh:mm A') : ''}
                                    InputProps={{ readOnly: true }}
                                />
                            </Stack>
                        </Card>
                    </Box>
                </Box>
            )}

            {currentTab === 'analytics' && (
                <Box>
                    <Card sx={{ p: 4, mb: 3, textAlign: 'center' }}>
                        <Typography variant="h5" sx={{ mb: 2 }}>Monthly WhatsApp Message Analytics</Typography>

                        <Box
                        sx={{
                            position: "relative",
                            display: "inline-flex",
                            justifyContent: "center",
                            alignItems: "center",
                            my: 4,
                        }}
                        >
                        {/* Background Ring */}
                        <CircularProgress
                            variant="determinate"
                            value={100}
                            size={240}
                            thickness={3.8}
                            sx={{
                            color: (theme) => theme.palette.grey[200],
                            }}
                        />

                        {/* Progress Ring */}
                        <CircularProgress
                            variant="determinate"
                            value={
                            settings.max_success_send_message_limit
                                ? Math.min(
                                    100,
                                    (messageCount / settings.max_success_send_message_limit) * 100
                                )
                                : 100
                            }
                            size={240}
                            thickness={5}
                            sx={{
                            color: "#08A3CD",
                            position: "absolute",
                            left: 0,
                            "& .MuiCircularProgress-circle": {
                                strokeLinecap: "round",
                            },
                            filter: "drop-shadow(0 4px 12px rgba(8,163,205,.25))",
                            }}
                        />

                        {/* Center Content */}
                        <Box
                            sx={{
                            position: "absolute",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                            }}
                        >
                            <Typography
                            variant="h2"
                            sx={{
                                fontWeight: 800,
                                lineHeight: 1,
                                color: "#111827",
                            }}
                            >
                            {messageCount}
                            </Typography>

                            <Typography
                            variant="body2"
                            sx={{
                                mt: 0.5,
                                color: "text.secondary",
                                fontWeight: 600,
                            }}
                            >
                            {settings.max_success_send_message_limit
                                ? `of ${settings.max_success_send_message_limit}`
                                : "Messages Sent"}
                            </Typography>

                            {settings.max_success_send_message_limit && (
                            <Typography
                                variant="caption"
                                sx={{
                                mt: 1,
                                px: 1.5,
                                py: 0.4,
                                borderRadius: 10,
                                bgcolor: "#E0F7FC",
                                color: "#08A3CD",
                                fontWeight: 700,
                                }}
                            >
                                {Math.round(
                                (messageCount / settings.max_success_send_message_limit) * 100
                                )}
                                %
                            </Typography>
                            )}
                        </Box>
                        </Box>

                        {(settings.max_success_send_message_limit && settings.max_success_send_message_limit > 0) && (
                            <Box sx={{ mt: 3 }}>
                                <Typography variant="body1">
                                    You have used <strong>{messageCount}</strong> out of your <strong>{settings.max_success_send_message_limit}</strong> messages limit.
                                </Typography>
                                {(messageCount >= settings.max_success_send_message_limit) && (
                                    <Typography color="error" variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                                        Limit Reached. Messages will no longer be sent.
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Card>
                </Box>
            )}

            <Dialog open={sendModalOpen} onClose={() => setSendModalOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">Send WhatsApp Message</Typography>
                    <IconButton
                        aria-label="close"
                        onClick={() => setSendModalOpen(false)}
                        sx={{
                            color: (theme) => theme.palette.grey[500],
                        }}
                    >
                        <Iconify icon="mingcute:close-line" width={24} />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 2 }}>
                    <MuiTelInput
                        required
                        fullWidth
                        defaultCountry="IN"
                        label="Phone Number"
                        value={recipientPhone}
                        onChange={(newValue) => setRecipientPhone(newValue)}
                    />

                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Message"
                        placeholder="Enter message..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                    />

                    <Box>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>Attachment</Typography>
                        <input
                            type="file"
                            style={{ display: 'none' }}
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                        {uploadingFile ? (
                            <Button disabled variant="outlined" startIcon={<CircularProgress size={16} />}>
                                Uploading...
                            </Button>
                        ) : attachmentUrl ? (
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Chip
                                    label={attachmentName}
                                    onDelete={() => {
                                        setAttachmentUrl(null);
                                        setAttachmentName('');
                                    }}
                                    sx={{
                                        bgcolor: '#22c55e',
                                        color: '#ffffff',
                                        fontWeight: 600,
                                        '& .MuiChip-deleteIcon': {
                                            color: '#ffffff',
                                            '&:hover': {
                                                color: '#e0e0e0',
                                            }
                                        }
                                    }}
                                />
                            </Stack>
                        ) : (
                            <Button
                                variant="outlined"
                                onClick={() => fileInputRef.current?.click()}
                                startIcon={<Iconify icon="solar:upload-bold" />}
                                sx={{ color: '#059669', borderColor: '#059669', '&:hover': { borderColor: '#047857', bgcolor: 'rgba(8, 163, 205, 0.04)' } }}
                            >
                                Upload File
                            </Button>
                        )}
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={handleSend}
                        variant="contained"
                        disabled={sendingMessage || uploadingFile}
                        sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                    >
                        {sendingMessage ? 'Sending...' : 'Send'}
                    </Button>
                </DialogActions>
            </Dialog>
        </DashboardContent>
    );
}