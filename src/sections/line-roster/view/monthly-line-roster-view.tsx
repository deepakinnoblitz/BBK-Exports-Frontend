import { useSearchParams } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { COMMON_COLORS } from 'src/theme';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

import { LineRosterMonthlyView } from './line-roster-monthly-view';
import { LineRosterCalendarView } from './line-roster-calendar-view';

// ----------------------------------------------------------------------

export function MonthlyLineRosterView() {
  const { user } = useAuth();
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  const isHR = user?.roles?.some((role: string) =>
    ['HR Manager', 'HR', 'System Manager', 'Administrator'].includes(role)
  );
  const isRestrictedEmployee = user?.roles?.includes('Employee') && !isHR;

  const currentEmployee = useMemo(() => {
    if (isRestrictedEmployee && user?.employee) {
      return { name: user.employee, employee_name: user.employee_name || user.employee };
    }
    return null;
  }, [isRestrictedEmployee, user?.employee, user?.employee_name]);

  const [selectedEmployees, setSelectedEmployees] = useState<any[]>(
    currentEmployee ? [currentEmployee] : []
  );

  useEffect(() => {
    if (currentEmployee) {
      setSelectedEmployees([currentEmployee]);
    }
  }, [currentEmployee]);

  const urlView = searchParams.get('view');
  const [currentView, setCurrentView] = useState<'monthly' | 'calendar'>(
    urlView === 'calendar' ? 'calendar' : 'monthly'
  );

  const isSingleEmployee = selectedEmployees.length === 1;

  useEffect(() => {
    if (!isSingleEmployee && currentView === 'calendar') {
      setCurrentView('monthly');
      setSearchParams({});
    }
  }, [isSingleEmployee, currentView, setSearchParams]);

  // Snackbar State
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleViewChange = (newView: string) => {
    setCurrentView(newView as any);
    setSearchParams(newView === 'calendar' ? { view: 'calendar' } : {});
  };

  return (
    <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
      {/* Page Title & Main Actions */}
      <Stack spacing={3} sx={{ pb: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
        >
          <div>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Monthly Line Roster
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Monthly visual roster matrix and workforce line assignment schedule board.
            </Typography>
          </div>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<Iconify icon={"solar:refresh-bold" as any} />}
              onClick={() => {
                setRefreshTrigger((prev) => prev + 1);
                setSnackbar({ open: true, message: 'Monthly Line Roster refreshed', severity: 'info' });
              }}
            >
              Refresh
            </Button>
          </Stack>
        </Stack>

        {/* View Switcher Pill */}
        {isSingleEmployee && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Box
              sx={{
                display: 'inline-flex',
                bgcolor: alpha(theme.palette.grey[500], 0.06),
                p: 0.5,
                borderRadius: '24px',
                border: `1px solid ${alpha(theme.palette.grey[500], 0.08)}`,
              }}
            >
              {[
                { value: 'monthly', label: 'Monthly Roster View', icon: 'material-symbols:grid-on' },
                { value: 'calendar', label: 'Calendar View', icon: 'solar:calendar-bold' },
              ].map((tab) => {
                const isActive = currentView === tab.value;
                return (
                  <Button
                    key={tab.value}
                    onClick={() => handleViewChange(tab.value)}
                    startIcon={<Iconify icon={tab.icon as any} width={16} />}
                    sx={{
                      borderRadius: '20px',
                      px: 3,
                      py: 0.75,
                      fontSize: '0.825rem',
                      fontWeight: isActive ? 700 : 600,
                      color: isActive ? '#fff' : theme.palette.text.secondary,
                      bgcolor: isActive ? COMMON_COLORS.emerald.main : 'transparent',
                      boxShadow: isActive ? `0 2px 8px ${alpha(COMMON_COLORS.emerald.main, 0.3)}` : 'none',
                      textTransform: 'capitalize',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        bgcolor: isActive ? COMMON_COLORS.emerald.dark : alpha(theme.palette.grey[500], 0.08),
                      },
                    }}
                  >
                    {tab.label}
                  </Button>
                );
              })}
            </Box>
          </Box>
        )}

        {/* View Component Rendering */}
        {currentView === 'monthly' && (
          <LineRosterMonthlyView
            canEdit={false}
            selectedEmployees={currentEmployee ? [currentEmployee] : selectedEmployees}
            onSelectEmployees={isRestrictedEmployee ? undefined : setSelectedEmployees}
            filterVariant="quick-range"
            refreshTrigger={refreshTrigger}
            isHR={isHR}
          />
        )}

        {currentView === 'calendar' && (
          <LineRosterCalendarView
            canCreate={false}
            canEdit={false}
            selectedEmployees={currentEmployee ? [currentEmployee] : selectedEmployees}
            onSelectEmployees={isRestrictedEmployee ? undefined : setSelectedEmployees}
            refreshTrigger={refreshTrigger}
            isHR={isHR}
          />
        )}
      </Stack>

      {/* Global Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
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
