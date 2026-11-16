import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';

import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import CircularProgress from '@mui/material/CircularProgress';

import { fNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { Chart, useChart } from 'src/components/chart';

import { DateRangeFilterButton } from './date-range-filter-button';

// ----------------------------------------------------------------------

type Props = CardProps & {
    title?: string;
    subheader?: string;
    data: Array<{ date: string; day: string; present: number; absent: number; missing?: number }>;
    filter?: string;
    onFilterChange?: (filter: string, from?: string, to?: string) => void;
    startDate?: Dayjs;
    endDate?: Dayjs;
    preset?: string;
    onDateChange?: (start: Dayjs, end: Dayjs, presetKey?: string) => void;
    onResetDate?: () => void;
    loading?: boolean;
};

// Vibrant Emerald Green, Cherry Red, and Amber Orange matching Line-Wise Workforce chart
const EMERALD_GREEN = '#10b981';
const CHERRY_RED = '#e11d48';
const AMBER_ORANGE = '#f59e0b';

// ----------------------------------------------------------------------

function EmptyState() {
    const theme = useTheme();
    return (
        <Box
            sx={{
                height: 280,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.grey[500], 0.04),
                border: `1.5px dashed ${alpha(theme.palette.grey[500], 0.18)}`,
                mx: 1,
                mb: 1,
            }}
        >
            <Box
                sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: alpha(theme.palette.primary.main, 0.6),
                    mb: 0.5,
                }}
            >
                <Iconify icon={"solar:chart-bold-duotone" as any} width={32} />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    No attendance data available
                </Typography>
                <Typography variant="body2" color="text.disabled" mt={0.5}>
                    Try changing the date range or filter
                </Typography>
            </Box>
        </Box>
    );
}

// ----------------------------------------------------------------------

export function WeeklyPresentAbsentChart({
    title = 'Attendance Summary (Present, Absent & Missing)',
    subheader,
    data = [],
    filter,
    onFilterChange,
    startDate,
    endDate,
    preset,
    onDateChange,
    onResetDate,
    loading,
    sx,
    ...other
}: Props) {
    const theme = useTheme();

    const [internalStart, setInternalStart] = useState<Dayjs>(startDate || dayjs().subtract(6, 'day'));
    const [internalEnd, setInternalEnd] = useState<Dayjs>(endDate || dayjs());
    const [internalPreset, setInternalPreset] = useState<string>(preset || filter || 'Last 7 Days');

    const activeStart = startDate || internalStart;
    const activeEnd = endDate || internalEnd;
    const activePreset = preset || internalPreset;

    const handleDateChange = (start: Dayjs, end: Dayjs, presetKey?: string) => {
        setInternalStart(start);
        setInternalEnd(end);
        if (presetKey) setInternalPreset(presetKey);

        if (onDateChange) {
            onDateChange(start, end, presetKey);
        } else if (onFilterChange) {
            const startStr = start.format('YYYY-MM-DD');
            const endStr = end.format('YYYY-MM-DD');
            onFilterChange(presetKey || 'Custom', startStr, endStr);
        }
    };

    const handleResetDate = () => {
        const end = dayjs();
        const start = dayjs().subtract(6, 'day');
        setInternalStart(start);
        setInternalEnd(end);
        setInternalPreset('Last 7 Days');

        if (onResetDate) {
            onResetDate();
        } else if (onDateChange) {
            onDateChange(start, end, 'Last 7 Days');
        } else if (onFilterChange) {
            onFilterChange('Last 7 Days', start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
        }
    };

    // Trend calculations
    const totalPresent = useMemo(() => data.reduce((s, d) => s + (d.present || 0), 0), [data]);
    const totalAbsent = useMemo(() => data.reduce((s, d) => s + (d.absent || 0), 0), [data]);
    const totalMissing = useMemo(() => data.reduce((s, d) => s + (d.missing || 0), 0), [data]);

    // Categories and series for ApexCharts
    const categories = useMemo(
        () =>
            data.map((item) => {
                const date = new Date(item.date);
                const dateStr = !Number.isNaN(date.getTime())
                    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : item.date;
                return `${dateStr} ${item.day}`;
            }),
        [data]
    );

    const series = useMemo(
        () => [
            {
                name: 'Present',
                data: data.map((d) => d.present || 0),
            },
            {
                name: 'Absent',
                data: data.map((d) => d.absent || 0),
            },
            {
                name: 'Missing',
                data: data.map((d) => d.missing || 0),
            },
        ],
        [data]
    );

    const chartOptions: ChartOptions = useChart({
        colors: [EMERALD_GREEN, CHERRY_RED, AMBER_ORANGE],
        stroke: { show: true, width: 2, colors: ['transparent'] },
        xaxis: {
            categories,
            labels: {
                style: {
                    fontSize: '12px',
                    fontWeight: 600,
                },
            },
        },
        yaxis: {
            labels: {
                formatter: (val: number) => `${fNumber(val)}`,
            },
        },
        tooltip: {
            shared: true,
            intersect: false,
            y: {
                formatter: (val: number) => `${fNumber(val)} ${Math.abs(val) === 1 ? 'employee' : 'employees'}`,
            },
        },
        plotOptions: {
            bar: {
                columnWidth: data.length > 15 ? '55%' : '38%',
                borderRadius: 4,
                dataLabels: {
                    position: 'top',
                },
            },
        },
        legend: {
            show: false,
        },
        dataLabels: {
            enabled: true,
            formatter: (val: number) => (val > 0 ? fNumber(val) : ''),
            offsetY: -20,
            style: {
                fontSize: '11px',
                colors: [theme.palette.text.secondary],
            },
        },
    });

    return (
        <Card
            sx={[
                {
                    p: 3,
                    borderRadius: '20px',
                    bgcolor: 'background.paper',
                    boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.05)',
                    border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                    transition: 'box-shadow 0.3s ease',
                    '&:hover': {
                        boxShadow: '0 8px 30px 0 rgba(0, 0, 0, 0.08)',
                    },
                    overflow: 'visible',
                },
                ...(Array.isArray(sx) ? sx : [sx]),
            ]}
            {...other}
        >
            {/* ── Top Header ── */}
            <Box
                sx={{
                    mb: 2.5,
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 2,
                }}
            >
                {/* Left: Clean Title & optional subheader */}
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.3px', lineHeight: 1.3 }}>
                        {title}
                    </Typography>
                    {subheader && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                            {subheader}
                        </Typography>
                    )}
                </Box>

                {/* Right: Filters & KPI Summary Badges */}
                <Box
                    sx={{
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                    }}
                >
                    {data.length > 0 && (
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Stack direction="row" alignItems="center" spacing={0.75}>
                                <Box
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        bgcolor: EMERALD_GREEN,
                                        boxShadow: `0 0 6px ${alpha(EMERALD_GREEN, 0.6)}`,
                                    }}
                                />
                                <Typography variant="caption" fontWeight={600} color="text.secondary">
                                    Present
                                </Typography>
                                <Typography
                                    variant="caption"
                                    fontWeight={700}
                                    color={EMERALD_GREEN}
                                    sx={{
                                        bgcolor: alpha(EMERALD_GREEN, 0.12),
                                        px: 0.8,
                                        py: 0.2,
                                        borderRadius: '6px',
                                    }}
                                >
                                    {fNumber(totalPresent)}
                                </Typography>
                            </Stack>

                            <Stack direction="row" alignItems="center" spacing={0.75}>
                                <Box
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        bgcolor: CHERRY_RED,
                                        boxShadow: `0 0 6px ${alpha(CHERRY_RED, 0.6)}`,
                                    }}
                                />
                                <Typography variant="caption" fontWeight={600} color="text.secondary">
                                    Absent
                                </Typography>
                                <Typography
                                    variant="caption"
                                    fontWeight={700}
                                    color={CHERRY_RED}
                                    sx={{
                                        bgcolor: alpha(CHERRY_RED, 0.12),
                                        px: 0.8,
                                        py: 0.2,
                                        borderRadius: '6px',
                                    }}
                                >
                                    {fNumber(totalAbsent)}
                                </Typography>
                            </Stack>

                            <Stack direction="row" alignItems="center" spacing={0.75}>
                                <Box
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        bgcolor: AMBER_ORANGE,
                                        boxShadow: `0 0 6px ${alpha(AMBER_ORANGE, 0.6)}`,
                                    }}
                                />
                                <Typography variant="caption" fontWeight={600} color="text.secondary">
                                    Missing
                                </Typography>
                                <Typography
                                    variant="caption"
                                    fontWeight={700}
                                    color={AMBER_ORANGE}
                                    sx={{
                                        bgcolor: alpha(AMBER_ORANGE, 0.12),
                                        px: 0.8,
                                        py: 0.2,
                                        borderRadius: '6px',
                                    }}
                                >
                                    {fNumber(totalMissing)}
                                </Typography>
                            </Stack>
                        </Stack>
                    )}

                    <DateRangeFilterButton
                        startDate={activeStart}
                        endDate={activeEnd}
                        preset={activePreset}
                        onChange={handleDateChange}
                        onReset={handleResetDate}
                        disabled={loading}
                    />
                </Box>
            </Box>

            {/* ── Chart Container ── */}
            {loading ? (
                <Box
                    sx={{
                        height: 320,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <CircularProgress color="primary" />
                </Box>
            ) : data.length > 0 ? (
                <Box sx={{ width: '100%', height: 320 }}>
                    <Chart
                        type="bar"
                        series={series}
                        options={chartOptions}
                        slotProps={{ loading: { p: 2.5 } }}
                        sx={{ height: 320 }}
                    />
                </Box>
            ) : (
                <EmptyState />
            )}
        </Card>
    );
}
