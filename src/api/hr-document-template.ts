import { frappeRequest, getAuthHeaders } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

// ----------------------------------------------------------------------
// TypeScript Interfaces
// ----------------------------------------------------------------------

export interface HRDocumentTemplate {
    name: string;
    template_name: string;
    category: string;
    document_type?: string;
    is_active: number;
    description?: string;
    subject?: string;
    template_content?: string;
    print_format?: string;
    letterhead?: string;
    show_signature?: number;
    digital_signature?: number;
    watermark?: string;
    document_for?: string;
    available_variables?: string;
    creation?: string;
    modified?: string;
    owner?: string;
}

export interface FetchHRDocumentTemplatesParams {
    page: number;
    page_size: number;
    search?: string;
    sort_by?: string;
    filters?: {
        category?: string;
        is_active?: string;
    };
}

export interface HRDocumentTemplateVariable {
    label: string;
    fieldname: string;
    variable: string;
    fieldtype: string;
}

export interface HRDocumentCategory {
    name: string;
    category_name: string;
    is_active?: number;
    description?: string;
}

// ----------------------------------------------------------------------
// Fetch HR Document Templates (paginated)
// ----------------------------------------------------------------------

export async function fetchHRDocumentTemplates(params: FetchHRDocumentTemplatesParams) {
    const filters: any[] = [];
    const or_filters: any[] = [];

    if (params.search) {
        or_filters.push(['HR Document Template', 'template_name', 'like', `%${params.search}%`]);
        or_filters.push(['HR Document Template', 'category', 'like', `%${params.search}%`]);
    }

    if (params.filters) {
        if (params.filters.category && params.filters.category !== 'all') {
            filters.push(['HR Document Template', 'category', '=', params.filters.category]);
        }
        if (params.filters.is_active && params.filters.is_active !== 'all') {
            filters.push(['HR Document Template', 'is_active', '=', params.filters.is_active === 'yes' ? 1 : 0]);
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
        doctype: 'HR Document Template',
        fields: JSON.stringify([
            'name',
            'template_name',
            'category',
            'is_active',
            'description',
            'subject',
            'creation',
            'modified',
            'owner',
        ]),
        filters: JSON.stringify(filters),
        or_filters: JSON.stringify(or_filters),
        limit_start: String((params.page - 1) * params.page_size),
        limit_page_length: String(params.page_size),
        order_by: orderBy,
    });

    const [res, countRes] = await Promise.all([
        frappeRequest(`/api/method/frappe.client.get_list?${query.toString()}`),
        frappeRequest(
            `/api/method/company.company.frontend_api.get_permitted_count?doctype=HR Document Template&filters=${encodeURIComponent(
                JSON.stringify(filters)
            )}&or_filters=${encodeURIComponent(JSON.stringify(or_filters))}`
        ),
    ]);

    if (!res.ok) throw new Error('Failed to fetch HR document templates');

    const data = await res.json();
    const countData = await countRes.json();

    return {
        data: data.message || [],
        total: countData.message || 0,
    };
}

// ----------------------------------------------------------------------
// Get Single HR Document Template
// ----------------------------------------------------------------------

export async function getHRDocumentTemplate(name: string): Promise<HRDocumentTemplate> {
    const res = await frappeRequest(
        `/api/method/frappe.client.get?doctype=HR Document Template&name=${encodeURIComponent(name)}`
    );
    if (!res.ok) throw new Error('Failed to fetch HR document template details');
    return (await res.json()).message;
}

// ----------------------------------------------------------------------
// Create HR Document Template
// ----------------------------------------------------------------------

export async function createHRDocumentTemplate(data: Partial<HRDocumentTemplate>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest('/api/method/frappe.client.insert', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            doc: { doctype: 'HR Document Template', ...data },
        }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, 'Failed to create HR document template'));
    return json.message;
}

// ----------------------------------------------------------------------
// Update HR Document Template
// ----------------------------------------------------------------------

export async function updateHRDocumentTemplate(name: string, data: Partial<HRDocumentTemplate>) {
    const headers = await getAuthHeaders();
    const latestDoc = await getHRDocumentTemplate(name);
    const mergedDoc = {
        ...latestDoc,
        ...data,
        doctype: 'HR Document Template',
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
    if (!res.ok) throw new Error(handleFrappeError(json, 'Failed to update HR document template'));
    return json.message;
}

// ----------------------------------------------------------------------
// Delete HR Document Template
// ----------------------------------------------------------------------

export async function deleteHRDocumentTemplate(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest('/api/method/frappe.client.delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({ doctype: 'HR Document Template', name }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, 'Failed to delete HR document template'));
    return true;
}

// ----------------------------------------------------------------------
// Fetch Variables for HR Document Template
// ----------------------------------------------------------------------

export async function fetchHRDocumentTemplateVariables(
    documentFor: string = 'Employee'
): Promise<HRDocumentTemplateVariable[]> {
    const res = await frappeRequest(
        `/api/method/company.company.doctype.hr_document_template.hr_document_template.get_document_template_variables?document_for=${encodeURIComponent(
            documentFor
        )}`
    );

    if (!res.ok) {
        throw new Error('Failed to fetch HR document template variables');
    }

    const json = await res.json();
    if (json.exc) {
        throw new Error(handleFrappeError(json, 'Failed to fetch HR document template variables'));
    }

    return json.message || [];
}

// ----------------------------------------------------------------------
// Fetch HR Document Categories
// ----------------------------------------------------------------------

export async function fetchHRDocumentCategories(activeOnly = false): Promise<HRDocumentCategory[]> {
    const params: Record<string, string> = {
        doctype: 'HR Document Category',
        fields: JSON.stringify(['name', 'category_name', 'is_active', 'description']),
        order_by: 'category_name asc',
        limit_page_length: '0',
    };
    if (activeOnly) {
        params.filters = JSON.stringify([['HR Document Category', 'is_active', '=', 1]]);
    }
    const query = new URLSearchParams(params);

    const res = await frappeRequest(`/api/method/frappe.client.get_list?${query.toString()}`);
    if (!res.ok) {
        throw new Error('Failed to fetch HR document categories');
    }

    const json = await res.json();
    return json.message || [];
}

// ----------------------------------------------------------------------
// Create HR Document Category
// ----------------------------------------------------------------------

export async function createHRDocumentCategory(categoryName: string) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest('/api/method/frappe.client.insert', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            doc: {
                doctype: 'HR Document Category',
                category_name: categoryName,
                is_active: 1,
            },
        }),
    });

    const json = await res.json();
    if (!res.ok) {
        throw new Error(handleFrappeError(json, 'Failed to create category'));
    }

    return json.message;
}
