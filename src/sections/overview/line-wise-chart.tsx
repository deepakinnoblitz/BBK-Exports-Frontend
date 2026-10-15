import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';
import type { WorkforceLineItem } from 'src/api/dashboard';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import { alpha, useTheme } from '@mui/material/styles';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
    title?: string;
    subheader?: string;
    data: WorkforceLineItem[];
    loading?: boolean;
};

export function LineWiseChart({ title = 'Line-Wise Workforce & Attendance', subheader = 'Live headcount and attendance across production lines', data = [], loading, sx, ...other }: Props) {
    const theme = useTheme();
    const [viewMode, setViewMode] = useState<'counts' | 'rate'>('counts');

    const handleViewChange = (_: React.MouseEvent<HTMLElement>, newView: 'counts' | 'rate' | null) => {
        if (newView !== null) {
            setViewMode(newView);
        }
    };

    const categories = data.map((d) => d.line.replace('Line ', 'L'));

    const countsSeries = [
        {
            name: 'Total Employees',
            data: data.map((d) => d.total),
        },
        {
            name: 'Present Today',
            data: data.map((d) => d.present),
        },
        {
            name: 'Absent Today',
            data: data.map((d) => d.absent),
        },
    ];

    const rateSeries = [
        {
            name: 'Attendance Rate (%)',
            data: data.map((d) => d.attendance_rate),
        },
    ];

    const isRate = viewMode === 'rate';

    // Cherry Red and Green matching the Attendance Chart above
    const CHERRY_RED = '#e11d48';
    const EMERALD_GREEN = '#10b981';
    const TOTAL_STAFF_COLOR = '#0284c7';

    const chartColors = isRate
        ? [EMERALD_GREEN]
        : [TOTAL_STAFF_COLOR, EMERALD_GREEN, CHERRY_RED];

    const chartOptions: ChartOptions = useChart({
        colors: chartColors,
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
                formatter: (val: number) => isRate ? `${val}%` : `${fNumber(val)}`,
            },
            max: isRate ? 100 : undefined,
        },
        tooltip: {
            shared: true,
            intersect: false,
            y: {
                formatter: (val: number) => isRate ? `${val}%` : `${fNumber(val)} employees`,
            },
        },
        plotOptions: {
            bar: {
                columnWidth: isRate ? '25%' : '38%',
                borderRadius: 4,
                dataLabels: {
                    position: 'top',
                },
            },
        },
        legend: {
            position: 'top',
            horizontalAlign: 'right',
            fontWeight: 600,
        },
        dataLabels: {
            enabled: true,
            formatter: (val: number) => (val > 0 ? (isRate ? `${val}%` : val) : ''),
            offsetY: -20,
            style: {
                fontSize: '11px',
                colors: [theme.palette.text.secondary],
            },
        },
    });

    const totalHeadcount = data.reduce((acc, curr) => acc + curr.total, 0);

    return (
        <Card
            sx={{
                border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.12)}`,
                boxShadow: (t) => t.customShadows?.card,
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
                action={
                    <ToggleButtonGroup
                        size="small"
                        value={viewMode}
                        exclusive
                        onChange={handleViewChange}
                        sx={{
                            p: '3px',
                            borderRadius: '24px',
                            bgcolor: (t) => alpha(t.palette.grey[500], 0.08),
                            border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.12)}`,
                            '& .MuiToggleButtonGroup-grouped': {
                                border: 0,
                                '&:not(:first-of-type)': {
                                    borderRadius: '20px',
                                },
                                '&:first-of-type': {
                                    borderRadius: '20px',
                                },
                            },
                            '& .MuiToggleButton-root': {
                                px: 1.75,
                                py: 0.5,
                                fontSize: 12,
                                fontWeight: 700,
                                textTransform: 'none',
                                borderRadius: '20px',
                                color: 'text.secondary',
                                transition: 'all 0.2s ease-in-out',
                                '&:hover': {
                                    bgcolor: 'transparent',
                                    color: 'text.primary',
                                },
                                '&.Mui-selected': {
                                    bgcolor: 'primary.main',
                                    color: '#ffffff',
                                    boxShadow: (t) => `0 2px 8px ${alpha(t.palette.primary.main, 0.35)}`,
                                    '&:hover': {
                                        bgcolor: 'primary.dark',
                                        color: '#ffffff',
                                    },
                                },
                            },
                        }}
                    >
                        <ToggleButton value="counts">Headcount & Attendance</ToggleButton>
                        <ToggleButton value="rate">Attendance %</ToggleButton>
                    </ToggleButtonGroup>
                }
            />

            <Box sx={{ p: 2.5, pb: 1 }}>
                {data.length > 0 ? (
                    <Chart
                        type="bar"
                        series={isRate ? rateSeries : countsSeries}
                        options={chartOptions}
                        slotProps={{ loading: { p: 2.5 } }}
                        sx={{ height: 320 }}
                    />
                ) : (
                    <Box
                        sx={{
                            height: 320,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'text.secondary',
                        }}
                    >
                        <Iconify icon="solar:ghost-bold" width={48} sx={{ mb: 1, opacity: 0.5 }} />
                        <Typography variant="body2">No line data available</Typography>
                    </Box>
                )}
            </Box>

            <Divider sx={{ borderStyle: 'dashed' }} />

            <Stack
                direction="row"
                divider={<Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />}
                sx={{ py: 1.5, px: 2.5 }}
            >
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: 10 }}>
                        Total Lines
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={800} color="text.primary">
                        {data.length}
                    </Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: 10 }}>
                        Total Assigned
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={800} color="primary.main">
                        {fNumber(totalHeadcount)}
                    </Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: 10 }}>
                        Average / Line
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={800} color="info.main">
                        {data.length > 0 ? Math.round(totalHeadcount / data.length) : 0}
                    </Typography>
                </Box>
            </Stack>
        </Card>
    );
}
