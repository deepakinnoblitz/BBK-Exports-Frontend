import type { ShiftRoster, MonthlyRosterResponse } from 'src/api/shift-roster';

import { useState, useEffect, useCallback } from 'react';

import { fetchShiftRosterList, fetchMonthlyRoster, fetchCalendarRoster, ShiftRoster, MonthlyRosterResponse } from 'src/api/shift-roster';

export function useShiftRoster(
  page: number = 1,
  limit: number = 10,
  search: string = '',
  orderBy: string = 'effective_from',
  order: 'asc' | 'desc' = 'desc',
  customFilters: any[] = []
) {
  const [data, setData] = useState<ShiftRoster[]>([]);
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
        'shift',
        'shift_name',
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

      const response = await fetchShiftRosterList({
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
      setError(err.message || 'Failed to fetch Shift Roster');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, orderBy, order, JSON.stringify(customFilters)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, total, loading, error, refetch: fetchData };
}

export function useMonthlyRoster(month: number, year: number, department?: string, employee?: string | string[]) {
  const [data, setData] = useState<MonthlyRosterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchMonthlyRoster({ month, year, department, employee });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Monthly Roster');
    } finally {
      setLoading(false);
    }
  }, [month, year, department, JSON.stringify(employee)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useCalendarRoster(startDate: string, endDate: string, employee?: string | string[], department?: string) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchCalendarRoster({
        start_date: startDate,
        end_date: endDate,
        employee,
        department,
      });
      setEvents(res || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Calendar Roster');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, JSON.stringify(employee), department]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { events, loading, error, refetch: fetchData };
}
