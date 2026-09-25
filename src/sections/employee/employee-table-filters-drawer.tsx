import type { SelectChangeEvent } from '@mui/material/Select';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';

import { getStates, getCities, getCountries } from 'src/api/location';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onOpen: VoidFunction;
    onClose: VoidFunction;
    filters: {
        department: string;
        designation: string;
        status: string;
        country: string;
        state: string;
        city: string;
    };
    onFilters: (update: any) => void;
    canReset: boolean;
    onResetFilters: VoidFunction;
    departmentOptions: any[];
    designationOptions: any[];
};

export default function EmployeeTableFiltersDrawer({
    open,
    onOpen,
    onClose,
    filters,
    onFilters,
    canReset,
    onResetFilters,
    departmentOptions,
    designationOptions,
}: Props) {
    const [countryOptions, setCountryOptions] = useState<string[]>([]);
    const [stateOptions, setStateOptions] = useState<string[]>([]);
    const [cityOptions, setCityOptions] = useState<string[]>([]);

    // Fetch countries on mount
    useEffect(() => {
        const fetchCountries = async () => {
            const countries = await getCountries();
            setCountryOptions(countries);
        };
        fetchCountries();
    }, []);

    // Fetch states when country changes
    useEffect(() => {
        const fetchStatesForCountry = async () => {
            if (filters.country) {
                const states = await getStates(filters.country);
                setStateOptions(states);
            } else {
                setStateOptions([]);
            }
        };
        fetchStatesForCountry();
    }, [filters.country]);

    // Fetch cities when state changes
    useEffect(() => {
        const fetchCitiesForState = async () => {
            if (filters.state && filters.country) {
                const cities = await getCities(filters.country, filters.state);
                setCityOptions(cities);
            } else {
                setCityOptions([]);
            }
        };
        fetchCitiesForState();
    }, [filters.state, filters.country]);

    const handleFilterDepartment = (event: any, value: string | null) => {
        onFilters({ department: value || 'all' });
    };

    const handleFilterDesignation = (event: React.ChangeEvent<HTMLInputElement>) => {
        onFilters({ designation: event.target.value });
    };

    const handleFilterStatus = (event: SelectChangeEvent<string>) => {
        onFilters({ status: event.target.value });
    };

    const handleFilterCountry = (event: any, value: string | null) => {
        onFilters({ country: value || '', state: '', city: '' });
    };

    const handleFilterState = (event: any, value: string | null) => {
        onFilters({ state: value || '', city: '' });
    };

    const handleFilterCity = (event: any, value: string | null) => {
        onFilters({ city: value || '' });
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

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            slotProps={{
                paper: {
                    sx: {
                        width: 320,
                        boxShadow: (theme: any) => theme.customShadows.z24,
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
                    <Stack spacing={1.5}>
                        <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                            Department
                        </Typography>
                        <Autocomplete
                            fullWidth
                            options={['All Departments', ...departmentOptions.map((dept: any) => dept.name)]}
                            value={filters.department === 'all' ? 'All Departments' : filters.department}
                            onChange={(event, newValue) => {
                                handleFilterDepartment(event, newValue === 'All Departments' ? 'all' : newValue);
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder="Select department..."
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
                        />
                    </Stack>

                    <Stack spacing={1.5}>
                        <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                            Country
                        </Typography>
                        <Autocomplete
                            fullWidth
                            options={countryOptions}
                            value={filters.country || null}
                            onChange={handleFilterCountry}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder="Select country..."
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
                        />
                    </Stack>

                    <Stack spacing={1.5}>
                        <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                            State
                        </Typography>
                        <Autocomplete
                            fullWidth
                            options={stateOptions}
                            value={filters.state || null}
                            onChange={handleFilterState}
                            disabled={!filters.country}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder={filters.country ? "Select state..." : "Select country first"}
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
                        />
                    </Stack>

                    <Stack spacing={1.5}>
                        <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                            City
                        </Typography>
                        <Autocomplete
                            fullWidth
                            options={cityOptions}
                            value={filters.city || null}
                            onChange={handleFilterCity}
                            disabled={!filters.state}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder={filters.state ? "Select city..." : "Select state first"}
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
                        />
                    </Stack>

                    <Stack spacing={1.5}>
                        <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                            Status
                        </Typography>
                        <FormControl fullWidth size="small">
                            <Select
                                value={filters.status}
                                onChange={handleFilterStatus}
                                displayEmpty
                                sx={{
                                    borderRadius: 1.5,
                                    bgcolor: 'background.neutral',
                                    '&:hover': {
                                        bgcolor: 'action.hover',
                                    },
                                }}
                            >
                                <MenuItem value="all">All Status</MenuItem>
                                <MenuItem value="Active">Active</MenuItem>
                                <MenuItem value="Inactive">Inactive</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
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
