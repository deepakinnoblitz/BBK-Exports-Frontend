import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';
import type { WorkforceDepartmentItem } from 'src/api/dashboard';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CardHeader from '@mui/material/CardHeader';
import ToggleButton from '@mui/material/ToggleButton';
import { alpha, useTheme } from '@mui/material/styles';
import LinearProgress from '@mui/material/LinearProgress';
import InputAdornment from '@mui/material/InputAdornment';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

// 24 Curated vibrant, distinct, accessible colors for multiple departments
const EXTENDED_PALETTE = [
    '#00A76F', // Emerald Green
    '#00B8D9', // Vivid Cyan
    '#FFAB00', // Amber Yellow
    '#22C55E', // Green
    '#FF5630', // Coral Red
    '#8E33FF', // Purple
    '#0284C7', // Sky Blue
    '#E11D48', // Rose Red
    '#10B981', // Mint
    '#F59E0B', // Orange
    '#6366F1', // Indigo
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Deep Orange
    '#8B5CF6', // Violet
    '#3B82F6', // Blue
    '#D946EF', // Fuchsia
    '#84CC16', // Lime
    '#06B6D4', // Cyan
    '#F43F5E', // Crimson
    '#64748B', // Slate
    '#A855F7', // Iris Purple
    '#EAB308', // Sunflower
    '#059669', // Forest Green
];

type Props = CardProps & {
    title?: string;
    subheader?: string;
    data: WorkforceDepartmentItem[];
    loading?: boolean;
};

export function DepartmentWiseChart({
    title = 'Department-Wise Distribution',
    subheader = 'Workforce allocation across departments',
    data = [],
    loading,
    sx,
    ...other
}: Props) {
    const theme = useTheme();

    const [viewMode, setViewMode] = useState<'donut' | 'breakdown'>('donut');
    const [searchTerm, setSearchTerm] = useState('');
    const [groupOthers, setGroupOthers] = useState<boolean>(true);

    // Sort departments by total headcount descending
    const sortedData = useMemo(
        () => [...data].sort((a, b) => b.total - a.total),
        [data]
    );

    const totalHeadcount = useMemo(
        () => sortedData.reduce((acc, curr) => acc + curr.total, 0),
        [sortedData]
    );

    // Map each department deterministically to a color
    const deptColorMap = useMemo(() => {
        const map: Record<string, string> = {};
        sortedData.forEach((item, idx) => {
            map[item.department] = EXTENDED_PALETTE[idx % EXTENDED_PALETTE.length];
        });
        map['Others'] = theme.palette.grey[500];
        return map;
    }, [sortedData, theme.palette.grey]);

    // Data for Donut chart: either all or top 6 + Others if multiple (> 7)
    const shouldShowGroupToggle = sortedData.length > 7;
    const donutData = useMemo(() => {
        if (!shouldShowGroupToggle || !groupOthers) {
            return sortedData.map((d) => ({
                label: d.department,
                value: d.total,
                color: deptColorMap[d.department] || theme.palette.primary.main,
            }));
        }

        const topCount = 6;
        const topDepts = sortedData.slice(0, topCount);
        const others = sortedData.slice(topCount);
        const othersSum = others.reduce((acc, curr) => acc + curr.total, 0);

        const list = topDepts.map((d) => ({
            label: d.department,
            value: d.total,
            color: deptColorMap[d.department] || theme.palette.primary.main,
        }));

        if (othersSum > 0) {
            list.push({
                label: `Others (${others.length})`,
                value: othersSum,
                color: deptColorMap['Others'],
            });
        }
        return list;
    }, [sortedData, shouldShowGroupToggle, groupOthers, deptColorMap, theme.palette.primary.main]);

    const chartSeries = donutData.map((item) => item.value);
    const chartLabels = donutData.map((item) => item.label);
    const chartColors = donutData.map((item) => item.color);

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
                            label: 'Total Active',
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

    // Filtered list for search
    const filteredDepartments = useMemo(() => {
        if (!searchTerm.trim()) return sortedData;
        const q = searchTerm.toLowerCase().trim();
        return sortedData.filter((item) => item.department.toLowerCase().includes(q));
    }, [sortedData, searchTerm]);

    const handleViewChange = (_event: React.MouseEvent<HTMLElement>, newView: 'donut' | 'breakdown' | null) => {
        if (newView !== null) {
            setViewMode(newView);
        }
    };

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
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                        <Typography variant="h6">{title}</Typography>
                        {sortedData.length > 0 && (
                            <Chip
                                size="small"
                                label={`${sortedData.length} Depts`}
                                sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                                    color: 'primary.main',
                                    borderRadius: '10px',
                                }}
                            />
                        )}
                    </Stack>
                }
                subheader={subheader}
                action={
                    sortedData.length > 0 && (
                        <ToggleButtonGroup
                            size="small"
                            value={viewMode}
                            exclusive
                            onChange={handleViewChange}
                            sx={{
                                p: '3px',
                                borderRadius: '24px',
                                bgcolor: (t) => alpha(t.palette.grey[500], 0.08),
                                border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.16)}`,
                                '& .MuiToggleButton-root': {
                                    px: 1.25,
                                    py: 0.4,
                                    borderRadius: '20px',
                                    border: 'none',
                                    typography: 'caption',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    color: 'text.secondary',
                                    transition: 'all 0.2s ease-in-out',
                                    gap: 0.5,
                                    '&.Mui-selected': {
                                        bgcolor: 'primary.main',
                                        color: 'primary.contrastText',
                                        boxShadow: (t) => `0 2px 8px ${alpha(t.palette.primary.main, 0.4)}`,
                                        '&:hover': {
                                            bgcolor: 'primary.dark',
                                        },
                                    },
                                },
                            }}
                        >
                            <ToggleButton value="donut">
                                <Iconify icon="solar:chart-2-bold" width={15} />
                                Donut
                            </ToggleButton>
                            <ToggleButton value="breakdown">
                                <Iconify icon="solar:list-bold" width={15} />
                                Breakdown
                            </ToggleButton>
                        </ToggleButtonGroup>
                    )
                }
            />

            <Box sx={{ flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column' }}>
                {sortedData.length > 0 && totalHeadcount > 0 ? (
                    viewMode === 'donut' ? (
                        <>
                            {/* Donut Chart View */}
                            <Box sx={{ my: 0.5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Chart
                                    type="donut"
                                    series={chartSeries}
                                    options={chartOptions}
                                    sx={{
                                        width: 210,
                                        height: 210,
                                    }}
                                />

                                {shouldShowGroupToggle && (
                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Donut:
                                        </Typography>
                                        <Chip
                                            size="small"
                                            clickable
                                            onClick={() => setGroupOthers(true)}
                                            label="Top 6 + Others"
                                            variant={groupOthers ? 'filled' : 'outlined'}
                                            color={groupOthers ? 'primary' : 'default'}
                                            sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                                        />
                                        <Chip
                                            size="small"
                                            clickable
                                            onClick={() => setGroupOthers(false)}
                                            label={`All (${sortedData.length})`}
                                            variant={!groupOthers ? 'filled' : 'outlined'}
                                            color={!groupOthers ? 'primary' : 'default'}
                                            sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                                        />
                                    </Stack>
                                )}
                            </Box>

                            {/* Search bar for multiple departments */}
                            {sortedData.length > 5 && (
                                <Box sx={{ mt: 1, mb: 0.75 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="Search department..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        slotProps={{
                                            input: {
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Iconify icon="eva:search-fill" width={15} sx={{ color: 'text.disabled' }} />
                                                    </InputAdornment>
                                                ),
                                                endAdornment: searchTerm ? (
                                                    <InputAdornment position="end">
                                                        <IconButton size="small" onClick={() => setSearchTerm('')} edge="end">
                                                            <Iconify icon="mingcute:close-line" width={14} />
                                                        </IconButton>
                                                    </InputAdornment>
                                                ) : null,
                                            },
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 1.5,
                                                bgcolor: (t) => alpha(t.palette.grey[500], 0.04),
                                                fontSize: '0.8rem',
                                                height: 32,
                                                px: 1,
                                            },
                                        }}
                                    />
                                </Box>
                            )}

                            {/* Department rows list - Clean, minimalist, compact rows with dashed borders */}
                            <Box sx={{ mt: 0.5 }}>
                                <Scrollbar sx={{ maxHeight: 220, pr: 0.5 }}>
                                    <Stack spacing={0}>
                                        {filteredDepartments.map((item) => {
                                            const pct = totalHeadcount > 0 ? ((item.total / totalHeadcount) * 100).toFixed(1) : '0';
                                            const color = deptColorMap[item.department] || theme.palette.primary.main;
                                            return (
                                                <Box
                                                    key={item.department}
                                                    sx={{
                                                        py: 0.8,
                                                        px: 0.75,
                                                        borderRadius: 0.75,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        borderBottom: (t) => `1px dashed ${alpha(t.palette.divider, 0.7)}`,
                                                        '&:last-of-type': { borderBottom: 'none' },
                                                        '&:hover': {
                                                            bgcolor: (t) => alpha(t.palette.grey[500], 0.06),
                                                        },
                                                        transition: 'background-color 0.15s ease',
                                                    }}
                                                >
                                                    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0, flexGrow: 1, mr: 1 }}>
                                                        <Box
                                                            sx={{
                                                                width: 9,
                                                                height: 9,
                                                                borderRadius: '50%',
                                                                bgcolor: color,
                                                                flexShrink: 0,
                                                            }}
                                                        />
                                                        <Tooltip title={item.department} arrow placement="top">
                                                            <Typography
                                                                variant="body2"
                                                                noWrap
                                                                sx={{
                                                                    fontWeight: 600,
                                                                    color: 'text.primary',
                                                                    fontSize: '0.8125rem',
                                                                }}
                                                            >
                                                                {item.department}
                                                            </Typography>
                                                        </Tooltip>
                                                    </Stack>

                                                    <Stack direction="row" alignItems="center" spacing={2} sx={{ flexShrink: 0 }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.8125rem', minWidth: 32, textAlign: 'right' }}>
                                                            {fNumber(item.total)}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, minWidth: 42, textAlign: 'right' }}>
                                                            {pct}%
                                                        </Typography>
                                                    </Stack>
                                                </Box>
                                            );
                                        })}
                                        {filteredDepartments.length === 0 && (
                                            <Typography variant="caption" color="text.secondary" align="center" sx={{ py: 2 }}>
                                                No departments matching &quot;{searchTerm}&quot;
                                            </Typography>
                                        )}
                                    </Stack>
                                </Scrollbar>
                            </Box>
                        </>
                    ) : (
                        <>
                            {/* Breakdown View (Ranked List with integrated subtle progress indicators) */}
                            <Box sx={{ mb: 1 }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Search by department name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    slotProps={{
                                        input: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Iconify icon="eva:search-fill" width={15} sx={{ color: 'text.disabled' }} />
                                                </InputAdornment>
                                            ),
                                            endAdornment: searchTerm ? (
                                                <InputAdornment position="end">
                                                    <IconButton size="small" onClick={() => setSearchTerm('')} edge="end">
                                                        <Iconify icon="mingcute:close-line" width={14} />
                                                    </IconButton>
                                                </InputAdornment>
                                            ) : null,
                                        },
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1.5,
                                            bgcolor: (t) => alpha(t.palette.grey[500], 0.04),
                                            fontSize: '0.8125rem',
                                            height: 34,
                                            px: 1,
                                        },
                                    }}
                                />
                            </Box>

                            <Scrollbar sx={{ maxHeight: 370, pr: 0.5 }}>
                                <Stack spacing={1}>
                                    {filteredDepartments.map((item, index) => {
                                        const pct = totalHeadcount > 0 ? ((item.total / totalHeadcount) * 100).toFixed(1) : '0';
                                        const color = deptColorMap[item.department] || theme.palette.primary.main;
                                        const rank = index + 1;

                                        return (
                                            <Box
                                                key={item.department}
                                                sx={{
                                                    p: 1.25,
                                                    borderRadius: 1.25,
                                                    bgcolor: (t) => alpha(t.palette.grey[500], 0.03),
                                                    border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.08)}`,
                                                    '&:hover': {
                                                        bgcolor: (t) => alpha(t.palette.grey[500], 0.06),
                                                        borderColor: alpha(color, 0.3),
                                                    },
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >
                                                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 0.75 }}>
                                                    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
                                                        <Box
                                                            sx={{
                                                                width: 20,
                                                                height: 20,
                                                                borderRadius: '50%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '0.68rem',
                                                                fontWeight: 800,
                                                                flexShrink: 0,
                                                                bgcolor:
                                                                    rank === 1
                                                                        ? alpha(theme.palette.warning.main, 0.18)
                                                                        : rank === 2
                                                                          ? alpha(theme.palette.info.main, 0.18)
                                                                          : rank === 3
                                                                            ? alpha(theme.palette.success.main, 0.18)
                                                                            : alpha(theme.palette.grey[500], 0.12),
                                                                color:
                                                                    rank === 1
                                                                        ? theme.palette.warning.dark
                                                                        : rank === 2
                                                                          ? theme.palette.info.dark
                                                                          : rank === 3
                                                                            ? theme.palette.success.dark
                                                                            : 'text.secondary',
                                                            }}
                                                        >
                                                            {rank}
                                                        </Box>
                                                        <Tooltip title={item.department} arrow placement="top">
                                                            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                                                                {item.department}
                                                            </Typography>
                                                        </Tooltip>
                                                    </Stack>

                                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
                                                        <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: '0.85rem' }}>
                                                            {fNumber(item.total)}{' '}
                                                            <Typography component="span" variant="caption" color="text.secondary">
                                                                ({pct}%)
                                                            </Typography>
                                                        </Typography>
                                                        {item.present !== undefined && item.present > 0 && (
                                                            <Chip
                                                                size="small"
                                                                label={`${item.present} present`}
                                                                sx={{
                                                                    height: 18,
                                                                    fontSize: '0.65rem',
                                                                    fontWeight: 600,
                                                                    bgcolor: (t) => alpha(t.palette.success.main, 0.1),
                                                                    color: 'success.main',
                                                                    borderRadius: '5px',
                                                                }}
                                                            />
                                                        )}
                                                    </Stack>
                                                </Stack>

                                                <LinearProgress
                                                    variant="determinate"
                                                    value={Number(pct)}
                                                    sx={{
                                                        height: 5,
                                                        borderRadius: 2.5,
                                                        bgcolor: (t) => alpha(t.palette.grey[500], 0.08),
                                                        '& .MuiLinearProgress-bar': {
                                                            bgcolor: color,
                                                            borderRadius: 2.5,
                                                        },
                                                    }}
                                                />
                                            </Box>
                                        );
                                    })}
                                    {filteredDepartments.length === 0 && (
                                        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                                            No departments matching &quot;{searchTerm}&quot;
                                        </Typography>
                                    )}
                                </Stack>
                            </Scrollbar>
                        </>
                    )
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
                        <Typography variant="body2">No department data available</Typography>
                    </Box>
                )}
            </Box>
        </Card>
    );
}
