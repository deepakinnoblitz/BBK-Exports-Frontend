import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';

import { stringToColor, stringToDarkColor } from 'src/utils/color-utils';

import { chatApi } from 'src/api/chat';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/confirm-dialog';

// ----------------------------------------------------------------------

type Props = {
    user: any;
    channel: any;
    messages: any[];
    onClose: () => void;
    onCloseChannel: () => void;
    onReopenChannel: () => void;
    onRefresh?: () => void;
};

export default function ChatInfo({ user, channel, messages, onClose, onCloseChannel, onReopenChannel, onRefresh }: Props) {
    const theme = useTheme();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [view, setView] = useState<'info' | 'media'>('info');
    const [tab, setTab] = useState(0);
    const [members, setMembers] = useState<any[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [editNameOpen, setEditNameOpen] = useState(false);
    const [confirmClose, setConfirmClose] = useState(false);
    const [newGroupName, setNewGroupName] = useState(channel.displayName || '');


    const isClosed = channel.chat_status === 'Closed';
    const isGroup = channel.type === 'Group';

    const fetchMembers = useCallback(async () => {
        try {
            const res = await chatApi.getChatMembers(channel.room);
            const data = res?.message || res;
            const results = data?.results;
            const chatMembers = (Array.isArray(results) && results[0]?.chat_members) || data?.chat_members || [];
            setMembers(Array.isArray(chatMembers) ? chatMembers : []);
        } catch (error) {
            console.error('Failed to fetch members:', error);
        }
    }, [channel.room]);

    const checkAdmin = useCallback(async () => {
        if (!user?.email || !isGroup) return;
        try {
            const res = await chatApi.checkIfRoomAdmin(channel.room, user.email);
            const adminStatus = res?.message !== undefined ? res.message : res;
            setIsAdmin(!!adminStatus);
        } catch (error) {
            console.error('Failed to check admin status:', error);
        }
    }, [channel.room, user?.email, isGroup]);

    useEffect(() => {
        if (isGroup) {
            fetchMembers();
            checkAdmin();
        }
    }, [isGroup, fetchMembers, checkAdmin]);

    const handleUpdateName = async () => {
        try {
            await chatApi.updateGroupInfo(channel.room, { channel_name: newGroupName });
            setEditNameOpen(false);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Failed to update group name:', error);
        }
    };

    const handleAvatarClick = () => {
        if (isAdmin) {
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const uploadedFile = await chatApi.uploadFile(file);
                if (uploadedFile?.file_url) {
                    await chatApi.updateGroupInfo(channel.room, { channel_image: uploadedFile.file_url });
                    if (onRefresh) onRefresh();
                }
            } catch (error) {
                console.error('Failed to update avatar:', error);
            }
        }
    };

    const sharedContent = useMemo(() => {
        const images: string[] = [];
        const links: { title: string; url: string }[] = [];
        const docs: { name: string; url: string }[] = [];

        messages.forEach((msg) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = msg.content;

            // Extract Images
            const imgs = tempDiv.getElementsByTagName('img');
            for (let i = 0; i < imgs.length; i += 1) {
                images.push(imgs[i].src);
            }

            // Extract Links and Docs
            const anchors = tempDiv.getElementsByTagName('a');
            for (let i = 0; i < anchors.length; i += 1) {
                const { href } = anchors[i];
                const text = anchors[i].innerText || href;
                if (href.includes('/files/') || href.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar)$/i)) {
                    docs.push({ name: text, url: href });
                } else {
                    links.push({ title: text, url: href });
                }
            }
        });

        return { images, links, docs };
    }, [messages]);

    if (view === 'media') {
        return (
            <Stack sx={{ height: 1, position: 'relative', bgcolor: 'background.paper' }}>
                <Stack
                    direction="row"
                    alignItems="center"
                    sx={{ py: 2, px: 2, bgcolor: 'background.neutral' }}
                >
                    <IconButton onClick={() => setView('info')} sx={{ mr: 1 }}>
                        <Iconify icon={"solar:arrow-left-outline" as any} />
                    </IconButton>
                    <Typography variant="h6">{channel.displayName}</Typography>
                </Stack>

                <Tabs
                    value={tab}
                    onChange={(e, newValue) => setTab(newValue)}
                    sx={{
                        px: 2,
                        bgcolor: 'background.neutral',
                        '& .MuiTabs-indicator': { bgcolor: 'primary.main' }
                    }}
                >
                    <Tab label="Media" />
                    <Tab label="Links" />
                    <Tab label="Docs" />
                </Tabs>

                <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
                    {tab === 0 && (
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: 1,
                            }}
                        >
                            {sharedContent.images.map((img, index) => (
                                <Box
                                    key={index}
                                    component="img"
                                    src={img}
                                    sx={{
                                        width: 1,
                                        aspectRatio: '1/1',
                                        borderRadius: 1,
                                        objectFit: 'cover',
                                        cursor: 'pointer',
                                        bgcolor: 'background.neutral',
                                    }}
                                    onClick={() => window.open(img, '_blank')}
                                />
                            ))}
                            {sharedContent.images.length === 0 && (
                                <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', width: 1, mt: 4 }}>
                                    No shared media
                                </Typography>
                            )}
                        </Box>
                    )}

                    {tab === 1 && (
                        <Stack spacing={1}>
                            {sharedContent.links.map((link, index) => (
                                <Box
                                    key={index}
                                    component="a"
                                    href={link.url}
                                    target="_blank"
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 1,
                                        bgcolor: 'background.neutral',
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        '&:hover': { bgcolor: 'action.hover' }
                                    }}
                                >
                                    <Typography variant="subtitle2" noWrap>{link.title}</Typography>
                                </Box>
                            ))}
                            {sharedContent.links.length === 0 && (
                                <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', mt: 4 }}>
                                    No shared links
                                </Typography>
                            )}
                        </Stack>
                    )}

                    {tab === 2 && (
                        <Stack spacing={1}>
                            {sharedContent.docs.map((doc, index) => (
                                <Stack
                                    key={index}
                                    direction="row"
                                    alignItems="center"
                                    spacing={2}
                                    component="a"
                                    href={doc.url}
                                    target="_blank"
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 1,
                                        bgcolor: 'background.neutral',
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        '&:hover': { bgcolor: 'action.hover' }
                                    }}
                                >
                                    <Iconify
                                        icon={"solar:file-text-bold-duotone" as any}
                                        sx={{ color: 'primary.main', width: 28, height: 28 }}
                                    />
                                    <Typography variant="subtitle2" noWrap sx={{ flexGrow: 1 }}>
                                        {doc.name}
                                    </Typography>
                                </Stack>
                            ))}
                            {sharedContent.docs.length === 0 && (
                                <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', mt: 4 }}>
                                    No shared documents
                                </Typography>
                            )}
                        </Stack>
                    )}
                </Box>
            </Stack>
        );
    }

    return (
        <Stack sx={{ height: 1, position: 'relative', bgcolor: 'background.paper' }}>
            {/* Header */}
            <Stack
                direction="row"
                alignItems="center"
                sx={{ py: 2, px: 2, bgcolor: 'background.neutral' }}
            >
                <IconButton onClick={onClose} sx={{ mr: 1 }}>
                    <Iconify icon={"solar:arrow-left-outline" as any} />
                </IconButton>
                <Typography variant="h6">{isGroup ? 'Group Info' : 'Contact Info'}</Typography>
            </Stack>

            <Divider />

            <Scrollbar sx={{ flexGrow: 1 }}>
                {/* Body */}
                <Stack sx={{ p: 4, alignItems: 'center' }} spacing={2}>
                    <Box sx={{ position: 'relative' }}>
                        <Avatar
                            alt={channel.displayName}
                            src={channel.avatar_url || channel.channel_info?.avatar}
                            onClick={handleAvatarClick}
                            sx={{
                                width: 120,
                                height: 120,
                                fontSize: '3rem',
                                fontWeight: 'fontWeightBold',
                                cursor: isAdmin ? 'pointer' : 'default',
                                color: (channel.avatar_url || channel.channel_info?.avatar) ? 'text.secondary' : stringToDarkColor(channel.displayName || ''),
                                bgcolor: (channel.avatar_url || channel.channel_info?.avatar) ? 'common.white' : stringToColor(channel.displayName || ''),
                                border: (t) => (channel.avatar_url || channel.channel_info?.avatar) ? `solid 1px ${t.palette.divider}` : 'none',
                                '& img': {
                                    objectFit: 'cover',
                                },

                                '&:hover': isAdmin ? {
                                    opacity: 0.8,
                                    '& .camera-icon': { opacity: 1 }
                                } : {}
                            }}
                        >
                            {channel.displayName?.charAt(0).toUpperCase()}
                        </Avatar>

                        {isAdmin && (
                            <Box
                                className="camera-icon"
                                sx={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    bgcolor: 'primary.main',
                                    color: 'primary.contrastText',
                                    borderRadius: '50%',
                                    p: 0.5,
                                    border: (t) => `3px solid ${t.palette.background.paper}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'opacity 0.2s',
                                    pointerEvents: 'none'
                                }}
                            >
                                <Iconify icon={"solar:camera-bold" as any} width={20} />
                            </Box>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </Box>

                    <Stack alignItems="center" direction="row" spacing={1}>
                        <Typography variant="h6">{channel.displayName}</Typography>
                        {isAdmin && (
                            <IconButton size="small" onClick={() => setEditNameOpen(true)}>
                                <Iconify icon={"solar:pen-bold" as any} width={16} />
                            </IconButton>
                        )}
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {isGroup ? `${members.length} Participants` : (channel.contact || '')}
                    </Typography>

                    {/* Actions moved from bottom - Restricted to Admins for Groups */}
                    {(isAdmin || !isGroup) && (
                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                            {isClosed ? (
                                <Stack direction="row" spacing={1} justifyContent="center">
                                    <Button
                                        variant={"soft" as any}
                                        color="inherit"
                                        size="small"
                                        disabled
                                        startIcon={<Iconify icon={"solar:lock-bold" as any} width={16} />}
                                        sx={{ borderRadius: 1.5, px: 2 }}
                                    >
                                        Closed
                                    </Button>
                                    <Button
                                        variant={"soft" as any}
                                        color="primary"
                                        size="small"
                                        onClick={onReopenChannel}
                                        startIcon={<Iconify icon={"solar:reorder-bold" as any} width={16} />}
                                        sx={{ borderRadius: 1.5, px: 2 }}
                                    >
                                        Reopen
                                    </Button>
                                </Stack>
                            ) : (
                                <Button
                                    variant={"soft" as any}
                                    color="error"
                                    size="small"
                                    onClick={() => setConfirmClose(true)}
                                    startIcon={<Iconify icon={"solar:logout-bold" as any} width={14} />}

                                    sx={{
                                        borderRadius: 1,
                                        px: 2,
                                        py: 0.5,
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                        bgcolor: (t) => alpha(t.palette.error.main, 0.08),
                                        '&:hover': {
                                            bgcolor: (t) => alpha(t.palette.error.main, 0.16),
                                            transform: 'translateY(-1px)',
                                            boxShadow: (t) => `0 4px 8px -2px ${alpha(t.palette.error.main, 0.2)}`,
                                        },
                                        transition: (t) => t.transitions.create(['background-color', 'transform', 'box-shadow'], {
                                            duration: t.transitions.duration.shorter,
                                        }),
                                    }}
                                >
                                    Close Channel
                                </Button>
                            )}
                        </Box>
                    )}
                </Stack>

                <Divider />

                {/* Media/Links Section */}
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    onClick={() => setView('media')}
                    sx={{ px: 3, py: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                >
                    <Typography variant="subtitle2">Media, links and docs</Typography>
                    <Iconify icon={"eva:chevron-right-fill" as any} />
                </Stack>

                <Divider />

                {/* Members List */}
                {isGroup && (
                    <>
                        <Box sx={{ px: 3, pt: 2, pb: 1 }}>
                            <Typography variant="overline" sx={{ color: 'text.disabled' }}>
                                {members.length} Participants
                            </Typography>
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                            <List disablePadding>
                                {members.map((member) => (
                                    <ListItemButton key={member.email} sx={{ px: 3, py: 1.2 }}>
                                        <ListItemAvatar>
                                            <Avatar
                                                alt={member.name}
                                                src={member.profile_image}
                                                sx={{
                                                    bgcolor: (t) => (member.profile_image) ? 'common.white' : stringToColor(member.name || ''),
                                                    color: (t) => (member.profile_image) ? 'text.secondary' : stringToDarkColor(member.name || ''),
                                                    width: 44,
                                                    height: 44,
                                                    border: (t) => member.profile_image ? `solid 1px ${t.palette.divider}` : 'none',
                                                    '& img': {
                                                        objectFit: 'cover',
                                                    }

                                                }}
                                            >
                                                {member.name?.charAt(0).toUpperCase()}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={member.name}
                                            secondary={member.email}
                                            primaryTypographyProps={{ variant: 'subtitle2', sx: { mb: 0.25 } }}
                                            secondaryTypographyProps={{ variant: 'caption', sx: { color: 'text.disabled' } }}
                                        />
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            {member.email === user?.email && (
                                                <Label variant="soft" color="info" sx={{ textTransform: 'capitalize' }}>
                                                    You
                                                </Label>
                                            )}
                                            {member.is_admin === 1 && (
                                                <Label variant="soft" color="success" sx={{ textTransform: 'capitalize' }}>
                                                    Admin
                                                </Label>
                                            )}
                                        </Stack>
                                    </ListItemButton>
                                ))}
                            </List>
                        </Box>
                        <Divider />
                    </>
                )}

            </Scrollbar>

            {/* Edit Name Dialog */}
            <Dialog open={editNameOpen} onClose={() => setEditNameOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Edit Group Name</DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    <TextField
                        fullWidth
                        autoFocus
                        label="Group Name"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        variant="outlined"
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditNameOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdateName} variant="contained" color="primary">
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={confirmClose}
                onClose={() => setConfirmClose(false)}
                title="Close Channel"
                content={`Are you sure you want to close this ${isGroup ? 'group' : 'chat'}?`}
                action={
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => {
                            onCloseChannel();
                            setConfirmClose(false);
                        }}
                        sx={{ borderRadius: 1.5, minWidth: 100 }}
                    >
                        Close
                    </Button>
                }
            />
        </Stack>

    );
}
