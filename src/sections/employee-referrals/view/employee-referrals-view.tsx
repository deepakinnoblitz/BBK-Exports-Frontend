import { CgWorkAlt } from "react-icons/cg";
import { useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { MdOutlineRoomPreferences } from "react-icons/md";

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { COMMON_COLORS } from 'src/theme';
import { fetchFrappeList } from 'src/api/hr-management';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchOpenJobs, fetchMyReferrals, createJobApplicant } from 'src/api/referrals';

import { Label } from 'src/components/label';
import { Scrollbar } from 'src/components/scrollbar';
import { TableEmptyRows } from 'src/components/table';
import { EmptyContent } from 'src/components/empty-content';

import { useAuth } from 'src/auth/auth-context';

import { ReferralModal } from '../referral-modal';
import { ReferralTableToolbar } from '../referral-table-toolbar';
import { ReferralTableFiltersDrawer } from '../referral-table-filters-drawer';
import { JobOpeningDetailsDialog } from '../../report/job-openings/job-opening-details-dialog';

// ----------------------------------------------------------------------

const TABS = [
  { value: 'jobs', label: 'Job Openings', icon: <CgWorkAlt size={22} /> },
  { value: 'my-referrals', label: 'My Referrals', icon: <MdOutlineRoomPreferences size={22} /> },
];

export function EmployeeReferralsView() {
  const { user } = useAuth();
  const actionPerms =
    user?.permissions?.actions?.refer_a_friend ||
    user?.permissions?.actions?.employee_referrals ||
    user?.permissions?.actions?.employee_referral_list;
  const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned && !!actionPerms;
  const canCreateReferral = hasCustomPerms ? !!actionPerms?.create : true;
  const canEditReferral = hasCustomPerms ? !!actionPerms?.edit : true;
  const canDeleteReferral = hasCustomPerms ? !!actionPerms?.delete : true;

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const viewType = searchParams.get('view'); // 'hr' or default (employee)

  const [currentTab, setCurrentTab] = useState('jobs');
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);

  const [openModal, setOpenModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<string | undefined>(undefined);
  const [openJobDetails, setOpenJobDetails] = useState(false);
  const [selectedJobData, setSelectedJobData] = useState<any>(null);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [filterName, setFilterName] = useState('');
  const [openFilters, setOpenFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    job_opening: 'all',
    location: 'all',
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('date_desc');

  const handleCloseSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const activeFilters = { ...filters };

      if (currentTab === 'jobs') {
        const orderMapper = sortBy === 'date_desc' ? 'posted_on desc' : 'posted_on asc';
        const data = await fetchOpenJobs(filterName, activeFilters, page, rowsPerPage, orderMapper);
        setJobs(data);
        // Note: For real pagination, we'd need a total count from the API. 
        // For now, we'll assume the length is representative.
        setTotal(data.length + (page * rowsPerPage));
      } else if (currentTab === 'my-referrals') {
        if (viewType === 'hr') {
          const response = await fetchFrappeList('Employee Referral', {
            page: page + 1,
            page_size: rowsPerPage,
            search: filterName,
            searchField: 'candidate_name',
            filters: [
              ...(filters.status !== 'all' ? [['status', '=', filters.status]] : []),
              ...(filters.job_opening !== 'all' ? [['job_opening', '=', filters.job_opening]] : [])
            ],
            fields: ['name', 'candidate_name', 'candidate_email', 'job_opening', 'status', 'referrer', 'creation', 'job_applicant', 'referrer.employee_name'],
            orderBy: '`tabEmployee Referral`.modified',
            order: sortBy === 'date_desc' ? 'desc' : 'asc'
          });
          setReferrals(response.data);
          setTotal(response.total);
        } else {
          const orderMapper = sortBy === 'date_desc' ? 'modified desc' : 'modified asc';
          const data = await fetchMyReferrals(filterName, activeFilters, page, rowsPerPage, orderMapper);
          setReferrals(data);
          setTotal(data.length + (page * rowsPerPage));
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [currentTab, viewType, filters, filterName, page, rowsPerPage, sortBy]);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      loadData();
    }, 500);
    return () => clearTimeout(timeout);
  }, [loadData]);

  // Special fetch for job options (to populate filters when in other tabs)
  useEffect(() => {
    fetchOpenJobs().then(setJobs).catch(console.error);
  }, []);

  const handleChangeTab = useCallback((event: React.SyntheticEvent, newValue: string) => {
    setCurrentTab(newValue);
    setFilterName('');
    setPage(0);
    setReferrals([]);
    setJobs([]);
    setLoading(true);
    handleResetFilters();
  }, []);

  const handleFilterName = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterName(event.target.value);
    setPage(0);
  };

  const handleFilters = (update: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...update }));
  };

  const handleResetFilters = () => {
    setFilters({
      status: 'all',
      job_opening: 'all',
      location: 'all',
    });
    setPage(0);
  };

  const handleChangePage = (event: unknown, 控制Page: number) => {
    setPage(控制Page);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setPage(0);
  };

  const canReset = filters.status !== 'all' || filters.job_opening !== 'all' || filters.location !== 'all' || !!filterName;
  const activeFiltersCount = (filters.status !== 'all' ? 1 : 0) +
    (filters.job_opening !== 'all' ? 1 : 0) +
    (filters.location !== 'all' ? 1 : 0);

  const handleReferClick = (jobName: string) => {
    if (!canCreateReferral) return;
    setSelectedJob(jobName);
    setOpenModal(true);
  };

  const handleViewJob = (job: any) => {
    setSelectedJobData(job);
    setOpenJobDetails(true);
  };

  const handleCreateApplicant = async (name: string) => {
    try {
      await createJobApplicant(name);
      setSnackbar({ open: true, message: 'Job Applicant created successfully!', severity: 'success' });
      loadData();
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to create applicant', severity: 'error' });
    }
  };

  const emptyJobs = !jobs.length && !filterName && !loading;
  const notFoundJobs = !jobs.length && !!filterName && !loading;
  const emptyReferrals = !referrals.length && !filterName && !loading;
  const notFoundReferrals = !referrals.length && !!filterName && !loading;

  return (
    <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={{ xs: 3, md: 1 }}>
        <Typography variant="h4">{viewType === 'hr' ? 'Referral Management' : 'Employee Referrals'}</Typography>
      </Stack>

      <Tabs
        value={currentTab}
        onChange={handleChangeTab}
        sx={{
          mb: { xs: 2, md: 4 },
          '& .MuiTabs-indicator': { backgroundColor: COMMON_COLORS.emerald.main },
          '& .MuiTab-root.Mui-selected': { color: COMMON_COLORS.emerald.main },
        }}
      >
        {TABS.map((tab) => (
          <Tab 
            key={tab.value} 
            label={tab.value === 'my-referrals' && viewType === 'hr' ? 'Employee Referrals' : tab.label} 
            icon={tab.icon} 
            value={tab.value} 
            iconPosition="start" 
          />
        ))}
      </Tabs>

      <Card>
        <ReferralTableToolbar
          filterName={filterName}
          onFilterName={handleFilterName}
          onOpenFilter={(e) => setOpenFilters(true)}
          numSelected={0}
          activeFiltersCount={activeFiltersCount}
          placeholder={currentTab === 'jobs' ? "Search jobs..." : "Search candidates..."}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          sortOptions={[
            { value: 'date_desc', label: 'Newest First' },
            { value: 'date_asc', label: 'Oldest First' },
          ]}
          canReset={canReset}
        />

        <Scrollbar>
          <TableContainer sx={{ minWidth: 800, position: 'relative' }}>
            <Table>
              <TableBody>
                {currentTab === 'jobs' ? (
                  <>
                    <TableRow sx={{ bgcolor: 'background.neutral' }}>
                      <TableCell align="center" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>S.No</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Job Title</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Designation</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Location</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Posted On</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Action</TableCell>
                    </TableRow>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                          <CircularProgress />
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {jobs.map((row, index) => (
                          <TableRow
                            key={row.name}
                            sx={{
                              '& td, & th': { borderBottom: (theme) => `1px solid ${theme.palette.divider}` },
                              '&:last-child td, &:last-child th': { borderBottom: 0 },
                            }}
                          >
                            <TableCell align="center">
                              <Box
                                sx={{
                                  width: 28,
                                  height: 28,
                                  display: 'flex',
                                  borderRadius: '50%',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  bgcolor: COMMON_COLORS.snoBadge.bg,
                                  color: COMMON_COLORS.snoBadge.color,
                                  typography: 'subtitle2',
                                  fontWeight: 800,
                                  border: COMMON_COLORS.snoBadge.border,
                                  mx: 'auto',
                                  '&:hover': {
                                    bgcolor: COMMON_COLORS.snoBadge.hoverBg,
                                    color: COMMON_COLORS.snoBadge.hoverColor,
                                  },
                                }}
                              >
                                {index + 1}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="subtitle2">{row.job_title}</Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{row.name}</Typography>
                            </TableCell>
                            <TableCell>{row.designation}</TableCell>
                            <TableCell>{row.location}</TableCell>
                            <TableCell>{new Date(row.posted_on).toLocaleDateString()}</TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => handleViewJob(row)}
                                  sx={{
                                    color: COMMON_COLORS.emerald.main,
                                    borderColor: alpha(COMMON_COLORS.emerald.main, 0.5),
                                    '&:hover': {
                                      borderColor: COMMON_COLORS.emerald.main,
                                      bgcolor: alpha(COMMON_COLORS.emerald.main, 0.08),
                                    },
                                  }}
                                >
                                  View
                                </Button>
                                {canCreateReferral && (
                                  <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => handleReferClick(row.name)}
                                    sx={{
                                      bgcolor: COMMON_COLORS.primaryButton.bg,
                                      color: COMMON_COLORS.primaryButton.color,
                                      '&:hover': {
                                        bgcolor: COMMON_COLORS.primaryButton.hoverBg,
                                      },
                                    }}
                                  >
                                    Refer
                                  </Button>
                                )}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                        {!emptyJobs && !notFoundJobs && (
                          <TableEmptyRows height={68} emptyRows={jobs.length < 5 ? 5 - jobs.length : 0} />
                        )}
                        {emptyJobs && (
                          <TableRow>
                            <TableCell colSpan={6}>
                              <EmptyContent
                                title="No Job Openings"
                                description="There are currently no active job openings."
                                icon="solar:case-minimalistic-bold-duotone"
                                sx={{ py: 10 }}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                        {notFoundJobs && (
                          <TableRow>
                            <TableCell colSpan={6}>
                              <EmptyContent
                                title="No matches found"
                                description={`No results found for "${filterName}"`}
                                icon="solar:case-minimalistic-bold-duotone"
                                sx={{ py: 10 }}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <TableRow sx={{ bgcolor: 'background.neutral' }}>
                      <TableCell align="center" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>S.No</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Candidate</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Job Opening</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Status</TableCell>
                      {viewType === 'hr' && <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Referrer</TableCell>}
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Date</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Action</TableCell>
                    </TableRow>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={viewType === 'hr' ? 7 : 6} align="center" sx={{ py: 10 }}>
                          <CircularProgress />
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {referrals.map((row, index) => (
                          <TableRow
                            key={row.name}
                            sx={{
                              '& td, & th': { borderBottom: (theme) => `1px solid ${theme.palette.divider}` },
                              '&:last-child td, &:last-child th': { borderBottom: 0 },
                            }}
                          >
                            <TableCell align="center">
                              <Box
                                sx={{
                                  width: 28,
                                  height: 28,
                                  display: 'flex',
                                  borderRadius: '50%',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  bgcolor: COMMON_COLORS.snoBadge.bg,
                                  color: COMMON_COLORS.snoBadge.color,
                                  typography: 'subtitle2',
                                  fontWeight: 800,
                                  border: COMMON_COLORS.snoBadge.border,
                                  mx: 'auto',
                                  '&:hover': {
                                    bgcolor: COMMON_COLORS.snoBadge.hoverBg,
                                    color: COMMON_COLORS.snoBadge.hoverColor,
                                  },
                                }}
                              >
                                {index + 1}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="subtitle2">{row.candidate_name}</Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{row.candidate_email}</Typography>
                            </TableCell>
                            <TableCell>{row.job_opening}</TableCell>
                            <TableCell>
                              <Label 
                                variant="soft" 
                                color={row.status === 'Accepted' || row.status === 'Hired' ? 'success' : row.status === 'Rejected' ? 'error' : 'warning'}
                              >
                                {row.status}
                              </Label>
                            </TableCell>
                            {viewType === 'hr' && (
                              <TableCell>
                                <Typography variant="subtitle2">{row.employee_name || 'Employee'}</Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{row.referrer}</Typography>
                              </TableCell>
                            )}
                            <TableCell>{new Date(row.creation).toLocaleDateString()}</TableCell>
                            <TableCell align="right">
                              {viewType === 'hr' && row.status === 'Pending' && (
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={() => handleCreateApplicant(row.name)}
                                  sx={{
                                    bgcolor: COMMON_COLORS.primaryButton.bg,
                                    color: COMMON_COLORS.primaryButton.color,
                                    '&:hover': {
                                      bgcolor: COMMON_COLORS.primaryButton.hoverBg,
                                    },
                                  }}
                                >
                                  Create Job Applicant
                                </Button>
                              )}
                              {row.job_applicant && (
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  Applicant: {row.job_applicant}
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {!emptyReferrals && !notFoundReferrals && (
                          <TableEmptyRows height={68} emptyRows={referrals.length < 5 ? 5 - referrals.length : 0} />
                        )}
                        {emptyReferrals && (
                          <TableRow>
                            <TableCell colSpan={viewType === 'hr' ? 7 : 6}>
                              <EmptyContent
                                title="No Referrals Found"
                                description={viewType === 'hr' ? "No referrals found in the system." : "You haven't submitted any referrals yet."}
                                icon="solar:user-id-bold-duotone"
                                sx={{ py: 10 }}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                        {notFoundReferrals && (
                          <TableRow>
                            <TableCell colSpan={viewType === 'hr' ? 7 : 6}>
                              <EmptyContent
                                title="No matches found"
                                description={`No results found for "${filterName}"`}
                                icon="solar:user-id-bold-duotone"
                                sx={{ py: 10 }}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </>
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
          rowsPerPageOptions={[5, 10, 25]}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ borderTop: 'none' }}
        />
      </Card>

      <ReferralModal
        open={openModal && canCreateReferral}
        onClose={() => setOpenModal(false)}
        onSuccess={(msg) => {
          setSnackbar({ open: true, message: msg, severity: 'success' });
          loadData();
        }}
        onError={(msg) => setSnackbar({ open: true, message: msg, severity: 'error' })}
        selectedJob={selectedJob}
        jobOptions={jobs}
      />

      <JobOpeningDetailsDialog
        open={openJobDetails}
        onClose={() => setOpenJobDetails(false)}
        onRefer={canCreateReferral ? handleReferClick : undefined}
        job={selectedJobData}
      />

      <ReferralTableFiltersDrawer
        open={openFilters}
        onOpen={() => setOpenFilters(true)}
        onClose={() => setOpenFilters(false)}
        filters={filters}
        onFilters={handleFilters}
        canReset={canReset}
        onResetFilters={handleResetFilters}
        currentTab={currentTab}
        jobOptions={jobs.map(j => ({ name: j.name, job_title: j.job_title }))}
        locationOptions={[...new Set(jobs.map(j => j.location))]}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}
