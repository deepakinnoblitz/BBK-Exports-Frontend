import type { CardProps } from '@mui/material/Card';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import CircularProgress from '@mui/material/CircularProgress';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
    title: string;
    subheader?: string;
    data: Array<{ date: string; day: string; count: number }>;
    loading?: boolean;
};

export function WeeklyPresentChart({ title, subheader, data, loading, sx, ...other }: Props) {
    const theme = useTheme();

    // Prepare chart data - use day names for x-axis
    const categories = data.map((item) => item.day);
    const series = data.map((item) => item.count || 0);

    const maxValue = Math.max(...series, 0);

    const chartOptions = useChart({
        chart: {
            type: 'bar',
            toolbar: { show: false },
            background: 'transparent',
        },
        colors: ['#22C55E'],
        plotOptions: {
            bar: {
                borderRadius: 8,
                columnWidth: '50%',
                distributed: false,
                dataLabels: {
                    position: 'top',
                },
            },
        },
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'light',
                type: 'vertical',
                shadeIntensity: 0.25,
                gradientToColors: ['#4ADE80'],
                inverseColors: false,
                opacityFrom: 0.95,
                opacityTo: 0.85,
                stops: [0, 100],
            },
        },
        xaxis: {
            categories,
            labels: {
                style: {
                    colors: theme.palette.text.secondary,
                    fontSize: '12px',
                    fontWeight: 500,
                },
            },
            axisBorder: {
                show: false,
            },
            axisTicks: {
                show: false,
            },
        },
        yaxis: {
            min: 0,
            max: maxValue + 1, // Ensure headroom for labels
            title: {
                text: 'Present Count',
                offsetX: 10,
                style: {
                    color: theme.palette.text.secondary,
                    fontSize: '12px',
                    fontWeight: 600,
                },
            },
            labels: {
                formatter: (value: number) => Math.round(value).toString(),
                style: {
                    colors: theme.palette.text.secondary,
                    fontSize: '12px',
                },
            },
        },
        tooltip: {
            theme: theme.palette.mode,
            y: {
                formatter: (value: number) => `${Math.round(value)} employee${value !== 1 ? 's' : ''}`,
            },
            style: {
                fontSize: '13px',
            },
        },
        dataLabels: {
            enabled: true,
            offsetY: -25,
            style: {
                fontSize: '12px',
                fontWeight: 700,
                colors: ['#22C55E'],
            },
            formatter: (value: number) => Math.round(value).toString(),
        },
        grid: {
            borderColor: alpha(theme.palette.grey[500], 0.12),
            strokeDashArray: 3,
            xaxis: {
                lines: {
                    show: false,
                },
            },
            yaxis: {
                lines: {
                    show: true,
                },
            },
            padding: {
                top: 20,
                right: 10,
                bottom: 0,
                left: 0,
            },
        },
        states: {
            hover: {
                filter: {
                    type: 'darken',
                },
            },
            active: {
                filter: {
                    type: 'darken',
                },
            },
        },
    });

    return (
        <Card
            sx={[
                {
                    p: 3,
                    boxShadow: (t) => t.customShadows?.card,
                    border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.08)}`,
                },
                ...(Array.isArray(sx) ? sx : [sx]),
            ]}
            {...other}
        >
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 0.5 }}>
                    {title}
                </Typography>
                {subheader && (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {subheader}
                    </Typography>
                )}
            </Box>

            {loading ? (
                <Box
                    sx={{
                        height: 280,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <CircularProgress color="primary" />
                </Box>
            ) : data.length > 0 ? (
                <Chart
                    type="bar"
                    series={[{ name: 'Present Count', data: series }]}
                    options={chartOptions}
                    sx={{ height: 280 }}
                />
            ) : (
                <Box
                    sx={{
                        height: 280,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'text.secondary',
                    }}
                >
                    <Typography variant="body2">No present count data available</Typography>
                </Box>
            )}
        </Card>
    );
}
