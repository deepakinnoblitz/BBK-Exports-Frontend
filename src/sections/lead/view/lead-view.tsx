import { IoList } from "react-icons/io5";
import { MuiTelInput } from 'mui-tel-input';
import { IoMdCloudDownload } from "react-icons/io";
import { TbLayoutKanbanFilled } from "react-icons/tb";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import { IconButton } from '@mui/material';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';

import { useLeads, useKanbanLeads } from 'src/hooks/useLeads';

import { getString } from 'src/utils/string';
import { getFriendlyErrorMessage } from 'src/utils/error-handler';

import { CONFIG } from 'src/config-global';
import { DashboardContent } from 'src/layouts/dashboard';
import locationData from 'src/assets/data/location_data.json';
import { getLead, createLead, updateLead, deleteLead, convertLead, getDoctypeList, getWorkflowStates, getWorkflowActions, applyWorkflowAction, createLeadFrom, createService, type ConvertLeadResponse } from 'src/api/leads';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { useAuth } from 'src/auth/auth-context';

import { TableNoData } from '../table-no-data';
import { LeadTableRow } from '../lead-table-row';
import { SalesPipeline } from '../sales-pipeline';
import { LeadTableHead } from '../lead-table-head';
import { TableEmptyRows } from '../table-empty-rows';
import { LeadTableToolbar } from '../lead-table-toolbar';
import { LeadImportDialog } from '../lead-import-dialog';
import LeadKanbanBoard from '../kanban/lead-kanban-board';
import { LeadFollowupDetails } from '../lead-followup-details';
import { LeadPipelineTimeline } from '../lead-pipeline-timeline';
import { LeadDetailsDialog } from '../../report/lead-details-dialog';
import { LeadTableFiltersDrawer } from '../lead-table-filters-drawer';
import { AccountDetailsDialog } from '../../report/account/account-details-dialog';
import { ContactDetailsDialog } from '../../report/contact/contact-details-dialog';


// ----------------------------------------------------------------------
const filter = createFilterOptions<any>();

export function LeadView() {
  const navigate = useNavigate();
  const table = useTable();
  const [filterName, setFilterName] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    workflow_state: 'all',
    leads_from: 'all',
    leads_type: 'all',
    service: 'all',
    country: 'all',
    state: 'all',
    city: 'all',
  });
  const [sortBy, setSortBy] = useState('modified_desc');
  const [openFilters, setOpenFilters] = useState(false);

  const STATUS_OPTIONS = [
    { value: 'New Lead', label: 'New Lead' },
    { value: 'Contacted', label: 'Contacted' },
    { value: 'Qualified', label: 'Qualified' },
    { value: 'Proposal Sent', label: 'Proposal Sent' },
    { value: 'In Negotiation', label: 'In Negotiation' },
    { value: 'Follow-up Scheduled', label: 'Follow-up Scheduled' },
    { value: 'On Hold', label: 'On Hold' },
    { value: 'Not Interested', label: 'Not Interested' },
    { value: 'In Active', label: 'In Active' },
    { value: 'Closed', label: 'Closed' },
  ];

  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openImport, setOpenImport] = useState(false);

  // Form state
  const [leadName, setLeadName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState<{ phone: string }[]>([{ phone: '' }]);
  const [emails, setEmails] = useState<{ email: string }[]>([{ email: '' }]);
  const [leadsType, setLeadsType] = useState('Incoming');
  const [leadsFrom, setLeadsFrom] = useState('');
  const [service, setService] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [workflowState, setWorkflowState] = useState('');
  const [status, setStatus] = useState('Not Converted');
  const [billingAddress, setBillingAddress] = useState('');
  const [remarks, setRemarks] = useState('');
  const [convertedAccount, setConvertedAccount] = useState('');
  const [convertedContact, setConvertedContact] = useState('');
  const [followupDetails, setFollowupDetails] = useState<any[]>([]);
  const [pipelineTimeline, setPipelineTimeline] = useState<any[]>([]);

  // Tab State
  const [currentTab, setCurrentTab] = useState('general');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Dropdown Options
  const [leadsFromOptions, setLeadsFromOptions] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  // Filter-specific location options
  const [filterStateOptions, setFilterStateOptions] = useState<string[]>([]);
  const [filterCityOptions, setFilterCityOptions] = useState<string[]>([]);
  const [workflowActions, setWorkflowActions] = useState<{ action: string; next_state: string }[]>([]);
  const [allWorkflowStates, setAllWorkflowStates] = useState<string[]>([]);
  const [pendingWorkflowChange, setPendingWorkflowChange] = useState<{ action: string; next_state: string } | null>(null);

  // Convert Lead State
  const [converting, setConverting] = useState(false);
  const [convertResult, setConvertResult] = useState<ConvertLeadResponse | null>(null);

  // Lead From Dialog State
  const [createLeadFromOpen, setCreateLeadFromOpen] = useState(false);
  const [newLeadFromName, setNewLeadFromName] = useState('');
  const [creatingLeadFrom, setCreatingLeadFrom] = useState(false);

  // Service Dialog State
  const [createServiceOpen, setCreateServiceOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [creatingService, setCreatingService] = useState(false);

  // Alert & Dialog State
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [openAccountNav, setOpenAccountNav] = useState(false);
  const [selectedAccountNav, setSelectedAccountNav] = useState<string | null>(null);
  const [openContactNav, setOpenContactNav] = useState(false);
  const [selectedContactNav, setSelectedContactNav] = useState<string | null>(null);

  const [openConvertConfirm, setOpenConvertConfirm] = useState(false);

  // Permissions State
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<{ read: boolean; write: boolean; delete: boolean }>({
    read: true,
    write: true,
    delete: true,
  });

  const actualPermissions = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.lead
    ? {
        read: !!user.permissions.actions.lead.view,
        write: !!user.permissions.actions.lead.edit,
        create: !!user.permissions.actions.lead.create,
        delete: !!user.permissions.actions.lead.delete,
        import: !!user.permissions.actions.lead.import,
      }
    : {
        read: permissions.read,
        write: permissions.write,
        create: permissions.write,
        delete: permissions.delete,
        import: permissions.write,
      };

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tableContainerRef.current) return;
    // Don't drag if clicking buttons, links or inputs
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('.MuiIconButton-root')) {
      return;
    }
    isDragging.current = true;
    startX.current = e.pageX - tableContainerRef.current.offsetLeft;
    scrollLeft.current = tableContainerRef.current.scrollLeft;
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !tableContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - tableContainerRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5; // scroll speed multiplier
    tableContainerRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const { data, total, loading, refetch } = useLeads(
    table.page,
    table.rowsPerPage,
    filterName,
    filters,
    sortBy
  );

  const { columnsData: kanbanColumnsData, data: kanbanLeads, loading: kanbanLoading, refetch: refetchKanban } = useKanbanLeads(
    filterName,
    filters,
    sortBy,
    viewMode === 'kanban',
    allWorkflowStates
  );

  const handleFilters = (update: any) => {
    setFilters((prev) => ({ ...prev, ...update }));
    table.onResetPage();
  };

  const handleResetFilters = () => {
    setFilters({
      status: 'all',
      workflow_state: 'all',
      leads_from: 'all',
      leads_type: 'all',
      service: 'all',
      country: 'all',
      state: 'all',
      city: 'all',
    });
    table.onResetPage();
  };

  const canReset =
    filters.status !== 'all' ||
    filters.workflow_state !== 'all' ||
    filters.leads_from !== 'all' ||
    filters.leads_type !== 'all' ||
    filters.service !== 'all' ||
    filters.country !== 'all' ||
    filters.state !== 'all' ||
    filters.city !== 'all' ||
    !!filterName;

  useEffect(() => {
    // Fetch dropdown options on mount
    getDoctypeList('Lead From').then((list) => setLeadsFromOptions(list.map((item: any) => item.name || item.label || String(item))));
    getDoctypeList('Service').then((list) => setServiceOptions(list.map((item: any) => item.name || item.label || String(item))));

    // Fetch Permissions
    import('src/api/leads').then(api => {
      api.getLeadPermissions().then(setPermissions);
    });

    // Populate Country Options from local JSON (remove duplicates)
    const countries = Array.from(new Set(locationData.map((c: any) => c.country)));
    setCountryOptions(["", ...countries]);

    // Fetch workflow states
    getWorkflowStates('Lead').then(workflowData => {
      setAllWorkflowStates(workflowData.states);
    });
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

  // Form state

  const handleOpenCreate = (initialWorkflowState?: any) => {
    setViewOnly(false);
    setOpenCreate(true);
    if (initialWorkflowState && typeof initialWorkflowState === 'string') {
      setWorkflowState(initialWorkflowState);
    }
  };

  const handleCloseCreate = () => {
    setOpenCreate(false);
    setValidationErrors({});// Clear errors
    setCurrentLeadId(null);
    setViewOnly(false);
    setCurrentTab('general');
    setLeadName('');
    setCompanyName('');
    setGstin('');
    setPhoneNumbers([{ phone: '' }]);
    setEmails([{ email: '' }]);
    setLeadsType('Incoming');
    setLeadsFrom('');
    setService('');
    setCountry('');
    setState('');
    setCity('');
    setWorkflowState('');
    setStatus('Not Converted');
    setBillingAddress('');
    setRemarks('');
    setConvertedAccount('');
    setConvertedContact('');
    setFollowupDetails([]);
    setPipelineTimeline([]);
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev: any) => ({ ...prev, open: false }));
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setOpenDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      const deletedLead = data.find((l: any) => l.name === deleteId) || (kanbanLeads as any[]).find((l: any) => l.name === deleteId);
      const stage = deletedLead?.workflow_state;
      await deleteLead(deleteId);
      setSnackbar({ open: true, message: 'Lead deleted successfully', severity: 'success' });
      await refetch();
      await refetchKanban(stage);
      setOpenDelete(false);
    } catch (e: any) {
      console.error(e);
      const friendlyMsg = getFriendlyErrorMessage(e);
      setSnackbar({ open: true, message: friendlyMsg, severity: 'error' });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const stagesToRefetch = Array.from(new Set(table.selected.map(id => {
        const lead = data.find((l: any) => l.name === id) || (kanbanLeads as any[]).find((l: any) => l.name === id);
        return lead?.workflow_state;
      }).filter(Boolean))) as string[];
      await Promise.all(table.selected.map((id) => deleteLead(id)));
      setSnackbar({ open: true, message: `${table.selected.length} leads deleted successfully`, severity: 'success' });
      table.onSelectAllRows(false, []);
      await refetch();
      await refetchKanban(stagesToRefetch);
    } catch (e: any) {
      console.error(e);
      const friendlyMsg = getFriendlyErrorMessage(e);
      setSnackbar({ open: true, message: friendlyMsg, severity: 'error' });
    }
  };

  // Validation State
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: boolean }>({});

  const handleCreateServiceSubmit = async () => {
    if (!newServiceName.trim()) return;
    try {
      setCreatingService(true);
      await createService(newServiceName.trim());
      setServiceOptions(prev => [...prev, newServiceName.trim()]);
      setService(newServiceName.trim());
      setCreateServiceOpen(false);
      setSnackbar({ open: true, message: 'Service created successfully', severity: 'success' });
    } catch (err: any) {
      console.error(err);
      const friendlyMsg = getFriendlyErrorMessage(err);
      setSnackbar({ open: true, message: friendlyMsg, severity: 'error' });
    } finally {
      setCreatingService(false);
    }
  };

  const handleCreateLeadFromSubmit = async () => {
    if (!newLeadFromName.trim()) return;
    try {
      setCreatingLeadFrom(true);
      await createLeadFrom(newLeadFromName.trim());
      setLeadsFromOptions(prev => [...prev, newLeadFromName.trim()]);
      setLeadsFrom(newLeadFromName.trim());
      setCreateLeadFromOpen(false);
      setSnackbar({ open: true, message: 'Lead From created successfully', severity: 'success' });
    } catch (err: any) {
      console.error(err);
      const friendlyMsg = getFriendlyErrorMessage(err);
      setSnackbar({ open: true, message: friendlyMsg, severity: 'error' });
    } finally {
      setCreatingLeadFrom(false);
    }
  };

  const handleCreate = async () => {
    // Validation
    const newErrors: { [key: string]: boolean } = {};
    const missingFields: string[] = [];

    if (!leadName) {
      newErrors.leadName = true;
      missingFields.push('Lead Name');
    }
    if (!companyName) {
      newErrors.companyName = true;
      missingFields.push('Company Name');
    }
    if (!leadsType) {
      newErrors.leadsType = true;
      missingFields.push('Leads Type');
    }
    if (!leadsFrom) {
      newErrors.leadsFrom = true;
      missingFields.push('Leads From');
    }
    const primaryPhone = phoneNumbers[0]?.phone;
    if (!primaryPhone || !primaryPhone.trim()) {
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

    try {
      setCreating(true);

      // Format phone numbers
      const formattedPhoneNumbers = phoneNumbers
        .filter((item) => item.phone.trim() !== '')
        .map((item) => {
          let phone = item.phone.replace(/\s/g, '');
          const parts = item.phone.trim().split(/\s+/);
          if (parts.length > 1 && parts[0].startsWith('+')) {
            phone = `${parts[0]}-${parts.slice(1).join('')}`;
          }
          return { phone };
        });

      // Format emails
      const formattedEmails = emails
        .filter((item) => item.email.trim() !== '')
        .map((item) => ({ email: item.email.trim() }));

      const leadData = {
        lead_name: leadName,
        company_name: companyName,
        gstin,
        phone_number: formattedPhoneNumbers.length > 0 ? formattedPhoneNumbers[0].phone : '',
        phone_numbers: formattedPhoneNumbers,
        email: formattedEmails.length > 0 ? formattedEmails[0].email : '',
        emails: formattedEmails,
        leads_type: leadsType as any,
        leads_from: leadsFrom,
        service,
        country,
        state,
        city,
        status,
        workflow_state: workflowState,
        billing_address: billingAddress,
        remarks,
      };

      const affectedStages: string[] = [];
      if (currentLeadId) {
        const oldLead = data.find((l: any) => l.name === currentLeadId) || (kanbanLeads as any[]).find((l: any) => l.name === currentLeadId);
        if (oldLead?.workflow_state) affectedStages.push(oldLead.workflow_state);
        if (leadData.workflow_state && leadData.workflow_state !== oldLead?.workflow_state) {
          affectedStages.push(leadData.workflow_state);
        }
      } else {
        affectedStages.push(leadData.workflow_state || allWorkflowStates[0] || 'New Lead');
      }

      if (currentLeadId) {
        await updateLead(currentLeadId, leadData);
        setSnackbar({ open: true, message: 'Lead updated successfully', severity: 'success' });
      } else {
        await createLead(leadData);
        setSnackbar({ open: true, message: 'Lead created successfully', severity: 'success' });
      }

      await refetch();
      await refetchKanban(affectedStages);
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


  const handleEditRow = async (row: any) => {
    setViewOnly(false);
    setValidationErrors({}); // Clear errors when opening edit
    const leadId = row.id;
    setCurrentLeadId(leadId);

    try {
      const fullLead = await getLead(leadId);
      setLeadName(getString(fullLead.lead_name) || '');
      setCompanyName(getString(fullLead.company_name) || '');
      setGstin(getString(fullLead.gstin) || '');
      if (fullLead.phone_numbers && fullLead.phone_numbers.length > 0) {
        setPhoneNumbers(fullLead.phone_numbers.map((p: any) => ({ phone: cleanPhoneNumber(p.phone || '') })));
      } else {
        setPhoneNumbers([{ phone: cleanPhoneNumber(getString(fullLead.phone_number) || '') }]);
      }

      if (fullLead.emails && fullLead.emails.length > 0) {
        setEmails(fullLead.emails.map((e: any) => ({ email: e.email || '' })));
      } else {
        setEmails([{ email: getString(fullLead.email) || '' }]);
      }
      setLeadsType(getString(fullLead.leads_type) || 'Incoming');
      setLeadsFrom(getString(fullLead.leads_from) || '');
      setService(getString(fullLead.service) || '');
      setCountry(getString(fullLead.country) || '');
      setState(getString(fullLead.state) || '');
      setCity(getString(fullLead.city) || '');
      setWorkflowState(getString(fullLead.workflow_state) || '');
      setStatus(getString(fullLead.status) || 'Not Converted');
      setBillingAddress(getString(fullLead.billing_address) || '');
      setRemarks(getString(fullLead.remarks) || '');
      setConvertedAccount(getString(fullLead.converted_account) || '');
      setConvertedContact(getString(fullLead.converted_contact) || '');
      setFollowupDetails(fullLead.followup_details || []);
      setPipelineTimeline(fullLead.converted_pipeline_timeline || []);

      // Fetch workflow actions for current state
      const currentST = getString(fullLead.workflow_state);
      if (currentST) {
        const actions = await getWorkflowActions('Lead', currentST);
        setWorkflowActions(actions);
      }
    } catch (error) {
      console.error("Failed to fetch full lead", error);
      // Fallback to list data if full fetch fails
      const fallbackRow = data.find((item) => item.name === leadId);
      if (fallbackRow) {
        setLeadName(getString(fallbackRow.lead_name) || '');
        setCompanyName(getString(fallbackRow.company_name) || '');
        setGstin(getString(fallbackRow.gstin) || '');
        if (fallbackRow.phone_numbers && fallbackRow.phone_numbers.length > 0) {
          setPhoneNumbers(fallbackRow.phone_numbers.map((p: any) => ({ phone: cleanPhoneNumber(p.phone || '') })));
        } else {
          setPhoneNumbers([{ phone: cleanPhoneNumber(getString(fallbackRow.phone_number) || '') }]);
        }

        if (fallbackRow.emails && fallbackRow.emails.length > 0) {
          setEmails(fallbackRow.emails.map((e: any) => ({ email: e.email || '' })));
        } else {
          setEmails([{ email: getString(fallbackRow.email) || '' }]);
        }
        setLeadsType(getString(fallbackRow.leads_type) || 'Incoming');
        setLeadsFrom(getString(fallbackRow.leads_from) || '');
        setService(getString(fallbackRow.service) || '');
        setCountry(getString(fallbackRow.country) || '');
        setState(getString(fallbackRow.state) || '');
        setCity(getString(fallbackRow.city) || '');
        setWorkflowState(getString(fallbackRow.workflow_state) || '');
        setStatus(getString(fallbackRow.status) || 'Not Converted');
        setBillingAddress(getString(fallbackRow.billing_address) || '');
        setRemarks(getString(fallbackRow.remarks) || '');
      }
    }
    setOpenCreate(true);
  };

  const handleViewRow = (row: any) => {
    navigate(`/leads/${row.id}/view`);
  };

  const onDeleteRow = (id: string) => {
    handleDeleteClick(id);
  };

  const notFound = !loading && data.length === 0 && (!!filterName || canReset);
  const empty = !loading && data.length === 0 && !filterName && !canReset;

  return (
    <>
      {/* CREATE LEAD DIALOG */}
      <Dialog
        open={openCreate}
        onClose={handleCloseCreate}
        fullWidth maxWidth="lg"
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: (theme) => theme.customShadows.z24,
          }
        }}>
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
          {viewOnly ? 'Lead Details' : (currentLeadId ? 'Edit Lead' : 'New Lead')}
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

        {/* {currentLeadId && (
          <Box sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={currentTab}
              onChange={(e, newValue) => setCurrentTab(newValue)}
            >
              <Tab label="General" value="general" />
              {currentLeadId && <Tab label="Pipeline" value="pipeline" />}
              {currentLeadId && <Tab label="Followups" value="followups" />}
              {currentLeadId && <Tab label="Convert Lead" value="convert" disabled={viewOnly} />}
            </Tabs>
          </Box>
        )} */}

        <DialogContent dividers>
          {currentTab === 'general' && (
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
                label="Lead Name"
                value={leadName}
                onChange={(e) => {
                  setLeadName(e.target.value);
                  if (e.target.value) setValidationErrors(prev => ({ ...prev, leadName: false }));
                }}
                required
                error={!!validationErrors.leadName}
                helperText={validationErrors.leadName ? 'Lead Name is required' : ''}
                slotProps={{ input: { readOnly: viewOnly } }}
              />

              <TextField
                fullWidth
                label="Company Name"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  if (e.target.value) setValidationErrors(prev => ({ ...prev, companyName: false }));
                }}
                required
                error={!!validationErrors.companyName}
                helperText={validationErrors.companyName ? 'Company Name is required' : ''}
                slotProps={{ input: { readOnly: viewOnly } }}
              />

              <TextField
                fullWidth
                label="GSTIN"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                slotProps={{ input: { readOnly: viewOnly } }}
              />

              <TextField
                select
                fullWidth
                label="Leads Type"
                value={leadsType}
                onChange={(e) => {
                  setLeadsType(e.target.value as any);
                  if (e.target.value) setValidationErrors(prev => ({ ...prev, leadsType: false }));
                }}
                required
                disabled={viewOnly}
                error={!!validationErrors.leadsType}
                helperText={validationErrors.leadsType ? 'Leads Type is required' : ''}
                SelectProps={{
                  MenuProps: {
                    PaperProps: {
                      sx: {
                        marginTop: 0.5,
                        boxShadow: (theme) => theme.customShadows.z20,
                        borderRadius: 1.5,
                      }
                    }
                  }
                }}
              >
                <MenuItem value="Incoming">Incoming</MenuItem>
                <MenuItem value="Outgoing">Outgoing</MenuItem>
              </TextField>

              <Stack spacing={3} sx={{ gridColumn: { xs: 'span 1', sm: 'span 1' } }}>
                {phoneNumbers.map((item, index) => (
                  <Stack key={index} direction="row" alignItems="center" spacing={1}>
                    <MuiTelInput
                      fullWidth
                      defaultCountry="IN"
                      label={index === 0 ? "Phone Number" : `Phone Number ${index + 1}`}
                      name={`phone_number_${index}`}
                      value={item.phone}
                      onChange={(newValue: string) => {
                        const newPhones = [...phoneNumbers];
                        newPhones[index] = { ...newPhones[index], phone: newValue };
                        setPhoneNumbers(newPhones);
                        if (index === 0 && newValue) {
                          setValidationErrors(prev => ({ ...prev, phoneNumber: false }));
                        }
                      }}
                      required={index === 0}
                      disabled={viewOnly}
                      error={index === 0 && !!validationErrors.phoneNumber}
                      helperText={index === 0 && validationErrors.phoneNumber ? 'Phone Number is required' : ''}
                      sx={{
                        "& .MuiInputBase-input.Mui-disabled": {
                          WebkitTextFillColor: "rgba(0, 0, 0, 0.87)",
                        },
                        "& .MuiInputLabel-root.Mui-disabled": {
                          color: "rgba(0, 0, 0, 0.6)",
                        },
                      }}
                    />
                    {!viewOnly && (
                      index === 0 ? (
                        <IconButton
                          color="primary"
                          onClick={() => setPhoneNumbers([...phoneNumbers, { phone: '' }])}
                          sx={{
                            transition: 'transform 0.2s',
                            '&:hover': { transform: 'scale(1.1)' }
                          }}
                        >
                          <Iconify icon="solar:add-circle-bold" width={24} />
                        </IconButton>
                      ) : (
                        <IconButton
                          color="error"
                          onClick={() => setPhoneNumbers(phoneNumbers.filter((_, i) => i !== index))}
                          sx={{
                            transition: 'transform 0.2s',
                            '&:hover': { transform: 'scale(1.1)' }
                          }}
                        >
                          <Iconify icon="solar:trash-bin-trash-bold" width={24} />
                        </IconButton>
                      )
                    )}
                  </Stack>
                ))}
              </Stack>

              <Stack spacing={3} sx={{ gridColumn: { xs: 'span 1', sm: 'span 1' } }}>
                {emails.map((item, index) => (
                  <Stack key={index} direction="row" alignItems="center" spacing={1}>
                    <TextField
                      fullWidth
                      label={index === 0 ? "Email" : `Email ${index + 1}`}
                      type="email"
                      value={item.email}
                      onChange={(e) => {
                        const newEmails = [...emails];
                        newEmails[index] = { ...newEmails[index], email: e.target.value };
                        setEmails(newEmails);
                      }}
                      slotProps={{ input: { readOnly: viewOnly } }}
                    />
                    {!viewOnly && (
                      index === 0 ? (
                        <IconButton
                          color="primary"
                          onClick={() => setEmails([...emails, { email: '' }])}
                          sx={{
                            transition: 'transform 0.2s',
                            '&:hover': { transform: 'scale(1.1)' }
                          }}
                        >
                          <Iconify icon="solar:add-circle-bold" width={24} />
                        </IconButton>
                      ) : (
                        <IconButton
                          color="error"
                          onClick={() => setEmails(emails.filter((_, i) => i !== index))}
                          sx={{
                            transition: 'transform 0.2s',
                            '&:hover': { transform: 'scale(1.1)' }
                          }}
                        >
                          <Iconify icon="solar:trash-bin-trash-bold" width={24} />
                        </IconButton>
                      )
                    )}
                  </Stack>
                ))}
              </Stack>

              <Autocomplete
                fullWidth
                disabled={viewOnly}
                options={leadsFromOptions}
                value={leadsFrom}
                onChange={(e, newValue: any) => {
                  if (typeof newValue === 'string') {
                    setLeadsFrom(newValue);
                  } else if (newValue && newValue.isNew) {
                    setNewLeadFromName(newValue.inputValue);
                    setCreateLeadFromOpen(true);
                  } else {
                    setLeadsFrom(newValue || '');
                  }
                  if (newValue) setValidationErrors(prev => ({ ...prev, leadsFrom: false }));
                }}
                filterOptions={(options, params) => {
                  const filtered = filter(options, params) as any[];
                  const { inputValue } = params;
                  const isExisting = options.some((option) => inputValue === option);

                  if (inputValue !== '' && !isExisting) {
                    filtered.push({
                      inputValue,
                      label: `+ Create "${inputValue}"`,
                      isNew: true,
                    });
                  } else if (inputValue === '') {
                    filtered.push({
                      inputValue: '',
                      label: '+ Create Lead From',
                      isNew: true,
                    });
                  }
                  return filtered;
                }}
                getOptionLabel={(option: any) => {
                  if (typeof option === 'string') return option;
                  if (option.inputValue) return option.inputValue;
                  return option.label || '';
                }}
                renderOption={(props, option: any) => {
                  const { key, ...optionProps } = props as any;
                  return (
                    <Box component="li" key={key || (typeof option === 'string' ? option : option.label)} {...optionProps} sx={{
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
                    }}>
                      {option.isNew ? (
                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 0.5 }}>
                          <Iconify icon={"solar:add-circle-bold" as any} width={24} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {option.inputValue ? `Create "${option.inputValue}"` : 'Create Lead From'}
                          </Typography>
                        </Stack>
                      ) : (
                        option.label || option
                      )}
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Leads From"
                    required
                    error={!!validationErrors.leadsFrom}
                    helperText={validationErrors.leadsFrom ? 'Leads From is required' : ''}
                  />
                )}
              />


              <Autocomplete
                fullWidth
                disabled={viewOnly}
                options={serviceOptions}
                value={service}
                onChange={(e, newValue: any) => {
                  if (typeof newValue === 'string') {
                    setService(newValue);
                  } else if (newValue && newValue.isNew) {
                    setNewServiceName(newValue.inputValue);
                    setCreateServiceOpen(true);
                  } else {
                    setService(newValue?.label || newValue || '');
                  }
                }}
                filterOptions={(options, params) => {
                  const filtered = filter(options, params) as any[];
                  const { inputValue } = params;
                  const isExisting = options.some((option) => inputValue === option);

                  if (inputValue !== '' && !isExisting) {
                    filtered.push({
                      inputValue,
                      label: `+ Create "${inputValue}"`,
                      isNew: true,
                    });
                  } else if (inputValue === '') {
                    filtered.push({
                      inputValue: '',
                      label: '+ Create Service',
                      isNew: true,
                    });
                  }
                  return filtered;
                }}
                getOptionLabel={(option: any) => {
                  if (typeof option === 'string') return option;
                  if (option.inputValue) return option.inputValue;
                  return option.label || '';
                }}
                renderOption={(props, option: any) => {
                  const { key, ...optionProps } = props as any;
                  return (
                    <Box component="li" key={key || (typeof option === 'string' ? option : option.label)} {...optionProps} sx={{
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
                    }}>
                      {option.isNew ? (
                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 0.5 }}>
                          <Iconify icon={"solar:add-circle-bold" as any} width={24} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {option.inputValue ? `Create "${option.inputValue}"` : 'Create Service'}
                          </Typography>
                        </Stack>
                      ) : (
                        option.label || option
                      )}
                    </Box>
                  );
                }}
                renderInput={(params) => <TextField {...params} label="Service" />}
              />

              <Autocomplete
                fullWidth
                disabled={viewOnly}
                options={countryOptions.filter(o => o !== '')}
                value={country}
                onChange={(e, newValue) => setCountry(newValue || '')}
                renderInput={(params) => <TextField {...params} label="Country" />}
              />

              <Autocomplete
                fullWidth
                disabled={viewOnly || !country}
                options={stateOptions.filter(o => o !== '' && o !== 'Select Country First')}
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
                disabled={viewOnly || !state}
                options={cityOptions.filter(o => o !== '' && o !== 'Select State First')}
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
                label="Billing Address"
                multiline
                rows={3}
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                sx={{ gridColumn: { sm: 'span 2' } }}
                slotProps={{ input: { readOnly: viewOnly } }}
              />

              <TextField
                fullWidth
                label="Remarks"
                multiline
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                sx={{ gridColumn: { sm: 'span 2' } }}
                slotProps={{ input: { readOnly: viewOnly } }}
              />

              {(convertedAccount || convertedContact) && (
                <>
                  <TextField
                    fullWidth
                    label="Converted Company"
                    value={convertedAccount}
                    InputProps={{ readOnly: true }}
                  />
                  <TextField
                    fullWidth
                    label="Converted Client"
                    value={convertedContact}
                    InputProps={{ readOnly: true }}
                  />
                </>
              )}
            </Box>
          )}

          {currentTab === 'pipeline' && (
            <>
              <Alert
                severity="info"
                icon={<Iconify icon="solar:info-circle-bold" />}
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  bgcolor: (theme) => alpha(theme.palette.info.main, 0.08),
                  color: 'info.dark',
                  border: (theme) => `1px solid ${alpha(theme.palette.info.main, 0.16)}`,
                  '& .MuiAlert-icon': {
                    color: 'info.main',
                  },
                }}
              >
                Click on a stage card to update the current stage.
              </Alert>
              {/* {workflowState !== 'Closed' && (
                <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: 'text.primary' }}>
                    Change Workflow
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 250 }}>
                    <Select
                      value=""
                      disabled={viewOnly}
                      displayEmpty
                      renderValue={() => 'Select Action'}
                      sx={{
                        bgcolor: 'common.white',
                        '& .MuiSelect-select': {
                          color: 'text.secondary'
                        }
                      }}
                    >
                      {workflowActions.map((action) => {
                        const safeAction = getString(action.action);
                        return (
                          <MenuItem
                            key={safeAction}
                            value={safeAction}
                            onClick={() => {
                              setPendingWorkflowChange(action);
                            }}
                          >
                            {safeAction}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Stack>
              )} */}
              <SalesPipeline
                currentStage={workflowState || status}
                stages={allWorkflowStates}
                leadName={leadName}
                service={service}
                disabled={viewOnly}
                onStageChange={(newStage) => {
                  setPendingWorkflowChange({ action: `Move to ${newStage}`, next_state: newStage });
                }}
              />
              <LeadPipelineTimeline
                title="Stage History"
                list={pipelineTimeline}
              />
            </>
          )}

          {currentTab === 'followups' && (
            <LeadFollowupDetails
              title="Followup History"
              list={followupDetails}
            />
          )}

          {currentTab === 'convert' && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Convert Lead to Client and Company
              </Typography>

              {/* Check if already converted */}
              {convertedAccount && convertedContact ? (
                <Box>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    This lead has already been converted.
                  </Alert>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      fullWidth
                      label="Converted Company"
                      value={convertedAccount}
                      InputProps={{ readOnly: true }}
                    />
                    <TextField
                      fullWidth
                      label="Converted Client"
                      value={convertedContact}
                      InputProps={{ readOnly: true }}
                    />
                  </Box>
                </Box>
              ) : convertResult ? (
                <Box>


                  <Box sx={{ p: 3, bgcolor: 'background.neutral', borderRadius: 2 }}>
                    <Stack spacing={2.5}>
                      <Box>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.disabled',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            mb: 1,
                            display: 'block',
                          }}
                        >
                          Converted Company
                        </Typography>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 800,
                            color: 'primary.main',
                            cursor: convertResult.account ? 'pointer' : 'default'
                          }}
                          onClick={() => {
                            if (convertResult.account) {
                              setSelectedAccountNav(convertResult.account);
                              setOpenAccountNav(true);
                            }
                          }}
                        >
                          {convertResult.account || 'N/A'}
                        </Typography>
                      </Box>

                      <Divider sx={{ borderStyle: 'dashed' }} />

                      <Box>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.disabled',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            mb: 1,
                            display: 'block',
                          }}
                        >
                          Converted Client
                        </Typography>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 800,
                            color: 'primary.main',
                            cursor: convertResult.contact ? 'pointer' : 'default'
                          }}
                          onClick={() => {
                            if (convertResult.contact) {
                              setSelectedContactNav(convertResult.contact);
                              setOpenContactNav(true);
                            }
                          }}
                        >
                          {convertResult.contact || 'N/A'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                  <Button
                    fullWidth
                    size="large"
                    color="inherit"
                    variant="outlined"
                    onClick={() => {
                      const convertedLead = data.find((l: any) => l.name === currentLeadId) || (kanbanLeads as any[]).find((l: any) => l.name === currentLeadId);
                      const stage = convertedLead?.workflow_state;
                      setConvertResult(null);
                      setCurrentTab('general');
                      handleCloseCreate();
                      refetch();
                      refetchKanban(stage);
                    }}
                    sx={{ mt: 4, borderRadius: 1.5 }}
                  >
                    Close
                  </Button>
                </Box>
              ) : (
                <Box>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    This will create an Company and Client from this lead&apos;s information.
                  </Alert>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                    <TextField
                      fullWidth
                      label="Lead Name"
                      value={leadName}
                      InputProps={{ readOnly: true }}
                    />
                    <TextField
                      fullWidth
                      label="Company Name"
                      value={companyName}
                      InputProps={{ readOnly: true }}
                      error={!companyName}
                      helperText={!companyName ? 'Company Name is required' : ''}
                    />
                    <TextField
                      fullWidth
                      label="Email"
                      value={emails[0]?.email || ''}
                      InputProps={{ readOnly: true }}
                    />
                    <TextField
                      fullWidth
                      label="Phone Number"
                      value={phoneNumbers[0]?.phone || ''}
                      InputProps={{ readOnly: true }}
                    />
                    {!(emails[0]?.email || '').trim() && !(phoneNumbers[0]?.phone || '').trim() && (
                      <Alert severity="warning">
                        Email or Phone Number is required to create a Client
                      </Alert>
                    )}
                  </Box>

                  <Button
                    variant="contained"
                    onClick={() => setOpenConvertConfirm(true)}
                    disabled={converting || !companyName || (!(emails[0]?.email || '').trim() && !(phoneNumbers[0]?.phone || '').trim())}
                    fullWidth
                  >
                    {converting ? 'Converting...' : 'Convert Lead'}
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ m: 1 }}>
          {!viewOnly && currentTab === 'general' && (
            <Button variant="contained" onClick={handleCreate} disabled={creating}>
              {creating ? (currentLeadId ? 'Updating...' : 'Creating...') : (currentLeadId ? 'Update Lead' : 'Create Lead')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* MAIN CONTENT */}
      <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
        <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
          <Typography variant="h4" sx={{ flexGrow: 1 }}>
            Leads
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* View Switcher */}
            <Box sx={{
              display: 'flex',
              p: 0.5,
              bgcolor: '#F4F6F8',
              borderRadius: '999px',
              border: (theme) => `1px solid ${theme.palette.divider}`,
            }}>
              <Button
                disableRipple
                onClick={() => setViewMode('list')}
                startIcon={<IoList size={18} />}
                sx={{
                  borderRadius: '999px',
                  px: 2.5,
                  py: 0.6,
                  typography: 'subtitle2',
                  fontWeight: 700,
                  color: viewMode === 'list' ? 'common.white' : 'text.secondary',
                  bgcolor: viewMode === 'list' ? '#059669' : 'transparent',
                  boxShadow: viewMode === 'list' ? '0px 4px 10px rgba(8, 163, 205, 0.24)' : 'none',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: viewMode === 'list' ? '#047857' : 'rgba(145, 158, 171, 0.08)',
                    color: viewMode === 'list' ? 'common.white' : 'text.primary',
                  }
                }}
              >
                List View
              </Button>
              <Button
                disableRipple
                onClick={() => setViewMode('kanban')}
                startIcon={<TbLayoutKanbanFilled size={18} />}
                sx={{
                  borderRadius: '999px',
                  px: 2.5,
                  py: 0.6,
                  typography: 'subtitle2',
                  fontWeight: 700,
                  color: viewMode === 'kanban' ? 'common.white' : 'text.secondary',
                  bgcolor: viewMode === 'kanban' ? '#059669' : 'transparent',
                  boxShadow: viewMode === 'kanban' ? '0px 4px 10px rgba(8, 163, 205, 0.24)' : 'none',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: viewMode === 'kanban' ? '#047857' : 'rgba(145, 158, 171, 0.08)',
                    color: viewMode === 'kanban' ? 'common.white' : 'text.primary',
                  }
                }}
              >
                Kanban View
              </Button>
            </Box>

            {actualPermissions.import && (
              <Button
                variant="contained"
                startIcon={<IoMdCloudDownload size={20} />}
                onClick={() => setOpenImport(true)}
                sx={{ bgcolor: '#02c281', color: 'common.white', '&:hover': { bgcolor: '#029f69' } }}
              >
                Import
              </Button>
            )}
            {actualPermissions.create && (
              <Button
                variant="contained"
                startIcon={<Iconify icon="mingcute:add-line" />}
                onClick={handleOpenCreate}
                sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
              >
                New Lead
              </Button>
            )}
          </Box>
        </Box>

        {viewMode === 'list' ? (
          <Card>
            <LeadTableToolbar
              numSelected={table.selected.length}
              filterName={filterName}
              onFilterName={(e) => {
                setFilterName(e.target.value);
                table.onResetPage();
              }}
              onOpenFilter={() => setOpenFilters(true)}
              canReset={canReset}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onDelete={handleBulkDelete}
            />

            <TableContainer
              ref={tableContainerRef}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              sx={{
                overflow: 'auto',
                cursor: 'grab',
                userSelect: 'none',
                '&:active': { cursor: 'grabbing' },
                '&::-webkit-scrollbar': { width: 8, height: 8 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 1 },
              }}
            >
              <Table sx={{ minWidth: 1600, borderCollapse: 'collapse' }}>
                <LeadTableHead
                  rowCount={total}
                  numSelected={table.selected.length}
                  onSelectAllRows={(checked) =>
                    table.onSelectAllRows(
                      checked,
                      data.map((row) => row.name)
                    )
                  }
                  hideCheckbox
                  showIndex
                  headLabel={[
                    { id: 'lead_name', label: 'Name', width: 260, minWidth: 240 },
                    { id: 'service', label: 'Service', minWidth: 180 },
                    { id: 'phone_number', label: 'Phone', width: 180, minWidth: 160 },
                    { id: 'workflow_state', label: 'Status' },
                    { id: 'company_name', label: 'Company', width: 260, minWidth: 240 },
                    { id: 'leads_type', label: 'Leads Type', minWidth: 120 },
                    { id: 'leads_from', label: 'Leads From', minWidth: 120 },
                    { id: 'country', label: 'Country' },
                    {
                      id: 'actions',
                      label: 'Actions',
                      align: 'right',
                      width: 180,
                      minWidth: 160,
                      sx: {
                        position: 'sticky',
                        right: 0,
                        backgroundColor: '#f4f6f8',
                        boxShadow: '-4px 0px 10px -4px rgba(0,0,0,0.1)',
                        zIndex: 1,
                      }
                    },
                  ]}
                />

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 10 }}>
                        <CircularProgress sx={{ color: '#059669' }} />
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {data.map((row, index) => (
                        <LeadTableRow
                          key={row.name}
                          index={table.page * table.rowsPerPage + index}
                          hideCheckbox
                          row={{
                            id: row.name,
                            name: getString(row.lead_name) ?? '-',
                            phone: getString(row.phone_number) ?? '-',
                            email: getString(row.email) ?? '-',
                            company: getString(row.company_name) ?? '-',
                            status: getString(row.status) ?? '-',
                            workflow_state: getString(row.workflow_state) ?? '-',
                            avatarUrl: `${CONFIG.assetsDir}/images/avatar/avatar-25.webp`,
                            isVerified: true,
                            country: getString(row.country) ?? '-',
                            modified: row.modified,
                            leads_type: getString(row.leads_type) ?? '-',
                            leads_from: getString(row.leads_from) ?? '-',
                            service: getString(row.service) ?? '-',
                          }}
                          selected={table.selected.includes(row.name)}
                          onSelectRow={() => table.onSelectRow(row.name)}
                          onEdit={() => handleEditRow({ id: row.name })}
                          onDelete={() => onDeleteRow(row.name)}
                          onView={() => handleViewRow({ id: row.name })}
                          canEdit={actualPermissions.write}
                          canDelete={actualPermissions.delete}
                          canView={actualPermissions.read}
                        />
                      ))}

                      {notFound && <TableNoData searchQuery={filterName} />}

                      {empty && (
                        <TableRow>
                          <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                            <EmptyContent
                              title="No leads found"
                              description="Start capturing leads to boost your sales."
                              icon="solar:user-plus-bold-duotone"
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

            <TablePagination
              component="div"
              page={table.page}
              count={total}
              rowsPerPage={table.rowsPerPage}
              onPageChange={table.onChangePage}
              rowsPerPageOptions={[10, 25, 50]}
              onRowsPerPageChange={table.onChangeRowsPerPage}
            />
          </Card>
        ) : kanbanLoading && kanbanLeads.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(118vh - 170px)' }}>
            <CircularProgress sx={{ color: '#059669' }} />
          </Box>
        ) : (
          <LeadKanbanBoard
            columnsData={kanbanColumnsData}
            leads={kanbanLeads}
            workflowStates={allWorkflowStates}
            onOpenLead={(id) => handleViewRow({ id })}
            onEditLead={(id) => handleEditRow({ id })}
            onDeleteLead={(id) => handleDeleteClick(id)}
            onAddLead={(selectedState) => handleOpenCreate(selectedState)}
            permissions={actualPermissions}
          />
        )}
      </DashboardContent>

      <LeadTableFiltersDrawer
        open={openFilters}
        onOpen={() => setOpenFilters(true)}
        onClose={() => setOpenFilters(false)}
        filters={filters}
        onFilters={handleFilters}
        canReset={canReset}
        onResetFilters={handleResetFilters}
        options={{
          status: STATUS_OPTIONS,
          workflow_states: allWorkflowStates,
          leads_from: leadsFromOptions,
          services: serviceOptions,
          countries: countryOptions.filter((c) => c !== ''),
          states: filterStateOptions,
          cities: filterCityOptions,
        }}
      />

      <ConfirmDialog
        open={openDelete}
        onClose={() => !deleting && setOpenDelete(false)}
        title="Confirm Delete"
        content="Are you sure you want to delete this lead?"
        action={
          <LoadingButton
            loading={deleting}
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            sx={{ borderRadius: 1.5, minWidth: 100 }}
          >
            Delete
          </LoadingButton>
        }
      />

      {/* Workflow Confirmation Dialog */}
      <ConfirmDialog
        open={!!pendingWorkflowChange}
        onClose={() => setPendingWorkflowChange(null)}
        title="Confirm Workflow Change"
        icon="solar:question-square-bold"
        iconColor="primary.main"
        content={`Are you sure you want to change the workflow status to "${pendingWorkflowChange?.action}"?`}
        action={
          <Button
            variant="contained"
            color="primary"
            sx={{ borderRadius: 1.5, minWidth: 100 }}
            onClick={async () => {
              if (!pendingWorkflowChange) return;
              try {
                const action = pendingWorkflowChange.action;
                const newStage = pendingWorkflowChange.next_state;

                if (currentLeadId) {
                  const transitionedLead = data.find((l: any) => l.name === currentLeadId) || (kanbanLeads as any[]).find((l: any) => l.name === currentLeadId);
                  const oldStage = transitionedLead?.workflow_state;

                  // Use applyWorkflowAction instead of updateLead to respect/trigger workflow logic
                  await applyWorkflowAction('Lead', currentLeadId, action);

                  setWorkflowState(newStage);
                  const updatedLead = await getLead(currentLeadId);
                  setPipelineTimeline(updatedLead.converted_pipeline_timeline || []);
                  const newActions = await getWorkflowActions('Lead', newStage);
                  setWorkflowActions(newActions);
                  await refetch(); // Refresh table data

                  const stages = [];
                  if (oldStage) stages.push(oldStage);
                  if (newStage) stages.push(newStage);
                  await refetchKanban(stages);

                  setSnackbar({ open: true, message: 'Workflow status updated successfully', severity: 'success' });
                }
                setPendingWorkflowChange(null);
              } catch (error: any) {
                console.error('Failed to update workflow status:', error);
                setSnackbar({ open: true, message: error.message || 'Failed to update workflow status', severity: 'error' });
                setPendingWorkflowChange(null);
              }
            }}
          >
            Confirm
          </Button>
        }
      />

      <LeadImportDialog
        open={openImport}
        onClose={() => setOpenImport(false)}
        onRefresh={refetch}
      />

      <LeadDetailsDialog
        open={openView}
        onClose={() => {
          setOpenView(false);
          setCurrentLeadId(null);
        }}
        leadId={currentLeadId}
        onEdit={() => {
          if (currentLeadId) {
            setOpenView(false);
            handleEditRow({ id: currentLeadId });
          }
        }}
      />

      <ConfirmDialog
        open={openConvertConfirm}
        onClose={() => setOpenConvertConfirm(false)}
        title="Convert Lead"
        content="Are you sure you want to convert this lead? This will create a permanent Company and Client record."
        icon="solar:round-transfer-horizontal-bold"
        iconColor="success.main"
        action={
          <Button
            variant="contained"
            color="success"
            onClick={async () => {
              setOpenConvertConfirm(false);
              if (!companyName) {
                setSnackbar({
                  open: true,
                  message: 'Company Name is required to convert lead',
                  severity: 'error'
                });
                return;
              }

              const primaryEmail = emails[0]?.email || '';
              const primaryPhone = phoneNumbers[0]?.phone || '';
              if (!primaryEmail.trim() && !primaryPhone.trim()) {
                setSnackbar({
                  open: true,
                  message: 'Email or Phone Number is required to convert lead',
                  severity: 'error'
                });
                return;
              }

              try {
                setConverting(true);
                const result = await convertLead(currentLeadId!);
                setConvertResult(result);

                if (result.messages && result.messages.length > 0) {
                  const combinedMsg = result.messages.map((m: any) => m.text).join(' | ');
                  setSnackbar({
                    open: true,
                    message: combinedMsg,
                    severity: result.messages.some((m: any) => m.type === 'warning') ? 'warning' : 'success'
                  });
                } else {
                  setSnackbar({
                    open: true,
                    message: 'Lead converted successfully!',
                    severity: 'success'
                  });
                }
              } catch (error: any) {
                console.error('Conversion error:', error);
                setSnackbar({
                  open: true,
                  message: error.message || 'Failed to convert lead',
                  severity: 'error'
                });
              } finally {
                setConverting(false);
              }
            }}
          >
            Convert
          </Button>
        }
      />

      <AccountDetailsDialog
        open={openAccountNav}
        onClose={() => setOpenAccountNav(false)}
        accountId={selectedAccountNav}
      />

      <ContactDetailsDialog
        open={openContactNav}
        onClose={() => setOpenContactNav(false)}
        contactId={selectedContactNav}
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

      <Dialog
        open={createLeadFromOpen}
        onClose={() => !creatingLeadFrom && setCreateLeadFromOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Create Lead From</Typography>
          <IconButton
            onClick={() => !creatingLeadFrom && setCreateLeadFromOpen(false)}
            sx={{ color: 'text.secondary' }}
          >
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 2, pt: 1 }}>
          <TextField
            fullWidth
            label="Lead From"
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

      <Dialog
        open={createServiceOpen}
        onClose={() => !creatingService && setCreateServiceOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Create Service</Typography>
          <IconButton
            onClick={() => !creatingService && setCreateServiceOpen(false)}
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
    </>
  );
}

// ----------------------------------------------------------------------

export function useTable() {
  const [page, setPage] = useState(0);
  const [orderBy, setOrderBy] = useState('name');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const onSort = useCallback(
    (id: string) => {
      const isAsc = orderBy === id && order === 'asc';
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(id);
    },
    [order, orderBy]
  );

  const onSelectAllRows = useCallback((checked: boolean, ids: string[]) => {
    setSelected(checked ? ids : []);
  }, []);

  const onSelectRow = useCallback((value: string) => {
    setSelected((prev: string[]) =>
      prev.includes(value) ? prev.filter((v: string) => v !== value) : [...prev, value]
    );
  }, []);

  const onResetPage = () => setPage(0);

  const onChangePage = (_: unknown, newPage: number) => setPage(newPage);

  const onChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    onResetPage();
  };

  return {
    page,
    order,
    orderBy,
    rowsPerPage,
    selected,
    onSort,
    onSelectRow,
    onSelectAllRows,
    onResetPage,
    onChangePage,
    onChangeRowsPerPage,
  };
}
