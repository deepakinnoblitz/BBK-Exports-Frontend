import { useState } from 'react';
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

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

import { ShiftRosterDialog } from '../shift-roster-dialog';
import { ShiftRosterListView } from './shift-roster-list-view';
import { ShiftRosterBulkDialog } from '../shift-roster-bulk-dialog';
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

export function ShiftRosterView() {
  const theme = useTheme();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const actionPerms = user?.permissions?.actions?.shift_roster;
  const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned && !!actionPerms;
  const canCreate = hasCustomPerms ? !!actionPerms?.create : true;
  const canEdit = hasCustomPerms ? !!actionPerms?.edit : true;
  const canDelete = hasCustomPerms ? !!actionPerms?.delete : true;

  const urlView = searchParams.get('view');
  const [currentView, setCurrentView] = useState<'list' | 'calendar' | 'monthly'>(
    urlView === 'monthly' ? 'monthly' : urlView === 'calendar' ? 'calendar' : 'monthly'
  );

  // Dialogs
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openBulkDialog, setOpenBulkDialog] = useState(false);

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

  const activeCount = data.filter((d) => d.status === 'Active').length;
  const bulkRotationCount = data.filter((d) => ['Bulk', 'Rotation'].includes(d.assignment_type)).length;
  const uniqueEmployees = new Set(data.map((d) => d.employee)).size;

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleViewChange = (newView: string) => {
    setCurrentView(newView as any);
    setSearchParams(newView === 'monthly' ? { view: 'monthly' } : newView === 'calendar' ? { view: 'calendar' } : {});
  };

  const handleCreateSuccess = () => {
    setSnackbar({
      open: true,
      message: 'Shift assignment created successfully',
      severity: 'success',
    });
    refetch();
  };

  const handleBulkSuccess = () => {
    setSnackbar({
      open: true,
      message: 'Bulk shift assignments created successfully',
      severity: 'success',
    });
    refetch();
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
              Employee Shift Roster
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Manage date-wise shift assignments, rotations, and monthly workforce roster boards.
            </Typography>
          </div>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<Iconify icon={"solar:refresh-bold" as any} />}
              onClick={() => {
                refetch();
                setSnackbar({ open: true, message: 'Shift Roster refreshed', severity: 'info' });
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
                    color: '#08a3cd',
                    borderColor: '#08a3cd',
                    '&:hover': { borderColor: '#068fb3', bgcolor: '#08a3cd08' },
                  }}
                >
                  Bulk Assign
                </Button>

                <Button
                  variant="contained"
                  startIcon={<Iconify icon="mingcute:add-line" />}
                  onClick={() => setOpenCreateDialog(true)}
                  sx={{ bgcolor: '#08a3cd', color: 'common.white', '&:hover': { bgcolor: '#068fb3' } }}
                >
                  New Assignment
                </Button>
              </>
            )}
          </Stack>
        </Stack>

        {/* Summary Stat Cards styled like Leave Allocation Report */}
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

        {/* View Switcher Pill styled like Leave Allocation Report */}
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
              { value: 'list', label: 'List View', icon: 'solar:list-bold' },
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
                    bgcolor: isActive ? '#08a3cd' : 'transparent',
                    boxShadow: isActive ? `0 2px 8px ${alpha('#08a3cd', 0.3)}` : 'none',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      bgcolor: isActive ? '#08a3cd' : alpha(theme.palette.grey[500], 0.08),
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
        {currentView === 'monthly' && <ShiftRosterMonthlyView canEdit={canEdit} />}

        {currentView === 'list' && (
          <ShiftRosterListView
            onCreateNew={() => setOpenCreateDialog(true)}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        )}

        {currentView === 'calendar' && (
          <ShiftRosterCalendarView canCreate={canCreate} canEdit={canEdit} />
        )}
      </Stack>

      {/* Create Dialog */}
      {openCreateDialog && (
        <ShiftRosterDialog
          open={openCreateDialog}
          onClose={() => setOpenCreateDialog(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Bulk Assignment Dialog */}
      {openBulkDialog && (
        <ShiftRosterBulkDialog
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
