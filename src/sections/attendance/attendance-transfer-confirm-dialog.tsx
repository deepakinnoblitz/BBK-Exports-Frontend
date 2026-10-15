import type { EligibleTransferEmployee } from 'src/api/attendance-transfer';

import dayjs from 'dayjs';
import React, { useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { COMMON_COLORS } from 'src/theme';

import { Iconify } from 'src/components/iconify';

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
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Confirm Attendance Transfer
                </Typography>
                <IconButton
                    onClick={handleClose}
                    disabled={loading}
                    size="small"
                >
                    <Iconify icon="mingcute:close-line" width={20} />
                </IconButton>
            </DialogTitle>

            <Divider />

            <DialogContent sx={{ pt: 2.5 }}>
                <Stack spacing={2.5}>
                    {/* Transfer Summary Card */}
                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 1.5,
                            bgcolor: (theme) => theme.palette.mode === 'light' ? 'rgba(209, 250, 229, 0.4)' : alpha(COMMON_COLORS.emerald.main, 0.12),
                            border: `1px solid ${alpha(COMMON_COLORS.emerald.main, 0.25)}`
                        }}
                    >
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                    SOURCE DATE
                                </Typography>
                                <Typography variant="subtitle1" fontWeight={700}>
                                    {dayjs(sourceDate).format('ddd, DD MMM YYYY')}
                                </Typography>
                            </Box>

                            <Iconify icon={"solar:arrow-right-bold" as any} width={20} sx={{ color: COMMON_COLORS.emerald.main }} />

                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                    TARGET DATE
                                </Typography>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ color: COMMON_COLORS.emerald.main }}>
                                    {dayjs(targetDate).format('ddd, DD MMM YYYY')}
                                </Typography>
                            </Box>
                        </Stack>

                        <Divider sx={{ my: 1.5, borderColor: alpha(COMMON_COLORS.emerald.main, 0.2) }} />

                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">
                                Selected Employees:
                            </Typography>
                            <Chip
                                label={`${selectedEmployees.length} Employees`}
                                size="small"
                                sx={{
                                    fontWeight: 600,
                                    bgcolor: COMMON_COLORS.emerald.main,
                                    color: '#ffffff'
                                }}
                            />
                        </Stack>
                    </Box>

                    {/* Policy Notice */}
                    <Alert severity="info" icon={<Iconify icon={"solar:info-circle-bold" as any} />}>
                        <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.5 }}>
                            The attendance record from <strong>{dayjs(sourceDate).format('DD MMM')}</strong> will be moved directly to <strong>{dayjs(targetDate).format('DD MMM')}</strong> as <strong>Present</strong> with all punches and hours intact. No duplicate record will remain on {dayjs(sourceDate).format('DD MMM')}.
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

            <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: 'flex-end' }}>
                <Button
                    variant="contained"
                    onClick={handleConfirm}
                    disabled={loading || selectedEmployees.length === 0}
                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Iconify icon={"solar:check-circle-bold" as any} />}
                    sx={{
                        bgcolor: COMMON_COLORS.primaryButton.bg,
                        color: COMMON_COLORS.primaryButton.color,
                        '&:hover': { bgcolor: COMMON_COLORS.primaryButton.hoverBg },
                        px: 3,
                        py: 1
                    }}
                >
                    {loading ? 'Processing Transfer...' : `Confirm & Transfer (${selectedEmployees.length})`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
