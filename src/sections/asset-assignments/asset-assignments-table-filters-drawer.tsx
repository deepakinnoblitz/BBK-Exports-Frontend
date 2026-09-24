import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { Theme, alpha } from '@mui/material/styles';
import Autocomplete from '@mui/material/Autocomplete';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { getEmployees } from 'src/api/asset-assignments';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

const STATUSES = [
    { value: 'active', label: 'Active' },
    { value: 'returned', label: 'Returned' }
];

// ----------------------------------------------------------------------

type FiltersProps = {
    employee: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
};

type Props = {
    open: boolean;
    onOpen: () => void;
    onClose: () => void;
    filters: FiltersProps;
    onFilters: (newFilters: Partial<FiltersProps>) => void;
    canReset: boolean;
    onResetFilters: () => void;
    isHR?: boolean;
};

export function AssetAssignmentsTableFiltersDrawer({
    open,
    onClose,
    filters,
    onFilters,
    canReset,
    onResetFilters,
    isHR,
}: Props) {
    const [employees, setEmployees] = useState<Array<{ name: string; employee_name: string }>>([]);

    useEffect(() => {
        const fetchEmployeeList = async () => {
            const emps = await getEmployees();
            setEmployees(emps);
        };
        fetchEmployeeList();
    }, []);

    const handleFilterEmployee = (newValue: string | null) => {
        onFilters({ employee: newValue || 'all' });
    };

    const handleFilterStatus = (event: React.ChangeEvent<HTMLInputElement>) => {
        onFilters({ status: event.target.value });
    };

    const handleFilterStartDate = (newValue: dayjs.Dayjs | null) => {
        onFilters({ startDate: newValue ? newValue.format('YYYY-MM-DD') : null });
    };

    const handleFilterEndDate = (newValue: dayjs.Dayjs | null) => {
        onFilters({ endDate: newValue ? newValue.format('YYYY-MM-DD') : null });
    };

    const renderHead = (
        <Box
            sx={{
                py: 2.5,
                pl: 3,
                pr: 2,
                display: 'flex',
                alignItems: 'center',
                borderBottom: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 600 }}>
                Filters
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Badge
                    color="error"
                    variant="dot"
                    invisible={!canReset}
                    sx={{
                        [`& .MuiBadge-badge`]: {
                            top: 8,
                            right: 8,
                        },
                    }}
                >
                    <IconButton size="small" onClick={onResetFilters} disabled={!canReset}>
                        <Iconify icon="solar:restart-bold" />
                    </IconButton>
                </Badge>

                <IconButton size="small" onClick={onClose}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </Box>
        </Box>
    );

    const renderEmployee = (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                Employee
            </Typography>
            <Autocomplete
                fullWidth
                size="small"
                options={['all', ...employees.map((e) => e.name)]}
                getOptionLabel={(option) => {
                    if (option === 'all') return 'All Employees';
                    const employee = employees.find((e) => e.name === option);
                    return employee ? `${employee.employee_name} (${employee.name})` : option;
                }}
                filterOptions={(opts, state) => {
                    const input = state.inputValue.toLowerCase().trim();
                    if (!input) {
                        const selectedEmp = filters.employee && filters.employee !== 'all' ? [filters.employee] : [];
                        const first50 = opts.filter(
                            (opt) => opt !== 'all' && !selectedEmp.includes(opt)
                        ).slice(0, 50);
                        return ['all', ...selectedEmp, ...first50];
                    }
                    const filtered = opts.filter((opt) => {
                        if (opt === 'all') return 'all employees'.includes(input);
                        const employee = employees.find((e: any) => e.name === opt);
                        if (!employee) return opt.toLowerCase().includes(input);
                        return (
                            Boolean(employee.employee_name && employee.employee_name.toLowerCase().includes(input)) ||
                            Boolean(employee.name && employee.name.toLowerCase().includes(input))
                        );
                    });
                    return filtered.slice(0, 50);
                }}
                value={filters.employee}
                onChange={(event, newValue) => handleFilterEmployee(newValue)}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        placeholder="Search employee..."
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 1.5,
                                bgcolor: 'background.neutral',
                            },
                        }}
                    />
                )}
                renderOption={(props, option) => {
                    if (option === 'all') return <li {...props} key="all">All Employees</li>;
                    const employee = employees.find((e) => e.name === option);
                    const { key, ...optionProps } = props as any;
                    return (
                        <li key={key} {...optionProps}>
                            <Stack spacing={0.5}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    {employee?.employee_name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    ID: {employee?.name}
                                </Typography>
                            </Stack>
                        </li>
                    );
                }}
            />
        </Stack>
    );

    const renderStatus = (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                Status
            </Typography>
            <TextField
                select
                fullWidth
                size="small"
                value={filters.status}
                onChange={handleFilterStatus}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        bgcolor: 'background.neutral',
                    },
                }}
            >
                <MenuItem value="all">All Status</MenuItem>
                {STATUSES.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {option.label}
                    </MenuItem>
                ))}
            </TextField>
        </Stack>
    );

    const renderDateRange = (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                Assignment Date
            </Typography>
            <Stack spacing={2}>
                <DatePicker
                    label="Start Date"
                    format="DD-MM-YYYY"
                    value={filters.startDate ? dayjs(filters.startDate) : null}
                    onChange={handleFilterStartDate}
                    slotProps={{
                        textField: {
                            fullWidth: true,
                            size: 'small',
                            sx: {
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 1.5,
                                    bgcolor: 'background.neutral',
                                },
                            },
                        }
                    }}
                />
                <DatePicker
                    label="End Date"
                    format="DD-MM-YYYY"
                    value={filters.endDate ? dayjs(filters.endDate) : null}
                    onChange={handleFilterEndDate}
                    slotProps={{
                        textField: {
                            fullWidth: true,
                            size: 'small',
                            sx: {
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 1.5,
                                    bgcolor: 'background.neutral',
                                },
                            },
                        }
                    }}
                />
            </Stack>
        </Stack>
    );

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            slotProps={{
                paper: {
                    sx: {
                        width: 320,
                        boxShadow: (theme: Theme) => (theme.customShadows as any).z24,
                    },
                },
            }}
            sx={{
                zIndex: (theme) => theme.zIndex.drawer + 100,
            }}
        >
            {renderHead}

            <Scrollbar>
                <Stack spacing={3} sx={{ p: 3, pt: 2.5 }}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        {isHR && renderEmployee}
                        {renderStatus}
                        {renderDateRange}
                    </LocalizationProvider>
                </Stack>
            </Scrollbar>

            <Box
                sx={{
                    p: 2.5,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.neutral',
                }}
            >
                <Button
                    fullWidth
                    size="large"
                    color="inherit"
                    variant="outlined"
                    startIcon={<Iconify icon="solar:restart-bold" />}
                    onClick={onResetFilters}
                    disabled={!canReset}
                    sx={{
                        borderRadius: 1.5,
                        borderColor: 'divider',
                        fontWeight: 600,
                        '&:hover': {
                            borderColor: 'error.main',
                            color: 'error.main',
                            bgcolor: 'error.lighter',
                        },
                        '&.Mui-disabled': {
                            borderColor: 'divider',
                        },
                    }}
                >
                    Clear All Filters
                </Button>
            </Box>
        </Drawer>
    );
}
