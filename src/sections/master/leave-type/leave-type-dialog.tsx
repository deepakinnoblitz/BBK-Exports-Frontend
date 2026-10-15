import type { 
    LeaveType
} from 'src/api/masters';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { 
    getLeaveType, 
    createLeaveType, 
    updateLeaveType, 
    renameLeaveType
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

export const MONTH_OPTIONS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export interface EncashmentCycleItem {
    id: string;
    from_month: string;
    to_month: string;
    payout_months: string[];
}

const ENCASHMENT_RATE_BASIS_OPTIONS = [
    'Gross / 26',
    'Basic + DA / 26',
    'Gross / Calendar Days',
    'Basic / 26',
];

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

    // Encashment & Payout States
    const [isEncashable, setIsEncashable] = useState(false);
    const [encashmentCycles, setEncashmentCycles] = useState<EncashmentCycleItem[]>([
        { id: '1', from_month: 'January', to_month: 'June', payout_months: ['June'] },
        { id: '2', from_month: 'July', to_month: 'December', payout_months: ['December'] },
    ]);
    const [encashmentRateBasis, setEncashmentRateBasis] = useState<string>('Gross / 26');
    const [encashmentComponentName, setEncashmentComponentName] = useState<string>('');

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
        setIsEncashable(false);
        setEncashmentCycles([
            { id: '1', from_month: 'January', to_month: 'June', payout_months: ['June'] },
            { id: '2', from_month: 'July', to_month: 'December', payout_months: ['December'] },
        ]);
        setEncashmentRateBasis('Gross / 26');
        setEncashmentComponentName('');
        setError('');
    };

    const handleAddCycle = () => {
        setEncashmentCycles((prev) => [
            ...prev,
            {
                id: Date.now().toString(),
                from_month: 'January',
                to_month: 'December',
                payout_months: ['December'],
            },
        ]);
    };

    const handleRemoveCycle = (cycleId: string) => {
        setEncashmentCycles((prev) => prev.filter((c) => c.id !== cycleId));
    };

    const handleCycleChange = (cycleId: string, field: keyof EncashmentCycleItem, value: any) => {
        setEncashmentCycles((prev) =>
            prev.map((c) => (c.id === cycleId ? { ...c, [field]: value } : c))
        );
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
                        setIsEncashable(!!data.is_encashable);

                        let loadedCycles: EncashmentCycleItem[] = [];
                        if (data.encashment_cycles) {
                            try {
                                const parsed = JSON.parse(data.encashment_cycles);
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                    loadedCycles = parsed.map((c: any, i: number) => ({
                                        id: String(i + 1),
                                        from_month: c.from_month || 'January',
                                        to_month: c.to_month || 'June',
                                        payout_months: Array.isArray(c.payout_months)
                                            ? c.payout_months
                                            : (c.payout_month ? [c.payout_month] : ['June']),
                                    }));
                                }
                            } catch (err) {
                                console.error('Failed to parse encashment_cycles:', err);
                            }
                        }

                        if (loadedCycles.length === 0 && data.encashment_payout_months) {
                            const months = data.encashment_payout_months.split(',').map((m: string) => m.trim()).filter(Boolean);
                            if (months.length === 1) {
                                loadedCycles = [
                                    { id: '1', from_month: 'January', to_month: 'December', payout_months: months }
                                ];
                            } else if (months.length >= 2) {
                                loadedCycles = [
                                    { id: '1', from_month: 'January', to_month: 'June', payout_months: [months[0]] },
                                    { id: '2', from_month: 'July', to_month: 'December', payout_months: [months[1]] }
                                ];
                            }
                        }

                        if (loadedCycles.length === 0) {
                            loadedCycles = [
                                { id: '1', from_month: 'January', to_month: 'June', payout_months: ['June'] },
                                { id: '2', from_month: 'July', to_month: 'December', payout_months: ['December'] }
                            ];
                        }

                        setEncashmentCycles(loadedCycles);
                        setEncashmentRateBasis(data.encashment_rate_basis || 'Gross / 26');
                        setEncashmentComponentName(data.encashment_component_name || '');
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

            const allPayoutMonths = Array.from(
                new Set(encashmentCycles.flatMap((c) => c.payout_months))
            ).join(', ');

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
                is_encashable: isEncashable ? 1 : 0,
                encashment_cycles: isEncashable
                    ? JSON.stringify(encashmentCycles.map((c) => ({
                        from_month: c.from_month,
                        to_month: c.to_month,
                        payout_months: c.payout_months
                    })))
                    : '',
                encashment_payout_months: isEncashable ? allPayoutMonths : '',
                encashment_rate_basis: encashmentRateBasis,
                encashment_component_name: encashmentComponentName,
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
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24, } }}>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{id ? 'Edit Leave Type' : 'New Leave Type'}</Typography>
                <Iconify icon="mingcute:close-line" onClick={onClose} sx={{ cursor: 'pointer', color: 'text.disabled' }} />
            </DialogTitle>

            <DialogContent dividers>
                {fetching ? (
                    <Box sx={{ py: 10, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <CircularProgress sx={{ color: '#059669' }} />
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

                    {/* Encashment / Payout Configuration Section */}
                    <Box sx={{ pt: 3, borderTop: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                    Encashment & Periodic Payout Rules
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    Configure periodic unavailed leave payouts using approved Leave Allocations (e.g. 6-month CL settlement, annual EL encashment)
                                </Typography>
                            </Box>
                            <FormControlLabel
                                control={
                                    <CustomSwitch
                                        checked={isEncashable}
                                        onChange={(e) => setIsEncashable(e.target.checked)}
                                        disabled={loading}
                                    />
                                }
                                label="Is Encashable"
                                sx={{
                                    m: 0,
                                    flexShrink: 0,
                                    whiteSpace: 'nowrap',
                                    '& .MuiFormControlLabel-label': { ml: 1, fontWeight: 600, whiteSpace: 'nowrap' }
                                }}
                            />
                        </Box>

                        {isEncashable && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04), p: 2.5, borderRadius: 1.5, border: 1, borderColor: 'primary.light' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                            Encashment Cycles & Payout Schedule
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                            Set From Month, To Month, and Payout Month (supports multiple encashments per year)
                                        </Typography>
                                    </Box>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
                                        onClick={handleAddCycle}
                                        disabled={loading}
                                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1 }}
                                    >
                                        Add Cycle
                                    </Button>
                                </Box>

                                <Stack spacing={2}>
                                    {encashmentCycles.map((cycle, idx) => (
                                        <Box
                                            key={cycle.id}
                                            sx={{
                                                p: 2,
                                                borderRadius: 1.5,
                                                bgcolor: 'background.paper',
                                                border: 1,
                                                borderColor: 'divider',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 1.5,
                                                boxShadow: (theme) => `0 1px 3px ${alpha(theme.palette.common.black, 0.04)}`
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Chip
                                                    label={`Cycle ${idx + 1}`}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                                                        color: 'primary.dark',
                                                        fontWeight: 700,
                                                        fontSize: '0.75rem',
                                                        borderRadius: '6px'
                                                    }}
                                                />
                                                {encashmentCycles.length > 1 && (
                                                    <Tooltip title="Remove this cycle">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleRemoveCycle(cycle.id)}
                                                            disabled={loading}
                                                        >
                                                            <Iconify icon="solar:trash-bin-trash-bold" width={17} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>

                                            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr 1.5fr' }} gap={2} alignItems="center">
                                                <FormControl fullWidth size="small" disabled={loading}>
                                                    <InputLabel id={`from-month-label-${cycle.id}`} shrink>From Month</InputLabel>
                                                    <Select
                                                        labelId={`from-month-label-${cycle.id}`}
                                                        value={cycle.from_month}
                                                        onChange={(e) => handleCycleChange(cycle.id, 'from_month', e.target.value)}
                                                        label="From Month"
                                                    >
                                                        {MONTH_OPTIONS.map((m) => (
                                                            <MenuItem key={m} value={m}>{m}</MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>

                                                <FormControl fullWidth size="small" disabled={loading}>
                                                    <InputLabel id={`to-month-label-${cycle.id}`} shrink>To Month</InputLabel>
                                                    <Select
                                                        labelId={`to-month-label-${cycle.id}`}
                                                        value={cycle.to_month}
                                                        onChange={(e) => handleCycleChange(cycle.id, 'to_month', e.target.value)}
                                                        label="To Month"
                                                    >
                                                        {MONTH_OPTIONS.map((m) => (
                                                            <MenuItem key={m} value={m}>{m}</MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>

                                                <Autocomplete
                                                    multiple
                                                    size="small"
                                                    disabled={loading}
                                                    options={MONTH_OPTIONS}
                                                    value={cycle.payout_months}
                                                    onChange={(_event, newValue) => {
                                                        handleCycleChange(cycle.id, 'payout_months', newValue);
                                                    }}
                                                    renderTags={(tagValue, getTagProps) =>
                                                        tagValue.map((option, index) => (
                                                            <Chip
                                                                label={option}
                                                                size="small"
                                                                {...getTagProps({ index })}
                                                                key={option}
                                                                sx={{
                                                                    bgcolor: '#00875a',
                                                                    color: '#ffffff',
                                                                    fontWeight: 600,
                                                                    borderRadius: '16px',
                                                                    height: 26,
                                                                    fontSize: '0.8rem',
                                                                    '& .MuiChip-deleteIcon': {
                                                                        color: 'rgba(255, 255, 255, 0.85)',
                                                                        '&:hover': { color: '#ffffff' },
                                                                    },
                                                                }}
                                                            />
                                                        ))
                                                    }
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            label="Payout Month(s)"
                                                            placeholder={cycle.payout_months.length === 0 ? "Select month" : ""}
                                                            InputLabelProps={{ shrink: true }}
                                                        />
                                                    )}
                                                />
                                            </Box>
                                        </Box>
                                    ))}
                                </Stack>

                                <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
                                    <FormControl fullWidth disabled={loading}>
                                        <InputLabel id="encashment-rate-basis-label" shrink>Daily Rate Calculation</InputLabel>
                                        <Select
                                            labelId="encashment-rate-basis-label"
                                            value={encashmentRateBasis}
                                            onChange={(e) => setEncashmentRateBasis(e.target.value as string)}
                                            label="Daily Rate Calculation"
                                        >
                                            {ENCASHMENT_RATE_BASIS_OPTIONS.map((opt) => (
                                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <TextField
                                        fullWidth
                                        label="Custom Component Name (Optional)"
                                        value={encashmentComponentName}
                                        onChange={(e) => setEncashmentComponentName(e.target.value)}
                                        disabled={loading}
                                        placeholder={`e.g. ${leaveTypeName || 'Leave'} Payout`}
                                        helperText="Custom earnings label on Salary Slip (defaults to '{Leave Type} Payout')"
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Box>

                                <Alert severity="info" sx={{ fontSize: 12 }}>
                                    Encashment is calculated exclusively using approved <strong>Leave Allocation</strong> DocType records (no fixed monthly quota). In each payout month, the system sums allocations in the cycle, subtracts leaves taken in that cycle (Payable Days = Leaves Allocated – Leaves Taken), and adds the earnings payout at ({encashmentRateBasis}).
                                </Alert>
                            </Box>
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
                    sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
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
