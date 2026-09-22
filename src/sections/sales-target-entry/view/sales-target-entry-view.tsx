import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { MuiTelInput } from 'mui-tel-input';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { LoadingButton } from '@mui/lab';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { IconButton } from '@mui/material';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { getFriendlyErrorMessage } from 'src/utils/error-handler';

import { DashboardContent } from 'src/layouts/dashboard';
import { getDoctypeList, createLeadFrom, createService } from 'src/api/leads';
import {
    fetchSalesTargetEntries,
    fetchNextSalesTargetPreview,
    createSalesTargetEntry,
    updateSalesTargetEntry,
    deleteSalesTargetEntry,
    getSalesTargetEntryPermissions,
    SalesTargetEntry
} from 'src/api/sales-target-entry';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { useAuth } from 'src/auth/auth-context';

import { TableNoData } from '../../lead/table-no-data';
import { TableEmptyRows } from '../../lead/table-empty-rows';
import { SalesTargetEntryTableRow } from '../sales-target-entry-table-row';
import { SalesTargetEntryDetailsDialog } from '../sales-target-entry-details-dialog';
import { LeadTableHead as SalesTargetEntryTableHead } from '../../lead/lead-table-head';
import { SalesTargetEntryTableFiltersDrawer } from '../sales-target-entry-table-filters-drawer';
import { LeadTableToolbar as SalesTargetEntryTableToolbar } from '../../lead/lead-table-toolbar';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = ['New', 'Confirmed', 'In Progress', 'Completed', 'Hold', 'Cancelled'];
const MONTH_OPTIONS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export function SalesTargetEntryView() {
    const { enqueueSnackbar } = useSnackbar();
    const { user } = useAuth();
    const [entries, setEntries] = useState<SalesTargetEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [filters, setFilters] = useState({
        month: 'all',
        status: 'all',
    });
    const [sortBy, setSortBy] = useState('creation_desc');
    const [total, setTotal] = useState(0);
    const [selected, setSelected] = useState<string[]>([]);
    const [openFilters, setOpenFilters] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [currentEntry, setCurrentEntry] = useState<any>(null);
    const [openView, setOpenView] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const filter = createFilterOptions<any>();

    // Form inputs state
    const [salesEntryId, setSalesEntryId] = useState('');
    const [salesPerson, setSalesPerson] = useState('');
    const [inDate, setInDate] = useState<dayjs.Dayjs | null>(null);
    const [month, setMonth] = useState('');
    const [contactName, setContactName] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [industry, setIndustry] = useState('');
    const [leadSource, setLeadSource] = useState('');
    const [service, setService] = useState('');
    const [value, setValue] = useState<number | ''>('');
    const [gstType, setGstType] = useState<'GST' | 'NGST' | ''>('');
    const [advance, setAdvance] = useState<number | ''>('');
    const [balance, setBalance] = useState<number | ''>('');
    const [outDate, setOutDate] = useState<dayjs.Dayjs | null>(null);
    const [status, setStatus] = useState<'New' | 'Confirmed' | 'In Progress' | 'Completed' | 'Hold' | 'Cancelled' | ''>('');
    const [remarks, setRemarks] = useState('');

    // Dynamic Autocomplete Create options dialog states
    const [createLeadFromOpen, setCreateLeadFromOpen] = useState(false);
    const [creatingLeadFrom, setCreatingLeadFrom] = useState(false);
    const [newLeadFromName, setNewLeadFromName] = useState('');

    const [createServiceOpen, setCreateServiceOpen] = useState(false);
    const [creatingService, setCreatingService] = useState(false);
    const [newServiceName, setNewServiceName] = useState('');

    // Dropdown options
    const [usersOptions, setUsersOptions] = useState<any[]>([]);
    const [contactsOptions, setContactsOptions] = useState<any[]>([]);
    const [leadSourceOptions, setLeadSourceOptions] = useState<any[]>([]);
    const [serviceOptions, setServiceOptions] = useState<any[]>([]);

    // Permissions
    const [permissions, setPermissions] = useState({ read: false, write: false, delete: false });

    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.sales_target_entry;
    const displayCreate = hasCustomPerms ? !!user?.permissions?.actions?.sales_target_entry?.create : permissions.write;

    // Validation state
    const [validationErrors, setValidationErrors] = useState<{ [key: string]: boolean }>({});

    const loadPermissions = useCallback(async () => {
        try {
            const perms = await getSalesTargetEntryPermissions();
            setPermissions(perms);
        } catch (error) {
            console.error('Failed to load permissions', error);
        }
    }, []);

    const loadEntries = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchSalesTargetEntries({
                page: page + 1,
                page_size: rowsPerPage,
                search: filterName,
                filterValues: filters,
                sort_by: sortBy,
            });
            setEntries(res.data || []);
            setTotal(res.total || 0);
        } catch (error) {
            console.error('Failed to fetch entries', error);
            setEntries([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, filterName, filters, sortBy]);

    // Load dynamic options
    const loadOptions = useCallback(async () => {
        try {
            const [usersList, contactsList, sourcesList, servicesList] = await Promise.all([
                getDoctypeList('User', ['name', 'full_name']),
                getDoctypeList('Contacts', ['name', 'first_name', 'last_name', 'phone']),
                getDoctypeList('Lead From', ['name']),
                getDoctypeList('Service', ['name']),
            ]);
            setUsersOptions(usersList || []);
            setContactsOptions(contactsList || []);
            setLeadSourceOptions(sourcesList || []);
            setServiceOptions(servicesList || []);
        } catch (error) {
            console.error('Failed to load dropdown options', error);
        }
    }, []);

    const handleFilters = (update: any) => {
        setFilters((prev) => ({ ...prev, ...update }));
        setPage(0);
    };

    const handleResetFilters = () => {
        setFilters({
            month: 'all',
            status: 'all',
        });
        setPage(0);
    };

    const canReset = filters.month !== 'all' || filters.status !== 'all' || !!filterName;

    useEffect(() => {
        loadPermissions();
        loadOptions();
    }, [loadPermissions, loadOptions]);

    useEffect(() => {
        loadEntries();
    }, [loadEntries]);

    // Calculate balance automatically when value or advance changes
    useEffect(() => {
        const valNum = Number(value) || 0;
        const advNum = Number(advance) || 0;
        setBalance(valNum - advNum);
    }, [value, advance]);

    const handleOpenCreate = async () => {
        setIsEdit(false);
        setSalesEntryId('');
        try {
            const previewId = await fetchNextSalesTargetPreview();
            setSalesEntryId(previewId);
        } catch (err) {
            console.error(err);
        }
        setSalesPerson(user?.email || '');
        setInDate(dayjs());
        setMonth(dayjs().format('MMMM'));
        setContactName('');
        setContactNumber('');
        setIndustry('');
        setLeadSource('');
        setService('');
        setValue('');
        setGstType('');
        setAdvance('');
        setBalance('');
        setOutDate(null);
        setStatus('New');
        setRemarks('');
        setValidationErrors({});
        setOpenCreate(true);
    };

    const handleOpenEdit = (entry: SalesTargetEntry) => {
        setIsEdit(true);
        setCurrentEntry(entry);
        setSalesEntryId(entry.sales_entry_id || '');
        setSalesPerson(entry.sales_person || '');
        setInDate(entry.in_date ? dayjs(entry.in_date) : null);
        setMonth(entry.month || '');
        setContactName(entry.contact_name || '');
        setContactNumber(entry.contact_number || '');
        setIndustry(entry.industry || '');
        setLeadSource(entry.lead_source || '');
        setService(entry.service || '');
        setValue(entry.value ?? '');
        setGstType(entry.gst_type || '');
        setAdvance(entry.advance ?? '');
        setBalance(entry.balance ?? '');
        setOutDate(entry.out_date ? dayjs(entry.out_date) : null);
        setStatus(entry.status || 'New');
        setRemarks(entry.remarks || '');
        setValidationErrors({});
        setOpenCreate(true);
    };

    const handleOpenView = (entry: SalesTargetEntry) => {
        setCurrentEntry(entry);
        setOpenView(true);
    };

    const handleCloseCreate = () => {
        setOpenCreate(false);
        setCurrentEntry(null);
    };

    const validateForm = () => {
        const errors: { [key: string]: boolean } = {};
        if (!salesPerson) errors.salesPerson = true;
        if (!month) errors.month = true;
        if (!status) errors.status = true;
        if (!contactName) errors.contactName = true;
        if (!contactNumber || !contactNumber.trim()) errors.contactNumber = true;
        if (value === '' || value === null || value === undefined || Number(value) <= 0) errors.value = true;
        setValidationErrors(errors);

        const hasOtherErrors = Boolean(errors.salesPerson || errors.month || errors.status || errors.contactName || errors.contactNumber);
        const isValueOnlyError = Boolean(errors.value && !hasOtherErrors);
        const isValid = Object.keys(errors).length === 0;

        return { isValid, isValueOnlyError };
    };

    const handleSaveEntry = async () => {
        const { isValid, isValueOnlyError } = validateForm();
        if (!isValid) {
            if (isValueOnlyError) {
                enqueueSnackbar('Value cannot be zero', { variant: 'error' });
            } else {
                enqueueSnackbar('Please fill in all required fields.', { variant: 'error' });
            }
            return;
        }

        setCreating(true);
        const docData: Partial<SalesTargetEntry> = {
            sales_entry_id: salesEntryId || undefined,
            sales_person: salesPerson,
            in_date: inDate ? inDate.format('YYYY-MM-DD') : undefined,
            month,
            contact_name: contactName || undefined,
            contact_number: contactNumber || undefined,
            industry: industry || undefined,
            lead_source: leadSource || undefined,
            service: service || undefined,
            value: value !== '' ? Number(value) : undefined,
            gst_type: gstType || undefined,
            advance: advance !== '' ? Number(advance) : undefined,
            balance: balance !== '' ? Number(balance) : undefined,
            out_date: outDate ? outDate.format('YYYY-MM-DD') : undefined,
            status: status || 'New',
            remarks: remarks || undefined,
        };

        try {
            if (isEdit && currentEntry) {
                await updateSalesTargetEntry(currentEntry.name, docData);
                enqueueSnackbar('Entry updated successfully!', { variant: 'success' });
            } else {
                await createSalesTargetEntry(docData);
                enqueueSnackbar('Entry created successfully!', { variant: 'success' });
            }
            handleCloseCreate();
            loadEntries();
        } catch (error: any) {
            enqueueSnackbar(getFriendlyErrorMessage(error), { variant: 'error' });
        } finally {
            setCreating(false);
        }
    };

    const handleCreateLeadFromSubmit = async () => {
        if (!newLeadFromName.trim()) return;
        try {
            setCreatingLeadFrom(true);
            await createLeadFrom(newLeadFromName.trim());
            setLeadSourceOptions(prev => [...prev, { name: newLeadFromName.trim() }]);
            setLeadSource(newLeadFromName.trim());
            setCreateLeadFromOpen(false);
            enqueueSnackbar('Lead Source created successfully', { variant: 'success' });
        } catch (err: any) {
            console.error(err);
            enqueueSnackbar(getFriendlyErrorMessage(err), { variant: 'error' });
        } finally {
            setCreatingLeadFrom(false);
        }
    };

    const handleCreateServiceSubmit = async () => {
        if (!newServiceName.trim()) return;
        try {
            setCreatingService(true);
            await createService(newServiceName.trim());
            setServiceOptions(prev => [...prev, { name: newServiceName.trim() }]);
            setService(newServiceName.trim());
            setCreateServiceOpen(false);
            enqueueSnackbar('Service created successfully', { variant: 'success' });
        } catch (err: any) {
            console.error(err);
            enqueueSnackbar(getFriendlyErrorMessage(err), { variant: 'error' });
        } finally {
            setCreatingService(false);
        }
    };

    const handleDeleteEntry = async () => {
        if (!confirmDelete.id) return;
        setDeleting(true);
        try {
            await deleteSalesTargetEntry(confirmDelete.id);
            enqueueSnackbar('Entry deleted successfully!', { variant: 'success' });
            loadEntries();
            setConfirmDelete({ open: false, id: null });
        } catch (error: any) {
            enqueueSnackbar(getFriendlyErrorMessage(error), { variant: 'error' });
        } finally {
            setDeleting(false);
        }
    };

    const handleSelectRow = (id: string) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleSelectAllRows = (checked: boolean) => {
        if (checked) {
            setSelected(entries.map((row) => row.name));
        } else {
            setSelected([]);
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
                <Box display="flex" alignItems="center" mb={5}>
                    <Typography variant="h4" flexGrow={1}>
                        Sales Target Entry
                    </Typography>

                    {displayCreate && (
                        <Button
                            variant="contained"
                            startIcon={<Iconify icon="mingcute:add-line" />}
                            onClick={handleOpenCreate}
                            sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                        >
                            New Entry
                        </Button>
                    )}
                </Box>

                <Card>
                    <SalesTargetEntryTableToolbar
                        numSelected={selected.length}
                        filterName={filterName}
                        onFilterName={(event) => {
                            setFilterName(event.target.value);
                            setPage(0);
                        }}
                        searchPlaceholder="Search Sales Target Entry..."
                        onOpenFilter={() => setOpenFilters(true)}
                        canReset={canReset}
                        sortBy={sortBy}
                        onSortChange={(val) => {
                            setSortBy(val);
                            setPage(0);
                        }}
                        sortOptions={[
                            { value: 'creation_desc', label: 'Newest First' },
                            { value: 'creation_asc', label: 'Oldest First' },
                        ]}
                    />

                    <Scrollbar>
                        <TableContainer sx={{ overflow: 'unset' }}>
                            <Table sx={{ minWidth: 800, borderCollapse: 'collapse' }}>
                                <SalesTargetEntryTableHead
                                    order={sortBy.endsWith('asc') ? 'asc' : 'desc'}
                                    orderBy={sortBy.substring(0, sortBy.lastIndexOf('_'))}
                                    rowCount={total}
                                    numSelected={selected.length}
                                    onSelectAllRows={(checked: boolean) =>
                                        handleSelectAllRows(checked)
                                    }
                                    hideCheckbox
                                    showIndex
                                    headLabel={[
                                        { id: 'sales_entry_id', label: 'Sales Entry ID' },
                                        { id: 'sales_person', label: 'Sales Person' },
                                        { id: 'month', label: 'Month' },
                                        { id: 'contact_name', label: 'Contact' },
                                        { id: 'service', label: 'Service' },
                                        { id: 'value', label: 'Value' },
                                        { id: 'status', label: 'Status' },
                                        { id: 'actions', label: 'Actions', align: 'right' },
                                    ]}
                                />

                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                                                <CircularProgress sx={{ color: '#059669' }} />
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <>
                                            {entries.map((row, index) => (
                                                <SalesTargetEntryTableRow
                                                    key={row.name}
                                                    row={row}
                                                    selected={selected.includes(row.name)}
                                                    onSelectRow={() => handleSelectRow(row.name)}
                                                    onView={() => handleOpenView(row)}
                                                    onEdit={() => handleOpenEdit(row)}
                                                    onDelete={() => setConfirmDelete({ open: true, id: row.name })}
                                                    canEdit={permissions.write}
                                                    canDelete={permissions.delete}
                                                    canView={permissions.read}
                                                    hideCheckbox
                                                    index={page * rowsPerPage + index}
                                                    contactsOptions={contactsOptions}
                                                />
                                            ))}

                                            {!loading && !entries.length && (!!filterName || canReset) && (
                                                <TableNoData searchQuery={filterName} />
                                            )}

                                            {!loading && !entries.length && !filterName && !canReset && (
                                                <TableRow>
                                                    <TableCell colSpan={9} sx={{ py: 10 }}>
                                                        <EmptyContent
                                                            title="No Sales Target Entry found"
                                                            description="Create a new sales target entry to track your target statistics."
                                                            icon="solar:bill-list-bold-duotone"
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            )}

                                            {entries.length > 0 && (
                                                <TableEmptyRows
                                                    height={68}
                                                    emptyRows={entries.length < 5 ? 5 - entries.length : 0}
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
                        onPageChange={(e, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        rowsPerPageOptions={[10, 25, 50]}
                    />
                </Card>

                {/* Filters Drawer */}
                <SalesTargetEntryTableFiltersDrawer
                    open={openFilters}
                    onOpen={() => setOpenFilters(true)}
                    onClose={() => setOpenFilters(false)}
                    filters={filters}
                    onFilters={handleFilters}
                    canReset={canReset}
                    onResetFilters={handleResetFilters}
                    options={{
                        months: MONTH_OPTIONS,
                        statuses: STATUS_OPTIONS,
                    }}
                />

                {/* Create/Edit dialog form */}
                <Dialog open={openCreate} onClose={handleCloseCreate} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24 } }}>
                    <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {isEdit ? 'Edit Sales Target Entry' : 'New Sales Target Entry'}
                        <IconButton
                            aria-label="close"
                            onClick={handleCloseCreate}
                            sx={{
                                color: (themeVar) => themeVar.palette.grey[500],
                            }}
                        >
                            <Iconify icon="mingcute:close-line" />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 4, px: 5 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField
                                fullWidth
                                label="Sales Entry ID"
                                value={salesEntryId}
                                InputProps={{
                                    readOnly: true,
                                }}
                                helperText={!isEdit && "Generated reference ID preview"}
                            />

                            <Autocomplete
                                fullWidth
                                options={STATUS_OPTIONS}
                                value={status}
                                onChange={(e, nv) => setStatus(nv as any || '')}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Status"
                                        required
                                        error={validationErrors.status}
                                    />
                                )}
                            />
                        </Box>

                        <Autocomplete
                            fullWidth
                            options={usersOptions}
                            getOptionLabel={(option) => option.full_name || option.name || ''}
                            value={usersOptions.find((u) => u.name === salesPerson) || null}
                            onChange={(e, nv) => setSalesPerson(nv ? nv.name : '')}
                            renderOption={(props, option) => {
                                const { key, ...optionProps } = props as any;
                                return (
                                    <Box component="li" key={key || option.name} {...optionProps} sx={{ display: 'block', py: 0.5 }}>
                                        <Stack spacing={0.2} sx={{ width: '100%' }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{option.full_name || option.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">ID: {option.name}</Typography>
                                        </Stack>
                                    </Box>
                                );
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Sales Person"
                                    required
                                    error={validationErrors.salesPerson}
                                />
                            )}
                        />

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                            <DatePicker
                                label="In Date"
                                value={inDate}
                                onChange={(nv) => {
                                    setInDate(nv);
                                    if (nv && nv.isValid()) {
                                        setMonth(nv.format('MMMM'));
                                        if (validationErrors.month) {
                                            setValidationErrors(prev => ({ ...prev, month: false }));
                                        }
                                    }
                                }}
                                slotProps={{ textField: { fullWidth: true } }}
                            />

                            <Autocomplete
                                fullWidth
                                options={MONTH_OPTIONS}
                                value={month}
                                onChange={(e, nv) => {
                                    setMonth(nv || '');
                                    if (nv && validationErrors.month) {
                                        setValidationErrors((prev) => ({ ...prev, month: false }));
                                    }
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Month"
                                        required
                                        error={validationErrors.month}
                                        helperText={validationErrors.month ? "Month is required" : ""}
                                    />
                                )}
                            />

                            <DatePicker
                                label="Out Date"
                                value={outDate}
                                onChange={(nv) => setOutDate(nv)}
                                slotProps={{ textField: { fullWidth: true } }}
                            />
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <Autocomplete
                                fullWidth
                                options={contactsOptions}
                                getOptionLabel={(option) => option.first_name || option.name || ''}
                                value={contactsOptions.find((c) => c.name === contactName) || null}
                                onChange={(e, nv) => {
                                    setContactName(nv ? nv.name : '');
                                    const newPhone = nv ? nv.phone || '' : '';
                                    setContactNumber(newPhone);
                                    if (validationErrors.contactName) {
                                        setValidationErrors((prev) => ({ ...prev, contactName: false }));
                                    }
                                    if (newPhone && validationErrors.contactNumber) {
                                        setValidationErrors((prev) => ({ ...prev, contactNumber: false }));
                                    }
                                }}
                                renderOption={(props, option) => {
                                    const { key, ...optionProps } = props as any;
                                    return (
                                        <Box component="li" key={key || option.name} {...optionProps}>
                                            <Stack spacing={0.2} sx={{ width: '100%' }}>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{option.first_name || option.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">ID: {option.name}</Typography>
                                            </Stack>
                                        </Box>
                                    );
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Client Name"
                                        required
                                        error={validationErrors.contactName}
                                        helperText={validationErrors.contactName ? "Client Name is required" : ""}
                                    />
                                )}
                            />
                            <MuiTelInput
                                fullWidth
                                defaultCountry="IN"
                                label="Contact Number"
                                required
                                error={validationErrors.contactNumber}
                                helperText={validationErrors.contactNumber ? "Contact Number is required" : ""}
                                value={contactNumber}
                                onChange={(newValue: string) => {
                                    setContactNumber(newValue);
                                    if (validationErrors.contactNumber) {
                                        setValidationErrors((prev) => ({ ...prev, contactNumber: false }));
                                    }
                                }}
                            />
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField
                                label="Industry"
                                fullWidth
                                value={industry}
                                onChange={(e) => setIndustry(e.target.value)}
                            />
                            <Autocomplete
                                fullWidth
                                freeSolo
                                handleHomeEndKeys
                                options={leadSourceOptions}
                                value={leadSourceOptions.find((s) => s.name === leadSource) || (leadSource ? { name: leadSource } : null)}
                                onChange={(e, nv) => {
                                    if (typeof nv === 'string') {
                                        setLeadSource(nv);
                                    } else if (nv && nv.isNew) {
                                        setNewLeadFromName(nv.inputValue);
                                        setCreateLeadFromOpen(true);
                                    } else {
                                        setLeadSource(nv ? nv.name : '');
                                    }
                                }}
                                filterOptions={(opts, params) => {
                                    const filtered = filter(opts, params) as any[];
                                    const { inputValue } = params;
                                    const isExisting = opts.some((option) => inputValue === option.name);

                                    if (inputValue !== '' && !isExisting) {
                                        filtered.push({
                                            inputValue,
                                            name: `+ Create "${inputValue}"`,
                                            isNew: true,
                                        });
                                    } else if (inputValue === '') {
                                        filtered.push({
                                            inputValue: '',
                                            name: '+ Create Lead Source',
                                            isNew: true,
                                        });
                                    }
                                    return filtered;
                                }}
                                getOptionLabel={(option: any) => {
                                    if (typeof option === 'string') return option;
                                    if (option.inputValue) return option.inputValue;
                                    return option.name || '';
                                }}
                                renderOption={(props, option: any) => {
                                    const { key, ...optionProps } = props as any;
                                    return (
                                        <Box
                                            component="li"
                                            key={key || (typeof option === 'string' ? option : option.name)}
                                            {...optionProps}
                                            sx={{
                                                typography: 'body2',
                                                ...(option.isNew && {
                                                    color: 'primary.main',
                                                    fontWeight: 600,
                                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                    borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                                    mt: 0.5,
                                                    '&:hover': {
                                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                                    }
                                                })
                                            }}
                                        >
                                            {option.isNew ? (
                                                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 0.5 }}>
                                                    <Iconify icon="solar:add-circle-bold" width={24} />
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                        {option.inputValue ? `Create "${option.inputValue}"` : 'Create Lead Source'}
                                                    </Typography>
                                                </Stack>
                                            ) : (
                                                option.name
                                            )}
                                        </Box>
                                    );
                                }}
                                renderInput={(params) => (
                                    <TextField {...params} label="Lead Source" />
                                )}
                            />
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <Autocomplete
                                fullWidth
                                freeSolo
                                handleHomeEndKeys
                                options={serviceOptions}
                                value={serviceOptions.find((s) => s.name === service) || (service ? { name: service } : null)}
                                onChange={(e, nv) => {
                                    if (typeof nv === 'string') {
                                        setService(nv);
                                    } else if (nv && nv.isNew) {
                                        setNewServiceName(nv.inputValue);
                                        setCreateServiceOpen(true);
                                    } else {
                                        setService(nv ? nv.name : '');
                                    }
                                }}
                                filterOptions={(opts, params) => {
                                    const filtered = filter(opts, params) as any[];
                                    const { inputValue } = params;
                                    const isExisting = opts.some((option) => inputValue === option.name);

                                    if (inputValue !== '' && !isExisting) {
                                        filtered.push({
                                            inputValue,
                                            name: `+ Create "${inputValue}"`,
                                            isNew: true,
                                        });
                                    } else if (inputValue === '') {
                                        filtered.push({
                                            inputValue: '',
                                            name: '+ Create Service',
                                            isNew: true,
                                        });
                                    }
                                    return filtered;
                                }}
                                getOptionLabel={(option: any) => {
                                    if (typeof option === 'string') return option;
                                    if (option.inputValue) return option.inputValue;
                                    return option.name || '';
                                }}
                                renderOption={(props, option: any) => {
                                    const { key, ...optionProps } = props as any;
                                    return (
                                        <Box
                                            component="li"
                                            key={key || (typeof option === 'string' ? option : option.name)}
                                            {...optionProps}
                                            sx={{
                                                typography: 'body2',
                                                ...(option.isNew && {
                                                    color: 'primary.main',
                                                    fontWeight: 600,
                                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                    borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                                    mt: 0.5,
                                                    '&:hover': {
                                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                                    }
                                                })
                                            }}
                                        >
                                            {option.isNew ? (
                                                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 0.5 }}>
                                                    <Iconify icon="solar:add-circle-bold" width={24} />
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                        {option.inputValue ? `Create "${option.inputValue}"` : 'Create Service'}
                                                    </Typography>
                                                </Stack>
                                            ) : (
                                                option.name
                                            )}
                                        </Box>
                                    );
                                }}
                                renderInput={(params) => (
                                    <TextField {...params} label="Service" />
                                )}
                            />
                            <Autocomplete
                                fullWidth
                                options={['GST', 'NGST']}
                                value={gstType}
                                onChange={(e, nv) => setGstType(nv as any || '')}
                                renderInput={(params) => (
                                    <TextField {...params} label="GST Type" />
                                )}
                            />
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                            <TextField
                                label="Value"
                                type="number"
                                required
                                fullWidth
                                value={value}
                                onChange={(e) => {
                                    const val = e.target.value !== '' ? Number(e.target.value) : '';
                                    setValue(val);
                                    if (typeof val === 'number' && val >= 1 && validationErrors.value) {
                                        setValidationErrors((prev) => ({ ...prev, value: false }));
                                    }
                                }}
                                error={Boolean(validationErrors.value)}
                                helperText={validationErrors.value ? "Value cannot be zero" : ""}
                            />
                            <TextField
                                label="Advance"
                                type="number"
                                fullWidth
                                value={advance}
                                onChange={(e) => setAdvance(e.target.value !== '' ? Number(e.target.value) : '')}
                            />
                            <TextField
                                label="Balance"
                                type="number"
                                fullWidth
                                InputProps={{
                                    readOnly: true,
                                }}
                                value={balance}
                            />
                        </Box>

                        <TextField
                            label="Remarks"
                            multiline
                            rows={3}
                            fullWidth
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <LoadingButton
                            onClick={handleSaveEntry}
                            variant="contained"
                            loading={creating}
                        >
                            {isEdit ? 'Update' : 'Create'}
                        </LoadingButton>
                    </DialogActions>
                </Dialog>

                {/* View Details Dialog */}
                <SalesTargetEntryDetailsDialog
                    open={openView}
                    onClose={() => setOpenView(false)}
                    entry={currentEntry}
                />

                {/* Delete Confirmation */}
                <ConfirmDialog
                    open={confirmDelete.open}
                    onClose={() => {
                        if (!deleting) {
                            setConfirmDelete({ open: false, id: null });
                        }
                    }}
                    isLoading={deleting}
                    title="Delete Entry"
                    content="Are you sure you want to delete this sales target entry?"
                    action={
                        <LoadingButton
                            variant="contained"
                            color="error"
                            loading={deleting}
                            onClick={handleDeleteEntry}
                        >
                            Delete
                        </LoadingButton>
                    }
                />

                {/* Create Lead Source Dialog */}
                <Dialog
                    open={createLeadFromOpen}
                    onClose={() => {
                        if (!creatingLeadFrom) {
                            setCreateLeadFromOpen(false);
                            setNewLeadFromName('');
                            setLeadSource('');
                        }
                    }}
                    fullWidth
                    maxWidth="xs"
                    PaperProps={{ sx: { borderRadius: 2 } }}
                >
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>Create Lead Source</Typography>
                        <IconButton
                            onClick={() => {
                                if (!creatingLeadFrom) {
                                    setCreateLeadFromOpen(false);
                                    setNewLeadFromName('');
                                    setLeadSource('');
                                }
                            }}
                            sx={{ color: 'text.secondary' }}
                        >
                            <Iconify icon="mingcute:close-line" />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent sx={{ px: 3, pb: 2, pt: 1 }}>
                        <TextField
                            fullWidth
                            label="Lead Source"
                            value={newLeadFromName}
                            onChange={(e) => setNewLeadFromName(e.target.value)}
                            required
                            autoFocus
                            sx={{ mt: 1 }}
                        />
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button
                            variant="contained"
                            onClick={handleCreateLeadFromSubmit}
                            disabled={creatingLeadFrom || !newLeadFromName.trim()}
                            sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' }, borderRadius: 1 }}
                        >
                            {creatingLeadFrom ? <CircularProgress size={24} color="inherit" /> : 'Create'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Create Service Dialog */}
                <Dialog
                    open={createServiceOpen}
                    onClose={() => {
                        if (!creatingService) {
                            setCreateServiceOpen(false);
                            setNewServiceName('');
                            setService('');
                        }
                    }}
                    fullWidth
                    maxWidth="xs"
                    PaperProps={{ sx: { borderRadius: 2 } }}
                >
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>Create Service</Typography>
                        <IconButton
                            onClick={() => {
                                if (!creatingService) {
                                    setCreateServiceOpen(false);
                                    setNewServiceName('');
                                    setService('');
                                }
                            }}
                            sx={{ color: 'text.secondary' }}
                        >
                            <Iconify icon="mingcute:close-line" />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent sx={{ px: 3, pb: 2, pt: 1 }}>
                        <TextField
                            fullWidth
                            label="Service Name"
                            value={newServiceName}
                            onChange={(e) => setNewServiceName(e.target.value)}
                            required
                            autoFocus
                            sx={{ mt: 1 }}
                        />
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button
                            variant="contained"
                            onClick={handleCreateServiceSubmit}
                            disabled={creatingService || !newServiceName.trim()}
                            sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' }, borderRadius: 1 }}
                        >
                            {creatingService ? <CircularProgress size={24} color="inherit" /> : 'Create'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </DashboardContent>
        </LocalizationProvider>
    );
}
