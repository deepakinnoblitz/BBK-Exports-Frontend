import { LuFileBadge } from "react-icons/lu";
import { MdAssignmentAdd } from "react-icons/md";
import { useState, useEffect, useCallback } from 'react';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { fetchEmployees } from 'src/api/employees';
import { fetchFrappeList } from 'src/api/hr-management';
import { DashboardContent } from 'src/layouts/dashboard';
import { deleteBadge, fetchAllBadges, deleteBadgeAssignment } from 'src/api/badges';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';
import { TableNoData, TableEmptyRows } from 'src/components/table';

import { BadgeTableRow } from '../badge-table-row';
import { BadgeTableHead } from '../badge-table-head';
import { BadgeFormDialog } from '../badge-form-dialog';
import { BadgeTableToolbar } from '../badge-table-toolbar';
import { BadgeDetailDialog } from '../badge-detail-dialog';
import { BadgeAssignmentTableRow } from '../badge-assignment-table-row';
import { BadgeAssignmentFormDialog } from '../badge-assignment-form-dialog';
import { BadgeAssignmentDetailDialog } from '../badge-assignment-detail-dialog';

// ----------------------------------------------------------------------

const TABS = [
  {
    value: 'badges',
    label: 'Badges',
    icon: <LuFileBadge size={20} />
  },
  {
    value: 'assignments',
    label: 'Badge Assignments',
    icon: <MdAssignmentAdd size={20} />,
  },
];

import { useAuth } from 'src/auth/auth-context';

export function BadgesView() {
  const { user } = useAuth();
  const actionPerms = user?.permissions?.actions?.badges;
  const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned && !!actionPerms;
  const canCreateBadge = hasCustomPerms ? !!actionPerms?.create : true;
  const canEditBadge = hasCustomPerms ? !!actionPerms?.edit : true;
  const canDeleteBadge = hasCustomPerms ? !!actionPerms?.delete : true;

  const [currentTab, setCurrentTab] = useState('badges');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterName, setFilterName] = useState('');
  const [sortBy, setSortBy] = useState('modified_desc');

  const [filters, setFilters] = useState<any>({
    badge_type: 'all',
    employee: null,
    badge: null,
    startDate: null,
    endDate: null,
    awarded_by: null,
  });

  const [badges, setBadges] = useState<any[]>([]);
  const [totalBadges, setTotalBadges] = useState(0);
  const [loadingBadges, setLoadingBadges] = useState(false);

  const [assignments, setAssignments] = useState<any[]>([]);
  const [totalAssignments, setTotalAssignments] = useState(0);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  const [allBadges, setAllBadges] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const [openBadgeForm, setOpenBadgeForm] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<any>(null);

  const [openBadgeDetail, setOpenBadgeDetail] = useState(false);
  const [selectedBadgeDetail, setSelectedBadgeDetail] = useState<any>(null);

  const [openAssignmentForm, setOpenAssignmentForm] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);

  const [openAssignmentDetail, setOpenAssignmentDetail] = useState(false);
  const [selectedAssignmentDetail, setSelectedAssignmentDetail] = useState<any>(null);

  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    type: 'badge' | 'assignment' | null;
    name: string | null;
  }>({
    open: false,
    type: null,
    name: null,
  });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleCloseSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [badgeRes, empRes, userRes] = await Promise.all([
          fetchAllBadges(),
          fetchEmployees({ page_size: 1000, page: 1, fields: ['name', 'employee_name'] }),
          fetchFrappeList('User', { page_size: 1000, page: 1, fields: ['name', 'full_name'] }),
        ]);
        setAllBadges(badgeRes);
        setAllEmployees(empRes.data);
        setAllUsers(userRes.data);
      } catch (error) {
        console.error(error);
      }
    };
    loadOptions();
  }, []);

  const fetchBadgesList = useCallback(async () => {
    setLoadingBadges(true);
    try {
      const activeFilters: any[] = [];
      if (filters.badge_type !== 'all') {
        activeFilters.push(['badge_type', '=', filters.badge_type]);
      }

      const response = await fetchFrappeList('Employee Badge', {
        page: page + 1,
        page_size: rowsPerPage,
        search: filterName,
        searchField: 'badge_name',
        filters: activeFilters.length ? activeFilters : undefined,
        fields: ['name', 'badge_name', 'badge_type', 'description', 'icon'],
        orderBy: sortBy,
      });
      setBadges(response.data);
      setTotalBadges(response.total);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingBadges(false);
    }
  }, [page, rowsPerPage, filterName, sortBy, filters.badge_type]);

  const fetchAssignmentsList = useCallback(async () => {
    setLoadingAssignments(true);
    try {
      const activeFilters: any[] = [];
      const orFilters: any[] = [];
      if (filters.employee) activeFilters.push(['employee', '=', filters.employee]);
      if (filters.badge) activeFilters.push(['badge', '=', filters.badge]);
      if (filters.startDate) activeFilters.push(['awarded_on', '>=', filters.startDate]);
      if (filters.endDate) activeFilters.push(['awarded_on', '<=', filters.endDate]);
      if (filters.awarded_by) activeFilters.push(['awarded_by', '=', filters.awarded_by]);

      if (filterName) {
        const cleanSearch = filterName.trim();
        orFilters.push(['employee_name', 'like', `%${cleanSearch}%`]);
        orFilters.push(['employee', 'like', `%${cleanSearch}%`]);
      }

      const response = await fetchFrappeList('Employee Badge Assignment', {
        page: page + 1,
        page_size: rowsPerPage,
        filters: activeFilters.length ? activeFilters : undefined,
        or_filters: orFilters.length ? orFilters : undefined,
        fields: [
          'name',
          'employee',
          'employee_name',
          'badge',
          'awarded_on',
          'awarded_by',
          'reason',
          'badge.icon',
        ],
        orderBy: sortBy.includes('modified')
          ? `\`tabEmployee Badge Assignment\`.modified`
          : sortBy.includes('creation')
            ? `\`tabEmployee Badge Assignment\`.creation`
            : sortBy.replace(/_(desc|asc)$/, ''),
        order: sortBy.includes('desc') ? 'desc' : 'asc',
      });
      setAssignments(response.data);
      setTotalAssignments(response.total);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAssignments(false);
    }
  }, [page, rowsPerPage, filterName, sortBy, filters]);

  useEffect(() => {
    if (currentTab === 'badges') {
      fetchBadgesList();
    } else {
      fetchAssignmentsList();
    }
  }, [currentTab, fetchBadgesList, fetchAssignmentsList]);

  const handleChangeTab = useCallback((event: React.SyntheticEvent, newValue: string) => {
    setCurrentTab(newValue);
    setPage(0);
    setFilterName('');
  }, []);

  const handleDeleteBadge = (name: string) => {
    setConfirmDelete({
      open: true,
      type: 'badge',
      name,
    });
  };

  const handleDeleteAssignment = (name: string) => {
    setConfirmDelete({
      open: true,
      type: 'assignment',
      name,
    });
  };

  const handleViewAssignment = (assignment: any) => {
    setSelectedAssignmentDetail(assignment);
    setOpenAssignmentDetail(true);
  };

  const handleConfirmDelete = async () => {
    try {
      if (confirmDelete.type === 'badge' && confirmDelete.name) {
        await deleteBadge(confirmDelete.name);
        fetchBadgesList();
        setSnackbar({ open: true, message: 'Badge deleted successfully', severity: 'success' });
      } else if (confirmDelete.type === 'assignment' && confirmDelete.name) {
        await deleteBadgeAssignment(confirmDelete.name);
        fetchAssignmentsList();
        setSnackbar({
          open: true,
          message: 'Assignment deleted successfully',
          severity: 'success',
        });
      }
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.message || 'Failed to delete';
      setSnackbar({ open: true, message: errorMsg, severity: 'error' });
    } finally {
      setConfirmDelete({ open: false, type: null, name: null });
    }
  };

  const canReset =
    !!filterName ||
    filters.badge_type !== 'all' ||
    !!filters.employee ||
    !!filters.badge ||
    !!filters.startDate ||
    !!filters.endDate ||
    !!filters.awarded_by;

  const handleResetFilters = useCallback(() => {
    setFilterName('');
    setFilters({
      badge_type: 'all',
      employee: null,
      badge: null,
      startDate: null,
      endDate: null,
      awarded_by: null,
    });
  }, []);

  const renderTabs = (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ px: 3, borderBottom: (t) => `1px solid ${t.palette.divider}` }}
    >
      <Tabs
        value={currentTab}
        onChange={handleChangeTab}
        sx={{
          '& .MuiTabs-indicator': { backgroundColor: '#00A5D1' },
          '& .MuiTab-root.Mui-selected': { color: '#00A5D1' },
        }}
      >
        {TABS.map((tab) => (
          <Tab
            key={tab.value}
            label={tab.label}
            icon={tab.icon}
            value={tab.value}
            iconPosition="start"
          />
        ))}
      </Tabs>

      {canCreateBadge && (
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          sx={{ bgcolor: '#00A5D1', '&:hover': { bgcolor: '#0084a7' } }}
          onClick={() => {
            if (currentTab === 'badges') {
              setSelectedBadge(null);
              setOpenBadgeForm(true);
            } else {
              setSelectedAssignment(null);
              setOpenAssignmentForm(true);
            }
          }}
        >
          {currentTab === 'badges' ? 'New Badge' : 'Assign Badge'}
        </Button>
      )}
    </Stack>
  );

  const notFound =
    ((currentTab === 'badges' && !badges.length) ||
      (currentTab === 'assignments' && !assignments.length)) &&
    !!filterName;
  const isEmpty =
    ((currentTab === 'badges' && !badges.length) ||
      (currentTab === 'assignments' && !assignments.length)) &&
    !filterName;

  return (
    <DashboardContent maxWidth={false}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4">Badges Management</Typography>
      </Stack>

      <Card>
        {renderTabs}

        <BadgeTableToolbar
          filterName={filterName}
          onFilterName={(event: React.ChangeEvent<HTMLInputElement>) => {
            setFilterName(event.target.value);
            setPage(0);
          }}
          placeholder={currentTab === 'badges' ? 'Search badge...' : 'Search employee name or ID...'}
          sortBy={sortBy}
          onSortChange={(value) => {
            setSortBy(value);
            setPage(0);
          }}
          sortOptions={[
            { value: 'modified_desc', label: 'Newest First' },
            { value: 'modified_asc', label: 'Oldest First' },
          ]}
          filters={filters}
          onFilters={(update) => {
            setFilters((prev: any) => ({ ...prev, ...update }));
            setPage(0);
          }}
          canReset={canReset}
          onResetFilters={handleResetFilters}
          currentTab={currentTab}
          badgeOptions={allBadges}
          employeeOptions={allEmployees}
          userOptions={allUsers}
        />

        <Scrollbar>
          <TableContainer sx={{ minWidth: 800, position: 'relative' }}>
            <Table>
              <BadgeTableHead
                headLabel={
                  currentTab === 'badges'
                    ? [
                        { id: 'sno', label: 'Sno', align: 'center' },
                        { id: 'icon', label: 'Icon', align: 'center' },
                        { id: 'badge_name', label: 'Badge Name' },
                        { id: 'badge_type', label: 'Type' },
                        { id: '' },
                      ]
                    : [
                        { id: 'sno', label: 'Sno', align: 'center' },
                        { id: 'employee', label: 'Employee' },
                        { id: 'badge', label: 'Badge' },
                        { id: 'awarded_on', label: 'Awarded On' },
                        { id: 'awarded_by', label: 'Awarded By' },
                        { id: '' },
                      ]
                }
              />
              <TableBody>
                {currentTab === 'badges' ? (
                  loadingBadges ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                        <CircularProgress sx={{ color: '#059669' }} />
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {badges.map((row, index) => (
                        <BadgeTableRow
                          key={row.name}
                          row={row}
                          index={page * rowsPerPage + index}
                          onView={() => {
                            setSelectedBadgeDetail(row);
                            setOpenBadgeDetail(true);
                          }}
                          onEdit={() => {
                            setSelectedBadge(row);
                            setOpenBadgeForm(true);
                          }}
                          onDelete={() => handleDeleteBadge(row.name)}
                          canEdit={canEditBadge}
                          canDelete={canDeleteBadge}
                        />
                      ))}

                      {isEmpty && (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <EmptyContent
                              title="No Badges Found"
                              description="Add your first badge to get started."
                              icon="solar:medal-ribbon-bold-duotone"
                            />
                          </TableCell>
                        </TableRow>
                      )}

                      {!isEmpty && !notFound && (
                        <TableEmptyRows
                          height={77}
                          emptyRows={badges.length < 5 ? 5 - badges.length : 0}
                        />
                      )}

                      {notFound && <TableNoData colSpan={5} searchQuery={filterName} />}
                    </>
                  )
                ) : (
                  loadingAssignments ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                        <CircularProgress sx={{ color: '#059669' }} />
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {assignments.map((row, index) => (
                        <BadgeAssignmentTableRow
                          key={row.name}
                          row={row}
                          index={page * rowsPerPage + index}
                          onView={() => handleViewAssignment(row)}
                          onDelete={() => handleDeleteAssignment(row.name)}
                        />
                      ))}

                      {isEmpty && (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <EmptyContent
                              title="No Badge Assignments Found"
                              description="Assign badges to employees to see them here."
                              icon="solar:user-id-bold-duotone"
                            />
                          </TableCell>
                        </TableRow>
                      )}

                      {!isEmpty && !notFound && (
                        <TableEmptyRows
                          height={77}
                          emptyRows={assignments.length < 5 ? 5 - assignments.length : 0}
                        />
                      )}

                      {notFound && <TableNoData colSpan={6} searchQuery={filterName} />}
                    </>
                  )
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>

        <TablePagination
          component="div"
          page={page}
          count={currentTab === 'badges' ? totalBadges : totalAssignments}
          rowsPerPage={rowsPerPage}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPageOptions={[10, 25, 50]}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Card>

      <BadgeFormDialog
        open={openBadgeForm}
        onClose={() => setOpenBadgeForm(false)}
        onSuccess={(msg) => {
          fetchBadgesList();
          setSnackbar({ open: true, message: msg, severity: 'success' });
        }}
        onError={(msg) => {
          setSnackbar({ open: true, message: msg, severity: 'error' });
        }}
        selectedBadge={selectedBadge}
      />

      <BadgeDetailDialog
        open={openBadgeDetail}
        onClose={() => setOpenBadgeDetail(false)}
        badge={selectedBadgeDetail}
      />

      <BadgeAssignmentDetailDialog
        open={openAssignmentDetail}
        onClose={() => setOpenAssignmentDetail(false)}
        assignment={selectedAssignmentDetail}
      />

      <BadgeAssignmentFormDialog
        open={openAssignmentForm}
        onClose={() => setOpenAssignmentForm(false)}
        onSuccess={(msg) => {
          fetchAssignmentsList();
          setSnackbar({ open: true, message: msg, severity: 'success' });
        }}
        onError={(msg) => {
          setSnackbar({ open: true, message: msg, severity: 'error' });
        }}
        selectedAssignment={selectedAssignment}
      />

      <ConfirmDialog
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, type: null, name: null })}
        title="Delete"
        content={
          confirmDelete.type === 'badge'
            ? 'Are you sure you want to delete this badge? This action cannot be undone.'
            : 'Are you sure you want to delete this badge assignment?'
        }
        action={
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            Delete
          </Button>
        }
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: 1.5, fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}