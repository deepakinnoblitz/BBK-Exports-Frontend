import { useState, useId } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import { alpha, styled } from '@mui/material/styles';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';

import { bulkUpdateLeaveAllocations } from 'src/api/leave-allocations';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const Android12Switch = styled(Switch)(({ theme }) => ({
    width: 38,
    height: 22,
    padding: 0,
    '& .MuiSwitch-switchBase': {
        padding: 0,
        margin: 2,
        transitionDuration: '300ms',
        '&.Mui-checked': {
            transform: 'translateX(16px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
                backgroundColor: 'var(--btn-primary-bg, #059669)',
                opacity: 1,
                border: 0,
            },
        },
    },
    '& .MuiSwitch-thumb': {
        boxSizing: 'border-box',
        width: 18,
        height: 18,
    },
    '& .MuiSwitch-track': {
        borderRadius: 22 / 2,
        backgroundColor: theme.palette.mode === 'dark' ? '#39393D' : '#E9E9EA',
        opacity: 1,
        transition: theme.transitions.create(['background-color'], {
            duration: 500,
        }),
    },
}));

type Props = {
    open: boolean;
    onClose: VoidFunction;
    selectedIds: string[];
    onSuccess: (updatedCount: number) => void;
};

export function LeaveAllocationBulkEditDialog({
    open,
    onClose,
    selectedIds,
    onSuccess,
}: Props) {
    const allocatedActionLabelId = useId();
    const takenActionLabelId = useId();
    const statusLabelId = useId();

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Allocated field state
    const [allocatedEnabled, setAllocatedEnabled] = useState(false);
    const [allocatedAction, setAllocatedAction] = useState<'set' | 'add' | 'subtract'>('set');
    const [allocatedValue, setAllocatedValue] = useState<string>('1');

    // Taken field state
    const [takenEnabled, setTakenEnabled] = useState(false);
    const [takenAction, setTakenAction] = useState<'set' | 'add' | 'subtract' | 'reset'>('set');
    const [takenValue, setTakenValue] = useState<string>('0');

    // Status field state
    const [statusEnabled, setStatusEnabled] = useState(false);
    const [statusValue, setStatusValue] = useState<'Approved' | 'Draft' | 'Cancelled'>('Approved');

    const handleReset = () => {
        setAllocatedEnabled(false);
        setAllocatedAction('set');
        setAllocatedValue('1');

        setTakenEnabled(false);
        setTakenAction('set');
        setTakenValue('0');

        setStatusEnabled(false);
        setStatusValue('Approved');

        setError(null);
    };

    const handleClose = () => {
        if (!submitting) {
            handleReset();
            onClose();
        }
    };

    const isAnyFieldEnabled = allocatedEnabled || takenEnabled || statusEnabled;

    const handleSubmit = async () => {
        if (!isAnyFieldEnabled) {
            setError('Please enable at least one field to update');
            return;
        }

        // Validate values
        if (allocatedEnabled) {
            const val = parseFloat(allocatedValue);
            if (Number.isNaN(val) || val < 0) {
                setError('Please provide a valid non-negative number for Allocated Leaves');
                return;
            }
        }

        if (takenEnabled && takenAction !== 'reset') {
            const val = parseFloat(takenValue);
            if (Number.isNaN(val) || val < 0) {
                setError('Please provide a valid non-negative number for Leaves Taken');
                return;
            }
        }

        try {
            setSubmitting(true);
            setError(null);

            const result = await bulkUpdateLeaveAllocations({
                allocations: selectedIds,
                update_data: {
                    allocated: allocatedEnabled
                        ? {
                              enabled: true,
                              action: allocatedAction,
                              value: parseFloat(allocatedValue) || 0,
                          }
                        : undefined,
                    taken: takenEnabled
                        ? {
                              enabled: true,
                              action: takenAction,
                              value: takenAction === 'reset' ? 0 : parseFloat(takenValue) || 0,
                          }
                        : undefined,
                    status: statusEnabled
                        ? {
                              enabled: true,
                              value: statusValue,
                          }
                        : undefined,
                },
            });

            handleReset();
            onSuccess(result?.updated_count || selectedIds.length);
        } catch (err: any) {
            setError(err.message || 'Failed to update leave allocations');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    boxShadow: (theme) => theme.customShadows.z24,
                },
            }}
        >
            <DialogTitle sx={{ pb: 1.5, pt: 2.5, px: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <div>
                            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                Bulk Edit Leave Allocations
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                Updating {selectedIds.length} selected allocation{selectedIds.length > 1 ? 's' : ''}
                            </Typography>
                        </div>
                    </Stack>
                    <IconButton onClick={onClose} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main', bgcolor: (theme) => alpha(theme.palette.error.main, 0.08) } }}>
                        <Iconify icon="mingcute:close-line" width={24} />
                    </IconButton>
                </Stack>
            </DialogTitle>

            <DialogContent sx={{ px: 3, py: 2 }}>
                <Stack spacing={2.5}>
                    {error && (
                        <Alert severity="error" onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    <Alert severity="info" sx={{ bgcolor: (theme) => alpha(theme.palette.info.main, 0.08) }}>
                        Toggle the switch on for any field you wish to update across the {selectedIds.length} selected records.
                    </Alert>

                    {/* SECTION 1: Total Leaves Allocated */}
                    <Card
                        variant="outlined"
                        sx={{
                            p: 2,
                            borderRadius: 1.5,
                            borderColor: allocatedEnabled ? 'primary.main' : 'divider',
                            bgcolor: (theme) =>
                                allocatedEnabled ? alpha(theme.palette.primary.main, 0.03) : 'background.paper',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                <Android12Switch
                                    checked={allocatedEnabled}
                                    onChange={(e) => setAllocatedEnabled(e.target.checked)}
                                />
                                <div>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                        Leaves Allocated
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        Modify or overwrite total allocated leave quota
                                    </Typography>
                                </div>
                            </Stack>
                        </Stack>

                        <Collapse in={allocatedEnabled}>
                            <Box sx={{ mt: 2, pt: 2, borderTop: (t) => `1px dashed ${t.palette.divider}` }}>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <FormControl fullWidth size="medium">
                                        <InputLabel id={allocatedActionLabelId}>Action</InputLabel>
                                        <Select
                                            labelId={allocatedActionLabelId}
                                            value={allocatedAction}
                                            label="Action"
                                            onChange={(e) => setAllocatedAction(e.target.value as any)}
                                        >
                                            <MenuItem value="set">Set Exact Value (=)</MenuItem>
                                            <MenuItem value="add">Add to Current (+)</MenuItem>
                                            <MenuItem value="subtract">Subtract from Current (-)</MenuItem>
                                        </Select>
                                    </FormControl>

                                    <TextField
                                        fullWidth
                                        size="medium"
                                        label="Allocated Count"
                                        type="number"
                                        value={allocatedValue}
                                        onChange={(e) => setAllocatedValue(e.target.value)}
                                        inputProps={{ min: 0, step: 0.5 }}
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">Days</InputAdornment>,
                                        }}
                                    />
                                </Stack>
                            </Box>
                        </Collapse>
                    </Card>

                    {/* SECTION 2: Total Leaves Taken */}
                    <Card
                        variant="outlined"
                        sx={{
                            p: 2,
                            borderRadius: 1.5,
                            borderColor: takenEnabled ? 'primary.main' : 'divider',
                            bgcolor: (theme) =>
                                takenEnabled ? alpha(theme.palette.primary.main, 0.03) : 'background.paper',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                <Android12Switch
                                    checked={takenEnabled}
                                    onChange={(e) => setTakenEnabled(e.target.checked)}
                                />
                                <div>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                        Leaves Taken
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        Adjust taken leave balance or reset to 0
                                    </Typography>
                                </div>
                            </Stack>
                        </Stack>

                        <Collapse in={takenEnabled}>
                            <Box sx={{ mt: 2, pt: 2, borderTop: (t) => `1px dashed ${t.palette.divider}` }}>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <FormControl fullWidth size="medium">
                                        <InputLabel id={takenActionLabelId}>Action</InputLabel>
                                        <Select
                                            labelId={takenActionLabelId}
                                            value={takenAction}
                                            label="Action"
                                            onChange={(e) => setTakenAction(e.target.value as any)}
                                        >
                                            <MenuItem value="set">Set Exact Value (=)</MenuItem>
                                            <MenuItem value="add">Add to Current (+)</MenuItem>
                                            <MenuItem value="subtract">Subtract from Current (-)</MenuItem>
                                            <MenuItem value="reset">Reset to 0 (Clear Taken)</MenuItem>
                                        </Select>
                                    </FormControl>

                                    {takenAction !== 'reset' && (
                                        <TextField
                                            fullWidth
                                            size="medium"
                                            label="Taken Count"
                                            type="number"
                                            value={takenValue}
                                            onChange={(e) => setTakenValue(e.target.value)}
                                            inputProps={{ min: 0, step: 0.5 }}
                                            InputProps={{
                                                endAdornment: <InputAdornment position="end">Days</InputAdornment>,
                                            }}
                                        />
                                    )}
                                </Stack>
                            </Box>
                        </Collapse>
                    </Card>

                    {/* SECTION 3: Status */}
                    <Card
                        variant="outlined"
                        sx={{
                            p: 2,
                            borderRadius: 1.5,
                            borderColor: statusEnabled ? 'primary.main' : 'divider',
                            bgcolor: (theme) =>
                                statusEnabled ? alpha(theme.palette.primary.main, 0.03) : 'background.paper',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                <Android12Switch
                                    checked={statusEnabled}
                                    onChange={(e) => setStatusEnabled(e.target.checked)}
                                />
                                <div>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                        Status
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        Update allocation approval state
                                    </Typography>
                                </div>
                            </Stack>
                        </Stack>

                        <Collapse in={statusEnabled}>
                            <Box sx={{ mt: 2, pt: 2, borderTop: (t) => `1px dashed ${t.palette.divider}` }}>
                                <FormControl fullWidth size="medium">
                                    <InputLabel id={statusLabelId}>New Status</InputLabel>
                                    <Select
                                        labelId={statusLabelId}
                                        value={statusValue}
                                        label="New Status"
                                        onChange={(e) => setStatusValue(e.target.value as any)}
                                    >
                                        <MenuItem value="Approved">Approved</MenuItem>
                                        <MenuItem value="Draft">Draft</MenuItem>
                                        <MenuItem value="Cancelled">Cancelled</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>
                        </Collapse>
                    </Card>

                    {/* Preview Summary */}
                    {isAnyFieldEnabled && (
                        <Box
                            sx={{
                                p: 1.75,
                                borderRadius: 1.25,
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                                border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                            }}
                        >
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main', textTransform: 'uppercase' }}>
                                Summary of Changes ({selectedIds.length} items)
                            </Typography>
                            <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                                {allocatedEnabled && (
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        • Allocated:{' '}
                                        <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
                                            {allocatedAction === 'set' && `Set to ${allocatedValue} days`}
                                            {allocatedAction === 'add' && `Add +${allocatedValue} days`}
                                            {allocatedAction === 'subtract' && `Subtract -${allocatedValue} days`}
                                        </Box>
                                    </Typography>
                                )}
                                {takenEnabled && (
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        • Taken:{' '}
                                        <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
                                            {takenAction === 'reset' && 'Reset to 0 days'}
                                            {takenAction === 'set' && `Set to ${takenValue} days`}
                                            {takenAction === 'add' && `Add +${takenValue} days`}
                                            {takenAction === 'subtract' && `Subtract -${takenValue} days`}
                                        </Box>
                                    </Typography>
                                )}
                                {statusEnabled && (
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        • Status:{' '}
                                        <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
                                            Set to {statusValue}
                                        </Box>
                                    </Typography>
                                )}
                            </Stack>
                        </Box>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
                <LoadingButton
                    variant="contained"
                    loading={submitting}
                    disabled={!isAnyFieldEnabled}
                    onClick={handleSubmit}
                    sx={{
                        bgcolor: 'var(--btn-primary-bg, #059669)',
                        color: '#fff',
                        fontWeight: 700,
                        '&:hover': {
                            bgcolor: '#047857',
                        },
                    }}
                >
                    Apply Changes ({selectedIds.length})
                </LoadingButton>
            </DialogActions>
        </Dialog>
    );
}
