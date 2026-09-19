import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { getShift, Shift } from 'src/api/masters';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  shiftId: string | null;
};

export function ShiftDetailsDialog({ open, onClose, shiftId }: Props) {
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (open && shiftId) {
        try {
          setLoading(true);
          const doc = await getShift(shiftId);
          setShift(doc);
        } catch (err) {
          console.error('Failed to fetch shift details:', err);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [open, shiftId]);

  const formatTime = (time?: string) => {
    if (!time) return '-';
    const normalizedTime = time.includes(':') && time.split(':')[0].length === 1 ? `0${time}` : time;
    const parsed = dayjs(`2000-01-01T${normalizedTime}`);
    if (parsed.isValid()) {
      return parsed.format('hh:mm A');
    }
    return time;
  };

  const formatDuration = (time?: string) => {
    if (!time || time === '00:00:00' || time === '00:00') return '-';
    const parts = time.split(':');
    if (parts.length >= 2) {
      const hrs = parseInt(parts[0], 10);
      const mins = parseInt(parts[1], 10);
      if (hrs > 0 && mins > 0) return `${hrs} hr ${mins} mins`;
      if (hrs > 0) return `${hrs} hrs`;
      if (mins > 0) return `${mins} mins`;
      return `${parts[0]}:${parts[1]} hrs`;
    }
    return time;
  };

  const calculateTotalShiftHours = (startTime?: string, endTime?: string) => {
    if (!startTime || !endTime) return '-';
    const sNorm = startTime.includes(':') && startTime.split(':')[0].length === 1 ? `0${startTime}` : startTime;
    const eNorm = endTime.includes(':') && endTime.split(':')[0].length === 1 ? `0${endTime}` : endTime;
    const start = dayjs(`2000-01-01T${sNorm}`);
    let end = dayjs(`2000-01-01T${eNorm}`);
    if (end.isBefore(start)) {
      end = end.add(1, 'day');
    }
    const diffMinutes = end.diff(start, 'minute');
    const hrs = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    if (hrs > 0 && mins > 0) return `${hrs} hrs ${mins} mins`;
    if (hrs > 0) return `${hrs} hrs`;
    return `${mins} mins`;
  };

  const renderStatus = (status?: string) => (
    <Label
      variant="soft"
      color={status === 'Inactive' ? 'error' : 'success'}
      sx={{ textTransform: 'uppercase', fontWeight: 800 }}
    >
      {status || 'Active'}
    </Label>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      TransitionProps={{ onExited: () => setShift(null) }}
      PaperProps={{
        sx: {
          borderRadius: 2,
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
          bgcolor: 'background.neutral',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Shift Profile
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
            bgcolor: 'background.paper',
            boxShadow: (theme) => theme.customShadows?.z1,
          }}
        >
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 4, m: 2, mt: 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
            <Iconify icon={'svg-spinners:12-dots-scale-rotate' as any} width={40} sx={{ color: 'primary.main' }} />
          </Box>
        ) : shift ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {/* Header Info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: (theme) =>
                    `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                  color: 'white',
                  flexShrink: 0,
                  position: 'relative',
                  boxShadow: (theme) => theme.customShadows?.z8 || theme.shadows[8],
                }}
              >
                <Iconify icon={'solar:clock-circle-bold' as any} width={32} />
              </Box>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
                  {shift.shift_name || shift.name}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {shift.start_time && shift.end_time
                    ? `${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}`
                    : 'Flexible Timings'}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                {renderStatus(shift.status)}
                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled', fontWeight: 700 }}>
                  ID: {shift.name}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ borderStyle: 'dashed' }} />

            {/* Shift Timing & Schedule */}
            <Box>
              <SectionHeader title="Shift Timing & Schedule" icon="solar:clock-circle-bold" />
              <Box
                sx={{
                  display: 'grid',
                  gap: 3,
                  gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                }}
              >
                <DetailItem label="Shift Name" value={shift.shift_name || shift.name} icon="solar:tag-bold" />
                <DetailItem label="Start Time" value={formatTime(shift.start_time)} icon="solar:play-circle-bold" />
                <DetailItem label="End Time" value={formatTime(shift.end_time)} icon="solar:stop-circle-bold" />
                <DetailItem
                  label="Total Duration"
                  value={calculateTotalShiftHours(shift.start_time, shift.end_time)}
                  icon="solar:hourglass-bold"
                />
                <DetailItem label="Lunch Duration" value={formatDuration(shift.lunch_hours)} icon="solar:cup-bold" />
                <DetailItem label="Break Duration" value={formatDuration(shift.break_hours)} icon="solar:cup-bold" />
                <DetailItem label="Status" value={shift.status || 'Active'} isStatus />
              </Box>
            </Box>

            <Divider sx={{ borderStyle: 'dashed' }} />

            {/* Overtime Policy */}
            <Box>
              <SectionHeader title="Overtime Policy & Rules" icon="solar:chart-2-bold" />
              <Box
                sx={{
                  display: 'grid',
                  gap: 3,
                  gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                }}
              >
                <DetailItem
                  label="Allow Overtime"
                  value={shift.allow_overtime ? 'Enabled' : 'Disabled'}
                  icon="solar:shield-check-bold"
                />
                <DetailItem
                  label="Max Overtime Allowed"
                  value={shift.allow_overtime ? (shift.overtime_hours ? `${shift.overtime_hours} hrs` : '0 hrs') : 'N/A'}
                  icon="solar:clock-circle-bold"
                />
                <DetailItem
                  label="Min OT Threshold"
                  value={
                    shift.allow_overtime
                      ? shift.min_overtime_minutes
                        ? `${shift.min_overtime_minutes} mins`
                        : '0 mins'
                      : 'N/A'
                  }
                  icon="solar:stopwatch-bold"
                />
              </Box>
            </Box>

            <Divider sx={{ borderStyle: 'dashed' }} />

            {/* Shift Description */}
            <Box>
              <SectionHeader title="Shift Description" icon="solar:document-text-bold" />
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-line',
                  p: 3,
                  bgcolor: 'background.neutral',
                  borderRadius: 1.5,
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                }}
              >
                {shift.description || 'No description provided for this shift.'}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box sx={{ py: 10, textAlign: 'center' }}>
            <Iconify icon={'solar:ghost-bold' as any} width={64} sx={{ color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>
              No Details Found
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

function SectionHeader({ title, icon, noMargin = false }: { title: string; icon?: string; noMargin?: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: noMargin ? 0 : 3 }}>
      {icon && <Iconify icon={icon as any} width={22} sx={{ color: 'primary.main' }} />}
      <Typography
        variant="h6"
        sx={{
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: 1,
          fontSize: '0.875rem',
          color: 'text.primary',
        }}
      >
        {title}
      </Typography>
    </Box>
  );
}

function DetailItem({
  label,
  value,
  icon,
  color = 'text.primary',
  isStatus = false,
}: {
  label: string;
  value?: any;
  icon?: string;
  color?: string;
  isStatus?: boolean;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography
        variant="caption"
        sx={{ color: 'text.disabled', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}
      >
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {icon && (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
              color: 'primary.main',
            }}
          >
            <Iconify icon={icon as any} width={18} />
          </Box>
        )}
        {isStatus ? (
          <Label
            variant="soft"
            color={value === 'Active' ? 'success' : 'error'}
            sx={{ textTransform: 'uppercase', fontWeight: 800 }}
          >
            {value || 'Unknown'}
          </Label>
        ) : (
          <>
            {typeof value === 'string' ? (
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color }}>
                {value || '-'}
              </Typography>
            ) : (
              value
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
