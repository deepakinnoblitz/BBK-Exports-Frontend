import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import { alpha } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import FormControlLabel from '@mui/material/FormControlLabel';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { frappeRequest } from 'src/utils/csrf';
import { floatToHHMM, hhmmToFloat } from 'src/utils/format-time';

import { getUsers } from 'src/api/user-permissions';
import {
    TaskManager,
    createTaskManager,
    updateTaskManager,
    getEmployeesFromDepartment,
    fetchProjects,
    fetchDepartments,
    fetchAllActiveEmployees,
    createProject,
    createDepartment
} from 'src/api/task-manager';

import { Iconify } from 'src/components/iconify';

import { CustomSwitch } from 'src/sections/reminders/reminders-settings-view';
// ----------------------------------------------------------------------

const filter = createFilterOptions<any>();

type Props = {
    open: boolean;
    onClose: () => void;
    currentTask?: TaskManager | null;
    onSuccess?: () => void;
};

const INITIAL_TASK_STATE: Partial<TaskManager> = {
    title: '',
    project: '',
    department: '',
    fetch_from_department: 0,
    status: 'Open',
    priority: 'Medium',
    due_date: dayjs().format('YYYY-MM-DD'),
    due_time: '10:00:00',
    estimated_time: 0,
    assignees: [],
    tag_member: '',
    attachment_required: 0,
    recurring_task: 0,
    recurring_frequency: '',
    description: '',
};

const STATUS_OPTIONS = ['Open', 'In Progress', 'Completed', 'Reopened'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High'];
const FREQUENCY_OPTIONS = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half Yearly'];

export function TaskNewEditForm({ open, onClose, currentTask, onSuccess }: Props) {
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
        open: false,
        message: '',
        severity: 'success',
    });
    const [taskData, setTaskData] = useState<Partial<TaskManager>>(INITIAL_TASK_STATE);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [projects, setProjects] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [estimatedTimeStr, setEstimatedTimeStr] = useState('');

    // Create Project state
    const [openProjectCreate, setOpenProjectCreate] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [creatingProject, setCreatingProject] = useState(false);

    // Create Department state
    const [openDepartmentCreate, setOpenDepartmentCreate] = useState(false);
    const [newDepartmentName, setNewDepartmentName] = useState('');
    const [creatingDepartment, setCreatingDepartment] = useState(false);

    useEffect(() => {
        if (open) {
            Promise.all([
                fetchProjects(),
                fetchDepartments(),
                fetchAllActiveEmployees(),  // ignore_permissions=True — returns ALL active employees
                getUsers()
            ]).then(([proj, dept, emp, usr]) => {
                setProjects(proj || []);
                setDepartments(dept || []);
                setEmployees(emp || []);
                setUsers(usr || []);
            }).catch(console.error);
        }
    }, [open]);

    useEffect(() => {
        if (currentTask) {
            // Clean description of HTML tags if it's being edited in a simple TextField
            const cleanDescription = currentTask.description?.replace(/<[^>]*>?/gm, '') || '';
            setTaskData({ ...currentTask, description: cleanDescription });
            setEstimatedTimeStr(floatToHHMM(currentTask.estimated_time || 0));
        } else {
            setTaskData(INITIAL_TASK_STATE);
            setEstimatedTimeStr('');
        }
    }, [currentTask, open]);

    const fetchEmployeesFromDept = async (dept: string) => {
        if (!dept) {
            setSnackbar({ open: true, message: 'Please select a Department first.', severity: 'warning' });
            return;
        }

        try {
            setLoading(true);
            const res = await frappeRequest(`/api/method/company.company.doctype.task_manager.task_manager.get_employees_from_department?department=${encodeURIComponent(dept)}`);
            const data = await res.json();

            if (data.message && data.message.length > 0) {
                const newAssignees = data.message.map((emp: any) => ({
                    employee: emp.name,
                    employee_name: emp.employee_name,
                    user: emp.user,
                    name: ''
                }));
                setTaskData(prev => ({ ...prev, assignees: newAssignees, fetch_from_department: 1 }));
                if (errors.assignees) setErrors(prev => ({ ...prev, assignees: '' }));
                setSnackbar({ open: true, message: `Replaced assignees with employees from ${dept}`, severity: 'success' });
            } else {
                setSnackbar({ open: true, message: 'No employees found in this department.', severity: 'warning' });
                setTaskData(prev => ({ ...prev, fetch_from_department: 0 }));
            }
        } catch (error) {
            console.error('Failed to fetch employees from department', error);
            setSnackbar({ open: true, message: 'Failed to fetch employees', severity: 'error' });
            setTaskData(prev => ({ ...prev, fetch_from_department: 0 }));
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFetch = (checked: boolean) => {
        if (checked) {
            fetchEmployeesFromDept(taskData.department || '');
        } else {
            setTaskData(prev => ({ ...prev, fetch_from_department: 0, assignees: [] }));
        }
    };

    // Clear assignees when department changes
    const handleDepartmentChange = (newValue: any) => {
        setTaskData(prev => ({
            ...prev,
            department: newValue?.name || '',
            fetch_from_department: 0,
            assignees: [] // Clear table on department change
        }));
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!taskData.title?.trim()) newErrors.title = 'Title is required';
        if (!taskData.project) newErrors.project = 'Project is required';
        if (!taskData.assignees || taskData.assignees.length === 0) newErrors.assignees = 'At least one assignee is required';
        if (!taskData.priority) newErrors.priority = 'Priority is required';
        if (!taskData.due_date) {
            newErrors.due_date = 'Due Date is required';
        } else if (dayjs(taskData.due_date).isBefore(dayjs().startOf('day'))) {
            newErrors.due_date = 'Due Date cannot be in the past';
        }
        if (taskData.recurring_task && !taskData.recurring_frequency) newErrors.recurring_frequency = 'Frequency is required for recurring tasks';
        
        if (estimatedTimeStr && !/^([0-9]{1,5}):([0-5][0-9])$/.test(estimatedTimeStr)) {
            newErrors.estimated_time = 'Invalid format (HH:MM). Example: 08:30';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) {
            setSnackbar({ open: true, message: 'Please fill in all mandatory fields.', severity: 'error' });
            return;
        }
        try {
            setLoading(true);
            const finalData = {
                ...taskData,
                estimated_time: hhmmToFloat(estimatedTimeStr)
            };
            if (currentTask) {
                await updateTaskManager(currentTask.name, finalData);
                setSnackbar({ open: true, message: 'Task updated successfully!', severity: 'success' });
            } else {
                await createTaskManager(finalData);
                setSnackbar({ open: true, message: 'Task created successfully!', severity: 'success' });
            }
            onClose();
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error(error);
            setSnackbar({ open: true, message: error?.message || 'Failed to save task.', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                fullWidth
                maxWidth="lg"
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        m: { xs: 1.5, sm: 2 },
                        maxHeight: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 64px)' }
                    }
                }}
            >
                <DialogTitle
                    sx={{
                        m: 0,
                        p: { xs: 2, sm: 2.5 },
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {currentTask ? 'Edit Task' : 'New Task'}
                    </Typography>
                    <IconButton
                        onClick={onClose}
                        sx={{
                            color: 'text.disabled',
                            bgcolor: 'background.paper',
                            boxShadow: (theme: any) => theme.customShadows?.z1
                        }}
                    >
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers sx={{ p: { xs: 2, sm: 4 } }}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Stack spacing={3.5}>
                            <TextField
                                fullWidth
                                label="Task Title"
                                required
                                error={!!errors.title}
                                helperText={errors.title}
                                placeholder="Ex: Refactor authentication flow"
                                value={taskData.title}
                                onChange={(e) => {
                                    setTaskData({ ...taskData, title: e.target.value });
                                    if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
                                }}
                                InputLabelProps={{ shrink: true }}
                            />

                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
                                <Autocomplete
                                    fullWidth
                                    options={projects}
                                    getOptionLabel={(option) => {
                                        if (typeof option === 'string') return option;
                                        if (option.isNew) return option.inputValue || '';
                                        return option.name || '';
                                    }}
                                    value={projects.find((p) => p.name === taskData.project) || (taskData.project ? { name: taskData.project } : null)}
                                    isOptionEqualToValue={(option, value) => option?.name === value?.name}
                                    filterOptions={(options, params) => {
                                        const filtered = filter(options, params);
                                        const hasCreate = filtered.some((o: any) => o.isNew);
                                        if (!hasCreate && params.inputValue) {
                                            filtered.push({
                                                inputValue: params.inputValue,
                                                name: 'Create Project',
                                                isNew: true,
                                            });
                                        }
                                        return filtered;
                                    }}
                                    renderOption={(props, option) => (
                                        <Box
                                            component="li"
                                            {...props}
                                            sx={{
                                                typography: 'body2',
                                                ...(option.isNew && {
                                                    color: 'primary.main',
                                                    fontWeight: 600,
                                                    bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.08),
                                                    borderTop: (theme: any) => `1px solid ${theme.palette.divider}`,
                                                    mt: 0.5,
                                                    py: 1.5,
                                                    '&:hover': {
                                                        bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.16),
                                                    },
                                                }),
                                            }}
                                        >
                                            {option.isNew ? (
                                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                                    <Iconify icon="solar:add-circle-bold" width={24} />
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                        Create Project
                                                    </Typography>
                                                </Stack>
                                            ) : (
                                                option.name
                                            )}
                                        </Box>
                                    )}
                                    onInputChange={(_, newInputValue) => {
                                        fetchProjects(newInputValue).then(setProjects);
                                    }}
                                    onChange={(_, newValue: any) => {
                                        if (newValue?.isNew) {
                                            setNewProjectName(newValue.inputValue || '');
                                            setOpenProjectCreate(true);
                                        } else {
                                            setTaskData({ ...taskData, project: newValue?.name || '' });
                                            if (errors.project) setErrors(prev => ({ ...prev, project: '' }));
                                        }
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Project"
                                            required
                                            error={!!errors.project}
                                            helperText={errors.project}
                                            placeholder="Select Project"
                                            InputLabelProps={{ shrink: true }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 1.5
                                                },
                                            }}
                                        />
                                    )}
                                />

                                <Autocomplete
                                    fullWidth
                                    options={departments}
                                    getOptionLabel={(option) => {
                                        if (typeof option === 'string') return option;
                                        if (option.isNew) return option.inputValue || '';
                                        return option.name || '';
                                    }}
                                    value={departments.find((d) => d.name === taskData.department) || (taskData.department ? { name: taskData.department } : null)}
                                    isOptionEqualToValue={(option, value) => option?.name === value?.name}
                                    filterOptions={(options, params) => {
                                        const filtered = filter(options, params);
                                        const hasCreate = filtered.some((o: any) => o.isNew);
                                        if (!hasCreate && params.inputValue) {
                                            filtered.push({
                                                inputValue: params.inputValue,
                                                name: 'Create Department',
                                                isNew: true,
                                            });
                                        }
                                        return filtered;
                                    }}
                                    renderOption={(props, option) => (
                                        <Box
                                            component="li"
                                            {...props}
                                            sx={{
                                                typography: 'body2',
                                                ...(option.isNew && {
                                                    color: 'primary.main',
                                                    fontWeight: 600,
                                                    bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.08),
                                                    borderTop: (theme: any) => `1px solid ${theme.palette.divider}`,
                                                    mt: 0.5,
                                                    py: 1.5,
                                                    '&:hover': {
                                                        bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.16),
                                                    },
                                                }),
                                            }}
                                        >
                                            {option.isNew ? (
                                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                                    <Iconify icon="solar:add-circle-bold" width={24} />
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                        Create Department
                                                    </Typography>
                                                </Stack>
                                            ) : (
                                                option.name
                                            )}
                                        </Box>
                                    )}
                                    onInputChange={(_, newInputValue) => {
                                        fetchDepartments(newInputValue).then(setDepartments);
                                    }}
                                    onChange={(_, newValue: any) => {
                                        if (newValue?.isNew) {
                                            setNewDepartmentName(newValue.inputValue || '');
                                            setOpenDepartmentCreate(true);
                                        } else {
                                            handleDepartmentChange(newValue);
                                        }
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Department"
                                            placeholder="Select Department"
                                            InputLabelProps={{ shrink: true }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 1.5
                                                },
                                            }}
                                        />
                                    )}
                                />
                            </Stack>

                            <FormControlLabel
                                control={<CustomSwitch checked={Boolean(taskData.fetch_from_department)} onChange={(e) => handleToggleFetch(e.target.checked)} />}
                                label="Fetch All Employees From Department"
                                sx={{ '& .MuiFormControlLabel-label': { ml: 1 } }}
                            />

                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
                                <Autocomplete
                                    fullWidth
                                    multiple
                                    options={employees}
                                    getOptionLabel={(option) => option.employee_name || option.name}
                                    value={taskData.assignees?.map(a => employees.find(e => e.name === a.employee) || { name: a.employee, employee_name: a.employee_name }) || []}
                                    onChange={(_, newValue) => {
                                        setTaskData({
                                            ...taskData,
                                            assignees: newValue.map(v => ({ employee: v.name, employee_name: v.employee_name || '', name: '' }))
                                        });
                                        if (errors.assignees) setErrors(prev => ({ ...prev, assignees: '' }));
                                    }}
                                    renderOption={(props, option) => {
                                        const { key, ...optionProps } = props as any;
                                        return (
                                            <li key={key} {...optionProps}>
                                                <Stack spacing={0.5}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                        {option.employee_name || option.name}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                        ID: {option.name}
                                                    </Typography>
                                                </Stack>
                                            </li>
                                        );
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Assignees"
                                            required
                                            error={!!errors.assignees}
                                            helperText={errors.assignees}
                                            placeholder="Search employees"
                                            InputLabelProps={{ shrink: true }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 1.5,
                                                },
                                            }}
                                        />
                                    )}
                                />

                                {/* 
                                <Autocomplete
                                    fullWidth
                                    options={users}
                                    getOptionLabel={(option) => option.full_name ? `${option.full_name} (${option.email})` : option.email}
                                    value={users.find((u) => u.email === taskData.tag_member) || null}
                                    onChange={(_, newValue) => setTaskData({ ...taskData, tag_member: newValue?.email || '' })}
                                    renderOption={(props, option) => {
                                        const { key, ...optionProps } = props as any;
                                        return (
                                            <li key={key} {...optionProps}>
                                                <Stack spacing={0.5}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                        {option.full_name || option.email}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                        ID: {option.name || option.email}
                                                    </Typography>
                                                </Stack>
                                            </li>
                                        );
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Tag Member For Notification"
                                            placeholder="Search users"
                                            InputLabelProps={{ shrink: true }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 1.5,
                                                },
                                            }}
                                        />
                                    )}
                                />
                                */}
                            </Stack>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>

                                <FormControl fullWidth error={!!errors.priority}>
                                    <InputLabel shrink>Priority</InputLabel>
                                    <Select
                                        label="Priority"
                                        notched
                                        value={taskData.priority}
                                        onChange={(e) => {
                                            setTaskData({ ...taskData, priority: e.target.value as any });
                                            if (errors.priority) setErrors(prev => ({ ...prev, priority: '' }));
                                        }}
                                    >
                                        {PRIORITY_OPTIONS.map((option) => (
                                            <MenuItem key={option} value={option}>
                                                {option}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    {errors.priority && <Typography variant="caption" sx={{ color: 'error.main', mt: 0.5 }}>{errors.priority}</Typography>}
                                </FormControl>

                                <FormControl fullWidth>
                                    {/* <InputLabel shrink>Status</InputLabel>
                                    <Select
                                        label="Status"
                                        notched
                                        value={taskData.status}
                                        onChange={(e) => setTaskData({ ...taskData, status: e.target.value as any })}
                                    >
                                        {STATUS_OPTIONS.map((option) => (
                                            <MenuItem key={option} value={option}>
                                                {option}
                                            </MenuItem>
                                        ))}
                                    </Select> */}
                                </FormControl>

                            </Stack>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
                                <DatePicker
                                    label="Due Date"
                                    format="DD-MM-YYYY"
                                    minDate={dayjs()}
                                    value={dayjs(taskData.due_date)}
                                    onChange={(newValue) => {
                                        const dateStr = newValue?.format('YYYY-MM-DD') || '';
                                        setTaskData({ ...taskData, due_date: dateStr });
                                        if (errors.due_date && dateStr && !dayjs(dateStr).isBefore(dayjs().startOf('day'))) {
                                            setErrors(prev => ({ ...prev, due_date: '' }));
                                        }
                                    }}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            InputLabelProps: { shrink: true },
                                            error: !!errors.due_date,
                                            helperText: errors.due_date,
                                            required: true
                                        }
                                    }}
                                />

                                <TimePicker
                                    label="Due Time"
                                    value={taskData.due_time ? dayjs(`2024-01-01T${taskData.due_time}`) : null}
                                    onChange={(newValue) => setTaskData({ ...taskData, due_time: newValue ? newValue.format('HH:mm:ss') : '' })}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            InputLabelProps: { shrink: true }
                                        }
                                    }}
                                />

                                <TextField
                                    fullWidth
                                    label="Estimated Time (HH:MM)"
                                    placeholder="Ex: 08:30"
                                    error={!!errors.estimated_time}
                                    helperText={errors.estimated_time}
                                    value={estimatedTimeStr}
                                    onChange={(e) => {
                                        setEstimatedTimeStr(e.target.value);
                                        if (errors.estimated_time) setErrors(prev => ({ ...prev, estimated_time: '' }));
                                    }}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Stack>

                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="Description"
                                placeholder="Provide any additional details about the task..."
                                value={taskData.description}
                                onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Stack>

                        <Box sx={{ mt: 3.5 }}>
                            <Typography variant="overline" sx={{ color: 'text.disabled', mb: 2, display: 'block' }}>Additional Settings</Typography>
                            <Stack spacing={3}>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2, sm: 4 }} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                                    <FormControlLabel
                                        control={<CustomSwitch checked={Boolean(taskData.attachment_required)} onChange={(e) => setTaskData({ ...taskData, attachment_required: e.target.checked ? 1 : 0 })} />}
                                        label="Attachment Required To Close"
                                        sx={{ margin: 0, '& .MuiFormControlLabel-label': { ml: 1.5, typography: 'body2', fontWeight: 600 } }}
                                    />

                                    <FormControlLabel
                                        control={<CustomSwitch checked={Boolean(taskData.recurring_task)} onChange={(e) => setTaskData({ ...taskData, recurring_task: e.target.checked ? 1 : 0 })} />}
                                        label="Recurring Task"
                                        sx={{ margin: 0, '& .MuiFormControlLabel-label': { ml: 1.5, typography: 'body2', fontWeight: 600 } }}
                                    />

                                    {Boolean(taskData.recurring_task) && (
                                        <FormControl sx={{ minWidth: 400 }} error={!!errors.recurring_frequency}>
                                            <InputLabel shrink>Frequency</InputLabel>
                                            <Select
                                                label="Frequency"
                                                notched
                                                value={taskData.recurring_frequency || ''}
                                                onChange={(e) => {
                                                    setTaskData({ ...taskData, recurring_frequency: e.target.value as any });
                                                    if (errors.recurring_frequency) setErrors(prev => ({ ...prev, recurring_frequency: '' }));
                                                }}
                                            >
                                                {FREQUENCY_OPTIONS.map((option) => (
                                                    <MenuItem key={option} value={option}>{option}</MenuItem>
                                                ))}
                                            </Select>
                                            {errors.recurring_frequency && <Typography variant="caption" sx={{ color: 'error.main', mt: 0.5 }}>{errors.recurring_frequency}</Typography>}
                                        </FormControl>
                                    )}
                                </Stack>
                            </Stack>
                        </Box>
                    </LocalizationProvider>
                </DialogContent>

                <DialogActions sx={{ px: 2, py: 1.5, gap: 1.5 }}>
                    {/* <Button 
                    variant="outlined" 
                    onClick={onClose}
                    sx={{ borderRadius: 1, fontWeight: 700 }}
                >
                    Cancel
                </Button> */}
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        loading={loading}
                        sx={{
                            px: 3,
                            borderRadius: 1,
                            fontWeight: 800,
                            bgcolor: '#059669',
                            color: 'common.white',
                            '&:hover': { bgcolor: '#047857' }
                        }}
                    >
                        {currentTask ? 'Save Changes' : 'Create Task'}
                    </Button>
                </DialogActions>
            </Dialog>

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

            {/* Create Project Dialog */}
            <Dialog
                open={openProjectCreate}
                onClose={() => {
                    setOpenProjectCreate(false);
                    setNewProjectName('');
                }}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 2 } }}
            >
                <DialogTitle
                    sx={{
                        m: 0,
                        p: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: (t: any) => `1px solid ${t.palette.divider}`,
                    }}
                >
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Create New Project</Typography>
                    <IconButton
                        onClick={() => { setOpenProjectCreate(false); setNewProjectName(''); }}
                        sx={{ color: 'text.disabled', bgcolor: 'background.paper', boxShadow: (t: any) => t.customShadows?.z1 }}
                    >
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 3.5, pb: 2.5, }}>
                    <TextField
                        fullWidth
                        label="Project Name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="Enter project name"
                        required
                        autoFocus
                        InputLabelProps={{ shrink: true }}
                        sx={{ mt: 3 }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button
                        fullWidth
                        onClick={async () => {
                            if (!newProjectName.trim()) return;
                            try {
                                setLoading(true);
                                setCreatingProject(true);
                                const created = await createProject(newProjectName.trim());
                                // Refresh projects list and select the new one
                                const projs = await fetchProjects();
                                setProjects(projs);
                                setTaskData(prev => ({ ...prev, project: created?.name || newProjectName.trim() }));
                                setOpenProjectCreate(false);
                                setNewProjectName('');
                                setSnackbar({ open: true, message: 'Project created successfully', severity: 'success' });
                            } catch (err: any) {
                                setSnackbar({ open: true, message: err.message || 'Failed to create project', severity: 'error' });
                            } finally {
                                setLoading(false);
                                setCreatingProject(false);
                            }
                        }}
                        variant="contained"
                        disabled={!newProjectName.trim() || creatingProject}
                        sx={{ bgcolor: '#059669', fontWeight: 800, '&:hover': { bgcolor: '#047857' } }}
                    >
                        {creatingProject ? 'Creating...' : 'Create Project'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Create Department Dialog */}
            <Dialog
                open={openDepartmentCreate}
                onClose={() => {
                    setOpenDepartmentCreate(false);
                    setNewDepartmentName('');
                }}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 2 } }}
            >
                <DialogTitle
                    sx={{
                        m: 0,
                        p: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: (t: any) => `1px solid ${t.palette.divider}`,
                    }}
                >
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Create New Department</Typography>
                    <IconButton
                        onClick={() => { setOpenDepartmentCreate(false); setNewDepartmentName(''); }}
                        sx={{ color: 'text.disabled', bgcolor: 'background.paper', boxShadow: (t: any) => t.customShadows?.z1 }}
                    >
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 3.5, pb: 2.5 }}>
                    <TextField
                        fullWidth
                        label="Department Name"
                        value={newDepartmentName}
                        onChange={(e) => setNewDepartmentName(e.target.value)}
                        placeholder="Enter department name"
                        required
                        autoFocus
                        InputLabelProps={{ shrink: true }}
                        sx={{ mt: 3 }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button
                        fullWidth
                        onClick={async () => {
                            if (!newDepartmentName.trim()) return;
                            try {
                                setLoading(true);
                                setCreatingDepartment(true);
                                const created = await createDepartment(newDepartmentName.trim());
                                // Refresh departments list and select the new one
                                const depts = await fetchDepartments();
                                setDepartments(depts);
                                setTaskData(prev => ({ ...prev, department: created?.name || newDepartmentName.trim() }));
                                setOpenDepartmentCreate(false);
                                setNewDepartmentName('');
                                setSnackbar({ open: true, message: 'Department created successfully', severity: 'success' });
                            } catch (err: any) {
                                setSnackbar({ open: true, message: err.message || 'Failed to create department', severity: 'error' });
                            } finally {
                                setLoading(false);
                                setCreatingDepartment(false);
                            }
                        }}
                        variant="contained"
                        disabled={!newDepartmentName.trim() || creatingDepartment}
                        sx={{ bgcolor: '#059669', fontWeight: 800, '&:hover': { bgcolor: '#047857' } }}
                    >
                        {creatingDepartment ? 'Creating...' : 'Create Department'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
