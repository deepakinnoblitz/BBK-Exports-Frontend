import dayjs from 'dayjs';
import { useParams } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import { IoMdArrowBack, IoMdCheckmarkCircle } from 'react-icons/io';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';

import { useRouter } from 'src/routes/hooks';

import { fNumber } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';
import { getHRSettings, fetchSalaryComponents } from 'src/api/hr-management';
import { saveSalarySlip, getSalarySlipWithDetails } from 'src/api/salary-slips';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { SalaryComponentFormDialog } from '../salary-component-form-dialog';

// ----------------------------------------------------------------------

const filter = createFilterOptions<any>();

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
    const [salaryComponents, setSalaryComponents] = useState<any[]>([]);

    const [componentDialogOpen, setComponentDialogOpen] = useState(false);
    const [componentDialogType, setComponentDialogType] = useState<'Earning' | 'Deduction'>('Earning');
    const [targetRowIndex, setTargetRowIndex] = useState<{ section: 'earnings' | 'deductions'; index: number } | null>(null);
    const [componentInitialName, setComponentInitialName] = useState('');

    useEffect(() => {
        fetchSalaryComponents().then(setSalaryComponents).catch(console.error);
    }, []);

    const earningComponents = useMemo(() =>
        salaryComponents.filter((c) => c.type === 'Earning'),
        [salaryComponents]);

    const deductionComponents = useMemo(() =>
        salaryComponents.filter((c) => c.type === 'Deduction'),
        [salaryComponents]);

    const handleComponentCreated = async (newComp: any) => {
        try {
            const comps = await fetchSalaryComponents();
            setSalaryComponents(comps);
            if (targetRowIndex && newComp?.component_name) {
                handleSalaryRowChange(targetRowIndex.section, targetRowIndex.index, 'component_name', newComp.component_name);
                if (newComp.static_amount) {
                    handleSalaryRowChange(targetRowIndex.section, targetRowIndex.index, 'amount', newComp.static_amount);
                }
            }
        } catch (e) {
            console.error('Failed to reload components:', e);
        } finally {
            setComponentDialogOpen(false);
            setTargetRowIndex(null);
        }
    };

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

    const getCompName = (c: any): string => {
        if (!c) return '';
        if (typeof c === 'string') return c;
        if (typeof c === 'object') {
            const val = c.component_name ?? c.salary_component ?? c.name ?? c.label ?? '';
            if (typeof val === 'string') return val;
            if (typeof val === 'object' && val !== null) {
                return getCompName(val);
            }
            return String(val || '');
        }
        return String(c);
    };

    function calculateDynamicRules(data: any, grossPay: number) {
        const getNum = (v: any) => parseFloat(v) || 0;
        const round = (val: number) => Math.round(val * 100) / 100;

        const empType = (data.employee_type || '').toLowerCase();
        const isStaff = empType.includes('staff');
        const isWorker = empType.includes('worker');
        const isNorthIndian = empType.includes('north indian');

        const otHours = getNum(data.ot_hours);
        let otAmount = 0;

        if (isStaff) {
            otAmount = 0;
        } else if (isWorker) {
            const multiplier = getNum(hrSettings.workers_ot_rate_multiplier) || 2.0;
            // Formula: Gross / 26 / 8 * OT Hours * Multiplier
            otAmount = round((grossPay / 26 / 8) * otHours * multiplier);
        } else if (isNorthIndian) {
            const rate = getNum(hrSettings.north_indian_ot_rate) || 100.0;
            // Formula: 100 / Per Hour
            otAmount = round(rate * otHours);
        }

        // Attendance Bonus (Full Present = ₹1,500 for Workers)
        const lopDays = getNum(data.lop_days);
        let attendanceBonus = 0;
        if (isWorker && lopDays <= 0) {
            attendanceBonus = getNum(hrSettings.workers_attendance_bonus) || 1500;
        }

        // PT Calculation
        let ptAmount = 0;
        const ptFrequency = hrSettings.pt_deduction_frequency || 'Half-Yearly Deduction';
        let ptApplicable = true;

        if (ptFrequency === 'Half-Yearly Deduction') {
            const halfYearlyMonths = (hrSettings.pt_half_yearly_months || 'April, September')
                .split(',')
                .map((m: string) => m.trim().toLowerCase());
            const slipDate = data.start_date || data.end_date || data.posting_date;
            const monthName = slipDate ? dayjs(slipDate).format('MMMM').toLowerCase() : '';
            ptApplicable = halfYearlyMonths.includes(monthName);
        }

        if (ptApplicable) {
            if (grossPay <= 20000) ptAmount = 0;
            else if (grossPay <= 30000) ptAmount = 155;
            else if (grossPay <= 45000) ptAmount = 375;
            else if (grossPay <= 60000) ptAmount = 750;
            else if (grossPay <= 75000) ptAmount = 1115;
            else ptAmount = 1250;
        }

        return { otAmount, attendanceBonus, ptAmount };
    }

    function recalculateTotals(data: any) {
        const getNum = (v: any) => parseFloat(v) || 0;
        const round = (val: number) => Math.round(val * 100) / 100;

        const workingDays = getNum(data.total_working_days) || 1;
        const lopDays = getNum(data.lop_days);
        const payableDays = Math.max(0, workingDays - lopDays);
        const currentProration = workingDays > 0 ? payableDays / workingDays : 1;

        // 1. Prorate individual components to the period (only if they haven't been manually edited)
        const updatedEarnings = (data.earnings || baseEarnings).map((item: any, idx: number) => {
            const baseItem = baseEarnings[idx] || item;
            const baseAmount = getNum(baseItem.standard_amount || baseItem.base_amount || baseItem.amount);
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
            const baseAmount = getNum(baseItem.standard_amount || baseItem.base_amount || baseItem.amount);
            const isManual = item.isManual ?? false;

            if (isManual) return { ...item, isManual: true };

            return {
                ...item,
                amount: round(baseAmount).toFixed(2),
                isManual: false,
            };
        });

        // 2. Sum up totals
        const grossPay = round(updatedEarnings.reduce((acc: number, curr: any) => acc + getNum(curr.amount), 0));

        // Dynamic rules for OT, Attendance Bonus, and PT
        const { otAmount, attendanceBonus, ptAmount } = calculateDynamicRules(data, grossPay);


        // Update OT / Bonus in earnings if present and not manual
        const finalEarnings = updatedEarnings.map((item: any) => {
            const name = getCompName(item).toLowerCase();
            if (name.includes('overtime') || name.includes('ot amount') || name === 'ot') {
                if (!item.isManual && otAmount > 0) return { ...item, amount: otAmount.toFixed(2) };
            }
            if (name.includes('attendance bonus') || name.includes('present bonus')) {
                if (!item.isManual) return { ...item, amount: attendanceBonus.toFixed(2) };
            }
            return item;
        });

        // Update PT in deductions if present and not manual
        const finalDeductions = updatedDeductions.map((item: any) => {
            const name = getCompName(item).toLowerCase();
            if (name.includes('professional tax') || name.includes('pt') || name.includes('prof tax')) {
                if (!item.isManual) return { ...item, amount: ptAmount.toFixed(2) };
            }
            return item;
        });

        const finalGrossPay = round(finalEarnings.reduce((acc: number, curr: any) => acc + getNum(curr.amount), 0));
        const deductionsTotal = round(finalDeductions.reduce((acc: number, curr: any) => acc + getNum(curr.amount), 0));

        // 3. Calculate LOP based on absent days relative to month base
        const baseGrossPay = round(
            (data.earnings || baseEarnings).reduce((acc: number, curr: any) => {
                const name = getCompName(curr).toLowerCase();
                if (name.includes('overtime') || name.includes('ot') || name.includes('attendance bonus')) return acc;
                return acc + getNum(curr.standard_amount || curr.base_amount || curr.amount || 0);
            }, 0)
        );
        const autoLopAmount = round(workingDays > 0 ? (baseGrossPay * (lopDays / workingDays)) : 0);

        const isManualLop = data.isManualLop ?? (data.lop !== undefined && Math.abs(getNum(data.lop) - autoLopAmount) > 0.1);
        const lopAmount = isManualLop ? getNum(data.lop) : autoLopAmount;

        const totalDeductions = round(deductionsTotal);
        const netPay = round(finalGrossPay - totalDeductions);

        return {
            ...data,
            earnings: finalEarnings,
            deductions: finalDeductions,
            gross_pay: finalGrossPay.toFixed(2),
            grand_gross_pay: finalGrossPay.toFixed(2),
            lop: lopAmount.toFixed(2),
            total_deduction: totalDeductions.toFixed(2),
            net_pay: netPay.toFixed(2),
            grand_net_pay: netPay.toFixed(2),
            ot_amount: otAmount.toFixed(2),
            attendance_bonus: attendanceBonus.toFixed(2),
            pt_amount: ptAmount.toFixed(2),
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


    const handleAddSalaryRow = (type: 'earnings' | 'deductions') => {
        setFormData((prev: any) => {
            if (!prev) return prev;
            const currentRows = prev[type] || [];
            const availableOptions = type === 'earnings' ? earningComponents : deductionComponents;
            const defaultCompObj = availableOptions.find((c: any) => !currentRows.some((r: any) => getCompName(r) === getCompName(c)));
            const defaultCompName = getCompName(defaultCompObj) || getCompName(availableOptions[0]) || '';
            const newRow = { component_name: defaultCompName, amount: 0, isManual: true };
            const updated = {
                ...prev,
                [type]: [...currentRows, newRow]
            };
            return recalculateTotals(updated);
        });
    };

    const handleRemoveSalaryRow = (type: 'earnings' | 'deductions', index: number) => {
        setFormData((prev: any) => {
            if (!prev) return prev;
            const currentRows = [...(prev[type] || [])];
            currentRows.splice(index, 1);
            const updated = {
                ...prev,
                [type]: currentRows
            };
            return recalculateTotals(updated);
        });
    };

    const handleSalaryRowChange = (type: 'earnings' | 'deductions', index: number, field: 'component_name' | 'amount', value: any) => {
        setFormData((prev: any) => {
            if (!prev) return prev;
            const currentRows = [...(prev[type] || [])];
            const cleanVal = field === 'component_name' ? getCompName(value) : value;
            currentRows[index] = {
                ...currentRows[index],
                [field]: cleanVal,
                isManual: true
            };
            const updated = {
                ...prev,
                [type]: currentRows
            };
            return recalculateTotals(updated);
        });
    };

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
                position: 'relative',
                overflow: 'hidden',
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
            }}
        >
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800, color: 'primary.main', fontSize: '22px' }}>
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
                    <SleekEditRow
                        label="Overtime Hours (OT)"
                        value={formData.ot_hours || 0}
                        onChange={(val) => handleInputChange('ot_hours', val)}
                    />
                </Box>
            </Box>
        </Box>
    );

    // ── Salary Breakdown (Table Layout with Add/Delete Rows) ─────────────────
    const renderSalaryBreakdown = (
        <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, alignItems: 'stretch' }}>
                {/* Earnings */}
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                        <Typography
                            variant="subtitle2"
                            sx={{
                                fontWeight: 800,
                                color: '#10b981',
                                textTransform: 'uppercase',
                                letterSpacing: 1,
                                fontSize: '0.875rem'
                            }}
                        >
                            EARNINGS
                        </Typography>
                        <Button
                            size="small"
                            variant="text"
                            startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
                            onClick={() => handleAddSalaryRow('earnings')}
                            sx={{
                                color: '#00a76f',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                '&:hover': { bgcolor: alpha('#00a76f', 0.08) }
                            }}
                        >
                            Add Row
                        </Button>
                    </Box>

                    <TableContainer
                        sx={{
                            border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
                            borderRadius: 1.5,
                            overflow: 'hidden',
                            bgcolor: 'background.paper',
                            boxShadow: (theme) => theme.customShadows?.z1 || 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                            justifyContent: 'space-between',
                        }}
                    >
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ py: 1.25, bgcolor: '#00a76f', color: 'common.white', fontWeight: 700, width: '58%' }}>
                                        Component Name *
                                    </TableCell>
                                    <TableCell align="right" sx={{ py: 1.25, bgcolor: '#00a76f', color: 'common.white', fontWeight: 700, width: '34%' }}>
                                        Amount
                                    </TableCell>
                                    <TableCell width={48} sx={{ py: 1.25, bgcolor: '#00a76f' }} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(formData.earnings || []).map((row: any, index: number) => (
                                    <TableRow
                                        key={index}
                                        sx={{
                                            '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02) },
                                            borderBottom: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.1)}`
                                        }}
                                    >
                                        <TableCell sx={{ py: 1 }}>
                                            <Autocomplete
                                                freeSolo
                                                fullWidth
                                                size="small"
                                                options={earningComponents}
                                                getOptionLabel={(option) => {
                                                    if (typeof option === 'string') return option;
                                                    if (option.isNew) return option.inputValue || '';
                                                    return option.component_name || '';
                                                }}
                                                filterOptions={(options, filterParams) => {
                                                    const filtered = filter(options, filterParams);
                                                    filtered.push({
                                                        component_name: '',
                                                        inputValue: filterParams.inputValue,
                                                        isNew: true,
                                                    });
                                                    return filtered;
                                                }}
                                                value={row.component_name || row.salary_component || ''}
                                                onChange={(_, newValue: any) => {
                                                    if (newValue?.isNew) {
                                                        setComponentDialogType('Earning');
                                                        setComponentInitialName(newValue.inputValue || '');
                                                        setTargetRowIndex({ section: 'earnings', index });
                                                        setComponentDialogOpen(true);
                                                    } else {
                                                        const val = typeof newValue === 'string' ? newValue : (newValue?.component_name || '');
                                                        handleSalaryRowChange('earnings', index, 'component_name', val);
                                                        const matched = salaryComponents.find((c) => c.component_name === val);
                                                        if (matched && matched.static_amount && (!row.amount || row.amount === 0)) {
                                                            handleSalaryRowChange('earnings', index, 'amount', matched.static_amount);
                                                        }
                                                    }
                                                }}
                                                onInputChange={(_, newInputValue, reason) => {
                                                    if (reason === 'input') {
                                                        handleSalaryRowChange('earnings', index, 'component_name', newInputValue);
                                                    }
                                                }}
                                                renderOption={(props, option: any) => (
                                                    <Box
                                                        component="li"
                                                        {...props}
                                                        sx={{
                                                            typography: 'body2',
                                                            ...(option.isNew && {
                                                                color: 'primary.main',
                                                                fontWeight: 600,
                                                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                                borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                                                py: '8px !important',
                                                                px: '16px !important',
                                                                mt: 0.5,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                '&:hover': {
                                                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                                                },
                                                            }),
                                                        }}
                                                    >
                                                        {option.isNew ? (
                                                            <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                                                                <Iconify icon="solar:add-circle-bold" width={20} />
                                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                                                                    Create Component {option.inputValue ? `"${option.inputValue}"` : ''}
                                                                </Typography>
                                                            </Stack>
                                                        ) : (
                                                            option.component_name || (typeof option === 'string' ? option : '')
                                                        )}
                                                    </Box>
                                                )}
                                                renderInput={(inputParams) => (
                                                    <TextField
                                                        {...inputParams}
                                                        variant="standard"
                                                        placeholder="Select Component"
                                                        InputProps={{
                                                            ...inputParams.InputProps,
                                                            disableUnderline: true,
                                                            sx: { typography: 'body2', fontWeight: 500 }
                                                        }}
                                                    />
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell align="right" sx={{ py: 1, px: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1} sx={{ width: 140 }}>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color: 'text.primary',
                                                            fontWeight: 600,
                                                            fontFamily: "Arial, 'sans-serif'",
                                                        }}
                                                    >
                                                        {hrSettings.currency_symbol || '₹'}
                                                    </Typography>
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        variant="standard"
                                                        value={row.amount === 0 ? '0' : (row.amount || '')}
                                                        placeholder="0"
                                                        onChange={(e) => handleSalaryRowChange('earnings', index, 'amount', parseFloat(e.target.value) || 0)}
                                                        inputProps={{ sx: { textAlign: 'right', typography: 'body2', fontWeight: 600, p: 0, width: 95 } }}
                                                        InputProps={{ disableUnderline: true }}
                                                    />
                                                </Stack>
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center" sx={{ py: 1, width: 48 }}>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleRemoveSalaryRow('earnings', index)}
                                                sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                                            >
                                                <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(formData.earnings || []).length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} align="center" sx={{ py: 3, typography: 'body2', color: 'text.disabled' }}>
                                            No earnings added. Click &quot;Add Row&quot; to start.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                px: 2,
                                py: 1.25,
                                bgcolor: alpha('#00a76f', 0.08),
                                borderTop: (theme) => `1px solid ${alpha('#00a76f', 0.2)}`,
                                mt: 'auto',
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#00a76f', fontSize: '0.875rem' }}>
                                Gross Earnings
                            </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#00a76f', fontSize: '1.15rem', display: 'flex', alignItems: 'center' }}>
                                <Box component="span" sx={{ fontFamily: "Arial, 'sans-serif'", mr: 0.5, fontSize: '0.85em' }}>
                                    {hrSettings.currency_symbol || '₹'}
                                </Box>
                                {fNumber(formData.gross_pay || 0, { locale: hrSettings.default_locale })}
                            </Typography>
                        </Box>
                    </TableContainer>
                </Box>

                {/* Deductions */}
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                        <Typography
                            variant="subtitle2"
                            sx={{
                                fontWeight: 800,
                                color: '#e53935',
                                textTransform: 'uppercase',
                                letterSpacing: 1,
                                fontSize: '0.875rem'
                            }}
                        >
                            DEDUCTIONS
                        </Typography>
                        <Button
                            size="small"
                            variant="text"
                            startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
                            onClick={() => handleAddSalaryRow('deductions')}
                            sx={{
                                color: '#e53935',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                '&:hover': { bgcolor: alpha('#e53935', 0.08) }
                            }}
                        >
                            Add Row
                        </Button>
                    </Box>

                    <TableContainer
                        sx={{
                            border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
                            borderRadius: 1.5,
                            overflow: 'hidden',
                            bgcolor: 'background.paper',
                            boxShadow: (theme) => theme.customShadows?.z1 || 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                            justifyContent: 'space-between',
                        }}
                    >
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ py: 1.25, bgcolor: '#e53935', color: 'common.white', fontWeight: 700, width: '58%' }}>
                                        Component Name *
                                    </TableCell>
                                    <TableCell align="right" sx={{ py: 1.25, bgcolor: '#e53935', color: 'common.white', fontWeight: 700, width: '34%' }}>
                                        Amount
                                    </TableCell>
                                    <TableCell width={48} sx={{ py: 1.25, bgcolor: '#e53935' }} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(formData.deductions || []).map((row: any, index: number) => (
                                    <TableRow
                                        key={index}
                                        sx={{
                                            '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02) },
                                            borderBottom: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.1)}`
                                        }}
                                    >
                                        <TableCell sx={{ py: 1 }}>
                                            <Autocomplete
                                                freeSolo
                                                fullWidth
                                                size="small"
                                                options={deductionComponents}
                                                getOptionLabel={(option) => {
                                                    if (typeof option === 'string') return option;
                                                    if (option.isNew) return option.inputValue || '';
                                                    return option.component_name || '';
                                                }}
                                                filterOptions={(options, filterParams) => {
                                                    const filtered = filter(options, filterParams);
                                                    filtered.push({
                                                        component_name: '',
                                                        inputValue: filterParams.inputValue,
                                                        isNew: true,
                                                    });
                                                    return filtered;
                                                }}
                                                value={row.component_name || row.salary_component || ''}
                                                onChange={(_, newValue: any) => {
                                                    if (newValue?.isNew) {
                                                        setComponentDialogType('Deduction');
                                                        setComponentInitialName(newValue.inputValue || '');
                                                        setTargetRowIndex({ section: 'deductions', index });
                                                        setComponentDialogOpen(true);
                                                    } else {
                                                        const val = typeof newValue === 'string' ? newValue : (newValue?.component_name || '');
                                                        handleSalaryRowChange('deductions', index, 'component_name', val);
                                                        const matched = salaryComponents.find((c) => c.component_name === val);
                                                        if (matched && (!row.amount || row.amount === 0)) {
                                                            if (matched.percentage && Number(matched.percentage) > 0) {
                                                                let baseAmt = Number(formData.gross_pay) || 0;
                                                                if (matched.percentage_basis === 'Selected Component(s)') {
                                                                    let sel: string[] = [];
                                                                    try {
                                                                        sel = Array.isArray(matched.selected_components) ? matched.selected_components : JSON.parse(matched.selected_components || '[]');
                                                                    } catch {
                                                                        sel = (matched.selected_components || '').split(',').map((s: string) => s.trim());
                                                                    }
                                                                    if (sel.length > 0) {
                                                                        baseAmt = (formData.earnings || [])
                                                                            .filter((e: any) => sel.includes(e.component_name || e.salary_component))
                                                                            .reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
                                                                    }
                                                                }
                                                                const autoVal = Math.round(((baseAmt * Number(matched.percentage)) / 100) * 100) / 100;
                                                                handleSalaryRowChange('deductions', index, 'amount', autoVal);
                                                            } else if (matched.static_amount) {
                                                                handleSalaryRowChange('deductions', index, 'amount', matched.static_amount);
                                                            }
                                                        }
                                                    }
                                                }}
                                                onInputChange={(_, newInputValue, reason) => {
                                                    if (reason === 'input') {
                                                        handleSalaryRowChange('deductions', index, 'component_name', newInputValue);
                                                    }
                                                }}
                                                renderOption={(props, option: any) => (
                                                    <Box
                                                        component="li"
                                                        {...props}
                                                        sx={{
                                                            typography: 'body2',
                                                            ...(option.isNew && {
                                                                color: 'primary.main',
                                                                fontWeight: 600,
                                                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                                borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                                                py: '8px !important',
                                                                px: '16px !important',
                                                                mt: 0.5,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                '&:hover': {
                                                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                                                },
                                                            }),
                                                        }}
                                                    >
                                                        {option.isNew ? (
                                                            <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                                                                <Iconify icon="solar:add-circle-bold" width={20} />
                                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                                                                    Create Component {option.inputValue ? `"${option.inputValue}"` : ''}
                                                                </Typography>
                                                            </Stack>
                                                        ) : (
                                                            option.component_name || (typeof option === 'string' ? option : '')
                                                        )}
                                                    </Box>
                                                )}
                                                renderInput={(inputParams) => (
                                                    <TextField
                                                        {...inputParams}
                                                        variant="standard"
                                                        placeholder="Select Component"
                                                        InputProps={{
                                                            ...inputParams.InputProps,
                                                            disableUnderline: true,
                                                            sx: { typography: 'body2', fontWeight: 500 }
                                                        }}
                                                    />
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell align="right" sx={{ py: 1, px: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1} sx={{ width: 140 }}>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color: 'text.primary',
                                                            fontWeight: 600,
                                                            fontFamily: "Arial, 'sans-serif'",
                                                        }}
                                                    >
                                                        {hrSettings.currency_symbol || '₹'}
                                                    </Typography>
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        variant="standard"
                                                        value={row.amount === 0 ? '0' : (row.amount || '')}
                                                        placeholder="0"
                                                        onChange={(e) => handleSalaryRowChange('deductions', index, 'amount', parseFloat(e.target.value) || 0)}
                                                        inputProps={{ sx: { textAlign: 'right', typography: 'body2', fontWeight: 600, p: 0, width: 95 } }}
                                                        InputProps={{ disableUnderline: true }}
                                                    />
                                                </Stack>
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center" sx={{ py: 1, width: 48 }}>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleRemoveSalaryRow('deductions', index)}
                                                sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                                            >
                                                <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(formData.deductions || []).length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} align="center" sx={{ py: 3, typography: 'body2', color: 'text.disabled' }}>
                                            No deductions added. Click &quot;Add Row&quot; to start.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                px: 2,
                                py: 1.25,
                                bgcolor: alpha('#e53935', 0.08),
                                borderTop: (theme) => `1px solid ${alpha('#e53935', 0.2)}`,
                                mt: 'auto',
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#e53935', fontSize: '0.875rem' }}>
                                Total Deductions
                            </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#e53935', fontSize: '1.15rem', display: 'flex', alignItems: 'center' }}>
                                <Box component="span" sx={{ fontFamily: "Arial, 'sans-serif'", mr: 0.5, fontSize: '0.85em' }}>
                                    {hrSettings.currency_symbol || '₹'}
                                </Box>
                                {fNumber(formData.total_deduction || 0, { locale: hrSettings.default_locale })}
                            </Typography>
                        </Box>
                    </TableContainer>
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
                {fNumber(formData.grand_net_pay || 0, { locale: hrSettings.default_locale })}
            </Typography>
        </Box>
    );

    const filteredBreakdown = getFilteredBreakdown();

    return (
        <DashboardContent maxWidth={false}>
            {/* Top Heading and Button Style like Invoice Page */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={4} mt={2} className="no-print">
                <Typography variant="h4">Edit Salary Slip: {formData.name}</Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => router.push(`/salary-slips/${id}`)}
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
                        loading={isSaving}
                        onClick={handleSave}
                        startIcon={<IoMdCheckmarkCircle size={18} />}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 1.75,
                            py: 0.75,
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
            {/* Create Salary Component Dialog */}
            <SalaryComponentFormDialog
                open={componentDialogOpen}
                onClose={() => {
                    setComponentDialogOpen(false);
                    setTargetRowIndex(null);
                }}
                onSuccess={handleComponentCreated}
                initialName={componentInitialName}
                defaultType={componentDialogType}
            />
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


