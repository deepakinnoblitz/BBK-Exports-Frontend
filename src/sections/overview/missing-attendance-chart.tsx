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
    data: Array<{ date: string; count: number }>;
    loading?: boolean;
};

export function MissingAttendanceChart({ title, subheader, data, loading, sx, ...other }: Props) {
    const theme = useTheme();

    // Prepare chart data
    const categories = data.map((item) => {
        const date = new Date(item.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const series = data.map((item) => item.count || 0);

    const chartOptions = useChart({
        chart: {
            type: 'bar',
            toolbar: { show: false },
            background: 'transparent',
        },
        colors: ['#FF5630'],
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
                gradientToColors: ['#FF8F6D'],
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
            title: {
                text: 'Missing Count',
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
                colors: ['#FF5630'],
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
                top: 10,
                right: 10,
                bottom: 0,
                left: 10,
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
                    series={[{ name: 'Missing Attendance', data: series }]}
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
                    <Typography variant="body2">No missing attendance data available</Typography>
                </Box>
            )}
        </Card>
    );
}
