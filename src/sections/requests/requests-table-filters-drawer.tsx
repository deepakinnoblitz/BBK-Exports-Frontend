import type { SwitchProps } from '@mui/material/Switch';

import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import { styled } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Autocomplete from '@mui/material/Autocomplete';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// Custom pill-style toggle matching Reminder settings
const UnreadSwitch = styled((props: SwitchProps) => (
    <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
    width: 46,
    height: 26,
    padding: 0,
    '& .MuiSwitch-switchBase': {
        padding: 0,
        margin: 3,
        transitionDuration: '250ms',
        transition: theme.transitions.create(['transform'], { easing: 'ease', duration: 250 }),
        '&.Mui-checked': {
            transform: 'translateX(20px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
                backgroundColor: '#00b4d8',
                opacity: 1,
                border: 0,
            },
        },
    },
    '& .MuiSwitch-thumb': {
        boxSizing: 'border-box',
        width: 20,
        height: 20,
        boxShadow: 'none',
    },
    '& .MuiSwitch-track': {
        borderRadius: 26 / 2,
        backgroundColor: '#d1d5db',
        opacity: 1,
        transition: theme.transitions.create(['background-color'], { duration: 250 }),
    },
}));

// ----------------------------------------------------------------------

type FiltersProps = {
    employee: string | null;
    status: string;
    startDate: string | null;
    endDate: string | null;
    unread_messages: boolean;
};

type Props = {
    open: boolean;
    onOpen: () => void;
    onClose: () => void;
    filters: FiltersProps;
    onFilters: (update: Partial<FiltersProps>) => void;
    canReset: boolean;
    onResetFilters: () => void;
    employees: any[];
    isHR?: boolean;
};

export function RequestsTableFiltersDrawer({
    open,
    onOpen,
    onClose,
    filters,
    onFilters,
    canReset,
    onResetFilters,
    employees,
    isHR,
}: Props) {
    const handleFilterChange = (field: keyof FiltersProps, value: any) => {
        onFilters({ [field]: value });
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
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
                Filters
            </Typography>

            <IconButton
                onClick={onResetFilters}
                disabled={!canReset}
                sx={{
                    mr: 0.5,
                    color: canReset ? 'primary.main' : 'text.disabled',
                    '&:hover': {
                        bgcolor: canReset ? 'primary.lighter' : 'transparent',
                    },
                }}
            >
                <Badge color="error" variant="dot" invisible={!canReset}>
                    <Iconify icon="solar:restart-bold" width={20} />
                </Badge>
            </IconButton>

            <IconButton
                onClick={onClose}
                sx={{
                    color: 'text.secondary',
                    '&:hover': {
                        bgcolor: 'action.hover',
                    },
                }}
            >
                <Iconify icon="mingcute:close-line" width={20} />
            </IconButton>
        </Box>
    );

    const renderEmployee = (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                Employee
            </Typography>
            <Autocomplete
                fullWidth
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
                    const terms = input.split(/\s+/).filter(Boolean);
                    const filtered = opts.filter((opt) => {
                        if (opt === 'all') return 'all employees'.includes(input);
                        const employee = employees.find((e: any) => e.name === opt);
                        if (!employee) return opt.toLowerCase().includes(input);
                        const fullName = employee.employee_name || '';
                        const empId = employee.name || '';
                        const combined = `${fullName} ${empId} (${empId})`.toLowerCase();
                        return terms.every((term: string) => combined.includes(term));
                    });
                    return filtered.slice(0, 50);
                }}
                value={filters.employee || 'all'}
                onChange={(event, newValue) => onFilters({ employee: newValue === 'all' ? null : newValue })}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        placeholder="Search employee..."
                        size="small"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 1.5,
                                bgcolor: 'background.neutral',
                                '&:hover': {
                                    bgcolor: 'action.hover',
                                },
                            },
                        }}
                    />
                )}
                renderOption={(props, option) => {
                    if (option === 'all') {
                        const { key, ...itemProps } = props as any;
                        return (
                            <li key="all" {...itemProps}>
                                All Employees
                            </li>
                        );
                    }
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
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                size="small"
                sx={{
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        bgcolor: 'background.neutral',
                        '&:hover': {
                            bgcolor: 'action.hover',
                        },
                    },
                }}
            >
                <MenuItem value="all">All Statuses</MenuItem>
                {[
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Approved', label: 'Approved' },
                    { value: 'Rejected', label: 'Rejected' },
                    { value: 'Clarification Requested', label: 'Clarification Requested' },
                ].map((option) => (
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
                Date Range
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Stack spacing={2}>
                    <DatePicker
                        label="Start Date"
                        value={filters.startDate ? dayjs(filters.startDate) : null}
                        onChange={(newValue) => handleFilterChange('startDate', newValue?.format('YYYY-MM-DD') || null)}
                        slotProps={{
                            textField: {
                                fullWidth: true,
                                size: 'small',
                            },
                        }}
                    />
                    <DatePicker
                        label="End Date"
                        value={filters.endDate ? dayjs(filters.endDate) : null}
                        onChange={(newValue) => handleFilterChange('endDate', newValue?.format('YYYY-MM-DD') || null)}
                        slotProps={{
                            textField: {
                                fullWidth: true,
                                size: 'small',
                            },
                        }}
                    />
                </Stack>
            </LocalizationProvider>
        </Stack>
    );

    const renderUnreadMessages = (
        <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                    Unread Messages
                </Typography>
                <UnreadSwitch
                    checked={filters.unread_messages}
                    onChange={(e) => onFilters({ unread_messages: e.target.checked })}
                />
            </Box>
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
                        boxShadow: (theme) => theme.customShadows.z24,
                    },
                },
            }}
            sx={{
                zIndex: (theme) => theme.zIndex.drawer + 100,
            }}
        >
            {renderHead}

            <Scrollbar>
                <Stack spacing={3} sx={{ p: 3 }}>
                    {isHR && renderEmployee}
                    {renderStatus}
                    {renderDateRange}
                    {isHR && renderUnreadMessages}
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
                    startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
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


