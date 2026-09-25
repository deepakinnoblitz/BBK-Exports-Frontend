import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { IoMdArrowBack, IoMdCheckmarkCircle } from 'react-icons/io';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { fNumber } from 'src/utils/format-number';

import { getHRSettings } from 'src/api/hr-management';
import { DashboardContent } from 'src/layouts/dashboard';
import { saveSalarySlip, getSalarySlipWithDetails } from 'src/api/salary-slips';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type Props = {
    id?: string;
};

export function SalarySlipEditView({ id: propId }: Props) {
    const params = useParams();
    const router = useRouter();
    const id = propId || params.id;

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<any>(null);

    const [hrSettings, setHRSettings] = useState<any>({
        default_currency: 'INR',
        currency_symbol: '₹',
        default_locale: 'en-IN',
    });

    const [baseEarnings, setBaseEarnings] = useState<any[]>([]);
    const [baseDeductions, setBaseDeductions] = useState<any[]>([]);
    const [popoverState, setPopoverState] = useState<{ el: HTMLElement | null; type: string | null }>({
        el: null,
        type: null,
    });

    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({
        open: false,
        message: '',
        severity: 'success',
    });

    function recalculateTotals(data: any) {
        const getNum = (v: any) => parseFloat(v) || 0;
        const round = (val: number) => Math.round(val * 100) / 100;

        const workingDays = getNum(data.total_working_days) || 1;
        const periodDays = getNum(data.total_days_in_period) || 0;
        const currentProration = periodDays / workingDays;

        // 1. Prorate individual components to the period (only if they haven't been manually edited)
        const updatedEarnings = (data.earnings || baseEarnings).map((item: any, idx: number) => {
            const baseItem = baseEarnings[idx] || item;
            const baseAmount = getNum(baseItem.base_amount || baseItem.amount);
            const isManual = item.isManual ?? false;

            if (isManual) return { ...item, isManual: true };

            return {
                ...item,
                amount: round(baseAmount * currentProration).toFixed(2),
                isManual: false,
            };
        });

        const updatedDeductions = (data.deductions || baseDeductions).map((item: any, idx: number) => {
            const baseItem = baseDeductions[idx] || item;
            const baseAmount = getNum(baseItem.base_amount || baseItem.amount);
            const isManual = item.isManual ?? false;

            if (isManual) return { ...item, isManual: true };

            return {
                ...item,
                amount: round(baseAmount * currentProration).toFixed(2),
                isManual: false,
            };
        });

        // 2. Sum up totals
        const grossPay = round(updatedEarnings.reduce((acc: number, curr: any) => acc + getNum(curr.amount), 0));
        const deductionsTotal = round(updatedDeductions.reduce((acc: number, curr: any) => acc + getNum(curr.amount), 0));

        // 3. Calculate LOP based on absent days relative to month base
        const lopDays = getNum(data.lop_days);
        const autoLopAmount = round((grossPay / (currentProration || 1)) * (lopDays / workingDays));

        const isManualLop = data.isManualLop ?? (data.lop !== undefined && Math.abs(getNum(data.lop) - autoLopAmount) > 0.1);
        const lopAmount = isManualLop ? getNum(data.lop) : autoLopAmount;

        const totalDeductions = round(deductionsTotal + lopAmount);
        const netPay = round(grossPay - totalDeductions);

        return {
            ...data,
            earnings: updatedEarnings,
            deductions: updatedDeductions,
            gross_pay: grossPay.toFixed(2),
            grand_gross_pay: grossPay.toFixed(2),
            lop: lopAmount.toFixed(2),
            total_deduction: totalDeductions.toFixed(2),
            net_pay: netPay.toFixed(2),
            grand_net_pay: netPay.toFixed(2),
            isManualLop,
        };
    }

    function handleInputChange(field: string, value: any) {
        setFormData((prev: any) => {
            const updated = { ...prev, [field]: value };

            const getNum = (v: any) => parseFloat(v) || 0;
            const numValue = getNum(value);
            const totalPeriod = getNum(updated.total_days_in_period);

            // Smart linking logic
            if (field === 'actual_present_days') {
                updated.lop_days = Math.max(0, totalPeriod - numValue);
                updated.half_day_count = numValue % 1 === 0.5 ? 1 : 0;
                updated.isManualLop = false;
            } else if (field === 'lop_days') {
                updated.actual_present_days = Math.max(0, totalPeriod - numValue);
                updated.isManualLop = false;
            } else if (field === 'total_days_in_period') {
                updated.lop_days = Math.max(0, numValue - getNum(updated.actual_present_days));
                updated.isManualLop = false;
            } else if (field === 'lop') {
                updated.isManualLop = true;
            }

            const result = recalculateTotals(updated);
            return { ...result, [field]: value };
        });
    }

    function handleComponentChange(listName: 'earnings' | 'deductions', index: number, value: any) {
        setFormData((prev: any) => {
            const newList = [...(prev[listName] || [])];
            newList[index] = { ...newList[index], amount: value, isManual: true };
            const updated = { ...prev, [listName]: newList };
            const result = recalculateTotals(updated);

            const finalResults = { ...result };
            finalResults[listName] = [...(result[listName] || [])];
            finalResults[listName][index] = { ...finalResults[listName][index], amount: value };

            return finalResults;
        });
    }

    useEffect(() => {
        getHRSettings().then(setHRSettings).catch(console.error);

        if (id) {
            setLoading(true);
            getSalarySlipWithDetails(id)
                .then((data) => {
                    setBaseEarnings(data.earnings || []);
                    setBaseDeductions(data.deductions || []);
                    setFormData(recalculateTotals(data));
                })
                .catch((err) => {
                    console.error('Failed to load salary slip:', err);
                    setSnackbar({ open: true, message: 'Failed to load salary slip', severity: 'error' });
                })
                .finally(() => setLoading(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleOpenPopover = (event: React.MouseEvent<HTMLElement>, type: string) => {
        setPopoverState({ el: event.currentTarget, type });
    };

    const handleClosePopover = () => {
        setPopoverState((prev) => ({ ...prev, el: null }));
    };

    const getPopoverTitle = () => {
        switch (popoverState.type) {
            case 'present':
                return 'Present Days';
            case 'physical':
                return 'Physical Attendance Days';
            case 'absent':
                return 'Absent Days';
            case 'half_day':
                return 'Half Days';
            case 'holiday':
                return 'Holidays';
            case 'unpaid_leave':
                return 'Unpaid Leaves';
            case 'paid_leave':
                return 'Paid Leaves';
            case 'lop':
                return 'LOP Days';
            default:
                return 'Attendance Breakdown';
        }
    };

    const getFilteredBreakdown = () => {
        const bd = formData?.days_breakdown || [];
        switch (popoverState.type) {
            case 'present':
                return bd.filter(
                    (d: any) =>
                        d.status.includes('Work') ||
                        d.status.includes('Paid Leave') ||
                        d.status.includes('Holiday')
                );
            case 'physical':
                return bd.filter((d: any) => d.status.includes('Work'));
            case 'absent':
                return bd.filter((d: any) => d.status.includes('Absent') || d.status.includes('Unpaid Leave'));
            case 'half_day':
                return bd.filter((d: any) => d.status.includes('(0.5)'));
            case 'holiday':
                return bd.filter((d: any) => d.status.includes('Holiday'));
            case 'unpaid_leave':
                return bd.filter((d: any) => d.status.includes('Unpaid Leave'));
            case 'paid_leave':
                return bd.filter((d: any) => d.status.includes('Paid Leave'));
            case 'lop':
                return bd.filter((d: any) => d.status.includes('Absent') || d.status.includes('Unpaid Leave'));
            default:
                return bd;
        }
    };

    const formatHoursToHrMin = (decimalHours: number) => {
        const hours = Math.floor(decimalHours);
        const mins = Math.round((decimalHours - hours) * 60);
        return `${hours}hr ${mins}mins`;
    };

    const renderInfoAction = (type: string) => (
        <IconButton
            size="small"
            onClick={(e) => handleOpenPopover(e, type)}
            sx={{
                p: 0,
                color: 'info.main',
                '&:hover': { bgcolor: (theme) => alpha(theme.palette.info.main, 0.08) },
            }}
        >
            <Iconify icon={'solar:info-circle-linear' as any} width={16} />
        </IconButton>
    );

    async function handleSave() {
        try {
            setIsSaving(true);
            await saveSalarySlip(formData);
            setSnackbar({ open: true, message: 'Salary Slip updated successfully', severity: 'success' });
            setTimeout(() => {
                router.push(`/salary-slips/${id}`);
            }, 600);
        } catch (error: any) {
            console.error('Failed to save salary slip:', error);
            setSnackbar({
                open: true,
                message: error.message || 'Failed to update salary slip',
                severity: 'error',
            });
            setIsSaving(false);
        }
    }

    const formatDate = (date: string) => {
        if (!date) return '-';
        return dayjs(date).format('DD-MM-YYYY');
    };

    if (loading) {
        return (
            <DashboardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <CircularProgress />
            </DashboardContent>
        );
    }

    if (!formData) {
        return (
            <DashboardContent maxWidth={false}>
                <Typography variant="h4">Salary slip not found</Typography>
                <Button onClick={() => router.push('/salary-slips')} sx={{ mt: 3 }}>
                    Go back to list
                </Button>
            </DashboardContent>
        );
    }

    // ── Header (Exact Dialog UI) ──────────────────────────────────────────────
    const renderHeader = (
        <Box
            sx={{
                p: 2,
                mb: 3,
                textAlign: 'center',
                borderRadius: 2,
                bgcolor: (theme) => alpha(theme.palette.info.main, 0.04),
                border: (theme) => `1px solid ${alpha(theme.palette.info.main, 0.12)}`,
            }}
        >
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800, color: 'info.main', fontSize: '18px' }}>
                EDIT SALARY SLIP
            </Typography>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Period: {formatDate(formData.pay_period_start)} — {formatDate(formData.pay_period_end)}
            </Typography>
        </Box>
    );

    // ── Employee Details (Exact Dialog UI) ────────────────────────────────────
    const renderEmployeeDetails = (
        <Box sx={{ mb: 4 }}>
            <Box
                sx={{
                    borderRadius: 1.5,
                    display: 'grid',
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                }}
            >
                <SubHeader title="Employee Information" />
                <InfoRow label="Employee Name" value={formData.employee_name || '-'} />
                <InfoRow label="Employee ID" value={formData.employee || '-'} />
                <InfoRow label="Father / Husband Name" value={formData.father_husband_name || '-'} />

                <SubHeader title="Contact Details" />
                <InfoRow label="Official Email" value={formData.email || '-'} />
                <InfoRow label="Personal Email" value={formData.personal_email || '-'} />
                <InfoRow label="Employee Phone Number" value={formData.phone_number || '-'} />

                <SubHeader title="Job Details" />
                <InfoRow label="Department" value={formData.department || '-'} />
                <InfoRow label="Designation" value={formData.designation || '-'} />
                <InfoRow label="Date of Joining" value={formatDate(formData.date_of_joining)} />

                <SubHeader title="Bank Details" />
                <InfoRow label="Account Name" value={formData.bank_account_name || '-'} />
                <InfoRow label="Account No" value={formData.account_number || '-'} />
                <InfoRow label="Bank Name" value={formData.bank_name || '-'} />
                <InfoRow label="Branch" value={formData.branch || '-'} />
                <InfoRow label="IFSC" value={formData.ifsc_code || '-'} />
            </Box>
        </Box>
    );

    // ── Attendance Summary (Exact Dialog UI) ──────────────────────────────────
    const renderAttendanceSummary = (
        <Box sx={{ mb: 4 }}>
            <SectionHeader title="Attendance Summary" icon={'solar:calendar-date-bold' as any} color="warning.main" />
            <Box
                sx={{
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    boxShadow: (theme) => theme.customShadows?.card || `0 2px 8px ${alpha(theme.palette.common.black, 0.05)}`,
                }}
            >
                <Box
                    sx={{
                        display: 'grid',
                        columnGap: 4,
                        rowGap: 1.5,
                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    }}
                >
                    <SleekEditRow
                        label="Pay Period Days"
                        value={formData.total_days_in_period}
                        onChange={(val) => handleInputChange('total_days_in_period', val)}
                    />
                    <SleekEditRow
                        label="Calculation Base (Month)"
                        value={formData.total_working_days}
                        onChange={(val) => handleInputChange('total_working_days', val)}
                    />
                    <SleekEditRow
                        label="No of Present Days"
                        value={formData.actual_present_days}
                        onChange={(val) => handleInputChange('actual_present_days', val)}
                        action={renderInfoAction('present')}
                    />
                    <SleekEditRow
                        label="Physical Attendance"
                        value={formData.physical_attendance_days}
                        onChange={(val) => handleInputChange('physical_attendance_days', val)}
                        action={renderInfoAction('physical')}
                    />
                    <SleekEditRow
                        label="No of Absent"
                        value={formData.lop_days}
                        onChange={(val) => handleInputChange('lop_days', val)}
                        action={renderInfoAction('absent')}
                    />
                    <SleekEditRow
                        label="No of Half Day"
                        value={formData.half_day_count}
                        onChange={(val) => handleInputChange('half_day_count', val)}
                        action={renderInfoAction('half_day')}
                    />
                    <SleekEditRow
                        label="Holidays Found"
                        value={formData.holiday_count}
                        onChange={(val) => handleInputChange('holiday_count', val)}
                        action={renderInfoAction('holiday')}
                    />
                    <SleekEditRow
                        label="No of Unpaid Leave"
                        value={formData.no_of_leave || 0}
                        onChange={(val) => handleInputChange('no_of_leave', val)}
                        action={renderInfoAction('unpaid_leave')}
                    />
                    <SleekEditRow
                        label="No of Paid Leave"
                        value={formData.no_of_paid_leave || 0}
                        onChange={(val) => handleInputChange('no_of_paid_leave', val)}
                        action={renderInfoAction('paid_leave')}
                    />
                    <SleekEditRow
                        label="LOP Days"
                        value={formData.lop_days}
                        onChange={(val) => handleInputChange('lop_days', val)}
                        action={renderInfoAction('lop')}
                    />
                </Box>
            </Box>
        </Box>
    );

    // ── Salary Breakdown (Exact Dialog UI) ────────────────────────────────────
    const renderSalaryBreakdown = (
        <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                {/* Earnings */}
                <Box
                    sx={{
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: (theme) => alpha(theme.palette.success.main, 0.04),
                        border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.12)}`,
                    }}
                >
                    <SectionHeader title="Earnings" icon={'solar:wad-of-money-bold' as any} color="success.main" />

                    <Stack spacing={2}>
                        {(formData.earnings || []).map((item: any, idx: number) => (
                            <EditAmountRow
                                key={idx}
                                label={item.component_name || item.salary_component}
                                amount={item.amount}
                                hrSettings={hrSettings}
                                onChange={(val) => handleComponentChange('earnings', idx, val)}
                            />
                        ))}
                        <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                        <TotalRow
                            label="Gross Earnings"
                            amount={formData.gross_pay}
                            color="success.main"
                            hrSettings={hrSettings}
                        />
                    </Stack>
                </Box>

                {/* Deductions */}
                <Box
                    sx={{
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: (theme) => alpha(theme.palette.error.main, 0.04),
                        border: (theme) => `1px solid ${alpha(theme.palette.error.main, 0.12)}`,
                    }}
                >
                    <SectionHeader title="Deductions" icon={'solar:hand-money-bold' as any} color="error.main" />

                    <Stack spacing={2}>
                        {(formData.deductions || []).map((item: any, idx: number) => (
                            <EditAmountRow
                                key={idx}
                                label={item.component_name || item.salary_component}
                                amount={item.amount}
                                hrSettings={hrSettings}
                                onChange={(val) => handleComponentChange('deductions', idx, val)}
                            />
                        ))}
                        <EditAmountRow
                            label="LOP"
                            amount={formData.lop}
                            hrSettings={hrSettings}
                            onChange={(val) => handleInputChange('lop', val)}
                        />
                        <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                        <TotalRow
                            label="Total Deductions"
                            amount={formData.total_deduction}
                            color="error.main"
                            hrSettings={hrSettings}
                        />
                    </Stack>
                </Box>
            </Box>
        </Box>
    );

    // ── Net Pay Summary (Exact Dialog UI) ─────────────────────────────────────
    const renderNetPay = (
        <Box
            sx={{
                p: 3,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'common.white',
                background: (theme) =>
                    `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: (theme) => `0 8px 24px -4px ${alpha(theme.palette.primary.main, 0.4)}`,
            }}
        >
            <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: 1 }}>
                    NET SALARY PAYABLE
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.72, fontWeight: 500 }}>
                    (Updated in real-time)
                </Typography>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center' }}>
                <Box component="span" sx={{ fontFamily: "Arial, 'sans-serif'", mr: 1, fontSize: '0.7em', color: 'common.white' }}>
                    {hrSettings.currency_symbol}
                </Box>
                {fNumber(formData.grand_net_pay || 0, { locale: hrSettings.default_locale, minimumFractionDigits: 2 })}
            </Typography>
        </Box>
    );

    const filteredBreakdown = getFilteredBreakdown();

    return (
        <DashboardContent maxWidth={false}>
            {/* Top Heading and Button Style like Invoice Page */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={4} mt={2} className="no-print">
                <Typography variant="h4">Edit Salary Slip: {formData.name}</Typography>
                <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => router.push(`/salary-slips/${id}`)}
                        startIcon={<IoMdArrowBack size={20} />}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 2.5,
                            '&:hover': {
                                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                                borderColor: 'text.primary',
                            },
                        }}
                    >
                        Go Back
                    </Button>

                    <LoadingButton
                        variant="contained"
                        loading={isSaving}
                        onClick={handleSave}
                        startIcon={<IoMdCheckmarkCircle size={20} />}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            bgcolor: '#059669',
                            color: 'common.white',
                            '&:hover': { bgcolor: '#047857' },
                        }}
                    >
                        Save Changes
                    </LoadingButton>
                </Stack>
            </Stack>

            {/* Exactly the Dialog UI rendered inside a full width Card on page */}
            <Card
                sx={{
                    p: { xs: 2.5, sm: 4 },
                    width: 1,
                    borderRadius: 2,
                    boxShadow: (themeVar) => themeVar.customShadows?.z16,
                }}
            >
                {renderHeader}
                {renderEmployeeDetails}
                {renderAttendanceSummary}
                <Divider sx={{ my: 4, borderStyle: 'dashed' }} />
                {renderSalaryBreakdown}
                {renderNetPay}
            </Card>

            {/* Attendance Breakdown Popover */}
            <Popover
                open={Boolean(popoverState.el)}
                anchorEl={popoverState.el}
                onClose={handleClosePopover}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                PaperProps={{
                    sx: { p: 2, width: 400, maxHeight: 400 },
                }}
                disableScrollLock
            >
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
                    {getPopoverTitle()}
                </Typography>
                <Scrollbar>
                    <Stack spacing={1.5}>
                        {filteredBreakdown.length > 0 ? (
                            filteredBreakdown.map((day: any, idx: number) => {
                                let colorStr = 'text.secondary';
                                if (day.status.includes('Work') && day.status.includes('Absent')) colorStr = 'warning.main';
                                else if (day.status.includes('Absent')) colorStr = 'error.main';
                                else if (day.status.includes('Work')) colorStr = 'success.main';
                                else if (day.status.includes('Holiday')) colorStr = 'info.main';
                                else if (day.status.includes('Leave')) colorStr = 'warning.main';

                                return (
                                    <Box
                                        key={idx}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            py: 1,
                                            px: 1.5,
                                            borderRadius: 1,
                                            transition: 'background-color 0.2s',
                                            '&:hover': { bgcolor: 'action.hover' },
                                            ...(idx !== filteredBreakdown.length - 1 && {
                                                borderBottom: (theme) => `1px dashed ${theme.palette.divider}`,
                                            }),
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {dayjs(day.date).format('DD-MM-YYYY - dddd')}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: colorStr,
                                                    fontWeight: 700,
                                                    px: 1,
                                                    py: 0.25,
                                                    borderRadius: 0.5,
                                                    bgcolor: (theme) =>
                                                        alpha(
                                                            theme.palette[
                                                                colorStr.replace('.main', '') as 'success' | 'info' | 'warning' | 'error'
                                                            ]?.main || theme.palette.text.secondary,
                                                            0.12
                                                        ),
                                                }}
                                            >
                                                {(() => {
                                                    if (
                                                        (popoverState.type === 'absent' || popoverState.type === 'lop') &&
                                                        day.status.includes('Work') &&
                                                        day.status.includes('Absent')
                                                    )
                                                        return 'Half Day Absent';
                                                    if (
                                                        ['present', 'physical', 'half_day'].includes(popoverState.type || '') &&
                                                        day.status.includes('Work') &&
                                                        day.status.includes('Absent')
                                                    )
                                                        return 'Present Half Day';
                                                    return day.status
                                                        .replaceAll('(1.0)', 'Full Day')
                                                        .replaceAll('(0.5)', 'Half Day')
                                                        .replace('Work', 'Present');
                                                })()}
                                            </Typography>
                                            {day.hours ? (
                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                                    {formatHoursToHrMin(day.hours)}
                                                </Typography>
                                            ) : null}
                                        </Box>
                                    </Box>
                                );
                            })
                        ) : (
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.disabled', fontStyle: 'italic', textAlign: 'center', display: 'block', mt: 1 }}
                            >
                                No days found for this category
                            </Typography>
                        )}
                    </Stack>
                </Scrollbar>
            </Popover>

            {/* Snackbar Notification */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Box
                    sx={{
                        bgcolor: snackbar.severity === 'error' ? 'error.main' : 'success.main',
                        color: 'common.white',
                        px: 2,
                        py: 1.5,
                        borderRadius: 1,
                        boxShadow: (t) => t.customShadows?.z8,
                    }}
                >
                    <Typography variant="subtitle2">{snackbar.message}</Typography>
                </Box>
            </Snackbar>
        </DashboardContent>
    );
}

// ----------------------------------------------------------------------

function SectionHeader({ title, icon, color = 'text.secondary' }: { title: string; icon: string; color?: string }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Iconify icon={icon as any} width={22} sx={{ mr: 1.5, color }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {title}
            </Typography>
        </Box>
    );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
    return (
        <Box sx={{ px: 2.5, py: 2, borderBottom: (theme) => `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
            <Typography
                variant="caption"
                sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontWeight: 500, fontSize: '13px' }}
            >
                {label}
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {value ?? '-'}
            </Typography>
        </Box>
    );
}

function SubHeader({ title }: { title: string }) {
    return (
        <Box
            sx={{
                gridColumn: '1 / -1',
                bgcolor: 'rgb(245 245 245 / 56%)',
                py: 1.5,
                px: 2.5,
                borderBottom: (theme) => `1px solid ${alpha(theme.palette.divider, 0.4)}`,
            }}
        >
            <Typography
                variant="overline"
                sx={{
                    color: 'text.secondary',
                    fontWeight: 800,
                    fontSize: 13,
                }}
            >
                {title}
            </Typography>
        </Box>
    );
}

function SleekEditRow({
    label,
    value,
    onChange,
    action,
}: {
    label: string;
    value: number;
    onChange: (val: string) => void;
    action?: React.ReactNode;
}) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1,
                borderBottom: (theme) => `1px dashed ${alpha(theme.palette.divider, 1)}`,
                '&:last-child': { borderBottom: 0 },
            }}
        >
            <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {label}
                </Typography>
                {action}
            </Stack>

            <TextField
                size="small"
                inputMode="decimal"
                value={value ?? ''}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                    const val = e.target.value;
                    const cleanVal = val.replace(/^0+(?=\d)/, '');
                    onChange(cleanVal);
                }}
                autoComplete="off"
                sx={{
                    width: 150,
                    '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                            borderColor: (theme) => alpha(theme.palette.grey[500], 0.2),
                            borderRadius: 1,
                        },
                        '&:hover fieldset': {
                            borderColor: (theme) => alpha(theme.palette.grey[500], 0.4),
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: 'primary.main',
                            borderWidth: '1px !important',
                        },
                        bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
                    },
                    '& .MuiOutlinedInput-input': {
                        fontWeight: 800,
                        py: 0.8,
                        px: 1.5,
                        textAlign: 'right',
                        fontSize: '15px',
                    },
                }}
            />
        </Box>
    );
}

function EditAmountRow({
    label,
    amount,
    hrSettings,
    onChange,
}: {
    label: string;
    amount: any;
    hrSettings: any;
    onChange: (val: string) => void;
}) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {label}
            </Typography>
            <TextField
                size="small"
                inputMode="decimal"
                value={amount ?? ''}
                onFocus={(e) => {
                    e.target.select();
                }}
                onBlur={(e) => {
                    const val = e.target.value;
                    if (val !== '') {
                        onChange(parseFloat(val).toFixed(2));
                    }
                }}
                onChange={(e) => {
                    const val = e.target.value;
                    const cleanVal = val.replace(/^0+(?=\d)/, '');
                    onChange(cleanVal);
                }}
                sx={{
                    width: 150,
                    '& .MuiOutlinedInput-root': {
                        bgcolor: 'background.paper',
                        transition: (theme) => theme.transitions.create(['border-color', 'box-shadow']),
                        '&:hover': {
                            '& fieldset': {
                                borderColor: (theme) => alpha(theme.palette.grey[500], 0.48),
                            },
                        },
                        '&.Mui-focused': {
                            '& fieldset': {
                                borderColor: 'primary.main',
                                borderWidth: '1px !important',
                            },
                            boxShadow: (theme) => `0 0 8px 0 ${alpha(theme.palette.primary.main, 0.16)}`,
                        },
                        '& fieldset': {
                            borderColor: (theme) => alpha(theme.palette.grey[500], 0.24),
                            borderRadius: 1,
                        },
                    },
                }}
                autoComplete="off"
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <Box
                                component="span"
                                sx={{
                                    fontWeight: 700,
                                    color: 'text.secondary',
                                    fontSize: '1rem',
                                    mr: 0.5,
                                    fontFamily: "'Arial', sans-serif",
                                }}
                            >
                                {hrSettings.currency_symbol}
                            </Box>
                        </InputAdornment>
                    ),
                    sx: {
                        fontWeight: 700,
                        height: 42,
                    },
                }}
            />
        </Box>
    );
}

function TotalRow({
    label,
    amount,
    color,
    hrSettings,
}: {
    label: string;
    amount: number;
    color?: string;
    hrSettings: any;
}) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ color: color || 'text.primary', fontWeight: 700 }}>
                {label}
            </Typography>
            <Typography
                variant="subtitle1"
                sx={{ fontWeight: 800, color: color || 'inherit', display: 'flex', alignItems: 'center' }}
            >
                <Box component="span" sx={{ fontFamily: "'Arial', sans-serif", mr: 0.5, fontSize: '0.9em' }}>
                    {hrSettings.currency_symbol}
                </Box>
                {fNumber(amount || 0, { locale: hrSettings.default_locale, minimumFractionDigits: 2 })}
            </Typography>
        </Box>
    );
}
