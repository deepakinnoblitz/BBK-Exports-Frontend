import '@livekit/components-styles/index.css';

// ── Global styles for LiveKit device-selector dropdown popup ──────────────────
const LIVEKIT_DROPDOWN_STYLE = `
  .lk-device-menu, .custom-device-dropdown {
    background: rgba(18, 18, 22, 0.96) !important;
    backdrop-filter: blur(16px) !important;
    -webkit-backdrop-filter: blur(16px) !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    border-radius: 14px !important;
    padding: 8px !important;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) !important;
    min-width: 440px !important;
    overflow: hidden !important;
  }
  .lk-device-menu button, .lk-device-menu [role="menuitem"], .lk-menu-item {
    color: rgba(255,255,255,0.9) !important;
    background: transparent !important;
    border: none !important;
    border-radius: 4px !important;
    padding: 10px 14px !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    letter-spacing: 0.01em !important;
    cursor: pointer !important;
    width: 100% !important;
    text-align: left !important;
    transition: all 0.2s ease !important;
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    margin-bottom: 2px !important;
    white-space: nowrap !important;
    /* Ensure no circles here */
    box-shadow: none !important;
    transform: none !important;
  }
  .lk-device-menu button:last-child { margin-bottom: 0 !important; }
  .lk-device-menu button:hover, .lk-menu-item:hover {
    background: rgba(255,255,255,0.1) !important;
    color: white !important;
  }
  /* Remove any circular artifacts in the menu */
  .lk-device-menu button::before, .lk-device-menu button::after {
    display: none !important;
  }
  .lk-device-menu button[aria-checked="true"], .lk-menu-item[data-selected] {
    background: rgba(255, 255, 255, 0.1) !important;
    color: white !important;
  }
  .lk-device-menu button[aria-checked="true"]::before {
    display: block !important;
    content: "✓" !important;
    margin-right: 8px !important;
    color: #FF3B30 !important;
    font-weight: 700 !important;
  }
  /* FORCED RESET FOR TRIGGERS - Specific targeting to avoid menu transparency */
  .lk-control-bar .lk-media-device-select__trigger,
  .lk-control-bar .lk-media-device-select__trigger:hover,
  .lk-control-bar .lk-media-device-select__trigger[aria-expanded="true"],
  .lk-control-bar .lk-media-device-select__trigger[data-state="open"],
  /* Target the button inside the trigger if it exists */
  .lk-control-bar .lk-media-device-select__trigger > button {
    background: transparent !important;
    background-color: transparent !important;
    box-shadow: none !important;
    border: none !important;
    outline: none !important;
  }
  /* Restore Dropdown Menu Background */
  .lk-device-menu, .custom-device-dropdown {
    background: rgba(15, 15, 20, 0.98) !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    border: 1px solid rgba(255,255,255,0.14) !important;
    border-radius: 12px !important;
    padding: 8px !important;
    box-shadow: 0 24px 80px rgba(0,0,0,0.8) !important;
    z-index: 1000 !important;
  }
  /* Popover/menu backdrop */
  .lk-focus-layout, [data-lk-theme], .custom-device-dropdown {
    font-family: 'Public Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  }
  /* Stylize Participant Name Tag */
  .lk-participant-placeholder, 
  .lk-participant-tile, 
  .lk-video-container, 
  .lk-grid-layout, 
  .lk-focus-layout {
    background: #0a0a0c !important;
    border: none !important;
  }
  .lk-participant-name {
    background: rgba(22, 22, 26, 0.7) !important;
    backdrop-filter: blur(12px) saturate(160%) !important;
    -webkit-backdrop-filter: blur(12px) saturate(160%) !important;
    border-radius: 8px !important;
    padding: 6px 12px !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    color: white !important;
    bottom: 16px !important;
    left: 16px !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    letter-spacing: 0.01em !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
    text-shadow: 0 1px 2px rgba(0,0,0,0.5) !important;
  }
  .lk-participant-metadata {
    background: transparent !important;
  }
  .lk-participant-metadata-item {
    background: transparent !important;
  }
  /* Hide Utility Icons as requested */
  /* Aggressively hide the Expand/Focus icon */
  .lk-focus-toggle, 
  .lk-participant-tile button:has(svg[viewBox*="12"]),
  [class*="focus-toggle"],
  button[title*="Focus"] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
  .lk-connection-quality {
    background: transparent !important;
    box-shadow: none !important;
    border: none !important;
  }
`;

if (typeof document !== 'undefined') {
    const styleEl = document.getElementById('lk-custom-styles') || (() => {
        const el = document.createElement('style');
        el.id = 'lk-custom-styles';
        document.head.appendChild(el);
        return el;
    })();
    styleEl.textContent = LIVEKIT_DROPDOWN_STYLE;
}

import { Track } from 'livekit-client';
import { useRef, useState, useEffect, useCallback } from 'react';
import {
    useChat,
    useTracks,
    GridLayout,
    ChatToggle,
    LiveKitRoom,
    TrackToggle,
    ParticipantTile,
    useParticipants,
    DisconnectButton,
    useLayoutContext,
    RoomAudioRenderer,
    useLocalParticipant,
    useMediaDeviceSelect,
    LayoutContextProvider,
} from '@livekit/components-react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import { Iconify } from 'src/components/iconify';

import AudioVisualizer from './audio-visualizer';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    callState: 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';
    callType: 'audio' | 'video';
    remoteUser: string | null;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    onAccept: () => void;
    onReject: () => void;
    onHangUp: (participantCount?: number, explicit?: boolean) => void;
    onToggleAudio: () => void;
    onToggleVideo: () => void;
    isAudioMuted: boolean;
    isVideoDisabled: boolean;
    isGroupCall?: boolean;
    liveKitToken?: string | null;
    liveKitUrl?: string | null;
};

export default function ChatCallDialog({
    open,
    onClose,
    callState,
    callType,
    remoteUser,
    localStream,
    remoteStream,
    onAccept,
    onReject,
    onHangUp,
    onToggleAudio,
    onToggleVideo,
    isAudioMuted,
    isVideoDisabled,
    isGroupCall = false,
    liveKitToken,
    liveKitUrl,
}: Props) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [lkConnected, setLkConnected] = useState(false);
    const [isExplicitDisconnect, setIsExplicitDisconnect] = useState(false);
    const participantsCountRef = useRef(0);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (open && liveKitToken) {
            setLkConnected(false);
        }
    }, [liveKitToken]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.play().catch(e => console.error('Error playing local video:', e));
        }
    }, [localStream, callState, callType]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(e => console.error('Error playing remote video:', e));
        }
    }, [remoteStream, callState, callType]);

    const handleLkConnected = useCallback(() => {
        // console.log('LIVEKIT: Successfully connected to room');
        setLkConnected(true);
    }, []);

    const handleLkDisconnected = useCallback(() => {
        // console.log('LIVEKIT: Disconnected from room', { isExplicitDisconnect });
        // Only wipe storage if the user explicitly clicked hang-up
        onHangUp(participantsCountRef.current, isExplicitDisconnect);
        setIsExplicitDisconnect(false);
    }, [onHangUp, isExplicitDisconnect]);

    const handleLkError = useCallback((err: Error) => {
        console.error('LIVEKIT: Error connecting:', err);
        setLkConnected(true);
    }, []);

    const renderContent = () => {
        // ── Incoming call ──
        if (callState === 'incoming') {
            return (
                <Stack spacing={3} alignItems="center" sx={{ p: 4 }}>
                    <Avatar sx={{ width: 80, height: 80, fontSize: 32 }}>
                        {remoteUser?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography variant="h6">Incoming {callType} call...</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {remoteUser} is calling you
                    </Typography>
                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="contained"
                            color="error"
                            onClick={onReject}
                            startIcon={<Iconify icon={"solar:phone-bold" as any} />}
                            sx={{ borderRadius: 1.5 }}
                        >
                            Reject
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            onClick={onAccept}
                            startIcon={<Iconify icon="solar:phone-calling-bold" />}
                            sx={{ borderRadius: 1.5 }}
                        >
                            Accept
                        </Button>
                    </Stack>
                </Stack>
            );
        }

        // ── Calling (outgoing) ──
        if (callState === 'calling') {
            return (
                <Stack spacing={3} alignItems="center" sx={{ p: 4 }}>
                    <Avatar sx={{ width: 80, height: 80, fontSize: 32 }}>
                        {remoteUser?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography variant="h6">Calling {remoteUser}...</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Waiting for answer
                    </Typography>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => onHangUp()}
                        startIcon={<Iconify icon={"solar:phone-calling-cancel-bold" as any} />}
                        sx={{ borderRadius: 1.5 }}
                    >
                        Cancel
                    </Button>
                </Stack>
            );
        }

        // ── Connected ──
        const containerH = isFullScreen ? '100vh' : (isMinimized ? 160 : 520);

        // GROUP CALL via LiveKit
        if (isGroupCall && liveKitToken && liveKitUrl) {
            return (
                <Box
                    sx={{
                        position: 'relative',
                        width: '100%',
                        height: containerH,
                        bgcolor: '#111',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* Connecting overlay — premium animated */}
                    {!lkConnected && (
                        <Stack
                            alignItems="center"
                            justifyContent="center"
                            spacing={2.5}
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 50,
                                background: 'linear-gradient(135deg, #0f0f14 0%, #161622 100%)',
                            }}
                        >
                            {/* Pulsing ring animation */}
                            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Box sx={{
                                    position: 'absolute',
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    border: '2px solid rgba(99,102,241,0.4)',
                                    animation: 'lk-pulse-ring 1.8s ease-out infinite',
                                    '@keyframes lk-pulse-ring': {
                                        '0%': { transform: 'scale(0.9)', opacity: 1 },
                                        '100%': { transform: 'scale(1.7)', opacity: 0 },
                                    },
                                }} />
                                <Box sx={{
                                    position: 'absolute',
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    border: '2px solid rgba(99,102,241,0.25)',
                                    animation: 'lk-pulse-ring 1.8s ease-out 0.5s infinite',
                                }} />
                                <Box sx={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 0 32px rgba(99,102,241,0.45)',
                                }}>
                                    <Iconify icon={"solar:videocamera-record-bold" as any} width={28} sx={{ color: 'white' }} />
                                </Box>
                            </Box>

                            <Stack alignItems="center" spacing={0.5}>
                                <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 700, letterSpacing: '0.02em' }}>
                                    Joining Meeting
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                                    Setting up your audio &amp; video...
                                </Typography>
                            </Stack>

                            {/* Animated dots */}
                            <Stack direction="row" spacing={0.75}>
                                {[0, 0.2, 0.4].map((delay) => (
                                    <Box key={delay} sx={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        bgcolor: 'rgba(99,102,241,0.8)',
                                        animation: `lk-bounce 1.2s ease-in-out ${delay}s infinite`,
                                        '@keyframes lk-bounce': {
                                            '0%, 80%, 100%': { transform: 'scale(0.7)', opacity: 0.4 },
                                            '40%': { transform: 'scale(1.2)', opacity: 1 },
                                        },
                                    }} />
                                ))}
                            </Stack>
                        </Stack>
                    )}

                    {/* LiveKit room — flex column, fills space */}
                    <LiveKitRoom
                        video={callType === 'video'}
                        audio
                        connect
                        token={liveKitToken}
                        serverUrl={liveKitUrl}
                        onConnected={handleLkConnected}
                        onDisconnected={handleLkDisconnected}
                        onError={handleLkError}
                        style={{
                            flex: 1,
                            minHeight: 0,
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            background: '#111',
                        }}
                    >
                        <GroupCallLayout 
                            onParticipantsChange={(n) => { participantsCountRef.current = n; }} 
                            setIsExplicitDisconnect={setIsExplicitDisconnect}
                        />
                    </LiveKitRoom>

                    {/* Header controls — rendered last so they sit above everything */}
                    <HeaderControls
                        isMinimized={isMinimized}
                        isFullScreen={isFullScreen}
                        onMinimize={() => setIsMinimized(!isMinimized)}
                        onFullScreen={() => setIsFullScreen(!isFullScreen)}
                    />
                </Box>
            );
        }

        // P2P CALL
        return (
            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    height: containerH,
                    bgcolor: '#111',
                    overflow: 'hidden',
                    transition: theme.transitions.create(['height']),
                }}
            >
                {callType === 'video' ? (
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <>
                        <audio ref={remoteVideoRef as any} autoPlay style={{ display: 'none' }} />
                        <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                            <Avatar sx={{ width: 120, height: 120, fontSize: 48 }}>
                                {remoteUser?.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography variant="h5" sx={{ mt: 2, color: 'white' }}>
                                {remoteUser}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'grey.500' }}>
                                On Air
                            </Typography>
                            <AudioVisualizer stream={remoteStream} active={callState === 'connected'} />
                        </Stack>
                    </>
                )}

                {/* Local video pip */}
                {callType === 'video' && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: isMinimized ? 8 : 52,
                            right: isMinimized ? 8 : 16,
                            width: isMinimized ? 60 : (isMobile ? 80 : 160),
                            height: isMinimized ? 45 : (isMobile ? 60 : 120),
                            borderRadius: 1,
                            overflow: 'hidden',
                            bgcolor: 'grey.800',
                            border: '2px solid white',
                            zIndex: 10,
                            transition: theme.transitions.create(['width', 'height', 'top']),
                        }}
                    >
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </Box>
                )}

                {/* P2P controls */}
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="center"
                    spacing={2}
                    sx={{
                        position: 'absolute',
                        bottom: isMinimized ? 12 : 36,
                        left: 0,
                        right: 0,
                        zIndex: 10,
                        transform: isMinimized ? 'scale(0.8)' : 'none',
                    }}
                >
                    {!isMinimized && (
                        <IconButton
                            onClick={onToggleAudio}
                            sx={{
                                bgcolor: isAudioMuted ? 'error.main' : alpha(theme.palette.common.white, 0.15),
                                color: 'white',
                                '&:hover': { bgcolor: isAudioMuted ? 'error.dark' : alpha(theme.palette.common.white, 0.3) },
                            }}
                        >
                            <Iconify icon={(isAudioMuted ? 'solar:microphone-slash-bold' : 'solar:microphone-bold') as any} />
                        </IconButton>
                    )}

                    {callType === 'video' && !isMinimized && (
                        <IconButton
                            onClick={onToggleVideo}
                            sx={{
                                bgcolor: isVideoDisabled ? 'error.main' : alpha(theme.palette.common.white, 0.15),
                                color: 'white',
                                '&:hover': { bgcolor: isVideoDisabled ? 'error.dark' : alpha(theme.palette.common.white, 0.3) },
                            }}
                        >
                            <Iconify icon={(isVideoDisabled ? 'solar:videocamera-record-bold' : 'solar:videocamera-record-bold-duotone') as any} />
                        </IconButton>
                    )}

                    <IconButton
                        onClick={() => onHangUp()}
                        sx={{
                            bgcolor: 'error.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'error.dark' },
                            width: isMinimized ? 40 : 56,
                            height: isMinimized ? 40 : 56,
                        }}
                    >
                        <Iconify icon="solar:phone-bold" width={isMinimized ? 20 : 28} />
                    </IconButton>
                </Stack>

                {/* Header controls for P2P */}
                <HeaderControls
                    isMinimized={isMinimized}
                    isFullScreen={isFullScreen}
                    onMinimize={() => setIsMinimized(!isMinimized)}
                    onFullScreen={() => setIsFullScreen(!isFullScreen)}
                />
            </Box>
        );
    };

    return (
        <Dialog
            fullScreen={isFullScreen}
            fullWidth={!isMinimized}
            maxWidth={isMinimized ? false : (callState === 'connected' ? 'lg' : 'xs')}
            open={open}
            onClose={(event, reason) => {
                if (reason !== 'backdropClick') onClose();
            }}
            hideBackdrop={isMinimized}
            TransitionProps={{
                onExited: () => {
                    setIsFullScreen(false);
                    setIsMinimized(false);
                }
            }}
            PaperProps={{
                sx: {
                    borderRadius: isFullScreen ? 0 : 2,
                    overflow: 'hidden',
                    bgcolor: callState === 'connected' ? '#111' : 'background.paper',
                    ...(callState === 'connected' && !isMinimized && { minHeight: 520 }),
                    ...(isMinimized && {
                        position: 'fixed',
                        bottom: 20,
                        right: 20,
                        margin: 0,
                        width: 240,
                        height: 160,
                        zIndex: theme.zIndex.modal + 1,
                    })
                },
            }}
        >
            {renderContent()}
        </Dialog>
    );
}

// ----------------------------------------------------------------------
// Minimize / Fullscreen buttons — always rendered last (highest DOM stacking)

type HeaderControlsProps = {
    isMinimized: boolean;
    isFullScreen: boolean;
    onMinimize: () => void;
    onFullScreen: () => void;
};

function HeaderControls({ isMinimized, isFullScreen, onMinimize, onFullScreen }: HeaderControlsProps) {
    return (
        <Stack
            direction="row"
            spacing={1}
            sx={{
                position: 'absolute',
                top: 12,
                left: 12,
                zIndex: 9999,
                pointerEvents: 'all',
            }}
        >
            <IconButton
                size="small"
                onClick={onMinimize}
                sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.35)',
                    backdropFilter: 'blur(8px)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.38)' },
                }}
            >
                <Iconify icon={(isMinimized ? 'solar:maximize-bold' : 'solar:minimize-bold') as any} />
            </IconButton>

            {!isMinimized && (
                <IconButton
                    size="small"
                    onClick={onFullScreen}
                    sx={{
                        bgcolor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.35)',
                        backdropFilter: 'blur(8px)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.38)' },
                    }}
                >
                    <Iconify icon={(isFullScreen ? 'solar:minimize-square-3-bold' : 'solar:maximize-square-3-bold') as any} />
                </IconButton>
            )}
        </Stack>
    );
}

// ----------------------------------------------------------------------
// Group call layout — flex column: video grid on top, control bar pinned bottom

function GroupCallLayout({ 
    onParticipantsChange,
    setIsExplicitDisconnect 
}: { 
    onParticipantsChange: (n: number) => void;
    setIsExplicitDisconnect: (val: boolean) => void;
}) {
    const participants = useParticipants();

    // Only camera tracks — excludes spurious screenshare placeholders
    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: false },
    );

    useEffect(() => {
        onParticipantsChange(participants.length);
    }, [participants.length, onParticipantsChange]);

    return (
        <LayoutContextProvider>
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: '#111',
                }}
            >
                <RoomAudioRenderer />

                {/* Video and Chat row */}
                <Box sx={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
                    <Box sx={{ flex: 1, position: 'relative' }}>
                        <GridLayout
                            tracks={tracks}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <ParticipantTile />
                        </GridLayout>
                    </Box>
                    <GroupCallChatWindow />
                </Box>

                {/* Control bar — Circular Modern Design Matching Reference */}
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: 24,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 20,
                        height: 80,
                        bgcolor: '#000000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '40px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        px: 3,
                        boxShadow: '0 12px 40px rgba(0,0,0,0.8)',

                        // ── Custom Control Bar (Individual Units) ──
                        '& .custom-control-bar': {
                            padding: '0 !important',
                            gap: '12px !important',
                        },

                        // ── Circular Buttons (Icons only) ──
                        '& .lk-button': {
                            display: 'inline-flex !important',
                            alignItems: 'center !important',
                            justifyContent: 'center !important',
                            color: 'white !important',
                            background: 'rgba(255,255,255,0.1) !important',
                            border: 'none !important',
                            borderRadius: '50% !important',
                            width: '52px !important',
                            height: '52px !important',
                            minWidth: 'unset !important',
                            padding: '0 !important',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease !important',
                        },
                        '& .lk-button:hover': {
                            background: 'rgba(255,255,255,0.2) !important',
                            transform: 'scale(1.05)',
                        },
                        '& .lk-button[aria-pressed="true"]': {
                            background: 'rgba(255,255,255,0.15) !important',
                        },

                        // ── Triggers (External Arrows) ──
                        '& .custom-trigger': {
                            backgroundColor: 'transparent !important',
                            background: 'transparent !important',
                            color: 'rgba(255,255,255,0.6) !important',
                            width: '24px !important',
                            height: '52px !important',
                            borderRadius: '0 !important',
                            padding: '0 !important',
                            boxShadow: 'none !important',
                            transition: 'all 0.2s !important',
                            display: 'flex !important',
                            alignItems: 'center !important',
                            justifyContent: 'center !important',
                        },
                        '& .custom-trigger:hover': {
                            color: 'white !important',
                            backgroundColor: 'transparent !important',
                            background: 'transparent !important',
                        },
                        '& .custom-trigger svg': {
                            width: '14px !important',
                            height: '14px !important',
                        },

                        // ── End Call Button (Red Circle) ──
                        '& .lk-disconnect-button': {
                            background: 'linear-gradient(135deg, #d32f2f, #b71c1c) !important',
                            borderRadius: '50% !important',
                            width: '56px !important',
                            height: '56px !important',
                            display: 'grid !important',
                            placeItems: 'center !important',
                            border: '2px solid rgba(255,255,255,0.2) !important',
                            boxShadow: '0 0 20px rgba(211, 47, 47, 0.45) !important',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important',
                        },
                        '& .lk-disconnect-button:hover': {
                            background: 'linear-gradient(135deg, #f44336, #d32f2f) !important',
                            boxShadow: '0 0 35px rgba(211, 47, 47, 0.65) !important',
                            transform: 'scale(1.1) !important',
                        },

                        // ── Hidden Labels ──
                        '& .lk-button__label': {
                            display: 'none !important',
                        },
                    }}
                >
                    <GroupCallControlBar setIsExplicitDisconnect={setIsExplicitDisconnect} />
                </Box>
            </Box>
        </LayoutContextProvider>
    );
}

function GroupCallControlBar({ setIsExplicitDisconnect }: { setIsExplicitDisconnect: (val: boolean) => void }) {
    const [audioOpen, setAudioOpen] = useState(false);
    const [videoOpen, setVideoOpen] = useState(false);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = () => {
            setAudioOpen(false);
            setVideoOpen(false);
        };
        if (audioOpen || videoOpen) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [audioOpen, videoOpen]);

    // Custom Device Selection Hooks
    const { devices: audioDevices, activeDeviceId: activeAudioId, setActiveMediaDevice: setAudioDevice } = useMediaDeviceSelect({ kind: 'audioinput' });
    const { devices: videoDevices, activeDeviceId: activeVideoId, setActiveMediaDevice: setVideoDevice } = useMediaDeviceSelect({ kind: 'videoinput' });

    const renderDeviceList = (devices: MediaDeviceInfo[], activeId: string | undefined, setFn: (id: string) => void, closeFn: () => void) => (
        <Box className="custom-device-dropdown" sx={{ p: '10px !important', minWidth: '440px !important' }}>
            {devices.map((device) => {
                const isActive = device.deviceId === activeId;
                return (
                    <button
                        key={device.deviceId}
                        onClick={() => { setFn(device.deviceId); closeFn(); }}
                        style={{
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            width: '100%',
                            textAlign: 'left',
                            background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                            border: 'none',
                            color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13.5px',
                            fontWeight: isActive ? 600 : 500,
                            fontFamily: "'Public Sans', 'Inter', sans-serif",
                            letterSpacing: '0.02em',
                            transition: 'all 0.15s ease',
                            marginBottom: '2px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}
                    >
                        <Box sx={{ width: '18px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {isActive && <Box sx={{ color: '#FF3B30', fontSize: '15px' }}>✓</Box>}
                        </Box>
                        <span style={{
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {device.label}
                        </span>
                    </button>
                );
            })}
            {devices.length === 0 && (
                <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textAlign: 'center', py: 1 }}>
                    No devices found
                </Typography>
            )}
        </Box>
    );

    return (
        <Stack direction="row" spacing={1} alignItems="center" className="custom-control-bar">
            {/* Microphone Group */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
                <TrackToggle source={Track.Source.Microphone} showIcon />
                <button
                    onClick={(e) => { e.stopPropagation(); setAudioOpen(!audioOpen); setVideoOpen(false); }}
                    className="custom-trigger"
                    style={{ border: 'none' }}
                >
                    <Iconify icon={"eva:arrow-ios-downward-fill" as any} width={16} />
                </button>
                {audioOpen && (
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: 80, // Clear of the 88px bar height
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 30000,
                            pointerEvents: 'auto'
                        }}
                    >
                        {renderDeviceList(audioDevices, activeAudioId, setAudioDevice, () => setAudioOpen(false))}
                    </Box>
                )}
            </Box>

            {/* Camera Group */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
                <TrackToggle source={Track.Source.Camera} showIcon />
                <button
                    onClick={(e) => { e.stopPropagation(); setVideoOpen(!videoOpen); setAudioOpen(false); }}
                    className="custom-trigger"
                    style={{ border: 'none' }}
                >
                    <Iconify icon={"eva:arrow-ios-downward-fill" as any} width={16} />
                </button>
                {videoOpen && (
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: 80, // Clear of the 88px bar height
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 30000,
                            pointerEvents: 'auto'
                        }}
                    >
                        {renderDeviceList(videoDevices, activeVideoId, setVideoDevice, () => setVideoOpen(false))}
                    </Box>
                )}
            </Box>

            {/* Screen Share */}
            <TrackToggle source={Track.Source.ScreenShare} showIcon />

            {/* Chat */}
            <ChatToggle>
                <Iconify icon={"eva:message-square-fill" as any} />
            </ChatToggle>

            {/* Leave (Red) */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box
                    sx={{
                        width: '1px',
                        height: '24px',
                        bgcolor: 'rgba(255,255,255,0.15)',
                        ml: 0.5,
                        mr: 2,
                    }}
                />
                <Box onClickCapture={() => setIsExplicitDisconnect(true)}>
                    <DisconnectButton>
                        <Iconify icon={"solar:phone-bold" as any} sx={{ color: 'white', transform: 'rotate(135deg)', display: 'block' }} />
                    </DisconnectButton>
                </Box>
            </Box>
        </Stack>
    );
}

// ── Custom Material UI Chat Interface ──────────────────────────────────────────

function MuiChat() {
    const { chatMessages, send } = useChat();
    const { localParticipant } = useLocalParticipant();
    const layout = useLayoutContext();
    const [message, setMessage] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatMessages]);

    const handleSend = async () => {
        if (!message.trim()) return;
        
        try {
            await send(message);
            setMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
            // Optionally keep the message in the input if it fails
        }
    };

    const handleClose = () => {
        if (layout.widget.dispatch) {
            layout.widget.dispatch({ msg: 'toggle_chat' });
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                background: 'rgba(18, 18, 22, 0.98)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    px: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: 64,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                    flexShrink: 0
                }}
            >
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'white', letterSpacing: '0.02em' }}>
                    Messages
                </Typography>
                <IconButton
                    onClick={handleClose}
                    size="small"
                    sx={{
                        color: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' }
                    }}
                >
                    <Iconify icon="mingcute:close-line" width={18} />
                </IconButton>
            </Box>

            {/* Message List */}
            <Box
                ref={scrollRef}
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' }
                }}
            >
                {chatMessages.length === 0 && (
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                        <Typography variant="body2">No messages yet</Typography>
                    </Box>
                )}
                {chatMessages.map((msg, idx) => {
                    const isMe = localParticipant && msg.from?.identity === localParticipant.identity;
                    const msgKey = msg.id || `${msg.timestamp}-${idx}`;
                    return (
                        <Box
                            key={msgKey}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: isMe ? 'flex-end' : 'flex-start',
                                mb: 0.5
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{ color: 'rgba(255,255,255,0.4)', mb: 0.5, px: 0.5, fontWeight: 500 }}
                            >
                                {isMe ? 'You' : (msg.from?.name || msg.from?.identity || 'Participant')}
                            </Typography>
                            <Box
                                sx={{
                                    px: 2,
                                    py: 1.2,
                                    bgcolor: isMe ? 'primary.main' : 'rgba(255, 255, 255, 0.08)',
                                    color: 'white',
                                    borderRadius: 1.5,
                                    maxWidth: '85%',
                                    wordBreak: 'break-word',
                                    boxShadow: isMe ? '0 4px 12px rgba(33, 150, 243, 0.2)' : 'none',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}
                            >
                                <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                                    {msg.message}
                                </Typography>
                            </Box>
                        </Box>
                    );
                })}
            </Box>

            {/* Input Footer */}
            <Box
                sx={{
                    p: 3,
                    bgcolor: 'rgba(0, 0, 0, 0.25)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                    flexShrink: 0
                }}
            >
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <TextField
                        fullWidth
                        size="small"
                        autoComplete="off"
                        placeholder="Type a message..."
                        value={message}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessage(e.target.value)}
                        onKeyPress={(e: React.KeyboardEvent) => {
                            if (e.key === 'Enter') {
                                handleSend();
                            }
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2.5,
                                bgcolor: 'rgba(255,255,255,0.05)',
                                color: 'white',
                                px: 1,
                                height: 44,
                                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                '&.Mui-focused fieldset': { borderColor: 'rgba(255,255,255,0.25)' }
                            },
                            '& .MuiOutlinedInput-input::placeholder': {
                                color: 'rgba(255,255,255,0.3)',
                                opacity: 1
                            }
                        }}
                    />
                    <IconButton
                        onClick={handleSend}
                        disabled={!message.trim()}
                        sx={{
                            width: 44,
                            height: 44,
                            bgcolor: '#FF3B30',
                            color: 'white',
                            '&:hover': {
                                bgcolor: '#FF453A',
                                transform: 'scale(1.05)'
                            },
                            '&.Mui-disabled': {
                                bgcolor: 'rgba(255,255,255,0.05)',
                                color: 'rgba(255,255,255,0.2)'
                            },
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Iconify icon={"eva:paper-plane-fill" as any} width={22} />
                    </IconButton>
                </Stack>
            </Box>
        </Box>
    );
}

function GroupCallChatWindow() {
    const layout = useLayoutContext();
    const isChatOpen = layout.widget.state?.showChat ?? false;

    if (!isChatOpen) return null;

    return (
        <Box
            sx={{
                position: 'fixed' as any,
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                zIndex: 200,
                display: 'flex',
                justifyContent: 'flex-end',
                pointerEvents: 'none'
            }}
        >
            <Box
                sx={{
                    pointerEvents: 'auto',
                    height: '100%',
                    width: 380,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
                }}
            >
                <MuiChat />
            </Box>
        </Box>
    );
}
