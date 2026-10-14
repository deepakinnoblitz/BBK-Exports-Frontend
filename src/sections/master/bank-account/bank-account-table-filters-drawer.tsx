import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';

import { getDistinctBanks } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onOpen?: VoidFunction;
    onClose: VoidFunction;
    canReset: boolean;
    filters: {
        account_type: string;
        bank_name: string;
    };
    onFilters: (name: string, value: string) => void;
    onResetFilters: VoidFunction;
};

const ACCOUNT_TYPE_OPTIONS = [
    { value: 'all', label: 'All Account Types' },
    { value: 'Savings', label: 'Savings' },
    { value: 'Current', label: 'Current' },
    { value: 'Salary Account', label: 'Salary Account' },
    { value: 'Other', label: 'Other' },
];

export default function BankAccountTableFiltersDrawer({
    open,
    onOpen,
    onClose,
    canReset,
    filters,
    onFilters,
    onResetFilters,
}: Props) {
    const [bankOptions, setBankOptions] = useState<string[]>([]);

    useEffect(() => {
        const fetchBanks = async () => {
            try {
                const res = await getDistinctBanks();
                if (res?.banks) {
                    setBankOptions(Array.from(new Set(res.banks.filter(Boolean))));
                }
            } catch (err) {
                console.error('Failed to load bank list for filters:', err);
            }
        };

        if (open) {
            fetchBanks();
        }
    }, [open]);

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

    const renderAccountType = (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                Account Type
            </Typography>
            <FormControl size="small" fullWidth>
                <Select
                    value={filters.account_type || 'all'}
                    onChange={(e) => onFilters('account_type', e.target.value)}
                    sx={{
                        borderRadius: 1.5,
                        bgcolor: 'background.neutral',
                        '&:hover': {
                            bgcolor: 'action.hover',
                        },
                    }}
                >
                    {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Stack>
    );

    const renderBankName = (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                Bank Name
            </Typography>
            <Autocomplete
                fullWidth
                size="small"
                options={bankOptions}
                value={
                    filters.bank_name === 'all' || !filters.bank_name
                        ? null
                        : bankOptions.find((b) => b === filters.bank_name) || filters.bank_name
                }
                onChange={(_, newValue) => {
                    onFilters('bank_name', newValue || 'all');
                }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        placeholder="Search or select bank..."
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
    );

    const renderFooter = (
        <Box
            sx={{
                p: 2.5,
                borderTop: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.neutral',
                mt: 'auto',
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
                    bgcolor: 'background.paper',
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
    );

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            slotProps={{
                paper: {
                    sx: {
                        width: 340,
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
                    {renderAccountType}
                    {renderBankName}
                </Stack>
            </Scrollbar>

            {renderFooter}
        </Drawer>
    );
}
