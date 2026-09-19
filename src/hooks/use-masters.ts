import { useState, useEffect, useCallback } from 'react';

import { fetchItems, fetchProjects, fetchServices, fetchLeadFroms, fetchClaimTypes, fetchLeaveTypes, fetchDepartments, fetchBankAccounts, fetchDesignations, fetchPaymentTerms, fetchCallStatuses, fetchActivityTypes, fetchTaxTypesCustom, fetchMeetingStatuses, fetchAssetCategories, fetchPaymentTypesCustom, fetchCompanyBankAccounts, fetchEvaluationTraitCategories, fetchSalaryStructureComponents, fetchCrmEmailTemplateCategories, fetchCrmWhatsAppTemplateCategories, fetchBloodGroups, fetchHRDocumentCategoriesMaster, fetchQualifications, fetchLineOrders, fetchShifts, fetchBusTravelRoutes, fetchEmployeeTypes } from 'src/api/masters';

export function useDepartments(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'creation',
  order: 'asc' | 'desc' = 'desc',
  status: string = 'all'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: any[] = [];
      if (status !== 'all') {
        filters.push(['Department', 'status', '=', status]);
      }

      const result = await fetchDepartments({
        page,
        page_size: pageSize,
        search,
        orderBy,
        order,
        filters
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch departments:', err);
      setError(err.message || 'Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order, status]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useProjects(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'creation',
  order: 'asc' | 'desc' = 'desc',
  status: string = 'all'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: any[] = [];
      if (status !== 'all') {
        filters.push(['Project', 'status', '=', status]);
      }

      const result = await fetchProjects({
        page,
        page_size: pageSize,
        search,
        orderBy,
        order,
        filters
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch projects:', err);
      setError(err.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order, status]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useActivityTypes(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'creation',
  order: 'asc' | 'desc' = 'desc'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchActivityTypes({
        page,
        page_size: pageSize,
        search,
        orderBy,
        order
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch activity types:', err);
      setError(err.message || 'Failed to fetch activity types');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useBankAccounts(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'creation',
  order: 'asc' | 'desc' = 'desc'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchBankAccounts({
        page,
        page_size: pageSize,
        search,
        orderBy,
        order
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch bank accounts:', err);
      setError(err.message || 'Failed to fetch bank accounts');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useClaimTypes(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'creation',
  order: 'asc' | 'desc' = 'desc'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchClaimTypes({
        page,
        page_size: pageSize,
        search,
        orderBy,
        order
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch claim types:', err);
      setError(err.message || 'Failed to fetch claim types');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useAssetCategories(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'creation',
  order: 'asc' | 'desc' = 'desc'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAssetCategories({
        page,
        page_size: pageSize,
        search,
        orderBy,
        order
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch asset categories:', err);
      setError(err.message || 'Failed to fetch asset categories');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useEvaluationTraitCategories(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'creation',
  order: 'asc' | 'desc' = 'desc'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchEvaluationTraitCategories({
        page,
        page_size: pageSize,
        search,
        orderBy,
        order
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch evaluation trait categories:', err);
      setError(err.message || 'Failed to fetch evaluation trait categories');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useDesignations(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'creation',
  order: 'asc' | 'desc' = 'desc'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDesignations({
        page,
        page_size: pageSize,
        search,
        orderBy,
        order
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch designations:', err);
      setError(err.message || 'Failed to fetch designations');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useSalaryStructureComponents(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'creation',
  order: 'asc' | 'desc' = 'desc'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSalaryStructureComponents({
        page,
        page_size: pageSize,
        search,
        orderBy,
        order
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch salary structure components:', err);
      setError(err.message || 'Failed to fetch salary structure components');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useLeaveTypes(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'creation',
  order: 'asc' | 'desc' = 'desc',
  status: string = 'all'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: any[] = [];
      if (status !== 'all') {
        filters.push(['Leave Type', 'status', '=', status]);
      }

      const result = await fetchLeaveTypes({
        page,
        page_size: pageSize,
        search,
        orderBy,
        order,
        filters
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch leave types:', err);
      setError(err.message || 'Failed to fetch leave types');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order, status]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useLeadFroms(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'modified',
  order: 'asc' | 'desc' = 'desc'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (overrides?: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLeadFroms({
        page: overrides?.page ?? page,
        page_size: overrides?.pageSize ?? pageSize,
        search: overrides?.search ?? search,
        orderBy: overrides?.orderBy ?? orderBy,
        order: overrides?.order ?? order
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch lead sources:', err);
      setError(err.message || 'Failed to fetch lead sources');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useCompanyBankAccounts(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'modified',
  order: 'asc' | 'desc' = 'desc'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (overrides?: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCompanyBankAccounts({
        page: overrides?.page ?? page,
        page_size: overrides?.pageSize ?? pageSize,
        search: overrides?.search ?? search,
        orderBy: overrides?.orderBy ?? orderBy,
        order: overrides?.order ?? order
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch company bank accounts:', err);
      setError(err.message || 'Failed to fetch company bank accounts');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useServices(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'modified',
  order: 'asc' | 'desc' = 'desc'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (overrides?: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchServices({
        page: overrides?.page ?? page,
        page_size: overrides?.pageSize ?? pageSize,
        search: overrides?.search ?? search,
        orderBy: overrides?.orderBy ?? orderBy,
        order: overrides?.order ?? order
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch services:', err);
      setError(err.message || 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useItems(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'modified',
  order: 'asc' | 'desc' = 'desc'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (overrides?: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchItems({
        page: overrides?.page ?? page,
        page_size: overrides?.pageSize ?? pageSize,
        search: overrides?.search ?? search,
        orderBy: overrides?.orderBy ?? orderBy,
        order: overrides?.order ?? order
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch items:', err);
      setError(err.message || 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function usePaymentTerms(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'modified',
  order: 'asc' | 'desc' = 'desc'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (overrides?: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPaymentTerms({
        page: overrides?.page ?? page,
        page_size: overrides?.pageSize ?? pageSize,
        search: overrides?.search ?? search,
        orderBy: overrides?.orderBy ?? orderBy,
        order: overrides?.order ?? order
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch payment terms:', err);
      setError(err.message || 'Failed to fetch payment terms');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function usePaymentTypes(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'modified',
  order: 'asc' | 'desc' = 'desc'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (overrides?: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPaymentTypesCustom({
        page: overrides?.page ?? page,
        page_size: overrides?.pageSize ?? pageSize,
        search: overrides?.search ?? search,
        orderBy: overrides?.orderBy ?? orderBy,
        order: overrides?.order ?? order
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch payment types:', err);
      setError(err.message || 'Failed to fetch payment types');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useTaxTypes(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'modified',
  order: 'asc' | 'desc' = 'desc'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (overrides?: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTaxTypesCustom({
        page: overrides?.page ?? page,
        page_size: overrides?.pageSize ?? pageSize,
        search: overrides?.search ?? search,
        orderBy: overrides?.orderBy ?? orderBy,
        order: overrides?.order ?? order
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch tax types:', err);
      setError(err.message || 'Failed to fetch tax types');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useCrmEmailTemplateCategories(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'modified',
  order: 'asc' | 'desc' = 'desc'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (overrides?: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCrmEmailTemplateCategories({
        page: overrides?.page ?? page,
        page_size: overrides?.pageSize ?? pageSize,
        search: overrides?.search ?? search,
        orderBy: overrides?.orderBy ?? orderBy,
        order: overrides?.order ?? order
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch email template categories:', err);
      setError(err.message || 'Failed to fetch email template categories');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useCrmWhatsAppTemplateCategories(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'modified',
  order: 'asc' | 'desc' = 'desc'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (overrides?: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCrmWhatsAppTemplateCategories({
        page: overrides?.page ?? page,
        page_size: overrides?.pageSize ?? pageSize,
        search: overrides?.search ?? search,
        orderBy: overrides?.orderBy ?? orderBy,
        order: overrides?.order ?? order
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch whatsapp template categories:', err);
      setError(err.message || 'Failed to fetch whatsapp template categories');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useCallStatuses(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'modified',
  order: 'asc' | 'desc' = 'desc'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (overrides?: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCallStatuses({
        page: overrides?.page ?? page,
        page_size: overrides?.pageSize ?? pageSize,
        search: overrides?.search ?? search,
        orderBy: overrides?.orderBy ?? orderBy,
        order: overrides?.order ?? order
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch Call Statuses:', err);
      setError(err.message || 'Failed to fetch Call Statuses');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useMeetingStatuses(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'modified',
  order: 'asc' | 'desc' = 'desc'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (overrides?: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMeetingStatuses({
        page: overrides?.page ?? page,
        page_size: overrides?.pageSize ?? pageSize,
        search: overrides?.search ?? search,
        orderBy: overrides?.orderBy ?? orderBy,
        order: overrides?.order ?? order
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch Meeting Statuses:', err);
      setError(err.message || 'Failed to fetch Meeting Statuses');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useBloodGroups(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'creation',
  order: 'asc' | 'desc' = 'desc'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (overrides?: { page?: number; pageSize?: number; search?: string; orderBy?: string; order?: 'asc' | 'desc' }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchBloodGroups({
        page: overrides?.page ?? page,
        page_size: overrides?.pageSize ?? pageSize,
        search: overrides?.search ?? search,
        orderBy: overrides?.orderBy ?? orderBy,
        order: overrides?.order ?? order
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch Blood Groups:', err);
      setError(err.message || 'Failed to fetch Blood Groups');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useHRDocumentCategoryList(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'creation',
  order: 'asc' | 'desc' = 'desc',
  status: string = 'all'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (overrides?: {
    page?: number;
    pageSize?: number;
    search?: string;
    orderBy?: string;
    order?: 'asc' | 'desc';
    status?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const filters: any[] = [];
      const currentStatus = overrides?.status ?? status;
      if (currentStatus !== 'all') {
        filters.push(['HR Document Category', 'is_active', '=', currentStatus === 'Active' ? 1 : 0]);
      }

      const result = await fetchHRDocumentCategoriesMaster({
        page: overrides?.page ?? page,
        page_size: overrides?.pageSize ?? pageSize,
        search: overrides?.search ?? search,
        orderBy: overrides?.orderBy ?? orderBy,
        order: overrides?.order ?? order,
        filters
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch HR Document Categories:', err);
      setError(err.message || 'Failed to fetch HR Document Categories');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order, status]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useQualifications(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'creation',
  order: 'asc' | 'desc' = 'desc'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (overrides?: { page?: number; pageSize?: number; search?: string; orderBy?: string; order?: 'asc' | 'desc' }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchQualifications({
        page: overrides?.page ?? page,
        page_size: overrides?.pageSize ?? pageSize,
        search: overrides?.search ?? search,
        orderBy: overrides?.orderBy ?? orderBy,
        order: overrides?.order ?? order
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch Qualifications:', err);
      setError(err.message || 'Failed to fetch Qualifications');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useLineOrders(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'creation',
  order: 'asc' | 'desc' = 'desc',
  status: string = 'all'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (overrides?: {
    page?: number;
    pageSize?: number;
    search?: string;
    orderBy?: string;
    order?: 'asc' | 'desc';
    status?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const filters: any[] = [];
      const currentStatus = overrides?.status ?? status;
      if (currentStatus !== 'all') {
        filters.push(['Line Order', 'status', '=', currentStatus]);
      }

      const result = await fetchLineOrders({
        page: overrides?.page ?? page,
        page_size: overrides?.pageSize ?? pageSize,
        search: overrides?.search ?? search,
        orderBy: overrides?.orderBy ?? orderBy,
        order: overrides?.order ?? order,
        filters
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch Line Orders:', err);
      setError(err.message || 'Failed to fetch Line Orders');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order, status]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useShifts(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'creation',
  order: 'asc' | 'desc' = 'desc',
  status: string = 'all'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (overrides?: {
    page?: number;
    pageSize?: number;
    search?: string;
    orderBy?: string;
    order?: 'asc' | 'desc';
    status?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const filters: any[] = [];
      const currentStatus = overrides?.status ?? status;
      if (currentStatus !== 'all') {
        filters.push(['Shift', 'status', '=', currentStatus]);
      }

      const result = await fetchShifts({
        page: overrides?.page ?? page,
        page_size: overrides?.pageSize ?? pageSize,
        search: overrides?.search ?? search,
        orderBy: overrides?.orderBy ?? orderBy,
        order: overrides?.order ?? order,
        filters
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch Shifts:', err);
      setError(err.message || 'Failed to fetch Shifts');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order, status]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useBusTravelRoutes(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'creation',
  order: 'asc' | 'desc' = 'desc',
  status: string = 'all'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (overrides?: {
    page?: number;
    pageSize?: number;
    search?: string;
    orderBy?: string;
    order?: 'asc' | 'desc';
    status?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const filters: any[] = [];
      const currentStatus = overrides?.status ?? status;
      if (currentStatus !== 'all') {
        filters.push(['Bus Travel Route', 'status', '=', currentStatus]);
      }

      const result = await fetchBusTravelRoutes({
        page: overrides?.page ?? page,
        page_size: overrides?.pageSize ?? pageSize,
        search: overrides?.search ?? search,
        orderBy: overrides?.orderBy ?? orderBy,
        order: overrides?.order ?? order,
        filters
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch Bus Travel Routes:', err);
      setError(err.message || 'Failed to fetch Bus Travel Routes');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order, status]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

export function useEmployeeTypes(
  page: number = 1,
  pageSize: number = 10,
  search: string = '',
  orderBy: string = 'creation',
  order: 'asc' | 'desc' = 'desc'
) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (overrides?: {
    page?: number;
    pageSize?: number;
    search?: string;
    orderBy?: string;
    order?: 'asc' | 'desc';
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchEmployeeTypes({
        page: overrides?.page ?? page,
        page_size: overrides?.pageSize ?? pageSize,
        search: overrides?.search ?? search,
        orderBy: overrides?.orderBy ?? orderBy,
        order: overrides?.order ?? order,
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch Employee Types:', err);
      setError(err.message || 'Failed to fetch Employee Types');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, orderBy, order]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, total, loading, error, refetch };
}

