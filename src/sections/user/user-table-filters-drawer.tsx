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
import Autocomplete from '@mui/material/Autocomplete';

import { getRoles } from 'src/api/users';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onOpen: VoidFunction;
    onClose: VoidFunction;
    filters: {
        user_type: string;
        enabled: string;
        permission: string;
        roles: string[];
    };
    onFilters: (update: any) => void;
    canReset: boolean;
    onResetFilters: VoidFunction;
};

export function UserTableFiltersDrawer({
    open,
    onOpen,
    onClose,
    filters,
    onFilters,
    canReset,
    onResetFilters,
}: Props) {
    const [roles, setRoles] = useState<any[]>([]);

    useEffect(() => {
        // Fetch data when drawer opens
        if (open) {
            getRoles()
                .then(setRoles)
                .catch((err: any) => console.error('Failed to fetch roles:', err));
        }
    }, [open]);

    const handleFilterUserType = (event: React.ChangeEvent<HTMLInputElement>) => {
        onFilters({ user_type: event.target.value });
    };

    const handleFilterStatus = (event: any) => {
        onFilters({ enabled: event.target.value });
    };

    const handleFilterPermission = (event: any) => {
        onFilters({ permission: event.target.value });
    };

    const handleFilterRoles = (newValue: string[]) => {
        onFilters({ roles: newValue });
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
                            Status
                        </Typography>
                        <Select
                            fullWidth
                            value={filters.enabled}
                            onChange={handleFilterStatus}
                            size="small"
                            sx={{
                                borderRadius: 1.5,
                                bgcolor: 'background.neutral',
                                '&:hover': { bgcolor: 'action.hover' },
                            }}
                        >
                            <MenuItem value="all">All Status</MenuItem>
                            <MenuItem value="1">Enabled</MenuItem>
                            <MenuItem value="0">Disabled</MenuItem>
                        </Select>
                    </Stack>

                    <Stack spacing={1.5}>
                        <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                            Permission
                        </Typography>
                        <Select
                            fullWidth
                            value={filters.permission}
                            onChange={handleFilterPermission}
                            size="small"
                            sx={{
                                borderRadius: 1.5,
                                bgcolor: 'background.neutral',
                                '&:hover': { bgcolor: 'action.hover' },
                            }}
                        >
                            <MenuItem value="all">All Permission</MenuItem>
                            <MenuItem value="added">Added</MenuItem>
                            <MenuItem value="not_added">Not Added</MenuItem>
                        </Select>
                    </Stack>

                    <Stack spacing={1.5}>
                        <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                            Roles
                        </Typography>
                        <Autocomplete
                            multiple
                            limitTags={2}
                            options={roles.map((role) => role.name)}
                            value={filters.roles}
                            onChange={(event, newValue) => handleFilterRoles(newValue)}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder="Select Roles"
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
