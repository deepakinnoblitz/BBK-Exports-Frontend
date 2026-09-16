import { useState } from 'react';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Badge from '@mui/material/Badge';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import InputAdornment from '@mui/material/InputAdornment';
import ListItemButton from '@mui/material/ListItemButton';

import { stripHtml } from 'src/utils/string';
import { fDateTime, fToChatTime } from 'src/utils/format-time';
import { stringToColor, stringToDarkColor } from 'src/utils/color-utils';

import { Iconify } from 'src/components/iconify';

import ChatStatusBadge from './chat-status-badge';

// ----------------------------------------------------------------------

type Props = {
    user: any;
    channels: any[];
    presences: Record<string, any>;
    selectedChannel: any;
    onSelectChannel: (channel: any) => void;
    onOpenContacts: (mode?: 'direct' | 'group') => void;
    loading: boolean;
};

export default function ChatSidebar({ user, channels, presences, selectedChannel, onSelectChannel, onOpenContacts, loading }: Props) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredChannels = (Array.isArray(channels) ? channels : []).filter((channel) =>
        channel.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const renderLoading = (
        <Stack spacing={2} sx={{ p: 3 }}>
            {[...Array(5)].map((_, index) => (
                <Stack key={index} direction="row" alignItems="center" spacing={2}>
                    <Skeleton variant="circular" width={48} height={48} />
                    <Stack spacing={1} sx={{ flexGrow: 1 }}>
                        <Skeleton variant="text" sx={{ width: 0.5, height: 16 }} />
                        <Skeleton variant="text" sx={{ width: 0.8, height: 12 }} />
                    </Stack>
                </Stack>
            ))}
        </Stack>
    );


    return (
        <Box
            sx={{
                width: { xs: 1, md: 320 },
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                borderRight: (theme) => `solid 1px ${theme.palette.divider}`,
            }}
        >
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ p: 2, pb: 1 }}
            >
                <Typography variant="h6" sx={{ fontWeight: 'fontWeightBold' }}>InnoChat</Typography>
                <Stack direction="row" spacing={1}>
                    <IconButton size="small" color="inherit" onClick={() => onOpenContacts()} title="New Chat">
                        <Iconify icon="mingcute:add-line" width={24} />
                    </IconButton>
                </Stack>
            </Stack>

            <Box sx={{ px: 2, pb: 2 }}>
                <TextField
                    fullWidth
                    size="small"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                            </InputAdornment>
                        ),
                        sx: {
                            bgcolor: '#FFFFFF',
                            border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
                            borderRadius: 1,
                            transition: (theme) => theme.transitions.create(['border-color', 'box-shadow']),
                            '&:hover': {
                                borderColor: 'text.primary',
                            },
                            '&.Mui-focused': {
                                boxShadow: (theme) => `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
                                borderColor: 'primary.main',
                            },
                            '& fieldset': { border: 'none' }
                        }
                    }}
                />
            </Box>

            <Box sx={{
                flexGrow: 1,
                overflowY: 'auto',
                px: 1,
                // Hide scrollbar
                '&::-webkit-scrollbar': { display: 'none' },
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
            }}>
                {loading ? (
                    renderLoading
                ) : filteredChannels.length === 0 ? (
                    <Stack
                        alignItems="center"
                        justifyContent="center"
                        sx={{
                            py: 6,
                            px: 2.5,
                            textAlign: 'center',
                        }}
                    >
                        <Box
                            sx={{
                                width: 56,
                                height: 56,
                                borderRadius: '50%',
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                color: 'primary.main',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mb: 2,
                            }}
                        >
                            <Iconify icon="solar:chat-round-dots-bold-duotone" width={32} />
                        </Box>

                        <Typography variant="subtitle2" sx={{ fontWeight: 'fontWeightBold', mb: 0.5 }}>
                            {searchQuery ? 'No conversations found' : 'No conversations yet'}
                        </Typography>

                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5, fontSize: '13px' }}>
                            {searchQuery
                                ? 'Try searching with a different name'
                                : 'Start a chat with any of your team members'}
                        </Typography>

                        <Button
                            variant="contained"
                            color="inherit"
                            startIcon={<Iconify icon="mingcute:add-line" />}
                            onClick={() => onOpenContacts()}
                            sx={{
                                borderRadius: 1,
                                textTransform: 'none',
                                fontWeight: 'fontWeightBold',
                                fontSize: '13px',
                                px: 2,
                                py: 0.8,
                            }}
                        >
                            New Conversation
                        </Button>
                    </Stack>
                ) : (
                    <List disablePadding>
                        {filteredChannels.map((channel) => (
                            <ListItemButton
                                key={channel.room}
                                selected={selectedChannel?.room === channel.room}
                                onClick={() => onSelectChannel(channel)}
                                sx={{
                                    py: 1.5,
                                    px: 1.5,
                                    borderRadius: 1,
                                    mb: 0.5,
                                    transition: (theme) => theme.transitions.create(['background-color']),
                                    '&.Mui-selected': {
                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                        '&:hover': {
                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                                        },
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            left: 0,
                                            height: '60%',
                                            width: 4,
                                            borderRadius: '0 4px 4px 0',
                                            bgcolor: 'primary.main',
                                            background: (theme) => `linear-gradient(to bottom, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                                        }
                                    },
                                    '&:hover': {
                                        bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
                                    }
                                }}
                            >
                                <Box sx={{ position: 'relative', mr: 2 }}>
                                    <Badge
                                        color="error"
                                        badgeContent={channel.user_unread_messages}
                                        invisible={channel.user_unread_messages === 0}
                                        sx={{
                                            '& > .MuiBadge-badge': {
                                                right: 2,
                                                top: 2,
                                                border: (theme) => `solid 2px ${theme.palette.background.paper}`,
                                            }
                                        }}
                                    >
                                        <ChatStatusBadge status={channel.type === 'Direct' ? presences?.[channel.contact]?.status : undefined}>
                                            <Avatar
                                                alt={channel.displayName}
                                                src={channel.avatar_url}
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    fontWeight: 'fontWeightBold',
                                                    color: channel.avatar_url ? 'text.secondary' : stringToDarkColor(channel.displayName || ''),
                                                    bgcolor: channel.avatar_url ? 'common.white' : stringToColor(channel.displayName || ''),
                                                    border: (t) => channel.avatar_url ? `solid 1px ${t.palette.divider}` : 'none',
                                                    '& img': {
                                                        objectFit: 'cover',
                                                    }

                                                }}
                                            >
                                                {channel.displayName?.charAt(0).toUpperCase()}
                                            </Avatar>
                                        </ChatStatusBadge>
                                    </Badge>
                                </Box>

                                <ListItemText
                                    primary={channel.displayName}
                                    primaryTypographyProps={{
                                        noWrap: true,
                                        variant: 'subtitle2',
                                        sx: { fontWeight: 'fontWeightBold', fontSize: '14px' }
                                    }}
                                    secondary={
                                        (() => {
                                            const content = channel.last_message || '';

                                            // Check for call log (ENDED/MISSED) FIRST — this is the last message after a meeting concludes
                                            const callLogMatch = content.match(/\[CALL_(ENDED|MISSED): ([^|\]]+)(?:\|(\d+))?\]/);
                                            if (callLogMatch) {
                                                const isMissed = callLogMatch[1] === 'MISSED';
                                                const type = callLogMatch[2].trim();
                                                const isGroup = type.startsWith('group_');
                                                const isVideo = type.includes('video');
                                                return (
                                                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: isMissed ? 'error.main' : 'inherit' }}>
                                                        <Iconify
                                                            icon={(isVideo ? "solar:videocamera-record-bold" : "solar:phone-bold") as any}
                                                            width={14}
                                                        />
                                                        <span>{isMissed ? (isGroup ? 'Missed meeting' : 'Missed call') : (isGroup ? 'Meeting finished' : (isVideo ? 'Video' : 'Audio') + ' call')}</span>
                                                    </Stack>
                                                );
                                            }

                                            // GROUP_CALL invite is still the last message → meeting is ongoing
                                            if (content.includes('[GROUP_CALL]')) {
                                                return (
                                                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'success.main' }}>
                                                        <Iconify icon={"solar:videocamera-record-bold" as any} width={14} />
                                                        <span>Ongoing meeting...</span>
                                                    </Stack>
                                                );
                                            }

                                            if (content.includes('recording') || content.includes('<audio')) {
                                                return (
                                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                                        <Iconify icon={"solar:microphone-bold" as any} width={14} />
                                                        <span>Audio Message</span>
                                                    </Stack>
                                                );
                                            }
                                            if (content.includes('<img')) {
                                                return (
                                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                                        <Iconify icon={"solar:gallery-bold" as any} width={14} />
                                                        <span>Image</span>
                                                    </Stack>
                                                );
                                            }
                                            if (content.includes('<a href')) {
                                                return (
                                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                                        <Iconify icon={"solar:file-bold" as any} width={14} />
                                                        <span>File</span>
                                                    </Stack>
                                                );
                                            }
                                            return stripHtml(content);
                                        })()
                                    }
                                    secondaryTypographyProps={{
                                        noWrap: true,
                                        component: 'div',
                                        variant: 'caption',
                                        color: channel.user_unread_messages > 0 ? 'text.primary' : 'text.secondary',
                                        fontWeight: channel.user_unread_messages > 0 ? 'fontWeightBold' : 'fontWeightRegular',
                                        sx: { fontSize: '12px' }
                                    }}
                                />

                                <Stack alignItems="flex-end" sx={{ ml: 2, height: 40, justifyContent: 'center' }}>
                                    <Typography
                                        noWrap
                                        variant="caption"
                                        component="span"
                                        sx={{ color: 'text.disabled', fontSize: '11px' }}
                                    >
                                        {fToChatTime(channel.send_date)}
                                    </Typography>
                                </Stack>
                            </ListItemButton>
                        ))}
                    </List>
                )}
            </Box>
        </Box>
    );
}
