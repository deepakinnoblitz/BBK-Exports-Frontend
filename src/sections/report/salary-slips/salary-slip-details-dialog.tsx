import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Popover from '@mui/material/Popover';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { fNumber } from 'src/utils/format-number';

import { getHRSettings } from 'src/api/hr-management';
import { getSalarySlipDownloadUrl } from 'src/api/salary-slips';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    slip: any;
};

export function SalarySlipDetailsDialog({ open, onClose, slip }: Props) {
    const [hrSettings, setHRSettings] = useState<any>({
        default_currency: 'INR',
        currency_symbol: '₹',
        default_locale: 'en-IN',
    });

    const [popoverState, setPopoverState] = useState<{ el: HTMLButtonElement | null; type: string }>({ el: null, type: '' });

    useEffect(() => {
        getHRSettings().then(setHRSettings).catch(console.error);
    }, []);

    if (!slip) return null;

    const handlePopoverOpen = (event: React.MouseEvent<HTMLButtonElement>, type: string) => {
        setPopoverState({ el: event.currentTarget, type });
    };

    const handlePopoverClose = () => {
        setPopoverState((prev) => ({ ...prev, el: null }));
    };

    const openPopover = Boolean(popoverState.el);

    const handleDownload = () => {
        const url = getSalarySlipDownloadUrl(slip.name);
        window.open(url, '_blank');
    };

    const formatDate = (date: string) => {
        if (!date) return '-';
        return dayjs(date).format('DD-MM-YYYY');
    };

    // ── Header ────────────────────────────────────────────────────────────────
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

    // ── Employee Details ──────────────────────────────────────────────────────
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

    // ── Attendance Summary ────────────────────────────────────────────────────
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
                    <InfoRow label="Calculation Base (Month)" value={slip.total_working_days || 0} />
                </Box>
                <Divider sx={{ gridColumn: '1 / -1', my: 1 }} />
                {(() => {
                    const renderInfoAction = (type: string) => slip.days_breakdown && slip.days_breakdown.length > 0 ? (
                        <IconButton size="small" onClick={(e) => handlePopoverOpen(e, type)} sx={{ p: 0.5, color: 'info.main' }}>
                            <Iconify icon={"eva:info-outline" as any} width={16} />
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
                    )
                })()}
            </Box>
        </Box>
    );

    // ── Salary Breakdown ──────────────────────────────────────────────────────
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
                            amount={slip.gross_pay}
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
                        {slip.lop > 0 && (
                            <AmountRow label="LOP" amount={slip.lop} hrSettings={hrSettings} />
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

    // ── Net Pay ───────────────────────────────────────────────────────────────
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

    const getPopoverTitle = () => {
        switch (popoverState.type) {
            case 'present': return "Present Days";
            case 'physical': return "Physical Attendance";
            case 'absent': return "Absent Days";
            case 'half_day': return "Half Days";
            case 'holiday': return "Holidays";
            case 'unpaid_leave': return "Unpaid Leaves";
            case 'paid_leave': return "Paid Leaves";
            case 'lop': return "LOP Days";
            default: return "Attendance Breakdown";
        }
    };

    const formatHoursToHrMin = (hours: number) => {
        if (!hours) return '';
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        if (h > 0 && m > 0) return `${h}hr ${m}mins`;
        if (h > 0) return `${h}hr`;
        return `${m}mins`;
    };

    const filteredBreakdown = getFilteredBreakdown();

    // ── Dialog ────────────────────────────────────────────────────────────────
    return (
        <>
            <Dialog 
                open={open} 
                onClose={onClose} 
                fullWidth 
                PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24, maxWidth: '1100px', } }}
            >
                <DialogTitle
                    sx={{
                        m: 0,
                        p: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                    }}
                >
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        Salary Slip Details
                    </Typography>
                    <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
                        <Iconify icon={"mingcute:close-line" as any} />
                    </IconButton>
                </DialogTitle>

                <Scrollbar sx={{ maxHeight: '85vh' }}>
                    <DialogContent sx={{ p: 4 }}>
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
                    </DialogContent>
                </Scrollbar>

                <Divider sx={{ borderStyle: 'dashed' }} />

                <DialogActions sx={{ p: 2.5 }}>
                    <Box sx={{ flexGrow: 1 }} />
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Iconify icon={"solar:download-bold" as any} />}
                        onClick={handleDownload}
                        sx={{ borderRadius: 1.5 }}
                    >
                        Download PDF
                    </Button>
                </DialogActions>
            </Dialog>

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
                        {filteredBreakdown.length > 0 ? filteredBreakdown.map((day: any, idx: number) => {
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
                                            borderBottom: (theme) => `1px dashed ${theme.palette.divider}`
                                        })
                                    }}
                                >
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {dayjs(day.date).format('DD-MM-YYYY - dddd')}
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                        <Typography variant="caption" sx={{ color: colorStr, fontWeight: 700, px: 1, py: 0.25, borderRadius: 0.5, bgcolor: (theme) => alpha(theme.palette[colorStr.replace('.main', '') as 'success' | 'info' | 'warning' | 'error']?.main || theme.palette.text.secondary, 0.12) }}>
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
                        }) : (
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic', textAlign: 'center', display: 'block', mt: 1 }}>
                                No days found for this category
                            </Typography>
                        )}
                    </Stack>
                </Scrollbar>
            </Popover>
        </>
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
