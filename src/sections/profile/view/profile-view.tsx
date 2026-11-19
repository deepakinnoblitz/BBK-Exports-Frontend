import { LuShieldCheck } from 'react-icons/lu';
import { useBoolean } from 'minimal-shared/hooks';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { alpha } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';

import { frappeRequest } from 'src/utils/csrf';
import { stringToColor, stringToDarkColor } from 'src/utils/color-utils';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

// ----------------------------------------------------------------------

export const validateRequired = (value: unknown, fieldLabel: string = 'This field'): string => {
    if (value === null || value === undefined) {
        return `${fieldLabel} is required`;
    }
    if (typeof value === 'string' && !value.trim()) {
        return `${fieldLabel} is required`;
    }
    return '';
};

export const renderRequiredLabel = (label: string, required: boolean = true) => (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
        {label}
        {required && (
            <Box component="span" sx={{ color: 'error.main', ml: 0.5, fontWeight: 700 }}>
                *
            </Box>
        )}
    </Box>
);

export const getRequiredFieldProps = (label: string, error?: string) => ({
    required: true,
    label,
    error: Boolean(error),
    helperText: error || '',
    InputLabelProps: { shrink: true },
    sx: {
        '& .MuiFormLabel-asterisk': {
            color: 'error.main',
        },
    },
});

const PASSWORD_RULES = [
    { id: 'length', label: 'At least 8 characters', test: (pwd: string) => pwd.length >= 8 },
    { id: 'uppercase', label: 'At least 1 uppercase letter (A-Z)', test: (pwd: string) => /[A-Z]/.test(pwd) },
    { id: 'lowercase', label: 'At least 1 lowercase letter (a-z)', test: (pwd: string) => /[a-z]/.test(pwd) },
    { id: 'number', label: 'At least 1 number (0-9)', test: (pwd: string) => /[0-9]/.test(pwd) },
    { id: 'special', label: 'At least 1 special character (!@#$%^&*)', test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
];

export function ProfileView() {
    const { user, setUser } = useAuth();

    // Snackbar state
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const handleCloseSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    // Dialog state
    const changePassword = useBoolean();

    // Form state
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [passwordErrors, setPasswordErrors] = useState<{
        oldPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
    }>({});

    // Password criteria verification
    const passwordCriteriaStatus = useMemo(
        () => PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(newPassword) })),
        [newPassword]
    );

    const passedCount = useMemo(
        () => passwordCriteriaStatus.filter((c) => c.passed).length,
        [passwordCriteriaStatus]
    );

    const strengthLevel = useMemo(() => {
        if (!newPassword) return { label: 'None', color: '#94a3b8', percent: 0 };
        if (passedCount <= 2) return { label: 'Weak', color: '#ef4444', percent: 25 };
        if (passedCount <= 3) return { label: 'Fair', color: '#f59e0b', percent: 50 };
        if (passedCount <= 4) return { label: 'Good', color: '#3b82f6', percent: 75 };
        return { label: 'Strong', color: '#10b981', percent: 100 };
    }, [newPassword, passedCount]);

    // Password visibility state
    const showOldPassword = useBoolean();
    const showNewPassword = useBoolean();
    const showConfirmPassword = useBoolean();

    const handleClosePasswordDialog = () => {
        changePassword.onFalse();
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordErrors({});
    };

    // Handler for password change
    const handleChangePassword = async () => {
        const errors: { oldPassword?: string; newPassword?: string; confirmPassword?: string } = {};

        if (!oldPassword.trim()) {
            errors.oldPassword = 'Current password is required';
        }

        if (!newPassword) {
            errors.newPassword = 'New password is required';
        } else if (passedCount < 5) {
            errors.newPassword = 'Please satisfy all password strength requirements below';
        }

        if (!confirmPassword) {
            errors.confirmPassword = 'Confirm password is required';
        } else if (newPassword !== confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }

        if (Object.keys(errors).length > 0) {
            setPasswordErrors(errors);
            const firstMsg = errors.oldPassword || errors.newPassword || errors.confirmPassword;
            setSnackbar({ open: true, message: firstMsg || 'Please fill in all required fields', severity: 'error' });
            return;
        }

        setPasswordErrors({});

        try {
            const response = await frappeRequest('/api/method/company.company.frontend_api.update_my_password', {
                method: 'POST',
                body: JSON.stringify({
                    old_password: oldPassword,
                    new_password: newPassword
                })
            });

            const data = await response.json();

            if (data.message && data.message.status === 'success') {
                setSnackbar({ open: true, message: 'Password updated successfully', severity: 'success' });
                changePassword.onFalse();
                // Reset form
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setPasswordErrors({});
            } else {
                let msg = 'Failed to update password';

                if (data.exception) {
                    if (data.exception.includes('Incorrect old password')) {
                        setPasswordErrors((prev) => ({ ...prev, oldPassword: 'Incorrect old password' }));
                        msg = 'Incorrect old password';
                    } else {
                        const parts = data.exception.split(':');
                        msg = parts.length > 1 ? parts.slice(1).join(':').trim() : data.exception;
                    }
                } else if (data._server_messages) {
                    try {
                        const messages = JSON.parse(data._server_messages);
                        if (Array.isArray(messages) && messages.length > 0) {
                            const firstMsg = JSON.parse(messages[0]);
                            // Strip HTML tags if present
                            msg = firstMsg.message.replace(/<[^>]*>?/gm, '');
                        }
                    } catch {
                        // Fallback
                    }
                } else if (data.message) {
                    // Check if the generic message is actually a structured error object
                    if (typeof data.message === 'object' && data.message.status === 'failed') {
                        msg = data.message.message;
                    } else {
                        msg = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
                    }
                }

                setSnackbar({ open: true, message: msg, severity: 'error' });
            }
        } catch (error: any) {
            console.error(error);
            const msg = error.message || 'An error occurred';
            setSnackbar({ open: true, message: msg, severity: 'error' });
        }
    };

    // Profile Edit State
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const [firstNameError, setFirstNameError] = useState('');

    useEffect(() => {
        if (user) {
            setFirstName(user.first_name || '');
            setMiddleName(user.middle_name || '');
            setLastName(user.last_name || '');
            setFirstNameError('');
        }
    }, [user]);

    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

    const handleSaveProfile = async () => {
        const requiredError = validateRequired(firstName, 'First Name');
        if (requiredError) {
            setFirstNameError(requiredError);
            setSnackbar({ open: true, message: requiredError, severity: 'error' });
            return;
        }

        try {
            const response = await frappeRequest('/api/method/company.company.frontend_api.update_profile_info', {
                method: 'POST',
                body: JSON.stringify({
                    first_name: firstName.trim(),
                    middle_name: middleName.trim(),
                    last_name: lastName.trim()
                })
            });

            const data = await response.json();

            if (data.message && data.message.status === 'success') {
                setSnackbar({ open: true, message: 'Profile updated successfully', severity: 'success' });
                // Update global user context so sidebar/header reflect changes immediately
                if (user) {
                    setUser({
                        ...user,
                        first_name: firstName.trim(),
                        middle_name: middleName.trim(),
                        last_name: lastName.trim(),
                        full_name: fullName
                    });
                }
            } else {
                const msg = data.message?.message || data.message || 'Failed to update profile';
                setSnackbar({ open: true, message: msg, severity: 'error' });
                if (String(msg).toLowerCase().includes('first name')) {
                    setFirstNameError(msg);
                }
            }
        } catch (error: any) {
            console.error(error);
            const msg = error.message || 'An error occurred while saving profile';
            setSnackbar({ open: true, message: msg, severity: 'error' });
        }
    };

    if (!user) {
        return null;
    }

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Container maxWidth="lg">
                <Stack spacing={4} sx={{ maxWidth: 1200, mx: 'auto' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: { xs: 2, md: 0 } }}>
                        <Typography variant="h4" sx={{ fontWeight: 800 }}>
                            Profile
                        </Typography>
                    </Stack>

                    <Card>
                        <CardContent>
                            <Stack
                                direction={{ xs: 'column', md: 'row' }}
                                alignItems={{ xs: 'center', md: 'center' }}
                                sx={{ mb: 3, p: { xs: 2, md: 2 }, width: '100%' }}
                                spacing={3}
                            >
                                <Stack
                                    direction={{ xs: 'column', md: 'row' }}
                                    spacing={3}
                                    alignItems="center"
                                    sx={{ textAlign: { xs: 'center', md: 'left' }, width: { xs: '100%', md: 'auto' } }}
                                >
                                    <Avatar
                                        alt={user.full_name}
                                        src={user.user_image}
                                        sx={{
                                            width: { xs: 80, md: 100 },
                                            height: { xs: 80, md: 100 },
                                            border: (theme) => `solid 4px ${theme.palette.background.paper}`,
                                            boxShadow: (theme) => theme.customShadows.z12,
                                            bgcolor: (theme) => {
                                                if (user.user_image) return 'transparent';
                                                return stringToColor(user.full_name || '');
                                            }
                                        }}
                                    >
                                        {!user.user_image && (
                                            <Typography sx={{
                                                fontSize: { xs: 20, md: 28 },
                                                fontWeight: 800,
                                                color: (theme) => stringToDarkColor(user.full_name || '')
                                            }}>
                                                {(user.full_name || '?').charAt(0).toUpperCase()}
                                            </Typography>
                                        )}
                                    </Avatar>

                                    <Stack spacing={0.5} alignItems={{ xs: 'center', md: 'flex-start' }}>
                                        <Typography variant="h4" sx={{ fontWeight: 800 }}>
                                            {user.full_name}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: { xs: 'center', md: 'flex-start' } }}>
                                            <Iconify icon="solar:letter-bold" width={16} />
                                            {user.email}
                                        </Typography>
                                        {user.employee && (
                                            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                                                ID: {user.employee}
                                            </Typography>
                                        )}
                                    </Stack>
                                </Stack>

                                <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'block' } }} />

                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={2}
                                    sx={{ width: { xs: '100%', md: 'auto' }, mt: { xs: 1, md: 0 } }}
                                >
                                    <Button
                                        variant="outlined"
                                        color="inherit"
                                        fullWidth={{ xs: true, md: false } as any}
                                        onClick={changePassword.onTrue}
                                        startIcon={<LuShieldCheck size={20} />}
                                        sx={{
                                            borderRadius: 1,
                                            textTransform: 'none',
                                            fontWeight: 600,
                                        }}
                                    >
                                        Change Password
                                    </Button>
                                    <Button
                                        variant="contained"
                                        fullWidth={{ xs: true, md: false } as any}
                                        onClick={handleSaveProfile}
                                        sx={{
                                            bgcolor: '#059669',
                                            '&:hover': { bgcolor: '#047857' },
                                            borderRadius: 1,
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            px: 3
                                        }}
                                    >
                                        Save Changes
                                    </Button>
                                </Stack>
                            </Stack>

                            <CardHeader
                                title="Basic Info"
                                subheader="Review your personal details"
                                sx={{ mb: 3, px: { xs: 3, md: 3 } }}
                            />

                            <Grid container spacing={3} sx={{ px: { xs: 2, md: 3 }, mb: 4 }}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        fullWidth
                                        {...getRequiredFieldProps('First Name', firstNameError)}
                                        value={firstName}
                                        onChange={(e) => {
                                            setFirstName(e.target.value);
                                            setFirstNameError(validateRequired(e.target.value, 'First Name'));
                                        }}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="Middle Name"
                                        value={middleName}
                                        onChange={(e) => setMiddleName(e.target.value)}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="Last Name"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        fullWidth
                                        disabled
                                        label="Full Name"
                                        value={fullName}
                                        placeholder="Full name will be generated"
                                        helperText="Auto-generated from First, Middle, and Last name"
                                        sx={{
                                            bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
                                            borderRadius: 1,
                                            cursor: 'default',
                                            '& *': {
                                                cursor: 'default !important',
                                            },
                                            '& .MuiInputBase-input.Mui-disabled': {
                                                WebkitTextFillColor: (theme) => theme.palette.text.primary,
                                                cursor: 'default !important',
                                            },
                                            '& .MuiInputLabel-root.Mui-disabled': {
                                                color: (theme) => theme.palette.text.secondary,
                                                cursor: 'default !important',
                                            },
                                        }}
                                    />
                                </Grid>

                                {/* <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="Username"
                                        value={user.username || ''}
                                        InputProps={{ readOnly: true }}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="Email"
                                        value={user.email || ''}
                                        InputProps={{ readOnly: true }}
                                    />
                                </Grid> */}
                            </Grid>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader title="Access & Permissions" subheader="Roles and allowed modules" />
                        <CardContent sx={{ pt: 3, pl: 3 }}>
                            <Grid container spacing={4}>
                                <Grid size={{ xs: 12 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                                        Roles
                                    </Typography>
                                    <Stack direction="row" flexWrap="wrap" gap={1}>
                                        {user.roles.map((role) => (
                                            <Chip
                                                key={role}
                                                label={role}
                                                color="primary"
                                                sx={{ fontWeight: 600 }}
                                            />
                                        ))}
                                    </Stack>
                                </Grid>

                                {/* <Grid size={{ xs: 12 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                                        Allowed Modules
                                    </Typography>
                                    <Stack direction="row" flexWrap="wrap" gap={1}>
                                        {user.allowed_modules.length > 0 ? (
                                            user.allowed_modules.map((module) => (
                                                <Chip key={module} label={module} size="small" color="primary" variant="filled" />
                                            ))
                                        ) : (
                                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>No extra modules allowed</Typography>
                                        )}
                                    </Stack>
                                </Grid> */}
                            </Grid>
                        </CardContent>
                    </Card>
                </Stack>
            </Container>

            <Dialog open={changePassword.value} onClose={handleClosePasswordDialog} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ mt: 1 }}>Change Password</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            {...getRequiredFieldProps('Current Password', passwordErrors.oldPassword)}
                            type={showOldPassword.value ? 'text' : 'password'}
                            value={oldPassword}
                            onChange={(e) => {
                                setOldPassword(e.target.value);
                                if (passwordErrors.oldPassword) {
                                    setPasswordErrors((prev) => ({ ...prev, oldPassword: '' }));
                                }
                            }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={showOldPassword.onToggle} edge="end">
                                            <Iconify icon={showOldPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <TextField
                            fullWidth
                            {...getRequiredFieldProps('New Password', passwordErrors.newPassword)}
                            type={showNewPassword.value ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => {
                                setNewPassword(e.target.value);
                                if (passwordErrors.newPassword) {
                                    setPasswordErrors((prev) => ({ ...prev, newPassword: '' }));
                                }
                            }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={showNewPassword.onToggle} edge="end">
                                            <Iconify icon={showNewPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <TextField
                            fullWidth
                            {...getRequiredFieldProps(
                                'Confirm New Password',
                                passwordErrors.confirmPassword ||
                                    (confirmPassword && newPassword && confirmPassword !== newPassword
                                        ? 'Passwords do not match'
                                        : '')
                            )}
                            type={showConfirmPassword.value ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                if (passwordErrors.confirmPassword) {
                                    setPasswordErrors((prev) => ({ ...prev, confirmPassword: '' }));
                                }
                            }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={showConfirmPassword.onToggle} edge="end">
                                            <Iconify icon={showConfirmPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {/* Password Strength Indicator */}
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 1.5,
                                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.05),
                                border: (theme) => `1px solid ${theme.palette.divider}`,
                            }}
                        >
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Password Strength
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontWeight: 800,
                                        color: strengthLevel.color,
                                        px: 1,
                                        py: 0.25,
                                        borderRadius: 0.5,
                                        bgcolor: alpha(strengthLevel.color, 0.12),
                                    }}
                                >
                                    {strengthLevel.label}
                                </Typography>
                            </Stack>

                            <LinearProgress
                                variant="determinate"
                                value={strengthLevel.percent}
                                sx={{
                                    height: 6,
                                    borderRadius: 1,
                                    bgcolor: (theme) => alpha(theme.palette.grey[500], 0.16),
                                    '& .MuiLinearProgress-bar': {
                                        bgcolor: strengthLevel.color,
                                        borderRadius: 1,
                                    },
                                    mb: 2,
                                }}
                            />

                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1 }}>
                                Password Requirements:
                            </Typography>

                            <Stack spacing={0.75}>
                                {passwordCriteriaStatus.map((criterion) => (
                                    <Stack key={criterion.id} direction="row" alignItems="center" spacing={1}>
                                        <Iconify
                                            icon={criterion.passed ? 'solar:check-circle-bold' : 'solar:close-circle-bold'}
                                            width={16}
                                            sx={{
                                                color: criterion.passed ? '#10b981' : '#94a3b8',
                                                flexShrink: 0,
                                                transition: 'color 0.2s ease',
                                            }}
                                        />
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: criterion.passed ? 'text.primary' : 'text.secondary',
                                                fontWeight: criterion.passed ? 600 : 400,
                                                transition: 'color 0.2s ease',
                                            }}
                                        >
                                            {criterion.label}
                                        </Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button
                        onClick={handleClosePasswordDialog}
                        variant="outlined"
                        color="inherit"
                        sx={{
                            borderRadius: 1,
                            textTransform: 'none',
                            fontWeight: 600,
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleChangePassword}
                        variant="contained"
                        sx={{
                            bgcolor: '#059669',
                            '&:hover': { bgcolor: '#047857' },
                            borderRadius: 1,
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 3
                        }}
                    >
                        Update Password
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                sx={{ zIndex: 999999 }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </DashboardContent>
    );
}
