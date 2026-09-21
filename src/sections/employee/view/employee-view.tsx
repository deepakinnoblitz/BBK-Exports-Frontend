import dayjs from 'dayjs';
import { MuiTelInput } from 'mui-tel-input';
import { LuUserCheck } from 'react-icons/lu';
import { TbMoneybagPlus } from "react-icons/tb";
import { GrDocumentLocked } from "react-icons/gr";
import { memo, useMemo, useState, useEffect, useCallback } from 'react';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import { LoadingButton } from '@mui/lab';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { alpha } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useRouter } from 'src/routes/hooks';

import { useEmployees } from 'src/hooks/useEmployees';

import { fNumber } from 'src/utils/format-number';

import { getDoctypeList } from 'src/api/leads';
import { uploadFile } from 'src/api/data-import';
import { getBusTravelRoute } from 'src/api/masters';
import { getStates, getCities } from 'src/api/location';
import { DashboardContent } from 'src/layouts/dashboard';
import { getEmployee, createEmployee, updateEmployee, deleteEmployee } from 'src/api/employees';
import { getHRSettings, getHRPermissions, getDocTypeMetadata, fetchSalaryComponents } from 'src/api/hr-management';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { useAuth } from 'src/auth/auth-context';

import { TableNoData } from '../../lead/table-no-data';
import { EmployeeTableRow } from '../employee-table-row';
import { ShiftCreateDialog } from '../shift-create-dialog';
import { TableEmptyRows } from '../../lead/table-empty-rows';
import { BusRouteCreateDialog } from '../bus-route-create-dialog';
import { LineOrderCreateDialog } from '../line-order-create-dialog';
import { DepartmentCreateDialog } from '../department-create-dialog';
import { BloodGroupCreateDialog } from '../blood-group-create-dialog';
import { DesignationCreateDialog } from '../designation-create-dialog';
import EmployeeTableFiltersDrawer from '../employee-table-filters-drawer';
import { EmployeeTypeCreateDialog } from '../employee-type-create-dialog';
import { QualificationCreateDialog } from '../qualification-create-dialog';
import { BankAccountDialog } from '../../master/bank-account/bank-account-dialog';
// ----------------------------------------------------------------------

const filter = createFilterOptions<any>();
import { LeadTableHead as EmployeeTableHead } from '../../lead/lead-table-head';
import { EmployeeDetailsDialog } from '../../report/employee/employee-details-dialog';
import { LeadTableToolbar as EmployeeTableToolbar } from '../../lead/lead-table-toolbar';

// ----------------------------------------------------------------------

const SalaryRow = memo(({
    index,
    type,
    row,
    componentOptions,
    hrSettings,
    onRowChange,
    onRowRemove,
    hasError
}: {
    index: number;
    type: 'Earning' | 'Deduction';
    row: any;
    componentOptions: string[];
    hrSettings: any;
    onRowChange: (index: number, type: 'Earning' | 'Deduction', field: string, value: any) => void;
    onRowRemove: (index: number, type: 'Earning' | 'Deduction') => void;
    hasError: boolean;
}) => (
    <TableRow
        sx={{
            '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02) },
            borderBottom: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.1)}`
        }}
    >
        <TableCell sx={{ py: 1 }}>
            <Autocomplete
                fullWidth
                size="small"
                options={componentOptions}
                value={row.component_name || ''}
                onChange={(e, newValue) => onRowChange(index, type, 'component_name', newValue || '')}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        variant="standard"
                        placeholder="Select Component"
                        error={!row.component_name && hasError}
                        InputProps={{
                            ...params.InputProps,
                            disableUnderline: true,
                            sx: {
                                typography: 'body2',
                                fontWeight: 500,
                                color: !row.component_name ? 'error.main' : 'inherit'
                            }
                        }}
                    />
                )}
            />
        </TableCell>
        <TableCell align="right" sx={{ py: 1, px: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: 140 }}>
                    <Typography
                        variant="body2"
                        sx={{
                            color: 'text.primary',
                            fontWeight: 600,
                            fontFamily: "Arial, 'sans-serif'",
                            mr: 0.5
                        }}
                    >
                        {hrSettings.currency_symbol}
                    </Typography>
                    <TextField
                        size="small"
                        type="number"
                        variant="standard"
                        value={row.amount || ''}
                        placeholder="0"
                        onChange={(e) => onRowChange(index, type, 'amount', parseFloat(e.target.value) || 0)}
                        inputProps={{ sx: { textAlign: 'right', typography: 'body2', fontWeight: 600, p: 0, width: 110 } }}
                        InputProps={{ disableUnderline: true }}
                    />
                </Stack>
            </Box>
        </TableCell>
        <TableCell align="center" sx={{ py: 1 }}>
            <IconButton
                size="small"
                onClick={() => onRowRemove(index, type)}
                sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
            >
                <Iconify icon="solar:trash-bin-trash-bold" width={18} />
            </IconButton>
        </TableCell>
    </TableRow>
));

SalaryRow.displayName = 'SalaryRow';

// ----------------------------------------------------------------------

export function EmployeeView() {
    const router = useRouter();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [orderBy, setOrderBy] = useState('modified');
    const [selected, setSelected] = useState<string[]>([]);

    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.employee;
    const canCreateEmployee = hasCustomPerms && user?.permissions?.actions?.employee ? !!user?.permissions?.actions?.employee?.create : true;

    // Department Create Dialog State
    const [openDepartmentCreate, setOpenDepartmentCreate] = useState(false);
    const [departmentSearch, setDepartmentSearch] = useState('');

    // Blood Group Create Dialog State
    const [openBloodGroupCreate, setOpenBloodGroupCreate] = useState(false);
    const [bloodGroupSearch, setBloodGroupSearch] = useState('');

    // Qualification Create Dialog State
    const [openQualificationCreate, setOpenQualificationCreate] = useState(false);
    const [qualificationSearch, setQualificationSearch] = useState('');

    // Designation Create Dialog State
    const [openDesignationCreate, setOpenDesignationCreate] = useState(false);
    const [designationSearch, setDesignationSearch] = useState('');

    // Line Order Create Dialog State
    const [openLineOrderCreate, setOpenLineOrderCreate] = useState(false);
    const [lineOrderSearch, setLineOrderSearch] = useState('');

    // Shift Create Dialog State
    const [openShiftCreate, setOpenShiftCreate] = useState(false);
    const [shiftSearch, setShiftSearch] = useState('');

    // Bus Route Create Dialog State
    const [openBusRouteCreate, setOpenBusRouteCreate] = useState(false);
    const [busRouteSearch, setBusRouteSearch] = useState('');

    // Employee Type Create Dialog State
    const [openEmployeeTypeCreate, setOpenEmployeeTypeCreate] = useState(false);
    const [employeeTypeSearch, setEmployeeTypeSearch] = useState('');

    // Bank Account Create Dialog State
    const [openBankAccountCreate, setOpenBankAccountCreate] = useState(false);

    const [openCreate, setOpenCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
    const [openDetails, setOpenDetails] = useState(false);
    const [detailsId, setDetailsId] = useState<string | null>(null);

    // Filter State
    const [filters, setFilters] = useState({
        department: 'all',
        designation: 'all',
        status: 'all',
        country: '',
        state: '',
        city: '',
    });
    const [openFilters, setOpenFilters] = useState(false);

    // Hybrid Form state
    const [fieldMap, setFieldMap] = useState<Record<string, any>>({});
    const [formData, setFormData] = useState<Record<string, any>>({
        status: 'Active',
        ctc: 0,
        skip_probation: 0,
        country: 'India',
    });
    const [fieldOptions, setFieldOptions] = useState<Record<string, any[]>>({});
    const [stateOptions, setStateOptions] = useState<string[]>([]);
    const [cityOptions, setCityOptions] = useState<string[]>([]);
    const [salaryComponents, setSalaryComponents] = useState<any[]>([]);
    const [serverAlert, setServerAlert] = useState<{ message: string, severity: 'success' | 'error' | 'warning' | 'info' }>({
        message: '',
        severity: 'info'
    });

    const [busRoutePoints, setBusRoutePoints] = useState<any[]>([]);
    const [loadingRoutePoints, setLoadingRoutePoints] = useState(false);

    const loadBusRoutePoints = useCallback(async (routeName: string) => {
        if (!routeName) {
            setBusRoutePoints([]);
            return;
        }
        try {
            setLoadingRoutePoints(true);
            const routeDoc = await getBusTravelRoute(routeName);
            setBusRoutePoints(routeDoc?.points || []);
        } catch (err) {
            console.error('Failed to load bus route points:', err);
            setBusRoutePoints([]);
        } finally {
            setLoadingRoutePoints(false);
        }
    }, []);


    const [hrSettings, setHRSettings] = useState<{ default_currency: string; currency_symbol: string; default_locale: string }>({
        default_currency: 'INR',
        currency_symbol: '₹',
        default_locale: 'en-IN'
    });

    // Alert & Dialog State
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
        open: false,
        message: '',
        severity: 'success',
    });
    const [uploading, setUploading] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [currentTab, setCurrentTab] = useState(0);

    // Permissions State
    const [permissions, setPermissions] = useState<{ read: boolean; write: boolean; delete: boolean }>({
        read: true,
        write: true,
        delete: true,
    });

    const { data, total, loading, refetch } = useEmployees(
        page + 1,
        rowsPerPage,
        filterName,
        orderBy,
        order,
        filters.department,
        filters.designation,
        filters.status,
        filters.country,
        filters.state,
        filters.city
    );

    const notFound = !data.length && !!filterName;
    const empty = !data.length && !filterName && !loading;

    useEffect(() => {
        getHRPermissions('Employee').then(setPermissions);
        getHRSettings().then(setHRSettings);
        fetchSalaryComponents().then(setSalaryComponents);

        getDocTypeMetadata('Employee').then((meta) => {
            // Create a lookup map for fields and pre-compile visibility functions
            const map: Record<string, any> = {};
            meta.fields.forEach((f: any) => {
                const field = { ...f };
                if (field.depends_on) {
                    let expr = field.depends_on;
                    if (expr.startsWith('eval:')) expr = expr.replace('eval:', '');
                    expr = expr.replace(/doc\./g, 'formData.');

                    try {
                        field._visibility_fn = new Function('formData', `try { return ${expr}; } catch(e) { return true; }`);
                    } catch (e) {
                        console.error(`Failed to compile depends_on for ${field.fieldname}`, e);
                        field._visibility_fn = () => true;
                    }
                }
                map[f.fieldname] = field;
            });
            setFieldMap(map);

            // Fetch Link options
            meta.fields.forEach((field: any) => {
                if (field.fieldtype === 'Link' && field.options) {
                    getDoctypeList(field.options, ['name'])
                        .then((options) => {
                            setFieldOptions(prev => ({ ...prev, [field.fieldname]: options }));
                        })
                        .catch(console.error);
                }
            });

            // Explicitly fetch rich options for bank_account
            getDoctypeList('Bank Account', ['name', 'bank_account_name', 'account_number'])
                .then((options) => {
                    setFieldOptions(prev => ({ ...prev, 'bank_account': options }));
                })
                .catch(console.error);

            // Explicitly fetch options for blood_group
            getDoctypeList('Blood Group', ['name', 'blood_group'])
                .then((options) => {
                    setFieldOptions(prev => ({ ...prev, 'blood_group': options }));
                })
                .catch(console.error);

            // Explicitly fetch options for qualification
            getDoctypeList('Qualification', ['name', 'qualification'])
                .then((options) => {
                    setFieldOptions(prev => ({ ...prev, 'qualification': options }));
                })
                .catch(console.error);

            // Explicitly fetch options for designation
            getDoctypeList('Designation', ['name', 'designation_name'])
                .then((options) => {
                    setFieldOptions(prev => ({ ...prev, 'designation': options }));
                })
                .catch(console.error);

            // Explicitly fetch options for line_order
            getDoctypeList('Line Order', ['name', 'line_name'])
                .then((options) => {
                    setFieldOptions(prev => ({ ...prev, 'line_order': options }));
                })
                .catch(console.error);

            // Explicitly fetch options for shift
            getDoctypeList('Shift', ['name', 'shift_name'])
                .then((options) => {
                    setFieldOptions(prev => ({ ...prev, 'shift': options }));
                })
                .catch(console.error);

            // Explicitly fetch options for bus_travel_route
            getDoctypeList('Bus Travel Route', ['name', 'route_name'])
                .then((options) => {
                    setFieldOptions(prev => ({ ...prev, 'bus_travel_route': options }));
                })
                .catch(console.error);

            // Explicitly fetch options for employee_type
            getDoctypeList('Employee Type', ['name', 'employee_type', 'category_type'])
                .then((options) => {
                    setFieldOptions(prev => ({ ...prev, 'employee_type': options }));
                })
                .catch(console.error);
        }).catch(console.error);
    }, []);

    // Memoized component lists to avoid filtering during render
    const earningComponents = useMemo(() =>
        salaryComponents.filter(c => c.type === 'Earning').map(c => c.component_name),
        [salaryComponents]);

    const deductionComponents = useMemo(() =>
        salaryComponents.filter(c => c.type === 'Deduction').map(c => c.component_name),
        [salaryComponents]);

    // Memoized totals calculation
    const totals = useMemo(() => {
        const earnings = formData.earnings || [];
        const deductions = formData.deductions || [];

        const total_earnings = earnings.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0);
        const total_deductions = deductions.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0);

        return {
            total_earnings,
            total_deductions,
            net_salary: total_earnings - total_deductions
        };
    }, [formData.earnings, formData.deductions]);


    // Integrated into handleInputChange for performance and consistency

    const cleanPhoneNumber = (val: string) => {
        if (!val) return '';
        if (val.startsWith('+') && val.includes('-')) {
            return val.replace('-', ' ');
        }
        return val;
    };

    const formatPhoneNumberCustom = (val: string) => {
        if (!val) return '';
        let formatted = val.replace(/\s/g, '');
        const parts = val.trim().split(/\s+/);
        if (parts.length > 1 && parts[0].startsWith('+')) {
            formatted = `${parts[0]}-${parts.slice(1).join('')}`;
        }
        return formatted;
    };

    const handleInputChange = async (fieldname: string, value: any) => {
        let finalValue = value;
        if (fieldname === 'phone' || fieldname === 'office_phone_number') {
            finalValue = formatPhoneNumberCustom(value);
        }

        if (fieldname === 'bus_travel_route') {
            setFormData(prev => ({
                ...prev,
                bus_travel_route: finalValue,
                bus_route_point: ''
            }));
            if (finalValue) {
                loadBusRoutePoints(finalValue);
            } else {
                setBusRoutePoints([]);
            }
            return;
        }

        setFormData(prev => {
            const next = { ...prev, [fieldname]: finalValue };
            if (fieldname === 'status' && finalValue === 'Active') {
                next.date_of_leaving = '';
            }
            return next;
        });

        // Clear error when typing
        if (formErrors[fieldname]) {
            setFormErrors(prev => ({ ...prev, [fieldname]: '' }));
        }

        // Handle country change - fetch states
        if (fieldname === 'country' && finalValue) {
            const states = await getStates(finalValue);
            setStateOptions(['', ...states, 'Others']);
            // Reset state and city when country changes
            setFormData(prev => ({ ...prev, state: '', city: '' }));
            setCityOptions([]);
        }

        // Handle state change - fetch cities
        if (fieldname === 'state' && finalValue && formData.country) {
            if (finalValue === 'Others') {
                setCityOptions(['Others']);
            } else {
                const cities = await getCities(formData.country, finalValue);
                setCityOptions(['', ...cities, 'Others']);
            }
            // Reset city when state changes
            setFormData(prev => ({ ...prev, city: '' }));
        }
    };

    const handleCTCOnBlur = async () => {
        const ctcValue = parseFloat(formData.ctc) || 0;
        if (ctcValue <= 0) return;

        try {
            const components = salaryComponents; // Use pre-fetched components

            const earnings: any[] = [];
            const deductions: any[] = [];

            components.forEach((comp: any) => {
                let val = 0;
                const percent = parseFloat(comp.percentage) || 0;
                if (percent > 0) {
                    val = (ctcValue * percent) / 100;
                } else {
                    val = parseFloat(comp.static_amount) || 0;
                }

                const row = {
                    component_name: comp.component_name,
                    amount: val,
                    type: comp.type
                };

                if (comp.type === 'Earning') {
                    earnings.push(row);
                } else {
                    deductions.push(row);
                }
            });

            setFormData(prev => ({
                ...prev,
                earnings,
                deductions,
                total_earnings: earnings.reduce((sum, item) => sum + item.amount, 0),
                total_deductions: deductions.reduce((sum, item) => sum + item.amount, 0),
                net_salary: earnings.reduce((sum, item) => sum + item.amount, 0) - deductions.reduce((sum, item) => sum + item.amount, 0)
            }));
        } catch (error) {
            console.error('Failed to fetch salary components on blur:', error);
        }
    };

    const handleAddSalaryRow = (type: 'Earning' | 'Deduction') => {
        const field = type === 'Earning' ? 'earnings' : 'deductions';
        const newRow = { component_name: '', amount: 0, type };

        setFormData(prev => {
            const currentRows = prev[field] || [];
            return {
                ...prev,
                [field]: [...currentRows, newRow]
            };
        });
    };

    const handleRemoveSalaryRow = (index: number, type: 'Earning' | 'Deduction') => {
        const field = type === 'Earning' ? 'earnings' : 'deductions';
        setFormData(prev => {
            const currentRows = [...(prev[field] || [])];
            currentRows.splice(index, 1);
            return {
                ...prev,
                [field]: currentRows
            };
        });
    };

    const handleSalaryRowChange = useCallback((index: number, type: 'Earning' | 'Deduction', field: string, value: any) => {
        const dataField = type === 'Earning' ? 'earnings' : 'deductions';
        setFormData(prev => {
            const currentRows = [...(prev[dataField] || [])];
            currentRows[index] = { ...currentRows[index], [field]: value };
            return {
                ...prev,
                [dataField]: currentRows
            };
        });

        // Clear component error when typing
        if (formErrors.salary_components) {
            setFormErrors(prev => ({ ...prev, salary_components: '' }));
        }
    }, [formErrors.salary_components]);


    const handleDefaultSplitting = async () => {
        const ctcValue = parseFloat(formData.ctc) || 0;
        if (ctcValue <= 0) {
            setSnackbar({ open: true, message: 'Please enter a valid CTC amount first', severity: 'warning' });
            return;
        }

        try {
            const defaults = salaryComponents.filter(comp => comp.is_default);

            if (defaults.length === 0) {
                setSnackbar({ open: true, message: 'No default salary components found. Please configure them in Masters.', severity: 'warning' });
                return;
            }

            const totalEarningPercent = defaults
                .filter(comp => comp.type === 'Earning')
                .reduce((sum, comp) => sum + (parseFloat(comp.percentage) || 0), 0);

            if (totalEarningPercent !== 100) {
                setSnackbar({
                    open: true,
                    message: `Invalid configuration: Total Default Earning percentage must be exactly 100%. (Current total: ${totalEarningPercent.toFixed(2)}%)`,
                    severity: 'error'
                });
                return;
            }

            const earnings: any[] = [];
            const deductions: any[] = [];

            defaults.forEach((comp: any) => {
                let val = 0;
                const percent = parseFloat(comp.percentage) || 0;
                if (percent > 0) {
                    val = (ctcValue * percent) / 100;
                } else {
                    val = parseFloat(comp.static_amount) || 0;
                }

                const row = {
                    component_name: comp.component_name,
                    amount: val,
                    type: comp.type
                };

                if (comp.type === 'Earning') {
                    earnings.push(row);
                } else {
                    deductions.push(row);
                }
            });

            setFormData(prev => ({
                ...prev,
                earnings,
                deductions
            }));

            setSnackbar({ open: true, message: 'Default splitting applied successfully', severity: 'success' });
        } catch (error) {
            console.error('Failed to apply default splitting:', error);
            setSnackbar({ open: true, message: 'Failed to apply splitting', severity: 'error' });
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, fieldname: string) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const uploaded = await uploadFile(file, 'Employee', currentEmployeeId || 'new', fieldname);
            handleInputChange(fieldname, uploaded.file_url);
            setSnackbar({ open: true, message: 'Image uploaded successfully', severity: 'success' });
            if (formErrors[fieldname]) {
                setFormErrors(prev => ({ ...prev, [fieldname]: '' }));
            }
        } catch (error: any) {
            console.error('Upload failed:', error);
            setSnackbar({ open: true, message: error.message || 'Upload failed', severity: 'error' });
        } finally {
            setUploading(false);
        }
    };
    const handleOpenCreate = async () => {
        setFormData({ status: 'Active', ctc: 0, skip_probation: 0, country: 'India', documents: [] });
        setBusRoutePoints([]);
        setFormErrors({});
        setOpenCreate(true);
        setCurrentTab(0);

        // Load states for India by default
        const states = await getStates('India');
        setStateOptions(['', ...states, 'Others']);
    };

    const handleCloseCreate = () => {
        setOpenCreate(false);
        setFormErrors({});
        setCurrentEmployeeId(null);
        setFormData({ status: 'Active', ctc: 0, skip_probation: 0, country: 'India', documents: [] });
        setBusRoutePoints([]);
        setServerAlert({ message: '', severity: 'info' });
        setStateOptions([]);
        setCityOptions([]);
        setCurrentTab(0);
    };


    const handleOpenDetails = (id: string) => {
        router.push(`/employee/${id}/view`);
    };

    const handleCloseDetails = () => {
        setOpenDetails(false);
        setDetailsId(null);
    };

    const handleCloseSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    const handleDeleteClick = (id: string) => {
        setConfirmDelete({ open: true, id });
    };

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        try {
            await deleteEmployee(confirmDelete.id);
            setSnackbar({ open: true, message: 'Employee deleted successfully', severity: 'success' });
            await refetch();
        } catch (e) {
            console.error(e);
            setSnackbar({ open: true, message: 'Failed to delete employee', severity: 'error' });
        } finally {
            setConfirmDelete({ open: false, id: null });
        }
    };



    const handleSelectAllRows = (checked: boolean) => {
        if (checked) {
            const newSelected = data.map((n) => n.name);
            setSelected(newSelected);
            return;
        }
        setSelected([]);
    };

    const handleSelectRow = (id: string) => {
        const selectedIndex = selected.indexOf(id);
        let newSelected: string[] = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1)
            );
        }
        setSelected(newSelected);
    };

    const handleFilters = (update: any) => {
        setFilters((prev) => ({ ...prev, ...update }));
        setPage(0);
    };

    const handleResetFilters = () => {
        setFilters({
            department: 'all',
            designation: 'all',
            status: 'all',
            country: '',
            state: '',
            city: '',
        });
    };

    const canReset = !!filterName || filters.department !== 'all' || filters.designation !== 'all' || filters.status !== 'all' || filters.country !== '' || filters.state !== '' || filters.city !== '';

    const handleBulkDelete = async () => {
        try {
            await Promise.all(selected.map((id) => deleteEmployee(id)));
            setSnackbar({ open: true, message: `${selected.length} employees deleted successfully`, severity: 'success' });
            setSelected([]);
            await refetch();
        } catch (e: any) {
            setSnackbar({ open: true, message: e.message || 'Error during bulk delete', severity: 'error' });
        }
    };

    const validateForm = (): { isValid: boolean; firstErrorField?: string; firstErrorMessage?: string; errorTab?: number } => {
        const errors: Record<string, string> = {};
        let errorTab = 0;

        const requiredFields = [
            { name: 'employee_id', label: 'Employee ID' },
            { name: 'employee_name', label: 'Employee Name' },
            { name: 'email', label: 'Email' },
            { name: 'date_of_joining', label: 'Joining Date' },
            { name: 'status', label: 'Status' }
        ];

        requiredFields.forEach(field => {
            const value = formData[field.name];
            if (!value) {
                errors[field.name] = `${field.label} is required`;
            }
        });

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Invalid email format';
        }

        if (formData.personal_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personal_email)) {
            errors.personal_email = 'Invalid email format';
        }

        if (formData.status === 'Inactive' && formData.date_of_leaving && formData.date_of_joining) {
            if (new Date(formData.date_of_leaving) < new Date(formData.date_of_joining)) {
                errors.date_of_leaving = 'Date of Leaving cannot be before Joining Date';
            }
        }

        // Check if any error in Tab 0
        if (Object.keys(errors).length > 0) {
            errorTab = 0;
        }

        // Salary Table Validation (Tab 1)
        const incompleteEarnings = (formData.earnings || []).some((row: any) => !row.component_name);
        const incompleteDeductions = (formData.deductions || []).some((row: any) => !row.component_name);

        if (incompleteEarnings || incompleteDeductions) {
            if (Object.keys(errors).length === 0) errorTab = 1;
            errors.salary_components = 'Please select a Component Name for all salary rows';
        }

        // Document Table Validation (Tab 2)
        const documents = formData.documents || [];
        for (let i = 0; i < documents.length; i++) {
            const doc = documents[i];
            if (!doc.title || (!doc.attachment && !doc.pendingFile)) {
                if (Object.keys(errors).length === 0) errorTab = 2;
                errors.documents = `Please complete Title and Attachment for all document rows (Row ${i + 1})`;
                break;
            }
        }

        setFormErrors(errors);

        const isValid = Object.keys(errors).length === 0;
        const firstErrorField = Object.keys(errors)[0];
        const firstErrorMessage = errors[firstErrorField];

        return { isValid, firstErrorField, firstErrorMessage, errorTab };
    };

    const handleCreate = async () => {
        const validationResult = validateForm();
        if (!validationResult.isValid) {
            // Switch to the tab containing the error
            if (validationResult.errorTab !== undefined) {
                setCurrentTab(validationResult.errorTab);
            }

            // Scroll to the first error field (if on current tab)
            setTimeout(() => {
                if (validationResult.firstErrorField) {
                    const errorElement = document.querySelector(`[name="${validationResult.firstErrorField}"]`);
                    if (errorElement) {
                        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        (errorElement as HTMLElement).focus();
                    }
                }
            }, 300);

            const errorMessage = validationResult.firstErrorMessage || 'Please correct the errors in the form';
            setSnackbar({ open: true, message: errorMessage, severity: 'error' });
            return;
        }

        try {
            setCreating(true);
            setServerAlert({ message: '', severity: 'info' });

            const dataToSave: any = { ...formData, ...totals };
            if (dataToSave.employee_name) dataToSave.employee_name = dataToSave.employee_name.trim();
            if (dataToSave.employee_id) dataToSave.employee_id = dataToSave.employee_id.trim();
            if (dataToSave.email) dataToSave.email = dataToSave.email.trim();

            // Handle pending document uploads
            const documents = [...(dataToSave.documents || [])];

            for (let i = 0; i < documents.length; i++) {
                if (documents[i].pendingFile) {
                    try {
                        const uploaded = await uploadFile(
                            documents[i].pendingFile,
                            'Employee',
                            currentEmployeeId || 'new',
                            'documents'
                        );
                        documents[i].attachment = uploaded.file_url;
                        delete documents[i].pendingFile;
                    } catch (uploadErr: any) {
                        console.error('File upload failed for row', i, uploadErr);
                        throw new Error(`Failed to upload ${documents[i].title || 'document'}: ${uploadErr.message}`);
                    }
                }
            }

            dataToSave.documents = documents;

            if (currentEmployeeId) {
                console.log("Saving Employee", dataToSave);
                await updateEmployee(currentEmployeeId, dataToSave as any);
                handleCloseCreate();
                setSnackbar({ open: true, message: 'Employee updated successfully', severity: 'success' });
            } else {
                await createEmployee(dataToSave as any);
                handleCloseCreate();
                setSnackbar({ open: true, message: 'Employee created successfully', severity: 'success' });
            }
            await refetch();

        } catch (err: any) {
            console.error(err);
            const msg = err.message || 'Error saving employee';
            if (msg.toLowerCase().includes('employee_id') || msg.toLowerCase().includes('employee id') || msg.toLowerCase().includes('duplicate entry')) {
                setCurrentTab(0);
                setFormErrors(prev => ({ ...prev, employee_id: 'This Employee ID already exists' }));
            }
            setServerAlert({ message: msg, severity: 'error' });
        } finally {
            setCreating(false);
        }
    };

    const handleEditRow = async (id: string) => {
        try {
            setCurrentEmployeeId(id);
            const fullDoc = await getEmployee(id);
            if (fullDoc) {
                const cleanedRow = { ...fullDoc };
                if (cleanedRow.phone) cleanedRow.phone = cleanPhoneNumber(cleanedRow.phone);
                if (cleanedRow.office_phone_number) cleanedRow.office_phone_number = cleanPhoneNumber(cleanedRow.office_phone_number);
                setFormData(cleanedRow);

                if (cleanedRow.bus_travel_route) {
                    loadBusRoutePoints(cleanedRow.bus_travel_route);
                } else {
                    setBusRoutePoints([]);
                }

                // Fetch states if country exists
                if (cleanedRow.country) {
                    const states = await getStates(cleanedRow.country);
                    setStateOptions(['', ...states, 'Others']);
                    if (cleanedRow.state) {
                        const cities = await getCities(cleanedRow.country, cleanedRow.state);
                        setCityOptions(['', ...cities, 'Others']);
                    }
                }
            }
            setOpenCreate(true);
        } catch (error) {
            console.error('Failed to load employee details:', error);
            setSnackbar({ open: true, message: 'Failed to load employee details', severity: 'error' });
        }
    };




    const onChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const onChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const evaluateVisibility = (fieldname: string) => {
        const field = fieldMap[fieldname];
        if (!field) return true;
        if (field.hidden) return false;
        if (!field._visibility_fn) return true;

        return field._visibility_fn(formData);
    };

    const formatPointDisplayTime = (timeStr?: string) => {
        if (!timeStr) return '';
        const norm = timeStr.includes(':') && timeStr.split(':')[0].length === 1 ? `0${timeStr}` : timeStr;
        const parsed = dayjs(`2000-01-01T${norm.length === 5 ? `${norm}:00` : norm}`);
        return parsed.isValid() ? parsed.format('hh:mm A') : timeStr;
    };

    const renderField = (fieldname: string, label: string, type: string = 'text', options: any[] = [], extraProps: any = {}, required: boolean = false) => {
        if (!evaluateVisibility(fieldname)) return null;

        const defaultPlaceholder = (type === 'select' || type === 'link')
            ? `Select ${label}`
            : `Enter ${label}`;

        const commonProps = {
            fullWidth: true,
            label,
            placeholder: extraProps.placeholder !== undefined ? extraProps.placeholder : defaultPlaceholder,
            name: fieldname, // Add name attribute for scroll-to-error functionality
            value: formData[fieldname] || '',
            onChange: (e: any) => handleInputChange(fieldname, e.target.value),
            InputLabelProps: { shrink: true },
            required,
            error: !!formErrors[fieldname],
            helperText: formErrors[fieldname],
            ...extraProps,
            InputProps: {
                ...extraProps.InputProps,
            },
            sx: {
                '& .MuiFormLabel-asterisk': {
                    color: 'red',
                },
                ...extraProps.sx
            }
        };

        if (type === 'phone') {
            return (
                <MuiTelInput
                    {...commonProps}
                    defaultCountry="IN"
                    value={cleanPhoneNumber(formData[fieldname] || '')}
                    onChange={(newValue: string) => handleInputChange(fieldname, newValue)}
                />
            );
        }



        if (fieldname === 'bank_account') {
            const selectedAccount = options.find((opt: any) => {
                const optVal = typeof opt === 'string' ? opt : opt?.name;
                return optVal === formData[fieldname];
            });

            return (
                <Autocomplete
                    fullWidth
                    options={options}
                    value={selectedAccount || formData[fieldname] || null}
                    onChange={(event, newValue: any) => {
                        if (newValue?.isNew || newValue === 'Create Bank Account' || newValue?.name === 'Create Bank Account' || newValue?.bank_account_name === 'Create Bank Account') {
                            setOpenBankAccountCreate(true);
                        } else {
                            const value = typeof newValue === 'object' && newValue?.name ? newValue.name : newValue;
                            handleInputChange(fieldname, value || '');
                        }
                    }}
                    getOptionLabel={(option: any) => {
                        if (typeof option === 'string') return option;
                        if (option?.bank_account_name && option?.account_number) {
                            return `${option.bank_account_name} (${option.account_number})`;
                        }
                        if (option?.bank_account_name) return option.bank_account_name;
                        if (option?.name) return option.name;
                        return '';
                    }}
                    filterOptions={(listOptions, params) => {
                        const { inputValue } = params;
                        const filtered = listOptions.filter((option: any) => {
                            const searchStr = (typeof option === 'string'
                                ? option
                                : `${option.bank_account_name || ''} ${option.account_number || ''} ${option.name || ''}`
                            ).toLowerCase();
                            return searchStr.includes(inputValue.toLowerCase());
                        });

                        const hasCreateOption = filtered.some((option: any) =>
                            (typeof option === 'string' ? option : (option.bank_account_name || option.name)) === 'Create Bank Account' || option.isNew
                        );
                        if (!hasCreateOption) {
                            filtered.push({
                                inputValue: inputValue || '',
                                name: 'Create Bank Account',
                                bank_account_name: 'Create Bank Account',
                                isNew: true,
                            });
                        }
                        return filtered;
                    }}
                    renderOption={(props, option: any) => (
                        <Box
                            component="li"
                            {...props}
                            sx={{
                                py: '6px !important',
                                ...(option.isNew && {
                                    color: 'primary.main',
                                    fontWeight: 600,
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                    borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                    mt: 0.5,
                                    py: 3,
                                    minHeight: '56px',
                                    '&:hover': {
                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                    }
                                })
                            }}
                        >
                            {option.isNew ? (
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Iconify icon={"solar:add-circle-bold" as any} width={18} />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Create Bank Account</Typography>
                                </Stack>
                            ) : (
                                <Stack spacing={0.5}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                        {typeof option === 'string' ? option : (option.bank_account_name || option.name)}
                                    </Typography>
                                    {typeof option === 'object' && option.account_number && (
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                            Account: {option.account_number}
                                        </Typography>
                                    )}
                                </Stack>
                            )}
                        </Box>
                    )}
                    isOptionEqualToValue={(option: any, value: any) => {
                        const optionValue = typeof option === 'string' ? option : option?.name;
                        const testValue = typeof value === 'string' ? value : value?.name;
                        return optionValue === testValue;
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={label}
                            placeholder={`Select ${label}`}
                            required={required}
                            error={!!formErrors[fieldname]}
                            helperText={formErrors[fieldname]}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                '& .MuiFormLabel-asterisk': {
                                    color: 'red',
                                },
                                ...extraProps.sx
                            }}
                        />
                    )}
                />
            );
        }

        if (fieldname === 'bus_route_point') {
            const selectedPoint = busRoutePoints.find((p: any) => {
                const pName = typeof p === 'string' ? p : p?.point_name;
                const pId = typeof p === 'object' ? p?.name : '';
                return pName === formData[fieldname] || pId === formData[fieldname];
            });

            return (
                <Autocomplete
                    fullWidth
                    options={busRoutePoints}
                    value={selectedPoint || (formData[fieldname] ? { point_name: formData[fieldname] } : null)}
                    disabled={!formData.bus_travel_route || loadingRoutePoints}
                    onChange={(event, newValue: any) => {
                        const val = typeof newValue === 'object' && newValue ? (newValue.point_name || newValue.name || '') : (newValue || '');
                        handleInputChange(fieldname, val);
                    }}
                    getOptionLabel={(option: any) => {
                        if (typeof option === 'string') return option;
                        if (option?.point_name) return option.point_name;
                        return option?.name || '';
                    }}
                    isOptionEqualToValue={(option: any, value: any) => {
                        const optVal = typeof option === 'string' ? option : (option?.point_name || option?.name);
                        const currentVal = typeof value === 'string' ? value : (value?.point_name || value?.name);
                        return optVal === currentVal || option?.name === currentVal || option?.point_name === currentVal;
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={label}
                            placeholder={!formData.bus_travel_route ? "Select Bus Route first" : (loadingRoutePoints ? "Loading points..." : `Select ${label}`)}
                            required={required}
                            error={!!formErrors[fieldname]}
                            helperText={formErrors[fieldname]}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                '& .MuiFormLabel-asterisk': { color: 'red' },
                                ...extraProps.sx
                            }}
                        />
                    )}
                    renderOption={(props, option: any) => {
                        const name = typeof option === 'string' ? option : (option?.point_name || option?.name || '');
                        const pickup = typeof option === 'object' && option?.pickup_time ? formatPointDisplayTime(option.pickup_time) : null;
                        const drop = typeof option === 'object' && option?.drop_time ? formatPointDisplayTime(option.drop_time) : null;
                        return (
                            <Box component="li" {...props} key={option?.name || name}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', py: 0.5 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {name}
                                    </Typography>
                                    {(pickup || drop) && (
                                        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.25 }}>
                                            {pickup ? `Pickup: ${pickup}` : ''}{pickup && drop ? ' • ' : ''}{drop ? `Drop: ${drop}` : ''}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        );
                    }}
                />
            );
        }

        if (type === 'autocomplete') {
            // Determine if field should be disabled based on dependencies
            let disabled = false;
            let placeholder = `Select ${label}`;

            if (fieldname === 'state' && !formData.country) {
                disabled = true;
                placeholder = 'Please select Country first';
            } else if (fieldname === 'city' && !formData.state) {
                disabled = true;
                placeholder = 'Please select State first';
            }

            return (
                <Autocomplete
                    fullWidth
                    options={options}
                    value={formData[fieldname] || ''}
                    onChange={(event, newValue: any) => {
                        // Handle both string values and objects with point_name or name property
                        const value = typeof newValue === 'object' && newValue ? (newValue.point_name || newValue.name || '') : (newValue || '');
                        handleInputChange(fieldname, value || '');
                    }}
                    getOptionLabel={(option) => {
                        // Handle both string options and objects with point_name or name property
                        if (typeof option === 'string') return option;
                        if (option?.point_name) return option.point_name;
                        if (option?.name) return option.name;
                        return '';
                    }}
                    isOptionEqualToValue={(option, value) => {
                        // Handle comparison for both strings and objects
                        const optionValue = typeof option === 'string' ? option : (option?.point_name || option?.name);
                        return optionValue === value;
                    }}
                    disabled={disabled}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={label}
                            placeholder={placeholder}
                            required={required}
                            error={!!formErrors[fieldname]}
                            helperText={formErrors[fieldname]}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                '& .MuiFormLabel-asterisk': {
                                    color: 'red',
                                },
                                ...extraProps.sx
                            }}
                        />
                    )}
                    freeSolo
                />
            );
        }

        if (fieldname === 'department') {
            return (
                <Autocomplete
                    fullWidth
                    options={options}
                    value={formData[fieldname] || ''}
                    onChange={(event, newValue: any) => {
                        if (newValue?.isNew || newValue === 'Create Department' || newValue?.name === 'Create Department') {
                            setOpenDepartmentCreate(true);
                            setDepartmentSearch(newValue?.inputValue || '');
                        } else {
                            const value = typeof newValue === 'object' && newValue?.name ? newValue.name : newValue;
                            handleInputChange(fieldname, value || '');
                        }
                    }}
                    filterOptions={(currentOptions, params) => {
                        const filtered = filter(currentOptions, params);
                        const { inputValue } = params;
                        const hasCreateOption = filtered.some((option: any) =>
                            (typeof option === 'string' ? option : option.name) === 'Create Department' || option.isNew
                        );
                        if (!hasCreateOption) {
                            filtered.push({
                                inputValue: inputValue || '',
                                name: 'Create Department',
                                isNew: true,
                            });
                        }
                        return filtered;
                    }}
                    renderOption={(props, option) => (
                        <Box component="li" {...props} sx={{
                            typography: 'body2',
                            ...(option.isNew && {
                                color: 'primary.main',
                                fontWeight: 600,
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                mt: 0.5,
                                py: 3, minHeight: '56px',
                                '&:hover': {
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                }
                            })
                        }}>
                            {option.isNew ? (
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Iconify icon={"solar:add-circle-bold" as any} width={18} />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Create Department</Typography>
                                </Stack>
                            ) : (
                                typeof option === 'string' ? option : option.name
                            )}
                        </Box>
                    )}
                    getOptionLabel={(option) => {
                        // Handle both string options and objects with name property
                        if (typeof option === 'string') return option;
                        if (option?.name) return option.name;
                        return '';
                    }}
                    isOptionEqualToValue={(option, value) => {
                        // Handle comparison for both strings and objects
                        const optionValue = typeof option === 'string' ? option : option?.name;
                        return optionValue === value;
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={label}
                            placeholder={`Select ${label}`}
                            required={required}
                            error={!!formErrors[fieldname]}
                            helperText={formErrors[fieldname]}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                '& .MuiFormLabel-asterisk': {
                                    color: 'red',
                                },
                                ...extraProps.sx
                            }}
                        />
                    )}
                    freeSolo
                    selectOnFocus
                    clearOnBlur
                    handleHomeEndKeys
                />
            );
        }

        if (fieldname === 'blood_group') {
            return (
                <Autocomplete
                    fullWidth
                    options={options}
                    value={formData[fieldname] || ''}
                    onChange={(event, newValue: any) => {
                        if (newValue?.isNew || newValue === 'Create Blood Group' || newValue?.name === 'Create Blood Group' || newValue?.blood_group === 'Create Blood Group') {
                            setOpenBloodGroupCreate(true);
                            setBloodGroupSearch(newValue?.inputValue || '');
                        } else {
                            const value = typeof newValue === 'object' ? (newValue.blood_group || newValue.name) : newValue;
                            handleInputChange(fieldname, value || '');
                        }
                    }}
                    filterOptions={(currentOptions, params) => {
                        const filtered = filter(currentOptions, params);
                        const { inputValue } = params;
                        const hasCreateOption = filtered.some((option: any) =>
                            (typeof option === 'string' ? option : (option.blood_group || option.name)) === 'Create Blood Group' || option.isNew
                        );
                        if (!hasCreateOption) {
                            filtered.push({
                                inputValue: inputValue || '',
                                name: 'Create Blood Group',
                                blood_group: 'Create Blood Group',
                                isNew: true,
                            });
                        }
                        return filtered;
                    }}
                    renderOption={(props, option: any) => (
                        <Box component="li" {...props} sx={{
                            typography: 'body2',
                            ...(option.isNew && {
                                color: 'primary.main',
                                fontWeight: 600,
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                mt: 0.5,
                                py: 3, minHeight: '56px',
                                '&:hover': {
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                }
                            })
                        }}>
                            {option.isNew ? (
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Iconify icon={"solar:add-circle-bold" as any} width={18} />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Create Blood Group</Typography>
                                </Stack>
                            ) : (
                                typeof option === 'string' ? option : (option.blood_group || option.name)
                            )}
                        </Box>
                    )}
                    getOptionLabel={(option: any) => {
                        if (typeof option === 'string') return option;
                        if (option?.blood_group) return option.blood_group;
                        if (option?.name) return option.name;
                        return '';
                    }}
                    isOptionEqualToValue={(option: any, value: any) => {
                        const optionValue = typeof option === 'string' ? option : (option.blood_group || option.name);
                        return optionValue === value || option?.name === value;
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={label}
                            placeholder={`Select ${label}`}
                            required={required}
                            error={!!formErrors[fieldname]}
                            helperText={formErrors[fieldname]}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                '& .MuiFormLabel-asterisk': {
                                    color: 'red',
                                },
                                ...extraProps.sx
                            }}
                        />
                    )}
                    freeSolo
                    selectOnFocus
                    clearOnBlur
                    handleHomeEndKeys
                />
            );
        }

        if (fieldname === 'qualification') {
            return (
                <Autocomplete
                    fullWidth
                    options={options}
                    value={formData[fieldname] || ''}
                    onChange={(event, newValue: any) => {
                        if (newValue?.isNew || newValue === 'Create Qualification' || newValue?.name === 'Create Qualification' || newValue?.qualification === 'Create Qualification') {
                            setOpenQualificationCreate(true);
                            setQualificationSearch(newValue?.inputValue || '');
                        } else {
                            const value = typeof newValue === 'object' ? (newValue.qualification || newValue.name) : newValue;
                            handleInputChange(fieldname, value || '');
                        }
                    }}
                    filterOptions={(currentOptions, params) => {
                        const filtered = filter(currentOptions, params);
                        const { inputValue } = params;
                        const hasCreateOption = filtered.some((option: any) =>
                            (typeof option === 'string' ? option : (option.qualification || option.name)) === 'Create Qualification' || option.isNew
                        );
                        if (!hasCreateOption) {
                            filtered.push({
                                inputValue: inputValue || '',
                                name: 'Create Qualification',
                                qualification: 'Create Qualification',
                                isNew: true,
                            });
                        }
                        return filtered;
                    }}
                    renderOption={(props, option: any) => (
                        <Box component="li" {...props} sx={{
                            typography: 'body2',
                            ...(option.isNew && {
                                color: 'primary.main',
                                fontWeight: 600,
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                mt: 0.5,
                                py: 3, minHeight: '56px',
                                '&:hover': {
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                }
                            })
                        }}>
                            {option.isNew ? (
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Iconify icon={"solar:add-circle-bold" as any} width={18} />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Create Qualification</Typography>
                                </Stack>
                            ) : (
                                typeof option === 'string' ? option : (option.qualification || option.name)
                            )}
                        </Box>
                    )}
                    getOptionLabel={(option: any) => {
                        if (typeof option === 'string') return option;
                        if (option?.qualification) return option.qualification;
                        if (option?.name) return option.name;
                        return '';
                    }}
                    isOptionEqualToValue={(option: any, value: any) => {
                        const optionValue = typeof option === 'string' ? option : (option.qualification || option.name);
                        return optionValue === value || option?.name === value;
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={label}
                            placeholder={`Select ${label}`}
                            required={required}
                            error={!!formErrors[fieldname]}
                            helperText={formErrors[fieldname]}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                '& .MuiFormLabel-asterisk': {
                                    color: 'red',
                                },
                                ...extraProps.sx
                            }}
                        />
                    )}
                    freeSolo
                    selectOnFocus
                    clearOnBlur
                    handleHomeEndKeys
                />
            );
        }

        if (fieldname === 'designation') {
            return (
                <Autocomplete
                    fullWidth
                    options={options}
                    value={formData[fieldname] || ''}
                    onChange={(event, newValue: any) => {
                        if (newValue?.isNew || newValue === 'Create Designation' || newValue?.name === 'Create Designation' || newValue?.designation_name === 'Create Designation') {
                            setOpenDesignationCreate(true);
                            setDesignationSearch(newValue?.inputValue || '');
                        } else {
                            const value = typeof newValue === 'object' ? (newValue.designation_name || newValue.name) : newValue;
                            handleInputChange(fieldname, value || '');
                        }
                    }}
                    filterOptions={(currentOptions, params) => {
                        const filtered = filter(currentOptions, params);
                        const { inputValue } = params;
                        const hasCreateOption = filtered.some((option: any) =>
                            (typeof option === 'string' ? option : (option.designation_name || option.name)) === 'Create Designation' || option.isNew
                        );
                        if (!hasCreateOption) {
                            filtered.push({
                                inputValue: inputValue || '',
                                name: 'Create Designation',
                                designation_name: 'Create Designation',
                                isNew: true,
                            });
                        }
                        return filtered;
                    }}
                    renderOption={(props, option: any) => (
                        <Box component="li" {...props} sx={{
                            typography: 'body2',
                            ...(option.isNew && {
                                color: 'primary.main',
                                fontWeight: 600,
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                mt: 0.5,
                                py: 3, minHeight: '56px',
                                '&:hover': {
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                }
                            })
                        }}>
                            {option.isNew ? (
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Iconify icon={"solar:add-circle-bold" as any} width={18} />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Create Designation</Typography>
                                </Stack>
                            ) : (
                                typeof option === 'string' ? option : (option.designation_name || option.name)
                            )}
                        </Box>
                    )}
                    getOptionLabel={(option: any) => {
                        if (typeof option === 'string') return option;
                        if (option?.designation_name) return option.designation_name;
                        if (option?.name) return option.name;
                        return '';
                    }}
                    isOptionEqualToValue={(option: any, value: any) => {
                        const optionValue = typeof option === 'string' ? option : (option.designation_name || option.name);
                        return optionValue === value || option?.name === value;
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={label}
                            placeholder={`Select ${label}`}
                            required={required}
                            error={!!formErrors[fieldname]}
                            helperText={formErrors[fieldname]}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                '& .MuiFormLabel-asterisk': {
                                    color: 'red',
                                },
                                ...extraProps.sx
                            }}
                        />
                    )}
                    freeSolo
                    selectOnFocus
                    clearOnBlur
                    handleHomeEndKeys
                />
            );
        }

        if (fieldname === 'line_order') {
            return (
                <Autocomplete
                    fullWidth
                    options={options}
                    value={formData[fieldname] || ''}
                    onChange={(event, newValue: any) => {
                        if (newValue?.isNew || newValue === 'Create Line Order' || newValue?.name === 'Create Line Order' || newValue?.line_name === 'Create Line Order') {
                            setOpenLineOrderCreate(true);
                            setLineOrderSearch(newValue?.inputValue || '');
                        } else {
                            const value = typeof newValue === 'object' ? (newValue.line_name || newValue.name) : newValue;
                            handleInputChange(fieldname, value || '');
                        }
                    }}
                    filterOptions={(currentOptions, params) => {
                        const filtered = filter(currentOptions, params);
                        const { inputValue } = params;
                        const hasCreateOption = filtered.some((option: any) =>
                            (typeof option === 'string' ? option : (option.line_name || option.name)) === 'Create Line Order' || option.isNew
                        );
                        if (!hasCreateOption) {
                            filtered.push({
                                inputValue: inputValue || '',
                                name: 'Create Line Order',
                                line_name: 'Create Line Order',
                                isNew: true,
                            });
                        }
                        return filtered;
                    }}
                    renderOption={(props, option: any) => (
                        <Box component="li" {...props} sx={{
                            typography: 'body2',
                            ...(option.isNew && {
                                color: 'primary.main',
                                fontWeight: 600,
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                mt: 0.5,
                                py: 3, minHeight: '56px',
                                '&:hover': {
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                }
                            })
                        }}>
                            {option.isNew ? (
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Iconify icon={"solar:add-circle-bold" as any} width={18} />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Create Line Order</Typography>
                                </Stack>
                            ) : (
                                typeof option === 'string' ? option : (option.line_name || option.name)
                            )}
                        </Box>
                    )}
                    getOptionLabel={(option: any) => {
                        if (typeof option === 'string') return option;
                        if (option?.line_name) return option.line_name;
                        if (option?.name) return option.name;
                        return '';
                    }}
                    isOptionEqualToValue={(option: any, value: any) => {
                        const optionValue = typeof option === 'string' ? option : (option.line_name || option.name);
                        return optionValue === value || option?.name === value;
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={label}
                            placeholder={`Select ${label}`}
                            required={required}
                            error={!!formErrors[fieldname]}
                            helperText={formErrors[fieldname]}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                '& .MuiFormLabel-asterisk': {
                                    color: 'red',
                                },
                                ...extraProps.sx
                            }}
                        />
                    )}
                    freeSolo
                    selectOnFocus
                    clearOnBlur
                    handleHomeEndKeys
                />
            );
        }

        if (fieldname === 'shift') {
            return (
                <Autocomplete
                    fullWidth
                    options={options}
                    value={formData[fieldname] || ''}
                    onChange={(event, newValue: any) => {
                        if (newValue?.isNew || newValue === 'Create Shift' || newValue?.name === 'Create Shift' || newValue?.shift_name === 'Create Shift') {
                            setOpenShiftCreate(true);
                            setShiftSearch(newValue?.inputValue || '');
                        } else {
                            const value = typeof newValue === 'object' ? (newValue.shift_name || newValue.name) : newValue;
                            handleInputChange(fieldname, value || '');
                        }
                    }}
                    filterOptions={(currentOptions, params) => {
                        const filtered = filter(currentOptions, params);
                        const { inputValue } = params;
                        const hasCreateOption = filtered.some((option: any) =>
                            (typeof option === 'string' ? option : (option.shift_name || option.name)) === 'Create Shift' || option.isNew
                        );
                        if (!hasCreateOption) {
                            filtered.push({
                                inputValue: inputValue || '',
                                name: 'Create Shift',
                                shift_name: 'Create Shift',
                                isNew: true,
                            });
                        }
                        return filtered;
                    }}
                    renderOption={(props, option: any) => (
                        <Box component="li" {...props} sx={{
                            typography: 'body2',
                            ...(option.isNew && {
                                color: 'primary.main',
                                fontWeight: 600,
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                mt: 0.5,
                                py: 3, minHeight: '56px',
                                '&:hover': {
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                }
                            })
                        }}>
                            {option.isNew ? (
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Iconify icon={"solar:add-circle-bold" as any} width={18} />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Create Shift</Typography>
                                </Stack>
                            ) : (
                                typeof option === 'string' ? option : (option.shift_name || option.name)
                            )}
                        </Box>
                    )}
                    getOptionLabel={(option: any) => {
                        if (typeof option === 'string') return option;
                        if (option?.shift_name) return option.shift_name;
                        if (option?.name) return option.name;
                        return '';
                    }}
                    isOptionEqualToValue={(option: any, value: any) => {
                        const optionValue = typeof option === 'string' ? option : (option.shift_name || option.name);
                        return optionValue === value || option?.name === value;
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={label}
                            placeholder={`Select ${label}`}
                            required={required}
                            error={!!formErrors[fieldname]}
                            helperText={formErrors[fieldname]}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                '& .MuiFormLabel-asterisk': {
                                    color: 'red',
                                },
                                ...extraProps.sx
                            }}
                        />
                    )}
                    freeSolo
                    selectOnFocus
                    clearOnBlur
                    handleHomeEndKeys
                />
            );
        }

        if (fieldname === 'bus_travel_route') {
            return (
                <Autocomplete
                    fullWidth
                    options={options}
                    value={formData[fieldname] || ''}
                    onChange={(event, newValue: any) => {
                        if (newValue?.isNew || newValue === 'Create Route' || newValue?.name === 'Create Route' || newValue?.route_name === 'Create Route') {
                            setOpenBusRouteCreate(true);
                            setBusRouteSearch(newValue?.inputValue || '');
                        } else {
                            const value = typeof newValue === 'object' ? (newValue.route_name || newValue.name) : newValue;
                            handleInputChange(fieldname, value || '');
                        }
                    }}
                    filterOptions={(currentOptions, params) => {
                        const filtered = filter(currentOptions, params);
                        const { inputValue } = params;
                        const hasCreateOption = filtered.some((option: any) =>
                            (typeof option === 'string' ? option : (option.route_name || option.name)) === 'Create Route' || option.isNew
                        );
                        if (!hasCreateOption) {
                            filtered.push({
                                inputValue: inputValue || '',
                                name: 'Create Route',
                                route_name: 'Create Route',
                                isNew: true,
                            });
                        }
                        return filtered;
                    }}
                    renderOption={(props, option: any) => (
                        <Box component="li" {...props} sx={{
                            typography: 'body2',
                            ...(option.isNew && {
                                color: 'primary.main',
                                fontWeight: 600,
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                mt: 0.5,
                                py: 3, minHeight: '56px',
                                '&:hover': {
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                }
                            })
                        }}>
                            {option.isNew ? (
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Iconify icon={"solar:add-circle-bold" as any} width={18} />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Create Bus - Travel Route</Typography>
                                </Stack>
                            ) : (
                                typeof option === 'string' ? option : (option.route_name || option.name)
                            )}
                        </Box>
                    )}
                    getOptionLabel={(option: any) => {
                        if (typeof option === 'string') return option;
                        if (option?.route_name) return option.route_name;
                        if (option?.name) return option.name;
                        return '';
                    }}
                    isOptionEqualToValue={(option: any, value: any) => {
                        const optionValue = typeof option === 'string' ? option : (option.route_name || option.name);
                        return optionValue === value || option?.name === value;
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={label}
                            placeholder={`Select ${label}`}
                            required={required}
                            error={!!formErrors[fieldname]}
                            helperText={formErrors[fieldname]}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                '& .MuiFormLabel-asterisk': {
                                    color: 'red',
                                },
                                ...extraProps.sx
                            }}
                        />
                    )}
                    freeSolo
                    selectOnFocus
                    clearOnBlur
                    handleHomeEndKeys
                />
            );
        }

        if (fieldname === 'employee_type') {
            return (
                <Autocomplete
                    fullWidth
                    options={options}
                    value={formData[fieldname] || ''}
                    onChange={(event, newValue: any) => {
                        if (newValue?.isNew || newValue === 'Create Employee Type' || newValue?.name === 'Create Employee Type' || newValue?.employee_type === 'Create Employee Type') {
                            setOpenEmployeeTypeCreate(true);
                            setEmployeeTypeSearch(newValue?.inputValue || '');
                        } else {
                            const value = typeof newValue === 'object' ? (newValue.employee_type || newValue.name) : newValue;
                            handleInputChange(fieldname, value || '');
                        }
                    }}
                    filterOptions={(currentOptions, params) => {
                        const filtered = filter(currentOptions, params);
                        const { inputValue } = params;
                        const hasCreateOption = filtered.some((option: any) =>
                            (typeof option === 'string' ? option : (option.employee_type || option.name)) === 'Create Employee Type' || option.isNew
                        );
                        if (!hasCreateOption) {
                            filtered.push({
                                inputValue: inputValue || '',
                                name: 'Create Employee Type',
                                employee_type: 'Create Employee Type',
                                isNew: true,
                            });
                        }
                        return filtered;
                    }}
                    renderOption={(props, option: any) => (
                        <Box component="li" {...props} sx={{
                            typography: 'body2',
                            ...(option.isNew && {
                                color: 'primary.main',
                                fontWeight: 600,
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                mt: 0.5,
                                py: 3, minHeight: '56px',
                                '&:hover': {
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                }
                            })
                        }}>
                            {option.isNew ? (
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Iconify icon={"solar:add-circle-bold" as any} width={18} />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                        Create Employee Type {option.inputValue ? `"${option.inputValue}"` : ''}
                                    </Typography>
                                </Stack>
                            ) : (
                                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {typeof option === 'string' ? option : (option.employee_type || option.name)}
                                    </Typography>
                                    {typeof option === 'object' && option.category_type && option.category_type !== 'General' && (
                                        <Typography variant="caption" sx={{ color: 'text.secondary', bgcolor: 'action.hover', px: 0.75, py: 0.25, borderRadius: 0.5 }}>
                                            {option.category_type}
                                        </Typography>
                                    )}
                                </Box>
                            )}
                        </Box>
                    )}
                    getOptionLabel={(option) => (typeof option === 'string' ? option : (option.employee_type || option.name || ''))}
                    isOptionEqualToValue={(option, value) => {
                        const optVal = typeof option === 'string' ? option : (option.employee_type || option.name);
                        const val = typeof value === 'string' ? value : (value?.employee_type || value?.name);
                        return optVal === val;
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={label}
                            placeholder={`Select ${label}`}
                            required={required}
                            error={!!formErrors[fieldname]}
                            helperText={formErrors[fieldname]}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                '& .MuiFormLabel-asterisk': {
                                    color: 'red',
                                },
                                ...extraProps.sx
                            }}
                        />
                    )}
                    freeSolo
                    selectOnFocus
                    clearOnBlur
                    handleHomeEndKeys
                />
            );
        }

        if (type === 'select' || type === 'link') {
            const selectPlaceholder = extraProps.placeholder || `Select ${label}`;
            return (
                <TextField
                    {...commonProps}
                    select
                    SelectProps={{
                        displayEmpty: true,
                        renderValue: (selectedVal: any) => {
                            if (!selectedVal || selectedVal === '') {
                                return (
                                    <Box
                                        component="span"
                                        sx={{
                                            color: 'text.disabled',
                                        }}
                                    >
                                        {selectPlaceholder}
                                    </Box>
                                );
                            }
                            const match = options.find((opt: any) => {
                                const val = typeof opt === 'object' ? (opt.name || opt.qualification || opt.blood_group) : opt;
                                return val === selectedVal;
                            });
                            if (match && typeof match === 'object') {
                                return match.qualification || match.blood_group || match.name || selectedVal;
                            }
                            return selectedVal;
                        },
                        ...extraProps.SelectProps,
                    }}
                >
                    <MenuItem value="" disabled sx={{ color: 'text.disabled' }}>
                        {selectPlaceholder}
                    </MenuItem>
                    {options.map((opt: any) => {
                        const val = typeof opt === 'object' ? (opt.name || opt.qualification || opt.blood_group) : opt;
                        const display = typeof opt === 'object' ? (opt.qualification || opt.blood_group || opt.name) : opt;
                        return (
                            <MenuItem key={val} value={val}>{display}</MenuItem>
                        );
                    })}
                </TextField>
            );
        }

        if (type === 'date') {
            return (
                <DatePicker
                    label={label}
                    value={formData[fieldname] ? dayjs(formData[fieldname]) : null}
                    onChange={(newValue) => handleInputChange(fieldname, newValue?.format('YYYY-MM-DD') || '')}
                    slotProps={{
                        textField: {
                            fullWidth: true,
                            required,
                            error: !!formErrors[fieldname],
                            helperText: formErrors[fieldname],
                            InputLabelProps: { shrink: true },
                            sx: commonProps.sx
                        }
                    }}
                />
            );
        }
        if (type === 'number') return <TextField {...commonProps} type="number" />;

        if (type === 'file') {
            return (
                <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                        {label} {required && <span style={{ color: 'red' }}>*</span>}
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                        {formData[fieldname] && (
                            <Box
                                component="img"
                                src={formData[fieldname]}
                                sx={{ width: 64, height: 64, borderRadius: 1, objectFit: 'cover', border: '1px solid', borderColor: 'divider' }}
                            />
                        )}
                        <Button
                            variant="outlined"
                            component="label"
                            startIcon={uploading ? <CircularProgress size={20} /> : <Iconify icon={"solar:upload-minimalistic-bold" as any} />}
                            disabled={uploading}
                        >
                            {uploading ? 'Uploading...' : (formData[fieldname] ? 'Change Image' : 'Upload Image')}
                            <input type="file" hidden accept="image/*" onChange={(e) => handleFileUpload(e, fieldname)} />
                        </Button>
                    </Stack>
                </Box>
            );
        }

        if (type === 'checkbox') {
            return (
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={!!formData[fieldname]}
                            onChange={(e) => handleInputChange(fieldname, e.target.checked ? 1 : 0)}
                        />
                    }
                    label={label}
                />
            );
        }

        return <TextField {...commonProps} />;
    };

    const renderSalaryTable = (type: 'Earning' | 'Deduction') => {
        const rows = type === 'Earning' ? (formData.earnings || []) : (formData.deductions || []);

        return (
            <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{
                        fontWeight: 700,
                        color: type === 'Earning' ? 'success.main' : 'error.main',
                        textTransform: 'uppercase',
                        letterSpacing: 1
                    }}>
                        {type === 'Earning' ? 'Earnings' : 'Deductions'}
                    </Typography>
                    <Button
                        size="small"
                        color="info"
                        variant="text"
                        startIcon={<Iconify icon="solar:add-circle-bold" />}
                        onClick={() => handleAddSalaryRow(type)}
                        sx={{ fontWeight: 700 }}
                    >
                        Add Row
                    </Button>
                </Box>
                <TableContainer sx={{
                    border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
                    borderRadius: 1.25,
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                    boxShadow: (theme) => theme.customShadows.z1
                }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ py: 1.5, bgcolor: '#08a3cd', color: 'common.white', fontWeight: 700, width: '60%' }}>
                                    Component Name *
                                </TableCell>
                                <TableCell align="right" sx={{ py: 1.5, bgcolor: '#08a3cd', color: 'common.white', fontWeight: 700, width: '35%' }}>
                                    Amount
                                </TableCell>
                                <TableCell width={48} sx={{ py: 1.5, bgcolor: '#08a3cd' }} />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row: any, index: number) => (
                                <SalaryRow
                                    key={index}
                                    index={index}
                                    type={type}
                                    row={row}
                                    componentOptions={type === 'Earning' ? earningComponents : deductionComponents}
                                    hrSettings={hrSettings}
                                    onRowChange={handleSalaryRowChange}
                                    onRowRemove={handleRemoveSalaryRow}
                                    hasError={formData.earnings?.length > 0 || formData.deductions?.length > 0}
                                />
                            ))}
                            {rows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} align="center" sx={{ py: 3, typography: 'body2', color: 'text.disabled' }}>
                                        No data available
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        );
    };

    const handleAddDocumentRow = () => {
        setFormData(prev => {
            const currentRows = prev.documents || [];
            return {
                ...prev,
                documents: [...currentRows, { title: '', attachment: '', description: '' }]
            };
        });
    };

    const handleRemoveDocumentRow = (index: number) => {
        setFormData(prev => {
            const currentRows = [...(prev.documents || [])];
            currentRows.splice(index, 1);
            return {
                ...prev,
                documents: currentRows
            };
        });
    };

    const handleDocumentRowChange = (index: number, field: string, value: any) => {
        setFormData(prev => {
            const currentRows = [...(prev.documents || [])];
            currentRows[index] = { ...currentRows[index], [field]: value };
            return {
                ...prev,
                documents: currentRows
            };
        });
    };

    const renderDocumentsTable = () => {
        const rows = formData.documents || [];

        return (
            <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h6" sx={{ color: 'primary.main' }}>Documents</Typography>
                    <Button
                        size="small"
                        color="info"
                        variant="text"
                        startIcon={<Iconify icon="solar:add-circle-bold" />}
                        onClick={handleAddDocumentRow}
                        sx={{ fontWeight: 700 }}
                    >
                        Add Document
                    </Button>
                </Box>
                <TableContainer sx={{
                    border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
                    borderRadius: 1.25,
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                    boxShadow: (theme) => theme.customShadows.z1
                }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ py: 1.5, bgcolor: '#08a3cd', color: 'common.white', fontWeight: 700, width: '30%' }}>
                                    Title *
                                </TableCell>
                                <TableCell sx={{ py: 1.5, bgcolor: '#08a3cd', color: 'common.white', fontWeight: 700, width: '30%' }}>
                                    Attachment *
                                </TableCell>
                                <TableCell sx={{ py: 1.5, bgcolor: '#08a3cd', color: 'common.white', fontWeight: 700, width: '35%' }}>
                                    Description
                                </TableCell>
                                <TableCell width={48} sx={{ py: 1.5, bgcolor: '#08a3cd' }} />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row: any, index: number) => (
                                <TableRow key={index} sx={{ borderBottom: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.1)}` }}>
                                    <TableCell sx={{ py: 1 }}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            variant="standard"
                                            placeholder="Enter title"
                                            value={row.title || ''}
                                            onChange={(e) => handleDocumentRowChange(index, 'title', e.target.value)}
                                            InputProps={{ disableUnderline: true, sx: { typography: 'body2' } }}
                                        />
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            py: 1,
                                            cursor: 'pointer',
                                            transition: (theme) => theme.transitions.create('background-color'),
                                            '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04) }
                                        }}
                                    >
                                        <Box component="label" sx={{ display: 'flex', alignItems: 'center', width: '100%', cursor: 'pointer' }}>
                                            <input
                                                type="file"
                                                hidden
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        handleDocumentRowChange(index, 'pendingFile', file);
                                                        if (!row.title) {
                                                            handleDocumentRowChange(index, 'title', file.name.split('.')[0]);
                                                        }
                                                    }
                                                }}
                                            />
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1, minWidth: 0 }}>
                                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                    {row.attachment || row.pendingFile ? (
                                                        <Typography
                                                            variant="body2"
                                                            noWrap
                                                            sx={{
                                                                color: 'primary.main',
                                                                fontWeight: 600,
                                                                textDecoration: 'underline'
                                                            }}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                if (row.attachment) {
                                                                    window.open(row.attachment);
                                                                } else if (row.pendingFile) {
                                                                    const url = URL.createObjectURL(row.pendingFile);
                                                                    window.open(url);
                                                                }
                                                            }}
                                                        >
                                                            {row.attachment ? row.attachment.split('/').pop() : row.pendingFile.name}
                                                        </Typography>
                                                    ) : (
                                                        <Typography variant="body2" color="text.disabled">Click to select file</Typography>
                                                    )}
                                                </Box>
                                                {(row.attachment || row.pendingFile) ? (
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleDocumentRowChange(index, 'attachment', '');
                                                            handleDocumentRowChange(index, 'pendingFile', null);
                                                        }}
                                                        sx={{ color: 'error.main', p: 0.5 }}
                                                    >
                                                        <Iconify icon="solar:close-circle-bold" width={16} />
                                                    </IconButton>
                                                ) : (
                                                    <Iconify icon="solar:upload-minimalistic-bold" width={18} sx={{ color: 'text.disabled' }} />
                                                )}
                                            </Stack>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ py: 1 }}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            variant="standard"
                                            placeholder="Enter description"
                                            value={row.description || ''}
                                            onChange={(e) => handleDocumentRowChange(index, 'description', e.target.value)}
                                            InputProps={{ disableUnderline: true, sx: { typography: 'body2' } }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton size="small" onClick={() => handleRemoveDocumentRow(index)} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                                            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {rows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 3, typography: 'body2', color: 'text.disabled' }}>
                                        No documents added
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        );
    };

    const sortOptions = [
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' },
        { value: 'name_asc', label: 'Name: A to Z' },
        { value: 'name_desc', label: 'Name: Z to A' },
    ];

    const getSortByValue = () => {
        if (orderBy === 'modified') {
            return order === 'desc' ? 'newest' : 'oldest';
        }
        if (orderBy === 'employee_name') {
            return order === 'asc' ? 'name_asc' : 'name_desc';
        }
        return 'name_asc';
    };

    const handleSortChange = (value: string) => {
        if (value === 'newest') {
            setOrderBy('modified');
            setOrder('desc');
        } else if (value === 'oldest') {
            setOrderBy('modified');
            setOrder('asc');
        } else if (value === 'name_asc') {
            setOrderBy('employee_name');
            setOrder('asc');
        } else if (value === 'name_desc') {
            setOrderBy('employee_name');
            setOrder('desc');
        }
    };

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ flexGrow: 1 }}>
                    Employees
                </Typography>

                {canCreateEmployee && (
                    <Button
                        variant="contained"
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={handleOpenCreate}
                        sx={{
                            bgcolor: 'var(--btn-primary-bg, #059669)',
                            color: 'var(--btn-primary-color, common.white)',
                            '&:hover': { bgcolor: 'var(--btn-primary-hover, #047857)' },
                        }}
                    >
                        New Employee
                    </Button>
                )}
            </Box>

            <Card>
                <EmployeeTableToolbar
                    numSelected={selected.length}
                    filterName={filterName}
                    onFilterName={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setFilterName(e.target.value);
                        setPage(0);
                    }}
                    onDelete={handleBulkDelete}
                    searchPlaceholder="Search employees by name, ID, department..."
                    sortOptions={sortOptions}
                    sortBy={getSortByValue()}
                    onSortChange={handleSortChange}
                    onOpenFilter={() => setOpenFilters(true)}
                    canReset={canReset}
                />



                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: 960, borderCollapse: 'collapse' }}>
                            <EmployeeTableHead
                                order={order}
                                orderBy={orderBy}
                                rowCount={total}
                                numSelected={selected.length}
                                onSelectAllRows={(checked: boolean) => handleSelectAllRows(checked)}
                                hideCheckbox
                                showIndex
                                headLabel={[
                                    { id: 'employee_name', label: 'Name', minWidth: 160 },
                                    { id: 'employee_id', label: 'Employee ID', minWidth: 120 },
                                    { id: 'employee_type', label: 'Employee Type', minWidth: 130 },
                                    { id: 'department', label: 'Department', minWidth: 120 },
                                    { id: 'designation', label: 'Designation', minWidth: 120 },
                                    { id: 'status', label: 'Status', minWidth: 100 },
                                    { id: '', label: 'Actions', align: 'right' },
                                ]}
                            />

                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                                            <CircularProgress sx={{ color: '#08a3cd' }} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {data.map((row, index) => (
                                            <EmployeeTableRow
                                                key={row.name}
                                                index={page * rowsPerPage + index}
                                                hideCheckbox
                                                row={{
                                                    id: row.name,
                                                    employeeId: row.employee_id,
                                                    name: row.employee_name,
                                                    employeeType: row.employee_type,
                                                    department: row.department,
                                                    designation: row.designation,
                                                    status: row.status,
                                                }}
                                                selected={selected.includes(row.name)}
                                                onSelectRow={() => handleSelectRow(row.name)}
                                                onView={() => handleOpenDetails(row.name)}
                                                onEdit={() => handleEditRow(row.name)}
                                                onDelete={() => handleDeleteClick(row.name)}
                                                canEdit={permissions.write}
                                                canDelete={permissions.delete}
                                            />
                                        ))}

                                        {notFound && <TableNoData searchQuery={filterName} />}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={8}>
                                                    <EmptyContent
                                                        title="No employees found"
                                                        description="Click 'New Employee' to add your first team member."
                                                        icon="solar:users-group-rounded-bold-duotone"
                                                        sx={{ py: 5 }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        )}

                                        {!empty && !notFound && (
                                            <TableEmptyRows
                                                height={68}
                                                emptyRows={data.length < 5 ? 5 - data.length : 0}
                                            />
                                        )}
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Scrollbar>

                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={onChangePage}
                    rowsPerPageOptions={[10, 25, 50]}
                    onRowsPerPageChange={onChangeRowsPerPage}
                />
            </Card>

            {/* CREATE/EDIT DIALOG */}
            <Dialog open={openCreate} onClose={handleCloseCreate} fullWidth maxWidth="lg" PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24, } }}>
                <DialogTitle sx={{ m: 0, p: 2, px: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {currentEmployeeId ? 'Edit Employee' : 'New Employee'}
                    <IconButton onClick={handleCloseCreate} sx={{ color: (theme) => theme.palette.grey[500] }}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers sx={{ p: 0 }}>
                    <Tabs
                        value={currentTab}
                        onChange={(e, newValue) => setCurrentTab(newValue)}
                        sx={{
                            px: 4,
                            bgcolor: 'transparent',
                            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                            '& .MuiTabs-indicator': {
                                height: 3,
                                borderRadius: '3px 3px 0 0',
                            },
                            '& .MuiTab-root': {
                                py: 2,
                                minHeight: 48,
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                color: 'text.secondary',
                                '&.Mui-selected': {
                                    color: 'primary.main',
                                },
                                '& .MuiTab-iconWrapper': {
                                    mr: '10px !important',
                                }
                            }
                        }}
                    >
                        <Tab
                            label="Employee Info"
                            icon={<LuUserCheck size={20} />}
                            iconPosition="start"
                        />
                        <Tab
                            label="Salary Info"
                            icon={<TbMoneybagPlus size={20} />}
                            iconPosition="start"
                        />
                        <Tab
                            label="Documents"
                            icon={<GrDocumentLocked size={20} />}
                            iconPosition="start"
                        />
                    </Tabs>

                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Box sx={{ p: 4, pt: 3 }}>
                            {currentTab === 0 && (
                                <Box>
                                    {/* Section 1: Personal Information */}
                                    <>
                                        <Typography variant="h6" sx={{ mb: 3, color: 'primary.main' }}>Personal Information</Typography>
                                        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={3} sx={{ mb: 4 }}>
                                            {renderField('employee_id', 'Employee ID', 'text', [], {}, true)}
                                            {renderField('employee_name', 'Employee Name', 'text', [], {}, true)}
                                            {renderField('email', 'Email', 'text', [], {}, true)}
                                            {renderField('personal_email', 'Personal Email')}
                                            {renderField('phone', 'Personal Phone Number', 'phone')}
                                            {renderField('office_phone_number', 'Office Phone', 'phone')}
                                            {renderField('dob', 'Date of Birth', 'date')}
                                            {renderField('blood_group', 'Blood Group', 'link', fieldOptions['blood_group'] || [])}
                                            {renderField('sex', 'Gender', 'select', ['Male', 'Female', 'Other'])}
                                            {renderField('marital_status', 'Marital Status', 'select', ['Single', 'Married', 'Divorced', 'Widowed'])}
                                            {renderField('qualification', 'Qualification', 'link', fieldOptions['qualification'] || [])}
                                            {renderField('aadhar_number', 'Aadhar Number')}
                                            {renderField('country', 'Country', 'autocomplete', fieldOptions['country'] || [])}
                                            {renderField('state', 'State', 'autocomplete', stateOptions)}
                                            {renderField('city', 'City', 'autocomplete', cityOptions)}
                                            {renderField('profile_picture', 'Profile Picture', 'file')}
                                        </Box>
                                    </>

                                    {/* Section 2: Employment Details */}
                                    <>
                                        <Typography variant="h6" sx={{ mb: 3, color: 'primary.main' }}>Employment Details</Typography>
                                        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={3} sx={{ mb: 4 }}>
                                            {renderField('department', 'Department', 'link', fieldOptions['department'] || [])}
                                            {renderField('designation', 'Designation', 'link', fieldOptions['designation'] || [])}
                                            {renderField('employee_type', 'Employee Type', 'link', fieldOptions['employee_type'] || [])}
                                            {renderField('line_order', 'Line Order', 'link', fieldOptions['line_order'] || [])}
                                            {renderField('shift', 'Shift', 'link', fieldOptions['shift'] || [])}
                                            {renderField('bus_travel_route', 'Bus - Travel Route', 'link', fieldOptions['bus_travel_route'] || [])}
                                            {formData.bus_travel_route && renderField('bus_route_point', 'Bus Route Point', 'autocomplete', busRoutePoints)}
                                            {renderField('date_of_joining', 'Joining Date', 'date', [], {}, true)}
                                            {renderField('user', 'User Login (Email)', 'autocomplete', fieldOptions['user'] || [], {}, false)}
                                            {renderField('status', 'Status', 'select', ['Active', 'Inactive'], {}, true)}
                                            {formData.status === 'Inactive' && renderField('date_of_leaving', 'Date of Leaving (DOL)', 'date', [], {}, false)}
                                            {renderField('skip_probation', 'Skip Probation', 'checkbox')}
                                        </Box>
                                    </>

                                    {/* Section 3: Financial & Bank Details */}
                                    <>
                                        <Typography variant="h6" sx={{ mb: 3, color: 'primary.main' }}>Financial & Bank Details</Typography>
                                        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={3} sx={{ mb: 4 }}>
                                            {renderField('bank_account', 'Bank Account', 'autocomplete', fieldOptions['bank_account'] || [])}
                                            {renderField('pf_number', 'PF Number')}
                                            {renderField('uan_number', 'UAN Number')}
                                            {renderField('esi_no', 'ESI No')}
                                        </Box>
                                    </>
                                </Box>
                            )}

                            {currentTab === 1 && (
                                <Box>
                                    {/* Section 4: Salary & breakdown */}
                                    <Typography variant="h6" sx={{ mb: 3, color: 'primary.main' }}>Salary Details</Typography>

                                    {/* CTC Field - Full Width */}
                                    <Box sx={{ mb: 3 }}>
                                        {renderField('ctc', 'CTC (Monthly)', 'number', [], {
                                            onBlur: handleCTCOnBlur,
                                            InputProps: {
                                                endAdornment: (
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        onClick={handleDefaultSplitting}
                                                        sx={{
                                                            whiteSpace: 'nowrap',
                                                            mx: 1,
                                                            py: 1.5,
                                                            px: 3,
                                                            height: 32,
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 1),
                                                            color: 'common.white',
                                                            boxShadow: (theme) => theme.customShadows.z8,
                                                            '&:hover': {
                                                                bgcolor: (theme) => theme.palette.primary.dark,
                                                                boxShadow: (theme) => theme.customShadows.z16,
                                                            }
                                                        }}
                                                        startIcon={<Iconify icon={"solar:magic-stick-bold" as any} width={16} />}
                                                    >
                                                        Default Splitting
                                                    </Button>
                                                )
                                            }
                                        }, false)}
                                    </Box>

                                    {/* Two Column Layout: Earnings and Deductions */}
                                    <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={3}>
                                        {/* Left Column - Earnings */}
                                        <Box>
                                            {renderSalaryTable('Earning')}
                                        </Box>

                                        {/* Right Column - Deductions */}
                                        <Box>
                                            {renderSalaryTable('Deduction')}
                                        </Box>
                                    </Box>

                                    {/* Net Salary Summary */}
                                    <Box sx={{ mt: 4, p: 3, borderRadius: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05), border: (theme) => `1px dashed ${alpha(theme.palette.primary.main, 0.3)}` }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Box>
                                                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Net Salary (Monthly)</Typography>
                                                <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 800, display: 'flex', alignItems: 'center' }}>
                                                    <Box component="span" sx={{ fontFamily: "Arial, 'sans-serif'", mr: 1, fontSize: '0.8em' }}>{hrSettings.currency_symbol}</Box>
                                                    {fNumber(totals.net_salary || 0, { locale: hrSettings.default_locale })}
                                                </Typography>
                                            </Box>
                                            <Stack direction="row" spacing={4}>
                                                <Box sx={{ textAlign: 'right' }}>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Total Earnings</Typography>
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'success.main', display: 'flex', alignItems: 'center' }}>
                                                        + <Box component="span" sx={{ fontFamily: "Arial, 'sans-serif'", mx: 0.5 }}>{hrSettings.currency_symbol}</Box>
                                                        {fNumber(totals.total_earnings || 0, { locale: hrSettings.default_locale })}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ textAlign: 'right' }}>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Total Deductions</Typography>
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'error.main', display: 'flex', alignItems: 'center' }}>
                                                        - <Box component="span" sx={{ fontFamily: "Arial, 'sans-serif'", mx: 0.5 }}>{hrSettings.currency_symbol}</Box>
                                                        {fNumber(totals.total_deductions || 0, { locale: hrSettings.default_locale })}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Stack>
                                    </Box>
                                </Box>
                            )}

                            {currentTab === 2 && (
                                <Box>
                                    {renderDocumentsTable()}
                                </Box>
                            )}
                        </Box>
                    </LocalizationProvider>
                </DialogContent>


                <DialogActions sx={{ px: 4, py: 2 }}>
                    <LoadingButton
                        variant="contained"
                        onClick={handleCreate}
                        loading={creating}
                        sx={{ bgcolor: '#08a3cd', '&:hover': { bgcolor: '#068fb3' } }}
                    >
                        {currentEmployeeId ? 'Update Employee' : 'Create Employee'}
                    </LoadingButton>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null })}
                title="Confirm Delete"
                content="Are you sure you want to delete this employee?"
                action={
                    <Button onClick={handleConfirmDelete} color="error" variant="contained" sx={{ borderRadius: 1.5, minWidth: 100 }}>
                        Delete
                    </Button>
                }
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <EmployeeDetailsDialog
                open={openDetails}
                onClose={handleCloseDetails}
                employeeId={detailsId}
            />

            <Snackbar
                open={!!serverAlert.message}
                autoHideDuration={6000}
                onClose={() => setServerAlert({ ...serverAlert, message: '' })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setServerAlert({ ...serverAlert, message: '' })}
                    severity={serverAlert.severity}
                    sx={{ width: '100%', whiteSpace: 'pre-line' }}
                >
                    {serverAlert.message}
                </Alert>
            </Snackbar>

            <EmployeeTableFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
                departmentOptions={fieldOptions['department'] || []}
                designationOptions={fieldOptions['designation'] || []}
            />

            <DepartmentCreateDialog
                open={openDepartmentCreate}
                onClose={() => setOpenDepartmentCreate(false)}
                onCreate={(newDepartment) => {
                    // Optimistically add to options and set value
                    setFieldOptions(prev => ({
                        ...prev,
                        department: [...(prev['department'] || []), { name: newDepartment }]
                    }));
                    // Update form data
                    handleInputChange('department', newDepartment);

                    setSnackbar({ open: true, message: 'Department created successfully', severity: 'success' });
                }}
            />

            <BloodGroupCreateDialog
                open={openBloodGroupCreate}
                onClose={() => setOpenBloodGroupCreate(false)}
                currentBloodGroupName={bloodGroupSearch}
                onCreate={async (newBloodGroup) => {
                    // Optimistically add to options and set value
                    setFieldOptions(prev => {
                        const existing = prev['blood_group'] || [];
                        const exists = existing.some((opt: any) => (typeof opt === 'string' ? opt : (opt.blood_group || opt.name)) === newBloodGroup);
                        if (exists) return prev;
                        return {
                            ...prev,
                            blood_group: [...existing, { name: newBloodGroup, blood_group: newBloodGroup }]
                        };
                    });

                    // Update form data with newly created blood group
                    handleInputChange('blood_group', newBloodGroup);

                    // Re-fetch Blood Group options from backend
                    try {
                        const freshOptions = await getDoctypeList('Blood Group', ['name', 'blood_group']);
                        setFieldOptions(prev => ({
                            ...prev,
                            blood_group: freshOptions
                        }));
                    } catch (err) {
                        console.error('Failed to re-fetch blood group options:', err);
                    }

                    setSnackbar({ open: true, message: 'Blood Group created successfully', severity: 'success' });
                }}
            />

            <QualificationCreateDialog
                open={openQualificationCreate}
                onClose={() => setOpenQualificationCreate(false)}
                currentQualificationName={qualificationSearch}
                onCreate={async (newQualification) => {
                    // Optimistically add to options and set value
                    setFieldOptions(prev => {
                        const existing = prev['qualification'] || [];
                        const exists = existing.some((opt: any) => (typeof opt === 'string' ? opt : (opt.qualification || opt.name)) === newQualification);
                        if (exists) return prev;
                        return {
                            ...prev,
                            qualification: [...existing, { name: newQualification, qualification: newQualification }]
                        };
                    });

                    // Update form data with newly created qualification
                    handleInputChange('qualification', newQualification);

                    // Re-fetch Qualification options from backend
                    try {
                        const freshOptions = await getDoctypeList('Qualification', ['name', 'qualification']);
                        setFieldOptions(prev => ({
                            ...prev,
                            qualification: freshOptions
                        }));
                    } catch (err) {
                        console.error('Failed to re-fetch qualification options:', err);
                    }

                    setSnackbar({ open: true, message: 'Qualification created successfully', severity: 'success' });
                }}
            />

            <DesignationCreateDialog
                open={openDesignationCreate}
                onClose={() => setOpenDesignationCreate(false)}
                currentDesignationName={designationSearch}
                defaultDepartment={formData.department}
                onCreate={async (newDesignation) => {
                    // Optimistically add to options and set value
                    setFieldOptions(prev => {
                        const existing = prev['designation'] || [];
                        const exists = existing.some((opt: any) => (typeof opt === 'string' ? opt : (opt.designation_name || opt.name)) === newDesignation);
                        if (exists) return prev;
                        return {
                            ...prev,
                            designation: [...existing, { name: newDesignation, designation_name: newDesignation }]
                        };
                    });

                    // Update form data with newly created designation
                    handleInputChange('designation', newDesignation);

                    // Re-fetch Designation options from backend
                    try {
                        const freshOptions = await getDoctypeList('Designation', ['name', 'designation_name']);
                        setFieldOptions(prev => ({
                            ...prev,
                            designation: freshOptions
                        }));
                    } catch (err) {
                        console.error('Failed to re-fetch designation options:', err);
                    }

                    setSnackbar({ open: true, message: 'Designation created successfully', severity: 'success' });
                }}
            />

            <LineOrderCreateDialog
                open={openLineOrderCreate}
                onClose={() => setOpenLineOrderCreate(false)}
                currentLineName={lineOrderSearch}
                onCreate={async (newLineOrder) => {
                    setFieldOptions(prev => {
                        const existing = prev['line_order'] || [];
                        const exists = existing.some((opt: any) => (typeof opt === 'string' ? opt : (opt.line_name || opt.name)) === newLineOrder);
                        if (exists) return prev;
                        return {
                            ...prev,
                            line_order: [...existing, { name: newLineOrder, line_name: newLineOrder }]
                        };
                    });
                    handleInputChange('line_order', newLineOrder);
                    try {
                        const freshOptions = await getDoctypeList('Line Order', ['name', 'line_name']);
                        setFieldOptions(prev => ({
                            ...prev,
                            line_order: freshOptions
                        }));
                    } catch (err) {
                        console.error('Failed to re-fetch line order options:', err);
                    }
                    setSnackbar({ open: true, message: 'Line Order created successfully', severity: 'success' });
                }}
            />

            <ShiftCreateDialog
                open={openShiftCreate}
                onClose={() => setOpenShiftCreate(false)}
                currentShiftName={shiftSearch}
                onCreate={async (newShift) => {
                    setFieldOptions(prev => {
                        const existing = prev['shift'] || [];
                        const exists = existing.some((opt: any) => (typeof opt === 'string' ? opt : (opt.shift_name || opt.name)) === newShift);
                        if (exists) return prev;
                        return {
                            ...prev,
                            shift: [...existing, { name: newShift, shift_name: newShift }]
                        };
                    });
                    handleInputChange('shift', newShift);
                    try {
                        const freshOptions = await getDoctypeList('Shift', ['name', 'shift_name']);
                        setFieldOptions(prev => ({
                            ...prev,
                            shift: freshOptions
                        }));
                    } catch (err) {
                        console.error('Failed to re-fetch shift options:', err);
                    }
                    setSnackbar({ open: true, message: 'Shift created successfully', severity: 'success' });
                }}
            />

            <BusRouteCreateDialog
                open={openBusRouteCreate}
                onClose={() => setOpenBusRouteCreate(false)}
                currentRouteName={busRouteSearch}
                onCreate={async (newRoute) => {
                    setFieldOptions(prev => {
                        const existing = prev['bus_travel_route'] || [];
                        const exists = existing.some((opt: any) => (typeof opt === 'string' ? opt : (opt.route_name || opt.name)) === newRoute);
                        if (exists) return prev;
                        return {
                            ...prev,
                            bus_travel_route: [...existing, { name: newRoute, route_name: newRoute }]
                        };
                    });
                    handleInputChange('bus_travel_route', newRoute);
                    loadBusRoutePoints(newRoute);
                    try {
                        const freshOptions = await getDoctypeList('Bus Travel Route', ['name', 'route_name']);
                        setFieldOptions(prev => ({
                            ...prev,
                            bus_travel_route: freshOptions
                        }));
                    } catch (err) {
                        console.error('Failed to re-fetch bus travel route options:', err);
                    }
                    setSnackbar({ open: true, message: 'Bus Travel Route created successfully', severity: 'success' });
                }}
            />

            <EmployeeTypeCreateDialog
                open={openEmployeeTypeCreate}
                onClose={() => setOpenEmployeeTypeCreate(false)}
                currentTypeName={employeeTypeSearch}
                onCreate={async (newType) => {
                    setFieldOptions(prev => {
                        const existing = prev['employee_type'] || [];
                        const exists = existing.some((opt: any) => (typeof opt === 'string' ? opt : (opt.employee_type || opt.name)) === newType);
                        if (exists) return prev;
                        return {
                            ...prev,
                            employee_type: [...existing, { name: newType, employee_type: newType }]
                        };
                    });
                    handleInputChange('employee_type', newType);
                    try {
                        const freshOptions = await getDoctypeList('Employee Type', ['name', 'employee_type', 'category_type']);
                        setFieldOptions(prev => ({
                            ...prev,
                            employee_type: freshOptions
                        }));
                    } catch (err) {
                        console.error('Failed to re-fetch employee type options:', err);
                    }
                    setSnackbar({ open: true, message: 'Employee Type created successfully', severity: 'success' });
                }}
            />

            <BankAccountDialog
                open={openBankAccountCreate}
                onClose={() => setOpenBankAccountCreate(false)}
                onSuccess={async (newAccount?: any) => {
                    const accountName = typeof newAccount === 'object' && newAccount?.name 
                        ? newAccount.name 
                        : (typeof newAccount === 'string' ? newAccount : '');

                    try {
                        const freshOptions = await getDoctypeList('Bank Account', ['name', 'bank_account_name', 'account_number']);
                        setFieldOptions(prev => ({
                            ...prev,
                            'bank_account': freshOptions
                        }));
                    } catch (err) {
                        console.error('Failed to re-fetch bank account options:', err);
                    }

                    if (accountName) {
                        handleInputChange('bank_account', accountName);
                    }

                    setSnackbar({ open: true, message: 'Bank Account created successfully', severity: 'success' });
                }}
            />
        </DashboardContent>
    );
}
