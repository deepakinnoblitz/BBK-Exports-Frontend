import { varAlpha } from 'minimal-shared/utils';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import AvatarGroup from '@mui/material/AvatarGroup';
import { alpha, Theme } from '@mui/material/styles';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { fDate } from 'src/utils/format-time';
import { getInitials } from 'src/utils/string';
import { stringToColor, stringToDarkColor } from 'src/utils/color-utils';

import { TaskManager, fetchProjects, fetchDepartments, fetchEmployees } from 'src/api/task-manager';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { TableHeadCustom } from 'src/components/table';
import { EmptyContent } from 'src/components/empty-content';

import { useAuth } from 'src/auth/auth-context';

import { TableNoData } from './table-no-data';
import { TaskTableToolbar } from './task-table-toolbar';
import { TableEmptyRows } from '../../lead/table-empty-rows';
import { TaskTableFiltersDrawer, TaskFiltersProps } from './task-table-filters-drawer';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
    { id: 'sno', label: 'S.No', align: 'center', width: 60 },
    { id: 'title', label: 'Title', width: 280 },
    { id: 'project', label: 'Project', width: 140 },
    { id: 'priority', label: 'Priority', width: 120 },
    { id: 'status', label: 'Status', width: 120 },
    { id: 'due_date', label: 'Due Date', width: 120 },
    { id: 'assignee', label: 'Assignee', width: 160 },
    { id: 'actions', label: 'Actions', width: 120, align: 'right' },
];

const STATUS_LABEL_COLOR: Record<string, 'error' | 'warning' | 'success' | 'info' | 'default'> = {
    Open: 'error',
    'In Progress': 'warning',
    Completed: 'success',
    Reopened: 'error',
};

const PRIORITY_MAP: Record<string, { color: string, icon: string }> = {
    High: { color: '#f22521', icon: 'solar:flag-bold' },
    Medium: { color: '#ffcc00', icon: 'solar:flag-bold' },
    Low: { color: '#3399ff', icon: 'solar:flag-bold' },
};

interface Props {
    tasks: TaskManager[];
    loading: boolean;
    onViewDetails: (task: TaskManager) => void;
    onEditTask: (task: TaskManager) => void;
    onDeleteTask: (task: TaskManager) => void;
    // Filter Props
    filterName: string;
    onFilterName: (event: React.ChangeEvent<HTMLInputElement>) => void;
    sortBy: string;
    onSortChange: (value: string) => void;
    sortOptions: { value: string; label: string }[];
    // Pagination Props
    page: number;
    rowsPerPage: number;
    onPageChange: (event: unknown, newPage: number) => void;
    onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    permissions: { read: boolean; write: boolean; create: boolean; delete: boolean };
}

const defaultFilters: TaskFiltersProps = {
    status: 'all',
    project: 'all',
    priority: 'all',
    due_date: null,
    assignee: 'all',
    department: 'all',
};

export default function TaskListView({
    tasks,
    loading,
    onViewDetails,
    onEditTask,
    onDeleteTask,
    filterName,
    onFilterName,
    sortBy,
    onSortChange,
    sortOptions,
    page,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange,
    permissions,
}: Props) {
    const [openFilters, setOpenFilters] = useState(false);
    const [filters, setFilters] = useState<TaskFiltersProps>(defaultFilters);
    const [options, setOptions] = useState<{
        statuses: string[];
        projects: { name: string; project: string }[];
        priorities: string[];
        employees: { name: string; employee_name: string }[];
        departments: { name: string; department_name: string }[];
    }>({
        statuses: ['Open', 'In Progress', 'Completed', 'Reopened'],
        projects: [],
        priorities: ['Low', 'Medium', 'High'],
        employees: [],
        departments: [],
    });

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [projects, departments, employees] = await Promise.all([
                    fetchProjects(),
                    fetchDepartments(),
                    fetchEmployees(),
                ]);
                setOptions((prev) => ({
                    ...prev,
                    projects,
                    departments,
                    employees,
                }));
            } catch (error) {
                console.error('Failed to fetch filter options', error);
            }
        };
        fetchOptions();
    }, []);

    const handleFilters = useCallback((update: Partial<TaskFiltersProps>) => {
        setFilters((prev) => ({ ...prev, ...update }));
    }, []);

    const handleResetFilters = useCallback(() => {
        setFilters(defaultFilters);
    }, []);

    const canReset =
        !!filterName ||
        filters.status !== 'all' ||
        filters.project !== 'all' ||
        filters.priority !== 'all' ||
        !!filters.due_date ||
        filters.assignee !== 'all' ||
        filters.department !== 'all';

    const dataFiltered = tasks.filter((task) => {
        if (filterName) {
            const searchStr = filterName.toLowerCase();
            const titleMatch = task.title?.toLowerCase().includes(searchStr);
            const nameMatch = task.name?.toLowerCase().includes(searchStr);
            if (!titleMatch && !nameMatch) return false;
        }
        if (filters.status !== 'all' && task.status !== filters.status) return false;
        if (filters.project !== 'all' && task.project !== filters.project) return false;
        if (filters.priority !== 'all' && task.priority !== filters.priority) return false;
        if (filters.due_date && task.due_date !== filters.due_date) return false;
        if (filters.department !== 'all' && task.department !== filters.department) return false;
        if (filters.assignee !== 'all') {
            const hasAssignee = task.assignees?.some((a) => a.employee === filters.assignee);
            if (!hasAssignee) return false;
        }
        return true;
    });

    const isNotFound = !dataFiltered.length && (!!filterName || canReset);
    const isEmpty = !tasks.length && !loading;

    const { user } = useAuth();
    const actionPerms = user?.permissions?.actions?.task_manager || user?.permissions?.actions?.tasks;
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && !!actionPerms;
    const displayEdit = hasCustomPerms && actionPerms ? !!actionPerms?.edit : true;
    const displayDelete = hasCustomPerms && actionPerms ? !!actionPerms?.delete : true;

    return (
        <>
            <Card>
                <TaskTableToolbar
                    filterName={filterName}
                    onFilterName={onFilterName}
                    sortBy={sortBy}
                    onSortChange={onSortChange}
                    sortOptions={sortOptions}
                    canReset={canReset}
                    onOpenFilter={() => setOpenFilters(true)}
                />

                <Scrollbar>
                    <TableContainer sx={{ minWidth: 800, overflow: 'unset' }}>
                        <Table size="medium">
                            <TableHeadCustom
                                headLabel={TABLE_HEAD}
                                rowCount={dataFiltered.length}
                                numSelected={0}
                                onSelectAllRows={() => { }}
                                hideCheckbox
                            />

                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                                            <CircularProgress sx={{ color: '#059669' }} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {dataFiltered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((task, index) => (
                                            <TableRow
                                                key={task.name}
                                                hover
                                                onClick={() => onViewDetails(task)}
                                                sx={{
                                                    cursor: 'pointer',
                                                    '&:last-child td': { borderBottom: 0 },
                                                    '& td': { borderBottom: (t) => `1px solid ${t.palette.divider}` },
                                                }}
                                            >
                                                {/* Row Number */}
                                                <TableCell align="center">
                                                    <Box
                                                        sx={{
                                                            width: 28,
                                                            height: 28,
                                                            display: 'flex',
                                                            borderRadius: '50%',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                            color: 'primary.main',
                                                            typography: 'subtitle2',
                                                            fontWeight: 800,
                                                            border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                                                            mx: 'auto',
                                                            transition: (theme) => theme.transitions.create(['all'], { duration: theme.transitions.duration.shorter }),
                                                            '&:hover': {
                                                                bgcolor: 'primary.main',
                                                                color: 'primary.contrastText',
                                                                transform: 'scale(1.1)',
                                                            },
                                                        }}
                                                    >
                                                        {page * rowsPerPage + index + 1}
                                                    </Box>
                                                </TableCell>

                                                {/* Title & Name (ID) */}
                                                <TableCell sx={{ maxWidth: 280 }}>
                                                    <Box>
                                                        <Typography
                                                            variant="subtitle2"
                                                            sx={{
                                                                fontWeight: 700,
                                                                textTransform: 'capitalize',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            {task.title}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }} noWrap>
                                                            {task.name}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>

                                                {/* Project */}
                                                <TableCell sx={{ minWidth: 120 }}>
                                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }} noWrap>
                                                        {task.project || '—'}
                                                    </Typography>
                                                </TableCell>

                                                {/* Priority */}
                                                <TableCell sx={{ width: 100 }}>
                                                    {task.priority && (
                                                        <Stack direction="row" alignItems="center" spacing={0.5}>
                                                            <Iconify
                                                                icon={(PRIORITY_MAP[task.priority]?.icon || 'solar:flag-bold') as any}
                                                                width={18}
                                                                sx={{ color: PRIORITY_MAP[task.priority]?.color }}
                                                            />
                                                            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                                                                {task.priority}
                                                            </Typography>
                                                        </Stack>
                                                    )}
                                                </TableCell>

                                                {/* Status */}
                                                <TableCell sx={{ width: 120 }}>
                                                    <Label
                                                        variant="soft"
                                                        color={STATUS_LABEL_COLOR[task.status] || 'default'}
                                                        sx={{ textTransform: 'uppercase' }}
                                                    >
                                                        {task.status}
                                                    </Label>
                                                </TableCell>

                                                {/* Due Date */}
                                                <TableCell sx={{ width: 110 }}>
                                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }} noWrap>
                                                        {task.due_date ? fDate(task.due_date) : '—'}
                                                    </Typography>
                                                </TableCell>

                                                {/* Assignee */}
                                                <TableCell sx={{ minWidth: 100 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                                                        {task.assignees?.length === 1 ? (
                                                            <>
                                                                <Avatar
                                                                    alt={task.assignees[0].employee_name}
                                                                    src={task.assignees[0].profile_pic}
                                                                    sx={{
                                                                        width: 28,
                                                                        height: 28,
                                                                        fontSize: 11,
                                                                        bgcolor: stringToColor(task.assignees[0].employee_name || task.assignees[0].user || task.assignees[0].employee),
                                                                        color: stringToDarkColor(task.assignees[0].employee_name || task.assignees[0].user || task.assignees[0].employee),
                                                                        fontWeight: 800,
                                                                    }}
                                                                >
                                                                    {getInitials(task.assignees[0].employee_name || task.assignees[0].user || task.assignees[0].employee)}
                                                                </Avatar>
                                                                <Box sx={{ minWidth: 0 }}>
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{
                                                                            fontWeight: 600,
                                                                            fontSize: '0.825rem',
                                                                            whiteSpace: 'nowrap',
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            maxWidth: 100,
                                                                            color: 'text.primary'
                                                                        }}
                                                                    >
                                                                        {task.assignees[0].employee_name}
                                                                    </Typography>
                                                                </Box>
                                                            </>
                                                        ) : (
                                                            <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 10, border: 'none' } }}>
                                                                {(task.assignees || []).map((a) => (
                                                                    <Avatar
                                                                        key={a.employee}
                                                                        alt={a.employee_name}
                                                                        src={a.profile_pic}
                                                                        sx={{
                                                                            bgcolor: stringToColor(a.employee_name || a.user || a.employee),
                                                                            color: stringToDarkColor(a.employee_name || a.user || a.employee),
                                                                            fontWeight: 'bold',
                                                                        }}
                                                                    >
                                                                        {getInitials(a.employee_name || a.user || a.employee)}
                                                                    </Avatar>
                                                                ))}
                                                            </AvatarGroup>
                                                        )}
                                                    </Box>
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell onClick={(e) => e.stopPropagation()} align="right">
                                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => onViewDetails(task)}
                                                            sx={{ color: 'info.main' }}
                                                        >
                                                            <Iconify icon="solar:eye-bold" />
                                                        </IconButton>
                                                        {displayEdit && (
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => onEditTask(task)}
                                                                sx={{ color: 'primary.main' }}
                                                            >
                                                                <Iconify icon="solar:pen-bold" />
                                                            </IconButton>
                                                        )}
                                                        {displayDelete && (
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => onDeleteTask(task)}
                                                                sx={{ color: 'error.main' }}
                                                            >
                                                                <Iconify icon="solar:trash-bin-trash-bold" />
                                                            </IconButton>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))}

                                        <TableNoData
                                            notFound={isNotFound}
                                            searchQuery={filterName}
                                        />

                                        {isEmpty && (
                                            <TableRow>
                                                <TableCell colSpan={8}>
                                                    <EmptyContent
                                                        title="No tasks found"
                                                        description="Create your first task to get started."
                                                        icon="solar:clipboard-list-bold-duotone"
                                                        sx={{ py: 5 }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        )}

                                        {!isEmpty && !isNotFound && (
                                            <TableEmptyRows
                                                height={68}
                                                emptyRows={dataFiltered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).length < 5 ? 5 - dataFiltered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).length : 0}
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
                    count={dataFiltered.length}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={onPageChange}
                    onRowsPerPageChange={onRowsPerPageChange}
                    rowsPerPageOptions={[10, 25, 50]}
                />
            </Card>

            <TaskTableFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
                options={options}
            />
        </>
    );
}
