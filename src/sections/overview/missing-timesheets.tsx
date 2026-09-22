import type { CardProps } from '@mui/material/Card';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha, styled, useTheme } from '@mui/material/styles';

import { useRouter } from 'src/routes/hooks';

import { fDate } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const StyledHeatmapCell = styled(Box)(({ theme }) => ({
    width: 14,
    height: 14,
    borderRadius: 3,
    cursor: 'pointer',
    transition: theme.transitions.create(['background-color', 'transform', 'box-shadow']),
    '&:hover': {
        transform: 'scale(1.3)',
        boxShadow: (themeVar: any) => themeVar.customShadows?.z8,
        zIndex: 1,
    },
}));

const StyledLogCard = styled(Box)(({ theme }) => ({
    padding: theme.spacing(1.5),
    borderRadius: theme.shape.borderRadius * 1.5,
    backgroundColor: alpha(theme.palette.grey[500], 0.04),
    border: `1px solid ${alpha(theme.palette.grey[500], 0.08)}`,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
    transition: theme.transitions.create([
        'transform',
        'box-shadow',
        'background-color',
        'border-color',
    ]),
    '&:hover': {
        transform: 'translateY(-4px)',
        backgroundColor: theme.palette.background.paper,
        boxShadow: (themeVar: any) => themeVar.customShadows?.z8,
        borderColor: alpha(theme.palette.primary.main, 0.2),
    },
}));

// ----------------------------------------------------------------------

type MissingTimesheet = {
    date: string;
};

type Holiday = {
    date: string;
    description: string;
};

type Props = CardProps & {
    title: string;
    data: MissingTimesheet[];
    holidays: Holiday[];
    leave_dates?: string[];
};

export function MissingTimesheets({ title, data, holidays, leave_dates = [], sx, ...other }: Props) {
    const theme = useTheme();
    const router = useRouter();

    const handleLogDate = (date: string) => {
        router.push(`/timesheets?date=${date}&action=new`);
    };

    const handleLogAll = () => {
        router.push('/timesheets');
    };

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const daysInMonth = useMemo(() => {
        const date = new Date(currentYear, currentMonth + 1, 0);
        return date.getDate();
    }, [currentYear, currentMonth]);

    const monthDays = useMemo(() => {
        const days = [];
        const holidayDates = new Set(holidays.map((h) => h.date));
        const leaveDatesSet = new Set(leave_dates);

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(currentYear, currentMonth, i);
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

            const isMissing = data.some((item) => item.date === dateStr);
            const isToday = new Date().toISOString().split('T')[0] === dateStr;
            const isPast = new Date(dateStr) < new Date(new Date().toISOString().split('T')[0]);

            // Identifying non-working days: Sundays (0) or explicitly listed holidays
            const isWeekend = date.getDay() === 0;
            const isHoliday = holidayDates.has(dateStr);
            const isLeave = leaveDatesSet.has(dateStr);
            const isNonWorking = isWeekend || isHoliday;

            days.push({ day: i, date: dateStr, isMissing, isToday, isPast, isNonWorking, isLeave });
        }
        return days;
    }, [currentYear, currentMonth, daysInMonth, data, holidays, leave_dates]);

    const pastWorkingDays = useMemo(
        () => monthDays.filter((day) => (day.isPast || day.isToday) && !day.isNonWorking && !day.isLeave).length,
        [monthDays]
    );

    const logsSubmitted = Math.max(0, pastWorkingDays - data.length);
    const completionRate =
        pastWorkingDays > 0 ? Math.round((logsSubmitted / pastWorkingDays) * 100) : 100;

    const getHeatmapColor = (day: any) => {
        if (day.isMissing) return theme.palette.error.light;
        if (day.isLeave) return '#00B8D9';
        if (day.isToday) return alpha(theme.palette.primary.main, 0.4);
        if (!day.isPast) return alpha(theme.palette.grey[500], 0.1);
        if (day.isNonWorking) return alpha(theme.palette.grey[500], 0.2);
        return theme.palette.success.light;
    };

    const aiMessage = useMemo(() => {
        if (data.length === 0)
            return 'Impressive! Your timesheets are flawless. Keep up the high standard!';
        if (data.length < 3)
            return 'Almost there! Just a couple of logs missing. Close them out to stay 100% compliant.';
        if (data.length < 7)
            return 'Gentle reminder: You have a few logs pending from this week. Try to catch up today!';
        return `You have ${data.length} logs to catch up on. Let's tackle the oldest ones first to stay on track.`;
    }, [data.length]);

    return (
        <Card
            sx={[
                {
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    minHeight: 400,
                    background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.grey[500], 0.05)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.grey[500], 0.08)}`,
                },
                ...(Array.isArray(sx) ? sx : [sx]),
            ]}
            {...other}
        >
            {/* Header section with Progress Indicator */}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack spacing={0.5}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                        {title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        {fDate(new Date(), 'MMMM YYYY')} compliance status
                    </Typography>
                </Stack>

                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress
                        variant="determinate"
                        value={100}
                        size={56}
                        thickness={4}
                        sx={{ color: alpha(theme.palette.grey[500], 0.1) }}
                    />
                    <CircularProgress
                        variant="determinate"
                        value={completionRate}
                        size={56}
                        thickness={4}
                        sx={{
                            color:
                                completionRate > 80
                                    ? 'success.main'
                                    : completionRate > 50
                                        ? 'warning.main'
                                        : 'error.main',
                            position: 'absolute',
                            left: 0,
                            strokeLinecap: 'round',
                        }}
                    />
                    <Box
                        sx={{
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            position: 'absolute',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Typography
                            variant="caption"
                            sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.7rem' }}
                        >
                            {completionRate}%
                        </Typography>
                    </Box>
                </Box>
            </Stack>

            {/* AI Insight Box */}
            <Box
                sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    borderLeft: `4px solid ${theme.palette.primary.main}`,
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'flex-start',
                }}
            >
                <Iconify
                    icon="solar:bell-bing-bold-duotone"
                    width={24}
                    sx={{ color: 'primary.main', mt: 0.2, flexShrink: 0 }}
                />
                <Typography
                    variant="body2"
                    sx={{ color: 'text.primary', fontWeight: 600, lineHeight: 1.5 }}
                >
                    {aiMessage}
                </Typography>
            </Box>

            {/* Heatmap Visual */}
            <Box>
                <Typography
                    variant="overline"
                    sx={{ color: 'text.disabled', mb: 1.5, display: 'block', letterSpacing: 1.2 }}
                >
                    Submission Activity
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.8}>
                    {monthDays.map((day) => (
                        <Tooltip key={day.day} title={fDate(day.date)} arrow>
                            <StyledHeatmapCell
                                onClick={() => day.isMissing && handleLogDate(day.date)}
                                sx={{
                                    bgcolor: getHeatmapColor(day),
                                    border: day.isToday ? `1.5px solid ${theme.palette.primary.main}` : 'none',
                                    cursor: day.isMissing ? 'pointer' : 'default',
                                }}
                            />
                        </Tooltip>
                    ))}
                </Stack>
                <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                    {[
                        { color: theme.palette.success.light, label: 'Logged' },
                        { color: theme.palette.error.light, label: 'Missing' },
                        { color: '#00B8D9', label: 'On Leave' },
                        { color: alpha(theme.palette.grey[500], 0.1), label: 'Pending' },
                        { color: alpha(theme.palette.grey[500], 0.2), label: 'Non-working' },
                    ].map((legend) => (
                        <Stack key={legend.label} direction="row" alignItems="center" spacing={0.5}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: legend.color }} />
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                {legend.label}
                            </Typography>
                        </Stack>
                    ))}
                </Stack>
            </Box>

            {/* Actionable List */}
            {data.length > 0 ? (
                <Box>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                            Prioritized Missing Logs ({data.length})
                        </Typography>
                        <Button
                            size="small"
                            color="primary"
                            variant="outlined"
                            onClick={handleLogAll}
                            sx={{ borderRadius: 1, fontSize: '0.7rem', fontWeight: 800 }}
                        >
                            Log All
                        </Button>
                    </Stack>
                    <Box
                        sx={{
                            overflowX: 'auto',
                            pb: 1,
                            '&::-webkit-scrollbar': {
                                height: 6,
                            },
                            '&::-webkit-scrollbar-track': {
                                background: alpha(theme.palette.grey[500], 0.08),
                                borderRadius: 3,
                            },
                            '&::-webkit-scrollbar-thumb': {
                                background: alpha(theme.palette.primary.main, 0.24),
                                borderRadius: 3,
                                '&:hover': {
                                    background: alpha(theme.palette.primary.main, 0.4),
                                },
                            },
                        }}
                    >
                        <Stack direction="row" spacing={2} sx={{ minWidth: 'max-content' }}>
                            {data.slice(0, 3).map((item, index) => (
                                <StyledLogCard
                                    key={index}
                                    sx={{
                                        minWidth: 280,
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        gap: 1.5,
                                    }}
                                >
                                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: '100%' }}>
                                        <Box
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 1.5,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor:
                                                    index === 0
                                                        ? alpha(theme.palette.error.main, 0.1)
                                                        : alpha(theme.palette.warning.main, 0.1),
                                                color: index === 0 ? 'error.main' : 'warning.main',
                                            }}
                                        >
                                            <Iconify
                                                icon={
                                                    index === 0 ? 'solar:target-bold-duotone' : 'solar:clock-circle-bold-duotone'
                                                }
                                                width={24}
                                            />
                                        </Box>
                                        <Stack sx={{ flexGrow: 1 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                                {fDate(item.date, 'DD MMM YYYY')}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700 }}>
                                                {index === 0 ? 'CRITICAL: Oldest entry' : 'Log pending'}
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                    <Button
                                        fullWidth
                                        size="small"
                                        variant="contained"
                                        onClick={() => handleLogDate(item.date)}
                                        sx={{
                                            borderRadius: 1,
                                            fontWeight: 800,
                                            bgcolor: '#059669',
                                            color: 'common.white',
                                            '&:hover': {
                                                bgcolor: '#047857',
                                            }
                                        }}
                                    >
                                        Log Now
                                    </Button>
                                </StyledLogCard>
                            ))}
                        </Stack>
                    </Box>
                </Box>
            ) : (
                <Stack spacing={2} alignItems="center" sx={{ py: 4, textAlign: 'center' }}>
                    <Box
                        sx={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            bgcolor: alpha(theme.palette.success.main, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'success.main',
                        }}
                    >
                        <Iconify icon="solar:check-circle-bold" width={32} />
                    </Box>
                    <Stack>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                            Perfect Submission!
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            You&apos;ve submitted all timesheets for this month.
                        </Typography>
                    </Stack>
                </Stack>
            )}
        </Card>
    );
}
