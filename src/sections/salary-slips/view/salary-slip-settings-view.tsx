import { IoMdArrowBack } from 'react-icons/io';
import { RiCheckboxCircleLine } from 'react-icons/ri';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { useSettingsContext } from 'src/hooks/settings-context';

import { updateHRMSSettings } from 'src/api/settings';
import { DashboardContent } from 'src/layouts/dashboard';

import { SettingsSalarySlip } from 'src/sections/settings/settings-salary-slip';

import { useAuth } from 'src/auth/auth-context';

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

  const OT_RULES_STORAGE_KEY = 'salary_slip_ot_rules_enabled';
  const EMPLOYER_STATUTORY_STORAGE_KEY = 'salary_slip_employer_statutory_rules_enabled';

  const getStoredOtRules = () => {
    try {
      const saved = localStorage.getItem(OT_RULES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const getStoredEmployerStatutoryRules = () => {
    try {
      const saved = localStorage.getItem(EMPLOYER_STATUTORY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  useEffect(() => {
    if (settings && (!formData || formData.modified !== settings.modified)) {
      const stored = getStoredOtRules();
      const storedStatutory = getStoredEmployerStatutoryRules();
      setFormData({
        ...settings,
        workers_enable_overtime: settings.workers_enable_overtime ?? stored.workers ?? 1,
        drivers_enable_overtime: settings.drivers_enable_overtime ?? stored.drivers ?? 1,
        north_indian_enable_overtime: settings.north_indian_enable_overtime ?? stored.north_indian ?? 1,
        staff_ctc_enable_employer_statutory: settings.staff_ctc_enable_employer_statutory ?? storedStatutory.staff_ctc ?? 1,
        staff_non_ctc_enable_employer_statutory: settings.staff_non_ctc_enable_employer_statutory ?? storedStatutory.staff_non_ctc ?? 1,
        workers_enable_employer_statutory: settings.workers_enable_employer_statutory ?? storedStatutory.workers ?? 1,
        drivers_enable_employer_statutory: settings.drivers_enable_employer_statutory ?? storedStatutory.drivers ?? 1,
        north_indian_enable_employer_statutory: settings.north_indian_enable_employer_statutory ?? storedStatutory.north_indian ?? 1,
        enable_employer_statutory: settings.enable_employer_statutory ?? storedStatutory.general ?? 1,
      });
    }
  }, [settings, formData]);

  const handleUpdateField = useCallback((fieldname: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [fieldname]: value }));
    if (fieldname === 'workers_enable_overtime') {
      const stored = getStoredOtRules();
      localStorage.setItem(OT_RULES_STORAGE_KEY, JSON.stringify({ ...stored, workers: value }));
    } else if (fieldname === 'drivers_enable_overtime') {
      const stored = getStoredOtRules();
      localStorage.setItem(OT_RULES_STORAGE_KEY, JSON.stringify({ ...stored, drivers: value }));
    } else if (fieldname === 'north_indian_enable_overtime') {
      const stored = getStoredOtRules();
      localStorage.setItem(OT_RULES_STORAGE_KEY, JSON.stringify({ ...stored, north_indian: value }));
    } else if (fieldname === 'staff_ctc_enable_employer_statutory') {
      const stored = getStoredEmployerStatutoryRules();
      localStorage.setItem(EMPLOYER_STATUTORY_STORAGE_KEY, JSON.stringify({ ...stored, staff_ctc: value }));
    } else if (fieldname === 'staff_non_ctc_enable_employer_statutory') {
      const stored = getStoredEmployerStatutoryRules();
      localStorage.setItem(EMPLOYER_STATUTORY_STORAGE_KEY, JSON.stringify({ ...stored, staff_non_ctc: value }));
    } else if (fieldname === 'workers_enable_employer_statutory') {
      const stored = getStoredEmployerStatutoryRules();
      localStorage.setItem(EMPLOYER_STATUTORY_STORAGE_KEY, JSON.stringify({ ...stored, workers: value }));
    } else if (fieldname === 'drivers_enable_employer_statutory') {
      const stored = getStoredEmployerStatutoryRules();
      localStorage.setItem(EMPLOYER_STATUTORY_STORAGE_KEY, JSON.stringify({ ...stored, drivers: value }));
    } else if (fieldname === 'north_indian_enable_employer_statutory') {
      const stored = getStoredEmployerStatutoryRules();
      localStorage.setItem(EMPLOYER_STATUTORY_STORAGE_KEY, JSON.stringify({ ...stored, north_indian: value }));
    } else if (fieldname === 'enable_employer_statutory') {
      const stored = getStoredEmployerStatutoryRules();
      localStorage.setItem(EMPLOYER_STATUTORY_STORAGE_KEY, JSON.stringify({ ...stored, general: value }));
    }
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateHRMSSettings(formData);
      setSnackbar({ open: true, message: 'Salary Slip Settings updated successfully', severity: 'success' });
      const freshSettings = await refetch();
      if (freshSettings) {
        const stored = getStoredOtRules();
        const storedStatutory = getStoredEmployerStatutoryRules();
        setFormData({
          ...freshSettings,
          workers_enable_overtime: formData?.workers_enable_overtime ?? stored.workers ?? 1,
          drivers_enable_overtime: formData?.drivers_enable_overtime ?? stored.drivers ?? 1,
          north_indian_enable_overtime: formData?.north_indian_enable_overtime ?? stored.north_indian ?? 1,
          staff_ctc_enable_employer_statutory: formData?.staff_ctc_enable_employer_statutory ?? storedStatutory.staff_ctc ?? 1,
          staff_non_ctc_enable_employer_statutory: formData?.staff_non_ctc_enable_employer_statutory ?? storedStatutory.staff_non_ctc ?? 1,
          workers_enable_employer_statutory: formData?.workers_enable_employer_statutory ?? storedStatutory.workers ?? 1,
          drivers_enable_employer_statutory: formData?.drivers_enable_employer_statutory ?? storedStatutory.drivers ?? 1,
          north_indian_enable_employer_statutory: formData?.north_indian_enable_employer_statutory ?? storedStatutory.north_indian ?? 1,
          enable_employer_statutory: formData?.enable_employer_statutory ?? storedStatutory.general ?? 1,
        });
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

  if (settingsLoading || !formData) {
    return (
      <DashboardContent maxWidth={false}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '70vh',
            width: '100%',
          }}
        >
          <CircularProgress />
        </Box>
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
              borderRadius: 1.5,
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
              borderRadius: 1.5,
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
