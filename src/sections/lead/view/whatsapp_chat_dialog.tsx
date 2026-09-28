import { enqueueSnackbar } from 'notistack';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';
import { Popover, IconButton, CircularProgress } from '@mui/material';

import {
    sendWhatsappMessage,
    fetchWhatsappMessages,
    uploadWhatsappAttachment,
} from 'src/api/whatsapp';

import { Iconify } from 'src/components/iconify';

type Props = {
    open: boolean;
    onClose: () => void;
    lead: any;
};

const isImageFile = (url: string) => {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.png') || cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg') || cleanUrl.endsWith('.gif') || cleanUrl.endsWith('.webp');
};

export function WhatsappChatDialog({
    open,
    onClose,
    lead,
}: Props) {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const isFirstLoadRef = useRef(true);

    const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [emojiCategory, setEmojiCategory] = useState<string>('smileys');
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [pendingAttachment, setPendingAttachment] = useState<{ url: string; name: string } | null>(null);

    const handleEmojiClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setEmojiAnchorEl(event.currentTarget as HTMLButtonElement);
    };

    const handleEmojiClose = () => {
        setEmojiAnchorEl(null);
    };

    const handleSelectEmoji = (emoji: string) => {
        setMessageText((prev) => prev + emoji);
    };

    const handleAttachmentClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !lead?.phone_number) return;

        setUploadingFile(true);
        try {
            const fileUrl = await uploadWhatsappAttachment(file);
            if (fileUrl) {
                setPendingAttachment({ url: fileUrl, name: file.name });
            }
        } catch (error) {
            console.error('File upload failed:', error);
        } finally {
            setUploadingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const loadMessages = useCallback(async (start = 0, append = false) => {
        if (!lead?.phone_number) return;
        try {
            const limit = 10;
            const fetchedMessages = await fetchWhatsappMessages(lead.phone_number, start, limit);

            if (fetchedMessages.length < limit) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

            if (append) {
                const container = scrollContainerRef.current;
                const oldScrollHeight = container ? container.scrollHeight : 0;

                setMessages((prev) => [...fetchedMessages, ...prev]);

                setTimeout(() => {
                    if (container) {
                        container.scrollTop = container.scrollHeight - oldScrollHeight;
                    }
                }, 0);
            } else {
                setMessages(fetchedMessages);
                if (isFirstLoadRef.current) {
                    setTimeout(() => {
                        if (chatEndRef.current) {
                            chatEndRef.current.scrollIntoView({ behavior: 'auto' });
                        }
                        isFirstLoadRef.current = false;
                    }, 50);
                }
            }
        } catch (error) {
            console.error('Failed to load WhatsApp messages:', error);
        }
    }, [lead?.phone_number]);

    // Initial load
    useEffect(() => {
        if (open && lead?.phone_number) {
            setLoading(true);
            isFirstLoadRef.current = true;
            setHasMore(true);
            loadMessages(0, false).finally(() => setLoading(false));
        } else {
            setMessages([]);
        }
    }, [open, lead?.phone_number, loadMessages]);

    // Polling for new messages
    useEffect(() => {
        let interval: any;
        if (open && lead?.phone_number) {
            interval = setInterval(async () => {
                try {
                    const latestMessages = await fetchWhatsappMessages(lead.phone_number, 0, 10);

                    setMessages((prev) => {
                        const prevIds = new Set(prev.map(m => m.name));
                        const newMsgs = latestMessages.filter((m: any) => !prevIds.has(m.name));
                        if (newMsgs.length > 0) {
                            const container = scrollContainerRef.current;
                            const isNearBottom = container ? (container.scrollHeight - container.scrollTop - container.clientHeight < 120) : false;

                            const updated = [...prev, ...newMsgs];

                            if (isNearBottom) {
                                setTimeout(() => {
                                    if (chatEndRef.current) {
                                        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
                                    }
                                }, 50);
                            }
                            return updated;
                        }
                        return prev;
                    });
                } catch (error) {
                    console.error('Failed to poll WhatsApp messages:', error);
                }
            }, 4000);
        }
        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [open, lead?.phone_number]);

    const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        if (container.scrollTop === 0 && hasMore && !loadingMore && messages.length > 0) {
            setLoadingMore(true);
            await loadMessages(messages.length, true);
            setLoadingMore(false);
        }
    };

    const handleSend = async () => {
        if ((!messageText.trim() && !pendingAttachment) || !lead?.phone_number || sending) return;
        try {
            setSending(true);
            const result = await sendWhatsappMessage(lead.phone_number, messageText, pendingAttachment?.url);
            if (result?.success) {
                setMessageText('');
                setPendingAttachment(null);
                await loadMessages(0, false);
                setTimeout(() => {
                    if (chatEndRef.current) {
                        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 50);
            } else {
                console.error('Failed to send WhatsApp message:', result?.error);
            }
        } catch (error: any) {
            console.error('Failed to send WhatsApp message:', error);
            enqueueSnackbar(error.message || 'Failed to send WhatsApp message', { variant: 'error' });
        } finally {
            setSending(false);
        }
    };
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatMessageTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
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
                    boxShadow: (theme) => theme.customShadows.z24,
                }
            }}
        >
            <DialogContent
                sx={{
                    p: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    height: 700,
                    overflow: 'hidden',
                    bgcolor: '#efeae2',
                    position: 'relative',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: 'url(/assets/images/Whatapp_bg.png)',
                        backgroundRepeat: 'repeat',
                        backgroundSize: 'auto',
                        opacity: 0.35,
                        zIndex: 0,
                        pointerEvents: 'none',
                    },
                    '& > *': {
                        position: 'relative',
                        zIndex: 1,
                    },
                }}
            >
                <Box
                    sx={{
                        p: 2,
                        px: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        borderBottom: '1px solid',
                        borderColor: 'rgba(0,0,0,0.08)',
                        bgcolor: '#ffffff',
                        flexShrink: 0,
                    }}
                >
                    <IconButton
                        aria-label="back"
                        onClick={onClose}
                        sx={{
                            color: '#54656f',
                            p: 0.5,
                            mr: 0.5,
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                        }}
                    >
                        <Iconify icon={"eva:arrow-back-fill" as any} width={24} />
                    </IconButton>

                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            bgcolor: '#25D366',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '1.1rem',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            userSelect: 'none'
                        }}
                    >
                        {lead?.lead_name?.charAt(0) || 'U'}
                    </Box>

                    <Box sx={{ flexGrow: 1 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: '#111b21', lineHeight: 1.2 }}>
                            {lead?.lead_name}
                        </Typography>

                        <Typography
                            variant="caption"
                            sx={{
                                fontSize: '0.75rem',
                                color: '#667781',
                                display: 'block',
                                mt: 0.25
                            }}
                        >
                            {lead?.phone_number}
                        </Typography>
                    </Box>
                </Box>

                <Box
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    sx={{
                        flexGrow: 1,
                        p: 2,
                        bgcolor: 'transparent',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.5,
                    }}
                >
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <CircularProgress size={32} sx={{ color: '#25D366' }} />
                        </Box>
                    ) : messages.length === 0 ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'text.secondary' }}>
                            <Typography variant="body2">No messages yet. Send a message to start the conversation.</Typography>
                        </Box>
                    ) : (
                        <>
                            {loadingMore && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                                    <CircularProgress size={20} sx={{ color: '#25D366' }} />
                                </Box>
                            )}
                            {messages.map((msg) => {
                                const isOutgoing = msg.message_direction === 'Outgoing';
                                const hasDocAttachment = msg.attachment && !isImageFile(msg.attachment);
                                const hasImageAttachment = msg.attachment && isImageFile(msg.attachment);

                                const renderStatus = () => (
                                    <Box
                                        sx={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 0.5,
                                            float: 'right',
                                            ml: 2,
                                            mt: 0.75,
                                            verticalAlign: 'bottom',
                                            userSelect: 'none'
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontSize: '0.625rem',
                                                color: '#667781',
                                                fontWeight: 500
                                            }}
                                        >
                                            {formatMessageTime(msg.creation)}
                                        </Typography>
                                        {isOutgoing && (
                                            <Iconify
                                                icon={
                                                    (msg.status === 'Read' ? 'bi:check-all' :
                                                        msg.status === 'Delivered' ? 'bi:check-all' :
                                                            msg.status === 'Failed' ? 'material-symbols:error-outline' : 'bi:check') as any
                                                }
                                                width={15}
                                                sx={{
                                                    color: msg.status === 'Read' ? '#53bdeb' : '#8696a0',
                                                    display: 'inline-flex'
                                                }}
                                            />
                                        )}
                                    </Box>
                                );

                                const bubbleSx = {
                                    maxWidth: '68%',
                                    alignSelf: isOutgoing ? 'flex-end' : 'flex-start',
                                    bgcolor: isOutgoing ? '#d9fdd3' : '#fff',
                                    borderRadius: '8px',
                                    p: 1.25,
                                    pb: 0.75,
                                    boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                                    position: 'relative',
                                    mr: isOutgoing ? 1 : 0,
                                    ml: isOutgoing ? 0 : 1,
                                    '&::after': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        width: 0,
                                        height: 0,
                                        borderTop: `8px solid ${isOutgoing ? '#d9fdd3' : '#fff'}`,
                                        ...(isOutgoing ? {
                                            right: -6,
                                            borderRight: '6px solid transparent',
                                        } : {
                                            left: -6,
                                            borderLeft: '6px solid transparent',
                                        })
                                    }
                                };

                                const renderDocCard = () => (
                                    <Box
                                        component="a"
                                        href={msg.attachment}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.5,
                                            p: 1.25,
                                            borderRadius: '8px',
                                            bgcolor: isOutgoing ? '#cfe9ba' : '#f0f2f5',
                                            textDecoration: 'none',
                                            color: 'inherit',
                                            border: '1px solid rgba(0,0,0,0.04)',
                                            '&:hover': {
                                                bgcolor: isOutgoing ? '#c2dfae' : '#e4e6eb',
                                            }
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 40,
                                                height: 45,
                                                bgcolor: msg.attachment.split('?')[0].toLowerCase().endsWith('.pdf') ? '#ea4335' : '#5f6368',
                                                borderRadius: '6px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <Typography
                                                sx={{
                                                    color: '#fff',
                                                    fontSize: '0.65rem',
                                                    fontWeight: 900,
                                                    textTransform: 'uppercase',
                                                    userSelect: 'none',
                                                    lineHeight: 1,
                                                    letterSpacing: '0.5px'
                                                }}
                                            >
                                                {msg.attachment.split('?')[0].split('.').pop()?.toUpperCase().substring(0, 4) || 'FILE'}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                                            <Typography
                                                variant="subtitle2"
                                                noWrap
                                                sx={{
                                                    fontSize: '0.85rem',
                                                    fontWeight: 500,
                                                    color: '#111b21',
                                                    lineHeight: 1.2
                                                }}
                                            >
                                                {msg.attachment.split('/').pop()?.split('?')[0] || 'Document'}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    fontSize: '0.72rem',
                                                    color: '#667781',
                                                    mt: 0.25,
                                                    display: 'block'
                                                }}
                                            >
                                                {(msg.attachment.split('?')[0].split('.').pop()?.toUpperCase() || 'FILE')} • Document
                                            </Typography>
                                        </Box>
                                    </Box>
                                );

                                if (hasDocAttachment && msg.message_content) {
                                    return (
                                        <Box key={msg.name} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <Box sx={bubbleSx}>
                                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', pr: 1, color: '#111b21', display: 'inline', wordBreak: 'break-word' }}>
                                                    {msg.message_content}
                                                </Typography>
                                                {renderStatus()}
                                            </Box>
                                            <Box sx={bubbleSx}>
                                                {renderDocCard()}
                                                {renderStatus()}
                                            </Box>
                                        </Box>
                                    );
                                }

                                return (
                                    <Box key={msg.name} sx={bubbleSx}>
                                        {hasImageAttachment && (
                                            <Box
                                                sx={{
                                                    mt: -1.25,
                                                    mx: -1.25,
                                                    mb: msg.message_content ? 1 : 0,
                                                    borderTopLeftRadius: '8px',
                                                    borderTopRightRadius: '8px',
                                                    borderBottomLeftRadius: msg.message_content ? 0 : '8px',
                                                    borderBottomRightRadius: msg.message_content ? 0 : '8px',
                                                    overflow: 'hidden',
                                                    borderBottom: msg.message_content ? '1px solid rgba(0,0,0,0.05)' : 'none',
                                                }}
                                            >
                                                <img
                                                    src={msg.attachment}
                                                    alt="WhatsApp Attachment"
                                                    style={{
                                                        width: '100%',
                                                        height: 'auto',
                                                        display: 'block',
                                                        objectFit: 'contain',
                                                        maxHeight: 320
                                                    }}
                                                />
                                            </Box>
                                        )}

                                        {hasDocAttachment && renderDocCard()}

                                        {msg.message_content && (
                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', pr: 1, color: '#111b21', display: 'inline', wordBreak: 'break-word' }}>
                                                {msg.message_content}
                                            </Typography>
                                        )}

                                        {renderStatus()}
                                    </Box>
                                );
                            })}
                        </>
                    )}
                    <div ref={chatEndRef} />
                </Box>

                {/* Send Bar */}
                <Box
                    sx={{
                        p: 1.5,
                        px: 2,
                        bgcolor: 'transparent',
                        flexShrink: 0
                    }}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />

                    {pendingAttachment && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                p: 1,
                                px: 2,
                                mb: 1.5,
                                borderRadius: '12px',
                                bgcolor: '#ffffff',
                                border: '1px solid rgba(0,0,0,0.08)',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                width: 'fit-content',
                                maxWidth: '100%',
                            }}
                        >
                            {isImageFile(pendingAttachment.url) ? (
                                <Box
                                    component="img"
                                    src={pendingAttachment.url}
                                    sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: '4px',
                                        objectFit: 'cover',
                                    }}
                                />
                            ) : (
                                <Box
                                    sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: '4px',
                                        bgcolor: pendingAttachment.url.split('?')[0].toLowerCase().endsWith('.pdf') ? '#ea4335' : '#5f6368',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Iconify icon={"fluent:document-24-regular" as any} width={20} sx={{ color: '#fff' }} />
                                </Box>
                            )}
                            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                                <Typography variant="subtitle2" noWrap sx={{ fontSize: '0.85rem' }}>
                                    {pendingAttachment.name}
                                </Typography>
                            </Box>
                            <IconButton
                                size="small"
                                onClick={() => setPendingAttachment(null)}
                                sx={{ color: 'text.secondary', p: 0.5 }}
                            >
                                <Iconify icon={"eva:close-fill" as any} width={18} />
                            </IconButton>
                        </Box>
                    )}

                    <Box
                        sx={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            bgcolor: '#ffffff',
                            borderRadius: '24px',
                            p: '4px 6px 4px 12px',
                            boxShadow: '0 2px 5px rgba(11,20,26,.08)',
                        }}
                    >
                        <IconButton
                            onClick={handleAttachmentClick}
                            disabled={uploadingFile}
                            sx={{ color: '#54656f', p: 1 }}
                        >
                            {uploadingFile ? (
                                <CircularProgress size={20} color="inherit" />
                            ) : (
                                <Iconify icon={"fluent:add-24-filled" as any} width={22} />
                            )}
                        </IconButton>

                        <IconButton
                            onClick={handleEmojiClick}
                            sx={{ color: '#54656f', p: 1, mr: 0.5 }}
                        >
                            <Iconify icon={"fluent:emoji-24-regular" as any} width={22} />
                        </IconButton>

                        <TextField
                            fullWidth
                            placeholder="Type a message"
                            size="small"
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyDown={handleKeyPress}
                            disabled={sending}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 1.5,
                                    height: 40,
                                    bgcolor: 'transparent',
                                    px: 0.5,
                                    border: 'none',
                                    '& fieldset': { border: 'none' },
                                    '&:hover fieldset': { border: 'none' },
                                    '&.Mui-focused fieldset': { border: 'none' },
                                },
                                '& .MuiInputBase-input': {
                                    color: '#111b21',
                                    fontSize: '0.95rem',
                                    p: 0,
                                }
                            }}
                        />

                        <IconButton
                            onClick={handleSend}
                            disabled={sending || (!messageText.trim() && !pendingAttachment)}
                            sx={{
                                bgcolor: '#25D366',
                                color: '#111b21',
                                width: 34,
                                height: 34,
                                flexShrink: 0,
                                ml: 0.5,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                '&:hover': {
                                    bgcolor: '#1FB857',
                                },
                                '&.Mui-disabled': {
                                    bgcolor: 'rgba(0,0,0,0.05)',
                                    color: 'rgba(0,0,0,0.25)',
                                }
                            }}
                        >
                            {sending ? (
                                <CircularProgress size={16} color="inherit" />
                            ) : (
                                <Iconify icon={"solar:plain-bold" as any} width={16} />
                            )}
                        </IconButton>
                    </Box>

                    <Popover
                        open={Boolean(emojiAnchorEl)}
                        anchorEl={emojiAnchorEl}
                        onClose={handleEmojiClose}
                        anchorOrigin={{
                            vertical: 'top',
                            horizontal: 'left',
                        }}
                        transformOrigin={{
                            vertical: 'bottom',
                            horizontal: 'left',
                        }}
                        PaperProps={{
                            sx: {
                                p: 0,
                                mt: -1,
                                width: 320,
                                height: 350,
                                borderRadius: '12px',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden'
                            }
                        }}
                    >
                        {/* Category tabs */}
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-around',
                                bgcolor: '#f0f2f5',
                                borderBottom: '1px solid rgba(0,0,0,0.06)',
                                p: 0.5,
                                flexShrink: 0
                            }}
                        >
                            {Object.entries(EMOJI_DATA).map(([key, cat]) => (
                                <IconButton
                                    key={key}
                                    onClick={() => setEmojiCategory(key)}
                                    size="small"
                                    sx={{
                                        fontSize: '1.25rem',
                                        p: 0.75,
                                        borderRadius: '8px',
                                        bgcolor: emojiCategory === key ? 'rgba(0,0,0,0.08)' : 'transparent',
                                    }}
                                    title={cat.label}
                                >
                                    {cat.icon}
                                </IconButton>
                            ))}
                        </Box>

                        {/* Emoji list container */}
                        <Box
                            sx={{
                                flexGrow: 1,
                                p: 1.5,
                                overflowY: 'auto',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(7, 1fr)',
                                gap: 0.5,
                                alignContent: 'start'
                            }}
                        >
                            {EMOJI_DATA[emojiCategory as keyof typeof EMOJI_DATA]?.emojis.map((emoji) => (
                                <IconButton
                                    key={emoji}
                                    onClick={() => handleSelectEmoji(emoji)}
                                    sx={{
                                        fontSize: '1.35rem',
                                        p: 0.5,
                                        borderRadius: '6px',
                                        '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' }
                                    }}
                                >
                                    {emoji}
                                </IconButton>
                            ))}
                        </Box>
                    </Popover>
                </Box>
            </DialogContent>
        </Dialog>
    );
}

const EMOJI_DATA = {
    smileys: {
        icon: '😀',
        label: 'Smileys',
        emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🫢', '🫡', '🤫', '🫠', '🤥', '😶', '🫥', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '👽', '👾', '🤖', '🎃']
    },
    people: {
        icon: '👋',
        label: 'People',
        emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦵', '🦶', '👂', '👃', '🧠', '🦷', '👀', '👅', '👄', '💋']
    },
    animals: {
        icon: '🐱',
        label: 'Animals & Nature',
        emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🐙', '🦑', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐄', '🐏', '🐑', '🐐', '🦌', '🐕', '🐈', '🐓', '🦃', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦥', '🐿️', '🐾', '🐉', '🎄', '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃']
    },
    food: {
        icon: '🍏',
        label: 'Food & Drink',
        emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🍳', '🥞', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🌮', '🌯', '🥘', '🍝', '🍜', '🍲', '🍛', '🍣', '🍤', '🍙', '🍚', '🍧', '🍨', '🍦', '🍰', '🎂', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🫖', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤']
    },
    travel: {
        icon: '🚗',
        label: 'Travel & Places',
        emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🛵', '🏍️', '🚲', '🛴', '🛹', '🚨', '🚥', '🚦', '🛑', '🚧', '⚓', '⛵', '🛳️', '🚢', '✈️', '🛸', '🪐', '🌠', '🌌', '⛱️', '🎆', '🎇', '🏔️', '⛰️', '🌋', '🗻']
    },
    activities: {
        icon: '⚽',
        label: 'Activities',
        emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🎱', '🏓', '🎣', '🥋', '🎿', '🏂', '🏋️', '🤺', '🤼', '🤸', '🚴', '🏊', '🏄', '🏆', '🏅', '🎫', '🎨', '🎬', '🎤', '🎧', '🎵', '🎸', '🎻', '🎮', '🧩']
    },
    objects: {
        icon: '💡',
        label: 'Objects',
        emojis: ['⌚', '📱', '📲', '💻', '⌨️', '🖱️', '🖥️', '🖨️', '💡', '🕯️', '🔦', '📖', '📓', '📄', '✉️', '📦', '✏️', '✒️', '🖌️', '📁', '📅', '🗑️', '🔒', '🔓', '🔑', '🔨', '🛠️', '🛡️', '⚙️', '🔬', '🔭', '💉', '💊', '🩹', '🩺', '🚪', '🛋️', '🚽', '🚿', '🛁', '🪒', '🧽', '🛒']
    },
    symbols: {
        icon: '❤️',
        label: 'Symbols',
        emojis: ['💘', '💖', '💗', '💓', '💞', '💕', '💟', '❣️', '💔', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💤', '💢', '💬', '💭', '💮', '♨️', '🛑', '⚠️', '⛔', '🚫', '☣️', '☢️', '🔄', '⭐', '🌟', '⚡', '❄️', '🔥', '💧', '🌊', '🔇', '🔈', '🔊', '📢', '🔔', '🔕', '🎵', '🎶', '🏧', '🚮', '🚰', '♿', '🚹', '🚺', '🚼', '🚾', '🛂']
    }
};