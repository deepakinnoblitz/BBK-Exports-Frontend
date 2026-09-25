import type { Socket } from 'socket.io-client';

import { useState, useEffect, useCallback } from 'react';

import { fetchLeaveApplications } from 'src/api/leaves';

export function useLeaveApplications(
    page: number,
    pageSize: number,
    search: string,
    filters: any = {},
    orderBy: string = 'modified',
    order: 'asc' | 'desc' = 'desc',
    socket?: Socket | null
) {
    const [data, setData] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const refetch = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const result = await fetchLeaveApplications({
                page,
                page_size: pageSize,
                search,
                filters,
                orderBy,
                order
            });
            setData(result.data);
            setTotal(result.total);
        } catch (error) {
            console.error('Failed to fetch leave applications:', error);
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [page, pageSize, search, JSON.stringify(filters), orderBy, order]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    // Real-time socket subscription — instant refresh when a Leave Application status changes
    useEffect(() => {
        if (!socket) return undefined;

        const handleUpdate = () => {
            refetch(true); // Silent refetch — no loading spinner
        };

        socket.on('leave_application_updated', handleUpdate);
        return () => {
            socket.off('leave_application_updated', handleUpdate);
        };
    }, [socket, refetch]);

    return { data, total, loading, refetch };
}
