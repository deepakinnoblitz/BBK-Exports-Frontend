import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';
import type { WorkforceShiftItem } from 'src/api/dashboard';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { fNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
    title?: string;
    subheader?: string;
    data: WorkforceShiftItem[];
    loading?: boolean;
};

const SHIFT_ICONS: Record<string, string> = {
    'Morning Shift': 'solar:sun-2-bold',
    'Afternoon Shift': 'solar:sunset-bold',
    'Night Shift': 'solar:moon-bold',
    'General Shift': 'solar:clock-circle-bold',
};

const SHIFT_COLORS: Record<string, string> = {
    'Morning Shift': '#f59e0b',    // Amber / Sun
    'Afternoon Shift': '#3b82f6',  // Blue / Day
    'Night Shift': '#6366f1',      // Indigo / Night
    'General Shift': '#10b981',    // Emerald
};

export function ShiftWiseChart({
    title = 'Shift-Wise Distribution',
    subheader = 'Workforce allocation across working shifts',
    data = [],
    loading,
    sx,
    ...other
}: Props) {
    const theme = useTheme();

    const chartColors = data.map(
        (item) => SHIFT_COLORS[item.shift] || theme.palette.primary.main
    );

    const chartSeries = data.map((item) => item.total);
    const chartLabels = data.map((item) => item.shift);
    const totalHeadcount = chartSeries.reduce((acc, curr) => acc + curr, 0);

    const chartOptions: ChartOptions = useChart({
        colors: chartColors,
        labels: chartLabels,
        stroke: { width: 2, colors: [theme.palette.background.paper] },
        dataLabels: { enabled: false },
        legend: { show: false },
        tooltip: {
            fillSeriesColor: false,
            y: {
                formatter: (value: number) => `${fNumber(value)} employees`,
                title: { formatter: (seriesName: string) => `${seriesName}: ` },
            },
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '72%',
                    labels: {
                        show: true,
                        value: {
                            formatter: (val: number | string) => fNumber(Number(val)),
                            fontSize: '22px',
                            fontWeight: 800,
                            color: theme.palette.text.primary,
                        },
                        total: {
                            show: true,
                            label: 'Total Employees',
                            color: theme.palette.text.secondary,
                            fontSize: '12px',
                            fontWeight: 600,
                            formatter: () => fNumber(totalHeadcount),
                        },
                    },
                },
            },
        },
    });

    return (
        <Card
            sx={{
                border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.12)}`,
                boxShadow: (t) => t.customShadows?.card,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                ...sx,
            }}
            {...other}
        >
            <CardHeader
                title={
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Box>
                            <Typography variant="h6">{title}</Typography>
                        </Box>
                    </Stack>
                }
                subheader={subheader}
            />

            <Box sx={{ flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {data.length > 0 && totalHeadcount > 0 ? (
                    <>
                        <Box sx={{ my: 1, display: 'flex', justifyContent: 'center' }}>
                            <Chart
                                type="donut"
                                series={chartSeries}
                                options={chartOptions}
                                sx={{
                                    width: 220,
                                    height: 220,
                                }}
                            />
                        </Box>

                        <Stack spacing={1.5} sx={{ mt: 2 }}>
                            {data.map((item) => {
                                const pct = totalHeadcount > 0 ? Math.round((item.total / totalHeadcount) * 100) : 0;
                                const color = SHIFT_COLORS[item.shift] || theme.palette.primary.main;
                                const icon = SHIFT_ICONS[item.shift] || 'solar:clock-circle-bold';

                                return (
                                    <Box
                                        key={item.shift}
                                        sx={{
                                            p: 1.25,
                                            borderRadius: 1.25,
                                            bgcolor: alpha(color, 0.06),
                                            border: `1px solid ${alpha(color, 0.18)}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <Stack direction="row" alignItems="center" spacing={1.25}>
                                            <Box
                                                sx={{
                                                    p: 0.6,
                                                    borderRadius: 1,
                                                    bgcolor: alpha(color, 0.16),
                                                    color,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <Iconify icon={icon as any} width={18} />
                                            </Box>
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                                                    {item.shift}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {pct}% of workforce
                                                </Typography>
                                            </Box>
                                        </Stack>

                                        <Box sx={{ textAlign: 'right' }}>
                                            <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                                                {fNumber(item.total)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Active Employees
                                            </Typography>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Stack>
                    </>
                ) : (
                    <Box
                        sx={{
                            height: 280,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'text.secondary',
                        }}
                    >
                        <Iconify icon="solar:ghost-bold" width={48} sx={{ mb: 1, opacity: 0.5 }} />
                        <Typography variant="body2">No shift data available</Typography>
                    </Box>
                )}
            </Box>
        </Card>
    );
}
