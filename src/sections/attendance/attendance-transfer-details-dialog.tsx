import type { AttendanceTransferBatch } from 'src/api/attendance-transfer';

import React from 'react';
import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';

import { Iconify } from 'src/components/iconify';

type Props = {
    open: boolean;
    onClose: () => void;
    batch: AttendanceTransferBatch | null;
};

export function AttendanceTransferDetailsDialog({ open, onClose, batch }: Props) {
    if (!batch) return null;

    const isReverted = batch.status === 'Reverted';

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: isReverted ? 'error.lighter' : 'primary.lighter',
                            color: isReverted ? 'error.main' : 'primary.main'
                        }}
                    >
                        <Iconify icon={(isReverted ? 'solar:history-bold-duotone' : 'solar:document-text-bold-duotone') as any} width={24} />
                    </Box>
                    <Box>
                        <Typography variant="h6">{batch.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Attendance Transfer Batch Audit Details
                        </Typography>
                    </Box>
                </Box>
                <Chip
                    label={batch.status}
                    color={isReverted ? 'error' : 'success'}
                    size="small"
                    sx={{ fontWeight: 600 }}
                />
            </DialogTitle>

            <Divider />

            <DialogContent sx={{ pt: 2 }}>
                <Stack spacing={2.5}>
                    {/* Metadata Header Box */}
                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 1.5,
                            bgcolor: (theme) => theme.palette.mode === 'light' ? '#f8fafc' : 'background.neutral',
                            border: (theme) => `1px solid ${theme.palette.divider}`
                        }}
                    >
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="space-between">
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    MAPPING
                                </Typography>
                                <Typography variant="subtitle1" fontWeight={700}>
                                    {dayjs(batch.source_date).format('DD MMM YYYY')} ➔ {dayjs(batch.target_date).format('DD MMM YYYY')}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    TRANSFERRED BY
                                </Typography>
                                <Typography variant="subtitle2">
                                    {batch.transferred_by_name || batch.transferred_by}
                                </Typography>
                                <Typography variant="caption" color="text.disabled">
                                    {dayjs(batch.transfer_datetime).format('DD MMM YYYY, hh:mm A')}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    TOTAL EMPLOYEES
                                </Typography>
                                <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                                    {batch.total_employees}
                                </Typography>
                            </Box>
                        </Stack>

                        <Divider sx={{ my: 1.5 }} />

                        <Box>
                            <Typography variant="caption" color="text.secondary">
                                ADMINISTRATIVE REMARKS
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
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
                                    {(batch.items || []).map((item, idx) => (
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
                                                <Typography variant="body2" fontFamily="monospace">
                                                    {item.source_in_time || '--:--'} - {item.source_out_time || '--:--'}
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
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button variant="outlined" onClick={onClose}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}
