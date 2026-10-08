import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Avatar from '@mui/material/Avatar';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { getEmployee } from 'src/api/employees';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  lineData: any | null;
};

export function LineDetailsDialog({ open, onClose, lineData }: Props) {
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && lineData?.employee) {
      setLoading(true);
      getEmployee(lineData.employee)
        .then(setEmployeeDetails)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setEmployeeDetails(null);
    }
  }, [open, lineData?.employee]);

  if (!lineData) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Holiday':
        return 'info';
      case 'Weekly Off':
        return 'secondary';
      case 'Cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getSourceBadgeColor = (source: string) => {
    switch ((source || '').toUpperCase()) {
      case 'ROSTER':
        return 'primary';
      case 'ROTATION':
        return 'warning';
      default:
        return 'default';
    }
  };

  const empName = lineData.employee_name || employeeDetails?.employee_name || lineData.employee;
  const avatarImage =
    employeeDetails?.profile_picture ||
    employeeDetails?.image ||
    employeeDetails?.user_image;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: (themeVar) => themeVar.customShadows.z24,
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Iconify icon={"solar:layers-minimalistic-bold" as any} width={24} sx={{ color: '#059669' }} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Line Assignment Details
          </Typography>
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

      <DialogContent sx={{ p: 3, pt: 3 }}>
        <Stack spacing={2.5}>
          {/* Employee Header */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.2)}`,
              boxShadow: (t) => t.customShadows?.z4,
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                src={avatarImage}
                sx={{
                  width: 60,
                  height: 60,
                  border: '2px solid #FFFFFF',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  bgcolor: '#059669',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '1.25rem',
                }}
              >
                {empName?.charAt(0) || 'E'}
              </Avatar>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  {empName}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  ID: {lineData.employee}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  {[lineData.designation, lineData.department].filter(Boolean).join(' • ')}
                </Typography>
              </Box>
              <Label color={getStatusColor(lineData.status)} sx={{ textTransform: 'capitalize', fontWeight: 700 }}>
                {lineData.status}
              </Label>
            </Stack>
          </Box>

          {/* Line Assignment Details */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: (t) => alpha('#059669', 0.04),
              border: (t) => `1px solid ${alpha('#059669', 0.16)}`,
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Assigned Line
            </Typography>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#059669' }}>
                  {lineData.line_name || lineData.line_order || 'Unassigned Line'}
                </Typography>
                {lineData.line_order && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mt: 0.25 }}>
                    <Iconify icon="solar:tag-bold" width={16} sx={{ verticalAlign: 'middle', mr: 0.5, color: 'text.secondary' }} />
                    ID: {lineData.line_order}
                  </Typography>
                )}
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>
                  Date
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {lineData.line_date ? dayjs(lineData.line_date).format('DD MMM YYYY (ddd)') : '---'}
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Detail Attributes Grid */}
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: 'repeat(2, 1fr)',
              p: 2,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: (t) => `1px solid ${t.palette.divider}`,
            }}
          >
            <div>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Assignment Type
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.25 }}>
                {lineData.assignment_type || 'Default'}
              </Typography>
            </div>

            <div>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Resolution Source
              </Typography>
              <Box sx={{ mt: 0.25 }}>
                <Label color={getSourceBadgeColor(lineData.source)} sx={{ fontWeight: 700 }}>
                  {lineData.source || 'DEFAULT'}
                </Label>
              </Box>
            </div>

            {lineData.reason && (
              <Box sx={{ gridColumn: 'span 2' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  Remarks / Reason
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.25, color: 'text.secondary' }}>
                  {lineData.reason}
                </Typography>
              </Box>
            )}
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
