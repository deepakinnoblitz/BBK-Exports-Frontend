import { FaRegCalendarAlt } from 'react-icons/fa';
import { LuList, LuClock, LuCalendarDays } from 'react-icons/lu';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { COMMON_COLORS } from 'src/theme';

import { Iconify } from 'src/components/iconify';


// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    holidayList: any;
};

export function HolidayDetailsDialog({ open, onClose, holidayList }: Props) {
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24, } }}>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: (theme) => `1px solid ${theme.palette.divider}`, }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Holiday List Details</Typography>
                <IconButton onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500], bgcolor: 'background.paper', boxShadow: (theme) => theme.customShadows?.z1 }}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 4, m: 2, mt: 4 }}>
                {holidayList ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {/* Header Section */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Box
                                sx={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 3,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: alpha(COMMON_COLORS.emerald.main, 0.12),
                                }}
                            >
                                <Iconify icon={"solar:calendar-mark-bold" as any} width={40} sx={{ color: COMMON_COLORS.emerald.main }} />
                            </Box>

                            <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                                    {holidayList.holiday_list_name}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                    {holidayList.month_year} – {holidayList.year || 'All Months'}
                                </Typography>
                            </Box>

                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h4" sx={{ fontWeight: 800, color: COMMON_COLORS.emerald.main }}>
                                    {holidayList.working_days || 0}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                    Working Days
                                </Typography>
                            </Box>
                        </Box>

                        <Divider sx={{ borderStyle: 'dashed' }} />

                        {/* Holiday List Information */}
                        <Box>
                            <SectionHeader title="HOLIDAY LIST INFORMATION" icon="" />
                            <Box
                                sx={{
                                    display: 'grid',
                                    gap: 2,
                                    mt: 3,
                                    gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                                }}
                            >
                                <InfoCard label="LIST NAME" value={holidayList.holiday_list_name} icon={<LuList size={18} />} />
                                <InfoCard label="YEAR" value={holidayList.year?.toString()} icon={<FaRegCalendarAlt size={18} />} />
                                <InfoCard label="MONTH" value={holidayList.month_year || 'All Months'} icon={<LuCalendarDays size={18} />} />
                                <InfoCard
                                    label="WORKING DAYS"
                                    value={`${holidayList.working_days || 0} days`}
                                    icon={<LuClock size={18} />}
                                />
                            </Box>
                        </Box>

                        {/* Holidays */}
                        {holidayList.holidays && holidayList.holidays.length > 0 && (
                            <Box>
                                <SectionHeader title="Holidays" icon="" />
                                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                                    <Box sx={{ overflowX: 'auto' }}>
                                        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <Box component="thead" sx={{ bgcolor: 'background.neutral' }}>
                                                <Box component="tr">
                                                    <Box component="th" sx={{ p: 2, textAlign: 'left', fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider' }}>
                                                        Date
                                                    </Box>
                                                    <Box component="th" sx={{ p: 2, textAlign: 'left', fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider' }}>
                                                        Description
                                                    </Box>
                                                    <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider' }}>
                                                        Working Day
                                                    </Box>
                                                    <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider' }}>
                                                        Holiday
                                                    </Box>
                                                </Box>
                                            </Box>
                                            <Box component="tbody">
                                                {holidayList.holidays.map((holiday: any, index: number) => (
                                                    <Box component="tr" key={index} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                                        <Box component="td" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                                                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                                                {new Date(holiday.holiday_date).toLocaleDateString('en-US', {
                                                                    weekday: 'short',
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: 'numeric'
                                                                })}
                                                            </Typography>
                                                        </Box>
                                                        <Box component="td" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                {holiday.description}
                                                            </Typography>
                                                        </Box>
                                                        <Box component="td" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                                                            {holiday.is_working_day ? (
                                                                <Iconify icon={"solar:check-circle-bold" as any} width={24} sx={{ color: 'success.main' }} />
                                                            ) : (
                                                                <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 700, fontSize: '1.2rem' }}>✗</Typography>
                                                            )}
                                                        </Box>
                                                        <Box component="td" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                                                            {holiday.is_holiday ? (
                                                                <Iconify icon={"solar:check-circle-bold" as any} width={24} sx={{ color: 'warning.main' }} />
                                                            ) : (
                                                                <Typography variant="body2" sx={{ color: 'text.disabled', fontWeight: 600 }}>—</Typography>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                ))}
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        )}

                        {/* Metadata */}
                        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                            <DetailItem
                                label="Created On"
                                value={holidayList.creation ? new Date(holidayList.creation).toLocaleString() : '-'}
                                icon="solar:calendar-bold"
                                color="warning"
                            />
                            <DetailItem
                                label="Last Modified"
                                value={holidayList.modified ? new Date(holidayList.modified).toLocaleString() : '-'}
                                icon="solar:clock-circle-bold"
                                color="warning"
                            />
                        </Box>
                    </Box>
                ) : (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                        <Iconify icon={"solar:ghost-bold" as any} width={64} sx={{ color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" sx={{ color: 'text.secondary' }}>No Holiday List Found</Typography>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}

function SectionHeader({ title, icon, noMargin = false, isPremium = false }: { title: string; icon: string, noMargin?: boolean, isPremium?: boolean }) {
    if (isPremium) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: noMargin ? 0 : 3 }}>
                <Box
                    sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1.25,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: COMMON_COLORS.emerald.main,
                        boxShadow: `0 4px 8px -2px ${alpha(COMMON_COLORS.emerald.main, 0.24)}`,
                    }}
                >
                    <Iconify icon={icon as any} width={18} sx={{ color: 'common.white' }} />
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: COMMON_COLORS.emerald.darker }}>
                    {title}
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: noMargin ? 0 : 2.5 }}>
            <Iconify icon={icon as any} width={18} sx={{ color: 'primary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '14px' }}>
                {title}
            </Typography>
        </Box>
    );
}

function InfoCard({ label, value, icon, variant = 'neutral' }: { label: string; value?: string | null; icon: React.ReactNode, variant?: 'neutral' | 'info' }) {
    const isInfo = variant === 'info';
    return (
        <Box
            sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                minWidth: 0,
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                    color: 'primary.main',
                    flexShrink: 0,
                }}
            >
                {icon}
            </Box>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography
                    variant="caption"
                    sx={{
                        color: 'text.secondary',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        display: 'block',
                        fontSize: 11,
                        mb: 0.2,
                    }}
                >
                    {label}
                </Typography>
                <Typography
                    variant="subtitle1"
                    sx={{
                        fontWeight: 900,
                        color: 'text.primary',
                        fontSize: '15px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {value || '-'}
                </Typography>
            </Box>
        </Box>
    );
}

function DetailItem({ label, value, icon, color = 'info' }: { label: string; value?: string | null; icon: string; color?: 'info' | 'warning' | 'primary' | 'success' | 'secondary' }) {
    return (
        <Box
            sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: (theme) => alpha(theme.palette[color].main, 0.04),
                border: (theme) => `1px solid ${alpha(theme.palette[color].main, 0.12)}`,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                minWidth: 0,
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    bgcolor: (theme) => alpha(theme.palette[color].main, 0.12),
                    color: (theme) => theme.palette[color].main,
                    flexShrink: 0,
                }}
            >
                <Iconify icon={icon as any} width={20} />
            </Box>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography
                    variant="caption"
                    sx={{
                        color: 'text.secondary',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        display: 'block',
                        fontSize: 11,
                        mb: 0.2,
                    }}
                >
                    {label}
                </Typography>
                <Typography
                    variant="subtitle2"
                    sx={{
                        fontWeight: 800,
                        color: 'text.primary',
                        fontSize: '14px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {value || '-'}
                </Typography>
            </Box>
        </Box>
    );
}
