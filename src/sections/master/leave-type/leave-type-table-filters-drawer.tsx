import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onOpen: VoidFunction;
    onClose: VoidFunction;
    canReset: boolean;
    filters: {
        status: string;
    };
    onFilters: (name: string, value: string) => void;
    onResetFilters: VoidFunction;
};

export default function LeaveTypeTableFiltersDrawer({
    open,
    onOpen,
    onClose,
    canReset,
    filters,
    onFilters,
    onResetFilters
}: Props) {
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
            <FormControl size="small" fullWidth>
                <Select
                    value={filters.status || 'all'}
                    onChange={(e) => onFilters('status', e.target.value)}
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
                    {renderStatus}
                </Stack>
            </Scrollbar>

            {renderFooter}
        </Drawer>
    );
}
