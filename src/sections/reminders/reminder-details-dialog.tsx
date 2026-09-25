import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type Props = {
  row: any;
  open: boolean;
  onClose: VoidFunction;
};

const AVATAR_COLORS = ['#00A5D1', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#06B6D4'];

const stringToColor = (string: string) => {
  let hash = 0;
  for (let i = 0; i < string.length; i += 1) {
    // eslint-disable-next-line no-bitwise
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export function HRReminderDetailDialog({ row, open, onClose }: Props) {
  const theme = useTheme();

  if (!row) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24, } }}>
      <DialogTitle sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>Reminder Details</Typography>
        <IconButton
            onClick={onClose}
            sx={{ 
                width: 36, 
                height: 36, 
                border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.2)}`,
                '&:hover': { bgcolor: 'action.hover' }
            }}
        >
          <Iconify icon="mingcute:close-line" width={20} />
        </IconButton>
      </DialogTitle>
      
      <Divider />

      <DialogContent sx={{ py: 2 }}>
        <Scrollbar sx={{ maxHeight: 600 }}>
          <Stack spacing={4} sx={{ p: 3 }}>
            
            {/* Header Section */}
            <Stack direction="row" alignItems="center" spacing={2} sx={{ position: 'relative' }}>
                <Box sx={{ 
                    width: 64, 
                    height: 64, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    borderRadius: 2, 
                    bgcolor: alpha('#00A5D1', 0.1),
                    color: '#00A5D1',
                    boxShadow: `0 8px 16px ${alpha('#00A5D1', 0.16)}`
                }}>
                    <Iconify icon="solar:bell-bing-bold-duotone" width={32} />
                </Box>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Organizational Alert</Typography>
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 0.5 }}>
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'text.secondary' }}>
                            <Iconify icon="solar:calendar-add-bold" width={14} sx={{ color: 'text.disabled' }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                Created: { (row.creation || row.created_at) ? (dayjs(row.creation || row.created_at).isValid() ? fDateTime(row.creation || row.created_at) : dayjs(row.creation || row.created_at).format('DD MMM YYYY h:mm a')) : '-'}
                            </Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'text.secondary' }}>
                            <Iconify icon={"solar:pen-new-square-bold" as any} width={14} sx={{ color: 'text.disabled' }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                Modified: {row.modified ? (dayjs(row.modified).isValid() ? fDateTime(row.modified) : dayjs(row.modified).format('DD MMM YYYY h:mm a')) : '-'}
                            </Typography>
                        </Stack>
                    </Stack>
                </Box>
                <Label variant="soft" color="info" sx={{ position: 'absolute', right: 0, top: 0 }}>
                    SCHEDULED
                </Label>
            </Stack>

            <Divider sx={{ borderStyle: 'dashed' }} />

            {/* Information Section */}
            <Stack spacing={2.5}>
                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                    REMINDER INFORMATION
                </Typography>
                
                <Stack 
                    direction="row" 
                    spacing={3} 
                    divider={<Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />}
                    sx={{ p: 3, bgcolor: alpha(theme.palette.primary.main, 0.04), borderRadius: 2, border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}
                >
                    <Stack spacing={1} sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Iconify icon="solar:clock-circle-bold" width={16} sx={{ color: '#00A5D1' }} /> TRIGGER TIME
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, pl: 0.5 }}>
                            {row.trigger_time ? dayjs(`2000-01-01 ${row.trigger_time}`).format('h:mm a') : '-'}
                        </Typography>
                    </Stack>

                    <Stack spacing={1} sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Iconify icon="solar:users-group-rounded-bold" width={16} sx={{ color: '#10B981' }} /> TARGET TYPE
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, pl: 0.5 }}>
                            {row.is_global ? 'Global (All Employees)' : 'Specific Group'}
                        </Typography>
                    </Stack>
                </Stack>
            </Stack>

            {/* Message Section */}
            <Stack spacing={1.5}>
                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                    MESSAGE CONTENT
                </Typography>
                <Box sx={{ p: 3, bgcolor: alpha(theme.palette.primary.main, 0.04), borderRadius: 2, border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.6 }}>
                        {row.message}
                    </Typography>
                </Box>
            </Stack>

            {/* Recipients Section */}
            {!row.is_global && (
              <Stack spacing={2}>
                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                    RECIPIENTS ({row.selected_employees?.length || 0})
                </Typography>
                <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
                    gap: 1.5 
                }}>
                  {row.selected_employees?.map((emp: any) => (
                    <Stack 
                        key={emp.id} 
                        direction="row" 
                        alignItems="center" 
                        spacing={1.5} 
                        sx={{ 
                            p: 1.5, 
                            borderRadius: 1.5, 
                            border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                            bgcolor: 'background.paper'
                        }}
                    >
                      <Avatar 
                        sx={{ 
                            width: 32, 
                            height: 32, 
                            fontSize: 11, 
                            fontWeight: 700,
                            bgcolor: stringToColor(emp.name) 
                        }}
                      >
                        {emp.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', fontSize: 13 }} noWrap>
                            {emp.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 800, }}>
                            {emp.id}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Box>
              </Stack>
            )}

          </Stack>
        </Scrollbar>
      </DialogContent>
    </Dialog>
  );
}
