import type { EmployeeAwardSettings } from 'src/api/employee-monthly-award';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useEmployeeAwardSettings } from 'src/hooks/useEmployeeMonthlyAward';

import { updateEmployeeAwardSettings } from 'src/api/employee-monthly-award';

import { CustomSwitch } from 'src/sections/reminders/reminders-settings-view';

export function EmployeeAwardSettingsForm() {
    const { settings, loading, refetch } = useEmployeeAwardSettings();

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
    const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

    const [formData, setFormData] = useState<Partial<EmployeeAwardSettings>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (settings) {
            setFormData(settings);
        }
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 1 : 0) : Number(value)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateEmployeeAwardSettings(formData);
            setSnackbar({ open: true, message: 'Settings updated successfully!', severity: 'success' });
            refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Failed to update settings', severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading && !settings) {
        return (
            <Box display="flex" justifyContent="center" p={5}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Card sx={{ p: 4, maxWidth: 1000, mx: 'auto', mt: 2 }}>
            <Typography variant="h6" mb={3}>Award Configuration Settings</Typography>

            <form onSubmit={handleSubmit}>
                <Stack spacing={3}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                        Scoring Weights (%)
                    </Typography>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                            fullWidth
                            label="Attendance Weight"
                            name="attendance_weight"
                            type="number"
                            value={formData.attendance_weight || 0}
                            onChange={handleChange}
                            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                        />
                        <TextField
                            fullWidth
                            label="Personality Weight"
                            name="personality_weight"
                            type="number"
                            value={formData.personality_weight || 0}
                            onChange={handleChange}
                            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                        />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                            fullWidth
                            label="Login Time Weight"
                            name="login_time_weight"
                            type="number"
                            value={formData.login_time_weight || 0}
                            onChange={handleChange}
                            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                        />
                        <TextField
                            fullWidth
                            label="Overtime Weight"
                            name="overtime_weight"
                            type="number"
                            value={formData.overtime_weight || 0}
                            onChange={handleChange}
                            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                        />
                    </Stack>

                    <TextField
                        fullWidth
                        label="Leave Weight"
                        name="leave_penalty_weight"
                        type="number"
                        value={formData.leave_penalty_weight || 0}
                        onChange={handleChange}
                        InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    />

                    <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', mt: 2 }}>
                        Other Parameters
                    </Typography>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                            fullWidth
                            label="Daily Working Hours"
                            name="daily_working_hours"
                            type="number"
                            value={formData.daily_working_hours || 0}
                            onChange={handleChange}
                            InputProps={{ endAdornment: <InputAdornment position="end">hrs</InputAdornment> }}
                        />
                        <TextField
                            fullWidth
                            label="Leave Penalty Per Day"
                            name="leave_penalty_per_day"
                            type="number"
                            value={formData.leave_penalty_per_day || 0}
                            onChange={handleChange}
                            InputProps={{ endAdornment: <InputAdornment position="end">pts</InputAdornment> }}
                        />
                    </Stack>

                    <TextField
                        fullWidth
                        label="Display Days on Dashboard"
                        name="display_days"
                        type="number"
                        value={formData.display_days || 0}
                        onChange={handleChange}
                        helperText="Number of days in the month to display the award on the dashboard"
                        InputProps={{ endAdornment: <InputAdornment position="end">days</InputAdornment> }}
                    />

                    <FormControlLabel
                        control={
                            <CustomSwitch
                                checked={!!formData.auto_publish}
                                onChange={handleChange}
                                name="auto_publish"
                            />
                        }
                        label="Auto Publish Awards"
                        sx={{ m: 0, '& .MuiFormControlLabel-label': { ml: 1.25, typography: 'subtitle2', fontWeight: 700 } }}
                    />

                    <Box display="flex" justifyContent="flex-end" pt={2}>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={saving}
                            startIcon={saving && <CircularProgress size={20} color="inherit" />}
                            sx={{ 
                                bgcolor: '#00A5D1', 
                                '&:hover': { bgcolor: '#0084a7' },
                                px: 4
                            }}
                        >
                            {saving ? 'Saving Settings...' : 'Save Settings'}
                        </Button>
                    </Box>
                </Stack>
            </form>

            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={6000} 
                onClose={handleCloseSnackbar} 
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                sx={{ top: { xs: 80, sm: 80 } }}
            >
                <Alert 
                    onClose={handleCloseSnackbar} 
                    severity={snackbar.severity as any} 
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Card>
    );
}
