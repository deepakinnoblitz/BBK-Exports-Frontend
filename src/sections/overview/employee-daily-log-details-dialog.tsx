import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';

import { fDate, fTime, fDateTime, fDecimalHours } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

import EmployeeLocationTab from 'src/sections/employee/employee-location-tab';

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

const LEGEND_ITEMS = [
    { label: 'Active', status: 'Available', color: '#22c55e', desc: 'Regular working hours' },
    { label: 'In client meeting', status: 'Busy', color: '#ef4444', desc: 'Client communication or meeting' },
    { label: 'Team discussion', status: 'Do Not Disturb', color: '#b91c1c', desc: 'Internal team collaboration' },
    { label: 'Break', status: 'Away', color: '#d97706', desc: 'Brief inactivity or break' },
    { label: 'Lunch Break', status: 'Break', color: '#f59e0b', desc: 'Designated lunch period' },
    { label: 'Offline - Logout', status: 'Offline', color: '#919eab', desc: 'User logged out or inactive' },
];

const SessionTimelineBar = ({ session }: { session: any }) => {
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
        if (hrs > 0) return `${hrs}h ${mins}m`;
        return `${mins}m`;
    };

    const formattedTimeFromSec = (sec: number) => {
        if (!sec) return '';
        return dayjs.unix(sec).format('h:mm:ss a');
    };

    const startSec = parseTime(session.login_time);

    let endSec = session.logout_time ? parseTime(session.logout_time) : 0;
    if (!endSec && session.intervals && session.intervals.length > 0) {
        const lastInterval = session.intervals[session.intervals.length - 1];
        if (lastInterval.to_time) endSec = parseTime(lastInterval.to_time);
    }
    if (!endSec) endSec = dayjs().unix();
    if (endSec <= startSec) endSec = startSec + 3600;

    const totalDuration = Math.max(endSec - startSec, 1);

    const timePointsSet = new Set<number>();
    timePointsSet.add(startSec);
    timePointsSet.add(endSec);
    (session.intervals || []).forEach((int: any) => {
        timePointsSet.add(parseTime(int.from_time));
        if (int.to_time) timePointsSet.add(parseTime(int.to_time));
    });
    (session.breaks || []).forEach((brk: any) => {
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

        const isInActive = (session.intervals || []).find((int: any) => {
            const iStart = parseTime(int.from_time);
            const iEnd = int.to_time ? parseTime(int.to_time) : endSec;
            return mid >= iStart && mid <= iEnd;
        });

        if (isInActive) {
            rawSegments.push({ from, to, type: 'Active', status: isInActive.status });
            continue;
        }

        const midBreak = (session.breaks || []).find((brk: any) => {
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
        if (type === 'Offline' || status === 'Offline') return theme.palette.grey[500];
        if (type === 'Break') return '#f59e0b';

        const s = status || 'Available';
        if (s === 'Available') return theme.palette.success.main;
        if (s === 'Busy') return '#ef4444';
        if (s === 'Do Not Disturb') return '#b91c1c';
        if (s === 'Away') return '#d97706';
        return theme.palette.success.main;
    };

    const segments = mergedSegments.map((seg) => {
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
            status: seg.status || 'Offline',
            left,
            width,
            color,
            textColor,
            label: formatShortDuration(duration),
            tooltip: `${displayLabel}: ${formattedTimeFromSec(seg.from)} - ${formattedTimeFromSec(seg.to)} (${fDecimalHours(duration / 3600)})`,
            showLabel: width > 8 && !isOffline && !isShortActive
        };
    });

    return (
        <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
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
                    {fTime(session.login_time)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                    {session.logout_time ? fTime(session.logout_time) : 'Active Now'}
                </Typography>
            </Box>

            <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mt: 2.5, px: 0.5, mb: 1 }}>
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

type Props = {
    open: boolean;
    onClose: VoidFunction;
    session: any;
};

export function EmployeeDailyLogDetailsDialog({ open, onClose, session }: Props) {
    const theme = useTheme();
    const [limit, setLimit] = useState(5);
    const [loading, setLoading] = useState(false);
    const [detailedSession, setDetailedSession] = useState<any>(session);
    const [currentTab, setCurrentTab] = useState('details');

    const fetchSession = async () => {
        if (!session?.name) return;
        try {
            setLoading(true);
            const response = await fetch(`/api/method/company.company.presence_api.get_session_detail?name=${session.name}`);
            const result = await response.json();
            if (result.message) {
                setDetailedSession(result.message);
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

    useEffect(() => {
        if (session) {
            setDetailedSession(session);
        }
    }, [session]);

    useEffect(() => {
        if (open) {
            setCurrentTab('details');
        }
    }, [open]);

    if (!detailedSession) return null;

    const { employee, employee_name, login_date, login_time, logout_time, total_work_hours, total_break_hours, status, intervals = [], breaks = [] } = detailedSession;

    const renderDetailItem = (label: string, value: string) => (
        <Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {label}
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 15 }}>
                {value}
            </Typography>
        </Box>
    );

    const formatDuration = (seconds: number) => fDecimalHours(seconds / 3600);

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

    const formatSecondsToDetailed = (seconds: number) => {
        if (!seconds && seconds !== 0) return 'Tracking...';
        const s = Math.round(seconds);
        const hrs = Math.floor(s / 3600);
        const mins = Math.round((s % 3600) / 60);
        const secs = s % 60;

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
                sx: {
                    borderRadius: 2,
                    boxShadow: (themeVar) => themeVar.customShadows.z24,
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                }
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: (t) => `1px solid ${t.palette.divider}` }}>
                <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
                    Details for {employee_name || 'Employee'} - {fDate(login_date, 'DD MMM YYYY')}
                </Typography>
                <IconButton onClick={onClose} sx={{ color: (t) => t.palette.grey[500] }}>
                    <Iconify icon="mingcute:close-line" width={20} />
                </IconButton>
            </DialogTitle>

            <Tabs
                value={currentTab}
                onChange={(event, newValue) => setCurrentTab(newValue)}
                sx={{ px: 3, borderBottom: (t) => `1px solid ${t.palette.divider}` }}
            >
                <Tab value="details" label="Log Details" />
                <Tab value="location" label="Location Tracking" />
            </Tabs>

            <DialogContent sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
                {currentTab === 'details' && (
                    <Box sx={{ pt: 1 }}>
                        {/* Summary Section */}
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
                                    <Iconify icon={"solar:user-id-bold" as any} width={20} />
                                </Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                    Session Summary
                                </Typography>
                            </Stack>

                            <Box
                                sx={{
                                    p: 1.5,
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
                                    {renderDetailItem(
                                        "Login Date",
                                        login_date ? fDate(login_date, 'DD MMM YYYY') : '-'
                                    )}
                                    {renderDetailItem(
                                        "Login Time",
                                        login_time ? fDateTime(login_time, 'h:mm:ss a') : '-'
                                    )}
                                    {renderDetailItem(
                                        "Logout Time",
                                        (() => {
                                            if (logout_time) return fDateTime(logout_time, 'h:mm:ss a');
                                            return (['Offline', 'Inactive'].includes(status) ? 'Logout' : 'Active');
                                        })()
                                    )}
                                    {renderDetailItem(
                                        "Status",
                                        status ? (STATUS_DISPLAY_MAP[status as keyof typeof STATUS_DISPLAY_MAP] || status) : 'Unknown'
                                    )}
                                </Box>

                                <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />

                                <Box
                                    display="grid"
                                    gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' }}
                                    gap={2}
                                    sx={{ mt: 3 }}
                                >
                                    {renderDetailItem(
                                        "Total Work Hours",
                                        total_work_hours ? fDecimalHours(total_work_hours) : '0 secs'
                                    )}
                                    {renderDetailItem(
                                        "Total Break Hours",
                                        total_break_hours ? fDecimalHours(total_break_hours) : '0 secs'
                                    )}
                                </Box>
                            </Box>
                        </Box>

                        <Divider sx={{ borderStyle: 'dashed', mb: 5 }} />

                        <SessionTimelineBar session={detailedSession} />

                        <Stack spacing={5} direction={{ xs: 'column', md: 'row' }} sx={{ mt: 5 }}>

                            {/* Activity Timeline */}
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
                                        <Iconify icon={"solar:history-bold" as any} width={20} />
                                    </Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                        Activity Timeline
                                    </Typography>
                                </Stack>

                                <Stack spacing={3}>
                                    {intervals.slice(0, limit).map((interval: any, index: number) => {
                                        const intervalStatus = interval.status || 'Available';
                                        const isAvailable = intervalStatus === 'Available';
                                        const isBusy = intervalStatus === 'Busy';
                                        const isDnd = intervalStatus === 'Do Not Disturb';
                                        const isAway = intervalStatus === 'Away';
                                        const isOffline = intervalStatus === 'Offline';

                                        let statusColor = theme.palette.success.main;
                                        if (isBusy) statusColor = '#ef4444';
                                        if (isDnd) statusColor = '#b91c1c';
                                        if (isAway) statusColor = theme.palette.warning.main;
                                        if (isOffline) statusColor = theme.palette.text.disabled;

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
                                                    {index < Math.min(limit, intervals.length) - 1 && (
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
                                                <Box>
                                                     <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                                         <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                             {(() => {
                                                                 const baseDate = dayjs(login_date || login_time);
                                                                 const fromD = dayjs(interval.from_time);
                                                                 const toD = interval.to_time ? dayjs(interval.to_time) : null;
                                                                 const fromIsDiff = fromD.isValid() && baseDate.isValid() && !fromD.isSame(baseDate, 'day');
                                                                 const fromStr = fromD.isValid() ? (fromIsDiff ? `${fromD.format('h:mm a')} (${fromD.format('DD MMM')})` : fromD.format('h:mm a')) : fTime(interval.from_time);
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
                                                             {STATUS_DISPLAY_MAP[intervalStatus as keyof typeof STATUS_DISPLAY_MAP] || intervalStatus}
                                                         </Box>
                                                     </Stack>
                                                     <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase' }}>
                                                         Duration: {formatSecondsToDetailed(interval.duration_seconds)}
                                                     </Typography>
                                                 </Box>
                                             </Stack>
                                         );
                                     })}

                                     {intervals.length > limit && (
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
                                                 Load More ({intervals.length - limit} remaining)
                                             </Button>
                                         </Box>
                                     )}
                                 </Stack>
                             </Box>

                             <Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed', display: { xs: 'none', md: 'block' } }} />

                             {/* Lunch Break Intervals */}
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

                                {breaks.length === 0 ? (
                                    <Box sx={{ textAlign: 'center', py: 5, bgcolor: alpha(theme.palette.grey[500], 0.04), borderRadius: 2 }}>
                                        <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                                            No breaks recorded for this session.
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Stack spacing={2.5}>
                                        {breaks.map((brk: any, index: number) => {
                                            const isAway = brk.source === 'Away';
                                            const color = isAway ? theme.palette.warning.main : theme.palette.warning.main; // Both use amber/orange but different icons
                                            const bgColor = isAway ? alpha('#d97706', 0.04) : alpha(theme.palette.warning.main, 0.04);
                                            const borderColor = isAway ? alpha('#d97706', 0.1) : alpha(theme.palette.warning.main, 0.1);

                                            return (
                                                <Stack
                                                    key={index}
                                                    direction="row"
                                                    alignItems="center"
                                                    spacing={2}
                                                    sx={{
                                                        p: 2,
                                                        borderRadius: 1.5,
                                                        bgcolor: bgColor,
                                                        border: `1px solid ${borderColor}`
                                                    }}
                                                >
                                                    <Iconify
                                                        icon={(isAway ? "ph:moon-fill" : "ph:coffee-fill") as any}
                                                        sx={{ color: isAway ? '#d97706' : 'warning.main' }}
                                                    />
                                                    <Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                             {(() => {
                                                                 const baseDate = dayjs(login_date || login_time);
                                                                 const fromD = dayjs(brk.break_start);
                                                                 const toD = brk.break_end ? dayjs(brk.break_end) : null;
                                                                 const fromIsDiff = fromD.isValid() && baseDate.isValid() && !fromD.isSame(baseDate, 'day');
                                                                 const fromStr = fromD.isValid() ? (fromIsDiff ? `${fromD.format('h:mm a')} (${fromD.format('DD MMM')})` : fromD.format('h:mm a')) : fTime(brk.break_start);
                                                                 let toStr = 'Current';
                                                                 if (brk.break_end && toD && toD.isValid()) {
                                                                     const toIsDiff = baseDate.isValid() && !toD.isSame(baseDate, 'day');
                                                                     toStr = toIsDiff ? `${toD.format('h:mm a')} (${toD.format('DD MMM')})` : toD.format('h:mm a');
                                                                 }
                                                                 return `${fromStr} — ${toStr}`;
                                                             })()}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25, fontWeight: 600 }}>
                                                            {isAway ? 'Break (Inactivity)' : ((brk.reason || 'Manual Break').replace('Away to Break', ' Break to Lunch Break'))}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: isAway ? '#d97706' : 'warning.main', fontWeight: 900 }}>
                                                            {formatDetailedDuration(brk.break_duration)}
                                                            {` • Source: ${brk.source || 'Manual'}`}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            );
                                        })}
                                    </Stack>
                                )}
                            </Box>
                        </Stack>
                    </Box>
                )}

                {currentTab === 'location' && (
                    <EmployeeLocationTab employeeId={employee} sessionId={detailedSession.name} />
                )}
            </DialogContent>
        </Dialog>
    );
}
