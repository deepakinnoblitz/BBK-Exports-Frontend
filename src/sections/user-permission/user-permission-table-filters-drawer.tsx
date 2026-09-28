import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Autocomplete from '@mui/material/Autocomplete';

import { getUsers, getDocTypes, getForValueOptions } from 'src/api/user-permissions';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onOpen: () => void;
    onClose: () => void;
    filters: any;
    onFilters: (update: any) => void;
    canReset: boolean;
    onResetFilters: () => void;
};

export function UserPermissionTableFiltersDrawer({
    open,
    onOpen,
    onClose,
    filters,
    onFilters,
    canReset,
    onResetFilters,
}: Props) {
    const [docTypes, setDocTypes] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [forValueOptions, setForValueOptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingOptions, setLoadingOptions] = useState(false);

    useEffect(() => {
        if (open) {
            setLoading(true);
            Promise.all([getDocTypes(), getUsers()])
                .then(([doctypes, usersList]) => {
                    setDocTypes(doctypes || []);
                    setUsers(usersList || []);
                })
                .catch((err: any) => console.error('Failed to fetch data:', err))
                .finally(() => setLoading(false));
        }
    }, [open]);

    useEffect(() => {
        const fetchOptions = async () => {
            if (!filters.allow) {
                setForValueOptions([]);
                return;
            }
            setLoadingOptions(true);
            try {
                const options = await getForValueOptions(filters.allow);
                setForValueOptions(options || []);
            } catch (error) {
                console.error('Failed to fetch options:', error);
                setForValueOptions([]);
            } finally {
                setLoadingOptions(false);
            }
        };

        fetchOptions();
    }, [filters.allow]);

    const handleFilterUser = (newValue: string) => {
        onFilters({ user: newValue });
    };

    const handleFilterAllow = (newValue: string) => {
        onFilters({ allow: newValue, for_value: '' });
    };

    const handleFilterForValue = (newValue: string) => {
        onFilters({ for_value: newValue });
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
                            User
                        </Typography>
                        <Autocomplete
                            options={users}
                            getOptionLabel={(option) => option.full_name ? `${option.full_name} (${option.email})` : option.email}
                            value={users.find((u) => u.email === filters.user) || (filters.user ? { email: filters.user, name: filters.user } : null)}
                            isOptionEqualToValue={(option, value) => option.email === value?.email}
                            onChange={(e, newValue) => handleFilterUser(newValue?.email || '')}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder="Search user..."
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
                            loading={loading}
                        />
                    </Stack>

                    <Stack spacing={1.5}>
                        <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                            Allow (DocType)
                        </Typography>
                        <Autocomplete
                            options={docTypes}
                            getOptionLabel={(option) => option.name}
                            value={docTypes.find((dt) => dt.name === filters.allow) || (filters.allow ? { name: filters.allow } : null)}
                            isOptionEqualToValue={(option, value) => option.name === value?.name}
                            onChange={(e, newValue) => handleFilterAllow(newValue?.name || '')}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder="Search doctype..."
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
                            loading={loading}
                        />
                    </Stack>

                    <Stack spacing={1.5}>
                        <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                            For Value
                        </Typography>
                        <Autocomplete
                            options={forValueOptions}
                            getOptionLabel={(option) => {
                                if (filters.allow === 'Employee' && option.employee_name) {
                                    return `${option.name} - ${option.employee_name}`;
                                }
                                return option.name || '';
                            }}
                            value={forValueOptions.find((opt) => opt.name === filters.for_value) || (filters.for_value ? { name: filters.for_value } : null)}
                            isOptionEqualToValue={(option, value) => option.name === value?.name}
                            onChange={(e, newValue) => handleFilterForValue(newValue?.name || '')}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder={filters.allow ? `Search ${filters.allow} value...` : 'Search value...'}
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
                            loading={loadingOptions}
                            disabled={!filters.allow}
                        />
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
                    onClick={onResetFilters}
                    disabled={!canReset}
                    startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
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
