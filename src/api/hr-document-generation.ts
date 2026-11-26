import { frappeRequest, getAuthHeaders } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

// ----------------------------------------------------------------------
// TypeScript Interfaces
// ----------------------------------------------------------------------

export interface HRDocumentGeneration {
    name: string;
    employee: string;
    employee_name?: string;
    document_template: string;
    document_type?: string;
    generated_on?: string;
    generated_by?: string;
    status: 'Draft' | 'Generated' | 'Printed' | 'Cancelled' | string;
    subject?: string;
    template_content?: string;
    rendered_subject?: string;
    rendered_content?: string;
    creation?: string;
    modified?: string;
    owner?: string;
}

export interface FetchHRDocumentGenerationsParams {
    page: number;
    page_size: number;
    search?: string;
    sort_by?: string;
    filters?: {
        status?: string;
        document_template?: string;
    };
}

export interface EmployeeOption {
    name: string;
    employee_name: string;
    department?: string;
    designation?: string;
}

// ----------------------------------------------------------------------
// Fetch HR Document Generations (paginated)
// ----------------------------------------------------------------------

export async function fetchHRDocumentGenerations(params: FetchHRDocumentGenerationsParams) {
    const filters: any[] = [];
    const or_filters: any[] = [];

    if (params.search) {
        or_filters.push(['HR Document Generation', 'employee', 'like', `%${params.search}%`]);
        or_filters.push(['HR Document Generation', 'employee_name', 'like', `%${params.search}%`]);
        or_filters.push(['HR Document Generation', 'document_template', 'like', `%${params.search}%`]);
        or_filters.push(['HR Document Generation', 'document_type', 'like', `%${params.search}%`]);
        or_filters.push(['HR Document Generation', 'subject', 'like', `%${params.search}%`]);
    }

    if (params.filters) {
        if (params.filters.status && params.filters.status !== 'all') {
            filters.push(['HR Document Generation', 'status', '=', params.filters.status]);
        }
        if (params.filters.document_template && params.filters.document_template !== 'all') {
            filters.push(['HR Document Generation', 'document_template', '=', params.filters.document_template]);
        }
    }

    let orderBy = 'creation desc';
    if (params.sort_by) {
        const parts = params.sort_by.split('_');
        const dir = parts.pop() || 'desc';
        const field = parts.join('_');
        orderBy = `${field} ${dir}`;
    }

    const query = new URLSearchParams({
        doctype: 'HR Document Generation',
        fields: JSON.stringify([
            'name',
            'employee',
            'employee_name',
            'document_template',
            'document_type',
            'generated_on',
            'generated_by',
            'status',
            'subject',
            'creation',
            'modified',
            'owner',
        ]),
        filters: JSON.stringify(filters),
        or_filters: JSON.stringify(or_filters),
        order_by: orderBy,
        limit_start: String((params.page - 1) * params.page_size),
        limit_page_length: String(params.page_size),
    });

    const countQuery = new URLSearchParams({
        doctype: 'HR Document Generation',
        filters: JSON.stringify(filters),
        or_filters: JSON.stringify(or_filters),
    });

    try {
        const [listRes, countRes] = await Promise.all([
            frappeRequest(`/api/method/frappe.client.get_list?${query.toString()}`),
            frappeRequest(
                `/api/method/company.company.frontend_api.get_permitted_count?doctype=HR Document Generation&filters=${encodeURIComponent(
                    JSON.stringify(filters)
                )}&or_filters=${encodeURIComponent(JSON.stringify(or_filters))}`
            ),
        ]);

        const listData = await listRes.json();
        const countData = await countRes.json();

        return {
            data: (listData.message || []) as HRDocumentGeneration[],
            total: (countData.message || 0) as number,
        };
    } catch (error) {
        console.error('Failed to fetch HR Document Generations:', error);
        return { data: [], total: 0 };
    }
}

// ----------------------------------------------------------------------
// Get single HR Document Generation details
// ----------------------------------------------------------------------

export async function getHRDocumentGeneration(name: string): Promise<HRDocumentGeneration> {
    const res = await frappeRequest(
        `/api/method/frappe.client.get?doctype=HR Document Generation&name=${encodeURIComponent(name)}`
    );
    const json = await res.json();
    if (!res.ok) throw new Error(`Failed to fetch HR Document Generation: ${name}`);
    return json.message as HRDocumentGeneration;
}

// ----------------------------------------------------------------------
// Create HR Document Generation
// ----------------------------------------------------------------------

export async function createHRDocumentGeneration(data: Partial<HRDocumentGeneration>): Promise<HRDocumentGeneration> {
    const headers = await getAuthHeaders();
    const res = await frappeRequest('/api/method/frappe.client.insert', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            doc: {
                doctype: 'HR Document Generation',
                ...data,
            },
        }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, 'Failed to create HR Document Generation'));
    return json.message as HRDocumentGeneration;
}

// ----------------------------------------------------------------------
// Update HR Document Generation
// ----------------------------------------------------------------------

export async function updateHRDocumentGeneration(name: string, data: Partial<HRDocumentGeneration>): Promise<HRDocumentGeneration> {
    const headers = await getAuthHeaders();
    const latestDoc = await getHRDocumentGeneration(name);
    const mergedDoc = {
        ...latestDoc,
        ...data,
        doctype: 'HR Document Generation',
        name,
    };

    const res = await frappeRequest('/api/method/frappe.client.save', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            doc: mergedDoc,
        }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, `Failed to update HR Document Generation: ${name}`));
    return json.message as HRDocumentGeneration;
}

// ----------------------------------------------------------------------
// Delete HR Document Generation
// ----------------------------------------------------------------------

export async function deleteHRDocumentGeneration(name: string): Promise<boolean> {
    const headers = await getAuthHeaders();
    const res = await frappeRequest('/api/method/frappe.client.delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            doctype: 'HR Document Generation',
            name,
        }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, `Failed to delete HR Document Generation: ${name}`));
    return true;
}

// ----------------------------------------------------------------------
// Helper to fetch list of Employees for searchable dropdown
// ----------------------------------------------------------------------

export async function fetchEmployeesList(): Promise<EmployeeOption[]> {
    try {
        const query = new URLSearchParams({
            doctype: 'Employee',
            fields: JSON.stringify(['name', 'employee_name', 'department', 'designation']),
            filters: JSON.stringify([['Employee', 'status', '=', 'Active']]),
            order_by: 'employee_name asc',
            limit_page_length: '1000',
        });
        const res = await frappeRequest(`/api/method/frappe.client.get_list?${query.toString()}`);
        const json = await res.json();
        return (json.message || []) as EmployeeOption[];
    } catch (error) {
        console.error('Failed to fetch employee list:', error);
        return [];
    }
}

export function getHRDocumentGenerationPrintUrl(name: string) {
    return `/api/method/company.company.doctype.hr_document_generation.hr_document_generation.download_rendered_pdf?name=${encodeURIComponent(name)}`;
}
