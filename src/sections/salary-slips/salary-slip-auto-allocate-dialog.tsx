import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import { styled } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FormControlLabel from '@mui/material/FormControlLabel';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { getDoctypeList } from 'src/api/leads';
import { generateSalarySlipsForEmployees } from 'src/api/salary-slips';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

// Android 12 Switch Style
const Android12Switch = styled(Switch)(({ theme }) => ({
    width: 36,
    height: 20,
    padding: 0,
    marginRight: 10,
    '& .MuiSwitch-switchBase': {
        padding: 0,
        margin: 3,
        transitionDuration: '300ms',
        '&.Mui-checked': {
            transform: 'translateX(16px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
                backgroundColor: theme.palette.primary.main,
                opacity: 1,
                border: 0,
            },
            '& .MuiSwitch-thumb': {
                backgroundColor: theme.palette.primary.contrastText,
                width: 14,
                height: 14,
            },
        },
        '&.Mui-disabled + .MuiSwitch-track': {
            opacity: 0.5,
        },
    },
    '& .MuiSwitch-thumb': {
        boxSizing: 'border-box',
        width: 14,
        height: 14,
        backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[400] : theme.palette.grey[600],
        boxShadow: '0 2px 4px 0 rgba(0,0,0,0.2)',
    },
    '& .MuiSwitch-track': {
        borderRadius: 20 / 2,
        backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300],
        opacity: 1,
        transition: theme.transitions.create(['background-color'], {
            duration: 300,
        }),
    },
}));

// Android 12 Button Style
const Android12Button = styled(Button)(({ theme }) => ({
    borderRadius: 20,
    textTransform: 'none',
    fontWeight: 600,
    padding: '6px 16px',
    fontSize: '0.875rem',
    boxShadow: 'none',
    '&:hover': {
        boxShadow: 'none',
    },
}));

// Android 12 Loading Button Style
const Android12LoadingButton = styled(LoadingButton)(({ theme }) => ({
    borderRadius: 20,
    textTransform: 'none',
    fontWeight: 600,
    padding: '6px 16px',
    fontSize: '0.875rem',
    boxShadow: 'none',
    '&:hover': {
        boxShadow: 'none',
    },
}));

// ----------------------------------------------------------------------

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: (message: string) => void;
    onError: (error: string) => void;
}

interface Employee {
    name: string;
    employee_name: string;
}

export default function SalarySlipAutoAllocateDialog({ open, onClose, onSuccess, onError }: Props) {
    const currentDate = new Date();
    const [step, setStep] = useState(1);
    const [year, setYear] = useState<Dayjs>(dayjs());
    const [month, setMonth] = useState(currentDate.getMonth() + 1);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingEmployees, setFetchingEmployees] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    useEffect(() => {
        if (!open) {
            // Reset state when dialog closes
            setStep(1);
            setEmployees([]);
            setSelectedEmployees([]);
            setSearchQuery('');
        }
    }, [open]);

    const handleNext = async () => {
        try {
            setFetchingEmployees(true);
            const data = await getDoctypeList('Employee', ['name', 'employee_name'], { status: 'Active' });
            setEmployees(data);
            setSelectedEmployees(data.map((emp: Employee) => emp.name)); // Select all by default
            setStep(2);
        } catch (error: any) {
            onError(error.message || 'Failed to fetch employees');
        } finally {
            setFetchingEmployees(false);
        }
    };

    const handleBack = () => {
        setStep(1);
    };

    const handleToggleEmployee = (employeeId: string) => {
        setSelectedEmployees((prev) =>
            prev.includes(employeeId)
                ? prev.filter((id) => id !== employeeId)
                : [...prev, employeeId]
        );
    };

    const handleSelectAll = () => {
        setSelectedEmployees(employees.map((emp) => emp.name));
    };

    const handleDeselectAll = () => {
        setSelectedEmployees([]);
    };

    const handleGenerate = async () => {
        try {
            if (selectedEmployees.length === 0) {
                onError('Please select at least one employee');
                return;
            }

            setLoading(true);
            const message = await generateSalarySlipsForEmployees(year.year(), month, selectedEmployees);
            onSuccess(message || `Successfully generated salary slips for ${selectedEmployees.length} employee(s)`);
            onClose();
        } catch (error: any) {
            onError(error.message || 'Failed to generate salary slips');
        } finally {
            setLoading(false);
        }
    };

    const filteredEmployees = employees.filter(
        (emp) =>
            emp.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const allSelected = employees.length > 0 && selectedEmployees.length === employees.length;
    const someSelected = selectedEmployees.length > 0 && selectedEmployees.length < employees.length;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24, } }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: (theme) => `1px solid ${theme.palette.divider}`, }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Auto Allocate Salary Slips {step === 2 && `- Step ${step} of 2`}
                </Typography>
                <IconButton onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3, mt:2 }}>
                {step === 1 ? (
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Box sx={{ mt: 2 }}>
                            <Stack direction="row" spacing={2}>
                                <DatePicker
                                    label="Year"
                                    views={['year']}
                                    value={year}
                                    onChange={(newValue) => setYear(newValue || dayjs())}
                                    slotProps={{ textField: { fullWidth: true } }}
                                />

                                <TextField
                                    select
                                    fullWidth
                                    label="Month"
                                    value={month}
                                    onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                                >
                                    {[
                                        { label: 'January', value: 1 },
                                        { label: 'February', value: 2 },
                                        { label: 'March', value: 3 },
                                        { label: 'April', value: 4 },
                                        { label: 'May', value: 5 },
                                        { label: 'June', value: 6 },
                                        { label: 'July', value: 7 },
                                        { label: 'August', value: 8 },
                                        { label: 'September', value: 9 },
                                        { label: 'October', value: 10 },
                                        { label: 'November', value: 11 },
                                        { label: 'December', value: 12 },
                                    ].map((m) => (
                                        <MenuItem key={m.value} value={m.value}>
                                            {m.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Stack>
                            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                                Select year and month, then choose employees to generate salary slips for <strong>{monthNames[month - 1]} {year.year()}</strong>.
                            </Typography>
                        </Box>
                    </LocalizationProvider>
                ) : (
                    <Box sx={{ mt: 2 }}>
                        <TextField
                            fullWidth
                            placeholder="Search employee name or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <Iconify
                                        icon="eva:search-fill"
                                        sx={{ color: 'text.disabled', mr: 1, width: 20, height: 20 }}
                                    />
                                ),
                            }}
                            sx={{ mb: 2 }}
                        />

                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                                {selectedEmployees.length} of {employees.length} employee(s) selected
                                {searchQuery && ` (${filteredEmployees.length} matching)`}
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                <Android12Button variant="outlined" size="small" onClick={handleSelectAll} disabled={allSelected}>
                                    Select All
                                </Android12Button>
                                <Android12Button variant="outlined" size="small" onClick={handleDeselectAll} disabled={selectedEmployees.length === 0}>
                                    Deselect All
                                </Android12Button>
                            </Stack>
                        </Stack>

                        <Scrollbar sx={{ maxHeight: 400 }}>
                            <Box
                                display="grid"
                                gridTemplateColumns="repeat(2, 1fr)"
                                gap={1}
                            >
                                {filteredEmployees.map((employee) => (
                                    <FormControlLabel
                                        key={employee.name}
                                        control={
                                            <Android12Switch
                                                checked={selectedEmployees.includes(employee.name)}
                                                onChange={() => handleToggleEmployee(employee.name)}
                                            />
                                        }
                                        label={
                                            <Stack>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {employee.employee_name}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                    ID: {employee.name}
                                                </Typography>
                                            </Stack>
                                        }
                                        sx={{
                                            m: 0,
                                            p: 1,
                                            borderRadius: 1,
                                            '&:hover': {
                                                bgcolor: 'action.hover',
                                            },
                                        }}
                                    />
                                ))}
                            </Box>
                        </Scrollbar>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2.5, pt: 0 }}>
                {step === 2 && (
                    <Android12Button variant="outlined" onClick={handleBack}>
                        Back
                    </Android12Button>
                )}
                <Box sx={{ flexGrow: 1 }} />
                {step === 1 ? (
                    <Android12LoadingButton
                        variant="contained"
                        loading={fetchingEmployees}
                        onClick={handleNext}
                    >
                        Next
                    </Android12LoadingButton>
                ) : (
                    <Android12LoadingButton
                        variant="contained"
                        loading={loading}
                        onClick={handleGenerate}
                        disabled={selectedEmployees.length === 0}
                    >
                        Generate ({selectedEmployees.length})
                    </Android12LoadingButton>
                )}
            </DialogActions>
        </Dialog>
    );
}
