import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import { IoList } from "react-icons/io5";
import { RiMailSendLine } from "react-icons/ri";
import { useSearchParams } from 'react-router-dom';
import { TbLayoutKanbanFilled } from "react-icons/tb";
import { useState, useEffect, useCallback } from 'react';
import { GrDocumentTime, GrDocumentStore } from "react-icons/gr";
import { HiOutlineBriefcase, HiOutlineDocumentPlus, HiOutlineDocumentCheck } from "react-icons/hi2";

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { IconButton } from '@mui/material';
import { alpha } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useRouter } from 'src/routes/hooks';

import { useDeals } from 'src/hooks/useDeals';

import { getFriendlyErrorMessage } from 'src/utils/error-handler';

import { CONFIG } from 'src/config-global';
import { uploadFile } from 'src/api/data-import';
import { DashboardContent } from 'src/layouts/dashboard';
import { createDeal, updateDeal, deleteDeal, getDealPermissions } from 'src/api/deals';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { useAuth } from 'src/auth/auth-context';

import { DealTableRow } from '../deal-table-row';
import { TableNoData } from '../../lead/table-no-data';
import DealKanbanBoard from '../kanban/deal-kanban-board';
import { TableEmptyRows } from '../../lead/table-empty-rows';
import { DealTableFiltersDrawer } from '../deal-table-filters-drawer';
import { LeadTableHead as DealTableHead } from '../../lead/lead-table-head';
import { EstimationListView } from '../../estimation/view/estimation-list-view';
import { InvoiceManagementView } from '../../invoice/view/invoice-management-view';
import { LeadTableToolbar as DealTableToolbar } from '../../lead/lead-table-toolbar';

// ----------------------------------------------------------------------

export function DealView() {
    const router = useRouter();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentTab = searchParams.get('tab') || 'deals';

    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned;
    
    // Prospects/Deals
    const displayCreate = hasCustomPerms && user?.permissions?.actions?.prospects ? !!user?.permissions?.actions?.prospects?.create : true;
    const displayView = hasCustomPerms && user?.permissions?.actions?.prospects ? !!user?.permissions?.actions?.prospects?.view : true;

    // Estimations & Invoices specific perms
    const displayEstimationView = hasCustomPerms && user?.permissions?.actions?.estimation ? !!user?.permissions?.actions?.estimation?.view : true;
    const displayInvoiceView = hasCustomPerms && user?.permissions?.actions?.invoice ? !!user?.permissions?.actions?.invoice?.view : true;

    const handleChangeTab = useCallback(
        (event: React.SyntheticEvent, newValue: string) => {
            setSearchParams({ tab: newValue });
        },
        [setSearchParams]
    );

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [filterStage, setFilterStage] = useState('all');
    const [filters, setFilters] = useState({
        type: 'all',
        contact: 'all',
        account: 'all',
        source_lead: 'all',
        stage: 'all',
    });
    const [openFilters, setOpenFilters] = useState(false);
    const [sortBy, setSortBy] = useState('modified_desc');
    const [selected, setSelected] = useState<string[]>([]);

    const STAGE_OPTIONS = [
        { value: 'Just In', label: 'Just In' },
        { value: 'Working', label: 'Working' },
        { value: 'Proposal Sent', label: 'Proposal Sent' },
        { value: 'Estimation Created', label: 'Estimation Created' },
        { value: 'Estimation Sent', label: 'Estimation Sent' },
        { value: 'Invoice Created', label: 'Invoice Created' },
        { value: 'Invoice Sent', label: 'Invoice Sent' },
        { value: 'Special Approval', label: 'Special Approval' },
        { value: 'Project Started', label: 'Project Started' },
        { value: 'Closed', label: 'Closed' },
    ];

    const STATUS_OPTIONS = [
        { value: 'Draft', label: 'Draft' },
        { value: 'Sent', label: 'Sent' },
        { value: 'Approved', label: 'Approved' },
        { value: 'Rejected', label: 'Rejected' },
        { value: 'Expired', label: 'Expired' },
    ];

    const [openCreate, setOpenCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [currentDealId, setCurrentDealId] = useState<string | null>(null);
    const [currentProposalId, setCurrentProposalId] = useState<string | null>(null);
    const [viewOnly, setViewOnly] = useState(false);
    const [DealviewMode, setDealViewMode] = useState<'deallist' | 'dealkanban'>('deallist');



    // Form state
    const [dealTitle, setDealTitle] = useState('');
    const [account, setAccount] = useState('');
    const [contact, setContact] = useState('');
    const [value, setValue] = useState<number | string>('');
    const [expectedCloseDate, setExpectedCloseDate] = useState<Dayjs | null>(null);
    const [stage, setStage] = useState('Just In');
    const [probability, setProbability] = useState<number | string>('');
    const [dealType, setDealType] = useState('New Business');
    const [sourceLead, setSourceLead] = useState('');
    const [nextStep, setNextStep] = useState('');
    const [notes, setNotes] = useState('');
    const [attachments, setAttachments] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);

    // Dropdown Options
    const [accountOptions, setAccountOptions] = useState<any[]>([]);
    const [contactOptions, setContactOptions] = useState<any[]>([]);
    const [formContactOptions, setFormContactOptions] = useState<any[]>([]);

    // Alert & Dialog State
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });

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

    // Validation State
    const [validationErrors, setValidationErrors] = useState<{ [key: string]: boolean }>({});

    const { data, total, loading, refetch } = useDeals(
        page,
        rowsPerPage,
        filterName,
        filterStage,
        sortBy,
        filters
    );

    const handleFilters = (update: any) => {
        setFilters((prev) => ({ ...prev, ...update }));
        setPage(0);
    };

    const handleResetFilters = () => {
        setFilters({
            type: 'all',
            contact: 'all',
            account: 'all',
            source_lead: 'all',
            stage: 'all',
        });
        setPage(0);
    };

    const canReset =
        filters.type !== 'all' ||
        filters.contact !== 'all' ||
        filters.account !== 'all' ||
        filters.source_lead !== 'all' ||
        filters.stage !== 'all' ||
        !!filterName;

    const SOURCE_LEAD_OPTIONS = [
        'Advertisement', 'Cold Call', 'Employee Referral', 'External Referral', 'Online Store',
        'Website', 'Social Media', 'Email Campaign', 'Walk In', 'Trade Show / Event',
        'Partner', 'Distributor', 'Telemarketing', 'Existing Customer', 'Repeat Customer',
        'Direct Mail', 'Marketplace', 'Google Ads', 'Facebook / Instagram Ads', 'LinkedIn',
        'WhatsApp', 'Customer Support', 'Inbound Call', 'Outbound Call', 'Other'
    ];

    useEffect(() => {
        // Fetch dropdown options on mount - get full objects for filter drawer
        Promise.all([
            fetch('/api/method/frappe.client.get_list?doctype=Accounts&fields=["name","account_name"]&limit_page_length=999', { credentials: 'include' }),
            fetch('/api/method/frappe.client.get_list?doctype=Contacts&fields=["name","first_name"]&limit_page_length=999', { credentials: 'include' }),
        ]).then(async ([accountsRes, contactsRes]) => {
            const accounts = await accountsRes.json();
            const contacts = await contactsRes.json();

            setAccountOptions(accounts.message || []);
            setContactOptions(contacts.message || []);
        }).catch(err => console.error('Failed to fetch dropdown options', err));

        // Fetch Permissions
        getDealPermissions().then(setPermissions);
    }, []);

    useEffect(() => {
        if (account) {
            // Fetch contacts associated with this account (company)
            fetch(`/api/method/company.company.frontend_api.get_contacts_by_account?account_id=${encodeURIComponent(account)}&limit_start=0&limit_page_length=999`, { credentials: 'include' })
                .then(res => res.json())
                .then(resData => {
                    setFormContactOptions(resData.message?.contacts || []);
                })
                .catch(err => {
                    console.error('Failed to fetch contacts for account', err);
                    setFormContactOptions([]);
                });
        } else {
            // If no company selected, show all contacts
            setFormContactOptions(contactOptions);
        }
    }, [account, contactOptions]);

    const handleOpenCreate = (selectedStage?: any) => {
        setViewOnly(false);
        setCurrentDealId(null);
        setDealTitle('');
        setAccount('');
        setContact('');
        setValue('');
        setExpectedCloseDate(null);
        setStage(selectedStage && typeof selectedStage === 'string' ? selectedStage : 'Just In');
        setProbability('');
        setDealType('New Business');
        setSourceLead('');
        setNextStep('');
        setNotes('');
        setAttachments([]);
        setValidationErrors({});
        setOpenCreate(true);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Store the local file object
        setAttachments([file]);
    };

    const handleRemoveAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleCloseCreate = () => {
        setOpenCreate(false);
        setCurrentDealId(null);
        setViewOnly(false);
        setDealTitle('');
        setAccount('');
        setContact('');
        setValue('');
        setExpectedCloseDate(null);
        setStage('Just In');
        setProbability('');
        setDealType('New Business');
        setSourceLead('');
        setNextStep('');
        setNotes('');
        setAttachments([]);
        setValidationErrors({}); // Clear errors on close
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
            await deleteDeal(confirmDelete.id);
            setSnackbar({ open: true, message: 'Prospect deleted successfully', severity: 'success' });
            await refetch();
        } catch (e: any) {
            console.error(e);
            const friendlyMsg = getFriendlyErrorMessage(e);
            setSnackbar({ open: true, message: friendlyMsg, severity: 'error' });
        } finally {
            setConfirmDelete({ open: false, id: null });
        }
    };

    const handleBulkDelete = async () => {
        try {
            await Promise.all(selected.map((id) => deleteDeal(id)));
            setSnackbar({ open: true, message: `${selected.length} Prospects deleted successfully`, severity: 'success' });
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

        if (!dealTitle) {
            newErrors.dealTitle = true;
            missingFields.push('Prospect Title');
        }
        if (!account) {
            newErrors.account = true;
            missingFields.push('Company');
        }
        if (!contact) {
            newErrors.client = true;
            missingFields.push('Client');
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

        try {
            setCreating(true);

            const dealData = {
                deal_title: dealTitle,
                account,
                contact,
                value: Number(value),
                expected_close_date: expectedCloseDate ? expectedCloseDate.format('YYYY-MM-DD') : '',
                stage: stage as any,
                probability: probability ? Number(probability) : undefined,
                type: dealType as any,
                source_lead: sourceLead,
                next_step: nextStep,
                notes,
                attachments: '',
            };

            // Upload files if any
            if (attachments.length > 0 && attachments[0] instanceof File) {
                setUploading(true);
                try {
                    const uploaded = await uploadFile(attachments[0]);
                    dealData.attachments = uploaded.file_url;
                } catch (error: any) {
                    throw new Error(`File upload failed: ${error.message}`);
                } finally {
                    setUploading(false);
                }
            } else if (attachments.length > 0) {
                dealData.attachments = attachments[0].url || attachments[0];
            }

            if (currentDealId) {
                await updateDeal(currentDealId, dealData);
                setSnackbar({ open: true, message: 'Prospect updated successfully', severity: 'success' });
            } else {
                await createDeal(dealData);
                setSnackbar({ open: true, message: 'Prospect created successfully', severity: 'success' });
            }

            await refetch();
            handleCloseCreate();
        } catch (err: any) {
            console.error(err);
            const friendlyMsg = getFriendlyErrorMessage(err);
            setSnackbar({ open: true, message: friendlyMsg || (currentDealId ? 'Failed to update Prospect' : 'Failed to create Prospect'), severity: 'error' });
        } finally {
            setCreating(false);
        }
    };

    const handleEditRow = (id: string) => {
        setViewOnly(false);
        setCurrentDealId(id);

        const fullRow = data.find((item) => item.name === id);
        if (fullRow) {
            setDealTitle(fullRow.deal_title || '');
            setAccount(fullRow.account || '');
            setContact(fullRow.contact || '');
            setValue(fullRow.value || '');
            setExpectedCloseDate(fullRow.expected_close_date ? dayjs(fullRow.expected_close_date) : null);
            setStage(fullRow.stage || 'Just In');
            setProbability(fullRow.probability || '');
            setDealType(fullRow.type || 'New Business');
            setSourceLead(fullRow.source_lead || '');
            setNextStep(fullRow.next_step || '');
            setNotes(fullRow.notes || '');
            setAttachments(fullRow.attachments ? [fullRow.attachments] : []);
        }
        setOpenCreate(true);
    };



    const handleViewRow = (id: string) => {
        router.push(`/deals/${encodeURIComponent(id)}/view`);
    };

    const onChangePage = (_: unknown, newPage: number) => setPage(newPage);

    const onChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setPage(0);
    };

    const notFound = !loading && data.length === 0 && (!!filterName || filterStage !== 'all' || canReset);
    const empty = !loading && data.length === 0 && !filterName && filterStage === 'all' && !canReset;

    return (
        <>
            {/* CREATE DEAL DIALOG */}
            <Dialog open={openCreate} onClose={handleCloseCreate} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24, } }}>
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {viewOnly ? 'Prospect Details' : (currentDealId ? 'Edit Prospect' : 'New Prospect')}
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
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
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
                                label="Prospect Title"
                                value={dealTitle}
                                onChange={(e) => {
                                    setDealTitle(e.target.value);
                                    if (e.target.value) setValidationErrors(prev => ({ ...prev, dealTitle: false }));
                                }}
                                required
                                error={!!validationErrors.dealTitle}
                                helperText={validationErrors.dealTitle ? 'Prospect Title is required' : ''}
                                slotProps={{ input: { readOnly: viewOnly } }}
                            />

                            <Autocomplete
                                fullWidth
                                options={accountOptions}
                                value={accountOptions.find((a) => a.name === account) || null}
                                onChange={(event, newValue) => {
                                    setAccount(newValue?.name || '');
                                    setContact(''); // Reset client when company changes
                                    if (newValue) setValidationErrors((prev) => ({ ...prev, account: false }));
                                }}
                                getOptionLabel={(option) => option.account_name || option.name}
                                disabled={viewOnly}
                                renderOption={(props, option) => {
                                    const { key, ...optionProps } = props as any;
                                    return (
                                        <li key={key || option.name} {...optionProps}>
                                            <Box>
                                                <Typography variant="subtitle2" sx={{ fontSize: '14px' }}>
                                                    {option.account_name || option.name}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '12px' }}>
                                                    ID: {option.name}
                                                </Typography>
                                            </Box>
                                        </li>
                                    );
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Company"
                                        required
                                        error={!!validationErrors.account}
                                        helperText={validationErrors.account ? 'Company is required' : ''}
                                    />
                                )}
                            />

                            <Autocomplete
                                fullWidth
                                options={formContactOptions}
                                value={contactOptions.find((c) => c.name === contact) || null}
                                onChange={(event, newValue) => {
                                    setContact(newValue?.name || '');
                                    if (newValue?.name) {
                                        setValidationErrors(prev => ({ ...prev, client: false }));
                                    }
                                }}
                                getOptionLabel={(option) => option.first_name || option.name}
                                disabled={viewOnly}
                                renderOption={(props, option) => {
                                    const { key, ...optionProps } = props as any;
                                    return (
                                        <li key={key || option.name} {...optionProps}>
                                            <Box>
                                                <Typography variant="subtitle2">
                                                    {option.first_name || option.name}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '12px' }}>
                                                    ID: {option.name}
                                                </Typography>
                                            </Box>
                                        </li>
                                    );
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Client"
                                        required
                                        error={!!validationErrors.client}
                                        helperText={validationErrors.client ? 'Client is required' : ''}
                                    />
                                )}
                            />

                            <DatePicker
                                label="Expected Close Date"
                                value={expectedCloseDate}
                                onChange={(newValue) => setExpectedCloseDate(newValue)}
                                disabled={viewOnly}
                                slotProps={{
                                    textField: {
                                        fullWidth: true
                                    }
                                }}
                            />

                            <TextField
                                fullWidth
                                label="Notes"
                                multiline
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                sx={{ gridColumn: { sm: 'span 2' } }}
                                slotProps={{ input: { readOnly: viewOnly } }}
                            />

                        </Box>
                    </LocalizationProvider>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    {!viewOnly && (
                        <Button variant="contained" onClick={handleCreate} disabled={creating}>
                            {creating ? (currentDealId ? 'Updating...' : 'Creating...') : (currentDealId ? 'Update Prospect' : 'Create Prospect')}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* MAIN CONTENT */}
            <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
                <Stack spacing={3}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="h4">Prospects Management</Typography>
                    </Stack>

                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                        <Tabs
                            value={currentTab}
                            onChange={handleChangeTab}
                            sx={{
                                px: 0,
                                borderBottom: 1,
                                borderColor: 'divider',
                                '& .MuiTab-root': {
                                    minHeight: 48,
                                    fontWeight: 700,
                                    typography: 'subtitle2',
                                    marginRight: (theme) => theme.spacing(1),
                                    '&:last-of-type': {
                                        marginRight: 0,
                                    },
                                    '&.Mui-selected': { color: 'primary.main' },
                                },
                            }}
                        >
                            <Tab
                                key="deals"
                                value="deals"
                                label="Prospects"
                                icon={<HiOutlineBriefcase size={22} />}
                                iconPosition="start"
                            />

                            {displayEstimationView && (
                                <Tab
                                    key="estimations"
                                    value="estimations"
                                    label="Estimations"
                                    icon={<GrDocumentTime size={18} />}
                                    iconPosition="start"
                                />
                            )}
                            {displayInvoiceView && (
                                <Tab
                                    key="invoices"
                                    value="invoices"
                                    label="Invoices"
                                    icon={<GrDocumentStore size={18} />}
                                    iconPosition="start"
                                />
                            )}
                        </Tabs>

                        {currentTab === 'deals' && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{
                                    display: 'flex',
                                    p: 0.5,
                                    bgcolor: '#F4F6F8',
                                    borderRadius: '999px',
                                    border: (theme) => `1px solid ${theme.palette.divider}`,
                                }}>
                                    <Button
                                        disableRipple
                                        onClick={() => setDealViewMode('deallist')}
                                        startIcon={<IoList size={18} />}
                                        sx={{
                                            borderRadius: '999px',
                                            px: 2.5,
                                            py: 0.6,
                                            typography: 'subtitle2',
                                            fontWeight: 700,
                                            color: DealviewMode === 'deallist' ? 'common.white' : 'text.secondary',
                                            bgcolor: DealviewMode === 'deallist' ? '#059669' : 'transparent',
                                            boxShadow: DealviewMode === 'deallist' ? '0px 4px 10px rgba(8, 163, 205, 0.24)' : 'none',
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                bgcolor: DealviewMode === 'deallist' ? '#047857' : 'rgba(145, 158, 171, 0.08)',
                                                color: DealviewMode === 'deallist' ? 'common.white' : 'text.primary',
                                            }
                                        }}
                                    >
                                        List View
                                    </Button>
                                    <Button
                                        disableRipple
                                        onClick={() => setDealViewMode('dealkanban')}
                                        startIcon={<TbLayoutKanbanFilled size={18} />}
                                        sx={{
                                            borderRadius: '999px',
                                            px: 2.5,
                                            py: 0.6,
                                            typography: 'subtitle2',
                                            fontWeight: 700,
                                            color: DealviewMode === 'dealkanban' ? 'common.white' : 'text.secondary',
                                            bgcolor: DealviewMode === 'dealkanban' ? '#059669' : 'transparent',
                                            boxShadow: DealviewMode === 'dealkanban' ? '0px 4px 10px rgba(8, 163, 205, 0.24)' : 'none',
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                bgcolor: DealviewMode === 'dealkanban' ? '#047857' : 'rgba(145, 158, 171, 0.08)',
                                                color: DealviewMode === 'dealkanban' ? 'common.white' : 'text.primary',
                                            }
                                        }}
                                    >
                                        Kanban View
                                    </Button>
                                </Box>

                                {displayCreate && (
                                    <Button
                                        variant="contained"
                                        startIcon={<Iconify icon="mingcute:add-line" />}
                                        onClick={() => handleOpenCreate()}
                                        sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                                    >
                                        New Prospect
                                    </Button>
                                )}
                            </Box>
                        )}


                    </Stack>

                    {currentTab === 'deals' && (
                        <>
                            {DealviewMode === 'deallist' ? (
                                <Card>
                                    <DealTableToolbar
                                        numSelected={selected.length}
                                        filterName={filterName}
                                        onFilterName={(e) => {
                                            setFilterName(e.target.value);
                                            setPage(0);
                                        }}
                                        searchPlaceholder="Search Prospects..."
                                        onOpenFilter={() => setOpenFilters(true)}
                                        canReset={canReset}
                                        sortBy={sortBy}
                                        onSortChange={setSortBy}
                                        onDelete={handleBulkDelete}
                                        sortOptions={[
                                            { value: 'modified_desc', label: 'Newest First' },
                                            { value: 'modified_asc', label: 'Oldest First' },
                                            { value: 'deal_title_asc', label: 'Title: A to Z' },
                                            { value: 'deal_title_desc', label: 'Title: Z to A' },
                                            { value: 'account_asc', label: 'Company: A to Z' },
                                            { value: 'account_desc', label: 'Company: Z to A' },
                                            { value: 'contact_name_asc', label: 'Client Name: A to Z' },
                                            { value: 'contact_name_desc', label: 'Client Name: Z to A' },
                                            { value: 'value_desc', label: 'Prospect Value: High to Low' },
                                            { value: 'value_asc', label: 'Prospect Value: Low to High' },
                                        ]}
                                    />

                                    <Scrollbar>
                                        <TableContainer sx={{ overflow: 'unset' }}>
                                            <Table sx={{ minWidth: 800, borderCollapse: 'collapse' }}>
                                                <DealTableHead
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
                                                        { id: 'deal_title', label: 'Title' },
                                                        { id: 'account', label: 'Company' },
                                                        { id: 'contact', label: 'Client' },
                                                        { id: 'stage', label: 'Stage' },
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
                                                                <DealTableRow
                                                                    key={row.name}
                                                                    index={page * rowsPerPage + index}
                                                                    hideCheckbox
                                                                    row={{
                                                                        id: row.name,
                                                                        title: row.deal_title ?? '-',
                                                                        account: row.account ?? '-',
                                                                        accountName: row.account_name ?? '',
                                                                        contact: row.contact ?? '-',
                                                                        contactName: row.contact_name ?? '',
                                                                        value: row.value ?? 0,
                                                                        stage: row.stage ?? '-',
                                                                        expectedCloseDate: row.expected_close_date ?? '-',
                                                                        avatarUrl: `${CONFIG.assetsDir}/images/avatar/avatar-25.webp`,
                                                                    }}
                                                                    selected={selected.includes(row.name)}
                                                                    onSelectRow={() => handleSelectRow(row.name)}
                                                                    onEdit={() => handleEditRow(row.name)}
                                                                    onDelete={() => handleDeleteClick(row.name)}
                                                                    onView={() => handleViewRow(row.name)}
                                                                    canEdit={permissions.write}
                                                                    canDelete={permissions.delete}
                                                                />
                                                            ))}

                                                            {notFound && <TableNoData searchQuery={filterName} />}

                                                            {empty && (
                                                                <TableRow>
                                                                    <TableCell colSpan={10} align="center" sx={{ py: 10 }}>
                                                                        <EmptyContent
                                                                            title="No Prospects found"
                                                                            description="Create a new Prospect to track your sales pipeline."
                                                                            icon="solar:hand-stars-bold-duotone"
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
                                        page={page}
                                        count={total}
                                        rowsPerPage={rowsPerPage}
                                        onPageChange={onChangePage}
                                        rowsPerPageOptions={[10, 25, 50]}
                                        onRowsPerPageChange={onChangeRowsPerPage}
                                    />
                                </Card>
                            ) : (
                                <DealKanbanBoard
                                    deals={data}
                                    stages={STAGE_OPTIONS}
                                    onOpenDeal={(id) => handleViewRow(id)}
                                    onEditDeal={(id) => handleEditRow(id)}
                                    onDeleteDeal={(id) => handleDeleteClick(id)}
                                    onAddDeal={(selectedStage) => handleOpenCreate(selectedStage)}
                                    permissions={{
                                        write: hasCustomPerms ? !!user?.permissions?.actions?.prospects?.edit : permissions.write,
                                        delete: hasCustomPerms ? !!user?.permissions?.actions?.prospects?.delete : permissions.delete,
                                    }}
                                />
                            )}
                        </>
                    )}



                    {currentTab === 'estimations' && (
                        <EstimationListView hideTitle />
                    )}

                    {currentTab === 'invoices' && (
                        <InvoiceManagementView hideHeader />
                    )}
                </Stack>

                <DealTableFiltersDrawer
                    open={openFilters}
                    onOpen={() => setOpenFilters(true)}
                    onClose={() => setOpenFilters(false)}
                    filters={filters}
                    onFilters={handleFilters}
                    canReset={canReset}
                    onResetFilters={handleResetFilters}
                    options={{
                        contacts: contactOptions,
                        accounts: accountOptions,
                        source_leads: SOURCE_LEAD_OPTIONS,
                    }}
                />

                <ConfirmDialog
                    open={confirmDelete.open}
                    onClose={() => setConfirmDelete({ open: false, id: null })}
                    title="Confirm Delete"
                    content="Are you sure you want to delete this Prospect?"
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
            </DashboardContent >
        </>
    );
}
