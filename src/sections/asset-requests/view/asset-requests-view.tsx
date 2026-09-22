import dayjs from 'dayjs';
import { GoFileSymlinkFile } from "react-icons/go";
import { MdOutlinePendingActions } from "react-icons/md";
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Badge from '@mui/material/Badge';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useSocket } from 'src/hooks/use-socket';
import { useUnreadCountsContext } from 'src/hooks/unread-counts-context';

import { frappeRequest } from 'src/utils/csrf';

import { markAsRead } from 'src/api/unread-counts';
import { getAssetCategories } from 'src/api/assets';
import { DashboardContent } from 'src/layouts/dashboard';
import { getAvailableAssets, getEmployees, getMyAssignedAssets } from 'src/api/asset-assignments';
import { submitAssetRequest, fetchMyAssetRequests, fetchPendingAssetRequests, updateAssetRequest, approveDeclaration } from 'src/api/asset-requests';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { TableNoData } from 'src/components/table';
import { Scrollbar } from 'src/components/scrollbar';
import { TableEmptyRows } from 'src/components/table';
import { EmptyContent } from 'src/components/empty-content';

import { LeadTableHead as AssetReqTableHead } from 'src/sections/lead/lead-table-head';
import { LeadTableToolbar as AssetReqToolbar } from 'src/sections/lead/lead-table-toolbar';
import { AssetRequestsTableFiltersDrawer } from 'src/sections/asset-requests/asset-requests-table-filters-drawer';

import { useAuth } from 'src/auth/auth-context';

import { AssetRequestDetailsDialog } from '../asset-request-details-dialog';

// ----------------------------------------------------------------------

// Parses Frappe's raw _server_messages JSON into a readable string
function parseServerError(error: any): string {
    try {
        if (error?._server_messages) {
            const msgs = JSON.parse(error._server_messages);
            if (Array.isArray(msgs) && msgs.length > 0) {
                const first = JSON.parse(msgs[0]);
                return first.message || 'An error occurred';
            }
        }
    } catch (_) { /* ignore parse errors */ }
    return error?.message || error?.exc_type || 'An error occurred';
}

// Shared field style for consistent input appearance
const fieldSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 1.5,
        bgcolor: 'background.neutral',
    },
};

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
    Draft: 'default',
    'Pending Approval': 'warning',
    Approved: 'success',
    Rejected: 'error',
    Completed: 'info',
};

const PRIORITY_COLORS: Record<string, 'default' | 'warning' | 'error' | 'info'> = {
    Low: 'info',
    Medium: 'warning',
    High: 'error',
};

// ----------------------------------------------------------------------

export function AssetRequestsView() {
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.asset_requests;
    const actionPerms = user?.permissions?.actions?.asset_requests;
    const canCreateAssetRequest = hasCustomPerms && actionPerms ? !!actionPerms?.create : true;
    const canEditAssetRequest = hasCustomPerms && actionPerms ? !!actionPerms?.edit : true;
    const canDeleteAssetRequest = hasCustomPerms && actionPerms ? !!actionPerms?.delete : true;

    const userRole: "hr" | "admin" | "" = user?.roles?.some(r => ['hr', 'hr manager', 'hr user', 'accounts manager'].includes(r.toLowerCase()))
        ? 'hr'
        : (user?.roles?.some(r => ['admin', 'system manager', 'administrator'].includes(r.toLowerCase())) ? 'admin' : '');
    const isHR = userRole === "hr" || userRole === "admin";

    const { socket, subscribeToRoom, subscribeToEvent } = useSocket(user?.email);
    const { unreadCounts } = useUnreadCountsContext();

    const [activeTab, setActiveTab] = useState<'my-requests' | 'hr-dashboard'>('my-requests');

    // ── My Requests state ──
    const [myRequests, setMyRequests] = useState<any[]>([]);
    const [myTotal, setMyTotal] = useState(0);
    const [myPage, setMyPage] = useState(0);
    const [myRowsPerPage, setMyRowsPerPage] = useState(10);
    const [myLoading, setMyLoading] = useState(false);
    const [mySearch, setMySearch] = useState('');
    const [mySort, setMySort] = useState('modified desc');
    const [myFilters, setMyFilters] = useState({ type: 'all', category: 'all', status: 'all', priority: 'all', startDate: '', endDate: '', unreadOnly: false });
    const [myFiltersOpen, setMyFiltersOpen] = useState(false);

    // ── HR Dashboard state ──
    const [hrRequests, setHrRequests] = useState<any[]>([]);
    const [hrTotal, setHrTotal] = useState(0);
    const [hrPage, setHrPage] = useState(0);
    const [hrRowsPerPage, setHrRowsPerPage] = useState(10);
    const [hrLoading, setHrLoading] = useState(false);
    const [hrSearch, setHrSearch] = useState('');
    const [hrSort, setHrSort] = useState('modified desc');
    const [hrFilters, setHrFilters] = useState({ type: 'all', category: 'all', status: 'all', priority: 'all', startDate: '', endDate: '', unreadOnly: false });
    const [hrFiltersOpen, setHrFiltersOpen] = useState(false);

    // ── Submit dialog ──
    const [openSubmit, setOpenSubmit] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [requestType, setRequestType] = useState('New Request');
    const [priority, setPriority] = useState('Medium');
    const [purpose, setPurpose] = useState('');
    const [assetCategory, setAssetCategory] = useState('');
    const [declarationAssetName, setDeclarationAssetName] = useState('');
    const [declarationAssetTag, setDeclarationAssetTag] = useState('');
    const [returnAsset, setReturnAsset] = useState<any>(null);
    const [returnAttachment, setReturnAttachment] = useState('');
    const [returnPendingFile, setReturnPendingFile] = useState<File | null>(null);
    const [returnAttachmentError, setReturnAttachmentError] = useState('');
    const [categories, setCategories] = useState<any[]>([]);
    const [myAssignedAssets, setMyAssignedAssets] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [targetEmployee, setTargetEmployee] = useState<any>(null);

    // ── Validation state ──
    const [touched, setTouched] = useState(false);

    // ── HR Action dialog ──
    const [openHrAction, setOpenHrAction] = useState(false);
    const [hrActionRequest, setHrActionRequest] = useState<any>(null);
    const [hrRemarks, setHrRemarks] = useState('');
    const [hrAction, setHrAction] = useState<'approve' | 'reject'>('approve');
    const [hrReturnDate, setHrReturnDate] = useState('');
    const [assignAsset, setAssignAsset] = useState<any>(null);
    const [decAssetTag, setDecAssetTag] = useState('');
    const [decPurchaseDate, setDecPurchaseDate] = useState('');
    const [decPurchaseCost, setDecPurchaseCost] = useState<number | ''>('');
    const [decCategory, setDecCategory] = useState<any>(null);
    const [decAssetName, setDecAssetName] = useState('');

    const [availableAssets, setAvailableAssets] = useState<any[]>([]);
    const [processingHrAction, setProcessingHrAction] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [menuRow, setMenuRow] = useState<any>(null);

    const [openDetails, setOpenDetails] = useState(false);
    const [selectedRequestName, setSelectedRequestName] = useState<string | null>(null);

    // ── Snackbar ──
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success'
    });

    // ── Fetch my requests ──
    const fetchMyReqs = useCallback(async () => {
        if (!user?.employee && !isHR) return;
        setMyLoading(true);
        try {
            const filterArgs = {
                category: myFilters.category !== 'all' ? myFilters.category : '',
                priority: myFilters.priority !== 'all' ? myFilters.priority : '',
                startDate: myFilters.startDate,
                endDate: myFilters.endDate,
            };
            if (isHR) {
                const result = await fetchPendingAssetRequests(myPage + 1, myRowsPerPage, myFilters.type, myFilters.status, mySort, filterArgs);
                setMyRequests(result.data);
                setMyTotal(result.total);
            } else {
                const result = await fetchMyAssetRequests(user!.employee!, myPage + 1, myRowsPerPage, myFilters.type, myFilters.status, mySort, filterArgs);
                setMyRequests(result.data);
                setMyTotal(result.total);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setMyLoading(false);
        }
    }, [user?.employee, myPage, myRowsPerPage, isHR, mySort, myFilters]);

    // ── Fetch HR requests ──
    const fetchHrReqs = useCallback(async () => {
        setHrLoading(true);
        try {
            const filterArgs = {
                category: hrFilters.category !== 'all' ? hrFilters.category : '',
                priority: hrFilters.priority !== 'all' ? hrFilters.priority : '',
                startDate: hrFilters.startDate,
                endDate: hrFilters.endDate,
                unreadOnly: hrFilters.unreadOnly,
            };
            const result = await fetchPendingAssetRequests(hrPage + 1, hrRowsPerPage, hrFilters.type, 'Pending Approval', hrSort, filterArgs);
            setHrRequests(result.data);
            setHrTotal(result.total);
        } catch (e) {
            console.error(e);
        } finally {
            setHrLoading(false);
        }
    }, [hrPage, hrRowsPerPage, hrSort, hrFilters]);

    // Load categories on mount for Filters drawer
    useEffect(() => {
        getAssetCategories().then(setCategories).catch(console.error);
    }, []);

    useEffect(() => { fetchMyReqs(); }, [fetchMyReqs]);
    useEffect(() => { if (isHR) fetchHrReqs(); }, [fetchHrReqs, isHR]);

    // Real-time socket subscription
    useEffect(() => {
        if (!socket) return undefined;

        subscribeToRoom('Asset Request');

        const handleUpdate = () => {
            console.log('SOCKET_EVENT_RECEIVED: asset_request_updated');
            fetchMyReqs();
            fetchHrReqs();
        };

        const cleanup = subscribeToEvent('asset_request_updated', handleUpdate);
        return cleanup;
    }, [socket, subscribeToRoom, subscribeToEvent, fetchMyReqs, fetchHrReqs]);

    // ── Load categories when submit dialog opens ──
    useEffect(() => {
        if (openSubmit) {
            getAssetCategories().then(setCategories).catch(console.error);
            // For Return Request, load assets assigned to user
            if (user?.employee && !isHR) {
                getMyAssignedAssets(user.employee).then(setMyAssignedAssets).catch(console.error);
            }
            // For HR, fetch employees for the lookup
            if (isHR) {
                frappeRequest('/api/method/frappe.client.get_list', {
                    method: 'POST',
                    body: JSON.stringify({
                        doctype: 'Employee',
                        fields: ['name', 'employee_name'],
                        filters: [['status', '=', 'Active']],
                        limit: 1000,
                    }),
                })
                    .then((res: any) => res.json())
                    .then((data: any) => setEmployees(data.message || []))
                    .catch(console.error);

                // Default HR to Declaration
                setRequestType('Declaration');
            }
        }
    }, [openSubmit, user?.employee, isHR]);

    // ── Load available assets for HR when approving a New Request ──
    useEffect(() => {
        if (
            openHrAction &&
            hrAction === 'approve' &&
            hrActionRequest?.request_type === 'New Request'
        ) {
            getAvailableAssets()
                .then((assets) => {
                    const filtered = assets.filter(
                        (asset: any) =>
                            asset.category === hrActionRequest.asset_category
                    );

                    setAvailableAssets(filtered);
                })
                .catch(console.error);
        }
    }, [openHrAction, hrAction, hrActionRequest]);

    const handleSubmitRequest = async () => {
        setTouched(true);

        const isNewOrDec = ['New Request', 'Declaration'].includes(requestType);
        const isReturn = requestType === 'Return Request';

        if ((isNewOrDec && !assetCategory) || (isReturn && !returnAsset) || !purpose) {
            setSnackbar({ open: true, message: 'Please fill in all mandatory fields (including Asset to Return).', severity: 'error' });
            return;
        }

        setSubmitting(true);
        try {
            let finalAttachmentUrl = returnAttachment;

            if (returnPendingFile) {
                const formDataUpload = new FormData();
                formDataUpload.append('file', returnPendingFile, returnPendingFile.name);
                formDataUpload.append('is_private', '0');
                const uploadRes = await frappeRequest('/api/method/upload_file', { method: 'POST', body: formDataUpload });
                const uploadData = await uploadRes.json();
                finalAttachmentUrl = uploadData.message?.file_url || uploadData.file_url || '';
            }

            await submitAssetRequest({
                request_type: requestType,
                priority,
                purpose,
                asset_category: assetCategory || undefined,
                asset: returnAsset?.asset || undefined,
                asset_name: declarationAssetName || undefined,
                asset_tag: declarationAssetTag || undefined,
                employee: isHR ? targetEmployee?.name : undefined,
                return_attachment: finalAttachmentUrl || undefined,
            });
            setSnackbar({ open: true, message: 'Request submitted successfully!', severity: 'success' });
            setOpenSubmit(false);
            resetSubmitForm();
            setTouched(false);
            await Promise.all([fetchMyReqs(), fetchHrReqs()]);
        } catch (e: any) {
            setSnackbar({ open: true, message: parseServerError(e), severity: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const resetSubmitForm = () => {
        setRequestType('New Request');
        setPriority('Medium');
        setPurpose('');
        setAssetCategory('');
        setDeclarationAssetName('');
        setDeclarationAssetTag('');
        setReturnAsset(null);
        setReturnAttachment('');
        setReturnPendingFile(null);
        setReturnAttachmentError('');
        setTargetEmployee(null);
        setTouched(false);
    };

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, row: any) => {
        setMenuAnchor(event.currentTarget);
        setMenuRow(row);
    };

    const handleCloseMenu = () => {
        setMenuAnchor(null);
        setMenuRow(null);
    };

    const handleAction = (row: any, action: 'approve' | 'reject') => {
        setHrActionRequest(row);
        setHrAction(action);

        if (action === 'approve' && row.request_type === 'Declaration') {
            setDecAssetName(row.asset_name || '');
            setDecCategory({ name: row.asset_category, category_name: row.asset_category });
            setDecAssetTag(row.asset_tag || '');
            setDecPurchaseCost('');
            setDecPurchaseDate('');
        }

        // Default Return Date to today for Return Request approvals
        if (row.request_type === 'Return Request') {
            setHrReturnDate(dayjs().format('YYYY-MM-DD'));
        }

        setOpenHrAction(true);
        handleCloseMenu();
    };

    const handleHrAction = async () => {
        if (!hrActionRequest) return;
        setProcessingHrAction(true);
        try {
            if (hrAction === 'approve' && hrActionRequest.request_type === 'Declaration') {
                if (!decCategory?.name) throw new Error('Category is required');
                if (!decAssetName.trim()) throw new Error('Asset Name is required');

                await approveDeclaration({
                    request_name: hrActionRequest.name,
                    hr_remarks: hrRemarks,
                    asset_name: decAssetName,
                    asset_tag: decAssetTag,
                    asset_category: decCategory.name,
                    purchase_date: decPurchaseDate || undefined,
                    purchase_cost: decPurchaseCost === '' ? undefined : Number(decPurchaseCost)
                });
            } else {
                const updateData: any = {
                    workflow_state: hrAction === 'approve' ? 'Approved' : 'Rejected',
                    status: hrAction === 'approve' ? 'Approved' : 'Rejected',
                    hr_remarks: hrRemarks,
                };
                if (hrAction === 'approve' && hrActionRequest.request_type === 'New Request' && assignAsset) {
                    updateData.assigned_asset = assignAsset.name;
                }
                if (hrAction === 'approve' && hrActionRequest.request_type === 'Return Request' && hrReturnDate) {
                    updateData.return_date = hrReturnDate;
                }
                await updateAssetRequest(hrActionRequest.name, updateData);
            }

            setSnackbar({
                open: true,
                message: hrAction === 'approve' ? 'Request approved successfully!' : 'Request rejected.',
                severity: 'success'
            });
            setOpenHrAction(false);
            setHrActionRequest(null);
            setHrRemarks('');
            setHrReturnDate('');
            setAssignAsset(null);
            setDecAssetTag('');
            setDecPurchaseDate('');
            setDecPurchaseCost('');
            await Promise.all([fetchHrReqs(), fetchMyReqs()]);
        } catch (e: any) {
            setSnackbar({ open: true, message: parseServerError(e), severity: 'error' });
        } finally {
            setProcessingHrAction(false);
        }
    };

    const filteredMyReqs = myRequests.filter(r =>
        !mySearch ||
        r.request_type?.toLowerCase().includes(mySearch.toLowerCase()) ||
        r.asset_name?.toLowerCase().includes(mySearch.toLowerCase()) ||
        r.asset_category?.toLowerCase().includes(mySearch.toLowerCase()) ||
        (isHR && r.employee_name?.toLowerCase().includes(mySearch.toLowerCase()))
    );

    const filteredHrReqs = hrRequests.filter(r =>
        !hrSearch ||
        r.employee_name?.toLowerCase().includes(hrSearch.toLowerCase()) ||
        r.request_type?.toLowerCase().includes(hrSearch.toLowerCase())
    );

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ flexGrow: 1 }}>
                    Asset Requests
                </Typography>
                {canCreateAssetRequest && (
                    <Button
                        variant="contained"
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={() => {
                            setOpenSubmit(true);
                            if (isHR) setRequestType('Declaration');
                        }}
                        sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                    >
                        {isHR ? 'New Declaration' : 'New Request'}
                    </Button>
                )}
            </Box>

            {/* Tabs — HR sees both, employees see only theirs */}
            {isHR && (
                <Tabs
                    value={activeTab}
                    onChange={(_, val) => setActiveTab(val)}
                    sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}
                >
                    <Tab value="my-requests" label="Employee Requests" icon={<GoFileSymlinkFile size={18}/>} iconPosition="start"/>
                    <Tab
                        value="hr-dashboard"
                        label={
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="subtitle2">Pending Approvals</Typography>
                                {hrTotal > 0 && (
                                    <Label
                                        variant="filled"
                                        color="error"
                                        sx={{
                                            width: 20,
                                            height: 20,
                                            p: 0,
                                            borderRadius: '50%',
                                            fontSize: 11,
                                            fontWeight: 800,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {hrTotal}
                                    </Label>
                                )}
                            </Stack>
                        }
                        icon={<MdOutlinePendingActions size={20}/>} 
                        iconPosition="start"
                    />
                </Tabs>
            )}

            {/* ── MY REQUESTS TAB ── */}
            {activeTab === 'my-requests' && (
                <Card>
                    <AssetReqToolbar
                        numSelected={0}
                        filterName={mySearch}
                        onFilterName={(e: any) => { setMySearch(e.target.value); }}
                        searchPlaceholder={isHR ? "Search all requests by employee, type..." : "Search my requests..."}
                        onOpenFilter={() => setMyFiltersOpen(true)}
                        canReset={myFilters.type !== 'all' || myFilters.category !== 'all' || myFilters.status !== 'all' || myFilters.priority !== 'all' || !!myFilters.startDate || !!myFilters.endDate || myFilters.unreadOnly}
                        sortBy={mySort === 'modified desc' ? 'date_desc' : 'date_asc'}
                        onSortChange={(val: string) => { setMySort(val === 'date_desc' ? 'modified desc' : 'modified asc'); setMyPage(0); }}
                        sortOptions={[
                            { value: 'date_desc', label: 'Newest First' },
                            { value: 'date_asc', label: 'Oldest First' },
                        ]}
                    />
                    <Scrollbar>
                        <TableContainer sx={{ overflow: 'unset' }}>
                            <Table sx={{ minWidth: 800 }}>
                                <AssetReqTableHead
                                    order="desc"
                                    orderBy="creation"
                                    rowCount={filteredMyReqs.length}
                                    numSelected={0}
                                    onSelectAllRows={() => { }}
                                    hideCheckbox
                                    showIndex
                                    headLabel={[
                                        ...(isHR ? [{ id: 'employee_name', label: 'Employee' }] : []),
                                        { id: 'request_type', label: 'Type' },
                                        { id: 'asset_category', label: 'Category' },
                                        { id: 'asset_name', label: 'Asset / Details' },
                                        { id: 'priority', label: 'Priority' },
                                        { id: 'status', label: 'Status' },
                                        { id: 'creation', label: 'Date' },
                                        { id: '', label: '' },
                                    ]}
                                />
                                <TableBody>
                                    {myLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={isHR ? 9 : 8} align="center" sx={{ py: 10 }}>
                                                <CircularProgress sx={{ color: '#059669' }} />
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        myRequests.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={isHR ? 9 : 8}>
                                                    <EmptyContent
                                                        title="No requests found"
                                                        description='Click "New Request" to submit your first asset request.'
                                                        icon="solar:inbox-line-duotone"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            <>
                                                {filteredMyReqs.map((row, idx) => (
                                                    <TableRow
                                                        key={row.name}
                                                        hover
                                                        onClick={() => {
                                                            setSelectedRequestName(row.name);
                                                            setOpenDetails(true);
                                                            if (isHR) {
                                                                markAsRead('Asset Request', row.name).then(() => {
                                                                    window.dispatchEvent(new CustomEvent('REFRESH_UNREAD_COUNTS'));
                                                                });
                                                            }
                                                        }}
                                                        sx={{
                                                            cursor: 'pointer',
                                                            '& td, & th': { borderBottom: (theme) => `1px solid ${theme.palette.divider}` },
                                                            '&:last-child td, &:last-child th': { borderBottom: 0 },
                                                        }}
                                                    >
                                                        <TableCell align="center" sx={{ width: 64 }}>
                                                            <Box
                                                                sx={{
                                                                    width: 30,
                                                                    height: 30,
                                                                    display: 'flex',
                                                                    borderRadius: '50%',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                                    color: 'primary.main',
                                                                    typography: 'subtitle2',
                                                                    fontWeight: 800,
                                                                    border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                                                                    mx: 'auto',
                                                                    transition: (theme) => theme.transitions.create(['all'], { duration: theme.transitions.duration.shorter }),
                                                                    '&:hover': {
                                                                        bgcolor: 'primary.main',
                                                                        color: 'primary.contrastText',
                                                                        transform: 'scale(1.1)',
                                                                    },
                                                                }}
                                                            >
                                                                {myPage * myRowsPerPage + idx + 1}
                                                            </Box>
                                                        </TableCell>
                                                        {isHR && (
                                                            <TableCell sx={{ minWidth: 160 }}>
                                                                <Typography variant="subtitle2" fontWeight={700} noWrap>{row.employee_name}</Typography>
                                                                <Typography variant="caption" color="text.secondary" noWrap>{row.employee}</Typography>
                                                            </TableCell>
                                                        )}
                                                        <TableCell sx={{ minWidth: 140 }}>
                                                            <Label
                                                                variant="soft"
                                                                color={
                                                                    (row.request_type === 'Declaration' && 'info') ||
                                                                    (row.request_type === 'Return Request' && 'error') ||
                                                                    'default'
                                                                }
                                                            >
                                                                {row.request_type}
                                                            </Label>
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 600 }}>{row.asset_category || '-'}</TableCell>
                                                        <TableCell sx={{ minWidth: 200, maxWidth: 350 }}>
                                                            <Tooltip
                                                                title={
                                                                    <Stack spacing={1.5} sx={{ p: 1.5, minWidth: 240 }}>
                                                                        <Stack direction="row" alignItems="center" spacing={1}>
                                                                            <Iconify icon="solar:info-circle-bold" sx={{ color: '#059669', width: 20, height: 20 }} />
                                                                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                                                                Request Details
                                                                            </Typography>
                                                                        </Stack>

                                                                        {(row.asset_name || row.asset) && (
                                                                            <Box>
                                                                                <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 800, fontSize: 10, mb: 0.5, display: 'block', letterSpacing: 0.5 }}>
                                                                                    Asset Information
                                                                                </Typography>
                                                                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                                                                    {row.asset_name || row.asset}
                                                                                </Typography>
                                                                            </Box>
                                                                        )}

                                                                        {row.purpose && (
                                                                            <Box>
                                                                                <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 800, fontSize: 10, mb: 0.5, display: 'block', letterSpacing: 0.5 }}>
                                                                                    Purpose / Description
                                                                                </Typography>
                                                                                <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.6, bgcolor: 'rgba(8, 163, 205, 0.08)', p: 1, borderRadius: 1, border: '1px solid rgba(8, 163, 205, 0.16)' }}>
                                                                                    {row.purpose}
                                                                                </Typography>
                                                                            </Box>
                                                                        )}
                                                                    </Stack>
                                                                }
                                                                slotProps={{
                                                                    tooltip: {
                                                                        sx: {
                                                                            p: 0,
                                                                            bgcolor: 'background.paper',
                                                                            borderRadius: 2,
                                                                            boxShadow: (theme: any) => theme.customShadows?.z24 || '0 24px 48px 0 rgba(0,0,0,0.16)',
                                                                            border: '1px solid rgba(8, 163, 205, 0.4)',
                                                                        }
                                                                    },
                                                                    arrow: { sx: { color: 'background.paper', '&::before': { border: '1px solid rgba(8, 163, 205, 0.4)' } } }
                                                                }}
                                                                arrow
                                                                placement="top-start"
                                                            >
                                                                <Box sx={{ cursor: 'pointer' }}>
                                                                    <Typography variant="body2" fontWeight={600} noWrap>
                                                                        {row.asset_name || row.asset || row.purpose || '-'}
                                                                    </Typography>
                                                                    {(row.asset_name || row.asset) && row.purpose && (
                                                                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                                                            {row.purpose}
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Label color={PRIORITY_COLORS[row.priority] || 'default'} variant="soft">
                                                                {row.priority}
                                                            </Label>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Label color={STATUS_COLORS[row.status] || 'default'} variant="soft">
                                                                {row.status}
                                                            </Label>
                                                        </TableCell>
                                                        <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                                                            {row.creation ? dayjs(row.creation).format('DD MMM YYYY · HH:mm') : '-'}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                                            <IconButton
                                                                size="small"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedRequestName(row.name);
                                                                    setOpenDetails(true);
                                                                    if (isHR) {
                                                                        markAsRead('Asset Request', row.name).then(() => {
                                                                            window.dispatchEvent(new CustomEvent('REFRESH_UNREAD_COUNTS'));
                                                                        });
                                                                    }
                                                                }}
                                                                sx={{ color: 'primary.main' }}
                                                            >
                                                                <Badge
                                                                    color="error"
                                                                    variant="dot"
                                                                    invisible={!(isHR && unreadCounts.unread_ids['Asset Request']?.includes(row.name))}
                                                                    sx={{
                                                                        '& .MuiBadge-badge': {
                                                                            width: 6,
                                                                            height: 6,
                                                                            minWidth: 6,
                                                                        },
                                                                    }}
                                                                >
                                                                    <Iconify icon="solar:eye-bold" />
                                                                </Badge>
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}

                                                <TableEmptyRows
                                                    height={68}
                                                    emptyRows={filteredMyReqs.length > 0 && filteredMyReqs.length < 5 ? 5 - filteredMyReqs.length : 0}
                                                />

                                                {filteredMyReqs.length === 0 && mySearch && (
                                                    <TableNoData searchQuery={mySearch} />
                                                )}
                                            </>
                                        )
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Scrollbar>
                    <TablePagination
                        component="div"
                        page={myPage}
                        count={myTotal}
                        rowsPerPage={myRowsPerPage}
                        onPageChange={(_, p) => setMyPage(p)}
                        rowsPerPageOptions={[10, 25, 50]}
                        onRowsPerPageChange={(e) => { setMyRowsPerPage(parseInt(e.target.value, 10)); setMyPage(0); }}
                    />
                </Card>
            )}

            {/* ── HR DASHBOARD TAB ── */}
            {activeTab === 'hr-dashboard' && isHR && (
                <Card>
                    <AssetReqToolbar
                        numSelected={0}
                        filterName={hrSearch}
                        onFilterName={(e: any) => setHrSearch(e.target.value)}
                        searchPlaceholder="Search by employee or type..."
                        onOpenFilter={() => setHrFiltersOpen(true)}
                        canReset={hrFilters.type !== 'all' || hrFilters.category !== 'all' || hrFilters.priority !== 'all' || !!hrFilters.startDate || !!hrFilters.endDate || hrFilters.unreadOnly}
                        sortBy={hrSort === 'modified desc' ? 'date_desc' : 'date_asc'}
                        onSortChange={(val: string) => { setHrSort(val === 'date_desc' ? 'modified desc' : 'modified asc'); setHrPage(0); }}
                        sortOptions={[
                            { value: 'date_desc', label: 'Newest First' },
                            { value: 'date_asc', label: 'Oldest First' },
                        ]}
                    />
                    <Scrollbar>
                        <TableContainer sx={{ overflow: 'unset' }}>
                            <Table sx={{ minWidth: 800 }}>
                                <AssetReqTableHead
                                    order="desc"
                                    orderBy="creation"
                                    rowCount={filteredHrReqs.length}
                                    numSelected={0}
                                    onSelectAllRows={() => { }}
                                    hideCheckbox
                                    showIndex
                                    headLabel={[
                                        { id: 'employee_name', label: 'Employee' },
                                        { id: 'request_type', label: 'Type' },
                                        { id: 'asset_category', label: 'Category / Details' },
                                        { id: 'priority', label: 'Priority' },
                                        { id: 'status', label: 'Status' },
                                        { id: 'creation', label: 'Date' },
                                        { id: '', label: '' },
                                    ]}
                                />
                                <TableBody>
                                    {hrLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                                                <CircularProgress sx={{ color: '#059669' }} />
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        hrRequests.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8}>
                                                    <EmptyContent
                                                        title="No pending approvals"
                                                        description="All asset requests have been processed."
                                                        icon="solar:check-circle-bold-duotone"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            <>
                                                {filteredHrReqs.map((row, idx) => (
                                                    <TableRow
                                                        key={row.name}
                                                        hover
                                                        onClick={() => {
                                                            setSelectedRequestName(row.name);
                                                            setOpenDetails(true);
                                                            if (isHR) {
                                                                markAsRead('Asset Request', row.name).then(() => {
                                                                    window.dispatchEvent(new CustomEvent('REFRESH_UNREAD_COUNTS'));
                                                                });
                                                            }
                                                        }}
                                                        sx={{
                                                            cursor: 'pointer',
                                                            '& td, & th': { borderBottom: (theme) => `1px solid ${theme.palette.divider}` },
                                                            '&:last-child td, &:last-child th': { borderBottom: 0 },
                                                            ...(row.priority === 'High' && { bgcolor: (theme) => alpha(theme.palette.error.main, 0.04) })
                                                        }}
                                                    >
                                                        <TableCell align="center" sx={{ width: 64 }}>
                                                            <Box
                                                                sx={{
                                                                    width: 30,
                                                                    height: 30,
                                                                    display: 'flex',
                                                                    borderRadius: '50%',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.08),
                                                                    color: 'primary.main',
                                                                    typography: 'subtitle2',
                                                                    fontWeight: 800,
                                                                    border: (theme: any) => `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                                                                    mx: 'auto',
                                                                    transition: (theme: any) => theme.transitions.create(['all'], { duration: theme.transitions.duration.shorter }),
                                                                    '&:hover': {
                                                                        bgcolor: 'primary.main',
                                                                        color: 'primary.contrastText',
                                                                        transform: 'scale(1.1)',
                                                                    },
                                                                }}
                                                            >
                                                                {hrPage * hrRowsPerPage + idx + 1}
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell sx={{ minWidth: 160 }}>
                                                            <Typography variant="subtitle2" fontWeight={700} noWrap>{row.employee_name}</Typography>
                                                            <Typography variant="caption" color="text.secondary" noWrap>{row.employee}</Typography>
                                                        </TableCell>
                                                        <TableCell sx={{ minWidth: 140 }}>
                                                            <Label
                                                                variant="soft"
                                                                color={
                                                                    (row.request_type === 'Declaration' && 'info') ||
                                                                    (row.request_type === 'Return Request' && 'error') ||
                                                                    'default'
                                                                }
                                                            >
                                                                {row.request_type}
                                                            </Label>
                                                        </TableCell>
                                                        <TableCell sx={{ minWidth: 180, maxWidth: 350 }}>
                                                            <Tooltip
                                                                title={
                                                                    <Stack spacing={1.5} sx={{ p: 1.5, minWidth: 240 }}>
                                                                        <Stack direction="row" alignItems="center" spacing={1}>
                                                                            <Iconify icon="solar:info-circle-bold" sx={{ color: '#059669', width: 20, height: 20 }} />
                                                                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                                                                Request Details
                                                                            </Typography>
                                                                        </Stack>

                                                                        <Box>
                                                                            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 800, fontSize: 10, mb: 0.5, display: 'block', letterSpacing: 0.5 }}>
                                                                                Asset / Category
                                                                            </Typography>
                                                                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                                                                {row.asset_category ? `${row.asset_category}${row.asset_name || row.asset ? ` / ${row.asset_name || row.asset}` : ''}` : (row.asset_name || row.asset || '-')}
                                                                            </Typography>
                                                                        </Box>

                                                                        {row.purpose && (
                                                                            <Box>
                                                                                <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 800, fontSize: 10, mb: 0.5, display: 'block', letterSpacing: 0.5 }}>
                                                                                    Purpose / Description
                                                                                </Typography>
                                                                                <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.6, bgcolor: 'rgba(8, 163, 205, 0.08)', p: 1, borderRadius: 1, border: '1px solid rgba(8, 163, 205, 0.16)' }}>
                                                                                    {row.purpose}
                                                                                </Typography>
                                                                            </Box>
                                                                        )}
                                                                    </Stack>
                                                                }
                                                                slotProps={{
                                                                    tooltip: {
                                                                        sx: {
                                                                            p: 0,
                                                                            bgcolor: 'background.paper',
                                                                            borderRadius: 2,
                                                                            boxShadow: (theme: any) => theme.customShadows?.z24 || '0 24px 48px 0 rgba(0,0,0,0.16)',
                                                                            border: '1px solid rgba(8, 163, 205, 0.4)',
                                                                        }
                                                                    },
                                                                    arrow: { sx: { color: 'background.paper', '&::before': { border: '1px solid rgba(8, 163, 205, 0.4)' } } }
                                                                }}
                                                                arrow
                                                                placement="top-start"
                                                            >
                                                                <Box sx={{ cursor: 'pointer' }}>
                                                                    <Typography variant="body2" fontWeight={600} noWrap>
                                                                        {row.asset_category ? `${row.asset_category}${row.asset_name || row.asset ? ` / ${row.asset_name || row.asset}` : ''}` : (row.asset_name || row.asset || row.purpose || '-')}
                                                                    </Typography>
                                                                    {row.purpose && (row.asset_category || row.asset_name || row.asset) && (
                                                                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                                                            {row.purpose}
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Label color={PRIORITY_COLORS[row.priority] || 'default'} variant="soft">
                                                                {row.priority}
                                                            </Label>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Label color={STATUS_COLORS[row.status] || 'default'} variant="soft">
                                                                {row.status}
                                                            </Label>
                                                        </TableCell>
                                                        <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                                                            {row.creation ? dayjs(row.creation).format('DD MMM YYYY · HH:mm') : '-'}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                                            <Stack direction="row" spacing={0.5} justifyContent="flex-end" sx={{ display: 'inline-flex', verticalAlign: 'middle' }}>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedRequestName(row.name);
                                                                        setOpenDetails(true);
                                                                        if (isHR) {
                                                                            markAsRead('Asset Request', row.name).then(() => {
                                                                                window.dispatchEvent(new CustomEvent('REFRESH_UNREAD_COUNTS'));
                                                                            });
                                                                        }
                                                                    }}
                                                                    sx={{ color: 'primary.main' }}
                                                                >
                                                                    <Badge
                                                                        color="error"
                                                                        variant="dot"
                                                                        invisible={!(isHR && unreadCounts.unread_ids['Asset Request']?.includes(row.name))}
                                                                        sx={{
                                                                            '& .MuiBadge-badge': {
                                                                                width: 6,
                                                                                height: 6,
                                                                                minWidth: 6,
                                                                            },
                                                                        }}
                                                                    >
                                                                        <Iconify icon="solar:eye-bold" />
                                                                    </Badge>
                                                                </IconButton>
                                                                {row.status === 'Pending Approval' && canEditAssetRequest && (
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleOpenMenu(e, row);
                                                                        }}
                                                                        sx={{ color: 'warning.main' }}
                                                                    >
                                                                        <Iconify icon="eva:more-vertical-fill" />
                                                                    </IconButton>
                                                                )}
                                                            </Stack>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}

                                                <TableEmptyRows
                                                    height={68}
                                                    emptyRows={filteredHrReqs.length > 0 && filteredHrReqs.length < 5 ? 5 - filteredHrReqs.length : 0}
                                                />

                                                {filteredHrReqs.length === 0 && hrSearch && (
                                                    <TableNoData searchQuery={hrSearch} />
                                                )}
                                            </>
                                        )
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Scrollbar>
                    <TablePagination
                        component="div"
                        page={hrPage}
                        count={hrTotal}
                        rowsPerPage={hrRowsPerPage}
                        onPageChange={(_, p) => setHrPage(p)}
                        rowsPerPageOptions={[10, 25, 50]}
                        onRowsPerPageChange={(e) => { setHrRowsPerPage(parseInt(e.target.value, 10)); setHrPage(0); }}
                    />
                </Card>
            )}

            {/* ── SUBMIT REQUEST DIALOG ── */}
            <Dialog 
                open={openSubmit} 
                onClose={() => { setOpenSubmit(false); resetSubmitForm(); }} 
                fullWidth 
                maxWidth="sm"
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        boxShadow: (themeVar) => themeVar.customShadows.z24,
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                    }
                }}
            >
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="h6" fontWeight={700}>
                        {isHR ? 'New Asset Declaration' : 'New Asset Request'}
                    </Typography>
                    <IconButton onClick={() => { setOpenSubmit(false); resetSubmitForm(); }} sx={{ color: (theme) => theme.palette.grey[500] }}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ flexGrow: 1, overflowY: 'auto' }}>
                    <Box sx={{ display: 'grid', gap: 3, mt: 1 }}>
                        {isHR && (
                            <Autocomplete
                                fullWidth
                                options={employees}
                                getOptionLabel={(o: any) => `${o.employee_name} (${o.name})`}
                                onChange={(_, val) => setTargetEmployee(val)}
                                renderOption={(props, option: any) => (
                                    <Box component="li" {...props} sx={{ py: 1.5, px: 2 }}>
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight={700} lineHeight={1.3}>
                                                {option.employee_name}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                ID: {option.name}
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Select Employee"
                                        placeholder="Type name or ID..."
                                        sx={fieldSx}
                                        required
                                        error={touched && !targetEmployee}
                                        helperText={touched && !targetEmployee ? 'Target employee is required' : ''}
                                    />
                                )}
                            />
                        )}

                        <FormControl fullWidth required disabled={isHR}>
                            <InputLabel>Request Type</InputLabel>
                            <Select
                                value={requestType}
                                onChange={(e) => setRequestType(e.target.value)}
                                label="Request Type"
                                sx={fieldSx}
                            >
                                <MenuItem value="New Request">New Request — I need a new asset</MenuItem>
                                <MenuItem value="Declaration">Declaration — I already have this asset</MenuItem>
                                <MenuItem value="Return Request">Return Request — I want to return an asset</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth required>
                            <InputLabel>Priority</InputLabel>
                            <Select value={priority} onChange={(e) => setPriority(e.target.value)} label="Priority" sx={fieldSx}>
                                <MenuItem value="Low">Low</MenuItem>
                                <MenuItem value="Medium">Medium</MenuItem>
                                <MenuItem value="High">High — Urgent</MenuItem>
                            </Select>
                        </FormControl>

                        {requestType !== 'Return Request' && (
                            <Autocomplete
                                fullWidth
                                options={categories}
                                getOptionLabel={(o: any) => o.category_name || o.name || ''}
                                onChange={(_, val) => setAssetCategory(val?.name || '')}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Asset Category"
                                        placeholder="e.g. Laptop, Monitor..."
                                        sx={fieldSx}
                                        required
                                        error={touched && !assetCategory}
                                        helperText={touched && !assetCategory ? 'Asset Category is required' : ''}
                                    />
                                )}
                            />
                        )}

                        {requestType === 'Declaration' && (
                            <>
                                <TextField
                                    fullWidth
                                    label="Asset Name"
                                    value={declarationAssetName}
                                    onChange={(e) => setDeclarationAssetName(e.target.value)}
                                    placeholder="e.g. Dell XPS 15"
                                    required
                                    sx={fieldSx}
                                />
                                <TextField
                                    fullWidth
                                    label="Asset Tag / Serial Number"
                                    value={declarationAssetTag}
                                    onChange={(e) => setDeclarationAssetTag(e.target.value)}
                                    placeholder="e.g. SN-2024-00123"
                                    sx={fieldSx}
                                />
                            </>
                        )}

                        {requestType === 'Return Request' && (
                            <Autocomplete
                                fullWidth
                                options={myAssignedAssets}
                                getOptionLabel={(o: any) => `${o.asset_name} (${o.asset})`}
                                onChange={(_, val) => setReturnAsset(val)}
                                renderOption={(props, option: any) => (
                                    <Box component="li" {...props} sx={{ py: 1.5, px: 2 }}>
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight={700} lineHeight={1.3}>
                                                {option.asset_name}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                ID: {option.asset}
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}
                                renderInput={(params) => <TextField {...params} label="Asset to Return" required placeholder="Select asset..." sx={fieldSx} />}
                            />
                        )}

                        {requestType === 'Return Request' && (
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Proof of Return (optional)</Typography>
                                <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                        <Typography variant="caption" color="text.secondary">Attach photo, receipt, or document as proof</Typography>
                                        <Button
                                            component="label"
                                            variant="outlined"
                                            size="small"
                                            startIcon={<Iconify icon={"solar:upload-bold" as any} />}
                                            sx={{ flexShrink: 0 }}
                                        >
                                            Upload File
                                            <input
                                                type="file"
                                                hidden
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    setReturnAttachmentError('');
                                                    if (file.size > 5 * 1024 * 1024) {
                                                        setReturnAttachmentError('File size exceeds 5MB limit.');
                                                        return;
                                                    }
                                                    setReturnPendingFile(file);
                                                    setReturnAttachment('');
                                                }}
                                            />
                                        </Button>
                                    </Stack>
                                    {!returnAttachment && !returnPendingFile ? (
                                        <Stack alignItems="center" justifyContent="center" sx={{ py: 2, color: 'text.disabled' }}>
                                            <Iconify icon={"solar:file-bold" as any} width={32} height={32} sx={{ mb: 0.5, opacity: 0.48 }} />
                                            <Typography variant="caption">No file attached</Typography>
                                        </Stack>
                                    ) : (
                                        <Stack direction="row" alignItems="flex-start" sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: (t) => alpha(t.palette.grey[500], 0.08) }}>
                                            <Iconify icon={"solar:link-bold" as any} width={18} sx={{ mr: 1, mt: 0.3, color: 'text.secondary', flexShrink: 0 }} />
                                            <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 600, wordBreak: 'break-all', whiteSpace: 'normal' }}>
                                                {returnPendingFile ? returnPendingFile.name : (returnAttachment.split('/').pop() || returnAttachment)}
                                            </Typography>
                                            <Button
                                                size="small"
                                                color="inherit"
                                                onClick={() => { setReturnAttachment(''); setReturnPendingFile(null); }}
                                                sx={{ px: 1, py: 0, height: 24, borderRadius: 1, minWidth: 'auto', typography: 'caption', bgcolor: 'background.paper', border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.24)}` }}
                                            >
                                                Remove
                                            </Button>
                                        </Stack>
                                    )}
                                    {returnAttachmentError && (
                                        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>{returnAttachmentError}</Typography>
                                    )}
                                </Box>
                            </Box>
                        )}

                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Purpose / Remarks"
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            placeholder="Describe why you need this asset or any additional details..."
                            sx={fieldSx}
                            required
                            error={touched && !purpose}
                            helperText={touched && !purpose ? 'Purpose is required to process the request' : ''}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 1.5 }}>
                    <LoadingButton
                        variant="contained"
                        loading={submitting}
                        onClick={handleSubmitRequest}
                        sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
                    >
                        Submit Request
                    </LoadingButton>
                </DialogActions>
            </Dialog>

            {/* ── HR ACTION DIALOG ── */}
            <Dialog open={openHrAction} onClose={() => setOpenHrAction(false)} fullWidth maxWidth="sm">
                <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Stack spacing={0.5}>
                        <Typography variant="h6" fontWeight={700}>
                            {hrAction === 'approve' ? 'Approve Request' : 'Reject Request'}
                        </Typography>
                        {hrActionRequest && (
                            <Typography variant="caption" color="text.secondary">
                                {hrActionRequest.employee_name} · {hrActionRequest.request_type}
                            </Typography>
                        )}
                    </Stack>
                    <IconButton onClick={() => setOpenHrAction(false)}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'grid', gap: 3, mt: 1 }}>
                        {/* For New Request approvals, HR must pick an available asset */}
                        {hrAction === 'approve' && hrActionRequest?.request_type === 'New Request' && (
                            <Autocomplete
                                fullWidth
                                options={availableAssets}
                                getOptionLabel={(o: any) => `${o.asset_name} (${o.name})`}
                                onChange={(_, val) => setAssignAsset(val)}
                                renderOption={(props, option: any) => (
                                    <Box component="li" {...props} sx={{ py: 1.5, px: 2 }}>
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight={700} lineHeight={1.3}>
                                                {option.asset_name}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                ID: {option.name}
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}
                                renderInput={(params) => (
                                    <TextField {...params} label="Select Asset to Assign" required placeholder="Choose an available asset..." sx={fieldSx} />
                                )}
                            />
                        )}

                        {hrAction === 'approve' && hrActionRequest?.request_type === 'Declaration' && (
                            <Box sx={{ display: 'grid', gap: 3, pt: 1 }}>
                                <Alert severity="info" sx={{ mb: 1 }}>
                                    Fill out the remaining details to register <strong>{hrActionRequest?.asset_name}</strong> and approve the request.
                                </Alert>

                                <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                                    <TextField
                                        fullWidth
                                        required
                                        label="Asset Name"
                                        value={decAssetName}
                                        onChange={(e) => setDecAssetName(e.target.value)}
                                        sx={fieldSx}
                                    />
                                    <TextField
                                        fullWidth
                                        label="Asset Tag / Serial No"
                                        value={decAssetTag}
                                        onChange={(e) => setDecAssetTag(e.target.value)}
                                        sx={fieldSx}
                                    />
                                    <Autocomplete
                                        fullWidth
                                        options={categories}
                                        value={decCategory}
                                        onChange={(e, val) => setDecCategory(val)}
                                        getOptionLabel={(o: any) => o.category_name || o.name || ''}
                                        renderInput={(params) => <TextField {...params} label="Category" required sx={fieldSx} />}
                                    />
                                    <TextField
                                        fullWidth
                                        label="Purchase Cost"
                                        type="number"
                                        value={decPurchaseCost}
                                        onChange={(e) => setDecPurchaseCost(e.target.value === '' ? '' : Number(e.target.value))}
                                        sx={fieldSx}
                                    />
                                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                                        <DatePicker
                                            label="Purchase Date"
                                            format="DD-MM-YYYY"
                                            value={decPurchaseDate ? dayjs(decPurchaseDate) : null}
                                            onChange={(newValue) => setDecPurchaseDate(newValue?.format('YYYY-MM-DD') || '')}
                                            slotProps={{
                                                textField: { fullWidth: true, InputLabelProps: { shrink: true }, sx: fieldSx },
                                            }}
                                        />
                                    </LocalizationProvider>
                                </Box>
                            </Box>
                        )}

                        {hrAction === 'approve' && hrActionRequest?.request_type === 'Return Request' && (
                            <Box sx={{ display: 'grid', gap: 2 }}>
                                <Alert severity="warning">
                                    Approving this Return will mark the asset as <strong>Available</strong> and close the assignment.
                                </Alert>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DatePicker
                                        label="Return Date"
                                        format="DD-MM-YYYY"
                                        value={hrReturnDate ? dayjs(hrReturnDate) : null}
                                        onChange={(val) => setHrReturnDate(val?.format('YYYY-MM-DD') || '')}
                                        slotProps={{
                                            textField: { fullWidth: true, InputLabelProps: { shrink: true }, sx: fieldSx, placeholder: 'Today if not set' },
                                        }}
                                    />
                                </LocalizationProvider>
                            </Box>
                        )}

                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="HR Remarks (optional)"
                            value={hrRemarks}
                            onChange={(e) => setHrRemarks(e.target.value)}
                            placeholder="Leave a note for the employee..."
                            sx={fieldSx}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <LoadingButton
                        variant="contained"
                        loading={processingHrAction}
                        onClick={handleHrAction}
                        color={hrAction === 'approve' ? 'success' : 'error'}
                        disabled={hrAction === 'approve' && hrActionRequest?.request_type === 'New Request' && !assignAsset}
                    >
                        {hrAction === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                    </LoadingButton>
                </DialogActions>
            </Dialog>

            {/* ── SNACKBAR ── */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <Popover
                open={!!menuAnchor}
                anchorEl={menuAnchor}
                onClose={handleCloseMenu}
                anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                    sx: { width: 140, p: 0.5 },
                }}
            >
                <MenuItem
                    onClick={() => handleAction(menuRow, 'approve')}
                    sx={{ color: 'success.main', fontWeight: 600 }}
                >
                    <Iconify icon="solar:check-circle-bold" sx={{ mr: 1.5 }} />
                    Approve
                </MenuItem>

                <MenuItem
                    onClick={() => handleAction(menuRow, 'reject')}
                    sx={{ color: 'error.main', fontWeight: 600 }}
                >
                    <Iconify icon="mingcute:close-line" sx={{ mr: 1.5 }} />
                    Reject
                </MenuItem>
            </Popover>

            {/* ── Filters Drawer — My Requests tab ── */}
            <AssetRequestsTableFiltersDrawer
                open={myFiltersOpen}
                onClose={() => setMyFiltersOpen(false)}
                filters={myFilters}
                onFilters={(newF) => { setMyFilters((f) => ({ ...f, ...newF })); setMyPage(0); }}
                canReset={myFilters.type !== 'all' || myFilters.category !== 'all' || myFilters.status !== 'all' || myFilters.priority !== 'all' || !!myFilters.startDate || !!myFilters.endDate || myFilters.unreadOnly}
                onResetFilters={() => { setMyFilters({ type: 'all', category: 'all', status: 'all', priority: 'all', startDate: '', endDate: '', unreadOnly: false }); setMyPage(0); }}
                categories={categories}
                isHR={isHR && activeTab === 'hr-dashboard'}
            />

            {/* ── Filters Drawer — HR Dashboard tab ── */}
            <AssetRequestsTableFiltersDrawer
                open={hrFiltersOpen}
                onClose={() => setHrFiltersOpen(false)}
                filters={hrFilters}
                onFilters={(newF) => { setHrFilters((f) => ({ ...f, ...newF })); setHrPage(0); }}
                canReset={hrFilters.type !== 'all' || hrFilters.category !== 'all' || hrFilters.status !== 'all' || hrFilters.priority !== 'all' || !!hrFilters.startDate || !!hrFilters.endDate || hrFilters.unreadOnly}
                onResetFilters={() => { setHrFilters({ type: 'all', category: 'all', status: 'all', priority: 'all', startDate: '', endDate: '', unreadOnly: false }); setHrPage(0); }}
                categories={categories}
                isHR={isHR && activeTab === 'hr-dashboard'}
            />

            {/* ── Asset Request Details Dialog ── */}
            <AssetRequestDetailsDialog
                open={openDetails}
                onClose={() => {
                    setOpenDetails(false);
                    setSelectedRequestName(null);
                }}
                requestName={selectedRequestName}
                isHR={!!isHR}
                canEdit={canEditAssetRequest}
                onApprove={(req) => handleAction(req, 'approve')}
                onReject={(req) => handleAction(req, 'reject')}
            />
        </DashboardContent>
    );
}
