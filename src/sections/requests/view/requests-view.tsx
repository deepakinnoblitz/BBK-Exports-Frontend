import dayjs from 'dayjs';
import { useState, useCallback, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Popover from '@mui/material/Popover';
import Snackbar from '@mui/material/Snackbar';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useSocket } from 'src/hooks/use-socket';
import { useRequests } from 'src/hooks/useRequests';

import { getCurrentUserInfo } from 'src/api/auth';
import { fetchEmployees } from 'src/api/employees';
import { markAsRead } from 'src/api/unread-counts';
import { DashboardContent } from 'src/layouts/dashboard';
import { createRequest, updateRequest, deleteRequest, getRequestPermissions, applyRequestWorkflowAction, updateRequestStatus, getRequest } from 'src/api/requests';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';
import { RichTextEditor } from 'src/components/rich-text-editor/rich-text-editor';

import { TableNoData } from 'src/sections/lead/table-no-data';
import { TableEmptyRows } from 'src/sections/lead/table-empty-rows';
import { RequestTableRow } from 'src/sections/requests/requests-table-row';
import { LeadTableHead as RequestTableHead } from 'src/sections/lead/lead-table-head';
import { RequestDetailsDialog } from 'src/sections/report/requests/requests-details-dialog';
import { LeadTableToolbar as RequestTableToolbar } from 'src/sections/lead/lead-table-toolbar';

import { useAuth } from 'src/auth/auth-context';

import { RequestsTableFiltersDrawer } from '../requests-table-filters-drawer';

// ----------------------------------------------------------------------

export function RequestsView() {
  const { user } = useAuth();
  const hasCustomPerms = user?.permissions?.custom_permissions_assigned && (user?.permissions?.actions?.request_list || user?.permissions?.actions?.my_request_list);
  const actionPerms = user?.permissions?.actions?.request_list || user?.permissions?.actions?.my_request_list;
  const canCreateRequest = hasCustomPerms && actionPerms ? !!actionPerms?.create : true;
  const canEditRequest = hasCustomPerms && actionPerms ? !!actionPerms?.edit : true;
  const canDeleteRequest = hasCustomPerms && actionPerms ? !!actionPerms?.delete : true;

  const { socket } = useSocket(user?.email);
  const isHR = user?.roles?.some((role: string) =>
    ['HR Manager', 'HR', 'System Manager', 'Administrator'].includes(role)
  );

  const isRestrictedEmployee = user?.roles.includes('Employee') && !isHR;

  const [page, setPage] = useState(0);

  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterName, setFilterName] = useState('');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState('modified');
  const [selected, setSelected] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('modified_desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [filterUnreadMessages, setFilterUnreadMessages] = useState(false);

  const [openFilters, setOpenFilters] = useState(false);

  const effectiveEmployee = isHR ? (filterEmployee || 'all') : (user?.employee || 'all');

  const { data, total, loading, refetch } = useRequests(
    page + 1,
    rowsPerPage,
    filterName,
    orderBy,
    order,
    startDate || undefined,
    endDate || undefined,
    filterStatus,
    effectiveEmployee,
    socket,
    isHR ? filterUnreadMessages : undefined
  );

  const [openCreate, setOpenCreate] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });

  // Form state
  const [employeeId, setEmployeeId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // View dialog state
  const [openView, setOpenView] = useState(false);
  const [viewRequest, setViewRequest] = useState<any>(null);

  // Employees for dropdown
  const [employees, setEmployees] = useState<any[]>([]);

  // Permissions
  const [permissions, setPermissions] = useState({ read: false, write: false, delete: false });

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);

  // Load permissions and employees
  useEffect(() => {
    getRequestPermissions().then(setPermissions);
    fetchEmployees({ page: 1, page_size: 1000, search: '' }).then((res) => {
      setEmployees(res.data || []);
    });
  }, []);

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setSortBy(`${property}_${isAsc ? 'desc' : 'asc'}`);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    const lastUnderscoreIndex = value.lastIndexOf('_');
    const prop = value.substring(0, lastUnderscoreIndex);
    const ord = value.substring(lastUnderscoreIndex + 1);
    setOrderBy(prop);
    setOrder(ord as 'asc' | 'desc');
  };

  const handleFilters = useCallback((update: Partial<{ status: string; employee: string | null; startDate: string | null; endDate: string | null; unread_messages: boolean }>) => {
    if ('status' in update) setFilterStatus(update.status || 'all');
    if ('employee' in update) setFilterEmployee(update.employee || null);
    if ('startDate' in update) setStartDate(update.startDate || null);
    if ('endDate' in update) setEndDate(update.endDate || null);
    if ('unread_messages' in update) setFilterUnreadMessages(!!update.unread_messages);
    setPage(0);
  }, []);

  const handleResetFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setFilterStatus('all');
    setFilterEmployee(null);
    setFilterName('');
    setFilterUnreadMessages(false);
    setPage(0);
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
      await Promise.all(selected.map((name) => deleteRequest(name)));
      setSnackbar({ open: true, message: `${selected.length} request(s) deleted successfully`, severity: 'success' });
      setSelected([]);
      refetch();
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to delete requests', severity: 'error' });
    }
  };

  const handleOpenCreate = async () => {
    setIsEdit(false);
    setCurrentRequest(null);
    setSubject('');
    setMessage('');
    setFormErrors({});

    // Fetch current user's employee data
    try {
      const userInfo = await getCurrentUserInfo();
      if (userInfo && userInfo.employee) {
        setEmployeeId(userInfo.employee);
      } else {
        setEmployeeId('');
      }
    } catch (error) {
      console.error('Failed to fetch current user info:', error);
      setEmployeeId('');
    }

    setOpenCreate(true);
  };

  const handleCloseCreate = () => {
    setOpenCreate(false);
    setIsEdit(false);
    setCurrentRequest(null);
    setEmployeeId('');
    setSubject('');
    setMessage('');
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!employeeId) errors.employeeId = 'Employee selection is required';
    if (!subject.trim()) errors.subject = 'Please provide a subject for your request';
    
    // Check if rich text editor content is empty by extracting text content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = message;
    const plainTextMessage = (tempDiv.textContent || tempDiv.innerText || '').trim();
    if (!plainTextMessage) {
      errors.message = 'Please enter the details of your request';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const renderField = (fieldname: string, label: string, type: string = 'text', options: any[] = [], extraProps: any = {}, required: boolean = false) => {
    const valueMap: Record<string, any> = {
      employeeId,
      subject,
      message
    };

    const onChangeMap: Record<string, any> = {
      employeeId: (val: any) => {
        setEmployeeId(val);
        if (formErrors.employeeId) setFormErrors(prev => ({ ...prev, employeeId: '' }));
      },
      subject: (val: any) => {
        setSubject(val);
        if (formErrors.subject) setFormErrors(prev => ({ ...prev, subject: '' }));
      },
      message: (val: any) => {
        setMessage(val);
        if (formErrors.message) setFormErrors(prev => ({ ...prev, message: '' }));
      }
    };

    const commonProps = {
      fullWidth: true,
      label,
      value: valueMap[fieldname] || '',
      onChange: (e: any) => onChangeMap[fieldname](e.target.value),
      InputLabelProps: { shrink: true },
      required,
      error: !!formErrors[fieldname],
      helperText: formErrors[fieldname],
      ...extraProps,
      sx: {
        '& .MuiFormLabel-asterisk': {
          color: 'red',
        },
        ...extraProps.sx
      }
    };

    if (type === 'select' || type === 'link') {
      return (
        <TextField {...commonProps} select SelectProps={{ native: true }}>
          <option value="">Select {label}</option>
          {options.map((opt: any) => (
            <option key={opt.name || opt} value={opt.name || opt}>
              {opt.label || opt.employee_name || opt.name || opt}
            </option>
          ))}
        </TextField>
      );
    }

    if (type === 'textarea') {
      return <TextField {...commonProps} multiline rows={4} />;
    }

    return <TextField {...commonProps} />;
  };

  const handleEditRow = useCallback((row: any) => {
    setCurrentRequest(row);
    setEmployeeId(row.employee_id || '');
    setSubject(row.subject || '');
    setMessage(row.message || '');
    setIsEdit(true);
    setOpenCreate(true);
  }, []);

  const handleViewRow = useCallback((row: any) => {
    setViewRequest(row);
    setOpenView(true);

    // Mark as read and trigger sidebar refresh
    markAsRead('Request', row.name).then(() => {
      window.dispatchEvent(new CustomEvent('REFRESH_UNREAD_COUNTS'));
    });
  }, []);

  const handleDeleteRow = useCallback((id: string) => {
    setConfirmDelete({ open: true, id });
  }, []);

  const handleConfirmDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      await deleteRequest(confirmDelete.id);
      setSnackbar({ open: true, message: 'Request deleted successfully', severity: 'success' });
      refetch();
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to delete request', severity: 'error' });
    } finally {
      setConfirmDelete({ open: false, id: null });
    }
  };

  const handleApplyAction = async (id: string, action: string) => {
    try {
      await applyRequestWorkflowAction(id, action);
      setSnackbar({ open: true, message: `Request ${action}ed successfully`, severity: 'success' });
      await refetch();
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || `Failed to ${action} request`, severity: 'error' });
    }
  };

  const handleClarify = async (id: string, clarificationMessage: string) => {
    try {
      const request = await getRequest(id);
      // Assuming Request doctype has hr_query fields similar to Leave Application
      const fields = ['hr_query', 'hr_query_2', 'hr_query_3', 'hr_query_4', 'hr_query_5'];
      const nextField = fields.find(f => !request[f]);

      if (!nextField) {
        throw new Error('Maximum clarification limit reached');
      }

      const updateData = { [nextField]: clarificationMessage };
      await updateRequestStatus(id, 'Clarification Requested', updateData);

      setSnackbar({ open: true, message: 'Clarification requested successfully', severity: 'success' });
      await refetch();
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to request clarification', severity: 'error' });
      throw error;
    }
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      setSnackbar({
        open: true,
        message: 'Missing required information. Please check the highlighted fields.',
        severity: 'error'
      });
      return;
    }

    try {
      setSubmitting(true);

      const requestData = {
        employee_id: employeeId.trim(),
        subject: subject.trim(),
        message: message.trim(),
      };

      if (isEdit && currentRequest) {
        await updateRequest(currentRequest.name, requestData);
        setSnackbar({ open: true, message: 'Request updated successfully', severity: 'success' });
      } else {
        await createRequest(requestData);
        setSnackbar({ open: true, message: 'Request created successfully', severity: 'success' });
      }
      handleCloseCreate();
      refetch();
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Operation failed', severity: 'error' });
    } finally {
      setSubmitting(false);
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
          Request List
        </Typography>

        {permissions.write && canCreateRequest && (
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={handleOpenCreate}
            sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
          >
            New Request
          </Button>
        )}
      </Box>

      <Card>
        <RequestTableToolbar
          numSelected={selected.length}
          filterName={filterName}
          onFilterName={handleFilterByName}
          searchPlaceholder="Search requests..."
          onDelete={selected.length > 0 ? handleBulkDelete : undefined}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          sortOptions={[
            { value: 'modified_desc', label: 'Newest First' },
            { value: 'modified_asc', label: 'Oldest First' },
            { value: 'employee_id_asc', label: 'Employee ID: Low to High' },
            { value: 'employee_id_desc', label: 'Employee ID: High to Low' },
            { value: 'employee_name_asc', label: 'Employee Name: A to Z' },
            { value: 'employee_name_desc', label: 'Employee Name: Z to A' },
            { value: 'subject_asc', label: 'Subject: A to Z' },
            { value: 'subject_desc', label: 'Subject: Z to A' },
          ]}
          onOpenFilter={() => setOpenFilters(true)}
          canReset={!!startDate || !!endDate || !!filterName || filterStatus !== 'all' || filterEmployee !== null || (isHR ? filterUnreadMessages : false)}
        />


        <Scrollbar>
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: { xs: 300, md: 800 } }}>
              <RequestTableHead
                order={order}
                orderBy={orderBy}
                rowCount={data.length}
                numSelected={selected.length}


                onSelectAllRows={(checked: boolean) => handleSelectAllRows(checked)}

                hideCheckbox
                showIndex
                headLabel={[
                  { id: 'employee_name', label: 'Employee Name' },
                  { id: 'subject', label: 'Subject', width: 500, sx: { display: { xs: 'none', md: 'table-cell' } } },
                  { id: 'workflow_state', label: 'Status' },
                  { id: '', label: '' },
                ]}
              />
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {data.map((row, index) => (
                      <RequestTableRow
                        key={row.name}
                        index={page * rowsPerPage + index}
                        hideCheckbox
                        row={{
                          id: row.name,
                          name: row.name,
                          employee_id: row.employee_id,
                          employee_name: row.employee_name,
                          subject: row.subject,
                          workflow_state: row.workflow_state,
                          creation: row.creation,
                          modified: row.modified,
                          owner: row.owner,
                          hrQueryCount: [1, 2, 3, 4, 5].filter(i => {
                            const field = i === 1 ? 'hr_query' : `hr_query_${i}`;
                            return row[field] && String(row[field]).trim();
                          }).length,
                          empReplyCount: [1, 2, 3, 4, 5].filter(i => {
                            const field = i === 1 ? 'employee_reply' : `employee_reply_${i}`;
                            return row[field] && String(row[field]).trim();
                          }).length,
                        }}
                        selected={selected.includes(row.name)}
                        onSelectRow={() => handleSelectRow(row.name)}
                        onView={() => handleViewRow(row)}
                        onEdit={() => handleEditRow(row)}
                        onDelete={() => handleDeleteRow(row.name)}
                        canEdit={permissions.write && canEditRequest}
                        canDelete={permissions.delete && canDeleteRequest}
                        onApplyAction={(action) => handleApplyAction(row.name, action)}
                        onClarify={(clarificationMessage) => handleClarify(row.name, clarificationMessage)}
                        isHR={isHR}
                      />
                    ))}

                    {notFound && <TableNoData searchQuery={filterName} />}

                    {empty && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <EmptyContent
                            title="No Request Found"
                            description="You haven't submitted any requests yet."
                            icon="solar:document-text-bold-duotone"
                            sx={{ py: 16 }}
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
          onPageChange={handleChangePage}
          rowsPerPageOptions={[10, 25, 50]}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={openCreate} onClose={handleCloseCreate} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24, } }}>

        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center',  }}>
          {isEdit ? 'Edit Request' : 'New Request'}
          <IconButton onClick={handleCloseCreate}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Box sx={{ display: 'grid', gap: 3, margin: '1rem' }}>
            {isRestrictedEmployee && !isEdit ? (
              <TextField
                fullWidth
                label="Employee"
                value={`${user?.employee_name} (${user?.employee})`}
                InputLabelProps={{ shrink: true }}
                InputProps={{ readOnly: true }}
                required
                sx={{
                  '& .MuiFormLabel-asterisk': {
                    color: 'red',
                  },
                }}
              />
            ) : (
              <Autocomplete
                fullWidth
                options={employees}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') {
                    const emp = employees.find((e) => e.name === option);
                    return emp ? `${emp.employee_name} (${emp.name})` : option;
                  }
                  return `${option.employee_name} (${option.name})`;
                }}
                isOptionEqualToValue={(option, value) => {
                  const valId = typeof value === 'string' ? value : value?.name;
                  return option.name === valId;
                }}
                value={employees.find((emp) => emp.name === employeeId) || null}
                onChange={(event, newValue) => {
                  setEmployeeId(newValue?.name || '');
                  if (formErrors.employeeId) setFormErrors(prev => ({ ...prev, employeeId: '' }));
                }}
                readOnly={!isHR && !isEdit}
                disabled={!isHR && !isEdit}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props as any;
                  return (
                    <li key={key} {...optionProps}>
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {option.employee_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          ID: {option.name}
                        </Typography>
                      </Stack>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Employee"
                    required
                    error={!!formErrors.employeeId}
                    helperText={formErrors.employeeId}
                    InputLabelProps={{ shrink: true }}
                    placeholder="Search employee..."
                    sx={{
                      '& .MuiFormLabel-asterisk': {
                        color: 'red',
                      },
                    }}
                  />
                )}
              />
            )}
            {renderField('subject', 'Subject', 'text', [], { placeholder: 'Enter request subject' }, true)}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  '&::after': {
                    content: '" *"',
                    color: 'error.main',
                    ml: 0.5
                  }
                }}
              >
                Message
              </Typography>
              <RichTextEditor
                value={message}
                onChange={(val) => {
                  setMessage(val);
                  if (formErrors.message) setFormErrors((prev) => ({ ...prev, message: '' }));
                }}
                placeholder="Enter request details"
                error={!!formErrors.message}
                helperText={formErrors.message}
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 1.5 }}>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={submitting}
            sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
          >
            {submitting ? 'Submitting...' : (isEdit ? 'Update' : 'Submit')}
          </Button>
        </DialogActions>

      </Dialog>

      {/* View Dialog */}
      <RequestDetailsDialog
        open={openView}
        onClose={() => setOpenView(false)}
        request={viewRequest}
        onRefresh={refetch}
        socket={socket}
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
        content="Are you sure you want to delete this request?"
        action={
          <Button onClick={handleConfirmDelete} color="error" variant="contained" sx={{ borderRadius: 1.5, minWidth: 100 }}>
            Delete
          </Button>
        }
      />
      <RequestsTableFiltersDrawer
        open={openFilters}
        onOpen={() => setOpenFilters(true)}
        onClose={() => setOpenFilters(false)}
        filters={{
          status: filterStatus,
          employee: filterEmployee,
          startDate,
          endDate,
          unread_messages: filterUnreadMessages,
        }}
        onFilters={handleFilters}
        canReset={!!startDate || !!endDate || filterStatus !== 'all' || filterEmployee !== null || (isHR ? filterUnreadMessages : false)}
        onResetFilters={handleResetFilters}
        employees={employees}
        isHR={isHR}
      />
    </DashboardContent>
  );
}
