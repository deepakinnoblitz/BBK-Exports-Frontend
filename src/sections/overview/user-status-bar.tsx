import { GiAlarmClock } from "react-icons/gi";
import { TbBellSearch } from "react-icons/tb";
import { IoCalendarNumberOutline } from "react-icons/io5";
import { useRef, useEffect, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { usePresence } from 'src/hooks/use-presence';

import { fTime } from 'src/utils/format-time';
import { getInitials } from 'src/utils/string';
import { stringToColor, stringToDarkColor } from 'src/utils/color-utils';

import { logout } from 'src/api/auth';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

import { ReminderDialog } from './reminder-dialog';
import { MyRemindersDialog } from './my-reminders-dialog';

// ── Module-level singleton for Auto Check-In Dialog ──
let autoCheckedCheckInGlobal = false;

export function resetAutoCheckInState() {
    autoCheckedCheckInGlobal = false;
}

interface UserStatusBarProps {
    disableAutoCheckIn?: boolean;
}

export function UserStatusBar({ disableAutoCheckIn = false }: UserStatusBarProps = {}) {
    const theme = useTheme();
    const { user } = useAuth();
    const {
        status: statusName,
        statusMessage,
        changeStatus,
        setCustomMessage,
        checkTimesheet,
        session,
        loading,
        refresh,
        isAutoStatusEnabled,
        isSystemMonitoring,
        remainingSeconds,
        locationDialogOpen,
        setLocationDialogOpen,
        enableLocationTracking,
        trackOnLogin,
        trackOnLogout,
        trackOnStatusChange,
    } = usePresence();
    const router = useRouter();
    const displayName = user?.full_name || 'User';

    const isHR = user?.roles.some((role: string) =>
        ['HR', 'System Manager', 'Administrator'].includes(role)
    );

    const isEmployee = user?.roles?.some((role: string) => role.toLowerCase() === 'employee');

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [infoDialogOpen, setInfoDialogOpen] = useState(false);
    const [isLogoutDialog, setIsLogoutDialog] = useState(false);
    const [isLoggingLocation, setIsLoggingLocation] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState('Logging Your Location');
    const [statusMsgDialogOpen, setStatusMsgDialogOpen] = useState(false);
    const [customMessage, setCustomMessageInput] = useState('');
    const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
    const [greetingDialogOpen, setGreetingDialogOpen] = useState(false);
    const [randomGreeting, setRandomGreeting] = useState('');
    const [timesheetWarningOpen, setTimesheetWarningOpen] = useState(false);
    const [isCheckingTimesheet, setIsCheckingTimesheet] = useState(false);
    const [idlePermissionDialogOpen, setIdlePermissionDialogOpen] = useState(false);
    const [idleSupportError, setIdleSupportError] = useState<string | null>(null);
    const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
    const [myRemindersDialogOpen, setMyRemindersDialogOpen] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const open = Boolean(anchorEl);

    // Auto-show check-in dialog on load when Offline (one-time only)
    useEffect(() => {
        if (!disableAutoCheckIn && !loading && !autoCheckedCheckInGlobal) {
            autoCheckedCheckInGlobal = true;
            if (statusName === 'Offline') {
                const timer = setTimeout(() => setCheckInDialogOpen(true), 800);
                return () => clearTimeout(timer);
            }
        }
        return undefined;
    }, [loading, statusName, disableAutoCheckIn]);

    // Dynamic message rotator for the location logging overlay
    useEffect(() => {
        let interval: any;

        if (isLoggingLocation) {
            const messages = [
                'Getting GPS Signal...',
                'Fetching Location Data...',
                'Saving Location Log...',
                'Finalizing Status Change...'
            ];

            let index = 0;
            setLoadingMessage(messages[0]);

            interval = setInterval(() => {
                index = (index + 1) % messages.length;
                setLoadingMessage(messages[index]);
            }, 1200);
        } else {
            setLoadingMessage('Logging Your Location');
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [isLoggingLocation]);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleInfoClick = () => {
        setInfoDialogOpen(true);
        setIsLogoutDialog(false);
    };

    const handleInfoDialogClose = () => {
        setInfoDialogOpen(false);
        setIsLogoutDialog(false);
    };

    const handleLogout = async () => {
        setIsLogoutDialog(true);
        setInfoDialogOpen(true);
    };

    const handleConfirmLogout = async () => {
        setIsCheckingTimesheet(true);
        try {
            const res = await checkTimesheet();
            setIsCheckingTimesheet(false);
            if (!res.has_timesheet) {
                setTimesheetWarningOpen(true);
                setInfoDialogOpen(false);
                return;
            }
        } catch (error) {
            console.error('Error checking timesheet:', error);
            setIsCheckingTimesheet(false);
        }
        await performLogout();
    };

    const GREETING_VARIANTS = {
        morning: [
            "Rise and shine! Ready for a productive morning?",
            "Good morning! Let's make today count.",
            "Success starts now! Hope you have a great day.",
            "Good luck with your tasks today! You've got this.",
            "A fresh start for a fresh day. Good morning!"
        ],
        afternoon: [
            "Keep up the momentum! You're doing great.",
            "Good afternoon! Halfway through – you've got this!",
            "Stay focused and power through the afternoon!",
            "Hope your day is going well! Let's keep moving.",
            "Refresh and refocus. Good afternoon!"
        ],
        evening: [
            "Finishing the day strong! Almost there.",
            "Good evening! Great job on your work today.",
            "Ending on a high note! Let's wrap things up.",
            "Success is the sum of small efforts. Great evening!",
            "Time to wind down soon, but first — let's finish strong!"
        ]
    };

    const triggerGreetingDialog = useCallback(() => {
        const hour = new Date().getHours();
        let type: 'morning' | 'afternoon' | 'evening' = 'morning';
        if (hour >= 12 && hour < 17) type = 'afternoon';
        else if (hour >= 17 || hour < 5) type = 'evening';

        const variants = GREETING_VARIANTS[type];
        const randomIndex = Math.floor(Math.random() * variants.length);
        setRandomGreeting(variants[randomIndex]);
        setGreetingDialogOpen(true);
    }, []);

    const performLogout = async () => {
        setInfoDialogOpen(false);
        setIsLogoutDialog(false);
        setPendingStatus('Offline');
        setIsLoggingLocation(true);
        try {
            await changeStatus('Offline');
            await logout();
            window.location.href = '/login';
        } catch (error) {
            console.error(error);
            setIsLoggingLocation(false);
            setPendingStatus(null);
        }
    };

    const handleStatusClick = async (newStatus: string) => {
        if (newStatus === 'Available' && isAutoStatusEnabled) {
            if (!('IdleDetector' in window)) {
                setIdleSupportError('Your browser does not support automatic idle detection. Please use a modern browser like Chrome or Edge to enable the "Available" status.');
                setIdlePermissionDialogOpen(true);
                handleClose();
                return;
            }

            try {
                const permission = await (window as any).IdleDetector.requestPermission();
                if (permission !== 'granted') {
                    // Heuristic: If it returns denied immediately without a prompt (common in Incognito)
                    // or if the user actually denied it.
                    setIdleSupportError('Permission for idle detection was denied or is restricted by your browser (e.g. Incognito mode). This is required for the "Available" status.');
                    setIdlePermissionDialogOpen(true);
                    handleClose();
                    return;
                }
            } catch (error) {
                console.error('IdleDetector Permission Error:', error);
                setIdleSupportError('An error occurred while requesting idle detection permission.');
                setIdlePermissionDialogOpen(true);
                handleClose();
                return;
            }
        }

        if (newStatus === 'Offline') {
            setIsCheckingTimesheet(true);
            try {
                const res = await checkTimesheet();
                setIsCheckingTimesheet(false);
                if (!res.has_timesheet) {
                    setTimesheetWarningOpen(true);
                    handleClose();
                    return;
                }
            } catch (error) {
                console.error('Error checking timesheet:', error);
                setIsCheckingTimesheet(false);
            }
        }
        const willTrackLocation =
            enableLocationTracking && (
                (newStatus === 'Offline' && trackOnLogout) ||
                (statusName === 'Offline' && newStatus !== 'Offline' && (trackOnLogin || trackOnStatusChange)) ||
                (statusName !== 'Offline' && newStatus !== 'Offline' && trackOnStatusChange)
            );

        if (willTrackLocation) {
            setPendingStatus(newStatus);
            setIsLoggingLocation(true);
        }
        handleClose();

        let success: boolean;
        try {
            success = await changeStatus(newStatus);
        } finally {
            if (newStatus !== 'Offline') {
                // For logout the page navigates away, so no need to reset.
                // For all other statuses (including Available/Login), reset the loader.
                setIsLoggingLocation(false);
                setPendingStatus(null);
            }
        }
        if (!success) {
            setIsLoggingLocation(false);
            setPendingStatus(null);
            return;
        }
        if (newStatus === 'Available') {
            triggerGreetingDialog();
        }
    };

    const handleStayOfflineAnyway = async () => {
        setTimesheetWarningOpen(false);
        if (isLogoutDialog) {
            await performLogout();
        } else {
            const willTrack = enableLocationTracking && trackOnLogout;
            if (willTrack) {
                setPendingStatus('Offline');
                setIsLoggingLocation(true);
            }
            try {
                await changeStatus('Offline');
            } finally {
                setIsLoggingLocation(false);
                setPendingStatus(null);
            }
            handleClose();
        }
    };

    const loginTime = user?.last_login ? fTime(user.last_login) : 'N/A';

    const [activeTimer, setActiveTimer] = useState(0); // seconds elapsed
    const [breakTimer, setBreakTimer] = useState(0); // seconds elapsed

    // Update timer base when session data changes
    useEffect(() => {
        if (session?.total_active_seconds !== undefined) {
            setActiveTimer(session.total_active_seconds);
        }
        if (session?.total_break_seconds !== undefined) {
            setBreakTimer(session.total_break_seconds);
        }
    }, [session]);

    // Ticker logic: increment if not Offline and not on Break
    useEffect(() => {
        let interval: any;
        let lastTick = Date.now();

        if (statusName && statusName !== 'Offline' && session) {
            interval = setInterval(() => {
                const now = Date.now();
                const delta = Math.floor((now - lastTick) / 1000);

                if (delta >= 1) {
                    if (statusName === 'Break') {
                        setBreakTimer((prev) => prev + delta);
                    } else if (statusName !== 'Away') {
                        setActiveTimer((prev) => prev + delta);
                    }
                    lastTick = now;
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [statusName, session]);

    // Focus event: refresh active time from API
    useEffect(() => {
        const handleFocus = () => {
            if (refresh) refresh();
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [refresh]);

    const formatTimer = (totalSeconds: number) => {
        const floorSeconds = Math.floor(totalSeconds);
        const hrs = String(Math.floor(floorSeconds / 3600)).padStart(2, '0');
        const mins = String(Math.floor((floorSeconds % 3600) / 60)).padStart(2, '0');
        const secs = String(floorSeconds % 60).padStart(2, '0');
        return `${hrs}:${mins}:${secs}`;
    };


    // User data
    const userName = user?.full_name || 'Guest User';
    const userEmail = user?.email || '';
    const userAvatar = user?.user_image;
    const initials = getInitials(userName);
    const avatarColor = stringToColor(userName);
    const avatarTextColor = stringToDarkColor(userName);

    const statusOptions = [
        { label: 'Available - Logged In', value: 'Available', color: '#22c55e', icon: 'ph:check-circle-fill', buttonIcon: 'ph:check-circle-fill' },
        { label: 'In Client Meeting', value: 'Busy', color: '#ef4444', icon: 'ph:minus-circle-fill', buttonIcon: 'ph:minus-circle-fill' },
        { label: 'Team Discussion', value: 'Do Not Disturb', color: '#b91c1c', icon: 'ph:prohibit-fill', buttonIcon: 'ph:prohibit-fill' },
        { label: 'Lunch Break', value: 'Break', color: '#f59e0b', icon: 'ph:coffee-fill', buttonIcon: 'ph:coffee-fill' },
        { label: 'Break', value: 'Away', color: '#d97706', icon: 'ph:moon-fill', buttonIcon: 'ph:moon-fill' },
        { label: 'Offline - Logout', value: 'Offline', color: '#9ca3af', icon: 'ph:power-fill', buttonIcon: 'ph:power-fill' },
    ];

    const STATUS_DISPLAY_MAP: Record<string, string> = {
        'Available': 'Available - Logged In',
        'Busy': 'In Client Meeting',
        'Do Not Disturb': 'Team Discussion',
        'Break': 'Lunch Break',
        'Away': 'Break',
        'Offline': 'Offline - Logout',
    };

    const currentStatus = statusOptions.find(opt => opt.value === statusName) || statusOptions[5];

    if (isHR || !isEmployee) {
        return null;
    }

    const isPng = userAvatar?.toLowerCase().endsWith('.png') ?? false;

    return (
        <>
            <Box
                sx={{
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.common.white, 0.4)}, 0 4px 12px 0 ${alpha(theme.palette.primary.main, 0.08)}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1.25,
                }}
            >
                {statusName === 'Break' ? (
                    <>
                        <Typography variant="body2" sx={{ mr: 1, color: 'text.secondary' }}>
                            Today Break Time:
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'warning.main', fontWeight: 600 }}>
                            {formatTimer(breakTimer)}
                        </Typography>
                    </>
                ) : (
                    <>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '14px' }}>
                            Today Active Time:
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
                            {formatTimer(activeTimer)}
                        </Typography>
                    </>
                )}
            </Box>
            <Button
                onClick={handleClick}
                sx={{
                    pl: 1,
                    pr: 1.5,
                    py: 0.75,
                    borderRadius: 10,
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    textTransform: 'none',
                    '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                    },
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.5}
                        sx={{
                            px: 1.25,
                            py: 0.5,
                            borderRadius: 10,
                            bgcolor: currentStatus.color,
                            color: 'common.white',
                        }}
                    >
                        {isCheckingTimesheet ? (
                            <CircularProgress size={16} color="inherit" />
                        ) : (
                            <Iconify icon={currentStatus.buttonIcon as any} width={16} />
                        )}
                        <Typography variant="caption" sx={{ fontWeight: 'bold', lineHeight: 1 }}>
                            {STATUS_DISPLAY_MAP[statusName] || currentStatus.label}
                        </Typography>
                    </Stack>

                    <Iconify icon={"eva:chevron-down-fill" as any} width={20} />
                </Stack>
            </Button>

            {statusName === 'Break' && (
                <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleStatusClick('Available')}
                    startIcon={<Iconify icon={"ph:play-fill" as any} />}
                    sx={{
                        ml: 1,
                        borderRadius: 10,
                        px: 2,
                        bgcolor: theme.palette.success.main,
                        '&:hover': {
                            bgcolor: theme.palette.success.dark,
                        },
                        animation: 'pulseGlow 2s infinite ease-in-out',
                        '@keyframes pulseGlow': {
                            '0%': {
                                transform: 'scale(1)',
                                boxShadow: `0 0 0 0 ${alpha(theme.palette.success.main, 0.4)}`
                            },
                            '50%': {
                                transform: 'scale(1.04)',
                                boxShadow: `0 0 20px 4px ${alpha(theme.palette.success.main, 0.2)}`
                            },
                            '100%': {
                                transform: 'scale(1)',
                                boxShadow: `0 0 0 0 ${alpha(theme.palette.success.main, 0)}`
                            },
                        },
                    }}
                >
                    Return to Work
                </Button>
            )}

            {/* <IconButton
                onClick={handleInfoClick}
                sx={{
                    ml: 1,
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                    animation: 'attentionBlink 1.5s ease-in-out infinite',
                    boxShadow: `0 0 0 0 ${alpha(theme.palette.info.main, 0.4)}`,
                    '@keyframes attentionBlink': {
                        '0%, 100%': {
                            opacity: 1,
                            transform: 'scale(1) rotate(0deg)',
                            boxShadow: `0 0 0 0 ${alpha(theme.palette.info.main, 0.4)}`,
                        },
                        '25%': {
                            opacity: 0.8,
                            transform: 'scale(1.1) rotate(-5deg)',
                            boxShadow: `0 0 0 8px ${alpha(theme.palette.info.main, 0)}`,
                        },
                        '50%': {
                            opacity: 0.6,
                            transform: 'scale(1.2) rotate(5deg)',
                            boxShadow: `0 0 0 12px ${alpha(theme.palette.info.main, 0.1)}`,
                        },
                        '75%': {
                            opacity: 0.8,
                            transform: 'scale(1.1) rotate(-5deg)',
                            boxShadow: `0 0 0 8px ${alpha(theme.palette.info.main, 0)}`,
                        },
                    },
                    '&:hover': {
                        animation: 'none',
                        transform: 'scale(1.1)',
                        boxShadow: `0 4px 12px ${alpha(theme.palette.info.main, 0.3)}`,
                        transition: 'all 0.2s ease',
                    },
                }}
            >
                <Iconify
                    icon={"eva:info-outline" as any}
                    width={20}
                    sx={{
                        color: 'info.main',
                        filter: 'drop-shadow(0 0 4px rgba(25, 118, 210, 0.3))',
                    }}
                />
            </IconButton> */}

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                    sx: {
                        minWidth: 320,
                        boxShadow: theme.shadows[20],
                    },
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        px: 2,
                        py: 1.5,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Daily Login
                    </Typography>
                </Box>

                <Divider />

                {/* User Card */}
                <Box sx={{ px: 1.5, py: 1.5 }}>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Avatar
                            src={userAvatar}
                            sx={{
                                width: 48,
                                height: 48,
                                bgcolor: (t) => {
                                    if (userAvatar) return 'common.white';
                                    return stringToColor(userName || '');
                                },
                                color: (t) => {
                                    if (userAvatar) return 'inherit';
                                    return stringToDarkColor(userName || '');
                                },
                                fontWeight: 'bold',
                                border: (t) => {
                                    if (userAvatar) return `2px solid ${t.palette.divider}`;
                                    return `2px solid ${alpha(stringToDarkColor(userName || ''), 0.5)}`;
                                },
                            }}
                        >
                            {userName.charAt(0).toUpperCase()}
                        </Avatar>

                        <Stack spacing={0.5} flex={1}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {userName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {userEmail}
                            </Typography>
                        </Stack>
                    </Stack>
                </Box>

                <Divider />

                {/* Status Option */}
                <Box sx={{ px: 1, py: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                        Set a status
                    </Typography>
                </Box>
                {statusOptions.map((item) => (
                    <MenuItem
                        key={item.value}
                        onClick={() => handleStatusClick(item.value)}
                        sx={{
                            mx: 1,
                            mt: 0.5,
                            mb: 0.5,
                            borderRadius: 1,
                            display: 'flex',
                            justifyContent: 'space-between',
                            '&:hover': {
                                backgroundColor: alpha(theme.palette.grey[500], 0.08),
                            },
                        }}
                    >
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Box
                                sx={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    bgcolor: item.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'common.white',
                                }}
                            >
                                <Iconify icon={item.icon as any} width={12} />
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {item.label}
                            </Typography>
                        </Stack>
                        {statusName === item.value && (
                            <Typography variant="caption" sx={{ color: 'primary.main' }}>
                                Selected
                            </Typography>
                        )}
                    </MenuItem>
                ))}

                <Divider />

                {/* My Timesheet */}
                <MenuItem
                    onClick={() => {
                        handleClose();
                        router.push('/timesheets');
                    }}
                    sx={{
                        mx: 1,
                        mb: 1,
                        borderRadius: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        '&:hover': {
                            backgroundColor: alpha(theme.palette.grey[500], 0.08),
                        },
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <IoCalendarNumberOutline size={20} color="#656565" />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            My Timesheet
                        </Typography>
                    </Stack>
                    <Iconify icon="eva:chevron-right-fill" width={20} sx={{ color: 'text.secondary' }} />
                </MenuItem>

                {/* Set Reminder */}
                <MenuItem
                    onClick={() => {
                        handleClose();
                        setReminderDialogOpen(true);
                    }}
                    sx={{
                        mx: 1,
                        mb: 1,
                        borderRadius: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        '&:hover': {
                            backgroundColor: alpha(theme.palette.grey[500], 0.08),
                        },
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <GiAlarmClock size={22} color="#262626" />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            Set Reminder
                        </Typography>
                    </Stack>
                    <Iconify icon="eva:chevron-right-fill" width={20} sx={{ color: 'text.secondary' }} />
                </MenuItem>

                {/* My Reminders */}
                <MenuItem
                    onClick={() => {
                        handleClose();
                        setMyRemindersDialogOpen(true);
                    }}
                    sx={{
                        mx: 1,
                        mb: 1,
                        borderRadius: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        '&:hover': {
                            backgroundColor: alpha(theme.palette.grey[500], 0.08),
                        },
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <TbBellSearch size={20} color="#494949" />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            My Reminders
                        </Typography>
                    </Stack>
                    <Iconify icon="eva:chevron-right-fill" width={20} sx={{ color: 'text.secondary' }} />
                </MenuItem>

                <Divider />
            </Menu>


            {/* ── Check-In Dialog (Redesigned) ── */}
            <Dialog
                open={checkInDialogOpen}
                onClose={(event, reason) => {
                    if (reason !== 'backdropClick') {
                        setCheckInDialogOpen(false);
                    }
                }}
                PaperProps={{
                    sx: {
                        borderRadius: 3.5,
                        width: '100%',
                        maxWidth: 420,
                        overflow: 'hidden',
                        bgcolor: 'background.paper',
                        boxShadow: `0 24px 72px -12px ${alpha(theme.palette.common.black, 0.24)}`,
                    }
                }}
            >
                {/* Decorative Background Element */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: -100,
                        right: -100,
                        width: 200,
                        height: 200,
                        borderRadius: '50%',
                        bgcolor: alpha(theme.palette.success.main, 0.08),
                        zIndex: 0,
                    }}
                />

                <DialogContent sx={{ px: 4, pt: 6, pb: 4, textAlign: 'center', position: 'relative', zIndex: 1 }}>
                    {/* Centered Avatar with Ring */}
                    <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
                        <IconButton
                            sx={{
                                p: '2px',
                                width: 90,
                                height: 90,
                                background: `linear-gradient(135deg, ${theme.palette.primary.darker} 0%, #00f2ff 50%, ${theme.palette.primary.darker} 100%)`,
                                backgroundSize: '200% 200%',
                                animation: 'shimmer 2.5s ease infinite',
                                '@keyframes shimmer': {
                                    '0%': { backgroundPosition: '0% 50%' },
                                    '50%': { backgroundPosition: '100% 50%' },
                                    '100%': { backgroundPosition: '0% 50%' },
                                },
                                transition: theme.transitions.create('all'),
                                '&:hover': {
                                    transform: 'scale(1.05)',
                                    boxShadow: `0 0 15px ${theme.palette.primary.main}40`,
                                }
                            }}
                        >
                            <Avatar
                                src={userAvatar}
                                alt={displayName}
                                sx={{
                                    width: 1,
                                    height: 1,
                                    bgcolor: !userAvatar ? stringToColor(displayName) : (isPng ? '#FFFFFF' : 'transparent'),
                                    color: stringToDarkColor(displayName),
                                    fontWeight: 600,
                                    fontSize: '28px',
                                    border: `2px solid ${theme.palette.background.paper}`,
                                }}
                            >
                                {displayName.charAt(0).toUpperCase()}
                            </Avatar>
                        </IconButton>
                    </Box>

                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 1, letterSpacing: -0.5 }}>
                        Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {userName.split(' ')[0]}!
                    </Typography>

                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 5, fontWeight: 500 }}>
                        Ready to start your productive session today?
                    </Typography>

                    {/* Primary Check-In Button */}
                    <Button
                        variant="contained"
                        size="large"
                        fullWidth
                        onClick={async () => {
                            if (isAutoStatusEnabled) {
                                if (!('IdleDetector' in window)) {
                                    setIdleSupportError('Your browser does not support automatic idle detection. Please use a modern browser like Chrome or Edge.');
                                    setIdlePermissionDialogOpen(true);
                                    return;
                                }

                                const permission = await (window as any).IdleDetector.requestPermission();
                                if (permission !== 'granted') {
                                    setIdleSupportError('Permission for idle detection was denied or is restricted by your browser.');
                                    setIdlePermissionDialogOpen(true);
                                    return;
                                }
                            }
                            const willTrack = enableLocationTracking && (trackOnLogin || trackOnStatusChange);
                            if (willTrack) {
                                setPendingStatus('Available');
                                setIsLoggingLocation(true);
                            }
                            setCheckInDialogOpen(false);
                            let success = false;
                            try {
                                success = await changeStatus('Available');
                            } finally {
                                setIsLoggingLocation(false);
                                setPendingStatus(null);
                            }
                            if (!success) {
                                return;
                            }
                            triggerGreetingDialog();
                        }}
                        sx={{
                            py: 2,
                            borderRadius: 2,
                            fontSize: 16,
                            fontWeight: 700,
                            textTransform: 'none',
                            background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                            boxShadow: `0 8px 24px -4px ${alpha(theme.palette.success.main, 0.4)}`,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: `0 12px 32px -4px ${alpha(theme.palette.success.main, 0.5)}`,
                                background: `linear-gradient(135deg, ${theme.palette.success.light} 0%, ${theme.palette.success.main} 100%)`,
                            },
                            '&:active': {
                                transform: 'translateY(0)',
                            }
                        }}
                    >
                        <Stack direction="row" alignItems="center" spacing={1.5} justifyContent="center">
                            <Iconify icon={"eva:play-fill" as any} width={24} />
                            <span>Available - Logged In</span>
                        </Stack>
                    </Button>
                </DialogContent>

                <DialogActions sx={{ pb: 4, px: 4, justifyContent: 'center' }}>
                    <Button
                        size="small"
                        onClick={() => setCheckInDialogOpen(false)}
                        sx={{
                            color: 'text.disabled',
                            textTransform: 'none',
                            fontWeight: 600,
                            '&:hover': {
                                color: 'text.secondary',
                                bgcolor: alpha(theme.palette.grey[500], 0.08)
                            }
                        }}
                    >
                        Stay Offline - Logout for now
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Status Message Dialog */}
            <Dialog
                open={statusMsgDialogOpen}
                onClose={() => setStatusMsgDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Set a Status Message</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        {statusName !== 'Available' && statusName !== 'Offline' && (
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                Default for <b>{STATUS_DISPLAY_MAP[statusName] || statusName}</b>: &quot;{{
                                    Busy: 'In client meeting',
                                    'Do Not Disturb': 'Team discussion',
                                    Break: 'On lunch break',
                                    Away: 'Break',
                                }[statusName] || ''}&quot;
                            </Typography>
                        )}
                        <TextField
                            autoFocus
                            fullWidth
                            size="small"
                            label="Your custom message"
                            placeholder="What's on your mind?"
                            value={customMessage}
                            onChange={(e) => setCustomMessageInput(e.target.value)}
                            inputProps={{ maxLength: 100 }}
                            helperText={`${customMessage.length}/100`}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setStatusMsgDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={async () => {
                            await setCustomMessage(customMessage);
                            setStatusMsgDialogOpen(false);
                        }}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Timesheet Warning Dialog */}
            <Dialog
                open={timesheetWarningOpen}
                onClose={() => setTimesheetWarningOpen(false)}
                PaperProps={{
                    sx: { borderRadius: 2.5, width: '100%', maxWidth: 420 }
                }}
            >
                <DialogTitle sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 5, pb: 1 }}>
                    <Box
                        sx={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: alpha(theme.palette.error.main, 0.08),
                            mb: 2.5,
                        }}
                    >
                        <Iconify icon={"ph:warning-circle-fill" as any} sx={{ color: 'error.main', width: 40, height: 40 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        Missing Timesheet!
                    </Typography>
                </DialogTitle>

                <DialogContent sx={{ py: 1.5, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', px: 3 }}>
                        You haven&apos;t filed a timesheet for today. Please complete it before going offline to track your progress accurately.
                    </Typography>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 5, pt: 3, justifyContent: 'center', gap: 2 }}>
                    <Button
                        variant="outlined"
                        onClick={handleStayOfflineAnyway}
                        sx={{
                            borderRadius: 1.25,
                            minWidth: 120,
                            borderColor: alpha(theme.palette.grey[500], 0.24),
                            color: 'text.secondary',
                            fontWeight: 600,
                            '&:hover': {
                                borderColor: theme.palette.text.primary,
                                bgcolor: alpha(theme.palette.grey[500], 0.08),
                                color: 'text.primary',
                            }
                        }}
                    >
                        Stay Offline
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                            setTimesheetWarningOpen(false);
                            router.push('/timesheets');
                        }}
                        sx={{
                            borderRadius: 1.25,
                            minWidth: 150,
                            fontWeight: 700,
                            boxShadow: `0 8px 16px 0 ${alpha(theme.palette.primary.main, 0.24)}`
                        }}
                    >
                        Make a Timesheet
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Logout / Info Dialog */}
            <Dialog
                open={infoDialogOpen}
                onClose={handleInfoDialogClose}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ textAlign: 'center', fontWeight: 600 }}>
                    {isLogoutDialog ? 'Logout Confirmation' : 'Information'}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ textAlign: 'center', py: 2 }}>
                        Please login just inform
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
                    {isLogoutDialog ? (
                        <>
                            <Button
                                onClick={handleInfoDialogClose}
                                sx={{ minWidth: 100, mr: 1 }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConfirmLogout}
                                variant="contained"
                                color="error"
                                sx={{ minWidth: 100 }}
                            >
                                Logout
                            </Button>
                        </>
                    ) : (
                        <Button
                            onClick={handleInfoDialogClose}
                            variant="contained"
                            sx={{ minWidth: 100 }}
                        >
                            OK
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* GPS Location Logging Overlay */}
            <Dialog
                open={isLoggingLocation}
                disableEscapeKeyDown
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        width: '100%',
                        maxWidth: 420,
                        overflow: 'hidden',
                        bgcolor: 'background.paper',
                        boxShadow: theme.customShadows.z24,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                    },
                }}
            >
                <DialogContent
                    sx={{
                        py: 5,
                        px: 4,
                        textAlign: 'center',
                    }}
                >
                    {/* Animated GPS Icon */}
                    <Box
                        sx={{
                            position: 'relative',
                            display: 'inline-flex',
                            mb: 3,
                        }}
                    >
                        <Box
                            sx={{
                                width: 92,
                                height: 92,
                                borderRadius: '50%',
                                bgcolor: alpha('#08A3CD', 0.08),
                                border: `2px solid ${alpha('#08A3CD', 0.15)}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                animation: 'gpsPulse 2s infinite',

                                '@keyframes gpsPulse': {
                                    '0%': {
                                        boxShadow: `0 0 0 0 ${alpha('#08A3CD', 0.35)}`,
                                    },
                                    '70%': {
                                        boxShadow: `0 0 0 22px ${alpha('#08A3CD', 0)}`,
                                    },
                                    '100%': {
                                        boxShadow: `0 0 0 0 ${alpha('#08A3CD', 0)}`,
                                    },
                                },
                            }}
                        >
                            <Iconify
                                icon={"solar:gps-bold-duotone" as any}
                                width={46}
                                sx={{
                                    color: '#08A3CD',
                                }}
                            />
                        </Box>

                        {/* Rotating Ring */}
                        <Box
                            sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                width: 118,
                                height: 118,
                                borderRadius: '50%',
                                border: `2px dashed ${alpha('#08A3CD', 0.18)}`,
                                transform: 'translate(-50%, -50%)',
                                animation: 'rotateRing 6s linear infinite',

                                '@keyframes rotateRing': {
                                    from: {
                                        transform: 'translate(-50%, -50%) rotate(0deg)',
                                    },
                                    to: {
                                        transform: 'translate(-50%, -50%) rotate(360deg)',
                                    },
                                },
                            }}
                        />
                    </Box>

                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 700,
                            color: 'text.primary',
                            my: 2,
                        }}
                    >
                        {loadingMessage}
                    </Typography>

                    <Typography
                        variant="body2"
                        sx={{
                            color: 'text.secondary',
                            mb: 4,
                            lineHeight: 1.7,
                        }}
                    >
                        {pendingStatus === 'Offline'
                            ? 'Please wait while we securely capture your GPS location before completing the logout process.'
                            : 'Please wait while we securely capture your GPS location before updating your status.'}
                    </Typography>

                    {/* Steps */}
                    <Stack
                        spacing={2}
                        sx={{
                            mb: 2,
                            mx: 'auto',
                            width: 'fit-content',
                            textAlign: 'left',
                        }}
                    >
                        {[
                            {
                                icon: 'solar:gps-bold',
                                title: 'Getting Current Location',
                            },
                            {
                                icon: 'solar:map-point-bold',
                                title: 'Saving Location Log',
                            },
                            {
                                icon: pendingStatus === 'Offline' ? 'solar:logout-bold' : 'solar:login-bold',
                                title: pendingStatus === 'Offline'
                                    ? 'Completing Logout'
                                    : (pendingStatus === 'Available' ? 'Completing Check-In' : 'Updating Status'),
                            },
                        ].map((item) => (
                            <Stack
                                key={item.title}
                                direction="row"
                                spacing={2}
                                alignItems="center"
                            >
                                <Box
                                    sx={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: 2,
                                        bgcolor: alpha('#08A3CD', 0.08),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    <Iconify
                                        icon={item.icon as any}
                                        width={20}
                                        sx={{
                                            color: '#08A3CD',
                                        }}
                                    />
                                </Box>

                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: 'text.primary',
                                        fontWeight: 500,
                                    }}
                                >
                                    {item.title}
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                </DialogContent>
            </Dialog>

            {/* GPS Location Turn On Warning */}
            <Dialog
                open={locationDialogOpen}
                onClose={() => setLocationDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        p: 1,
                    },
                }}
            >
                <DialogContent
                    sx={{
                        textAlign: 'center',
                        py: 4,
                    }}
                >
                    <Box
                        sx={{
                            width: 90,
                            height: 90,
                            borderRadius: '50%',
                            bgcolor: alpha(theme.palette.warning.main, 0.12),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mx: 'auto',
                            mb: 3,
                        }}
                    >
                        <Iconify
                            icon={"solar:gps-bold-duotone" as any}
                            width={48}
                            sx={{
                                color: 'warning.main',
                            }}
                        />
                    </Box>

                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 700,
                            mb: 1,
                        }}
                    >
                        Location Required
                    </Typography>

                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                            lineHeight: 1.8,
                            mb: 2,
                        }}
                    >
                        Please turn on your device location services and allow GPS
                        permission to change your work status.
                    </Typography>

                    <Box
                        sx={{
                            p: 2.25,
                            borderRadius: 2,
                            bgcolor: alpha(theme.palette.primary.main, 0.04),
                            border: `1px dashed ${alpha(theme.palette.primary.main, 0.25)}`,
                            textAlign: 'left',
                            mt: 1,
                        }}
                    >
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                            <Iconify icon={"solar:lock-keyhole-minimalistic-bold-duotone" as any} width={20} sx={{ color: 'primary.main' }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.875rem' }}>
                                How to enable location in your browser:
                            </Typography>
                        </Stack>

                        <Stack spacing={1.25}>
                            {[
                                { step: '1', text: <>Click the <b>Lock 🔒</b> or <b>Site Settings ⚙️</b> icon next to the URL address bar.</> },
                                { step: '2', text: <>Change <b>Location</b> permission from <i>Block</i> to <b>Allow</b>.</> },
                                { step: '3', text: <>Click <b>Try Again</b> below to proceed.</> },
                            ].map((item) => (
                                <Stack key={item.step} direction="row" alignItems="flex-start" spacing={1.25}>
                                    <Box
                                        sx={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: '50%',
                                            bgcolor: alpha(theme.palette.primary.main, 0.12),
                                            color: 'primary.main',
                                            fontSize: '0.75rem',
                                            fontWeight: 800,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            mt: 0.1,
                                        }}
                                    >
                                        {item.step}
                                    </Box>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5, fontWeight: 500, fontSize: '0.8125rem' }}>
                                        {item.text}
                                    </Typography>
                                </Stack>
                            ))}
                        </Stack>
                    </Box>
                </DialogContent>

                <DialogActions
                    sx={{
                        px: 3,
                        pb: 3,
                        justifyContent: 'center',
                    }}
                >
                    <Button
                        variant="outlined"
                        onClick={() => setLocationDialogOpen(false)}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                            setLocationDialogOpen(false);

                            if (navigator.geolocation) {
                                navigator.geolocation.getCurrentPosition(
                                    (position) => {
                                        console.log('[Location] Permission granted via Try Again:', position);
                                        if (pendingStatus) {
                                            handleStatusClick(pendingStatus);
                                        }
                                    },
                                    (error) => {
                                        console.error('[Location] Permission error on Try Again:', error);
                                        setTimeout(() => setLocationDialogOpen(true), 300);
                                    },
                                    {
                                        enableHighAccuracy: true,
                                        timeout: 10000,
                                        maximumAge: 0,
                                    }
                                );
                            }
                        }}
                    >
                        Try Again
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Idle Detector Permission Dialog */}
            <Dialog
                open={idlePermissionDialogOpen}
                onClose={() => setIdlePermissionDialogOpen(false)}
                PaperProps={{
                    sx: { borderRadius: 2, width: '100%', maxWidth: 400 }
                }}
            >
                <DialogTitle sx={{ pt: 4, textAlign: 'center' }}>
                    <Box
                        sx={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: alpha(theme.palette.warning.main, 0.08),
                            mx: 'auto',
                            mb: 2,
                        }}
                    >
                        <Iconify icon={"ph:shield-warning-fill" as any} sx={{ color: 'warning.main', width: 40, height: 40 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {idleSupportError?.includes('support') || idleSupportError?.includes('Incognito') ? 'Detection Unvailable' : 'Permission Required'}
                    </Typography>
                </DialogTitle>

                <DialogContent sx={{ py: 1, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', px: 2, mb: 2 }}>
                        {idleSupportError}
                    </Typography>

                    {!idleSupportError?.includes('support') && (
                        <Box sx={{ bgcolor: 'background.neutral', p: 2, borderRadius: 1.5, textAlign: 'left' }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5, color: 'text.primary' }}>
                                How to unblock:
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                1. Click the <b>Lock 🔒</b> or <b>Settings ⚙️</b> icon in your browser address bar.
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                2. Find <b>Idle Detection</b> and set it to <b>Allow</b> or <b>Ask</b>.
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
                                3. Toggle this switch again to retry.
                            </Typography>
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 4, pt: 2, justifyContent: 'center' }}>
                    <Button
                        variant="outlined"
                        onClick={() => setIdlePermissionDialogOpen(false)}
                        sx={{ borderRadius: 1.25, minWidth: 100 }}
                    >
                        Cancel
                    </Button>
                    {!idleSupportError?.includes('support') && (
                        <Button
                            variant="contained"
                            onClick={async () => {
                                setIdlePermissionDialogOpen(false);
                                // Small delay to allow dialog to close before re-triggering
                                setTimeout(() => handleStatusClick('Available'), 100);
                            }}
                            sx={{ borderRadius: 1.25, minWidth: 120, fontWeight: 700 }}
                        >
                            Try Again
                        </Button>
                    )}
                    {idleSupportError?.includes('support') && (
                        <Button
                            variant="contained"
                            onClick={() => setIdlePermissionDialogOpen(false)}
                            sx={{ borderRadius: 1.25, minWidth: 120, fontWeight: 700 }}
                        >
                            Understood
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Randomized Greeting Dialog (Refined Split Layout) */}
            <Dialog
                open={greetingDialogOpen}
                onClose={() => setGreetingDialogOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: 'transparent',
                        boxShadow: 'none',
                        maxWidth: '1000px',
                        overflow: 'visible',
                        fontFamily: '"DM Sans Variable",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"',
                    }
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        alignItems: 'center',
                        bgcolor: 'background.paper',
                        borderRadius: 4,
                        overflow: 'hidden',
                        position: 'relative',
                        boxShadow: theme.customShadows.z24,
                    }}
                >
                    {/* Left Column: Illustration (Made slightly bigger) */}
                    <Box
                        sx={{
                            flex: 1.4,
                            height: { xs: 300, md: 500 },
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: { xs: 2, md: 4 },
                        }}
                    >
                        <Box
                            component="img"
                            src={`${import.meta.env.BASE_URL}assets/illustrations/collaboration.png`}
                            sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                            }}
                        />
                    </Box>

                    {/* Right Column: Content */}
                    <Box
                        sx={{
                            flex: 1,
                            p: { xs: 4, md: 1 },
                            textAlign: 'left',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                        }}
                    >
                        <Typography

                            sx={{
                                fontWeight: 800,
                                mb: 1.5,
                                color: 'text.primary',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                fontFamily: 'inherit',
                                fontSize: '22px', // Balanced size based on user request
                                letterSpacing: -0.5,
                            }}
                        >
                            {(() => {
                                const hour = new Date().getHours();
                                if (hour >= 5 && hour < 12) return 'Good Morning';
                                if (hour >= 12 && hour < 17) return 'Good Afternoon';
                                return 'Good Evening';
                            })()}, {userName.split(' ')[0]} <span style={{ marginLeft: '4px' }}>👋</span>
                        </Typography>

                        <Typography
                            variant="body1"
                            sx={{
                                color: 'text.secondary',
                                fontWeight: 500,
                                mb: 3.5,
                                lineHeight: 1.6,
                                fontSize: 18,
                                fontFamily: 'inherit',
                            }}
                        >
                            {randomGreeting}
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, flexWrap: 'wrap' }}>
                            <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 500, fontFamily: 'inherit' }}>
                                You are now marked as
                            </Typography>
                            <Box
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    bgcolor: '#54B47B', // Matched Green from Reference
                                    color: 'white',
                                    px: 2,
                                    py: 0.75,
                                    borderRadius: '30px',
                                    fontWeight: 600,
                                    fontSize: 16,
                                }}
                            >
                                <Iconify icon="solar:check-circle-bold" width={20} />
                                Available.
                            </Box>
                        </Box>

                        <Typography
                            variant="h5"
                            sx={{
                                color: 'text.secondary',
                                fontWeight: 600,
                                mb: 3,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                fontFamily: 'inherit',
                            }}
                        >
                            Have a productive day ahead <span style={{ fontSize: '28px' }}>🚀</span>
                        </Typography>

                        <Button
                            variant="contained"
                            size="large"
                            onClick={() => setGreetingDialogOpen(false)}
                            sx={{
                                borderRadius: 1.5,
                                py: 1,
                                px: 2,
                                fontWeight: 700,
                                fontSize: 14,
                                alignSelf: 'flex-start',
                                textTransform: 'none',
                                fontFamily: 'inherit',
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                                boxShadow: `0 12px 24px -6px ${alpha(theme.palette.primary.main, 0.4)}`,
                                transition: theme.transitions.create(['all'], { duration: theme.transitions.duration.shorter }),
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: `0 16px 32px -8px ${alpha(theme.palette.primary.main, 0.5)}`,
                                }
                            }}
                        >
                            Let&apos;s Get Started!
                        </Button>
                    </Box>
                </Box>
            </Dialog>

            <ReminderDialog
                open={reminderDialogOpen}
                onClose={() => setReminderDialogOpen(false)}
                onSuccess={(msg) => setSnackbar({ open: true, message: msg, severity: 'success' })}
                onError={(msg) => setSnackbar({ open: true, message: msg, severity: 'error' })}
            />

            <MyRemindersDialog
                open={myRemindersDialogOpen}
                onClose={() => setMyRemindersDialogOpen(false)}
                onSuccess={(msg) => setSnackbar({ open: true, message: msg, severity: 'success' })}
                onError={(msg) => setSnackbar({ open: true, message: msg, severity: 'error' })}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: '100%', borderRadius: 1.5 }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}
