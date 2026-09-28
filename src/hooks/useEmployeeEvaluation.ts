import type {
    EmployeeEvaluationPoint,
    EvaluationTraitCategory
} from 'src/api/employee-evaluation';

import { useState, useEffect, useCallback } from 'react';

import {
    fetchEmployeeEvaluationTraits,
    fetchEmployeeEvaluationEvents,
    fetchEmployeeEvaluationPoints,
    fetchEmployeeEvaluationScoreLogs,
    fetchEmployeeEvaluationTraitCategories
} from 'src/api/employee-evaluation';

export function useEmployeeEvaluationTraits(page: number, pageSize: number, search?: string, sortBy?: string, filters?: any) {
    const [data, setData] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const refetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchEmployeeEvaluationTraits({
                page,
                page_size: pageSize,
                search,
                sort_by: sortBy,
                category: filters?.category
            });
            setData(res.data);
            setTotal(res.total);
        } catch (error) {
            console.error('Failed to fetch evaluation traits:', error);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, sortBy, filters?.category]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { data, total, loading, refetch };
}

export function useEmployeeEvaluationEvents(page: number, pageSize: number, search?: string, sortBy?: string, filters?: any) {
    const [data, setData] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const refetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchEmployeeEvaluationEvents({
                page,
                page_size: pageSize,
                search,
                sort_by: sortBy,
                employee: filters?.employee,
                trait: filters?.trait,
                evaluation_type: filters?.evaluation_type,
                docstatus: filters?.docstatus,
                startDate: filters?.startDate,
                endDate: filters?.endDate
            });
            setData(res.data);
            setTotal(res.total);
        } catch (error) {
            console.error('Failed to fetch employee evaluations:', error);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, sortBy, filters?.employee, filters?.trait, filters?.evaluation_type, filters?.docstatus, filters?.startDate, filters?.endDate]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { data, total, loading, refetch };
}

export function useEmployeeEvaluationScoreLogs(page: number, pageSize: number, search?: string, sortBy?: string, filters?: any) {
    const [data, setData] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const refetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchEmployeeEvaluationScoreLogs({
                page,
                page_size: pageSize,
                search,
                sort_by: sortBy,
                employee: filters?.employee,
                startDate: filters?.startDate,
                endDate: filters?.endDate
            });
            setData(res.data);
            setTotal(res.total);
        } catch (error) {
            console.error('Failed to fetch employee evaluation score logs:', error);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, sortBy, filters?.employee, filters?.startDate, filters?.endDate]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { data, total, loading, refetch };
}

export function useEmployeeEvaluationPoints() {
    const [data, setData] = useState<EmployeeEvaluationPoint[]>([]);
    const [loading, setLoading] = useState(true);

    const refetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchEmployeeEvaluationPoints();
            setData(res);
        } catch (error) {
            console.error('Failed to fetch evaluation points:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { data, loading, refetch };
}

export function useEmployeeEvaluationTraitCategories() {
    const [data, setData] = useState<EvaluationTraitCategory[]>([]);
    const [loading, setLoading] = useState(true);

    const refetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchEmployeeEvaluationTraitCategories();
            setData(res);
        } catch (error) {
            console.error('Failed to fetch evaluation trait categories:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { data, loading, refetch };
}
