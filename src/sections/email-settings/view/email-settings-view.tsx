import { useSnackbar } from 'notistack';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import Switch, { SwitchProps } from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';

import { DashboardContent } from 'src/layouts/dashboard';
import { getEmailSettings, saveEmailSettings, getEmailAccountOptions, EmailSettings } from 'src/api/email-settings';

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

export function EmailSettingsView() {
    const { enqueueSnackbar } = useSnackbar();
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.email_settings;
    const displayCreate = hasCustomPerms ? !!user?.permissions?.actions?.email_settings?.create : true;
    const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.email_settings?.edit : true;
    
    const [settings, setSettings] = useState<Partial<EmailSettings>>({
        default_email_account: '',
        max_emails_per_batch: 100,
        batch_delay: 5,
        maximum_retry_count: 3,
        auto_retry_failed_emails: 1,
        enable_email_automation: 1,
    });
    const [emailAccounts, setEmailAccounts] = useState<{name: string, email_id?: string}[]>([]);
    const [errors, setErrors] = useState<{ default_email_account?: boolean }>({});

    useEffect(() => {
        getEmailSettings()
            .then(data => setSettings(data))
            .catch(err => enqueueSnackbar('Failed to load settings', { variant: 'error' }));

        getEmailAccountOptions()
            .then(data => setEmailAccounts(data))
            .catch(err => console.error('Failed to load email accounts:', err));
    }, [enqueueSnackbar]);

    const handleChange = (field: keyof EmailSettings, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
        if (field === 'default_email_account' && value) {
            setErrors(prev => ({ ...prev, default_email_account: false }));
        }
    };

    const handleSave = async () => {
        if (!settings.default_email_account) {
            setErrors({ default_email_account: true });
            enqueueSnackbar('Please fill all mandatory fields', { variant: 'error' });
            return;
        }

        try {
            await saveEmailSettings(settings);
            enqueueSnackbar('Settings saved successfully', { variant: 'success' });
        } catch (err) {
            enqueueSnackbar('Failed to save settings', { variant: 'error' });
        }
    };

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                <Typography variant="h4">Email Settings</Typography>
                <Stack direction="row" spacing={2}>
                    
                    {displayEdit && displayCreate &&(
                    <Button 
                        variant="contained" 
                        onClick={handleSave}
                        sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' }, borderRadius: 1.5 }}
                    >
                        Save Settings
                    </Button>
                    )}
                </Stack>
            </Stack>

            <Box display="grid" gridTemplateColumns={{ xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' }} gap={3}>
                <Box gridColumn={{ xs: 'span 1', md: 'span 1' }}>
                    <Card sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 3 }}>SMTP Configuration</Typography>
                        <Stack spacing={3}>
                            <Autocomplete
                                fullWidth
                                options={emailAccounts}
                                getOptionLabel={(option) => option.name || ''}
                                value={emailAccounts.find(acc => acc.name === settings.default_email_account) || null}
                                onChange={(e, newValue) => handleChange('default_email_account', newValue?.name || '')}
                                filterOptions={(options, params) => {
                                    const { inputValue } = params;
                                    return options.filter(option => 
                                        option.name.toLowerCase().includes(inputValue.toLowerCase()) ||
                                        (option.email_id || '').toLowerCase().includes(inputValue.toLowerCase())
                                    );
                                }}
                                renderOption={(props, option) => {
                                    const { key, ...optionProps } = props as any;
                                    return (
                                        <Box 
                                            component="li" 
                                            key={key || option.name} 
                                            {...optionProps} 
                                            sx={{
                                                typography: 'body2',
                                                display: 'flex !important',
                                                flexDirection: 'column !important',
                                                alignItems: 'flex-start !important',
                                                textAlign: 'left !important',
                                                width: '100% !important',
                                                py: 1,
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ fontWeight: '600', textAlign: 'left !important', width: '100% !important' }}>
                                                {option.name}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'left !important', width: '100% !important' }}>
                                                {option.email_id || option.name}
                                            </Typography>
                                        </Box>
                                    );
                                }}
                                renderInput={(params) => (
                                    <TextField 
                                        {...params} 
                                        label="Default Email Account" 
                                        required
                                        error={errors.default_email_account}
                                        helperText={errors.default_email_account ? 'This field is required' : ''}
                                    />
                                )}
                            />
                        </Stack>
                    </Card>
                    <Card sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 3 }}>Automation Configuration</Typography>
                        <Stack spacing={3}>
                            <FormControlLabel 
                                control={<CustomSwitch checked={!!settings.enable_email_automation} onChange={(e) => handleChange('enable_email_automation', e.target.checked ? 1 : 0)} />} 
                                label="Enable Email Automation (Global)" 
                                sx={{ m: 0, '& .MuiFormControlLabel-label': { ml: 1 } }}
                            />
                        </Stack>
                    </Card>
                </Box>

                <Box gridColumn={{ xs: 'span 1', md: 'span 1' }}>
                    <Card sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 3 }}>Campaign Configuration</Typography>
                        <Stack spacing={3}>
                            <TextField 
                                fullWidth 
                                type="number" 
                                label="Max Emails Per Batch" 
                                value={settings.max_emails_per_batch ?? ''}
                                onChange={(e) => handleChange('max_emails_per_batch', Number(e.target.value))}
                            />
                            <TextField 
                                fullWidth 
                                type="number" 
                                label="Batch Delay (seconds)" 
                                value={settings.batch_delay ?? ''}
                                onChange={(e) => handleChange('batch_delay', Number(e.target.value))}
                            />
                            <TextField 
                                fullWidth 
                                type="number" 
                                label="Maximum Retry Count" 
                                value={settings.maximum_retry_count ?? ''}
                                onChange={(e) => handleChange('maximum_retry_count', Number(e.target.value))}
                            />
                            <FormControlLabel 
                                control={<CustomSwitch checked={!!settings.auto_retry_failed_emails} onChange={(e) => handleChange('auto_retry_failed_emails', e.target.checked ? 1 : 0)} />} 
                                label="Auto Retry Failed Emails" 
                                sx={{ m: 0, '& .MuiFormControlLabel-label': { ml: 1 } }}
                            />
                        </Stack>
                    </Card>
                </Box>
            </Box>
        </DashboardContent>
    );
}