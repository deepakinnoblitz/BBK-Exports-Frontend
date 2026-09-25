import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
    IoMdPrint, IoMdTrash, IoMdCreate, IoMdArrowBack, IoMdCheckmarkCircle 
} from 'react-icons/io';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { fNumber } from 'src/utils/format-number';

import { getHRSettings } from 'src/api/hr-management';
import { DashboardContent } from 'src/layouts/dashboard';
import {
    deleteSalarySlip,
    submitSalarySlip,
    getSalarySlipDownloadUrl,
    getSalarySlipWithDetails,
} from 'src/api/salary-slips';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { useAuth } from 'src/auth/auth-context';

// ----------------------------------------------------------------------

type Props = {
    id?: string;
};

export function SalarySlipDetailsView({ id: propId }: Props) {
    const params = useParams();
    const router = useRouter();
    const id = propId || params.id;

    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && (user?.permissions?.actions?.salary_slips || user?.permissions?.actions?.my_salary_slip);
    const actionPerms = user?.permissions?.actions?.salary_slips || user?.permissions?.actions?.my_salary_slip;
    const canEditSalarySlip = hasCustomPerms && actionPerms ? !!actionPerms?.edit : true;
    const canDeleteSalarySlip = hasCustomPerms && actionPerms ? !!actionPerms?.delete : true;

    const [slip, setSlip] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

    const [hrSettings, setHRSettings] = useState<any>({
        default_currency: 'INR',
        currency_symbol: '₹',
        default_locale: 'en-IN',
    });

    const [popoverState, setPopoverState] = useState<{ el: HTMLButtonElement | null; type: string }>({
        el: null,
        type: '',
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

    const fetchSlip = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await getSalarySlipWithDetails(id);
            setSlip(data);
        } catch (err: any) {
            console.error('Failed to load salary slip:', err);
            setSnackbar({
                open: true,
                message: err.message || 'Failed to load salary slip details',
                severity: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getHRSettings().then(setHRSettings).catch(console.error);
        fetchSlip();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handlePopoverOpen = (event: React.MouseEvent<HTMLButtonElement>, type: string) => {
        setPopoverState({ el: event.currentTarget, type });
    };

    const handlePopoverClose = () => {
        setPopoverState((prev) => ({ ...prev, el: null }));
    };

    const openPopover = Boolean(popoverState.el);

    const handleDownload = () => {
        if (!slip?.name) return;
        const url = getSalarySlipDownloadUrl(slip.name);
        window.open(url, '_blank');
    };

    const handleDelete = async () => {
        if (!id) return;
        try {
            setDeleting(true);
            await deleteSalarySlip(id);
            setSnackbar({ open: true, message: 'Salary slip deleted successfully', severity: 'success' });
            setTimeout(() => {
                router.push('/salary-slips');
            }, 600);
        } catch (err: any) {
            console.error('Failed to delete salary slip:', err);
            setSnackbar({
                open: true,
                message: err.message || 'Failed to delete salary slip',
                severity: 'error',
            });
            setDeleting(false);
        }
    };

    const handleSubmit = async () => {
        if (!id) return;
        try {
            setSubmitting(true);
            await submitSalarySlip(id);
            setSnackbar({ open: true, message: 'Salary slip submitted successfully', severity: 'success' });
            setConfirmSubmitOpen(false);
            fetchSlip();
        } catch (err: any) {
            console.error('Failed to submit salary slip:', err);
            setSnackbar({
                open: true,
                message: err.message || 'Failed to submit salary slip',
                severity: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (date: string) => {
        if (!date) return '-';
        return dayjs(date).format('DD-MM-YYYY');
    };

    const formatHoursToHrMin = (hours: number) => {
        if (!hours) return '';
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        if (h > 0 && m > 0) return `${h}hr ${m}mins`;
        if (h > 0) return `${h}hr`;
        return `${m}mins`;
    };

    const getPopoverTitle = () => {
        switch (popoverState.type) {
            case 'present': return 'Present Days';
            case 'physical': return 'Physical Attendance';
            case 'absent': return 'Absent Days';
            case 'half_day': return 'Half Days';
            case 'holiday': return 'Holidays';
            case 'unpaid_leave': return 'Unpaid Leaves';
            case 'paid_leave': return 'Paid Leaves';
            case 'lop': return 'LOP Days';
            default: return 'Attendance Breakdown';
        }
    };

    const getFilteredBreakdown = () => {
        const bd = slip?.days_breakdown || [];
        switch (popoverState.type) {
            case 'present': return bd.filter((d: any) => d.status.includes('Work') || d.status.includes('Paid Leave') || d.status.includes('Holiday'));
            case 'physical': return bd.filter((d: any) => d.status.includes('Work'));
            case 'absent': return bd.filter((d: any) => d.status.includes('Absent') || d.status.includes('Unpaid Leave'));
            case 'half_day': return bd.filter((d: any) => d.status.includes('(0.5)'));
            case 'holiday': return bd.filter((d: any) => d.status.includes('Holiday'));
            case 'unpaid_leave': return bd.filter((d: any) => d.status.includes('Unpaid Leave'));
            case 'paid_leave': return bd.filter((d: any) => d.status.includes('Paid Leave'));
            case 'lop': return bd.filter((d: any) => d.status.includes('Absent') || d.status.includes('Unpaid Leave'));
            default: return bd;
        }
    };

    const filteredBreakdown = getFilteredBreakdown();

    if (loading) {
        return (
            <DashboardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <CircularProgress />
            </DashboardContent>
        );
    }

    if (!slip) {
        return (
            <DashboardContent maxWidth={false}>
                <Typography variant="h4">Salary slip not found</Typography>
                <Button onClick={() => router.push('/salary-slips')} sx={{ mt: 3 }}>
                    Go back to list
                </Button>
            </DashboardContent>
        );
    }

    const isDraft = slip.docstatus === 0;

    // ── Header (Exact Dialog UI) ──────────────────────────────────────────────
    const renderHeader = (
        <Box
            sx={{
                p: 2,
                mb: 3,
                textAlign: 'center',
                borderRadius: 2,
                position: 'relative',
                overflow: 'hidden',
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
            }}
        >
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800, color: 'primary.main', fontSize: '22px' }}>
                SALARY SLIP
            </Typography>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Period: {formatDate(slip.pay_period_start)} — {formatDate(slip.pay_period_end)}
            </Typography>
        </Box>
    );

    // ── Employee Details (Exact Dialog UI) ────────────────────────────────────
    const renderEmployeeDetails = (
        <Box sx={{ mb: 4 }}>
            <Box
                sx={{
                    borderRadius: 1.5,
                    display: 'grid',
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                }}
            >
                <SubHeader title="Employee Information" />
                <InfoRow label="Employee Name" value={slip.employee_name} />
                <InfoRow label="Employee ID" value={slip.employee_id || slip.employee} />
                <InfoRow label="Father / Husband Name" value={slip.father_husband_name || '-'} />

                <SubHeader title="Contact Details" />
                <InfoRow label="Official Email" value={slip.email || '-'} />
                <InfoRow label="Personal Email" value={slip.personal_email || '-'} />
                <InfoRow label="Employee Phone Number" value={slip.phone_number || '-'} />

                <SubHeader title="Job Details" />
                <InfoRow label="Department" value={slip.department || '-'} />
                <InfoRow label="Designation" value={slip.designation || '-'} />
                <InfoRow label="Date of Joining" value={formatDate(slip.date_of_joining)} />

                <SubHeader title="Bank Details" />
                <InfoRow label="Account Name" value={slip.bank_account_name || '-'} />
                <InfoRow label="Account No" value={slip.account_number || '-'} />
                <InfoRow label="Bank Name" value={slip.bank_name || '-'} />
                <InfoRow label="Branch" value={slip.branch || '-'} />
                <InfoRow label="IFSC" value={slip.ifsc_code || '-'} />
            </Box>
        </Box>
    );

    // ── Attendance Summary (Exact Dialog UI) ──────────────────────────────────
    const renderAttendanceSummary = (
        <Box sx={{ mb: 4 }}>
            <SectionHeader title="Attendance Summary" icon="solar:calendar-date-bold" color="warning.main" />
            <Box
                sx={{
                    p: 3,
                    borderRadius: 2,
                    display: 'grid',
                    gap: 3,
                    bgcolor: (theme) => alpha(theme.palette.warning.main, 0.04),
                    border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.12)}`,
                    gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                }}
            >
                <InfoRow label="Pay Period Days" value={slip.total_days_in_period || 0} />
                <Box /> {/* spacer */}
                <Box sx={{ gridColumn: { md: 'span 2' } }}>
                    <InfoRow
                        label="Calculation Base (Month)"
                        value={
                            slip.working_days_basis === 'Fixed Number of Days'
                                ? `Fixed (${slip.fixed_working_days || 26} Days)`
                                : `${slip.total_working_days || 30} Days`
                        }
                    />
                </Box>
                <Divider sx={{ gridColumn: '1 / -1', my: 1 }} />
                {(() => {
                    const renderInfoAction = (type: string) =>
                        slip.days_breakdown && slip.days_breakdown.length > 0 ? (
                            <IconButton
                                size="small"
                                onClick={(e) => handlePopoverOpen(e, type)}
                                sx={{ p: 0.5, color: 'info.main' }}
                            >
                                <Iconify icon={'eva:info-outline' as any} width={16} />
                            </IconButton>
                        ) : undefined;

                    return (
                        <>
                            <InfoRow label="No of Present Days" value={slip.actual_present_days || 0} action={renderInfoAction('present')} />
                            <InfoRow label="Physical Attendance" value={slip.physical_attendance_days || 0} action={renderInfoAction('physical')} />
                            <InfoRow label="No of Absent" value={slip.lop_days || 0} action={renderInfoAction('absent')} />
                            <InfoRow label="No of Half Day" value={slip.half_day_count || 0} action={renderInfoAction('half_day')} />
                            <InfoRow label="Holidays Found" value={slip.holiday_count || 0} action={renderInfoAction('holiday')} />
                            <InfoRow label="No of Unpaid Leave" value={slip.no_of_leave || 0} action={renderInfoAction('unpaid_leave')} />
                            <InfoRow label="No of Paid Leave" value={slip.no_of_paid_leave || 0} action={renderInfoAction('paid_leave')} />
                            <InfoRow label="LOP Days" value={slip.lop_days || 0} action={renderInfoAction('lop')} />
                        </>
                    );
                })()}
            </Box>
        </Box>
    );

    // ── Salary Breakdown (Exact Dialog UI) ────────────────────────────────────
    const renderSalaryBreakdown = (
        <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                {/* Earnings */}
                <Box
                    sx={{
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: (theme) => alpha(theme.palette.success.main, 0.04),
                        border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.12)}`,
                    }}
                >
                    <SectionHeader title="Earnings" icon="solar:wad-of-money-bold" color="success.main" />
                    <Stack spacing={1.5}>
                        {(slip.earnings || []).map((item: any, idx: number) => (
                            <AmountRow
                                key={idx}
                                label={item.component_name || item.salary_component}
                                amount={item.amount}
                                hrSettings={hrSettings}
                            />
                        ))}
                        {(!slip.earnings || slip.earnings.length === 0) && (
                            <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                                No earnings recorded
                            </Typography>
                        )}
                        <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                        <AmountRow
                            label="Gross Earnings"
                            amount={slip.gross_pay || slip.grand_gross_pay}
                            isTotal
                            color="success.main"
                            hrSettings={hrSettings}
                        />
                    </Stack>
                </Box>

                {/* Deductions */}
                <Box
                    sx={{
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: (theme) => alpha(theme.palette.error.main, 0.04),
                        border: (theme) => `1px solid ${alpha(theme.palette.error.main, 0.12)}`,
                    }}
                >
                    <SectionHeader title="Deductions" icon="solar:hand-money-bold" color="error.main" />
                    <Stack spacing={1.5}>
                        {(slip.deductions || []).map((item: any, idx: number) => (
                            <AmountRow
                                key={idx}
                                label={item.component_name || item.salary_component}
                                amount={item.amount}
                                hrSettings={hrSettings}
                            />
                        ))}
                        {Number(slip.lop || 0) > 0 && (
                            <AmountRow label={`LOP (${slip.lop_days || 0} days)`} amount={slip.lop} hrSettings={hrSettings} />
                        )}
                        {(!slip.deductions || slip.deductions.length === 0) && !slip.lop && (
                            <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                                No deductions recorded
                            </Typography>
                        )}
                        <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                        <AmountRow
                            label="Total Deductions"
                            amount={slip.total_deduction}
                            isTotal
                            color="error.main"
                            hrSettings={hrSettings}
                        />
                    </Stack>
                </Box>
            </Box>
        </Box>
    );

    // ── Net Pay (Exact Dialog UI) ─────────────────────────────────────────────
    const renderNetPay = (
        <Box
            sx={{
                p: 3,
                mt: 1,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'common.white',
                background: (theme) =>
                    `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: (theme) => `0 8px 24px -4px ${alpha(theme.palette.primary.main, 0.4)}`,
            }}
        >
            <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: 1 }}>
                    NET SALARY PAYABLE
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.72, fontWeight: 500 }}>
                    (Gross Earnings - Total Deductions)
                </Typography>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center' }}>
                <Box component="span" sx={{ fontFamily: "Arial, 'sans-serif'", mr: 1, fontSize: '0.7em', color: 'common.white' }}>
                    {hrSettings.currency_symbol}
                </Box>
                {fNumber(slip.grand_net_pay ?? slip.net_pay ?? 0, { locale: hrSettings.default_locale })}
            </Typography>
        </Box>
    );

    return (
        <DashboardContent maxWidth={false}>
            {/* Top Heading and Button Style like Invoice Page */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={4} mt={2} className="no-print">
                <Typography variant="h4">Salary Slip: {slip.name}</Typography>
                <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => router.push('/salary-slips')}
                        startIcon={<IoMdArrowBack size={20} />}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 2.5,
                            '&:hover': {
                                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                                borderColor: 'text.primary',
                            },
                        }}
                    >
                        Go Back
                    </Button>

                    <Button
                        variant="contained"
                        onClick={handleDownload}
                        startIcon={<IoMdPrint size={20} />}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            bgcolor: '#2065D1',
                            color: 'common.white',
                            '&:hover': { bgcolor: '#103996' },
                        }}
                    >
                        Print
                    </Button>

                    {isDraft && canEditSalarySlip && (
                        <Button
                            variant="contained"
                            onClick={() => router.push(`/salary-slips/${id}/edit`)}
                            startIcon={<IoMdCreate size={20} />}
                            sx={{
                                borderRadius: 1.5,
                                fontWeight: 600,
                                textTransform: 'none',
                                bgcolor: '#059669',
                                color: 'common.white',
                                '&:hover': { bgcolor: '#047857' },
                            }}
                        >
                            Edit
                        </Button>
                    )}

                    {isDraft && (
                        <Button
                            variant="contained"
                            onClick={() => setConfirmSubmitOpen(true)}
                            startIcon={<IoMdCheckmarkCircle size={20} />}
                            sx={{
                                borderRadius: 1.5,
                                fontWeight: 600,
                                textTransform: 'none',
                                bgcolor: '#10B981',
                                color: 'common.white',
                                '&:hover': { bgcolor: '#059669' },
                            }}
                        >
                            Submit
                        </Button>
                    )}

                    {isDraft && canDeleteSalarySlip && (
                        <Button
                            variant="contained"
                            color="error"
                            onClick={() => setConfirmDeleteOpen(true)}
                            startIcon={<IoMdTrash size={20} />}
                            sx={{ borderRadius: 1.5, fontWeight: 600, textTransform: 'none' }}
                        >
                            Delete
                        </Button>
                    )}
                </Stack>
            </Stack>

            {/* Exactly the Dialog UI rendered inside a full width Card on page */}
            <Card
                sx={{
                    p: { xs: 2.5, sm: 4 },
                    width: 1,
                    borderRadius: 2,
                    boxShadow: (themeVar) => themeVar.customShadows?.z16,
                }}
            >
                {renderHeader}
                {renderEmployeeDetails}
                {renderAttendanceSummary}
                <Divider sx={{ my: 4, borderStyle: 'dashed' }} />
                {renderSalaryBreakdown}
                {renderNetPay}

                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        This is a computer generated salary slip and does not require a signature.
                    </Typography>
                </Box>
            </Card>

            {/* Attendance Breakdown Popover */}
            <Popover
                open={openPopover}
                anchorEl={popoverState.el}
                onClose={handlePopoverClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                PaperProps={{
                    sx: { p: 2, width: 400, maxHeight: 400 },
                }}
                disableScrollLock
            >
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {getPopoverTitle()}
                    <Box component="span" sx={{ ml: 1, px: 1, py: 0.25, borderRadius: 0.75, bgcolor: 'action.selected', color: 'text.secondary', fontSize: '0.85em' }}>
                        {filteredBreakdown.length}
                    </Box>
                </Typography>
                <Scrollbar>
                    <Stack spacing={1.5}>
                        {filteredBreakdown.length > 0 ? (
                            filteredBreakdown.map((day: any, idx: number) => {
                                let colorStr = 'text.secondary';
                                if (day.status.includes('Work') && day.status.includes('Absent')) colorStr = 'warning.main';
                                else if (day.status.includes('Absent')) colorStr = 'error.main';
                                else if (day.status.includes('Work')) colorStr = 'success.main';
                                else if (day.status.includes('Holiday')) colorStr = 'info.main';
                                else if (day.status.includes('Leave')) colorStr = 'warning.main';

                                return (
                                    <Box
                                        key={idx}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            py: 1,
                                            px: 1.5,
                                            borderRadius: 1,
                                            transition: 'background-color 0.2s',
                                            '&:hover': { bgcolor: 'action.hover' },
                                            ...(idx !== filteredBreakdown.length - 1 && {
                                                borderBottom: (theme) => `1px dashed ${theme.palette.divider}`,
                                            }),
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {dayjs(day.date).format('DD-MM-YYYY - dddd')}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: colorStr,
                                                    fontWeight: 700,
                                                    px: 1,
                                                    py: 0.25,
                                                    borderRadius: 0.5,
                                                    bgcolor: (theme) =>
                                                        alpha(
                                                            theme.palette[
                                                                colorStr.replace('.main', '') as 'success' | 'info' | 'warning' | 'error'
                                                            ]?.main || theme.palette.text.secondary,
                                                            0.12
                                                        ),
                                                }}
                                            >
                                                {(() => {
                                                    if ((popoverState.type === 'absent' || popoverState.type === 'lop') && day.status.includes('Work') && day.status.includes('Absent')) return 'Half Day Absent';
                                                    if (['present', 'physical', 'half_day'].includes(popoverState.type) && day.status.includes('Work') && day.status.includes('Absent')) return 'Present Half Day';
                                                    return day.status.replaceAll('(1.0)', 'Full Day').replaceAll('(0.5)', 'Half Day').replace('Work', 'Present');
                                                })()}
                                            </Typography>
                                            {day.hours ? (
                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                                    {formatHoursToHrMin(day.hours)}
                                                </Typography>
                                            ) : null}
                                        </Box>
                                    </Box>
                                );
                            })
                        ) : (
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic', textAlign: 'center', display: 'block', mt: 1 }}>
                                No days found for this category
                            </Typography>
                        )}
                    </Stack>
                </Scrollbar>
            </Popover>

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                open={confirmDeleteOpen}
                onClose={() => setConfirmDeleteOpen(false)}
                title="Delete Salary Slip"
                content={`Are you sure you want to delete salary slip ${slip.name}? This action cannot be undone.`}
                action={
                    <LoadingButton
                        variant="contained"
                        color="error"
                        loading={deleting}
                        onClick={handleDelete}
                    >
                        Delete
                    </LoadingButton>
                }
            />

            {/* Confirm Submit Dialog */}
            <ConfirmDialog
                open={confirmSubmitOpen}
                onClose={() => setConfirmSubmitOpen(false)}
                title="Submit Salary Slip"
                content={`Are you sure you want to submit salary slip ${slip.name}? Once submitted, it will be finalized.`}
                action={
                    <LoadingButton
                        variant="contained"
                        color="primary"
                        loading={submitting}
                        onClick={handleSubmit}
                    >
                        Submit
                    </LoadingButton>
                }
            />

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Box
                    sx={{
                        bgcolor: snackbar.severity === 'error' ? 'error.main' : 'success.main',
                        color: 'common.white',
                        px: 2,
                        py: 1.5,
                        borderRadius: 1,
                        boxShadow: (theme) => theme.customShadows?.z8,
                    }}
                >
                    <Typography variant="subtitle2">{snackbar.message}</Typography>
                </Box>
            </Snackbar>
        </DashboardContent>
    );
}

// ----------------------------------------------------------------------

function SectionHeader({
    title,
    icon,
    color = 'text.secondary',
}: {
    title: string;
    icon: string;
    color?: string;
}) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Iconify icon={icon as any} width={22} sx={{ mr: 1.5, color }} />
            <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}
            >
                {title}
            </Typography>
        </Box>
    );
}

function InfoRow({ label, value, action }: { label: string; value: string | number; action?: React.ReactNode }) {
    return (
        <Box sx={{ px: 2.5, py: 2, borderBottom: (theme) => `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
            <Typography
                variant="caption"
                sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontWeight: 500, fontSize: '13px' }}
            >
                {label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {value ?? '-'}
                </Typography>
                {action && action}
            </Box>
        </Box>
    );
}

function SubHeader({ title }: { title: string }) {
    return (
        <Box
            sx={{
                gridColumn: '1 / -1',
                bgcolor: 'rgb(245 245 245 / 56%)',
                py: 1.5,
                px: 2.5,
                borderBottom: (theme) => `1px solid ${alpha(theme.palette.divider, 0.4)}`,
            }}
        >
            <Typography
                variant="overline"
                sx={{
                    color: 'text.secondary',
                    fontWeight: 800,
                    fontSize: 13,
                }}
            >
                {title}
            </Typography>
        </Box>
    );
}

function AmountRow({
    label,
    amount,
    isTotal = false,
    color,
    hrSettings,
}: {
    label: string;
    amount: number;
    isTotal?: boolean;
    color?: string;
    hrSettings: any;
}) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography
                variant={isTotal ? 'subtitle2' : 'body2'}
                sx={{
                    color: isTotal ? color || 'text.primary' : 'text.secondary',
                    fontWeight: isTotal ? 700 : 500,
                }}
            >
                {label}
            </Typography>
            <Typography
                variant={isTotal ? 'h6' : 'subtitle2'}
                sx={{
                    fontWeight: isTotal ? 800 : 700,
                    color: color || 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: isTotal ? '20px' : '15.5px',
                }}
            >
                <Box
                    component="span"
                    sx={{
                        fontFamily: "Arial, 'sans-serif'",
                        mr: 0.5,
                        fontSize: '0.9em',
                        color: isTotal ? color || 'text.primary' : 'text.primary',
                    }}
                >
                    {hrSettings.currency_symbol}
                </Box>
                {fNumber(amount || 0, { locale: hrSettings.default_locale })}
            </Typography>
        </Box>
    );
}
