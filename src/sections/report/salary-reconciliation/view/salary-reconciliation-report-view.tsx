import type { Dayjs } from 'dayjs';

import jsPDF from 'jspdf';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import autoTable from 'jspdf-autotable';
import { useSnackbar } from 'notistack';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import { alpha, useTheme } from '@mui/material/styles';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { fNumber } from 'src/utils/format-number';

import { getDoctypeList } from 'src/api/leads';
import { getHRSettings } from 'src/api/hr-management';
import { DashboardContent } from 'src/layouts/dashboard';
import { getSalaryReconciliationStatement } from 'src/api/salary-slips';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { SalaryHistoryDetailsDialog } from 'src/sections/employee/salary-history-details-dialog';

// ----------------------------------------------------------------------

const DEFAULT_EMPLOYEE_TYPES = ['Staff', 'Worker', 'Security', 'North Indian', 'Driver'];

const AMOUNT_BASIS_OPTIONS = [
    { value: 'net_pay', label: 'Net Salary (Disbursement)' },
    { value: 'gross_pay', label: 'Gross Earnings' },
    { value: 'earned_ctc', label: 'Total CTC' },
];

function SummaryCard({
    item,
}: {
    item: {
        label: string;
        value: any;
        prefix?: string;
        indicator?: 'default' | 'blue' | 'green' | 'orange' | 'red';
        subtitle?: string;
    };
}) {
    const theme = useTheme();

    const getColorConfig = (indicator?: string) => {
        switch (indicator?.toLowerCase()) {
            case 'green':
            case 'success':
                return {
                    color: '#10b981',
                    valueColor: '#10b981',
                    labelColor: 'success' as const,
                    bg: alpha('#10b981', 0.06),
                    border: `1px solid ${alpha('#10b981', 0.24)}`,
                };
            case 'blue':
            case 'info':
                return {
                    color: '#0284c7',
                    valueColor: '#0284c7',
                    labelColor: 'info' as const,
                    bg: alpha('#0284c7', 0.06),
                    border: `1px solid ${alpha('#0284c7', 0.24)}`,
                };
            case 'orange':
            case 'warning':
                return {
                    color: '#d97706',
                    valueColor: '#d97706',
                    labelColor: 'warning' as const,
                    bg: alpha('#f59e0b', 0.06),
                    border: `1px solid ${alpha('#f59e0b', 0.24)}`,
                };
            case 'red':
            case 'error':
                return {
                    color: '#e11d48',
                    valueColor: '#e11d48',
                    labelColor: 'error' as const,
                    bg: alpha('#f43f5e', 0.06),
                    border: `1px solid ${alpha('#f43f5e', 0.24)}`,
                };
            case 'default':
            default:
                return {
                    color: 'text.secondary',
                    valueColor: 'text.primary',
                    labelColor: 'default' as const,
                    bg: alpha(theme.palette.grey[500], 0.06),
                    border: `1px solid ${alpha(theme.palette.grey[500], 0.14)}`,
                };
        }
    };

    const cfg = getColorConfig(item.indicator);

    return (
        <Box
            sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: cfg.bg,
                border: cfg.border,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: theme.transitions.create(['transform', 'box-shadow']),
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                },
            }}
        >
            <Typography
                variant="caption"
                sx={{
                    color: cfg.color,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    fontSize: 12,
                    display: 'block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}
            >
                {item.label}
            </Typography>

            <Typography
                variant="h5"
                fontWeight={800}
                sx={{
                    color: cfg.valueColor,
                    mt: 0.5,
                    fontSize: '1.5rem',
                    lineHeight: 1.5,
                    mb: 0.5
                }}
            >
                {item.prefix && (
                    <Box component="span" sx={{ fontFamily: 'Arial', mr: 0.5 }}>
                        {item.prefix}
                    </Box>
                )}
                {item.value}
            </Typography>

            {item.subtitle && (
                <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center' }}>
                    <Label
                        color={cfg.labelColor}
                        variant="soft"
                        sx={{
                            fontSize: 10,
                            height: 18,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                        }}
                    >
                        {item.subtitle}
                    </Label>
                </Box>
            )}
        </Box>
    );
}

// ----------------------------------------------------------------------

export function SalaryReconciliationReportView() {
    const { enqueueSnackbar } = useSnackbar();

    const today = useMemo(() => dayjs(), []);

    // Month Pickers: Month (Target) defaults to current month, Compare Pay Period defaults to previous month
    const [selectedMonth, setSelectedMonth] = useState<Dayjs | null>(today);
    const [compareMonth, setCompareMonth] = useState<Dayjs | null>(today.subtract(1, 'month'));

    const [amountBasis, setAmountBasis] = useState<string>('net_pay');
    const [selectedEmployeeType, setSelectedEmployeeType] = useState<string>('All');
    const [employeeTypes, setEmployeeTypes] = useState<string[]>(DEFAULT_EMPLOYEE_TYPES);
    const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
    const [docstatusFilter, setDocstatusFilter] = useState<string>('all'); // 'all' (0 & 1) or '1'

    const [departments, setDepartments] = useState<string[]>([]);
    const [hrSettings, setHRSettings] = useState<any>({ currency_symbol: '₹', default_locale: 'en-IN' });

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);

    const [exportingExcel, setExportingExcel] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);

    // Dialog state for viewing detailed salary history
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);

    // 5 Dynamic Month-Wise Quick Ranges: This Month, Last Month, and 3 previous months
    const monthQuickRanges = useMemo(() => [
        { label: `${today.format('MMMM YYYY')} (This Month)`, date: today },
        { label: `${today.subtract(1, 'month').format('MMMM YYYY')} (Last Month)`, date: today.subtract(1, 'month') },
        { label: today.subtract(2, 'month').format('MMMM YYYY'), date: today.subtract(2, 'month') },
        { label: today.subtract(3, 'month').format('MMMM YYYY'), date: today.subtract(3, 'month') },
        { label: today.subtract(4, 'month').format('MMMM YYYY'), date: today.subtract(4, 'month') },
    ], [today]);

    const handleSelectMonthPreset = (targetMonth: Dayjs) => {
        setSelectedMonth(targetMonth);
        setCompareMonth(targetMonth.subtract(1, 'month'));
    };

    const isMonthPresetActive = useCallback(
        (targetMonth: Dayjs) => {
            if (!selectedMonth) return false;
            return selectedMonth.isSame(targetMonth, 'month') && selectedMonth.isSame(targetMonth, 'year');
        },
        [selectedMonth]
    );

    const handleReset = () => {
        const now = dayjs();
        setSelectedMonth(now);
        setCompareMonth(now.subtract(1, 'month'));
        setAmountBasis('net_pay');
        setSelectedEmployeeType('All');
        setSelectedDepartment('All');
        setDocstatusFilter('all');
    };

    // Load initial dropdowns
    useEffect(() => {
        getHRSettings()
            .then((res) => {
                if (res) {
                    setHRSettings({
                        currency_symbol: res.currency_symbol || '₹',
                        default_locale: res.default_locale || 'en-IN',
                    });
                }
            })
            .catch(() => {});

        getDoctypeList('Department', ['name'], undefined, 200)
            .then((res: any[]) => {
                if (res) {
                    setDepartments(res.map((d) => d.name));
                }
            })
            .catch(() => {});

        getDoctypeList('Employee Type', ['name'], undefined, 100)
            .then((res: any[]) => {
                if (res && res.length > 0) {
                    const fetched = res.map((t) => t.name || t.employee_type || t).filter(Boolean);
                    const combined = Array.from(new Set([...fetched, ...DEFAULT_EMPLOYEE_TYPES]));
                    setEmployeeTypes(combined);
                }
            })
            .catch(() => {});
    }, []);

    // Fetch reconciliation data
    const fetchData = useCallback(async () => {
        if (!selectedMonth) return;
        try {
            setLoading(true);
            const params: any = {
                from_date: compareMonth ? compareMonth.startOf('month').format('YYYY-MM-DD') : undefined,
                to_date: selectedMonth ? selectedMonth.endOf('month').format('YYYY-MM-DD') : undefined,
                amount_basis: amountBasis,
                employee_type: selectedEmployeeType === 'All' ? undefined : selectedEmployeeType,
                department: selectedDepartment === 'All' ? undefined : selectedDepartment,
                docstatus: docstatusFilter === 'all' ? undefined : 1,
            };

            const res = await getSalaryReconciliationStatement(params);
            setData(res);
        } catch (err: any) {
            console.error('Failed to load salary reconciliation statement:', err);
            enqueueSnackbar(err.message || 'Failed to load report', { variant: 'error' });
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [compareMonth, selectedMonth, amountBasis, selectedEmployeeType, selectedDepartment, docstatusFilter, enqueueSnackbar]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatCurrency = (val: number | null | undefined, showDashForZero = false) => {
        if (val === null || val === undefined) return '-';
        if (val === 0 && showDashForZero) return '-';
        return `${hrSettings.currency_symbol} ${fNumber(val, { locale: hrSettings.default_locale })}`;
    };

    const handleOpenHistory = (rev: any) => {
        if (rev && rev.has_history) {
            setSelectedHistoryItem({
                name: rev.history_id,
                employee: rev.employee,
                employee_name: rev.employee_name,
                previous_ctc: rev.prev_amount,
                new_ctc: rev.curr_amount,
                previous_net_salary: rev.prev_amount,
                new_net_salary: rev.curr_amount,
                changed_components: rev.changed_components,
                component_details: rev.component_details,
                changed_by_name: rev.changed_by,
                changed_at: rev.changed_at,
                reason: rev.reason,
            });
            setHistoryDialogOpen(true);
        }
    };

    // Excel Export matching template media_1794288558311_496b025b.png
    const handleExportExcel = async () => {
        if (!data) return;
        setExportingExcel(true);
        try {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Salary Reconciliation');

            sheet.views = [{ showGridLines: true }];

            sheet.columns = [
                { width: 8 },  // A: S.No
                { width: 14 }, // B: Emp No
                { width: 44 }, // C: Particulars
                { width: 18 }, // D: No of Employees
                { width: 18 }, // E: Amt in Rs (Subtotal / Detail)
                { width: 20 }, // F: Amt in Rs (Major Total)
            ];

            const thinBorder: Partial<ExcelJS.Borders> = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } },
            };

            const doubleBottomBorder: Partial<ExcelJS.Borders> = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'double', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } },
            };

            // Row 1: Company Title
            sheet.mergeCells('A1:F1');
            const r1 = sheet.getCell('A1');
            r1.value = data.company_name || 'BBK EXPORTS PRIVATE LIMITED';
            r1.font = { name: 'Calibri', size: 14, bold: true, underline: true };
            r1.alignment = { vertical: 'middle', horizontal: 'center' };
            sheet.getRow(1).height = 24;

            // Row 2: Report Title
            sheet.mergeCells('A2:F2');
            const r2 = sheet.getCell('A2');
            r2.value = `SALARY RECONCILIATION STATEMENT FOR THE MONTH OF ${data.current_period_label || ''}`;
            r2.font = { name: 'Calibri', size: 12, bold: true, underline: true };
            r2.alignment = { vertical: 'middle', horizontal: 'center' };
            sheet.getRow(2).height = 22;

            // Row 3: Blank separator
            sheet.getRow(3).height = 10;

            // Row 4: Table Header
            const headerRow = sheet.getRow(4);
            headerRow.height = 24;
            const headers = ['S.No', 'Emp No', 'Particulars', 'No of Employees', 'Amt in Rs', 'Amt in Rs'];
            headers.forEach((h, idx) => {
                const cell = headerRow.getCell(idx + 1);
                cell.value = h;
                cell.font = { name: 'Calibri', size: 11, bold: true };
                cell.alignment = { vertical: 'middle', horizontal: idx === 2 ? 'left' : idx >= 3 ? 'right' : 'center' };
                cell.border = thinBorder;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            });

            let curRowIdx = 5;

            const applyBorders = (rowNum: number, borderStyle = thinBorder) => {
                for (let c = 1; c <= 6; c++) {
                    sheet.getRow(rowNum).getCell(c).border = borderStyle;
                }
            };

            // 1. Previous Month Salary (Base)
            const baseRow = sheet.getRow(curRowIdx);
            baseRow.getCell(1).value = 1;
            baseRow.getCell(1).alignment = { horizontal: 'center' };
            baseRow.getCell(3).value = data.previous_month?.label || `Salary for the Month of ${data.prev_period_label}`;
            baseRow.getCell(3).font = { bold: true };
            baseRow.getCell(4).value = data.previous_month?.count || 0;
            baseRow.getCell(4).alignment = { horizontal: 'center' };
            baseRow.getCell(4).font = { bold: true };
            baseRow.getCell(5).value = '-';
            baseRow.getCell(5).alignment = { horizontal: 'right' };
            baseRow.getCell(6).value = data.previous_month?.total_amount || 0;
            baseRow.getCell(6).numFmt = '#,##0.00;(#,##0.00);"-"';
            baseRow.getCell(6).font = { bold: true };
            applyBorders(curRowIdx);
            curRowIdx++;

            // 2. Additions Section Header
            const addHeader = sheet.getRow(curRowIdx);
            addHeader.getCell(3).value = `Add : Addition - ${data.current_period_label}`;
            addHeader.getCell(3).font = { bold: true, underline: true };
            applyBorders(curRowIdx);
            curRowIdx++;

            if (data.additions && data.additions.length > 0) {
                data.additions.forEach((add: any) => {
                    const row = sheet.getRow(curRowIdx);
                    row.getCell(1).value = add.s_no;
                    row.getCell(1).alignment = { horizontal: 'center' };
                    row.getCell(2).value = add.employee || add.employee_doc_name || add.employee_id;
                    row.getCell(3).value = add.employee_name;
                    row.getCell(5).value = add.amount;
                    row.getCell(5).numFmt = '#,##0.00;(#,##0.00);"-"';
                    applyBorders(curRowIdx);
                    curRowIdx++;
                });
            }

            // Total Addition Subtotal Row
            const totalAddRow = sheet.getRow(curRowIdx);
            totalAddRow.getCell(3).value = 'Total Addition';
            totalAddRow.getCell(3).font = { bold: true, underline: true };
            totalAddRow.getCell(4).value = data.total_addition?.count || 0;
            totalAddRow.getCell(4).alignment = { horizontal: 'center' };
            totalAddRow.getCell(4).font = { bold: true };
            totalAddRow.getCell(5).value = data.total_addition?.subtotal || 0;
            totalAddRow.getCell(5).numFmt = '#,##0.00;(#,##0.00);"-"';
            totalAddRow.getCell(5).font = { bold: true };
            totalAddRow.getCell(6).value = data.total_addition?.total || 0;
            totalAddRow.getCell(6).numFmt = '#,##0.00;(#,##0.00);"-"';
            totalAddRow.getCell(6).font = { bold: true };
            applyBorders(curRowIdx, doubleBottomBorder);
            curRowIdx++;

            // Blank Row
            sheet.getRow(curRowIdx).height = 14;
            curRowIdx++;

            // 3. Salary Revision Section Header
            const revHeader = sheet.getRow(curRowIdx);
            revHeader.getCell(3).value = `Salary Revison ${data.current_period_label}`;
            revHeader.getCell(3).font = { bold: true, underline: true };
            applyBorders(curRowIdx);
            curRowIdx++;

            if (data.revisions && data.revisions.length > 0) {
                data.revisions.forEach((rev: any) => {
                    const row = sheet.getRow(curRowIdx);
                    row.getCell(1).value = rev.s_no;
                    row.getCell(1).alignment = { horizontal: 'center' };
                    row.getCell(2).value = rev.employee || rev.employee_doc_name || rev.employee_id;
                    const statusTag = rev.revision_type ? `[${rev.revision_type.toUpperCase()}]` : '';
                    const reasonTag = rev.reason ? ` - ${rev.reason}` : '';
                    row.getCell(3).value = `${rev.employee_name} ${statusTag}${reasonTag}`;
                    row.getCell(5).value = rev.diff_amount;
                    row.getCell(5).numFmt = '#,##0.00;[Red]-#,##0.00;"-"';
                    applyBorders(curRowIdx);
                    curRowIdx++;
                });
            }

            // Total Revision Subtotal Row
            const totalRevRow = sheet.getRow(curRowIdx);
            totalRevRow.getCell(3).value = 'Total Revision';
            totalRevRow.getCell(3).font = { bold: true, underline: true };
            totalRevRow.getCell(4).value = data.total_revision?.count || 0;
            totalRevRow.getCell(4).alignment = { horizontal: 'center' };
            totalRevRow.getCell(4).font = { bold: true };
            totalRevRow.getCell(5).value = data.total_revision?.subtotal || 0;
            totalRevRow.getCell(5).numFmt = '#,##0.00;[Red]-#,##0.00;"-"';
            totalRevRow.getCell(5).font = { bold: true };
            totalRevRow.getCell(6).value = data.total_revision?.total || 0;
            totalRevRow.getCell(6).numFmt = '#,##0.00;[Red]-#,##0.00;"-"';
            totalRevRow.getCell(6).font = { bold: true };
            applyBorders(curRowIdx, doubleBottomBorder);
            curRowIdx++;

            // Blank Row
            sheet.getRow(curRowIdx).height = 14;
            curRowIdx++;

            // 4. Deletions Section Header
            const delHeader = sheet.getRow(curRowIdx);
            delHeader.getCell(3).value = `Less : Deletion - ${data.current_period_label}`;
            delHeader.getCell(3).font = { bold: true, underline: true };
            applyBorders(curRowIdx);
            curRowIdx++;

            if (data.deletions && data.deletions.length > 0) {
                data.deletions.forEach((del: any) => {
                    const row = sheet.getRow(curRowIdx);
                    row.getCell(1).value = del.s_no;
                    row.getCell(1).alignment = { horizontal: 'center' };
                    row.getCell(2).value = del.employee || del.employee_doc_name || del.employee_id;
                    row.getCell(3).value = del.employee_name;
                    row.getCell(5).value = del.amount;
                    row.getCell(5).numFmt = '#,##0.00;(#,##0.00);"-"';
                    applyBorders(curRowIdx);
                    curRowIdx++;
                });
            }

            // Total Deletion Subtotal Row
            const totalDelRow = sheet.getRow(curRowIdx);
            totalDelRow.getCell(3).value = 'Total Deletion';
            totalDelRow.getCell(3).font = { bold: true, underline: true };
            totalDelRow.getCell(4).value = data.total_deletion?.count || 0;
            totalDelRow.getCell(4).alignment = { horizontal: 'center' };
            totalDelRow.getCell(4).font = { bold: true };
            totalDelRow.getCell(5).value = data.total_deletion?.subtotal || 0;
            totalDelRow.getCell(5).numFmt = '#,##0.00;(#,##0.00);"-"';
            totalDelRow.getCell(5).font = { bold: true };
            totalDelRow.getCell(6).value = data.total_deletion?.total || 0;
            totalDelRow.getCell(6).numFmt = '#,##0.00;(#,##0.00);"-"';
            totalDelRow.getCell(6).font = { bold: true };
            applyBorders(curRowIdx, doubleBottomBorder);
            curRowIdx++;

            // Blank Row
            sheet.getRow(curRowIdx).height = 14;
            curRowIdx++;

            // 5. Current Month Total
            const currRow = sheet.getRow(curRowIdx);
            currRow.getCell(3).value = `Salary for the Month of ${data.current_period_label}`;
            currRow.getCell(3).font = { bold: true };
            currRow.getCell(4).value = data.current_month?.count || 0;
            currRow.getCell(4).alignment = { horizontal: 'center' };
            currRow.getCell(4).font = { bold: true };
            currRow.getCell(5).value = '-';
            currRow.getCell(5).alignment = { horizontal: 'right' };
            currRow.getCell(6).value = data.current_month?.total_amount || 0;
            currRow.getCell(6).numFmt = '#,##0.00;(#,##0.00);"-"';
            currRow.getCell(6).font = { bold: true };
            applyBorders(curRowIdx);
            curRowIdx++;

            // Blank Row
            sheet.getRow(curRowIdx).height = 14;
            curRowIdx++;

            // 6. Total Increase / Decrease
            const incDecRow = sheet.getRow(curRowIdx);
            incDecRow.getCell(3).value = 'Total Increase / Decrease';
            incDecRow.getCell(3).font = { bold: true };
            incDecRow.getCell(4).value = '-';
            incDecRow.getCell(4).alignment = { horizontal: 'center' };
            incDecRow.getCell(5).value = '-';
            incDecRow.getCell(5).alignment = { horizontal: 'right' };
            incDecRow.getCell(6).value = data.total_increase_decrease || 0;
            incDecRow.getCell(6).numFmt = '#,##0.00;[Red]-#,##0.00;"-"';
            incDecRow.getCell(6).font = { bold: true };
            applyBorders(curRowIdx);
            curRowIdx++;

            // Blank Row
            sheet.getRow(curRowIdx).height = 14;
            curRowIdx++;

            // 7. Difference (Reconciliation proof)
            const diffRow = sheet.getRow(curRowIdx);
            diffRow.getCell(3).value = 'Difference';
            diffRow.getCell(3).font = { bold: true };
            diffRow.getCell(4).value = '-';
            diffRow.getCell(4).alignment = { horizontal: 'center' };
            diffRow.getCell(5).value = '-';
            diffRow.getCell(5).alignment = { horizontal: 'right' };
            diffRow.getCell(6).value = data.difference || 0;
            diffRow.getCell(6).numFmt = '#,##0.00;[Red]-#,##0.00;"-"';
            diffRow.getCell(6).font = { bold: true };
            applyBorders(curRowIdx, doubleBottomBorder);

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Salary_Reconciliation_${data.current_period_label || 'Report'}.xlsx`);
            enqueueSnackbar('Excel report downloaded successfully', { variant: 'success' });
        } catch (err: any) {
            console.error('Failed to export Excel:', err);
            enqueueSnackbar('Failed to export Excel report', { variant: 'error' });
        } finally {
            setExportingExcel(false);
        }
    };

    // PDF Export
    const handleExportPdf = () => {
        if (!data) return;
        setExportingPdf(true);
        try {
            const doc = new jsPDF('portrait', 'pt', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text(data.company_name || 'BBK EXPORTS PRIVATE LIMITED', pageWidth / 2, 40, { align: 'center' });

            doc.setFontSize(11);
            doc.text(`SALARY RECONCILIATION STATEMENT FOR THE MONTH OF ${data.current_period_label || ''}`, pageWidth / 2, 58, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`Basis: ${AMOUNT_BASIS_OPTIONS.find((b) => b.value === amountBasis)?.label || 'Net Pay'} | Type: ${selectedEmployeeType} | Dept: ${selectedDepartment}`, pageWidth / 2, 74, { align: 'center' });

            const bodyRows: any[] = [];

            // 1. Previous Month
            bodyRows.push([
                '1',
                '',
                data.previous_month?.label || `Salary for the Month of ${data.prev_period_label}`,
                String(data.previous_month?.count || 0),
                '-',
                fNumber(data.previous_month?.total_amount || 0),
            ]);

            // 2. Additions
            bodyRows.push(['', '', `Add : Addition - ${data.current_period_label}`, '', '', '']);
            (data.additions || []).forEach((a: any) => {
                bodyRows.push([
                    String(a.s_no),
                    a.employee || a.employee_doc_name || a.employee_id,
                    a.employee_name,
                    '',
                    fNumber(a.amount),
                    '',
                ]);
            });
            bodyRows.push([
                '',
                '',
                'Total Addition',
                String(data.total_addition?.count || 0),
                fNumber(data.total_addition?.subtotal || 0),
                fNumber(data.total_addition?.total || 0),
            ]);

            // 3. Revisions
            bodyRows.push(['', '', `Salary Revison ${data.current_period_label}`, '', '', '']);
            (data.revisions || []).forEach((r: any) => {
                const tag = r.revision_type ? `[${r.revision_type.toUpperCase()}]` : '';
                bodyRows.push([
                    String(r.s_no),
                    r.employee || r.employee_doc_name || r.employee_id,
                    `${r.employee_name} ${tag} ${r.reason ? '(' + r.reason + ')' : ''}`,
                    '',
                    fNumber(r.diff_amount),
                    '',
                ]);
            });
            bodyRows.push([
                '',
                '',
                'Total Revision',
                String(data.total_revision?.count || 0),
                fNumber(data.total_revision?.subtotal || 0),
                fNumber(data.total_revision?.total || 0),
            ]);

            // 4. Deletions
            bodyRows.push(['', '', `Less : Deletion - ${data.current_period_label}`, '', '', '']);
            (data.deletions || []).forEach((d: any) => {
                bodyRows.push([
                    String(d.s_no),
                    d.employee || d.employee_doc_name || d.employee_id,
                    d.employee_name,
                    '',
                    fNumber(d.amount),
                    '',
                ]);
            });
            bodyRows.push([
                '',
                '',
                'Total Deletion',
                String(data.total_deletion?.count || 0),
                fNumber(data.total_deletion?.subtotal || 0),
                fNumber(data.total_deletion?.total || 0),
            ]);

            // 5. Current Month Total
            bodyRows.push([
                '',
                '',
                `Salary for the Month of ${data.current_period_label}`,
                String(data.current_month?.count || 0),
                '-',
                fNumber(data.current_month?.total_amount || 0),
            ]);

            // 6. Increase / Decrease
            bodyRows.push([
                '',
                '',
                'Total Increase / Decrease',
                '-',
                '-',
                fNumber(data.total_increase_decrease || 0),
            ]);

            // 7. Difference
            bodyRows.push([
                '',
                '',
                'Difference',
                '-',
                '-',
                fNumber(data.difference || 0),
            ]);

            autoTable(doc, {
                startY: 90,
                head: [['S.No', 'Emp No', 'Particulars', 'No of Employees', 'Amt in Rs', 'Amt in Rs']],
                body: bodyRows,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 3.5, font: 'helvetica' },
                headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
                columnStyles: {
                    0: { cellWidth: 35, halign: 'center' },
                    1: { cellWidth: 70, halign: 'left' },
                    2: { cellWidth: 'auto', halign: 'left' },
                    3: { cellWidth: 80, halign: 'center' },
                    4: { cellWidth: 85, halign: 'right' },
                    5: { cellWidth: 90, halign: 'right' },
                },
                didParseCell: (hookData) => {
                    const rowText = (hookData.row.raw as any)?.[2] as string;
                    if (
                        rowText &&
                        (rowText.startsWith('Add :') ||
                            rowText.startsWith('Less :') ||
                            rowText.startsWith('Salary Revison') ||
                            rowText.startsWith('Total ') ||
                            rowText.startsWith('Salary for the Month') ||
                            rowText.startsWith('Difference'))
                    ) {
                        hookData.cell.styles.fontStyle = 'bold';
                        if (rowText.startsWith('Total ') || rowText.startsWith('Difference')) {
                            hookData.cell.styles.fillColor = [248, 250, 252];
                        }
                    }
                },
            });

            doc.save(`Salary_Reconciliation_${data.current_period_label || 'Report'}.pdf`);
            enqueueSnackbar('PDF report downloaded successfully', { variant: 'success' });
        } catch (err: any) {
            console.error('Failed to export PDF:', err);
            enqueueSnackbar('Failed to export PDF report', { variant: 'error' });
        } finally {
            setExportingPdf(false);
        }
    };

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack spacing={3}>
                {/* Top Title Bar with Refresh and Reset matching Salary Slip Report */}
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        Salary Reconciliation Statement
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="outlined"
                            startIcon={<Iconify icon={"solar:refresh-bold" as any} />}
                            onClick={fetchData}
                            disabled={loading}
                        >
                            Refresh
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<Iconify icon={"solar:restart-bold" as any} />}
                            onClick={handleReset}
                        >
                            Reset
                        </Button>
                    </Stack>
                </Stack>

                {/* Filter & Action Card with Mint Border */}
                <Card
                    sx={{
                        p: 2.5,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        borderRadius: 2,
                        bgcolor: () => alpha('#10b981', 0.04),
                        border: () => `1px solid ${alpha('#10b981', 0.18)}`,
                        boxShadow: 'none',
                    }}
                >
                    {/* Top Action Bar: 5 Month-Wise Quick Presets & Export Buttons */}
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        justifyContent="space-between"
                        gap={1.5}
                        flexWrap="wrap"
                    >
                        {/* 5 Month-Wise Quick Range Pills */}
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ gap: 0.75 }}>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: 'text.secondary',
                                    fontWeight: 700,
                                    mr: 0.5,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    fontSize: '0.7rem',
                                }}
                            >
                                <Iconify icon={"solar:calendar-linear" as any} width={15} />
                                Quick Range:
                            </Typography>
                            {monthQuickRanges.map((p) => {
                                const active = isMonthPresetActive(p.date);
                                return (
                                    <Chip
                                        key={p.label}
                                        label={p.label}
                                        size="small"
                                        clickable
                                        onClick={() => handleSelectMonthPreset(p.date)}
                                        sx={{
                                            fontWeight: active ? 700 : 500,
                                            fontSize: '0.75rem',
                                            height: 26,
                                            bgcolor: active ? '#059669' : 'background.paper',
                                            color: active ? '#fff' : 'text.primary',
                                            border: (t) => `1px solid ${active ? '#059669' : t.palette.divider}`,
                                            boxShadow: active ? `0 2px 8px ${alpha('#059669', 0.28)}` : 'none',
                                            '&:hover': {
                                                bgcolor: active ? '#047857' : 'action.hover',
                                            },
                                        }}
                                    />
                                );
                            })}
                        </Stack>

                        {/* Export Buttons */}
                        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ ml: { xs: 0, sm: 'auto' } }}>
                            <Button
                                variant="contained"
                                startIcon={exportingExcel ? <CircularProgress size={16} color="inherit" /> : <Iconify icon={"solar:export-bold" as any} width={18} />}
                                onClick={handleExportExcel}
                                disabled={!data || exportingExcel}
                                sx={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: '#fff',
                                    fontWeight: 700,
                                    fontSize: '0.825rem',
                                    height: 36,
                                    px: 2.25,
                                    borderRadius: 1.5,
                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.28)',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                        boxShadow: '0 6px 16px rgba(16, 185, 129, 0.38)',
                                        transform: 'translateY(-1px)',
                                    },
                                    '&.Mui-disabled': {
                                        background: 'none !important',
                                        bgcolor: (t) => `${alpha(t.palette.grey[500], 0.08)} !important`,
                                        color: (t) => `${alpha(t.palette.text.disabled, 0.8)} !important`,
                                        border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.16)}`,
                                        boxShadow: 'none !important',
                                    },
                                }}
                            >
                                {exportingExcel ? 'Exporting...' : 'Export Excel'}
                            </Button>

                            <Button
                                variant="contained"
                                startIcon={exportingPdf ? <CircularProgress size={16} color="inherit" /> : <Iconify icon={"solar:file-download-bold" as any} width={18} />}
                                onClick={handleExportPdf}
                                disabled={!data || exportingPdf}
                                sx={{
                                    background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                                    color: '#fff',
                                    fontWeight: 700,
                                    fontSize: '0.825rem',
                                    height: 36,
                                    px: 2.25,
                                    borderRadius: 1.5,
                                    boxShadow: '0 4px 12px rgba(244, 63, 94, 0.28)',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                                        boxShadow: '0 6px 16px rgba(244, 63, 94, 0.38)',
                                        transform: 'translateY(-1px)',
                                    },
                                    '&.Mui-disabled': {
                                        background: 'none !important',
                                        bgcolor: (t) => `${alpha(t.palette.grey[500], 0.08)} !important`,
                                        color: (t) => `${alpha(t.palette.text.disabled, 0.8)} !important`,
                                        border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.16)}`,
                                        boxShadow: 'none !important',
                                    },
                                }}
                            >
                                {exportingPdf ? 'Exporting...' : 'Export PDF'}
                            </Button>
                        </Stack>
                    </Stack>

                    <Divider sx={{ borderStyle: 'dashed', borderColor: () => alpha('#10b981', 0.16) }} />

                    {/* Filter Inputs Grid with Month and Year Pickers */}
                    <Box
                        sx={{
                            pt: 1,
                            display: 'grid',
                            gap: 1.5,
                            gridTemplateColumns: {
                                xs: 'repeat(1, 1fr)',
                                sm: 'repeat(2, 1fr)',
                                md: '180px 215px 220px 200px 1fr',
                            },
                            alignItems: 'center',
                        }}
                    >
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            {/* Month and Year Picker for Month (Target / Reconciled Month) */}
                            <DatePicker
                                label="Month"
                                views={['year', 'month']}
                                format="MMMM YYYY"
                                value={selectedMonth}
                                onChange={(newValue) => {
                                    setSelectedMonth(newValue);
                                    if (newValue) {
                                        setCompareMonth(newValue.subtract(1, 'month'));
                                    }
                                }}
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        fullWidth: true,
                                        sx: {
                                            bgcolor: 'background.paper',
                                            borderRadius: 1.5,
                                            '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 1.5 },
                                            '& .MuiInputBase-root': { bgcolor: 'background.paper', borderRadius: 1.5 },
                                        },
                                    },
                                }}
                            />
                            {/* Month and Year Picker for Compare Pay Period (Base / Previous Month) */}
                            <DatePicker
                                label="Compare Pay Period"
                                views={['year', 'month']}
                                format="MMMM YYYY"
                                value={compareMonth}
                                onChange={(newValue) => setCompareMonth(newValue)}
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        fullWidth: true,
                                        sx: {
                                            bgcolor: 'background.paper',
                                            borderRadius: 1.5,
                                            '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 1.5 },
                                            '& .MuiInputBase-root': { bgcolor: 'background.paper', borderRadius: 1.5 },
                                        },
                                    },
                                }}
                            />
                        </LocalizationProvider>

                        {/* Amount Basis Selector */}
                        <FormControl size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 1.5 } }}>
                            <Select
                                value={amountBasis}
                                onChange={(e) => setAmountBasis(e.target.value)}
                            >
                                {AMOUNT_BASIS_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Employee Type Filter Autocomplete */}
                        <Autocomplete
                            size="small"
                            fullWidth
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 1.5 } }}
                            options={['All', ...employeeTypes]}
                            value={selectedEmployeeType}
                            onChange={(_, newVal) => setSelectedEmployeeType(newVal || 'All')}
                            renderInput={(params) => <TextField {...params} label="Employee Type" />}
                        />

                        {/* Department Filter */}
                        <Autocomplete
                            size="small"
                            fullWidth
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 1.5 } }}
                            options={['All', ...departments]}
                            value={selectedDepartment}
                            onChange={(_, newVal) => setSelectedDepartment(newVal || 'All')}
                            renderInput={(params) => <TextField {...params} label="Department" />}
                        />
                    </Box>
                </Card>

                {/* KPI Summary Cards matching Worker Matrix style */}
                <Box
                    sx={{
                        display: 'grid',
                        gap: 1.5,
                        gridTemplateColumns: {
                            xs: 'repeat(1, 1fr)',
                            sm: 'repeat(2, 1fr)',
                            md: 'repeat(5, 1fr)',
                        },
                    }}
                >
                    <SummaryCard
                        item={{
                            label: data?.previous_month?.label || 'Previous Month Payout',
                            value: fNumber(data?.previous_month?.total_amount || 0, { locale: hrSettings.default_locale }),
                            prefix: hrSettings.currency_symbol,
                            indicator: 'default',
                            subtitle: `${data?.previous_month?.count || 0} Employees`,
                        }}
                    />
                    <SummaryCard
                        item={{
                            label: 'Total Additions (+)',
                            value: fNumber(data?.total_addition?.total || 0, { locale: hrSettings.default_locale }),
                            prefix: hrSettings.currency_symbol,
                            indicator: 'green',
                            subtitle: `${data?.total_addition?.count || 0} New Joinees`,
                        }}
                    />
                    <SummaryCard
                        item={{
                            label: 'Net Revision (±)',
                            value: `${(data?.total_revision?.total || 0) >= 0 ? '+' : ''}${fNumber(data?.total_revision?.total || 0, { locale: hrSettings.default_locale })}`,
                            prefix: hrSettings.currency_symbol,
                            indicator: 'blue',
                            subtitle: data?.total_lop_variance?.count
                                ? `Inc: ${data?.total_increment?.count || 0} | Dec: ${data?.total_decrement?.count || 0} (${data?.total_lop_variance?.count} LOP)`
                                : `Inc: ${data?.total_increment?.count || 0} | Dec: ${data?.total_decrement?.count || 0}`,
                        }}
                    />
                    <SummaryCard
                        item={{
                            label: 'Total Deletions (-)',
                            value: fNumber(data?.total_deletion?.total || 0, { locale: hrSettings.default_locale }),
                            prefix: hrSettings.currency_symbol,
                            indicator: 'orange',
                            subtitle: `${data?.total_deletion?.count || 0} Exits / Relieved`,
                        }}
                    />
                    <SummaryCard
                        item={{
                            label: data?.current_month?.label || 'Current Month Payout',
                            value: fNumber(data?.current_month?.total_amount || 0, { locale: hrSettings.default_locale }),
                            prefix: hrSettings.currency_symbol,
                            indicator: Math.abs(data?.difference || 0) < 0.01 ? 'default' : 'red',
                            subtitle: Math.abs(data?.difference || 0) < 0.01 ? '100% Reconciled (Diff: ₹0)' : `Variance: ${formatCurrency(data?.difference)}`,
                        }}
                    />
                </Box>

                {/* Main Statement Sheet Card */}
                <Card sx={{ p: { xs: 2, md: 3 }, overflow: 'hidden' }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 12 }}>
                            <CircularProgress size={44} sx={{ mb: 2 }} />
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                Calculating month-on-month reconciliation statement...
                            </Typography>
                        </Box>
                    ) : !data ? (
                        <Box sx={{ py: 8, textAlign: 'center' }}>
                            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                                No salary slips found for the selected period and filters.
                            </Typography>
                        </Box>
                    ) : (
                        <Box>
                            {/* Statement Title Header matching Template */}
                            <Box sx={{ textAlign: 'center', mb: 3 }}>
                                <Typography variant="h5" sx={{ fontWeight: 800, textDecoration: 'underline', letterSpacing: 0.5 }}>
                                    {data.company_name}
                                </Typography>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, textDecoration: 'underline', mt: 0.5, letterSpacing: 0.5 }}>
                                    SALARY RECONCILIATION STATEMENT FOR THE MONTH OF {data.current_period_label}
                                </Typography>
                            </Box>

                            {/* Exact Table Layout */}
                            <TableContainer sx={{ border: (th) => `1px solid ${th.palette.divider}`, borderRadius: 1.5 }}>
                                <Scrollbar>
                                    <Table size="small" sx={{ minWidth: 800 }}>
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: (th) => alpha(th.palette.grey[500], 0.08) }}>
                                                <TableCell align="center" sx={{ width: 60, fontWeight: 800, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    S.No
                                                </TableCell>
                                                <TableCell sx={{ width: 120, fontWeight: 800, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    Emp No
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 800, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    Particulars
                                                </TableCell>
                                                <TableCell align="center" sx={{ width: 130, fontWeight: 800, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    No of Employees
                                                </TableCell>
                                                <TableCell align="right" sx={{ width: 150, fontWeight: 800, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    Amt in Rs
                                                </TableCell>
                                                <TableCell align="right" sx={{ width: 160, fontWeight: 800 }}>
                                                    Amt in Rs
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>

                                        <TableBody>
                                            {/* 1. Base Salary Row */}
                                            <TableRow hover sx={{ '& td': { py: 1.2 } }}>
                                                <TableCell align="center" sx={{ fontWeight: 700, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    1
                                                </TableCell>
                                                <TableCell sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }}>-</TableCell>
                                                <TableCell sx={{ fontWeight: 700, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    {data.previous_month?.label || `Salary for the Month of ${data.prev_period_label}`}
                                                </TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 700, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    {data.previous_month?.count}
                                                </TableCell>
                                                <TableCell align="right" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    -
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800 }}>
                                                    {formatCurrency(data.previous_month?.total_amount)}
                                                </TableCell>
                                            </TableRow>

                                            {/* 2. Additions Section Header */}
                                            <TableRow sx={{ bgcolor: (th) => alpha(th.palette.success.main, 0.04) }}>
                                                <TableCell align="center" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }} />
                                                <TableCell sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }} />
                                                <TableCell sx={{ fontWeight: 800, textDecoration: 'underline', color: 'success.dark', borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    Add : Addition - {data.current_period_label}
                                                </TableCell>
                                                <TableCell align="center" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }} />
                                                <TableCell align="right" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }} />
                                                <TableCell align="right" />
                                            </TableRow>

                                            {/* Additions Rows */}
                                            {data.additions && data.additions.length > 0 ? (
                                                data.additions.map((row: any) => (
                                                    <TableRow key={row.employee} hover sx={{ '& td': { py: 0.8 } }}>
                                                        <TableCell align="center" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                            {row.s_no}
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 600, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                            {row.employee || row.employee_doc_name || row.employee_id}
                                                        </TableCell>
                                                        <TableCell sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                    {row.employee_name}
                                                                </Typography>
                                                                {row.department && (
                                                                    <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
                                                                        ({row.department})
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell align="center" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                            -
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 600, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                            {formatCurrency(row.amount)}
                                                        </TableCell>
                                                        <TableCell align="right">-</TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} align="center" sx={{ py: 1, color: 'text.disabled', fontStyle: 'italic' }}>
                                                        No new employee additions in this period
                                                    </TableCell>
                                                </TableRow>
                                            )}

                                            {/* Total Addition Subtotal Row */}
                                            <TableRow sx={{ bgcolor: (th) => alpha(th.palette.grey[500], 0.05), borderBottom: (th) => `2px solid ${th.palette.divider}` }}>
                                                <TableCell align="center" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }} />
                                                <TableCell sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }} />
                                                <TableCell sx={{ fontWeight: 800, textDecoration: 'underline', borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    Total Addition
                                                </TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 800, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    {data.total_addition?.count}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    {formatCurrency(data.total_addition?.subtotal)}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800 }}>
                                                    {formatCurrency(data.total_addition?.total)}
                                                </TableCell>
                                            </TableRow>

                                            {/* Blank Row Divider */}
                                            <TableRow sx={{ height: 16 }}>
                                                <TableCell colSpan={6} sx={{ p: 0.5, border: 'none' }} />
                                            </TableRow>

                                            {/* 3. Salary Revision Section Header */}
                                            <TableRow sx={{ bgcolor: (th) => alpha(th.palette.info.main, 0.04) }}>
                                                <TableCell align="center" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }} />
                                                <TableCell sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }} />
                                                <TableCell sx={{ fontWeight: 800, textDecoration: 'underline', color: 'info.dark', borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    Salary Revison {data.current_period_label}
                                                </TableCell>
                                                <TableCell align="center" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }} />
                                                <TableCell align="right" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }} />
                                                <TableCell align="right" />
                                            </TableRow>

                                            {/* Revision Rows with Increment/Decrement Status */}
                                            {data.revisions && data.revisions.length > 0 ? (
                                                data.revisions.map((row: any) => {
                                                    const isLopVariance = row.is_lop_variance || row.revision_type === 'LOP Variance';
                                                    const isIncrement = row.revision_type === 'Increment';
                                                    return (
                                                        <TableRow key={row.employee} hover sx={{ '& td': { py: 0.8 } }}>
                                                            <TableCell align="center" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                                {row.s_no}
                                                            </TableCell>
                                                            <TableCell sx={{ fontWeight: 600, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                                {row.employee || row.employee_doc_name || row.employee_id}
                                                            </TableCell>
                                                            <TableCell sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                            {row.employee_name}
                                                                        </Typography>
                                                                        {isLopVariance ? (
                                                                            <Label
                                                                                variant="soft"
                                                                                color="warning"
                                                                                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                                                                            >
                                                                                LOP VARIANCE
                                                                            </Label>
                                                                        ) : (
                                                                            <Label
                                                                                variant="soft"
                                                                                color={isIncrement ? 'success' : 'error'}
                                                                                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                                                                            >
                                                                                {isIncrement ? '▲ INCREMENT' : '▼ DECREMENT'}
                                                                            </Label>
                                                                        )}
                                                                        {row.reason && (
                                                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                                                ({row.reason})
                                                                        </Typography>
                                                                        )}
                                                                    </Stack>

                                                                    {row.has_history && (
                                                                        <Tooltip title="View Detailed Salary Revision History">
                                                                            <IconButton
                                                                                size="small"
                                                                                color="primary"
                                                                                onClick={() => handleOpenHistory(row)}
                                                                                sx={{ p: 0.5 }}
                                                                            >
                                                                                <Iconify icon="solar:eye-bold" width={16} />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    )}
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell align="center" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                                -
                                                            </TableCell>
                                                            <TableCell
                                                                align="right"
                                                                sx={{
                                                                    fontWeight: 700,
                                                                    color: isLopVariance
                                                                        ? (row.diff_amount > 0 ? 'success.main' : 'warning.dark')
                                                                        : (isIncrement ? 'success.main' : 'error.main'),
                                                                    borderRight: (th) => `1px solid ${th.palette.divider}`,
                                                                }}
                                                            >
                                                                {row.diff_amount > 0 ? '+' : ''}
                                                                {formatCurrency(row.diff_amount)}
                                                            </TableCell>
                                                            <TableCell align="right">-</TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} align="center" sx={{ py: 1, color: 'text.disabled', fontStyle: 'italic' }}>
                                                        No salary revisions recorded in this period
                                                    </TableCell>
                                                </TableRow>
                                            )}

                                            {/* Total Revision Subtotal Row */}
                                            <TableRow sx={{ bgcolor: (th) => alpha(th.palette.grey[500], 0.05), borderBottom: (th) => `2px solid ${th.palette.divider}` }}>
                                                <TableCell align="center" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }} />
                                                <TableCell sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }} />
                                                <TableCell sx={{ fontWeight: 800, textDecoration: 'underline', borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    Total Revision
                                                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 500 }}>
                                                        (Increments: +{formatCurrency(data.total_increment?.total)} | Decrements: -{formatCurrency(data.total_decrement?.total)})
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 800, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    {data.total_revision?.count}
                                                </TableCell>
                                                <TableCell
                                                    align="right"
                                                    sx={{
                                                        fontWeight: 800,
                                                        color: (data.total_revision?.subtotal || 0) >= 0 ? 'success.dark' : 'error.dark',
                                                        borderRight: (th) => `1px solid ${th.palette.divider}`,
                                                    }}
                                                >
                                                    {(data.total_revision?.subtotal || 0) >= 0 ? '+' : ''}
                                                    {formatCurrency(data.total_revision?.subtotal)}
                                                </TableCell>
                                                <TableCell
                                                    align="right"
                                                    sx={{
                                                        fontWeight: 800,
                                                        color: (data.total_revision?.total || 0) >= 0 ? 'success.dark' : 'error.dark',
                                                    }}
                                                >
                                                    {(data.total_revision?.total || 0) >= 0 ? '+' : ''}
                                                    {formatCurrency(data.total_revision?.total)}
                                                </TableCell>
                                            </TableRow>

                                            {/* Blank Row Divider */}
                                            <TableRow sx={{ height: 16 }}>
                                                <TableCell colSpan={6} sx={{ p: 0.5, border: 'none' }} />
                                            </TableRow>

                                            {/* 4. Deletions Section Header */}
                                            <TableRow sx={{ bgcolor: (th) => alpha(th.palette.error.main, 0.04) }}>
                                                <TableCell align="center" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }} />
                                                <TableCell sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }} />
                                                <TableCell sx={{ fontWeight: 800, textDecoration: 'underline', color: 'error.dark', borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    Less : Deletion - {data.current_period_label}
                                                </TableCell>
                                                <TableCell align="center" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }} />
                                                <TableCell align="right" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }} />
                                                <TableCell align="right" />
                                            </TableRow>

                                            {/* Deletions Rows */}
                                            {data.deletions && data.deletions.length > 0 ? (
                                                data.deletions.map((row: any) => (
                                                    <TableRow key={row.employee} hover sx={{ '& td': { py: 0.8 } }}>
                                                        <TableCell align="center" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                            {row.s_no}
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 600, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                            {row.employee || row.employee_doc_name || row.employee_id}
                                                        </TableCell>
                                                        <TableCell sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                    {row.employee_name}
                                                                </Typography>
                                                                {row.department && (
                                                                    <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
                                                                        ({row.department})
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell align="center" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                            -
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 600, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                            {formatCurrency(row.amount)}
                                                        </TableCell>
                                                        <TableCell align="right">-</TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} align="center" sx={{ py: 1, color: 'text.disabled', fontStyle: 'italic' }}>
                                                        No employee deletions in this period
                                                    </TableCell>
                                                </TableRow>
                                            )}

                                            {/* Total Deletion Subtotal Row */}
                                            <TableRow sx={{ bgcolor: (th) => alpha(th.palette.grey[500], 0.05), borderBottom: (th) => `2px solid ${th.palette.divider}` }}>
                                                <TableCell align="center" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }} />
                                                <TableCell sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }} />
                                                <TableCell sx={{ fontWeight: 800, textDecoration: 'underline', borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    Total Deletion
                                                </TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 800, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    {data.total_deletion?.count}
                                                </TableCell>
                                                <TableCell align="right" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    -
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800, color: 'error.main' }}>
                                                    -{formatCurrency(data.total_deletion?.total)}
                                                </TableCell>
                                            </TableRow>

                                            {/* Blank Row Divider */}
                                            <TableRow sx={{ height: 16 }}>
                                                <TableCell colSpan={6} sx={{ p: 0.5, border: 'none' }} />
                                            </TableRow>

                                            {/* 5. Salary for Current Month Row */}
                                            <TableRow hover sx={{ bgcolor: (th) => alpha(th.palette.primary.main, 0.03), '& td': { py: 1.2 } }}>
                                                <TableCell align="center" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }} />
                                                <TableCell sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }}>-</TableCell>
                                                <TableCell sx={{ fontWeight: 800, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    Salary for the Month of {data.current_period_label}
                                                </TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 800, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    {data.current_month?.count}
                                                </TableCell>
                                                <TableCell align="right" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    -
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                                    {formatCurrency(data.current_month?.total_amount)}
                                                </TableCell>
                                            </TableRow>

                                            {/* Blank Row Divider */}
                                            <TableRow sx={{ height: 16 }}>
                                                <TableCell colSpan={6} sx={{ p: 0.5, border: 'none' }} />
                                            </TableRow>

                                            {/* 6. Total Increase / Decrease Row */}
                                            <TableRow hover sx={{ '& td': { py: 1.2 } }}>
                                                <TableCell align="center" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }} />
                                                <TableCell sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }}>-</TableCell>
                                                <TableCell sx={{ fontWeight: 800, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    Total Increase / Decrease
                                                </TableCell>
                                                <TableCell align="center" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    -
                                                </TableCell>
                                                <TableCell align="right" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    -
                                                </TableCell>
                                                <TableCell
                                                    align="right"
                                                    sx={{
                                                        fontWeight: 800,
                                                        color: (data.total_increase_decrease || 0) >= 0 ? 'success.main' : 'error.main',
                                                    }}
                                                >
                                                    {(data.total_increase_decrease || 0) >= 0 ? '+' : ''}
                                                    {formatCurrency(data.total_increase_decrease)}
                                                </TableCell>
                                            </TableRow>

                                            {/* Blank Row Divider */}
                                            <TableRow sx={{ height: 16 }}>
                                                <TableCell colSpan={6} sx={{ p: 0.5, border: 'none' }} />
                                            </TableRow>

                                            {/* 7. Difference Row (Proof of Reconciliation) */}
                                            <TableRow
                                                sx={{
                                                    bgcolor: (th) => Math.abs(data.difference || 0) < 0.01 ? alpha(th.palette.success.main, 0.06) : alpha(th.palette.warning.main, 0.08),
                                                    borderTop: (th) => `2px solid ${th.palette.divider}`,
                                                    borderBottom: (th) => `3px double ${th.palette.divider}`,
                                                    '& td': { py: 1.4 },
                                                }}
                                            >
                                                <TableCell align="center" sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }} />
                                                <TableCell sx={{ borderRight: (th) => `1px solid ${th.palette.divider}` }}>-</TableCell>
                                                <TableCell sx={{ fontWeight: 900, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    Difference
                                                </TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 800, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    -
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800, borderRight: (th) => `1px solid ${th.palette.divider}` }}>
                                                    -
                                                </TableCell>
                                                <TableCell
                                                    align="right"
                                                    sx={{
                                                        fontWeight: 900,
                                                        color: (th) => Math.abs(data.difference || 0) < 0.01 ? th.palette.success.dark : th.palette.error.main,
                                                    }}
                                                >
                                                    {formatCurrency(data.difference)}
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </Scrollbar>
                            </TableContainer>
                        </Box>
                    )}
                </Card>
            </Stack>

            {/* Salary Revision Details Dialog */}
            {historyDialogOpen && selectedHistoryItem && (
                <SalaryHistoryDetailsDialog
                    open={historyDialogOpen}
                    onClose={() => setHistoryDialogOpen(false)}
                    historyItem={selectedHistoryItem}
                    currencySymbol={hrSettings.currency_symbol}
                    locale={hrSettings.default_locale}
                />
            )}
        </DashboardContent>
    );
}
