import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';
import type { SkillMatrixGroupItem, SkillDistributionItem } from 'src/api/dashboard';

import { useMemo, useState } from 'react';

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
import { Chart, useChart } from 'src/components/chart';

import { ChartEmptyState } from './chart-empty-state';

// ----------------------------------------------------------------------

type Props = CardProps & {
    title?: string;
    subheader?: string;
    totalWorkers: number;
    overall: SkillDistributionItem[];
    lineMatrix: SkillMatrixGroupItem[];
    departmentMatrix: SkillMatrixGroupItem[];
    summary?: Record<string, number>;
    loading?: boolean;
};

const KNOWN_SKILL_COLORS: Record<string, string> = {
    'Highly Skilled': '#10b981',  // Emerald Green
    'Skilled': '#3b82f6',         // Blue
    'Semi Skilled': '#f59e0b',    // Amber
    'Unskilled': '#64748b',       // Slate Grey
    'Unassigned': '#94a3b8',      // Muted Slate
};

const EXTENDED_PALETTE = [
    '#8b5cf6', // Purple
    '#ec4899', // Pink / Rose
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#14b8a6', // Teal
    '#6366f1', // Indigo
    '#eab308', // Yellow
    '#d946ef', // Fuchsia
    '#84cc16', // Lime
];

function getSkillColor(skillName: string, index = 0): string {
    const trimmed = (skillName || '').trim();
    if (KNOWN_SKILL_COLORS[trimmed]) {
        return KNOWN_SKILL_COLORS[trimmed];
    }
    return EXTENDED_PALETTE[index % EXTENDED_PALETTE.length];
}

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

    const activeData = useMemo(() => {
        if (isLine) {
            return (lineMatrix || [])
                .filter((d) => {
                    if (!d || !d.line) return false;
                    const trimmed = d.line.trim().toLowerCase();
                    return trimmed !== '' && trimmed !== 'unassigned' && trimmed !== 'none' && trimmed !== 'null';
                })
                .map((d) => {
                    let formattedLine = (d.line || '').trim();
                    const match = formattedLine.match(/^L\s*(\d+)$/i);
                    if (match) {
                        formattedLine = `Line ${match[1]}`;
                    }
                    return {
                        ...d,
                        line: formattedLine,
                    };
                })
                .sort((a, b) => {
                    const lineA = a.line || '';
                    const lineB = b.line || '';
                    const numA = parseInt(lineA.replace(/\D/g, ''), 10);
                    const numB = parseInt(lineB.replace(/\D/g, ''), 10);
                    if (!isNaN(numA) && !isNaN(numB)) {
                        return numA - numB;
                    }
                    return lineA.localeCompare(lineB, undefined, { numeric: true, sensitivity: 'base' });
                });
        }
        return (departmentMatrix || []).filter((d) => {
            if (!d || !d.department) return false;
            const trimmed = d.department.trim().toLowerCase();
            return trimmed !== '' && trimmed !== 'unassigned' && trimmed !== 'none' && trimmed !== 'null';
        });
    }, [isLine, lineMatrix, departmentMatrix]);

    // Filter display skills (hide Unassigned if count is 0)
    const displaySkills = useMemo(
        () =>
            (overall || []).filter((item) => {
                if (!item || !item.skill) return false;
                if (item.skill.toLowerCase() === 'unassigned' && item.count === 0) return false;
                return true;
            }),
        [overall]
    );

    // Distinct skill names for series and chart
    const skillList = useMemo(() => {
        const names = displaySkills.map((d) => d.skill);
        return names.length > 0 ? names : ['Highly Skilled', 'Skilled', 'Semi Skilled', 'Unskilled'];
    }, [displaySkills]);

    const categories = activeData.map((d) => (isLine ? (d.line || '') : (d.department || 'Unassigned')));

    const series = useMemo(
        () =>
            skillList.map((skillName) => ({
                name: skillName,
                data: activeData.map((d) => (d as Record<string, any>)[skillName] || 0),
            })),
        [skillList, activeData]
    );

    const chartColors = useMemo(
        () => skillList.map((s, idx) => getSkillColor(s, idx)),
        [skillList]
    );

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
                    {/* 1. Total Workers Badge (Distinct Indigo/Violet) */}
                    <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 1.5,
                                bgcolor: alpha('#6366f1', 0.06),
                                border: `1px solid ${alpha('#6366f1', 0.24)}`,
                            }}
                        >
                            <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 800, textTransform: 'uppercase', fontSize: 10 }}>
                                Total Workers
                            </Typography>
                            <Typography variant="h5" fontWeight={800} sx={{ color: '#4338ca', mt: 0.25 }}>
                                {fNumber(totalWorkers)}
                            </Typography>
                            <Label
                                variant="soft"
                                sx={{
                                    mt: 0.5,
                                    fontSize: 10,
                                    height: 18,
                                    fontWeight: 700,
                                    bgcolor: alpha('#6366f1', 0.12),
                                    color: '#6366f1',
                                }}
                            >
                                100% Workforce
                            </Label>
                        </Box>
                    </Grid>

                    {/* 2. Dynamic Master Skills Badges */}
                    {displaySkills.map((item, index) => {
                        const color = getSkillColor(item.skill, index);
                        return (
                            <Grid key={item.skill} size={{ xs: 6, sm: 4, md: 2.4 }}>
                                <Box
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 1.5,
                                        bgcolor: alpha(color, 0.06),
                                        border: `1px solid ${alpha(color, 0.24)}`,
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        noWrap
                                        sx={{
                                            color,
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            fontSize: 10,
                                            display: 'block',
                                        }}
                                        title={item.skill}
                                    >
                                        {item.skill}
                                    </Typography>
                                    <Typography variant="h5" fontWeight={800} sx={{ color, mt: 0.25 }}>
                                        {fNumber(item.count || 0)}
                                    </Typography>
                                    <Label
                                        variant="soft"
                                        sx={{
                                            mt: 0.5,
                                            fontSize: 10,
                                            height: 18,
                                            fontWeight: 700,
                                            bgcolor: alpha(color, 0.12),
                                            color,
                                        }}
                                    >
                                        {item.percentage}% of Workers
                                    </Label>
                                </Box>
                            </Grid>
                        );
                    })}
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
                    <ChartEmptyState
                        height={340}
                        icon="solar:target-bold-duotone"
                        title="No skill matrix records available"
                        description="Skill level distribution will appear once worker profiles are updated"
                    />
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

                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                    {displaySkills.map((item, idx) => {
                        const color = getSkillColor(item.skill, idx);
                        return (
                            <Stack key={item.skill} direction="row" alignItems="center" spacing={0.5} sx={{ my: 0.5 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                                <Typography variant="caption" fontWeight={600} color="text.secondary">
                                    {item.skill}
                                </Typography>
                            </Stack>
                        );
                    })}
                </Stack>
            </Stack>
        </Card>
    );
}
