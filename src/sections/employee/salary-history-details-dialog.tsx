import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';

import { fDate } from 'src/utils/format-time';
import { fNumber } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

type ComponentChangeItem = {
    component: string;
    category?: 'Earning' | 'Deduction' | string;
    change_type: 'added' | 'removed' | 'modified' | string;
    old_amount?: number;
    new_amount?: number;
    diff?: number;
};

type Props = {
    open: boolean;
    onClose: () => void;
    historyItem: any | null;
    currencySymbol?: string;
    locale?: string;
};

export function SalaryHistoryDetailsDialog({
    open,
    onClose,
    historyItem,
    currencySymbol = '₹',
    locale = 'en-IN',
}: Props) {
    if (!historyItem) return null;

    let componentList: ComponentChangeItem[] = [];
    if (historyItem.component_details) {
        try {
            if (typeof historyItem.component_details === 'string') {
                componentList = JSON.parse(historyItem.component_details);
            } else if (Array.isArray(historyItem.component_details)) {
                componentList = historyItem.component_details;
            }
        } catch {
            componentList = [];
        }
    }

    const ctcDiff = (historyItem.new_ctc || 0) - (historyItem.previous_ctc || 0);
    const isCtcChanged = ctcDiff !== 0;

    const netDiff = (historyItem.new_net_salary || 0) - (historyItem.previous_net_salary || 0);
    const isNetChanged = netDiff !== 0;

    // Fallback parsed string parts if no structured JSON details
    const textSummaryParts =
        !componentList.length && historyItem.changed_components
            ? historyItem.changed_components.split(',').map((p: string) => p.trim()).filter(Boolean)
            : [];

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2.5,
                    boxShadow: (theme) => `0 16px 40px ${alpha(theme.palette.common.black, 0.16)}`,
                },
            }}
        >
            {/* Header */}
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pb: 1.5,
                    pt: 2.5,
                    px: 3,
                    borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                }}
            >
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        Salary Revision Breakdown
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                        <Iconify icon="solar:calendar-date-bold" width={14} />
                        {historyItem.changed_at ? fDate(historyItem.changed_at, 'DD-MM-YYYY hh:mm A') : '-'}
                        <Box component="span" sx={{ mx: 0.5 }}>•</Box>
                        <Iconify icon="solar:user-bold" width={14} />
                        Changed By: <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>{historyItem.changed_by_name || historyItem.changed_by || 'HR'}</Box>
                    </Typography>
                </Box>
                <IconButton
                    onClick={onClose}
                    size="small"
                    sx={{
                        color: (theme) => theme.palette.grey[600],
                        bgcolor: 'action.hover',
                        '&:hover': { bgcolor: 'action.selected' },
                    }}
                >
                    <Iconify icon="mingcute:close-line" width={18} />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ my: 2.5, mx: 1 }}>
                <Stack spacing={3}>
                    {/* Top Stats Overview */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                            gap: 2,
                        }}
                    >
                        {/* CTC Card */}
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                border: (theme) => `1px solid ${theme.palette.divider}`,
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.03),
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5 }}>
                                    Annual CTC Revision
                                </Typography>
                                <Label variant="soft" color={isCtcChanged ? (ctcDiff > 0 ? 'success' : 'error') : 'default'} sx={{ height: 22, fontSize: '0.72rem' }}>
                                    {isCtcChanged
                                        ? (ctcDiff > 0 ? `+${currencySymbol}${fNumber(ctcDiff, { locale })}` : `-${currencySymbol}${fNumber(Math.abs(ctcDiff), { locale })}`)
                                        : 'UNCHANGED'}
                                </Label>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {isCtcChanged ? (
                                    <>
                                        <Typography variant="body2" sx={{ color: 'text.disabled', textDecoration: 'line-through' }}>
                                            {currencySymbol}{fNumber(historyItem.previous_ctc || 0, { locale })}
                                        </Typography>
                                        <Iconify icon={"solar:arrow-right-outline" as any} width={16} sx={{ color: 'text.disabled' }} />
                                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: ctcDiff > 0 ? 'success.main' : 'error.main' }}>
                                            {currencySymbol}{fNumber(historyItem.new_ctc || 0, { locale })}
                                        </Typography>
                                    </>
                                ) : (
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                        {currencySymbol}{fNumber(historyItem.new_ctc || 0, { locale })}
                                    </Typography>
                                )}
                            </Box>
                        </Box>

                        {/* Net Salary Card */}
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                border: (theme) => `1px solid ${theme.palette.divider}`,
                                bgcolor: (theme) => alpha(theme.palette.success.main, 0.03),
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5 }}>
                                    Monthly Net Salary Revision
                                </Typography>
                                <Label variant="soft" color={isNetChanged ? (netDiff > 0 ? 'success' : 'error') : 'default'} sx={{ height: 22, fontSize: '0.72rem' }}>
                                    {isNetChanged
                                        ? (netDiff > 0 ? `+${currencySymbol}${fNumber(netDiff, { locale })}` : `-${currencySymbol}${fNumber(Math.abs(netDiff), { locale })}`)
                                        : 'UNCHANGED'}
                                </Label>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {isNetChanged ? (
                                    <>
                                        <Typography variant="body2" sx={{ color: 'text.disabled', textDecoration: 'line-through' }}>
                                            {currencySymbol}{fNumber(historyItem.previous_net_salary || 0, { locale })}
                                        </Typography>
                                        <Iconify icon={"solar:arrow-right-outline" as any} width={16} sx={{ color: 'text.disabled' }} />
                                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: netDiff > 0 ? 'success.main' : 'error.main' }}>
                                            {currencySymbol}{fNumber(historyItem.new_net_salary || 0, { locale })}
                                        </Typography>
                                    </>
                                ) : (
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                        {currencySymbol}{fNumber(historyItem.new_net_salary || 0, { locale })}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </Box>

                    {/* Reason / Remarks */}
                    {historyItem.reason && (
                        <Box sx={{ p: 1.5, px: 2, borderRadius: 1.5, bgcolor: 'action.hover', border: (theme) => `1px dashed ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 1.25 }}>
                            <Iconify icon={"solar:chat-round-line-bold" as any} width={18} sx={{ color: 'text.secondary' }} />
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                <Box component="span" sx={{ fontWeight: 700, color: 'text.primary', mr: 0.5 }}>Remarks:</Box>
                                {historyItem.reason}
                            </Typography>
                        </Box>
                    )}

                    <Divider sx={{ borderStyle: 'dashed' }} />

                    {/* Component-level Breakdown */}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Iconify icon={"solar:checklist-minimalistic-bold" as any} width={20} sx={{ color: 'primary.main' }} />
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                    Component Modifications
                                </Typography>
                            </Box>
                            {componentList.length > 0 && (
                                <Label variant="soft" color="primary" sx={{ fontWeight: 600 }}>
                                    {componentList.length} {componentList.length === 1 ? 'component' : 'components'} modified
                                </Label>
                            )}
                        </Box>

                        {componentList.length > 0 ? (
                            <TableContainer
                                sx={{
                                    borderRadius: 2,
                                    border: (theme) => `1px solid ${theme.palette.divider}`,
                                    overflow: 'hidden',
                                }}
                            >
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04) }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', py: 1.5 }}>Component</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', py: 1.5 }}>Category</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', py: 1.5 }}>Status</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', py: 1.5, textAlign: 'right' }}>Previous</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', py: 1.5, textAlign: 'right' }}>New</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', py: 1.5, textAlign: 'right' }}>Difference</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {componentList.map((item, idx) => {
                                            const isAdded = item.change_type === 'added';
                                            const isRemoved = item.change_type === 'removed';
                                            const diffVal = item.diff ?? ((item.new_amount || 0) - (item.old_amount || 0));
                                            const isPositive = diffVal > 0;

                                            return (
                                                <TableRow key={idx} hover sx={{ '& td': { py: 1.5 } }}>
                                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                                                        {item.component}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Label
                                                            variant="soft"
                                                            color={item.category === 'Earning' ? 'success' : 'warning'}
                                                            sx={{ height: 22, fontSize: '0.72rem' }}
                                                        >
                                                            {item.category || 'Component'}
                                                        </Label>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Label
                                                            variant="soft"
                                                            color={isAdded ? 'success' : isRemoved ? 'error' : 'info'}
                                                            sx={{ height: 22, fontSize: '0.72rem', textTransform: 'capitalize' }}
                                                        >
                                                            {item.change_type || 'Modified'}
                                                        </Label>
                                                    </TableCell>
                                                    <TableCell sx={{ textAlign: 'right', color: isAdded ? 'text.disabled' : 'text.primary', fontWeight: 600 }}>
                                                        {isAdded ? '-' : `${currencySymbol}${fNumber(item.old_amount || 0, { locale })}`}
                                                    </TableCell>
                                                    <TableCell sx={{ textAlign: 'right', color: isRemoved ? 'text.disabled' : 'text.primary', fontWeight: 700 }}>
                                                        {isRemoved ? '-' : `${currencySymbol}${fNumber(item.new_amount || 0, { locale })}`}
                                                    </TableCell>
                                                    <TableCell sx={{ textAlign: 'right' }}>
                                                        <Label
                                                            variant="soft"
                                                            color={isPositive ? 'success' : diffVal < 0 ? 'error' : 'default'}
                                                            sx={{ height: 22, fontSize: '0.72rem' }}
                                                        >
                                                            {diffVal > 0
                                                                ? `+${currencySymbol}${fNumber(diffVal, { locale })}`
                                                                : diffVal < 0
                                                                    ? `-${currencySymbol}${fNumber(Math.abs(diffVal), { locale })}`
                                                                    : `${currencySymbol}0`}
                                                        </Label>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : textSummaryParts.length > 0 ? (
                            <Stack spacing={1}>
                                {textSummaryParts.map((part: string, idx: number) => (
                                    <Box
                                        key={idx}
                                        sx={{
                                            p: 1.5,
                                            px: 2,
                                            borderRadius: 1.5,
                                            border: (theme) => `1px solid ${theme.palette.divider}`,
                                            bgcolor: 'background.neutral',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                            {part}
                                        </Typography>
                                        <Label variant="soft" color="info">
                                            Recorded change
                                        </Label>
                                    </Box>
                                ))}
                            </Stack>
                        ) : (
                            <Box
                                sx={{
                                    py: 4,
                                    textAlign: 'center',
                                    borderRadius: 2,
                                    border: (theme) => `1px dashed ${theme.palette.divider}`,
                                    bgcolor: 'action.hover',
                                }}
                            >
                                <Iconify icon={"solar:document-text-outline" as any} width={36} sx={{ color: 'text.disabled', mb: 1, opacity: 0.6 }} />
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    Direct CTC / Net Salary revision recorded. No individual component changes specified.
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Stack>
            </DialogContent>
        </Dialog>
    );
}
