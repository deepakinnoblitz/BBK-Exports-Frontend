import { useState, useCallback, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import { styled, Theme } from '@mui/material/styles';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import Switch, { SwitchProps } from '@mui/material/Switch';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useAnnouncements } from 'src/hooks/useAnnouncements';

import { DashboardContent } from 'src/layouts/dashboard';
import {
    Announcement,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    getAnnouncementPermissions,
} from 'src/api/announcements';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { TableNoData } from 'src/sections/lead/table-no-data';
import { TableEmptyRows } from 'src/sections/lead/table-empty-rows';
import { AnnouncementTableRow } from 'src/sections/announcements/announcements-table-row';
import { LeadTableHead as AnnouncementTableHead } from 'src/sections/lead/lead-table-head';
import { LeadTableToolbar as AnnouncementTableToolbar } from 'src/sections/lead/lead-table-toolbar';
import { AnnouncementDetailsDialog } from 'src/sections/report/announcements/announcements-details-dialog';

import { useAuth } from 'src/auth/auth-context';

import { AnnouncementsTableFiltersDrawer } from '../announcements-table-filters-drawer';

// ----------------------------------------------------------------------

export const CustomSwitch = styled((props: SwitchProps) => (
    <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
    width: 38,
    height: 22,
    padding: 0,
    '& .MuiSwitch-switchBase': {
        padding: 0,
        margin: 2,
        transitionDuration: '300ms',
        '&.Mui-checked': {
            transform: 'translateX(16px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
                backgroundColor: '#059669',
                opacity: 1,
                border: 0,
            },
            '&.Mui-disabled + .MuiSwitch-track': {
                opacity: 0.5,
            },
        },
        '&.Mui-focusVisible .MuiSwitch-thumb': {
            color: '#059669',
            border: '6px solid #fff',
        },
        '&.Mui-disabled .MuiSwitch-thumb': {
            color: theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[600],
        },
        '&.Mui-disabled + .MuiSwitch-track': {
            opacity: theme.palette.mode === 'light' ? 0.7 : 0.3,
        },
    },
    '& .MuiSwitch-thumb': {
        boxSizing: 'border-box',
        width: 18,
        height: 18,
    },
    '& .MuiSwitch-track': {
        borderRadius: 26 / 2,
        backgroundColor: theme.palette.mode === 'light' ? '#E9E9EA' : '#39393D',
        opacity: 1,
        transition: theme.transitions.create(['background-color'], {
            duration: 500,
        }),
    },
}));

// ----------------------------------------------------------------------

const ANNOUNCEMENT_SORT_OPTIONS = [
    { value: 'modified_desc', label: 'Newest First' },
    { value: 'modified_asc', label: 'Oldest First' },
    { value: 'announcement_name_asc', label: 'Title: A to Z' },
    { value: 'announcement_name_desc', label: 'Title: Z to A' },
];

export function AnnouncementsView() {
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.announcements;
    const actionPerms = user?.permissions?.actions?.announcements;
    const canCreateAnnouncement = hasCustomPerms && actionPerms ? !!actionPerms?.create : true;
    const canEditAnnouncement = hasCustomPerms && actionPerms ? !!actionPerms?.edit : true;
    const canDeleteAnnouncement = hasCustomPerms && actionPerms ? !!actionPerms?.delete : true;

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [orderBy, setOrderBy] = useState('modified');
    const [openFilters, setOpenFilters] = useState(false);
    const [filters, setFilters] = useState<{
        startDate: string | null;
        endDate: string | null;
    }>({
        startDate: null,
        endDate: null,
    });
    const [selected, setSelected] = useState<string[]>([]);

    const { data, total, loading, refetch } = useAnnouncements(page + 1, rowsPerPage, filterName, filters, orderBy, order);

    const [openCreate, setOpenCreate] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [currentAnnouncement, setCurrentAnnouncement] = useState<any>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });

    // Form state
    const [announcementName, setAnnouncementName] = useState('');
    const [announcement, setAnnouncement] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [errors, setErrors] = useState<{ announcementName?: string; announcement?: string }>({});

    // View dialog state
    const [openView, setOpenView] = useState(false);
    const [viewAnnouncement, setViewAnnouncement] = useState<any>(null);

    // Permissions
    const [permissions, setPermissions] = useState({ read: false, write: false, delete: false });

    // Snackbar
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    // Load permissions
    useEffect(() => {
        getAnnouncementPermissions().then(setPermissions);
    }, []);

    const handleSortChange = (value: string) => {
        const parts = value.split('_');
        const direction = parts.pop() as 'asc' | 'desc';
        const field = parts.join('_');
        setOrderBy(field);
        setOrder(direction);
    };

    const handleFilters = (update: Partial<typeof filters>) => {
        setFilters((prev) => ({ ...prev, ...update }));
        setPage(0);
    };

    const handleResetFilters = () => {
        setFilters({
            startDate: null,
            endDate: null,
        });
        setFilterName('');
    };

    const canReset = filters.startDate !== null || filters.endDate !== null || !!filterName;

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
            await Promise.all(selected.map((name) => deleteAnnouncement(name)));
            setSnackbar({ open: true, message: `${selected.length} announcement(s) deleted successfully`, severity: 'success' });
            setSelected([]);
            refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Failed to delete announcements', severity: 'error' });
        }
    };

    const handleOpenCreate = () => {
        setIsEdit(false);
        setCurrentAnnouncement(null);
        setAnnouncementName('');
        setAnnouncement('');
        setIsActive(true);
        setErrors({});
        setOpenCreate(true);
    };

    const handleCloseCreate = () => {
        setOpenCreate(false);
        setIsEdit(false);
        setCurrentAnnouncement(null);
        setAnnouncementName('');
        setAnnouncement('');
        setIsActive(true);
        setErrors({});
    };

    const handleEditRow = useCallback((row: any) => {
        setCurrentAnnouncement(row);
        setAnnouncementName(row.announcement_name || '');
        setAnnouncement(row.announcement || '');
        setIsActive(row.is_active === 1);
        setIsEdit(true);
        setOpenCreate(true);
    }, []);

    const handleViewRow = useCallback((row: any) => {
        setViewAnnouncement(row);
        setOpenView(true);
    }, []);

    const handleDeleteRow = useCallback((id: string) => {
        setConfirmDelete({ open: true, id });
    }, []);

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        try {
            await deleteAnnouncement(confirmDelete.id);
            setSnackbar({ open: true, message: 'Announcement deleted successfully', severity: 'success' });
            refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Failed to delete announcement', severity: 'error' });
        } finally {
            setConfirmDelete({ open: false, id: null });
        }
    };

    const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const newErrors: { announcementName?: string; announcement?: string } = {};

        if (!announcementName.trim()) {
            newErrors.announcementName = 'Title is required';
        }
        if (!announcement.trim()) {
            newErrors.announcement = 'Announcement details are required';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setSnackbar({ open: true, message: 'Please fill out all required fields', severity: 'error' });
            return;
        }

        setErrors({});

        const announcementData: Partial<Announcement> = {
            announcement_name: announcementName.trim(),
            announcement: announcement.trim(),
            is_active: isActive ? 1 : 0,
        };

        try {
            if (isEdit && currentAnnouncement) {
                await updateAnnouncement(currentAnnouncement.name, announcementData);
                setSnackbar({ open: true, message: 'Announcement updated successfully', severity: 'success' });
            } else {
                await createAnnouncement(announcementData);
                setSnackbar({ open: true, message: 'Announcement created successfully', severity: 'success' });
            }
            handleCloseCreate();
            refetch();
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || 'Operation failed', severity: 'error' });
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
        <DashboardContent maxWidth={false} sx={{mt: 2}}>
            <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ flexGrow: 1 }}>
                    Announcements
                </Typography>

                {permissions.write && canCreateAnnouncement && (
                    <Button
                        variant="contained"
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={handleOpenCreate}
                        sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                    >
                        New Announcement
                    </Button>
                )}
            </Box>

            <Card>
                <AnnouncementTableToolbar
                    numSelected={selected.length}
                    filterName={filterName}
                    onFilterName={handleFilterByName}
                    searchPlaceholder="Search announcements..."
                    onDelete={selected.length > 0 ? handleBulkDelete : undefined}
                    onOpenFilter={() => setOpenFilters(true)}
                    canReset={canReset}
                    sortBy={`${orderBy}_${order}`}
                    onSortChange={handleSortChange}
                    sortOptions={ANNOUNCEMENT_SORT_OPTIONS}
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: 800 }}>
                            <AnnouncementTableHead
                                order={order}
                                orderBy={orderBy}
                                rowCount={data.length}
                                numSelected={selected.length}
                                onSelectAllRows={(checked: boolean) => handleSelectAllRows(checked)}
                                hideCheckbox
                                showIndex
                                headLabel={[
                                    { id: 'announcement_name', label: 'Title', width: 220 },
                                    { id: 'announcement', label: 'Announcement', width: 400 },
                                    { id: 'creation', label: 'Created On', width: 140 },
                                    { id: 'is_active', label: 'Status', width: 120 },
                                    { id: '', label: '', width: 100 }
                                ]}
                            />
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                                            <CircularProgress sx={{ color: '#059669' }} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {data.map((row, index) => (
                                            <AnnouncementTableRow
                                                key={row.name}
                                                index={page * rowsPerPage + index}
                                                hideCheckbox
                                                row={{
                                                    id: row.name,
                                                    announcement_name: row.announcement_name,
                                                    announcement: row.announcement,
                                                    is_active: row.is_active,
                                                    creation: row.creation,
                                                }}
                                                selected={selected.includes(row.name)}
                                                onSelectRow={() => handleSelectRow(row.name)}
                                                onView={() => handleViewRow(row)}
                                                onEdit={() => handleEditRow(row)}
                                                onDelete={() => handleDeleteRow(row.name)}
                                                canEdit={permissions.write && canEditAnnouncement}
                                                canDelete={permissions.delete && canDeleteAnnouncement}
                                            />
                                        ))}

                                        {notFound && <TableNoData searchQuery={filterName} />}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={6}>
                                                    <EmptyContent
                                                        title="No announcements"
                                                        description="There are no announcements to display at this time."
                                                        icon="solar:bell-bold-duotone"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        )}

                                        {!empty && !notFound && (
                                            <TableEmptyRows height={68} emptyRows={data.length < 5 ? 5 - data.length : 0} />
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

            {/* Create/Edit Dialog */}
            <Dialog 
                open={openCreate} 
                onClose={handleCloseCreate} 
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
                <form onSubmit={handleCreate} noValidate style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: (theme) => `1px solid ${theme.palette.divider}`, }}>
                        {isEdit ? 'Edit Announcement' : 'New Announcement'}
                        <IconButton onClick={handleCloseCreate}>
                            <Iconify icon="mingcute:close-line" />
                        </IconButton>
                    </DialogTitle>

                    <DialogContent dividers sx={{ flexGrow: 1, overflowY: 'auto' }}>

                        <Box sx={{ display: 'grid', gap: 3, margin: '1rem' }}>

                            <FormControlLabel
                                control={
                                    <CustomSwitch
                                        checked={isActive}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsActive(e.target.checked)}
                                        sx={{ mr: 1.5 }}
                                    />
                                }
                                label="Is Active"
                                sx={{ mb: 1, ml: 0, display: 'inline-flex', alignItems: 'center' }}
                            />

                            <TextField
                                fullWidth
                                label="Title"
                                value={announcementName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    setAnnouncementName(e.target.value);
                                    if (errors.announcementName) {
                                        setErrors((prev) => ({ ...prev, announcementName: undefined }));
                                    }
                                }}
                                error={!!errors.announcementName}
                                helperText={errors.announcementName}
                                required
                                placeholder="Enter announcement title"
                            />

                            <TextField
                                fullWidth
                                label="Announcement"
                                value={announcement}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    setAnnouncement(e.target.value);
                                    if (errors.announcement) {
                                        setErrors((prev) => ({ ...prev, announcement: undefined }));
                                    }
                                }}
                                error={!!errors.announcement}
                                helperText={errors.announcement}
                                multiline
                                rows={6}
                                placeholder="Enter announcement details"
                                required
                            />

                        </Box>
                    </DialogContent>

                    <DialogActions sx={{p:1.5}}>
                        <Button type="submit" variant="contained">
                            {isEdit ? 'Update' : 'Create'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* View Dialog */}
            <AnnouncementDetailsDialog
                open={openView}
                onClose={() => setOpenView(false)}
                announcement={viewAnnouncement}
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
                content="Are you sure you want to delete this announcement?"
                action={
                    <Button onClick={handleConfirmDelete} color="error" variant="contained" sx={{ borderRadius: 1.5, minWidth: 100 }}>
                        Delete
                    </Button>
                }
            />

            <AnnouncementsTableFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
            />
        </DashboardContent>
    );
}
