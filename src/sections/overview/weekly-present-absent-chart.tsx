import type { CardProps } from '@mui/material/Card';

import { FaFilter } from 'react-icons/fa';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { Iconify } from 'src/components/iconify';
import { EChartsBarChart, type ChartConfig } from 'src/components/evilcharts/charts/echarts-bar-chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
    title: string;
    subheader?: string;
    data: Array<{ date: string; day: string; present: number; absent: number }>;
    filter: string;
    onFilterChange: (filter: string, from?: string, to?: string) => void;
    loading?: boolean;
};

// Custom pill-style select trigger label map
const FILTER_LABELS: Record<string, string> = {
    'Last 7 Days': 'Last 7 Days',
    'This Month': 'This Month',
    'Last Month': 'Last Month',
    Custom: 'Custom Range',
};

const chartConfig = {
    present: {
        label: 'Present',
        colors: {
            light: ['#047857', '#10b981'],
            dark: ['#10b981', '#34d399'],
        },
    },
    absent: {
        label: 'Absent',
        colors: {
            light: ['#be123c', '#f43f5e'],
            dark: ['#f43f5e', '#fb7185'],
        },
    },
} satisfies ChartConfig;

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
    title,
    subheader: subheaderProp,
    data,
    filter,
    onFilterChange,
    loading,
    sx,
    ...other
}: Props) {
    const theme = useTheme();

    const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(6, 'day'));
    const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());

    // Trend calculations
    const totalPresent = useMemo(() => data.reduce((s, d) => s + (d.present || 0), 0), [data]);
    const totalAbsent = useMemo(() => data.reduce((s, d) => s + (d.absent || 0), 0), [data]);

    // Transform API data for EChartsBarChart
    const chartData = useMemo(() => data.map((item) => {
        const date = new Date(item.date);
        const dateStr = !Number.isNaN(date.getTime())
            ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : item.date;
        return {
            label: `${dateStr} ${item.day}`,
            present: item.present || 0,
            absent: item.absent || 0,
        };
    }), [data]);

    const handleFilterChange = useCallback(
        (value: string) => {
            if (value !== 'Custom') {
                onFilterChange(value);
            } else {
                onFilterChange(value, startDate?.format('YYYY-MM-DD'), endDate?.format('YYYY-MM-DD'));
            }
        },
        [onFilterChange, startDate, endDate]
    );

    const handleDateChange = (type: 'start' | 'end', newValue: Dayjs | null) => {
        if (type === 'start') {
            setStartDate(newValue);
            if (newValue && endDate && filter === 'Custom') {
                onFilterChange('Custom', newValue.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'));
            }
        } else {
            setEndDate(newValue);
            if (startDate && newValue && filter === 'Custom') {
                onFilterChange('Custom', startDate.format('YYYY-MM-DD'), newValue.format('YYYY-MM-DD'));
            }
        }
    };

    const pillDatePickerSx = {
        width: { xs: '100%', sm: 148 },
        '& .MuiOutlinedInput-root': {
            borderRadius: '20px',
            height: 36,
            fontSize: '13px',
            fontWeight: 500,
            bgcolor: alpha(theme.palette.grey[500], 0.06),
            transition: 'all 0.2s',
            '& fieldset': {
                borderColor: alpha(theme.palette.grey[500], 0.18),
                transition: 'border-color 0.2s',
            },
            '&:hover fieldset': {
                borderColor: theme.palette.primary.main,
            },
            '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
                borderWidth: '1.5px',
            },
        },
        '& .MuiInputLabel-root': {
            fontSize: '12px',
        },
    };

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
                {/* Left: Clean Title */}
                <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.3px', lineHeight: 1.3 }}>
                    {title}
                </Typography>

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
                                        bgcolor: '#047857',
                                        boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)',
                                    }}
                                />
                                <Typography variant="caption" fontWeight={600} color="text.secondary">
                                    Present
                                </Typography>
                                <Typography
                                    variant="caption"
                                    fontWeight={700}
                                    color="#047857"
                                    sx={{
                                        bgcolor: alpha('#10b981', 0.12),
                                        px: 0.8,
                                        py: 0.2,
                                        borderRadius: '6px',
                                    }}
                                >
                                    {totalPresent}
                                </Typography>
                            </Stack>

                            <Stack direction="row" alignItems="center" spacing={0.75}>
                                <Box
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        bgcolor: '#be123c',
                                        boxShadow: '0 0 6px rgba(244, 63, 94, 0.6)',
                                    }}
                                />
                                <Typography variant="caption" fontWeight={600} color="text.secondary">
                                    Absent
                                </Typography>
                                <Typography
                                    variant="caption"
                                    fontWeight={700}
                                    color="#be123c"
                                    sx={{
                                        bgcolor: alpha('#f43f5e', 0.12),
                                        px: 0.8,
                                        py: 0.2,
                                        borderRadius: '6px',
                                    }}
                                >
                                    {totalAbsent}
                                </Typography>
                            </Stack>
                        </Stack>
                    )}

                    {/* Custom range date pickers */}
                    {filter === 'Custom' && (
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    gap: 1,
                                    flexWrap: 'wrap',
                                    width: { xs: '100%', sm: 'auto' },
                                }}
                            >
                                <DatePicker
                                    label="From"
                                    value={startDate}
                                    onChange={(val) => handleDateChange('start', val)}
                                    slotProps={{
                                        textField: {
                                            size: 'small',
                                            sx: pillDatePickerSx,
                                        },
                                    }}
                                />
                                <DatePicker
                                    label="To"
                                    value={endDate}
                                    onChange={(val) => handleDateChange('end', val)}
                                    slotProps={{
                                        textField: {
                                            size: 'small',
                                            sx: pillDatePickerSx,
                                        },
                                    }}
                                />
                            </Box>
                        </LocalizationProvider>
                    )}

                    {/* Filter Selector */}
                    <Select
                        size="small"
                        value={filter}
                        onChange={(e) => handleFilterChange(e.target.value)}
                        startAdornment={<FaFilter size={13} style={{ marginRight: 8, color: '#64748B' }} />}
                        sx={{
                            minWidth: 145,
                            height: 36,
                            borderRadius: '20px',
                            fontWeight: 600,
                            fontSize: '13px',
                            bgcolor: alpha(theme.palette.grey[500], 0.06),
                            transition: 'all 0.2s',
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: alpha(theme.palette.grey[500], 0.18),
                                transition: 'border-color 0.2s',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: theme.palette.primary.main,
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: theme.palette.primary.main,
                                borderWidth: '1.5px',
                            },
                        }}
                    >
                        {Object.entries(FILTER_LABELS).map(([value, label]) => (
                            <MenuItem key={value} value={value} sx={{ fontSize: '13px', fontWeight: 500 }}>
                                {label}
                            </MenuItem>
                        ))}
                    </Select>
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
                    <EChartsBarChart data={chartData} config={chartConfig} height={320}>
                        <EChartsBarChart.Grid />
                        <EChartsBarChart.XAxis dataKey="label" />
                        <EChartsBarChart.YAxis label="Employees" />
                        <EChartsBarChart.Tooltip />
                        <EChartsBarChart.Bar
                            dataKey="present"
                            variant="default"
                            isClickable
                            radius={[6, 6, 0, 0]}
                        />
                        <EChartsBarChart.Bar
                            dataKey="absent"
                            variant="default"
                            glowing
                            isClickable
                            radius={[6, 6, 0, 0]}
                        />
                    </EChartsBarChart>
                </Box>
            ) : (
                <EmptyState />
            )}
        </Card>
    );
}
