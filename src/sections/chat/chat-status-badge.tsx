import Badge from '@mui/material/Badge';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    status?: string;
    children: React.ReactNode;
    size?: number;
};

export default function ChatStatusBadge({ status, children, size = 14 }: Props) {
    const getStatusConfig = () => {
        switch (status) {
            case 'Available':
                return { color: '#22c55e', icon: 'ph:check-bold' };
            case 'Busy':
                return { color: '#ef4444', icon: '' };
            case 'Do Not Disturb':
                return { color: '#b91c1c', icon: 'ph:minus-bold' };
            case 'Break':
            case 'Away':
                return { color: '#f59e0b', icon: 'ph:clock-bold' };
            case 'Offline':
            default:
                return { color: '#9ca3af', icon: 'ph:x-bold' };
        }
    };

    const config = getStatusConfig();
    const iconSize = Math.floor(size * 0.57); // Scale icon with badge size

    return (
        <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
                config.icon ? <Iconify icon={config.icon as any} width={iconSize} height={iconSize} /> : null
            }
            sx={{
                '& .MuiBadge-badge': {
                    padding: 0,
                    width: size,
                    height: size,
                    minWidth: size,
                    borderRadius: '50%',
                    bgcolor: config.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'common.white',
                    border: (theme) => `2px solid ${theme.palette.background.paper}`,
                    boxShadow: '0 0 2px rgba(0,0,0,0.1)',
                }
            }}
        >
            {children}
        </Badge>
    );
}
