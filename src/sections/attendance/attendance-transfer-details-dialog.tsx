import type { AttendanceTransferBatch } from 'src/api/attendance-transfer';

import dayjs from 'dayjs';
import React, { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { Iconify } from 'src/components/iconify';

const formatTime = (timeStr?: string | null) => {
    if (!timeStr || timeStr === '--:--' || timeStr === '-') return '--:--';
    const str = String(timeStr).trim();
    if (str.toUpperCase().includes('AM') || str.toUpperCase().includes('PM')) {
        return str;
    }
    const normalized = str.includes(':') && !str.includes(' ') && !str.includes('-') ? `2000-01-01 ${str}` : str;
    const parsed = dayjs(normalized);
    if (parsed.isValid()) {
        return parsed.format('hh:mm A');
    }
    return str;
};

type Props = {
    open: boolean;
    onClose: () => void;
    batch: AttendanceTransferBatch | null;
};

export function AttendanceTransferDetailsDialog({ open, onClose, batch }: Props) {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    useEffect(() => {
        setPage(0);
    }, [batch?.name]);

    if (!batch) return null;

    const isReverted = batch.status === 'Reverted';
    const items = batch.items || [];
    const paginatedItems = items.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6">Attendance Transfer Batch Audit Details - {batch.name}</Typography>
                <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
                    <Iconify icon="mingcute:close-line" width={22} />
                </IconButton>
            </DialogTitle>

            <Divider />

            <DialogContent sx={{ px: 3, py: 2.5 }}>
                <Stack spacing={2.5}>
                    {/* Metadata Header Box */}
                    <Box
                        sx={{
                            p: 2.5,
                            borderRadius: 1.5,
                            bgcolor: (theme) => theme.palette.mode === 'light' ? '#f8fafc' : 'background.neutral',
                            border: (theme) => `1px solid ${theme.palette.divider}`
                        }}
                    >
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="space-between">
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
                                    MAPPING
                                </Typography>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 0.5 }}>
                                    {dayjs(batch.source_date).format('DD MMM YYYY')} ➔ {dayjs(batch.target_date).format('DD MMM YYYY')}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
                                    TRANSFERRED BY
                                </Typography>
                                <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                                    {batch.transferred_by_name || batch.transferred_by}
                                </Typography>
                                <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                                    {dayjs(batch.transfer_datetime).format('DD MMM YYYY, hh:mm A')}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
                                    TOTAL EMPLOYEES
                                </Typography>
                                <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ mt: 0.5 }}>
                                    {batch.total_employees}
                                </Typography>
                            </Box>
                        </Stack>

                        <Divider sx={{ my: 2 }} />

                        <Box sx={{ pt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
                                ADMINISTRATIVE REMARKS
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.75, fontStyle: 'italic', color: 'text.secondary' }}>
                                &ldquo;{batch.reason}&rdquo;
                            </Typography>
                        </Box>
                    </Box>

                    {/* Reverted Alert if applicable */}
                    {isReverted && (
                        <Alert severity="warning" icon={<Iconify icon={"solar:danger-triangle-bold" as any} />}>
                            <Typography variant="subtitle2">Transfer Reverted</Typography>
                            <Typography variant="caption" sx={{ display: 'block' }}>
                                Reverted by <strong>{batch.reverted_by_name || 'Super Admin'}</strong> on{' '}
                                {dayjs(batch.revert_datetime).format('DD MMM YYYY, hh:mm A')}.
                            </Typography>
                            {batch.revert_reason && (
                                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                                    Reason: <em>&ldquo;{batch.revert_reason}&rdquo;</em>
                                </Typography>
                            )}
                        </Alert>
                    )}

                    {/* Employee Records Table */}
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Transferred Employee Records ({batch.items?.length || batch.total_employees})
                        </Typography>

                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 340 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Employee</TableCell>
                                        <TableCell>Department</TableCell>
                                        <TableCell align="center">Sunday In / Out</TableCell>
                                        <TableCell align="center">Sunday Hours</TableCell>
                                        <TableCell align="center">Previous Status</TableCell>
                                        <TableCell align="center">Adjusted Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedItems.map((item, idx) => (
                                        <TableRow key={item.name || idx} hover>
                                            <TableCell>
                                                <Typography variant="subtitle2">{item.employee_name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{item.employee}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{item.department || '-'}</Typography>
                                                <Typography variant="caption" color="text.secondary">{item.designation || '-'}</Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                                                    {formatTime(item.source_in_time)} - {formatTime(item.source_out_time)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={`${item.source_working_hours} hrs`}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={item.previous_target_status || 'Absent'}
                                                    size="small"
                                                    color="default"
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={item.new_target_status || 'Present'}
                                                    size="small"
                                                    color="success"
                                                    sx={{ fontWeight: 600 }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {paginatedItems.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    No employee records found
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <TablePagination
                            component="div"
                            count={items.length}
                            page={page}
                            onPageChange={(_, newPage) => setPage(newPage)}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={(e) => {
                                setRowsPerPage(parseInt(e.target.value, 10));
                                setPage(0);
                            }}
                            rowsPerPageOptions={[5, 10, 25]}
                            sx={{ borderTop: (theme) => `1px solid ${theme.palette.divider}` }}
                        />
                    </Box>
                </Stack>
            </DialogContent>
        </Dialog>
    );
}
