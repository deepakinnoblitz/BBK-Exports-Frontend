import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useSnackbar } from 'notistack';
import autoTable from 'jspdf-autotable';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import { alpha, useTheme } from '@mui/material/styles';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useEmployees } from 'src/hooks/useEmployees';
import { useDepartments, useDesignations } from 'src/hooks/use-masters';

import { fDate } from 'src/utils/format-time';
import { frappeRequest } from 'src/utils/csrf';
import { fNumber } from 'src/utils/format-number';
import { stringToColor, stringToDarkColor } from 'src/utils/color-utils';

import { runReport } from 'src/api/reports';
import { getDoctypeList } from 'src/api/leads';
import { getEmployee } from 'src/api/employees';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchFrappeList, getHRSettings } from 'src/api/hr-management';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';

import { EmployeeReportDetailsDialog } from '../employee-report-details-dialog';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = ['Active', 'Inactive'];

import { useAuth } from 'src/auth/auth-context';

export function EmployeeOverallReportView() {
  const { user } = useAuth();
  const actionPerms = user?.permissions?.actions?.employee_overall_report;
  const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned && !!actionPerms;
  const canExport = hasCustomPerms ? !!actionPerms?.export : true;

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('date_of_joining');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const [joiningDateFrom, setJoiningDateFrom] = useState<dayjs.Dayjs | null>(null);
  const [joiningDateTo, setJoiningDateTo] = useState<dayjs.Dayjs | null>(null);
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterDesignation, setFilterDesignation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState<string[]>([]);

  const { data: departments } = useDepartments(1, 100);
  const { data: designations } = useDesignations(1, 100);
  const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);

  useEffect(() => {
    getDoctypeList('Employee', ['name', 'employee_name', 'employee_id']).then(setEmployeeOptions);
  }, []);

  const { data, total, loading, refetch } = useEmployees(
    page + 1,
    rowsPerPage,
    '',
    orderBy,
    order,
    filterDepartment,
    filterDesignation,
    filterStatus,
    '', // filterCountry
    '', // filterState
    '', // filterCity
    joiningDateFrom ? joiningDateFrom.format('YYYY-MM-DD') : null,
    joiningDateTo ? joiningDateTo.format('YYYY-MM-DD') : null,
    filterEmployee
  );

  const theme = useTheme();
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    departments: 0
  });

  const fetchSummary = useCallback(async () => {
    try {
      const filters: any[] = [];
      const or_filters: any[] = [];

      if (filterDepartment !== 'all') filters.push(['Employee', 'department', '=', filterDepartment]);
      if (filterDesignation !== 'all') {
        if (filterDesignation.length >= 2) {
          filters.push(['Employee', 'designation', 'like', `%${filterDesignation}%`]);
        } else {
          filters.push(['Employee', 'designation', '=', filterDesignation]);
        }
      }
      if (filterStatus !== 'all') filters.push(['Employee', 'status', '=', filterStatus]);
      if (joiningDateFrom) filters.push(['Employee', 'date_of_joining', '>=', joiningDateFrom.format('YYYY-MM-DD')]);
      if (joiningDateTo) filters.push(['Employee', 'date_of_joining', '<=', joiningDateTo.format('YYYY-MM-DD')]);
      if (filterEmployee.length > 0) {
        or_filters.push([
          'Employee',
          'name',
          'in',
          filterEmployee,
        ]);

        or_filters.push([
          'Employee',
          'employee_id',
          'in',
          filterEmployee,
        ]);
      }

      const getCount = async (status?: string) => {
        const f = [...filters];
        if (status) f.push(['Employee', 'status', '=', status]);

        const res = await frappeRequest(`/api/method/company.company.frontend_api.get_permitted_count?doctype=Employee&filters=${encodeURIComponent(JSON.stringify(f))}&or_filters=${encodeURIComponent(JSON.stringify(or_filters))}`);
        if (res.ok) {
          return (await res.json()).message || 0;
        }
        return 0;
      };

      const [totalCount, activeCount, inactiveCount] = await Promise.all([
        getCount(),
        getCount('Active'),
        getCount('Inactive')
      ]);

      setSummary({
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount,
        departments: departments.length
      });
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  }, [filterDepartment, filterDesignation, filterStatus, joiningDateFrom, joiningDateTo, filterEmployee, departments.length]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const [openDetails, setOpenDetails] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const [selected, setSelected] = useState<string[]>([]);

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = data.map((n) => n.name);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event: React.MouseEvent<unknown>, id: string) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }
    setSelected(newSelected);
  };

  const handleViewDetails = (id: string) => {
    setSelectedEmployeeId(id);
    setOpenDetails(true);
  };

  const { enqueueSnackbar } = useSnackbar();
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExport = async () => {
    const filters: any[] = [];
    const or_filters: any[] = [];

    if (filterDepartment !== 'all') {
        filters.push(['Employee', 'department', '=', filterDepartment]);
    }

    if (filterDesignation !== 'all') {
        filters.push(['Employee', 'designation', 'like', `%${filterDesignation}%`]);
    }

    if (filterStatus !== 'all') {
        filters.push(['Employee', 'status', '=', filterStatus]);
    }

    if (joiningDateFrom) {
        filters.push([
            'Employee',
            'date_of_joining',
            '>=',
            joiningDateFrom.format('YYYY-MM-DD'),
        ]);
    }

    if (joiningDateTo) {
        filters.push([
            'Employee',
            'date_of_joining',
            '<=',
            joiningDateTo.format('YYYY-MM-DD'),
        ]);
    }

    if (filterEmployee.length > 0) {
        or_filters.push(['Employee', 'name', 'in', filterEmployee]);
        or_filters.push(['Employee', 'employee_id', 'in', filterEmployee]);
    }

    const { data: allEmployees } = await fetchFrappeList('Employee', {
        page: 1,
        page_size: 100000,
        filters,
        or_filters,
        orderBy,
        order,
    });

    const employeesToExport =
        selected.length > 0
            ? allEmployees.filter((emp: any) => selected.includes(emp.name))
            : allEmployees;

    if (employeesToExport.length === 0) return;

    setExporting(true);

    try {
      const employeeIds = employeesToExport.map((e: any) => e.name);

      // Fetch related data in bulk - No deep fetching for speed
      const [attendance, leaves, assets, checkins, salaries, sessions] = await Promise.all([
        fetchFrappeList('Attendance', {
          page: 1,
          page_size: 10000,
          filters: [['employee', 'in', employeeIds]],
          fields: ['name', 'employee', 'attendance_date', 'status', 'in_time', 'out_time', 'working_hours_display'],
        }),
        fetchFrappeList('Leave Application', {
          page: 1,
          page_size: 5000,
          filters: [['employee', 'in', employeeIds]],
          fields: ['name', 'employee', 'leave_type', 'from_date', 'to_date', 'total_days', 'docstatus', 'workflow_state'],
        }),
        fetchFrappeList('Asset Assignment', {
          page: 1,
          page_size: 5000,
          filters: [['assigned_to', 'in', employeeIds]],
          fields: ['name', 'asset_name', 'assigned_on', 'returned_on', 'assigned_to'],
        }),
        fetchFrappeList('Employee Checkin', {
          page: 1,
          page_size: 20000,
          filters: [['employee', 'in', employeeIds]],
          fields: ['name', 'employee', 'time', 'log_type', 'attendance'],
        }).catch(() => ({ data: [], total: 0 })),
        fetchFrappeList('Salary Slip', {
          page: 1,
          page_size: 5000,
          filters: [['employee', 'in', employeeIds]],
          fields: ['name', 'employee', 'pay_period_start', 'pay_period_end', 'grand_gross_pay', 'grand_net_pay', 'docstatus'],
        }),
        fetchFrappeList('Employee Session', {
          page: 1,
          page_size: 10000,
          filters: [['employee', 'in', employeeIds]],
          fields: ['name', 'employee', 'login_date', 'login_time', 'logout_time', 'total_work_hours', 'total_break_hours', 'status'],
        }),
      ]);

      // Deep fetch for Leave Applications ONLY (essential for 'reason' field)
      console.log('--- STARTING DEEP FETCH FOR LEAVES (EXPORT) ---', leaves.data.length, 'records');
      const enrichedLeaves = await Promise.all(
        leaves.data.map(async (l: any) => {
          try {
            const res = await frappeRequest(`/api/method/frappe.client.get?doctype=Leave Application&name=${encodeURIComponent(l.name)}`);
            if (res.ok) {
              const doc = (await res.json()).message;
              return {
                ...l,
                ...doc,
                mappedStatus: doc.workflow_state || l.workflow_state || "-",
                mappedReason: doc.reson || l.reason || "-"
              };
            }
          } catch (e) {
            console.error('Leave Export Deep Fetch Error:', l.name, e);
          }
          return l;
        })
      );

      // Fetch Timesheet Report data
      const timesheetResults = await Promise.all(
        employeeIds.map((id:string) => runReport('Timesheet Report', { employee: id }))
      );
      const timesheetData = timesheetResults.flatMap(res => res.result || []).filter(t => t.timesheet_date !== 'TOTAL');

      let finalEmployees = employeesToExport;
      let hrSettings = { currency_symbol: '₹', default_locale: 'en-IN' };

      if (employeesToExport.length === 1) {
        const [fullEmp, settings] = await Promise.all([
          getEmployee(employeesToExport[0].name),
          getHRSettings()
        ]);
        finalEmployees = [fullEmp];
        hrSettings = settings;
      }

      const workbook = new ExcelJS.Workbook();
      // ... (sheet logic remains same, but using the fetched data directly)

      // For brevity, I will only show the end of the workbook logic here
      // [workbook logic...]

      // Style helper
      const applyHeaderStyle = (sheet: ExcelJS.Worksheet) => {
        sheet.getRow(1).height = 25;
        sheet.getRow(1).eachCell((cell) => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0ea5e9' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        });
      };

      const applyBodyStyle = (sheet: ExcelJS.Worksheet) => {
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            row.eachCell((cell) => {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
              // Alternate shading
              if (rowNumber % 2 === 0) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };
              }
              cell.border = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } }
              };
            });
          }
        });
      };

      const autoWidth = (sheet: ExcelJS.Worksheet) => {
        sheet.columns.forEach((column: any) => {
          let maxColumnLength = 0;
          column.eachCell({ includeEmpty: true }, (cell: any) => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxColumnLength) {
              maxColumnLength = columnLength;
            }
          });
          column.width = Math.min(maxColumnLength + 5, 50);
        });
      };

      // 1. Employee Details
      const detailsSheet = workbook.addWorksheet('Employee Details');

      const EXPORT_FIELDS = [
        { label: 'Employee ID', key: 'employee_id' },
        { label: 'Employee Name', key: 'employee_name' },
        { label: 'Profile Picture', key: 'profile_picture' },
        { label: 'Country', key: 'country' },
        { label: 'State', key: 'state' },
        { label: 'City', key: 'city' },
        { label: 'Date of Joining', key: 'date_of_joining', isDate: true },
        { label: 'Skip Probation', key: 'skip_probation', isCheck: true },
        { label: 'Bank Account', key: 'bank_account' },
        { label: 'Date of Birth', key: 'dob', isDate: true },
        { label: 'PF Number', key: 'pf_number' },
        { label: 'ESI No', key: 'esi_no' },
        { label: 'Email', key: 'email' },
        { label: 'Personal Email', key: 'personal_email' },
        { label: 'Phone', key: 'phone' },
        { label: 'Office Phone Number', key: 'office_phone_number' },
        { label: 'Department', key: 'department' },
        { label: 'Designation', key: 'designation' },
        { label: 'Status', key: 'status' },
        { label: 'User', key: 'user' },
        { label: 'CTC', key: 'ctc' },
        { label: 'Total Earnings', key: 'total_earnings' },
        { label: 'Total Deductions', key: 'total_deductions' },
        { label: 'Net Salary', key: 'net_salary' },
      ];

      const formatValue = (emp: any, field: any) => {
        const val = emp[field.key];
        if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0)) return '-';
        if (field.isDate) return fDate(val, 'DD-MM-YYYY');
        if (field.isCheck) return val ? 'Yes' : 'No';
        if (field.isTable && Array.isArray(val)) {
          return val.map((row: any) => `${row.component_name || row.component || '-'}: ${row.amount || 0}`).join(', ');
        }
        return val;
      };

      if (finalEmployees.length === 1) {
        const emp = finalEmployees[0];

        EXPORT_FIELDS.forEach((field) => {
          const row = detailsSheet.addRow([field.label, formatValue(emp, field)]);
          row.height = 25;
          const cell1 = row.getCell(1);
          const cell2 = row.getCell(2);

          cell1.font = { bold: true, color: { argb: 'FF1C252E' } };
          cell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };
          cell1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          cell1.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
          };

          cell2.font = { color: { argb: 'FF1C252E' } };
          cell2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          cell2.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
          };
        });

        // Add Earnings Table
        detailsSheet.addRow([]); // Empty row
        const earningsTitleRow = detailsSheet.addRow(['EARNINGS TABLE']);
        earningsTitleRow.height = 25;
        earningsTitleRow.eachCell(cell => {
          cell.font = { bold: true, color: { argb: 'FF1C252E' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
          };
        });
        detailsSheet.mergeCells(`A${earningsTitleRow.number}:B${earningsTitleRow.number}`);

        const earningsHeaderRow = detailsSheet.addRow(['Component Name', 'Amount']);
        earningsHeaderRow.height = 25;
        earningsHeaderRow.eachCell(cell => {
          cell.font = { bold: true, color: { argb: 'FF1C252E' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }; // Slightly darker gray for headers
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
          };
        });

        const earningsData = emp.earnings || [];
        if (earningsData.length > 0) {
          earningsData.forEach((row: any) => {
            const r = detailsSheet.addRow([row.component_name || row.component || '-', row.amount || 0]);
            r.eachCell(cell => {
              cell.font = { color: { argb: 'FF1C252E' } };
              cell.border = {
                top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
              };
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });
          });
        } else {
          const r = detailsSheet.addRow(['-', '-']);
          r.eachCell(cell => {
            cell.font = { color: { argb: 'FF1C252E' } };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
              left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
              bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
              right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          });
        }

        // Add Deductions Table
        detailsSheet.addRow([]); // Empty row
        const deductionsTitleRow = detailsSheet.addRow(['DEDUCTIONS TABLE']);
        deductionsTitleRow.height = 25;
        deductionsTitleRow.eachCell(cell => {
          cell.font = { bold: true, color: { argb: 'FF1C252E' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
          };
        });
        detailsSheet.mergeCells(`A${deductionsTitleRow.number}:B${deductionsTitleRow.number}`);

        const deductionsHeaderRow = detailsSheet.addRow(['Component Name', 'Amount']);
        deductionsHeaderRow.height = 25;
        deductionsHeaderRow.eachCell(cell => {
          cell.font = { bold: true, color: { argb: 'FF1C252E' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
          };
        });

        const deductionsData = emp.deductions || [];
        if (deductionsData.length > 0) {
          deductionsData.forEach((row: any) => {
            const r = detailsSheet.addRow([row.component_name || row.component || '-', row.amount || 0]);
            r.eachCell(cell => {
              cell.font = { color: { argb: 'FF1C252E' } };
              cell.border = {
                top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
              };
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });
          });
        } else {
          const r = detailsSheet.addRow(['-', '-']);
          r.eachCell(cell => {
            cell.font = { color: { argb: 'FF1C252E' } };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
              left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
              bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
              right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          });
        }

      } else {
        detailsSheet.columns = EXPORT_FIELDS.map(f => ({ header: f.label, key: f.key }));

        finalEmployees.forEach((emp: any)=> {
          const rowData: any = {};
          EXPORT_FIELDS.forEach(f => {
            rowData[f.key] = formatValue(emp, f);
          });
          detailsSheet.addRow(rowData);
        });
        applyHeaderStyle(detailsSheet);
        applyBodyStyle(detailsSheet);
      }
      autoWidth(detailsSheet);

      // 3. Attendance
      const attendanceSheet = workbook.addWorksheet('Attendance');

      const attStats = {
        total: attendance.data.length,
        present: attendance.data.filter((a: any) => a.status === 'Present').length,
        absent: attendance.data.filter((a: any) => a.status === 'Absent').length,
        leaves: attendance.data.filter((a: any) => ['On Leave', 'Half Day'].includes(a.status)).length,
      };

      // Add Header for data
      const attColumns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Day', key: 'day', width: 12 },
        { header: 'Employee', key: 'employee_name', width: 25 },
        { header: 'Employee ID', key: 'employee', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'In Time', key: 'in', width: 15 },
        { header: 'Out Time', key: 'out', width: 15 },
        { header: 'Working Hours', key: 'hours', width: 15 },
      ];
      attendanceSheet.columns = attColumns;

      attendance.data.forEach((att: any) => {
        const empInfo = employeesToExport.find((e: any) => e.name === att.employee);
        const attCheckins = (checkins?.data || []).filter((c: any) => c.attendance === att.name || (c.employee === att.employee && dayjs(c.time).format('YYYY-MM-DD') === att.attendance_date));
        const inCheckins = attCheckins.filter((c: any) => c.log_type === 'IN').sort((a: any, b: any) => dayjs(a.time).diff(dayjs(b.time)));
        const outCheckins = attCheckins.filter((c: any) => c.log_type === 'OUT').sort((a: any, b: any) => dayjs(a.time).diff(dayjs(b.time)));

        const inTime = att.in_time || (inCheckins.length > 0 ? inCheckins[0].time : '-');
        const outTime = att.out_time || (outCheckins.length > 0 ? outCheckins[outCheckins.length - 1].time : '-');

        const row = attendanceSheet.addRow({
          date: att.attendance_date ? fDate(att.attendance_date, 'DD-MM-YYYY') : '-',
          day: att.attendance_date ? dayjs(att.attendance_date).format('dddd') : '-',
          employee_name: empInfo?.employee_name || '-',
          employee: att.employee || '-',
          status: att.status || att.attendance_status || '-',
          in: inTime !== '-' ? inTime : '-',
          out: outTime !== '-' ? outTime : '-',
          hours: att.working_hours_display || '0:00'
        });

        // Status coloring
        const statusCell = row.getCell('status');
        if (att.status === 'Present') statusCell.font = { color: { argb: 'FF22C55E' }, bold: true };
        else if (att.status === 'Absent') statusCell.font = { color: { argb: 'FFEF4444' }, bold: true };
        else if (att.status === 'Missing') statusCell.font = { color: { argb: 'FFFFA500' }, bold: true };
        else if (['On Leave', 'Half Day'].includes(att.status)) statusCell.font = { color: { argb: 'FFEAB308' }, bold: true };
      });

      applyHeaderStyle(attendanceSheet);
      applyBodyStyle(attendanceSheet);

      // Add Attendance Summary at the bottom
      attendanceSheet.addRow([]);
      const summaryHeader = attendanceSheet.addRow(['ATTENDANCE SUMMARY', '']);
      summaryHeader.height = 25;
      summaryHeader.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0ea5e9' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      attendanceSheet.mergeCells(`A${summaryHeader.number}:B${summaryHeader.number}`);

      const addSummaryRow = (label: string, value: any, textColor?: string) => {
        const row = attendanceSheet.addRow([label, value]);
        row.height = 20;
        const cell1 = row.getCell(1);
        const cell2 = row.getCell(2);

        // Label Styling (Column A) - Text color only
        cell1.font = { bold: true, color: textColor ? { argb: textColor } : undefined };
        cell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };
        cell1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        cell1.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };

        // Value Styling (Column B)
        cell2.font = { bold: true };
        cell2.alignment = { vertical: 'middle', horizontal: 'center' };
        cell2.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      };

      addSummaryRow('Total Records', attStats.total);
      addSummaryRow('Present', attStats.present, 'FF22C55E'); // Green Text
      addSummaryRow('Absent', attStats.absent, 'FFEF4444');   // Red Text
      addSummaryRow('Leaves', attStats.leaves, 'FFEAB308');   // Yellow/Orange Text

      autoWidth(attendanceSheet);

      // 4. Daily Log
      const dailyLogSheet = workbook.addWorksheet('Daily Log');
      dailyLogSheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Employee', key: 'employee', width: 15 },
        { header: 'Login Time', key: 'login', width: 20 },
        { header: 'Logout Time', key: 'logout', width: 20 },
        { header: 'Work Hours', key: 'work', width: 15 },
        { header: 'Break Hours', key: 'break', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
      ];
      sessions.data.forEach((sess: any) => {
        const row = dailyLogSheet.addRow({
          date: fDate(sess.login_date, 'DD-MM-YYYY'),
          employee: sess.employee,
          login: sess.login_time ? dayjs(sess.login_time).format('HH:mm:ss') : '-',
          logout: sess.logout_time ? dayjs(sess.logout_time).format('HH:mm:ss') : '-',
          work: (sess.total_work_hours || 0).toFixed(2),
          break: (sess.total_break_hours || 0).toFixed(2),
          status: sess.status || '-'
        });
      });

      applyHeaderStyle(dailyLogSheet);
      applyBodyStyle(dailyLogSheet);

      // Apply Conditional Formatting for Daily Log
      dailyLogSheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const statusCell = row.getCell(7);
          if (statusCell.value === 'Inactive') {
            statusCell.font = { color: { argb: 'FFFF0000' }, bold: true };
          }
        }
      });

      autoWidth(dailyLogSheet);

      // 5. Timesheets
      const timesheetSheet = workbook.addWorksheet('Timesheets');
      const tsColumns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Employee', key: 'employee_name', width: 25 },
        { header: 'Employee ID', key: 'employee', width: 15 },
        { header: 'Project', key: 'project', width: 20 },
        { header: 'Activity Type', key: 'activity', width: 25 },
        { header: 'Hours', key: 'hours', width: 12 },
        { header: 'Description', key: 'description', width: 50 },
      ];
      timesheetSheet.columns = tsColumns;
      const tsColumnCount = tsColumns.length;

      // Header Styling (Matching Timesheet Report)
      for (let i = 1; i <= tsColumnCount; i++) {
        const cell = timesheetSheet.getRow(1).getCell(i);
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0ea5e9' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      }
      timesheetSheet.getRow(1).height = 25;

      // Sort Data by Date (Latest first), then Employee
      const sortedTs = [...timesheetData].sort((a, b) => {
        const dateA = a.timesheet_date || '';
        const dateB = b.timesheet_date || '';
        const nameA = (a.employee_name || '').toLowerCase();
        const nameB = (b.employee_name || '').toLowerCase();

        if (dateB !== dateA) return dateB.localeCompare(dateA);
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        return (a.employee || '').localeCompare(b.employee || '');
      });

      sortedTs.forEach((row) => {
        timesheetSheet.addRow({
          date: row.timesheet_date ? fDate(row.timesheet_date, 'DD-MM-YYYY') : '-',
          employee_name: row.employee_name || '-',
          employee: row.employee || '-',
          project: row.project || '---',
          activity: row.activity_type || '---',
          hours: row.hours || 0,
          description: row.description || ''
        });
      });

      // Merging logic for Date, Employee, and Employee ID
      let tsMergeStart = 2;
      const tsTotalRows = timesheetSheet.rowCount;
      for (let i = 2; i <= tsTotalRows; i++) {
        const current = timesheetSheet.getRow(i);
        const next = i < tsTotalRows ? timesheetSheet.getRow(i + 1) : null;

        const isLast = i === tsTotalRows;
        const sameAsNext = !isLast && next &&
          current.getCell(1).value === next.getCell(1).value &&
          current.getCell(2).value === next.getCell(2).value &&
          current.getCell(3).value === next.getCell(3).value;

        if (!sameAsNext) {
          if (i > tsMergeStart) {
            timesheetSheet.mergeCells(`A${tsMergeStart}:A${i}`);
            timesheetSheet.mergeCells(`B${tsMergeStart}:B${i}`);
            timesheetSheet.mergeCells(`C${tsMergeStart}:C${i}`);

            ['A', 'B', 'C'].forEach(col => {
              timesheetSheet.getCell(`${col}${tsMergeStart}`).alignment = { vertical: 'middle', horizontal: 'center' };
            });
          }
          tsMergeStart = i + 1;
        }
      }

      // Body styling: Alternating shading, Black borders, Middle Alignment
      timesheetSheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          for (let i = 1; i <= tsColumnCount; i++) {
            const cell = row.getCell(i);
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            // Alternate shading
            if (rowNumber % 2 === 0) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };
            }
            // Borders
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF000000' } },
              bottom: { style: 'thin', color: { argb: 'FF000000' } },
              left: { style: 'thin', color: { argb: 'FF000000' } },
              right: { style: 'thin', color: { argb: 'FF000000' } }
            };
          }
          // Description wrapping and left alignment
          row.getCell(7).alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };
        }
      });

      // Add TOTAL row
      const totalHoursVal = sortedTs.reduce((acc, curr) => acc + (curr.hours || 0), 0);
      const totalRow = timesheetSheet.addRow(['TOTAL', '', '', '', '', totalHoursVal, '']);
      totalRow.font = { bold: true };
      totalRow.getCell(6).numFmt = '0.00 "hrs"';
      for (let i = 1; i <= tsColumnCount; i++) {
        totalRow.getCell(i).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      }

      autoWidth(timesheetSheet);

      // 5. Leave Applications
      const leaveSheet = workbook.addWorksheet('Leave Applications');
      leaveSheet.columns = [
        { header: 'Employee ID', key: 'employee', width: 15 },
        { header: 'Leave Type', key: 'type', width: 20 },
        { header: 'From Date', key: 'from', width: 15 },
        { header: 'To Date', key: 'to', width: 15 },
        { header: 'Total Days', key: 'days', width: 12 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Reason', key: 'reason', width: 30 },
      ];
      enrichedLeaves.forEach((l: any) => {
        const totalDays = l.total_days || l.total_leave_days || (l.from_date && l.to_date ? dayjs(l.to_date).diff(dayjs(l.from_date), 'day') + 1 : 0);
        const status = l.mappedStatus || '-';
        const reason = l.mappedReason || '-';

        const row = leaveSheet.addRow({
          employee: l.employee,
          type: l.leave_type,
          from: l.from_date ? fDate(l.from_date, 'DD-MM-YYYY') : '-',
          to: l.to_date ? fDate(l.to_date, 'DD-MM-YYYY') : '-',
          days: totalDays || 0,
          status: status,
          reason: reason
        });

        // Status color
        const statusCell = row.getCell('status');
        if (status === 'Approved') statusCell.font = { color: { argb: 'FF22C55E' }, bold: true };
        else if (status === 'Rejected') statusCell.font = { color: { argb: 'FFEF4444' }, bold: true };
        else if (['Pending', 'Open'].includes(status)) statusCell.font = { color: { argb: 'FFF97316' }, bold: true };

        // Leave type color
        const typeCell = row.getCell('type');
        const typeStr = (l.leave_type || '').toLowerCase();
        if (typeStr.includes('paid')) typeCell.font = { color: { argb: 'FF22C55E' }, bold: true };
        else if (typeStr.includes('unpaid') || typeStr.includes('loss')) typeCell.font = { color: { argb: 'FFEF4444' }, bold: true };
        else if (typeStr.includes('permission')) typeCell.font = { color: { argb: 'FFF97316' }, bold: true };
      });
      applyHeaderStyle(leaveSheet);
      applyBodyStyle(leaveSheet);
      autoWidth(leaveSheet);

      // 6. Assigned Assets
      const assetSheet = workbook.addWorksheet('Assigned Assets');
      assetSheet.columns = [
        { header: 'Employee ID', key: 'employee', width: 15 },
        { header: 'Asset Name', key: 'name', width: 25 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Serial No', key: 'serial', width: 20 },
        { header: 'Assigned On', key: 'date', width: 15 },
      ];
      assets.data.forEach((a: any) => {
        assetSheet.addRow({
          employee: a.assigned_to || '-',
          name: a.asset_name || '-',
          category: a.asset_category || '-',
          serial: a.serial_no || '-',
          date: a.assigned_on ? fDate(a.assigned_on, 'DD-MM-YYYY') : '-'
        });
      });
      applyHeaderStyle(assetSheet);
      applyBodyStyle(assetSheet);
      autoWidth(assetSheet);

      // 7. Salary Slips
      const salarySheet = workbook.addWorksheet('Salary Slips');
      salarySheet.columns = [
        { header: 'Slip ID', key: 'name', width: 20 },
        { header: 'Employee', key: 'employee', width: 15 },
        { header: 'Period Start', key: 'start', width: 15 },
        { header: 'Period End', key: 'end', width: 15 },
        { header: 'Gross Pay', key: 'gross', width: 15 },
        { header: 'Net Pay', key: 'net', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
      ];
      salaries.data.forEach((s: any) => {
        const status = s.docstatus === 1 ? 'Submitted' : 'Draft';
        const row = salarySheet.addRow({
          name: s.name,
          employee: s.employee,
          start: fDate(s.pay_period_start, 'DD-MM-YYYY'),
          end: fDate(s.pay_period_end, 'DD-MM-YYYY'),
          gross: s.grand_gross_pay || 0,
          net: s.grand_net_pay || 0,
          status: status
        });
      });

      applyHeaderStyle(salarySheet);
      applyBodyStyle(salarySheet);

      // Apply Conditional Formatting for Salary Slips
      salarySheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const statusCell = row.getCell(7);
          if (statusCell.value === 'Draft') {
            statusCell.font = { color: { argb: 'FFCA8A04' }, bold: true };
          }
        }
      });

      autoWidth(salarySheet);

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Employee_Overall_Report_${dayjs().format('YYYY-MM-DD')}.xlsx`);
      enqueueSnackbar('Excel exported successfully!', { variant: 'success' });
    } catch (error) {
      console.error('Export failed:', error);
      enqueueSnackbar('Failed to export report. Please try again.', { variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    const employeesToExport = selected.length > 0
      ? data.filter((emp: any) => selected.includes(emp.name))
      : data;

    if (employeesToExport.length === 0) return;

    setExportingPdf(true);

    try {
      const employeeIds = employeesToExport.map((e: any) => e.name);

      // 1. Fetch ALL data in parallel (Same as Excel)
      const [attendance, leaves, assets, checkins, salaries, sessions] = await Promise.all([
        fetchFrappeList('Attendance', {
          page: 1,
          page_size: 10000,
          filters: [['employee', 'in', employeeIds]],
          fields: ['name', 'employee', 'attendance_date', 'status', 'in_time', 'out_time', 'working_hours_display'],
        }),
        fetchFrappeList('Leave Application', {
          page: 1,
          page_size: 5000,
          filters: [['employee', 'in', employeeIds]],
          fields: ['name', 'employee', 'leave_type', 'from_date', 'to_date', 'total_days', 'docstatus', 'workflow_state'],
        }),
        fetchFrappeList('Asset Assignment', {
          page: 1,
          page_size: 5000,
          filters: [['assigned_to', 'in', employeeIds]],
          fields: ['name', 'asset_name', 'assigned_on', 'returned_on', 'assigned_to'],
        }),
        fetchFrappeList('Employee Checkin', {
          page: 1,
          page_size: 20000,
          filters: [['employee', 'in', employeeIds]],
          fields: ['name', 'employee', 'time', 'log_type', 'attendance'],
        }).catch(() => ({ data: [], total: 0 })),
        fetchFrappeList('Salary Slip', {
          page: 1,
          page_size: 5000,
          filters: [['employee', 'in', employeeIds]],
          fields: ['name', 'employee', 'pay_period_start', 'pay_period_end', 'grand_gross_pay', 'grand_net_pay', 'docstatus'],
        }),
        fetchFrappeList('Employee Session', {
          page: 1,
          page_size: 10000,
          filters: [['employee', 'in', employeeIds]],
          fields: ['name', 'employee', 'login_date', 'login_time', 'logout_time', 'total_work_hours', 'total_break_hours', 'status'],
        }),
      ]);

      const timesheetResults = await Promise.all(
        employeeIds.map(id => runReport('Timesheet Report', { employee: id }))
      );
      const timesheetData = timesheetResults.flatMap(res => res.result || []).filter(t => t.timesheet_date !== 'TOTAL');

      const doc = new jsPDF('landscape');

      // Helper for adding section titles
      const addPageHeader = (title: string) => {
        doc.setFontSize(20);
        doc.setTextColor(14, 165, 233);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 14, 20);

        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated on: ${dayjs().format('DD MMM YYYY, h:mm A')}`, 14, 27);

        // Accent line
        doc.setDrawColor(14, 165, 233);
        doc.setLineWidth(0.5);
        doc.line(14, 32, 196, 32);
      };

      const tableStyles: any = {
        theme: 'grid',
        headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak', lineWidth: 0.1, lineColor: [60, 60, 60] },
      };

      const formatValue = (emp: any, key: string, isDate?: boolean, isCheck?: boolean) => {
        const val = emp[key];
        if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0)) return '-';
        if (isDate) return fDate(val, 'DD-MM-YYYY');
        if (isCheck) return val ? 'Yes' : 'No';
        return val;
      };

      const isSingleEmployee = employeesToExport.length === 1;

      // --- PAGE 1: BASIC INFORMATION ---
      addPageHeader('Employee Basic Information');
      if (isSingleEmployee) {
        const emp = employeesToExport[0];
        const verticalBasic = [
          ['Employee Name', emp.employee_name || '-'],
          ['Employee ID', emp.name || '-'],
          ['Date of Birth', formatValue(emp, 'dob', true)],
          ['Country', emp.country || '-'],
          ['State', emp.state || '-'],
          ['City', emp.city || '-'],
          ['Status', emp.status || '-']
        ];
        autoTable(doc, {
          startY: 40,
          body: verticalBasic,
          ...tableStyles,
          alternateRowStyles: { fillColor: [252, 253, 255] },
          columnStyles: {
            0: { fontStyle: 'bold', width: 60, fillColor: [244, 246, 248], textColor: [28, 37, 46], fontSize: 8 },
            1: { halign: 'left', textColor: [28, 37, 46], fontSize: 9 }
          }
        });
      } else {
        const basicData = employeesToExport.map(emp => [
          emp.employee_name || '-',
          emp.name || '-',
          formatValue(emp, 'dob', true),
          emp.country || '-',
          emp.state || '-',
          emp.city || '-',
          emp.status || '-'
        ]);
        autoTable(doc, {
          startY: 40,
          head: [['Employee Name', 'Employee ID', 'Date of Birth', 'Country', 'State', 'City', 'Status']],
          body: basicData,
          ...tableStyles
        });
      }

      // --- PAGE 2: CONTACT INFORMATION ---
      doc.addPage();
      addPageHeader('Contact Information');
      if (isSingleEmployee) {
        const emp = employeesToExport[0];
        const verticalContact = [
          ['Official Email', emp.email || '-'],
          ['Personal Email', emp.personal_email || '-'],
          ['Phone', emp.phone || '-'],
          ['Office Phone', emp.office_phone_number || '-'],
          ['User Login', emp.user || '-']
        ];
        autoTable(doc, {
          startY: 40,
          body: verticalContact,
          ...tableStyles,
          alternateRowStyles: { fillColor: [252, 253, 255] },
          columnStyles: {
            0: { fontStyle: 'bold', width: 60, fillColor: [244, 246, 248], textColor: [28, 37, 46], fontSize: 8 },
            1: { halign: 'left', textColor: [28, 37, 46], fontSize: 9 }
          }
        });
      } else {
        const contactData = employeesToExport.map(emp => [
          emp.employee_name || '-',
          emp.name || '-',
          emp.email || '-',
          emp.personal_email || '-',
          emp.phone || '-',
          emp.office_phone_number || '-',
          emp.user || '-'
        ]);
        autoTable(doc, {
          startY: 40,
          head: [['Employee Name', 'Employee ID', 'Official Email', 'Personal Email', 'Phone', 'Office Phone', 'User Login']],
          body: contactData,
          ...tableStyles
        });
      }

      // --- PAGE 3: EMPLOYMENT DETAILS ---
      doc.addPage();
      addPageHeader('Employment Details');
      if (isSingleEmployee) {
        const emp = employeesToExport[0];
        const verticalEmployment = [
          ['Department', emp.department || '-'],
          ['Designation', emp.designation || '-'],
          ['Joining Date', formatValue(emp, 'date_of_joining', true)],
          ['Skip Probation', formatValue(emp, 'skip_probation', false, true)],
        ];
        autoTable(doc, {
          startY: 40,
          body: verticalEmployment,
          ...tableStyles,
          alternateRowStyles: { fillColor: [252, 253, 255] },
          columnStyles: {
            0: { fontStyle: 'bold', width: 60, fillColor: [244, 246, 248], textColor: [28, 37, 46], fontSize: 8 },
            1: { halign: 'left', textColor: [28, 37, 46], fontSize: 9 }
          }
        });
      } else {
        const employmentData = employeesToExport.map(emp => [
          emp.employee_name || '-',
          emp.name || '-',
          emp.department || '-',
          emp.designation || '-',
          formatValue(emp, 'date_of_joining', true),
          formatValue(emp, 'skip_probation', false, true),
        ]);
        autoTable(doc, {
          startY: 40,
          head: [['Employee Name', 'Employee ID', 'Department', 'Designation', 'Joining Date', 'Skip Probation']],
          body: employmentData,
          ...tableStyles
        });
      }

      // --- PAGE 4: SALARY & BANK DETAILS ---
      doc.addPage();
      addPageHeader('Salary & Identification Details');
      if (isSingleEmployee) {
        const emp = employeesToExport[0];
        const verticalSalary = [
          ['Bank Account', emp.bank_account || '-'],
          ['PF Number', emp.pf_number || '-'],
          ['ESI No', emp.esi_no || '-'],
          ['CTC', emp.ctc || '0'],
          ['Earnings', emp.total_earnings || '0'],
          ['Deductions', emp.total_deductions || '0'],
          ['Net Salary', emp.net_salary || '0']
        ];
        autoTable(doc, {
          startY: 40,
          body: verticalSalary,
          ...tableStyles,
          alternateRowStyles: { fillColor: [252, 253, 255] },
          columnStyles: {
            0: { fontStyle: 'bold', width: 60, fillColor: [244, 246, 248], textColor: [28, 37, 46], fontSize: 8 },
            1: { halign: 'left', textColor: [28, 37, 46], fontSize: 9 }
          }
        });
      } else {
        const salaryDataPdf = employeesToExport.map(emp => [
          emp.name || '-',
          emp.bank_account || '-',
          emp.pf_number || '-',
          emp.esi_no || '-',
          emp.ctc || '0',
          emp.total_earnings || '0',
          emp.total_deductions || '0',
          emp.net_salary || '0'
        ]);
        autoTable(doc, {
          startY: 40,
          head: [['Employee ID', 'Bank Account', 'PF Number', 'ESI No', 'CTC', 'Earnings', 'Deductions', 'Net Salary']],
          body: salaryDataPdf,
          ...tableStyles
        });
      }

      // --- PAGE 5: ATTENDANCE RECORDS ---
      doc.addPage();
      addPageHeader('Attendance Records');
      const attendanceTable = (attendance.data || []).map((a: any) => [
        a.employee,
        dayjs(a.attendance_date).format('DD MMM YYYY'),
        a.status,
        a.in_time || '-',
        a.out_time || '-',
        a.working_hours_display || '-',
      ]);
      autoTable(doc, {
        startY: 40,
        head: [['Employee ID', 'Date', 'Status', 'In Time', 'Out Time', 'Hours']],
        body: attendanceTable.length > 0 ? attendanceTable : [['No records found', '', '', '', '', '']],
        ...tableStyles
      });

      // --- PAGE 6: DAILY ACTIVITY LOGS ---
      doc.addPage();
      addPageHeader('Daily Activity Logs');
      const sessionTable = (sessions.data || []).map((s: any) => [
        s.employee,
        dayjs(s.login_date).format('DD MMM YYYY'),
        s.login_time || '-',
        s.logout_time || '-',
        s.total_work_hours || '0',
        s.total_break_hours || '0',
        s.status || '-',
      ]);
      autoTable(doc, {
        startY: 40,
        head: [['Employee ID', 'Date', 'Login', 'Logout', 'Work Hrs', 'Break Hrs', 'Status']],
        body: sessionTable.length > 0 ? sessionTable : [['No records found', '', '', '', '', '', '']],
        ...tableStyles
      });

      // --- PAGE 7: TIMESHEETS ---
      doc.addPage();
      addPageHeader('Timesheet Reports');
      const tsTable = timesheetData.map((t: any) => [
        t.employee,
        dayjs(t.timesheet_date).format('DD MMM YYYY'),
        t.activity_type || '-',
        t.project || '-',
        t.hours || '0',
        t.description || '-',
      ]);
      autoTable(doc, {
        startY: 40,
        head: [['Employee ID', 'Date', 'Activity', 'Project', 'Hours', 'Description']],
        body: tsTable.length > 0 ? tsTable : [['No records found', '', '', '', '', '']],
        ...tableStyles
      });

      // --- PAGE 8: LEAVE APPLICATIONS ---
      doc.addPage();
      addPageHeader('Leave Applications');
      const leaveTable = (leaves.data || []).map((l: any) => [
        l.employee,
        l.leave_type || '-',
        dayjs(l.from_date).format('DD MMM YYYY'),
        dayjs(l.to_date).format('DD MMM YYYY'),
        l.total_days || '0',
        l.workflow_state || l.status || '-',
      ]);
      autoTable(doc, {
        startY: 40,
        head: [['Employee ID', 'Type', 'From', 'To', 'Days', 'Status']],
        body: leaveTable.length > 0 ? leaveTable : [['No records found', '', '', '', '', '']],
        ...tableStyles
      });

      // --- PAGE 9: ASSIGNED ASSETS ---
      doc.addPage();
      addPageHeader('Assigned Assets');
      const assetTable = (assets.data || []).map((a: any) => [
        a.assigned_to,
        a.asset_name || '-',
        a.assigned_on ? dayjs(a.assigned_on).format('DD MMM YYYY') : '-',
        a.returned_on ? dayjs(a.returned_on).format('DD MMM YYYY') : '-',
      ]);
      autoTable(doc, {
        startY: 40,
        head: [['Employee ID', 'Asset Name', 'Assigned On', 'Returned On']],
        body: assetTable.length > 0 ? assetTable : [['No records found', '', '', '']],
        ...tableStyles
      });

      // --- PAGE 10: SALARY SLIPS ---
      doc.addPage();
      addPageHeader('Salary Slips');
      const salaryTable = (salaries.data || []).map((s: any) => [
        s.name,
        s.employee,
        dayjs(s.pay_period_start).format('DD MMM YYYY'),
        dayjs(s.pay_period_end).format('DD MMM YYYY'),
        fNumber(s.grand_gross_pay),
        fNumber(s.grand_net_pay),
        s.docstatus === 1 ? 'Submitted' : 'Draft',
      ]);
      autoTable(doc, {
        startY: 40,
        head: [['Slip ID', 'Employee ID', 'Start', 'End', 'Gross', 'Net', 'Status']],
        body: salaryTable.length > 0 ? salaryTable : [['No records found', '', '', '', '', '', '']],
        ...tableStyles
      });

      doc.save(`Employee_Overall_Report_Structured_${dayjs().format('YYYY-MM-DD')}.pdf`);
      enqueueSnackbar('PDF exported successfully!', { variant: 'success' });

    } catch (error) {
      console.error('PDF Export failed:', error);
      enqueueSnackbar('Failed to export detailed PDF. Please try again.', { variant: 'error' });
    } finally {
      setExportingPdf(false);
    }
  };

  const handleReset = () => {
    setJoiningDateFrom(null);
    setJoiningDateTo(null);
    setFilterDepartment('all');
    setFilterDesignation('all');
    setFilterStatus('all');
    setFilterEmployee([]);
    setOrder('desc');
  };

  const onChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const onChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const handleSortChange = (event: SelectChangeEvent) => {
    setOrder(event.target.value as 'asc' | 'desc');
  };

  return (
    <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h4">Employee Overall Report</Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:refresh-bold" />}
              onClick={refetch}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Iconify icon="solar:restart-bold" />}
              onClick={handleReset}
            >
              Reset
            </Button>
          </Stack>
        </Stack>

        <Card
          sx={{
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            bgcolor: 'background.neutral',
            border: (t) => `1px solid ${t.palette.divider}`,
          }}
        >
          <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                format="DD-MM-YYYY"
                value={joiningDateFrom}
                label="Joining Date From"
                onChange={(newValue) => setJoiningDateFrom(newValue)}
                slotProps={{
                  textField: {
                    size: 'small',
                    InputLabelProps: { shrink: true },
                    sx: {
                      flexGrow: 1,
                      maxWidth: 200,
                    },
                  },
                }}
              />
              <DatePicker
                format="DD-MM-YYYY"
                value={joiningDateTo}
                label="Joining Date To"
                onChange={(newValue) => setJoiningDateTo(newValue)}
                slotProps={{
                  textField: {
                    size: 'small',
                    InputLabelProps: { shrink: true },
                    sx: {
                      flexGrow: 1,
                      maxWidth: 200,
                    },
                  },
                }}
              />
            </LocalizationProvider>

            <Autocomplete
              size="small"
              sx={{ flexGrow: 1, minWidth: 180 }}
              options={[{ name: 'all', department_name: 'All Departments' }, ...departments]}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                return option.department_name || option.name;
              }}
              isOptionEqualToValue={(option, value) => option.name === value.name}
              value={filterDepartment === 'all'
                ? { name: 'all', department_name: 'All Departments' }
                : (departments.find((opt) => opt.name === filterDepartment) || null)
              }
              onChange={(event, newValue) => {
                setFilterDepartment(newValue?.name || 'all');
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Department"
                  placeholder="Select Department"
                />
              )}
            />

            <TextField
              size="small"
              label="Designation"
              placeholder="Type Designation"
              sx={{ flexGrow: 1, minWidth: 180 }}
              value={filterDesignation === 'all' ? '' : filterDesignation}
              onChange={(e) => setFilterDesignation(e.target.value || 'all')}
            />

            <FormControl size="small" sx={{ flexGrow: 1, minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                {STATUS_OPTIONS.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Sort</InputLabel>
              <Select value={order} label="Sort" onChange={handleSortChange}>
                <MenuItem value="desc">Newest First</MenuItem>
                <MenuItem value="asc">Oldest First</MenuItem>
              </Select>
            </FormControl>

            <Autocomplete
              multiple
              disableCloseOnSelect
              size="small"
              sx={{ flexGrow: 1, minWidth: 350 }}
              options={employeeOptions}
              getOptionLabel={(option) => `${option.employee_name} (${option.name})`}
              isOptionEqualToValue={(option, value) => option.name === value.name}
              value={employeeOptions.filter((emp) =>
                filterEmployee.includes(emp.name)
              )}
              onChange={(event, newValue) => {
                setFilterEmployee(newValue.map((emp) => emp.name));
              }}
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
                    <Iconify icon={"solar:check-circle-bold" as any} width={20} sx={{ color: 'primary.main', ml: 1 }} />
                  )}
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Employee"
                  placeholder="Select Employee(s)"
                />
              )}
            />

            {canExport && (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  startIcon={exporting ? undefined : <Iconify icon="solar:export-bold" />}
                  onClick={handleExport}
                  disabled={exporting || data.length === 0}
                  sx={{
                    bgcolor: '#0ea5e9',
                    color: 'common.white',
                    '&:hover': { bgcolor: '#0284c7' },
                    height: 40,
                    px: 3,
                  }}
                >
                  {exporting ? 'Exporting Excel...' : 'Export Excel'}
                </Button>

                <Button
                  variant="contained"
                  startIcon={exportingPdf ? undefined : <Iconify icon={"solar:file-download-bold" as any} />}
                  onClick={handleExportPdf}
                  disabled={exportingPdf || data.length === 0}
                  sx={{
                    bgcolor: '#f43f5e',
                    color: 'common.white',
                    '&:hover': { bgcolor: '#e11d48' },
                    height: 40,
                    px: 3,
                  }}
                >
                  {exportingPdf ? 'Exporting PDF...' : 'Export PDF'}
                </Button>
              </Stack>
            )}
          </Stack>
        </Card>

        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
          }}
        >
          <SummaryCard item={{ label: 'Total Employees', value: summary.total, indicator: 'blue' }} />
          <SummaryCard item={{ label: 'Active Employees', value: summary.active, indicator: 'green' }} />
          <SummaryCard item={{ label: 'Inactive Employees', value: summary.inactive, indicator: 'red' }} />
          <SummaryCard item={{ label: 'Departments', value: summary.departments, indicator: 'orange' }} />
        </Box>

        <Card>
          <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
            <Scrollbar>
              <Table size="medium" stickyHeader sx={{ borderCollapse: 'collapse' }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f4f6f8' }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selected.length > 0 && selected.length < data.length}
                        checked={data.length > 0 && selected.length === data.length}
                        onChange={handleSelectAllClick}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Employee</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Department</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Designation</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Joining Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', position: 'sticky', right: 0, bgcolor: '#f4f6f8', zIndex: 11 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                        <CircularProgress sx={{ color: '#059669' }} />
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {data.map((row, index) => {
                        const isSelected = selected.indexOf(row.name) !== -1;
                        return (
                          <TableRow
                            key={row.name}
                            hover
                            selected={isSelected}
                            aria-checked={isSelected}
                            role="checkbox"
                          >
                            <TableCell padding="checkbox">
                              <Checkbox checked={isSelected} onClick={(event) => handleClick(event, row.name)} />
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" alignItems="center" spacing={2}>
                                <Avatar
                                  src={row.profile_picture || ''}
                                  alt={row.employee_name}
                                  sx={{
                                    width: 36,
                                    height: 36,
                                    fontSize: 14,
                                    fontWeight: 'bold',
                                    bgcolor: stringToColor(row.employee_name),
                                    color: stringToDarkColor(row.employee_name),
                                  }}
                                >
                                  {row.employee_name?.charAt(0).toUpperCase()}
                                </Avatar>
                                <Stack spacing={0.25}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                    {row.employee_name}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    ID: {row.name}
                                  </Typography>
                                </Stack>
                              </Stack>
                            </TableCell>
                            <TableCell>{row.department}</TableCell>
                            <TableCell>{row.designation}</TableCell>
                            <TableCell>{fDate(row.date_of_joining, 'DD-MM-YYYY')}</TableCell>
                            <TableCell>
                              <Typography
                                variant="caption"
                                sx={{
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 0.75,
                                  fontWeight: 'bold',
                                  bgcolor: row.status === 'Active' ? 'success.lighter' : 'error.lighter',
                                  color: row.status === 'Active' ? 'success.dark' : 'error.dark',
                                }}
                              >
                                {row.status}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ position: 'sticky', right: 0, bgcolor: 'background.paper' }}>
                              <IconButton onClick={() => handleViewDetails(row.name)} sx={{ color: 'info.main' }}>
                                <Iconify icon="solar:eye-bold" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}

                      {data.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                            <Stack spacing={1} alignItems="center">
                              <Iconify icon={"eva:slash-outline" as any} width={48} sx={{ color: 'text.disabled' }} />
                              <Typography variant="body2" sx={{ color: 'text.disabled' }}>No Employees found</Typography>
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
            count={total}
            page={page}
            onPageChange={onChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={onChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50]}
          />
        </Card>
      </Stack>

      <EmployeeReportDetailsDialog
        open={openDetails}
        employeeId={selectedEmployeeId}
        onClose={() => {
          setOpenDetails(false);
          setSelectedEmployeeId(null);
        }}
      />
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function SummaryCard({ item }: { item: any }) {
  const theme = useTheme();

  const getIndicatorColor = (indicator: string) => {
    switch (indicator?.toLowerCase()) {
      case 'blue': return theme.palette.info.main;
      case 'green': return theme.palette.success.main;
      case 'orange': return theme.palette.warning.main;
      case 'red': return theme.palette.error.main;
      default: return theme.palette.primary.main;
    }
  };

  const getIcon = (label: string) => {
    const t = label.toLowerCase();
    if (t.includes('total')) return 'solar:users-group-rounded-bold-duotone';
    if (t.includes('active')) return 'solar:user-check-bold-duotone';
    if (t.includes('inactive')) return 'solar:user-cross-bold-duotone';
    if (t.includes('departments')) return 'solar:structure-bold-duotone';
    return 'solar:chart-2-bold-duotone';
  };

  const color = getIndicatorColor(item.indicator);

  return (
    <Card
      sx={{
        p: 3,
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
      <Stack direction="row" alignItems="center" spacing={2.5}>
        <Box
          sx={{
            width: 48,
            height: 48,
            flexShrink: 0,
            display: 'flex',
            borderRadius: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
            color,
            bgcolor: alpha(color, 0.1),
          }}
        >
          <Iconify icon={getIcon(item.label) as any} width={28} />
        </Box>

        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, mb: 0.5 }}>
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
