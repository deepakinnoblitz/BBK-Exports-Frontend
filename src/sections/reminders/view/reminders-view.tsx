import { MdSaveAs } from "react-icons/md";
import { TbSettings } from "react-icons/tb";
import { useState, useCallback } from 'react';
import { MdNotificationsActive } from "react-icons/md";

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useHRReminders } from 'src/hooks/useReminders';

import { DashboardContent } from 'src/layouts/dashboard';
import { deleteHRReminder, saveReminderSettings, getReminderSettings } from 'src/api/reminders';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { TableNoData, TableEmptyRows } from 'src/components/table';

import { useAuth } from 'src/auth/auth-context';

import { RemindersTableRow } from '../reminders-table-row';
import { RemindersTableHead } from '../reminders-table-head';
import { RemindersTableToolbar } from '../reminders-toolbar';
import { HRReminderFormDialog } from '../reminder-form-dialog';
import { RemindersSettingsView } from '../reminders-settings-view';

// ----------------------------------------------------------------------

export function RemindersView() {
  const { user } = useAuth();
  const actionPerms = user?.permissions?.actions?.reminders;
  const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned && !!actionPerms;
  const canCreate = hasCustomPerms ? !!actionPerms?.create : true;
  const canEdit = hasCustomPerms ? !!actionPerms?.edit : true;
  const canDelete = hasCustomPerms ? !!actionPerms?.delete : true;

  const [currentTab, setCurrentTab] = useState('reminders');
  const [filterName, setFilterName] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('creation_desc');

  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [openForm, setOpenForm] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<any>(null);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { data: reminders, total, loading, refetch } = useHRReminders(
    page + 1,
    rowsPerPage,
    filterName,
    sortBy
  );

  const fetchSettings = useCallback(async () => {
    try {
      const data = await getReminderSettings();
      setSettings(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await saveReminderSettings(settings);
      fetchSettings();
      setSnackbar({ open: true, message: 'Settings saved successfully', severity: 'success' });
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: 'Failed to save settings', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleFilterName = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPage(0);
    setFilterName(event.target.value);
  };

  const handleSortChange = (value: string) => {
    setPage(0);
    setSortBy(value);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const notFound = !reminders.length && !!filterName && !loading;

  return (
    <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4">Employee Reminders</Typography>
      </Stack>

      <Card>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, borderBottom: (t) => `1px solid ${t.palette.divider}` }}>
          <Tabs
            value={currentTab}
            onChange={(e, v) => {
              setCurrentTab(v);
              setPage(0);
              if (v === 'settings') fetchSettings();
            }}
            sx={{
              '& .MuiTabs-indicator': { backgroundColor: '#00A5D1' },
              '& .MuiTab-root.Mui-selected': { color: '#00A5D1' },
            }}
          >
            <Tab label="Remainders" value="reminders" icon={<MdNotificationsActive size={20}/>} iconPosition="start" />
            <Tab label="Settings" value="settings" icon={<TbSettings size={22}/>} iconPosition="start" />
          </Tabs>

          {currentTab === 'reminders' ? (
            canCreate && (
              <Button
                variant="contained"
                startIcon={<Iconify icon="mingcute:add-line" />}
                sx={{ bgcolor: '#00A5D1', '&:hover': { bgcolor: '#0084a7' } }}
                onClick={() => {
                  setSelectedReminder(null);
                  setOpenForm(true);
                }}
              >
                New Reminder
              </Button>
            )
          ) : (
            <LoadingButton
              variant="contained"
              loading={saving}
              onClick={handleSaveSettings}
              startIcon={<MdSaveAs size={20} />}
              sx={{ bgcolor: '#00A5D1', '&:hover': { bgcolor: '#0084a7' } }}
            >
              Save Settings
            </LoadingButton>
          )}
        </Stack>

        {currentTab === 'reminders' ? (
          <>
            <RemindersTableToolbar
              filterName={filterName}
              onFilterName={handleFilterName}
              sortBy={sortBy}
              onSortChange={handleSortChange}
              sortOptions={[
                { value: 'creation_desc', label: 'Newest First' },
                { value: 'creation_asc', label: 'Oldest First' },
                { value: 'message_asc', label: 'Message (A-Z)' },
                { value: 'message_desc', label: 'Message (Z-A)' },
              ]}
            />

            <Scrollbar>
              <TableContainer sx={{ minWidth: 800, position: 'relative' }}>
                <Table>
                  <RemindersTableHead
                    headLabel={[
                      { id: 'sno', label: 'Sno', align: 'center', width: 80 },
                      { id: 'message', label: 'Message', width: 450 },
                      { id: 'trigger_time', label: 'Trigger Time' },
                      { id: 'type', label: 'Type', align: 'center' },
                      { id: '' },
                    ]}
                  />
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                          <CircularProgress sx={{ color: '#059669' }} />
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {reminders.map((row, index) => (
                          <RemindersTableRow
                            key={row.name}
                            row={row}
                            index={page * rowsPerPage + index}
                            onEdit={() => {
                              setSelectedReminder(row);
                              setOpenForm(true);
                            }}
                            onDelete={async () => {
                              try {
                                await deleteHRReminder(row.name);
                                setSnackbar({ open: true, message: 'Reminder deleted successfully', severity: 'success' });
                                refetch();
                              } catch (error) {
                                console.error(error);
                                setSnackbar({ open: true, message: 'Failed to delete reminder', severity: 'error' });
                              }
                            }}
                            canEdit={canEdit}
                            canDelete={canDelete}
                          />
                        ))}

                        {reminders.length > 0 && reminders.length < 5 && (
                          <TableEmptyRows
                            height={77}
                            emptyRows={5 - reminders.length}
                          />
                        )}

                        {notFound && <TableNoData searchQuery={filterName} colSpan={5} />}

                        {!reminders.length && !filterName && (
                          <TableRow>
                            <TableCell colSpan={5} sx={{ p: 0 }}>
                              <EmptyContent
                                title="No Reminders Found"
                                description="Create organizational reminders for employees."
                                sx={{ py: 10 }}
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
          </>
        ) : (
          <RemindersSettingsView settings={settings} setSettings={setSettings} />
        )}
      </Card>

      <HRReminderFormDialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        selectedReminder={selectedReminder}
        onSuccess={() => {
          refetch();
          setSnackbar({
            open: true,
            message: selectedReminder ? 'Reminder updated successfully' : 'Reminder created successfully',
            severity: 'success'
          });
        }}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%', boxShadow: (theme) => theme.customShadows.z8 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}
