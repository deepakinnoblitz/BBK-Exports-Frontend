import { MuiTelInput } from 'mui-tel-input';
import { useLocation } from 'react-router-dom';
import { IoMdCloudDownload } from "react-icons/io";
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { IconButton } from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { getFriendlyErrorMessage } from 'src/utils/error-handler';

import { DashboardContent } from 'src/layouts/dashboard';
import locationData from 'src/assets/data/location_data.json';
import { fetchAccounts, createAccount, updateAccount, deleteAccount, getAccountPermissions } from 'src/api/accounts';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { useAuth } from 'src/auth/auth-context';

import { TableNoData } from '../../lead/table-no-data';
import { AccountTableRow } from '../account-table-row';
import { TableEmptyRows } from '../../lead/table-empty-rows';
import { AccountImportDialog } from '../account-import-dialog';
import { AccountTableFiltersDrawer } from '../account-table-filters-drawer';
import { LeadTableHead as AccountTableHead } from '../../lead/lead-table-head';
import { AccountDetailsDialog } from '../../report/account/account-details-dialog';
import { LeadTableToolbar as AccountTableToolbar } from '../../lead/lead-table-toolbar';

// ----------------------------------------------------------------------

export function AccountView() {
    const { user } = useAuth();
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [filters, setFilters] = useState({
        country: 'all',
        state: 'all',
        city: 'all',
    });
    const [sortBy, setSortBy] = useState('modified_desc');
    const [total, setTotal] = useState(0);
    const [selected, setSelected] = useState<string[]>([]);
    const [openFilters, setOpenFilters] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);
    const [openImport, setOpenImport] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [currentAccount, setCurrentAccount] = useState<any>(null);
    const [viewMode, setViewMode] = useState(false);
    const [openView, setOpenView] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
    const [creating, setCreating] = useState(false);

    const location = useLocation();

    useEffect(() => {
        if (location.state?.openAccountId) {
            setCurrentAccount({ name: location.state.openAccountId });
            setOpenView(true);
        }
    }, [location.state]);

    // Form state
    const [accountName, setAccountName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [website, setWebsite] = useState('');
    const [gstin, setGstin] = useState('');
    const [country, setCountry] = useState('');
    const [state, setState] = useState('');
    const [city, setCity] = useState('');

    const [countryOptions, setCountryOptions] = useState<string[]>([]);
    const [stateOptions, setStateOptions] = useState<string[]>([]);
    const [cityOptions, setCityOptions] = useState<string[]>([]);
    // Filter-specific location options
    const [filterStateOptions, setFilterStateOptions] = useState<string[]>([]);
    const [filterCityOptions, setFilterCityOptions] = useState<string[]>([]);

    // Permissions
    const [permissions, setPermissions] = useState({ read: false, write: false, delete: false });

    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.company;
    const displayCreate = hasCustomPerms ? !!user?.permissions?.actions?.company?.create : permissions.write;
    const displayImport = hasCustomPerms ? !!user?.permissions?.actions?.company?.import : permissions.write;

    // Snackbar state
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    // Validation State
    const [validationErrors, setValidationErrors] = useState<{ [key: string]: boolean }>({});

    const loadPermissions = useCallback(async () => {
        try {
            const perms = await getAccountPermissions();
            setPermissions(perms);
        } catch (error) {
            console.error('Failed to load permissions', error);
        }
    }, []);

    const loadAccounts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchAccounts({
                page: page + 1,
                page_size: rowsPerPage,
                search: filterName,
                filterValues: filters,
                sort_by: sortBy,
            });
            setAccounts(res.data || []);
            setTotal(res.total || 0);
        } catch (error) {
            console.error('Failed to fetch accounts', error);
            setAccounts([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, filterName, filters, sortBy]);

    const handleFilters = (update: any) => {
        setFilters((prev) => ({ ...prev, ...update }));
        setPage(0);
    };

    const handleResetFilters = () => {
        setFilters({
            country: 'all',
            state: 'all',
            city: 'all',
        });
        setPage(0);
    };

    const canReset =
        filters.country !== 'all' ||
        filters.state !== 'all' ||
        filters.city !== 'all' ||
        !!filterName;

    useEffect(() => {
        loadPermissions();
    }, [loadPermissions]);

    useEffect(() => {
        loadAccounts();
    }, [loadAccounts]);

    useEffect(() => {
        // Populate Country Options from local JSON (remove duplicates)
        const countries = Array.from(new Set(locationData.map((c: any) => c.country)));
        setCountryOptions(["", ...countries]);
    }, []);

    // Fetch States when Country changes
    useEffect(() => {
        if (country) {
            const countryData = locationData.find((c: any) => c.country === country);
            if (countryData) {
                const states = countryData.states.map((s: any) => s.name);
                setStateOptions(["", ...states, "Others"]);
            } else {
                setStateOptions([]);
            }
        } else {
            setStateOptions([]);
            setCityOptions([]);
        }
    }, [country]);

    // Fetch Cities when State changes
    useEffect(() => {
        if (state && country) {
            if (state === 'Others') {
                setCityOptions(['Others']);
            } else {
                const countryData = locationData.find((c: any) => c.country === country);
                if (countryData) {
                    const stateData = countryData.states.find((s: any) => s.name === state);
                    if (stateData) {
                        setCityOptions(["", ...stateData.cities, "Others"]);
                    } else {
                        setCityOptions(["Others"]);
                    }
                }
            }
        } else {
            setCityOptions([]);
        }
    }, [state, country]);

    // Update filter state options when filter country changes
    useEffect(() => {
        if (filters.country && filters.country !== 'all') {
            const countryData = locationData.find((c: any) => c.country === filters.country);
            if (countryData) {
                const states = countryData.states.map((s: any) => s.name);
                setFilterStateOptions([...states, "Others"]);
            } else {
                setFilterStateOptions([]);
            }
        } else {
            setFilterStateOptions([]);
        }
    }, [filters.country]);

    // Update filter city options when filter state changes
    useEffect(() => {
        if (filters.state && filters.state !== 'all' && filters.country && filters.country !== 'all') {
            if (filters.state === 'Others') {
                setFilterCityOptions(['Others']);
            } else {
                const countryData = locationData.find((c: any) => c.country === filters.country);
                if (countryData) {
                    const stateData = countryData.states.find((s: any) => s.name === filters.state);
                    if (stateData) {
                        setFilterCityOptions([...stateData.cities, "Others"]);
                    } else {
                        setFilterCityOptions(["Others"]);
                    }
                }
            }
        } else {
            setFilterCityOptions([]);
        }
    }, [filters.state, filters.country]);

    const handleOpenCreate = () => {
        setIsEdit(false);
        setViewMode(false);
        setCurrentAccount(null);
        setAccountName('');
        setPhoneNumber('');
        setWebsite('');
        setGstin('');
        setCountry('');
        setState('');
        setCity('');
        setValidationErrors({});
        setOpenCreate(true);
    };

    const handleCloseCreate = () => {
        setOpenCreate(false);
        setValidationErrors({}); // Clear errors
        setIsEdit(false);
        setViewMode(false);
        setCurrentAccount(null);
        setAccountName('');
        setPhoneNumber('');
        setWebsite('');
        setGstin('');
        setCountry('');
        setState('');
        setCity('');
    };

    const handleOpenImport = () => {
        setOpenImport(true);
    };

    const handleCloseImport = () => {
        setOpenImport(false);
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const handleDeleteRow = useCallback((id: string) => {
        setConfirmDelete({ open: true, id });
    }, []);

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        try {
            await deleteAccount(confirmDelete.id);
            setSnackbar({ open: true, message: 'Company deleted successfully', severity: 'success' });
            loadAccounts();
        } catch (error: any) {
            console.error(error);
            const friendlyMsg = getFriendlyErrorMessage(error);
            setSnackbar({ open: true, message: friendlyMsg, severity: 'error' });
        } finally {
            setConfirmDelete({ open: false, id: null });
        }
    };

    const handleBulkDelete = async () => {
        try {
            await Promise.all(selected.map((id) => deleteAccount(id)));
            setSnackbar({ open: true, message: `${selected.length} Company deleted successfully`, severity: 'success' });
            setSelected([]);
            loadAccounts();
        } catch (e: any) {
            console.error(e);
            const friendlyMsg = getFriendlyErrorMessage(e);
            setSnackbar({ open: true, message: friendlyMsg, severity: 'error' });
        }
    };

    const handleSelectAllRows = (checked: boolean, ids: string[]) => {
        if (checked) {
            setSelected(ids);
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

    const handleCreate = async () => {

        // Validation
        const newErrors: { [key: string]: boolean } = {};
        const missingFields: string[] = [];

        if (!accountName) {
            newErrors.accountName = true;
            missingFields.push('Company Name');
        }
        if (!phoneNumber) {
            newErrors.phoneNumber = true;
            missingFields.push('Phone Number');
        }

        if (Object.keys(newErrors).length > 0) {
            setValidationErrors(newErrors);
            setSnackbar({
                open: true,
                message: `Please fill in mandatory fields: ${missingFields.join(', ')}`,
                severity: 'error'
            });
            return;
        }

        // Clear errors if validation passes
        setValidationErrors({});

        // Format phone number: remove spaces and add hyphen after dial code (e.g., +91-9876543210)
        let formattedPhone = phoneNumber.replace(/\s/g, '');
        const parts = phoneNumber.trim().split(/\s+/);
        if (parts.length > 1 && parts[0].startsWith('+')) {
            formattedPhone = `${parts[0]}-${parts.slice(1).join('')}`;
        }

        const data = {
            account_name: accountName,
            phone_number: formattedPhone,
            website,
            gstin,
            country,
            state,
            city,
        };

        try {
            setCreating(true);
            if (isEdit && currentAccount) {
                await updateAccount(currentAccount.name, data);
                setSnackbar({ open: true, message: 'Company updated successfully', severity: 'success' });
            } else {
                await createAccount(data);
                setSnackbar({ open: true, message: 'Company created successfully', severity: 'success' });
            }
            handleCloseCreate();
            loadAccounts();
        } catch (error: any) {
            const friendlyMsg = getFriendlyErrorMessage(error);
            setSnackbar({ open: true, message: friendlyMsg, severity: 'error' });
        } finally {
            setCreating(false);
        }
    };

    const cleanPhoneNumber = (val: string) => {
        if (!val) return '';
        // If it contains a hyphen after the plus and dial code, replace it with a space for MuiTelInput
        // e.g., +91-9876543210 -> +91 9876543210
        if (val.startsWith('+') && val.includes('-')) {
            return val.replace('-', ' ');
        }
        return val;
    };

    const handleEditRow = useCallback((id: string) => {
        const row = accounts.find((item: any) => item.name === id);
        if (row) {
            setCurrentAccount(row);
            setValidationErrors({}); // Clear errors
            setAccountName(row.account_name || '');
            setPhoneNumber(cleanPhoneNumber(row.phone_number || ''));
            setWebsite(row.website || '');
            setGstin(row.gstin || '');
            setCountry(row.country || '');
            setState(row.state || '');
            setCity(row.city || '');
            setIsEdit(true);
            setViewMode(false);
            setOpenCreate(true);
        }
    }, [accounts]);

    const handleViewRow = useCallback((row: any) => {
        setCurrentAccount(row);
        setOpenView(true);
    }, []);

    const onChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const onChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleFilterByName = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFilterName(event.target.value);
        setPage(0);
    };

    const notFound = !loading && !accounts.length && (!!filterName || canReset);
    const empty = !loading && !accounts.length && !filterName && !canReset;

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Box display="flex" alignItems="center" mb={5}>
                <Typography variant="h4" flexGrow={1}>
                    Company
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {displayImport && (
                        <Button
                            variant="contained"
                            startIcon={<IoMdCloudDownload size={20} />}
                            onClick={handleOpenImport}
                            sx={{ bgcolor: '#02c281', color: 'common.white', '&:hover': { bgcolor: '#029f69' } }}
                        >
                            Import
                        </Button>
                    )}
                    {displayCreate && (
                        <Button
                            variant="contained"
                            startIcon={<Iconify icon="mingcute:add-line" />}
                            onClick={handleOpenCreate}
                            sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                        >
                            New Company
                        </Button>
                    )}
                </Box>
            </Box>

            <Card>
                <AccountTableToolbar
                    numSelected={selected.length}
                    filterName={filterName}
                    onFilterName={handleFilterByName}
                    searchPlaceholder="Search Company..."
                    onOpenFilter={() => setOpenFilters(true)}
                    canReset={canReset}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    onDelete={handleBulkDelete}
                    sortOptions={[
                        { value: 'modified_desc', label: 'Newest First' },
                        { value: 'modified_asc', label: 'Oldest First' },
                        { value: 'account_name_asc', label: 'Company Name: A to Z' },
                        { value: 'account_name_desc', label: 'Company Name: Z to A' },
                    ]}
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: 800, borderCollapse: 'collapse' }}>
                            <AccountTableHead
                                rowCount={total}
                                numSelected={selected.length}
                                onSelectAllRows={(checked: boolean) =>
                                    handleSelectAllRows(
                                        checked,
                                        accounts.map((row) => row.name)
                                    )
                                }
                                hideCheckbox
                                showIndex
                                headLabel={[
                                    { id: 'account_name', label: 'Company Name' },
                                    { id: 'phone_number', label: 'Phone Number' },
                                    { id: 'gstin', label: 'GSTIN' },
                                    { id: 'city', label: 'City' },
                                    { id: 'state', label: 'State' },
                                    { id: 'country', label: 'Country' },
                                    { id: 'actions', label: 'Actions', align: 'right' },
                                ]}
                            />
                             <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                                            <CircularProgress sx={{ color: '#059669' }} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {accounts.map((row, index) => (
                                            <AccountTableRow
                                                key={row.name}
                                                index={page * rowsPerPage + index}
                                                hideCheckbox
                                                row={{
                                                    id: row.name,
                                                    account_name: row.account_name,
                                                    phone_number: row.phone_number,
                                                    website: row.website,
                                                    gstin: row.gstin,
                                                    city: row.city,
                                                    state: row.state,
                                                    country: row.country,
                                                }}
                                                selected={selected.includes(row.name)}
                                                onSelectRow={() => handleSelectRow(row.name)}
                                                onView={() => handleViewRow(row)}
                                                onEdit={() => handleEditRow(row.name)}
                                                onDelete={() => handleDeleteRow(row.name)}
                                                canEdit={permissions.write}
                                                canDelete={permissions.delete}
                                            />
                                        ))}

                                        {notFound && <TableNoData searchQuery={filterName} />}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={8} sx={{py:10}}>
                                                    <EmptyContent
                                                        title="No Company found"
                                                        description="Create a new company to manage your business relationships."
                                                        icon="solar:buildings-bold-duotone"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        )}

                                    {!empty && !notFound && (
                                        <TableEmptyRows
                                            height={68}
                                            emptyRows={accounts.length < 5 ? 5 - accounts.length : 0}
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
                    page={page}
                    count={total}
                    rowsPerPage={rowsPerPage}
                    onPageChange={onChangePage}
                    rowsPerPageOptions={[10, 25, 50]}
                    onRowsPerPageChange={onChangeRowsPerPage}
                />
            </Card>

            <AccountTableFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
                options={{
                    countries: countryOptions.filter((c) => c !== ''),
                    states: filterStateOptions,
                    cities: filterCityOptions,
                }}
            />

            <Dialog open={openCreate} onClose={handleCloseCreate} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24, } }}>
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {viewMode ? 'Company Details' : isEdit ? 'Edit Company' : 'New Company'}
                    <IconButton
                        aria-label="close"
                        onClick={handleCloseCreate}
                        sx={{
                            color: (theme) => theme.palette.grey[500],
                        }}
                    >
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    <Box
                        sx={{
                            display: 'grid',
                            margin: '1rem',
                            columnGap: 2,
                            rowGap: 3,
                            gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
                        }}
                    >
                        <TextField
                            fullWidth
                            label="Company Name"
                            name="account_name"
                            value={accountName}
                            onChange={(e) => {
                                setAccountName(e.target.value);
                                if (e.target.value) setValidationErrors(prev => ({ ...prev, accountName: false }));
                            }}
                            required
                            error={!!validationErrors.accountName}
                            helperText={validationErrors.accountName ? 'Company Name is required' : ''}
                            disabled={viewMode}
                            placeholder="e.g. Acme Corp"
                        />

                        <MuiTelInput
                            fullWidth
                            defaultCountry="IN"
                            label="Phone Number"
                            name="phone_number"
                            value={phoneNumber}
                            disabled={viewMode}
                            onChange={(val) => {
                                setPhoneNumber(val);
                                if (val) setValidationErrors(prev => ({ ...prev, phoneNumber: false }));
                            }}
                            required
                            error={!!validationErrors.phoneNumber}
                            helperText={validationErrors.phoneNumber ? 'Phone Number is required' : ''}
                            sx={{
                                '& .MuiInputBase-input.Mui-disabled': {
                                    WebkitTextFillColor: 'inherit',
                                    color: 'inherit',
                                },
                            }}
                        />

                        <TextField
                            fullWidth
                            label="GSTIN"
                            name="gstin"
                            value={gstin}
                            onChange={(e) => setGstin(e.target.value)}
                            disabled={viewMode}
                            placeholder="e.g. 22AAAAA0000A1Z5"
                        />

                        <Autocomplete
                            fullWidth
                            disabled={viewMode}
                            options={countryOptions.filter(o => o !== '')}
                            value={country}
                            onChange={(e, newValue) => setCountry(newValue || '')}
                            renderInput={(params) => <TextField {...params} label="Country" />}
                        />

                        <Autocomplete
                            fullWidth
                            disabled={viewMode || !country}
                            options={stateOptions.filter(o => o !== '')}
                            value={state}
                            onChange={(e, newValue) => setState(newValue || '')}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="State"
                                    placeholder={!country ? "Select Country First" : ""}
                                    InputLabelProps={{ shrink: true }}
                                />
                            )}
                        />

                        <Autocomplete
                            fullWidth
                            disabled={viewMode || !state}
                            options={cityOptions.filter(o => o !== '')}
                            value={city}
                            onChange={(e, newValue) => setCity(newValue || '')}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="City"
                                    placeholder={!state ? "Select State First" : ""}
                                    InputLabelProps={{ shrink: true }}
                                />
                            )}
                        />

                        <TextField
                            fullWidth
                            label="Website"
                            name="website"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            disabled={viewMode}
                            placeholder="e.g. https://www.acme.com"
                            sx={{ gridColumn: { sm: 'span 2' } }}
                        />
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>

                    {!viewMode && (
                        <Button variant="contained" onClick={handleCreate} disabled={creating}>
                            {creating ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update' : 'Create')}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

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

            <AccountImportDialog
                open={openImport}
                onClose={handleCloseImport}
                onRefresh={loadAccounts}
            />

            <AccountDetailsDialog
                open={openView}
                onClose={() => {
                    setOpenView(false);
                }}
                accountId={currentAccount?.name}
                onEdit={() => handleEditRow(currentAccount?.name)}
                initialTab={location.state?.activeTab}
            />

            <ConfirmDialog
                open={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null })}
                title="Confirm Delete"
                content="Are you sure you want to delete this company?"
                action={
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleConfirmDelete}
                        sx={{ borderRadius: 1.5, minWidth: 100 }}
                    >
                        Delete
                    </Button>
                }
            />
        </DashboardContent>
    );
}
