import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

const STATUSES = ['Open', 'Closed'];

// ----------------------------------------------------------------------

type FiltersProps = {
    status: string;
    location: string;
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
    locations: string[];
};

export function JobOpeningsTableFiltersDrawer({
    open,
    onClose,
    filters,
    onFilters,
    canReset,
    onResetFilters,
    locations,
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
                onChange={(e) => handleFilterChange('status', e.target.value)}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        bgcolor: 'background.neutral',
                    },
                }}
            >
                <MenuItem value="all">All</MenuItem>
                {STATUSES.map((status) => (
                    <MenuItem key={status} value={status}>
                        {status}
                    </MenuItem>
                ))}
            </TextField>
        </Stack>
    );

    const renderLocation = (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                Location
            </Typography>
            <TextField
                select
                fullWidth
                size="small"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        bgcolor: 'background.neutral',
                    },
                }}
            >
                <MenuItem value="all">All</MenuItem>
                {locations.map((location) => (
                    <MenuItem key={location} value={location}>
                        {location}
                    </MenuItem>
                ))}
            </TextField>
        </Stack>
    );

    const renderDateRange = (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                Posted Date Range
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Stack spacing={2}>
                    <DatePicker
                        label="Start Date"
                        value={filters.startDate ? dayjs(filters.startDate) : null}
                        onChange={(newValue) => handleFilterChange('startDate', newValue ? newValue.format('YYYY-MM-DD') : null)}
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
                        onChange={(newValue) => handleFilterChange('endDate', newValue ? newValue.format('YYYY-MM-DD') : null)}
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
                    {renderStatus}
                    {renderLocation}
                    {renderDateRange}
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
