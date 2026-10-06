import type { CanteenEntry, MonthlyCanteenResponse } from 'src/api/canteen';

import { useState, useEffect, useCallback } from 'react';

import { fetchCanteenList, fetchMonthlyCanteen, fetchCalendarCanteen } from 'src/api/canteen';

export function useCanteen(
  page: number = 1,
  limit: number = 10,
  search: string = '',
  orderBy: string = 'canteen_date',
  order: 'asc' | 'desc' = 'desc',
  customFilters: any[] = []
) {
  const [data, setData] = useState<CanteenEntry[]>([]);
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
        'canteen_date',
        'meal_type',
        'meal_count',
        'status',
        'source',
        'remarks',
        'owner',
        'creation',
        'modified',
      ];

      const filters: any[] = [...customFilters];

      const response = await fetchCanteenList({
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
      setError(err.message || 'Failed to fetch Canteen entries');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, orderBy, order, JSON.stringify(customFilters)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, total, loading, error, refetch: fetchData };
}

export function useMonthlyCanteen(
  month: number,
  year: number,
  department?: string,
  employee?: string | string[],
  mealType?: string,
  pageSize: number = 50,
  orderBy: string = 'modified_desc'
) {
  const [data, setData] = useState<MonthlyCanteenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchMonthlyCanteen({
        month,
        year,
        department,
        employee,
        meal_type: mealType,
        start: 0,
        limit: pageSize,
        order_by: orderBy,
      });
      setData(res);
      setHasMore(!!res?.has_more);
      setTotalCount(res?.total_count || res?.employees?.length || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Monthly Canteen data');
    } finally {
      setLoading(false);
    }
  }, [month, year, department, JSON.stringify(employee), mealType, pageSize, orderBy]);

  const loadMore = useCallback(async () => {
    if (!data || loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const currentCount = data.employees.length;
      const res = await fetchMonthlyCanteen({
        month,
        year,
        department,
        employee,
        meal_type: mealType,
        start: currentCount,
        limit: pageSize,
        order_by: orderBy,
      });

      setData((prev) => {
        if (!prev) return res;
        return {
          ...res,
          employees: [...prev.employees, ...(res.employees || [])],
        };
      });
      setHasMore(!!res?.has_more);
    } catch (err: any) {
      console.error('Failed to load more employees for Canteen roster', err);
    } finally {
      setLoadingMore(false);
    }
  }, [data, loadingMore, hasMore, month, year, department, JSON.stringify(employee), mealType, pageSize, orderBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, loadingMore, hasMore, totalCount, error, refetch: fetchData, loadMore };
}

export function useCalendarCanteen(
  startDate: string,
  endDate: string,
  department?: string,
  employee?: string | string[],
  mealType?: string
) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchCalendarCanteen({
        start_date: startDate,
        end_date: endDate,
        employee,
        department,
        meal_type: mealType,
      });
      setEvents(res || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Canteen calendar events');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, department, JSON.stringify(employee), mealType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { events, loading, error, refetch: fetchData };
}
