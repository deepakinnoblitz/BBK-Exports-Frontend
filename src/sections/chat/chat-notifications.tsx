import { useState, useEffect, useCallback } from 'react';

import Badge from '@mui/material/Badge';
import { useTheme } from '@mui/material/styles';

import { useSocket } from 'src/hooks/use-socket';

import { chatApi } from 'src/api/chat';

import { useAuth } from 'src/auth/auth-context';

// ----------------------------------------------------------------------

/**
 * Hook to retrieve and subscribe to real-time chat unread message count.
 */
export function useChatUnreadCount() {
    const { user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    const { socket, subscribeToRoom } = useSocket(user?.email);

    const fetchUnreadCount = useCallback(async () => {
        if (!user?.email) return;

        try {
            const data = await chatApi.getChannelsList(user.email);
            const channelList = data?.message?.results || [];

            const total = channelList.reduce(
                (sum: number, channel: any) => sum + (channel.user_unread_messages || 0),
                0
            );
            setUnreadCount(total);

            // Subscribe to all rooms for real-time updates
            channelList.forEach((channel: any) => {
                subscribeToRoom(channel.room);
            });
        } catch (error) {
            console.error('Failed to fetch unread count', error);
        }
    }, [user?.email, subscribeToRoom]);

    useEffect(() => {
        fetchUnreadCount();
    }, [fetchUnreadCount]);

    useEffect(() => {
        if (socket) {
            const handleNewMessage = (data: any) => {
                // If message is from someone else, increment count locally
                if (data.sender_email !== user?.email) {
                    setUnreadCount((prev) => prev + 1);
                }
            };

            const handleUpdateSync = () => {
                // Re-fetch to ensure sync with backend
                fetchUnreadCount();
            };

            socket.on('msg', handleNewMessage);
            socket.on('update_room', handleUpdateSync);
            socket.on('mark_read_update', handleUpdateSync);

            window.addEventListener('REFRESH_CHAT_UNREAD_COUNT', handleUpdateSync);

            return () => {
                socket.off('msg', handleNewMessage);
                socket.off('update_room', handleUpdateSync);
                socket.off('mark_read_update', handleUpdateSync);
                window.removeEventListener('REFRESH_CHAT_UNREAD_COUNT', handleUpdateSync);
            };
        }
        return undefined;
    }, [socket, user?.email, fetchUnreadCount]);

    return unreadCount;
}

// ----------------------------------------------------------------------

type Props = {
    children: React.ReactNode;
};

export default function ChatNotifications({ children }: Props) {
    const theme = useTheme();
    const unreadCount = useChatUnreadCount();

    return (
        <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            sx={{
                '& .MuiBadge-badge': {
                    right: { xs: 18, sm: 35 },
                    top: { xs: 8, sm: 15 },
                    border: `2px solid ${theme.palette.background.paper}`,
                    padding: '0 4px',
                },
            }}
        >
            {children}
        </Badge>
    );
}
