import { TbSettings } from "react-icons/tb";
import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import Snackbar from '@mui/material/Snackbar';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useEmployeeMonthlyAwards } from 'src/hooks/useEmployeeMonthlyAward';

import { DashboardContent } from 'src/layouts/dashboard';
import { generateMonthlyAwards, deleteEmployeeMonthlyAward,updateEmployeeMonthlyAward } from 'src/api/employee-monthly-award';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';
import { TableNoData, TableEmptyRows } from 'src/components/table';

import { EmployeeEvaluationTableHead as TableHeadCustom } from 'src/sections/employee-evaluation/employee-evaluation-table-head';

import { EmployeeAwardSettingsForm } from '../employee-award-settings-form';
import { EmployeeMonthlyAwardTableRow } from '../employee-monthly-award-table-row';
import { EmployeeMonthlyAwardDetailsDialog } from '../employee-monthly-award-details-dialog';
import { EmployeeMonthlyAwardTableToolbar as TableToolbar } from '../employee-monthly-award-table-toolbar';

// ----------------------------------------------------------------------

const TABS = [
  { value: 'awards', label: 'Employee Monthly Award', icon: <Iconify icon="solar:cup-star-bold-duotone" width={20} /> },
  { value: 'settings', label: 'Employee Award Settings', icon: <TbSettings size={22}/> },
];

const defaultFilters = {
    month: null,
    employee: null,
    rank: '',
    type: 'all',
    status: 'all',
};

import { useAuth } from 'src/auth/auth-context';

export function EmployeeMonthlyAwardView() {
  const { user } = useAuth();
  const actionPerms = user?.permissions?.actions?.employee_monthly_award;
  const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned && !!actionPerms;
  const canCreateAward = hasCustomPerms ? !!actionPerms?.create : true;
  const canEditAward = hasCustomPerms ? !!actionPerms?.edit : true;
  const canDeleteAward = hasCustomPerms ? !!actionPerms?.delete : true;

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'success' });
  const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));
  
  const [currentTab, setCurrentTab] = useState('awards');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterName, setFilterName] = useState('');
  const [sortBy, setSortBy] = useState('modified_desc');

  const [filters, setFilters] = useState(defaultFilters);

  const [generating, setGenerating] = useState(false);
  
  const [openDetails, setOpenDetails] = useState({ open: false, mode: 'view' as 'view' | 'edit' });
  const [selectedAward, setSelectedAward] = useState<any>(null);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);

  const { data: awards, total, loading, refetch } = useEmployeeMonthlyAwards(
    page + 1,
    rowsPerPage,
    filterName,
    sortBy,
    filters
  );

  const handleChangeTab = useCallback((event: React.SyntheticEvent, newValue: string) => {
    setCurrentTab(newValue);
    setPage(0);
  }, []);

  const handleFilters = useCallback((update: any) => {
    setFilters((prev) => ({ ...prev, ...update }));
    setPage(0);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setPage(0);
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
        const res = await generateMonthlyAwards();
        if (res === "Already Generated") {
            setSnackbar({ open: true, message: "Awards for this month have already been generated.", severity: 'info' });
        } else {
            setSnackbar({ open: true, message: `Successfully generated ${res} awards!`, severity: 'success' });
            refetch();
        }
    } catch (error: any) {
        setSnackbar({ open: true, message: error.message || "Failed to generate awards", severity: 'error' });
    } finally {
        setGenerating(false);
    }
  };

  const handleUpdateAward = async (data: any) => {
    try {
        await updateEmployeeMonthlyAward(data.name, data);
        setSnackbar({ open: true, message: "Award updated successfully!", severity: 'success' });
        refetch();
    } catch (error: any) {
        setSnackbar({ open: true, message: error.message || "Failed to update award", severity: 'error' });
    }
  };

  const handleDeleteAward = async () => {
    if (!selectedAward) return;
    try {
        await deleteEmployeeMonthlyAward(selectedAward.name);
        setSnackbar({ open: true, message: "Award deleted successfully!", severity: 'success' });
        refetch();
        setOpenDeleteConfirm(false);
    } catch (error: any) {
        setSnackbar({ open: true, message: error.message || "Failed to delete award", severity: 'error' });
    }
  };

  const emptyRows = awards.length < 5 ? 5 - awards.length : 0;
  const notFound = !awards.length && !!filterName && !loading;
  const emptyAwards = !awards.length && !filterName && !loading;

  const renderTabs = (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, borderBottom: (t) => `1px solid ${t.palette.divider}` }}>
      <Tabs
        value={currentTab}
        onChange={handleChangeTab}
        sx={{
          '& .MuiTabs-indicator': { backgroundColor: '#00A5D1' },
          '& .MuiTab-root.Mui-selected': { color: '#00A5D1' },
        }}
      >
        {TABS.map((tab) => (
          <Tab key={tab.value} label={tab.label} icon={tab.icon} value={tab.value} iconPosition="start" />
        ))}
      </Tabs>

      {currentTab === 'awards' && canCreateAward && (
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<Iconify icon={"solar:magic-stick-3-bold" as any} />}
            sx={{ bgcolor: '#00A5D1', '&:hover': { bgcolor: '#0084a7' } }}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Generate New Awards'}
          </Button>
        </Stack>
      )}
    </Stack>
  );

  return (
    <DashboardContent maxWidth={false} sx={{mt: 2}}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4">Employee Monthly Award</Typography>
      </Stack>

      <Card>
        {renderTabs}

        {currentTab === 'awards' && (
          <>
            <TableToolbar
              filterName={filterName}
              onFilterName={(event) => { setFilterName(event.target.value); setPage(0); }}
              sortBy={sortBy}
              onSortChange={(value) => { setSortBy(value); setPage(0); }}
              sortOptions={[
                { value: 'modified_desc', label: 'Newest First' },
                { value: 'modified_asc', label: 'Oldest First' },
                { value: 'total_score_desc', label: 'Score: High - Low' },
                { value: 'total_score_asc', label: 'Score: Low - High' },
                { value: 'rank_asc', label: 'Rank: 1 - N' },
              ]}
              filters={filters}
              onFilters={handleFilters}
              canReset={!!filterName || filters.month !== null || filters.employee !== null || filters.rank !== '' || filters.type !== 'all' || filters.status !== 'all'}
              onResetFilters={() => { setFilterName(''); handleResetFilters(); }}
            />

            <Scrollbar>
              <TableContainer sx={{ minWidth: 800, position: 'relative' }}>
                <Table>
                  <TableHeadCustom
                    headLabel={[
                      { id: 'sno', label: 'Sno', align: 'center' },
                      { id: 'employee', label: 'Employee' },
                      { id: 'month', label: 'Month' },
                      { id: 'total_score', label: 'Total Score', align: 'center' },
                      { id: 'rank', label: 'Rank', align: 'center' },
                      { id: 'type', label: 'Type', align: 'center' },
                      { id: 'status', label: 'Status', align: 'center' },
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
                        {awards.map((row, index) => (
                          <EmployeeMonthlyAwardTableRow
                            key={row.name}
                            row={row}
                            index={page * rowsPerPage + index}
                            onView={() => {
                                setSelectedAward(row);
                                setOpenDetails({ open: true, mode: 'view' });
                            }}
                            onEdit={() => {
                                setSelectedAward(row);
                                setOpenDetails({ open: true, mode: 'edit' });
                            }}
                            onDelete={() => {
                                setSelectedAward(row);
                                setOpenDeleteConfirm(true);
                            }}
                          />
                        ))}

                        {emptyAwards && (
                          <TableRow>
                            <TableCell colSpan={8}>
                              <EmptyContent
                                title="No Awards Found"
                                description="Click Generate to calculate awards for the previous month."
                                icon="solar:cup-star-bold-duotone"
                              />
                            </TableCell>
                          </TableRow>
                        )}

                        {!emptyAwards && !notFound && (
                          <TableEmptyRows height={77} emptyRows={emptyRows} />
                        )}

                        {notFound && <TableNoData searchQuery={filterName} colSpan={8} />}
                      </>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Scrollbar>

            <EmployeeMonthlyAwardDetailsDialog
                open={openDetails.open}
                mode={openDetails.mode}
                award={selectedAward}
                onClose={() => setOpenDetails(prev => ({ ...prev, open: false }))}
                onSave={handleUpdateAward}
            />

            <ConfirmDialog
                open={openDeleteConfirm}
                onClose={() => setOpenDeleteConfirm(false)}
                title="Delete Award"
                content="Are you sure you want to delete this award entry? This action cannot be undone."
                action={
                    <Button variant="contained" color="error" onClick={handleDeleteAward}>
                        Delete
                    </Button>
                }
            />

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
          </>
        )}

        {currentTab === 'settings' && (
          <Box p={3}>
            <EmployeeAwardSettingsForm />
          </Box>
        )}
      </Card>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar} 
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ top: { xs: 80, sm: 80 } }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity as any} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}
