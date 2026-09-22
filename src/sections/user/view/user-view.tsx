import { useSnackbar } from 'notistack';
import { useState, forwardRef, useImperativeHandle } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useUsers } from 'src/hooks/useUsers';

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchRolePermissions } from 'src/api/permission-management';
import { getUser, createUser, updateUser, deleteUser } from 'src/api/users';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { TableNoData } from '../table-no-data';
import { UserTableRow } from '../user-table-row';
import { UserTableHead } from '../user-table-head';
import { UserFormDialog } from '../user-form-dialog';
import { TableEmptyRows } from '../table-empty-rows';
import { UserDetailsDialog } from '../user-details-dialog';
import { LeadTableToolbar } from '../../lead/lead-table-toolbar';
import { UserTableFiltersDrawer } from '../user-table-filters-drawer';

// ----------------------------------------------------------------------

export const UserView = forwardRef(
  (
    {
      hideHeader = false,
      hideActionButton = false,
    }: { hideHeader?: boolean; hideActionButton?: boolean },
    ref
  ) => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [sortBy, setSortBy] = useState('modified_desc');
    const [filters, setFilters] = useState({
      user_type: 'all',
      enabled: 'all',
      permission: 'all',
      roles: [],
    });
    const [openFilters, setOpenFilters] = useState(false);

    const { data, total, loading, refetch } = useUsers(
      page + 1,
      rowsPerPage,
      filterName,
      sortBy,
      filters
    );

    const [openCreate, setOpenCreate] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [formData, setFormData] = useState({
      email: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      full_name: '',
      username: '',
      enabled: 1 as 0 | 1,
      user_type: 'System User',
      role_profile_name: '',
      roles: [] as string[],
      block_modules: [] as string[],
      send_welcome_email: 1 as 0 | 1,
      new_password: '',
      user_image: '',
      custom_permissions: [] as { permission_manager: string; permission_name: string }[],
    });

    const { enqueueSnackbar } = useSnackbar();

    const [openDetails, setOpenDetails] = useState(false);
    const [detailsUserId, setDetailsUserId] = useState<string | null>(null);

    const [openDelete, setOpenDelete] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleOpenCreate = () => {
      setSelectedUser(null);
      setFormData({
        email: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        full_name: '',
        username: '',
        enabled: 1,
        user_type: 'System User',
        role_profile_name: '',
        roles: [],
        block_modules: [],
        send_welcome_email: 1,
        new_password: '',
        user_image: '',
        custom_permissions: [],
      });
      setOpenCreate(true);
    };

    useImperativeHandle(ref, () => ({
      handleOpenCreate,
    }));

    const handleEditRow = async (row: any) => {
      try {
        // Fetch full user data including roles and modules
        const fullUserData = await getUser(row.name);

        setSelectedUser(fullUserData);

        // Extract roles from child table (array of {role: "Role Name"})
        const userRoles = fullUserData.roles ? fullUserData.roles.map((r: any) => r.role) : [];

        // Extract blocked modules from child table (array of {module: "Module Name"})
        const blockedModules = fullUserData.block_modules
          ? fullUserData.block_modules.map((m: any) => m.module)
          : [];

        setFormData({
          email: fullUserData.email || '',
          first_name: fullUserData.first_name || '',
          middle_name: fullUserData.middle_name || '',
          last_name: fullUserData.last_name || '',
          full_name: fullUserData.full_name || '',
          username: fullUserData.username || '',
          enabled: fullUserData.enabled,
          user_type: fullUserData.user_type || 'System User',
          role_profile_name: fullUserData.role_profile_name || '',
          roles: userRoles,
          block_modules: blockedModules,
          send_welcome_email: 0,
          new_password: '',
          user_image: fullUserData.user_image || '',
          custom_permissions: fullUserData.custom_permissions || [],
        });

        setOpenCreate(true);
      } catch (error: any) {
        enqueueSnackbar(error.message || 'Failed to load user data', { variant: 'error' });
      }
    };

    const handleCloseCreate = () => setOpenCreate(false);

    const handleSubmit = async () => {
      setIsSubmitting(true);
      try {
        let cleanedCustomPermissions = formData.custom_permissions || [];
        if (formData.roles && formData.roles.length > 0) {
          try {
            const activeRolePermissions = await fetchRolePermissions(formData.roles);
            const validPmNames = new Set(activeRolePermissions.map((rp) => rp.name));
            cleanedCustomPermissions = cleanedCustomPermissions.filter((p) =>
              validPmNames.has(p.permission_manager)
            );
          } catch (e) {
            console.error('Failed to validate role permissions before submit:', e);
          }
        } else {
          cleanedCustomPermissions = [];
        }

        if (selectedUser) {
          await updateUser(selectedUser.name, {
            first_name: formData.first_name,
            middle_name: formData.middle_name,
            last_name: formData.last_name,
            full_name: formData.full_name,
            username: formData.username,
            enabled: formData.enabled,
            user_type: formData.user_type,
            role_profile_name: formData.role_profile_name,
            roles: formData.roles,
            block_modules: formData.block_modules,
            user_image: formData.user_image,
            custom_permissions: cleanedCustomPermissions,
          });

          // Trigger password change if provided during update
          if (formData.new_password) {
            const { changeUserPassword } = await import('src/api/users');
            await changeUserPassword(selectedUser.email, formData.new_password);
          }

          enqueueSnackbar('User updated successfully', { variant: 'success' });
        } else {
          await createUser({
            email: formData.email,
            first_name: formData.first_name,
            middle_name: formData.middle_name,
            last_name: formData.last_name,
            full_name: formData.full_name,
            username: formData.username,
            enabled: formData.enabled,
            user_type: formData.user_type,
            role_profile_name: formData.role_profile_name,
            roles: formData.roles,
            block_modules: formData.block_modules,
            send_welcome_email: formData.send_welcome_email,
            new_password: formData.new_password,
            user_image: formData.user_image,
            custom_permissions: cleanedCustomPermissions,
          });
          enqueueSnackbar('User created successfully', { variant: 'success' });
        }
        refetch();
        handleCloseCreate();
      } catch (error: any) {
        enqueueSnackbar(error.message || 'Operation failed', { variant: 'error' });
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleDeleteRow = (name: string) => {
      setUserToDelete(name);
      setOpenDelete(true);
    };

    const handleConfirmDelete = async () => {
      if (!userToDelete) return;
      setIsDeleting(true);
      try {
        await deleteUser(userToDelete);
        enqueueSnackbar('User deleted successfully', { variant: 'success' });
        refetch();
        setOpenDelete(false);
        setUserToDelete(null);
      } catch (error: any) {
        enqueueSnackbar(error.message || 'Delete failed', { variant: 'error' });
      } finally {
        setIsDeleting(false);
      }
    };

    const handleOpenDetails = (userId: string) => {
      setDetailsUserId(userId);
      setOpenDetails(true);
    };

    const handleCloseDetails = () => {
      setOpenDetails(false);
      setDetailsUserId(null);
    };

    const handleFilters = (update: any) => {
      setFilters((prev) => ({ ...prev, ...update }));
      setPage(0);
    };

    const handleResetFilters = () => {
      setFilters({
        user_type: 'all',
        enabled: 'all',
        permission: 'all',
        roles: [],
      });
      setPage(0);
    };

    const canReset =
      filters.user_type !== 'all' ||
      filters.enabled !== 'all' ||
      filters.permission !== 'all' ||
      filters.roles.length > 0 ||
      !!filterName;

    const notFound = !loading && !data.length && (!!filterName || canReset);

    const empty = !loading && !data.length && !filterName && !canReset;

    const renderContent = (
      <>
        {!hideActionButton && (
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
            <Typography variant="h4" sx={{ flexGrow: 1 }}>
              {!hideHeader ? 'Users' : ''}
            </Typography>

            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={handleOpenCreate}
              sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
            >
              New User
            </Button>
          </Box>
        )}

        <Card>
          <LeadTableToolbar
            numSelected={0}
            filterName={filterName}
            onFilterName={(e) => {
              setFilterName(e.target.value);
              setPage(0);
            }}
            onOpenFilter={() => setOpenFilters(true)}
            canReset={canReset}
            sortBy={sortBy}
            onSortChange={setSortBy}
            searchPlaceholder="Search users..."
            sortOptions={[
              { value: 'modified_desc', label: 'Newest First' },
              { value: 'modified_asc', label: 'Oldest First' },
              { value: 'full_name_asc', label: 'Name: A to Z' },
              { value: 'full_name_desc', label: 'Name: Z to A' },
              { value: 'email_asc', label: 'Email: A to Z' },
              { value: 'email_desc', label: 'Email: Z to A' },
            ]}
            filterLabel="Status"
          />

          <Scrollbar>
            <TableContainer sx={{ overflow: 'unset' }}>
              <Table sx={{ minWidth: 800, borderCollapse: 'collapse' }}>
                <UserTableHead
                  rowCount={total}
                  numSelected={0}
                  onSelectAllRows={() => { }}
                  hideCheckbox
                  headLabel={[
                    { id: 'sno', label: 'Sno', align: 'center' },
                    { id: 'full_name', label: 'Name' },
                    { id: 'email', label: 'Email' },
                    { id: 'enabled', label: 'Status' },
                    { id: 'permission', label: 'Permission' },
                    { id: 'creation', label: 'Created' },
                    { id: '' },
                  ]}
                />

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                        <CircularProgress sx={{ color: '#059669' }} />
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {data.map((row, index) => (
                        <UserTableRow
                          key={row.name}
                          row={row}
                          selected={false}
                          index={page * rowsPerPage + index}
                          onSelectRow={() => { }}
                          onEdit={() => handleEditRow(row)}
                          onDelete={() => handleDeleteRow(row.name)}
                          onView={() => handleOpenDetails(row.name)}
                        />
                      ))}

                      {notFound && <TableNoData searchQuery={filterName} />}

                      {empty && (
                        <TableRow>
                          <TableCell colSpan={7}>
                            <EmptyContent
                              title="No users found"
                              description="Start adding users to your organization."
                              icon="solar:users-group-rounded-bold-duotone"
                              sx={{ py: 5 }}
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
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPageOptions={[10, 25, 50]}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </Card>

        <UserFormDialog
          open={openCreate}
          onClose={handleCloseCreate}
          selectedUser={selectedUser}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          onChangePassword={async (userId: string, newPassword: string) => {
            const { changeUserPassword } = await import('src/api/users');
            try {
              await changeUserPassword(userId, newPassword);
              enqueueSnackbar('Password changed successfully', { variant: 'success' });
              handleCloseCreate(); // Close the dialog
            } catch (error: any) {
              enqueueSnackbar(error.message || 'Failed to change password', { variant: 'error' });
            }
          }}
        />

        <ConfirmDialog
          open={openDelete}
          onClose={() => {
            if (!isDeleting) {
              setOpenDelete(false);
            }
          }}
          title="Delete User"
          content="Are you sure you want to delete this user?"
          action={
            <LoadingButton
              variant="contained"
              color="error"
              loading={isDeleting}
              onClick={handleConfirmDelete}
            >
              Delete
            </LoadingButton>
          }
        />


        <UserDetailsDialog
          open={openDetails}
          onClose={handleCloseDetails}
          userId={detailsUserId}
          onEdit={() => {
            if (detailsUserId) {
              const user = data.find((u) => u.name === detailsUserId);
              if (user) {
                handleEditRow(user);
                handleCloseDetails();
              }
            }
          }}
        />

        <UserTableFiltersDrawer
          open={openFilters}
          onOpen={() => setOpenFilters(true)}
          onClose={() => setOpenFilters(false)}
          filters={filters}
          onFilters={handleFilters}
          canReset={canReset}
          onResetFilters={handleResetFilters}
        />
      </>
    );

    if (hideHeader) {
      return renderContent;
    }

    return <DashboardContent maxWidth={false}>{renderContent}</DashboardContent>;
  }
);

// ----------------------------------------------------------------------

function useTable() {
  // simplified for now
}