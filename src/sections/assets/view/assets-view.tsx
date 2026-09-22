import dayjs from 'dayjs';
import { useState, useCallback, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import { alpha } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useAssets } from 'src/hooks/useAssets';

import { frappeRequest } from 'src/utils/csrf';

import { DashboardContent } from 'src/layouts/dashboard';
import { createAsset, updateAsset, deleteAsset, getAssetPermissions, getAssetCategories, createAssetCategory } from 'src/api/assets';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { TableNoData } from 'src/sections/lead/table-no-data';
import { TableEmptyRows } from 'src/sections/lead/table-empty-rows';
import { AssetTableRow } from 'src/sections/assets/assets-table-row';
import { AssetImportDialog } from 'src/sections/assets/asset-import-dialog';
import { LeadTableHead as AssetTableHead } from 'src/sections/lead/lead-table-head';
import { AssetDetailsDialog } from 'src/sections/report/assets/assets-details-dialog';
import { AssetsTableFiltersDrawer } from 'src/sections/assets/assets-table-filters-drawer';
import { LeadTableToolbar as AssetTableToolbar } from 'src/sections/lead/lead-table-toolbar';

import { useAuth } from 'src/auth/auth-context';
// ----------------------------------------------------------------------

export function AssetsView() {
    const { user } = useAuth();
    // Permissions
    const [permissions, setPermissions] = useState({ read: false, write: false, delete: false });

    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && !!user?.permissions?.actions?.asset_list;
    const actionPerms = user?.permissions?.actions?.asset_list;
    const canCreateAsset = hasCustomPerms && actionPerms ? !!actionPerms?.create : permissions.write;
    const canEditAsset = hasCustomPerms && actionPerms ? !!actionPerms?.edit : permissions.write;
    const canDeleteAsset = hasCustomPerms && actionPerms ? !!actionPerms?.delete : permissions.delete;
    const canImportAsset = hasCustomPerms && actionPerms ? !!actionPerms?.import : permissions.write;

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [orderBy, setOrderBy] = useState('modified');
    const [selected, setSelected] = useState<string[]>([]);

    const [filters, setFilters] = useState<{
        status: string;
        category: string;
        startDate: string | null;
        endDate: string | null;
    }>({
        status: 'all',
        category: 'all',
        startDate: null,
        endDate: null
    });

    const [openFilters, setOpenFilters] = useState(false);
    const canReset = filters.status !== 'all' || filters.category !== 'all' || filters.startDate !== null || filters.endDate !== null || !!filterName;

    const { data, total, loading, refetch } = useAssets(page + 1, rowsPerPage, filterName, orderBy, order, filters);

    const [openCreate, setOpenCreate] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [currentAsset, setCurrentAsset] = useState<any>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
    const [openImport, setOpenImport] = useState(false);

    // View state
    const [openView, setOpenView] = useState(false);
    const [viewAsset, setViewAsset] = useState<any>(null);

    // Form state
    const [assetName, setAssetName] = useState('');
    const [assetTag, setAssetTag] = useState('');
    const [category, setCategory] = useState('');
    const [purchaseDate, setPurchaseDate] = useState('');
    const [purchaseCost, setPurchaseCost] = useState('');
    const [currentStatus, setCurrentStatus] = useState('Available');
    const [description, setDescription] = useState('');
    const [touched, setTouched] = useState(false);

    // attachment upload state
    const [assetAttachment, setAssetAttachment] = useState('');
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [attachmentError, setAttachmentError] = useState('');

    // Snackbar
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const [categories, setCategories] = useState<any[]>([]);
    const [loadingCategories, setLoadingLoadingCategories] = useState(false);
    const [openCreateCategory, setOpenCreateCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryDescription, setNewCategoryDescription] = useState('');
    const [creatingCategory, setCreatingCategory] = useState(false);

    // Initialize filter options
    const filter = createFilterOptions<any>();

    // Load permissions
    useEffect(() => {
        getAssetPermissions().then(setPermissions);
    }, []);

    const handleFilters = (newFilters: Partial<typeof filters>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        setPage(0);
    };

    const handleResetFilters = () => {
        setFilters({
            status: 'all',
            category: 'all',
            startDate: null,
            endDate: null
        });
        setPage(0);
    };

    const handleSortChange = (value: string) => {
        if (value === 'date_desc') { setOrderBy('modified'); setOrder('desc'); }
        else if (value === 'date_asc') { setOrderBy('modified'); setOrder('asc'); }
        else if (value === 'cost_desc') { setOrderBy('purchase_cost'); setOrder('desc'); }
        else if (value === 'cost_asc') { setOrderBy('purchase_cost'); setOrder('asc'); }
        else if (value === 'name_asc') { setOrderBy('asset_name'); setOrder('asc'); }
        else if (value === 'name_desc') { setOrderBy('asset_name'); setOrder('desc'); }
        setPage(0);
    };

    const getCurrentSortValue = () => {
        if (orderBy === 'modified') return order === 'desc' ? 'date_desc' : 'date_asc';
        if (orderBy === 'purchase_cost') return order === 'desc' ? 'cost_desc' : 'cost_asc';
        if (orderBy === 'asset_name') return order === 'desc' ? 'name_desc' : 'name_asc';
        return 'date_desc';
    };

    const handleSelectAllRows = (checked: boolean) => {
        if (checked) {
            setSelected(data.map((row) => row.name));
        } else {
            setSelected([]);
        }
    };

    const handleSelectRow = (name: string) => {
        setSelected((prev) =>
            prev.includes(name) ? prev.filter((id) => id !== name) : [...prev, name]
        );
    };

    const handleBulkDelete = async () => {
        try {
            await Promise.all(selected.map((name) => deleteAsset(name)));
            setSnackbar({ open: true, message: `${selected.length} asset(s) deleted successfully`, severity: 'success' });
            setSelected([]);
            refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Failed to delete assets', severity: 'error' });
        }
    };

    const handleOpenCreate = () => {
        setIsEdit(false);
        setCurrentAsset(null);
        setAssetName('');
        setAssetTag('');
        setCategory('');
        setPurchaseDate('');
        setPurchaseCost('');
        setCurrentStatus('Available');
        setDescription('');
        setTouched(false);
        setAssetAttachment('');
        setPendingFile(null);
        setAttachmentError('');
        setOpenCreate(true);
        loadCategories();
    };

    const loadCategories = async () => {
        setLoadingLoadingCategories(true);
        try {
            const categoryData = await getAssetCategories();
            setCategories(categoryData);
        } catch (error) {
            console.error('Failed to load categories', error);
        } finally {
            setLoadingLoadingCategories(false);
        }
    };

    const handleCloseCreate = () => {
        setOpenCreate(false);
        setIsEdit(false);
        setCurrentAsset(null);
        setAssetName('');
        setAssetTag('');
        setCategory('');
        setPurchaseDate('');
        setPurchaseCost('');
        setCurrentStatus('Available');
        setDescription('');
        setTouched(false);
        setAssetAttachment('');
        setPendingFile(null);
        setAttachmentError('');
    };

    const handleEditRow = useCallback((row: any) => {
        setCurrentAsset(row);
        setAssetName(row.asset_name || '');
        setAssetTag(row.asset_tag || '');
        setCategory(row.category || '');
        setPurchaseDate(row.purchase_date || '');
        setPurchaseCost(row.purchase_cost?.toString() || '');
        setCurrentStatus(row.current_status || 'Available');
        setDescription(row.description || '');
        setTouched(false);
        setAssetAttachment(row.asset_attachment || '');
        setPendingFile(null);
        setAttachmentError('');
        setIsEdit(true);
        setOpenCreate(true);
        loadCategories();
    }, []);

    const handleViewRow = useCallback((row: any) => {
        setViewAsset(row);
        setOpenView(true);
    }, []);

    const handleDeleteRow = useCallback((id: string) => {
        setConfirmDelete({ open: true, id });
    }, []);

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        try {
            await deleteAsset(confirmDelete.id);
            setSnackbar({ open: true, message: 'Asset deleted successfully', severity: 'success' });
            refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Failed to delete asset', severity: 'error' });
        } finally {
            setConfirmDelete({ open: false, id: null });
        }
    };

    const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setTouched(true);

        if (!assetName.trim() || !category) {
            const errs: string[] = [];
            if (!assetName.trim()) errs.push('assetName');
            if (!category) errs.push('category');

            if (errs.length > 1) {
                setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
            } else if (errs[0] === 'assetName') {
                setSnackbar({ open: true, message: 'Asset Name is required', severity: 'error' });
            } else {
                setSnackbar({ open: true, message: 'Category is required', severity: 'error' });
            }
            return;
        }

        let finalAttachmentUrl = assetAttachment;

        if (pendingFile) {
            setUploading(true);
            const formDataUpload = new FormData();
            formDataUpload.append('file', pendingFile, pendingFile.name);
            formDataUpload.append('is_private', '0');

            try {
                const response = await frappeRequest('/api/method/upload_file', {
                    method: 'POST',
                    body: formDataUpload,
                });
                const result = await response.json();

                const fileUrl = result.message?.file_url || result.file_url;
                if (fileUrl) {
                    finalAttachmentUrl = fileUrl;
                } else {
                    console.warn('Unexpected upload response format:', result);
                    setSnackbar({ open: true, message: 'File upload failed, proceeding without attachment', severity: 'error' });
                }
            } catch (error) {
                console.error('Upload failed:', error);
                setSnackbar({ open: true, message: 'File upload failed, proceeding without attachment', severity: 'error' });
            } finally {
                setUploading(false);
            }
        }

        const assetData = {
            asset_name: assetName.trim(),
            asset_tag: assetTag.trim(),
            category: category.trim(),
            purchase_date: purchaseDate,
            purchase_cost: parseFloat(purchaseCost) || 0,
            current_status: currentStatus,
            description: description.trim(),
            asset_attachment: finalAttachmentUrl
        };

        try {
            if (isEdit && currentAsset) {
                await updateAsset(currentAsset.name, assetData);
                setSnackbar({ open: true, message: 'Asset updated successfully', severity: 'success' });
            } else {
                await createAsset(assetData);
                setSnackbar({ open: true, message: 'Asset created successfully', severity: 'success' });
            }
            handleCloseCreate();
            refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Operation failed', severity: 'error' });
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setAttachmentError('');

        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
        if (file.size > MAX_FILE_SIZE) {
            setAttachmentError('File size is too large. Maximum allowed size is 5MB.');
            return;
        }

        setPendingFile(file);
        setAssetAttachment('');
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        setCreatingCategory(true);
        try {
            const created = await createAssetCategory(newCategoryName.trim(), newCategoryDescription.trim());
            setCategory(created.name);
            setSnackbar({ open: true, message: 'Category created successfully', severity: 'success' });
            await loadCategories();
            setOpenCreateCategory(false);
            setNewCategoryName('');
            setNewCategoryDescription('');
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Failed to create category', severity: 'error' });
        } finally {
            setCreatingCategory(false);
        }
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleFilterByName = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFilterName(event.target.value);
        setPage(0);
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const notFound = !loading && !data.length && !!filterName;
    const empty = !loading && !data.length && !filterName;

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ flexGrow: 1 }}>
                    Assets
                </Typography>

                {(canCreateAsset || canImportAsset) && (
                    <Stack direction="row" spacing={1}>
                        {canImportAsset && (
                            <Button
                                variant="outlined"
                                startIcon={<Iconify icon="solar:import-bold-duotone" />}
                                onClick={() => setOpenImport(true)}
                            >
                                Import
                            </Button>
                        )}
                        {canCreateAsset && (
                            <Button
                                variant="contained"
                                startIcon={<Iconify icon="mingcute:add-line" />}
                                onClick={handleOpenCreate}
                                sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                            >
                                New Asset
                            </Button>
                        )}
                    </Stack>
                )}
            </Box>

            <Card>
                <AssetTableToolbar
                    numSelected={selected.length}
                    filterName={filterName}
                    onFilterName={handleFilterByName}
                    searchPlaceholder="Search assets..."
                    onDelete={selected.length > 0 ? handleBulkDelete : undefined}
                    onOpenFilter={() => setOpenFilters(true)}
                    canReset={canReset}
                    sortBy={getCurrentSortValue()}
                    onSortChange={handleSortChange}
                    sortOptions={[
                        { value: 'date_desc', label: 'Newest First' },
                        { value: 'date_asc', label: 'Oldest First' },
                        { value: 'cost_desc', label: 'Cost: High to Low' },
                        { value: 'cost_asc', label: 'Cost: Low to High' },
                        { value: 'name_asc', label: 'Name: A to Z' },
                        { value: 'name_desc', label: 'Name: Z to A' },
                    ]}
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: 800 }}>
                            <AssetTableHead
                                order={order}
                                orderBy={orderBy}
                                rowCount={data.length}
                                numSelected={selected.length}
                                onSelectAllRows={(checked: boolean) => handleSelectAllRows(checked)}
                                hideCheckbox
                                showIndex
                                headLabel={[
                                    { id: 'asset_name', label: 'Asset Name' },
                                    { id: 'asset_tag', label: 'Tag' },
                                    { id: 'category', label: 'Category' },
                                    { id: 'current_status', label: 'Status' },
                                    { id: 'purchase_cost', label: 'Cost' },
                                    { id: 'purchase_date', label: 'Purchase Date' },
                                    { id: '', label: '' },
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
                                        {data.map((row, index) => (
                                            <AssetTableRow
                                                key={row.name}
                                                index={page * rowsPerPage + index}
                                                hideCheckbox
                                                row={{
                                                    id: row.name,
                                                    asset_name: row.asset_name,
                                                    asset_tag: row.asset_tag,
                                                    category: row.category,
                                                    current_status: row.current_status,
                                                    purchase_cost: row.purchase_cost,
                                                    purchase_date: row.purchase_date,
                                                }}
                                                selected={selected.includes(row.name)}
                                                onSelectRow={() => handleSelectRow(row.name)}
                                                onView={() => handleViewRow(row)}
                                                onEdit={() => handleEditRow(row)}
                                                onDelete={() => handleDeleteRow(row.name)}
                                                canEdit={permissions.write && canEditAsset}
                                                canDelete={permissions.delete && canDeleteAsset}
                                            />
                                        ))}

                                        {!empty && !notFound && (
                                            <TableEmptyRows height={68} emptyRows={data.length < 5 ? 5 - data.length : 0} />
                                        )}

                                        {notFound && <TableNoData searchQuery={filterName} />}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={8}>
                                                    <EmptyContent
                                                        title="No assets found"
                                                        description="You haven't added any assets yet. Click 'New Asset' to get started."
                                                        icon="solar:laptop-bold-duotone"
                                                    />
                                                </TableCell>
                                            </TableRow>
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
                    onPageChange={handleChangePage}
                    rowsPerPageOptions={[10, 25, 50]}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Card>

            <AssetsTableFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
            />

            {/* Create Category Dialog */}
            <Dialog
                open={openCreateCategory}
                onClose={() => setOpenCreateCategory(false)}
                fullWidth
                maxWidth="xs"
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        boxShadow: (theme) => theme.customShadows?.z24 || theme.shadows[24],
                    }
                }}
            >
                <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Iconify icon={"solar:folder-plus-bold" as any} width={24} sx={{ color: 'primary.main' }} />
                        <Typography variant="h6">New Category</Typography>
                    </Stack>
                    <IconButton
                        aria-label="close"
                        onClick={() => setOpenCreateCategory(false)}
                        sx={{ color: (theme) => theme.palette.grey[500] }}
                    >
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    <Box sx={{ py: 1.5 }}>
                        <TextField
                            fullWidth
                            label="Category Name"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="e.g., Laptops, Furniture"
                            autoFocus
                            sx={{
                                mb: 3,
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
                                    borderRadius: 1.5,
                                }
                            }}
                        />

                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Description"
                            value={newCategoryDescription}
                            onChange={(e) => setNewCategoryDescription(e.target.value)}
                            placeholder="Enter category description..."
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
                                    borderRadius: 1.5,
                                }
                            }}
                        />
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 2.5 }}>
                    <LoadingButton
                        variant="contained"
                        color="primary"
                        onClick={handleCreateCategory}
                        loading={creatingCategory}
                        disabled={!newCategoryName.trim()}
                        sx={{ borderRadius: 1, minWidth: 100 }}
                    >
                        Create
                    </LoadingButton>
                </DialogActions>
            </Dialog>

            {/* Create/Edit Dialog */}
            <Dialog
                open={openCreate}
                onClose={handleCloseCreate}
                fullWidth
                maxWidth="md"
                PaperProps={{
                    sx: {
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 2,
                        boxShadow: (themeVar) => themeVar.customShadows.z24,
                    }
                }}
            >
                <form onSubmit={handleCreate} noValidate style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {isEdit ? 'Edit Asset' : 'New Asset'}
                        <IconButton onClick={handleCloseCreate}>
                            <Iconify icon="mingcute:close-line" />
                        </IconButton>
                    </DialogTitle>

                    <DialogContent dividers sx={{ flexGrow: 1, overflowY: 'auto' }}>
                        <Box sx={{ display: 'grid', gap: 3, margin: '1rem', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                            <TextField
                                fullWidth
                                label="Asset Name"
                                value={assetName}
                                onChange={(e) => setAssetName(e.target.value)}
                                required
                                error={touched && !assetName.trim()}
                                helperText={touched && !assetName.trim() ? 'Asset Name is required' : ''}
                                placeholder="Enter asset name"
                            />

                            <TextField
                                fullWidth
                                label="Asset Tag / Serial Number"
                                value={assetTag}
                                onChange={(e) => setAssetTag(e.target.value)}
                                placeholder="Enter Tag / Serial Number"
                            />

                            <Autocomplete
                                fullWidth
                                options={categories}
                                value={categories.find(c => c.name === category) || (category ? { name: category, category_name: category } : null)}
                                onChange={async (event, newValue) => {
                                    if (newValue?.isCreateNew) {
                                        setOpenCreateCategory(true);
                                    } else {
                                        setCategory(newValue?.name || '');
                                    }
                                }}
                                filterOptions={(options, params) => {
                                    const filtered = filter(options, params);

                                    // Add static "Add Category" button at the bottom
                                    filtered.push({
                                        category_name: 'Create new Asset Category',
                                        name: 'create_new_category',
                                        isCreateNew: true
                                    });

                                    return filtered;
                                }}
                                selectOnFocus
                                clearOnBlur
                                handleHomeEndKeys
                                getOptionLabel={(option) => {
                                    // Value selected with enter, right from the input
                                    if (typeof option === 'string') {
                                        return option;
                                    }
                                    // Add "xxx" option created dynamically
                                    if (option.inputValue) {
                                        return option.inputValue;
                                    }
                                    // Regular option
                                    return option.category_name || '';
                                }}
                                renderOption={(props, option: any) => {
                                    const { key, ...optionProps } = props as any;

                                    return (
                                        <li
                                            key={key}
                                            {...optionProps}
                                            style={{
                                                padding: 0,
                                                margin: 0,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    width: '100%',
                                                    px: 2,
                                                    py: option.isCreateNew ? 1.6 : 1,
                                                    borderTop: option.isCreateNew ? '1px solid' : 'none',
                                                    borderColor: 'divider',
                                                    color: option.isCreateNew ? 'primary.main' : 'text.primary',
                                                    bgcolor: option.isCreateNew ? 'rgba(33, 150, 243, 0.08)' : 'transparent',

                                                    '&:hover': {
                                                        bgcolor: option.isCreateNew
                                                            ? 'rgba(33, 150, 243, 0.12)'
                                                            : 'action.hover',
                                                    },
                                                }}
                                            >
                                                {option.isCreateNew ? (
                                                    <>
                                                        <Iconify
                                                            icon="solar:add-circle-bold"
                                                            width={20}
                                                            style={{ marginRight: 12 }}
                                                        />
                                                        <Typography
                                                            variant="subtitle2"
                                                            fontWeight={600}
                                                        >
                                                            Create Asset Category
                                                        </Typography>
                                                    </>
                                                ) : (
                                                    <Typography variant="body2">
                                                        {option.category_name}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </li>
                                    );
                                }}
                                slotProps={{
                                    paper: {
                                        sx: {
                                            '& ul': {
                                                padding: 0,
                                            },
                                        },
                                    },
                                }}
                                loading={loadingCategories}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Category"
                                        placeholder="Search or create category..."
                                        required
                                        error={touched && !category}
                                        helperText={touched && !category ? 'Category is required' : ''}
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <>
                                                    {loadingCategories ? <CircularProgress color="inherit" size={20} /> : null}
                                                    {params.InputProps.endAdornment}
                                                </>
                                            ),
                                        }}
                                    />
                                )}
                            />

                            <FormControl fullWidth required>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={currentStatus}
                                    onChange={(e) => setCurrentStatus(e.target.value)}
                                    label="Status"
                                >
                                    <MenuItem value="Available">Available</MenuItem>
                                    <MenuItem value="Assigned">Assigned</MenuItem>
                                    <MenuItem value="Maintenance">Maintenance</MenuItem>
                                    <MenuItem value="Disposed">Disposed</MenuItem>
                                </Select>
                            </FormControl>

                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    label="Purchase Date"
                                    format="DD-MM-YYYY"
                                    value={purchaseDate ? dayjs(purchaseDate) : null}
                                    onChange={(newValue) => setPurchaseDate(newValue?.format('YYYY-MM-DD') || '')}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            InputLabelProps: { shrink: true },
                                        },
                                    }}
                                />
                            </LocalizationProvider>

                            <TextField
                                fullWidth
                                label="Purchase Cost"
                                type="number"
                                value={purchaseCost}
                                onChange={(e) => setPurchaseCost(e.target.value)}
                                placeholder="Enter cost"
                                inputProps={{ step: '0.01', min: '0' }}
                            />

                            <TextField
                                fullWidth
                                label="Description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                multiline
                                rows={3}
                                placeholder="Enter asset description"
                                sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
                            />

                            {/* Attachments Section */}
                            <Box
                                sx={{
                                    p: 3,
                                    borderRadius: 2,
                                    gridColumn: { xs: '1', sm: '1 / -1' },
                                    bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
                                    border: (theme) => `1px dashed ${alpha(theme.palette.grey[500], 0.2)}`,
                                }}
                            >
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                                    justifyContent="space-between"
                                    spacing={2}
                                    sx={{ mb: 2.5 }}
                                >
                                    <Typography variant="h6">Attachments</Typography>

                                    <Button
                                        variant="contained"
                                        component="label"
                                        color="primary"
                                        size="small"
                                        startIcon={<Iconify icon={"solar:upload-bold" as any} />}
                                        disabled={uploading}
                                        sx={{ minWidth: { xs: 1, sm: 'auto' } }}
                                    >
                                        {uploading ? 'Uploading...' : 'Upload File'}
                                        <input type="file" hidden onChange={handleFileUpload} />
                                    </Button>
                                </Stack>

                                <Stack spacing={1}>
                                    {!assetAttachment && !pendingFile ? (
                                        <Stack alignItems="center" justifyContent="center" sx={{ py: 3, color: 'text.disabled' }}>
                                            <Iconify icon={"solar:file-bold" as any} width={40} height={40} sx={{ mb: 1, opacity: 0.48 }} />
                                            <Typography variant="body2">No attachments yet</Typography>
                                        </Stack>
                                    ) : (
                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            sx={{
                                                px: 1.5,
                                                py: 0.75,
                                                borderRadius: 1.5,
                                                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                                            }}
                                        >
                                            <Iconify icon={"solar:link-bold" as any} width={20} sx={{ mr: 1, color: 'text.secondary', flexShrink: 0 }} />
                                            <Typography variant="body2" noWrap sx={{ flexGrow: 1, fontWeight: 'fontWeightMedium' }}>
                                                {pendingFile ? pendingFile.name : (assetAttachment.split('/').pop() || assetAttachment)}
                                            </Typography>
                                            <Button
                                                size="small"
                                                color="inherit"
                                                onClick={() => { setAssetAttachment(''); setPendingFile(null); }}
                                                sx={{
                                                    px: 1.5,
                                                    py: 0,
                                                    height: 26,
                                                    borderRadius: 1.5,
                                                    minWidth: 'auto',
                                                    typography: 'caption',
                                                    bgcolor: 'background.paper',
                                                    border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.24)}`,
                                                    '&:hover': {
                                                        bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                                                    },
                                                }}
                                            >
                                                Remove
                                            </Button>
                                        </Stack>
                                    )}
                                    {attachmentError && (
                                        <Typography variant="caption" color="error" sx={{ mt: 1, textAlign: 'center' }}>
                                            {attachmentError}
                                        </Typography>
                                    )}
                                </Stack>
                            </Box>
                        </Box>
                    </DialogContent>

                    <DialogActions sx={{ p: 1.5 }}>
                        <LoadingButton type="submit" variant="contained" loading={uploading}>
                            {isEdit ? 'Update' : 'Create'}
                        </LoadingButton>
                    </DialogActions>
                </form>
            </Dialog>

            {/* View Dialog */}
            <AssetDetailsDialog
                open={openView}
                onClose={() => setOpenView(false)}
                asset={viewAsset}
            />

            <AssetImportDialog
                open={openImport}
                onClose={() => setOpenImport(false)}
                onRefresh={refetch}
            />

            {/* Snackbar */}
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

            <ConfirmDialog
                open={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null })}
                title="Confirm Delete"
                content="Are you sure you want to delete this asset?"
                action={
                    <Button onClick={handleConfirmDelete} color="error" variant="contained" sx={{ borderRadius: 1.5, minWidth: 100 }}>
                        Delete
                    </Button>
                }
            />
        </DashboardContent>
    );
}
