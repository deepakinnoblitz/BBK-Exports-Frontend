import type { LineRoster, MonthlyLineRosterResponse } from 'src/api/line-roster';

import { useState, useEffect, useCallback } from 'react';

import { fetchLineRosterList, fetchMonthlyLineRoster, fetchCalendarLineRoster } from 'src/api/line-roster';

export function useLineRoster(
  page: number = 1,
  limit: number = 10,
  search: string = '',
  orderBy: string = 'effective_from',
  order: 'asc' | 'desc' = 'desc',
  customFilters: any[] = []
) {
  const [data, setData] = useState<LineRoster[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const fields = [
        'name',
        'employee',
        'employee_name',
        'department',
        'designation',
        'line_order',
        'line_name',
        'effective_from',
        'effective_to',
        'assignment_type',
        'status',
        'reason',
        'owner',
        'creation',
        'modified',
      ];

      const filters: any[] = [...customFilters];

      const response = await fetchLineRosterList({
        page,
        limit,
        search,
        order_by: `${orderBy} ${order}`,
        fields,
        filters,
      });

      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Line Roster');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, orderBy, order, JSON.stringify(customFilters)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, total, loading, error, refetch: fetchData };
}

export function useMonthlyLineRoster(
  month: number,
  year: number,
  department?: string,
  employee?: string | string[],
  pageSize: number = 50
) {
  const [data, setData] = useState<MonthlyLineRosterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchMonthlyLineRoster({
        month,
        year,
        department,
        employee,
        start: 0,
        limit: pageSize,
      });
      setData(res);
      setHasMore(!!res?.has_more);
      setTotalCount(res?.total_count || res?.employees?.length || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Monthly Line Roster');
    } finally {
      setLoading(false);
    }
  }, [month, year, department, JSON.stringify(employee), pageSize]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || !data) return;
    try {
      setLoadingMore(true);
      const currentCount = data.employees.length;
      const res = await fetchMonthlyLineRoster({
        month,
        year,
        department,
        employee,
        start: currentCount,
        limit: pageSize,
      });
      if (res?.employees?.length) {
        setData((prev) => {
          if (!prev) return res;
          const existingIds = new Set(prev.employees.map((e) => e.employee));
          const newEmps = res.employees.filter((e) => !existingIds.has(e.employee));
          return {
            ...res,
            employees: [...prev.employees, ...newEmps],
          };
        });
      }
      setHasMore(!!res?.has_more);
      setTotalCount(res?.total_count || totalCount);
    } catch (err: any) {
      console.error('Failed to load more line roster employees', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMore, data, month, year, department, JSON.stringify(employee), pageSize, totalCount]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    error,
    refetch: fetchData,
    loadMore,
  };
}

export function useCalendarLineRoster(startDate: string, endDate: string, employee?: string | string[], department?: string) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchCalendarLineRoster({
        start_date: startDate,
        end_date: endDate,
        employee,
        department,
      });
      setEvents(res || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Calendar Line Roster');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, JSON.stringify(employee), department]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { events, loading, error, refetch: fetchData };
}
