import type { CardProps } from '@mui/material/Card';

import { LuCalendarCheck2 } from "react-icons/lu";
import { useRef, useState, useEffect } from 'react';
import { BsBell, BsBellFill } from "react-icons/bs";

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme, keyframes } from '@mui/material/styles';

import { fDate } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const marqueeAnimation = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

type AnnouncementItem = {
    title: string;
    message: string;
    posting_date: string;
};

type Props = CardProps & {
    title?: string;
    subheader?: string;
    list: AnnouncementItem[];
};

export function HRAnnouncements({ title, subheader, list, ...other }: Props) {
    const theme = useTheme();
    const [open, setOpen] = useState(false);
    const [pinned, setPinned] = useState(false);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const contentRef = useRef<HTMLDivElement | null>(null);
    const [duration, setDuration] = useState(28);

    useEffect(() => {
        if (contentRef.current) {
            const width = contentRef.current.offsetWidth;
            const pixelsPerSecond = 120; // Faster speed: 110 pixels per second
            if (width > 0) {
                setDuration(Math.max(10, width / pixelsPerSecond));
            }
        }
    }, [list]);

    if (list.length === 0) return null;

    const featuredItem = list[0];

    const scheduleClose = () => {
        if (pinned) return;
        closeTimer.current = setTimeout(() => setOpen(false), 150);
    };
    const cancelClose = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
    };
    const handleToggle = () => {
        cancelClose();
        setPinned((prev) => {
            const next = !prev;
            setOpen(next);
            return next;
        });
    };

    // useEffect(() => () => {
    //     if (closeTimer.current) clearTimeout(closeTimer.current);
    // }, []);

    return (
        <Box
            onMouseEnter={() => {
                cancelClose();
                setOpen(true);
            }}
            onMouseLeave={scheduleClose}
            sx={{ position: 'relative' }}
        >
            <Card
                {...other}
                sx={{
                    px: { xs: 1.5, sm: 2 },
                    py: { xs: 1.25, sm: 1.5 },
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'stretch', sm: 'center' },
                    gap: { xs: 1, sm: 2 },
                    overflow: 'hidden',
                    background: `
                        linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.2)} 0%, ${alpha('#8b5cf6', 0.12)} 48%, ${alpha('#14b8a6', 0.14)} 100%),
                        ${alpha(theme.palette.common.white, 0.72)}
                    `,
                    backdropFilter: 'blur(18px)',
                    WebkitBackdropFilter: 'blur(18px)',
                    border: `1px solid ${alpha(theme.palette.common.white, 0.7)}`,
                    color: '#1f2937',
                    borderRadius: 4,
                    boxShadow: 'none',
                    position: 'relative',
                    minHeight: { xs: 76, sm: 80 },
                    cursor: 'pointer',
                    transition: theme.transitions.create(['transform', 'box-shadow', 'border-color', 'background'], {
                        duration: theme.transitions.duration.shorter,
                    }),
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 1,
                        borderRadius: 'inherit',
                        background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.38)} 0%, ${alpha(theme.palette.common.white, 0.08)} 100%)`,
                        pointerEvents: 'none',
                    },
                    '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: 'none',
                        borderColor: alpha(theme.palette.primary.main, 0.24),
                        background: `
                            linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.22)} 0%, ${alpha('#8b5cf6', 0.14)} 48%, ${alpha('#14b8a6', 0.16)} 100%),
                            ${alpha(theme.palette.common.white, 0.76)}
                        `,
                    },
                    ...other.sx,
                }}
                onClick={handleToggle}
            >
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1.25}
                    sx={{
                        zIndex: 1,
                        flexShrink: 0,
                        minWidth: { sm: 210 },
                        width: { xs: '100%', sm: 'auto' },
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1.25}>
                        <Box
                            sx={{
                                width: { xs: 36, sm: 46 },
                                height: { xs: 36, sm: 46 },
                                borderRadius: '50%',
                                display: 'grid',
                                placeItems: 'center',
                                color: 'primary.main',
                                background: `linear-gradient(135deg, ${alpha('#f4faff', 1)} 0%, ${alpha('#dce1e6', 0.6)} 100%)`,
                                border: `1.5px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                                boxShadow: `
                                    0 4px 10px ${alpha(theme.palette.primary.main, 0.08)},
                                    inset 0 0 0 1px ${alpha(theme.palette.common.white, 1)}
                                `,
                                position: 'relative',
                                flexShrink: 0,
                            }}
                        >
                            <BsBell size={18} />

                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: -6,
                                    right: -4,
                                    minWidth: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    bgcolor: 'primary.main',
                                    color: 'primary.contrastText',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 10,
                                    fontWeight: 800,
                                    border: `2px solid ${theme.palette.background.paper}`,
                                    boxShadow: `0 2px 4px ${alpha(theme.palette.common.black, 0.16)}`,
                                }}
                            >
                                {list.length}
                            </Box>
                        </Box>

                        <Box sx={{ minWidth: 0, pl: 0.5 }}>
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    fontWeight: 800,
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    color: '#0f172a',
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                }}
                            >
                                {title || 'Announcements'}
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: alpha('#1f2937', 0.62),
                                    display: { xs: 'none', sm: 'block' },
                                    mt: 0.25,
                                }}
                            >
                                {subheader || 'Latest team and policy updates'}
                            </Typography>
                        </Box>
                    </Stack>

                    <IconButton
                        size="small"
                        onClick={(event) => {
                            event.stopPropagation();
                            handleToggle();
                        }}
                        sx={{
                            display: { xs: 'inline-flex', sm: 'none' },
                            width: 32,
                            height: 32,
                            borderRadius: 2.5,
                            color: '#1f2937',
                            bgcolor: alpha(theme.palette.common.white, 0.34),
                            border: `1px solid ${alpha(theme.palette.common.white, 0.78)}`,
                            backdropFilter: 'blur(12px)',
                        }}
                    >
                        <Iconify
                            icon="solar:alt-arrow-down-bold"
                            width={16}
                            sx={{
                                transition: theme.transitions.create('transform', {
                                    duration: theme.transitions.duration.shorter,
                                }),
                                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                            }}
                        />
                    </IconButton>
                </Stack>

                <Box
                    sx={{
                        flex: '1 1 auto',
                        minWidth: 0,
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                    }}
                >
                    <Box sx={{ minWidth: 0, width: '100%' }}>
                        <Typography
                            variant="body2"
                            sx={{
                                color: alpha('#1f2937', 0.72),
                                mb: 0.35,
                                display: { xs: 'none', md: 'block' },
                            }}
                        >
                            Featured update
                        </Typography>
                        <Box
                            sx={{
                                position: 'relative',
                                overflow: 'hidden',
                                pr: { xs: 0, sm: 1 },
                                maskImage: {
                                    xs: 'linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)',
                                    sm: 'linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)',
                                },
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    width: 'max-content',
                                    minWidth: '200%',
                                    animation: `${marqueeAnimation} ${duration}s linear infinite`,
                                    '&:hover': {
                                        animationPlayState: 'paused',
                                    },
                                }}
                            >
                                {[0, 1].map((copy) => (
                                    <Stack key={copy} ref={copy === 0 ? contentRef : null} direction="row" alignItems="center">
                                        {list.map((item, index) => (
                                            <Typography
                                                key={index}
                                                variant="body1"
                                                sx={{
                                                    color: '#1f2937',
                                                    fontWeight: 600,
                                                    fontSize: { xs: '0.8rem', sm: '1rem' },
                                                    lineHeight: 1.45,
                                                    whiteSpace: 'nowrap',
                                                    pr: 8,
                                                }}
                                            >
                                                <Box component="span" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                                    {item.title}:
                                                </Box>{' '}
                                                {item.message}
                                            </Typography>
                                        ))}
                                    </Stack>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                </Box>

                <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ zIndex: 1, flexShrink: 0, ml: 'auto', display: { xs: 'none', sm: 'flex' } }}
                >
                    <IconButton
                        size="small"
                        onClick={(event) => {
                            event.stopPropagation();
                            handleToggle();
                        }}
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 2.5,
                            color: '#1f2937',
                            bgcolor: alpha(theme.palette.common.white, 0.34),
                            border: `1px solid ${alpha(theme.palette.common.white, 0.78)}`,
                            backdropFilter: 'blur(12px)',
                            transition: theme.transitions.create(['transform', 'background-color'], {
                                duration: theme.transitions.duration.shorter,
                            }),
                            '&:hover': {
                                bgcolor: alpha(theme.palette.common.white, 0.5),
                            },
                        }}
                    >
                        <Iconify
                            icon="solar:alt-arrow-down-bold"
                            width={18}
                            sx={{
                                transition: theme.transitions.create('transform', {
                                    duration: theme.transitions.duration.shorter,
                                }),
                                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                            }}
                        />
                    </IconButton>
                </Stack>
            </Card>

            {open && (
                <Paper
                    elevation={8}
                    sx={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        zIndex: 1300,
                        width: { xs: '100%', sm: 420 },
                        maxWidth: '100%',
                        maxHeight: 440,
                        overflow: 'hidden',
                        borderRadius: 3,
                        mt: 1,
                        background: alpha(theme.palette.background.paper, 0.9),
                        backdropFilter: 'blur(18px)',
                        WebkitBackdropFilter: 'blur(18px)',
                        border: `1px solid ${alpha(theme.palette.common.white, 0.75)}`,
                        boxShadow: 'none',
                    }}
                >
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{
                            px: 2,
                            py: 1.5,
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.16)} 0%, ${alpha('#8b5cf6', 0.1)} 100%)`,
                            color: '#1f2937',
                        }}
                    >
                        <Box
                            sx={{
                                width: 34,
                                height: 34,
                                borderRadius: 2,
                                display: 'grid',
                                placeItems: 'center',
                                color: 'primary.main',
                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                            }}
                        >
                            <BsBellFill size={16} />
                        </Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, flexGrow: 1 }}>
                            Announcements
                        </Typography>
                        <Chip
                            label={`${list.length} total`}
                            size="small"
                            sx={{
                                fontWeight: 700,
                                bgcolor: alpha(theme.palette.primary.main, 0.12),
                                color: 'primary.main',
                            }}
                        />
                    </Stack>

                    <Box sx={{ overflowY: 'auto', maxHeight: 360 }}>
                        {list.map((item, index) => (
                            <Box key={index}>
                                <Stack
                                    direction="row"
                                    spacing={1.5}
                                    sx={{
                                        px: 2,
                                        py: 1.5,
                                        transition: theme.transitions.create('background-color', {
                                            duration: theme.transitions.duration.shortest,
                                        }),
                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            mt: 0.5,
                                            width: 36,
                                            height: 36,
                                            flexShrink: 0,
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            color: 'primary.main',
                                        }}
                                    >
                                        <BsBellFill size={14} />
                                    </Box>

                                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.3, color: 'text.primary' }} noWrap>
                                            {item.title}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4, mb: 0.5 }}>
                                            {item.message}
                                        </Typography>
                                        <Stack direction="row" alignItems="center" spacing={0.5}>
                                            <LuCalendarCheck2 size={11} style={{ color: theme.palette.text.disabled }} />
                                            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                                {fDate(item.posting_date)}
                                            </Typography>
                                        </Stack>
                                    </Box>
                                </Stack>

                                {index < list.length - 1 && <Divider sx={{ mx: 2 }} />}
                            </Box>
                        ))}
                    </Box>
                </Paper>
            )}
        </Box>
    );
}
