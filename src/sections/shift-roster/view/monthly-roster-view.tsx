import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { useShiftRoster } from 'src/hooks/use-shift-roster';

import { COMMON_COLORS } from 'src/theme';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { ShiftRosterMonthlyView } from './shift-roster-monthly-view';
import { ShiftRosterCalendarView } from './shift-roster-calendar-view';

// ----------------------------------------------------------------------

interface SummaryCardProps {
  item: {
    label: string;
    value: number;
    indicator: 'blue' | 'green' | 'red' | 'orange';
  };
}

function SummaryCard({ item }: SummaryCardProps) {
  const { label, value, indicator } = item;

  const getColor = () => {
    switch (indicator) {
      case 'blue':
        return {
          bg: 'rgba(14, 165, 233, 0.08)',
          border: 'rgba(14, 165, 233, 0.16)',
          color: '#0284c7',
          icon: 'solar:file-text-bold-duotone',
        };
      case 'green':
        return {
          bg: 'rgba(34, 197, 94, 0.08)',
          border: 'rgba(34, 197, 94, 0.16)',
          color: '#16a34a',
          icon: 'solar:check-circle-bold-duotone',
        };
      case 'red':
        return {
          bg: 'rgba(239, 68, 68, 0.08)',
          border: 'rgba(239, 68, 68, 0.16)',
          color: '#dc2626',
          icon: 'solar:close-circle-bold-duotone',
        };
      case 'orange':
        return {
          bg: 'rgba(249, 115, 22, 0.08)',
          border: 'rgba(249, 115, 22, 0.16)',
          color: '#ea580c',
          icon: 'solar:clock-circle-bold-duotone',
        };
      default:
        return {
          bg: 'rgba(148, 163, 184, 0.08)',
          border: 'rgba(148, 163, 184, 0.16)',
          color: '#475569',
          icon: 'solar:info-circle-bold-duotone',
        };
    }
  };

  const config = getColor();

  return (
    <Card
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        bgcolor: config.bg,
        border: `1px solid ${config.border}`,
        boxShadow: 'none',
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(config.color, 0.1),
          color: config.color,
        }}
      >
        <Iconify icon={config.icon as any} width={24} />
      </Box>

      <Stack spacing={0.5}>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 800 }}>
          {value}
        </Typography>
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------------------------

export function MonthlyRosterView() {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedEmployees, setSelectedEmployees] = useState<any[]>([]);

  const urlView = searchParams.get('view');
  const [currentView, setCurrentView] = useState<'monthly' | 'calendar'>(
    urlView === 'calendar' ? 'calendar' : 'monthly'
  );

  const isSingleEmployee = selectedEmployees.length === 1;

  // If no single employee is selected and view is calendar, switch back to monthly view
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

  // For summary counts
  const { data, total, refetch } = useShiftRoster(1, 100);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const activeCount = data.filter((d) => d.status === 'Active').length;
  const bulkRotationCount = data.filter((d) => ['Bulk', 'Rotation'].includes(d.assignment_type)).length;
  const uniqueEmployees = new Set(data.map((d) => d.employee)).size;

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
              Monthly Roster
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Monthly visual roster matrix and workforce shift schedule board.
            </Typography>
          </div>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<Iconify icon={"solar:refresh-bold" as any} />}
              onClick={() => {
                refetch();
                setRefreshTrigger((prev) => prev + 1);
                setSnackbar({ open: true, message: 'Monthly Roster refreshed', severity: 'info' });
              }}
            >
              Refresh
            </Button>
          </Stack>
        </Stack>

        {/* Summary Stat Cards */}
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
          }}
        >
          <SummaryCard item={{ label: 'Total Assignments', value: total, indicator: 'blue' }} />
          <SummaryCard item={{ label: 'Active Shifts', value: activeCount, indicator: 'green' }} />
          <SummaryCard item={{ label: 'Employees Assigned', value: uniqueEmployees, indicator: 'orange' }} />
          <SummaryCard item={{ label: 'Bulk & Rotations', value: bulkRotationCount, indicator: 'blue' }} />
        </Box>

        {/* View Switcher Pill styled like Employee Shift Assignment - only shown when Calendar View is available */}
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
          <ShiftRosterMonthlyView
            canEdit={false}
            selectedEmployees={selectedEmployees}
            onSelectEmployees={setSelectedEmployees}
            filterVariant="drawer"
            refreshTrigger={refreshTrigger}
          />
        )}

        {currentView === 'calendar' && (
          <ShiftRosterCalendarView
            canCreate={false}
            canEdit={false}
            selectedEmployees={selectedEmployees}
            onSelectEmployees={setSelectedEmployees}
            refreshTrigger={refreshTrigger}
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
