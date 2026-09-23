import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const renderCurrency = (amount: any, symbolFontSize: string = '15px') => {
  const formatted = fCurrency(amount);
  if (!formatted) return '—';
  const index = formatted.indexOf('₹');
  if (index !== -1) {
    return (
      <>
        {formatted.substring(0, index)}
        <span style={{ fontFamily: 'Arial', fontSize: symbolFontSize, display: 'inline-block', verticalAlign: 'baseline', lineHeight: 'normal' }}>₹</span>{' '}
        {formatted.substring(index + 1)}
      </>
    );
  }
  return formatted;
};

type Props = {
    open: boolean;
    onClose: () => void;
    entry: any;
};

export function SalesTargetEntryDetailsDialog({ open, onClose, entry }: Props) {
    if (!entry) return null;

    const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' => {
        switch (status) {
            case 'New': return 'info';
            case 'Confirmed': return 'success';
            case 'In Progress': return 'warning';
            case 'Completed': return 'success';
            case 'Hold': return 'warning';
            case 'Cancelled': return 'error';
            default: return 'default';
        }
    };

    const fmt = (val: any) => (val != null && val !== '') ? String(val) : '—';
    const fmtCurrency = (val: any) => (val != null && val !== '') ? renderCurrency(val) : '—';

    const readField = (
        label: string,
        value: any,
        icon?: string,
        opts?: { colSpan?: boolean; isCurrency?: boolean; multiline?: boolean }
    ) => (
        <Stack
            direction="row"
            spacing={2}
            alignItems={opts?.multiline ? 'flex-start' : 'center'}
            sx={{
                width: 1,
                ...(opts?.colSpan && { gridColumn: 'span 2' })
            }}
        >
            {icon && (
                <Box
                    sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 1.25,
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        ...(opts?.multiline && { mt: 0.5 })
                    }}
                >
                    <Iconify icon={icon as any} width={22} />
                </Box>
            )}
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.25 }}>
                    {label}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', whiteSpace: 'pre-wrap' }}>
                    {opts?.isCurrency ? fmtCurrency(value) : fmt(value)}
                </Typography>
            </Box>
        </Stack>
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            PaperProps={{ sx: { borderRadius: 2 } }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Sales Target Entry Details</Typography>
                <IconButton onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 4, px: 5 }}>

                <Stack spacing={3}>
                    {/* General Information */}
                    
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Target Information
                    </Typography>
                    
                    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                        {readField('Sales Person', entry.sales_person, 'solar:user-bold')}
                        {readField('Month', entry.month, 'solar:calendar-mark-bold')}
                        {readField('In Date', entry.in_date, 'solar:calendar-date-bold')}
                        {readField('Out Date', entry.out_date, 'solar:calendar-date-bold')}
                    </Box>

                    {/* Client Details */}
                    
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Client & Prospect Information
                    </Typography>

                    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                        {readField('Client Name', entry.contact_name, 'solar:users-group-rounded-bold')}
                        {readField('Contact Number', entry.contact_number, 'solar:phone-bold')}
                        {readField('Industry', entry.industry, 'solar:buildings-2-bold')}
                        {readField('Lead Source', entry.lead_source, 'solar:target-bold')}
                        {readField('Service', entry.service, 'solar:folder-open-bold')}
                        {readField('GST Type', entry.gst_type, 'solar:case-bold')}
                    </Box>

                    {/* Financial Values */}
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Financial Details
                    </Typography>
                    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                        {readField('Total Value', entry.value, 'solar:wad-of-money-bold', { isCurrency: true })}
                        {readField('Advance Payment', entry.advance, 'solar:wallet-money-bold', { isCurrency: true })}
                        {readField('Balance', entry.balance, 'solar:hand-money-bold', { isCurrency: true })}
                    </Box>

                    {/* Remarks */}
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Remarks
                    </Typography>
                    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: '1fr' }}>
                        {readField('Remarks', entry.remarks, 'solar:document-bold', { multiline: true })}
                    </Box>
                </Stack>
            </DialogContent>
        </Dialog>
    );
}
