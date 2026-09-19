import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import Snackbar from '@mui/material/Snackbar';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { 
    createLeaveType, 
    updateLeaveType, 
    renameLeaveType, 
    getLeaveType, 
    LeaveType
} from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

import { CustomSwitch } from 'src/sections/email-settings/view/email-settings-view';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    id?: string | null;
};

const STATUS_OPTIONS = ['Active', 'Inactive'];
const RESET_FREQUENCY_OPTIONS = ['', 'Every 3 months', 'Every 4 months', 'Every 6 months', 'Whole year'];
const ALLOCATION_BASIS_OPTIONS = [
    'Fixed / Unconditional',
    'Full Month Present (100% Attendance)',
    'Minimum Present Days',
    'Per N Days Worked',
];
const HALF_DAY_COUNT_OPTIONS = ['0.5 Day', '0 (Not Present)'];

export function LeaveTypeDialog({ open, onClose, onSuccess, id }: Props) {
    const [leaveTypeName, setLeaveTypeName] = useState('');
    const [isPaid, setIsPaid] = useState(false);
    const [isPermission, setIsPermission] = useState(false);
    const [maxLeaves, setMaxLeaves] = useState<number | string>('');
    const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
    const [carryForward, setCarryForward] = useState(false);
    const [resetFrequency, setResetFrequency] = useState('');
    const [restrictDuringProbation, setRestrictDuringProbation] = useState(false);
    const [probationPeriodMonths, setProbationPeriodMonths] = useState<number | ''>(3);
    const [probationError, setProbationError] = useState(false);

    // Attendance Criteria States
    const [allocationBasis, setAllocationBasis] = useState<string>('Fixed / Unconditional');
    const [minPresentDays, setMinPresentDays] = useState<number | ''>('');
    const [daysWorkedPerLeave, setDaysWorkedPerLeave] = useState<number | ''>(20);
    const [countHalfDayAs, setCountHalfDayAs] = useState<string>('0.5 Day');
    const [includeApprovedPaidLeaves, setIncludeApprovedPaidLeaves] = useState(false);

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState('');
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const resetForm = () => {
        setLeaveTypeName('');
        setIsPaid(false);
        setIsPermission(false);
        setMaxLeaves('');
        setStatus('Active');
        setCarryForward(false);
        setResetFrequency('');
        setRestrictDuringProbation(false);
        setProbationPeriodMonths(3);
        setProbationError(false);
        setAllocationBasis('Fixed / Unconditional');
        setMinPresentDays('');
        setDaysWorkedPerLeave(20);
        setCountHalfDayAs('0.5 Day');
        setIncludeApprovedPaidLeaves(false);
        setError('');
    };

    useEffect(() => {
        let isMounted = true;

        if (open) {
            resetForm();
            if (id) {
                setFetching(true);
                getLeaveType(id)
                    .then((data) => {
                        if (!isMounted) return;
                        setLeaveTypeName(data.leave_type_name || data.name || '');
                        setIsPaid(!!data.is_paid);
                        setIsPermission(!!data.is_permission);
                        setMaxLeaves(data.max_leaves ?? '');
                        setStatus(data.status || 'Active');
                        setCarryForward(!!data.carry_forward);
                        setResetFrequency(data.reset_frequency || '');
                        setRestrictDuringProbation(!!data.restrict_during_probation);
                        setProbationPeriodMonths(data.probation_period_months || 3);
                        setProbationError(false);
                        setAllocationBasis(data.allocation_basis || 'Fixed / Unconditional');
                        setMinPresentDays(data.min_present_days ?? '');
                        setDaysWorkedPerLeave(data.days_worked_per_leave ?? 20);
                        setCountHalfDayAs(data.count_half_day_as || '0.5 Day');
                        setIncludeApprovedPaidLeaves(!!data.include_approved_paid_leaves);
                    })
                    .catch((err) => {
                        if (!isMounted) return;
                        console.error('Failed to fetch leave type:', err);
                        setSnackbar({ open: true, message: 'Failed to fetch details', severity: 'error' });
                    })
                    .finally(() => {
                        if (isMounted) setFetching(false);
                    });
            } else {
                setFetching(false);
            }
        } else {
            resetForm();
            setFetching(false);
        }

        return () => {
            isMounted = false;
        };
    }, [open, id]);

    const handleSubmit = async () => {
        if (!leaveTypeName.trim()) {
            setError('name');
            setSnackbar({ open: true, message: 'Leave Type name is required', severity: 'error' });
            return;
        }

        if (
            restrictDuringProbation &&
            (!probationPeriodMonths || Number(probationPeriodMonths) <= 0)
        ) {
            setProbationError(true);

            setSnackbar({
                open: true,
                message: "Probation Period cannot be 0.",
                severity: "error",
            });

            return;
        }

        setProbationError(false);

        try {
            setLoading(true);
            setError('');

            const data: Partial<LeaveType> & Record<string, any> = {
                leave_type_name: leaveTypeName,
                is_paid: isPaid ? 1 : 0,
                is_permission: isPermission ? 1 : 0,
                max_leaves:
                    typeof maxLeaves === "number"
                        ? maxLeaves
                        : (maxLeaves ? Number(maxLeaves) : 0),
                status,
                carry_forward: carryForward ? 1 : 0,
                reset_frequency: resetFrequency as any,

                restrict_during_probation: restrictDuringProbation ? 1 : 0,
                probation_period_months: restrictDuringProbation
                    ? Number(probationPeriodMonths)
                    : 0,
                allocation_basis: allocationBasis as any,
                min_present_days:
                    allocationBasis === 'Minimum Present Days' && minPresentDays !== ''
                        ? Number(minPresentDays)
                        : undefined,
                days_worked_per_leave:
                    allocationBasis === 'Per N Days Worked' && daysWorkedPerLeave !== ''
                        ? Number(daysWorkedPerLeave)
                        : 20,
                count_half_day_as: countHalfDayAs as any,
                include_approved_paid_leaves: includeApprovedPaidLeaves ? 1 : 0,
            };

            if (id) {
                let currentId = id;
                // Handle renaming if the leave type name has changed
                if (leaveTypeName !== id) {
                    await renameLeaveType(id, leaveTypeName);
                    currentId = leaveTypeName;
                }
                await updateLeaveType(currentId, data);
            } else {
                await createLeaveType(data);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            const msg = err.message || 'Failed to save';
            setError(msg);
            setSnackbar({ open: true, message: msg, severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24, } }}>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{id ? 'Edit Leave Type' : 'New Leave Type'}</Typography>
                <Iconify icon="mingcute:close-line" onClick={onClose} sx={{ cursor: 'pointer', color: 'text.disabled' }} />
            </DialogTitle>

            <DialogContent dividers>
                {fetching ? (
                    <Box sx={{ py: 10, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <CircularProgress sx={{ color: '#08a3cd' }} />
                    </Box>
                ) : (
                    <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={3}>
                        <TextField
                            required
                            fullWidth
                            label="Leave Type Name"
                            value={leaveTypeName}
                            onChange={(e) => {
                                 setLeaveTypeName(e.target.value);
                                 if (error === 'name') setError('');
                            }}
                            error={error === 'name'}
                            helperText={error === 'name' ? 'Leave Type Name is required' : ''}
                            disabled={loading}
                            autoFocus
                            InputLabelProps={{ shrink: true }}
                            sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                        />
                        <TextField
                            fullWidth
                            label="Max Leaves"
                            type="number"
                            value={maxLeaves}
                            onChange={(e) => setMaxLeaves(e.target.value)}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        />
                        <FormControl fullWidth disabled={loading}>
                            <InputLabel id="reset-frequency-label" shrink>Reset Frequency</InputLabel>
                            <Select
                                labelId="reset-frequency-label"
                                value={resetFrequency}
                                onChange={(e) => setResetFrequency(e.target.value as string)}
                                label="Reset Frequency"
                                displayEmpty
                            >
                                {RESET_FREQUENCY_OPTIONS.map((opt) => (
                                    <MenuItem key={opt} value={opt}>{opt || 'None'}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth disabled={loading}>
                            <InputLabel id="status-label" shrink>Status</InputLabel>
                            <Select
                                labelId="status-label"
                                value={status}
                                onChange={(e) => setStatus(e.target.value as any)}
                                label="Status"
                            >
                                {STATUS_OPTIONS.map((opt) => (
                                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    <Stack direction="row" spacing={3}>
                        <FormControlLabel
                            control={
                                <CustomSwitch
                                    checked={isPaid}
                                    onChange={(e) => setIsPaid(e.target.checked)}
                                    disabled={loading}
                                />
                            }
                            label="Is Paid"
                            sx={{
                            m: 0,
                            '& .MuiFormControlLabel-label': {
                                ml: 1,
                            },
                        }}
                        />

                        <FormControlLabel
                            control={
                                <CustomSwitch
                                    checked={carryForward}
                                    onChange={(e) => setCarryForward(e.target.checked)}
                                    disabled={loading}
                                />
                            }
                            label="Carry Forward"
                            sx={{
                            m: 0,
                            '& .MuiFormControlLabel-label': {
                                ml: 1,
                            },
                        }}
                        />

                        <FormControlLabel
                            control={
                                <CustomSwitch
                                    checked={isPermission}
                                    onChange={(e) => setIsPermission(e.target.checked)}
                                    disabled={loading}
                                />
                            }
                            label="Is Permission"
                            sx={{
                            m: 0,
                            '& .MuiFormControlLabel-label': {
                                ml: 1,
                            },
                        }}
                        />
                    </Stack>
                    
                    <FormControlLabel
                        control={
                            <CustomSwitch
                                checked={restrictDuringProbation}
                                onChange={(e) =>
                                    setRestrictDuringProbation(e.target.checked)
                                }
                            />
                        }
                        label="Restrict During Probation"
                        sx={{
                            m: 0,
                            '& .MuiFormControlLabel-label': {
                                ml: 1,
                            },
                        }}
                    />

                    {restrictDuringProbation && (
                    <TextField
                        fullWidth
                        type="number"
                        label="Probation Period (Months)"
                        value={probationPeriodMonths}
                        onChange={(e) => {
                            const value = e.target.value;

                            setProbationPeriodMonths(value === "" ? "" : Number(value));

                            if (value === "" || Number(value) > 0) {
                                setProbationError(false);
                            }
                        }}
                        error={probationError}
                        helperText={
                            probationError
                                ? "Probation Period cannot be 0."
                                : ""
                        }
                        inputProps={{ min: 1 }}
                    />
                    )}

                    {/* Attendance & Service-Day Criteria Section */}
                    <Box sx={{ pt: 3, borderTop: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            Automatic Allocation & Attendance Criteria
                        </Typography>

                        <FormControl fullWidth disabled={loading}>
                            <InputLabel id="allocation-basis-label" shrink>Allocation Basis</InputLabel>
                            <Select
                                labelId="allocation-basis-label"
                                value={allocationBasis}
                                onChange={(e) => setAllocationBasis(e.target.value as string)}
                                label="Allocation Basis"
                            >
                                {ALLOCATION_BASIS_OPTIONS.map((opt) => (
                                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {allocationBasis === 'Minimum Present Days' && (
                            <TextField
                                fullWidth
                                type="number"
                                label="Minimum Present Days Required"
                                value={minPresentDays}
                                onChange={(e) => setMinPresentDays(e.target.value === '' ? '' : Number(e.target.value))}
                                disabled={loading}
                                helperText="Employee must attend at least this many days in the month to receive leave"
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ min: 1, max: 31 }}
                            />
                        )}

                        {allocationBasis === 'Per N Days Worked' && (
                            <TextField
                                fullWidth
                                type="number"
                                label="Days Worked Per 1 Leave"
                                value={daysWorkedPerLeave}
                                onChange={(e) => setDaysWorkedPerLeave(e.target.value === '' ? '' : Number(e.target.value))}
                                disabled={loading}
                                helperText="e.g., 20 days worked = 1 earned leave (Indian Factories Act standard)"
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ min: 1 }}
                            />
                        )}

                        {allocationBasis !== 'Fixed / Unconditional' && (
                            <>
                                <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
                                    <FormControl fullWidth disabled={loading}>
                                        <InputLabel id="count-half-day-label" shrink>Count Half Day As</InputLabel>
                                        <Select
                                            labelId="count-half-day-label"
                                            value={countHalfDayAs}
                                            onChange={(e) => setCountHalfDayAs(e.target.value as string)}
                                            label="Count Half Day As"
                                        >
                                            {HALF_DAY_COUNT_OPTIONS.map((opt) => (
                                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <FormControlLabel
                                        control={
                                            <CustomSwitch
                                                checked={includeApprovedPaidLeaves}
                                                onChange={(e) => setIncludeApprovedPaidLeaves(e.target.checked)}
                                                disabled={loading}
                                            />
                                        }
                                        label="Approved Paid Leaves Count as Present"
                                        sx={{ m: 0, '& .MuiFormControlLabel-label': { ml: 1, fontSize: 13 } }}
                                    />
                                </Box>

                                <Alert severity="info" sx={{ fontSize: 12 }}>
                                    {allocationBasis === 'Full Month Present (100% Attendance)' &&
                                        'Leaves are allocated only if the employee attends all scheduled working days in the month (Sundays, 2nd & 4th Saturdays, and official holidays are excluded).'}
                                    {allocationBasis === 'Minimum Present Days' &&
                                        'Leaves are allocated if the employee reaches the minimum present days threshold.'}
                                    {allocationBasis === 'Per N Days Worked' &&
                                        'Leaves are calculated proportionally based on actual days worked.'}
                                </Alert>
                            </>
                        )}
                    </Box>
                </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button 
                    onClick={handleSubmit} 
                    variant="contained" 
                    fullWidth
                    disabled={loading || fetching} 
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                    sx={{ bgcolor: '#08a3cd', '&:hover': { bgcolor: '#068fb3' } }}
                >
                    {id ? 'Save Changes' : 'Create'}
                </Button>
            </DialogActions>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Dialog>
    );
}
