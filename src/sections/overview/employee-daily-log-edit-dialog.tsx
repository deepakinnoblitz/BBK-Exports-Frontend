import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { FiEdit3 } from "react-icons/fi";
import { IoMdAdd } from "react-icons/io";
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

import { frappeRequest } from 'src/utils/csrf';
import { fDate, fTime, fDateTime, fDecimalHours } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

const STATUS_DISPLAY_MAP: Record<string, string> = {
    Available: 'Active',
    Busy: 'In client meeting',
    'Do Not Disturb': 'Team discussion',
    Break: 'Lunch Break',
    Away: 'Break',
    Offline: 'Offline - Logout',
    Inactive: 'Offline - Logout',
};

const SessionTimelineBar = ({ session, intervals = [], breaks = [], loginTime, logoutTime }: { session: any, intervals?: any[], breaks?: any[], loginTime?: string, logoutTime?: string }) => {
    const theme = useTheme();
    const [hoveredLegend, setHoveredLegend] = useState<string | null>(null);

    if (!session || !session.login_time) return null;

    const parseTime = (dateStr: string) => {
        if (!dateStr) return 0;
        let d = dayjs(dateStr);
        if (!d.isValid() && typeof dateStr === 'string' && dateStr.includes(':')) {
            d = dayjs(`2000-01-01 ${dateStr}`);
        }
        return d.isValid() ? d.unix() : 0;
    };

    const formatShortDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.round((seconds % 3600) / 60);
        if (hrs > 0) return `${hrs}h ${mins > 0 ? `${mins}m` : ''}`;
        return `${mins}m`;
    };

    const formattedTimeFromSec = (sec: number) => {
        if (!sec) return '';
        return dayjs.unix(sec).format('h:mm a');
    };

    const startSec = parseTime(loginTime || session.login_time);
    let endSec = (logoutTime || session.logout_time) ? parseTime(logoutTime || session.logout_time) : 0;
    if (!endSec && intervals && intervals.length > 0) {
        const lastInterval = intervals[intervals.length - 1];
        if (lastInterval.to_time) endSec = parseTime(lastInterval.to_time);
    }
    if (!endSec) endSec = dayjs().unix();
    if (endSec <= startSec) endSec = startSec + 3600;

    const totalDuration = Math.max(endSec - startSec, 1);

    const timePointsSet = new Set<number>();
    timePointsSet.add(startSec);
    timePointsSet.add(endSec);
    (intervals || []).forEach((int: any) => {
        timePointsSet.add(parseTime(int.from_time));
        if (int.to_time) timePointsSet.add(parseTime(int.to_time));
    });
    (breaks || []).forEach((brk: any) => {
        timePointsSet.add(parseTime(brk.break_start));
        if (brk.break_end) timePointsSet.add(parseTime(brk.break_end));
    });

    const sortedTimePoints = Array.from(timePointsSet)
        .filter(t => t >= startSec && t <= endSec)
        .sort((a, b) => a - b);

    const rawSegments: any[] = [];
    for (let i = 0; i < sortedTimePoints.length - 1; i++) {
        const from = sortedTimePoints[i];
        const to = sortedTimePoints[i + 1];
        if (from === to) continue;
        const mid = (from + to) / 2;
        const isInActive = (intervals || []).find((int: any) => {
            const iStart = parseTime(int.from_time);
            const iEnd = int.to_time ? parseTime(int.to_time) : endSec;
            return mid >= iStart && mid <= iEnd;
        });

        if (isInActive) {
            rawSegments.push({ from, to, type: 'Active', status: isInActive.status });
            continue;
        }

        const midBreak = (breaks || []).find((brk: any) => {
            const bStart = parseTime(brk.break_start);
            const bEnd = brk.break_end ? parseTime(brk.break_end) : endSec;
            return mid >= bStart && mid <= bEnd;
        });

        if (midBreak) {
            rawSegments.push({ from, to, type: 'Break', status: midBreak.source === 'Away' ? 'Away' : 'Break' });
        } else {
            rawSegments.push({ from, to, type: 'Offline' });
        }
    }

    const mergedSegments: any[] = [];
    if (rawSegments.length > 0) {
        let current = { ...rawSegments[0] };
        for (let i = 1; i < rawSegments.length; i++) {
            if (rawSegments[i].type === current.type && rawSegments[i].status === current.status) {
                current.to = rawSegments[i].to;
            } else {
                mergedSegments.push(current);
                current = { ...rawSegments[i] };
            }
        }
        mergedSegments.push(current);
    }

    const getStatusColor = (status?: string, type?: string) => {
        if (type === 'Offline' || status === 'Offline') return alpha(theme.palette.grey[500], 0.16);
        if (type === 'Break') return alpha('#f59e0b', 0.8);
        const s = status || 'Available';
        if (s === 'Available') return alpha(theme.palette.success.main, 0.8);
        if (s === 'Busy') return alpha('#ef4444', 0.8);
        if (s === 'Do Not Disturb') return alpha('#b91c1c', 0.8);
        if (s === 'Away') return alpha('#d97706', 0.8);
        return alpha(theme.palette.success.main, 0.8);
    };

    const segments = mergedSegments.map((seg: any) => {
        const duration = seg.to - seg.from;
        const width = (duration / totalDuration) * 100;
        const left = ((seg.from - startSec) / totalDuration) * 100;
        const isBreak = seg.type === 'Break';
        const isOffline = seg.type === 'Offline';
        const isShortActive = seg.type === 'Active' && duration < 60;
        const color = getStatusColor(seg.status, seg.type);
        let textColor = '#FFFFFF';
        if (isBreak) {
            textColor = '#FFFFFF';
        } else if (isOffline || isShortActive) {
            textColor = theme.palette.text.disabled;
        }
        const displayLabel = STATUS_DISPLAY_MAP[seg.status] || seg.type;
        return {
            left,
            width,
            color,
            textColor,
            status: seg.status || 'Offline',
            label: formatShortDuration(duration),
            tooltip: `${displayLabel}: ${formattedTimeFromSec(seg.from)} - ${formattedTimeFromSec(seg.to)} (${fDecimalHours(duration / 3600)})`,
            showLabel: width > 8 && !isOffline && !isShortActive
        };
    });

    const LEGEND_ITEMS = [
        { label: 'Active', status: 'Available', color: theme.palette.success.main, desc: 'Regular working hours' },
        { label: 'In client meeting', status: 'Busy', color: '#ef4444', desc: 'Engaged with clients' },
        { label: 'Team discussion', status: 'Do Not Disturb', color: '#b91c1c', desc: 'Internal collaboration' },
        { label: 'Break', status: 'Away', color: '#d97706', desc: 'Short personal break' },
        { label: 'Lunch Break', status: 'Break', color: '#f59e0b', desc: 'Designated lunch period' },
        { label: 'Offline - Logout', status: 'Offline', color: theme.palette.grey[500], desc: 'Session ended or inactive' },
    ];

    return (
        <Box sx={{ mt: 3, mb: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <Box
                    sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(theme.palette.success.main, 0.12),
                        color: 'success.main',
                    }}
                >
                    <Iconify icon="solar:chart-square-bold" width={20} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    Timeline Overview
                </Typography>
            </Stack>
            <Box sx={{ width: '100%', height: 32, bgcolor: alpha(theme.palette.grey[500], 0.12), borderRadius: 2, position: 'relative', border: `1px solid ${theme.palette.divider}` }}>
                {segments.map((seg: any, i) => {
                    const isHoveredFromLegend = !!hoveredLegend && !!seg.status && hoveredLegend.toLowerCase() === seg.status.toLowerCase();

                    return (
                        <Tooltip
                            key={`${i}-${isHoveredFromLegend}`}
                            title={seg.tooltip || 'Interval'}
                            arrow
                            placement="top"
                            {...(isHoveredFromLegend ? { open: true } : {})}
                            disableInteractive
                            PopperProps={{
                                sx: { pointerEvents: 'none' }
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'absolute',
                                    left: `${Math.max(0, Math.min(100, seg.left))}%`,
                                    width: `${Math.max(0, Math.min(100 - seg.left, seg.width))}%`,
                                    height: '100%',
                                    bgcolor: seg.color,
                                    borderRadius: i === 0 ? '16px 0 0 16px' : (i === segments.length - 1 ? '0 16px 16px 0' : 0),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRight: i < segments.length - 1 ? `1px solid ${alpha(theme.palette.common.black, 0.05)}` : 'none',
                                    transition: theme.transitions.create(['background-color', 'opacity', 'transform', 'border']),
                                    opacity: hoveredLegend && seg.status && hoveredLegend.toLowerCase() !== seg.status.toLowerCase() ? 0.3 : 1,
                                    cursor: 'pointer',
                                    transform: isHoveredFromLegend ? 'scaleY(1.1)' : 'scaleY(1)',
                                    zIndex: isHoveredFromLegend ? 10 : 1,
                                    border: isHoveredFromLegend ? '1.5px solid #FFFFFF' : 'none',
                                    '&:hover': {
                                        bgcolor: alpha(seg.color, 1),
                                        zIndex: 11,
                                        transform: 'scaleY(1.15)',
                                    }
                                }}
                            >
                                {seg.showLabel && (
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: seg.textColor,
                                            fontWeight: 800,
                                            fontSize: 10,
                                            whiteSpace: 'nowrap',
                                            pointerEvents: 'none',
                                            textShadow: '0 0 4px rgba(0,0,0,0.3)',
                                            opacity: isHoveredFromLegend ? 1 : 0.9,
                                        }}
                                    >
                                        {seg.label}
                                    </Typography>
                                )}
                            </Box>
                        </Tooltip>
                    );
                })}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5, px: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                    {fTime(loginTime || session.login_time)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                    {(logoutTime || session.logout_time) ? fTime(logoutTime || session.logout_time) : (session.status === 'Offline' ? 'Logout' : 'Active Now')}
                </Typography>
            </Box>
            <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mt: 2.5, px: 0.5 }}>
                {LEGEND_ITEMS.map((item) => (
                    <Stack
                        key={item.label}
                        direction="row"
                        alignItems="center"
                        spacing={0.75}
                        onMouseEnter={() => setHoveredLegend(item.status)}
                        onMouseLeave={() => setHoveredLegend(null)}
                        sx={{
                            cursor: 'pointer',
                            transition: 'opacity 0.2s',
                            opacity: hoveredLegend && hoveredLegend !== item.status ? 0.5 : 1
                        }}
                    >
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color }} />
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                            {item.label}
                        </Typography>
                    </Stack>
                ))}
            </Stack>
        </Box>
    );
};

const STATUS_OPTIONS = [
    { value: 'Available', label: 'Active' },
    { value: 'Busy', label: 'In client meeting' },
    { value: 'Do Not Disturb', label: 'Team discussion' },
    { value: 'Break', label: 'Lunch Break' },
    { value: 'Away', label: 'Break' },
    { value: 'Offline', label: 'Offline - Logout' },
];

type Props = {
    open: boolean;
    onClose: VoidFunction;
    session: any;
    onUpdate?: VoidFunction;
};

export function EmployeeDailyLogEditDialog({ open, onClose, session, onUpdate }: Props) {
    const theme = useTheme();
    const { enqueueSnackbar } = useSnackbar();
    const [limit, setLimit] = useState(5);
    const [editingItem, setEditingItem] = useState<{ type: 'interval' | 'break'; index: number; data: any } | null>(null);
    const [popupOpen, setPopupOpen] = useState(false);
    const [popupData, setPopupData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [localIntervals, setIntervals] = useState(session?.intervals || []);
    const [localBreaks, setBreaks] = useState(session?.breaks || []);
    const [localLoginTime, setLoginTime] = useState(session?.login_time || null);
    const [localLogoutTime, setLogoutTime] = useState(session?.logout_time || null);

    const [snapConfirm, setSnapConfirm] = useState<{
        open: boolean;
        type: 'interval' | 'break';
        index: number;
        data: any;
        snapType: 'prev' | 'next' | 'both' | 'none';
    }>({ open: false, type: 'interval', index: 0, data: null, snapType: 'none' });

    const fetchSession = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/method/company.company.presence_api.get_session_detail?name=${session.name}`, {
                credentials: 'include',
            });
            const result = await response.json();
            if (result.message) {
                const s = result.message;
                setIntervals(s.intervals || []);
                setBreaks(s.breaks || []);
                setLoginTime(s.login_time || null);
                setLogoutTime(s.logout_time || null);
            }
        } catch (error) {
            console.error("Error fetching session details:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && session) {
            fetchSession();
        }
    }, [session?.name, open]);

    if (!session) return null;

    const { employee_name, login_date, status } = session;

    const renderDetailItem = (label: string, value: any) => (
        <Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {label}
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 15 }}>
                {value}
            </Typography>
        </Box>
    );

    const handleSave = async () => {
        try {
            setLoading(true);
            const response = await frappeRequest('/api/method/company.company.presence_api.update_detailed_session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: session.name,
                    intervals: localIntervals,
                    breaks: localBreaks,
                    login_time: localLoginTime,
                    logout_time: localLogoutTime
                })
            });

            const result = await response.json();
            if (result.message && result.message.status === 'success') {
                enqueueSnackbar('Session updated successfully', { variant: 'success' });
                onUpdate?.();
                onClose();
            } else {
                enqueueSnackbar(result.exception || 'Failed to update session', { variant: 'error' });
            }
        } catch (error) {
            console.error("Error saving session:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEditPopup = (type: 'interval' | 'break', index: number, data: any) => {
        setEditingItem({ type, index, data });
        setPopupData({ ...data });
        setPopupOpen(true);
    };

    const applyIntervalChanges = (index: number, data: any, shouldSnap: boolean = false) => {
        const newIntervals = [...localIntervals];
        let currentIndex = -1;

        // Handle insertion
        if (index === -1) {
            const insertAfter = editingItem?.data?._insertAfter;
            if (typeof insertAfter === 'number') {
                newIntervals.splice(insertAfter + 1, 0, data);
                currentIndex = insertAfter + 1;
            } else {
                newIntervals.push(data);
                currentIndex = newIntervals.length - 1;
            }
        } else {
            newIntervals[index] = data;
            currentIndex = index;
        }

        if (shouldSnap && currentIndex !== -1) {
            const idx = currentIndex;
            if (idx > 0) {
                const prev = { ...newIntervals[idx - 1] };
                prev.to_time = data.from_time;
                if (prev.from_time && prev.to_time) {
                    prev.duration_seconds = dayjs(prev.to_time).diff(dayjs(prev.from_time), 'second');
                }
                newIntervals[idx - 1] = prev;
            }
            if (idx < newIntervals.length - 1 && data.to_time) {
                const next = { ...newIntervals[idx + 1] };
                next.from_time = data.to_time;
                if (next.from_time && next.to_time) {
                    next.duration_seconds = dayjs(next.to_time).diff(dayjs(next.from_time), 'second');
                }
                newIntervals[idx + 1] = next;
            }
        }

        setIntervals(newIntervals);

        // Update summary times based on sorted array
        if (newIntervals.length > 0) {
            setLoginTime(newIntervals[0].from_time);
            const last = newIntervals[newIntervals.length - 1];
            setLogoutTime(last.to_time || last.from_time);
        }

        setPopupOpen(false);
        setEditingItem(null);
        setSnapConfirm({ ...snapConfirm, open: false });
    };

    const applyBreakChanges = (index: number, data: any, shouldSnap: boolean = false) => {
        const newBreaks = [...localBreaks];
        let currentIndex = -1;

        if (index === -1) {
            const insertAfter = editingItem?.data?._insertAfter;
            if (typeof insertAfter === 'number') {
                newBreaks.splice(insertAfter + 1, 0, data);
                currentIndex = insertAfter + 1;
            } else {
                newBreaks.push(data);
                currentIndex = newBreaks.length - 1;
            }
        } else {
            newBreaks[index] = data;
            currentIndex = index;
        }

        if (shouldSnap && currentIndex !== -1) {
            const idx = currentIndex;
            const brk = newBreaks[idx];
            const prev = idx > 0 ? newBreaks[idx - 1] : null;
            const next = idx < newBreaks.length - 1 ? newBreaks[idx + 1] : null;

            if (prev && brk.break_start) {
                prev.break_end = brk.break_start;
                prev.break_duration = dayjs(prev.break_end).diff(dayjs(prev.break_start), 'minute', true);
            }
            if (next && brk.break_end) {
                next.break_start = brk.break_end;
                next.break_duration = dayjs(next.break_end).diff(dayjs(next.break_start), 'minute', true);
            }
        }
        setBreaks(newBreaks);

        if (shouldSnap) {
            const newIntervals = [...localIntervals];
            let intervalsChanged = false;
            newIntervals.forEach((interval: any) => {
                const iStart = dayjs(interval.from_time);
                const iEnd = interval.to_time ? dayjs(interval.to_time) : null;
                const bStart = dayjs(data.break_start);
                const bEnd = data.break_end ? dayjs(data.break_end) : null;

                if (iEnd && Math.abs(iEnd.diff(bStart, 'minute')) <= 2) {
                    interval.to_time = data.break_start;
                    interval.duration_seconds = dayjs(interval.to_time).diff(iStart, 'second');
                    intervalsChanged = true;
                }
                if (bEnd && Math.abs(iStart.diff(bEnd, 'minute')) <= 2) {
                    interval.from_time = data.break_end;
                    if (interval.to_time) {
                        interval.duration_seconds = dayjs(interval.to_time).diff(dayjs(interval.from_time), 'second');
                    }
                    intervalsChanged = true;
                }
            });

            if (intervalsChanged) {
                setIntervals(newIntervals);
                if (newIntervals.length > 0) {
                    setLoginTime(newIntervals[0].from_time);
                    const last = newIntervals[newIntervals.length - 1];
                    setLogoutTime(last.to_time || last.from_time);
                }
            }
        }

        setPopupOpen(false);
        setEditingItem(null);
        setSnapConfirm({ ...snapConfirm, open: false });
    };

    const handleApplyPopupChanges = () => {
        if (!editingItem) return;

        if (editingItem.type === 'interval') {
            const data = { ...popupData };
            const index = editingItem.index;
            const isLast = index === localIntervals.length - 1 || index === -1;

            if (!data.from_time) {
                enqueueSnackbar('Please select Start time', { variant: 'error' });
                return;
            }

            if (!data.to_time && !isLast) {
                enqueueSnackbar('Please select End time for intermediate intervals', { variant: 'error' });
                return;
            }

            if (data.from_time && data.to_time) {
                data.duration_seconds = dayjs(data.to_time).diff(dayjs(data.from_time), 'second');
            } else if (data.from_time && !data.to_time) {
                data.duration_seconds = 0;
            }

            let snapType: 'prev' | 'next' | 'both' | 'none' = 'none';
            const prev = index > 0 ? localIntervals[index - 1] : null;
            const next = index < localIntervals.length - 1 ? localIntervals[index + 1] : null;

            if (prev && prev.to_time !== data.from_time) {
                snapType = 'prev';
            }
            if (next && data.to_time && next.from_time !== data.to_time) {
                snapType = snapType === 'prev' ? 'both' : 'next';
            }

            if (snapType !== 'none') {
                setSnapConfirm({
                    open: true,
                    type: 'interval',
                    index,
                    data,
                    snapType
                });
                return;
            }

            applyIntervalChanges(index, data);
        } else {
            const data = { ...popupData };
            const index = editingItem.index;

            if (!data.break_start || !data.break_end) {
                enqueueSnackbar('Please select both Start and End time', { variant: 'error' });
                return;
            }

            if (data.break_start && data.break_end) {
                const diffSeconds = dayjs(data.break_end).diff(dayjs(data.break_start), 'second');
                data.break_duration = diffSeconds / 60.0;
            } else {
                data.break_duration = 0;
            }

            let needsSnap = false;
            localIntervals.forEach((interval: any) => {
                const iEnd = interval.to_time ? dayjs(interval.to_time) : null;
                const iStart = dayjs(interval.from_time);
                const bStart = dayjs(data.break_start);
                const bEnd = data.break_end ? dayjs(data.break_end) : null;

                if ((iEnd && Math.abs(iEnd.diff(bStart, 'minute')) <= 2 && iEnd.toISOString() !== bStart.toISOString()) ||
                    (bEnd && Math.abs(iStart.diff(bEnd, 'minute')) <= 2 && iStart.toISOString() !== bEnd.toISOString())) {
                    needsSnap = true;
                }
            });

            if (needsSnap) {
                setSnapConfirm({
                    open: true,
                    type: 'break',
                    index,
                    data,
                    snapType: 'both'
                });
                return;
            }

            applyBreakChanges(index, data);
        }
    };

    const formatSecondsToDetailed = (seconds: number) => {
        if (!seconds && seconds !== 0) return 'Tracking...';
        const s = Math.round(seconds);
        const hrs = Math.floor(s / 3600);
        const mins = Math.floor((s % 3600) / 60);
        const secs = s % 60;

        if (hrs > 0) return `${hrs}h ${mins} mins ${secs} sec`;
        if (mins > 0) return `${mins} mins ${secs} sec`;
        return `${secs} sec`;
    };

    const formatDetailedDuration = (minutes: number) => {
        if (!minutes && minutes !== 0) return 'Active';
        const totalSeconds = Math.round(minutes * 60);
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;

        if (hrs > 0) return `${hrs}h ${mins} mins ${secs} sec`;
        if (mins > 0) return `${mins} mins ${secs} sec`;
        return `${secs} sec`;
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="lg"
            PaperProps={{
                sx: { minHeight: '85vh' }
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="span" sx={{ fontWeight: 800 }}>
                    Edit for {employee_name || 'Employee'} - {fDate(login_date, 'DD MMM YYYY')}
                </Typography>
                <IconButton onClick={onClose}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 0 }}>
                <Scrollbar sx={{ p: 4, maxHeight: '82vh' }}>
                    <Box sx={{ mb: 5 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                            <Box
                                sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: alpha(theme.palette.info.main, 0.12),
                                    color: 'info.main',
                                }}
                            >
                                <Iconify icon="solar:user-id-bold" width={20} />
                            </Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                Session Summary
                            </Typography>
                        </Stack>

                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 1.5,
                                bgcolor: alpha(theme.palette.grey[500], 0.04),
                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            }}
                        >
                            <Box
                                display="grid"
                                gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(4, 1fr)' }}
                                gap={2}
                                sx={{ mb: 5 }}
                            >
                                {renderDetailItem('Login Date', fDate(login_date, 'DD MMM YYYY'))}
                                {renderDetailItem('Login Time', fDateTime(localLoginTime, 'h:mm:ss a'))}
                                {renderDetailItem('Logout Time', (() => {
                                    if (localLogoutTime) return fDateTime(localLogoutTime, 'h:mm:ss a');
                                    if (['Offline', 'Inactive'].includes(status) && localIntervals.length > 0) {
                                        const last = localIntervals[localIntervals.length - 1];
                                        const timeToUse = last.to_time || last.from_time;
                                        if (timeToUse) return fDateTime(timeToUse, 'h:mm:ss a');
                                    }
                                    return (['Offline', 'Inactive'].includes(status) ? 'Logout' : 'Active Now');
                                })())}
                                {renderDetailItem("Status", status ? (STATUS_DISPLAY_MAP[status as keyof typeof STATUS_DISPLAY_MAP] || status) : 'Unknown')}
                            </Box>

                            <Divider sx={{ my: 2, borderStyle: 'dashed' }} />

                            <Box
                                display="grid"
                                gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' }}
                                gap={2}
                            >
                                {renderDetailItem("Total Work Hours", (() => {
                                    const totalSec = localIntervals.reduce((acc: number, int: any) => {
                                        if (['Offline', 'Break', 'Away'].includes(int.status)) return acc;
                                        return acc + (int.duration_seconds || 0);
                                    }, 0);
                                    return formatDetailedDuration(totalSec / 60.0);
                                })())}
                                {renderDetailItem("Total Break Hours", (() => {
                                    const totalMin = localBreaks.reduce((acc: number, brk: any) => acc + (brk.break_duration || 0), 0);
                                    return formatDetailedDuration(totalMin);
                                })())}
                            </Box>
                        </Box>
                    </Box>

                    <Divider sx={{ borderStyle: 'dashed', mb: 5 }} />

                    <SessionTimelineBar
                        session={session}
                        intervals={localIntervals}
                        breaks={localBreaks}
                        loginTime={localLoginTime}
                        logoutTime={localLogoutTime}
                    />

                    <Stack spacing={5} direction={{ xs: 'column', md: 'row' }} sx={{ mt: 5 }}>
                        <Box sx={{ flex: 1 }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                                <Box
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                                        color: 'primary.main',
                                    }}
                                >
                                    <Iconify icon="solar:history-bold" width={20} />
                                </Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                    Activity Timeline
                                </Typography>
                            </Stack>

                            <Stack spacing={3}>
                                {localIntervals.slice(0, limit).map((interval: any, index: number) => {
                                    const intervalStatus = interval.status || 'Available';
                                    const statusColor = STATUS_DISPLAY_MAP[intervalStatus] ?
                                        (intervalStatus === 'Available' ? theme.palette.success.main :
                                            intervalStatus === 'Offline' ? theme.palette.text.disabled :
                                                intervalStatus === 'Away' || intervalStatus === 'Break' ? theme.palette.warning.main : '#ef4444')
                                        : theme.palette.success.main;

                                    return (
                                        <Stack key={index} direction="row" spacing={2.5}>
                                            <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <Box
                                                    sx={{
                                                        width: 14,
                                                        height: 14,
                                                        borderRadius: '50%',
                                                        border: `3px solid ${statusColor}`,
                                                        bgcolor: 'background.paper',
                                                        zIndex: 1
                                                    }}
                                                />
                                                {index < Math.min(limit, localIntervals.length) - 1 && (
                                                    <Box
                                                        sx={{
                                                            width: 2,
                                                            flexGrow: 1,
                                                            bgcolor: alpha(statusColor, 0.2),
                                                            my: 0.5,
                                                            minHeight: 24
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                                     <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                         {(() => {
                                                             const baseDate = dayjs(localLoginTime || session?.login_time);
                                                             const fromD = dayjs(interval.from_time);
                                                             const toD = interval.to_time ? dayjs(interval.to_time) : null;
                                                             const fromIsDiff = fromD.isValid() && baseDate.isValid() && !fromD.isSame(baseDate, 'day');
                                                             const fromStr = fromD.isValid() ? (fromIsDiff ? `${fromD.format('h:mm a')} (${fromD.format('DD MMM')})` : fromD.format('h:mm a')) : fDateTime(interval.from_time, 'h:mm:ss a');
                                                             let toStr = intervalStatus === 'Offline' ? 'Logout' : 'Active';
                                                             if (interval.to_time && toD && toD.isValid()) {
                                                                 const toIsDiff = baseDate.isValid() && !toD.isSame(baseDate, 'day');
                                                                 toStr = toIsDiff ? `${toD.format('h:mm a')} (${toD.format('DD MMM')})` : toD.format('h:mm a');
                                                             }
                                                             return `${fromStr} — ${toStr}`;
                                                         })()}
                                                     </Typography>
                                                    <Box
                                                        sx={{
                                                            px: 0.75,
                                                            py: 0.15,
                                                            borderRadius: 0.5,
                                                            fontSize: 10,
                                                            fontWeight: 900,
                                                            textTransform: 'uppercase',
                                                            bgcolor: alpha(statusColor, 0.1),
                                                            color: statusColor,
                                                            border: `1px solid ${alpha(statusColor, 0.2)}`
                                                        }}
                                                    >
                                                        {STATUS_DISPLAY_MAP[intervalStatus] || intervalStatus}
                                                    </Box>
                                                </Stack>
                                                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase' }}>
                                                    Duration: {formatSecondsToDetailed(interval.duration_seconds)}
                                                </Typography>
                                            </Box>

                                            <Stack direction="column" spacing={0.5} sx={{ alignItems: 'flex-start', minWidth: 110 }}>
                                                <Stack
                                                    direction="row"
                                                    alignItems="center"
                                                    spacing={0.75}
                                                    onClick={() => handleOpenEditPopup('interval', -1, {
                                                        from_time: null,
                                                        to_time: null,
                                                        status: 'Available',
                                                        _insertAfter: index
                                                    })}
                                                    sx={{
                                                        cursor: 'pointer',
                                                        color: 'success.main',
                                                        '&:hover': { color: 'success.dark' },
                                                        transition: theme.transitions.create('color')
                                                    }}
                                                >
                                                    <IoMdAdd size={18} />
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: 13 }}>
                                                        Add Interval
                                                    </Typography>
                                                </Stack>

                                                <Stack
                                                    direction="row"
                                                    alignItems="center"
                                                    spacing={0.75}
                                                    onClick={() => handleOpenEditPopup('interval', index, interval)}
                                                    sx={{
                                                        cursor: 'pointer',
                                                        color: '#1877f2',
                                                        '&:hover': { color: '#f57c00' },
                                                        transition: theme.transitions.create('color')
                                                    }}
                                                >
                                                    <FiEdit3 size={16} style={{ color: '#1877f2' }} />
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1877f2', fontSize: 13 }}>
                                                        Edit Timing
                                                    </Typography>
                                                </Stack>
                                            </Stack>
                                        </Stack>
                                    );
                                })}

                                {localIntervals.length === 0 && (
                                    <Box sx={{ textAlign: 'center', py: 5, bgcolor: alpha(theme.palette.grey[500], 0.04), borderRadius: 2 }}>
                                        <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic', mb: 2 }}>
                                            No work intervals recorded.
                                        </Typography>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="primary"
                                            startIcon={<Iconify icon="solar:add-circle-bold" />}
                                            onClick={() => handleOpenEditPopup('interval', -1, {
                                                from_time: null,
                                                to_time: null,
                                                status: 'Available'
                                            })}
                                        >
                                            Add First Interval
                                        </Button>
                                    </Box>
                                )}

                                {localIntervals.length > limit && (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 1 }}>
                                        <Button
                                            size="small"
                                            color="primary"
                                            onClick={() => setLimit(limit + 5)}
                                            startIcon={<Iconify icon="eva:arrow-ios-downward-fill" width={18} />}
                                            sx={{
                                                fontWeight: 800,
                                                borderRadius: 1.5,
                                                px: 2,
                                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                                                '&:hover': {
                                                    bgcolor: alpha(theme.palette.primary.main, 0.16),
                                                }
                                            }}
                                        >
                                            Load More ({localIntervals.length - limit} remaining)
                                        </Button>
                                    </Box>
                                )}
                            </Stack>
                        </Box>

                        <Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed', display: { xs: 'none', md: 'block' } }} />

                        <Box sx={{ flex: 1 }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                                <Box
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: alpha(theme.palette.warning.main, 0.12),
                                        color: 'warning.main',
                                    }}
                                >
                                    <Iconify icon={"ph:coffee-fill" as any} width={20} />
                                </Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                    Lunch Break Intervals
                                </Typography>
                            </Stack>

                            {localBreaks.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 5, bgcolor: alpha(theme.palette.grey[500], 0.04), borderRadius: 2 }}>
                                    <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic', mb: 2 }}>
                                        No breaks recorded.
                                    </Typography>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="warning"
                                        startIcon={<Iconify icon="solar:add-circle-bold" />}
                                        onClick={() => handleOpenEditPopup('break', -1, {
                                            break_start: null,
                                            break_end: null,
                                            source: 'Manual',
                                            reason: 'Lunch Break'
                                        })}
                                    >
                                        Add First Break
                                    </Button>
                                </Box>
                            ) : (
                                <Stack spacing={2.5}>
                                    {localBreaks.map((brk: any, index: number) => {
                                        const isAway = brk.source === 'Away';
                                        const color = theme.palette.warning.main;
                                        return (
                                            <Stack
                                                key={index}
                                                direction="row"
                                                alignItems="center"
                                                spacing={2}
                                                sx={{
                                                    p: 2,
                                                    borderRadius: 1.5,
                                                    bgcolor: alpha(color, 0.04),
                                                    border: `1px solid ${alpha(color, 0.1)}`
                                                }}
                                            >
                                                <Iconify
                                                    icon={isAway ? "ph:moon-fill" : "ph:coffee-fill" as any}
                                                    sx={{ color }}
                                                />
                                                <Box sx={{ flexGrow: 1 }}>
                                                     <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                         {(() => {
                                                             const baseDate = dayjs(localLoginTime || session?.login_time);
                                                             const fromD = dayjs(brk.break_start);
                                                             const toD = brk.break_end ? dayjs(brk.break_end) : null;
                                                             const fromIsDiff = fromD.isValid() && baseDate.isValid() && !fromD.isSame(baseDate, 'day');
                                                             const fromStr = fromD.isValid() ? (fromIsDiff ? `${fromD.format('h:mm a')} (${fromD.format('DD MMM')})` : fromD.format('h:mm a')) : fDateTime(brk.break_start, 'h:mm:ss a');
                                                             let toStr = 'Current';
                                                             if (brk.break_end && toD && toD.isValid()) {
                                                                 const toIsDiff = baseDate.isValid() && !toD.isSame(baseDate, 'day');
                                                                 toStr = toIsDiff ? `${toD.format('h:mm a')} (${toD.format('DD MMM')})` : toD.format('h:mm a');
                                                             }
                                                             return `${fromStr} — ${toStr}`;
                                                         })()}
                                                     </Typography>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25, fontWeight: 600 }}>
                                                        {isAway ? 'Break (Inactivity)' : (brk.reason || 'Manual Break')}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color, fontWeight: 900 }}>
                                                        {formatDetailedDuration(brk.break_duration)}
                                                    </Typography>
                                                </Box>

                                                <Stack direction="column" spacing={0.5} sx={{ alignItems: 'flex-start', minWidth: 100 }}>
                                                    <Stack
                                                        direction="row"
                                                        alignItems="center"
                                                        spacing={0.75}
                                                        onClick={() => handleOpenEditPopup('break', -1, {
                                                            break_start: null,
                                                            break_end: null,
                                                            source: 'Manual',
                                                            reason: 'Lunch Break',
                                                            _insertAfter: index
                                                        })}
                                                        sx={{
                                                            cursor: 'pointer',
                                                            color: 'success.main',
                                                            '&:hover': { color: 'success.dark' },
                                                            transition: theme.transitions.create('color')
                                                        }}
                                                    >
                                                        <IoMdAdd size={18} />
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: 13 }}>
                                                            Add Break
                                                        </Typography>
                                                    </Stack>

                                                    <Stack
                                                        direction="row"
                                                        alignItems="center"
                                                        spacing={0.75}
                                                        onClick={() => handleOpenEditPopup('break', index, brk)}
                                                        sx={{
                                                            cursor: 'pointer',
                                                            color: '#1877f2',
                                                            '&:hover': { color: '#f57c00' },
                                                            transition: theme.transitions.create('color')
                                                        }}
                                                    >
                                                        <FiEdit3 size={16} style={{ color: '#1877f2' }} />
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1877f2', fontSize: 13 }}>
                                                            Edit Timing
                                                        </Typography>
                                                    </Stack>
                                                </Stack>
                                            </Stack>
                                        );
                                    })}
                                </Stack>
                            )}
                        </Box>
                    </Stack>
                </Scrollbar>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    disabled={loading}
                >
                    Save Changes
                </Button>
            </DialogActions>

            <Dialog open={popupOpen} onClose={() => setPopupOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {editingItem?.index === -1 ? 'Add' : 'Edit'} {editingItem?.type === 'interval' ? 'Interval' : 'Break'} Timing
                    </Typography>
                    <IconButton size="small" onClick={() => setPopupOpen(false)}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ pt: 2 }}>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <DateTimePicker
                            label="Start Time"
                            value={(popupData && (editingItem?.type === 'interval' ? popupData.from_time : popupData.break_start)) ? dayjs(editingItem?.type === 'interval' ? popupData.from_time : popupData.break_start) : null}
                            onChange={(val) => {
                                const field = editingItem?.type === 'interval' ? 'from_time' : 'break_start';
                                setPopupData({ ...popupData, [field]: val?.format('YYYY-MM-DD HH:mm:ss') });
                            }}
                            format="DD-MM-YYYY hh:mm:ss a"
                            views={['year', 'month', 'day', 'hours', 'minutes', 'seconds']}
                            timeSteps={{ minutes: 1, seconds: 1 }}
                            slotProps={{
                                textField: { fullWidth: true }
                            }}
                        />
                        <DateTimePicker
                            label="End Time"
                            value={(popupData && (editingItem?.type === 'interval' ? popupData.to_time : popupData.break_end)) ? dayjs(editingItem?.type === 'interval' ? popupData.to_time : popupData.break_end) : null}
                            onChange={(val) => {
                                const field = editingItem?.type === 'interval' ? 'to_time' : 'break_end';
                                setPopupData({ ...popupData, [field]: val?.format('YYYY-MM-DD HH:mm:ss') });
                            }}
                            format="DD-MM-YYYY hh:mm:ss a"
                            views={['year', 'month', 'day', 'hours', 'minutes', 'seconds']}
                            timeSteps={{ minutes: 1, seconds: 1 }}
                            slotProps={{
                                textField: { fullWidth: true }
                            }}
                        />
                        {editingItem?.type === 'interval' ? (
                            <TextField
                                select
                                fullWidth
                                label="Status"
                                value={popupData?.status || 'Available'}
                                onChange={(e) => setPopupData({ ...popupData, status: e.target.value })}
                            >
                                {STATUS_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                        ) : (
                            <TextField
                                fullWidth
                                label="Reason"
                                value={popupData?.reason || ''}
                                onChange={(e) => setPopupData({ ...popupData, reason: e.target.value })}
                            />
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" onClick={handleApplyPopupChanges}>Apply Changes</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={snapConfirm.open} onClose={() => setSnapConfirm({ ...snapConfirm, open: false })} maxWidth="xs">
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        Timing Discrepancy Found
                    </Typography>
                    <IconButton size="small" onClick={() => setSnapConfirm({ ...snapConfirm, open: false })}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ mt: 3 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                        Your changes create a gap or overlap with adjacent activities. Would you like to automatically adjust the other intervals to match?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button
                        onClick={() => snapConfirm.type === 'interval'
                            ? applyIntervalChanges(snapConfirm.index, snapConfirm.data, false)
                            : applyBreakChanges(snapConfirm.index, snapConfirm.data, false)}
                    >
                        No, Keep Gap
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => snapConfirm.type === 'interval'
                            ? applyIntervalChanges(snapConfirm.index, snapConfirm.data, true)
                            : applyBreakChanges(snapConfirm.index, snapConfirm.data, true)}
                    >
                        Yes, Adjust All
                    </Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
}
