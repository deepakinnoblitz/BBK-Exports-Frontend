import jsPDF from 'jspdf';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import autoTable from 'jspdf-autotable';
import { useSnackbar } from 'notistack';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import { alpha, useTheme } from '@mui/material/styles';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { fDate } from 'src/utils/format-time';
import { floatToHHMM, hhmmToFloat, formatDurationDescriptive } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
    fetchTaskManagerList,
    fetchProjects,
    fetchEmployees,
    TaskManager
} from 'src/api/task-manager';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { useAuth } from 'src/auth/auth-context';

import { TaskReportCalendar } from './task-report-calendar';
import { TaskNewEditForm } from '../../../task-manager/task-new-edit-form';
import TaskDetailsDialog from '../../../task-manager/kanban/task-details-dialog';

// ----------------------------------------------------------------------

export function TaskManagerReportView() {
    const theme = useTheme();
    const { user } = useAuth();
    const actionPerms = user?.permissions?.actions?.task_report;
    const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned && !!actionPerms;
    const canExport = hasCustomPerms ? !!actionPerms?.export : true;

    const [reportData, setReportData] = useState<TaskManager[]>([]);
    const [loading, setLoading] = useState(false);
    const [exportingExcel, setExportingExcel] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [isHR, setIsHR] = useState(false);

    const { enqueueSnackbar } = useSnackbar();

    // Filters
    const [fromDate, setFromDate] = useState<dayjs.Dayjs | null>(null);
    const [toDate, setToDate] = useState<dayjs.Dayjs | null>(null);
    const [employee, setEmployee] = useState<string[]>([]);
    const [project, setProject] = useState<string[]>([]);
    const [status, setStatus] = useState('all');
    const [priority, setPriority] = useState('all');
    const [sortBy, setSortBy] = useState('modified_desc');

    // Options
    const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
    const [projectOptions, setProjectOptions] = useState<any[]>([]);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Selection
    const [selected, setSelected] = useState<string[]>([]);

    // Detail / Edit Form
    const [openDetail, setOpenDetail] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [selectedTask, setSelectedTask] = useState<TaskManager | null>(null);

    const [currentView, setCurrentView] = useState<'list' | 'calendar'>('list');

    useEffect(() => {
        if (user && user.roles) {
            const hrRoles = ['HR Manager', 'HR', 'System Manager', 'Administrator', 'Task Manager'];
            const hasHRRole = user.roles.some((role: string) => hrRoles.includes(role));
            setIsHR(hasHRRole);
            if (!hasHRRole && user.employee) {
                setEmployee([user.employee]);
            }
        }
    }, [user]);

    useEffect(() => {
        fetchEmployees().then(setEmployeeOptions);
        fetchProjects().then(setProjectOptions);
    }, []);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const filters: any[] = [];

            // "From/To Date" filters refer to the Task's Creation Date
            if (fromDate) {
                filters.push(['Task Manager', 'creation', '>=', fromDate.startOf('day').format('YYYY-MM-DD HH:mm:ss')]);
            }
            if (toDate) {
                filters.push(['Task Manager', 'creation', '<=', toDate.endOf('day').format('YYYY-MM-DD HH:mm:ss')]);
            }
            if (project.length > 0) {
                filters.push(['Task Manager', 'project', 'in', project]);
            }
            if (status !== 'all' && status !== 'Overdue') {
                filters.push(['Task Manager', 'status', '=', status]);
            }
            if (priority !== 'all') {
                filters.push(['Task Manager', 'priority', '=', priority]);
            }

            let result = await fetchTaskManagerList(filters);

            // Client side filter for Overdue
            if (status === 'Overdue') {
                result = result.filter(task =>
                    task.status !== 'Completed' && task.due_date && dayjs(task.due_date).isBefore(dayjs(), 'day')
                );
            }
            if (employee.length > 0) {
                result = result.filter(task =>
                    task.assignees?.some(a => employee.includes(a.employee))
                );
            }

            // Sorting
            if (sortBy === 'creation_desc') {
                result.sort((a, b) => dayjs(b.creation).unix() - dayjs(a.creation).unix());
            } else if (sortBy === 'creation_asc') {
                result.sort((a, b) => dayjs(a.creation).unix() - dayjs(b.creation).unix());
            } else if (sortBy === 'modified_desc') {
                result.sort((a, b) => dayjs(b.modified).unix() - dayjs(a.modified).unix());
            } else if (sortBy === 'modified_asc') {
                result.sort((a, b) => dayjs(a.modified).unix() - dayjs(b.modified).unix());
            } else if (sortBy === 'due_date_desc') {
                result.sort((a, b) => {
                    if (!a.due_date) return 1;
                    if (!b.due_date) return -1;
                    return dayjs(b.due_date).unix() - dayjs(a.due_date).unix();
                });
            } else if (sortBy === 'due_date_asc') {
                result.sort((a, b) => {
                    if (!a.due_date) return 1;
                    if (!b.due_date) return -1;
                    return dayjs(a.due_date).unix() - dayjs(b.due_date).unix();
                });
            }

            setReportData(result);
            setPage(0);
        } catch (error) {
            console.error('Failed to fetch task manager report:', error);
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate, employee, project, status, priority, sortBy]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleReset = () => {
        setFromDate(null);
        setToDate(null);
        if (isHR) {
            setEmployee([]);
        } else if (user?.employee) {
            setEmployee([user.employee]);
        }
        setProject([]);
        setStatus('all');
        setPriority('all');
        setSortBy('modified_desc');
    };



    const getTimeLogged = (task: TaskManager) => {
        const total = task.history?.reduce((acc, curr) => acc + hhmmToFloat(curr.hours_spent || ''), 0) || 0;
        return total;
    };

    const handleExport = async () => {
        setExportingExcel(true);
        try {
            const workbook = new ExcelJS.Workbook();
            const mainSheet = workbook.addWorksheet('Task Summary');
            const detailSheet = workbook.addWorksheet('Full Task Details');
            const historySheet = workbook.addWorksheet('Detailed History');

            // If items are selected, only export those. Otherwise export everything in the current report.
            const exportData = selected.length > 0
                ? reportData.filter(task => selected.includes(task.name))
                : reportData;

            // --- MAIN SHEET SETUP ---
            mainSheet.columns = [
                { header: 'Task ID', key: 'name', width: 18 },
                { header: 'Task Title', key: 'title', width: 40 },
                { header: 'Creation Date', key: 'date', width: 18 },
                { header: 'Assignees', key: 'employee', width: 35 },
                { header: 'Project / Module', key: 'project', width: 25 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'Priority', key: 'priority', width: 12 },
                { header: 'Time Spent', key: 'time_spent', width: 20 },
                { header: 'Estimated Time', key: 'est_time', width: 20 },
                { header: 'Variance', key: 'variance', width: 20 },
            ];

            // Header Styling (Limited to data columns only)
            const mainColCountForHeader = mainSheet.columns.length;
            for (let i = 1; i <= mainColCountForHeader; i++) {
                const cell = mainSheet.getRow(1).getCell(i);
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0ea5e9' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
            mainSheet.getRow(1).height = 30;

            exportData.forEach((task) => {
                const actual = getTimeLogged(task);
                const estimated = task.estimated_time || 0;
                const variance = estimated - actual;

                const row = mainSheet.addRow({
                    name: task.name,
                    title: task.title,
                    date: fDate(task.creation, 'DD MMM YYYY'),
                    employee: task.assignees?.map(a => a.employee_name).join(', ') || '',
                    project: task.project || '',
                    status: task.status,
                    priority: task.priority || '',
                    time_spent: formatDurationDescriptive(actual),
                    est_time: formatDurationDescriptive(estimated),
                    variance: formatDurationDescriptive(variance)
                });

                // Conditional styling for Status
                const statusCell = row.getCell('status');
                const statusColors: any = {
                    'Completed': 'FF22C55E',
                    'In Progress': 'FFF97316',
                    'Overdue': 'FFEF4444',
                    'On Hold': 'FFF59E0B'
                };
                if (statusColors[task.status]) {
                    statusCell.font = { color: { argb: statusColors[task.status] }, bold: true };
                }

                // Variance styling
                if (variance < 0) {
                    row.getCell('variance').font = { color: { argb: 'FFEF4444' } };
                }

                row.alignment = { vertical: 'middle' };
            });

            // Alternate row colors and borders (Limited to data columns only)
            const mainColCount = mainSheet.columns.length;
            mainSheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) {
                    for (let i = 1; i <= mainColCount; i++) {
                        const cell = row.getCell(i);
                        if (rowNumber % 2 === 0) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };
                        }
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FF000000' } },
                            bottom: { style: 'thin', color: { argb: 'FF000000' } },
                            left: { style: 'thin', color: { argb: 'FF000000' } },
                            right: { style: 'thin', color: { argb: 'FF000000' } }
                        };
                    }
                }
            });

            // --- FULL DETAILS SHEET ---
            detailSheet.columns = [
                { header: 'Task ID', key: 'name', width: 18 },
                { header: 'Title', key: 'title', width: 40 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'Priority', key: 'priority', width: 12 },
                { header: 'Project', key: 'project', width: 25 },
                { header: 'Department', key: 'department', width: 25 },
                { header: 'Assignees', key: 'assignees', width: 45 },
                { header: 'Estimated Time', key: 'est_time', width: 18 },
                { header: 'Due Date', key: 'due_date', width: 20 },
                { header: 'Description', key: 'description', width: 80 },
                { header: 'Attachment Req.', key: 'attach_req', width: 15 },
                { header: 'Recurring', key: 'recurring', width: 12 },
                { header: 'Frequency', key: 'frequency', width: 15 },
                { header: 'Created On', key: 'creation', width: 20 },
                { header: 'Modified On', key: 'modified', width: 20 },
                { header: 'Closed By', key: 'closed_by', width: 25 },
                { header: 'Closed On', key: 'closed_on', width: 20 },
            ];

            const detailColCountForHeader = detailSheet.columns.length;
            for (let i = 1; i <= detailColCountForHeader; i++) {
                const cell = detailSheet.getRow(1).getCell(i);
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0ea5e9' } };
            }

            exportData.forEach(task => {
                const row = detailSheet.addRow({
                    name: task.name,
                    title: task.title,
                    status: task.status,
                    priority: task.priority,
                    project: task.project || '-',
                    department: task.department || '-',
                    assignees: task.assignees?.map(a => `${a.employee_name} (${a.employee})`).join(', ') || '-',
                    est_time: task.estimated_time ? formatDurationDescriptive(task.estimated_time) : '-',
                    due_date: task.due_date ? `${fDate(task.due_date, 'DD MMM YYYY')} ${task.due_time || ''}` : '-',
                    description: task.description ? task.description.replace(/<[^>]*>?/gm, '') : '-',
                    attach_req: task.attachment_required ? 'Yes' : 'No',
                    recurring: task.recurring_task ? 'Yes' : 'No',
                    frequency: task.recurring_frequency || '-',
                    creation: dayjs(task.creation).format('DD MMM YYYY HH:mm'),
                    modified: dayjs(task.modified).format('DD MMM YYYY HH:mm'),
                    closed_by: task.closed_by || '-',
                    closed_on: task.closed_on ? dayjs(task.closed_on).format('DD MMM YYYY HH:mm') : '-'
                });
                row.alignment = { vertical: 'middle', wrapText: true };
            });

            // Apply Borders and Alternate Shading to Detail Sheet (Limited to data columns only)
            const detailColCount = detailSheet.columns.length;
            detailSheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) {
                    for (let i = 1; i <= detailColCount; i++) {
                        const cell = row.getCell(i);
                        if (rowNumber % 2 === 0) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };
                        }
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FF000000' } },
                            bottom: { style: 'thin', color: { argb: 'FF000000' } },
                            left: { style: 'thin', color: { argb: 'FF000000' } },
                            right: { style: 'thin', color: { argb: 'FF000000' } }
                        };
                    }
                }
            });

            // --- HISTORY SHEET SETUP ---
            historySheet.columns = [
                { header: 'Task ID', key: 'parent', width: 18 },
                { header: 'Event', key: 'event', width: 15 },
                { header: 'Performed By', key: 'done_by', width: 25 },
                { header: 'Timestamp', key: 'done_on', width: 20 },
                { header: 'Logged Time', key: 'hours', width: 15 },
                { header: 'Remarks', key: 'remarks', width: 50 },
            ];

            const histColCountForHeader = historySheet.columns.length;
            for (let i = 1; i <= histColCountForHeader; i++) {
                const cell = historySheet.getRow(1).getCell(i);
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0ea5e9' } };
            }

            exportData.forEach(task => {
                if (task.history) {
                    task.history.forEach(log => {
                        historySheet.addRow({
                            parent: task.name,
                            event: log.event,
                            done_by: log.done_by,
                            done_on: fDate(log.done_on, 'DD MMM YYYY HH:mm'),
                            hours: log.hours_spent || '-',
                            remarks: log.remarks ? log.remarks.replace(/<[^>]*>?/gm, '') : '-'
                        });
                    });
                }
            });

            // Apply Borders and Alternate Shading to History Sheet (Limited to data columns only)
            const histColCount = historySheet.columns.length;
            historySheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) {
                    for (let i = 1; i <= histColCount; i++) {
                        const cell = row.getCell(i);
                        if (rowNumber % 2 === 0) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };
                        }
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FF000000' } },
                            bottom: { style: 'thin', color: { argb: 'FF000000' } },
                            left: { style: 'thin', color: { argb: 'FF000000' } },
                            right: { style: 'thin', color: { argb: 'FF000000' } }
                        };
                    }
                }
            });

            // --- GLOBAL SUMMARY AT BOTTOM OF MAIN SHEET ---
            mainSheet.addRow([]);
            mainSheet.addRow([]);
            const summaryStartRow = mainSheet.lastRow!.number + 1;
            const summaryTitle = mainSheet.addRow(['REPORT ANALYTICS']);
            summaryTitle.font = { bold: true, size: 14, color: { argb: 'FF1877F2' } };

            mainSheet.addRow(['Generated On', dayjs().format('DD MMM YYYY HH:mm')]);
            mainSheet.addRow(['Total Tasks Managed', exportData.length]);
            mainSheet.addRow(['Tasks Completed', exportData.filter(t => t.status === 'Completed').length]);
            mainSheet.addRow(['Tasks Overdue', exportData.filter(t => t.status !== 'Completed' && t.due_date && dayjs(t.due_date).isBefore(dayjs())).length]);
            mainSheet.addRow(['Cumulative Time Logged', formatDurationDescriptive(exportData.reduce((acc, curr) => acc + getTimeLogged(curr), 0))]);

            for (let i = summaryStartRow; i <= mainSheet.lastRow!.number; i++) {
                mainSheet.getRow(i).getCell(1).font = { bold: true };
            }

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Task_Manager_Report_${dayjs().format('YYYY-MM-DD')}.xlsx`);
            enqueueSnackbar('Excel exported successfully!', { variant: 'success' });
        } catch (error) {
            console.error('Excel export failed:', error);
            enqueueSnackbar('Excel export failed!', { variant: 'error' });
        } finally {
            setExportingExcel(false);
        }
    };

    const handleExportPdf = async () => {
        setExportingPdf(true);
        try {
            const doc = new jsPDF('landscape');
            const exportData = selected.length > 0
                ? reportData.filter(task => selected.includes(task.name))
                : reportData;

            if (exportData.length === 0) {
                enqueueSnackbar('No data to export', { variant: 'warning' });
                setExportingPdf(false);
                return;
            }

            // --- PAGE 1: TASK SUMMARY ---
            doc.setFontSize(22);
            doc.setTextColor(14, 165, 233);
            doc.setFont('helvetica', 'bold');
            doc.text('Task Summary', 14, 20);

            doc.setFontSize(9);
            doc.setTextColor(120);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated on: ${dayjs().format('DD MMM YYYY, h:mm A')}`, 14, 27);

            // Accent line
            doc.setDrawColor(14, 165, 233);
            doc.setLineWidth(0.5);
            doc.line(14, 32, 196, 32);

            const summaryBody = exportData.map(task => {
                const actual = getTimeLogged(task);
                const estimated = task.estimated_time || 0;
                const variance = estimated - actual;
                return [
                    task.name,
                    task.title,
                    fDate(task.creation, 'DD MMM YYYY'),
                    task.assignees?.map(a => a.employee_name).join(', ') || '',
                    task.project || '',
                    task.status,
                    task.priority || '',
                    formatDurationDescriptive(actual),
                    formatDurationDescriptive(estimated),
                    formatDurationDescriptive(variance)
                ];
            });

            autoTable(doc, {
                startY: 40,
                head: [['Task ID', 'Title', 'Creation', 'Assignees', 'Project', 'Status', 'Priority', 'Spent', 'Est.', 'Var.']],
                body: summaryBody,
                theme: 'grid',
                headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
                styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak', lineWidth: 0.15, lineColor: [60, 60, 60], valign: 'middle' },
                columnStyles: {
                    0: { cellWidth: 20, halign: 'center' },
                    1: { cellWidth: 55 },
                    2: { cellWidth: 20, halign: 'center' },
                    3: { cellWidth: 40, halign: 'center' },
                    4: { cellWidth: 30, halign: 'center' },
                    5: { cellWidth: 25, halign: 'center' },
                    6: { halign: 'center' },
                    7: { halign: 'center' },
                    8: { halign: 'center' },
                    9: { halign: 'center' },
                }
            });

            // --- PAGE 2: FULL TASK DETAILS ---
            doc.addPage();
            doc.setFontSize(22);
            doc.setTextColor(14, 165, 233);
            doc.setFont('helvetica', 'bold');
            doc.text('Full Task Details', 14, 20);

            doc.setFontSize(9);
            doc.setTextColor(120);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated on: ${dayjs().format('DD MMM YYYY, h:mm A')}`, 14, 27);

            // Accent line
            doc.setDrawColor(14, 165, 233);
            doc.setLineWidth(0.5);
            doc.line(14, 32, 196, 32);

            const detailBody = exportData.map(task => [
                task.name,
                task.title,
                task.status,
                task.priority || '-',
                task.project || '-',
                task.department || '-',
                task.assignees?.map(a => `${a.employee_name} (${a.employee})`).join(', ') || '-',
                task.estimated_time ? formatDurationDescriptive(task.estimated_time) : '-',
                task.due_date ? fDate(task.due_date, 'DD MMM YYYY') : '-',
                task.description ? task.description.replace(/<[^>]*>?/gm, '') : '-',
                task.attachment_required ? 'Yes' : 'No',
                task.recurring_task ? 'Yes' : 'No',
                task.recurring_frequency || '-',
                dayjs(task.creation).format('DD MMM YYYY'),
                dayjs(task.modified).format('DD MMM YYYY'),
                task.closed_by || '-',
                task.closed_on ? dayjs(task.closed_on).format('DD MMM YYYY') : '-'
            ]);

            autoTable(doc, {
                startY: 40,
                head: [['ID', 'Title', 'Status', 'Pri.', 'Project', 'Dept.', 'Assignees', 'Est.', 'Due', 'Description', 'Attach', 'Recur', 'Freq', 'Created', 'Modified', 'Closed By', 'Closed On']],
                body: detailBody,
                theme: 'grid',
                headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
                styles: { fontSize: 6, cellPadding: 1, overflow: 'linebreak', lineWidth: 0.1, lineColor: [180, 180, 180], valign: 'middle' },
                columnStyles: {
                    0: { cellWidth: 15, halign: 'center' },
                    1: { cellWidth: 30 },
                    2: { halign: 'center' },
                    3: { halign: 'center' },
                    4: { halign: 'center' },
                    5: { halign: 'center' },
                    7: { halign: 'center' },
                    8: { halign: 'center' },
                    9: { cellWidth: 35 }, // Description
                    10: { halign: 'center' },
                    11: { halign: 'center' },
                    12: { halign: 'center' },
                    13: { halign: 'center' },
                    14: { halign: 'center' },
                    16: { halign: 'center' },
                }
            });

            // --- PAGE 3: DETAILED HISTORY ---
            doc.addPage();
            doc.setFontSize(22);
            doc.setTextColor(14, 165, 233);
            doc.setFont('helvetica', 'bold');
            doc.text('Detailed History', 14, 20);

            doc.setFontSize(9);
            doc.setTextColor(120);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated on: ${dayjs().format('DD MMM YYYY, h:mm A')}`, 14, 27);

            // Accent line
            doc.setDrawColor(14, 165, 233);
            doc.setLineWidth(0.5);
            doc.line(14, 32, 196, 32);

            const historyBody: any[] = [];
            exportData.forEach(task => {
                if (task.history) {
                    task.history.forEach(log => {
                        historyBody.push([
                            task.name,
                            log.event,
                            log.done_by,
                            fDate(log.done_on, 'DD MMM YYYY HH:mm'),
                            log.hours_spent || '-',
                            log.remarks ? log.remarks.replace(/<[^>]*>?/gm, '') : '-'
                        ]);
                    });
                }
            });

            autoTable(doc, {
                startY: 40,
                head: [['Task ID', 'Event', 'Done By', 'Timestamp', 'Hours', 'Remarks']],
                body: historyBody,
                theme: 'grid',
                headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
                styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak', lineWidth: 0.15, lineColor: [60, 60, 60], valign: 'middle' },
                columnStyles: {
                    0: { halign: 'center' },
                    1: { halign: 'center' },
                    2: { halign: 'center' },
                    3: { halign: 'center' },
                    4: { halign: 'center' },
                    5: { cellWidth: 70 }
                }
            });

            doc.save(`Task_Manager_Report_${dayjs().format('YYYY-MM-DD')}.pdf`);
            enqueueSnackbar('PDF exported successfully!', { variant: 'success' });
        } catch (error) {
            console.error('PDF export failed:', error);
            enqueueSnackbar('PDF export failed!', { variant: 'error' });
        } finally {
            setExportingPdf(false);
        }
    };


    const handleViewDetails = (task: TaskManager) => {
        setSelectedTask(task);
        setOpenDetail(true);
    };

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const newSelected = reportData.map((n) => n.name);
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

    // Summary stats
    const totalTasks = reportData.length;
    const completedTasks = reportData.filter(t => t.status === 'Completed').length;
    const pendingTasks = reportData.filter(t => t.status !== 'Completed').length;
    const overdueTasks = reportData.filter(t =>
        t.status !== 'Completed' &&
        t.due_date &&
        dayjs(t.due_date).isBefore(dayjs().startOf('day'))
    ).length;
    const totalTimeLogged = reportData.reduce((acc, curr) => acc + getTimeLogged(curr), 0);

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack spacing={3}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h4">Task Report</Typography>
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="outlined"
                            startIcon={<Iconify icon={"solar:refresh-bold" as any} />}
                            onClick={fetchReport}
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
                                label="From Date"
                                format="DD-MM-YYYY"
                                value={fromDate}
                                onChange={(newValue) => setFromDate(newValue)}
                                slotProps={{ textField: { size: 'small', sx: { flexGrow: 1, maxWidth: 170 } } }}
                            />
                            <DatePicker
                                label="To Date"
                                format="DD-MM-YYYY"
                                value={toDate}
                                onChange={(newValue) => setToDate(newValue)}
                                slotProps={{ textField: { size: 'small', sx: { flexGrow: 1, maxWidth: 170 } } }}
                            />
                        </LocalizationProvider>

                        <Autocomplete
                            multiple
                            disableCloseOnSelect
                            size="small"
                            sx={{ flexGrow: 1, minWidth: 250 }}
                            options={projectOptions}
                            getOptionLabel={(option) => option.project}
                            isOptionEqualToValue={(option, value) => option.name === value.name}
                            value={projectOptions.filter((opt) => project.includes(opt.name))}
                            onChange={(event, newValue) => {
                                setProject(newValue.map((opt) => opt.name));
                            }}
                            renderOption={(props, option, { selected: isProjectSelected }) => (
                                <li {...props} key={option.name}>
                                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                                        {option.project}
                                    </Typography>
                                    {isProjectSelected && (
                                        <Iconify icon={"solar:check-circle-bold" as any} width={20} sx={{ color: 'primary.main', ml: 1 }} />
                                    )}
                                </li>
                            )}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Project / Module"
                                    placeholder="Select Project(s)"
                                />
                            )}
                        />

                        <FormControl size="small" sx={{ flexGrow: 1, minWidth: 140 }}>
                            <Select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                displayEmpty
                            >
                                <MenuItem value="all">All Status</MenuItem>
                                <MenuItem value="Open">Open</MenuItem>
                                <MenuItem value="In Progress">In Progress</MenuItem>
                                <MenuItem value="Completed">Completed</MenuItem>
                                <MenuItem value="Reopened">Reopened</MenuItem>
                                <MenuItem value="On Hold">On Hold</MenuItem>
                                <MenuItem value="Overdue">Overdue</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ flexGrow: 1, minWidth: 140 }}>
                            <Select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                displayEmpty
                            >
                                <MenuItem value="all">All Priority</MenuItem>
                                <MenuItem value="Low">Low</MenuItem>
                                <MenuItem value="Medium">Medium</MenuItem>
                                <MenuItem value="High">High</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ flexGrow: 1, minWidth: 180 }}>
                            <Select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <MenuItem value="creation_desc">Created ↓ (Latest)</MenuItem>
                                <MenuItem value="creation_asc">Created ↑ (Oldest)</MenuItem>
                                <MenuItem value="modified_desc">Modified ↓ (Latest)</MenuItem>
                                <MenuItem value="modified_asc">Modified ↑ (Oldest)</MenuItem>
                                <MenuItem value="due_date_desc">Due Date ↓ (Latest)</MenuItem>
                                <MenuItem value="due_date_asc">Due Date ↑ (Oldest)</MenuItem>
                            </Select>
                        </FormControl>

                        <Autocomplete
                            multiple
                            disableCloseOnSelect
                            size="small"
                            sx={{ flexGrow: 1, minWidth: 200 }}
                            options={employeeOptions}
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

                        <Box sx={{ flexGrow: 1 }} />
                        {canExport && (
                            <Stack direction="row" spacing={1} sx={{ ml: { md: 'auto' } }}>
                                <Button
                                    variant="contained"
                                    startIcon={exportingExcel ? undefined : <Iconify icon={"solar:export-bold" as any} />}
                                    onClick={handleExport}
                                    disabled={reportData.length === 0 || exportingExcel}
                                    sx={{
                                        bgcolor: '#0ea5e9',
                                        color: 'common.white',
                                        '&:hover': { bgcolor: '#0284c7' },
                                        height: 40,
                                        px: 3,
                                    }}
                                >
                                    {exportingExcel ? 'Exporting Excel...' : 'Export Excel'}
                                </Button>

                                <Button
                                    variant="contained"
                                    startIcon={exportingPdf ? undefined : <Iconify icon={"solar:file-download-bold" as any} />}
                                    onClick={handleExportPdf}
                                    disabled={reportData.length === 0 || exportingPdf}
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
                            md: 'repeat(5, 1fr)',
                        },
                    }}
                >
                    <SummaryCard item={{ label: 'Total Tasks', value: totalTasks, indicator: 'blue' }} />
                    <SummaryCard item={{ label: 'Completed', value: completedTasks, indicator: 'green' }} />
                    <SummaryCard item={{ label: 'Pending', value: pendingTasks, indicator: 'orange' }} />
                    <SummaryCard item={{ label: 'Overdue', value: overdueTasks, indicator: 'red' }} />
                    <SummaryCard item={{ label: 'Total Time', value: formatDurationDescriptive(totalTimeLogged), indicator: 'green' }} />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Box
                        sx={{
                            display: 'inline-flex',
                            bgcolor: alpha(theme.palette.grey[500], 0.06),
                            p: 0.5,
                            borderRadius: '24px',
                            border: `1px solid ${alpha(theme.palette.grey[500], 0.08)}`,
                        }}
                    >
                        {[
                            { value: 'list', label: 'List View', icon: 'solar:list-bold' },
                            { value: 'calendar', label: 'Calendar View', icon: 'solar:calendar-bold' }
                        ].map((tab) => {
                            const isActive = currentView === tab.value;
                            return (
                                <Button
                                    key={tab.value}
                                    onClick={() => setCurrentView(tab.value as any)}
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
                                        }
                                    }}
                                >
                                    {tab.label}
                                </Button>
                            );
                        })}
                    </Box>
                </Box>

                {currentView === 'list' ? (
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
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Task ID / Name</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Employee</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Project</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Priority</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Time Spent</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Est. Time</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Var.</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', position: 'sticky', right: 0, bgcolor: '#f4f6f8', zIndex: 11 }}>Actions</TableCell>
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
                                                .slice(page * rowsPerPage, (page + 1) * rowsPerPage)
                                                .map((row) => {
                                                    const isSelected = selected.indexOf(row.name) !== -1;
                                                    const actual = getTimeLogged(row);
                                                    const estimated = row.estimated_time || 0;
                                                    const variance = actual - estimated;
                                                    const isOverdue = row.status !== 'Completed' && row.due_date && dayjs(row.due_date).isBefore(dayjs().startOf('day'));

                                                    return (
                                                        <TableRow
                                                            key={row.name}
                                                            hover
                                                            selected={isSelected}
                                                            sx={{
                                                                '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}` },
                                                                '&:last-child td, &:last-child th': { borderBottom: 0 },
                                                                ...(isOverdue && { bgcolor: alpha(theme.palette.error.main, 0.04) })
                                                            }}
                                                        >
                                                            <TableCell padding="checkbox">
                                                                <Checkbox checked={isSelected} onClick={(event) => handleClick(event, row.name)} />
                                                            </TableCell>
                                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{fDate(row.creation, 'DD-MM-YYYY')}</TableCell>
                                                            <TableCell sx={{ maxWidth: 250 }}>
                                                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{row.title}</Typography>
                                                                <Typography variant="caption" sx={{ color: 'text.disabled' }}>{row.name}</Typography>
                                                            </TableCell>
                                                            <TableCell sx={{ maxWidth: 200 }}>
                                                                {row.assignees && row.assignees.length > 0 ? (
                                                                    <>
                                                                        {row.assignees.slice(0, 2).map((a, index) => (
                                                                            <Typography key={a.employee} variant="body2" noWrap>
                                                                                {a.employee_name}
                                                                                {index === 0 && row.assignees!.length > 1 && ","}
                                                                            </Typography>
                                                                        ))}
                                                                        {row.assignees.length > 2 && (
                                                                            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 'bold' }}>
                                                                                + {row.assignees.length - 2} more...
                                                                            </Typography>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <Typography variant="body2" sx={{ color: 'text.disabled' }}>---</Typography>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>{row.project}</TableCell>
                                                            <TableCell>
                                                                <Label
                                                                    color={
                                                                        (row.status === 'Completed' && 'success') ||
                                                                        (row.status === 'In Progress' && 'info') ||
                                                                        (isOverdue && 'error') ||
                                                                        'default'
                                                                    }
                                                                    variant="soft"
                                                                >
                                                                    {isOverdue && row.status !== 'Completed' ? 'Overdue' : row.status}
                                                                </Label>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <Box sx={{
                                                                        width: 8,
                                                                        height: 8,
                                                                        borderRadius: '50%',
                                                                        bgcolor:
                                                                            (row.priority === 'High' && 'error.main') ||
                                                                            (row.priority === 'Medium' && 'warning.main') ||
                                                                            'success.main'
                                                                    }} />
                                                                    <Typography variant="body2">{row.priority}</Typography>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold' }}>{formatDurationDescriptive(actual)}</TableCell>
                                                            <TableCell>{formatDurationDescriptive(estimated)}</TableCell>
                                                            <TableCell sx={{ color: variance > 0 ? 'error.main' : 'success.main' }}>
                                                                {formatDurationDescriptive(Math.abs(variance))} {variance > 0 ? '↑' : '↓'}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ position: 'sticky', right: 0, bgcolor: 'background.paper' }}>
                                                                <IconButton onClick={() => handleViewDetails(row)} sx={{ color: 'info.main' }}>
                                                                    <Iconify icon={"solar:eye-bold" as any} />
                                                                </IconButton>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}

                                            {reportData.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={11} align="center" sx={{ py: 10 }}>
                                                        <Stack spacing={1} alignItems="center">
                                                            <Iconify icon={"solar:filter-bold-duotone" as any} width={48} sx={{ color: 'text.disabled' }} />
                                                            <Typography variant="body2" sx={{ color: 'text.disabled', fontWeight: 'bold' }}>
                                                                No tasks found
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
                        onPageChange={(e, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        rowsPerPageOptions={[10, 25, 50]}
                    />
                </Card>
                ) : (
                    <TaskReportCalendar
                        reportData={reportData}
                        employee={employee}
                        fromDate={fromDate}
                        toDate={toDate}
                        onEventClick={handleViewDetails}
                    />
                )}
            </Stack>

            {openDetail && (
                <TaskDetailsDialog
                    open={openDetail}
                    onClose={() => {
                        setOpenDetail(false);
                        setSelectedTask(null);
                    }}
                    task={selectedTask}
                    onEdit={() => {
                        setOpenDetail(false);
                        setOpenEdit(true);
                    }}
                    onDelete={() => {
                        // Optional: add delete logic if needed
                        setOpenDetail(false);
                    }}
                    onSuccess={fetchReport}
                    permissions={{
                        read: true,
                        write: isHR,
                        create: isHR,
                        delete: isHR
                    }}
                />
            )}

            <TaskNewEditForm
                open={openEdit}
                onClose={() => {
                    setOpenEdit(false);
                    setSelectedTask(null);
                }}
                currentTask={selectedTask}
                onSuccess={fetchReport}
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
        if (t.includes('total tasks')) return 'solar:list-bold-duotone';
        if (t.includes('completed')) return 'solar:check-circle-bold-duotone';
        if (t.includes('pending')) return 'solar:clock-circle-bold-duotone';
        if (t.includes('overdue')) return 'solar:danger-circle-bold-duotone';
        if (t.includes('time')) return 'solar:stopwatch-bold-duotone';
        return 'solar:chart-2-bold-duotone';
    };

    const color = getIndicatorColor(item.indicator);

    return (
        <Card
            sx={{
                p: 2,
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
            <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        flexShrink: 0,
                        display: 'flex',
                        borderRadius: 1.5,
                        alignItems: 'center',
                        justifyContent: 'center',
                        color,
                        bgcolor: alpha(color, 0.1),
                    }}
                >
                    <Iconify icon={getIcon(item.label) as any} width={24} />
                </Box>

                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, mb: 0.5 }}>
                        {item.label}
                    </Typography>
                    <Typography
                        variant={item.label === 'Total Time' ? 'h6' : 'h4'}
                        sx={{
                            color: 'text.primary',
                            fontWeight: 800,
                        }}
                    >
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
