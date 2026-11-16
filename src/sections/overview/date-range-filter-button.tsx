import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface DateRangeFilterButtonProps {
    startDate: Dayjs;
    endDate: Dayjs;
    onChange: (start: Dayjs, end: Dayjs, presetKey?: string) => void;
    onReset: () => void;
    disabled?: boolean;
    singleDate?: boolean;
    preset?: string;
}

export function DateRangeFilterButton({
    startDate,
    endDate,
    onChange,
    onReset,
    disabled = false,
    singleDate = false,
    preset,
}: DateRangeFilterButtonProps) {
    const theme = useTheme();

    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [tempStart, setTempStart] = useState<Dayjs | null>(startDate);
    const [tempEnd, setTempEnd] = useState<Dayjs | null>(endDate);
    const [activePreset, setActivePreset] = useState<string>(preset || (singleDate ? 'Today' : 'Last 7 Days'));

    useEffect(() => {
        if (preset) {
            setActivePreset(preset);
        }
    }, [preset]);

    const open = Boolean(anchorEl);

    const handleOpenPopover = (event: React.MouseEvent<HTMLButtonElement>) => {
        setTempStart(startDate);
        setTempEnd(endDate);
        if (startDate.isSame(endDate, 'day')) {
            if (startDate.isSame(dayjs(), 'day')) {
                setActivePreset('Today');
            } else if (startDate.isSame(dayjs().subtract(1, 'day'), 'day')) {
                setActivePreset('Yesterday');
            } else {
                setActivePreset('Custom');
            }
        }
        setAnchorEl(event.currentTarget);
    };

    const handleClosePopover = () => {
        setAnchorEl(null);
    };

    const presets = useMemo(() => {
        const now = dayjs();
        if (singleDate) {
            return [
                { key: 'Today', label: 'Today', start: now, end: now },
                { key: 'Yesterday', label: 'Yesterday', start: now.subtract(1, 'day'), end: now.subtract(1, 'day') },
            ];
        }
        return [
            { key: 'Today', label: 'Today', start: now, end: now },
            { key: 'Yesterday', label: 'Yesterday', start: now.subtract(1, 'day'), end: now.subtract(1, 'day') },
            { key: 'Last 7 Days', label: 'Last 7 Days', start: now.subtract(6, 'day'), end: now },
            { key: 'This Week', label: 'This Week', start: now.startOf('week'), end: now.endOf('week') },
            { key: 'This Month', label: 'This Month', start: now.startOf('month'), end: now.endOf('month') },
            { key: 'Last Month', label: 'Last Month', start: now.subtract(1, 'month').startOf('month'), end: now.subtract(1, 'month').endOf('month') },
        ];
    }, [singleDate]);

    const handleSelectPreset = (p: typeof presets[0]) => {
        setActivePreset(p.key);
        setTempStart(p.start);
        setTempEnd(p.end);
        onChange(p.start, p.end, p.key);
        handleClosePopover();
    };

    const handleApplyCustom = () => {
        if (singleDate) {
            if (tempStart) {
                setActivePreset('Custom');
                onChange(tempStart, tempStart, 'Custom');
                handleClosePopover();
            }
        } else if (tempStart && tempEnd) {
            const start = tempStart.isAfter(tempEnd) ? tempEnd : tempStart;
            const end = tempStart.isAfter(tempEnd) ? tempStart : tempEnd;
            setActivePreset('Custom');
            onChange(start, end, 'Custom');
            handleClosePopover();
        }
    };

    const handleResetClick = () => {
        const defaultPreset = singleDate ? 'Today' : 'Last 7 Days';
        setActivePreset(defaultPreset);
        onReset();
    };

    // Format display string matching exact design:
    // When preset (e.g. "Last 7 Days") is active on range: displays "Last 7 Days"
    // When single day: displays "Today: Nov 13, 2026" or "Nov 13, 2026"
    // When custom range: displays "Nov 01, 2026 - Nov 07, 2026"
    const displayText = useMemo(() => {
        if (activePreset && activePreset !== 'Custom') {
            if (singleDate) {
                const startStr = startDate.format('MMM DD, YYYY');
                if (activePreset === 'Today' || activePreset === 'Yesterday') {
                    return `${activePreset}: ${startStr}`;
                }
                return startStr;
            }
            if (activePreset === 'Today' || activePreset === 'Yesterday') {
                return `${activePreset}: ${startDate.format('MMM DD, YYYY')}`;
            }
            return activePreset;
        }
        const startStr = startDate.format('MMM DD, YYYY');
        const endStr = endDate.format('MMM DD, YYYY');
        if (startDate.isSame(endDate, 'day')) {
            if (startDate.isSame(dayjs(), 'day')) {
                return `Today: ${startStr}`;
            }
            return startStr;
        }
        return `${startStr} - ${endStr}`;
    }, [startDate, endDate, activePreset, singleDate]);

    return (
        <Stack direction="row" alignItems="center" spacing={1}>
            {/* Dark Charcoal / Navy Date Range Dropdown Button */}
            <Button
                variant="contained"
                onClick={handleOpenPopover}
                disabled={disabled}
                endIcon={<Iconify icon={"solar:alt-arrow-down-bold" as any} width={13} sx={{ color: '#ffffff', ml: -0.25 }} />}
                sx={{
                    bgcolor: '#1e293b',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    height: 38,
                    px: 1.75,
                    borderRadius: 1.25,
                    textTransform: 'none',
                    letterSpacing: 0.2,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
                    border: '1px solid #334155',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        bgcolor: '#0f172a',
                        borderColor: '#475569',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.28)',
                        transform: 'translateY(-1px)',
                    },
                    '&.Mui-disabled': {
                        bgcolor: alpha(theme.palette.grey[500], 0.12),
                        color: theme.palette.text.disabled,
                        border: `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
                    },
                }}
            >
                {displayText}
            </Button>

            {/* Emerald Green Reset Button */}
            <Button
                variant="contained"
                onClick={handleResetClick}
                disabled={disabled}
                sx={{
                    bgcolor: '#10b981',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    height: 38,
                    px: 2,
                    borderRadius: 1.25,
                    textTransform: 'none',
                    letterSpacing: 0.2,
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.28)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        bgcolor: '#059669',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.38)',
                        transform: 'translateY(-1px)',
                    },
                    '&.Mui-disabled': {
                        bgcolor: alpha(theme.palette.grey[500], 0.12),
                        color: theme.palette.text.disabled,
                    },
                }}
            >
                Reset
            </Button>

            {/* Date Range Popover */}
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClosePopover}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                PaperProps={{
                    sx: {
                        p: 2.25,
                        mt: 1,
                        width: { xs: 320, sm: 380 },
                        borderRadius: 2,
                        boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.18)',
                        border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.16)}`,
                    },
                }}
            >
                <Box sx={{ mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                        {singleDate ? 'Select Date' : 'Filter by Date Range'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {singleDate ? 'Choose a quick preset or select a date' : 'Choose a quick preset or customize your date range'}
                    </Typography>
                </Box>

                {/* Quick Presets */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                    {presets.map((p) => {
                        const isSelected = activePreset === p.key;
                        return (
                            <Chip
                                key={p.key}
                                label={p.label}
                                size="small"
                                clickable
                                onClick={() => handleSelectPreset(p)}
                                sx={{
                                    fontWeight: isSelected ? 700 : 500,
                                    fontSize: '0.75rem',
                                    height: 26,
                                    bgcolor: isSelected ? '#10b981' : alpha(theme.palette.grey[500], 0.08),
                                    color: isSelected ? '#ffffff' : 'text.primary',
                                    border: (t) => `1px solid ${isSelected ? '#10b981' : alpha(t.palette.grey[500], 0.2)}`,
                                    '&:hover': {
                                        bgcolor: isSelected ? '#059669' : alpha(theme.palette.grey[500], 0.16),
                                    },
                                }}
                            />
                        );
                    })}
                </Box>

                <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />

                {/* Custom Pickers */}
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                        <DatePicker
                            label={singleDate ? 'Date' : 'Start Date'}
                            value={tempStart}
                            onChange={(val) => {
                                setTempStart(val);
                                if (singleDate) {
                                    setTempEnd(val);
                                }
                            }}
                            format="DD-MM-YYYY"
                            slotProps={{
                                textField: {
                                    size: 'small',
                                    fullWidth: true,
                                    sx: { '& .MuiOutlinedInput-root': { borderRadius: 1.25 } },
                                },
                            }}
                        />
                        {!singleDate && (
                            <DatePicker
                                label="End Date"
                                value={tempEnd}
                                onChange={(val) => setTempEnd(val)}
                                format="DD-MM-YYYY"
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        fullWidth: true,
                                        sx: { '& .MuiOutlinedInput-root': { borderRadius: 1.25 } },
                                    },
                                }}
                            />
                        )}
                    </Stack>
                </LocalizationProvider>

                {/* Popover Action Buttons */}
                <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2.5 }}>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={handleClosePopover}
                        sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        onClick={handleApplyCustom}
                        disabled={singleDate ? !tempStart : (!tempStart || !tempEnd)}
                        sx={{
                            bgcolor: '#10b981',
                            color: '#fff',
                            borderRadius: 1,
                            textTransform: 'none',
                            fontWeight: 700,
                            '&:hover': { bgcolor: '#059669' },
                        }}
                    >
                        {singleDate ? 'Apply Date' : 'Apply Range'}
                    </Button>
                </Stack>
            </Popover>
        </Stack>
    );
}
