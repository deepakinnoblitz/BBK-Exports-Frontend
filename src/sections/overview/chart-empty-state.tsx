import type { IconifyName } from 'src/components/iconify';
import type { Theme, SxProps } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    icon: IconifyName;
    title: string;
    description?: string;
    height?: number;
    color?: string;
    sx?: SxProps<Theme>;
};

/**
 * Shared empty-state placeholder for HR dashboard overview charts.
 */
export function ChartEmptyState({
    icon,
    title,
    description,
    height = 280,
    color,
    sx,
}: Props) {
    const theme = useTheme();
    const accentColor = color || theme.palette.primary.main;

    return (
        <Box
            sx={[
                {
                    height,
                    px: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                },
                ...(sx ? (Array.isArray(sx) ? sx : [sx]) : []),
            ]}
        >
            <Box
                sx={{
                    mb: 2,
                    width: 68,
                    height: 68,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(accentColor, 0.1),
                    border: `1px solid ${alpha(accentColor, 0.16)}`,
                    boxShadow: `0 0 0 8px ${alpha(accentColor, 0.04)}`,
                    color: accentColor,
                }}
            >
                <Iconify icon={icon} width={34} />
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {title}
            </Typography>

            {description && (
                <Typography
                    variant="caption"
                    sx={{ mt: 0.5, maxWidth: 280, color: 'text.secondary', lineHeight: 1.5 }}
                >
                    {description}
                </Typography>
            )}
        </Box>
    );
}
