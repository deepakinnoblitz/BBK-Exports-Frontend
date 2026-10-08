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
import { frappeRequest } from 'src/utils/csrf';
import { filterEmployeeOptions } from 'src/utils/filter-employees';

import { runReport } from 'src/api/reports';
import { getDoctypeList } from 'src/api/leads';
import { COMMON_COLORS } from 'src/theme/common-colors';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { useAuth } from 'src/auth/auth-context';

import { LineCalendar } from './line-calendar';
import { LineDetailsDialog } from '../line-details-dialog';

// ----------------------------------------------------------------------

const LINE_COLOR_MAP: Record<string, { bg: string; color: string; dot: string }> = {
  cutting: { bg: 'rgba(5, 150, 105, 0.12)', color: '#047857', dot: '#10b981' },
  stitching: { bg: 'rgba(99, 102, 241, 0.12)', color: '#4338ca', dot: '#6366f1' },
  striching: { bg: 'rgba(99, 102, 241, 0.12)', color: '#4338ca', dot: '#6366f1' },
  assembly: { bg: 'rgba(217, 119, 6, 0.12)', color: '#b45309', dot: '#f59e0b' },
  packing: { bg: 'rgba(14, 165, 233, 0.12)', color: '#0369a1', dot: '#0ea5e9' },
  ironing: { bg: 'rgba(236, 72, 153, 0.12)', color: '#be185d', dot: '#ec4899' },
  finishing: { bg: 'rgba(139, 92, 246, 0.12)', color: '#6d28d9', dot: '#8b5cf6' },
};

function getLineColors(lineName: string) {
  const name = (lineName || '').toLowerCase();
  for (const [key, val] of Object.entries(LINE_COLOR_MAP)) {
    if (name.includes(key)) return val;
  }
  return { bg: 'rgba(100, 116, 139, 0.12)', color: '#334155', dot: '#64748b' };
}

// ----------------------------------------------------------------------

export function LineReportView() {
  const theme = useTheme();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const actionPerms =
    user?.permissions?.actions?.my_line_report ||
    user?.permissions?.actions?.line_report ||
    user?.permissions?.actions?.line_roster;
  const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned && !!actionPerms;
  const canExport = hasCustomPerms ? !!actionPerms?.export : true;

  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [isHR, setIsHR] = useState(false);

  // Filters
  const [fromDate, setFromDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [toDate, setToDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [employee, setEmployee] = useState<string[]>([]);
  const [lineFilter, setLineFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_asc');
  const [currentView, setCurrentView] = useState<'list' | 'calendar' | 'muster'>('list');
  const [musterPage, setMusterPage] = useState(0);
  const [musterRowsPerPage, setMusterRowsPerPage] = useState(50);
  const [openExportDialog, setOpenExportDialog] = useState(false);
  const [exportType, setExportType] = useState<'excel' | 'pdf'>('excel');
  const [selectedExportView, setSelectedExportView] = useState<'list' | 'muster'>('list');
  const [preparing, setPreparing] = useState(false);

  // Options
  const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
  const [lineOptions, setLineOptions] = useState<any[]>([]);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Selection
  const [selected, setSelected] = useState<string[]>([]);

  // Details Dialog
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedLineData, setSelectedLineData] = useState<any | null>(null);

  // Muster Roll drag-scroll
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

  const handleMusterCellClick = (record: any) => {
    if (musterDragMoved.current > 15) return;
    if (record) {
      setSelectedLineData(record);
      setOpenDetails(true);
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

  // Load Employee & Line Masters
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [empRes, lineRes] = await Promise.all([
          getDoctypeList('Employee', ['name', 'employee_name', 'department', 'designation']),
          getDoctypeList('Line Order', ['name', 'line_name', 'status']),
        ]);
        setEmployeeOptions(empRes || []);
        setLineOptions(lineRes || []);
      } catch (err) {
        console.error('Failed to load line report masters:', err);
      }
    };
    loadMasters();
  }, []);

  // Fetch Report Data
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
      const filters: any = {
        from_date: fromDate.format('YYYY-MM-DD'),
        to_date: toDate.format('YYYY-MM-DD'),
      };
      if (employee.length > 0) filters.employee = employee;
      if (lineFilter !== 'all') filters.line = lineFilter;

      let result: any = null;
      try {
        const queryParams = new URLSearchParams({
          from_date: filters.from_date,
          to_date: filters.to_date,
        });
        if (filters.employee) queryParams.set('employee', JSON.stringify(filters.employee));
        if (filters.line) queryParams.set('line', filters.line);

        const res = await frappeRequest(
          `/api/method/company.company.line_roster_api.get_line_report?${queryParams.toString()}`,
          { method: 'GET' }
        );
        if (res.ok) {
          const json = await res.json();
          result = json.message;
        }
      } catch {
        // Fallback to standard report runner
      }

      if (!result) {
        result = await runReport('Line Report', filters);
      }

      let finalData = result?.result || [];

      // Sorting
      finalData = [...finalData].sort((a, b) => {
        const dateA = a.line_date || '';
        const dateB = b.line_date || '';
        const nameA = (a.employee_name || '').toLowerCase();
        const nameB = (b.employee_name || '').toLowerCase();
        const lineA = (a.line_name || '').toLowerCase();
        const lineB = (b.line_name || '').toLowerCase();

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
          case 'line_asc':
            return lineA.localeCompare(lineB);
          default:
            return 0;
        }
      });

      setReportData(finalData);
      setPage(0);
    } catch (error: any) {
      console.error('Failed to fetch Line Report:', error);
      enqueueSnackbar(error.message || 'Failed to load Line Report', { variant: 'error' });
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, employee, lineFilter, sortBy, enqueueSnackbar]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Presets
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
    setFromDate(dayjs());
    setToDate(dayjs());
    if (isHR) {
      setEmployee([]);
    }
    setLineFilter('all');
    setSortBy('date_asc');
    setSelected([]);
  };

  // Selection
  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(reportData.map((n) => n.name));
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
      ? reportData.reduce((min, p) => (p.line_date < min ? p.line_date : min), reportData[0].line_date)
      : dayjs().startOf('month').format('YYYY-MM-DD');

    const endStr = toDate
      ? toDate.format('YYYY-MM-DD')
      : reportData.length > 0
      ? reportData.reduce((max, p) => (p.line_date > max ? p.line_date : max), reportData[0].line_date)
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

  const lineMap = useMemo(() => {
    const map = new Map<string, any>();
    reportData.forEach((row) => {
      if (row.employee && row.line_date) {
        const dStr = dayjs(row.line_date).format('YYYY-MM-DD');
        map.set(`${row.employee}_${dStr}`, row);
      }
    });
    return map;
  }, [reportData]);

  const handleOpenExportDialog = (type: 'excel' | 'pdf') => {
    setExportType(type);
    setSelectedExportView('list');
    setOpenExportDialog(true);
  };

  // Export to Excel
  const handleExportExcel = async (viewType: 'list' | 'muster') => {
    setExportingExcel(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(viewType === 'list' ? 'Line Details' : 'Muster Roll');

      if (viewType === 'list') {
        worksheet.columns = [
          { header: 'Date', key: 'line_date', width: 14 },
          { header: 'Employee ID', key: 'employee', width: 14 },
          { header: 'Employee Name', key: 'employee_name', width: 22 },
          { header: 'Department', key: 'department', width: 18 },
          { header: 'Designation', key: 'designation', width: 18 },
          { header: 'Line Order', key: 'line_order', width: 16 },
          { header: 'Line Name', key: 'line_name', width: 22 },
          { header: 'Assignment Type', key: 'assignment_type', width: 16 },
          { header: 'Source', key: 'source', width: 14 },
          { header: 'Status', key: 'status', width: 14 },
          { header: 'Reason / Remarks', key: 'reason', width: 24 },
        ];

        // Header style
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF059669' },
        };

        reportData.forEach((row) => {
          worksheet.addRow({
            line_date: row.line_date ? dayjs(row.line_date).format('DD-MM-YYYY') : '',
            employee: row.employee,
            employee_name: row.employee_name,
            department: row.department || '',
            designation: row.designation || '',
            line_order: row.line_order || '',
            line_name: row.line_name || '',
            assignment_type: row.assignment_type || '',
            source: row.source || '',
            status: row.status || '',
            reason: row.reason || '',
          });
        });
      } else {
        // Muster Roll Matrix
        const columns: any[] = [
          { header: 'Employee ID', key: 'employee', width: 14 },
          { header: 'Employee Name', key: 'employee_name', width: 22 },
          { header: 'Department', key: 'department', width: 18 },
        ];

        dates.forEach((d) => {
          columns.push({
            header: d.format('DD/MM (ddd)'),
            key: d.format('YYYY-MM-DD'),
            width: 15,
          });
        });

        worksheet.columns = columns;

        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF059669' },
        };

        uniqueEmployees.forEach((emp) => {
          const rowData: any = {
            employee: emp.id,
            employee_name: emp.name,
            department: emp.department || '',
          };

          dates.forEach((d) => {
            const dateStr = d.format('YYYY-MM-DD');
            const rec = lineMap.get(`${emp.id}_${dateStr}`);
            rowData[dateStr] = rec ? rec.line_name || rec.line_order || rec.status : '---';
          });

          worksheet.addRow(rowData);
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      saveAs(blob, `Line_Report_${viewType}_${dayjs().format('YYYY-MM-DD')}.xlsx`);
      enqueueSnackbar('Excel report downloaded successfully!', { variant: 'success' });
    } catch (err: any) {
      console.error('Excel Export Error:', err);
      enqueueSnackbar(err.message || 'Failed to export Excel', { variant: 'error' });
    } finally {
      setExportingExcel(false);
      setOpenExportDialog(false);
    }
  };

  // Export to PDF
  const handleExportPdf = (viewType: 'list' | 'muster') => {
    setExportingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      doc.setFontSize(14);
      doc.setTextColor(5, 150, 105);
      doc.text('Line Assignment Report', 14, 15);
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Generated on: ${dayjs().format('DD MMM YYYY, HH:mm')} | Range: ${
          fromDate ? fromDate.format('DD-MM-YYYY') : 'Start'
        } to ${toDate ? toDate.format('DD-MM-YYYY') : 'End'}`,
        14,
        22
      );

      if (viewType === 'list') {
        const head = [
          [
            'Date',
            'Employee',
            'Employee ID',
            'Department',
            'Line Name',
            'Assignment Type',
            'Source',
            'Status',
          ],
        ];

        const body = reportData.map((row) => [
          row.line_date ? dayjs(row.line_date).format('DD-MM-YYYY') : '',
          row.employee_name || '',
          row.employee || '',
          row.department || '',
          row.line_name || row.line_order || '',
          row.assignment_type || '',
          row.source || '',
          row.status || '',
        ]);

        autoTable(doc, {
          startY: 26,
          head,
          body,
          theme: 'grid',
          headStyles: {
            fillColor: [5, 150, 105],
            textColor: 255,
            fontSize: 8,
            fontStyle: 'bold',
          },
          bodyStyles: {
            fontSize: 7.5,
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
        });
      } else {
        // Muster Roll PDF
        const maxCols = 15;
        const displayDates = dates.slice(0, maxCols);

        const head = [
          ['Employee', 'ID', ...displayDates.map((d) => d.format('DD/MM'))],
        ];

        const body = uniqueEmployees.slice(0, 40).map((emp) => {
          const row = [emp.name, emp.id];
          displayDates.forEach((d) => {
            const dateStr = d.format('YYYY-MM-DD');
            const rec = lineMap.get(`${emp.id}_${dateStr}`);
            row.push(rec ? rec.line_name || rec.line_order || rec.status : '-');
          });
          return row;
        });

        autoTable(doc, {
          startY: 26,
          head,
          body,
          theme: 'grid',
          headStyles: {
            fillColor: [5, 150, 105],
            textColor: 255,
            fontSize: 7,
            fontStyle: 'bold',
          },
          bodyStyles: {
            fontSize: 6.5,
            halign: 'center',
          },
        });
      }

      doc.save(`Line_Report_${dayjs().format('YYYY-MM-DD')}.pdf`);
      enqueueSnackbar('PDF report exported successfully!', { variant: 'success' });
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      enqueueSnackbar(err.message || 'Failed to export PDF', { variant: 'error' });
    } finally {
      setExportingPdf(false);
      setOpenExportDialog(false);
    }
  };

  // Stat summary items
  const summaryCounts = useMemo(() => {
    const total = reportData.length;
    const active = reportData.filter((r) => r.status === 'Active').length;
    const off = reportData.filter((r) => r.status === 'Weekly Off').length;
    const holiday = reportData.filter((r) => r.status === 'Holiday').length;
    const rotations = reportData.filter((r) => r.source === 'ROTATION').length;
    const overrides = reportData.filter((r) => r.source === 'ROSTER').length;

    return { total, active, off, holiday, rotations, overrides };
  }, [reportData]);

  return (
    <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
      <Stack spacing={3}>
        {/* Header Title & Actions */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
        >
          <div>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Line Report
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Workforce line assignments, active rotation schedules, and monthly muster roll logs.
            </Typography>
          </div>

          <Stack direction="row" spacing={1.25}>
            <Button
              variant="outlined"
              startIcon={<Iconify icon={"solar:refresh-bold" as any} />}
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
              startIcon={<Iconify icon={"solar:restart-bold" as any} />}
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

        {/* Filter Card */}
        <Card
          sx={{
            p: 2.5,
            bgcolor: (t) => alpha('#10b981', 0.04),
            border: (t) => `1px solid ${alpha('#10b981', 0.2)}`,
            borderRadius: 2,
            boxShadow: 'none',
          }}
        >
          <Stack spacing={2}>
            {/* Quick Ranges & Exports Row */}
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
                        bgcolor: active ? 'primary.main' : 'background.paper',
                        color: active ? '#fff' : 'text.primary',
                        border: (t) => `1px solid ${active ? t.palette.primary.main : t.palette.divider}`,
                        boxShadow: active ? (t) => `0 2px 8px ${alpha(t.palette.primary.main, 0.28)}` : 'none',
                        '&:hover': {
                          bgcolor: active ? 'primary.dark' : 'action.hover',
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
                    startIcon={
                      exportingExcel ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <Iconify icon={"solar:export-bold" as any} width={18} />
                      )
                    }
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
                    startIcon={
                      exportingPdf ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <Iconify icon={"solar:file-download-bold" as any} width={18} />
                      )
                    }
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
                  md: '170px 170px 160px 180px 1fr',
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
                  sx={{
                    bgcolor: 'background.paper',
                    borderRadius: 1.5,
                    '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 1.5 },
                    '& .MuiInputBase-root': { bgcolor: 'background.paper', borderRadius: 1.5 },
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
                <DatePicker
                  label="To Date"
                  format="DD-MM-YYYY"
                  value={toDate}
                  onChange={(newValue) => setToDate(newValue)}
                  sx={{
                    bgcolor: 'background.paper',
                    borderRadius: 1.5,
                    '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 1.5 },
                    '& .MuiInputBase-root': { bgcolor: 'background.paper', borderRadius: 1.5 },
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
              </LocalizationProvider>

              {/* Line Filter */}
              <FormControl
                size="small"
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 1.5 } }}
              >
                <Select
                  value={lineFilter}
                  onChange={(e) => setLineFilter(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="all">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        All Lines
                      </Typography>
                    </Stack>
                  </MenuItem>
                  {lineOptions.map((l) => {
                    const colors = getLineColors(l.line_name || l.name);
                    return (
                      <MenuItem key={l.name} value={l.name}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colors.dot }} />
                          <Typography variant="body2" sx={{ fontWeight: 600, color: colors.color }}>
                            {l.line_name || l.name}
                          </Typography>
                        </Stack>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              {/* Sort By Filter */}
              <FormControl
                size="small"
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 1.5 } }}
              >
                <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <MenuItem value="date_asc">Date ↓ (Latest)</MenuItem>
                  <MenuItem value="date_desc">Date ↑ (Oldest)</MenuItem>
                  <MenuItem value="name_asc">Name: A to Z</MenuItem>
                  <MenuItem value="name_desc">Name: Z to A</MenuItem>
                  <MenuItem value="line_asc">Line Name: A to Z</MenuItem>
                </Select>
              </FormControl>

              {/* Employee Autocomplete */}
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
                onChange={(_, newValue) => {
                  setEmployee(newValue.map((opt) => opt.name));
                }}
                disabled={!isHR}
                renderOption={(props, option, { selected: isSelected }) => (
                  <li {...props} key={option.name}>
                    <Checkbox
                      checked={isSelected}
                      sx={{
                        mr: 1,
                        '&.Mui-checked': { color: COMMON_COLORS.emerald.main },
                      }}
                    />
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
          </Stack>
        </Card>

        {/* KPI Summary Cards */}
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(6, 1fr)',
            },
          }}
        >
          <SummaryCard item={{ label: 'Total Entries', value: summaryCounts.total, indicator: 'blue' }} />
          <SummaryCard item={{ label: 'Active Assigned', value: summaryCounts.active, indicator: 'green' }} />
          <SummaryCard item={{ label: 'From Rotations', value: summaryCounts.rotations, indicator: 'orange' }} />
          <SummaryCard item={{ label: 'Roster Overrides', value: summaryCounts.overrides, indicator: 'blue' }} />
          <SummaryCard item={{ label: 'Weekly Offs', value: summaryCounts.off, indicator: 'red' }} />
          <SummaryCard item={{ label: 'Holidays', value: summaryCounts.holiday, indicator: 'blue' }} />
        </Box>

        {/* View Mode Toggle Pill */}
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

        {preparing ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
            <CircularProgress sx={{ color: '#059669' }} />
          </Box>
        ) : (
          <>
            {/* List View */}
            {currentView === 'list' && (
              <Card sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 2 }}>
                <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
                  <Scrollbar>
                    <Table size="medium" stickyHeader sx={{ borderCollapse: 'collapse', minWidth: 900 }}>
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
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Line</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Assignment Type</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Source</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Status</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', pr: 3 }}>
                            Actions
                          </TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                              <CircularProgress sx={{ color: COMMON_COLORS.emerald.main }} />
                            </TableCell>
                          </TableRow>
                        ) : reportData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                              <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
                                No line records found for the selected criteria.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          reportData
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((row) => {
                              const isSelected = selected.includes(row.name);
                              const lineColors = getLineColors(row.line_name || row.line_order);

                              return (
                                <TableRow
                                  key={row.name}
                                  hover
                                  selected={isSelected}
                                  sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                                >
                                  <TableCell padding="checkbox">
                                    <Checkbox checked={isSelected} onClick={() => handleClick(row.name)} />
                                  </TableCell>

                                  <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                                    {row.line_date ? dayjs(row.line_date).format('DD-MM-YYYY') : '---'}
                                    <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled' }}>
                                      {row.line_date ? dayjs(row.line_date).format('ddd') : ''}
                                    </Typography>
                                  </TableCell>

                                  <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>
                                    {row.employee_name || row.employee}
                                  </TableCell>

                                  <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontWeight: 600 }}>
                                    {row.employee}
                                  </TableCell>

                                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                    {row.department || '---'}
                                  </TableCell>

                                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                    <Chip
                                      size="small"
                                      label={row.line_name || row.line_order || 'Unassigned'}
                                      sx={{
                                        fontWeight: 700,
                                        bgcolor: lineColors.bg,
                                        color: lineColors.color,
                                        border: `1px solid ${alpha(lineColors.color, 0.2)}`,
                                      }}
                                    />
                                  </TableCell>

                                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {row.assignment_type || 'Default'}
                                    </Typography>
                                  </TableCell>

                                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                    <Label
                                      color={
                                        row.source === 'ROSTER'
                                          ? 'primary'
                                          : row.source === 'ROTATION'
                                          ? 'warning'
                                          : 'default'
                                      }
                                      sx={{ fontWeight: 700 }}
                                    >
                                      {row.source || 'DEFAULT'}
                                    </Label>
                                  </TableCell>

                                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                    <Label
                                      color={
                                        row.status === 'Active'
                                          ? 'success'
                                          : row.status === 'Holiday'
                                          ? 'info'
                                          : row.status === 'Weekly Off'
                                          ? 'secondary'
                                          : 'default'
                                      }
                                      sx={{ fontWeight: 700 }}
                                    >
                                      {row.status}
                                    </Label>
                                  </TableCell>

                                  <TableCell align="right" sx={{ pr: 2 }}>
                                    <IconButton
                                      onClick={() => {
                                        setSelectedLineData(row);
                                        setOpenDetails(true);
                                      }}
                                      sx={{ color: 'info.main' }}
                                    >
                                      <Iconify icon={"solar:eye-bold" as any} />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                        )}
                      </TableBody>
                    </Table>
                  </Scrollbar>
                </TableContainer>

                <TablePagination
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  component="div"
                  count={reportData.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={(_, newPage) => setPage(newPage)}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                />
              </Card>
            )}

            {/* Calendar View */}
            {currentView === 'calendar' && (
              <LineCalendar
                reportData={reportData}
                employee={employee.length === 1 ? employee[0] : 'all'}
                fromDate={fromDate}
                toDate={toDate}
                onEventClick={(record) => {
                  setSelectedLineData(record);
                  setOpenDetails(true);
                }}
              />
            )}

            {/* Muster Roll View */}
            {currentView === 'muster' && (
              <Card sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 2 }}>
                <TableContainer
                  ref={musterScrollRef}
                  onMouseDown={handleMusterMouseDown}
                  onMouseLeave={handleMusterMouseLeave}
                  onMouseUp={handleMusterMouseUp}
                  onMouseMove={handleMusterMouseMove}
                  sx={{
                    position: 'relative',
                    overflowX: 'auto',
                    userSelect: 'none',
                    cursor: 'grab',
                    maxHeight: 700,
                  }}
                >
                  <Table size="small" stickyHeader sx={{ borderCollapse: 'collapse', minWidth: 900 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f8fafc' }}>
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 3,
                            bgcolor: '#f8fafc',
                            fontWeight: 700,
                            minWidth: 200,
                            borderRight: (t) => `2px solid ${t.palette.divider}`,
                          }}
                        >
                          Employee Details
                        </TableCell>

                        {dates.map((d) => {
                          const isSun = d.day() === 0;
                          return (
                            <TableCell
                              key={d.format('YYYY-MM-DD')}
                              align="center"
                              sx={{
                                minWidth: 64,
                                px: 0.5,
                                py: 1,
                                bgcolor: isSun ? alpha(theme.palette.error.main, 0.06) : '#f8fafc',
                                color: isSun ? 'error.main' : 'text.primary',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                borderRight: (t) => `1px solid ${alpha(t.palette.divider, 0.6)}`,
                              }}
                            >
                              <Typography variant="caption" sx={{ fontWeight: 800, display: 'block' }}>
                                {d.format('DD')}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: '0.65rem',
                                  color: isSun ? 'error.main' : 'text.disabled',
                                  fontWeight: 600,
                                }}
                              >
                                {d.format('ddd')}
                              </Typography>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={dates.length + 1} align="center" sx={{ py: 8 }}>
                            <CircularProgress sx={{ color: COMMON_COLORS.emerald.main }} />
                          </TableCell>
                        </TableRow>
                      ) : paginatedEmployees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={dates.length + 1} align="center" sx={{ py: 8 }}>
                            <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
                              No employee records found.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedEmployees.map((emp) => (
                          <TableRow key={emp.id} hover>
                            {/* Sticky Left Column: Employee */}
                            <TableCell
                              sx={{
                                position: 'sticky',
                                left: 0,
                                zIndex: 1,
                                bgcolor: 'background.paper',
                                borderRight: (t) => `2px solid ${t.palette.divider}`,
                                py: 1.25,
                              }}
                            >
                              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                {emp.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                ID: {emp.id}
                              </Typography>
                              {emp.department && (
                                <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', fontSize: '0.65rem' }}>
                                  {emp.department}
                                </Typography>
                              )}
                            </TableCell>

                            {/* Date Columns */}
                            {dates.map((d) => {
                              const dateStr = d.format('YYYY-MM-DD');
                              const rec = lineMap.get(`${emp.id}_${dateStr}`);
                              const isSun = d.day() === 0;

                              if (!rec) {
                                return (
                                  <TableCell
                                    key={dateStr}
                                    align="center"
                                    sx={{
                                      p: 0.5,
                                      bgcolor: isSun ? alpha(theme.palette.error.main, 0.02) : 'inherit',
                                      borderRight: (t) => `1px solid ${alpha(t.palette.divider, 0.4)}`,
                                    }}
                                  >
                                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                      -
                                    </Typography>
                                  </TableCell>
                                );
                              }

                              const lineColors = getLineColors(rec.line_name || rec.line_order);

                              let cellBg = lineColors.bg;
                              let cellColor = lineColors.color;
                              let cellText = rec.line_name || rec.line_order || 'LN';

                              if (rec.status === 'Holiday') {
                                cellBg = alpha(theme.palette.info.main, 0.14);
                                cellColor = theme.palette.info.dark;
                                cellText = 'HL';
                              } else if (rec.status === 'Weekly Off') {
                                cellBg = alpha(theme.palette.error.main, 0.12);
                                cellColor = theme.palette.error.main;
                                cellText = 'WO';
                              }

                              return (
                                <TableCell
                                  key={dateStr}
                                  align="center"
                                  onClick={() => handleMusterCellClick(rec)}
                                  sx={{
                                    p: 0.5,
                                    cursor: 'pointer',
                                    borderRight: (t) => `1px solid ${alpha(t.palette.divider, 0.4)}`,
                                    bgcolor: isSun ? alpha(theme.palette.error.main, 0.03) : 'inherit',
                                  }}
                                >
                                  <Tooltip
                                    arrow
                                    title={
                                      <Box sx={{ p: 0.5 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                          {rec.employee_name} ({rec.employee})
                                        </Typography>
                                        <Typography variant="caption" sx={{ display: 'block' }}>
                                          Date: {fDate(rec.line_date)}
                                        </Typography>
                                        <Typography variant="caption" sx={{ display: 'block' }}>
                                          Line: {rec.line_name || rec.line_order || 'Unassigned'}
                                        </Typography>
                                        <Typography variant="caption" sx={{ display: 'block' }}>
                                          Source: {rec.source} | Type: {rec.assignment_type}
                                        </Typography>
                                        <Typography variant="caption" sx={{ display: 'block' }}>
                                          Status: {rec.status}
                                        </Typography>
                                      </Box>
                                    }
                                  >
                                    <Box
                                      sx={{
                                        py: 0.5,
                                        px: 0.5,
                                        borderRadius: '6px',
                                        fontSize: '0.65rem',
                                        fontWeight: 800,
                                        bgcolor: cellBg,
                                        color: cellColor,
                                        border: `1px solid ${alpha(cellColor, 0.25)}`,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: 58,
                                        mx: 'auto',
                                        transition: 'all 0.15s ease',
                                        '&:hover': {
                                          transform: 'scale(1.08)',
                                          boxShadow: `0 2px 8px ${alpha(cellColor, 0.3)}`,
                                        },
                                      }}
                                    >
                                      {cellText}
                                    </Box>
                                  </Tooltip>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  rowsPerPageOptions={[25, 50, 100]}
                  component="div"
                  count={uniqueEmployees.length}
                  rowsPerPage={musterRowsPerPage}
                  page={musterPage}
                  onPageChange={(_, newPage) => setMusterPage(newPage)}
                  onRowsPerPageChange={(e) => {
                    setMusterRowsPerPage(parseInt(e.target.value, 10));
                    setMusterPage(0);
                  }}
                />
              </Card>
            )}
          </>
        )}
      </Stack>

      {/* Line Assignment Details Dialog */}
      <LineDetailsDialog
        open={openDetails}
        onClose={() => {
          setOpenDetails(false);
          setSelectedLineData(null);
        }}
        lineData={selectedLineData}
      />

      {/* Export Options Dialog */}
      <Dialog
        open={openExportDialog}
        onClose={() => setOpenExportDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ m: 0, p: 2.5, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify
              icon={exportType === 'excel' ? ("solar:export-bold" as any) : ("solar:file-download-bold" as any)}
              width={22}
              sx={{ color: exportType === 'excel' ? '#10b981' : '#f43f5e' }}
            />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Export Line Report ({exportType === 'excel' ? 'Excel' : 'PDF'})
            </Typography>
          </Stack>
          <IconButton onClick={() => setOpenExportDialog(false)} sx={{ color: 'text.disabled' }}>
            <Iconify icon="mingcute:close-line" width={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 2.5, py: 1.5 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Choose the format style for your exported line report file:
          </Typography>

          <RadioGroup
            value={selectedExportView}
            onChange={(e) => setSelectedExportView(e.target.value as any)}
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
                    Exports detailed line logs, including employee names, departments, lines, sources, and statuses.
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
                      Exports grid-based line roster schedule with employees as rows and month days as columns (Excel format only).
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
                  handleExportExcel('list');
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
                handleExportExcel('muster');
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
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function SummaryCard({ item }: { item: any }) {
  const theme = useTheme();

  const getIndicatorColor = (indicator: string) => {
    switch (indicator?.toLowerCase()) {
      case 'blue':
        return theme.palette.info.main;
      case 'green':
        return theme.palette.success.main;
      case 'orange':
        return theme.palette.warning.main;
      case 'red':
        return theme.palette.error.main;
      default:
        return theme.palette.primary.main;
    }
  };

  const getIcon = (label: string) => {
    const t = label.toLowerCase();
    if (t.includes('active') || t.includes('present')) return 'solar:check-circle-bold-duotone';
    if (t.includes('rotation')) return 'solar:refresh-circle-bold-duotone';
    if (t.includes('override') || t.includes('roster')) return 'solar:calendar-bold-duotone';
    if (t.includes('off') || t.includes('weekly') || t.includes('absent')) return 'solar:calendar-date-bold-duotone';
    if (t.includes('holiday')) return 'solar:cup-star-bold-duotone';
    if (t.includes('entries') || t.includes('total')) return 'solar:list-bold-duotone';
    return 'solar:layers-minimalistic-bold-duotone';
  };

  const color = getIndicatorColor(item.indicator);

  return (
    <Card
      sx={{
        p: 1.5,
        boxShadow: 'none',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: alpha(color, 0.04),
        border: `1px solid ${alpha(color, 0.1)}`,
        transition: theme.transitions.create(['transform', 'box-shadow']),
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 24px -4px ${alpha(color, 0.12)}`,
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box
          sx={{
            width: 30,
            height: 30,
            flexShrink: 0,
            display: 'flex',
            borderRadius: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
            color,
            bgcolor: alpha(color, 0.1),
          }}
        >
          <Iconify icon={getIcon(item.label) as any} width={18} />
        </Box>

        <Box sx={{ flexGrow: 1, pl: 1 }}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, mb: 0.2 }}>
            {item.label}
          </Typography>
          <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 800 }}>
            {item.value?.toLocaleString()}{item.suffix ? ` ${item.suffix}` : ''}
          </Typography>
        </Box>
      </Stack>

      <Box
        sx={{
          top: -16,
          right: -16,
          width: 80,
          height: 80,
          opacity: 0.08,
          position: 'absolute',
          borderRadius: '50%',
          bgcolor: color,
        }}
      />
    </Card>
  );
}
