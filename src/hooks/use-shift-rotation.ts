import type { ShiftRotation } from 'src/api/shift-rotation';

import { useState, useEffect, useCallback } from 'react';

import { fetchShiftRotationList, getShiftRotationDoc, ShiftRotation } from 'src/api/shift-rotation';

export function useShiftRotations(
  page: number = 1,
  limit: number = 10,
  search: string = '',
  orderBy: string = 'creation',
  order: 'asc' | 'desc' = 'desc',
  customFilters: any[] = []
) {
  const [data, setData] = useState<ShiftRotation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const fields = [
        'name',
        'rotation_name',
        'frequency',
        'status',
        'department',
        'start_date',
        'end_date',
        'exclude_holidays',
        'exclude_weekly_offs',
        'description',
        'creation',
        'modified',
      ];

      const filters: any[] = [...customFilters];

      const response = await fetchShiftRotationList({
        page,
        page_size: limit,
        limit,
        search,
        orderBy,
        order,
        fields,
        filters,
      });

      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Shift Rotations');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, orderBy, order, JSON.stringify(customFilters)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, total, loading, error, refetch: fetchData };
}
