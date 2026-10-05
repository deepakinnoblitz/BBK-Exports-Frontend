import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { fNumber } from 'src/utils/format-number';

import { getWagesReconciliationStatement } from 'src/api/salary-slips';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    startDate?: string | null;
    endDate?: string | null;
};

export function SalarySlipReconciliationDialog({ open, onClose, startDate, endDate }: Props) {
    const [loading, setLoading] = useState(false);
    const [recon, setRecon] = useState<any>(null);

    useEffect(() => {
        if (!open) return;
        const fetchReconciliation = async () => {
            try {
                setLoading(true);
                const sDate = startDate || new Date().toISOString().slice(0, 10);
                const eDate = endDate || new Date().toISOString().slice(0, 10);
                const res = await getWagesReconciliationStatement(sDate, eDate);
                setRecon(res);
            } catch (err) {
                console.error('Failed to fetch reconciliation statement:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchReconciliation();
    }, [open, startDate, endDate]);

    const formatDelta = (val: number) => {
        const isPositive = val > 0;
        const color = isPositive ? 'success.main' : val < 0 ? 'error.main' : 'text.secondary';
        const sign = isPositive ? '+' : '';
        return (
            <Typography variant="subtitle2" component="span" sx={{ color, fontWeight: 700 }}>
                {sign}{fNumber(val)}
            </Typography>
        );
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                        sx={{
                            width: 38,
                            height: 38,
                            borderRadius: 1.5,
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                            color: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Iconify icon="solar:chart-2-bold-duotone" width={22} />
                    </Box>
                    <Box>
                        <Typography variant="h6">Wages Reconciliation Statement</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {recon ? `${recon.current_period} vs ${recon.previous_period}` : 'Month-on-Month Variance Analysis'}
                        </Typography>
                    </Box>
                </Stack>
            </DialogTitle>

            <DialogContent dividers sx={{ py: 2.5 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                        <CircularProgress sx={{ color: 'primary.main' }} />
                    </Box>
                ) : !recon ? (
                    <Typography variant="body2" sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                        No reconciliation data found for the selected period.
                    </Typography>
                ) : (
                    <Stack spacing={3}>
                        {/* Summary Metrics Cards */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                            <Card sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.info.main, 0.04), border: (theme) => `1px solid ${alpha(theme.palette.info.main, 0.15)}` }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                    OPERATOR HEADCOUNT
                                </Typography>
                                <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 0.5 }}>
                                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                                        {recon.current_headcount}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        (Prev: {recon.previous_headcount})
                                    </Typography>
                                </Stack>
                                <Box sx={{ mt: 0.5 }}>
                                    Net Delta: {formatDelta(recon.headcount_delta)}
                                </Box>
                            </Card>

                            <Card sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.success.main, 0.04), border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.15)}` }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                    TOTAL GROSS WAGES
                                </Typography>
                                <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 0.5 }}>
                                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                                        ₹{fNumber(recon.current_total_gross)}
                                    </Typography>
                                </Stack>
                                <Box sx={{ mt: 0.5 }}>
                                    Variance: {formatDelta(recon.gross_delta)}
                                </Box>
                            </Card>

                            <Card sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04), border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.15)}` }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                    TOTAL NET PAYOUT (BANK)
                                </Typography>
                                <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 0.5 }}>
                                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                                        ₹{fNumber(recon.current_total_net)}
                                    </Typography>
                                </Stack>
                                <Box sx={{ mt: 0.5 }}>
                                    Variance: {formatDelta(recon.net_delta)}
                                </Box>
                            </Card>
                        </Box>

                        {/* Overtime Variance */}
                        <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2">Total Overtime (OT) Pay Variance:</Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                {formatDelta(recon.ot_variance)}
                            </Typography>
                        </Box>

                        {/* New Additions Table */}
                        {recon.new_additions?.length > 0 && (
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'success.main' }}>
                                    New Joinees / Additions ({recon.new_additions.length})
                                </Typography>
                                <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: 1 }}>
                                    <Scrollbar>
                                        <Table size="small">
                                            <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Gross (₹)</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Net Pay (₹)</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {recon.new_additions.map((row: any) => (
                                                    <TableRow key={row.name}>
                                                        <TableCell>{row.employee}</TableCell>
                                                        <TableCell>{row.employee_name}</TableCell>
                                                        <TableCell align="right">₹{fNumber(row.grand_gross_pay || row.gross_pay)}</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 600 }}>₹{fNumber(row.grand_net_pay || row.net_pay)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </Scrollbar>
                                </TableContainer>
                            </Box>
                        )}
                    </Stack>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} variant="outlined" color="inherit">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}
