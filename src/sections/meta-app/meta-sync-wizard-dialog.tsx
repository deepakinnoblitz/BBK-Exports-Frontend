import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import OutlinedInput from '@mui/material/OutlinedInput';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { previewGraphApiPages, previewGraphApiForms, importSelectedPagesAndForms } from 'src/api/meta-app';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { TableNoData } from 'src/components/table';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';

// ----------------------------------------------------------------------

type MetaSyncWizardDialogProps = {
    open: boolean;
    onClose: () => void;
    accountName?: string | null;
    initialStep?: 1 | 2;
    onSuccess: (importedPagesCount: number, importedFormsCount: number) => void;
};

export function MetaSyncWizardDialog({ open, onClose, accountName, initialStep = 1, onSuccess }: MetaSyncWizardDialogProps) {
    const [activeStep, setActiveStep] = useState<1 | 2>(initialStep);
    const [loadingPages, setLoadingPages] = useState(false);
    const [loadingForms, setLoadingForms] = useState(false);
    const [importing, setImporting] = useState(false);

    // Raw Graph API preview records
    const [pages, setPages] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);

    // Selected Page IDs and Form IDs
    const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
    const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);

    // Search filters
    const [pageFilter, setPageFilter] = useState('');
    const [formFilter, setFormFilter] = useState('');

    // Pagination
    const [pageNumber1, setPageNumber1] = useState(0);
    const [rowsPerPage1, setRowsPerPage1] = useState(10);

    const [pageNumber2, setPageNumber2] = useState(0);
    const [rowsPerPage2, setRowsPerPage2] = useState(10);

    // Fetch Pages/Forms on Dialog open
    useEffect(() => {
        if (open) {
            setActiveStep(initialStep);
            setPageFilter('');
            setFormFilter('');
            setSelectedPageIds([]);
            setSelectedFormIds([]);
            setForms([]);

            const loadData = async () => {
                if (initialStep === 2) {
                    setLoadingForms(true);
                    setLoadingPages(true);
                    try {
                        const [pageRes, formRes] = await Promise.all([
                            previewGraphApiPages(accountName || undefined).catch(() => ({ pages: [] })),
                            previewGraphApiForms(undefined).catch(() => ({ forms: [] }))
                        ]);

                        const fetchedPages = pageRes?.pages || [];
                        setPages(fetchedPages);
                        setSelectedPageIds(fetchedPages.map((p: any) => p.page_id));

                        const fetchedForms = formRes?.forms || [];
                        setForms(fetchedForms);
                        setSelectedFormIds(fetchedForms.map((f: any) => f.form_id));
                    } catch (err) {
                        console.error('Failed to preview data:', err);
                    } finally {
                        setLoadingForms(false);
                        setLoadingPages(false);
                    }
                } else {
                    setLoadingPages(true);
                    try {
                        const res = await previewGraphApiPages(accountName || undefined);
                        const fetchedPages = res?.pages || [];
                        setPages(fetchedPages);
                        setSelectedPageIds(fetchedPages.map((p: any) => p.page_id));
                    } catch (err) {
                        console.error('Failed to preview pages:', err);
                    } finally {
                        setLoadingPages(false);
                    }
                }
            };
            loadData();
        }
    }, [open, accountName, initialStep]);

    // Step 1: Filtered Pages
    const filteredPages = useMemo(() => {
        if (!pageFilter.trim()) return pages;
        const q = pageFilter.toLowerCase().trim();
        return pages.filter(
            (p) => p.page_name?.toLowerCase().includes(q) || p.page_id?.toString().includes(q)
        );
    }, [pages, pageFilter]);

    const paginatedPages = useMemo(
        () => filteredPages.slice(pageNumber1 * rowsPerPage1, pageNumber1 * rowsPerPage1 + rowsPerPage1),
        [filteredPages, pageNumber1, rowsPerPage1]
    );

    // Page Selection Checkbox Helpers
    const isAllPagesSelected = filteredPages.length > 0 && filteredPages.every((p) => selectedPageIds.includes(p.page_id));
    const isSomePagesSelected = filteredPages.some((p) => selectedPageIds.includes(p.page_id)) && !isAllPagesSelected;

    const handleToggleSelectAllPages = () => {
        if (isAllPagesSelected) {
            setSelectedPageIds([]);
        } else {
            setSelectedPageIds(filteredPages.map((p) => p.page_id));
        }
    };

    const handleTogglePage = (pageId: string) => {
        setSelectedPageIds((prev) =>
            prev.includes(pageId) ? prev.filter((id) => id !== pageId) : [...prev, pageId]
        );
    };

    // Transition Step 1 -> Step 2: Fetch Forms for selected pages
    const handleContinueToForms = async () => {
        if (selectedPageIds.length === 0) return;

        const selectedPageObjects = pages.filter((p) => selectedPageIds.includes(p.page_id));
        setLoadingForms(true);
        setActiveStep(2);
        setFormFilter('');
        setSelectedFormIds([]);

        try {
            const res = await previewGraphApiForms(selectedPageObjects);
            const fetchedForms = res?.forms || [];
            setForms(fetchedForms);
            // Pre-select all fetched forms by default
            setSelectedFormIds(fetchedForms.map((f: any) => f.form_id));
        } catch (err) {
            console.error('Failed to preview forms:', err);
        } finally {
            setLoadingForms(false);
        }
    };

    // Step 2: Filtered Forms
    const filteredForms = useMemo(() => {
        if (!formFilter.trim()) return forms;
        const q = formFilter.toLowerCase().trim();
        return forms.filter(
            (f) =>
                f.form_name?.toLowerCase().includes(q) ||
                f.form_id?.toString().includes(q) ||
                f.page_name?.toLowerCase().includes(q)
        );
    }, [forms, formFilter]);

    const paginatedForms = useMemo(
        () => filteredForms.slice(pageNumber2 * rowsPerPage2, pageNumber2 * rowsPerPage2 + rowsPerPage2),
        [filteredForms, pageNumber2, rowsPerPage2]
    );

    // Form Selection Checkbox Helpers
    const isAllFormsSelected = filteredForms.length > 0 && filteredForms.every((f) => selectedFormIds.includes(f.form_id));
    const isSomeFormsSelected = filteredForms.some((f) => selectedFormIds.includes(f.form_id)) && !isAllFormsSelected;

    const handleToggleSelectAllForms = () => {
        if (isAllFormsSelected) {
            setSelectedFormIds([]);
        } else {
            setSelectedFormIds(filteredForms.map((f) => f.form_id));
        }
    };

    const handleToggleForm = (formId: string) => {
        setSelectedFormIds((prev) =>
            prev.includes(formId) ? prev.filter((id) => id !== formId) : [...prev, formId]
        );
    };

    // Commit Import Action
    const handleCommitImport = async () => {
        if (selectedFormIds.length === 0 && selectedPageIds.length === 0) return;

        const selectedPageObjects = pages.filter((p) => selectedPageIds.includes(p.page_id));
        const selectedFormObjects = forms.filter((f) => selectedFormIds.includes(f.form_id));

        setImporting(true);
        try {
            const res = await importSelectedPagesAndForms(
                accountName || undefined,
                selectedPageObjects,
                selectedFormObjects
            );
            if (res?.success) {
                onSuccess(res.imported_pages || selectedPageObjects.length, res.imported_forms || selectedFormObjects.length);
                onClose();
            }
        } catch (err) {
            console.error('Import failed:', err);
        } finally {
            setImporting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    boxShadow: (theme) => theme.customShadows.z24,
                },
            }}
        >
            {/* Wizard Dialog Header */}
            <DialogTitle sx={{ pb: 2, pt: 2.5, borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                    <Stack spacing={0.5}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                            {activeStep === 1 ? 'Select Facebook Pages' : 'Select Lead Forms'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {activeStep === 1
                                ? 'Choose the Facebook Pages you want to synchronize with CRM.'
                                : 'Choose which Lead Forms should be imported into CRM.'}
                        </Typography>
                    </Stack>

                    {/* Compact Top-Right Step Badge */}
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1.25}
                        sx={{
                            py: 0.75,
                            px: 1.5,
                            borderRadius: 2,
                            bgcolor: (theme) => alpha(theme.palette.background.neutral, 0.8),
                            border: (theme) => `1px solid ${theme.palette.divider}`,
                            flexShrink: 0,
                        }}
                    >
                        {/* Step 1 */}
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                            <Box
                                sx={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: activeStep >= 1 ? '#00b894' : 'action.disabledBackground',
                                    color: '#fff',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                }}
                            >
                                {activeStep > 1 ? <Iconify icon="eva:checkmark-fill" width={14} /> : '1'}
                            </Box>
                            <Typography
                                variant="caption"
                                sx={{
                                    fontWeight: activeStep === 1 ? 700 : 500,
                                    fontSize: '0.75rem',
                                    color: activeStep === 1 ? 'text.primary' : 'text.disabled',
                                }}
                            >
                                Facebook Pages
                            </Typography>
                        </Stack>

                        {/* Connecting Line */}
                        <Box
                            sx={{
                                width: 20,
                                height: 2,
                                bgcolor: activeStep === 2 ? '#00b894' : 'divider',
                                borderRadius: 1,
                            }}
                        />

                        {/* Step 2 */}
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                            <Box
                                sx={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: activeStep === 2 ? '#00b894' : 'action.disabledBackground',
                                    color: activeStep === 2 ? '#fff' : 'text.disabled',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                }}
                            >
                                2
                            </Box>
                            <Typography
                                variant="caption"
                                sx={{
                                    fontWeight: activeStep === 2 ? 700 : 500,
                                    fontSize: '0.75rem',
                                    color: activeStep === 2 ? 'text.primary' : 'text.disabled',
                                }}
                            >
                                Lead Forms
                            </Typography>
                        </Stack>
                    </Stack>
                </Stack>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 3 }}>
                {activeStep === 1 ? (
                    // ----------------------------------------------------------------------
                    // DIALOG STEP 1: Facebook Pages Selection Table
                    // ----------------------------------------------------------------------
                    <Stack spacing={2.5}>
                        {/* Search & Toolbar */}
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                            <OutlinedInput
                                value={pageFilter}
                                onChange={(e) => setPageFilter(e.target.value)}
                                placeholder="Search pages by name or ID..."
                                size="small"
                                sx={{ width: 320 }}
                                startAdornment={
                                    <InputAdornment position="start">
                                        <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                                    </InputAdornment>
                                }
                            />

                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                {selectedPageIds.length} of {pages.length} selected
                            </Typography>
                        </Stack>

                        {/* Pages Table */}
                        <TableContainer sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 1.5, minHeight: 350, position: 'relative' }}>
                            <Scrollbar>
                                <Table size="medium" sx={{ minWidth: 680 }}>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: (theme) => theme.palette.background.neutral }}>
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    indeterminate={isSomePagesSelected}
                                                    checked={isAllPagesSelected}
                                                    onChange={handleToggleSelectAllPages}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Page Name</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Page ID</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700 }}>Active</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700 }}>Connected</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700 }}>Webhook</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700 }}>Existing</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {loadingPages ? (
                                            <TableRow>
                                                <TableCell colSpan={7} sx={{ borderBottom: 'none' }}>
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 250, py: 6, gap: 2 }}>
                                                        <CircularProgress size={36} />
                                                        <Typography variant="body2" color="text.secondary">Fetching Facebook Pages from Meta...</Typography>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ) : paginatedPages.length === 0 ? (
                                            pageFilter ? (
                                                <TableNoData colSpan={7} searchQuery={pageFilter} sx={{ '& td': { py: 8, borderBottom: 'none' } }} />
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={7} sx={{ p: 0, py: 8, borderBottom: 'none' }}>
                                                        <EmptyContent
                                                            icon={"logos:meta-icon" as any}
                                                            title="No Facebook Pages Found"
                                                            description="Make sure your Facebook account has admin access to Facebook Pages."
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        ) : (
                                            paginatedPages.map((row) => {
                                                const isSelected = selectedPageIds.includes(row.page_id);
                                                return (
                                                    <TableRow
                                                        key={row.page_id}
                                                        hover
                                                        selected={isSelected}
                                                        onClick={() => handleTogglePage(row.page_id)}
                                                        sx={{
                                                            cursor: 'pointer',
                                                            '& td, & th': { borderBottom: (theme) => `1px solid ${theme.palette.divider}` },
                                                        }}
                                                    >
                                                        <TableCell padding="checkbox">
                                                            <Checkbox checked={isSelected} />
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                                                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                                                <Iconify icon={"logos:facebook" as any} width={22} />
                                                                <Typography variant="subtitle2">{row.page_name}</Typography>
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell sx={{ color: 'text.secondary', fontSize: '13px' }}>
                                                            {row.page_id}
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Label
                                                                variant="soft"
                                                                color={row.is_active ? 'success' : 'default'}
                                                            >
                                                                {row.is_active ? 'Active' : 'Inactive'}
                                                            </Label>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Label
                                                                variant="soft"
                                                                color={row.is_connected ? 'info' : 'default'}
                                                            >
                                                                {row.is_connected ? 'Connected' : 'Not Connected'}
                                                            </Label>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Label
                                                                variant="soft"
                                                                color={row.subscription_status === 'Subscribed' ? 'success' : 'warning'}
                                                            >
                                                                {row.subscription_status || 'Unsubscribed'}
                                                            </Label>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Label
                                                                variant="soft"
                                                                color={row.is_existing ? 'default' : 'primary'}
                                                            >
                                                                {row.is_existing ? 'Already Synced' : 'New Page'}
                                                            </Label>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </Scrollbar>
                        </TableContainer>

                        {/* Page Pagination */}
                        <TablePagination
                            component="div"
                            count={filteredPages.length}
                            page={pageNumber1}
                            onPageChange={(_, p) => setPageNumber1(p)}
                            rowsPerPage={rowsPerPage1}
                            onRowsPerPageChange={(e) => {
                                setRowsPerPage1(parseInt(e.target.value, 10));
                                setPageNumber1(0);
                            }}
                            rowsPerPageOptions={[10, 25, 50, 100]}
                        />
                    </Stack>
                ) : (
                    // ----------------------------------------------------------------------
                    // DIALOG STEP 2: Lead Forms Selection Table
                    // ----------------------------------------------------------------------
                    <Stack spacing={2.5}>
                        {/* Search & Toolbar */}
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                            <OutlinedInput
                                value={formFilter}
                                onChange={(e) => setFormFilter(e.target.value)}
                                placeholder="Search forms by title, ID or page..."
                                size="small"
                                sx={{ width: 340 }}
                                startAdornment={
                                    <InputAdornment position="start">
                                        <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                                    </InputAdornment>
                                }
                            />

                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                {selectedFormIds.length} of {forms.length} selected
                            </Typography>
                        </Stack>

                        {/* Forms Table */}
                        <TableContainer sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 1.5, minHeight: 350, position: 'relative' }}>
                            <Scrollbar>
                                <Table size="medium" sx={{ minWidth: 680 }}>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: (theme) => theme.palette.background.neutral }}>
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    indeterminate={isSomeFormsSelected}
                                                    checked={isAllFormsSelected}
                                                    onChange={handleToggleSelectAllForms}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Form Name</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Form ID</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Parent Page</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700 }}>Active</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700 }}>Existing</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {loadingForms ? (
                                            <TableRow>
                                                <TableCell colSpan={7} sx={{ borderBottom: 'none' }}>
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 250, py: 6, gap: 2 }}>
                                                        <CircularProgress size={36} />
                                                        <Typography variant="body2" color="text.secondary">Fetching Instant Forms for selected Facebook Pages...</Typography>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ) : paginatedForms.length === 0 ? (
                                            formFilter ? (
                                                <TableNoData colSpan={7} searchQuery={formFilter} sx={{ '& td': { py: 8, borderBottom: 'none' } }} />
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={7} sx={{ p: 0, py: 8, borderBottom: 'none' }}>
                                                        <EmptyContent
                                                            icon={"logos:meta-icon" as any}
                                                            title="No Lead Forms Found"
                                                            description="No instant lead forms found under the selected Facebook Pages."
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        ) : (
                                            paginatedForms.map((row) => {
                                                const isSelected = selectedFormIds.includes(row.form_id);
                                                return (
                                                    <TableRow
                                                        key={row.form_id}
                                                        hover
                                                        selected={isSelected}
                                                        onClick={() => handleToggleForm(row.form_id)}
                                                        sx={{
                                                            cursor: 'pointer',
                                                            '& td, & th': { borderBottom: (theme) => `1px solid ${theme.palette.divider}` },
                                                        }}
                                                    >
                                                        <TableCell padding="checkbox">
                                                            <Checkbox checked={isSelected} />
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                                                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                                                <Iconify icon={"logos:facebook" as any} width={22} />
                                                                <Typography variant="subtitle2">{row.form_name}</Typography>
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell sx={{ color: 'text.secondary', fontSize: '13px' }}>
                                                            {row.form_id}
                                                        </TableCell>
                                                        <TableCell sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                                            {row.page_name}
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Label
                                                                variant="soft"
                                                                color={row.is_active ? 'success' : 'default'}
                                                            >
                                                                {row.is_active ? 'Active' : 'Inactive'}
                                                            </Label>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Label
                                                                variant="soft"
                                                                color={row.is_existing ? 'default' : 'primary'}
                                                            >
                                                                {row.is_existing ? 'Already Synced' : 'New Form'}
                                                            </Label>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </Scrollbar>
                        </TableContainer>

                        {/* Form Pagination */}
                        <TablePagination
                            component="div"
                            count={filteredForms.length}
                            page={pageNumber2}
                            onPageChange={(_, p) => setPageNumber2(p)}
                            rowsPerPage={rowsPerPage2}
                            onRowsPerPageChange={(e) => {
                                setRowsPerPage2(parseInt(e.target.value, 10));
                                setPageNumber2(0);
                            }}
                            rowsPerPageOptions={[10, 25, 50, 100]}
                        />
                    </Stack>
                )}
            </DialogContent>

            {/* Dialog Action Buttons */}
            <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
                {activeStep === 1 ? (
                    <>
                        <Button onClick={onClose} color="inherit" variant="outlined">
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            disabled={loadingPages}
                            onClick={handleContinueToForms}
                            endIcon={<Iconify icon={"eva:arrow-forward-fill" as any} />}
                        >
                            Continue
                        </Button>
                    </>
                ) : (
                    <>
                        {initialStep === 2 ? (
                            <Button onClick={onClose} color="inherit" variant="outlined" disabled={importing}>
                                Cancel
                            </Button>
                        ) : (
                            <Button
                                onClick={() => setActiveStep(1)}
                                color="inherit"
                                variant="outlined"
                                startIcon={<Iconify icon={"eva:arrow-back-fill" as any} />}
                                disabled={importing}
                            >
                                Back
                            </Button>
                        )}
                        <Button
                            variant="contained"
                            color="primary"
                            disabled={importing || loadingForms}
                            onClick={handleCommitImport}
                            startIcon={importing ? <CircularProgress size={18} color="inherit" /> : <Iconify icon={"eva:download-outline" as any} />}
                        >
                            {importing ? 'Importing...' : 'Import Selected'}
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
}
