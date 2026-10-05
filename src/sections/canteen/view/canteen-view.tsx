import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { useCanteen } from 'src/hooks/use-canteen';

import { COMMON_COLORS } from 'src/theme';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

import { CanteenDialog } from '../canteen-dialog';
import { CanteenListView } from './canteen-list-view';
import { CanteenImportDialog } from '../canteen-import-dialog';
import { CanteenMonthlyView } from './canteen-monthly-view';
import { CanteenCalendarView } from './canteen-calendar-view';

// ----------------------------------------------------------------------

export function CanteenView() {
  const theme = useTheme();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedEmployees, setSelectedEmployees] = useState<any[]>([]);

  const isHRUser = user?.roles?.some((role: string) =>
    ['HR Manager', 'HR', 'System Manager', 'Administrator'].includes(role)
  );
  const isRestrictedEmployee = user?.roles?.includes('Employee') && !isHRUser;

  const urlView = searchParams.get('view');
  const [currentView, setCurrentView] = useState<'list' | 'calendar' | 'monthly'>(
    urlView === 'list' ? 'list' : urlView === 'calendar' ? 'calendar' : 'monthly'
  );

  const isSingleEmployee = selectedEmployees.length === 1;

  useEffect(() => {
    if (!isSingleEmployee && currentView === 'calendar') {
      setCurrentView('monthly');
      setSearchParams({ view: 'monthly' });
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

  // Dialog State
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { refetch } = useCanteen(1, 100);

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleCreateSuccess = () => {
    refetch();
    setRefreshTrigger((prev) => prev + 1);
    setSnackbar({ open: true, message: 'Canteen entry created successfully', severity: 'success' });
  };

  const handleImportSuccess = () => {
    refetch();
    setRefreshTrigger((prev) => prev + 1);
    setSnackbar({ open: true, message: 'Canteen Excel data imported successfully', severity: 'success' });
  };

  const handleViewChange = (newView: string) => {
    setCurrentView(newView as any);
    setSearchParams(newView === 'monthly' ? {} : { view: newView });
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
              Canteen
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Manage employee canteen meal records, lunch expenses, and monthly muster roll boards.
            </Typography>
          </div>

          <Stack direction="row" spacing={1.5} alignItems="center">
            {/* Per user request: Refresh button is REMOVED. Bulk Assign is REPLACED with Import button. */}
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:upload-bold" />}
              onClick={() => setOpenImportDialog(true)}
              sx={{
                color: COMMON_COLORS.emerald.main,
                borderColor: COMMON_COLORS.emerald.main,
                '&:hover': {
                  borderColor: COMMON_COLORS.emerald.dark,
                  bgcolor: alpha(COMMON_COLORS.emerald.main, 0.08),
                },
              }}
            >
              Import
            </Button>

            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => setOpenCreateDialog(true)}
              sx={{
                bgcolor: COMMON_COLORS.primaryButton.bg,
                color: COMMON_COLORS.primaryButton.color,
                '&:hover': { bgcolor: COMMON_COLORS.primaryButton.hoverBg },
              }}
            >
              New Entry
            </Button>
          </Stack>
        </Stack>

        {/* View Switcher Tabs */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="flex-end"
          spacing={1}
        >
          <Button
            size="small"
            variant={currentView === 'list' ? 'contained' : 'text'}
            color={currentView === 'list' ? 'primary' : 'inherit'}
            startIcon={<Iconify icon="solar:list-bold" />}
            onClick={() => handleViewChange('list')}
            sx={{
              fontWeight: 600,
              bgcolor: currentView === 'list' ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
              color: currentView === 'list' ? theme.palette.primary.main : 'text.secondary',
              '&:hover': {
                bgcolor: currentView === 'list' ? alpha(theme.palette.primary.main, 0.16) : alpha(theme.palette.grey[500], 0.08),
              },
            }}
          >
            List View
          </Button>

          <Button
            size="small"
            variant={currentView === 'monthly' ? 'contained' : 'text'}
            color={currentView === 'monthly' ? 'primary' : 'inherit'}
            startIcon={<Iconify icon="solar:calendar-date-bold" />}
            onClick={() => handleViewChange('monthly')}
            sx={{
              fontWeight: 600,
              bgcolor: currentView === 'monthly' ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
              color: currentView === 'monthly' ? theme.palette.primary.main : 'text.secondary',
              '&:hover': {
                bgcolor: currentView === 'monthly' ? alpha(theme.palette.primary.main, 0.16) : alpha(theme.palette.grey[500], 0.08),
              },
            }}
          >
            Monthly Roster View
          </Button>

          <Button
            size="small"
            variant={currentView === 'calendar' ? 'contained' : 'text'}
            color={currentView === 'calendar' ? 'primary' : 'inherit'}
            startIcon={<Iconify icon="solar:calendar-bold" />}
            onClick={() => handleViewChange('calendar')}
            sx={{
              fontWeight: 600,
              bgcolor: currentView === 'calendar' ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
              color: currentView === 'calendar' ? theme.palette.primary.main : 'text.secondary',
              '&:hover': {
                bgcolor: currentView === 'calendar' ? alpha(theme.palette.primary.main, 0.16) : alpha(theme.palette.grey[500], 0.08),
              },
            }}
          >
            Calendar View
          </Button>
        </Stack>
      </Stack>

      {/* Main View Render */}
      <Box sx={{ pb: 5 }}>
        {currentView === 'list' && (
          <CanteenListView
            onCreateNew={() => setOpenCreateDialog(true)}
            canCreate={!isRestrictedEmployee}
            canEdit={!isRestrictedEmployee}
            canDelete={!isRestrictedEmployee}
            selectedEmployees={selectedEmployees}
            onSelectEmployees={setSelectedEmployees}
          />
        )}

        {currentView === 'monthly' && (
          <CanteenMonthlyView
            canEdit={!isRestrictedEmployee}
            selectedEmployees={selectedEmployees}
            onSelectEmployees={setSelectedEmployees}
            refreshTrigger={refreshTrigger}
          />
        )}

        {currentView === 'calendar' && (
          <CanteenCalendarView
            canCreate={!isRestrictedEmployee}
            canEdit={!isRestrictedEmployee}
            selectedEmployees={selectedEmployees}
            onSelectEmployees={setSelectedEmployees}
            refreshTrigger={refreshTrigger}
          />
        )}
      </Box>

      {/* Create Dialog */}
      {openCreateDialog && (
        <CanteenDialog
          open={openCreateDialog}
          onClose={() => setOpenCreateDialog(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Import Dialog */}
      {openImportDialog && (
        <CanteenImportDialog
          open={openImportDialog}
          onClose={() => setOpenImportDialog(false)}
          onSuccess={handleImportSuccess}
        />
      )}

      {/* Notification Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}
