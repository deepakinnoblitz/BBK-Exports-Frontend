import jsPDF from 'jspdf';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import autoTable from 'jspdf-autotable';
import { useSnackbar } from 'notistack';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Radio from '@mui/material/Radio';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import RadioGroup from '@mui/material/RadioGroup';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { fDate } from 'src/utils/format-time';
import { filterEmployeeOptions } from 'src/utils/filter-employees';

import { runReport } from 'src/api/reports';
import { getDoctypeList } from 'src/api/leads';
import { COMMON_COLORS } from 'src/theme/common-colors';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { useAuth } from 'src/auth/auth-context';

import { CanteenCalendar } from './canteen-calendar';
import { CanteenDetailsDialog } from '../canteen-details-dialog';

// ----------------------------------------------------------------------

const MEAL_TYPE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  Lunch: { bg: 'rgba(16, 185, 129, 0.12)', color: '#047857', border: '#10b981' },
  Dinner: { bg: 'rgba(99, 102, 241, 0.12)', color: '#4338ca', border: '#6366f1' },
  Breakfast: { bg: 'rgba(245, 158, 11, 0.12)', color: '#b45309', border: '#f59e0b' },
  Snacks: { bg: 'rgba(168, 85, 247, 0.12)', color: '#7e22ce', border: '#a855f7' },
};

function getMealBadgeColors(mealType: string) {
  const match = Object.keys(MEAL_TYPE_COLORS).find((k) =>
    (mealType || '').toLowerCase().includes(k.toLowerCase())
  );
  if (match) return MEAL_TYPE_COLORS[match];
  return { bg: 'rgba(16, 185, 129, 0.12)', color: '#047857', border: '#10b981' };
}

// ----------------------------------------------------------------------

export function CanteenReportView() {
  const theme = useTheme();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const actionPerms =
    user?.permissions?.actions?.my_canteen_report ||
    user?.permissions?.actions?.canteen_report ||
    user?.permissions?.actions?.report_canteen ||
    user?.permissions?.actions?.canteen;
  const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned && !!actionPerms;
  const canExport = hasCustomPerms ? !!actionPerms?.export : true;

  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [isHR, setIsHR] = useState(false);

  // Filters
  const [fromDate, setFromDate] = useState<dayjs.Dayjs | null>(dayjs().startOf('month'));
  const [toDate, setToDate] = useState<dayjs.Dayjs | null>(dayjs().endOf('month'));
  const [employee, setEmployee] = useState<string[]>([]);
  const [mealType, setMealType] = useState('all');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date_asc');
  const [currentView, setCurrentView] = useState<'list' | 'calendar' | 'muster'>('list');
  const [musterPage, setMusterPage] = useState(0);
  const [musterRowsPerPage, setMusterRowsPerPage] = useState(50);
  const [openExportDialog, setOpenExportDialog] = useState(false);
  const [exportType, setExportType] = useState<'excel' | 'pdf'>('excel');
  const [selectedExportView, setSelectedExportView] = useState<'list' | 'muster'>('list');
  const [preparing, setPreparing] = useState(false);

  // Holidays
  const [holidaysList, setHolidaysList] = useState<any[]>([]);

  // Options
  const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Selection
  const [selected, setSelected] = useState<string[]>([]);

  // Details Dialog
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedEntryData, setSelectedEntryData] = useState<any | null>(null);

  // --- Muster Roll drag-scroll (ref-based — zero React re-renders) ---
  const musterScrollRef = useRef<HTMLDivElement>(null);
  const isDraggingMuster = useRef(false);
  const musterDragStartX = useRef(0);
  const musterScrollStartLeft = useRef(0);
  const musterDragMoved = useRef(0);

  const handleMusterMouseDown = (e: React.MouseEvent) => {
    const el = musterScrollRef.current;
    if (!el) return;
    isDraggingMuster.current = true;
    musterDragStartX.current = e.clientX;
    musterScrollStartLeft.current = el.scrollLeft;
    musterDragMoved.current = 0;
    el.style.cursor = 'grabbing';
  };

  const handleMusterMouseLeave = () => {
    const el = musterScrollRef.current;
    if (!el) return;
    isDraggingMuster.current = false;
    el.style.cursor = 'grab';
  };

  const handleMusterMouseUp = () => {
    const el = musterScrollRef.current;
    if (!el) return;
    isDraggingMuster.current = false;
    el.style.cursor = 'grab';
  };

  const handleMusterMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingMuster.current) return;
    const el = musterScrollRef.current;
    if (!el) return;
    const dx = e.clientX - musterDragStartX.current;
    musterDragMoved.current = Math.abs(dx);
    el.scrollLeft = musterScrollStartLeft.current - dx;
  };

  const handleMusterCellClick = (entryRecord?: any) => {
    if (musterDragMoved.current > 15) return; // was a drag, not a click
    if (entryRecord) {
      handleViewDetails(entryRecord.name, entryRecord);
    }
  };

  const handleViewChange = useCallback(
    (newView: 'list' | 'calendar' | 'muster') => {
      if (newView === currentView) return;
      setPreparing(true);
      setTimeout(() => {
        setCurrentView(newView);
        setPreparing(false);
      }, 100);
    },
    [currentView]
  );

  useEffect(() => {
    if (employee.length === 0 && currentView === 'calendar') {
      setCurrentView('list');
    }
  }, [employee, currentView]);

  useEffect(() => {
    if (user && user.roles) {
      const hrRoles = ['HR Manager', 'HR', 'System Manager', 'Administrator'];
      const hasHRRole = user.roles.some((role: string) => hrRoles.includes(role));
      setIsHR(hasHRRole);
      if (!hasHRRole && user.employee) {
        setEmployee([user.employee]);
      }
    }
  }, [user]);

  const handleViewDetails = (id: string, rawData?: any) => {
    setSelectedEntryId(id);
    setSelectedEntryData(rawData || null);
    setOpenDetails(true);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = reportData.map((n) => n.name);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Dates for Muster Roll
  const dates = useMemo(() => {
    const startStr = fromDate
      ? fromDate.format('YYYY-MM-DD')
      : reportData.length > 0
      ? reportData.reduce((min, p) => (p.canteen_date < min ? p.canteen_date : min), reportData[0].canteen_date)
      : dayjs().startOf('month').format('YYYY-MM-DD');

    const endStr = toDate
      ? toDate.format('YYYY-MM-DD')
      : reportData.length > 0
      ? reportData.reduce((max, p) => (p.canteen_date > max ? p.canteen_date : max), reportData[0].canteen_date)
      : dayjs().endOf('month').format('YYYY-MM-DD');

    const start = dayjs(startStr);
    const end = dayjs(endStr);
    const dateArray: dayjs.Dayjs[] = [];
    let cur = start;
    let count = 0;
    while ((cur.isBefore(end) || cur.isSame(end, 'day')) && count < 366) {
      dateArray.push(cur);
      cur = cur.add(1, 'day');
      count++;
    }
    return dateArray;
  }, [fromDate, toDate, reportData]);

  // Unique Employees for Muster Roll
  const uniqueEmployees = useMemo(() => {
    const map = new Map<string, { id: string; name: string; department?: string; designation?: string }>();
    reportData.forEach((row) => {
      if (row.employee && !map.has(row.employee)) {
        map.set(row.employee, {
          id: row.employee,
          name: row.employee_name || row.employee,
          department: row.department,
          designation: row.designation,
        });
      }
    });
    return Array.from(map.values());
  }, [reportData]);

  const paginatedEmployees = useMemo(
    () =>
      uniqueEmployees.slice(
        musterPage * musterRowsPerPage,
        musterPage * musterRowsPerPage + musterRowsPerPage
      ),
    [uniqueEmployees, musterPage, musterRowsPerPage]
  );

  // Grouped Canteen Entries Map: employee_date -> list of entries
  const canteenMap = useMemo(() => {
    const map = new Map<string, any[]>();
    reportData.forEach((row) => {
      if (row.employee && row.canteen_date) {
        const dateStr = dayjs(row.canteen_date).format('YYYY-MM-DD');
        const key = `${row.employee}_${dateStr}`;
        const list = map.get(key) || [];
        list.push(row);
        map.set(key, list);
      }
    });
    return map;
  }, [reportData]);

  // Holiday dates set
  const holidayMap = useMemo(() => {
    const map = new Map<string, string>();
    holidaysList.forEach((h) => {
      if (h.holiday_date && !h.is_working_day) {
        map.set(dayjs(h.holiday_date).format('YYYY-MM-DD'), h.description || 'Holiday');
      }
    });
    return map;
  }, [holidaysList]);

  const isDateHoliday = useCallback(
    (date: dayjs.Dayjs) => holidayMap.has(date.format('YYYY-MM-DD')),
    [holidayMap]
  );

  const getHolidayName = useCallback(
    (date: dayjs.Dayjs) => holidayMap.get(date.format('YYYY-MM-DD')) || 'Holiday',
    [holidayMap]
  );

  const getCanteenEntriesForDate = useCallback(
    (employeeId: string, date: dayjs.Dayjs) => {
      const dateStr = date.format('YYYY-MM-DD');
      return canteenMap.get(`${employeeId}_${dateStr}`) || [];
    },
    [canteenMap]
  );

  // Total meals per employee across the date range
  const employeeMealTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    reportData.forEach((row) => {
      if (row.employee && row.status !== 'Cancelled') {
        totals[row.employee] = (totals[row.employee] || 0) + (Number(row.meal_count) || 1);
      }
    });
    return totals;
  }, [reportData]);

  // Daily totals across all employees
  const dailyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    dates.forEach((d) => {
      totals[d.format('YYYY-MM-DD')] = 0;
    });
    reportData.forEach((row) => {
      if (row.canteen_date && row.status !== 'Cancelled') {
        const dStr = dayjs(row.canteen_date).format('YYYY-MM-DD');
        if (totals[dStr] !== undefined) {
          totals[dStr] += Number(row.meal_count) || 1;
        }
      }
    });
    return totals;
  }, [dates, reportData]);

  const grandTotalMeals = useMemo(
    () =>
      reportData.reduce(
        (sum, row) => (row.status !== 'Cancelled' ? sum + (Number(row.meal_count) || 1) : sum),
        0
      ),
    [reportData]
  );

  const fetchReport = useCallback(async () => {
    if (!fromDate || !toDate) {
      setReportData([]);
      return;
    }
    if (toDate.isBefore(fromDate, 'day')) {
      setReportData([]);
      return;
    }
    setLoading(true);
    try {
      const filters: any = {};
      if (fromDate) filters.from_date = fromDate.format('YYYY-MM-DD');
      if (toDate) filters.to_date = toDate.format('YYYY-MM-DD');
      if (employee.length > 0) filters.employee = employee;
      if (mealType !== 'all') filters.meal_type = mealType;
      if (status !== 'all') filters.status = status;

      const result = await runReport('Canteen Report', filters);
      let finalData = result?.result || [];

      // Sort Data
      finalData = [...finalData].sort((a, b) => {
        const dateA = a.canteen_date || '';
        const dateB = b.canteen_date || '';
        const nameA = (a.employee_name || '').toLowerCase();
        const nameB = (b.employee_name || '').toLowerCase();

        switch (sortBy) {
          case 'date_asc':
            if (dateB !== dateA) return dateB.localeCompare(dateA);
            return nameA.localeCompare(nameB);
          case 'date_desc':
            if (dateA !== dateB) return dateA.localeCompare(dateB);
            return nameA.localeCompare(nameB);
          case 'name_asc':
            if (nameA !== nameB) return nameA.localeCompare(nameB);
            return dateB.localeCompare(dateA);
          case 'name_desc':
            if (nameA !== nameB) return nameB.localeCompare(nameA);
            return dateB.localeCompare(dateA);
          default:
            return 0;
        }
      });

      setReportData(finalData);
      setPage(0);

      // Fetch Holidays for the date range
      try {
        const holidays = await getDoctypeList('Holidays', ['holiday_date', 'description', 'is_working_day']);
        setHolidaysList(holidays || []);
      } catch {
        setHolidaysList([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch Canteen Report:', error);
      enqueueSnackbar(error.message || 'Failed to load Canteen Report', { variant: 'error' });
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, employee, mealType, status, sortBy, enqueueSnackbar]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    getDoctypeList('Employee', ['name', 'employee_name']).then(setEmployeeOptions);
  }, []);

  // Quick Range Presets
  const handlePreset = (preset: 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth') => {
    const now = dayjs();
    switch (preset) {
      case 'today':
        setFromDate(now);
        setToDate(now);
        break;
      case 'yesterday':
        setFromDate(now.subtract(1, 'day'));
        setToDate(now.subtract(1, 'day'));
        break;
      case 'last7':
        setFromDate(now.subtract(6, 'day'));
        setToDate(now);
        break;
      case 'thisMonth':
        setFromDate(now.startOf('month'));
        setToDate(now.endOf('month'));
        break;
      case 'lastMonth':
        setFromDate(now.subtract(1, 'month').startOf('month'));
        setToDate(now.subtract(1, 'month').endOf('month'));
        break;
      default:
        break;
    }
  };

  const isPresetActive = (preset: string) => {
    if (!fromDate || !toDate) return false;
    const now = dayjs();
    switch (preset) {
      case 'today':
        return fromDate.isSame(now, 'day') && toDate.isSame(now, 'day');
      case 'yesterday':
        return fromDate.isSame(now.subtract(1, 'day'), 'day') && toDate.isSame(now.subtract(1, 'day'), 'day');
      case 'last7':
        return fromDate.isSame(now.subtract(6, 'day'), 'day') && toDate.isSame(now, 'day');
      case 'thisMonth':
        return fromDate.isSame(now.startOf('month'), 'day') && toDate.isSame(now.endOf('month'), 'day');
      case 'lastMonth':
        return (
          fromDate.isSame(now.subtract(1, 'month').startOf('month'), 'day') &&
          toDate.isSame(now.subtract(1, 'month').endOf('month'), 'day')
        );
      default:
        return false;
    }
  };

  const handleReset = () => {
    setFromDate(dayjs().startOf('month'));
    setToDate(dayjs().endOf('month'));
    if (isHR) {
      setEmployee([]);
    } else if (user?.employee) {
      setEmployee([user.employee]);
    }
    setMealType('all');
    setStatus('all');
    setSortBy('date_asc');
    setSelected([]);
  };

  const handleOpenExportDialog = (type: 'excel' | 'pdf') => {
    setExportType(type);
    if (type === 'pdf') {
      setSelectedExportView('list');
    } else {
      setSelectedExportView(currentView === 'muster' ? 'muster' : 'list');
    }
    setOpenExportDialog(true);
  };

  const handleExport = async (targetView?: 'list' | 'muster') => {
    const viewToExport = targetView || (currentView === 'muster' ? 'muster' : 'list');
    setExportingExcel(true);
    try {
      if (viewToExport === 'muster') {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Muster Roll Report');

        const columns = [
          { header: 'Employee ID', key: 'employee_id', width: 15 },
          { header: 'Employee', key: 'employee_name', width: 25 },
          { header: 'Department', key: 'department', width: 18 },
        ];

        dates.forEach((date) => {
          columns.push({
            header: date.format('DD MMM (ddd)'),
            key: date.format('YYYY-MM-DD'),
            width: 20,
          });
        });

        columns.push({
          header: 'Total Meals',
          key: 'total_meals',
          width: 15,
        });

        sheet.columns = columns;

        for (let i = 1; i <= columns.length; i++) {
          const cell = sheet.getRow(1).getCell(i);
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
        sheet.getRow(1).height = 25;

        uniqueEmployees.forEach((emp) => {
          const rowData: any = {
            employee_id: emp.id,
            employee_name: emp.name,
            department: emp.department || '',
            total_meals: employeeMealTotals[emp.id] || 0,
          };

          dates.forEach((date) => {
            const entries = getCanteenEntriesForDate(emp.id, date);
            if (entries.length > 0) {
              const summary = entries
                .map((e) => `${e.meal_type || 'Lunch'} (x${e.meal_count || 1})`)
                .join(', ');
              rowData[date.format('YYYY-MM-DD')] = summary;
            } else {
              rowData[date.format('YYYY-MM-DD')] = '-';
            }
          });

          const excelRow = sheet.addRow(rowData);
          excelRow.height = 35;

          for (let i = 4; i <= columns.length - 1; i++) {
            const cell = excelRow.getCell(i);
            const date = dates[i - 4];
            const entries = getCanteenEntriesForDate(emp.id, date);
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

            if (entries.length > 0) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2F0D9' } };
              cell.font = { color: { argb: 'FF385723' }, bold: true };
            } else if (date.day() === 0) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
              cell.font = { color: { argb: 'FF595959' } };
            }
          }

          const totalCell = excelRow.getCell(columns.length);
          totalCell.alignment = { vertical: 'middle', horizontal: 'center' };
          totalCell.font = { bold: true, color: { argb: 'FF047857' } };
        });

        // Merge Holiday columns across rows
        if (uniqueEmployees.length > 0) {
          dates.forEach((date, index) => {
            if (isDateHoliday(date)) {
              const colIndex = index + 4;
              sheet.mergeCells(2, colIndex, uniqueEmployees.length + 1, colIndex);
              const topCell = sheet.getRow(2).getCell(colIndex);
              topCell.value = 'HOLIDAY';
              topCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
              topCell.font = { color: { argb: 'FF595959' }, bold: true, size: 10 };
              topCell.alignment = { textRotation: 90, vertical: 'middle', horizontal: 'center', wrapText: true };
            }
          });
        }

        // Add Daily Totals Footer Row
        const totalsRowData: any = {
          employee_id: 'DAILY TOTALS',
          employee_name: '',
          department: '',
          total_meals: grandTotalMeals,
        };
        dates.forEach((date) => {
          totalsRowData[date.format('YYYY-MM-DD')] = dailyTotals[date.format('YYYY-MM-DD')] || 0;
        });
        const footerRow = sheet.addRow(totalsRowData);
        footerRow.height = 25;
        for (let i = 1; i <= columns.length; i++) {
          const cell = footerRow.getCell(i);
          cell.font = { bold: true, color: { argb: 'FF047857' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }

        // Borders
        sheet.eachRow((row, rowNumber) => {
          for (let i = 1; i <= columns.length; i++) {
            const cell = row.getCell(i);
            if (rowNumber > 1 && i <= 3) {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF000000' } },
              bottom: { style: 'thin', color: { argb: 'FF000000' } },
              left: { style: 'thin', color: { argb: 'FF000000' } },
              right: { style: 'thin', color: { argb: 'FF000000' } },
            };
          }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Muster_Roll_Report_${dayjs().format('YYYY-MM-DD')}.xlsx`);
        enqueueSnackbar('Muster Roll Excel exported successfully!', { variant: 'success' });
        return;
      }

      // List View Export
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Canteen Report');
      const exportData = reportData;

      sheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Employee ID', key: 'employee', width: 15 },
        { header: 'Employee', key: 'employee_name', width: 25 },
        { header: 'Department', key: 'department', width: 18 },
        { header: 'Designation', key: 'designation', width: 18 },
        { header: 'Meal Type', key: 'meal_type', width: 15 },
        { header: 'Meal Count', key: 'meal_count', width: 14 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Source', key: 'source', width: 15 },
        { header: 'Remarks', key: 'remarks', width: 25 },
      ];

      const columnCount = sheet.columns.length;

      // Header Styling
      for (let i = 1; i <= columnCount; i++) {
        const cell = sheet.getRow(1).getCell(i);
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
      sheet.getRow(1).height = 25;

      exportData.forEach((row) => {
        const excelRow = sheet.addRow({
          date: fDate(row.canteen_date, 'DD-MM-YYYY'),
          employee: row.employee,
          employee_name: row.employee_name,
          department: row.department || '---',
          designation: row.designation || '---',
          meal_type: row.meal_type || 'Lunch',
          meal_count: row.meal_count || 1,
          status: row.status || 'Availed',
          source: row.source || 'Manual',
          remarks: row.remarks || '---',
        });

        // Status coloring
        const statusCell = excelRow.getCell('status');
        const statusColors: any = {
          Availed: 'FF22C55E',
          Cancelled: 'FFEF4444',
        };
        if (statusColors[row.status]) {
          statusCell.font = { color: { argb: statusColors[row.status] }, bold: true };
        }
      });

      // Merging logic for Date, Employee, and Employee ID (matching Attendance Report)
      let mergeStart = 2;
      const totalRows = sheet.rowCount;
      for (let i = 2; i <= totalRows; i++) {
        const current = sheet.getRow(i);
        const next = i < totalRows ? sheet.getRow(i + 1) : null;

        const isLast = i === totalRows;
        const sameAsNext =
          !isLast &&
          next &&
          current.getCell(1).value === next.getCell(1).value &&
          current.getCell(2).value === next.getCell(2).value &&
          current.getCell(3).value === next.getCell(3).value;

        if (!sameAsNext) {
          if (i > mergeStart) {
            sheet.mergeCells(`A${mergeStart}:A${i}`);
            sheet.mergeCells(`B${mergeStart}:B${i}`);
            sheet.mergeCells(`C${mergeStart}:C${i}`);

            ['A', 'B', 'C'].forEach((col) => {
              sheet.getCell(`${col}${mergeStart}`).alignment = { vertical: 'middle', horizontal: 'center' };
            });
          }
          mergeStart = i + 1;
        }
      }

      // Alternating row styling & borders
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          for (let i = 1; i <= columnCount; i++) {
            const cell = row.getCell(i);
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            if (rowNumber % 2 === 0) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };
            }
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF000000' } },
              bottom: { style: 'thin', color: { argb: 'FF000000' } },
              left: { style: 'thin', color: { argb: 'FF000000' } },
              right: { style: 'thin', color: { argb: 'FF000000' } },
            };
          }
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Canteen_Report_${dayjs().format('YYYY-MM-DD')}.xlsx`);
      enqueueSnackbar('Excel exported successfully!', { variant: 'success' });
    } catch (error) {
      console.error('Excel export failed:', error);
      enqueueSnackbar('Excel export failed!', { variant: 'error' });
    } finally {
      setExportingExcel(false);
    }
  };

  // PDF Export
  const handleExportPdf = async (targetView?: 'list' | 'muster') => {
    setExportingPdf(true);
    try {
      const doc = new jsPDF('landscape');
      const exportData = reportData;

      // Header
      doc.setFontSize(22);
      doc.setTextColor(5, 150, 105);
      doc.setFont('helvetica', 'bold');
      doc.text('Canteen Report', 14, 20);

      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${dayjs().format('DD MMM YYYY, h:mm A')}`, 14, 27);

      // Accent line
      doc.setDrawColor(5, 150, 105);
      doc.setLineWidth(0.5);
      doc.line(14, 32, 280, 32);

      const tableData: any[] = [];
      for (let i = 0; i < exportData.length; i++) {
        const row = exportData[i];
        const currentDate = fDate(row.canteen_date, 'DD-MM-YYYY');
        const currentEmployee = row.employee_name;
        const currentEmployeeId = row.employee;

        // Grouping check (mirroring Excel merge & Attendance Report)
        let isStart = true;
        if (i > 0) {
          const prevRow = exportData[i - 1];
          if (
            fDate(prevRow.canteen_date, 'DD-MM-YYYY') === currentDate &&
            prevRow.employee_name === currentEmployee &&
            prevRow.employee === currentEmployeeId
          ) {
            isStart = false;
          }
        }

        if (isStart) {
          let span = 1;
          while (i + span < exportData.length) {
            const nextRow = exportData[i + span];
            if (
              fDate(nextRow.canteen_date, 'DD-MM-YYYY') === currentDate &&
              nextRow.employee_name === currentEmployee &&
              nextRow.employee === currentEmployeeId
            ) {
              span++;
            } else {
              break;
            }
          }

          tableData.push([
            { content: currentDate, rowSpan: span, styles: { valign: 'middle', halign: 'center' } },
            { content: currentEmployee, rowSpan: span, styles: { valign: 'middle', halign: 'left' } },
            { content: currentEmployeeId, rowSpan: span, styles: { valign: 'middle', halign: 'center' } },
            row.department || '---',
            row.meal_type || 'Lunch',
            String(row.meal_count || 1),
            row.status || 'Availed',
            row.source || 'Manual',
            row.remarks || '---',
          ]);
        } else {
          tableData.push([
            row.department || '---',
            row.meal_type || 'Lunch',
            String(row.meal_count || 1),
            row.status || 'Availed',
            row.source || 'Manual',
            row.remarks || '---',
          ]);
        }
      }

      autoTable(doc, {
        startY: 38,
        head: [['Date', 'Employee', 'Employee ID', 'Department', 'Meal Type', 'Meal Count', 'Status', 'Source', 'Remarks']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak', lineWidth: 0.15, lineColor: [60, 60, 60], valign: 'middle' },
        columnStyles: {
          0: { cellWidth: 26, halign: 'center' },
          1: { cellWidth: 45 },
          2: { cellWidth: 26, halign: 'center' },
          3: { cellWidth: 35 },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 20, halign: 'center' },
          6: { cellWidth: 24, halign: 'center' },
          7: { cellWidth: 25, halign: 'center' },
          8: { cellWidth: 40 },
        },
        didParseCell: (data) => {
          const statusVal = data.cell.text[0];
          const statusColors: any = {
            Availed: [34, 197, 94],
            Cancelled: [239, 68, 68],
          };
          if (data.column.index === 6 && statusColors[statusVal]) {
            data.cell.styles.textColor = statusColors[statusVal];
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });

      doc.save(`Canteen_Report_${dayjs().format('YYYY-MM-DD')}.pdf`);
      enqueueSnackbar('PDF exported successfully!', { variant: 'success' });
    } catch (error) {
      console.error('PDF export failed:', error);
      enqueueSnackbar('PDF export failed!', { variant: 'error' });
    } finally {
      setExportingPdf(false);
    }
  };

  const onChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const onChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // Summary Metrics
  const totalMealsCount = useMemo(
    () => reportData.reduce((acc, row) => acc + (Number(row.meal_count) || 1), 0),
    [reportData]
  );
  const availedMealsCount = useMemo(
    () =>
      reportData
        .filter((d) => d.status === 'Availed')
        .reduce((acc, row) => acc + (Number(row.meal_count) || 1), 0),
    [reportData]
  );
  const cancelledMealsCount = useMemo(
    () =>
      reportData
        .filter((d) => d.status === 'Cancelled')
        .reduce((acc, row) => acc + (Number(row.meal_count) || 1), 0),
    [reportData]
  );
  const lunchMealsCount = useMemo(
    () =>
      reportData
        .filter((d) => (d.meal_type || 'Lunch').toLowerCase().includes('lunch') && d.status !== 'Cancelled')
        .reduce((acc, row) => acc + (Number(row.meal_count) || 1), 0),
    [reportData]
  );
  const otherMealsCount = useMemo(
    () =>
      reportData
        .filter((d) => !(d.meal_type || 'Lunch').toLowerCase().includes('lunch') && d.status !== 'Cancelled')
        .reduce((acc, row) => acc + (Number(row.meal_count) || 1), 0),
    [reportData]
  );

  return (
    <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
      <Stack spacing={2.5}>
        {/* Header Row */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>
              Canteen Report
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
              Daily employee canteen meal records, meal types, meal counts, and muster roll matrix
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.25}>
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:refresh-bold" />}
              onClick={fetchReport}
              disabled={loading}
              sx={{
                borderRadius: 1.5,
                fontWeight: 700,
                borderColor: alpha(theme.palette.grey[500], 0.24),
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                },
              }}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Iconify icon="solar:restart-bold" />}
              onClick={handleReset}
              sx={{
                borderRadius: 1.5,
                fontWeight: 700,
                borderColor: alpha(theme.palette.error.main, 0.24),
                '&:hover': {
                  borderColor: 'error.main',
                  bgcolor: alpha(theme.palette.error.main, 0.04),
                },
              }}
            >
              Reset
            </Button>
          </Stack>
        </Stack>

        {/* Filter & Action Card */}
        <Card
          sx={{
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            borderRadius: 2,
            bgcolor: (t) => alpha('#10b981', 0.04),
            border: (t) => `1px solid ${alpha('#10b981', 0.18)}`,
            boxShadow: 'none',
          }}
        >
          {/* Top Action Bar: Quick Presets & Export Buttons */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            gap={1.5}
            flexWrap="wrap"
          >
            {/* Quick Presets */}
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
              {[
                { key: 'today', label: 'Today' },
                { key: 'yesterday', label: 'Yesterday' },
                { key: 'last7', label: 'Last 7 Days' },
                { key: 'thisMonth', label: 'This Month' },
                { key: 'lastMonth', label: 'Last Month' },
              ].map((p) => {
                const active = isPresetActive(p.key);
                return (
                  <Chip
                    key={p.key}
                    label={p.label}
                    size="small"
                    clickable
                    onClick={() => handlePreset(p.key as any)}
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
            {canExport && (
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ ml: { xs: 0, sm: 'auto' } }}>
                <Button
                  variant="contained"
                  startIcon={exportingExcel ? <CircularProgress size={16} color="inherit" /> : <Iconify icon="solar:export-bold" width={18} />}
                  onClick={() => handleOpenExportDialog('excel')}
                  disabled={reportData.length === 0 || exportingExcel}
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
                  onClick={() => handleOpenExportDialog('pdf')}
                  disabled={reportData.length === 0 || exportingPdf}
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
            )}
          </Stack>

          <Divider sx={{ borderStyle: 'dashed', borderColor: (t) => alpha('#10b981', 0.16) }} />

          {/* Filter Inputs Grid */}
          <Box
            sx={{
              pt: 1,
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: {
                xs: 'repeat(1, 1fr)',
                sm: 'repeat(2, 1fr)',
                md: '170px 170px 150px 150px 160px 1fr',
              },
              alignItems: 'center',
            }}
          >
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="From Date"
                format="DD-MM-YYYY"
                value={fromDate}
                onChange={(newValue) => setFromDate(newValue)}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    sx: { bgcolor: 'background.paper', borderRadius: 1.5 },
                  },
                }}
              />
              <DatePicker
                label="To Date"
                format="DD-MM-YYYY"
                value={toDate}
                onChange={(newValue) => setToDate(newValue)}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    sx: { bgcolor: 'background.paper', borderRadius: 1.5 },
                  },
                }}
              />
            </LocalizationProvider>

            <FormControl size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 1.5 } }}>
              <Select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                displayEmpty
              >
                <MenuItem value="all">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>All Meal Types</Typography>
                </MenuItem>
                <MenuItem value="Lunch">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#059669' }}>Lunch</Typography>
                  </Stack>
                </MenuItem>
                <MenuItem value="Dinner">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#6366f1' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#4338ca' }}>Dinner</Typography>
                  </Stack>
                </MenuItem>
                <MenuItem value="Breakfast">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#d97706' }}>Breakfast</Typography>
                  </Stack>
                </MenuItem>
                <MenuItem value="Snacks">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#a855f7' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#7e22ce' }}>Snacks</Typography>
                  </Stack>
                </MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 1.5 } }}>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                displayEmpty
              >
                <MenuItem value="all">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>All Status</Typography>
                </MenuItem>
                <MenuItem value="Availed">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#059669' }}>Availed</Typography>
                  </Stack>
                </MenuItem>
                <MenuItem value="Cancelled">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#dc2626' }}>Cancelled</Typography>
                  </Stack>
                </MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 1.5 } }}>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="date_asc">Date ↓ (Latest)</MenuItem>
                <MenuItem value="date_desc">Date ↑ (Oldest)</MenuItem>
                <MenuItem value="name_asc">Name: A to Z</MenuItem>
                <MenuItem value="name_desc">Name: Z to A</MenuItem>
              </Select>
            </FormControl>

            <Autocomplete
              multiple
              disableCloseOnSelect
              size="small"
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 1.5 } }}
              options={employeeOptions}
              filterOptions={filterEmployeeOptions}
              getOptionLabel={(option) => `${option.employee_name} (${option.name})`}
              isOptionEqualToValue={(option, value) => option.name === value.name}
              value={employeeOptions.filter((opt) => employee.includes(opt.name))}
              onChange={(event, newValue) => {
                setEmployee(newValue.map((opt) => opt.name));
              }}
              disabled={!isHR}
              renderOption={(props, option, { selected: isSelected }) => (
                <li {...props} key={option.name}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {option.employee_name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                      ID: {option.name}
                    </Typography>
                  </Box>
                  {isSelected && (
                    <Iconify icon="solar:check-circle-bold" width={20} sx={{ color: 'primary.main', ml: 1 }} />
                  )}
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Employee"
                  placeholder={employee.length === 0 ? 'Filter employee(s)' : undefined}
                />
              )}
            />
          </Box>
        </Card>

        {/* KPI Summary Cards */}
        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(6, 1fr)',
            },
          }}
        >
          <SummaryCard item={{ label: 'Total Meals', value: totalMealsCount, indicator: 'blue' }} />
          <SummaryCard item={{ label: 'Availed Meals', value: availedMealsCount, indicator: 'green' }} />
          <SummaryCard item={{ label: 'Cancelled Meals', value: cancelledMealsCount, indicator: 'red' }} />
          <SummaryCard item={{ label: 'Lunch Meals', value: lunchMealsCount, indicator: 'emerald' }} />
          <SummaryCard item={{ label: 'Other Meals', value: otherMealsCount, indicator: 'purple' }} />
          <SummaryCard item={{ label: 'Total Employees', value: uniqueEmployees.length, indicator: 'cyan' }} />
        </Box>

        {/* View Switcher Pill */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Box
            sx={{
              display: 'inline-flex',
              bgcolor: alpha(theme.palette.grey[500], 0.06),
              p: 0.5,
              borderRadius: '24px',
              border: `1px solid ${alpha(theme.palette.grey[500], 0.08)}`,
            }}
          >
            {(employee.length !== 1
              ? [
                  { value: 'list', label: 'List View', icon: 'solar:list-bold' },
                  { value: 'muster', label: 'Muster Roll View', icon: 'material-symbols:grid-on' },
                ]
              : [
                  { value: 'list', label: 'List View', icon: 'solar:list-bold' },
                  { value: 'calendar', label: 'Calendar View', icon: 'solar:calendar-bold' },
                  { value: 'muster', label: 'Muster Roll View', icon: 'material-symbols:grid-on' },
                ]
            ).map((tab) => {
              const isActive = currentView === tab.value;
              return (
                <Button
                  key={tab.value}
                  onClick={() => handleViewChange(tab.value as any)}
                  startIcon={<Iconify icon={tab.icon as any} width={16} />}
                  sx={{
                    borderRadius: '20px',
                    px: 3,
                    py: 0.75,
                    fontSize: '0.825rem',
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? '#fff' : theme.palette.text.secondary,
                    bgcolor: isActive ? '#059669' : 'transparent',
                    boxShadow: isActive ? `0 2px 8px ${alpha('#059669', 0.3)}` : 'none',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      bgcolor: isActive ? '#059669' : alpha(theme.palette.grey[500], 0.08),
                    },
                  }}
                >
                  {tab.label}
                </Button>
              );
            })}
          </Box>
        </Box>

        {/* Main Content Area */}
        {preparing ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
            <CircularProgress sx={{ color: '#059669' }} />
          </Box>
        ) : (
          <>
            {/* 1. LIST VIEW */}
            {currentView === 'list' && (
              <Card>
                <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
                  <Scrollbar>
                    <Table size="medium" stickyHeader sx={{ borderCollapse: 'collapse' }}>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f4f6f8' }}>
                          <TableCell padding="checkbox">
                            <Checkbox
                              indeterminate={selected.length > 0 && selected.length < reportData.length}
                              checked={reportData.length > 0 && selected.length === reportData.length}
                              onChange={handleSelectAllClick}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Employee</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Employee ID</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Department</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Meal Type</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Count</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Source</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Remarks</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }} />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={11} align="center" sx={{ py: 10 }}>
                              <CircularProgress sx={{ color: '#059669' }} />
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {reportData
                              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                              .map((row) => {
                                const isSelected = selected.indexOf(row.name) !== -1;
                                const mealBadge = getMealBadgeColors(row.meal_type);
                                return (
                                  <TableRow
                                    key={row.name}
                                    hover
                                    selected={isSelected}
                                    sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                                  >
                                    <TableCell padding="checkbox">
                                      <Checkbox
                                        checked={isSelected}
                                        onClick={() => handleClick(row.name)}
                                      />
                                    </TableCell>
                                    <TableCell>{fDate(row.canteen_date, 'DD-MM-YYYY')}</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>{row.employee_name}</TableCell>
                                    <TableCell>{row.employee}</TableCell>
                                    <TableCell>{row.department || '-'}</TableCell>
                                    <TableCell>
                                      <Box
                                        sx={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 0.5,
                                          px: 1.25,
                                          py: 0.4,
                                          borderRadius: '6px',
                                          bgcolor: mealBadge.bg,
                                          color: mealBadge.color,
                                          fontWeight: 700,
                                          fontSize: '0.75rem',
                                        }}
                                      >
                                        <Iconify icon={"solar:cup-hot-bold" as any} width={14} />
                                        <span>{row.meal_type || 'Lunch'}</span>
                                      </Box>
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>
                                      {row.meal_count || 1}
                                    </TableCell>
                                    <TableCell>
                                      <Label
                                        variant="soft"
                                        color={row.status === 'Cancelled' ? 'error' : 'success'}
                                      >
                                        {row.status || 'Availed'}
                                      </Label>
                                    </TableCell>
                                    <TableCell>
                                      <Label variant="soft" color="default">
                                        {row.source || 'Manual'}
                                      </Label>
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {row.remarks || '-'}
                                    </TableCell>
                                    <TableCell align="right">
                                      <IconButton
                                        onClick={() => handleViewDetails(row.name, row)}
                                        sx={{ color: 'info.main' }}
                                      >
                                        <Iconify icon="solar:eye-bold" />
                                      </IconButton>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            {reportData.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={11} align="center" sx={{ py: 10 }}>
                                  <Stack spacing={1} alignItems="center">
                                    <Iconify icon="solar:filter-bold-duotone" width={48} sx={{ color: 'text.disabled' }} />
                                    <Typography variant="body2" sx={{ color: 'text.disabled', fontWeight: 'bold' }}>
                                      No canteen records found
                                    </Typography>
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </Scrollbar>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={reportData.length}
                  page={page}
                  onPageChange={onChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={onChangeRowsPerPage}
                  rowsPerPageOptions={[10, 25, 50]}
                />
              </Card>
            )}

            {/* 2. CALENDAR VIEW */}
            {currentView === 'calendar' && employee.length === 1 && (
              <CanteenCalendar
                reportData={reportData}
                employee={employee[0]}
                fromDate={fromDate}
                toDate={toDate}
                onEventClick={(id, rawData) => handleViewDetails(id, rawData)}
              />
            )}

            {/* 3. MUSTER ROLL VIEW */}
            {currentView === 'muster' && (
              <Card sx={{ p: 2.5 }}>
                {/* Legend */}
                <Stack direction="row" spacing={2} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
                  {[
                    { label: 'Lunch Availed', color: 'rgba(16, 185, 129, 0.14)', textColor: '#047857', badge: 'L' },
                    { label: 'Dinner Availed', color: 'rgba(99, 102, 241, 0.14)', textColor: '#4338ca', badge: 'D' },
                    { label: 'Breakfast Availed', color: 'rgba(245, 158, 11, 0.14)', textColor: '#b45309', badge: 'B' },
                    { label: 'Snacks Availed', color: 'rgba(168, 85, 247, 0.14)', textColor: '#7e22ce', badge: 'S' },
                    { label: 'Holiday', color: 'rgba(244, 63, 94, 0.14)', textColor: '#9f1239', badge: 'H' },
                    { label: 'Weekend', color: 'rgba(100, 116, 139, 0.14)', textColor: '#334155', badge: 'WO' },
                  ].map((item) => (
                    <Stack key={item.label} direction="row" alignItems="center" spacing={1}>
                      <Box
                        sx={{
                          width: 28,
                          height: 22,
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: item.color,
                          color: item.textColor,
                          fontWeight: 800,
                          fontSize: '0.7rem',
                        }}
                      >
                        {item.badge}
                      </Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.8rem' }}>
                        {item.label}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>

                {/* Muster Roll Table */}
                <TableContainer
                  ref={musterScrollRef}
                  onMouseDown={handleMusterMouseDown}
                  onMouseLeave={handleMusterMouseLeave}
                  onMouseUp={handleMusterMouseUp}
                  onMouseMove={handleMusterMouseMove}
                  sx={{
                    position: 'relative',
                    overflowX: 'auto',
                    borderRadius: '12px',
                    border: (t) => `1px solid ${t.palette.divider}`,
                    bgcolor: 'background.paper',
                    cursor: 'grab',
                    userSelect: 'none',
                    '&::-webkit-scrollbar': { height: 8 },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'rgba(145,158,171,0.30)',
                      borderRadius: 999,
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      backgroundColor: 'rgba(145,158,171,0.50)',
                    },
                  }}
                >
                  <Table size="medium" sx={{ borderCollapse: 'collapse', minWidth: 900 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f4f6f8' }}>
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 0,
                            bgcolor: '#f4f6f8',
                            zIndex: 12,
                            minWidth: 220,
                            fontWeight: 700,
                            borderRight: (t) => `1px solid ${t.palette.divider}`,
                          }}
                        >
                          Employee
                        </TableCell>
                        {dates.map((date) => {
                          const isSunday = date.day() === 0;
                          return (
                            <TableCell
                              key={date.format('YYYY-MM-DD')}
                              align="center"
                              sx={{
                                minWidth: 100,
                                p: 1.5,
                                borderRight: (t) => `1px solid ${t.palette.divider}`,
                                bgcolor: isSunday ? alpha('#64748b', 0.06) : 'inherit',
                              }}
                            >
                              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                                {date.format('MMM')}
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: isSunday ? 700 : 400, display: 'block', color: isSunday ? '#dc2626' : 'text.secondary', fontSize: '0.75rem', mt: 0.2 }}>
                                {date.format('ddd')}
                              </Typography>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 0.2, fontSize: 15 }}>
                                {date.format('DD')}
                              </Typography>
                            </TableCell>
                          );
                        })}
                        <TableCell
                          align="center"
                          sx={{
                            minWidth: 120,
                            fontWeight: 800,
                            bgcolor: '#f4f6f8',
                            color: '#059669',
                            borderLeft: (t) => `1px solid ${t.palette.divider}`,
                          }}
                        >
                          Total Meals
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={dates.length + 2} sx={{ py: 10, position: 'relative', border: 0 }}>
                            <Box
                              sx={{
                                position: 'sticky',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                width: 'max-content',
                                maxWidth: '100%',
                              }}
                            >
                              <CircularProgress sx={{ color: '#059669' }} />
                            </Box>
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {paginatedEmployees.map((emp, empIndex) => (
                            <TableRow key={emp.id} hover sx={{ '& td': { py: 1.2 } }}>
                              <TableCell
                                sx={{
                                  position: 'sticky',
                                  left: 0,
                                  bgcolor: 'background.paper',
                                  zIndex: 10,
                                  borderRight: (t) => `1px solid ${t.palette.divider}`,
                                  borderBottom: (t) => `1px solid ${t.palette.divider}`,
                                  boxShadow: '4px 0 8px -4px rgba(0,0,0,0.12)',
                                }}
                              >
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                  {emp.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                  {emp.id} {emp.department ? `• ${emp.department}` : ''}
                                </Typography>
                              </TableCell>
                              {dates.map((date) => {
                                const isHoliday = isDateHoliday(date);
                                if (isHoliday) {
                                  if (empIndex === 0) {
                                    return (
                                      <TableCell
                                        key={date.format('YYYY-MM-DD')}
                                        rowSpan={paginatedEmployees.length}
                                        align="center"
                                        sx={{
                                          minWidth: 100,
                                          borderRight: (t) => `1px solid ${t.palette.divider}`,
                                          borderBottom: (t) => `1px solid ${t.palette.divider}`,
                                          bgcolor: 'rgba(244, 63, 94, 0.08)',
                                          p: 0,
                                          verticalAlign: 'middle',
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: '100%',
                                            minHeight: 80,
                                            textTransform: 'uppercase',
                                            letterSpacing: 1.5,
                                            fontSize: '0.8rem',
                                            fontWeight: 800,
                                            color: '#9f1239',
                                          }}
                                        >
                                          {getHolidayName(date)}
                                        </Box>
                                      </TableCell>
                                    );
                                  }
                                  return null;
                                }

                                const entries = getCanteenEntriesForDate(emp.id, date);
                                const isSunday = date.day() === 0;
                                const hasEntries = entries.length > 0;
                                const totalCount = entries.reduce(
                                  (acc, e) => (e.status !== 'Cancelled' ? acc + (Number(e.meal_count) || 1) : acc),
                                  0
                                );

                                return (
                                  <TableCell
                                    key={date.format('YYYY-MM-DD')}
                                    align="center"
                                    sx={{
                                      minWidth: 100,
                                      borderRight: (t) => `1px solid ${t.palette.divider}`,
                                      borderBottom: (t) => `1px solid ${t.palette.divider}`,
                                      bgcolor: isSunday ? alpha('#64748b', 0.03) : 'inherit',
                                    }}
                                  >
                                    {hasEntries ? (
                                      <Tooltip
                                        title={entries
                                          .map((e) => `${e.meal_type || 'Lunch'} (Count: ${e.meal_count || 1}) - ${e.status || 'Availed'}`)
                                          .join(' | ')}
                                        arrow
                                      >
                                        <Box
                                          onClick={() => handleMusterCellClick(entries[0])}
                                          sx={{
                                            px: 1.2,
                                            py: 0.5,
                                            minWidth: 54,
                                            borderRadius: '8px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 0.5,
                                            fontSize: '0.75rem',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                            bgcolor: 'rgba(16, 185, 129, 0.14)',
                                            color: '#047857',
                                            border: '1px solid rgba(16, 185, 129, 0.28)',
                                            '&:hover': {
                                              transform: 'scale(1.08)',
                                              bgcolor: 'rgba(16, 185, 129, 0.22)',
                                            },
                                          }}
                                        >
                                          <Iconify icon={"solar:cup-hot-bold" as any} width={14} />
                                          <span>x{totalCount}</span>
                                        </Box>
                                      </Tooltip>
                                    ) : (
                                      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                                        -
                                      </Typography>
                                    )}
                                  </TableCell>
                                );
                              })}
                              {/* Total Meals per Employee */}
                              <TableCell
                                align="center"
                                sx={{
                                  borderLeft: (t) => `1px solid ${t.palette.divider}`,
                                  borderBottom: (t) => `1px solid ${t.palette.divider}`,
                                  bgcolor: alpha('#10b981', 0.04),
                                }}
                              >
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#059669' }}>
                                  {employeeMealTotals[emp.id] || 0}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}

                          {/* Footer Daily Totals Row */}
                          {paginatedEmployees.length > 0 && (
                            <TableRow sx={{ bgcolor: alpha('#10b981', 0.08) }}>
                              <TableCell
                                sx={{
                                  position: 'sticky',
                                  left: 0,
                                  bgcolor: '#e6f4ea',
                                  zIndex: 11,
                                  borderRight: (t) => `1px solid ${t.palette.divider}`,
                                  fontWeight: 800,
                                  color: '#047857',
                                }}
                              >
                                Daily Totals
                              </TableCell>
                              {dates.map((date) => {
                                const dStr = date.format('YYYY-MM-DD');
                                const dTotal = dailyTotals[dStr] || 0;
                                return (
                                  <TableCell
                                    key={dStr}
                                    align="center"
                                    sx={{
                                      borderRight: (t) => `1px solid ${t.palette.divider}`,
                                      fontWeight: 800,
                                      color: dTotal > 0 ? '#047857' : 'text.disabled',
                                      fontSize: '0.8rem',
                                    }}
                                  >
                                    {dTotal > 0 ? dTotal : '-'}
                                  </TableCell>
                                );
                              })}
                              <TableCell
                                align="center"
                                sx={{
                                  borderLeft: (t) => `1px solid ${t.palette.divider}`,
                                  fontWeight: 900,
                                  color: '#047857',
                                  fontSize: '0.9rem',
                                }}
                              >
                                {grandTotalMeals}
                              </TableCell>
                            </TableRow>
                          )}

                          {paginatedEmployees.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={dates.length + 2} sx={{ py: 10, position: 'relative', border: 0 }}>
                                <Box
                                  sx={{
                                    position: 'sticky',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    width: 'max-content',
                                    maxWidth: '100%',
                                  }}
                                >
                                  <Stack spacing={1} alignItems="center">
                                    <Iconify icon="solar:filter-bold-duotone" width={48} sx={{ color: 'text.disabled' }} />
                                    <Typography variant="body2" sx={{ color: 'text.disabled', fontWeight: 'bold' }}>
                                      No canteen records found
                                    </Typography>
                                  </Stack>
                                </Box>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={uniqueEmployees.length}
                  page={musterPage}
                  onPageChange={(e, newPage) => setMusterPage(newPage)}
                  rowsPerPage={musterRowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setMusterRowsPerPage(parseInt(e.target.value, 10));
                    setMusterPage(0);
                  }}
                  rowsPerPageOptions={[10, 25, 50, 100]}
                />
              </Card>
            )}
          </>
        )}

        {/* Export Dialog */}
        <Dialog
          open={openExportDialog}
          onClose={() => setOpenExportDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ m: 0, p: 3, fontWeight: 700, fontSize: '1.25rem' }}>
            Export Report
            <IconButton
              aria-label="close"
              onClick={() => setOpenExportDialog(false)}
              sx={{
                position: 'absolute',
                right: 12,
                top: 12,
                color: (t) => t.palette.grey[500],
              }}
            >
              <Iconify icon={"mingcute:close-line" as any} />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ py: 1.5 }}>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              {selectedExportView === 'muster'
                ? 'Please choose which data view you would like to export (Muster Roll is only available in Excel format):'
                : `Please choose which data view you would like to export to ${exportType === 'excel' ? 'Excel' : 'PDF'}:`
              }
            </Typography>
            <RadioGroup
              value={selectedExportView}
              onChange={(e) => setSelectedExportView(e.target.value as 'list' | 'muster')}
            >
              <FormControlLabel
                value="list"
                control={<Radio color="primary" />}
                label={
                  <Box sx={{ ml: 0.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      <Iconify icon={"solar:list-bold" as any} width={18} sx={{ color: 'text.secondary' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>List View</Typography>
                    </Stack>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      Exports detailed canteen meal logs, including employee names, meal types, meal counts, statuses, and remarks.
                    </Typography>
                  </Box>
                }
                sx={{
                  pt: 2,
                  mt: 1,
                  borderTop: (t) => `1px solid ${t.palette.divider}`,
                  mb: 2,
                  alignItems: 'flex-start',
                }}
              />
              {exportType !== 'pdf' && (
                <FormControlLabel
                  value="muster"
                  control={<Radio color="primary" />}
                  label={
                    <Box sx={{ ml: 0.5 }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                        <Iconify icon={"material-symbols:grid-on" as any} width={18} sx={{ color: 'text.secondary' }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Muster Roll View</Typography>
                      </Stack>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        Exports grid-based color-coded canteen meal grid with meal counts, availed markers, and merged holidays for the selected dates (Excel format only).
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start' }}
                />
              )}
            </RadioGroup>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'flex-end', gap: 1.5 }}>
            {selectedExportView === 'list' ? (
              <>
                <Button
                  variant="contained"
                  onClick={() => {
                    setOpenExportDialog(false);
                    handleExport('list');
                  }}
                  sx={{
                    bgcolor: COMMON_COLORS.primaryButton.bg,
                    color: COMMON_COLORS.primaryButton.color,
                    '&:hover': { bgcolor: COMMON_COLORS.primaryButton.hoverBg },
                  }}
                >
                  Export Excel
                </Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    setOpenExportDialog(false);
                    handleExportPdf('list');
                  }}
                  sx={{
                    bgcolor: '#f43f5e',
                    color: 'common.white',
                    '&:hover': { bgcolor: '#e11d48' },
                  }}
                >
                  Export PDF
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                onClick={() => {
                  setOpenExportDialog(false);
                  handleExport('muster');
                }}
                sx={{
                  bgcolor: COMMON_COLORS.primaryButton.bg,
                  color: COMMON_COLORS.primaryButton.color,
                  '&:hover': { bgcolor: COMMON_COLORS.primaryButton.hoverBg },
                }}
              >
                Export Excel
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Entry Details Dialog */}
        <CanteenDetailsDialog
          open={openDetails}
          onClose={() => setOpenDetails(false)}
          entryId={selectedEntryId}
          initialData={selectedEntryData}
        />
      </Stack>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function SummaryCard({
  item,
}: {
  item: { label: string; value: number; indicator: 'blue' | 'green' | 'red' | 'orange' | 'emerald' | 'purple' | 'cyan' };
}) {
  const getIndicatorColor = () => {
    switch (item.indicator) {
      case 'green':
      case 'emerald':
        return '#10b981';
      case 'red':
        return '#ef4444';
      case 'orange':
        return '#f59e0b';
      case 'purple':
        return '#8b5cf6';
      case 'cyan':
        return '#06b6d4';
      case 'blue':
      default:
        return '#0ea5e9';
    }
  };

  return (
    <Card
      sx={{
        p: 2.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 2,
        boxShadow: (t) => t.customShadows?.card || '0 0 2px 0 rgba(145, 158, 171, 0.2), 0 12px 24px -4px rgba(145, 158, 171, 0.12)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          bgcolor: getIndicatorColor(),
        },
      }}
    >
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>
          {item.label}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'text.primary' }}>
          {item.value}
        </Typography>
      </Box>
    </Card>
  );
}
