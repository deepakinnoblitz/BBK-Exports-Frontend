import React, { useState } from 'react';
import dayjs from 'dayjs';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';

import { Iconify } from 'src/components/iconify';
import { EligibleTransferEmployee } from 'src/api/attendance-transfer';

type Props = {
    open: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => Promise<void>;
    sourceDate: string;
    targetDate: string;
    selectedEmployees: EligibleTransferEmployee[];
    loading: boolean;
};

export function AttendanceTransferConfirmDialog({
    open,
    onClose,
    onConfirm,
    sourceDate,
    targetDate,
    selectedEmployees,
    loading
}: Props) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    const handleConfirm = async () => {
        if (!reason.trim()) {
            setError('Please provide an administrative reason / remarks for this transfer.');
            return;
        }
        setError('');
        await onConfirm(reason.trim());
    };

    const handleClose = () => {
        if (!loading) {
            setReason('');
            setError('');
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'primary.lighter',
                        color: 'primary.main'
                    }}
                >
                    <Iconify icon={"solar:transfer-horizontal-bold-duotone" as any} width={24} />
                </Box>
                <Box>
                    <Typography variant="h6">Confirm Attendance Transfer</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Adjust Sunday / Non-working day attendance to a working date
                    </Typography>
                </Box>
            </DialogTitle>

            <Divider />

            <DialogContent sx={{ pt: 2.5 }}>
                <Stack spacing={2.5}>
                    {/* Transfer Summary Card */}
                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 1.5,
                            bgcolor: (theme) => theme.palette.mode === 'light' ? '#f4f6f8' : 'background.neutral',
                            border: (theme) => `1px solid ${theme.palette.divider}`
                        }}
                    >
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    SOURCE DATE (NON-WORKING)
                                </Typography>
                                <Typography variant="subtitle1" fontWeight={700}>
                                    {dayjs(sourceDate).format('ddd, DD MMM YYYY')}
                                </Typography>
                            </Box>

                            <Iconify icon={"solar:arrow-right-bold" as any} width={20} sx={{ color: 'text.secondary' }} />

                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="caption" color="text.secondary">
                                    TARGET DATE (WORKING)
                                </Typography>
                                <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                                    {dayjs(targetDate).format('ddd, DD MMM YYYY')}
                                </Typography>
                            </Box>
                        </Stack>

                        <Divider sx={{ my: 1.5 }} />

                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">
                                Selected Employees:
                            </Typography>
                            <Chip
                                label={`${selectedEmployees.length} Employees`}
                                color="primary"
                                size="small"
                                sx={{ fontWeight: 600 }}
                            />
                        </Stack>
                    </Box>

                    {/* Policy Notice */}
                    <Alert severity="info" icon={<Iconify icon={"solar:info-circle-bold" as any} />}>
                        <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.5 }}>
                            Target attendance will be marked as <strong>Present</strong> with worked hours credited from {dayjs(sourceDate).format('DD MMM')}.
                            The source non-working date will be locked as <strong>Transferred</strong> to prevent duplicate pay or Comp-Off.
                        </Typography>
                    </Alert>

                    {/* Mandatory Reason Input */}
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Reason / Administrative Remarks <Typography component="span" color="error.main">*</Typography>
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            placeholder="e.g. Sunday shift worked due to scheduled production maintenance, adjusted against Monday absence."
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                if (error) setError('');
                            }}
                            error={!!error}
                            helperText={error || 'Required for Super Admin audit trail and tracking.'}
                            disabled={loading}
                        />
                    </Box>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button variant="outlined" color="inherit" onClick={handleClose} disabled={loading}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleConfirm}
                    disabled={loading || selectedEmployees.length === 0}
                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Iconify icon={"solar:check-circle-bold" as any} />}
                >
                    {loading ? 'Processing Transfer...' : `Confirm & Transfer (${selectedEmployees.length})`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
