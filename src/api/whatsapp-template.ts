import { frappeRequest, getAuthHeaders } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

import type { EmailTemplateVariable } from './email-template';

// ----------------------------------------------------------------------
// TypeScript Interfaces
// ----------------------------------------------------------------------

export interface WhatsAppTemplate {
    name: string;
    template_name: string;
    category: string;
    language: string;
    message_body: string;
    header_text?: string;
    footer_text?: string;
    status: string;
    used_for?: string;
    allow_attachment?: number;
    default_attachment?: { file: string; description?: string; name?: string }[];
    meta_template_name?: string;
    meta_template_id?: string;
    meta_status?: string;
    last_synced_on?: string;
    creation?: string;
    modified?: string;
    owner?: string;
}

export interface FetchWhatsAppTemplatesParams {
    page: number;
    page_size: number;
    search?: string;
    sort_by?: string;
    filters?: {
        category?: string;
        status?: string;
    };
}

// ----------------------------------------------------------------------
// Fetch WhatsApp Templates (paginated)
// ----------------------------------------------------------------------

export async function fetchWhatsAppTemplates(params: FetchWhatsAppTemplatesParams) {
    const filters: any[] = [];
    const or_filters: any[] = [];

    if (params.search) {
        or_filters.push(['CRM WhatsApp Template', 'template_name', 'like', `%${params.search}%`]);
        or_filters.push(['CRM WhatsApp Template', 'category', 'like', `%${params.search}%`]);
        or_filters.push(['CRM WhatsApp Template', 'message_body', 'like', `%${params.search}%`]);
    }

    if (params.filters) {
        if (params.filters.category && params.filters.category !== 'all') {
            filters.push(['CRM WhatsApp Template', 'category', '=', params.filters.category]);
        }
        if (params.filters.status && params.filters.status !== 'all') {
            filters.push(['CRM WhatsApp Template', 'status', '=', params.filters.status]);
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
        doctype: 'CRM WhatsApp Template',
        fields: JSON.stringify([
            'name', 'template_name', 'category', 'language', 'status',
            'message_body', 'header_text', 'footer_text', 'used_for',
            'allow_attachment', 'meta_template_name', 'meta_template_id',
            'meta_status', 'last_synced_on', 'creation', 'modified', 'owner',
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
            `/api/method/company.company.frontend_api.get_permitted_count?doctype=CRM WhatsApp Template&filters=${encodeURIComponent(JSON.stringify(filters))}&or_filters=${encodeURIComponent(JSON.stringify(or_filters))}`
        ),
    ]);

    if (!res.ok) throw new Error('Failed to fetch WhatsApp templates');

    const data = await res.json();
    const countData = await countRes.json();

    return {
        data: data.message || [],
        total: countData.message || 0,
    };
}

// ----------------------------------------------------------------------
// Get Single WhatsApp Template
// ----------------------------------------------------------------------

export async function getWhatsAppTemplate(name: string): Promise<WhatsAppTemplate> {
    const res = await frappeRequest(
        `/api/method/frappe.client.get?doctype=CRM WhatsApp Template&name=${encodeURIComponent(name)}`
    );
    if (!res.ok) throw new Error('Failed to fetch WhatsApp template details');
    return (await res.json()).message;
}

// ----------------------------------------------------------------------
// Create WhatsApp Template
// ----------------------------------------------------------------------

export async function createWhatsAppTemplate(data: Partial<WhatsAppTemplate>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest('/api/method/frappe.client.insert', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            doc: { doctype: 'CRM WhatsApp Template', ...data },
        }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, 'Failed to create WhatsApp template'));
    return json.message;
}

// ----------------------------------------------------------------------
// Update WhatsApp Template
// ----------------------------------------------------------------------

export async function updateWhatsAppTemplate(name: string, data: Partial<WhatsAppTemplate>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest('/api/method/frappe.client.set_value', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            doctype: 'CRM WhatsApp Template',
            name,
            fieldname: data,
        }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, 'Failed to update WhatsApp template'));
    return json.message;
}

// ----------------------------------------------------------------------
// Delete WhatsApp Template
// ----------------------------------------------------------------------

export async function deleteWhatsAppTemplate(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest('/api/method/frappe.client.delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({ doctype: 'CRM WhatsApp Template', name }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, 'Failed to delete WhatsApp template'));
    return true;
}

// ----------------------------------------------------------------------
// Fetch WhatsApp Template Variables
// ----------------------------------------------------------------------

export async function fetchWhatsAppTemplateVariables(usedFor: string): Promise<EmailTemplateVariable[]> {
    const res = await frappeRequest(
        `/api/method/company.company.doctype.crm_whatsapp_template.crm_whatsapp_template.get_whatsapp_template_variables?used_for=${encodeURIComponent(usedFor)}`
    );
    if (!res.ok) throw new Error('Failed to fetch WhatsApp template variables');
    const data = await res.json();
    return data.message || [];
}

export interface WhatsAppTemplateCategory {
    name: string;
    category: string;
}

export async function fetchWhatsAppTemplateCategories(): Promise<WhatsAppTemplateCategory[]> {
    const query = new URLSearchParams({
        doctype: 'CRM WhatsApp Template Category',
        fields: JSON.stringify([
            'name',
            'category',
        ]),
        order_by: 'category desc',
        limit_page_length: '0',
    });

    const res = await frappeRequest(
        `/api/method/frappe.client.get_list?${query.toString()}`
    );

    if (!res.ok) {
        throw new Error('Failed to fetch WhatsApp template categories');
    }

    const json = await res.json();

    return json.message || [];
}

export async function createWhatsAppTemplateCategory(category: string) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest('/api/method/frappe.client.insert', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            doc: {
                doctype: 'CRM WhatsApp Template Category',
                category,
            },
        }),
    });

    const json = await res.json();

    if (!res.ok) {
        throw new Error(
            handleFrappeError(json, 'Failed to create WhatsApp template category')
        );
    }

    return json.message;
}

