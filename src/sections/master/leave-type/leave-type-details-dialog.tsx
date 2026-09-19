import React from 'react';
import { FaMoneyBill, FaSortNumericUp, FaArrowRight, FaSyncAlt, FaLock } from 'react-icons/fa';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

type Props = {
  open: boolean;
  onClose: () => void;
  row: any;
};

export function LeaveTypeDetailsDialog({ open, onClose, row }: Props) {
  const {
    leave_type_name,
    is_paid,
    is_permission,
    max_leaves,
    status,
    carry_forward,
    reset_frequency,
    restrict_during_probation,
    allocation_basis,
    min_present_days,
    days_worked_per_leave,
    count_half_day_as,
    include_approved_paid_leaves,
  } = row;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar: any) => themeVar.customShadows.z24, } }}>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Leave Type Details</Typography>
          <IconButton onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
              <Iconify icon="mingcute:close-line" />
          </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 4, m: 2, mt: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                  <Box
                      sx={{
                          width: 80,
                          height: 80,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'info.lighter',
                          color: 'info.main',
                      }}
                  >
                      <Iconify icon="solar:calendar-bold" width={40} />
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h5" sx={{ fontWeight: 800 }}>{leave_type_name}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                      <Label
                          variant="soft"
                          color={status === 'Active' ? 'success' : 'error'}
                      >
                          {status || 'Unknown'}
                      </Label>
                  </Box>
              </Box>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Box>
                  <SectionHeader title="Leave Type Information" />
                  <Box
                      sx={{
                          display: 'grid',
                          gap: 3,
                          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                      }}
                  >
                      <DetailItem label="Is Paid" value={is_paid ? 'Yes' : 'No'} icon={<FaMoneyBill size={18} />} />
                      <DetailItem label="Is Permission" value={is_permission ? 'Yes' : 'No'} icon={<Iconify icon={"solar:clock-circle-bold" as any} width={18} />} />
                      <DetailItem label="Max Leaves" value={max_leaves ?? '-'} icon={<FaSortNumericUp size={18} />} />
                      <DetailItem label="Carry Forward" value={carry_forward ? 'Yes' : 'No'} icon={<FaArrowRight size={18} />} />
                      <DetailItem label="Reset Frequency" value={reset_frequency || '-'} icon={<FaSyncAlt size={18} />} />
                      <DetailItem label="Restrict During Probation" value={restrict_during_probation ? 'Yes' : 'No'} icon={<FaLock size={18} />} />
                      <DetailItem label="Allocation Basis" value={allocation_basis || 'Fixed / Unconditional'} icon={<Iconify icon={"solar:calendar-bold" as any} width={18} />} />
                      {allocation_basis === 'Minimum Present Days' && (
                          <DetailItem label="Min Present Days" value={min_present_days ?? '-'} icon={<Iconify icon={"eva:checkmark-circle-2-fill" as any} width={18} />} />
                      )}
                      {allocation_basis === 'Per N Days Worked' && (
                          <DetailItem label="Days Worked / Leave" value={days_worked_per_leave ?? 20} icon={<Iconify icon={"eva:pie-chart-2-fill" as any} width={18} />} />
                      )}
                      {allocation_basis && allocation_basis !== 'Fixed / Unconditional' && (
                          <>
                              <DetailItem label="Half Day Count" value={count_half_day_as || '0.5 Day'} icon={<Iconify icon={"solar:clock-circle-bold" as any} width={18} />} />
                              <DetailItem label="Include Paid Leaves" value={include_approved_paid_leaves ? 'Yes' : 'No'} icon={<Iconify icon={"solar:shield-check-bold" as any} width={18} />} />
                          </>
                      )}
                  </Box>
              </Box>
          </Box>
      </DialogContent>
    </Dialog>
  );
}

function SectionHeader({ title, noMargin = false }: { title: string, noMargin?: boolean }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: noMargin ? 0 : 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '14px' }}>
                {title}
            </Typography>
        </Box>
    );
}

function DetailItem({ label, value, icon }: { label: string; value?: React.ReactNode; icon: React.ReactNode }) {
    const theme = useTheme();
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 50,
                    height: 50,
                    borderRadius: 1.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: 'info.main',
                    flexShrink: 0,
                }}
            >
                {icon}
            </Box>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', display: 'block', mb: 0.5, fontSize: 11 }}>
                    {label}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {value || '-'}
                </Typography>
            </Box>
        </Box>
    );
}
