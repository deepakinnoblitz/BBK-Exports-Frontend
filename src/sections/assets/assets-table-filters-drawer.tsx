import type { Theme } from '@mui/material/styles';

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
import Autocomplete from '@mui/material/Autocomplete';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { getAssetCategories } from 'src/api/assets';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

const STATUSES = ['Available', 'Assigned', 'Maintenance', 'Disposed'];

// ----------------------------------------------------------------------

type FiltersProps = {
    status: string;
    category: string;
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
};

export function AssetsTableFiltersDrawer({
    open,
    onClose,
    filters,
    onFilters,
    canReset,
    onResetFilters,
}: Props) {
    const [categories, setCategories] = useState<any[]>([]);

    useEffect(() => {
        const fetchCategories = async () => {
            const cats = await getAssetCategories();
            setCategories(cats);
        };
        fetchCategories();
    }, []);

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
                {STATUSES.map((option) => (
                    <MenuItem key={option} value={option}>
                        {option}
                    </MenuItem>
                ))}
            </TextField>
        </Stack>
    );

    const renderCategory = (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                Category
            </Typography>
            <Autocomplete
                fullWidth
                size="small"
                options={['all', ...categories.map((c) => c.name || c)]}
                getOptionLabel={(option) => {
                    if (option === 'all') return 'All';
                    const categoryObj = categories.find((c) => (c.name || c) === option);
                    return categoryObj?.category_name || option;
                }}
                value={filters.category}
                onChange={(event, newValue) => {
                    handleFilterChange('category', newValue || 'all');
                }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        placeholder="Search category..."
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 1.5,
                                bgcolor: 'background.neutral',
                            },
                        }}
                    />
                )}
            />
        </Stack>
    );

    const renderDateRange = (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                Purchase Date
            </Typography>
            <Stack spacing={2}>
                <DatePicker
                    label="Start Date"
                    format="DD-MM-YYYY"
                    value={filters.startDate ? dayjs(filters.startDate) : null}
                    onChange={(newValue) => handleFilterChange('startDate', newValue ? newValue.format('YYYY-MM-DD') : null)}
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
                <DatePicker
                    label="End Date"
                    format="DD-MM-YYYY"
                    value={filters.endDate ? dayjs(filters.endDate) : null}
                    onChange={(newValue) => handleFilterChange('endDate', newValue ? newValue.format('YYYY-MM-DD') : null)}
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
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
                <Stack spacing={3} sx={{ p: 3 }}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        {renderStatus}
                        {renderCategory}
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
