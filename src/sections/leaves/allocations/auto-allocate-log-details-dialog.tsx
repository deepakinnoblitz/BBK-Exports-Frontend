import type {
    AutoLeaveAllocationLogDetails,
} from 'src/api/leave-allocations';

import { useState, useEffect } from 'react';

import { alpha } from '@mui/material/styles';
import {
    Box,
    Card,
    Stack,
    Table,
    Alert,
    Dialog,
    TableRow,
    TableBody,
    TableCell,
    TextField,
    Typography,
    IconButton,
    DialogTitle,
    DialogContent,
    TableContainer,
    InputAdornment,
    TablePagination,
    CircularProgress,
} from '@mui/material';

import {
    fetchAutoLeaveAllocationLogDetails,
} from 'src/api/leave-allocations';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';

import { LeadTableHead as LeavesTableHead } from '../../lead/lead-table-head';

// ----------------------------------------------------------------------

interface Props {
    open: boolean;
    onClose: VoidFunction;
    logId: string | null;
}

export default function AutoAllocateLogDetailsDialog({ open, onClose, logId }: Props) {
    const [loading, setLoading] = useState(false);
    const [log, setLog] = useState<AutoLeaveAllocationLogDetails | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => {
        if (open && logId) {
            setLoading(true);
            setSearchQuery('');
            setPage(0);
            fetchAutoLeaveAllocationLogDetails(logId)
                .then(setLog)
                .catch((err) => {
                    console.error('Failed to load log details:', err);
                })
                .finally(() => setLoading(false));
        } else {
            setLog(null);
            setPage(0);
        }
    }, [open, logId]);

    const filteredDetails = (log?.details || []).filter((detail) =>
        (detail.employee_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (detail.employee_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (detail.leave_type || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const paginatedDetails = filteredDetails.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    const getLeaveTypeColor = (leaveType: string): any => {
        const map: Record<string, any> = {
            'Paid Leave': 'primary',
            'Unpaid Leave': 'warning',
            'Permission': 'info',
            'Sick Leave': 'error',
            'Casual Leave': 'success',
        };
        return map[leaveType] || 'default';
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="lg"
            PaperProps={{
                sx: {
                    borderRadius: 2.5,
                    boxShadow: (theme) => `0 24px 48px -12px ${alpha(theme.palette.common.black, 0.24)}`,
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
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            {logId || 'Auto Allocation Log Details'}
                        </Typography>
                    </Box>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <IconButton onClick={onClose} sx={{ color: 'text.disabled' }}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </Stack>
            </DialogTitle>

            <DialogContent sx={{ my: 2.5, mx: 1.5 }}>
                {loading ? (
                    <Box sx={{ py: 12, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <CircularProgress sx={{ color: '#08a3cd' }} />
                    </Box>
                ) : !log ? (
                    <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
                        No log details available.
                    </Box>
                ) : (
                    <Stack spacing={3}>
                        {/* Summary Metrics */}
                        <Box
                            display="grid"
                            gridTemplateColumns={{ xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }}
                            gap={2}
                        >
                            <Card sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.success.main, 0.08), border: '1px solid', borderColor: (theme) => alpha(theme.palette.success.main, 0.2) }}>
                                <Typography variant="caption" sx={{ color: 'success.dark', fontWeight: 700, fontSize: 14 }}>
                                    Total Allocated
                                </Typography>
                                <Typography variant="h4" sx={{ color: 'success.darker', fontWeight: 800, mt: 0.5 }}>
                                    {log.created_count}
                                </Typography>
                            </Card>

                            <Card sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08), border: '1px solid', borderColor: (theme) => alpha(theme.palette.warning.main, 0.2) }}>
                                <Typography variant="caption" sx={{ color: 'warning.dark', fontWeight: 700, fontSize: 14 }}>
                                    Skipped
                                </Typography>
                                <Typography variant="h4" sx={{ color: 'warning.darker', fontWeight: 800, mt: 0.5 }}>
                                    {log.skipped_count}
                                </Typography>
                            </Card>

                            <Card sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.error.main, 0.08), border: '1px solid', borderColor: (theme) => alpha(theme.palette.error.main, 0.2) }}>
                                <Typography variant="caption" sx={{ color: 'error.dark', fontWeight: 700, fontSize: 14 }}>
                                    Errors
                                </Typography>
                                <Typography variant="h4" sx={{ color: 'error.darker', fontWeight: 800, mt: 0.5 }}>
                                    {log.error_count}
                                </Typography>
                            </Card>

                            <Card sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.info.main, 0.08), border: '1px solid', borderColor: (theme) => alpha(theme.palette.info.main, 0.2) }}>
                                <Typography variant="caption" sx={{ color: 'info.dark', fontWeight: 700, fontSize: 14 }}>
                                    Execution Mode
                                </Typography>
                                <Typography variant="h6" sx={{ color: 'info.darker', fontWeight: 800, mt: 0.5 }}>
                                    {log.execution_type}
                                </Typography>
                            </Card>
                        </Box>

                        {/* Metadata Box */}
                        <Card sx={{ p: 2.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04) }}>
                            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={2}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Target Period</Typography>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                        {log.target_period || `${log.month}/${log.year}`}
                                    </Typography>
                                </Box>
                                {log.attendance_evaluated_month && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Evaluated Attendance</Typography>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                            {log.attendance_evaluated_month}
                                        </Typography>
                                    </Box>
                                )}
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Executed By</Typography>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                        {log.executed_by || 'System'}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Allocated Employees</Typography>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                        {log.details ? log.details.length : 0} records
                                    </Typography>
                                </Box>
                            </Box>
                        </Card>

                        {/* Error Alert if any */}
                        {log.errors && log.errors.length > 0 && (
                            <Alert severity="error" sx={{ borderRadius: 1.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                    Errors occurred during execution ({log.errors.length}):
                                </Typography>
                                <Box component="ul" sx={{ m: 0, pl: 2, fontSize: '13px' }}>
                                    {log.errors.map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </Box>
                            </Alert>
                        )}

                        {/* Allocations Created List Card */}
                        <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                            <Box
                                sx={{
                                    p: 2.5,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 2,
                                }}
                            >
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                    Allocations Created ({filteredDetails.length})
                                </Typography>
                                <TextField
                                    size="small"
                                    placeholder="Search by Employee..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ width: { xs: '100%', sm: 300 } }}
                                />
                            </Box>

                            <Scrollbar>
                                <TableContainer sx={{ overflow: 'unset' }}>
                                    <Table sx={{ minWidth: 650 }}>
                                        <LeavesTableHead
                                            order="asc"
                                            orderBy=""
                                            rowCount={paginatedDetails.length}
                                            numSelected={0}
                                            onSelectAllRows={() => { }}
                                            hideCheckbox
                                            showIndex
                                            headLabel={[
                                                { id: 'employee', label: 'Employee' },
                                                { id: 'leave_type', label: 'Leave Type' },
                                                { id: 'allocated', label: 'Allocated', align: 'center' },
                                                { id: 'carry_forward', label: 'Carry Forward', align: 'center' },
                                            ]}
                                        />
                                        <TableBody>
                                            {filteredDetails.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5}>
                                                        <EmptyContent
                                                            title={searchQuery ? "No matching allocations found" : "No allocations were created in this run"}
                                                            sx={{ py: 6 }}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                <>
                                                    {paginatedDetails.map((detail, index) => (
                                                        <TableRow
                                                            key={`${detail.employee_id}-${detail.leave_type}-${index}`}
                                                            hover
                                                            sx={{
                                                                '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}` },
                                                                '&:last-child td, &:last-child th': { borderBottom: 0 },
                                                            }}
                                                        >
                                                            <TableCell align="center" sx={{ width: 60 }}>
                                                                <Box
                                                                    sx={{
                                                                        width: 28,
                                                                        height: 28,
                                                                        display: 'flex',
                                                                        borderRadius: '50%',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                                        color: 'primary.main',
                                                                        typography: 'subtitle2',
                                                                        fontWeight: 800,
                                                                        border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                                                                        mx: 'auto',
                                                                        transition: (theme) => theme.transitions.create(['all'], { duration: theme.transitions.duration.shorter }),
                                                                        '&:hover': {
                                                                            bgcolor: 'primary.main',
                                                                            color: 'primary.contrastText',
                                                                            transform: 'scale(1.1)',
                                                                        },
                                                                    }}
                                                                >
                                                                    {page * rowsPerPage + index + 1}
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                                    {detail.employee_name}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                                    {detail.employee_id}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Label variant="soft" color={getLeaveTypeColor(detail.leave_type)} sx={{ fontWeight: 700 }}>
                                                                    {detail.leave_type}
                                                                </Label>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Box
                                                                    sx={{
                                                                        typography: 'subtitle2',
                                                                        color: 'primary.main',
                                                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                                        borderRadius: 1,
                                                                        py: 0.5,
                                                                        px: 1.5,
                                                                        display: 'inline-block',
                                                                        fontWeight: 800,
                                                                    }}
                                                                >
                                                                    {detail.allocated}
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Box
                                                                    sx={{
                                                                        typography: 'subtitle2',
                                                                        color: detail.carry_forward ? 'success.main' : 'text.disabled',
                                                                        bgcolor: (theme) => alpha(detail.carry_forward ? theme.palette.success.main : theme.palette.grey[500], 0.08),
                                                                        borderRadius: 1,
                                                                        py: 0.5,
                                                                        px: 1.5,
                                                                        display: 'inline-block',
                                                                        fontWeight: 800,
                                                                    }}
                                                                >
                                                                    {detail.carry_forward || 0}
                                                                </Box>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Scrollbar>

                            <TablePagination
                                component="div"
                                count={filteredDetails.length}
                                page={page}
                                rowsPerPage={rowsPerPage}
                                onPageChange={(_: any, newPage: number) => setPage(newPage)}
                                onRowsPerPageChange={(e: any) => {
                                    setRowsPerPage(parseInt(e.target.value, 10));
                                    setPage(0);
                                }}
                                rowsPerPageOptions={[5, 10, 25, 50]}
                            />
                        </Card>
                    </Stack>
                )}
            </DialogContent>
        </Dialog>
    );
}
