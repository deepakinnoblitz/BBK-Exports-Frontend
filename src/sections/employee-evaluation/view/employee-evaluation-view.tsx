import { MdOutlineAccountTree } from "react-icons/md";
import { useState, useCallback, useEffect } from 'react';
import { FaClipboardList, FaTasks } from "react-icons/fa";
import { BsFillClipboard2CheckFill } from "react-icons/bs";

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import List from '@mui/material/List';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import Snackbar from '@mui/material/Snackbar';
import ListItem from '@mui/material/ListItem';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';

import { useEmployeeEvaluationTraits, useEmployeeEvaluationEvents, useEmployeeEvaluationScoreLogs } from 'src/hooks/useEmployeeEvaluation';

import { DashboardContent } from 'src/layouts/dashboard';
import { getForValueOptions } from 'src/api/user-permissions';
import {
  deleteEmployeeEvaluationTrait,
  deleteEmployeeEvaluationEvent,
  fetchEmployeeEvaluationTrait,
  submitEmployeeEvaluationEvent,
  cancelEmployeeEvaluationEvent,
  resetEmployeeScores,
  fetchEvaluationAutomationRules,
  updateEvaluationAutomationRule,
  deleteEvaluationAutomationRule,
} from 'src/api/employee-evaluation';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';
import { TableNoData, TableEmptyRows } from 'src/components/table';

import { useAuth } from 'src/auth/auth-context';

import { EmployeeEvaluationTableHead } from '../employee-evaluation-table-head';
import { EmployeeEvaluationTraitTableRow } from '../evaluation-trait-table-row';
import { EmployeeEvaluationEventTableRow } from '../employee-evaluation-table-row';
import { EmployeeEvaluationTraitFormDialog } from '../evaluation-trait-form-dialog';
import { EmployeeEvaluationTableToolbar } from '../employee-evaluation-table-toolbar';
import { EmployeeEvaluationEventFormDialog } from '../employee-evaluation-form-dialog';
import { EvaluationAutomationRuleTableRow } from '../evaluation-automation-rule-table-row';
import { EmployeeEvaluationEventDetailsDialog } from '../employee-evaluation-details-dialog';
import { EvaluationAutomationRuleFormDialog } from '../evaluation-automation-rule-form-dialog';
import { EmployeeEvaluationScoreLogTableRow } from '../employee-evaluation-score-log-table-row';


// ----------------------------------------------------------------------

const TABS = [
  { value: 'events', label: 'Employee Evaluations', icon: <BsFillClipboard2CheckFill size={18} /> },
  { value: 'traits', label: 'Performance Criteria', icon: <FaTasks size={18} /> },
  { value: 'logs', label: 'Score Logs', icon: <FaClipboardList size={18} /> },
  { value: 'automation', label: 'Automation Rules', icon: <MdOutlineAccountTree size={20} /> },
];

export function EmployeeEvaluationView() {
  const { user } = useAuth();
  const actionPerms = user?.permissions?.actions?.employee_evaluation;
  const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned && !!actionPerms;
  const canCreateEvaluation = hasCustomPerms ? !!actionPerms?.create : true;
  const canEditEvaluation = hasCustomPerms ? !!actionPerms?.edit : true;
  const canDeleteEvaluation = hasCustomPerms ? !!actionPerms?.delete : true;

  const isAdminOrManager = user?.roles.some(role =>
    ['Administrator', 'HR', 'System Manager'].includes(role)
  );

  const isEmployee = user?.roles.includes('Employee');

  const hideTabs = isEmployee && !isAdminOrManager;

  const filteredTabs = hideTabs ? TABS.filter(tab => tab.value === 'events') : TABS;

  const [currentTab, setCurrentTab] = useState('events');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterName, setFilterName] = useState('');
  const [sortBy, setSortBy] = useState('modified_desc');

  const [openDetails, setOpenDetails] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const [openEventForm, setOpenEventForm] = useState(false);
  const [openTraitForm, setOpenTraitForm] = useState(false);
  const [selectedTrait, setSelectedTrait] = useState<any>(null);

  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    type: 'event' | 'trait' | 'automation' | null;
    name: string | null;
    isSubmitted?: boolean;
  }>({
    open: false,
    type: null,
    name: null,
    isSubmitted: false,
  });

  const [filters, setFilters] = useState<any>({
    employee: null,
    trait: null,
    evaluation_type: 'all',
    docstatus: null,
    category: '',
    startDate: null,
    endDate: null,
    event_type: 'all',
    rule_enabled: 'all',
  });

  useEffect(() => {
    if (hideTabs && user?.employee) {
      setFilters((prev: any) => ({ ...prev, employee: user.employee }));
    }
  }, [hideTabs, user?.employee]);

  const [openResetDialog, setOpenResetDialog] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetResults, setResetResults] = useState<any[]>([]);
  const [openSummaryDialog, setOpenSummaryDialog] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
  const [selectedResetEmployees, setSelectedResetEmployees] = useState<string[]>([]);
  const [resetSearch, setResetSearch] = useState('');

  useEffect(() => {
    if (openResetDialog) {
      getForValueOptions('Employee', [['Employee', 'status', '=', 'Active']])
        .then(setEmployeeOptions)
        .catch(console.error);
    }
  }, [openResetDialog]);

  useEffect(() => {
    if (openResetDialog && employeeOptions.length > 0 && filters.employee && selectedResetEmployees.length === 0) {
      setSelectedResetEmployees([filters.employee]);
    }
  }, [openResetDialog, employeeOptions, filters.employee, selectedResetEmployees]);

  const handleToggleResetEmployee = (name: string) => {
    setSelectedResetEmployees(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleSelectAllReset = () => {
    setSelectedResetEmployees(employeeOptions.map(emp => emp.name));
  };

  const handleUnselectAllReset = () => {
    setSelectedResetEmployees([]);
  };

  const filteredResetEmployees = employeeOptions.filter(emp =>
    emp.employee_name?.toLowerCase().includes(resetSearch.toLowerCase()) ||
    emp.name.toLowerCase().includes(resetSearch.toLowerCase())
  );

  const { data: events, total: totalEvents, loading: loadingEvents, refetch: refetchEvents } = useEmployeeEvaluationEvents(page + 1, rowsPerPage, filterName, sortBy, filters);
  const { data: logs, total: totalLogs, loading: loadingLogs, refetch: refetchLogs } = useEmployeeEvaluationScoreLogs(page + 1, rowsPerPage, filterName, sortBy, filters);
  const { data: traits, total: totalTraits, loading: loadingTraits, refetch: refetchTraits } = useEmployeeEvaluationTraits(page + 1, rowsPerPage, filterName, sortBy, filters);

  // Automation Rules state
  const [automationRules, setAutomationRules] = useState<any[]>([]);
  const [totalAutomation, setTotalAutomation] = useState(0);
  const [loadingAutomation, setLoadingAutomation] = useState(false);
  const [openAutomationForm, setOpenAutomationForm] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);

  const refetchAutomation = useCallback(async () => {
    if (!isAdminOrManager) return;
    setLoadingAutomation(true);
    try {
      const result = await fetchEvaluationAutomationRules({
        page: page + 1,
        page_size: rowsPerPage,
        search: filterName,
        sort_by: sortBy,
        event_type: filters.event_type,
        enabled: filters.rule_enabled === 'all' ? undefined : Number(filters.rule_enabled)
      });
      setAutomationRules(result.data);
      setTotalAutomation(result.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAutomation(false);
    }
  }, [page, rowsPerPage, filterName, sortBy, filters.event_type, filters.rule_enabled, isAdminOrManager]);

  useEffect(() => {
    if (currentTab === 'automation') refetchAutomation();
  }, [currentTab, refetchAutomation]);

  const canReset = !!filterName || (filters.employee && !hideTabs) || !!filters.trait || (filters.evaluation_type !== 'all') || (filters.docstatus !== null) || !!filters.category || !!filters.startDate || !!filters.endDate || (filters.event_type !== 'all') || (filters.rule_enabled !== 'all');

  const notFoundEvents = !events.length && !!filterName && !loadingEvents;
  const emptyEvents = !events.length && !filterName && !loadingEvents;

  const notFoundLogs = !logs.length && !!filterName && !loadingLogs;
  const emptyLogs = !logs.length && !filterName && !loadingLogs;

  const notFoundTraits = !traits.length && !!filterName && !loadingTraits;
  const emptyTraits = !traits.length && !filterName && !loadingTraits;

  const handleChangeTab = useCallback((event: React.SyntheticEvent, newValue: string) => {
    setCurrentTab(newValue);
    setPage(0);
  }, []);

  const renderTabs = (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, borderBottom: (t) => `1px solid ${t.palette.divider}` }}>
      <Tabs
        value={currentTab}
        onChange={handleChangeTab}
        sx={{
          '& .MuiTabs-indicator': {
            backgroundColor: '#00A5D1',
          },
          '& .MuiTab-root.Mui-selected': {
            color: '#00A5D1',
          },
        }}
      >
        {filteredTabs.map((tab) => (
          <Tab key={tab.value} label={tab.label} icon={tab.icon} value={tab.value} iconPosition="start" />
        ))}
      </Tabs>

      {!hideTabs && currentTab !== 'logs' && canCreateEvaluation && (
        <Stack direction="row" spacing={1}>
          {currentTab !== 'automation' && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Iconify icon="solar:restart-bold" />}
              onClick={() => setOpenResetDialog(true)}
              sx={{ height: 40 }}
            >
              Reset Scores
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            sx={{ bgcolor: '#00A5D1', '&:hover': { bgcolor: '#0084a7' } }}
            onClick={() => {
              if (currentTab === 'events') setOpenEventForm(true);
              if (currentTab === 'traits') {
                setSelectedTrait(null);
                setOpenTraitForm(true);
              }
              if (currentTab === 'automation') {
                setSelectedRule(null);
                setOpenAutomationForm(true);
              }
            }}
          >
            {currentTab === 'events' ? 'New Event' : currentTab === 'traits' ? 'New Criteria' : 'New Rule'}
          </Button>
        </Stack>
      )}
    </Stack>
  );

  return (
    <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4">Employee Evaluation</Typography>
      </Stack>

      <Card>
        {renderTabs}

        <EmployeeEvaluationTableToolbar
          filterName={filterName}
          onFilterName={(event) => {
            setFilterName(event.target.value);
            setPage(0);
          }}
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
          onResetFilters={() => {
            setFilterName('');
            setFilters({
              employee: hideTabs ? user?.employee : null,
              trait: null,
              evaluation_type: 'all',
              docstatus: null,
              category: '',
              startDate: null,
              endDate: null,
              event_type: 'all',
              rule_enabled: 'all',
            });
          }}
          currentTab={currentTab}
          traitsOptions={traits}
          hideEmployeeFilter={hideTabs}
        />

        <Scrollbar>
          <TableContainer sx={{ minWidth: 800, position: 'relative' }}>
            <Table sx={{ borderCollapse: 'collapse' }}>
              {currentTab === 'events' && (
                <>
                  <EmployeeEvaluationTableHead
                    headLabel={[
                      { id: 'sno', label: 'Sno', align: 'center' },
                      { id: 'employee', label: 'Employee' },
                      { id: 'trait', label: 'Criteria' },
                      { id: 'type', label: 'Type' },
                      { id: 'change', label: 'Change' },
                      { id: 'date', label: 'Date' },
                      { id: 'status', label: 'Status' },
                      { id: '' },
                    ]}
                  />
                  <TableBody>
                    {loadingEvents ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                          <CircularProgress sx={{ color: '#059669' }} />
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {events.map((row, index) => (
                          <EmployeeEvaluationEventTableRow
                            key={row.name}
                            row={row}
                            index={page * rowsPerPage + index}
                            selected={false}
                            onSelectRow={() => { }}
                            onView={() => {
                              setSelectedEvent(row);
                              setOpenDetails(true);
                            }}
                            onEdit={() => {
                              setSelectedEvent(row);
                              setOpenEventForm(true);
                            }}
                            onSubmit={async () => {
                              try {
                                await submitEmployeeEvaluationEvent({
                                  doctype: 'Employee Evaluation',
                                  name: row.name,
                                } as any);
                                setSnackbar({ open: true, message: 'Submitted successfully', severity: 'success' });
                                refetchEvents();
                                refetchLogs();
                              } catch (error: any) {
                                setSnackbar({ open: true, message: error.message || 'Submission failed', severity: 'error' });
                              }
                            }}
                            onCancel={async () => {
                              try {
                                await cancelEmployeeEvaluationEvent(row.name);
                                setSnackbar({ open: true, message: 'Cancelled successfully', severity: 'success' });
                                refetchEvents();
                                refetchLogs();
                              } catch (error: any) {
                                setSnackbar({ open: true, message: error.message || 'Cancellation failed', severity: 'error' });
                              }
                            }}
                            onDelete={() => {
                              setConfirmDelete({
                                open: true,
                                type: 'event',
                                name: row.name,
                                isSubmitted: row.docstatus === 1,
                              });
                            }}
                            hideActions={hideTabs}
                          />
                        ))}

                        {emptyEvents && (
                          <TableRow>
                            <TableCell colSpan={8}>
                              <EmptyContent
                                title="No Employee Evaluation Assessment"
                                description="Wait for HR to add employee evaluations for employees."
                                icon="solar:clipboard-check-bold-duotone"
                              />
                            </TableCell>
                          </TableRow>
                        )}

                        {!emptyEvents && !notFoundEvents && (
                          <TableEmptyRows
                            height={77}
                            emptyRows={events.length < 5 ? 5 - events.length : 0}
                          />
                        )}

                        {notFoundEvents && <TableNoData searchQuery={filterName} colSpan={8} />}
                      </>
                    )}
                  </TableBody>
                </>
              )}

              {currentTab === 'logs' && (
                <>
                  <EmployeeEvaluationTableHead
                    headLabel={[
                      { id: 'sno', label: 'Sno', align: 'center' },
                      { id: 'employee', label: 'Employee' },
                      { id: 'prev', label: 'Prev Score' },
                      { id: 'change', label: 'Change' },
                      { id: 'new', label: 'New Score' },
                      { id: 'reason', label: 'Reason' },
                      { id: 'date', label: 'Date' },
                    ]}
                  />
                  <TableBody>
                    {loadingLogs ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                          <CircularProgress sx={{ color: '#059669' }} />
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {logs.map((row, index) => (
                          <EmployeeEvaluationScoreLogTableRow
                            key={row.name}
                            row={row}
                            index={page * rowsPerPage + index}
                          />
                        ))}

                        {emptyLogs && (
                          <TableRow>
                            <TableCell colSpan={7}>
                              <EmptyContent
                                title="No Score Logs found"
                                description="Personal score changes will be logged here."
                                icon="solar:history-bold-duotone"
                              />
                            </TableCell>
                          </TableRow>
                        )}

                        {!emptyLogs && !notFoundLogs && (
                          <TableEmptyRows
                            height={77}
                            emptyRows={logs.length < 5 ? 5 - logs.length : 0}
                          />
                        )}

                        {notFoundLogs && <TableNoData searchQuery={filterName} colSpan={7} />}
                      </>
                    )}
                  </TableBody>
                </>
              )}

              {currentTab === 'traits' && (
                <>
                  <EmployeeEvaluationTableHead
                    headLabel={[
                      { id: 'sno', label: 'Sno', align: 'center' },
                      { id: 'name', label: 'Criteria Name' },
                      { id: 'category', label: 'Category' },
                      { id: 'description', label: 'Description' },
                      { id: '' },
                    ]}
                  />
                  <TableBody>
                    {loadingTraits ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                          <CircularProgress sx={{ color: '#059669' }} />
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {traits.map((row, index) => (
                          <EmployeeEvaluationTraitTableRow
                            key={row.name}
                            row={row}
                            index={page * rowsPerPage + index}
                            onEdit={async () => {
                              try {
                                const fullTrait = await fetchEmployeeEvaluationTrait(row.name);
                                setSelectedTrait(fullTrait);
                                setOpenTraitForm(true);
                              } catch (error) {
                                console.error('Failed to fetch trait details:', error);
                                // Fallback to row data if fetch fails
                                setSelectedTrait(row);
                                setOpenTraitForm(true);
                              }
                            }}
                            onDelete={() => {
                              setConfirmDelete({
                                open: true,
                                type: 'trait',
                                name: row.name,
                              });
                            }}
                          />
                        ))}

                        {emptyTraits && (
                          <TableRow>
                            <TableCell colSpan={5}>
                              <EmptyContent
                                title="No Criteria found"
                                description="Define performance criteria to start evaluations."
                                icon="solar:user-speak-bold-duotone"
                              />
                            </TableCell>
                          </TableRow>
                        )}

                        {!emptyTraits && !notFoundTraits && (
                          <TableEmptyRows
                            height={77}
                            emptyRows={traits.length < 5 ? 5 - traits.length : 0}
                          />
                        )}

                        {notFoundTraits && <TableNoData searchQuery={filterName} colSpan={5} />}
                      </>
                    )}
                  </TableBody>
                </>
              )}
              {currentTab === 'automation' && (
                <>
                  <EmployeeEvaluationTableHead
                    headLabel={[
                      { id: 'sno', label: 'Sno', align: 'center' },
                      { id: 'rule_name', label: 'Rule Name' },
                      { id: 'event_type', label: 'Event Type' },
                      { id: 'trait', label: 'Trait' },
                      { id: 'evaluation_point', label: 'Point' },
                      { id: 'threshold', label: 'Threshold' },
                      { id: 'status', label: 'Status' },
                      { id: '' },
                    ]}
                  />
                  <TableBody>
                    {loadingAutomation ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                          <CircularProgress sx={{ color: '#059669' }} />
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {automationRules.map((row, index) => (
                          <EvaluationAutomationRuleTableRow
                            key={row.name}
                            row={row}
                            index={page * rowsPerPage + index}
                            onEdit={() => {
                              setSelectedRule(row);
                              setOpenAutomationForm(true);
                            }}
                            onDelete={() => setConfirmDelete({ open: true, type: 'automation', name: row.name })}
                            onToggleEnabled={async (enabled) => {
                              try {
                                await updateEvaluationAutomationRule(row.name, { enabled: enabled ? 1 : 0 });
                                refetchAutomation();
                              } catch (err: any) {
                                    setSnackbar({ open: true, message: err.message || 'Update failed', severity: 'error' });
                              }
                            }}
                          />
                        ))}
                        {!loadingAutomation && automationRules.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8}>
                              <EmptyContent
                                title="No Automation Rules"
                                description="Create rules to auto-generate evaluations from system events."
                                icon="solar:layers-minimalistic-bold-duotone"
                              />
                            </TableCell>
                          </TableRow>
                        )}
                        {!loadingAutomation && automationRules.length > 0 && automationRules.length < 5 && (
                          <TableEmptyRows height={77} emptyRows={5 - automationRules.length} />
                        )}
                      </>
                    )}
                  </TableBody>
                </>
              )}

            </Table>
          </TableContainer>
        </Scrollbar>

        <TablePagination
          component="div"
          page={page}
          count={
            (currentTab === 'events' && totalEvents) ||
            (currentTab === 'logs' && totalLogs) ||
            (currentTab === 'traits' && totalTraits) ||
            (currentTab === 'automation' && totalAutomation) ||
            0
          }
          rowsPerPage={rowsPerPage}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPageOptions={[10, 25, 50]}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Card>

      <EmployeeEvaluationEventDetailsDialog
        open={openDetails}
        onClose={() => {
          setOpenDetails(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
      />

      <EmployeeEvaluationEventFormDialog
        open={openEventForm}
        onClose={() => {
          setOpenEventForm(false);
          setSelectedEvent(null);
        }}
        onSuccess={() => {
          setSnackbar({ open: true, message: selectedEvent ? 'Updated successfully' : 'Created successfully', severity: 'success' });
          refetchEvents();
          refetchLogs();
        }}
        onError={(msg) => {
          setSnackbar({ open: true, message: msg, severity: 'error' });
        }}
        selectedEvent={selectedEvent}
      />

      <EmployeeEvaluationTraitFormDialog
        open={openTraitForm}
        onClose={() => {
          setOpenTraitForm(false);
          setSelectedTrait(null);
        }}
        onSuccess={() => {
          setSnackbar({ open: true, message: selectedTrait ? 'Criteria updated successfully' : 'Criteria created successfully', severity: 'success' });
          refetchTraits();
        }}
        onError={(msg) => {
          setSnackbar({ open: true, message: msg, severity: 'error' });
        }}
        selectedTrait={selectedTrait}
      />

      <EvaluationAutomationRuleFormDialog
        open={openAutomationForm}
        onClose={() => {
          setOpenAutomationForm(false);
          setSelectedRule(null);
        }}
        onSuccess={() => {
          setSnackbar({ open: true, message: selectedRule ? 'Automation rule updated successfully' : 'Automation rule created successfully', severity: 'success' });
          refetchAutomation();
        }}
        selectedRule={selectedRule}
        traits={traits}
        setSnackbar={setSnackbar}
      />

      <ConfirmDialog
        open={confirmDelete.open}
        onClose={() => setConfirmDelete((prev) => ({ ...prev, open: false }))}
        title={confirmDelete.isSubmitted ? "Cannot Delete" : "Delete Confirmation"}
        content={
          confirmDelete.isSubmitted
            ? "This event is already submitted. You need to cancel it first before you can delete it."
            : `Are you sure you want to delete this ${confirmDelete.type === 'event' ? 'employee evaluation' : 'performance criteria'}?`
        }
        icon={confirmDelete.isSubmitted ? "solar:info-circle-bold" : "solar:danger-bold"}
        iconColor={confirmDelete.isSubmitted ? "info.main" : "error.main"}
        action={
          confirmDelete.isSubmitted ? (
            <Button variant="contained" onClick={() => setConfirmDelete((prev) => ({ ...prev, open: false }))}>
              OK
            </Button>
          ) : (
            <Button
              variant="contained"
              color="error"
              onClick={async () => {
                try {
                  if (confirmDelete.type === 'event' && confirmDelete.name) {
                    await deleteEmployeeEvaluationEvent(confirmDelete.name);
                    setSnackbar({ open: true, message: 'Deleted successfully', severity: 'success' });
                    refetchEvents();
                    refetchLogs();
                  } else if (confirmDelete.type === 'trait' && confirmDelete.name) {
                    await deleteEmployeeEvaluationTrait(confirmDelete.name);
                    setSnackbar({ open: true, message: 'Deleted successfully', severity: 'success' });
                    refetchTraits();
                  } else if (confirmDelete.type === 'automation' && confirmDelete.name) {
                    await deleteEvaluationAutomationRule(confirmDelete.name);
                    setSnackbar({ open: true, message: 'Automation rule deleted', severity: 'success' });
                    refetchAutomation();
                  }
                  setConfirmDelete((prev) => ({ ...prev, open: false }));
                } catch (error: any) {
                  setSnackbar({ open: true, message: error.message || 'Delete failed', severity: 'error' });
                }
              }}
            >
              Delete
            </Button>
          )
        }
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev: any) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((prev: any) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%', boxShadow: (theme) => theme.customShadows.z8 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Dialog open={openResetDialog} onClose={() => !resetLoading && setOpenResetDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pt: 3 }}>Reset Employee Evaluation Scores</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Toggle the employees whose scores you want to reset to 100.
          </Typography>

          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={handleSelectAllReset}>Select All</Button>
              <Button size="small" variant="outlined" color="error" onClick={handleUnselectAllReset}>Unselect All (Off)</Button>
            </Stack>

            <Stack direction="row" spacing={2}>
              <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                Selected: {selectedResetEmployees.length}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 'bold' }}>
                Unselected: {employeeOptions.length - selectedResetEmployees.length}
              </Typography>
            </Stack>
          </Stack>

          <TextField
            fullWidth
            size="small"
            placeholder="Search employees..."
            value={resetSearch}
            onChange={(e) => setResetSearch(e.target.value)}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon={"solar:magnifer-linear" as any} sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />

          <Card
            sx={{
              border: (theme) => `1px solid ${theme.palette.divider}`,
              mb: 3,
              height: 320,
              display: 'flex',
              flexDirection: 'column',
              bgcolor: (theme) => alpha(theme.palette.grey[500], 0.02),
            }}
          >
            <Scrollbar>
              <List disablePadding>
                {filteredResetEmployees.map((emp) => (
                  <ListItem key={emp.name} divider>
                    <ListItemText
                      primary={emp.employee_name}
                      secondary={emp.name}
                      primaryTypographyProps={{ variant: 'subtitle2' }}
                    />
                    <ListItemSecondaryAction sx={{ right: 16 }}>
                      <Switch
                        edge="end"
                        checked={selectedResetEmployees.includes(emp.name)}
                        onChange={() => handleToggleResetEmployee(emp.name)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                {filteredResetEmployees.length === 0 && (
                  <ListItem>
                    <ListItemText primary="No employees found" sx={{ textAlign: 'center', color: 'text.disabled' }} />
                  </ListItem>
                )}
              </List>
            </Scrollbar>
          </Card>

          <TextField
            fullWidth
            type={showPassword ? 'text' : 'password'}
            label="Admin Password"
            value={resetPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setResetPassword(e.target.value);
              setResetError('');
            }}
            error={!!resetError}
            helperText={resetError || "Enter Administrator password to confirm reset"}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    <Iconify icon={showPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setOpenResetDialog(false)} disabled={resetLoading}>
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            color="error"
            loading={resetLoading}
            onClick={async () => {
              if (!resetPassword) {
                setResetError('Password is required');
                return;
              }
              setResetLoading(true);
              setResetError('');
              try {
                const results = await resetEmployeeScores(resetPassword, selectedResetEmployees.length > 0 ? selectedResetEmployees : undefined);
                setOpenResetDialog(false);
                setResetResults(results);
                setOpenSummaryDialog(true);
                setResetPassword('');
                setSelectedResetEmployees([]);
                refetchLogs();
              } catch (error: any) {
                setResetError(error.message || 'Failed to reset scores');
              } finally {
                setResetLoading(false);
              }
            }}
          >
            Reset All
          </LoadingButton>
        </DialogActions>
      </Dialog>

      <Dialog open={openSummaryDialog} onClose={() => setOpenSummaryDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Reset Summary
          <IconButton onClick={() => setOpenSummaryDialog(false)} size="small">
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, pb: 4 }}>
          <Typography variant="body2" sx={{ px: 3, pt: 1, pb: 3, color: 'text.secondary' }}>
            Successfully reset scores for <b>{resetResults.length}</b> employees to 100.
          </Typography>
          <Scrollbar sx={{ maxHeight: 400 }}>
            <Table size="medium" sx={{ borderCollapse: 'collapse' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ pl: 3, py: 2 }}>Employee</TableCell>
                  <TableCell align="center" sx={{ py: 2 }}>Old Score</TableCell>
                  <TableCell align="center" sx={{ py: 2 }}>New Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resetResults.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell sx={{ pl: 3, py: 2 }}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Typography variant="subtitle2" noWrap>
                          {result.employee_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          {result.employee}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 2 }}>
                      <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                        {result.previous_score}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 2 }}>
                      <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                        {result.new_score}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Scrollbar>
        </DialogContent>
      </Dialog>
    </DashboardContent>
  );
}
