import React from 'react';
import { FaLock, FaSyncAlt, FaMoneyBill, FaArrowRight, FaSortNumericUp } from 'react-icons/fa';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
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
    is_encashable,
    encashment_cycles,
    encashment_payout_months,
    encashment_rate_basis,
    encashment_component_name,
  } = row;

  let parsedCycles: any[] = [];
  if (encashment_cycles) {
    try {
      const parsed = JSON.parse(encashment_cycles);
      if (Array.isArray(parsed)) parsedCycles = parsed;
    } catch (e) {
      // ignore
    }
  }

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
                          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                          color: 'primary.main',
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

              {!!is_encashable && (
                  <>
                      <Divider sx={{ borderStyle: 'dashed' }} />
                      <Box>
                          <SectionHeader title="Encashment & Periodic Payout Rules" />
                          <Box
                              sx={{
                                  display: 'grid',
                                  gap: 3,
                                  gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                              }}
                          >
                              <DetailItem label="Is Encashable" value="Yes" icon={<FaMoneyBill size={18} />} />
                              <DetailItem label="Rate Basis" value={encashment_rate_basis || 'Gross / 26'} icon={<Iconify icon={"eva:pie-chart-2-fill" as any} width={18} />} />
                              <DetailItem label="Quota Source" value="Leave Allocation DocType" icon={<Iconify icon={"solar:calendar-bold" as any} width={18} />} />
                              <DetailItem label="Payout Month(s)" value={encashment_payout_months || '-'} icon={<Iconify icon={"solar:calendar-date-bold" as any} width={18} />} />
                              {encashment_component_name && (
                                  <DetailItem label="Custom Component Name" value={encashment_component_name} icon={<Iconify icon={"solar:tag-bold" as any} width={18} />} />
                              )}
                          </Box>

                          {parsedCycles.length > 0 && (
                              <Box sx={{ mt: 2.5, p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04), borderRadius: 1.5, border: 1, borderColor: 'primary.light' }}>
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
                                      CONFIGURED ENCASHMENT CYCLES:
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                      {parsedCycles.map((c: any, idx: number) => {
                                          const pMonths = c.payout_months || (c.payout_month ? [c.payout_month] : []);
                                          return (
                                              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                                  <Chip label={`Cycle ${idx + 1}`} size="small" sx={{ fontWeight: 700, borderRadius: '6px' }} />
                                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                      {c.from_month || 'January'} &rarr; {c.to_month || 'June'}
                                                  </Typography>
                                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                      (Payout in:
                                                  </Typography>
                                                  {pMonths.map((m: string) => (
                                                      <Chip
                                                          key={m}
                                                          label={m}
                                                          size="small"
                                                          sx={{
                                                              bgcolor: '#00875a',
                                                              color: '#ffffff',
                                                              fontWeight: 600,
                                                              borderRadius: '16px',
                                                              height: 22,
                                                              fontSize: '0.75rem',
                                                          }}
                                                      />
                                                  ))}
                                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                      )
                                                  </Typography>
                                              </Box>
                                          );
                                      })}
                                  </Box>
                              </Box>
                          )}
                      </Box>
                  </>
              )}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                    color: 'primary.main',
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
