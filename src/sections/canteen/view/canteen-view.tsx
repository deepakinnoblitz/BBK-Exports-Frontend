import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { useCanteen } from 'src/hooks/use-canteen';

import { COMMON_COLORS } from 'src/theme';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

import { CanteenDialog } from '../canteen-dialog';
import { CanteenListView } from './canteen-list-view';
import { CanteenMonthlyView } from './canteen-monthly-view';
import { CanteenCalendarView } from './canteen-calendar-view';
import { CanteenImportDialog } from '../canteen-import-dialog';

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

  const isSingleEmployee = selectedEmployees.length === 1 || (isRestrictedEmployee && Boolean(user?.employee));

  useEffect(() => {
    if (!isSingleEmployee && currentView === 'calendar') {
      setCurrentView('monthly');
      setSearchParams({ view: 'monthly' });
    }
  }, [isSingleEmployee, currentView, setSearchParams]);

  // Dialog State
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { refetch } = useCanteen(1, 100);

  const handleCreateSuccess = () => {
    refetch();
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleImportSuccess = () => {
    refetch();
    setRefreshTrigger((prev) => prev + 1);
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

        {/* View Switcher Pill styled like Employee Shift Assignment */}
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
              { value: 'monthly', label: 'Monthly Roster View', icon: 'solar:calendar-date-bold' },
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
            isHR={isHRUser}
          />
        )}

        {currentView === 'monthly' && (
          <CanteenMonthlyView
            canEdit={!isRestrictedEmployee}
            selectedEmployees={selectedEmployees}
            onSelectEmployees={setSelectedEmployees}
            refreshTrigger={refreshTrigger}
            isHR={isHRUser}
          />
        )}

        {currentView === 'calendar' && (
          <CanteenCalendarView
            canCreate={!isRestrictedEmployee}
            canEdit={!isRestrictedEmployee}
            selectedEmployees={selectedEmployees}
            onSelectEmployees={setSelectedEmployees}
            refreshTrigger={refreshTrigger}
            isHR={isHRUser}
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
    </DashboardContent>
  );
}
