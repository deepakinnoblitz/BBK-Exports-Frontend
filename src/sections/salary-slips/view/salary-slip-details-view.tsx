import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { IoMdArrowDropdown } from 'react-icons/io';
import { IoMdPrint, IoMdTrash, IoMdCreate, IoMdArrowBack, IoMdCheckmarkCircle, IoMdCloseCircle } from 'react-icons/io';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { fNumber } from 'src/utils/format-number';

import { getHRSettings } from 'src/api/hr-management';
import { DashboardContent } from 'src/layouts/dashboard';
import { COMMON_COLORS, COMMON_BUTTON_STYLES } from 'src/theme';
import {
    deleteSalarySlip,
    submitSalarySlip,
    cancelSalarySlip,
    getSalarySlipDownloadUrl,
    getSalarySlipWithDetails,
} from 'src/api/salary-slips';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { useAuth } from 'src/auth/auth-context';

// ----------------------------------------------------------------------

type Props = {
    id?: string;
};

export function SalarySlipDetailsView({ id: propId }: Props) {
    const params = useParams();
    const router = useRouter();
    const id = propId || params.id;

    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && (user?.permissions?.actions?.salary_slips || user?.permissions?.actions?.my_salary_slip);
    const actionPerms = user?.permissions?.actions?.salary_slips || user?.permissions?.actions?.my_salary_slip;
    const canEditSalarySlip = hasCustomPerms && actionPerms ? !!actionPerms?.edit : true;
    const canDeleteSalarySlip = hasCustomPerms && actionPerms ? !!actionPerms?.delete : true;

    const [slip, setSlip] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

    const [hrSettings, setHRSettings] = useState<any>({
        default_currency: 'INR',
        currency_symbol: '₹',
        default_locale: 'en-IN',
    });

    const [popoverState, setPopoverState] = useState<{ el: HTMLButtonElement | null; type: string }>({
        el: null,
        type: '',
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

    const fetchSlip = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await getSalarySlipWithDetails(id);
            setSlip(data);
        } catch (err: any) {
            console.error('Failed to load salary slip:', err);
            setSnackbar({
                open: true,
                message: err.message || 'Failed to load salary slip details',
                severity: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getHRSettings().then(setHRSettings).catch(console.error);
        fetchSlip();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handlePopoverOpen = (event: React.MouseEvent<HTMLButtonElement>, type: string) => {
        setPopoverState({ el: event.currentTarget, type });
    };

    const handlePopoverClose = () => {
        setPopoverState((prev) => ({ ...prev, el: null }));
    };

    const handlePrintFormat = (formatName?: string) => {
        if (!slip?.name) return;
        const empType = (slip?.employee_type || '').toLowerCase();
        let defaultFormat: string | undefined;
        if (empType.includes('north indian')) {
            defaultFormat = 'North Indian Form 25B Pay Slip';
        } else if (empType.includes('worker')) {
            defaultFormat = 'Worker Form 25B Pay Slip';
        } else {
            defaultFormat = undefined;
        }
        const url = getSalarySlipDownloadUrl(slip.name, formatName || defaultFormat);
        window.open(url, '_blank');
    };

    const handleDownload = () => {
        handlePrintFormat();
    };

    const handleDelete = async () => {
        if (!id) return;
        try {
            setDeleting(true);
            await deleteSalarySlip(id);
            setSnackbar({ open: true, message: 'Salary slip deleted successfully', severity: 'success' });
            setTimeout(() => {
                router.push('/salary-slips');
            }, 600);
        } catch (err: any) {
            console.error('Failed to delete salary slip:', err);
            setSnackbar({
                open: true,
                message: err.message || 'Failed to delete salary slip',
                severity: 'error',
            });
            setDeleting(false);
        }
    };

    const handleSubmit = async () => {
        if (!id) return;
        try {
            setSubmitting(true);
            await submitSalarySlip(id);
            setSnackbar({ open: true, message: 'Salary slip submitted successfully', severity: 'success' });
            setConfirmSubmitOpen(false);
            fetchSlip();
        } catch (err: any) {
            console.error('Failed to submit salary slip:', err);
            setSnackbar({
                open: true,
                message: err.message || 'Failed to submit salary slip',
                severity: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async () => {
        if (!id) return;
        try {
            setCancelling(true);
            await cancelSalarySlip(id);
            setSnackbar({ open: true, message: 'Salary slip cancelled successfully', severity: 'success' });
            setConfirmCancelOpen(false);
            fetchSlip();
        } catch (err: any) {
            console.error('Failed to cancel salary slip:', err);
            setSnackbar({
                open: true,
                message: err.message || 'Failed to cancel salary slip',
                severity: 'error',
            });
        } finally {
            setCancelling(false);
        }
    };

    const formatDate = (date: string) => {
        if (!date) return '-';
        return dayjs(date).format('DD-MM-YYYY');
    };

    const formatHoursToHrMin = (hours: number) => {
        if (!hours) return '';
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        if (h > 0 && m > 0) return `${h}hr ${m}mins`;
        if (h > 0) return `${h}hr`;
        return `${m}mins`;
    };

    const getPopoverTitle = () => {
        switch (popoverState.type) {
            case 'present': return 'Present Days';
            case 'physical': return 'Physical Attendance';
            case 'absent': return 'Absent Days';
            case 'half_day': return 'Half Days';
            case 'holiday': return 'Holidays';
            case 'unpaid_leave': return 'Unpaid Leaves';
            case 'paid_leave': return 'Paid Leaves';
            case 'comp_off': return 'Compensatory Off';
            case 'lop': return 'LOP Days';
            default: return 'Attendance Breakdown';
        }
    };

    const isDirectAllocation = (slip?.leave_calc_source || hrSettings?.salary_leave_calculation_source) === 'Via Direct Allocation';

    const getFilteredBreakdown = () => {
        const bd = slip?.days_breakdown || [];
        switch (popoverState.type) {
            case 'present': {
                const days = bd.filter((d: any) => d.status.includes('Work') || d.status.includes('Paid Leave') || d.status.includes('Compensatory Off'));
                const isDirect = isDirectAllocation || (Number(slip?.no_of_paid_leave || 0) > 0 && !bd.some((d: any) => d.status.includes('Paid Leave')));
                if (isDirect && Number(slip?.no_of_paid_leave || 0) > 0) {
                    return [
                        ...days,
                        {
                            date: slip?.pay_period_start,
                            isDirectCredit: true,
                            holiday_desc: 'Leave Allocation Credit',
                            status: `Paid Leave (+${slip.no_of_paid_leave} Day${Number(slip.no_of_paid_leave) > 1 ? 's' : ''})`,
                        }
                    ];
                }
                return days;
            }
            case 'physical': return bd.filter((d: any) => d.status.includes('Work'));
            case 'absent': return bd.filter((d: any) => (d.status.includes('Absent') || d.status.includes('Unpaid Leave')) && !d.status.includes('Compensatory Off') && !d.status.includes('Paid Leave'));
            case 'half_day': return bd.filter((d: any) => d.status.includes('(0.5)'));
            case 'holiday': return slip?.holidays_details?.length ? slip.holidays_details : bd.filter((d: any) => d.is_holiday || d.status?.includes('Holiday'));
            case 'unpaid_leave': return bd.filter((d: any) => (d.status.includes('Unpaid Leave') || (!isDirectAllocation && d.status.includes('Absent'))) && !d.status.includes('Compensatory Off') && !d.status.includes('Paid Leave'));
            case 'paid_leave': return bd.filter((d: any) => d.status.includes('Paid Leave') && !d.status.includes('Compensatory Off'));
            case 'comp_off': return bd.filter((d: any) => d.status.includes('Compensatory Off'));
            case 'lop': return bd.filter((d: any) => (d.status.includes('Absent') || d.status.includes('Unpaid Leave')) && !d.status.includes('Compensatory Off') && !d.status.includes('Paid Leave'));
            default: return bd;
        }
    };

    const filteredBreakdown = getFilteredBreakdown();

    const getPopoverCount = () => {
        if (!slip) return filteredBreakdown.length;
        switch (popoverState.type) {
            case 'present': return slip.actual_present_days !== undefined && slip.actual_present_days !== null ? slip.actual_present_days : filteredBreakdown.length;
            case 'physical': return slip.physical_attendance_days !== undefined && slip.physical_attendance_days !== null ? slip.physical_attendance_days : filteredBreakdown.length;
            case 'absent': return slip.absent_days !== undefined && slip.absent_days !== null ? slip.absent_days : ((slip.lop_days || 0) + (isDirectAllocation ? (slip.no_of_paid_leave || 0) : 0));
            case 'half_day': return slip.half_day_count !== undefined && slip.half_day_count !== null ? slip.half_day_count : filteredBreakdown.length;
            case 'holiday': return slip.holiday_count !== undefined && slip.holiday_count !== null ? slip.holiday_count : filteredBreakdown.length;
            case 'unpaid_leave': return slip.no_of_leave !== undefined && slip.no_of_leave !== null ? slip.no_of_leave : filteredBreakdown.length;
            case 'paid_leave': return slip.no_of_paid_leave !== undefined && slip.no_of_paid_leave !== null ? slip.no_of_paid_leave : filteredBreakdown.length;
            case 'comp_off': return slip.no_of_comp_off !== undefined && slip.no_of_comp_off !== null ? slip.no_of_comp_off : filteredBreakdown.length;
            case 'lop': return slip.lop_days !== undefined && slip.lop_days !== null ? slip.lop_days : filteredBreakdown.length;
            default: return filteredBreakdown.length;
        }
    };

    if (loading) {
        return (
            <DashboardContent maxWidth={false}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '70vh',
                        width: '100%',
                    }}
                >
                    <CircularProgress />
                </Box>
            </DashboardContent>
        );
    }

    if (!slip) {
        return (
            <DashboardContent maxWidth={false}>
                <Typography variant="h4">Salary slip not found</Typography>
                <Button onClick={() => router.push('/salary-slips')} sx={{ mt: 3 }}>
                    Go back to list
                </Button>
            </DashboardContent>
        );
    }

    const isDraft = slip.docstatus === 0;

    // ── Header (Exact Dialog UI) ──────────────────────────────────────────────
    const renderHeader = (
        <Box
            sx={{
                p: 2,
                mb: 3,
                textAlign: 'center',
                borderRadius: 2,
                position: 'relative',
                overflow: 'hidden',
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
            }}
        >
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800, color: 'primary.main', fontSize: '22px' }}>
                SALARY SLIP
            </Typography>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Period: {formatDate(slip.pay_period_start)} — {formatDate(slip.pay_period_end)}
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
                <InfoRow label="Employee Name" value={slip.employee_name} />
                <InfoRow label="Employee ID" value={slip.employee_id || slip.employee} />
                <InfoRow label="Father / Husband Name" value={slip.father_husband_name || '-'} />

                <SubHeader title="Contact Details" />
                <InfoRow label="Official Email" value={slip.email || '-'} />
                <InfoRow label="Personal Email" value={slip.personal_email || '-'} />
                <InfoRow label="Employee Phone Number" value={slip.phone_number || '-'} />

                <SubHeader title="Job Details" />
                <InfoRow label="Employee Type" value={slip.employee_type || '-'} />
                <InfoRow label="Department" value={slip.department || '-'} />
                <InfoRow label="Designation" value={slip.designation || '-'} />
                <InfoRow label="Date of Joining" value={formatDate(slip.date_of_joining)} />

                <SubHeader title="Bank Details" />
                <InfoRow label="Account Name" value={slip.bank_account_name || '-'} />
                <InfoRow label="Account No" value={slip.account_number || '-'} />
                <InfoRow label="Bank Name" value={slip.bank_name || '-'} />
                <InfoRow label="Branch" value={slip.branch || '-'} />
                <InfoRow label="IFSC" value={slip.ifsc_code || '-'} />
            </Box>
        </Box>
    );

    // ── Attendance Summary (Exact Dialog UI) ──────────────────────────────────
    const renderAttendanceSummary = (
        <Box sx={{ mb: 4 }}>
            <SectionHeader title="Attendance & Overtime Summary" icon="solar:calendar-date-bold" color="warning.main" />
            <Box
                sx={{
                    p: 3,
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2.5,
                    bgcolor: (theme) => alpha(theme.palette.warning.main, 0.04),
                    border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.12)}`,
                }}
            >
                {(() => {
                    const renderInfoAction = (type: string) => {
                        if (isDirectAllocation && (type === 'paid_leave' || type === 'unpaid_leave')) {
                            return undefined;
                        }
                        return slip.days_breakdown && slip.days_breakdown.length > 0 ? (
                            <IconButton
                                size="small"
                                onClick={(e) => handlePopoverOpen(e, type)}
                                sx={{ p: 0.5, color: 'info.main' }}
                            >
                                <Iconify icon={'eva:info-outline' as any} width={16} />
                            </IconButton>
                        ) : undefined;
                    };

                    return (
                        <>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gap: 3,
                                    gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                                }}
                            >
                                <InfoRow
                                    label="Working Days"
                                    value={
                                        slip.working_days_basis === 'Fixed Number of Days'
                                            ? `Fixed (${slip.fixed_working_days || 26} Days)`
                                            : `${slip.total_working_days || 26} Days`
                                    }
                                />
                                <InfoRow
                                    label="Days Worked"
                                    value={`${slip.holiday_working_days ?? ((slip.total_days_in_period || 30) - (slip.holiday_count || 0))} Days`}
                                />
                                <InfoRow
                                    label="Holidays Found"
                                    value={slip.holiday_count || 0}
                                    action={renderInfoAction('holiday')}
                                />
                                <InfoRow label="Overtime (OT) Hours" value={slip.ot_hours ? `${slip.ot_hours} hrs` : '0 hrs'} />
                            </Box>

                            <Divider sx={{ my: 0.5 }} />

                            <Box
                                sx={{
                                    display: 'grid',
                                    gap: 3,
                                    gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                                }}
                            >
                                <InfoRow label="No of Present Days" value={slip.actual_present_days || 0} action={renderInfoAction('present')} />
                                <InfoRow label="Physical Attendance" value={slip.physical_attendance_days || 0} action={renderInfoAction('physical')} />
                                <InfoRow label="No of Absent" value={slip.absent_days !== undefined && slip.absent_days !== null ? slip.absent_days : ((slip.lop_days || 0) + (isDirectAllocation ? (slip.no_of_paid_leave || 0) : 0))} action={renderInfoAction('absent')} />
                                <InfoRow label="No of Half Day" value={slip.half_day_count || 0} action={renderInfoAction('half_day')} />
                                <InfoRow label="No of Unpaid Leave" value={slip.unpaid_leave_days !== undefined && slip.unpaid_leave_days !== null ? slip.unpaid_leave_days : (slip.no_of_leave || 0)} action={renderInfoAction('unpaid_leave')} />
                                <InfoRow label="No of Paid Leave" value={slip.no_of_paid_leave || 0} action={renderInfoAction('paid_leave')} />
                                <InfoRow label="Compensatory Off" value={slip.no_of_comp_off || 0} action={renderInfoAction('comp_off')} />
                                <InfoRow label="LOP Days" value={slip.lop_days || 0} action={renderInfoAction('lop')} />
                            </Box>
                        </>
                    );
                })()}
            </Box>
        </Box>
    );

    const baseGrossPay = slip.base_gross_pay !== undefined && slip.base_gross_pay !== null && Number(slip.base_gross_pay) > 0
        ? Number(slip.base_gross_pay)
        : (() => {
            const baseEarnings = (slip.earnings || []).filter((e: any) => {
                const name = (e.component_name || e.salary_component || '').trim();
                return !['Overtime Pay (OT)', 'Overtime Allowance', 'Attendance Bonus'].includes(name);
            });
            if (baseEarnings.length > 0) {
                return baseEarnings.reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0);
            }
            return Math.max(0, Number(slip.gross_pay || 0) - Number(slip.ot_amount || 0) - Number(slip.attendance_bonus || 0));
        })();

    const renderDetailedSummary = (
        <Box sx={{ mb: 4 }}>
            <SectionHeader title="Calculation Logic & Breakdown" icon="solar:programming-bold" color="info.main" />

            <Box
                sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    display: 'grid',
                    gap: 1,
                    bgcolor: (theme) => alpha(theme.palette.info.main, 0.04),
                    border: (theme) => `1px solid ${alpha(theme.palette.info.main, 0.12)}`,
                    gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                }}
            >
                <InfoRow label="Calc Source" value={slip.calc_source || 'Attendance'} />
                <InfoRow label="Basis" value={slip.working_days_basis === 'Fixed Number of Days' ? `Fixed (${slip.total_working_days}d)` : 'Actual Month'} />
                <InfoRow label="Holiday Handling" value={slip.holiday_handling?.includes('Exclude') ? 'Excluded' : 'Included'} />
                <InfoRow label="Monthly Base" value={`${slip.total_working_days || 26} Days`} />
            </Box>

            <Box
                sx={{
                    p: 3,
                    borderRadius: 2.5,
                    position: 'relative',
                    overflow: 'hidden',
                    bgcolor: (theme) => alpha(theme.palette.info.main, 0.03),
                    border: (theme) => `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: -20,
                        right: -20,
                        opacity: 0.05,
                        transform: 'rotate(-15deg)',
                        color: 'info.main',
                    }}
                >
                    <Iconify icon={"solar:calculator-minimalistic-bold" as any} width={120} />
                </Box>

                <Stack spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="overline" sx={{ color: 'info.main', fontWeight: 900, fontSize: 14 }}>
                        Prorated Salary Formula
                    </Typography>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2.5 }}>
                        <FormulaChip
                            label="Gross Pay"
                            value={`${hrSettings.currency_symbol}${fNumber(baseGrossPay, { locale: hrSettings.default_locale })}`}
                            color="success"
                            currencySymbol={hrSettings.currency_symbol}
                        />
                        <Typography variant="h5" sx={{ color: 'text.disabled', fontWeight: 300 }}>÷</Typography>
                        <FormulaChip label="Working Days" value={`${slip.total_working_days || 26}`} color="info" />
                        <Typography variant="h5" sx={{ color: 'text.disabled', fontWeight: 300 }}>×</Typography>
                        <FormulaChip label="LOP Days" value={`${slip.lop_days || 0}`} color="error" />
                        <Typography variant="h5" sx={{ px: 1, color: 'text.primary', fontWeight: 300 }}>=</Typography>
                        <Box
                            sx={{
                                px: 3,
                                py: 1.5,
                                borderRadius: 1.5,
                                bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
                                border: (theme) => `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                                boxShadow: (theme) => `0 4px 12px -4px ${alpha(theme.palette.error.main, 0.2)}`,
                            }}
                        >
                            <Typography variant="subtitle1" sx={{ color: 'error.main', fontWeight: 900, display: 'flex', alignItems: 'center' }}>
                                LOP:
                                <Box component="span" sx={{ fontFamily: "Arial, 'sans-serif'", ml: 1, mr: 0.5 }}>
                                    {hrSettings.currency_symbol}
                                </Box>
                                {fNumber(slip.lop || 0, { locale: hrSettings.default_locale })}
                            </Typography>
                        </Box>
                    </Box>
                </Stack>
            </Box>

            {/* Overtime (OT) Formula Card - Only for eligible Workers/North Indian with OT, never for Staff */}
            {(() => {
                const empType = (slip.employee_type || '').toLowerCase();
                const isStaff = empType.includes('staff');
                const isWorker = empType.includes('worker');
                const isNorthIndian = empType.includes('north indian');
                const isOTEligible = (isWorker || isNorthIndian) && !isStaff && Number(slip.ot_hours || 0) > 0 && Number(slip.ot_amount || 0) > 0;

                if (!isOTEligible) return null;

                return (
                    <Box
                        sx={{
                            mt: 2.5,
                            p: 3,
                            borderRadius: 2.5,
                            position: 'relative',
                            overflow: 'hidden',
                            bgcolor: (theme) => alpha(theme.palette.warning.main, 0.03),
                            border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.12)}`,
                        }}
                    >
                        <Box
                            sx={{
                                position: 'absolute',
                                top: -20,
                                right: -20,
                                opacity: 0.05,
                                transform: 'rotate(-15deg)',
                                color: 'warning.main',
                            }}
                        >
                            <Iconify icon={"solar:clock-circle-bold" as any} width={120} />
                        </Box>

                        <Stack spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
                            <Typography variant="overline" sx={{ color: 'warning.main', fontWeight: 900, fontSize: 14 }}>
                                Overtime (OT) Formula
                            </Typography>

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2.5 }}>
                                {isNorthIndian ? (
                                    <>
                                        <FormulaChip
                                            label="Fixed OT Rate"
                                            value={`${hrSettings.currency_symbol}${fNumber(hrSettings.north_indian_ot_rate || 100, { locale: hrSettings.default_locale })}`}
                                            color="warning"
                                            currencySymbol={hrSettings.currency_symbol}
                                        />
                                        <Typography variant="h5" sx={{ color: 'text.disabled', fontWeight: 300 }}>×</Typography>
                                        <FormulaChip label="OT Hours" value={`${slip.ot_hours || 0} hrs`} color="info" />
                                    </>
                                ) : (
                                    <>
                                        <FormulaChip
                                            label="Gross Pay"
                                            value={`${hrSettings.currency_symbol}${fNumber(baseGrossPay, { locale: hrSettings.default_locale })}`}
                                            color="success"
                                            currencySymbol={hrSettings.currency_symbol}
                                        />
                                        <Typography variant="h5" sx={{ color: 'text.disabled', fontWeight: 300 }}>÷</Typography>
                                        <FormulaChip label="Working Days" value="26" color="info" />
                                        <Typography variant="h5" sx={{ color: 'text.disabled', fontWeight: 300 }}>÷</Typography>
                                        <FormulaChip label="Shift Hours" value="8 hrs" color="info" />
                                        <Typography variant="h5" sx={{ color: 'text.disabled', fontWeight: 300 }}>×</Typography>
                                        <FormulaChip label="OT Hours" value={`${slip.ot_hours || 0} hrs`} color="info" />
                                        <Typography variant="h5" sx={{ color: 'text.disabled', fontWeight: 300 }}>×</Typography>
                                        <FormulaChip label="Multiplier" value={`${hrSettings.workers_ot_rate_multiplier || 2}×`} color="warning" />
                                    </>
                                )}
                                <Typography variant="h5" sx={{ px: 1, color: 'text.primary', fontWeight: 300 }}>=</Typography>
                                <Box
                                    sx={{
                                        px: 3,
                                        py: 1.5,
                                        borderRadius: 1.5,
                                        bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
                                        border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                                        boxShadow: (theme) => `0 4px 12px -4px ${alpha(theme.palette.warning.main, 0.2)}`,
                                    }}
                                >
                                    <Typography variant="subtitle1" sx={{ color: 'warning.main', fontWeight: 900, display: 'flex', alignItems: 'center' }}>
                                        OT Pay:
                                        <Box component="span" sx={{ fontFamily: "Arial, 'sans-serif'", ml: 1, mr: 0.5 }}>
                                            {hrSettings.currency_symbol}
                                        </Box>
                                        {fNumber(slip.ot_amount || 0, { locale: hrSettings.default_locale })}
                                    </Typography>
                                </Box>
                            </Box>
                        </Stack>
                    </Box>
                );
            })()}
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
                    <SectionHeader title="Earnings" icon="solar:wad-of-money-bold" color="success.main" />
                    <TableColumnHeader standardLabel="Standard" actualLabel="Earned" />
                    <Stack spacing={1}>
                        {(slip.earnings || []).map((item: any, idx: number) => (
                            <AmountRow
                                key={idx}
                                label={item.component_name || item.salary_component}
                                standardAmount={item.standard_amount !== undefined ? item.standard_amount : (item.component_name === 'Overtime Pay (OT)' || item.component_name === 'Attendance Bonus' ? 0 : item.amount)}
                                amount={item.amount}
                                hrSettings={hrSettings}
                            />
                        ))}
                        {(!slip.earnings || slip.earnings.length === 0) && (
                            <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic', py: 1 }}>
                                No earnings recorded
                            </Typography>
                        )}
                        <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                        <AmountRow
                            label="Gross Earnings"
                            standardAmount={slip.base_gross_pay || baseGrossPay}
                            amount={slip.gross_pay || slip.grand_gross_pay}
                            isTotal
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
                    <SectionHeader title="Deductions" icon="solar:hand-money-bold" color="error.main" />
                    <TableColumnHeader standardLabel="Standard" actualLabel="Actual" />
                    <Stack spacing={1}>
                        {(slip.deductions || []).map((item: any, idx: number) => (
                            <AmountRow
                                key={idx}
                                label={item.component_name || item.salary_component}
                                standardAmount={item.standard_amount !== undefined ? item.standard_amount : item.amount}
                                amount={item.amount}
                                hrSettings={hrSettings}
                            />
                        ))}
                        {(!slip.deductions || slip.deductions.length === 0) && (
                            <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic', py: 1 }}>
                                No deductions recorded
                            </Typography>
                        )}
                        <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                        <AmountRow
                            label="Total Deductions"
                            standardAmount={slip.base_total_deduction || 0}
                            amount={slip.total_deduction}
                            isTotal
                            color="error.main"
                            hrSettings={hrSettings}
                        />
                    </Stack>
                </Box>
            </Box>
        </Box>
    );

    // ── Net Pay (Exact Dialog UI) ─────────────────────────────────────────────
    const renderNetPay = (
        <Box
            sx={{
                p: 3,
                mt: 1,
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
                    (Gross Earnings - Total Deductions)
                </Typography>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center' }}>
                <Box component="span" sx={{ fontFamily: "Arial, 'sans-serif'", mr: 1, fontSize: '0.7em', color: 'common.white' }}>
                    {hrSettings.currency_symbol}
                </Box>
                {fNumber(slip.grand_net_pay ?? slip.net_pay ?? 0, { locale: hrSettings.default_locale })}
            </Typography>
        </Box>
    );
    const openPopover = Boolean(popoverState.el);

    // ── Employer Contributions & CTC ──────────────────────────────────────────
    const renderEmployerContributions = (
        <Box sx={{ mb: 4, mt: 3 }}>
            <SectionHeader title="Employer Contributions & Cost to Company (CTC)" icon="solar:buildings-bold" color="info.main" />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.8fr' }, gap: 3 }}>
                {/* Statutory Contributions */}
                <Box
                    sx={{
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: (theme) => alpha(theme.palette.info.main, 0.04),
                        border: (theme) => `1px solid ${alpha(theme.palette.info.main, 0.12)}`,
                    }}
                >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'info.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Iconify icon={"solar:shield-check-bold" as any} width={18} />
                        Employer Statutory Contributions
                    </Typography>
                    <Stack spacing={1}>
                        <AmountRow
                            label={`Employer PF Contribution (${slip.employer_pf_rate ?? hrSettings?.employer_pf_rate ?? 12}%)`}
                            amount={slip.employer_pf || 0}
                            hrSettings={hrSettings}
                        />
                        <AmountRow
                            label={`PF Admin Charges (${slip.pf_admin_rate ?? hrSettings?.pf_admin_rate ?? 0.5}%)`}
                            amount={slip.pf_admin_charges || 0}
                            hrSettings={hrSettings}
                        />
                        <AmountRow
                            label={`EDLI Charges (${slip.edli_rate ?? hrSettings?.edli_rate ?? 0.5}%)`}
                            amount={slip.edli_charges || 0}
                            hrSettings={hrSettings}
                        />
                        <AmountRow
                            label={`Employer ESI Contribution (${slip.employer_esi_rate ?? hrSettings?.employer_esi_rate ?? 3.25}%)`}
                            amount={slip.employer_esi || 0}
                            hrSettings={hrSettings}
                        />
                        {Number(slip.tea_expenses || 0) > 0 && (
                            <AmountRow
                                label="Tea Expenses (Employer)"
                                amount={slip.tea_expenses || 0}
                                hrSettings={hrSettings}
                            />
                        )}
                        <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                        <AmountRow
                            label="Total Employer Contribution"
                            amount={slip.total_employer_contribution || 0}
                            isTotal
                            color="info.main"
                            hrSettings={hrSettings}
                        />
                    </Stack>
                </Box>

                {/* Provisions & Total CTC */}
                <Box
                    sx={{
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                        border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                    }}
                >
                    <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Iconify icon={"solar:wallet-money-bold" as any} width={18} />
                            Statutory Provisions & CTC
                        </Typography>
                        <Stack spacing={1}>
                            {(slip.enable_bonus_provision !== 0 && slip.enable_bonus_provision !== false) && (
                                <AmountRow
                                    label={`Bonus Provision (${slip.bonus_provision_rate ?? hrSettings?.bonus_provision_rate ?? 8.33}%)`}
                                    amount={slip.bonus_provision || 0}
                                    hrSettings={hrSettings}
                                />
                            )}
                            {(slip.enable_el_provision !== 0 && slip.enable_el_provision !== false) && (
                                <AmountRow
                                    label={`Earned Leave (EL) Provision (${slip.el_provision_days_per_year ?? hrSettings?.el_provision_days_per_year ?? 15.6}d/yr)`}
                                    amount={slip.el_provision || 0}
                                    hrSettings={hrSettings}
                                />
                            )}
                            <AmountRow
                                label="Gross Salary (Employee)"
                                amount={slip.gross_pay || 0}
                                hrSettings={hrSettings}
                            />
                        </Stack>
                    </Box>

                    <Box
                        sx={{
                            mt: 2,
                            p: 2,
                            borderRadius: 1.5,
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                            border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        }}
                    >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Total Monthly CTC
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: 11 }}>
                                    (Gross + Contrib + Provisions)
                                </Typography>
                            </Box>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', display: 'flex', alignItems: 'center' }}>
                                <Box component="span" sx={{ fontFamily: "Arial, 'sans-serif'", mr: 0.3, fontSize: '0.85em' }}>
                                    {hrSettings.currency_symbol}
                                </Box>
                                {fNumber(slip.total_monthly_ctc || ((Number(slip.gross_pay) || 0) + (Number(slip.total_employer_contribution) || 0) + (Number(slip.bonus_provision) || 0) + (Number(slip.el_provision) || 0)), { locale: hrSettings.default_locale })}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    );

    return (
        <DashboardContent maxWidth={false}>
            {/* Top Heading and Button Style like Invoice Page */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={4} mt={2} className="no-print">
                <Typography variant="h4">Salary Slip: {slip.name}</Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => router.push('/salary-slips')}
                        startIcon={<IoMdArrowBack size={18} />}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 1.75,
                            py: 0.75,
                            '&:hover': {
                                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                                borderColor: 'text.primary',
                            },
                        }}
                    >
                        Go Back
                    </Button>

                    <Button
                        variant="contained"
                        onClick={() => handlePrintFormat()}
                        startIcon={<IoMdPrint size={18} />}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 1.75,
                            py: 0.75,
                            bgcolor: '#2563EB',
                            color: 'common.white',
                            '&:hover': {
                                bgcolor: '#1D4ED8',
                            },
                        }}
                    >
                        Print
                    </Button>

                    {(isDraft || slip.docstatus === 2) && canEditSalarySlip && (
                        <Button
                            variant="contained"
                            onClick={() => router.push(`/salary-slips/${id}/edit`)}
                            startIcon={<IoMdCreate size={18} />}
                            sx={{
                                borderRadius: 1.5,
                                fontWeight: 600,
                                textTransform: 'none',
                                px: 1.75,
                                py: 0.75,
                                bgcolor: '#D97706',
                                color: 'common.white',
                                '&:hover': {
                                    bgcolor: '#B45309',
                                },
                            }}
                        >
                            Edit
                        </Button>
                    )}

                    {isDraft && (
                        <Button
                            variant="contained"
                            onClick={() => setConfirmSubmitOpen(true)}
                            startIcon={<IoMdCheckmarkCircle size={18} />}
                            sx={{
                                borderRadius: 1.5,
                                fontWeight: 600,
                                textTransform: 'none',
                                px: 1.75,
                                py: 0.75,
                                bgcolor: '#059669',
                                color: 'common.white',
                                '&:hover': {
                                    bgcolor: '#047857',
                                },
                            }}
                        >
                            Submit
                        </Button>
                    )}

                    {(isDraft || slip.docstatus === 2) && canDeleteSalarySlip && (
                        <Button
                            variant="contained"
                            color="error"
                            onClick={() => setConfirmDeleteOpen(true)}
                            startIcon={<IoMdTrash size={18} />}
                            sx={{
                                borderRadius: 1.5,
                                fontWeight: 600,
                                textTransform: 'none',
                                px: 1.75,
                                py: 0.75,
                                bgcolor: '#DC2626',
                                color: 'common.white',
                                '&:hover': {
                                    bgcolor: '#B91C1C',
                                },
                            }}
                        >
                            Delete
                        </Button>
                    )}

                    {slip.docstatus === 1 && canEditSalarySlip && (
                        <Button
                            variant="contained"
                            onClick={() => setConfirmCancelOpen(true)}
                            startIcon={<IoMdCloseCircle size={18} />}
                            sx={{
                                borderRadius: 1.5,
                                fontWeight: 600,
                                textTransform: 'none',
                                px: 1.75,
                                py: 0.75,
                                bgcolor: '#D97706',
                                color: 'common.white',
                                '&:hover': {
                                    bgcolor: '#B45309',
                                },
                            }}
                        >
                            Cancel Doc
                        </Button>
                    )}
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
                {renderDetailedSummary}
                <Divider sx={{ my: 4, borderStyle: 'dashed' }} />
                {renderSalaryBreakdown}
                <Divider sx={{ my: 4, borderStyle: 'dashed' }} />
                {renderEmployerContributions}
                {renderNetPay}

                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        This is a computer generated salary slip and does not require a signature.
                    </Typography>
                </Box>
            </Card>

            {/* Attendance Breakdown Popover */}
            <Popover
                open={openPopover}
                anchorEl={popoverState.el}
                onClose={handlePopoverClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                PaperProps={{
                    sx: { p: 2, width: 400, maxHeight: 400 },
                }}
                disableScrollLock
            >
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {getPopoverTitle()}
                    <Box component="span" sx={{ ml: 1, px: 1, py: 0.25, borderRadius: 0.75, bgcolor: 'action.selected', color: 'text.secondary', fontSize: '0.85em' }}>
                        {getPopoverCount()}
                    </Box>
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
                                            {day.isDirectCredit ? 'Direct Leave Allocation' : `${dayjs(day.date).format('DD-MM-YYYY')} - ${day.holiday_desc || day.description || dayjs(day.date).format('dddd')}`}
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
                                                    if ((popoverState.type === 'absent' || popoverState.type === 'lop') && day.status.includes('Work') && day.status.includes('Absent')) return 'Half Day Absent';
                                                    if (['present', 'physical', 'half_day'].includes(popoverState.type) && day.status.includes('Work') && day.status.includes('Absent')) return 'Present Half Day';
                                                    return day.status.replaceAll('(1.0)', 'Full Day').replaceAll('(0.5)', 'Half Day').replace('Work', 'Present');
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
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic', textAlign: 'center', display: 'block', mt: 1 }}>
                                No days found for this category
                            </Typography>
                        )}
                    </Stack>
                </Scrollbar>
            </Popover>

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                open={confirmDeleteOpen}
                onClose={() => setConfirmDeleteOpen(false)}
                title="Delete Salary Slip"
                content={`Are you sure you want to delete salary slip ${slip.name}? This action cannot be undone.`}
                action={
                    <LoadingButton
                        variant="contained"
                        color="error"
                        loading={deleting}
                        onClick={handleDelete}
                    >
                        Delete
                    </LoadingButton>
                }
            />

            {/* Confirm Submit Dialog */}
            <ConfirmDialog
                open={confirmSubmitOpen}
                onClose={() => setConfirmSubmitOpen(false)}
                title="Submit Salary Slip"
                content="Are you sure you want to submit this salary slip? This action is permanent and will finalize the slip."
                icon="solar:check-circle-bold"
                iconColor="success.main"
                action={
                    <LoadingButton
                        variant="contained"
                        color="success"
                        loading={submitting}
                        onClick={handleSubmit}
                        sx={{ borderRadius: 1.5, minWidth: 100 }}
                    >
                        Submit
                    </LoadingButton>
                }
            />

            {/* Confirm Cancel Dialog */}
            <ConfirmDialog
                open={confirmCancelOpen}
                onClose={() => setConfirmCancelOpen(false)}
                title="Cancel Salary Slip"
                content={`Are you sure you want to cancel salary slip ${slip.name}? This action will mark the document as cancelled.`}
                icon="solar:close-circle-bold"
                iconColor="warning.main"
                action={
                    <LoadingButton
                        variant="contained"
                        color="warning"
                        loading={cancelling}
                        onClick={handleCancel}
                        sx={{ borderRadius: 1.5, minWidth: 100 }}
                    >
                        Cancel Slip
                    </LoadingButton>
                }
            />

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </DashboardContent>
    );
}

// ----------------------------------------------------------------------

function SectionHeader({
    title,
    icon,
    color = 'text.secondary',
}: {
    title: string;
    icon: string;
    color?: string;
}) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Iconify icon={icon as any} width={22} sx={{ mr: 1.5, color }} />
            <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}
            >
                {title}
            </Typography>
        </Box>
    );
}

function InfoRow({ label, value, action }: { label: string; value: string | number; action?: React.ReactNode }) {
    return (
        <Box sx={{ px: 2.5, py: 2, borderBottom: (theme) => `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
            <Typography
                variant="caption"
                sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontWeight: 500, fontSize: '13px' }}
            >
                {label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {value ?? '-'}
                </Typography>
                {action && action}
            </Box>
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

function TableColumnHeader({ standardLabel = 'Standard', actualLabel = 'Earned' }: { standardLabel?: string; actualLabel?: string }) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: (theme) => `1px dashed ${theme.palette.divider}`, mb: 1.5 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}>
                Component
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="caption" sx={{ minWidth: 85, textAlign: 'right', color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {standardLabel}
                </Typography>
                <Typography variant="caption" sx={{ minWidth: 95, textAlign: 'right', color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {actualLabel}
                </Typography>
            </Box>
        </Box>
    );
}

function AmountRow({
    label,
    amount,
    standardAmount,
    isTotal = false,
    color,
    hrSettings,
}: {
    label: string;
    amount: number;
    standardAmount?: number | null;
    isTotal?: boolean;
    color?: string;
    hrSettings: any;
}) {
    const hasStandard = standardAmount !== undefined && standardAmount !== null;
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: isTotal ? 0.5 : 0.25 }}>
            <Typography
                variant={isTotal ? 'subtitle2' : 'body2'}
                sx={{
                    color: isTotal ? color || 'text.primary' : 'text.secondary',
                    fontWeight: isTotal ? 700 : 500,
                    flex: 1,
                    pr: 1,
                }}
            >
                {label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, textAlign: 'right' }}>
                {hasStandard && (
                    <Typography
                        variant={isTotal ? 'subtitle2' : 'caption'}
                        sx={{
                            minWidth: 85,
                            color: isTotal ? 'text.secondary' : 'text.disabled',
                            fontWeight: isTotal ? 700 : 500,
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                        }}
                    >
                        {standardAmount > 0 ? (
                            <>
                                <Box component="span" sx={{ fontFamily: "Arial, 'sans-serif'", mr: 0.3, fontSize: '0.9em' }}>
                                    {hrSettings.currency_symbol}
                                </Box>
                                {fNumber(standardAmount, { locale: hrSettings.default_locale })}
                            </>
                        ) : (
                            '—'
                        )}
                    </Typography>
                )}
                <Typography
                    variant={isTotal ? 'h6' : 'subtitle2'}
                    sx={{
                        minWidth: 95,
                        fontWeight: isTotal ? 800 : 700,
                        color: color || 'inherit',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        fontSize: isTotal ? '20px' : '15.5px',
                    }}
                >
                    <Box
                        component="span"
                        sx={{
                            fontFamily: "Arial, 'sans-serif'",
                            mr: 0.3,
                            fontSize: '0.9em',
                            color: isTotal ? color || 'text.primary' : 'text.primary',
                        }}
                    >
                        {hrSettings.currency_symbol}
                    </Box>
                    {fNumber(amount || 0, { locale: hrSettings.default_locale })}
                </Typography>
            </Box>
        </Box>
    );
}

function FormulaChip({
    label,
    value,
    color,
    currencySymbol,
}: {
    label: string;
    value: string;
    color: 'success' | 'info' | 'error' | 'primary' | 'warning';
    currencySymbol?: string;
}) {
    const isCurrency = value.startsWith(currencySymbol || '');
    const displayValue = isCurrency ? value.replace(currencySymbol || '', '') : value;

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                px: 2.5,
                py: 1.25,
                minWidth: 100,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: (theme) => `1px solid ${alpha(theme.palette[color].main, 0.2)}`,
                boxShadow: (theme) => `0 4px 12px -4px ${alpha(theme.palette[color].main, 0.15)}`,
            }}
        >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', mb: 0.5 }}>
                {label}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: `${color}.main`, display: 'flex', alignItems: 'center' }}>
                {isCurrency && (
                    <Box component="span" sx={{ fontFamily: "Arial, 'sans-serif'", mr: 0.5, fontSize: '0.9em' }}>
                        {currencySymbol}
                    </Box>
                )}
                {displayValue}
            </Typography>
        </Box>
    );
}
