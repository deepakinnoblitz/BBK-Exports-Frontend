import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';
import type { SkillMatrixGroupItem, SkillDistributionItem } from 'src/api/dashboard';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import { alpha, useTheme } from '@mui/material/styles';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fNumber } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
    title?: string;
    subheader?: string;
    totalWorkers: number;
    overall: SkillDistributionItem[];
    lineMatrix: SkillMatrixGroupItem[];
    departmentMatrix: SkillMatrixGroupItem[];
    summary: {
        highly_skilled: number;
        skilled: number;
        semi_skilled: number;
        unskilled: number;
        unassigned: number;
    };
    loading?: boolean;
};

const SKILL_COLORS = {
    'Highly Skilled': '#10b981',  // Emerald
    'Skilled': '#3b82f6',         // Blue
    'Semi Skilled': '#f59e0b',    // Amber
    'Unskilled': '#64748b',       // Slate Grey
};

export function WorkersSkillMatrixChart({
    title = 'Workers Skill Matrix',
    subheader = 'Competency levels & manufacturing skill distribution across production lines',
    totalWorkers = 0,
    overall = [],
    lineMatrix = [],
    departmentMatrix = [],
    summary,
    loading,
    sx,
    ...other
}: Props) {
    const theme = useTheme();
    const [dimension, setDimension] = useState<'line' | 'department'>('line');

    const handleDimensionChange = (_: React.MouseEvent<HTMLElement>, newDim: 'line' | 'department' | null) => {
        if (newDim !== null) {
            setDimension(newDim);
        }
    };

    const isLine = dimension === 'line';
    const activeData = isLine ? lineMatrix : departmentMatrix;

    const categories = activeData.map((d) => (isLine ? (d.line || 'Unassigned').replace('Line ', 'L') : d.department || 'Unassigned'));

    const series = [
        {
            name: 'Highly Skilled',
            data: activeData.map((d) => d['Highly Skilled'] || 0),
        },
        {
            name: 'Skilled',
            data: activeData.map((d) => d['Skilled'] || 0),
        },
        {
            name: 'Semi Skilled',
            data: activeData.map((d) => d['Semi Skilled'] || 0),
        },
        {
            name: 'Unskilled',
            data: activeData.map((d) => d['Unskilled'] || 0),
        },
    ];

    const chartColors = [
        SKILL_COLORS['Highly Skilled'],
        SKILL_COLORS['Skilled'],
        SKILL_COLORS['Semi Skilled'],
        SKILL_COLORS['Unskilled'],
    ];

    const chartOptions: ChartOptions = useChart({
        chart: {
            stacked: true,
            stackType: 'normal',
        },
        colors: chartColors,
        stroke: { show: true, width: 2, colors: [theme.palette.background.paper] },
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
                formatter: (val: number) => `${fNumber(val)} workers`,
            },
        },
        plotOptions: {
            bar: {
                columnWidth: '45%',
                borderRadius: 4,
            },
        },
        legend: {
            position: 'top',
            horizontalAlign: 'right',
            fontWeight: 600,
            markers: {
                shape: 'circle',
                size: 6,
            },
        },
        dataLabels: {
            enabled: false,
        },
    });

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
                        value={dimension}
                        exclusive
                        onChange={handleDimensionChange}
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
                        <ToggleButton value="line">By Production Line</ToggleButton>
                        <ToggleButton value="department">By Department</ToggleButton>
                    </ToggleButtonGroup>
                }
            />

            {/* Quick Summary Metric Badges */}
            <Box sx={{ px: 2.5, pt: 2 }}>
                <Grid container spacing={1.5}>
                    <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 1.5,
                                bgcolor: (t) => alpha(t.palette.grey[500], 0.06),
                                border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.14)}`,
                            }}
                        >
                            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: 10 }}>
                                Total Workers
                            </Typography>
                            <Typography variant="h5" fontWeight={800} color="text.primary" sx={{ mt: 0.25 }}>
                                {fNumber(totalWorkers)}
                            </Typography>
                            <Label color="default" variant="soft" sx={{ mt: 0.5, fontSize: 10, height: 18, fontWeight: 700 }}>
                                100% Workforce
                            </Label>
                        </Box>
                    </Grid>

                    <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 1.5,
                                bgcolor: alpha(SKILL_COLORS['Highly Skilled'], 0.06),
                                border: `1px solid ${alpha(SKILL_COLORS['Highly Skilled'], 0.24)}`,
                            }}
                        >
                            <Typography variant="caption" sx={{ color: SKILL_COLORS['Highly Skilled'], fontWeight: 800, textTransform: 'uppercase', fontSize: 10 }}>
                                Highly Skilled
                            </Typography>
                            <Typography variant="h5" fontWeight={800} sx={{ color: SKILL_COLORS['Highly Skilled'], mt: 0.25 }}>
                                {fNumber(summary?.highly_skilled || 0)}
                            </Typography>
                            <Label color="success" variant="soft" sx={{ mt: 0.5, fontSize: 10, height: 18, fontWeight: 700 }}>
                                {totalWorkers > 0 ? Math.round(((summary?.highly_skilled || 0) / totalWorkers) * 100) : 0}% of Workers
                            </Label>
                        </Box>
                    </Grid>

                    <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 1.5,
                                bgcolor: alpha(SKILL_COLORS['Skilled'], 0.06),
                                border: `1px solid ${alpha(SKILL_COLORS['Skilled'], 0.24)}`,
                            }}
                        >
                            <Typography variant="caption" sx={{ color: SKILL_COLORS['Skilled'], fontWeight: 800, textTransform: 'uppercase', fontSize: 10 }}>
                                Skilled
                            </Typography>
                            <Typography variant="h5" fontWeight={800} sx={{ color: SKILL_COLORS['Skilled'], mt: 0.25 }}>
                                {fNumber(summary?.skilled || 0)}
                            </Typography>
                            <Label color="info" variant="soft" sx={{ mt: 0.5, fontSize: 10, height: 18, fontWeight: 700 }}>
                                {totalWorkers > 0 ? Math.round(((summary?.skilled || 0) / totalWorkers) * 100) : 0}% of Workers
                            </Label>
                        </Box>
                    </Grid>

                    <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 1.5,
                                bgcolor: alpha(SKILL_COLORS['Semi Skilled'], 0.06),
                                border: `1px solid ${alpha(SKILL_COLORS['Semi Skilled'], 0.24)}`,
                            }}
                        >
                            <Typography variant="caption" sx={{ color: SKILL_COLORS['Semi Skilled'], fontWeight: 800, textTransform: 'uppercase', fontSize: 10 }}>
                                Semi Skilled
                            </Typography>
                            <Typography variant="h5" fontWeight={800} sx={{ color: SKILL_COLORS['Semi Skilled'], mt: 0.25 }}>
                                {fNumber(summary?.semi_skilled || 0)}
                            </Typography>
                            <Label color="warning" variant="soft" sx={{ mt: 0.5, fontSize: 10, height: 18, fontWeight: 700 }}>
                                {totalWorkers > 0 ? Math.round(((summary?.semi_skilled || 0) / totalWorkers) * 100) : 0}% of Workers
                            </Label>
                        </Box>
                    </Grid>

                    <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 1.5,
                                bgcolor: alpha(SKILL_COLORS['Unskilled'], 0.06),
                                border: `1px solid ${alpha(SKILL_COLORS['Unskilled'], 0.24)}`,
                            }}
                        >
                            <Typography variant="caption" sx={{ color: SKILL_COLORS['Unskilled'], fontWeight: 800, textTransform: 'uppercase', fontSize: 10 }}>
                                Unskilled
                            </Typography>
                            <Typography variant="h5" fontWeight={800} sx={{ color: SKILL_COLORS['Unskilled'], mt: 0.25 }}>
                                {fNumber(summary?.unskilled || 0)}
                            </Typography>
                            <Label color="default" variant="soft" sx={{ mt: 0.5, fontSize: 10, height: 18, fontWeight: 700 }}>
                                {totalWorkers > 0 ? Math.round(((summary?.unskilled || 0) / totalWorkers) * 100) : 0}% of Workers
                            </Label>
                        </Box>
                    </Grid>
                </Grid>
            </Box>

            {/* Stacked Competency Bar Chart */}
            <Box sx={{ p: 2.5, pb: 1 }}>
                {activeData.length > 0 ? (
                    <Chart
                        type="bar"
                        series={series}
                        options={chartOptions}
                        slotProps={{ loading: { p: 2.5 } }}
                        sx={{ height: 340 }}
                    />
                ) : (
                    <Box
                        sx={{
                            height: 340,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'text.secondary',
                        }}
                    >
                        <Iconify icon="solar:ghost-bold" width={48} sx={{ mb: 1, opacity: 0.5 }} />
                        <Typography variant="body2">No skill matrix records available</Typography>
                    </Box>
                )}
            </Box>

            <Divider sx={{ borderStyle: 'dashed' }} />

            {/* Detailed Matrix Breakdown Footer */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems="center"
                sx={{ py: 1.5, px: 2.5, bgcolor: (t) => alpha(t.palette.grey[500], 0.02) }}
            >
                <Typography variant="caption" color="text.secondary">
                    Active Factory Workers Tracked: <strong>{totalWorkers} employees</strong> across {activeData.length} {isLine ? 'production lines' : 'departments'}
                </Typography>

                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: SKILL_COLORS['Highly Skilled'] }} />
                        <Typography variant="caption" fontWeight={600} color="text.secondary">Highly Skilled</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: SKILL_COLORS['Skilled'] }} />
                        <Typography variant="caption" fontWeight={600} color="text.secondary">Skilled</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: SKILL_COLORS['Semi Skilled'] }} />
                        <Typography variant="caption" fontWeight={600} color="text.secondary">Semi Skilled</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: SKILL_COLORS['Unskilled'] }} />
                        <Typography variant="caption" fontWeight={600} color="text.secondary">Unskilled</Typography>
                    </Stack>
                </Stack>
            </Stack>
        </Card>
    );
}
