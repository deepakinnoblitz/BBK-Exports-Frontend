import { useState } from 'react';

import { alpha } from '@mui/material/styles';
import {
    Box,
    Card,
    Chip,
    Stack,
    Table,
    Alert,
    Dialog,
    TableRow,
    TableBody,
    TableCell,
    TableHead,
    TextField,
    Typography,
    IconButton,
    DialogTitle,
    DialogContent,
    TableContainer,
    InputAdornment,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface AllocationResult {
    created_count: number;
    skipped_count: number;
    created_details: {
        employee_name: string;
        employee_id: string;
        leave_type: string;
        allocated: number;
        carry_forward: number;
    }[];
    errors: string[];
}

interface Props {
    open: boolean;
    onClose: VoidFunction;
    data: AllocationResult | null;
}

export default function AutoAllocateResultDialog({ open, onClose, data }: Props) {
    const [searchQuery, setSearchQuery] = useState('');

    if (!data) return null;

    const filteredDetails = data.created_details.filter((detail) =>
        detail.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        detail.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        detail.leave_type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getLeaveTypeColor = (leaveType: string): any => {
        const map: Record<string, any> = {
            "Paid Leave": "primary",
            "Unpaid Leave": "warning",
            "Permission": "info",
            "Sick Leave": "error",
            "Casual Leave": "success",
        };

        return map[leaveType] || "default";
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="lg"
            PaperProps={{
                sx: {
                    borderRadius: 2.5,
                    boxShadow: (theme) => `0 24px 48px -12px ${alpha(theme.palette.common.black, 0.24)}`
                },
            }}
        >
            <DialogTitle sx={{
                m: 0,
                p: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid',
                borderColor: 'divider'
            }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Leave Allocation Result</Typography>
                </Stack>
                <IconButton onClick={onClose} sx={{ color: 'text.disabled' }}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 4, bgcolor: 'background.paper', mt: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ mb: 3, fontWeight: 800, color: 'text.primary' }}>
                        Allocation Completed Successfully!
                    </Typography>

                    <Stack direction="row" spacing={3} sx={{ mb: 4 }}>
                        <Card sx={{
                            p: 2.5,
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2.5,
                            bgcolor: (theme) => alpha(theme.palette.success.main, 0.04),
                            border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.12)}`,
                            boxShadow: 'none'
                        }}>
                            <Box sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 1.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'success.main',
                                color: 'common.white',
                                boxShadow: (theme) => `0 8px 16px -4px ${alpha(theme.palette.success.main, 0.4)}`
                            }}>
                                <Iconify icon="eva:checkmark-fill" width={32} />
                            </Box>
                            <Stack>
                                <Typography variant="h4" sx={{ fontWeight: 800 }}>{data.created_count}</Typography>
                                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600 }}>Allocations Created</Typography>
                            </Stack>
                        </Card>

                        <Card sx={{
                            p: 2.5,
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2.5,
                            bgcolor: (theme) => alpha(theme.palette.warning.main, 0.04),
                            border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.12)}`,
                            boxShadow: 'none'
                        }}>
                            <Box sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 1.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'warning.main',
                                color: 'common.white',
                                boxShadow: (theme) => `0 8px 16px -4px ${alpha(theme.palette.warning.main, 0.4)}`
                            }}>
                                <Iconify icon="solar:double-alt-arrow-right-bold" width={32} />
                            </Box>
                            <Stack>
                                <Typography variant="h4" sx={{ fontWeight: 800 }}>{data.skipped_count}</Typography>
                                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600 }}>Already Existing / Skipped</Typography>
                            </Stack>
                        </Card>
                    </Stack>

                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', px: 0.5 }}>
                            Detailed Log
                        </Typography>
                        <TextField
                            size="small"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search employee..."
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ width: 280 }}
                        />
                    </Stack>

                    <TableContainer sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        maxHeight: 300,
                        bgcolor: 'background.neutral'
                    }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>
                                    Employee
                                </TableCell>

                                <TableCell sx={{ fontWeight: 700 }}>
                                    Leave Type
                                </TableCell>

                                <TableCell align="center" sx={{ fontWeight: 700 }}>
                                    Carry Forward
                                </TableCell>

                                <TableCell align="center" sx={{ fontWeight: 700 }}>
                                    Total Allocated
                                </TableCell>

                                <TableCell align="center" sx={{ fontWeight: 700 }}>
                                    Status
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {filteredDetails.map((detail) => (
                                <TableRow
                                    hover
                                    key={`${detail.employee_id}-${detail.leave_type}`}
                                >
                                    {/* Employee */}
                                    <TableCell>
                                        <Typography
                                            variant="body2"
                                            sx={{ fontWeight: 700 }}
                                        >
                                            {detail.employee_name}
                                        </Typography>

                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            {detail.employee_id}
                                        </Typography>
                                    </TableCell>

                                    {/* Leave Type */}
                                    <TableCell>
                                        <Chip
                                            label={detail.leave_type}
                                            size="small"
                                            color={getLeaveTypeColor(detail.leave_type)}
                                            variant="filled"
                                            sx={{
                                                fontWeight: 700,
                                                minWidth: 110,
                                            }}
                                        />
                                    </TableCell>

                                    {/* Carry Forward */}
                                    <TableCell align="center">
                                        {detail.carry_forward > 0 ? (
                                            <Chip
                                                size="small"
                                                color="success"
                                                variant="outlined"
                                                icon={
                                                    <Iconify
                                                        icon={"solar:arrow-up-bold" as any}
                                                        width={14}
                                                    />
                                                }
                                                label={`+${detail.carry_forward}`}
                                            />
                                        ) : (
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                —
                                            </Typography>
                                        )}
                                    </TableCell>

                                    {/* Allocated */}
                                    <TableCell align="center">
                                        <Typography
                                            variant="subtitle2"
                                            sx={{
                                                fontWeight: 800,
                                                color: 'success.main',
                                            }}
                                        >
                                            {detail.allocated}
                                        </Typography>
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell align="center">
                                        <Chip
                                            icon={
                                                <Iconify
                                                    icon={"eva:checkmark-circle-2-fill" as any}
                                                    width={16}
                                                />
                                            }
                                            label="Created"
                                            color="success"
                                            size="small"
                                            variant="filled"
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}

                            {filteredDetails.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        sx={{
                                            py: 6,
                                            textAlign: 'center',
                                        }}
                                    >
                                        <Stack
                                            spacing={1}
                                            alignItems="center"
                                        >
                                            <Iconify
                                                icon="solar:folder-bold-duotone"
                                                width={48}
                                                sx={{ color: 'text.disabled' }}
                                            />

                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                No new allocations were created.
                                            </Typography>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    </TableContainer>

                    {data.errors.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                            <Alert
                                severity="error"
                                variant="outlined"
                                sx={{ borderRadius: 1.5, '& .MuiAlert-message': { width: '100%' } }}
                            >
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Errors Encountered ({data.errors.length}):</Typography>
                                <Box component="ul" sx={{ m: 0, pl: 2, fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                    {data.errors.map((err, i) => <li key={i}>{err}</li>)}
                                </Box>
                            </Alert>
                        </Box>
                    )}
                </Box>
            </DialogContent>

            {/* <DialogActions sx={{ p: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={onClose}
                    fullWidth
                    sx={{ py: 1.5, borderRadius: 1.25, fontWeight: 700 }}
                >
                    Done & Close
                </Button>
            </DialogActions> */}
        </Dialog>
    );
}
