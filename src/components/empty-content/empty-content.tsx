import type { BoxProps } from '@mui/material/Box';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { Iconify } from '../iconify';

// ----------------------------------------------------------------------

type EmptyContentProps = BoxProps & {
    title?: React.ReactNode;
    description?: React.ReactNode;
    icon?: string;
    iconColor?: string;
    titleColor?: string;
    descriptionColor?: string;
};

export function EmptyContent({
    title,
    description,
    icon,
    iconColor,
    titleColor,
    descriptionColor,
    sx,
    ...other
}: EmptyContentProps) {
    return (
        <Box
            sx={{
                py: 5,
                px: 3,
                display: 'flex',
                textAlign: 'center',
                alignItems: 'center',
                flexDirection: 'column',
                justifyContent: 'center',
                ...sx,
            }}
            {...other}
        >
            <Iconify
                icon={(icon || 'solar:box-minimalistic-bold-duotone') as any}
                width={100}
                sx={{
                    mb: 2,
                    color: iconColor || 'text.disabled',
                    opacity: iconColor ? 0.9 : 0.12,
                }}
            />

            {title && (
                typeof title === 'string' ? (
                    <Typography variant="h6" sx={{ color: titleColor || 'text.disabled', fontWeight: 600 }}>
                        {title}
                    </Typography>
                ) : (
                    <Box sx={{ color: titleColor || 'text.primary', typography: 'h6', fontWeight: 600 }}>
                        {title}
                    </Box>
                )
            )}

            {description && (
                typeof description === 'string' ? (
                    <Typography variant="body2" sx={{ color: descriptionColor || 'text.disabled', mt: 1, maxWidth: 540 }}>
                        {description}
                    </Typography>
                ) : (
                    <Box sx={{ color: descriptionColor || 'text.secondary', typography: 'body2', mt: 1, maxWidth: 540 }}>
                        {description}
                    </Box>
                )
            )}
        </Box>
    );
}
