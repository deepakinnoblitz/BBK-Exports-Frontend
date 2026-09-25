import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import { alpha, styled, useTheme } from '@mui/material/styles';

import { usePresence } from 'src/hooks/use-presence';

import { fTime } from 'src/utils/format-time';
import { getInitials } from 'src/utils/string';
import { stringToColor, stringToDarkColor } from 'src/utils/color-utils';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

// ----------------------------------------------------------------------

const RootCard = styled('div')(({ theme }) => ({
    padding: theme.spacing(3),
    borderRadius: 24,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(3),
    transition: theme.transitions.create(['transform', 'box-shadow']),
    border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
    '&:hover': {
        boxShadow: `0 12px 32px ${alpha(theme.palette.common.black, 0.08)}`,
    },
}));

const Glow = styled('div')<{ bgcolor: string }>(({ bgcolor }) => ({
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: '50%',
    background: bgcolor,
    filter: 'blur(60px)',
    opacity: 0.15,
    zIndex: 0,
}));

// ----------------------------------------------------------------------

export function TodayPresenceWidget() {
    const theme = useTheme();
    const { user } = useAuth();
    const {
        status: statusName,
        changeStatus,
        session,
        loading,
        isAutoStatusEnabled,
    } = usePresence();

    if (loading) return null;

    const statusOptions = [
        { label: 'Available - Logged In', value: 'Available', color: theme.palette.success.main, icon: 'ph:check-circle-fill' },
        { label: 'In Client Meeting', value: 'Busy', color: theme.palette.error.main, icon: 'ph:minus-circle-fill' },
        { label: 'Team Discussion', value: 'Do Not Disturb', color: theme.palette.error.dark, icon: 'ph:prohibit-fill' },
        { label: 'Lunch Break', value: 'Break', color: theme.palette.warning.main, icon: 'ph:coffee-fill' },
        { label: 'Break', value: 'Away', color: theme.palette.warning.dark, icon: 'ph:moon-fill' },
        { label: 'Offline - Logout', value: 'Offline', color: theme.palette.grey[500], icon: 'ph:power-fill' },
    ];

    const currentStatus = statusOptions.find(opt => opt.value === statusName) || statusOptions[5];

    const formatTimer = (totalSeconds: number = 0) => {
        const floorSeconds = Math.floor(totalSeconds);
        const hrs = String(Math.floor(floorSeconds / 3600)).padStart(2, '0');
        const mins = String(Math.floor((floorSeconds % 3600) / 60)).padStart(2, '0');
        const secs = String(floorSeconds % 60).padStart(2, '0');
        return `${hrs}:${mins}:${secs}`;
    };

    const handleCheckIn = async () => {
        if (isAutoStatusEnabled && 'IdleDetector' in window) {
             const permission = await (window as any).IdleDetector.requestPermission();
             if (permission !== 'granted') {
                 // Fallback
             }
        }
        await changeStatus('Available');
    };

    const userName = user?.full_name || 'User';
    const userAvatar = user?.user_image;
    const initials = getInitials(userName);
    const avatarColor = stringToColor(userName);
    const avatarTextColor = stringToDarkColor(userName);

    return (
        <RootCard sx={{ bgcolor: alpha(currentStatus.color, 0.03) }}>
            <Glow bgcolor={currentStatus.color} />
            
            <Stack direction="row" alignItems="center" spacing={3} sx={{ zIndex: 1, width: 1 }}>
                <Avatar
                    src={userAvatar}
                    sx={{
                        width: 64,
                        height: 64,
                        bgcolor: userAvatar ? 'common.white' : avatarColor,
                        color: avatarTextColor,
                        fontWeight: 'bold',
                        border: `2px solid ${alpha(currentStatus.color, 0.4)}`,
                        boxShadow: `0 0 20px ${alpha(currentStatus.color, 0.2)}`,
                    }}
                >
                    {initials}
                </Avatar>

                <Stack spacing={0.5} flex={1}>
                    <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, letterSpacing: 1 }}>
                        Your Current Status
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Iconify icon={currentStatus.icon as any} sx={{ color: currentStatus.color }} width={24} />
                        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
                            {currentStatus.label}
                        </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {statusName === 'Offline' ? 'You are not checked in for today.' : `You have been active since ${fTime(session?.login_time || new Date())}`}
                    </Typography>
                </Stack>

                <Stack spacing={1} alignItems="flex-end">
                    {statusName === 'Offline' ? (
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleCheckIn}
                            startIcon={<Iconify icon={"ph:play-fill" as any} />}
                            sx={{
                                borderRadius: 2,
                                px: 4,
                                py: 1.5,
                                fontSize: 16,
                                fontWeight: 800,
                                background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                                boxShadow: `0 8px 24px ${alpha(theme.palette.success.main, 0.3)}`,
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: `0 12px 32px ${alpha(theme.palette.success.main, 0.4)}`,
                                }
                            }}
                        >
                            Mark Available
                        </Button>
                    ) : (
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, display: 'block' }}>
                                Today Active Time
                            </Typography>
                            <Typography variant="h3" sx={{ color: 'primary.main', fontWeight: 900 }}>
                                {formatTimer(session?.total_active_seconds)}
                            </Typography>
                        </Box>
                    )}
                </Stack>
            </Stack>
        </RootCard>
    );
}
