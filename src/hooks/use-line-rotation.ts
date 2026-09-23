import { useState, useEffect, useCallback } from 'react';

import { fetchLineRotationList, getLineRotationDoc, LineRotation } from 'src/api/line-rotation';

export function useLineRotations(
  page: number = 1,
  limit: number = 10,
  search: string = '',
  orderBy: string = 'creation',
  order: 'asc' | 'desc' = 'desc',
  customFilters: any[] = []
) {
  const [data, setData] = useState<LineRotation[]>([]);
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

      const response = await fetchLineRotationList({
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
      setError(err.message || 'Failed to fetch Line Rotations');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, orderBy, order, JSON.stringify(customFilters)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, total, loading, error, refetch: fetchData };
}
