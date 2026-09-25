import type { Socket } from 'socket.io-client';
import type { UnreadCounts } from 'src/api/unread-counts';

import { useState, useEffect, useCallback } from 'react';

import { fetchUnreadCounts } from 'src/api/unread-counts';

type Props = {
    socket?: Socket | null;
};

export function useUnreadCounts({ socket }: Props = {}) {
    const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({
        counts: {
            'Leave Application': 0,
            Request: 0,
            'WFH Attendance': 0,
        },
        unread_ids: {
            'Leave Application': [],
            Request: [],
            'WFH Attendance': [],
        },
    });

    const getUnreadCounts = useCallback(async () => {
        const data = await fetchUnreadCounts();
        setUnreadCounts(data);
    }, []);

    // Initial fetch + 30s polling fallback
    useEffect(() => {
        getUnreadCounts();

        const interval = setInterval(getUnreadCounts, 30000);

        const handleRefresh = () => {
            getUnreadCounts();
        };

        window.addEventListener('REFRESH_UNREAD_COUNTS', handleRefresh);

        return () => {
            clearInterval(interval);
            window.removeEventListener('REFRESH_UNREAD_COUNTS', handleRefresh);
        };
    }, [getUnreadCounts]);

    // Real-time socket subscription — instant updates from server
    useEffect(() => {
        if (!socket) return undefined;

        const handleSocketUpdate = (data: UnreadCounts) => {
            setUnreadCounts(data);
        };

        socket.on('unread_count_updated', handleSocketUpdate);

        return () => {
            socket.off('unread_count_updated', handleSocketUpdate);
        };
    }, [socket]);

    return { unreadCounts, refreshUnreadCounts: getUnreadCounts };
}
