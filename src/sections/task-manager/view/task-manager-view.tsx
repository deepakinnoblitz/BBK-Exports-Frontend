import { useSearchParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import { alpha, useTheme } from '@mui/material/styles';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { useSocket } from 'src/hooks/use-socket';

import { fDate } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { deleteTaskManager } from 'src/api/task-manager';
import { TaskManager, fetchTaskManagerList, updateTaskStatus, fetchProjects, fetchDepartments, fetchEmployees, getTaskManagerPermissions } from 'src/api/task-manager';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { useAuth } from 'src/auth/auth-context';

import TaskListView from '../list/task-list-view';
import { TaskNewEditForm } from '../task-new-edit-form';
import TaskKanbanBoard from '../kanban/task-kanban-board';
import TaskDetailsDialog from '../kanban/task-details-dialog';
import { TaskTableToolbar } from '../list/task-table-toolbar';
import { TaskTableFiltersDrawer, TaskFiltersProps } from '../list/task-table-filters-drawer';

// ----------------------------------------------------------------------

const SORT_OPTIONS = [
    { value: 'latest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'due_date_asc', label: 'Due Date: Ascending' },
    { value: 'due_date_desc', label: 'Due Date: Descending' },
    { value: 'title_asc', label: 'Title: A to Z' },
    { value: 'title_desc', label: 'Title: Z to A' },
];

const defaultKanbanFilters: TaskFiltersProps = {
    status: 'all',
    project: 'all',
    priority: 'all',
    due_date: null,
    assignee: 'all',
    department: 'all',
};

export default function TaskManagerView() {
    const theme = useTheme();
    const { user } = useAuth();
    const { socket } = useSocket(user?.email);
    const [searchParams] = useSearchParams();
    const viewMode = searchParams.get('view');

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const actionPerms = user?.permissions?.actions?.task_manager || user?.permissions?.actions?.my_tasks;
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && !!actionPerms;
    const canCreateTask = hasCustomPerms && actionPerms ? !!actionPerms?.create : true;

    const [tasks, setTasks] = useState<TaskManager[]>([]);
    const [loading, setLoading] = useState(true);
    const [openForm, setOpenForm] = useState(false);
    const [view, setView] = useState<'kanban' | 'list'>('list');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [permissions, setPermissions] = useState({ read: false, write: false, create: false, delete: false });

    // ── Shared search + sort state ──
    const [filterName, setFilterName] = useState('');
    const [sortBy, setSortBy] = useState('latest');

    // ── Kanban-specific filters ──
    const [kanbanFilters, setKanbanFilters] = useState<TaskFiltersProps>(defaultKanbanFilters);
    const [openKanbanFilters, setOpenKanbanFilters] = useState(false);
    const [filterOptions, setFilterOptions] = useState<{
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

    const [selectedTask, setSelectedTask] = useState<TaskManager | null>(null);
    const [openDetails, setOpenDetails] = useState(false);
    const [openDelete, setOpenDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const getTasks = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchTaskManagerList();
            setTasks(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        getTasks();
    }, [getTasks]);

    // Load filter options and permissions once
    useEffect(() => {
        Promise.all([fetchProjects(), fetchDepartments(), fetchEmployees(), getTaskManagerPermissions()])
            .then(([projects, departments, employees, taskPermissions]) => {
                setFilterOptions((prev) => ({ ...prev, projects, departments, employees }));
                setPermissions(taskPermissions);
            })
            .catch(console.error);
    }, []);

    const handleUpdateStatus = async (taskId: string, newStatus: string) => {
        try {
            await updateTaskStatus(taskId, newStatus);
            getTasks();
            setSnackbar({ open: true, message: 'Task status updated!', severity: 'success' });
        } catch (error: any) {
            console.error(error);
            setSnackbar({ open: true, message: error?.message || 'Failed to update status.', severity: 'error' });
        }
    };

    const handleOpenDetails = (task: TaskManager) => {
        setSelectedTask(task);
        setOpenDetails(true);
    };

    const handleEditTask = (task: TaskManager) => {
        setSelectedTask(task);
        setOpenDetails(false);
        setOpenForm(true);
    };

    const handleDeleteTask = (task: TaskManager) => {
        setSelectedTask(task);
        setOpenDelete(true);
    };

    const confirmDeleteTask = async () => {
        if (!selectedTask) return;
        try {
            setDeleting(true);
            await deleteTaskManager(selectedTask.name);
            setOpenDelete(false);
            setOpenDetails(false);
            setSelectedTask(null);
            getTasks();
            setSnackbar({ open: true, message: 'Task deleted successfully!', severity: 'success' });
        } catch (error: any) {
            console.error(error);
            setSnackbar({ open: true, message: error?.message || 'Failed to delete task.', severity: 'error' });
        } finally {
            setDeleting(false);
        }
    };

    const sortTasks = useCallback((data: TaskManager[]) => [...data].sort((a, b) => {
        if (sortBy === 'latest') return new Date(b.modified).getTime() - new Date(a.modified).getTime();
        if (sortBy === 'oldest') return new Date(a.modified).getTime() - new Date(b.modified).getTime();

        if (sortBy === 'due_date_asc') {
            if (!a.due_date && !b.due_date) return 0;
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (sortBy === 'due_date_desc') {
            if (!a.due_date && !b.due_date) return 0;
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
        }

        if (sortBy === 'title_asc') return a.title.localeCompare(b.title);
        if (sortBy === 'title_desc') return b.title.localeCompare(a.title);
        return 0;
    }), [sortBy]);

    const kanbanCanReset =
        !!filterName ||
        kanbanFilters.status !== 'all' ||
        kanbanFilters.project !== 'all' ||
        kanbanFilters.priority !== 'all' ||
        !!kanbanFilters.due_date ||
        kanbanFilters.assignee !== 'all' ||
        kanbanFilters.department !== 'all';

    // Users with Task Manager role get full access (all tasks, like HR).
    // Regular employees only see tasks assigned to them.
    const isTaskManager = user?.roles?.includes('Task Manager') || user?.roles?.includes('HR') || user?.roles?.includes('Administrator');

    const canSeeAll = isTaskManager && viewMode === 'all';

    // Base set of tasks based on role and view parameter
    const baseTasks = canSeeAll
        ? tasks
        : (user?.employee
            ? tasks.filter((task) => task.assignees?.some((a) => a.employee === user.employee))
            : tasks);

    const pageTitle = canSeeAll ? 'Task Manager' : 'My Tasks';

    const kanbanTasks = sortTasks(baseTasks.filter((task) => {
        if (filterName && !task.title.toLowerCase().includes(filterName.toLowerCase())) return false;
        if (kanbanFilters.status !== 'all' && task.status !== kanbanFilters.status) return false;
        if (kanbanFilters.project !== 'all' && task.project !== kanbanFilters.project) return false;
        if (kanbanFilters.priority !== 'all' && task.priority !== kanbanFilters.priority) return false;
        if (kanbanFilters.due_date && task.due_date !== kanbanFilters.due_date) return false;
        if (kanbanFilters.department !== 'all' && task.department !== kanbanFilters.department) return false;
        if (kanbanFilters.assignee !== 'all') {
            const hasAssignee = task.assignees?.some((a) => a.employee === kanbanFilters.assignee);
            if (!hasAssignee) return false;
        }
        return true;
    }));

    const listTasks = sortTasks(baseTasks);

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Container maxWidth="xl" sx={{ height: 1, display: 'flex', flexDirection: 'column', px: { xs: 2, md: 1 } }}>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    justifyContent="space-between"
                    spacing={{ xs: 2, sm: 0 }}
                    mb={3}
                >
                    <Box>
                        <Typography variant="h4" gutterBottom>{pageTitle}</Typography>
                    </Box>

                    <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} alignItems="center" flexWrap="wrap" gap={1}>
                        <ToggleButtonGroup
                            size="small"
                            value={view}
                            exclusive
                            onChange={(e, newView) => newView && setView(newView)}
                            sx={{
                                p: 0.5,
                                gap: 0.5,
                                borderRadius: '24px',
                                bgcolor: alpha(theme.palette.grey[500], 0.06),
                                border: `1px solid ${alpha(theme.palette.grey[500], 0.08)}`,
                                '& .MuiToggleButton-root': {
                                    px: { xs: 1.25, sm: 2.5 },
                                    height: { xs: 36, sm: 30 },
                                    border: '0 !important',
                                    borderRadius: '20px !important',
                                    typography: 'subtitle2',
                                    color: theme.palette.text.secondary,
                                    textTransform: 'capitalize',
                                    transition: 'all 0.2s ease-in-out',
                                    whiteSpace: 'nowrap',
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.grey[500], 0.08),
                                    },
                                    '&.Mui-selected': {
                                        color: '#fff !important',
                                        bgcolor: '#059669 !important',
                                        boxShadow: `0 2px 8px ${alpha('#059669', 0.3)}`,
                                        fontWeight: 700,
                                        '&:hover': {
                                            bgcolor: '#059669 !important',
                                        },
                                    },
                                },
                            }}
                        >
                            <ToggleButton value="list">
                                <Iconify icon="solar:list-bold-duotone" width={18} sx={{ mr: { xs: 0.5, sm: 1 } }} />
                                List View
                            </ToggleButton>
                            <ToggleButton value="kanban">
                                <Iconify icon="solar:widget-5-bold-duotone" width={18} sx={{ mr: { xs: 0.5, sm: 1 } }} />
                                Kanban View
                            </ToggleButton>
                        </ToggleButtonGroup>

                        {(canSeeAll || canCreateTask) && (
                            <Button
                                variant="contained"
                                startIcon={<Iconify icon="mingcute:add-line" />}
                                onClick={() => setOpenForm(true)}
                                sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                            >
                                New Task
                            </Button>
                        )}
                    </Stack>
                </Stack>

                {/* ── Kanban toolbar — same as List ── */}
                {view === 'kanban' && (
                    <>
                        <Card sx={{ mb: 3, boxShadow: 'none', border: `solid 1px ${theme.palette.divider}` }}>
                            <TaskTableToolbar
                                filterName={filterName}
                                onFilterName={(e) => setFilterName(e.target.value)}
                                sortBy={sortBy}
                                onSortChange={setSortBy}
                                sortOptions={SORT_OPTIONS}
                                canReset={kanbanCanReset}
                                onOpenFilter={() => setOpenKanbanFilters(true)}
                            />
                        </Card>

                        <TaskTableFiltersDrawer
                            open={openKanbanFilters}
                            onOpen={() => setOpenKanbanFilters(true)}
                            onClose={() => setOpenKanbanFilters(false)}
                            filters={kanbanFilters}
                            onFilters={(update) => setKanbanFilters((prev) => ({ ...prev, ...update }))}
                            canReset={kanbanCanReset}
                            onResetFilters={() => setKanbanFilters(defaultKanbanFilters)}
                            options={filterOptions}
                        />
                    </>
                )}

                {view === 'kanban' ? (
                    <TaskKanbanBoard
                        tasks={kanbanTasks}
                        onUpdateStatus={handleUpdateStatus}
                        onViewDetails={handleOpenDetails}
                        onEditTask={handleEditTask}
                        onDeleteTask={handleDeleteTask}
                        loading={loading}
                        permissions={permissions}
                    />
                ) : (
                    <TaskListView
                        tasks={listTasks}
                        loading={loading}
                        onViewDetails={handleOpenDetails}
                        onEditTask={handleEditTask}
                        onDeleteTask={handleDeleteTask}
                        filterName={filterName}
                        onFilterName={(e) => {
                            setFilterName(e.target.value);
                            setPage(0);
                        }}
                        sortBy={sortBy}
                        onSortChange={(value) => {
                            setSortBy(value);
                            setPage(0);
                        }}
                        sortOptions={SORT_OPTIONS}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        onPageChange={(e: any, newPage: number) => setPage(newPage)}
                        onRowsPerPageChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        permissions={permissions}
                    />
                )}
            </Container>

            <TaskNewEditForm
                open={openForm}
                onClose={() => {
                    setOpenForm(false);
                    setSelectedTask(null);
                }}
                currentTask={selectedTask}
                onSuccess={getTasks}
            />

            <TaskDetailsDialog
                open={openDetails}
                task={selectedTask}
                onClose={() => {
                    setOpenDetails(false);
                    setSelectedTask(null);
                }}
                onEdit={() => selectedTask && handleEditTask(selectedTask)}
                onDelete={() => selectedTask && setOpenDelete(true)}
                onSuccess={() => {
                    getTasks();
                    setOpenDetails(false);
                }}
                permissions={permissions}
            />

            <ConfirmDialog
                open={openDelete}
                onClose={() => setOpenDelete(false)}
                title="Delete Task"
                content="Are you sure you want to delete this task? This action cannot be undone."
                action={
                    <Button
                        variant="contained"
                        color="error"
                        onClick={confirmDeleteTask}
                        loading={deleting}
                        sx={{ borderRadius: 1.5 }}
                    >
                        Delete
                    </Button>
                }
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </DashboardContent>
    );
}
