import type { Dayjs } from 'dayjs';
import type { TaskManager} from 'src/api/task-manager';

import dayjs from 'dayjs';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import { alpha, useTheme } from '@mui/material/styles';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { fDate } from 'src/utils/format-time';

import { fetchProjects, fetchHRTaskStats, fetchDepartments, fetchTaskManagerList } from 'src/api/task-manager';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { TableHeadCustom } from 'src/components/table';

import { useAuth } from 'src/auth/auth-context';

import { HRSummaryWidget } from './hr-summary-widget';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
    { id: 'sno', label: 'S.No', align: 'center', width: 60 },
    { id: 'title', label: 'Title', width: 280 },
    { id: 'project', label: 'Project', width: 140 },
    { id: 'priority', label: 'Priority', width: 120 },
    { id: 'status', label: 'Status', width: 120 },
    { id: 'due_date', label: 'Due Date', width: 120 },
];

const filter = createFilterOptions<string>();
const STATUS_LABEL_COLOR: Record<string, 'error' | 'warning' | 'success' | 'info' | 'default'> = {
    Open: 'error',
    'In Progress': 'warning',
    Completed: 'success',
    Reopened: 'error',
    'On Hold': 'warning',
};

const PRIORITY_MAP: Record<string, { color: string, icon: string }> = {
    High: { color: '#f22521', icon: 'solar:flag-bold' },
    Medium: { color: '#ffcc00', icon: 'solar:flag-bold' },
    Low: { color: '#3399ff', icon: 'solar:flag-bold' },
};

function RoleViewSwitcher({ value, onChange }: { value: 'Self' | 'Manager'; onChange: (val: 'Self' | 'Manager') => void }) {
    const theme = useTheme();
    const [pressed, setPressed] = useState(false);

    const activeIndex = value === 'Self' ? 0 : 1;

    const renderOption = (label: string, optionValue: 'Self' | 'Manager') => {
        const isActive = value === optionValue;
        return (
            <ButtonBase
                disableRipple
                onClick={() => onChange(optionValue)}
                onMouseDown={() => setPressed(true)}
                onMouseUp={() => setPressed(false)}
                onMouseLeave={() => setPressed(false)}
                onTouchStart={() => setPressed(true)}
                onTouchEnd={() => setPressed(false)}
                sx={{
                    flex: 1,
                    height: 32,
                    borderRadius: '30px',
                    px: 1.5,
                    zIndex: 2,
                    position: 'relative',
                    transition: theme.transitions.create(
                        ['color', 'transform', 'text-shadow'],
                        { duration: 280, easing: theme.transitions.easing.easeInOut }
                    ),
                    color: isActive ? 'common.white' : 'text.disabled',
                    '&:hover': !isActive
                        ? {
                            color: 'primary.main',
                            transform: 'translateY(-1px)',
                        }
                        : {},
                    '&:active': {
                        transform: 'scale(0.96)',
                    },
                }}
            >
                <Typography
                    variant="caption"
                    sx={{
                        fontSize: '13px',
                        fontWeight: isActive ? 700 : 600,
                        whiteSpace: 'nowrap',
                        transform: isActive ? 'scale(1.04)' : 'scale(1)',
                        transition: theme.transitions.create('transform', {
                            duration: 280,
                            easing: theme.transitions.easing.easeInOut,
                        }),
                    }}
                >
                    {label}
                </Typography>
            </ButtonBase>
        );
    };

    return (
        <Box
            sx={{
                p: 0.25,
                borderRadius: '40px',
                background: `linear-gradient(135deg,
                    ${alpha(theme.palette.common.white, 0.94)},
                    ${alpha(theme.palette.primary.lighter ?? theme.palette.primary.light, 0.16)}
                )`,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
                display: 'inline-flex',
                alignItems: 'center',
                minWidth: 160,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: `
                    0 8px 24px -16px ${alpha(theme.palette.common.black, 0.2)},
                    inset 0 1px 0 ${alpha(theme.palette.common.white, 0.92)}
                `,
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    top: 2,
                    left: 2,
                    width: 'calc(50% - 2px)',
                    height: 'calc(100% - 4px)',
                    borderRadius: '32px',
                    background: `linear-gradient(135deg,
                        ${value === 'Self' ? theme.palette.info.light : theme.palette.primary.light},
                        ${value === 'Self' ? theme.palette.info.main : theme.palette.primary.main}
                    )`,
                    transform: `translateX(${activeIndex * 100}%) scale(${pressed ? 0.95 : 1})`,
                    transition: theme.transitions.create(['transform', 'box-shadow'], {
                        easing: theme.transitions.easing.easeInOut,
                        duration: 320,
                    }),
                }}
            />
            <Stack direction="row" sx={{ width: '100%', position: 'relative', zIndex: 3 }}>
                {renderOption('Self', 'Self')}
                {renderOption('Manager', 'Manager')}
            </Stack>
        </Box>
    );
}

export function HRTaskSummaryCards({ employeeFilter }: { employeeFilter?: string }) {
    const theme = useTheme();
    const { user } = useAuth();
    const isTaskManager = user?.roles?.includes('Task Manager');
    const [viewMode, setViewMode] = useState<'Self' | 'Manager'>('Self');

    const [stats, setStats] = useState({ total: 0, open: 0, reopen: 0, in_progress: 0, completed: 0, on_hold: 0 });
    const [overdueTasks, setOverdueTasks] = useState<TaskManager[]>([]);
    const [upcomingTasks, setUpcomingTasks] = useState<TaskManager[]>([]);

    const [loading, setLoading] = useState(true);
    const [tasksLoading, setTasksLoading] = useState(true);

    const [projects, setProjects] = useState<{ name: string; project: string }[]>([]);
    const [departments, setDepartments] = useState<{ name: string; department_name: string }[]>([]);

    const [selectedProject, setSelectedProject] = useState('All');
    const [selectedDepartment, setSelectedDepartment] = useState('All');

    const [fromDate, setFromDate] = useState<Dayjs | null>(null);
    const [toDate, setToDate] = useState<Dayjs | null>(null);

    // Pagination states
    const [overduePage, setOverduePage] = useState(0);
    const [overdueRowsPerPage, setOverdueRowsPerPage] = useState(5);
    const [upcomingPage, setUpcomingPage] = useState(0);
    const [upcomingRowsPerPage, setUpcomingRowsPerPage] = useState(5);

    useEffect(() => {
        const loadOptions = async () => {
            try {
                const [projData, deptData] = await Promise.all([
                    fetchProjects(),
                    fetchDepartments()
                ]);
                setProjects(projData);
                setDepartments(deptData);
            } catch (error) {
                console.error('Failed to fetch filter options:', error);
            }
        };
        loadOptions();
    }, []);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setTasksLoading(true);

            const effectiveEmployeeFilter = (isTaskManager && viewMode === 'Manager') ? undefined : employeeFilter;

            // Fetch Stats
            const statsData = await fetchHRTaskStats(
                selectedProject,
                selectedDepartment,
                fromDate?.format('YYYY-MM-DD'),
                toDate?.format('YYYY-MM-DD'),
                effectiveEmployeeFilter
            );
            setStats(statsData);

            const today = dayjs().format('YYYY-MM-DD');
            const nextWeek = dayjs().add(7, 'days').format('YYYY-MM-DD');

            // Resolve employee tasks if filtering by employee
            let employeeTaskNames: string[] | null = null;
            if (effectiveEmployeeFilter) {
                employeeTaskNames = statsData.employee_task_names || [];

                if (employeeTaskNames.length === 0) {
                    setOverdueTasks([]);
                    setUpcomingTasks([]);
                    return;
                }
            }

            // Common filters
            const baseFilters: any[] = [];
            if (selectedProject !== 'All') baseFilters.push(['Task Manager', 'project', '=', selectedProject]);
            if (selectedDepartment !== 'All') baseFilters.push(['Task Manager', 'department', '=', selectedDepartment]);
            if (employeeTaskNames && employeeTaskNames.length > 0) {
                baseFilters.push(['Task Manager', 'name', 'in', employeeTaskNames]);
            }

            // Fetch Overdue
            const overdueFilters = [
                ...baseFilters,
                ['Task Manager', 'due_date', '<', today],
                ['Task Manager', 'status', 'in', ['Open', 'In Progress', 'Reopened']]
            ];

            // Fetch Upcoming
            const upcomingFilters = [
                ...baseFilters,
                ['Task Manager', 'due_date', 'between', [today, nextWeek]],
                ['Task Manager', 'status', 'in', ['Open', 'In Progress', 'Reopened']]
            ];

            const [overdueData, upcomingData] = await Promise.all([
                fetchTaskManagerList(overdueFilters),
                fetchTaskManagerList(upcomingFilters)
            ]);

            setOverdueTasks(overdueData);
            setUpcomingTasks(upcomingData);
            setOverduePage(0);
            setUpcomingPage(0);

        } catch (error) {
            console.error('Failed to fetch task data:', error);
        } finally {
            setLoading(false);
            setTasksLoading(false);
        }
    }, [selectedProject, selectedDepartment, fromDate, toDate, employeeFilter, isTaskManager, viewMode]);

    useEffect(() => {
        loadData();
    }, [loadData]);



    const autocompleteSx = {
        minWidth: 220,
        '& .MuiOutlinedInput-root': {
            height: 40,
            padding: '0 14px',
            borderRadius: '20px',
            bgcolor: alpha(theme.palette.grey[500], 0.06),
            fontSize: '13px',
            fontWeight: 600,
            '& fieldset': {
                borderColor: alpha(theme.palette.grey[500], 0.18),
            },
            '&:hover fieldset': {
                borderColor: theme.palette.primary.main,
            },
            '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
                borderWidth: '1.5px',
            },
        },
    };

    const datePickerSx = {
        ...autocompleteSx,
        minWidth: 180,
        width: 180,
        '& .MuiInputBase-root': {
            height: 40,
        },
        '& .MuiInputBase-input': {
            fontSize: '14px',
            py: 0,
        },
        '& .MuiInputLabel-root': {
            fontSize: '14px',
            '&:not(.MuiInputLabel-shrink)': {
                transform: 'translate(14px, 10px) scale(1)',
            },
            '&.MuiInputLabel-shrink': {
                fontSize: '14px',
                px: 0.5,
                bgcolor: theme.palette.background.paper,
            },
        },
    };



    return (
        <Card sx={{ p: 3, borderRadius: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'fontWeightBold', pl: 0.5, }}>Task Analytics Overview</Typography>
                    {employeeFilter && isTaskManager && (
                        <RoleViewSwitcher value={viewMode} onChange={setViewMode} />
                    )}
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                            label="From Due Date"
                            value={fromDate}
                            onChange={(val) => setFromDate(val)}
                            slotProps={{
                                textField: {
                                    size: 'small',
                                    sx: datePickerSx,
                                }
                            }}
                        />
                        <DatePicker
                            label="To Due Date"
                            value={toDate}
                            onChange={(val) => setToDate(val)}
                            slotProps={{
                                textField: {
                                    size: 'small',
                                    sx: datePickerSx,
                                }
                            }}
                        />
                    </LocalizationProvider>

                    <Autocomplete
                        size="small"
                        options={['All Projects', ...projects.map(p => p.project)]}
                        filterOptions={(options, params) => {
                            const filtered = filter(options, params);
                            return filtered.slice(0, 10);
                        }}
                        value={selectedProject === 'All' ? 'All Projects' : projects.find(p => p.name === selectedProject)?.project || 'All Projects'}
                        onChange={(_event, newValue) => {
                            if (!newValue || newValue === 'All Projects') {
                                setSelectedProject('All');
                            } else {
                                const proj = projects.find(p => p.project === newValue);
                                setSelectedProject(proj ? proj.name : 'All');
                            }
                        }}
                        sx={autocompleteSx}
                        renderInput={(params) => <TextField {...params} placeholder="Project" />}
                    />

                    {(!employeeFilter || (isTaskManager && viewMode === 'Manager')) && (
                        <Autocomplete
                            size="small"
                            options={['All Departments', ...departments.map(d => d.department_name)]}
                            filterOptions={(options, params) => {
                                const filtered = filter(options, params);
                                return filtered.slice(0, 10);
                            }}
                            value={selectedDepartment === 'All' ? 'All Departments' : departments.find(d => d.name === selectedDepartment)?.department_name || 'All Departments'}
                            onChange={(_event, newValue) => {
                                if (!newValue || newValue === 'All Departments') {
                                    setSelectedDepartment('All');
                                } else {
                                    const dept = departments.find(d => d.department_name === newValue);
                                    setSelectedDepartment(dept ? dept.name : 'All');
                                }
                            }}
                            sx={autocompleteSx}
                            renderInput={(params) => <TextField {...params} placeholder="Department" />}
                        />
                    )}
                </Box>
            </Box>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
                    <HRSummaryWidget
                        title="Total Tasks"
                        total={stats.total}
                        loading={loading}
                        compact
                        borderStyle="borderLeft"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
                    <HRSummaryWidget
                        title="Open Tasks"
                        total={stats.open}
                        loading={loading}
                        color="primary"
                        compact
                        borderStyle="borderLeft"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
                    <HRSummaryWidget
                        title="In Progress Tasks"
                        total={stats.in_progress}
                        loading={loading}
                        color="info"
                        compact
                        borderStyle="borderLeft"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
                    <HRSummaryWidget
                        title="Completed Tasks"
                        total={stats.completed}
                        loading={loading}
                        color="success"
                        compact
                        borderStyle="borderLeft"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
                    <HRSummaryWidget
                        title="Reopen Tasks"
                        total={stats.reopen}
                        loading={loading}
                        color="error"
                        compact
                        borderStyle="borderLeft"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
                    <HRSummaryWidget
                        title="On Hold Tasks"
                        total={stats.on_hold}
                        loading={loading}
                        color="warning"
                        compact
                        borderStyle="borderLeft"
                    />
                </Grid>
            </Grid>

            <Divider sx={{ my: 4, borderStyle: 'dashed' }} />

            <Grid container spacing={4}>
                {/* Overdue Tasks Column */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, pl: 1, color: '#d03f18' }}>
                            Overdue Tasks
                        </Typography>
                        <Label color="error" variant="soft" sx={{ height: 22, px: 0.75, fontSize: 12, fontWeight: 800, borderRadius: '6px' }}>
                            {overdueTasks.length}
                        </Label>
                    </Stack>

                    <TaskMiniTable
                        tasks={overdueTasks}
                        loading={tasksLoading}
                        isOverdue
                        theme={theme}
                        page={overduePage}
                        onPageChange={(e, p) => setOverduePage(p)}
                        rowsPerPage={overdueRowsPerPage}
                        onRowsPerPageChange={(e) => {
                            setOverdueRowsPerPage(parseInt(e.target.value, 10));
                            setOverduePage(0);
                        }}
                    />
                </Grid>

                {/* Upcoming Tasks Column */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, pl: 1, color: '#0EA5E9' }}>
                            Upcoming (Next 7 Days)
                        </Typography>
                        <Label color="info" variant="soft" sx={{ height: 22, px: 0.75, fontSize: 12, fontWeight: 800, borderRadius: '6px' }}>
                            {upcomingTasks.length}
                        </Label>
                    </Stack>

                    <TaskMiniTable
                        tasks={upcomingTasks}
                        loading={tasksLoading}
                        theme={theme}
                        page={upcomingPage}
                        onPageChange={(e, p) => setUpcomingPage(p)}
                        rowsPerPage={upcomingRowsPerPage}
                        onRowsPerPageChange={(e) => {
                            setUpcomingRowsPerPage(parseInt(e.target.value, 10));
                            setUpcomingPage(0);
                        }}
                    />
                </Grid>
            </Grid>
        </Card>
    );
}

// ----------------------------------------------------------------------

import TablePagination from '@mui/material/TablePagination';

const MINI_TABLE_HEAD = [
    { id: 'title', label: 'Task Title', width: 140 },
    { id: 'project', label: 'Project', width: 120 },
    { id: 'due_date', label: 'Due Date', width: 120, align: 'right' },
];

function TaskMiniTable({
    tasks,
    loading,
    isOverdue,
    theme,
    page,
    onPageChange,
    rowsPerPage,
    onRowsPerPageChange
}: {
    tasks: TaskManager[],
    loading: boolean,
    isOverdue?: boolean,
    theme: any,
    page: number,
    onPageChange: (event: unknown, newPage: number) => void,
    rowsPerPage: number,
    onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}) {
    const dataFiltered = tasks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Box sx={{ border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`, borderRadius: 2, overflow: 'hidden' }}>
            <Scrollbar>
                <TableContainer sx={{ position: 'relative', minHeight: 320 }}>
                    {loading && (
                        <Box sx={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: alpha(theme.palette.background.paper, 0.48),
                            zIndex: 9
                        }}>
                            <CircularProgress size={32} />
                        </Box>
                    )}
                    <Table size="medium" sx={{
                        '& .MuiTableCell-head': {
                            bgcolor: (th) => th.palette.background.neutral,
                            borderBottom: (th) => `1px solid ${th.palette.divider}`,
                            py: 1.5,
                            color: 'text.secondary',
                            fontSize: '0.8rem',
                            fontWeight: 700
                        }
                    }}>
                        <TableHeadCustom
                            headLabel={MINI_TABLE_HEAD}
                            rowCount={tasks.length}
                            numSelected={0}
                            onSelectAllRows={() => { }}
                            hideCheckbox
                        />

                        <TableBody>
                            {dataFiltered.map((task) => (
                                <TableRow key={task.name} hover sx={{ '& td': { borderBottom: `1px solid ${alpha(theme.palette.grey[500], 0.08)}` } }}>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Box sx={{ maxWidth: 200 }}>
                                            <Typography
                                                noWrap
                                                variant="subtitle2"
                                                sx={{
                                                    fontWeight: 600,
                                                    fontSize: '0.875rem',
                                                    color: 'text.primary',
                                                }}
                                            >
                                                {task.title}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 500 }}>
                                                {task.name}
                                            </Typography>
                                        </Box>
                                    </TableCell>

                                    <TableCell>
                                        <Box sx={{ maxWidth: 140 }}>
                                            <Typography
                                                noWrap
                                                variant="body2"
                                                sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
                                            >
                                                {task.project || '—'}
                                            </Typography>
                                        </Box>
                                    </TableCell>

                                    <TableCell align="right" sx={{ width: 120 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            {(() => {
                                                if (!task.due_date) return (
                                                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                                        —
                                                    </Typography>
                                                );
                                                const taskDate = dayjs(task.due_date);
                                                const today = dayjs().startOf('day');
                                                const tomorrow = dayjs().add(1, 'day').startOf('day');

                                                if (taskDate.isSame(today, 'day')) {
                                                    return (
                                                        <Label variant="soft" color="error" sx={{ height: 24, px: 1, minWidth: 0, fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                                                            Today
                                                        </Label>
                                                    );
                                                }
                                                if (taskDate.isSame(tomorrow, 'day')) {
                                                    return (
                                                        <Label variant="soft" color="warning" sx={{ height: 24, px: 1, minWidth: 0, fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                                                            Tomorrow
                                                        </Label>
                                                    );
                                                }
                                                return (
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            fontWeight: 600,
                                                            fontSize: '0.8rem',
                                                            color: isOverdue ? '#ff5630' : 'text.secondary',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {fDate(task.due_date)}
                                                    </Typography>
                                                );
                                            })()}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {tasks.length > 0 && Array.from({ length: Math.max(0, rowsPerPage - dataFiltered.length) }).map((_, index) => (
                                <TableRow key={`empty-${index}`} sx={{ height: 61 }}>
                                    <TableCell colSpan={3} />
                                </TableRow>
                            ))}

                            {tasks.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={3}>
                                        <Stack
                                            alignItems="center"
                                            justifyContent="center"
                                            sx={{
                                                py: 10,
                                                textAlign: 'center',
                                                height: 305
                                            }}
                                        >
                                            <Iconify
                                                icon="solar:notes-bold-duotone"
                                                width={64}
                                                sx={{ color: 'text.disabled', opacity: 0.24, mb: 2 }}
                                            />
                                            <Typography variant="subtitle2" sx={{ color: 'text.disabled', fontWeight: 700, fontSize: '16px' }}>
                                                {isOverdue ? 'No Overdue Tasks Found' : 'No Upcoming Tasks Found'}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.disabled', maxWidth: 200, mt: 0.5 }}>
                                                Everything is on track! There are no {isOverdue ? 'overdue' : 'upcoming'} items at this time.
                                            </Typography>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Scrollbar>

            <TablePagination
                component="div"
                count={tasks.length}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={onPageChange}
                onRowsPerPageChange={onRowsPerPageChange}
                rowsPerPageOptions={[5, 10, 25]}
                sx={{
                    borderTop: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                    bgcolor: alpha(theme.palette.grey[500], 0.02),
                }}
            />
        </Box>
    );
}
