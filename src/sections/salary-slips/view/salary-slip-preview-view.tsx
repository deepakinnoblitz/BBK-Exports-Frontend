import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IoMdArrowBack, IoMdCheckmarkCircle } from 'react-icons/io';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { fNumber } from 'src/utils/format-number';

import { getHRSettings } from 'src/api/hr-management';
import { DashboardContent } from 'src/layouts/dashboard';
import { previewSalarySlip, generateSalarySlipFromEmployee } from 'src/api/salary-slips';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

export function SalarySlipPreviewView() {
    const router = useRouter();
    const { enqueueSnackbar } = useSnackbar();
    const [searchParams] = useSearchParams();

    const employee = searchParams.get('employee') || '';
    const fromDate = searchParams.get('from') || searchParams.get('start') || dayjs().startOf('month').format('YYYY-MM-DD');
    const toDate = searchParams.get('to') || searchParams.get('end') || dayjs().endOf('month').format('YYYY-MM-DD');

    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [data, setData] = useState<any>(null);

    const [hrSettings, setHRSettings] = useState<any>({
        default_currency: 'INR',
        currency_symbol: '₹',
        default_locale: 'en-IN',
    });

    const [popoverState, setPopoverState] = useState<{ el: HTMLButtonElement | null; type: string }>({
        el: null,
        type: '',
    });

    useEffect(() => {
        getHRSettings().then(setHRSettings).catch(console.error);

        if (employee) {
            setLoading(true);
            previewSalarySlip(employee, fromDate, toDate)
                .then((res) => {
                    setData(res);
                })
                .catch((err) => {
                    console.error('Failed to load salary slip preview:', err);
                    enqueueSnackbar(err.message || 'Failed to load preview data', { variant: 'error' });
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [employee, fromDate, toDate, enqueueSnackbar]);

    const handlePopoverOpen = (event: React.MouseEvent<HTMLButtonElement>, type: string) => {
        setPopoverState({ el: event.currentTarget, type });
    };

    const handlePopoverClose = () => {
        setPopoverState((prev) => ({ ...prev, el: null }));
    };

    const openPopover = Boolean(popoverState.el);

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

    const handleConfirmCreate = async () => {
        if (!employee) return;
        try {
            setCreating(true);
            const startD = dayjs(fromDate);
            const year = startD.year();
            const month = startD.month() + 1;

            await generateSalarySlipFromEmployee(employee, year, month, fromDate, toDate);
            router.push('/salary-slips');
            enqueueSnackbar('Salary Slip created successfully!', { variant: 'success' });
        } catch (err: any) {
            console.error('Failed to create salary slip:', err);
            enqueueSnackbar(err.message || 'Failed to create salary slip', { variant: 'error' });
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <DashboardContent maxWidth={false}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                    <CircularProgress />
                </Box>
            </DashboardContent>
        );
    }

    if (!employee || !data) {
        return (
            <DashboardContent maxWidth={false}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={4} mt={2}>
                    <Typography variant="h4">Salary Slip Preview</Typography>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => router.push('/salary-slips')}
                        startIcon={<IoMdArrowBack size={20} />}
                        sx={{ borderRadius: 1.5, fontWeight: 600, textTransform: 'none', px: 2.5 }}
                    >
                        Go Back
                    </Button>
                </Stack>
                <Card sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        No preview parameters provided.
                    </Typography>
                    <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
                        Please select an employee and pay period from Salary Slips list to preview.
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={() => router.push('/salary-slips')}
                        sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
                    >
                        Return to Salary Slips
                    </Button>
                </Card>
            </DashboardContent>
        );
    }

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
                Period: {formatDate(data.pay_period_start || fromDate)} — {formatDate(data.pay_period_end || toDate)}
            </Typography>
        </Box>
    );

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
                <InfoRow label="Employee Name" value={data.employee_name} />
                <InfoRow label="Employee ID" value={data.employee_id || data.employee} />
                <InfoRow label="Father / Husband Name" value={data.father_husband_name || '-'} />

                <SubHeader title="Contact Details" />
                <InfoRow label="Official Email" value={data.email || '-'} />
                <InfoRow label="Personal Email" value={data.personal_email || '-'} />
                <InfoRow label="Employee Phone Number" value={data.phone_number || '-'} />

                <SubHeader title="Job Details" />
                <InfoRow label="Employee Type" value={data.employee_type || '-'} />
                <InfoRow label="Department" value={data.department || '-'} />
                <InfoRow label="Designation" value={data.designation || '-'} />
                <InfoRow label="Date of Joining" value={formatDate(data.date_of_joining)} />

                <SubHeader title="Bank Details" />
                <InfoRow label="Account Name" value={data.bank_account_name || '-'} />
                <InfoRow label="Account No" value={data.account_number || '-'} />
                <InfoRow label="Bank Name" value={data.bank_name || '-'} />
                <InfoRow label="Branch" value={data.branch || '-'} />
                <InfoRow label="IFSC" value={data.ifsc_code || '-'} />
            </Box>
        </Box>
    );

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
                    const isDirectAllocation = (data?.leave_calc_source || hrSettings?.salary_leave_calculation_source) === 'Via Direct Allocation';
                    const renderInfoAction = (type: string) => {
                        if (isDirectAllocation && (type === 'paid_leave' || type === 'unpaid_leave')) {
                            return undefined;
                        }
                        return data.days_breakdown && data.days_breakdown.length > 0 ? (
                            <IconButton size="small" onClick={(e) => handlePopoverOpen(e, type)} sx={{ p: 0.5, color: 'info.main' }}>
                                <Iconify icon={"eva:info-outline" as any} width={16} />
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
                                        data.working_days_basis === 'Fixed Number of Days'
                                            ? `Fixed (${data.fixed_working_days || 26} Days)`
                                            : `${data.total_working_days || 26} Days`
                                    }
                                />
                                <InfoRow
                                    label="Days Worked"
                                    value={`${data.holiday_working_days ?? ((data.total_days_in_period || 30) - (data.holiday_count || 0))} Days`}
                                />
                                <InfoRow
                                    label="Holidays Found"
                                    value={data.holiday_count || 0}
                                    action={renderInfoAction('holiday')}
                                />
                                <InfoRow label="Overtime (OT) Hours" value={data.ot_hours ? `${data.ot_hours} hrs` : '0 hrs'} />
                            </Box>

                            <Divider sx={{ my: 0.5 }} />

                            <Box
                                sx={{
                                    display: 'grid',
                                    gap: 3,
                                    gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                                }}
                            >
                                <InfoRow label="No of Present Days" value={data.actual_present_days || 0} action={renderInfoAction('present')} />
                                <InfoRow label="Physical Attendance" value={data.physical_attendance_days || 0} action={renderInfoAction('physical')} />
                                <InfoRow label="No of Absent" value={data.absent_days !== undefined && data.absent_days !== null ? data.absent_days : ((data.lop_days || 0) + (isDirectAllocation ? (data.no_of_paid_leave || 0) : 0))} action={renderInfoAction('absent')} />
                                <InfoRow label="No of Half Day" value={data.half_day_count || 0} action={renderInfoAction('half_day')} />
                                <InfoRow label="No of Unpaid Leave" value={data.unpaid_leave_days !== undefined && data.unpaid_leave_days !== null ? data.unpaid_leave_days : (data.no_of_leave || 0)} action={renderInfoAction('unpaid_leave')} />
                                <InfoRow label="No of Paid Leave" value={data.no_of_paid_leave || 0} action={renderInfoAction('paid_leave')} />
                                <InfoRow label="Compensatory Off" value={data.no_of_comp_off || 0} action={renderInfoAction('comp_off')} />
                                <InfoRow label="LOP Days" value={data.lop_days || 0} action={renderInfoAction('lop')} />
                            </Box>
                        </>
                    );
                })()}
            </Box>
        </Box>
    );

    const baseGrossPay = data.base_gross_pay !== undefined && data.base_gross_pay !== null && Number(data.base_gross_pay) > 0
        ? Number(data.base_gross_pay)
        : (() => {
            const baseEarnings = (data.earnings || []).filter((e: any) => {
                const name = (e.component_name || e.salary_component || '').trim();
                return !['Overtime Pay (OT)', 'Overtime Allowance', 'Attendance Bonus'].includes(name);
            });
            if (baseEarnings.length > 0) {
                return baseEarnings.reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0);
            }
            return Math.max(0, Number(data.gross_pay || 0) - Number(data.ot_amount || 0) - Number(data.attendance_bonus || 0));
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
                <InfoRow label="Calc Source" value={data.calc_source} />
                <InfoRow label="Basis" value={data.working_days_basis === 'Fixed Number of Days' ? `Fixed (${data.total_working_days}d)` : 'Actual Month'} />
                <InfoRow label="Holiday Handling" value={data.holiday_handling?.includes('Exclude') ? 'Excluded' : 'Included'} />
                <InfoRow label="Monthly Base" value={`${data.total_working_days} Days`} />
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
                        <FormulaChip label="Working Days" value={`${data.total_working_days}`} color="info" />
                        <Typography variant="h5" sx={{ color: 'text.disabled', fontWeight: 300 }}>×</Typography>
                        <FormulaChip label="LOP Days" value={`${data.lop_days}`} color="error" />
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
                                {fNumber(data.lop, { locale: hrSettings.default_locale })}
                            </Typography>
                        </Box>
                    </Box>
                </Stack>
            </Box>

            {/* Overtime (OT) Formula Card - Only for eligible Workers/North Indian with OT, never for Staff */}
            {(() => {
                const empType = (data.employee_type || '').toLowerCase();
                const isStaff = empType.includes('staff');
                const isWorker = empType.includes('worker');
                const isNorthIndian = empType.includes('north indian');
                const isOTEligible = (isWorker || isNorthIndian) && !isStaff && Number(data.ot_hours || 0) > 0 && Number(data.ot_amount || 0) > 0;

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
                                        <FormulaChip label="OT Hours" value={`${data.ot_hours || 0} hrs`} color="info" />
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
                                        <FormulaChip label="OT Hours" value={`${data.ot_hours || 0} hrs`} color="info" />
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
                                        {fNumber(data.ot_amount || 0, { locale: hrSettings.default_locale })}
                                    </Typography>
                                </Box>
                            </Box>
                        </Stack>
                    </Box>
                );
            })()}
        </Box>
    );

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
                        {(data.earnings || []).map((item: any, idx: number) => (
                            <AmountRow
                                key={idx}
                                label={item.component_name || item.salary_component}
                                standardAmount={item.standard_amount !== undefined ? item.standard_amount : (item.component_name === 'Overtime Pay (OT)' || item.component_name === 'Attendance Bonus' ? 0 : item.amount)}
                                amount={item.amount}
                                hrSettings={hrSettings}
                            />
                        ))}
                        {(!data.earnings || data.earnings.length === 0) && (
                            <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic', py: 1 }}>
                                No earnings
                            </Typography>
                        )}
                        <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                        <AmountRow
                            label="Gross Earnings"
                            standardAmount={data.base_gross_pay || baseGrossPay}
                            amount={data.gross_pay}
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
                        {(data.deductions || []).map((item: any, idx: number) => (
                            <AmountRow
                                key={idx}
                                label={item.component_name || item.salary_component}
                                standardAmount={item.standard_amount !== undefined ? item.standard_amount : item.amount}
                                amount={item.amount}
                                hrSettings={hrSettings}
                            />
                        ))}
                        {(!data.deductions || data.deductions.length === 0) && (
                            <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic', py: 1 }}>
                                No deductions
                            </Typography>
                        )}
                        <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                        <AmountRow
                            label="Total Deductions"
                            standardAmount={data.base_total_deduction || 0}
                            amount={data.total_deduction}
                            isTotal
                            color="error.main"
                            hrSettings={hrSettings}
                        />
                    </Stack>
                </Box>
            </Box>
        </Box>
    );

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
                background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
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
                {fNumber(data.grand_net_pay || 0, { locale: hrSettings.default_locale })}
            </Typography>
        </Box>
    );

    const isDirectAllocation = (data?.leave_calc_source || hrSettings?.salary_leave_calculation_source) === 'Via Direct Allocation';

    const getFilteredBreakdown = () => {
        const bd = data?.days_breakdown || [];
        switch (popoverState.type) {
            case 'present': {
                const days = bd.filter((d: any) => d.status?.includes('Work') || d.status?.includes('Paid Leave') || d.status?.includes('Compensatory Off'));
                const isDirect = isDirectAllocation || (Number(data?.no_of_paid_leave || 0) > 0 && !bd.some((d: any) => d.status?.includes('Paid Leave')));
                if (isDirect && Number(data?.no_of_paid_leave || 0) > 0) {
                    return [
                        ...days,
                        {
                            date: data?.pay_period_start,
                            isDirectCredit: true,
                            holiday_desc: 'Leave Allocation Credit',
                            status: `Paid Leave (+${data.no_of_paid_leave} Day${Number(data.no_of_paid_leave) > 1 ? 's' : ''})`,
                        }
                    ];
                }
                return days;
            }
            case 'physical': return bd.filter((d: any) => d.status?.includes('Work'));
            case 'absent': return bd.filter((d: any) => (d.status?.includes('Absent') || d.status?.includes('Unpaid Leave')) && !d.status?.includes('Compensatory Off') && !d.status?.includes('Paid Leave'));
            case 'half_day': return bd.filter((d: any) => d.status?.includes('(0.5)'));
            case 'holiday': return data?.holidays_details?.length ? data.holidays_details : bd.filter((d: any) => d.is_holiday || d.status?.includes('Holiday'));
            case 'unpaid_leave': return bd.filter((d: any) => (d.status?.includes('Unpaid Leave') || (!isDirectAllocation && d.status?.includes('Absent'))) && !d.status?.includes('Compensatory Off') && !d.status?.includes('Paid Leave'));
            case 'paid_leave': return bd.filter((d: any) => d.status?.includes('Paid Leave') && !d.status?.includes('Compensatory Off'));
            case 'comp_off': return bd.filter((d: any) => d.status?.includes('Compensatory Off'));
            case 'lop': return bd.filter((d: any) => (d.status?.includes('Absent') || d.status?.includes('Unpaid Leave')) && !d.status?.includes('Compensatory Off') && !d.status?.includes('Paid Leave'));
            default: return bd;
        }
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

    const filteredBreakdown = getFilteredBreakdown();

    const getPopoverCount = () => {
        if (!data) return filteredBreakdown.length;
        switch (popoverState.type) {
            case 'present': return data.actual_present_days !== undefined && data.actual_present_days !== null ? data.actual_present_days : filteredBreakdown.length;
            case 'physical': return data.physical_attendance_days !== undefined && data.physical_attendance_days !== null ? data.physical_attendance_days : filteredBreakdown.length;
            case 'absent': return data.absent_days !== undefined && data.absent_days !== null ? data.absent_days : ((data.lop_days || 0) + (isDirectAllocation ? (data.no_of_paid_leave || 0) : 0));
            case 'half_day': return data.half_day_count !== undefined && data.half_day_count !== null ? data.half_day_count : filteredBreakdown.length;
            case 'holiday': return data.holiday_count !== undefined && data.holiday_count !== null ? data.holiday_count : filteredBreakdown.length;
            case 'unpaid_leave': return data.no_of_leave !== undefined && data.no_of_leave !== null ? data.no_of_leave : filteredBreakdown.length;
            case 'paid_leave': return data.no_of_paid_leave !== undefined && data.no_of_paid_leave !== null ? data.no_of_paid_leave : filteredBreakdown.length;
            case 'comp_off': return data.no_of_comp_off !== undefined && data.no_of_comp_off !== null ? data.no_of_comp_off : filteredBreakdown.length;
            case 'lop': return data.lop_days !== undefined && data.lop_days !== null ? data.lop_days : filteredBreakdown.length;
            default: return filteredBreakdown.length;
        }
    };

    return (
        <DashboardContent maxWidth={false}>
            {/* Top Heading and Button Style like Invoice Page */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={4} mt={2} className="no-print">
                <Typography variant="h4">
                    Preview Salary Slip: {data.employee_name} ({data.employee_id || data.employee})
                </Typography>
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

                    <LoadingButton
                        variant="contained"
                        loading={creating}
                        onClick={handleConfirmCreate}
                        startIcon={<IoMdCheckmarkCircle size={18} />}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 1.75,
                            py: 0.75,
                        }}
                    >
                        Confirm & Create Salary Slip
                    </LoadingButton>
                </Stack>
            </Stack>

            <Card sx={{ p: 4, borderRadius: 2 }}>
                {renderHeader}
                {renderEmployeeDetails}
                {renderAttendanceSummary}
                {renderDetailedSummary}
                <Divider sx={{ my: 4, borderStyle: 'dashed' }} />
                {renderSalaryBreakdown}
                {renderNetPay}

                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        This is a computer generated salary slip and does not require a signature.
                    </Typography>
                </Box>
            </Card>

            {/* Attendance Popover */}
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
                                if (day.status?.includes('Work') && day.status?.includes('Absent')) colorStr = 'warning.main';
                                else if (day.status?.includes('Absent')) colorStr = 'error.main';
                                else if (day.status?.includes('Work')) colorStr = 'success.main';
                                else if (day.status?.includes('Holiday')) colorStr = 'info.main';
                                else if (day.status?.includes('Leave')) colorStr = 'warning.main';

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
                                                            theme.palette[colorStr.replace('.main', '') as 'success' | 'info' | 'warning' | 'error']?.main ||
                                                                theme.palette.text.secondary,
                                                            0.12
                                                        ),
                                                }}
                                            >
                                                {(() => {
                                                    if ((popoverState.type === 'absent' || popoverState.type === 'lop') && day.status?.includes('Work') && day.status?.includes('Absent'))
                                                        return 'Half Day Absent';
                                                    if (['present', 'physical', 'half_day'].includes(popoverState.type) && day.status?.includes('Work') && day.status?.includes('Absent'))
                                                        return 'Present Half Day';
                                                    return day.status?.replaceAll('(1.0)', 'Full Day').replaceAll('(0.5)', 'Half Day').replace('Work', 'Present');
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
        </DashboardContent>
    );
}

// ----------------------------------------------------------------------
// Helper Components

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

function InfoRow({ label, value, action }: { label: string; value: string | number; action?: React.ReactNode }) {
    return (
        <Box sx={{ px: 2.5, py: 2 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontWeight: 500, fontSize: '14px' }}>
                {label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {value}
                </Typography>
                {action && action}
            </Box>
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
            <Typography variant={isTotal ? 'subtitle2' : 'body2'} sx={{ color: isTotal ? color || 'text.primary' : 'text.secondary', fontWeight: isTotal ? 700 : 500, flex: 1, pr: 1 }}>
                {label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, textAlign: 'right' }}>
                {hasStandard && (
                    <Typography variant={isTotal ? 'subtitle2' : 'caption'} sx={{ minWidth: 85, color: isTotal ? 'text.secondary' : 'text.disabled', fontWeight: isTotal ? 700 : 500, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
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
                <Typography variant={isTotal ? 'subtitle1' : 'body2'} sx={{ minWidth: 95, fontWeight: isTotal ? 800 : 600, color: color || 'inherit', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Box component="span" sx={{ fontFamily: "Arial, 'sans-serif'", mr: 0.3, fontSize: '0.9em', color: isTotal ? color || 'text.primary' : 'text.primary' }}>
                        {hrSettings.currency_symbol}
                    </Box>
                    {fNumber(amount || 0, { locale: hrSettings.default_locale })}
                </Typography>
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

function FormulaChip({ label, value, color, currencySymbol }: { label: string; value: string; color: 'success' | 'info' | 'error' | 'primary' | 'warning'; currencySymbol?: string }) {
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
