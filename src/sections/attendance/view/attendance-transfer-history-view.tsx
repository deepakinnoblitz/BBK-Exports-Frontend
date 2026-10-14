import type {
    AttendanceTransferBatch} from 'src/api/attendance-transfer';

import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import Snackbar from '@mui/material/Snackbar';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { DashboardContent } from 'src/layouts/dashboard';
import {
    revertAttendanceTransfer,
    getAttendanceTransferHistory,
    getAttendanceTransferDetails
} from 'src/api/attendance-transfer';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

import { AttendanceTransferDetailsDialog } from '../attendance-transfer-details-dialog';

export function AttendanceTransferHistoryView() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Super Admin Check
    const hasHR = user?.roles?.some((role: string) => ['HR', 'HR Manager'].includes(role));
    const hasSystemManager = user?.roles?.some((role: string) => ['System Manager', 'Administrator'].includes(role));
    const isSuperAdmin = (hasHR && hasSystemManager) || user?.roles?.includes('Administrator');

    // Filter states
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Data states
    const [loading, setLoading] = useState(false);
    const [batches, setBatches] = useState<AttendanceTransferBatch[]>([]);
    const [total, setTotal] = useState(0);

    // Detail dialog state
    const [selectedBatch, setSelectedBatch] = useState<AttendanceTransferBatch | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    // Revert dialog state
    const [revertOpen, setRevertOpen] = useState(false);
    const [revertTarget, setRevertTarget] = useState<AttendanceTransferBatch | null>(null);
    const [revertReason, setRevertReason] = useState('');
    const [revertLoading, setRevertLoading] = useState(false);

    // Feedback
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
        open: false,
        message: '',
        severity: 'info'
    });

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAttendanceTransferHistory({
                page: page + 1,
                pageSize: rowsPerPage,
                search: search || undefined,
                status: statusFilter || undefined
            });
            setBatches(res.data || []);
            setTotal(res.total || 0);
        } catch (err: any) {
            setSnackbar({ open: true, message: err.message || 'Failed to load transfer history', severity: 'error' });
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, search, statusFilter]);

    useEffect(() => {
        if (isSuperAdmin) {
            fetchHistory();
        }
    }, [isSuperAdmin, fetchHistory]);

    // Handle view details
    const handleViewDetails = async (batch: AttendanceTransferBatch) => {
        try {
            const fullDetails = await getAttendanceTransferDetails(batch.name);
            setSelectedBatch(fullDetails);
            setDetailsOpen(true);
        } catch (err: any) {
            setSnackbar({ open: true, message: err.message || 'Failed to load batch details', severity: 'error' });
        }
    };

    // Handle Revert
    const handleOpenRevert = (batch: AttendanceTransferBatch) => {
        setRevertTarget(batch);
        setRevertReason('');
        setRevertOpen(true);
    };

    const handleConfirmRevert = async () => {
        if (!revertTarget || !revertReason.trim()) return;

        setRevertLoading(true);
        try {
            const res = await revertAttendanceTransfer({
                transferId: revertTarget.name,
                revertReason: revertReason.trim()
            });

            setRevertOpen(false);
            setSnackbar({ open: true, message: res.message || 'Transfer reverted successfully', severity: 'success' });
            fetchHistory();
        } catch (err: any) {
            setSnackbar({ open: true, message: err.message || 'Failed to revert transfer', severity: 'error' });
        } finally {
            setRevertLoading(false);
        }
    };

    if (!isSuperAdmin) {
        return (
            <DashboardContent maxWidth={false} sx={{ mt: 3 }}>
                <Card sx={{ p: 4, textAlign: 'center' }}>
                    <Iconify icon={"solar:shield-warning-bold-duotone" as any} width={64} sx={{ color: 'error.main', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>
                        Access Restricted to Super Admin
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto', mb: 3 }}>
                        Only users with both <strong>HR</strong> and <strong>System Manager</strong> roles can access the Attendance Transfer Audit & History.
                    </Typography>
                    <Button variant="contained" onClick={() => navigate('/attendance')}>
                        Back to Attendance
                    </Button>
                </Card>
            </DashboardContent>
        );
    }

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            {/* Header */}
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
                <Box>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: 1.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: '#7928CA',
                                color: 'common.white'
                            }}
                        >
                            <Iconify icon={"solar:history-bold-duotone" as any} width={26} />
                        </Box>
                        <Box>
                            <Typography variant="h4" fontWeight={700}>
                                Attendance Transfer History
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Super Admin tracking, verification, and audit trail of Sunday & non-working day adjustments
                            </Typography>
                        </Box>
                    </Stack>
                </Box>

                <Stack direction="row" spacing={1.5}>
                    <Button
                        variant="contained"
                        startIcon={<Iconify icon={"solar:transfer-horizontal-bold-duotone" as any} />}
                        onClick={() => navigate('/attendance/transfer')}
                        sx={{
                            bgcolor: '#7928CA',
                            color: 'common.white',
                            textTransform: 'none',
                            fontWeight: 600,
                            '&:hover': { bgcolor: '#611f9f' }
                        }}
                    >
                        New Transfer
                    </Button>
                    <Button
                        variant="outlined"
                        color="inherit"
                        startIcon={<Iconify icon={"solar:arrow-left-bold" as any} />}
                        onClick={() => navigate('/attendance')}
                        sx={{ textTransform: 'none' }}
                    >
                        Back to Attendance
                    </Button>
                </Stack>
            </Stack>

            {/* Filter Bar */}
            <Card sx={{ p: 2.5, mb: 3 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                    <TextField
                        fullWidth
                        placeholder="Search by Transfer ID, Super Admin name, or reason..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(0);
                        }}
                        InputProps={{
                            startAdornment: <Iconify icon={"solar:magnifer-bold" as any} sx={{ color: 'text.disabled', mr: 1 }} />
                        }}
                    />

                    <TextField
                        select
                        label="Status"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(0);
                        }}
                        sx={{ minWidth: 180 }}
                    >
                        <MenuItem value="">All Statuses</MenuItem>
                        <MenuItem value="Submitted">Completed</MenuItem>
                        <MenuItem value="Reverted">Reverted</MenuItem>
                    </TextField>

                    <Button
                        variant="outlined"
                        onClick={fetchHistory}
                        startIcon={<Iconify icon={"solar:refresh-bold" as any} />}
                        sx={{ height: 54, px: 3, minWidth: 120 }}
                    >
                        Refresh
                    </Button>
                </Stack>
            </Card>

            {/* History Table Card */}
            <Card sx={{ p: 2 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress />
                    </Box>
                ) : batches.length === 0 ? (
                    <Alert severity="info" sx={{ my: 2 }}>
                        No attendance transfer history found. You can perform a new transfer using the <strong>New Transfer</strong> button above.
                    </Alert>
                ) : (
                    <>
                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                            <Table size="medium">
                                <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? '#f4f6f8' : 'background.neutral' }}>
                                    <TableRow>
                                        <TableCell>Transfer Batch</TableCell>
                                        <TableCell>Date Mapping</TableCell>
                                        <TableCell align="center">Employees</TableCell>
                                        <TableCell>Transferred By</TableCell>
                                        <TableCell>Remarks</TableCell>
                                        <TableCell align="center">Status</TableCell>
                                        <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {batches.map((batch) => {
                                        const isReverted = batch.status === 'Reverted';
                                        return (
                                            <TableRow key={batch.name} hover>
                                                <TableCell>
                                                    <Typography variant="subtitle2" fontWeight={700}>
                                                        {batch.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {dayjs(batch.transfer_datetime).format('DD MMM YYYY, hh:mm A')}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <Typography variant="body2" fontWeight={600}>
                                                            {dayjs(batch.source_date).format('DD MMM')}
                                                        </Typography>
                                                        <Iconify icon={"solar:arrow-right-bold" as any} width={16} sx={{ color: 'text.secondary' }} />
                                                        <Typography variant="body2" fontWeight={600} color="primary.main">
                                                            {dayjs(batch.target_date).format('DD MMM YYYY')}
                                                        </Typography>
                                                    </Stack>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {dayjs(batch.source_date).format('dddd')} ➔ {dayjs(batch.target_date).format('dddd')}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={`${batch.total_employees} Employees`}
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                        sx={{ fontWeight: 600 }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{batch.transferred_by_name || batch.transferred_by}</Typography>
                                                    <Typography variant="caption" color="text.secondary">Super Admin</Typography>
                                                </TableCell>
                                                <TableCell sx={{ maxWidth: 220 }}>
                                                    <Tooltip title={batch.reason} arrow>
                                                        <Typography variant="body2" noWrap>
                                                            {batch.reason}
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={isReverted ? 'Reverted' : 'Completed'}
                                                        color={isReverted ? 'error' : 'success'}
                                                        size="small"
                                                        sx={{ fontWeight: 600 }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            startIcon={<Iconify icon={"solar:eye-bold" as any} />}
                                                            onClick={() => handleViewDetails(batch)}
                                                        >
                                                            Details
                                                        </Button>

                                                        {!isReverted && (
                                                            <Tooltip title="Rollback this transfer" arrow>
                                                                <Button
                                                                    size="small"
                                                                    color="error"
                                                                    variant="outlined"
                                                                    startIcon={<Iconify icon={"solar:restart-bold" as any} />}
                                                                    onClick={() => handleOpenRevert(batch)}
                                                                >
                                                                    Revert
                                                                </Button>
                                                            </Tooltip>
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <TablePagination
                            component="div"
                            count={total}
                            page={page}
                            onPageChange={(e, newPage) => setPage(newPage)}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={(e) => {
                                setRowsPerPage(parseInt(e.target.value, 10));
                                setPage(0);
                            }}
                            rowsPerPageOptions={[5, 10, 25, 50]}
                        />
                    </>
                )}
            </Card>

            {/* Batch Details Dialog */}
            <AttendanceTransferDetailsDialog
                open={detailsOpen}
                onClose={() => setDetailsOpen(false)}
                batch={selectedBatch}
            />

            {/* Revert Confirmation Dialog */}
            <Dialog open={revertOpen} onClose={() => !revertLoading && setRevertOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Iconify icon={"solar:danger-triangle-bold" as any} width={26} sx={{ color: 'error.main' }} />
                    <Typography variant="h6">Revert Attendance Transfer</Typography>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <Typography variant="body2">
                            Are you sure you want to revert transfer batch <strong>{revertTarget?.name}</strong>?
                        </Typography>
                        <Alert severity="warning">
                            Reverting this transfer will restore target working day attendance back to <strong>Absent</strong> and clear the transfer lock on the source Sunday.
                        </Alert>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Reason for Reversal *"
                            placeholder="Enter administrative reason for reverting this transfer..."
                            value={revertReason}
                            onChange={(e) => setRevertReason(e.target.value)}
                            disabled={revertLoading}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button variant="outlined" onClick={() => setRevertOpen(false)} disabled={revertLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleConfirmRevert}
                        disabled={revertLoading || !revertReason.trim()}
                        startIcon={revertLoading ? <CircularProgress size={18} color="inherit" /> : <Iconify icon={"solar:restart-bold" as any} />}
                    >
                        {revertLoading ? 'Reverting...' : 'Confirm Reversal'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </DashboardContent>
    );
}
