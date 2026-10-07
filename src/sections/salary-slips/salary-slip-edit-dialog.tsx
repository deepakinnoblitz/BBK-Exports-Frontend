import dayjs from 'dayjs';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Popover from '@mui/material/Popover';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';

import { fNumber } from 'src/utils/format-number';

import { saveSalarySlip } from 'src/api/salary-slips';
import { COMMON_COLORS, COMMON_BUTTON_STYLES } from 'src/theme';
import { getHRSettings, fetchSalaryComponents } from 'src/api/hr-management';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { SalaryComponentFormDialog } from './salary-component-form-dialog';

// ----------------------------------------------------------------------

const filter = createFilterOptions<any>();

type Props = {
    open: boolean;
    onClose: () => void;
    slip: any;
    onSuccess: (message: string) => void;
};

export function SalarySlipEditDialog({ open, onClose, slip, onSuccess }: Props) {
    const [hrSettings, setHRSettings] = useState<any>({
        default_currency: 'INR',
        currency_symbol: '₹',
        default_locale: 'en-IN',
    });

    const [formData, setFormData] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
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

    // Store base amounts to allow re-proration during edit
    const [baseEarnings, setBaseEarnings] = useState<any[]>([]);
    const [baseDeductions, setBaseDeductions] = useState<any[]>([]);
    const [popoverState, setPopoverState] = useState<{ el: HTMLElement | null, type: string | null }>({ el: null, type: null });
    const [holidayTab, setHolidayTab] = useState<'holiday' | 'not_working_days'>('holiday');

    const handleOpenPopover = (event: React.MouseEvent<HTMLElement>, type: string) => {
        setPopoverState({ el: event.currentTarget, type });
    };

    const handleClosePopover = () => {
        setPopoverState(prev => ({ ...prev, el: null }));
    };

    const getPopoverTitle = () => {
        switch (popoverState.type) {
            case 'present': return 'Present Days';
            case 'physical': return 'Physical Attendance Days';
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

    const isDirectAllocation = (formData?.leave_calc_source || hrSettings?.salary_leave_calculation_source) === 'Via Direct Allocation';

    const getFilteredBreakdown = () => {
        const bd = formData?.days_breakdown || [];
        switch (popoverState.type) {
            case 'present': {
                const days = bd.filter((d: any) => d.status.includes('Work') || d.status.includes('Paid Leave') || d.status.includes('Compensatory Off'));
                const isDirect = isDirectAllocation || (Number(formData?.no_of_paid_leave || 0) > 0 && !bd.some((d: any) => d.status.includes('Paid Leave')));
                if (isDirect && Number(formData?.no_of_paid_leave || 0) > 0) {
                    return [
                        ...days,
                        {
                            date: formData?.pay_period_start,
                            isDirectCredit: true,
                            holiday_desc: 'Leave Allocation Credit',
                            status: `Paid Leave (+${formData.no_of_paid_leave} Day${Number(formData.no_of_paid_leave) > 1 ? 's' : ''})`,
                        }
                    ];
                }
                return days;
            }
            case 'physical': return bd.filter((d: any) => d.status.includes('Work'));
            case 'absent': return bd.filter((d: any) => (d.status.includes('Absent') || d.status.includes('Unpaid Leave')) && !d.status.includes('Compensatory Off') && !d.status.includes('Paid Leave'));
            case 'half_day': return bd.filter((d: any) => d.status.includes('(0.5)'));
            case 'holiday': {
                if (holidayTab === 'not_working_days') {
                    if (formData?.non_working_days_details?.length) {
                        return formData.non_working_days_details;
                    }
                    return bd.filter((d: any) => d.is_non_working_day || d.status?.includes('Non Working Day') || d.status?.includes('Weekly Off'));
                }
                if (formData?.holidays_details?.length) {
                    return formData.holidays_details;
                }
                return bd.filter((d: any) => d.is_holiday || d.status.includes('Holiday'));
            }
            case 'unpaid_leave': return bd.filter((d: any) => (d.status.includes('Unpaid Leave') || (!isDirectAllocation && d.status.includes('Absent'))) && !d.status.includes('Compensatory Off') && !d.status.includes('Paid Leave'));
            case 'paid_leave': return bd.filter((d: any) => d.status.includes('Paid Leave') && !d.status.includes('Compensatory Off'));
            case 'comp_off': return bd.filter((d: any) => d.status.includes('Compensatory Off'));
            case 'lop': return bd.filter((d: any) => (d.status.includes('Absent') || d.status.includes('Unpaid Leave')) && !d.status.includes('Compensatory Off') && !d.status.includes('Paid Leave'));
            default: return bd;
        }
    };

    const holidayListCount = formData?.holiday_count !== undefined ? formData.holiday_count : (formData?.holidays_details?.length ?? (formData?.days_breakdown || []).filter((d: any) => d.is_holiday || d.status?.includes('Holiday')).length);
    const notWorkingListCount = formData?.non_working_count !== undefined ? formData.non_working_count : (formData?.non_working_days_details?.length ?? (formData?.days_breakdown || []).filter((d: any) => d.is_non_working_day || d.status?.includes('Non Working Day') || d.status?.includes('Weekly Off')).length);

    const getPopoverCount = () => {
        const bd = getFilteredBreakdown();
        if (!formData) return bd.length;
        switch (popoverState.type) {
            case 'present': return formData.actual_present_days !== undefined && formData.actual_present_days !== null ? formData.actual_present_days : bd.length;
            case 'physical': return formData.physical_attendance_days !== undefined && formData.physical_attendance_days !== null ? formData.physical_attendance_days : bd.length;
            case 'absent': return formData.absent_days !== undefined && formData.absent_days !== null ? formData.absent_days : ((formData.lop_days || 0) + (isDirectAllocation ? (formData.no_of_paid_leave || 0) : 0));
            case 'half_day': return formData.half_day_count !== undefined && formData.half_day_count !== null ? formData.half_day_count : bd.length;
            case 'holiday': return formData.holiday_count !== undefined && formData.holiday_count !== null ? formData.holiday_count : bd.length;
            case 'unpaid_leave': return formData.no_of_leave !== undefined && formData.no_of_leave !== null ? formData.no_of_leave : bd.length;
            case 'paid_leave': return formData.no_of_paid_leave !== undefined && formData.no_of_paid_leave !== null ? formData.no_of_paid_leave : bd.length;
            case 'comp_off': return formData.no_of_comp_off !== undefined && formData.no_of_comp_off !== null ? formData.no_of_comp_off : bd.length;
            case 'lop': return formData.lop_days !== undefined && formData.lop_days !== null ? formData.lop_days : bd.length;
            default: return bd.length;
        }
    };

    const formatHoursToHrMin = (decimalHours: number) => {
        const hours = Math.floor(decimalHours);
        const mins = Math.round((decimalHours - hours) * 60);
        return `${hours}hr ${mins}mins`;
    };

    const renderInfoAction = (type: string) => {
        if (isDirectAllocation && (type === 'paid_leave' || type === 'unpaid_leave')) {
            return undefined;
        }
        return (
            <IconButton
                size="small"
                onClick={(e) => handleOpenPopover(e, type)}
                sx={{
                    p: 0,
                    color: 'info.main',
                    '&:hover': { bgcolor: (theme) => alpha(theme.palette.info.main, 0.08) }
                }}
            >
                <Iconify icon={"solar:info-circle-linear" as any} width={16} />
            </IconButton>
        );
    };

    useEffect(() => {
        getHRSettings().then(setHRSettings).catch(console.error);
    }, []);

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

    function calculateDynamicRules(data: any, grossPay: number, earnedGrossSalary?: number, earnedBasicDa?: number, earningsList?: any[]) {
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

        // PF Calculation
        let pfAmount = 0;
        const enablePf = hrSettings.enable_auto_pf !== 0 && hrSettings.enable_auto_pf !== false && hrSettings.enable_auto_pf !== '0';
        if (enablePf) {
            const pfRate = (getNum(hrSettings.employee_pf_rate) || 12.0) / 100.0;
            const pfCeiling = getNum(hrSettings.pf_wage_ceiling) || 15000.0;
            const pfBasisRaw = hrSettings.pf_wage_basis;
            let selectedComponents: string[] = [];
            if (pfBasisRaw) {
                if (Array.isArray(pfBasisRaw)) {
                    selectedComponents = pfBasisRaw.map((x: any) => String(x).toLowerCase().trim()).filter(Boolean);
                } else if (typeof pfBasisRaw === 'string') {
                    try {
                        const parsed = JSON.parse(pfBasisRaw);
                        if (Array.isArray(parsed)) {
                            selectedComponents = parsed.map((x: any) => String(x).toLowerCase().trim()).filter(Boolean);
                        }
                    } catch {
                        if (pfBasisRaw.trim() === 'Earned Basic + DA') {
                            selectedComponents = ['basic pay', 'da', 'basic', 'dearness'];
                        } else if (pfBasisRaw.includes(',')) {
                            selectedComponents = pfBasisRaw.split(',').map((x: string) => x.toLowerCase().trim()).filter(Boolean);
                        }
                    }
                }
            }

            let baseWage = earnedGrossSalary || grossPay;
            if (selectedComponents.length > 0 && earningsList && earningsList.length > 0) {
                const matchingTotal = earningsList.reduce((acc: number, curr: any) => {
                    const cName = getCompName(curr).toLowerCase().trim();
                    if (selectedComponents.includes(cName) || selectedComponents.some((sc) => cName.includes(sc))) {
                        return acc + getNum(curr.amount);
                    }
                    return acc;
                }, 0);
                baseWage = matchingTotal;
            } else if (pfBasisRaw === 'Earned Basic + DA') {
                baseWage = earnedBasicDa || grossPay;
            }

            const maxPfAmount = getNum(hrSettings.employee_pf_max_amount) || (pfCeiling > 0 ? pfCeiling * pfRate : 1800);
            if (pfCeiling > 0 && baseWage >= pfCeiling) {
                pfAmount = Math.round(maxPfAmount);
            } else {
                pfAmount = Math.round(baseWage * pfRate);
            }
        }

        // ESI Calculation
        let esiAmount = 0;
        const enableEsi = hrSettings.enable_auto_esi !== 0 && hrSettings.enable_auto_esi !== false && hrSettings.enable_auto_esi !== '0';
        if (enableEsi) {
            const esiCeiling = getNum(hrSettings.esi_wage_ceiling) || 21000.0;
            const stdEarnings = getNum(data.base_gross_pay || data.total_earnings || grossPay);
            const baseForEligibility = earnedGrossSalary || grossPay;
            if (esiCeiling <= 0 || baseForEligibility <= esiCeiling || stdEarnings <= esiCeiling) {
                const esiRate = (getNum(hrSettings.employee_esi_rate) || 0.75) / 100.0;
                const roundingMethod = hrSettings.esi_rounding_method || 'Round Up to Next Rupee (ROUNDUP / CEIL)';
                const rawEsi = grossPay * esiRate;
                if (roundingMethod.includes('Round Up') || roundingMethod.includes('ROUNDUP') || roundingMethod.includes('CEIL')) {
                    esiAmount = Math.ceil(rawEsi);
                } else {
                    esiAmount = Math.round(rawEsi);
                }
            }
        }

        return { otAmount, attendanceBonus, ptAmount, pfAmount, esiAmount };
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
                isManual: false
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
                isManual: false
            };
        });

        // 2. Sum up totals
        const earnedGrossSalary = round(
            updatedEarnings.reduce((acc: number, curr: any) => {
                const name = getCompName(curr).toLowerCase();
                if (name.includes('overtime') || name.includes('ot') || name.includes('attendance bonus') || name.includes('tea')) return acc;
                return acc + getNum(curr.amount);
            }, 0)
        );

        const earnedBasicDa = round(
            updatedEarnings.reduce((acc: number, curr: any) => {
                const name = getCompName(curr).toLowerCase();
                if (name.includes('basic') || name.includes('da') || name.includes('dearness')) {
                    return acc + getNum(curr.amount);
                }
                return acc;
            }, 0)
        );

        const grossPay = round(updatedEarnings.reduce((acc: number, curr: any) => acc + getNum(curr.amount), 0));

        // Dynamic rules for OT, Attendance Bonus, PT, PF, and ESI
        const { otAmount, attendanceBonus, ptAmount, pfAmount, esiAmount } = calculateDynamicRules(data, grossPay, earnedGrossSalary, earnedBasicDa, updatedEarnings);

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

        // Update PT, PF, ESI in deductions if present and not manual
        const finalDeductions = updatedDeductions.map((item: any) => {
            const name = getCompName(item).toLowerCase();
            if (name.includes('professional tax') || name.includes('pt') || name.includes('prof tax') || name.includes('prof.tax')) {
                if (!item.isManual) return { ...item, amount: ptAmount.toFixed(2) };
            }
            if ((name.includes('provident fund') || name.includes('pf') || name.includes('epf')) && !name.includes('employer') && !name.includes('admin')) {
                if (!item.isManual && pfAmount > 0) return { ...item, amount: pfAmount.toFixed(2) };
            }
            if ((name.includes('esi') || name.includes('esic')) && !name.includes('employer')) {
                if (!item.isManual && esiAmount > 0) return { ...item, amount: esiAmount.toFixed(2) };
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
                updated.half_day_count = (numValue % 1 === 0.5) ? 1 : 0;
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
            // Preserve the raw string value for the field currently being edited
            // to allow decimal typing (e.g., "9333.")
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
        if (open && slip) {
            const data = JSON.parse(JSON.stringify(slip));
            // Ensure initial load is also formatted and calculated
            setFormData(recalculateTotals(data));

            setBaseEarnings(data.earnings || []);
            setBaseDeductions(data.deductions || []);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, slip]);

    if (!formData) return null;

    async function handleSave() {
        try {
            setIsSaving(true);
            await saveSalarySlip(formData);
            onSuccess('Salary Slip updated successfully');
            onClose();
        } catch (error: any) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    }



    const formatDate = (date: string) => {
        if (!date) return '-';
        return dayjs(date).format('DD-MM-YYYY');
    };

    // ── Header ────────────────────────────────────────────────────────────────
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

    // ── Attendance Summary ────────────────────────────────────────────────────
    const renderAttendanceSummary = (
        <Box sx={{ mb: 4 }}>
            <SectionHeader title="Attendance Summary" icon={"solar:calendar-date-bold" as any} color="warning.main" />
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
                        label="Working Days"
                        value={formData.total_working_days}
                        onChange={(val) => handleInputChange('total_working_days', val)}
                    />
                    <SleekEditRow
                        label="Days Worked"
                        value={formData.holiday_working_days ?? ((formData.total_days_in_period || 30) - (formData.holiday_count || 0))}
                        onChange={(val) => handleInputChange('holiday_working_days', val)}
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
                        value={formData.absent_days !== undefined && formData.absent_days !== null ? formData.absent_days : ((formData.lop_days || 0) + (isDirectAllocation ? (formData.no_of_paid_leave || 0) : 0))}
                        onChange={(val) => handleInputChange('absent_days', val)}
                        action={renderInfoAction('absent')}
                    />
                    <SleekEditRow
                        label="No of Half Day"
                        value={formData.half_day_count}
                        onChange={(val) => handleInputChange('half_day_count', val)}
                        action={renderInfoAction('half_day')}
                    />
                    <SleekEditRow
                        label="Holiday"
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
                        label="Compensatory Off"
                        value={formData.no_of_comp_off || 0}
                        onChange={(val) => handleInputChange('no_of_comp_off', val)}
                        action={renderInfoAction('comp_off')}
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

    // ── Salary Breakdown ────────────────────────────────────────────────────
    // ── Salary Breakdown (Table Layout with Add/Delete Rows) ─────────────────
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
                                color: COMMON_COLORS.emerald.main,
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
                                color: COMMON_COLORS.emerald.main,
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                '&:hover': { bgcolor: alpha(COMMON_COLORS.emerald.main, 0.08) }
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
                                    <TableCell sx={{ py: 1.25, bgcolor: COMMON_COLORS.emerald.main, color: 'common.white', fontWeight: 700, width: '58%' }}>
                                        Component Name *
                                    </TableCell>
                                    <TableCell align="right" sx={{ py: 1.25, bgcolor: COMMON_COLORS.emerald.main, color: 'common.white', fontWeight: 700, width: '34%' }}>
                                        Amount
                                    </TableCell>
                                    <TableCell width={48} sx={{ py: 1.25, bgcolor: COMMON_COLORS.emerald.main }} />
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
                                bgcolor: alpha(COMMON_COLORS.emerald.main, 0.08),
                                borderTop: (theme) => `1px solid ${alpha(COMMON_COLORS.emerald.main, 0.2)}`,
                                mt: 'auto',
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: COMMON_COLORS.emerald.main, fontSize: '0.875rem' }}>
                                Gross Earnings
                            </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: COMMON_COLORS.emerald.main, fontSize: '0.95rem', display: 'flex', alignItems: 'center' }}>
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
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#e53935', fontSize: '0.95rem', display: 'flex', alignItems: 'center' }}>
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

    // ── Net Pay Summary ───────────────────────────────────────────────────────
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

    return (
        <>
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24, } }}>
            <DialogTitle
                sx={{
                    m: 0,
                    p: 2.5,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: (theme) => `1px solid ${theme.palette.divider}`
                }}
            >
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Edit Salary Slip: {formData.employee_name} - {dayjs(formData.pay_period_start).format('MMMM YYYY')}
                </Typography>
                <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
                    <Iconify icon={"mingcute:close-line" as any} />
                </IconButton>

            </DialogTitle>

            <Scrollbar sx={{ maxHeight: '80vh' }}>
                <DialogContent sx={{ p: 4 }}>
                    {renderHeader}
                    {renderEmployeeDetails}

                    {renderAttendanceSummary}
                    <Divider sx={{ my: 4, borderStyle: 'dashed' }} />
                    {renderSalaryBreakdown}
                    {renderNetPay}
                </DialogContent>
            </Scrollbar>

            <DialogActions sx={{ p: 2.5 }}>
                <LoadingButton
                    variant="contained"
                    color="primary"
                    loading={isSaving}
                    onClick={handleSave}
                    sx={{ px: 4, borderRadius: 1.5 }}
                >
                    Save Changes
                </LoadingButton>
            </DialogActions>

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
                {popoverState.type === 'holiday' ? (
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                        <Tabs
                            value={holidayTab}
                            onChange={(e, val) => setHolidayTab(val)}
                            variant="fullWidth"
                            sx={{
                                minHeight: 36,
                                '& .MuiTab-root': {
                                    minHeight: 36,
                                    py: 0.5,
                                    px: 1,
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                },
                            }}
                        >
                            <Tab
                                value="holiday"
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                        <span>Holiday</span>
                                        <Box component="span" sx={{ px: 0.75, py: 0.1, borderRadius: 0.75, bgcolor: 'action.selected', color: 'text.secondary', fontSize: '0.75rem', fontWeight: 700 }}>
                                            {holidayListCount}
                                        </Box>
                                    </Box>
                                }
                            />
                            <Tab
                                value="not_working_days"
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                        <span>Not Working Days</span>
                                        <Box component="span" sx={{ px: 0.75, py: 0.1, borderRadius: 0.75, bgcolor: 'action.selected', color: 'text.secondary', fontSize: '0.75rem', fontWeight: 700 }}>
                                            {notWorkingListCount}
                                        </Box>
                                    </Box>
                                }
                            />
                        </Tabs>
                    </Box>
                ) : (
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {getPopoverTitle()}
                        <Box component="span" sx={{ ml: 1, px: 1, py: 0.25, borderRadius: 0.75, bgcolor: 'action.selected', color: 'text.secondary', fontSize: '0.85em' }}>
                            {getPopoverCount()}
                        </Box>
                    </Typography>
                )}
                <Scrollbar>
                    <Stack spacing={1.5}>
                        {getFilteredBreakdown().length > 0 ? getFilteredBreakdown().map((day: any, idx: number) => {
                            let colorStr = 'text.secondary';
                            if (day.status?.includes('Non Working Day') || day.status?.includes('Weekly Off')) colorStr = 'text.secondary';
                            else if (day.status.includes('Work') && day.status.includes('Absent')) colorStr = 'warning.main';
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
                                        ...(idx !== getFilteredBreakdown().length - 1 && {
                                             borderBottom: (theme) => `1px dashed ${theme.palette.divider}`
                                        })
                                    }}
                                >
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {day.isDirectCredit ? 'Direct Leave Allocation' : `${dayjs(day.date).format('DD-MM-YYYY')} - ${day.holiday_desc || day.description || dayjs(day.date).format('dddd')}`}
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                        <Typography variant="caption" sx={{ color: colorStr, fontWeight: 700, px: 1, py: 0.25, borderRadius: 0.5, bgcolor: (theme) => alpha(theme.palette[colorStr.replace('.main', '') as 'success' | 'info' | 'warning' | 'error']?.main || theme.palette.text.secondary, 0.12) }}>
                                            {(() => {
                                                if (day.status?.includes('Non Working Day') || day.status?.includes('Weekly Off')) return 'Non Working Day';
                                                if ((popoverState.type === 'absent' || popoverState.type === 'lop') && day.status.includes('Work') && day.status.includes('Absent')) return 'Half Day Absent';
                                                if (['present', 'physical', 'half_day'].includes(popoverState.type || '') && day.status.includes('Work') && day.status.includes('Absent')) return 'Present Half Day';
                                                return day.status.replaceAll('(1.0)', 'Full Day').replaceAll('(0.5)', 'Half Day').replace(/\bWork\b/g, 'Present');
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
                        }) : (
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic', textAlign: 'center', display: 'block', mt: 1 }}>
                                No days found for this category
                            </Typography>
                        )}
                    </Stack>
                </Scrollbar>
            </Popover>
        </Dialog>

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
        </>
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

function SleekEditRow({ label, value, onChange, action }: { label: string; value: number; onChange: (val: string) => void; action?: React.ReactNode }) {
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
                    // Strip leading zero if it's followed by another digit (e.g., 013 -> 13)
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


