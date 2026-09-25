import { TbVideoFilled } from "react-icons/tb";
import { BsTelephoneForwardFill } from "react-icons/bs";
import { memo, useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { fDateTime, fDateSeparator } from 'src/utils/format-time';

import { chatApi } from 'src/api/chat';
import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import ChatInfo from './chat-info';
import ChatAudioPlayer from './chat-audio-player';
import DocumentMessageCard from './document-message-card';

// ----------------------------------------------------------------------

function stringToColor(string: string) {
    let hash = 0;
    for (let i = 0; i < string.length; i += 1) {
        // eslint-disable-next-line no-bitwise
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 70%, 80%)`; // Pastel colors
}

function stringToDarkColor(string: string) {
    let hash = 0;
    for (let i = 0; i < string.length; i += 1) {
        // eslint-disable-next-line no-bitwise
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 70%, 30%)`; // Darker version for text
}

type Props = {
    user: any;
    channel: any;
    socket: any;
    isConnected?: boolean;
    onRefresh?: () => void;
    onStartCall?: (type: 'audio' | 'video') => void;
    onBack?: () => void;
    refreshTrigger?: number;
};

export default function ChatWindow({ user, channel, socket, isConnected, onRefresh, onStartCall, onBack, refreshTrigger }: Props) {
    const [messages, setMessages] = useState<any[]>([]);
    const [showInfo, setShowInfo] = useState(false);
    const [confirmDeleteMessage, setConfirmDeleteMessage] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const lastMessage = messages[messages.length - 1];
    const lastMessageTime = lastMessage ? fDateSeparator(lastMessage.send_date) + ' ' + fDateTime(lastMessage.send_date, 'h:mm A') : '';

    const fetchMessages = useCallback(async () => {
        try {
            const data = await chatApi.getMessages(channel.room, user.email, channel.type);
            const messageList = data?.message?.results || [];
            setMessages(messageList);

            // Mark as read only if there are unread messages to clear
            if (channel.user_unread_messages > 0) {
                await chatApi.markMessagesAsRead(user.email, channel.room);
                if (onRefresh) onRefresh();
            }
        } catch (error) {
            console.error('Failed to fetch messages', error);
        }
    }, [channel.room, user.email, onRefresh]); // Removed channel.user_unread_messages from deps

    useEffect(() => {
        fetchMessages();
        setShowInfo(false); // Reset on channel change
    }, [fetchMessages]);

    useEffect(() => {
        if (socket && isConnected && channel.room) {
            socket.emit('subscribe_doctype', channel.room);
        }
    }, [socket, isConnected, channel.room]);

    // External refresh trigger (e.g. after starting a group call)
    useEffect(() => {
        if (refreshTrigger && refreshTrigger > 0) {
            setTimeout(() => {
                fetchMessages();
                if (onRefresh) onRefresh();
            }, 1200);
        }
    }, [refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (socket) {
            const handleMessage = async (data: any) => {
                const eventRoom = data.room || data.room_name;
                // Check if the event is for the current room
                const isRelevantRoom = eventRoom === channel.room;

                // DEBUG: Tracer to see every single packet from the server
                // console.log('TRACE: Socket event received:', {
                //     type: data.realtime_type,
                //     room: eventRoom,
                //     relevant: isRelevantRoom,
                //     content: data.content?.substring(0, 20),
                //     messageType: data.message_type
                // });

                if (isRelevantRoom) {
                    if (data.realtime_type === 'message_deleted') {
                        setMessages((prev) =>
                            prev.map((msg) =>
                                msg.message_name === data.message_name
                                    ? {
                                        ...msg,
                                        content: '<p class="deleted-message-text" style="color:#666; font-style:italic; margin:0;">This message was deleted</p>',
                                        is_media: 0,
                                        is_voice_clip: 0,
                                        is_document: 0,
                                        attachment: '',
                                    }
                                    : msg
                            )
                        );
                    } else if (data.realtime_type === 'trigger_channel_status') {
                        if (onRefresh) onRefresh();
                    } else {
                        // Detect call-related messages from any field
                        const rawContent = String(data.content || data.last_message || '');
                        const rawMsgType = String(data.message_type || data.realtime_type || '');
                        const isCallRelated =
                            rawContent.includes('[CALL_') ||
                            rawContent.includes('[GROUP_CALL]') ||
                            rawMsgType.includes('[CALL_') ||
                            rawMsgType.toLowerCase().includes('group_call') ||
                            rawMsgType.toLowerCase().includes('notification') ||
                            data.message_type?.includes('[CALL_');

                        // console.log('REALTIME MESSAGE RECEIVED:', { 
                        //     fromMe: data.user === user.full_name, 
                        //     isCallRelated, 
                        //     messageType: data.message_type,
                        //     content: rawContent.substring(0, 40),
                        // });

                        // Always refresh for call-related messages (even if sent by self)
                        // For regular messages only refresh if from another user
                        if (isCallRelated || data.user !== user.full_name) {
                            // const delay = isCallRelated ? 1000 : 100;
                            // console.log(`REFRESH TRIGGERED (delay: ${delay}ms)`);
                            setTimeout(async () => {
                                await fetchMessages();
                                if (onRefresh) onRefresh();
                            }, 1000);
                        }
                    }
                }
            };

            // Listen to specific room events
            socket.on(channel.room, handleMessage);
            // Listen to general update_room events which might carry the deletion
            socket.on('update_room', handleMessage);
            // Listen to broad message events
            socket.on('msg', handleMessage);
            socket.on('new_chat_notification', handleMessage);

            return () => {
                socket.off(channel.room, handleMessage);
                socket.off('update_room', handleMessage);
                socket.off('msg', handleMessage);
                socket.off('new_chat_notification', handleMessage);
            };
        }
        return undefined;
    }, [socket, channel.room, fetchMessages, onRefresh]);

    const handleDelete = useCallback((messageName: string) => {
        setConfirmDeleteMessage(messageName);
    }, []);

    const handleConfirmDelete = async () => {
        if (!confirmDeleteMessage) return;

        try {
            await chatApi.deleteMessage(confirmDeleteMessage);
            // Local update if socket is slow or for immediate feedback
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.message_name === confirmDeleteMessage
                        ? {
                            ...msg,
                            content: '<p class="deleted-message-text" style="color:#666; font-style:italic; margin:0;">This message was deleted</p>',
                            is_media: 0,
                            is_voice_clip: 0,
                            is_document: 0,
                            attachment: '',
                        }
                        : msg
                )
            );
        } catch (error) {
            console.error('Failed to delete message', error);
        } finally {
            setConfirmDeleteMessage(null);
        }
    };

    const handleCloseChannel = async () => {
        try {
            await chatApi.closeChannel(channel.room);
            if (onRefresh) onRefresh();
            setShowInfo(false);
        } catch (error) {
            console.error('Failed to close channel', error);
        }
    };

    const handleReopenChannel = async () => {
        try {
            await chatApi.reopenChannel(channel.room);
            if (onRefresh) onRefresh();
            setShowInfo(false);
        } catch (error) {
            console.error('Failed to reopen channel', error);
        }
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = useCallback(async (data: {
        content: string;
        attachment?: string;
        is_media?: number;
        is_voice_clip?: number;
        is_document?: number;
    }) => {
        const localId = Date.now().toString();
        const messageData = {
            ...data,
            user: user.full_name,
            email: user.email,
            room: channel.room,
            id_message_local_from_app: localId,
        };

        // Append locally for instant feedback
        const { content, ...restData } = data;
        const localMsg = {
            ...restData,
            content: content || (data.is_voice_clip ? '🎤 Voice Message' : (data.is_media ? '📷 Image' : '📄 File')),
            sender_name: user.full_name,
            sender_email: user.email,
            send_date: new Date().toISOString(),
            id_message_local_from_app: localId,
            message_name: `temp-${localId}`,
        };

        setMessages((prev) => [...prev, localMsg]);

        try {
            const response = await chatApi.sendMessage(messageData as any);
            const newMessageName = response?.message?.results?.[0]?.new_message_name;

            if (newMessageName) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id_message_local_from_app === localId
                            ? { ...m, message_name: newMessageName }
                            : m
                    )
                );
            }

            // Refresh sidebar to update last message preview
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Failed to send message', error);
            // Optionally remove the local message on failure
            setMessages((prev) => prev.filter(m => m.id_message_local_from_app !== localId));
        }
    }, [channel.room, user, onRefresh]);

    if (showInfo) {
        return (
            <ChatInfo
                user={user}
                channel={channel}
                messages={messages}
                onClose={() => setShowInfo(false)}
                onCloseChannel={handleCloseChannel}
                onReopenChannel={handleReopenChannel}
                onRefresh={onRefresh}
            />
        )
    }

    return (
        <Stack sx={{ height: 1 }}>
            {/* Header */}
            <Stack
                direction="row"
                alignItems="center"
                sx={{
                    py: 1,
                    px: 2,
                    p: 2,
                    borderBottom: (t) => `solid 1px ${t.palette.divider}`
                }}
            >
                {onBack && (
                    <IconButton onClick={onBack} sx={{ mr: 1, display: { md: 'none' } }}>
                        <Iconify icon={"eva:arrow-ios-back-fill" as any} />
                    </IconButton>
                )}
                <Stack
                    direction="row"
                    alignItems="center"
                    onClick={() => setShowInfo(true)}
                    sx={{
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        flexGrow: 1,
                        borderRadius: 1,
                        p: 0.5,
                        ml: -0.5
                    }}
                >
                    <Avatar
                        alt={channel.displayName}
                        src={channel.avatar_url || channel.channel_image || channel.channel_info?.avatar}
                        sx={{
                            width: 40,
                            height: 40,
                            mr: 2,
                            fontWeight: 'fontWeightBold',
                            color: (channel.avatar_url || channel.channel_image || channel.channel_info?.avatar) ? 'text.secondary' : stringToDarkColor(channel.displayName || ''),
                            bgcolor: (channel.avatar_url || channel.channel_image || channel.channel_info?.avatar) ? 'common.white' : stringToColor(channel.displayName || ''),
                            border: (t) => (channel.avatar_url || channel.channel_image || channel.channel_info?.avatar) ? `solid 1px ${t.palette.divider}` : 'none',
                            '& img': {
                                objectFit: 'cover',
                            }

                        }}
                    >
                        {channel.displayName?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Stack sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'fontWeightBold' }}>
                            {channel.displayName}
                        </Typography>
                        {lastMessageTime && (
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '11px' }}>
                                {lastMessageTime}
                            </Typography>
                        )}
                    </Stack>
                </Stack>

                {(channel.type === 'Direct' || channel.type === 'Group') && (
                    <Stack direction="row" spacing={1} sx={{ mr: 0.5, flexShrink: 0 }}>
                        <Button
                            variant="contained"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onStartCall) onStartCall('audio');
                            }}
                            startIcon={<BsTelephoneForwardFill size={14} />}
                            sx={{
                                borderRadius: 5,
                                px: { xs: 1.25, sm: 2 },
                                py: 0.75,
                                minWidth: { xs: 'auto', sm: 64 },
                                fontSize: { xs: '0.75rem', sm: '0.9rem' },
                                fontWeight: 'bold',
                                textTransform: 'none',
                                background: 'linear-gradient(135deg, #42d392 0%, #359d73 100%)',
                                boxShadow: '0 4px 10px 0 rgba(66, 211, 146, 0.3)',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #3bb37c 0%, #2e8a64 100%)',
                                    boxShadow: '0 6px 16px rgba(66, 211, 146, 0.35)',
                                    transform: 'translateY(-1px)',
                                },
                                '& .MuiButton-startIcon': {
                                    mr: { xs: 0.5, sm: 1 },
                                    ml: 0,
                                }
                            }}
                        >
                            Audio
                        </Button>
                        <Button
                            variant="contained"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onStartCall) onStartCall('video');
                            }}
                            startIcon={<TbVideoFilled size={18} />}
                            sx={{
                                borderRadius: 5,
                                px: { xs: 1.25, sm: 2 },
                                py: 0.75,
                                minWidth: { xs: 'auto', sm: 64 },
                                fontSize: { xs: '0.75rem', sm: '0.9rem' },
                                fontWeight: 'bold',
                                textTransform: 'none',
                                background: 'linear-gradient(135deg, #3d8aff 0%, #1c5fd1 100%)',
                                boxShadow: '0 4px 10px 0 rgba(61, 138, 255, 0.3)',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #3476db 0%, #1752b5 100%)',
                                    boxShadow: '0 6px 16px rgba(61, 138, 255, 0.35)',
                                    transform: 'translateY(-1px)',
                                },
                                '& .MuiButton-startIcon': {
                                    mr: { xs: 0.5, sm: 1 },
                                    ml: 0,
                                }
                            }}
                        >
                            Video
                        </Button>
                    </Stack>
                )}
            </Stack>

            {/* Messages */}
            <Box
                ref={scrollRef}
                sx={{
                    flexGrow: 1,
                    p: 3,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                }}
            >
                {messages.map((msg, index) => {
                    const isMe = msg.sender_email === user.email;
                    const prevMsg = messages[index - 1];
                    const isSameDate = prevMsg && fDateSeparator(prevMsg.send_date) === fDateSeparator(msg.send_date);

                    // Strip HTML tags and check plain text for [GROUP_CALL] tag — purely content-based
                    const rawContent = String(msg.content || '');
                    const plainContent = rawContent.replace(/<[^>]*>/g, '');
                    const isCallInvite = plainContent.includes('[GROUP_CALL]');

                    // Only mark concluded if a CALL_ENDED/MISSED log appears AFTER this message (by index and timestamp)
                    const isConcluded = isCallInvite && messages.some((m, idx) => {
                        if (idx <= index) return false;
                        if (idx > index + 20) return false;

                        const mTime = new Date(m.send_date).getTime();
                        const inviteTime = new Date(msg.send_date).getTime();
                        if (mTime < inviteTime) return false;

                        const mType = m.message_type || '';
                        const mText = m.content || '';

                        // Check for ending tag in both type and text
                        const isEndLog = /CALL_(ENDED|MISSED)/i.test(mType) || /CALL_(ENDED|MISSED)/i.test(mText);

                        return isEndLog;
                    });

                    return (
                        <ChatMessageItem
                            key={msg.message_name || index}
                            msg={msg}
                            isMe={isMe}
                            isSameDate={isSameDate}
                            onDelete={handleDelete}
                            showSender={channel.type !== 'Direct' && !isMe}
                            onJoinCall={onStartCall}
                            isConcluded={isConcluded}
                        />
                    );
                })}
            </Box>

            <Divider />

            {/* Input */}
            {channel.chat_status !== 'Closed' && (
                <ChatInput onSend={handleSend} />
            )}

            {channel.chat_status === 'Closed' && (
                <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'background.neutral' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                        This channel is closed. You can no longer send messages.
                    </Typography>
                </Box>
            )}
            <ConfirmDialog
                open={!!confirmDeleteMessage}
                onClose={() => setConfirmDeleteMessage(null)}
                title="Delete Message"
                content="Are you sure you want to delete this message? This action cannot be undone."
                action={
                    <Button variant="contained" color="error" onClick={handleConfirmDelete}>
                        Delete
                    </Button>
                }
            />
        </Stack>
    );
}

// ----------------------------------------------------------------------

type ChatMessageItemProps = {
    msg: any;
    isMe: boolean;
    isSameDate: boolean;
    onDelete: (name: string) => void;
    showSender?: boolean;
    onJoinCall?: (type: 'audio' | 'video') => void;
    isConcluded?: boolean;
};

const ChatMessageItem = memo(({ msg, isMe, isSameDate, onDelete, showSender, onJoinCall, isConcluded }: ChatMessageItemProps) => {
    const isDeleted = msg.content?.includes('deleted-message-text');
    const isVoiceClip = !isDeleted && (msg.is_voice_clip === 1 || msg.content?.includes('<audio'));
    const isDocument = !isDeleted && (msg.is_document === 1 || (!isVoiceClip && !msg.is_media && msg.attachment && !msg.content?.includes('<img') && !msg.content?.includes('<audio')));
    // Purely content-based detection — strip HTML and check for the tag
    const plainText = String(msg.content || '').replace(/<[^>]*>/g, '');
    const isCallInvite = !isDeleted && plainText.includes('[GROUP_CALL]');

    // Check for the [CALL_ tag anywhere (type or content)
    const callLogMetadata = (msg.message_type?.includes('[CALL_') ? msg.message_type : msg.content) || '';
    const callLogMatch = callLogMetadata.match(/\[CALL_(ENDED|MISSED): ([^|\]]+)(?:\|(\d+))?\]/);
    const isCallEnded = !isDeleted && callLogMatch?.[1] === 'ENDED';
    const isCallMissed = !isDeleted && callLogMatch?.[1] === 'MISSED';

    const callTypeFound = msg.content?.includes('video') ? 'video' : 'audio';

    const parseCallData = () => {
        if (callLogMatch) {
            return {
                type: callLogMatch[2].trim(),
                duration: callLogMatch[3] ? parseInt(callLogMatch[3], 10) : 0
            };
        }
        return { type: callTypeFound, duration: 0 };
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    // Extract audio src if it's in the content string but not explicit attachment
    const getAudioSrc = () => {
        if (msg.attachment) return msg.attachment;
        const match = msg.content?.match(/src="([^"]+)"/);
        return match ? match[1] : '';
    };

    if (isCallEnded || isCallMissed) {
        const data = parseCallData();
        const isVideo = data.type.includes('video');
        const isGroup = data.type.startsWith('group_');

        return (
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="center"
                spacing={1}
                sx={{
                    width: 1,
                    my: 1,
                    py: 0.5,
                }}
            >
                <Iconify
                    icon={(isVideo ? "solar:videocamera-record-bold" : "solar:phone-bold") as any}
                    width={16}
                    sx={{ color: isCallMissed ? 'error.main' : 'text.disabled' }}
                />
                <Typography variant="caption" sx={{ color: isCallMissed ? 'error.main' : 'text.disabled', fontWeight: isCallMissed ? 'bold' : 'normal' }}>
                    {isCallMissed
                        ? (isGroup ? 'Missed meeting' : 'Missed call')
                        : (isGroup ? 'Meeting finished' : (isVideo ? 'Video' : 'Audio') + ' call')
                    }
                    {isCallEnded && ` · ${formatDuration(data.duration)}`}
                </Typography>
            </Stack>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {!isSameDate && (
                <Stack direction="row" alignItems="center" spacing={2} sx={{ my: 1 }}>
                    <Divider sx={{ flexGrow: 1 }} />
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 'fontWeightBold' }}>
                        {fDateSeparator(msg.send_date)}
                    </Typography>
                    <Divider sx={{ flexGrow: 1 }} />
                </Stack>
            )}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                }}
            >
                <Stack
                    spacing={0.5}
                    alignItems={isMe ? 'flex-end' : 'flex-start'}
                    sx={{ maxWidth: '75%' }}
                >
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{
                            position: 'relative',
                            '&:hover .delete-button': { opacity: 1 }
                        }}
                    >
                        {isMe && !msg.content?.includes('deleted-message-text') && (
                            <IconButton
                                className="delete-button"
                                size="small"
                                onClick={() => onDelete(msg.message_name)}
                                sx={{
                                    opacity: 0,
                                    transition: 'opacity 0.2s',
                                    color: 'text.disabled',
                                    '&:hover': { color: 'error.main' }
                                }}
                            >
                                <Iconify icon={"solar:trash-bin-trash-bold" as any} width={16} />
                            </IconButton>
                        )}

                        <Box
                            sx={{
                                minWidth: 48,
                                maxWidth: 1,
                                borderRadius: 1.5,
                                typography: 'body2',
                                bgcolor: (theme) => {
                                    if (isCallInvite && isConcluded) return alpha(theme.palette.info.main, 0.08);
                                    if (isDocument) return 'transparent';
                                    return isMe
                                        ? theme.palette.primary.main
                                        : alpha(theme.palette.primary.main, 0.1);
                                },
                                color: (theme) => {
                                    if (isCallInvite && isConcluded) return theme.palette.info.darker;
                                    return isMe ? theme.palette.primary.contrastText : 'text.primary';
                                },
                                position: 'relative',
                                width: isCallInvite ? 300 : 'auto',
                                border: (theme) => (isCallInvite && isConcluded) ? `1px solid ${alpha(theme.palette.info.main, 0.15)}` : 'none',
                                boxShadow: (theme) => {
                                    if (isDocument) return 'none';
                                    if (isCallInvite && !isConcluded) return `0 12px 24px ${alpha(theme.palette.primary.main, 0.2)}`;
                                    if (isCallInvite && isConcluded) return `0 4px 12px ${alpha(theme.palette.info.main, 0.1)}`;
                                    return 'none';
                                },
                                p: isCallInvite ? 3 : (isVoiceClip ? 0.5 : (isDocument ? 0 : 1.5)),
                                ...(isMe && {
                                    borderTopRightRadius: 0,
                                }),
                                ...(!isMe && {
                                    borderTopLeftRadius: 0,
                                }),
                            }}
                        >
                            {showSender && (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: isConcluded
                                            ? 'info.darker'
                                            : (isMe ? '#fff' : stringToDarkColor(msg.sender || msg.sender_email || '')),
                                        fontWeight: 'bold',
                                        display: 'block',
                                        mb: 1.5,
                                        fontSize: '11px',
                                        opacity: (isMe && !isConcluded) ? 0.8 : 1
                                    }}
                                >
                                    {msg.sender || msg.sender_email}
                                </Typography>
                            )}
                            {isCallInvite ? (
                                <Stack spacing={3}>
                                    <Stack direction="row" alignItems="center" spacing={3}>
                                        <Box
                                            sx={{
                                                width: 56,
                                                height: 56,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: 2,
                                                bgcolor: isConcluded
                                                    ? (theme) => alpha(theme.palette.info.main, 0.12)
                                                    : (isMe ? alpha('#fff', 0.2) : 'primary.main'),
                                                position: 'relative',
                                                boxShadow: isConcluded ? 'none' : `0 0 15px ${alpha('#fff', 0.3)}`,
                                                '&::after': !isConcluded ? {
                                                    content: '""',
                                                    position: 'absolute',
                                                    width: '100%',
                                                    height: '100%',
                                                    borderRadius: 2,
                                                    border: `2px solid ${alpha('#fff', 0.5)}`,
                                                    animation: 'pulse 2s infinite',
                                                } : {}
                                            }}
                                        >
                                            <Iconify
                                                icon={(callTypeFound === 'video' ? "solar:videocamera-record-bold" : "solar:phone-bold") as any}
                                                width={30}
                                                sx={{ color: isConcluded ? 'info.main' : '#fff' }}
                                            />
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="subtitle1"
                                                sx={{
                                                    color: isConcluded ? 'info.darker' : (isMe ? '#fff' : 'text.primary'),
                                                    fontWeight: 'bold',
                                                    lineHeight: 1.1,
                                                    fontSize: '15px'
                                                }}
                                            >
                                                Group {callTypeFound} call
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: isConcluded ? 'info.dark' : (isMe ? alpha('#fff', 0.7) : 'text.secondary'),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1.2,
                                                    mt: 0.8,
                                                    fontSize: '11px'
                                                }}
                                            >
                                                {isConcluded ? (
                                                    <>
                                                        <Iconify icon="solar:check-circle-bold" width={14} />
                                                        Meeting finished
                                                    </>
                                                ) : (
                                                    <>
                                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4caf50', animation: 'blink 1.5s infinite' }} />
                                                        Ongoing meeting...
                                                    </>
                                                )}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                    {!isConcluded && (
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            size="medium"
                                            onClick={() => onJoinCall?.(callTypeFound as any)}
                                            sx={{
                                                bgcolor: isMe ? '#fff' : 'primary.main',
                                                color: isMe ? 'primary.main' : '#fff',
                                                fontWeight: 'bold',
                                                borderRadius: 1.2,
                                                py: 1.2,
                                                '&:hover': {
                                                    bgcolor: isMe ? alpha('#fff', 0.9) : 'primary.dark',
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: (theme) => theme.customShadows.z12,
                                                },
                                                transition: (theme) => theme.transitions.create(['background-color', 'transform', 'box-shadow']),
                                            }}
                                        >
                                            Join Now
                                        </Button>
                                    )}
                                </Stack>
                            ) : isVoiceClip ? (
                                <ChatAudioPlayer src={getAudioSrc()} isMe={isMe} />
                            ) : isDocument ? (
                                <DocumentMessageCard msg={msg} isMe={isMe} />
                            ) : (
                                <Box
                                    component="div"
                                    dangerouslySetInnerHTML={{ __html: msg.content }}
                                    sx={{
                                        '& p': { m: 0 },
                                        '& a': { color: 'inherit' },
                                        '& img': {
                                            maxWidth: 240,
                                            maxHeight: 240,
                                            width: 'auto !important',
                                            height: 'auto !important',
                                            borderRadius: 1,
                                            objectFit: 'cover',
                                            display: 'block',
                                        },
                                        '& .deleted-message-text': {
                                            color: isMe ? 'white !important' : 'text.secondary',
                                        }
                                    }}
                                />
                            )}
                        </Box>
                    </Stack>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '10px' }}>
                        {fDateTime(msg.send_date, 'h:mm a')}
                    </Typography>
                </Stack>
            </Box>
        </Box >
    )
});

ChatMessageItem.displayName = 'ChatMessageItem';

// ----------------------------------------------------------------------

type ChatInputProps = {
    onSend: (data: {
        content: string;
        attachment?: string;
        is_media?: number;
        is_voice_clip?: number;
        is_document?: number;
    }) => void;
};

function ChatInput({ onSend }: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const isCancelledRef = useRef(false);

    const handleSend = () => {
        if (!message.trim()) return;
        onSend({ content: message });
        setMessage('');
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const response = await chatApi.uploadFile(file);
            const fileUrl = response.file_url;

            const isImage = file.type.startsWith('image/');
            const content = isImage
                ? `<img src="${fileUrl}" alt="Check this image" width="200" />`
                : `<a href="${fileUrl}" target="_blank">📄 ${file.name}</a>`;

            onSend({
                content,
                attachment: fileUrl,
                is_media: isImage ? 1 : 0,
                is_document: !isImage ? 1 : 0
            });
        } catch (error) {
            console.error('File upload error:', error);
            alert('Failed to upload file');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const startRecording = async () => {

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                if (isCancelledRef.current) return;

                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], 'voice_message.webm', { type: 'audio/webm' });

                setUploading(true);
                try {
                    const response = await chatApi.uploadFile(audioFile);
                    const fileUrl = response.file_url;

                    onSend({
                        content: `<audio controls src="${fileUrl}"></audio>`,
                        attachment: fileUrl,
                        is_voice_clip: 1
                    });
                } catch (error) {
                    console.error('Audio upload error:', error);
                } finally {
                    setUploading(false);
                    // Stop all tracks
                    stream.getTracks().forEach(track => track.stop());
                }
            };

            isCancelledRef.current = false;
            mediaRecorder.start();
            setIsRecording(true);
            setRecordingDuration(0);
            timerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Cannot access microphone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            isCancelledRef.current = true;
            mediaRecorderRef.current.stop(); // This triggers onstop, but we set cancelled flag
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setRecordingDuration(0);
            if (timerRef.current) clearInterval(timerRef.current);
            // Clear chunks
            audioChunksRef.current = [];
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <Box sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
            {isRecording ? (
                <Box
                    sx={{
                        flexGrow: 1,
                        height: 56,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 2,
                        borderRadius: 1,
                        bgcolor: 'error.lighter',
                        color: 'error.dark',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Box
                            sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: 'error.main',
                                animation: 'pulse 1.5s infinite',
                            }}
                        />
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            {formatDuration(recordingDuration)}
                        </Typography>
                    </Stack>

                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Recording...
                    </Typography>

                    <Stack direction="row" spacing={1}>
                        <IconButton onClick={cancelRecording} size="small" color="inherit">
                            <Iconify icon={"solar:trash-bin-trash-bold" as any} />
                        </IconButton>
                        <IconButton
                            onClick={stopRecording}
                            sx={{
                                bgcolor: 'error.main',
                                color: 'common.white',
                                '&:hover': { bgcolor: 'error.dark' },
                            }}
                        >
                            <Iconify icon={"solar:plain-bold" as any} width={20} />
                        </IconButton>
                    </Stack>
                </Box>
            ) : (
                <TextField
                    fullWidth
                    value={message}
                    disabled={uploading}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleSend();
                        }
                    }}
                    placeholder="Type a message..."
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={handleFileSelect}
                                />
                                <IconButton
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    size="small"
                                    sx={{ color: 'text.secondary' }}
                                >
                                    <Iconify icon={"solar:paperclip-bold" as any} />
                                </IconButton>
                            </InputAdornment>
                        ),
                        endAdornment: (
                            <InputAdornment position="end">
                                {message.trim() ? (
                                    <IconButton onClick={handleSend} edge="end">
                                        <Box component="img" src={`${CONFIG.assetsDir}/icons/send_icon.png`} sx={{ width: 42, height: 42 }} />
                                    </IconButton>
                                ) : (
                                    <IconButton
                                        onClick={startRecording}
                                        color="default"
                                        sx={{ color: 'text.secondary' }}
                                    >
                                        <Iconify icon={"solar:microphone-bold" as any} />
                                    </IconButton>
                                )}
                            </InputAdornment>
                        ),
                    }}
                />
            )}

            <style>
                {`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }
                `}
            </style>
        </Box>
    );
}
