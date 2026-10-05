import type { SalarySlip } from 'src/api/salary-slips';

import { RiSettings4Fill } from 'react-icons/ri';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import Snackbar from '@mui/material/Snackbar';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { useSalarySlips } from 'src/hooks/useSalarySlips';

import { getDoctypeList } from 'src/api/leads';
import { DashboardContent } from 'src/layouts/dashboard';
import { deleteSalarySlip, submitSalarySlip, exportBobNeftFile } from 'src/api/salary-slips';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { TableNoData } from 'src/sections/lead/table-no-data';
import { TableEmptyRows } from 'src/sections/lead/table-empty-rows';
import { SalarySlipTableRow } from 'src/sections/salary-slips/salary-slip-table-row';
import { LeadTableHead as SalarySlipTableHead } from 'src/sections/lead/lead-table-head';
import { LeadTableToolbar as SalarySlipTableToolbar } from 'src/sections/lead/lead-table-toolbar';

import { useAuth } from 'src/auth/auth-context';

import SalarySlipCreateDialog from '../salary-slip-create-dialog';
import { SalarySlipFiltersDrawer } from '../salary-slip-filters-drawer';
import SalarySlipAutoAllocateDialog from '../salary-slip-auto-allocate-dialog';
import { SalarySlipReconciliationDialog } from '../salary-slip-reconciliation-dialog';
import SalarySlipGenerateProgressDialog from '../salary-slip-generate-progress-dialog';

import type { SalarySlipFiltersProps } from '../salary-slip-filters-drawer';


const SORT_OPTIONS = [
    { value: 'modified_desc', label: 'Newest First' },
    { value: 'modified_asc', label: 'Oldest First' },
    { value: 'employee_name_asc', label: 'Employee: A to Z' },
    { value: 'employee_name_desc', label: 'Employee: Z to A' },
];

export function SalarySlipsView() {
    const router = useRouter();
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && (user?.permissions?.actions?.salary_slips || user?.permissions?.actions?.my_salary_slip);
    const actionPerms = user?.permissions?.actions?.salary_slips || user?.permissions?.actions?.my_salary_slip;
    const canCreateSalarySlip = hasCustomPerms && actionPerms ? !!actionPerms?.create : true;
    const canEditSalarySlip = hasCustomPerms && actionPerms ? !!actionPerms?.edit : true;
    const canDeleteSalarySlip = hasCustomPerms && actionPerms ? !!actionPerms?.delete : true;

    const isHR = useMemo(() => {
        if (!user) return false;
        const hrRoles = ['HR', 'System Manager', 'Administrator'];
        return (user.roles || []).some((role: string) => hrRoles.includes(role));
    }, [user]);

    const currentEmployeeId = user?.employee || null;

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [orderBy, setOrderBy] = useState('modified');
    const [filters, setFilters] = useState<SalarySlipFiltersProps>({
        employee: 'all',
        department: 'all',
        designation: 'all',
        pay_period_start: null,
        pay_period_end: null,
    });

    const filterValues = useMemo(() => {
        const baseFilters: Record<string, any> = Object.fromEntries(
            Object.entries(filters).filter(([_, v]) => v !== 'all' && v !== null)
        );

        if (!isHR) {
            baseFilters.docstatus = 1;
            if (currentEmployeeId) {
                baseFilters.employee = currentEmployeeId;
            }
        }

        return baseFilters;
    }, [filters, isHR, currentEmployeeId]);



    const { data, total, refetch, loading } = useSalarySlips(
        page + 1,
        rowsPerPage,
        filterName,
        filterValues,
        orderBy,
        order
    );

    const [selected, setSelected] = useState<string[]>([]);
    const [openFilters, setOpenFilters] = useState(false);
    const [generationProgress, setGenerationProgress] = useState<{
        open: boolean;
        year: number;
        month: number;
        monthName: string;
        employees: string[];
    } | null>(null);

    const [filterOptions, setFilterOptions] = useState<{
        employees: any[];
        departments: any[];
        designations: any[];
    }>({
        employees: [],
        departments: [],
        designations: [],
    });

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [emps, depts, desigs] = await Promise.all([
                    getDoctypeList('Employee', ['name', 'employee_name']),
                    getDoctypeList('Department', ['name']),
                    getDoctypeList('Designation', ['name']),
                ]);
                setFilterOptions({
                    employees: emps,
                    departments: depts,
                    designations: desigs,
                });
            } catch (error) {
                console.error('Failed to fetch filter options:', error);
            }
        };
        fetchOptions();
    }, []);

    const handleFilters = useCallback((update: Partial<SalarySlipFiltersProps>) => {
        setFilters((prev) => ({ ...prev, ...update }));
        setPage(0);
    }, []);

    const handleResetFilters = useCallback(() => {
        setFilters({
            employee: 'all',
            department: 'all',
            designation: 'all',
            pay_period_start: null,
            pay_period_end: null,
        });
        setPage(0);
    }, []);

    const canReset = filters.employee !== 'all' ||
        filters.department !== 'all' ||
        filters.designation !== 'all' ||
        filters.pay_period_start !== null ||
        filters.pay_period_end !== null ||
        !!filterName;

    // Dialog state
    const [openCreate, setOpenCreate] = useState(false);
    const [openAutoAllocate, setOpenAutoAllocate] = useState(false);
    const [openRecon, setOpenRecon] = useState(false);
    const [exportingBob, setExportingBob] = useState(false);
    const [editSlip, setEditSlip] = useState<SalarySlip | null>(null);

    const handleExportBob = async () => {
        try {
            setExportingBob(true);
            const exportResult = await exportBobNeftFile(
                filters.pay_period_start || undefined,
                filters.pay_period_end || undefined,
                selected.length > 0 ? selected : undefined
            );
            if (!exportResult?.records?.length) {
                setSnackbar({ open: true, message: 'No salary records found for export', severity: 'error' });
                return;
            }
            const headers = ['S.No', 'Emp No', 'Name', 'ACCOUNT NO', 'IFSC Code', 'Bank Name', 'Branch', 'Amount (In INR)', 'Narration'];
            const rows = exportResult.records.map((r: any) => [
                r.s_no,
                `"${r.employee}"`,
                `"${r.employee_name}"`,
                `"${r.account_no}"`,
                `"${r.ifsc_code}"`,
                `"${r.bank_name}"`,
                `"${r.branch}"`,
                r.amount,
                `"${r.narration}"`
            ]);
            const csvContent = [headers.join(','), ...rows.map((row: any) => row.join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `BBK_BOB_NEFT_Disbursement_${exportResult.period.replace(/\s+/g, '_')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setSnackbar({ open: true, message: `Exported BOB NEFT file for ${exportResult.total_employees} records (₹${exportResult.total_amount.toLocaleString()})`, severity: 'success' });
        } catch (err: any) {
            setSnackbar({ open: true, message: err.message || 'Failed to export BOB file', severity: 'error' });
        } finally {
            setExportingBob(false);
        }
    };




    // Delete confirmation
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        slipName: string;
    }>({
        open: false,
        slipName: '',
    });

    const [deleting, setDeleting] = useState(false);

    // Submit confirmation
    const [submitDialog, setSubmitDialog] = useState<{
        open: boolean;
        slipName: string;
    }>({
        open: false,
        slipName: '',
    });

    const [submitting, setSubmitting] = useState(false);

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

    const handleViewRow = useCallback((row: any) => {
        router.push(`/salary-slips/${row.name}`);
    }, [router]);

    const handleEditRow = useCallback((row: any) => {
        router.push(`/salary-slips/${row.name}/edit`);
    }, [router]);

    const handleDeleteRow = useCallback((name: string) => {
        setDeleteDialog({ open: true, slipName: name });
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        setDeleting(true);
        try {
            await deleteSalarySlip(deleteDialog.slipName);
            setSnackbar({
                open: true,
                message: 'Salary slip deleted successfully',
                severity: 'success',
            });
            setDeleteDialog({ open: false, slipName: '' });
            refetch();
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.message || 'Failed to delete record',
                severity: 'error',
            });
        } finally {
            setDeleting(false);
            setDeleteDialog({ open: false, slipName: '' });
        }
    }, [deleteDialog.slipName, refetch]);

    const handleSubmitRow = useCallback((name: string) => {
        setSubmitDialog({ open: true, slipName: name });
    }, []);

    const handleConfirmSubmit = useCallback(async () => {
        setSubmitting(true);
        try {
            await submitSalarySlip(submitDialog.slipName);
            setSnackbar({
                open: true,
                message: 'Salary slip submitted successfully',
                severity: 'success',
            });
            setSubmitDialog({ open: false, slipName: '' });
            refetch();
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.message || 'Failed to submit record',
                severity: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    }, [submitDialog.slipName, refetch]);


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
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 5 }}>
                <Typography variant="h4">Salary Slips</Typography>

                {isHR && (
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="outlined"
                            startIcon={<RiSettings4Fill size={19} />}
                            onClick={() => router.push('/salary-slips/settings')}
                            sx={{
                                borderRadius: 1.5,
                                height: 40,
                                fontWeight: 700,
                                textTransform: 'none',
                                px: 2,
                                borderColor: '#d1d5db',
                                color: '#374151',
                                bgcolor: '#f9fafb',
                                '&:hover': {
                                    borderColor: '#9ca3af',
                                    bgcolor: '#f3f4f6',
                                    color: '#111827',
                                },
                            }}
                        >
                            Settings
                        </Button>

                        {/* <Button
                            variant="outlined"
                            startIcon={<Iconify icon="solar:chart-2-bold-duotone" />}
                            onClick={() => setOpenRecon(true)}
                            sx={{ borderRadius: 1.5, height: 40, textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}
                        >
                            Reconciliation
                        </Button>

                        <LoadingButton
                            variant="outlined"
                            loading={exportingBob}
                            startIcon={<Iconify icon={"solar:card-send-bold-duotone" as any} />}
                            onClick={handleExportBob}
                            sx={{ borderRadius: 1.5, height: 40, textTransform: 'none', fontWeight: 600, color: '#1d4ed8', borderColor: '#bfdbfe', bgcolor: '#eff6ff', '&:hover': { bgcolor: '#dbeafe', borderColor: '#93c5fd' } }}
                        >
                            Bank Export (BOB)
                        </LoadingButton> */}

                        {canCreateSalarySlip && (
                            <>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    startIcon={<Iconify icon={"solar:import-bold-duotone" as any} />}
                                    onClick={() => setOpenAutoAllocate(true)}
                                    sx={{ borderRadius: 1.5, height: 40 }}
                                >
                                    Bulk Allocate
                                </Button>

                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<Iconify icon="mingcute:add-line" />}
                                    onClick={() => {
                                        setEditSlip(null);
                                        setOpenCreate(true);
                                    }}
                                    sx={{ borderRadius: 1.5, height: 40, bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                                >
                                    New Salary Slip
                                </Button>
                            </>
                        )}
                    </Stack>
                )}
            </Stack>


            <Card>

                <SalarySlipTableToolbar
                    numSelected={selected.length}
                    filterName={filterName}
                    onFilterName={handleFilterByName}
                    searchPlaceholder="Search employee name or ID..."
                    sortBy={`${orderBy}_${order}`}
                    onSortChange={(val) => {
                        const index = val.lastIndexOf('_');
                        const f = val.substring(0, index);
                        const d = val.substring(index + 1);
                        setOrderBy(f);
                        setOrder(d as any);
                    }}
                    sortOptions={SORT_OPTIONS}
                    onOpenFilter={() => setOpenFilters(true)}

                    canReset={canReset}
                />


                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: { xs: 300, md: 800 }, borderCollapse: 'collapse', '& .MuiTableCell-head': { bgcolor: '#f5f7fb' } }}>
                            <SalarySlipTableHead
                                order={order}
                                orderBy={orderBy}
                                rowCount={data.length}
                                numSelected={selected.length}
                                onSelectAllRows={(checked: boolean) => handleSelectAllRows(checked)}
                                hideCheckbox
                                showIndex
                                sx={{
                                    bgcolor: '#f5f7fb',
                                    '& .MuiTableCell-head': {
                                        bgcolor: '#f5f7fb',
                                    },
                                }}
                                headLabel={[
                                    { id: 'employee_name', label: 'Employee Name' },
                                    { id: 'pay_period_start', label: 'Pay Period' },
                                    { id: 'gross_pay', label: 'Gross Pay', align: 'right', sx: { display: { xs: 'none', md: 'table-cell' } } },
                                    { id: 'net_pay', label: 'Net Pay', align: 'right', sx: { display: { xs: 'none', md: 'table-cell' } } },
                                    { id: 'status', label: 'Status', sx: { display: { xs: 'none', md: 'table-cell' } } },
                                    { id: '', label: '', align: 'right' },
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
                                        {data.map((row, index) => (
                                            <SalarySlipTableRow
                                                key={row.name}
                                                index={page * rowsPerPage + index}
                                                hideCheckbox
                                                row={{
                                                    id: row.name,
                                                    employee_name: row.employee_name,
                                                    employee_id: row.employee,
                                                    employee_type: row.employee_type,
                                                    pay_period_start: row.pay_period_start,
                                                    pay_period_end: row.pay_period_end,
                                                    gross_pay: row.gross_pay,
                                                    net_pay: row.net_pay,
                                                    status: row.status,
                                                    docstatus: row.docstatus,
                                                }}
                                                selected={selected.includes(row.name)}
                                                onSelectRow={() => handleSelectRow(row.name)}
                                                onView={() => handleViewRow(row)}
                                                onEdit={() => handleEditRow(row)}
                                                onSubmit={() => handleSubmitRow(row.name)}
                                                onDelete={() => handleDeleteRow(row.name)}
                                                canEdit={canEditSalarySlip}
                                                canDelete={canDeleteSalarySlip}
                                                isHR={isHR}
                                            />
                                        ))}

                                        {notFound && <TableNoData searchQuery={filterName} />}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={8}>
                                                    <EmptyContent
                                                        title="No salary slips"
                                                        description="You haven't received any salary slips yet."
                                                        icon="solar:wallet-bold-duotone"
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

            <SalarySlipCreateDialog
                open={openCreate}
                onClose={() => {
                    setOpenCreate(false);
                    setEditSlip(null);
                }}
                onSuccess={(message) => {
                    setSnackbar({ open: true, message, severity: 'success' });
                    refetch();
                }}
                onError={(error) => {
                    setSnackbar({ open: true, message: error, severity: 'error' });
                }}
                slip={editSlip}
            />



            <SalarySlipAutoAllocateDialog
                open={openAutoAllocate}
                onClose={() => setOpenAutoAllocate(false)}
                onStartGeneration={(params) => {
                    setOpenAutoAllocate(false);
                    setGenerationProgress({
                        open: true,
                        ...params,
                    });
                }}
                onSuccess={(message) => {
                    setSnackbar({ open: true, message, severity: 'success' });
                    refetch();
                }}
                onError={(error) => {
                    setSnackbar({ open: true, message: error, severity: 'error' });
                }}
            />

            {generationProgress && (
                <SalarySlipGenerateProgressDialog
                    open={generationProgress.open}
                    year={generationProgress.year}
                    month={generationProgress.month}
                    monthName={generationProgress.monthName}
                    employees={generationProgress.employees}
                    onClose={() => {
                        setGenerationProgress(null);
                        refetch();
                    }}
                    onComplete={(summary) => {
                        refetch();
                        setSnackbar({
                            open: true,
                            message: `Generated ${summary.created} salary slip(s)${
                                summary.skipped > 0 ? ` (${summary.skipped} skipped)` : ''
                            }`,
                            severity: summary.failed > 0 ? 'error' : 'success',
                        });
                    }}
                />
            )}

            <SalarySlipFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
                options={filterOptions}
                isHR={isHR}
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={deleteDialog.open}
                onClose={() => setDeleteDialog({ open: false, slipName: '' })}
                title="Delete Salary Slip"
                content="Are you sure you want to delete this salary slip? This action cannot be undone."
                action={
                    <LoadingButton
                        variant="contained"
                        color="error"
                        loading={deleting}
                        onClick={handleConfirmDelete}
                        sx={{ borderRadius: 1.5, minWidth: 100 }}
                    >
                        Delete
                    </LoadingButton>
                }
            />

            {/* Submit Confirmation Dialog */}
            <ConfirmDialog
                open={submitDialog.open}
                onClose={() => setSubmitDialog({ open: false, slipName: '' })}
                title="Submit Salary Slip"
                content="Are you sure you want to submit this salary slip? This action is permanent and will finalize the slip."
                icon="solar:check-circle-bold"
                iconColor="success.main"
                action={
                    <LoadingButton
                        variant="contained"
                        color="success"
                        loading={submitting}
                        onClick={handleConfirmSubmit}
                        sx={{ borderRadius: 1.5, minWidth: 100 }}
                    >
                        Submit
                    </LoadingButton>
                }
            />

            {/* Reconciliation Dialog */}
            <SalarySlipReconciliationDialog
                open={openRecon}
                onClose={() => setOpenRecon(false)}
                startDate={filters.pay_period_start}
                endDate={filters.pay_period_end}
            />

        </DashboardContent>

    );
}
