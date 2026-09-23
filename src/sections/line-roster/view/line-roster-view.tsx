import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { useLineRoster } from 'src/hooks/use-line-roster';

import { COMMON_COLORS } from 'src/theme';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

import { LineRosterDialog } from '../line-roster-dialog';
import { LineRosterListView } from './line-roster-list-view';
import { LineRosterBulkDialog } from '../line-roster-bulk-dialog';
import { LineRosterMonthlyView } from './line-roster-monthly-view';
import { LineRosterCalendarView } from './line-roster-calendar-view';

// ----------------------------------------------------------------------

export function LineRosterView() {
  const theme = useTheme();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedEmployees, setSelectedEmployees] = useState<any[]>([]);

  const actionPerms = user?.permissions?.actions?.line_roster;
  const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned && !!actionPerms;
  const canCreate = hasCustomPerms ? !!actionPerms?.create : true;
  const canEdit = hasCustomPerms ? !!actionPerms?.edit : true;
  const canDelete = hasCustomPerms ? !!actionPerms?.delete : true;

  const urlView = searchParams.get('view');
  const [currentView, setCurrentView] = useState<'list' | 'calendar' | 'monthly'>(
    urlView === 'monthly' ? 'monthly' : urlView === 'calendar' ? 'calendar' : 'list'
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
  const [openBulkDialog, setOpenBulkDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { refetch } = useLineRoster(1, 100);

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleCreateSuccess = () => {
    refetch();
    setRefreshTrigger((prev) => prev + 1);
    setSnackbar({ open: true, message: 'Line assigned successfully', severity: 'success' });
  };

  const handleBulkSuccess = () => {
    refetch();
    setRefreshTrigger((prev) => prev + 1);
    setSnackbar({ open: true, message: 'Bulk lines assigned successfully', severity: 'success' });
  };

  const handleViewChange = (newView: string) => {
    setCurrentView(newView as any);
    setSearchParams(newView === 'list' ? {} : { view: newView });
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
              Employee Line Assignment
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Manage date-wise line assignments, rotations, and monthly workforce line roster boards.
            </Typography>
          </div>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<Iconify icon={"solar:refresh-bold" as any} />}
              onClick={() => {
                refetch();
                setRefreshTrigger((prev) => prev + 1);
                setSnackbar({ open: true, message: 'Line Roster refreshed', severity: 'info' });
              }}
            >
              Refresh
            </Button>

            {canCreate && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<Iconify icon="solar:users-group-rounded-bold" />}
                  onClick={() => setOpenBulkDialog(true)}
                  sx={{
                    color: COMMON_COLORS.emerald.main,
                    borderColor: COMMON_COLORS.emerald.main,
                    '&:hover': { borderColor: COMMON_COLORS.emerald.dark, bgcolor: alpha(COMMON_COLORS.emerald.main, 0.08) },
                  }}
                >
                  Bulk Assign
                </Button>

                <Button
                  variant="contained"
                  startIcon={<Iconify icon="mingcute:add-line" />}
                  onClick={() => setOpenCreateDialog(true)}
                  sx={{ bgcolor: COMMON_COLORS.primaryButton.bg, color: COMMON_COLORS.primaryButton.color, '&:hover': { bgcolor: COMMON_COLORS.primaryButton.hoverBg } }}
                >
                  New Assignment
                </Button>
              </>
            )}
          </Stack>
        </Stack>

        {/* View Switcher Pill */}
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
              { value: 'list', label: 'List View', icon: 'solar:list-bold' },
              { value: 'monthly', label: 'Monthly Roster View', icon: 'material-symbols:grid-on' },
              ...(isSingleEmployee
                ? [{ value: 'calendar', label: 'Calendar View', icon: 'solar:calendar-bold' }]
                : []),
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

        {/* View Component Rendering */}
        {currentView === 'monthly' && (
          <LineRosterMonthlyView
            canEdit={canEdit}
            selectedEmployees={selectedEmployees}
            onSelectEmployees={setSelectedEmployees}
            filterVariant="drawer"
            refreshTrigger={refreshTrigger}
          />
        )}

        {currentView === 'list' && (
          <LineRosterListView
            onCreateNew={() => setOpenCreateDialog(true)}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
            selectedEmployees={selectedEmployees}
            onSelectEmployees={setSelectedEmployees}
          />
        )}

        {currentView === 'calendar' && (
          <LineRosterCalendarView
            canCreate={canCreate}
            canEdit={canEdit}
            selectedEmployees={selectedEmployees}
            onSelectEmployees={setSelectedEmployees}
            refreshTrigger={refreshTrigger}
          />
        )}
      </Stack>

      {/* Create Dialog */}
      {openCreateDialog && (
        <LineRosterDialog
          open={openCreateDialog}
          onClose={() => setOpenCreateDialog(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Bulk Assignment Dialog */}
      {openBulkDialog && (
        <LineRosterBulkDialog
          open={openBulkDialog}
          onClose={() => setOpenBulkDialog(false)}
          onSuccess={handleBulkSuccess}
        />
      )}

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
