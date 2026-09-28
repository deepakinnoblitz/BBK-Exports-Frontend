import dayjs from 'dayjs';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import ListItem from '@mui/material/ListItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { getMyReminders, deleteRemainder } from 'src/api/reminders';

import { Iconify } from 'src/components/iconify';

import { ReminderDialog } from './reminder-dialog';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: VoidFunction;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

type Reminder = {
  name: string;
  type: string;
  message: string;
  repeat: string;
  date: string | null;
  time: string;
  day: string | null;
  status: string;
};

export function MyRemindersDialog({ open, onClose, onSuccess, onError }: Props) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  const fetchReminders = useCallback(async (isManual = false) => {
    try {
      if (isManual) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getMyReminders();
      setReminders(data || []);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleDelete = async (name: string) => {
    try {
      await deleteRemainder(name);
      onSuccess?.('Reminder deleted successfully!');
      fetchReminders(true);
    } catch (error: any) {
      console.error('Failed to delete reminder:', error);
      onError?.(error.message || 'Failed to delete reminder');
    }
  };

  useEffect(() => {
    if (open) {
      fetchReminders();
    }
  }, [open, fetchReminders]);

  const filteredReminders = useMemo(() => {
    const active = reminders.filter((r) => r.status === 'Active');
    const now = dayjs();

    // 1. Filter and sort Single reminders to find the earliest upcoming one
    const singleReminders = active
      .filter((r) => r.repeat === 'Single')
      .map((r) => ({
        ...r,
        triggerAt: dayjs(`${r.date} ${r.time}`),
      }))
      .filter((r) => r.triggerAt.isAfter(now))
      .sort((a, b) => a.triggerAt.diff(b.triggerAt));

    const upcomingSingle = singleReminders.length > 0 ? [singleReminders[0]] : [];

    // 2. Weekly and Daily remainders
    const recurring = active.filter((r) => r.repeat === 'Daily' || r.repeat === 'Weekly');

    return [...upcomingSingle, ...recurring];
  }, [reminders]);

  const renderContent = () => {
    if (loading && reminders.length === 0) {
      return (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={32} thickness={5} />
        </Box>
      );
    }

    if (filteredReminders.length === 0) {
      return (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Iconify
            icon={"ph:bell-slash-bold" as any}
            width={64}
            sx={{ color: 'text.disabled', mb: 2, opacity: 0.48 }}
          />
          <Typography variant="h6" sx={{ color: 'text.secondary' }}>
            No active reminders
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.disabled', mt: 1 }}>
            You haven&apos;t set any upcoming reminders yet.
          </Typography>
        </Box>
      );
    }

    return (
      <List disablePadding>
        {filteredReminders.map((reminder, index) => (
          <Box key={reminder.name}>
            <ListItem
              sx={{
                py: 2,
                px: 2.5,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                },
              }}
              secondaryAction={
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Edit">
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => setEditingReminder(reminder)}
                    >
                      <Iconify icon={"solar:pen-bold" as any} width={18} />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Delete">
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleDelete(reminder.name)}
                    >
                      <Iconify icon={"solar:trash-bin-trash-bold" as any} width={18} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              }
            >
              <ListItemIcon>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    display: 'flex',
                    borderRadius: 1.5,
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                    color: 'primary.main',
                  }}
                >
                  <Iconify
                    icon={
                      (reminder.repeat === 'Single'
                        ? 'ph:calendar-bold'
                        : reminder.repeat === 'Daily'
                        ? 'ph:alarm-bold'
                        : 'ph:calendar-plus-bold') as any
                    }
                    width={24}
                  />
                </Box>
              </ListItemIcon>

              <ListItemText
                primary={
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {reminder.message || `Reminder: ${reminder.type}`}
                  </Typography>
                }
                secondary={
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Iconify icon={"ph:clock-bold" as any} width={14} />
                      {dayjs(`2000-01-01 ${reminder.time}`).format('hh:mm A')}
                    </Typography>
                    
                    <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                    
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                      {reminder.repeat === 'Weekly' ? `Every ${reminder.day}` : reminder.repeat}
                    </Typography>

                    {reminder.repeat === 'Single' && (
                       <>
                         <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                         <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                           {dayjs(reminder.date).format('MMM DD, YYYY')}
                         </Typography>
                       </>
                    )}
                  </Stack>
                }
              />
            </ListItem>
            {index < filteredReminders.length - 1 && <Divider sx={{ borderStyle: 'dashed' }} />}
          </Box>
        ))}
      </List>
    );
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: theme.customShadows.z24,
          },
        }}
      >
        <DialogTitle sx={{ py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              display: 'flex',
              borderRadius: '50%',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: (t) => alpha(t.palette.warning.main, 0.1),
              color: 'warning.main',
            }}
          >
            <Iconify icon={"ph:bell-ringing-bold" as any} width={24} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              My Reminders
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: -0.5 }}>
              Manage your scheduled notifications
            </Typography>
          </Box>

          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 16,
              top: 16,
              color: 'text.disabled',
              '&:hover': { color: 'text.primary' },
            }}
          >
            <Iconify icon={"ph:x-bold" as any} width={20} />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ p: 0, maxHeight: 400 }}>
          {renderContent()}
        </DialogContent>

        <Divider />

        <DialogActions sx={{ px: 2.5, py: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => fetchReminders(true)}
            disabled={isRefreshing}
            startIcon={
              isRefreshing ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Iconify icon={"ph:arrow-clockwise-bold" as any} />
              )
            }
            sx={{ fontWeight: 700 }}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </DialogActions>
      </Dialog>

      <ReminderDialog
        open={!!editingReminder}
        onClose={() => setEditingReminder(null)}
        reminder={editingReminder}
        onSuccess={(msg) => {
          setEditingReminder(null);
          onSuccess?.(msg);
          fetchReminders(true);
        }}
        onError={onError}
      />
    </>
  );
}
