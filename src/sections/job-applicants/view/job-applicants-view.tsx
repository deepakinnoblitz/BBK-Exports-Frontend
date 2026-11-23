
import { MuiTelInput } from 'mui-tel-input';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useJobApplicants } from 'src/hooks/useJobApplicants';

import { getDoctypeList } from 'src/api/leads';
import { uploadFile } from 'src/api/data-import';
import { DashboardContent } from 'src/layouts/dashboard';
import {
  getJobApplicant,
  createJobApplicant,
  updateJobApplicant,
  deleteJobApplicant,
  getJobApplicantPermissions,
} from 'src/api/job-applicants';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';
import { AttachmentsUpload } from 'src/components/attachments-upload';

import { TableNoData } from 'src/sections/lead/table-no-data';
import { TableEmptyRows } from 'src/sections/lead/table-empty-rows';
import { JobApplicantTableRow } from 'src/sections/job-applicants/job-applicant-table-row';
import { LeadTableHead as JobApplicantTableHead } from 'src/sections/lead/lead-table-head';
import { LeadTableToolbar as JobApplicantTableToolbar } from 'src/sections/lead/lead-table-toolbar';
import { JobApplicantDetailsDialog } from 'src/sections/job-applicants/job-applicant-details-dialog';
import { JobApplicantsTableFiltersDrawer } from 'src/sections/job-applicants/job-applicants-table-filters-drawer';

import { useAuth } from 'src/auth/auth-context';
// ----------------------------------------------------------------------


export function JobApplicantsView() {
  const { user } = useAuth();
  const actionPerms = user?.permissions?.actions?.job_applicant_list;
  const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned && !!actionPerms;
  const canCreateApplicant = hasCustomPerms ? !!actionPerms?.create : true;
  const canEditApplicant = hasCustomPerms ? !!actionPerms?.edit : true;
  const canDeleteApplicant = hasCustomPerms ? !!actionPerms?.delete : true;

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterName, setFilterName] = useState('');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState('modified');
  const [selected, setSelected] = useState<string[]>([]);
  const [openFilters, setOpenFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    job_title: 'all',
    startDate: null as string | null,
    endDate: null as string | null,
  });

  const { data, total, loading, refetch } = useJobApplicants(
    page + 1,
    rowsPerPage,
    filterName,
    orderBy,
    order,
    filters
  );

  const [permissions, setPermissions] = useState({ read: false, write: false, delete: false });
  const [jobOpenings, setJobOpenings] = useState<any[]>([]);
  const [allJobTitlesMap, setAllJobTitlesMap] = useState<Record<string, string>>({});

  // Dialog states
  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [viewApplicant, setViewApplicant] = useState<any>(null);
  const [editApplicant, setEditApplicant] = useState<any>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Attachment state
  const [resumeAttachments, setResumeAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<any>({
    applicant_name: '',
    email_id: '',
    phone_number: '',
    job_title: '',
    status: 'Received',
    source: '',
    cover_letter: '',
    resume_attachment: '',
    resume_link: '',
    lower_range: '',
    upper_range: '',
    currency: 'INR',
  });

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    const fetchData = async () => {
      const perms = await getJobApplicantPermissions();
      setPermissions(perms);

      const allJobs = await getDoctypeList('Job Opening', ['name', 'job_title', 'status']);
      if (Array.isArray(allJobs)) {
        const titleMap: Record<string, string> = {};
        allJobs.forEach((j: any) => {
          titleMap[j.name] = j.job_title || j.name;
        });
        setAllJobTitlesMap(titleMap);

        const openJobs = allJobs.filter((j: any) => !j.status || j.status === 'Open');
        setJobOpenings(openJobs);
      }
    };
    fetchData();
  }, []);

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

  const handleOpenCreate = () => {
    setEditApplicant(null);
    setResumeAttachments([]);
    setErrors({
      applicant_name: '',
      email_id: '',
      resume_attachment: '',
      phone_number: '',
      job_title: '',
    });
    setFormData({
      applicant_name: '',
      email_id: '',
      phone_number: '',
      job_title: '',
      status: 'Received',
      source: '',
      cover_letter: '',
      resume_attachment: '',
      resume_link: '',
      lower_range: '',
      upper_range: '',
      currency: 'INR',
    });
    setOpenCreate(true);
  };

  const handleCloseCreate = () => {
    setOpenCreate(false);
    setEditApplicant(null);
    setResumeAttachments([]);
    setErrors({
      applicant_name: '',
      email_id: '',
      resume_attachment: '',
      phone_number: '',
      job_title: '',
    });
  };

  const handleEditRow = useCallback(async (row: any) => {
    try {
      const fullData = await getJobApplicant(row.name);
      setEditApplicant(fullData);
      setFormData({
        applicant_name: fullData.applicant_name,
        email_id: fullData.email_id,
        phone_number: fullData.phone_number,
        job_title: fullData.job_title,
        status: fullData.status,
        source: fullData.source,
        cover_letter: fullData.cover_letter,
        resume_attachment: fullData.resume_attachment,
        resume_link: fullData.resume_link,
        lower_range: fullData.lower_range,
        upper_range: fullData.upper_range,
        currency: fullData.currency || 'INR',
      });
      // Pre-populate attachment preview if one exists
      if (fullData.resume_attachment) {
        setResumeAttachments([{ name: fullData.resume_attachment.split('/').pop() || 'Attachment', url: fullData.resume_attachment }]);
      } else {
        setResumeAttachments([]);
      }
      setOpenCreate(true);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to load record',
        severity: 'error',
      });
    }
  }, []);

  const handleViewRow = useCallback(async (row: any) => {
    try {
      const fullData = await getJobApplicant(row.name);
      const displayJobTitle = allJobTitlesMap[fullData.job_title] ||
        jobOpenings.find((j: any) => j.name === fullData.job_title || j.job_title === fullData.job_title)?.job_title ||
        fullData.job_title;

      setViewApplicant({
        ...fullData,
        job_title: displayJobTitle,
      });
      setOpenView(true);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to load record',
        severity: 'error',
      });
    }
  }, []);

  const handleDeleteRow = useCallback((name: string) => {
    setDeleteTarget(name);
    setConfirmDelete(true);
  }, []);

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteJobApplicant(deleteTarget);
      setSnackbar({ open: true, message: 'Deleted successfully', severity: 'success' });
      refetch();
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Delete failed', severity: 'error' });
    } finally {
      setConfirmDelete(false);
      setDeleteTarget(null);
    }
  };

  const handleBulkDelete = () => {
    setConfirmBulkDelete(true);
  };

  const onConfirmBulkDelete = async () => {
    try {
      await Promise.all(selected.map((name) => deleteJobApplicant(name)));
      setSnackbar({ open: true, message: 'Deleted successfully', severity: 'success' });
      setSelected([]);
      refetch();
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Bulk delete failed',
        severity: 'error',
      });
    } finally {
      setConfirmBulkDelete(false);
    }
  };

  const handleResumeFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setResumeAttachments([file]);
    if (errors.resume_attachment) {
      setErrors({ ...errors, resume_attachment: '' });
    }
  };

  const handleRemoveResumeAttachment = (index: number) => {
    setResumeAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {

    if (!validateForm()) {
        return;
    }

    try {
      // Upload file if a new local File was selected
      let attachmentUrl = formData.resume_attachment || '';
      if (resumeAttachments.length > 0 && resumeAttachments[0] instanceof File) {
        setUploading(true);
        try {
          const uploaded = await uploadFile(resumeAttachments[0]);
          attachmentUrl = uploaded.file_url;
        } catch (uploadError: any) {
          throw new Error(`File upload failed: ${uploadError.message}`);
        } finally {
          setUploading(false);
        }
      } else if (resumeAttachments.length > 0 && resumeAttachments[0].url) {
        attachmentUrl = resumeAttachments[0].url;
      }

      const payload = { ...formData, resume_attachment: attachmentUrl };

      if (editApplicant) {
        await updateJobApplicant(editApplicant.name, payload);
        setSnackbar({ open: true, message: 'Updated successfully', severity: 'success' });
      } else {
        await createJobApplicant(payload);
        setSnackbar({ open: true, message: 'Created successfully', severity: 'success' });
      }
      handleCloseCreate();
      refetch();
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Action failed', severity: 'error' });
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilters = (newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(0);
  };

  const handleResetFilters = () => {
    setFilters({
      status: 'all',
      job_title: 'all',
      startDate: null,
      endDate: null,
    });
    setPage(0);
  };

  const canReset =
    filters.status !== 'all' ||
    filters.job_title !== 'all' ||
    filters.startDate !== null ||
    filters.endDate !== null ||
    !!filterName;

  const handleSortChange = (value: string) => {
    if (value === 'date_desc') {
      setOrderBy('modified');
      setOrder('desc');
    } else if (value === 'date_asc') {
      setOrderBy('modified');
      setOrder('asc');
    } else if (value === 'name_asc') {
      setOrderBy('applicant_name');
      setOrder('asc');
    } else if (value === 'name_desc') {
      setOrderBy('applicant_name');
      setOrder('desc');
    }
    setPage(0);
  };

  const getCurrentSortValue = () => {
    if (orderBy === 'modified') return order === 'desc' ? 'date_desc' : 'date_asc';
    if (orderBy === 'applicant_name') return order === 'desc' ? 'name_desc' : 'name_asc';
    return 'date_desc';
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

  const [errors, setErrors] = useState({
    applicant_name: '',
    email_id: '',
    resume_attachment: '',
    phone_number: '',
    job_title: '',
  });

  const validateForm = () => {
    const newErrors = {
      applicant_name: '',
      email_id: '',
      resume_attachment: '',
      phone_number: '',
      job_title: '',
    };

    let valid = true;

    if (!formData.applicant_name?.trim()) {
      newErrors.applicant_name = 'Applicant Name is required';
      valid = false;
    }

    if (!formData.email_id?.trim()) {
      newErrors.email_id = 'Email ID is required';
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_id.trim())) {
      newErrors.email_id = 'Please enter a valid email address';
      valid = false;
    }

    const cleanDigits = (formData.phone_number || '').replace(/\D/g, '');
    if (!formData.phone_number?.trim() || cleanDigits.length <= 2) {
      newErrors.phone_number = 'Phone Number is required';
      valid = false;
    } else if (cleanDigits.length < 10 || cleanDigits.length > 15) {
      newErrors.phone_number = 'Please enter a valid phone number';
      valid = false;
    }

    if (!formData.job_title?.trim()) {
      newErrors.job_title = 'Job Opening is required';
      valid = false;
    }

    if (resumeAttachments.length === 0) {
      newErrors.resume_attachment = 'Resume Attachment is required';
      valid = false;
    }

    setErrors(newErrors);

    return valid;
  };

  return (
    <DashboardContent maxWidth={false}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 5, mt: 3 }}>
        <Typography variant="h4">Job Applicants</Typography>
        {permissions.write && canCreateApplicant && (
          <Button
            variant="contained"
            sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={handleOpenCreate}
          >
            New Applicant
          </Button>
        )}
      </Box>

      <Card>
        <JobApplicantTableToolbar
          numSelected={selected.length}
          filterName={filterName}
          onFilterName={handleFilterByName}
          searchPlaceholder="Search applicants..."
          onDelete={selected.length > 0 ? handleBulkDelete : undefined}
          onOpenFilter={() => setOpenFilters(true)}
          canReset={canReset}
          sortBy={getCurrentSortValue()}
          onSortChange={handleSortChange}
          sortOptions={[
            { value: 'date_desc', label: 'Newest First' },
            { value: 'date_asc', label: 'Oldest First' },
            { value: 'name_asc', label: 'Applicant Name: A to Z' },
            { value: 'name_desc', label: 'Applicant Name: Z to A' },
          ]}
        />

        <Scrollbar>
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 800 }}>
              <JobApplicantTableHead
                order={order}
                orderBy={orderBy}
                rowCount={data.length}
                numSelected={selected.length}
                onSelectAllRows={(checked: boolean) => handleSelectAllRows(checked)}
                hideCheckbox
                showIndex
                headLabel={[
                  { id: 'applicant_name', label: 'Applicant Name' },
                  { id: 'email_id', label: 'Email' },
                  { id: 'phone_number', label: 'Phone' },
                  { id: 'job_title', label: 'Job Title' },
                  { id: 'status', label: 'Status' },
                  { id: '', label: '' },
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
                    {data.map((row, index) => {
                      const displayJobTitle = allJobTitlesMap[row.job_title] ||
                        jobOpenings.find((j: any) => j.name === row.job_title || j.job_title === row.job_title)?.job_title ||
                        row.job_title;

                      return (
                        <JobApplicantTableRow
                          key={row.name}
                          index={page * rowsPerPage + index}
                          row={{
                            id: row.name,
                            applicant_name: row.applicant_name,
                            email_id: row.email_id,
                            phone_number: row.phone_number,
                            job_title: displayJobTitle,
                            status: row.status,
                            modified: row.modified
                          }}
                          selected={selected.includes(row.name)}
                          onSelectRow={() => handleSelectRow(row.name)}
                          hideCheckbox
                          onView={() => handleViewRow(row)}
                          onEdit={() => handleEditRow(row)}
                          onDelete={() => handleDeleteRow(row.name)}
                          canEdit={permissions.write && canEditApplicant}
                          canDelete={permissions.delete && canDeleteApplicant}
                        />
                      );
                    })}

                    {notFound && <TableNoData searchQuery={filterName} />}

                    {empty && (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <EmptyContent
                            title="No applicants found"
                            description="There are no candidates for your job openings yet."
                            icon="solar:users-group-rounded-bold-duotone"
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
        maxWidth="md"
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
        <DialogTitle
          sx={{
            m: 0,
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
            {editApplicant ? 'Edit Applicant' : 'New Applicant'}
          </Typography>

          <IconButton
            onClick={handleCloseCreate}
            sx={{ color: (theme) => theme.palette.grey[500] }}
          >
            <Iconify icon="mingcute:close-line" width={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Box
              sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, pt: 1 }}
            >
              <TextField
                fullWidth
                label="Applicant Name"
                value={formData.applicant_name}
                onChange={(e) => {
                    setFormData({
                        ...formData,
                        applicant_name: e.target.value,
                    });

                    if (errors.applicant_name) {
                        setErrors({
                            ...errors,
                            applicant_name: '',
                        });
                    }
                }}
                error={!!errors.applicant_name}
                helperText={errors.applicant_name}
                required
              />
              <TextField
                fullWidth
                label="Email ID"
                value={formData.email_id}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({
                    ...formData,
                    email_id: val,
                  });

                  if (errors.email_id) {
                    if (!val.trim()) {
                      setErrors((prev) => ({ ...prev, email_id: 'Email ID is required' }));
                    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
                      setErrors((prev) => ({ ...prev, email_id: 'Please enter a valid email address' }));
                    } else {
                      setErrors((prev) => ({ ...prev, email_id: '' }));
                    }
                  }
                }}
                onBlur={() => {
                  if (!formData.email_id?.trim()) {
                    setErrors((prev) => ({ ...prev, email_id: 'Email ID is required' }));
                  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_id.trim())) {
                    setErrors((prev) => ({ ...prev, email_id: 'Please enter a valid email address' }));
                  } else {
                    setErrors((prev) => ({ ...prev, email_id: '' }));
                  }
                }}
                error={!!errors.email_id}
                helperText={errors.email_id}
                required
              />
              <MuiTelInput
                fullWidth
                label="Phone Number *"
                required
                defaultCountry="IN"
                value={formData.phone_number || ''}
                onChange={(newValue) => {
                  setFormData({ ...formData, phone_number: newValue });
                  if (errors.phone_number) {
                    const cleanDigits = (newValue || '').replace(/\D/g, '');
                    if (cleanDigits.length >= 10 && cleanDigits.length <= 15) {
                      setErrors((prev: any) => ({ ...prev, phone_number: '' }));
                    }
                  }
                }}
                onBlur={() => {
                  const cleanDigits = (formData.phone_number || '').replace(/\D/g, '');
                  if (!formData.phone_number?.trim() || cleanDigits.length <= 2) {
                    setErrors((prev: any) => ({ ...prev, phone_number: 'Phone Number is required' }));
                  } else if (cleanDigits.length < 10 || cleanDigits.length > 15) {
                    setErrors((prev: any) => ({ ...prev, phone_number: 'Please enter a valid phone number' }));
                  } else {
                    setErrors((prev: any) => ({ ...prev, phone_number: '' }));
                  }
                }}
                error={!!errors.phone_number}
                helperText={errors.phone_number}
              />
              <Autocomplete
                fullWidth
                options={jobOpenings}
                getOptionLabel={(option: any) => {
                  if (typeof option === 'string') return option;
                  return option?.job_title || option?.name || '';
                }}
                value={
                  jobOpenings.find(
                    (job: any) => job.name === formData.job_title || job.job_title === formData.job_title
                  ) || (formData.job_title ? { name: formData.job_title, job_title: formData.job_title } : null)
                }
                onChange={(_event, newValue: any) => {
                  setFormData({
                    ...formData,
                    job_title: newValue ? newValue.name : '',
                  });
                  if (errors.job_title) {
                    setErrors((prev: any) => ({ ...prev, job_title: '' }));
                  }
                }}
                isOptionEqualToValue={(option: any, value: any) =>
                  option?.name === value?.name || option?.name === value
                }
                noOptionsText="No Openings"
                openOnFocus
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Job Opening"
                    required
                    error={!!errors.job_title}
                    helperText={errors.job_title}
                    placeholder={jobOpenings.length === 0 ? 'No Openings' : 'Select Job Opening'}
                  />
                )}
              />

              <TextField
                select
                fullWidth
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="Received">Received</MenuItem>
                <MenuItem value="Open">Open</MenuItem>
                <MenuItem value="Replied">Replied</MenuItem>
                <MenuItem value="Hold">Hold</MenuItem>
                <MenuItem value="Accepted">Accepted</MenuItem>
                <MenuItem value="Rejected">Rejected</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Source"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                placeholder="LinkedIn, Referral, etc."
              />

              <TextField
                fullWidth
                label="Resume Link"
                value={formData.resume_link}
                onChange={(e) => setFormData({ ...formData, resume_link: e.target.value })}
                placeholder="Google Drive, Dropbox, etc."
              />

              <Box sx={{ gridColumn: 'span 2' }}>
                <AttachmentsUpload
                  attachments={resumeAttachments}
                  uploading={uploading}
                  onFileChange={handleResumeFileUpload}
                  onRemove={handleRemoveResumeAttachment}
                  error={!!errors.resume_attachment}
                  helperText={errors.resume_attachment}
                />
              </Box>

              <TextField
                fullWidth
                label="Expected Salary (Lower)"
                type="number"
                value={formData.lower_range}
                onChange={(e) => setFormData({ ...formData, lower_range: e.target.value })}
              />

              <TextField
                fullWidth
                label="Expected Salary (Upper)"
                type="number"
                value={formData.upper_range}
                onChange={(e) => setFormData({ ...formData, upper_range: e.target.value })}
              />

              <TextField
                fullWidth
                multiline
                rows={4}
                label="Cover Letter"
                value={formData.cover_letter}
                onChange={(e) => setFormData({ ...formData, cover_letter: e.target.value })}
                sx={{ gridColumn: 'span 2' }}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 1.5 }}>
          <Button variant="contained" onClick={handleSubmit}>
            {editApplicant ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <JobApplicantDetailsDialog
        open={openView}
        onClose={() => setOpenView(false)}
        applicant={viewApplicant}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete Applicant"
        content="Are you sure you want to delete this applicant?"
        action={
          <Button variant="contained" color="error" onClick={onConfirmDelete}>
            Delete
          </Button>
        }
      />

      {/* Confirm Bulk Delete Dialog */}
      <ConfirmDialog
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        title="Delete Applicants"
        content={`Are you sure you want to delete ${selected.length} selected applicants?`}
        action={
          <Button variant="contained" color="error" onClick={onConfirmBulkDelete}>
            Delete
          </Button>
        }
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

      {/* Filters Drawer */}
      <JobApplicantsTableFiltersDrawer
        open={openFilters}
        onOpen={() => setOpenFilters(true)}
        onClose={() => setOpenFilters(false)}
        filters={filters}
        onFilters={handleFilters}
        canReset={canReset}
        onResetFilters={handleResetFilters}
        jobOpenings={jobOpenings}
      />
    </DashboardContent>
  );
}