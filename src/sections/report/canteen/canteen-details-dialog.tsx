import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { getEmployee } from 'src/api/employees';
import { getHRDoc } from 'src/api/hr-management';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  entryId: string | null;
  initialData?: any;
};

export function CanteenDetailsDialog({ open, onClose, entryId, initialData }: Props) {
  const [entry, setEntry] = useState<any>(initialData || null);
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (open) {
      if (entryId) {
        setLoading(true);
        setFetching(true);
        getHRDoc('Canteen Entry', entryId)
          .then((data) => {
            setEntry(data);
            const empId = data.employee || data.employee_id;
            if (empId) {
              getEmployee(empId)
                .then(setEmployeeDetails)
                .catch(console.error)
                .finally(() => setFetching(false));
            } else {
              setFetching(false);
            }
          })
          .catch((err) => {
            console.error('Failed to fetch canteen entry details:', err);
            setFetching(false);
          })
          .finally(() => setLoading(false));
      } else if (initialData) {
        setEntry(initialData);
        const empId = initialData.employee || initialData.employee_id;
        if (empId) {
          getEmployee(empId)
            .then(setEmployeeDetails)
            .catch(console.error);
        }
      }
    }
  }, [open, entryId, initialData]);

  const getMealTypeColor = (mealType: string) => {
    switch ((mealType || '').toLowerCase()) {
      case 'lunch':
        return { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', labelColor: 'success' as const };
      case 'dinner':
        return { bg: 'rgba(99, 102, 241, 0.12)', color: '#4338ca', labelColor: 'secondary' as const };
      case 'breakfast':
        return { bg: 'rgba(245, 158, 11, 0.12)', color: '#d97706', labelColor: 'warning' as const };
      case 'snacks':
        return { bg: 'rgba(168, 85, 247, 0.12)', color: '#7e22ce', labelColor: 'info' as const };
      default:
        return { bg: 'rgba(100, 116, 139, 0.12)', color: '#334155', labelColor: 'default' as const };
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      TransitionProps={{
        onExited: () => {
          setEntry(null);
          setEmployeeDetails(null);
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: (themeVar) => themeVar.customShadows?.z24,
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 1.5,
              bgcolor: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Iconify icon={"solar:cup-hot-bold" as any} width={22} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Canteen Meal Details
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Entry ID: {entry?.name || entryId || '-'}
            </Typography>
          </Box>
        </Stack>
        <IconButton
          onClick={onClose}
          sx={{
            color: 'text.disabled',
            '&:hover': {
              color: 'error.main',
              bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
            },
          }}
        >
          <Iconify icon="mingcute:close-line" width={24} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 4, mt: 2 }}>
        {fetching || (loading && !entry) ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
            <Iconify icon={"svg-spinners:12-dots-scale-rotate" as any} width={40} sx={{ color: 'primary.main' }} />
          </Box>
        ) : entry ? (
          <Stack spacing={3}>
            {/* Header Summary Card */}
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: (theme: any) => `1px solid ${alpha(theme.palette.grey[500], 0.26)}`,
                boxShadow: (theme: any) => theme.customShadows?.z4,
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={2}
                sx={{ position: 'relative', zIndex: 1 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    flexGrow: 1,
                    minWidth: 0,
                    width: { xs: '100%', sm: 'auto' },
                  }}
                >
                  <Avatar
                    src={
                      employeeDetails?.profile_picture ||
                      employeeDetails?.image ||
                      employeeDetails?.user_image ||
                      entry?.profile_picture ||
                      entry?.image
                    }
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      border: '3px solid #FFFFFF',
                      boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.12)',
                      bgcolor: (theme: any) => {
                        const img =
                          employeeDetails?.profile_picture ||
                          employeeDetails?.image ||
                          employeeDetails?.user_image;
                        if (img) return 'transparent';
                        const colors = ['#E2F0CB', '#B5EAD7', '#C7CEEA', '#FFDAC1', '#FFB7B2', '#FF9AA2'];
                        let hash = 0;
                        const name = entry?.employee_name || '';
                        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash * 31) - hash);
                        return colors[Math.abs(hash) % colors.length];
                      },
                      color: (theme: any) => alpha(theme.palette.common.black, 0.6),
                      fontSize: '1.75rem',
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    {entry?.employee_name?.charAt(0) || 'U'}
                  </Avatar>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 800, lineHeight: 1.2, color: 'text.primary', wordBreak: 'break-word' }}
                    >
                      {entry.employee_name || entry.employee}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mt: 0.5, display: 'block' }}>
                      Employee ID: {entry.employee || '-'}
                    </Typography>
                    {(entry.department || employeeDetails?.department) && (
                      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.25 }}>
                        {entry.department || employeeDetails?.department} {entry.designation ? `• ${entry.designation}` : ''}
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Label
                    variant="soft"
                    color={getMealTypeColor(entry.meal_type).labelColor}
                    sx={{
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.25,
                      px: 1.5,
                      py: 2,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                    }}
                  >
                    {entry.meal_type || 'Lunch'}
                  </Label>
                  <Label
                    variant="soft"
                    color={entry.status === 'Cancelled' ? 'error' : 'success'}
                    sx={{
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.25,
                      px: 1.5,
                      py: 2,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                    }}
                  >
                    {entry.status || 'Availed'}
                  </Label>
                </Stack>
              </Stack>

              <Divider sx={{ borderStyle: 'dashed', my: 2.5 }} />

              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack spacing={0.5}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }}>
                    Canteen Date
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    {dayjs(entry.canteen_date).format('DD MMM YYYY')}
                  </Typography>
                </Stack>

                <Stack spacing={0.5} alignItems="flex-end" sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }}>
                    Meal Count
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    {entry.meal_count || 1} {entry.meal_count === 1 ? 'Meal' : 'Meals'}
                  </Typography>
                </Stack>
              </Stack>
            </Box>

            {/* Details Grid */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                gap: 2,
                p: 3,
                bgcolor: alpha('#10b981', 0.03),
                borderRadius: 2,
                border: (t) => `1px solid ${alpha('#10b981', 0.12)}`,
              }}
            >
              <DetailRow label="Meal Type" value={entry.meal_type || 'Lunch'} icon="solar:cup-hot-bold" />
              <DetailRow label="Meal Count" value={String(entry.meal_count || 1)} icon="solar:hashtag-bold" />
              <DetailRow label="Status" value={entry.status || 'Availed'} icon="solar:check-circle-bold" />
              <DetailRow label="Source" value={entry.source || 'Manual'} icon="solar:user-id-bold" />
              <DetailRow label="Department" value={entry.department || employeeDetails?.department || '-'} icon="solar:buildings-bold" />
              <DetailRow label="Designation" value={entry.designation || employeeDetails?.designation || '-'} icon="solar:user-bold" />
            </Box>

            {/* Remarks */}
            {entry.remarks && (
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  border: (t) => `1px solid ${t.palette.divider}`,
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                  Remarks / Notes
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.primary', whiteSpace: 'pre-wrap' }}>
                  {entry.remarks}
                </Typography>
              </Box>
            )}
          </Stack>
        ) : (
          <Box sx={{ py: 10, textAlign: 'center' }}>
            <Iconify icon={"solar:ghost-bold" as any} width={64} sx={{ color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>No Record Found</Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value, icon }: { label: string; value?: string | null; icon: string }) {
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Box
        sx={{
          p: 1.5,
          borderRadius: 1.25,
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
          color: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Iconify icon={icon as any} width={20} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.25 }}>
          {label}
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, wordBreak: 'break-word' }}>
          {value || '-'}
        </Typography>
      </Box>
    </Stack>
  );
}
