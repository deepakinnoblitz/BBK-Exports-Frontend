import type { EmployeeAwardSettings } from 'src/api/employee-monthly-award';

import { useState, useEffect, useCallback } from 'react';

import { fetchEmployeeMonthlyAwards, fetchEmployeeAwardSettings } from 'src/api/employee-monthly-award';

export function useEmployeeMonthlyAwards(
    page: number = 1,
    pageSize: number = 10,
    search: string = '',
    sortBy: string = 'modified_desc',
    filters: any = {}
) {
    const [data, setData] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page,
                page_size: pageSize,
                search,
                sort_by: sortBy,
                month: filters.month || undefined,
                employee: filters.employee || undefined,
                rank: filters.rank || undefined,
                type: filters.type || undefined,
                status: filters.status || undefined,
            };
            const result = await fetchEmployeeMonthlyAwards(params);
            setData(result.data);
            setTotal(result.total);
        } catch (error) {
            console.error('Failed to fetch employee monthly awards:', error);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, sortBy, filters.month, filters.employee, filters.rank, filters.type, filters.status]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, total, loading, refetch: fetchData };
}

export function useEmployeeAwardSettings() {
    const [settings, setSettings] = useState<EmployeeAwardSettings | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchEmployeeAwardSettings();
            setSettings(result);
        } catch (error) {
            console.error('Failed to fetch employee award settings:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return { settings, loading, refetch: fetchSettings };
}
