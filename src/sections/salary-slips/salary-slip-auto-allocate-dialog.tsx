import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import { memo, useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Skeleton from '@mui/material/Skeleton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, styled } from '@mui/material/styles';
import Autocomplete from '@mui/material/Autocomplete';
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { getDoctypeList } from 'src/api/leads';
import { generateSalarySlipsForEmployees } from 'src/api/salary-slips';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

// Android 12 Switch Style
const Android12Switch = styled(Switch)(({ theme }) => ({
    width: 36,
    height: 20,
    padding: 0,
    marginRight: 10,
    '& .MuiSwitch-switchBase': {
        padding: 0,
        margin: 3,
        transitionDuration: '300ms',
        '&.Mui-checked': {
            transform: 'translateX(16px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
                backgroundColor: theme.palette.primary.main,
                opacity: 1,
                border: 0,
            },
            '& .MuiSwitch-thumb': {
                backgroundColor: theme.palette.primary.contrastText,
                width: 14,
                height: 14,
            },
        },
        '&.Mui-disabled + .MuiSwitch-track': {
            opacity: 0.5,
        },
    },
    '& .MuiSwitch-thumb': {
        boxSizing: 'border-box',
        width: 14,
        height: 14,
        backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[400] : theme.palette.grey[600],
        boxShadow: '0 2px 4px 0 rgba(0,0,0,0.2)',
    },
    '& .MuiSwitch-track': {
        borderRadius: 20 / 2,
        backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300],
        opacity: 1,
        transition: theme.transitions.create(['background-color'], {
            duration: 300,
        }),
    },
}));

// Android 12 Button Style
const Android12Button = styled(Button)(({ theme }) => ({
    borderRadius: 20,
    textTransform: 'none',
    fontWeight: 600,
    padding: '6px 16px',
    fontSize: '0.875rem',
    boxShadow: 'none',
    '&:hover': {
        boxShadow: 'none',
    },
}));

// Android 12 Loading Button Style
const Android12LoadingButton = styled(LoadingButton)(({ theme }) => ({
    borderRadius: 20,
    textTransform: 'none',
    fontWeight: 600,
    padding: '6px 16px',
    fontSize: '0.875rem',
    boxShadow: 'none',
    '&:hover': {
        boxShadow: 'none',
    },
}));

// ----------------------------------------------------------------------

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: (message: string) => void;
    onError: (error: string) => void;
    onStartGeneration?: (params: {
        year: number;
        month: number;
        monthName: string;
        employees: string[];
    }) => void;
}

interface Employee {
    name: string;
    employee_name: string;
    department?: string;
    designation?: string;
    employee_type?: string;
    branch?: string;
}

interface EmployeeCardProps {
    employee: Employee;
    isSelected: boolean;
    onToggle: (id: string) => void;
}

const EmployeeCard = memo(({ employee, isSelected, onToggle }: EmployeeCardProps) => (
    <Card
        onClick={() => onToggle(employee.name)}
        sx={{
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            borderRadius: 1.5,
            border: (theme) => `1px solid ${isSelected ? theme.palette.primary.main : theme.palette.divider}`,
            bgcolor: (theme) =>
                isSelected
                    ? alpha(theme.palette.primary.main, 0.04)
                    : 'background.paper',
            transition: (theme) =>
                theme.transitions.create(['border-color', 'background-color', 'box-shadow'], {
                    duration: 150,
                }),
            '&:hover': {
                borderColor: 'primary.main',
                bgcolor: (theme) =>
                    isSelected
                        ? alpha(theme.palette.primary.main, 0.08)
                        : alpha(theme.palette.action.hover, 0.08),
            },
        }}
    >
        <Android12Switch
            checked={isSelected}
            onChange={() => onToggle(employee.name)}
            onClick={(e) => e.stopPropagation()}
        />

        <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
                variant="subtitle2"
                noWrap
                sx={{
                    fontWeight: isSelected ? 700 : 600,
                    color: isSelected ? 'primary.dark' : 'text.primary',
                }}
            >
                {employee.employee_name}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }} flexWrap="wrap">
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {employee.name}
                </Typography>
                {employee.department && (
                    <Chip
                        size="small"
                        label={employee.department}
                        sx={{ height: 18, fontSize: '0.675rem', bgcolor: (theme) => alpha(theme.palette.grey[500], 0.12) }}
                    />
                )}
                {employee.designation && (
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        • {employee.designation}
                    </Typography>
                )}
            </Stack>
        </Box>
    </Card>
));

const EmployeeSkeletonCard = () => (
    <Card
        sx={{
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 1.5,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
        }}
    >
        <Skeleton variant="rounded" width={36} height={20} sx={{ mr: 1.5, borderRadius: 10, flexShrink: 0 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
            <Skeleton variant="text" width="60%" height={22} />
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <Skeleton variant="text" width="28%" height={16} />
                <Skeleton variant="rounded" width={54} height={18} sx={{ borderRadius: 1 }} />
                <Skeleton variant="text" width="28%" height={16} />
            </Stack>
        </Box>
    </Card>
);

export default function SalarySlipAutoAllocateDialog({ open, onClose, onSuccess, onError, onStartGeneration }: Props) {
    const currentDate = new Date();
    const [step, setStep] = useState(1);
    const [year, setYear] = useState<Dayjs>(dayjs());
    const [month, setMonth] = useState(currentDate.getMonth() + 1);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingEmployees, setFetchingEmployees] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'selected' | 'unselected'>('all');
    const [departmentFilter, setDepartmentFilter] = useState<string>('all');
    const [designationFilter, setDesignationFilter] = useState<string>('all');
    const [employeeTypeFilter, setEmployeeTypeFilter] = useState<string>('all');

    // Performance pagination & filter loading state
    const [visibleCount, setVisibleCount] = useState(40);
    const [isFiltering, setIsFiltering] = useState(false);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    useEffect(() => {
        if (!open) {
            // Reset state when dialog closes
            setStep(1);
            setEmployees([]);
            setSelectedEmployees([]);
            setSearchQuery('');
            setStatusFilter('all');
            setDepartmentFilter('all');
            setDesignationFilter('all');
            setEmployeeTypeFilter('all');
            setVisibleCount(40);
            setIsFiltering(false);
        }
    }, [open]);

    // Show smooth filter loader and reset visible pagination count when filters change
    useEffect(() => {
        if (step !== 2) return undefined;
        setIsFiltering(true);
        const timer = setTimeout(() => {
            setIsFiltering(false);
            setVisibleCount(40);
        }, 150);
        return () => clearTimeout(timer);
    }, [searchQuery, statusFilter, departmentFilter, designationFilter, employeeTypeFilter, step]);

    const handleNext = async () => {
        try {
            setFetchingEmployees(true);
            const data = await getDoctypeList(
                'Employee',
                ['name', 'employee_name', 'department', 'designation', 'employee_type', 'branch'],
                { status: 'Active' }
            );
            setEmployees(data || []);
            setSelectedEmployees((data || []).map((emp: Employee) => emp.name)); // Select all by default
            setVisibleCount(40);
            setStep(2);
        } catch (error: any) {
            onError(error.message || 'Failed to fetch employees');
        } finally {
            setFetchingEmployees(false);
        }
    };

    const handleBack = () => {
        setStep(1);
    };

    const selectedSet = useMemo(() => new Set(selectedEmployees), [selectedEmployees]);

    const handleToggleEmployee = useCallback((employeeId: string) => {
        setSelectedEmployees((prev) =>
            prev.includes(employeeId)
                ? prev.filter((id) => id !== employeeId)
                : [...prev, employeeId]
        );
    }, []);

    const handleSelectAll = () => {
        setSelectedEmployees(employees.map((emp) => emp.name));
    };

    const handleDeselectAll = () => {
        setSelectedEmployees([]);
    };

    // Extract unique filter lists from fetched employees
    const departmentOptions = useMemo(() => {
        const set = new Set<string>();
        employees.forEach((e) => {
            if (e.department) set.add(e.department);
        });
        return Array.from(set).sort();
    }, [employees]);

    const designationOptions = useMemo(() => {
        const set = new Set<string>();
        employees.forEach((e) => {
            if (e.designation) set.add(e.designation);
        });
        return Array.from(set).sort();
    }, [employees]);

    const employeeTypeOptions = useMemo(() => {
        const set = new Set<string>();
        employees.forEach((e) => {
            if (e.employee_type) set.add(e.employee_type);
        });
        return Array.from(set).sort();
    }, [employees]);

    // Filtered employees list
    const filteredEmployees = useMemo(
        () => {
            const query = searchQuery.trim().toLowerCase();
            return employees.filter((emp) => {
                const matchesSearch =
                    !query ||
                    emp.employee_name.toLowerCase().includes(query) ||
                    emp.name.toLowerCase().includes(query) ||
                    (emp.department && emp.department.toLowerCase().includes(query)) ||
                    (emp.designation && emp.designation.toLowerCase().includes(query));

                const isSelected = selectedSet.has(emp.name);
                const matchesStatus =
                    statusFilter === 'all' ||
                    (statusFilter === 'selected' && isSelected) ||
                    (statusFilter === 'unselected' && !isSelected);

                const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter;
                const matchesDesig = designationFilter === 'all' || emp.designation === designationFilter;
                const matchesType = employeeTypeFilter === 'all' || emp.employee_type === employeeTypeFilter;

                return matchesSearch && matchesStatus && matchesDept && matchesDesig && matchesType;
            });
        },
        [employees, searchQuery, statusFilter, departmentFilter, designationFilter, employeeTypeFilter, selectedSet]
    );

    const visibleEmployees = useMemo(
        () => filteredEmployees.slice(0, visibleCount),
        [filteredEmployees, visibleCount]
    );

    useEffect(() => {
        if (!loadMoreRef.current) return undefined;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && visibleCount < filteredEmployees.length) {
                    setVisibleCount((prev) => prev + 40);
                }
            },
            { rootMargin: '250px' }
        );
        observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [filteredEmployees.length, isFiltering, visibleCount]);

    const isFiltered =
        Boolean(searchQuery) ||
        statusFilter !== 'all' ||
        departmentFilter !== 'all' ||
        designationFilter !== 'all' ||
        employeeTypeFilter !== 'all';

    const activeFilterCount =
        (statusFilter !== 'all' ? 1 : 0) +
        (departmentFilter !== 'all' ? 1 : 0) +
        (designationFilter !== 'all' ? 1 : 0) +
        (employeeTypeFilter !== 'all' ? 1 : 0) +
        (searchQuery ? 1 : 0);

    const handleResetFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setDepartmentFilter('all');
        setDesignationFilter('all');
        setEmployeeTypeFilter('all');
    };

    const handleSelectFiltered = () => {
        const filteredIds = filteredEmployees.map((e) => e.name);
        setSelectedEmployees(filteredIds);
    };

    const handleDeselectFiltered = () => {
        const filteredIds = new Set(filteredEmployees.map((e) => e.name));
        setSelectedEmployees((prev) => prev.filter((id) => !filteredIds.has(id)));
    };

    const handleGenerate = async () => {
        try {
            if (selectedEmployees.length === 0) {
                onError('Please select at least one employee');
                return;
            }

            if (onStartGeneration) {
                onStartGeneration({
                    year: year.year(),
                    month,
                    monthName: monthNames[month - 1],
                    employees: selectedEmployees,
                });
                onClose();
                return;
            }

            setLoading(true);
            const message = await generateSalarySlipsForEmployees(year.year(), month, selectedEmployees);
            onSuccess(message || `Successfully generated salary slips for ${selectedEmployees.length} employee(s)`);
            onClose();
        } catch (error: any) {
            onError(error.message || 'Failed to generate salary slips');
        } finally {
            setLoading(false);
        }
    };

    const allSelected = employees.length > 0 && selectedEmployees.length === employees.length;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth={step === 1 ? 'sm' : 'lg'}
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    boxShadow: (themeVar) => themeVar.customShadows.z24,
                    height: step === 1 ? 'auto' : '88vh',
                    maxHeight: step === 1 ? 'auto' : 850,
                    display: 'flex',
                    flexDirection: 'column',
                    transition: (theme) => theme.transitions.create(['max-width', 'height'], { duration: 250 }),
                },
            }}
        >
            <DialogTitle
                sx={{
                    m: 0,
                    p: 2.5,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            Auto Allocate Salary Slips {step === 2 && `- Step ${step} of 2`}
                        </Typography>
                    </Box>
                </Stack>

                <IconButton onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <DialogContent
                sx={{
                    p: step === 1 ? 3 : 0,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {step === 1 ? (
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Box sx={{ mt: 2 }}>
                            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                                <DatePicker
                                    label="Year"
                                    views={['year']}
                                    value={year}
                                    onChange={(newValue) => setYear(newValue || dayjs())}
                                    slotProps={{ textField: { fullWidth: true } }}
                                />

                                <TextField
                                    select
                                    fullWidth
                                    label="Month"
                                    value={month}
                                    onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                                >
                                    {[
                                        { label: 'January', value: 1 },
                                        { label: 'February', value: 2 },
                                        { label: 'March', value: 3 },
                                        { label: 'April', value: 4 },
                                        { label: 'May', value: 5 },
                                        { label: 'June', value: 6 },
                                        { label: 'July', value: 7 },
                                        { label: 'August', value: 8 },
                                        { label: 'September', value: 9 },
                                        { label: 'October', value: 10 },
                                        { label: 'November', value: 11 },
                                        { label: 'December', value: 12 },
                                    ].map((m) => (
                                        <MenuItem key={m.value} value={m.value}>
                                            {m.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Stack>
                            <Typography variant="body2" sx={{ mt: 2.5, color: 'text.secondary' }}>
                                Select year and month, then choose employees to generate salary slips for <strong>{monthNames[month - 1]} {year.year()}</strong>.
                            </Typography>
                        </Box>
                    </LocalizationProvider>
                ) : (
                    <Box sx={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
                        {/* Main Employee Selection Area (Left) */}
                        <Box
                            sx={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                p: 2.5,
                                overflow: 'hidden',
                                minWidth: 0,
                            }}
                        >
                            {/* Search bar & Selection counters */}
                            <Stack spacing={2} sx={{ mb: 2 }}>
                                <TextField
                                    fullWidth
                                    placeholder="Search employee name, ID, department..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Iconify
                                                    icon="eva:search-fill"
                                                    sx={{ color: 'text.disabled', width: 20, height: 20 }}
                                                />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                {isFiltering && (
                                                    <CircularProgress size={16} sx={{ color: 'primary.main', mr: searchQuery ? 0.5 : 0 }} />
                                                )}
                                                {searchQuery && (
                                                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                                                        <Iconify icon="mingcute:close-line" width={16} />
                                                    </IconButton>
                                                )}
                                            </InputAdornment>
                                        ),
                                    }}
                                />

                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    flexWrap="wrap"
                                    gap={1}
                                >
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                            {selectedEmployees.length} of {employees.length} selected
                                        </Typography>
                                        {isFiltered && (
                                            <Chip
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                                label={`${filteredEmployees.length} matching filter`}
                                            />
                                        )}
                                    </Stack>

                                    <Stack direction="row" spacing={1}>
                                        {isFiltered ? (
                                            <>
                                                <Android12Button
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={handleSelectFiltered}
                                                    disabled={filteredEmployees.length === 0}
                                                >
                                                    Select Only Filtered ({filteredEmployees.length})
                                                </Android12Button>
                                                <Android12Button
                                                    variant="outlined"
                                                    size="small"
                                                    color="inherit"
                                                    onClick={handleDeselectFiltered}
                                                    disabled={filteredEmployees.length === 0}
                                                >
                                                    Deselect Filtered
                                                </Android12Button>
                                            </>
                                        ) : (
                                            <>
                                                <Android12Button
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={handleSelectAll}
                                                    disabled={allSelected}
                                                >
                                                    Select All
                                                </Android12Button>
                                                <Android12Button
                                                    variant="outlined"
                                                    size="small"
                                                    color="inherit"
                                                    onClick={handleDeselectAll}
                                                    disabled={selectedEmployees.length === 0}
                                                >
                                                    Deselect All
                                                </Android12Button>
                                            </>
                                        )}
                                    </Stack>
                                </Stack>
                            </Stack>

                            {/* Employee List Scrollbar */}
                            <Scrollbar sx={{ flex: 1, pr: 1 }}>
                                {isFiltering ? (
                                    <Box
                                        display="grid"
                                        gridTemplateColumns={{
                                            xs: '1fr',
                                            sm: 'repeat(2, 1fr)',
                                            md: 'repeat(2, 1fr)',
                                        }}
                                        gap={1.5}
                                    >
                                        {Array.from({ length: 8 }).map((_, index) => (
                                            <EmployeeSkeletonCard key={index} />
                                        ))}
                                    </Box>
                                ) : filteredEmployees.length === 0 ? (
                                    <Box
                                        sx={{
                                            py: 8,
                                            textAlign: 'center',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Iconify
                                            icon="solar:users-group-rounded-bold"
                                            width={64}
                                            sx={{ color: 'text.disabled', mb: 2 }}
                                        />
                                        <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                            No employees found
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'text.disabled', mt: 0.5 }}>
                                            Try adjusting your search terms or filter criteria
                                        </Typography>
                                        {isFiltered && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<Iconify icon="solar:restart-bold" />}
                                                onClick={handleResetFilters}
                                                sx={{ mt: 2 }}
                                            >
                                                Reset Filters
                                            </Button>
                                        )}
                                    </Box>
                                ) : (
                                    <>
                                        <Box
                                            display="grid"
                                            gridTemplateColumns={{
                                                xs: '1fr',
                                                sm: 'repeat(2, 1fr)',
                                                md: 'repeat(2, 1fr)',
                                            }}
                                            gap={1.5}
                                        >
                                            {visibleEmployees.map((employee) => (
                                                <EmployeeCard
                                                    key={employee.name}
                                                    employee={employee}
                                                    isSelected={selectedSet.has(employee.name)}
                                                    onToggle={handleToggleEmployee}
                                                />
                                            ))}
                                        </Box>

                                        {visibleCount < filteredEmployees.length && (
                                            <Box
                                                ref={loadMoreRef}
                                                sx={{
                                                    py: 2.5,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                }}
                                            >
                                                <CircularProgress size={22} sx={{ color: 'primary.main' }} />
                                                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                                                    Showing {visibleEmployees.length} of {filteredEmployees.length} employees
                                                </Typography>
                                            </Box>
                                        )}
                                    </>
                                )}
                            </Scrollbar>
                        </Box>

                        {/* Filter Panel (Right Side) */}
                        <Box
                            sx={{
                                width: { xs: 240, md: 280, lg: 300 },
                                flexShrink: 0,
                                borderLeft: (theme) => `1px solid ${theme.palette.divider}`,
                                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
                                p: 2.5,
                                display: 'flex',
                                flexDirection: 'column',
                                overflowY: 'auto',
                            }}
                        >
                            {/* Filter Header */}
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Iconify icon="solar:filter-bold-duotone" width={20} sx={{ color: 'primary.main' }} />
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                        Filters
                                    </Typography>
                                    {activeFilterCount > 0 && (
                                        <Chip
                                            size="small"
                                            color="primary"
                                            label={activeFilterCount}
                                            sx={{ height: 20, minWidth: 20, fontSize: '0.75rem', fontWeight: 700 }}
                                        />
                                    )}
                                </Stack>

                                {activeFilterCount > 0 && (
                                    <Button
                                        size="small"
                                        color="error"
                                        onClick={handleResetFilters}
                                        sx={{ textTransform: 'none', p: 0.5, fontSize: '0.75rem' }}
                                    >
                                        Reset
                                    </Button>
                                )}
                            </Stack>

                            <Stack spacing={2.5}>
                                {/* Selection Status Filter */}
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', mb: 1, display: 'block' }}>
                                        Selection Status
                                    </Typography>
                                    <ToggleButtonGroup
                                        exclusive
                                        size="small"
                                        fullWidth
                                        value={statusFilter}
                                        onChange={(_, newVal) => {
                                            if (newVal !== null) setStatusFilter(newVal);
                                        }}
                                        sx={{
                                            '& .MuiToggleButton-root': {
                                                py: 0.75,
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                textTransform: 'none',
                                            },
                                        }}
                                    >
                                        <ToggleButton value="all">All ({employees.length})</ToggleButton>
                                        <ToggleButton value="selected">Selected ({selectedEmployees.length})</ToggleButton>
                                        <ToggleButton value="unselected">Unselected ({employees.length - selectedEmployees.length})</ToggleButton>
                                    </ToggleButtonGroup>
                                </Box>

                                {/* Department Filter */}
                                <Autocomplete
                                    fullWidth
                                    size="small"
                                    options={departmentOptions}
                                    value={departmentFilter === 'all' ? null : departmentFilter}
                                    onChange={(_, newValue) => setDepartmentFilter(newValue || 'all')}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Department"
                                            placeholder="All Departments"
                                        />
                                    )}
                                />

                                {/* Designation Filter */}
                                <Autocomplete
                                    fullWidth
                                    size="small"
                                    options={designationOptions}
                                    value={designationFilter === 'all' ? null : designationFilter}
                                    onChange={(_, newValue) => setDesignationFilter(newValue || 'all')}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Designation"
                                            placeholder="All Designations"
                                        />
                                    )}
                                />

                                {/* Employee Type Filter */}
                                {employeeTypeOptions.length > 0 && (
                                    <Autocomplete
                                        fullWidth
                                        size="small"
                                        options={employeeTypeOptions}
                                        value={employeeTypeFilter === 'all' ? null : employeeTypeFilter}
                                        onChange={(_, newValue) => setEmployeeTypeFilter(newValue || 'all')}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Employee Type"
                                                placeholder="All Types"
                                            />
                                        )}
                                    />
                                )}

                                {/* Quick selection summary & batch helper */}
                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: 1.5,
                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                                        border: (theme) => `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                                    }}
                                >
                                    <Typography variant="subtitle2" sx={{ color: 'primary.dark', fontWeight: 700 }}>
                                        Quick Batch
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, mb: 1.5 }}>
                                        Select only the {filteredEmployees.length} employees matching this filter view.
                                    </Typography>
                                    <Stack direction="row" spacing={1}>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            fullWidth
                                            onClick={handleSelectFiltered}
                                            disabled={filteredEmployees.length === 0}
                                            sx={{ fontSize: '0.75rem', py: 0.5 }}
                                        >
                                            Select Filtered
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            fullWidth
                                            onClick={handleDeselectFiltered}
                                            disabled={filteredEmployees.length === 0}
                                            sx={{ fontSize: '0.75rem', py: 0.5 }}
                                        >
                                            Deselect
                                        </Button>
                                    </Stack>
                                </Box>
                            </Stack>
                        </Box>
                    </Box>
                )}
            </DialogContent>

            <DialogActions
                sx={{
                    p: 2.5,
                    borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                }}
            >
                {step === 2 && (
                    <Android12Button variant="outlined" onClick={handleBack}>
                        Back
                    </Android12Button>
                )}
                <Box sx={{ flexGrow: 1 }} />
                {step === 1 ? (
                    <Android12LoadingButton
                        variant="contained"
                        loading={fetchingEmployees}
                        onClick={handleNext}
                    >
                        Next
                    </Android12LoadingButton>
                ) : (
                    <Android12LoadingButton
                        variant="contained"
                        loading={loading}
                        onClick={handleGenerate}
                        disabled={selectedEmployees.length === 0}
                    >
                        Generate ({selectedEmployees.length})
                    </Android12LoadingButton>
                )}
            </DialogActions>
        </Dialog>
    );
}
