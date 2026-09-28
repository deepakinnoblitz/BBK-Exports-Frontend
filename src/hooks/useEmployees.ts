import { useState, useEffect, useCallback } from 'react';

import { fetchEmployees } from 'src/api/employees';

export function useEmployees(
    page: number,
    pageSize: number,
    search: string,
    orderBy?: string,
    order?: 'asc' | 'desc',
    filterDepartment?: string,
    filterDesignation?: string,
    filterStatus?: string,
    filterCountry?: string,
    filterState?: string,
    filterCity?: string,
    joiningDateFrom?: string | null,
    joiningDateTo?: string | null,
    filterEmployee?: string[],
    filterEmployeeType?: string
) {
    const [data, setData] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const refetch = useCallback(async () => {
        setLoading(true);
        try {
            const filters: any[] = [];
            const or_filters: any[] = [];

            // Add department filter
            if (filterDepartment && filterDepartment !== 'all') {
                filters.push(['Employee', 'department', '=', filterDepartment]);
            }
 
            if (filterEmployee && filterEmployee.length > 0) {
                or_filters.push([
                    'Employee',
                    'name',
                    'in',
                    filterEmployee,
                ]);

                or_filters.push([
                    'Employee',
                    'employee_id',
                    'in',
                    filterEmployee,
                ]);
            }

            // Add designation filter
            if (filterDesignation && filterDesignation !== 'all') {
                if (filterDesignation.length >= 2) {
                    filters.push(['Employee', 'designation', 'like', `%${filterDesignation}%`]);
                } else {
                    filters.push(['Employee', 'designation', '=', filterDesignation]);
                }
            }

            // Add status filter
            if (filterStatus && filterStatus !== 'all') {
                filters.push(['Employee', 'status', '=', filterStatus]);
            }

            // Add joining date filters
            if (joiningDateFrom) {
                filters.push(['Employee', 'date_of_joining', '>=', joiningDateFrom]);
            }
            if (joiningDateTo) {
                filters.push(['Employee', 'date_of_joining', '<=', joiningDateTo]);
            }

            // Add country filter (text search)
            if (filterCountry && filterCountry.trim() !== '') {
                filters.push(['Employee', 'country', 'like', `%${filterCountry}%`]);
            }

            // Add state filter (text search)
            if (filterState && filterState.trim() !== '') {
                filters.push(['Employee', 'state', 'like', `%${filterState}%`]);
            }

            // Add city filter (text search)
            if (filterCity && filterCity.trim() !== '') {
                filters.push(['Employee', 'city', 'like', `%${filterCity}%`]);
            }

            // Add employee type filter
            if (filterEmployeeType && filterEmployeeType !== 'all') {
                filters.push(['Employee', 'employee_type', '=', filterEmployeeType]);
            }

            const result = await fetchEmployees({
                page,
                page_size: pageSize,
                search,
                orderBy,
                order,
                filters: filters.length > 0 ? filters : undefined,
                or_filters: or_filters.length > 0 ? or_filters : undefined
            });
            setData(result.data);
            setTotal(result.total);
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, orderBy, order, filterDepartment, filterDesignation, filterStatus, filterCountry, filterState, filterCity, joiningDateFrom, joiningDateTo, filterEmployee, filterEmployeeType]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { data, total, loading, refetch };
}
