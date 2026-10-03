import { useState, useEffect, useCallback } from 'react';
import { IoMdArrowBack } from 'react-icons/io';
import { RiCheckboxCircleLine } from 'react-icons/ri';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';
import { DashboardContent } from 'src/layouts/dashboard';
import { useSettingsContext } from 'src/hooks/settings-context';
import { updateHRMSSettings } from 'src/api/settings';
import { useAuth } from 'src/auth/auth-context';
import { SettingsSalarySlip } from 'src/sections/settings/settings-salary-slip';

// ----------------------------------------------------------------------

export function SalarySlipSettingsView() {
  const router = useRouter();
  const { settings, refetch, loading: settingsLoading } = useSettingsContext();
  const [formData, setFormData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { user } = useAuth();
  const isAuthorized = (user?.roles || []).some((role: string) =>
    ['HR', 'Administrator', 'System Manager'].includes(role)
  );

  useEffect(() => {
    if (settings && (!formData || formData.modified !== settings.modified)) {
      setFormData(settings);
    }
  }, [settings, formData]);

  const handleUpdateField = useCallback((fieldname: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [fieldname]: value }));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateHRMSSettings(formData);
      setSnackbar({ open: true, message: 'Salary Slip Settings updated successfully', severity: 'success' });
      const freshSettings = await refetch();
      if (freshSettings) {
        setFormData(freshSettings);
      }
    } catch (error: any) {
      console.error('Failed to update salary slip settings:', error);
      setSnackbar({ open: true, message: error.message || 'Failed to update settings', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  if (settingsLoading && !formData) {
    return (
      <DashboardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </DashboardContent>
    );
  }

  if (!isAuthorized) {
    return (
      <DashboardContent sx={{ textAlign: 'center', py: 20 }}>
        <Typography variant="h3" sx={{ mb: 2 }}>Permission Denied</Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          You do not have the required permissions to access Salary Slip Settings.
        </Typography>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth={false} sx={{ px: { xs: 2, md: 3, lg: 5 }, pb: 5, mt: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="body1" sx={{ fontSize: '22px', fontWeight: 700 }}>
            Salary Slip Settings
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Configure working days basis, calculation sources, PT rules, and overtime formulas.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<IoMdArrowBack size={18} />}
            onClick={() => router.push('/salary-slips')}
            sx={{
              borderRadius: 1,
              fontWeight: 600,
              textTransform: 'none',
              px: 2,
              height: 40,
            }}
          >
            Go Back
          </Button>

          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <RiCheckboxCircleLine size={20} />}
            onClick={handleSave}
            disabled={saving}
            sx={{
              bgcolor: '#059669',
              '&:hover': { bgcolor: '#047857' },
              borderRadius: 1,
              textTransform: 'none',
              fontWeight: 600,
              height: 40,
              px: 2.5,
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ width: 1 }}>
        {formData && (
          <SettingsSalarySlip
            data={formData}
            onChange={handleUpdateField}
          />
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}
