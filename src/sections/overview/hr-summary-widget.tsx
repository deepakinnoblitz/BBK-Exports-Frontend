import type { CardProps } from '@mui/material/Card';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import CircularProgress from '@mui/material/CircularProgress';

import { fNumber } from 'src/utils/format-number';

// ----------------------------------------------------------------------

type Props = CardProps & {
    title: string;
    total: number;
    icon?: React.ReactNode;
    color?: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | string;
    loading?: boolean;
    compact?: boolean;
    borderStyle?: 'default' | 'borderLeft' | 'notchTab';
    percent?: number;
    subtitle?: string;
};

export function HRSummaryWidget({
    title,
    total,
    icon,
    color = 'primary',
    loading,
    compact,
    borderStyle = 'notchTab',
    subtitle,
    sx,
    ...other
}: Props) {
    const theme = useTheme();

    const resolvedColor =
        (theme.palette as any)[color]?.main ||
        (color.startsWith('#') || color.startsWith('rgb') ? color : theme.palette.primary.main);

    if (borderStyle === 'notchTab') {
        return (
            <Card
                sx={[
                    {
                        pt: 1.75,
                        pb: 2,
                        pl: 2.75,
                        pr: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        position: 'relative',
                        borderRadius: 3,
                        bgcolor: alpha(resolvedColor, 0.035),
                        border: `1px solid ${alpha(resolvedColor, 0.18)}`,
                        boxShadow: `0 4px 20px ${alpha(resolvedColor, 0.08)}`,
                        transition: theme.transitions.create(['box-shadow', 'transform']),
                        overflow: 'hidden',
                        minHeight: 104,
                        '&:hover': {
                            transform: 'translateY(-3px)',
                            boxShadow: `0 12px 32px ${alpha(resolvedColor, 0.16)}`,
                            '& .accent-tab': {
                                width: 10,
                                boxShadow: `inset 2px 1px 3px rgba(255, 255, 255, 0.5), inset -1px -1px 3px rgba(0, 0, 0, 0.2), 0 4px 14px ${alpha(resolvedColor, 0.45)}`,
                            },
                            '& .icon-wrapper': {
                                transform: 'scale(1.08)',
                            },
                        },
                    },
                    ...(Array.isArray(sx) ? sx : [sx]),
                ]}
                {...other}
            >
                {/* Right Accent Tab with 3D Recessed Notch Style (Height increased to 80px) */}
                <Box
                    className="accent-tab"
                    sx={{
                        position: 'absolute',
                        right: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 7,
                        height: 80,
                        borderRadius: '8px 0 0 8px',
                        background: `linear-gradient(180deg, ${resolvedColor} 0%, ${alpha(resolvedColor, 0.85)} 100%)`,
                        boxShadow: `inset 1.5px 1px 3px rgba(255, 255, 255, 0.4), inset -1px -1px 2px rgba(0, 0, 0, 0.2), 0 2px 10px ${alpha(resolvedColor, 0.35)}`,
                        transition: theme.transitions.create(['width', 'box-shadow'], {
                            duration: theme.transitions.duration.shorter,
                        }),
                    }}
                />

                {/* Left Side: Title + Big Bold Value */}
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography
                        variant="body2"
                        sx={{
                            color: 'text.secondary',
                            fontWeight: 600,
                            fontSize: '0.975rem',
                            mb: 1.25,
                            textTransform: 'capitalize',
                        }}
                    >
                        {title}
                    </Typography>

                    {loading ? (
                        <Box sx={{ height: 36, display: 'flex', alignItems: 'center' }}>
                            <CircularProgress size={22} color="inherit" sx={{ opacity: 0.48 }} />
                        </Box>
                    ) : (
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 800,
                                fontSize: '1.85rem',
                                color: '#0f172a',
                                letterSpacing: '-0.02em',
                                lineHeight: 1.1,
                            }}
                        >
                            {fNumber(total)}
                        </Typography>
                    )}

                    {subtitle && (
                        <Typography
                            variant="caption"
                            sx={{
                                color: 'text.disabled',
                                fontSize: '0.725rem',
                                fontWeight: 400,
                                mt: 0.75,
                                display: 'block',
                            }}
                        >
                            {subtitle}
                        </Typography>
                    )}
                </Box>

                {/* Right Side: Icon */}
                {icon && (
                    <Box
                        className="icon-wrapper"
                        sx={{
                            color: resolvedColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            mr: 2,
                            transition: theme.transitions.create(['transform'], {
                                duration: theme.transitions.duration.shorter,
                            }),
                            '& svg': { width: 32, height: 32 },
                        }}
                    >
                        {icon}
                    </Box>
                )}
            </Card>
        );
    }

    const renderIcon = icon ? (
        <Box
            sx={{
                width: compact ? 48 : 64,
                height: compact ? 48 : 64,
                flexShrink: 0,
                display: 'flex',
                borderRadius: '50%',
                alignItems: 'center',
                justifyContent: 'center',
                color: `${color}.main`,
                bgcolor: alpha(resolvedColor, 0.12),
                transition: theme.transitions.create(['transform'], {
                    duration: theme.transitions.duration.shorter,
                }),
                '& svg': {
                    width: compact ? 24 : 28,
                    height: compact ? 24 : 28,
                },
            }}
        >
            {icon}
        </Box>
    ) : null;

    return (
        <Card
            sx={[
                {
                    p: compact ? 2 : 3,
                    px: compact ? 2 : 3,
                    pl: compact ? 3 : 4,
                    display: 'flex',
                    alignItems: 'center',
                    position: 'relative',
                    justifyContent: 'space-between',
                    transition: theme.transitions.create(['box-shadow', 'transform']),
                    boxShadow: (theme as any).customShadows?.z4 || theme.shadows[4],
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: (theme as any).customShadows?.z12 || theme.shadows[12],
                        '& .icon-container': {
                            transform: 'scale(1.1)',
                        },
                    },
                    border: `1px solid ${alpha(resolvedColor, 0.16)}`,
                    ...(borderStyle === 'default' && {
                        background: `linear-gradient(150deg, ${alpha(resolvedColor, 0.06)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
                    }),
                    ...(borderStyle === 'borderLeft' && {
                        bgcolor: alpha(resolvedColor, 0.025),
                        overflow: 'hidden',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 10,
                            bottom: 10,
                            left: 0,
                            width: 2,
                            borderRadius: '0 4px 4px 0',
                            bgcolor: resolvedColor,
                        },
                    }),
                },
                ...(Array.isArray(sx) ? sx : [sx]),
            ]}
            {...other}
        >
            <Box>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 'fontWeightSemiBold', mb: compact ? 0.5 : 1 }}>
                    {title}
                </Typography>
                {loading ? (
                    <Box sx={{ height: compact ? 32 : 48, display: 'flex', alignItems: 'center' }}>
                        <CircularProgress size={compact ? 20 : 24} color="inherit" sx={{ opacity: 0.48 }} />
                    </Box>
                ) : (
                    <Typography variant={compact ? "h4" : "h3"} sx={{ fontWeight: 'fontWeightBold' }}>
                        {fNumber(total)}
                    </Typography>
                )}
            </Box>

            {icon && (
                <Box className="icon-container" sx={{ transition: 'transform 0.2s' }}>
                    {renderIcon}
                </Box>
            )}
        </Card>
    );
}
