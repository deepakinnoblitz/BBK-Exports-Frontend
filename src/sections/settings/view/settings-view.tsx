import { PiMoneyWavy } from "react-icons/pi";
import { useState, useEffect, useCallback } from 'react';
import { RiKey2Line, RiImageLine, RiGlobalLine, RiDashboardLine, RiNotification3Line, RiLayoutMasonryLine, RiMoneyDollarBoxLine, RiCheckboxCircleLine, RiMailLine } from "react-icons/ri";

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useSettingsContext } from 'src/hooks/settings-context';

import { updateHRMSSettings } from 'src/api/settings';
import { DashboardContent } from 'src/layouts/dashboard';
import { getCompanyEmailSettings, updateCompanyEmailSettings, createCompanyEmailSettings } from 'src/api/company-email-settings';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

import { SettingsLogo } from '../settings-logo';
import { SettingsLiveKit } from '../settings-livekit';
import { SettingsSidebar } from '../settings-sidebar';
import { SettingsCurrency } from '../settings-currency';
import { SettingsDashboard } from '../settings-dashboard';
import { SettingsSalarySlip } from '../settings-salary-slip';
import { SettingsCompanyEmail } from '../settings-company-email';
import { SettingsNotifications } from '../settings-notifications';

// ----------------------------------------------------------------------

const TABS = [
  { value: 'logo', label: 'Logo', icon: <RiImageLine size={22} /> },
  // { value: 'sidebar', label: 'Sidebar', icon: <RiLayoutMasonryLine size={22} /> },
  // { value: 'dashboard', label: 'Dashboard', icon: <RiDashboardLine size={22} /> },
  { value: 'currency', label: 'Currency & Locale', icon: <RiGlobalLine size={22} /> },
  { value: 'notifications', label: 'Notifications', icon: <RiNotification3Line size={22} /> },
  { value: 'salary', label: 'Salary Slip', icon: <PiMoneyWavy size={22} /> },
  { value: 'email', label: 'Email', icon: <RiMailLine size={22} /> },
  { value: 'api', label: 'API', icon: <RiKey2Line size={22} /> },
];

export function SettingsView() {
  const [currentTab, setCurrentTab] = useState('logo');
  const { settings, refetch, loading: settingsLoading } = useSettingsContext();
  const [formData, setFormData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [emailSettings, setEmailSettings] = useState<any>({
    hr_email: '',
    hr_name: '',
    hr_cc_emails: '',
  });
  const [emailSettingsName, setEmailSettingsName] = useState<string | null>(null);

  const { user } = useAuth();
  const isAuthorized = (user?.roles || []).some((role: string) =>
    ['HR', 'Administrator', 'System Manager'].includes(role)
  );

  useEffect(() => {
    if (settings && (!formData || formData.modified !== settings.modified)) {
      setFormData(settings);
    }
  }, [settings, formData]);

  useEffect(() => {
    const fetchEmailSettings = async () => {
      const data = await getCompanyEmailSettings();
      if (data) {
        setEmailSettingsName(data.name);
        setEmailSettings({
          hr_email: data.hr_email || '',
          hr_name: data.hr_name || '',
          hr_cc_emails: data.hr_cc_emails || '',
        });
      }
    };
    fetchEmailSettings();
  }, []);

  const handleChangeTab = useCallback((event: React.SyntheticEvent, newValue: string) => {
    setCurrentTab(newValue);
  }, []);

  const handleUpdateField = useCallback((fieldname: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [fieldname]: value }));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      if (currentTab === 'email') {
        if (emailSettingsName) {
          await updateCompanyEmailSettings(emailSettingsName, emailSettings);
        } else {
          const newDoc = await createCompanyEmailSettings(emailSettings);
          setEmailSettingsName(newDoc.name);
        }
      } else {
        await updateHRMSSettings(formData);
      }
      setSnackbar({ open: true, message: 'Settings updated successfully', severity: 'success' });
      const freshSettings = await refetch();
      if (freshSettings) {
        setFormData(freshSettings);
      }
    } catch (error: any) {
      console.error('Failed to update settings:', error);
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
          You do not have the required permissions to access the HRMS Settings.
        </Typography>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth={false} sx={{ px: { xs: 2, md: 3, lg: 5 }, pb: 5, mt: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
        <Typography variant="body1" sx={{fontSize:'22px', fontWeight: 700}}>HRMS Settings</Typography>

        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <RiCheckboxCircleLine size={20} />}
          onClick={handleSave}
          disabled={saving}
          sx={{
            bgcolor: '#08a3cd',
            '&:hover': { bgcolor: '#068fb3' },
            borderRadius: 1,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Stack>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          width: 1,
          mb: { xs: 3, md: 5 },
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Tabs
          value={currentTab}
          onChange={handleChangeTab}
          sx={{
            minHeight: 40,
            '& .MuiTabs-indicator': {
              height: 2,
            },
          }}
        >
          {TABS.map((tab) => (
            <Tab
              key={tab.value}
              label={tab.label}
              icon={tab.icon}
              value={tab.value}
              iconPosition="start"
              sx={{
                minWidth: 'auto',
                px: 3,
                minHeight: 40,
                fontSize: 14,
                textTransform: 'none',
                fontWeight: 'fontWeightMedium',
                alignItems: 'center',
                justifyContent: 'flex-start',
                '&.Mui-selected': {
                  color: 'primary.main',
                  fontWeight: 'fontWeightBold',
                },
              }}
            />
          ))}
        </Tabs>
      </Stack>

      <Box sx={{ width: 1 }}>
        {currentTab === 'logo' && (
          <SettingsLogo
            value={formData?.app_logo}
            onUpload={(url) => handleUpdateField('app_logo', url)}
          />
        )}

        {/* {currentTab === 'sidebar' && (
          <SettingsSidebar
            data={formData}
            onChange={handleUpdateField}
          />
        )} */}

        {/* {currentTab === 'dashboard' && (
          <SettingsDashboard
            data={formData}
            onChange={handleUpdateField}
          />
        )} */}

        {currentTab === 'currency' && (
          <SettingsCurrency
            data={formData}
            onChange={handleUpdateField}
          />
        )}

        {currentTab === 'notifications' && (
          <SettingsNotifications
            data={formData}
            onChange={handleUpdateField}
          />
        )}

        {currentTab === 'salary' && (
          <SettingsSalarySlip
            data={formData}
            onChange={handleUpdateField}
          />
        )}


        {currentTab === 'api' && (
          <SettingsLiveKit
            data={formData}
            onChange={handleUpdateField}
          />
        )}

        {currentTab === 'email' && (
          <SettingsCompanyEmail
            data={emailSettings}
            onChange={(fieldname: string, value: any) => setEmailSettings((prev: any) => ({ ...prev, [fieldname]: value }))}
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
