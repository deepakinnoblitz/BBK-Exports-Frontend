import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Dialog from '@mui/material/Dialog';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { fetchRosterHistory } from 'src/api/shift-roster';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: VoidFunction;
  rosterId?: string | null;
  employee?: string | null;
};

export function ShiftRosterHistoryDialog({ open, onClose, rosterId, employee }: Props) {
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open, rosterId, employee]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await fetchRosterHistory({
        roster_id: rosterId || undefined,
        employee: employee || undefined,
      });
      setHistoryList(res || []);
    } catch (err) {
      console.error('Failed to load roster history', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return '-';
    return dayjs(d).format('DD-MMM-YYYY');
  };

  const formatDateTime = (dt?: string) => {
    if (!dt) return '-';
    return dayjs(dt).format('DD-MMM-YYYY hh:mm A');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: (themeVar: any) => themeVar.customShadows?.z24,
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          px: 3,
          py: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Shift Assignment History & Audit
          </Typography>
        </Stack>

        <IconButton
          onClick={onClose}
          sx={{
            color: 'text.disabled',
            '&:hover': {
              color: 'text.primary',
              bgcolor: (theme) => alpha(theme.palette.grey[500], 0.12),
            },
          }}
        >
          <Iconify icon="mingcute:close-line" width={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, mt: 1 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#08a3cd' }} />
          </Box>
        ) : historyList.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <Typography variant="body1">No history logs found for this assignment.</Typography>
          </Box>
        ) : (
          <TableContainer
            component={Scrollbar}
            sx={{
              maxHeight: 400,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              borderRadius: 1.5,
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: 'background.neutral', fontWeight: 700 }}>Employee</TableCell>
                  <TableCell sx={{ bgcolor: 'background.neutral', fontWeight: 700 }}>Effective Period</TableCell>
                  <TableCell sx={{ bgcolor: 'background.neutral', fontWeight: 700 }}>Shift Change</TableCell>
                  <TableCell sx={{ bgcolor: 'background.neutral', fontWeight: 700 }}>Source</TableCell>
                  <TableCell sx={{ bgcolor: 'background.neutral', fontWeight: 700 }}>Changed By</TableCell>
                  <TableCell sx={{ bgcolor: 'background.neutral', fontWeight: 700 }}>Changed At</TableCell>
                  <TableCell sx={{ bgcolor: 'background.neutral', fontWeight: 700 }}>Reason</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyList.map((row) => (
                  <TableRow key={row.name} hover>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{row.employee_name || row.employee}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{row.employee}</Typography>
                    </TableCell>

                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography variant="body2">
                        {formatDate(row.effective_from)}
                        {row.effective_to && row.effective_to !== row.effective_from ? ` → ${formatDate(row.effective_to)}` : ''}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" sx={{ color: row.previous_shift ? 'text.secondary' : 'text.disabled' }}>
                          {row.previous_shift || 'None'}
                        </Typography>
                        <Iconify icon={"solar:arrow-right-linear" as any} width={14} sx={{ color: 'text.disabled' }} />
                        <Typography variant="subtitle2" sx={{ color: row.new_shift ? 'success.main' : 'error.main', fontWeight: 600 }}>
                          {row.new_shift || 'Cancelled'}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Label variant="soft" color="info">
                        {row.source || 'MANUAL'}
                      </Label>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">{row.changed_by}</Typography>
                    </TableCell>

                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {formatDateTime(row.changed_at)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 200 }}>
                        {row.reason || '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
    </Dialog>
  );
}
