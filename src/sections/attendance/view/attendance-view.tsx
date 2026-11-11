import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { alpha } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import TablePagination from '@mui/material/TablePagination';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import FormControlLabel from '@mui/material/FormControlLabel';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { MenuItem, IconButton, CircularProgress } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useAttendance } from 'src/hooks/useAttendance';

import { filterEmployeeOptions } from 'src/utils/filter-employees';
import {
    formatMinutesAsHHMM,
    parseShiftDurationMinutes,
    computeAttendanceElapsedMinutes,
} from 'src/utils/format-time';

import { getDoctypeList } from 'src/api/leads';
import { DashboardContent } from 'src/layouts/dashboard';
import { getApplicableShift } from 'src/api/shift-roster';
import { getHRDoc, getHRPermissions } from 'src/api/hr-management';
import { fetchAttendance, createAttendance, updateAttendance, deleteAttendance } from 'src/api/attendance';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { useAuth } from 'src/auth/auth-context';

import { TableNoData } from '../../lead/table-no-data';
import { TableEmptyRows } from '../../lead/table-empty-rows';
import { AttendanceTableRow } from '../attendance-table-row';
import { AttendanceSyncDialog } from '../attendance-sync-dialog';
import { BiometricPunchesTable } from '../biometric-punches-table';
import { AttendanceImportDialog } from '../attendance-import-dialog';
import { LeadTableHead as AttendanceTableHead } from '../../lead/lead-table-head';
import { AttendanceTableFiltersDrawer } from '../attendance-table-filters-drawer';
import { LeadTableToolbar as AttendanceTableToolbar } from '../../lead/lead-table-toolbar';
import { AttendanceDetailsDialog } from '../../report/attendance/attendance-details-dialog';

// ----------------------------------------------------------------------

export function AttendanceView() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.attendance_list;
    const canCreateAttendace = hasCustomPerms && user?.permissions?.actions?.attendance_list ? !!user?.permissions?.actions?.attendance_list?.create : true;
    const canImportAttendace = hasCustomPerms && user?.permissions?.actions?.attendance_list ? !!user?.permissions?.actions?.attendance_list?.import : true;

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [orderBy, setOrderBy] = useState('modified');
    const [selected, setSelected] = useState<string[]>([]);

    const [openCreate, setOpenCreate] = useState(false);
    const [openImport, setOpenImport] = useState(false);
    const [openSync, setOpenSync] = useState(false);
    const [creating, setCreating] = useState(false);
    const [currentAttendanceId, setCurrentAttendanceId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({
        status: 'Present',
        attendance_date: dayjs().format('YYYY-MM-DD'),
    });
    const [touched, setTouched] = useState(false);
    const [loadingDoc, setLoadingDoc] = useState(false);

    const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
    const [shiftList, setShiftList] = useState<any[]>([]);
    const [existingAttendanceDates, setExistingAttendanceDates] = useState<string[]>([]);
    const [resolvedShiftMeta, setResolvedShiftMeta] = useState<Record<string, any> | null>(null);
    const [resolvingShift, setResolvingShift] = useState(false);
    const shiftResolveSeqRef = useRef(0);

    // Filter State
    const [filterStatus, setFilterStatus] = useState('all');
    const [startDate, setStartDate] = useState<string | null>(null);
    const [endDate, setEndDate] = useState<string | null>(null);
    const [filterEmployee, setFilterEmployee] = useState<string | null>(null);
    const [openFilters, setOpenFilters] = useState(false);

    // Alert & Dialog State
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const [serverAlert, setServerAlert] = useState<{ message: string, severity: 'success' | 'error' | 'warning' | 'info' }>({
        message: '',
        severity: 'info'
    });

    const [openDetails, setOpenDetails] = useState(false);
    const [detailsId, setDetailsId] = useState<string | null>(null);

    // Permissions State
    const [permissions, setPermissions] = useState<{ read: boolean; write: boolean; delete: boolean }>({
        read: true,
        write: true,
        delete: true,
    });

    const isHR = user?.roles?.some((role: string) =>
        ['HR Manager', 'HR', 'System Manager', 'Administrator'].includes(role)
    );

    const isSystemManager = user?.roles?.some((role: string) =>
        ['System Manager', 'Administrator'].includes(role)
    );

    // Super Admin: User must have BOTH (HR or HR Manager) AND System Manager roles, OR be Administrator
    const hasHRRole = user?.roles?.some((role: string) => ['HR', 'HR Manager'].includes(role));
    const hasSMRole = user?.roles?.some((role: string) => ['System Manager', 'Administrator'].includes(role));
    const isSuperAdmin = (hasHRRole && hasSMRole) || user?.roles?.includes('Administrator');

    const effectiveEmployee = isHR ? filterEmployee : user?.employee;

    const { data, total, loading, refetch } = useAttendance(
        page + 1,
        rowsPerPage,
        filterName,
        orderBy,
        order,
        startDate || undefined,
        endDate || undefined,
        filterStatus,
        effectiveEmployee
    );

    const notFound = !data.length && !!filterName;
    const empty = !data.length && !filterName && !loading;

    useEffect(() => {
        getHRPermissions('Attendance').then(setPermissions);
        getDoctypeList('Employee', ['name', 'employee_name', 'shift']).then(setEmployeeOptions).catch(console.error);
        getDoctypeList('Shift', [
            'name',
            'shift_name',
            'start_time',
            'end_time',
            'lunch_hours',
            'break_hours',
            'allow_overtime',
            'overtime_hours',
            'min_overtime_minutes',
        ]).then(setShiftList).catch(console.error);
    }, []);

    const handleOpenCreate = () => {
        shiftResolveSeqRef.current += 1;
        setResolvingShift(false);
        setResolvedShiftMeta(null);
        setFormData({
            status: 'Present',
            attendance_date: dayjs().format('YYYY-MM-DD'),
            attendance_punches: [],
            manual: 1,
            attendance_source: 'Manual',
        });
        setExistingAttendanceDates([]);
        setCurrentAttendanceId(null);
        setTouched(false);
        setOpenCreate(true);
    };

    const handleCloseCreate = () => {
        shiftResolveSeqRef.current += 1;
        setResolvingShift(false);
        setResolvedShiftMeta(null);
        setOpenCreate(false);
        setCurrentAttendanceId(null);
        setTouched(false);
        setLoadingDoc(false);
    };

    const handleOpenImport = () => {
        setOpenImport(true);
    };

    const handleCloseImport = () => {
        setOpenImport(false);
    };

    const getShiftDoc = (employeeId?: string, shiftId?: string, attendanceDate?: string) => {
        const cleanShiftId = shiftId?.trim();
        if (cleanShiftId) {
            const found = shiftList.find((s) => s.name === cleanShiftId || s.shift_name === cleanShiftId);
            if (found) return found;
            if (
                resolvedShiftMeta?.details &&
                (resolvedShiftMeta.shift === cleanShiftId || resolvedShiftMeta.shiftName === cleanShiftId)
            ) {
                return {
                    name: resolvedShiftMeta.shift,
                    shift_name: resolvedShiftMeta.shiftName,
                    ...resolvedShiftMeta.details,
                };
            }
        }
        // When resolution ran for the active employee & date and returned no shift, do not fall back to stale cache
        if (
            resolvedShiftMeta?.resolved &&
            resolvedShiftMeta.employee === employeeId &&
            resolvedShiftMeta.attendanceDate === attendanceDate &&
            !resolvedShiftMeta.shift
        ) {
            return null;
        }
        if (employeeId) {
            const emp = employeeOptions.find((e) => e.name === employeeId);
            if (emp?.shift) {
                const found = shiftList.find((s) => s.name === emp.shift || s.shift_name === emp.shift);
                if (found) return found;
            }
        }
        return null;
    };

    const calculateHoursAndOvertime = (inTime?: string, outTime?: string, shiftObj?: any) => {
        if (!inTime || !outTime || inTime === '00:00:00' || outTime === '00:00:00') {
            return {
                workingHoursDisplay: '0:00',
                workingHoursDecimal: 0,
                officialOvertime: '0:00',
                unofficialOvertime: '0:00',
            };
        }

        const start = dayjs(`2000-01-01 ${inTime}`);
        let end = dayjs(`2000-01-01 ${outTime}`);

        if (!start.isValid() || !end.isValid()) {
            return {
                workingHoursDisplay: '0:00',
                workingHoursDecimal: 0,
                officialOvertime: '0:00',
                unofficialOvertime: '0:00',
            };
        }

        // Overnight shift support (matches Frappe Python & JS)
        if (end.isBefore(start)) {
            end = end.add(1, 'day');
        }

        const totalMinutes = end.diff(start, 'minute');
        if (totalMinutes <= 0) {
            return {
                workingHoursDisplay: '0:00',
                workingHoursDecimal: 0,
                officialOvertime: '0:00',
                unofficialOvertime: '0:00',
            };
        }

        // Deduct lunch & break hours from elapsed time
        const totalBreakMinutes = shiftObj
            ? parseShiftDurationMinutes(shiftObj.lunch_hours) + parseShiftDurationMinutes(shiftObj.break_hours)
            : 0;

        const netWorkingMinutes =
            totalMinutes > totalBreakMinutes ? totalMinutes - totalBreakMinutes : totalMinutes;

        const regHours = Math.floor(netWorkingMinutes / 60);
        const regMinutes = netWorkingMinutes % 60;
        const workingHoursDecimal = parseFloat((netWorkingMinutes / 60).toFixed(2));
        const workingHoursDisplay = `${regHours}:${regMinutes.toString().padStart(2, '0')}`;

        // Overtime calculation (matches Frappe backend logic)
        let officialOvertime = '0:00';
        let unofficialOvertime = '0:00';

        if (shiftObj && shiftObj.end_time) {
            let sEnd = dayjs(`2000-01-01 ${shiftObj.end_time}`);
            let shiftStandardMinutes = 9 * 60 - totalBreakMinutes;

            if (shiftObj.start_time) {
                const sStart = dayjs(`2000-01-01 ${shiftObj.start_time}`);
                if (sEnd.isBefore(sStart)) sEnd = sEnd.add(1, 'day');
                const shiftDurationMinutes = sEnd.diff(sStart, 'minute');
                shiftStandardMinutes = Math.max(0, shiftDurationMinutes - totalBreakMinutes);
            }

            const postShiftMinutes = Math.max(0, end.diff(sEnd, 'minute'));
            const excessWorkedMinutes = Math.max(0, netWorkingMinutes - shiftStandardMinutes);

            let extraMinutes = postShiftMinutes > 0 ? Math.min(postShiftMinutes, excessWorkedMinutes) : 0;
            const minThreshold = parseInt(shiftObj.min_overtime_minutes, 10) || 0;
            if (extraMinutes < minThreshold) {
                extraMinutes = 0;
            }

            const unoffH = Math.floor(extraMinutes / 60);
            const unoffM = extraMinutes % 60;
            unofficialOvertime = `${unoffH}:${unoffM.toString().padStart(2, '0')}`;

            let offMins = 0;
            if (shiftObj.allow_overtime) {
                const maxOff = (parseFloat(shiftObj.overtime_hours) || 0) * 60;
                offMins = Math.min(extraMinutes, maxOff);
            }
            const offH = Math.floor(offMins / 60);
            const offM = offMins % 60;
            officialOvertime = `${offH}:${offM.toString().padStart(2, '0')}`;
        } else {
            const overtimeMinutes = Math.max(0, netWorkingMinutes - 9 * 60);
            const otHours = Math.floor(overtimeMinutes / 60);
            const otMins = overtimeMinutes % 60;
            officialOvertime = `${otHours}:${otMins.toString().padStart(2, '0')}`;
            unofficialOvertime = `${otHours}:${otMins.toString().padStart(2, '0')}`;
        }

        return {
            workingHoursDisplay,
            workingHoursDecimal,
            officialOvertime,
            unofficialOvertime,
        };
    };

    const applyWorkingHours = (targetForm: Record<string, any>, shiftDoc: any) => {
        if (!targetForm.in_time || !targetForm.out_time) {
            return targetForm;
        }
        const { workingHoursDisplay, workingHoursDecimal, officialOvertime, unofficialOvertime } =
            calculateHoursAndOvertime(targetForm.in_time, targetForm.out_time, shiftDoc);
        return {
            ...targetForm,
            working_hours_display: workingHoursDisplay,
            working_hours_decimal: workingHoursDecimal,
            official_overtime: officialOvertime,
            unofficial_overtime: unofficialOvertime,
        };
    };

    const resolveShiftForForm = async (employeeId: string, attendanceDate: string) => {
        const reqSeq = ++shiftResolveSeqRef.current;
        if (!employeeId || !attendanceDate) {
            setResolvingShift(false);
            setResolvedShiftMeta(null);
            return;
        }

        setResolvingShift(true);
        try {
            const resolved = await getApplicableShift(employeeId, attendanceDate);
            if (shiftResolveSeqRef.current !== reqSeq) return;

            const resolvedShiftId = resolved?.shift || '';
            const meta = {
                employee: employeeId,
                attendanceDate,
                resolved: true,
                shift: resolvedShiftId,
                shiftName: resolved?.shift_name || resolvedShiftId,
                source: resolved?.source,
                details: resolved?.details || null,
            };
            setResolvedShiftMeta(meta);

            const shiftObj =
                (resolvedShiftId &&
                    shiftList.find((s) => s.name === resolvedShiftId || s.shift_name === resolvedShiftId)) ||
                (resolved?.details
                    ? { name: resolvedShiftId, shift_name: resolved.shift_name, ...resolved.details }
                    : null);

            setFormData((prevForm: Record<string, any>) => {
                if (prevForm.employee !== employeeId || prevForm.attendance_date !== attendanceDate) {
                    return prevForm;
                }
                const updatedForm = { ...prevForm, shift: resolvedShiftId };
                return applyWorkingHours(updatedForm, shiftObj);
            });
        } catch (err) {
            if (shiftResolveSeqRef.current !== reqSeq) return;
            console.error('Failed to resolve applicable shift:', err);
            const fallbackEmp = employeeOptions.find((e) => e.name === employeeId);
            const fallbackShift = fallbackEmp?.shift || '';
            setResolvedShiftMeta(null);
            const fallbackShiftDoc = fallbackShift
                ? shiftList.find((s) => s.name === fallbackShift || s.shift_name === fallbackShift) || null
                : null;
            setFormData((prevForm: Record<string, any>) => {
                if (prevForm.employee !== employeeId || prevForm.attendance_date !== attendanceDate) {
                    return prevForm;
                }
                return applyWorkingHours({ ...prevForm, shift: fallbackShift }, fallbackShiftDoc);
            });
        } finally {
            if (shiftResolveSeqRef.current === reqSeq) {
                setResolvingShift(false);
            }
        }
    };

    const handleInputChange = (fieldname: string, value: any) => {
        const nextEmployee = fieldname === 'employee' ? value : formData.employee;
        const nextDate = fieldname === 'attendance_date' ? value : formData.attendance_date;

        setFormData((prev: Record<string, any>) => {
            const next = { ...prev, [fieldname]: value };

            if (fieldname === 'manual') {
                next.manual = value ? 1 : 0;
            }

            if (fieldname === 'employee') {
                const emp = employeeOptions.find((e) => e.name === value);
                // Clear stale shift synchronously if newly selected employee has no default shift
                next.shift = emp?.shift || '';
            }

            // Recalculate working hours immediately on employee, date, or time change
            if (
                fieldname === 'in_time' ||
                fieldname === 'out_time' ||
                fieldname === 'employee' ||
                fieldname === 'attendance_date'
            ) {
                const shiftDoc = getShiftDoc(next.employee, next.shift, next.attendance_date);
                return applyWorkingHours(next, shiftDoc);
            }
            return next;
        });

        if (fieldname === 'employee' || fieldname === 'attendance_date') {
            resolveShiftForForm(nextEmployee, nextDate);
        }

        // When employee is selected, fetch their existing attendance dates to disable in DatePicker
        if (fieldname === 'employee') {
            if (value) {
                fetchAttendance({
                    page: 1,
                    page_size: 100,
                    filters: [
                        ['Attendance', 'employee', '=', value],
                        ['Attendance', 'docstatus', '!=', 2]
                    ],
                    fields: ['attendance_date']
                }).then((res: any) => {
                    const dates = (res?.data || []).map((r: any) => r.attendance_date).filter(Boolean);
                    setExistingAttendanceDates(dates);
                    // If current attendance_date already exists for this employee, clear it in Add mode
                    if (!currentAttendanceId && formData.attendance_date && dates.includes(formData.attendance_date)) {
                        shiftResolveSeqRef.current += 1;
                        setResolvingShift(false);
                        setResolvedShiftMeta(null);
                        setFormData((prev: any) => ({
                            ...prev,
                            attendance_date: '',
                            shift: '',
                        }));
                    }
                }).catch(() => {
                    setExistingAttendanceDates([]);
                });
            } else {
                setExistingAttendanceDates([]);
            }
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar((prev: any) => ({ ...prev, open: false }));
    };

    const handleDeleteClick = (id: string) => {
        setConfirmDelete({ open: true, id });
    };

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        try {
            await deleteAttendance(confirmDelete.id);
            setSnackbar({ open: true, message: 'Attendance record deleted successfully', severity: 'success' });
            await refetch();
        } catch (e: any) {
            console.error(e);
            setSnackbar({ open: true, message: e.message || 'Failed to delete record', severity: 'error' });
        } finally {
            setConfirmDelete({ open: false, id: null });
        }
    };

    const validateForm = () => {
        if (!formData.employee) return 'Employee is required';
        if (!formData.attendance_date) return 'Attendance Date is required';
        if (!formData.status) return 'Status is required';

        // Time validation for Present/Half Day
        if (formData.status === 'Present' || formData.status === 'Half Day') {
            if (!formData.in_time) return 'In Time is required for ' + formData.status;
            if (!formData.out_time) return 'Out Time is required for ' + formData.status;
        }

        // Logical time check (allow overnight clock times where out_time < in_time)
        if (
            formData.in_time &&
            formData.out_time &&
            formData.in_time !== '00:00:00' &&
            formData.out_time !== '00:00:00'
        ) {
            const start = dayjs(`2000-01-01 ${formData.in_time}`);
            const end = dayjs(`2000-01-01 ${formData.out_time}`);
            if (!start.isValid() || !end.isValid()) {
                return 'Invalid In Time or Out Time';
            }
            if (end.isSame(start)) {
                return 'Out Time must differ from In Time';
            }
        }

        return null;
    };

    const handleCreate = async () => {
        setTouched(true);
        const error = validateForm();
        if (error) {
            setSnackbar({ open: true, message: error, severity: 'error' });
            return;
        }

        try {
            setCreating(true);
            setServerAlert({ message: '', severity: 'info' });

            // Duplicate Check: Check if attendance already exists for this employee on this date
            const existing = await fetchAttendance({
                page: 1,
                page_size: 1,
                filters: [
                    ['Attendance', 'employee', '=', formData.employee],
                    ['Attendance', 'attendance_date', '=', formData.attendance_date]
                ]
            });

            if (existing.data.length > 0 && existing.data[0].name !== currentAttendanceId) {
                setSnackbar({ open: true, message: `Attendance already marked for ${formData.employee} on ${formData.attendance_date}`, severity: 'error' });
                setCreating(false);
                return;
            }

            const sanitizedPunches = (formData.attendance_punches || []).filter(
                (p: any) => p.punch_time && dayjs(p.punch_time).isValid()
            );
            const payload = {
                ...formData,
                manual: 1,
                attendance_source: 'Manual',
                attendance_punches: sanitizedPunches,
            };

            if (currentAttendanceId) {
                await updateAttendance(currentAttendanceId, payload as any);
                setSnackbar({ open: true, message: 'Attendance updated successfully', severity: 'success' });
            } else {
                await createAttendance(payload as any);
                setSnackbar({ open: true, message: 'Attendance marked successfully', severity: 'success' });
            }

            await refetch();
            handleCloseCreate();
        } catch (err: any) {
            console.error(err);
            setServerAlert({ message: err.message || 'Error saving attendance', severity: 'error' });
        } finally {
            setCreating(false);
        }
    };

    const handlePunchesChange = (updatedPunches: any[]) => {
        // Find valid punches with timestamp
        const validPunches = updatedPunches.filter((p) => p.punch_time && dayjs(p.punch_time).isValid());

        const extractTime = (val: string) => {
            if (!val) return null;
            const parts = String(val).trim().split(' ');
            let t = parts[parts.length - 1];
            if (t.length === 5) t += ':00';
            return t;
        };

        // Match Frappe Admin logic (attendance.py & attendance.js):
        // In Time is derived from the first 'IN' punch (or first valid punch)
        // Out Time is derived from the last 'OUT' punch (or last valid punch if > 1 punches)
        const inPunches = validPunches.filter((p) => p.punch_type === 'IN');
        const outPunches = validPunches.filter((p) => p.punch_type === 'OUT');

        const firstIn = inPunches.length > 0 ? inPunches[0] : validPunches[0];
        const lastOut = outPunches.length > 0 ? outPunches[outPunches.length - 1] : (validPunches.length > 1 ? validPunches[validPunches.length - 1] : null);

        setFormData((prev: any) => {
            const inTimeStr = (firstIn && extractTime(firstIn.punch_time)) || prev.in_time;
            const outTimeStr = (lastOut && extractTime(lastOut.punch_time)) || prev.out_time;
            const activeShift = getShiftDoc(prev.employee, prev.shift, prev.attendance_date);
            return applyWorkingHours(
                {
                    ...prev,
                    attendance_punches: updatedPunches,
                    manual: 1,
                    in_time: inTimeStr,
                    out_time: outTimeStr,
                    ...(validPunches.length > 0 && prev.status === 'Absent' ? { status: 'Present' } : {}),
                },
                activeShift
            );
        });
    };

    const handleEditRow = (id: string) => {
        shiftResolveSeqRef.current += 1;
        const editSeq = shiftResolveSeqRef.current;
        setResolvedShiftMeta(null);
        setResolvingShift(false);
        setCurrentAttendanceId(id);
        const fullRow = data.find((item: any) => item.name === id);
        if (fullRow) {
            setFormData({ ...fullRow, attendance_punches: [] });
        }
        setTouched(false);
        setLoadingDoc(true);
        setOpenCreate(true);

        getHRDoc('Attendance', id)
            .then(async (doc) => {
                if (!doc) return;

                let effectiveShift = (doc.shift || '').trim();
                let shiftDoc = effectiveShift
                    ? getShiftDoc(doc.employee, effectiveShift, doc.attendance_date)
                    : null;

                // Automatically resolve Shift when an existing Attendance row was saved with empty shift
                if (!effectiveShift && doc.employee && doc.attendance_date) {
                    try {
                        const resolved = await getApplicableShift(doc.employee, doc.attendance_date);
                        if (shiftResolveSeqRef.current !== editSeq) return;

                        effectiveShift = resolved?.shift || '';
                        setResolvedShiftMeta({
                            employee: doc.employee,
                            attendanceDate: doc.attendance_date,
                            resolved: true,
                            shift: effectiveShift,
                            shiftName: resolved?.shift_name || effectiveShift,
                            source: resolved?.source,
                            details: resolved?.details || null,
                        });
                        if (effectiveShift) {
                            shiftDoc =
                                shiftList.find(
                                    (s) => s.name === effectiveShift || s.shift_name === effectiveShift
                                ) ||
                                (resolved?.details
                                    ? {
                                          name: effectiveShift,
                                          shift_name: resolved.shift_name,
                                          ...resolved.details,
                                      }
                                    : null);
                        }
                    } catch (err) {
                        console.error('Failed to resolve shift during edit:', err);
                        shiftDoc = getShiftDoc(doc.employee, undefined, doc.attendance_date);
                        effectiveShift = shiftDoc?.name || '';
                    }
                } else if (effectiveShift) {
                    setResolvedShiftMeta({
                        employee: doc.employee,
                        attendanceDate: doc.attendance_date,
                        resolved: true,
                        shift: effectiveShift,
                        shiftName: shiftDoc?.shift_name || effectiveShift,
                        details: shiftDoc || null,
                    });
                }

                const nextForm = applyWorkingHours(
                    {
                        ...doc,
                        shift: effectiveShift,
                        attendance_punches: doc.attendance_punches || [],
                    },
                    shiftDoc
                );

                setFormData((prev: any) => ({
                    ...prev,
                    ...nextForm,
                }));
            })
            .catch(console.error)
            .finally(() => {
                setLoadingDoc(false);
            });
    };

    const handleOpenDetails = (id: string) => {
        setDetailsId(id);
        setOpenDetails(true);
    };

    const handleCloseDetails = () => {
        setOpenDetails(false);
        setDetailsId(null);
    };

    const handleOpenFilters = () => {
        setOpenFilters(true);
    };

    const handleCloseFilters = () => {
        setOpenFilters(false);
    };

    const handleFilters = (update: any) => {
        if (update.startDate !== undefined) setStartDate(update.startDate);
        if (update.endDate !== undefined) setEndDate(update.endDate);
        if (update.status !== undefined) setFilterStatus(update.status);
        if (update.employee !== undefined) setFilterEmployee(update.employee);
        setPage(0);
    };

    const handleResetFilters = () => {
        setStartDate(null);
        setEndDate(null);
        setFilterStatus('all');
        setFilterEmployee(null);
        setFilterName('');
        setPage(0);
    };



    const handleSelectAllRows = (checked: boolean) => {
        const currentPageIds = data.map((n) => n.name);
        if (checked) {
            setSelected((prev) => Array.from(new Set([...prev, ...currentPageIds])));
        } else {
            const pageIdSet = new Set(currentPageIds);
            setSelected((prev) => prev.filter((id) => !pageIdSet.has(id)));
        }
    };

    const handleSelectRow = (id: string) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        if (!selected.length) return;
        try {
            setBulkDeleting(true);
            await Promise.all(selected.map((id) => deleteAttendance(id)));
            setSnackbar({ open: true, message: `${selected.length} records deleted successfully`, severity: 'success' });
            setSelected([]);
            await refetch();
        } catch (e: any) {
            setSnackbar({ open: true, message: e.message || 'Error during bulk delete', severity: 'error' });
        } finally {
            setBulkDeleting(false);
            setConfirmBulkDelete(false);
        }
    };

    const renderField = (fieldname: string, label: string, type: string = 'text', options: any[] = [], extraProps: any = {}, required: boolean = false) => {

        // ✅ HIDDEN FIELD HANDLING (ADD THIS)
        if (type === 'hidden' || extraProps?.hidden) {
            return (
                <input
                    type="hidden"
                    name={fieldname}
                    value={formData[fieldname] || ''}
                />
            );
        }

        let errorMsg = '';
        if (touched) {
            if (required && !formData[fieldname]) {
                errorMsg = `${label} is required`;
            } else if ((fieldname === 'in_time' || fieldname === 'out_time') && (formData.status === 'Present' || formData.status === 'Half Day') && !formData[fieldname]) {
                errorMsg = `${label} is required for ${formData.status}`;
            }
        }

        const commonProps = {
            fullWidth: true,
            label,
            value: formData[fieldname] || '',
            onChange: (e: any) => handleInputChange(fieldname, e.target.value),
            InputLabelProps: { shrink: true },
            required,
            error: !!errorMsg,
            helperText: errorMsg,
            ...extraProps,
            sx: {
                '& .MuiFormLabel-asterisk': {
                    color: 'red',
                },
                ...extraProps.sx
            }
        };

        if (type === 'select' || type === 'link') {
            return (
                <TextField {...commonProps} select>
                    <MenuItem value="" disabled>Select {label}</MenuItem>
                    {options.map((opt: any) => (
                        <MenuItem key={opt.name || opt} value={opt.name || opt}>
                            {opt.employee_name ? `${opt.employee_name} (${opt.name})` : (opt.name || opt)}
                        </MenuItem>
                    ))}
                </TextField>
            );
        }

        if (type === 'date') {
            return (
                <DatePicker
                    label={label}
                    value={formData[fieldname] ? dayjs(formData[fieldname]) : null}
                    onChange={(newValue) => handleInputChange(fieldname, newValue?.format('YYYY-MM-DD') || '')}
                    format="DD-MM-YYYY"
                    shouldDisableDate={(date) => {
                        if (!date) return false;
                        if (extraProps?.shouldDisableDate) {
                            return extraProps.shouldDisableDate(date);
                        }
                        return false;
                    }}
                    slotProps={{
                        textField: {
                            fullWidth: true,
                            required,
                            InputLabelProps: { shrink: true },
                            error: !!errorMsg,
                            helperText: errorMsg,
                            sx: commonProps.sx
                        }
                    }}
                />
            );
        }

        if (type === 'time') {
            return (
                <TimePicker
                    label={label}
                    value={formData[fieldname] ? dayjs(`2000-01-01 ${formData[fieldname]}`) : null}
                    onChange={(newValue) => handleInputChange(fieldname, newValue?.format('HH:mm:ss') || '')}
                    views={['hours', 'minutes', 'seconds']}
                    format="hh:mm:ss A"
                    timeSteps={{ hours: 1, minutes: 1, seconds: 1 }}
                    slotProps={{
                        textField: {
                            fullWidth: true,
                            required,
                            InputLabelProps: { shrink: true },
                            error: !!errorMsg,
                            helperText: errorMsg,
                            sx: commonProps.sx
                        }
                    }}
                />
            );
        }

        if (type === 'checkbox') {
            return (
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={!!formData[fieldname]}
                            onChange={(e) => handleInputChange(fieldname, e.target.checked)}
                        />
                    }
                    label={label}
                />
            );
        }

        return <TextField {...commonProps} />;
    };

    const sortOptions = [
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' },
        { value: 'date_asc', label: 'Date Asc' },
        { value: 'date_desc', label: 'Date Desc' },
        { value: 'employee_asc', label: 'Employee Asc' },
        { value: 'employee_desc', label: 'Employee Desc' },
    ];

    const getSortByValue = () => {
        if (orderBy === 'modified') {
            return order === 'desc' ? 'newest' : 'oldest';
        }
        if (orderBy === 'attendance_date') {
            return order === 'asc' ? 'date_asc' : 'date_desc';
        }
        if (orderBy === 'employee_name') {
            return order === 'asc' ? 'employee_asc' : 'employee_desc';
        }
        return 'newest';
    };

    const handleSortChange = (value: string) => {
        if (value === 'newest') {
            setOrderBy('modified');
            setOrder('desc');
        } else if (value === 'oldest') {
            setOrderBy('modified');
            setOrder('asc');
        } else if (value === 'date_asc') {
            setOrderBy('attendance_date');
            setOrder('asc');
        } else if (value === 'date_desc') {
            setOrderBy('attendance_date');
            setOrder('desc');
        } else if (value === 'employee_asc') {
            setOrderBy('employee_name');
            setOrder('asc');
        } else if (value === 'employee_desc') {
            setOrderBy('employee_name');
            setOrder('desc');
        }
    };

    const activeShiftDoc = getShiftDoc(formData.employee, formData.shift, formData.attendance_date);
    const activeShiftLabel = activeShiftDoc?.shift_name || formData.shift || '';
    const totalShiftBreakMinutes = activeShiftDoc
        ? parseShiftDurationMinutes(activeShiftDoc.lunch_hours) +
          parseShiftDurationMinutes(activeShiftDoc.break_hours)
        : 0;
    const elapsedAttendanceMinutes = computeAttendanceElapsedMinutes(formData.in_time, formData.out_time);
    const hasElapsedTimes = elapsedAttendanceMinutes > 0;
    const appliedBreakMinutes =
        hasElapsedTimes && elapsedAttendanceMinutes > totalShiftBreakMinutes
            ? totalShiftBreakMinutes
            : 0;
    const netCalculatedMinutes = hasElapsedTimes
        ? elapsedAttendanceMinutes - appliedBreakMinutes
        : 0;

    let shiftBreakdownText = 'No Shift assigned for this employee/date — Lunch/Break hours will not be deducted.';
    if (resolvingShift) {
        shiftBreakdownText = 'Resolving applicable shift...';
    } else if (activeShiftLabel && hasElapsedTimes) {
        shiftBreakdownText = `Shift: ${activeShiftLabel} • Elapsed: ${formatMinutesAsHHMM(elapsedAttendanceMinutes)} • Lunch/Break: -${formatMinutesAsHHMM(appliedBreakMinutes)} • Net Working: ${formatMinutesAsHHMM(netCalculatedMinutes)}`;
    } else if (activeShiftLabel) {
        shiftBreakdownText = `Shift: ${activeShiftLabel} • Lunch/Break deduction: ${formatMinutesAsHHMM(totalShiftBreakMinutes)}`;
    }

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ flexGrow: 1 }}>
                    Attendance
                </Typography>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    {isSuperAdmin && (
                        <>
                            <Button
                                variant="contained"
                                startIcon={<Iconify icon={"solar:transfer-horizontal-bold-duotone" as any} />}
                                onClick={() => navigate('/attendance/transfer')}
                                sx={{
                                    borderRadius: 1.5,
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    bgcolor: '#36b37e',
                                    color: 'common.white',
                                    '&:hover': { bgcolor: '#2b9065' }
                                }}
                            >
                                Transfer Attendance
                            </Button>

                            <Button
                                variant="outlined"
                                startIcon={<Iconify icon={"solar:history-bold-duotone" as any} />}
                                onClick={() => navigate('/attendance/transfer-history')}
                                sx={{
                                    borderRadius: 1.5,
                                    fontWeight: 600,
                                    textTransform: 'none',
                                }}
                            >
                                Transfer History
                            </Button>
                        </>
                    )}

                    {isHR && permissions.write && (
                        <>
                            <Button
                                variant="contained"
                                startIcon={<Iconify icon={"solar:restart-bold" as any} />}
                                onClick={() => setOpenSync(true)}
                                sx={{
                                    borderRadius: 1.5,
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    bgcolor: '#36b37e',
                                    color: 'common.white',
                                    '&:hover': { bgcolor: '#2b9065' }
                                }}
                            >
                                Sync Attendance
                            </Button>

                            {canImportAttendace && (
                                <Button
                                    variant="outlined"
                                    startIcon={<Iconify icon="solar:import-bold-duotone" />}
                                    onClick={handleOpenImport}
                                >
                                    Import
                                </Button>
                            )}

                            {canCreateAttendace && (
                                <Button
                                    variant="contained"
                                    startIcon={<Iconify icon="mingcute:add-line" />}
                                    onClick={handleOpenCreate}
                                    sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                                >
                                    Mark Attendance
                                </Button>
                            )}
                        </>
                    )}
                </Box>
            </Box>

            <Card>
                <AttendanceTableToolbar
                    numSelected={selected.length}
                    filterName={filterName}
                    onFilterName={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setFilterName(e.target.value);
                        setPage(0);
                    }}
                    onDelete={permissions.delete && selected.length > 0 ? () => setConfirmBulkDelete(true) : undefined}
                    searchPlaceholder="Search attendance..."
                    sortOptions={sortOptions}
                    sortBy={getSortByValue()}
                    onSortChange={handleSortChange}
                    onOpenFilter={handleOpenFilters}
                    canReset={!!startDate || !!endDate || !!filterName || filterStatus !== 'all' || !!filterEmployee}
                />

                <AttendanceTableFiltersDrawer
                    open={openFilters}
                    onOpen={handleOpenFilters}
                    onClose={handleCloseFilters}
                    filters={{ startDate, endDate, status: filterStatus, employee: filterEmployee }}
                    onFilters={handleFilters}
                    canReset={!!startDate || !!endDate || filterStatus !== 'all' || !!filterEmployee || !!filterName}
                    onResetFilters={handleResetFilters}
                    employeeOptions={employeeOptions}
                    isHR={isHR}
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: { xs: 300, md: 800 }, borderCollapse: 'collapse' }}>
                            <AttendanceTableHead
                                order={order}
                                orderBy={orderBy}
                                rowCount={data.length}
                                numSelected={data.filter((row) => selected.includes(row.name)).length}
                                onSelectAllRows={(checked: boolean) => handleSelectAllRows(checked)}
                                hideCheckbox={!permissions.delete}
                                showIndex
                                headLabel={[
                                    { id: 'employee_name', label: 'Employee', minWidth: { xs: 130, md: 150 }, sx: { maxWidth: 170, display: { xs: 'none', md: 'table-cell' } } },
                                    { id: 'attendance_date', label: 'Date', minWidth: 95 },
                                    { id: 'status', label: 'Status', minWidth: 80 },
                                    { id: 'attendance_source', label: 'Source', minWidth: 80 },
                                    { id: 'in_time', label: 'In Time', minWidth: 85, sx: { display: { xs: 'none', md: 'table-cell' } } },
                                    { id: 'out_time', label: 'Out Time', minWidth: 85, sx: { display: { xs: 'none', md: 'table-cell' } } },
                                    { id: 'working_hours_display', label: 'Working Hours', minWidth: 95, sx: { display: { xs: 'none', md: 'table-cell' } } },
                                    { id: 'official_overtime', label: 'Overtime', minWidth: 75, sx: { display: { xs: 'none', md: 'table-cell' } } },
                                    ...(isSystemManager ? [{ id: 'unofficial_overtime', label: 'Extra Overtime', minWidth: 90, sx: { display: { xs: 'none', md: 'table-cell' } } }] : []),
                                    { id: '', label: '', align: 'right', minWidth: 110 },
                                ]}
                            />

                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={permissions.delete ? (isSystemManager ? 12 : 11) : (isSystemManager ? 11 : 10)} align="center" sx={{ py: 10 }}>
                                            <CircularProgress sx={{ color: '#059669' }} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {data.map((row, index) => (
                                            <AttendanceTableRow
                                                key={row.name}
                                                index={page * rowsPerPage + index}
                                                hideCheckbox={!permissions.delete}
                                                row={{
                                                    id: row.name,
                                                    employee: row.employee,
                                                    employeeName: row.employee_name,
                                                    attendanceDate: row.attendance_date,
                                                    status: row.status,
                                                    inTime: row.in_time,
                                                    out_time: row.out_time,
                                                    working_hours_display: row.working_hours_display,
                                                    official_overtime: row.official_overtime,
                                                    unofficial_overtime: row.unofficial_overtime,
                                                    attendance_source: row.attendance_source,
                                                    manual: row.manual,
                                                    modified: row.modified,
                                                    is_transferred: row.is_transferred,
                                                    transfer_type: row.transfer_type,
                                                    transferred_from_date: row.transferred_from_date,
                                                    transferred_to_date: row.transferred_to_date,
                                                    attendance_transfer_ref: row.attendance_transfer_ref,
                                                }}
                                                canViewUnofficial={isSystemManager}
                                                selected={selected.includes(row.name)}
                                                onSelectRow={() => handleSelectRow(row.name)}
                                                onView={() => handleOpenDetails(row.name)}
                                                onEdit={() => handleEditRow(row.name)}
                                                onDelete={() => handleDeleteClick(row.name)}
                                                canEdit={permissions.write}
                                                canDelete={permissions.delete}
                                            />
                                        ))}

                                        {notFound && <TableNoData searchQuery={filterName} />}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={permissions.delete ? (isSystemManager ? 12 : 11) : (isSystemManager ? 11 : 10)}>
                                                    <EmptyContent
                                                        title="No attendance records"
                                                        description="You haven't marked any attendance yet."
                                                        icon="solar:calendar-date-bold-duotone"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        )}

                                        {!empty && !notFound && (
                                            <TableEmptyRows
                                                height={68}
                                                emptyRows={data.length < 5 ? 5 - data.length : 0}
                                            />
                                        )}
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Scrollbar>

                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={(_e, newPage) => setPage(newPage)}
                    rowsPerPageOptions={[10, 25, 50]}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                />
            </Card>

            {/* CREATE/EDIT DIALOG */}
            <Dialog
                open={openCreate}
                onClose={handleCloseCreate}
                fullWidth
                maxWidth={currentAttendanceId ? 'md' : 'md'}
                PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24 } }}
            >
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {currentAttendanceId ? 'Edit Attendance' : 'Mark Attendance'}
                    <IconButton onClick={handleCloseCreate} sx={{ color: (theme) => theme.palette.grey[500] }}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Box
                            display="grid"
                            margin={2}
                            gridTemplateColumns="1fr"
                            gap={3}
                        >
                            <Autocomplete
                                fullWidth
                                options={employeeOptions}
                                filterOptions={filterEmployeeOptions}
                                getOptionLabel={(option) => option.employee_name || option.name || ''}
                                value={employeeOptions.find((opt) => opt.name === formData.employee) || null}
                                onChange={(event, newValue) => {
                                    handleInputChange('employee', newValue?.name || '');
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Employee"
                                        required
                                        InputLabelProps={{ shrink: true }}
                                        error={touched && !formData.employee}
                                        helperText={touched && !formData.employee ? 'Employee is required' : ''}
                                        sx={{
                                            '& .MuiFormLabel-asterisk': {
                                                color: 'red',
                                            },
                                        }}
                                    />
                                )}
                                renderOption={(props, option) => (
                                    <li {...props}>
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {option.employee_name || option.name}
                                            </Typography>
                                            {option.employee_name && (
                                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                                    ID: {option.name}
                                                </Typography>
                                            )}
                                        </Box>
                                    </li>
                                )}
                            />
                            {renderField('attendance_date', 'Attendance Date', 'date', [], {
                                shouldDisableDate: (day: any) => {
                                    const dStr = day.format('YYYY-MM-DD');
                                    if (!currentAttendanceId && existingAttendanceDates.includes(dStr)) {
                                        return true;
                                    }
                                    return false;
                                }
                            }, true)}
                            {renderField('status', 'Status', 'select', ['Present', 'Absent', 'Half Day', 'On Leave', 'Holiday', 'Compensatory Off', 'Missing'], { hidden: false })}

                            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
                                {renderField('in_time', 'In Time', 'time')}
                                {renderField('out_time', 'Out Time', 'time')}
                            </Box>

                            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: isSystemManager ? '1fr 1fr 1fr' : '1fr 1fr' }} gap={2}>
                                {renderField('working_hours_display', 'Working Hours', 'text', [], { InputProps: { readOnly: true } })}
                                {renderField('official_overtime', 'Overtime', 'text', [], { InputProps: { readOnly: true } })}
                                {isSystemManager && renderField('unofficial_overtime', 'Extra Overtime', 'text', [], { InputProps: { readOnly: true } })}
                            </Box>

                            {formData.employee && (
                                <Box
                                    sx={{
                                        px: 1.75,
                                        py: 1,
                                        borderRadius: 1,
                                        bgcolor: (theme) =>
                                            activeShiftLabel || resolvingShift
                                                ? alpha(theme.palette.info.main, 0.08)
                                                : alpha(theme.palette.warning.main, 0.08),
                                        border: (theme) =>
                                            `1px solid ${
                                                activeShiftLabel || resolvingShift
                                                    ? alpha(theme.palette.info.main, 0.24)
                                                    : alpha(theme.palette.warning.main, 0.24)
                                            }`,
                                    }}
                                >
                                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 500 }}>
                                        {shiftBreakdownText}
                                    </Typography>
                                </Box>
                            )}

                            {renderField('manual', 'Manual', 'checkbox')}

                            <Box sx={{ mt: 1 }}>
                                {loadingDoc ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                                        <CircularProgress size={32} sx={{ color: '#059669' }} />
                                    </Box>
                                ) : (
                                    <BiometricPunchesTable
                                        editable
                                        punches={formData.attendance_punches || []}
                                        attendanceDate={formData.attendance_date}
                                        onPunchesChange={handlePunchesChange}
                                    />
                                )}
                            </Box>
                        </Box>
                    </LocalizationProvider>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button variant="contained" onClick={handleCreate} disabled={creating || resolvingShift} sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>
                        {creating ? 'Saving...' : (currentAttendanceId ? 'Update Record' : 'Save Record')}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null })}
                title="Confirm Delete"
                content="Are you sure you want to delete this attendance record?"
                action={
                    <Button onClick={handleConfirmDelete} color="error" variant="contained" sx={{ borderRadius: 1.5, minWidth: 100 }}>
                        Delete
                    </Button>
                }
            />

            <ConfirmDialog
                open={confirmBulkDelete}
                onClose={() => setConfirmBulkDelete(false)}
                title="Confirm Bulk Delete"
                content={`Are you sure you want to delete ${selected.length} selected attendance record(s)?`}
                isLoading={bulkDeleting}
                action={
                    <Button onClick={handleBulkDelete} color="error" variant="contained" disabled={bulkDeleting} sx={{ borderRadius: 1.5, minWidth: 100 }}>
                        {bulkDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                }
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <AttendanceDetailsDialog
                open={openDetails}
                onClose={handleCloseDetails}
                attendanceId={detailsId}
            />

            <Snackbar
                open={!!serverAlert.message}
                autoHideDuration={6000}
                onClose={() => setServerAlert({ ...serverAlert, message: '' })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setServerAlert({ ...serverAlert, message: '' })}
                    severity={serverAlert.severity}
                    sx={{ width: '100%', whiteSpace: 'pre-line' }}
                >
                    {serverAlert.message}
                </Alert>
            </Snackbar>

            <AttendanceImportDialog
                open={openImport}
                onClose={handleCloseImport}
                onRefresh={refetch}
            />

            <AttendanceSyncDialog
                open={openSync}
                onClose={() => setOpenSync(false)}
                onSuccess={refetch}
            />
        </DashboardContent>
    );
}
