import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { IoMdCloudDownload } from "react-icons/io";

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useContacts } from 'src/hooks/useContacts';

import { getString } from 'src/utils/string';
import { getFriendlyErrorMessage } from 'src/utils/error-handler';

import { CONFIG } from 'src/config-global';
import { getDoctypeList } from 'src/api/leads';
import { DashboardContent } from 'src/layouts/dashboard';
import locationData from 'src/assets/data/location_data.json';
import { createContact, updateContact, deleteContact, getContactPermissions } from 'src/api/contacts';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { useAuth } from 'src/auth/auth-context';

import { TableNoData } from '../../lead/table-no-data';
import { ContactTableRow } from '../contact-table-row';
import { ContactFormDialog } from '../contact-form-dialog';
import { TableEmptyRows } from '../../lead/table-empty-rows';
import { ContactImportDialog } from '../contact-import-dialog';
import { ContactTableFiltersDrawer } from '../contact-table-filters-drawer';
import { LeadTableHead as ContactTableHead } from '../../lead/lead-table-head';
import { ContactDetailsDialog } from '../../report/contact/contact-details-dialog';
import { LeadTableToolbar as ContactTableToolbar } from '../../lead/lead-table-toolbar';

// ----------------------------------------------------------------------

const CONTACT_SORT_OPTIONS = [
    { value: 'modified_desc', label: 'Newest First' },
    { value: 'modified_asc', label: 'Oldest First' },
    { value: 'first_name_asc', label: 'Name: A to Z' },
    { value: 'first_name_desc', label: 'Name: Z to A' },
    { value: 'company_name_asc', label: 'Company: A to Z' },
    { value: 'company_name_desc', label: 'Company: Z to A' },
];

export function ContactView() {
    const { user } = useAuth();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [filters, setFilters] = useState({
        customer_type: 'all',
        source_lead: 'all',
        country: 'all',
        state: 'all',
        city: 'all',
    });
    const [sortBy, setSortBy] = useState('modified_desc');
    const [selected, setSelected] = useState<string[]>([]);
    const [openFilters, setOpenFilters] = useState(false);

    const [openCreate, setOpenCreate] = useState(false);
    const [currentContactId, setCurrentContactId] = useState<string | null>(null);
    const [openView, setOpenView] = useState(false);
    const [openImport, setOpenImport] = useState(false);

    const location = useLocation();

    useEffect(() => {
        if (location.state?.openContactId) {
            setCurrentContactId(location.state.openContactId);
            setOpenView(true);
        }
    }, [location.state]);

    const [countryOptions, setCountryOptions] = useState<string[]>([]);
    const [stateOptions, setStateOptions] = useState<string[]>([]);
    const [cityOptions, setCityOptions] = useState<string[]>([]);
    const [leadOptions, setLeadOptions] = useState<{ name: string; lead_name: string }[]>([]);

    const [country, setCountry] = useState('');
    const [state, setState] = useState('');
    const [city, setCity] = useState('');

    // Filter-specific location options
    const [filterStateOptions, setFilterStateOptions] = useState<string[]>([]);
    const [filterCityOptions, setFilterCityOptions] = useState<string[]>([]);

    const [creating, setCreating] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [designation, setDesignation] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [contactType, setContactType] = useState('Sales');
    const [sourceLead, setSourceLead] = useState('');

    // Alert & Dialog State
    const [openDelete, setOpenDelete] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    // Permissions State
    const [permissions, setPermissions] = useState<{ read: boolean; write: boolean; delete: boolean }>({
        read: true,
        write: true,
        delete: true,
    });

    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.clients;
    const displayCreate = hasCustomPerms ? !!user?.permissions?.actions?.clients?.create : permissions.write;
    const displayImport = hasCustomPerms ? !!user?.permissions?.actions?.clients?.import : permissions.write;

    const { data, total, loading, refetch } = useContacts(
        page + 1,
        rowsPerPage,
        filterName,
        filters,
        sortBy
    );

    const handleFilters = (update: any) => {
        setFilters((prev) => ({ ...prev, ...update }));
        setPage(0);
    };

    const handleResetFilters = () => {
        setFilters({
            customer_type: 'all',
            source_lead: 'all',
            country: 'all',
            state: 'all',
            city: 'all',
        });
        setPage(0);
    };

    const canReset =
        filters.customer_type !== 'all' ||
        filters.source_lead !== 'all' ||
        filters.country !== 'all' ||
        filters.state !== 'all' ||
        filters.city !== 'all' ||
        !!filterName;

    useEffect(() => {
        getContactPermissions().then(setPermissions);

        // Populate Country Options from local JSON for filters
        const countries = Array.from(new Set(locationData.map((c: any) => c.country)));
        setCountryOptions(["", ...countries]);

        // Fetch Leads for dropdown
        getDoctypeList('Lead', ['name', 'lead_name']).then(setLeadOptions).catch(console.error);
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

    // Validation State
    const [validationErrors, setValidationErrors] = useState<{ [key: string]: boolean }>({});

    const handleOpenCreate = () => {
        setCurrentContactId(null);
        setOpenCreate(true);
    };

    const handleCloseCreate = () => {
        setOpenCreate(false);
        setCurrentContactId(null);
    };

    const handleCloseSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
        setOpenDelete(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteContact(deleteId);
            setSnackbar({ open: true, message: 'Clients deleted successfully', severity: 'success' });
            await refetch();
        } catch (e: any) {
            console.error(e);
            const friendlyMsg = getFriendlyErrorMessage(e);
            setSnackbar({ open: true, message: friendlyMsg, severity: 'error' });
        } finally {
            setOpenDelete(false);
            setDeleteId(null);
        }
    };

    const handleBulkDelete = async () => {
        try {
            await Promise.all(selected.map((id) => deleteContact(id)));
            setSnackbar({ open: true, message: `${selected.length} contacts deleted successfully`, severity: 'success' });
            setSelected([]);
            await refetch();
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

        if (!firstName) {
            newErrors.firstName = true;
            missingFields.push('Name');
        }
        if (!email) {
            newErrors.email = true;
            missingFields.push('Email');
        }
        if (!phone) {
            newErrors.phone = true;
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

        try {
            setCreating(true);

            // Format phone number: remove spaces and add hyphen after dial code (e.g., +91-9876543210)
            let formattedPhone = phone.replace(/\s/g, '');
            const parts = phone.trim().split(/\s+/);
            if (parts.length > 1 && parts[0].startsWith('+')) {
                formattedPhone = `${parts[0]}-${parts.slice(1).join('')}`;
            }

            const contactData = {
                first_name: firstName,
                company_name: companyName,
                email,
                phone: formattedPhone,
                designation,
                address,
                notes,
                country,
                state,
                city,
                customer_type: contactType,
                source_lead: sourceLead,
            };

            if (currentContactId) {
                await updateContact(currentContactId, contactData);
                setSnackbar({ open: true, message: 'Clients updated successfully', severity: 'success' });
            } else {
                await createContact(contactData);
                setSnackbar({ open: true, message: 'Clients created successfully', severity: 'success' });
            }

            await refetch();
            handleCloseCreate();
            await refetch();
            handleCloseCreate();
        } catch (err: any) {
            console.error(err);
            const friendlyMsg = getFriendlyErrorMessage(err);
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

    const handleEditRow = (id: string) => {
        setCurrentContactId(id);
        setOpenCreate(true);
    };

    const handleViewRow = (id: string) => {
        setCurrentContactId(id);
        setOpenView(true);
    };

    const onChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const onChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const notFound = !loading && !data.length && (!!filterName || canReset);
    const empty = !loading && !data.length && !filterName && !canReset;

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ flexGrow: 1 }}>
                    Clients
                </Typography>

                {(displayImport || displayCreate) && (
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        {displayImport && (
                            <Button
                                variant="contained"
                                startIcon={<IoMdCloudDownload size={20} />}
                                onClick={() => setOpenImport(true)}
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
                                New Client
                            </Button>
                        )}
                    </Box>
                )}
            </Box>

            <Card>
                <ContactTableToolbar
                    numSelected={selected.length}
                    filterName={filterName}
                    onFilterName={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setFilterName(e.target.value);
                        setPage(0);
                    }}
                    searchPlaceholder="Search Clients..."
                    onOpenFilter={() => setOpenFilters(true)}
                    canReset={canReset}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    onDelete={handleBulkDelete}
                    sortOptions={CONTACT_SORT_OPTIONS}
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: 800, borderCollapse: 'collapse' }}>
                            <ContactTableHead
                                rowCount={total}
                                numSelected={selected.length}
                                onSelectAllRows={(checked: boolean) =>
                                    handleSelectAllRows(
                                        checked,
                                        data.map((row) => row.name)
                                    )
                                }
                                hideCheckbox
                                showIndex
                                headLabel={[
                                    { id: 'name', label: 'Name' },
                                    { id: 'company', label: 'Company' },
                                    { id: 'sourceLead', label: 'Source Lead' },
                                    { id: 'phone', label: 'Phone' },
                                    { id: 'email', label: 'Email' },
                                    { id: 'actions', label: 'Actions', align: 'right' },
                                ]}
                            />

                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={10} align="center" sx={{ py: 10 }}>
                                            <CircularProgress sx={{ color: '#059669' }} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {data.map((row, index) => (
                                            <ContactTableRow
                                                key={row.name}
                                                index={page * rowsPerPage + index}
                                                hideCheckbox
                                                row={{
                                                    id: row.name,
                                                    firstName: row.first_name,
                                                    companyName: getString(row.company_name) || '',
                                                    companyNames: row.company_names || [],
                                                    email: getString(row.email) || '',
                                                    phone: getString(row.phone) || '',
                                                    avatarUrl: `${CONFIG.assetsDir}/images/avatar/avatar-25.webp`,
                                                    sourceLeadId: row.source_lead ? getString(row.source_lead) : '',
                                                    sourceLeadName: row.source_lead ? (leadOptions.find(l => l.name === getString(row.source_lead))?.lead_name || '') : '',
                                                }}
                                                selected={selected.includes(row.name)}
                                                onSelectRow={() => handleSelectRow(row.name)}
                                                onView={() => handleViewRow(row.name)}
                                                onEdit={() => handleEditRow(row.name)}
                                                onDelete={() => handleDeleteClick(row.name)}
                                                canEdit={permissions.write}
                                                canDelete={permissions.delete}
                                            />
                                        ))}

                                        {notFound && <TableNoData searchQuery={filterName} />}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={10} sx={{py:10}}>
                                                    <EmptyContent
                                                        title="No contacts found"
                                                        description="Create a new Client to track your professional network."
                                                        icon="solar:users-group-rounded-bold-duotone"
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

            <ContactTableFiltersDrawer
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
                    source_leads: leadOptions,
                }}
            />

            {/* CREATE/EDIT DIALOG */}
            <ContactFormDialog
                open={openCreate}
                onClose={handleCloseCreate}
                contactId={currentContactId}
                onSuccess={refetch}
            />

            {/* DELETE CONFIRMATION */}
            <ConfirmDialog
                open={openDelete}
                onClose={() => setOpenDelete(false)}
                title="Confirm Delete"
                content="Are you sure you want to delete this Clients?"
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

            <ContactImportDialog
                open={openImport}
                onClose={() => setOpenImport(false)}
                onRefresh={refetch}
            />

            <ContactDetailsDialog
                open={openView}
                onClose={() => {
                    setOpenView(false);
                }}
                contactId={currentContactId}
                onEdit={handleEditRow}
                initialTab={location.state?.activeTab}
            />
        </DashboardContent>
    );
}
