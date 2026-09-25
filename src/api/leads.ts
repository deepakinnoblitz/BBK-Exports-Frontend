import { frappeRequest, getAuthHeaders } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

export interface LeadPhoneRow {
    name?: string;
    phone: string;
}

export interface LeadEmailRow {
    name?: string;
    email: string;
}

export interface Lead {
    name: string;
    lead_name: string;
    company_name?: string;
    gstin?: string;
    phone_number?: string;
    email?: string;
    service?: string;
    leads_type: 'Incoming' | 'Outgoing';
    leads_from: string;
    remarks?: string;
    country?: string;
    state?: string;
    city?: string;
    status?: string;
    workflow_state?: string;
    billing_address?: string;
    interest_level?: 'High' | 'Medium' | 'Low';
    phone_numbers?: LeadPhoneRow[];
    emails?: LeadEmailRow[];
    lead_notes?: any[];
    modified?: string;
}

export async function fetchLeads(params: {
    page: number;
    page_size: number;
    search?: string;
    filterValues?: Record<string, any>;
    sort_by?: string;
}) {
    const filters: any[] = [];
    const or_filters: any[] = [];

    if (params.search) {
        or_filters.push(["Lead", "name", "like", `%${params.search}%`]);
        or_filters.push(["Lead", "lead_name", "like", `%${params.search}%`]);
        or_filters.push(["Lead", "email", "like", `%${params.search}%`]);
        or_filters.push(["Lead", "company_name", "like", `%${params.search}%`]);
        or_filters.push(["Lead", "phone_number", "like", `%${params.search}%`]);
    }

    if (params.filterValues) {
        Object.entries(params.filterValues).forEach(([key, value]) => {
            if (value && value !== 'all') {
                filters.push(["Lead", key, "=", value]);
            }
        });
    }

    // Convert sort_by format (e.g., "creation_desc") to Frappe order_by format
    let orderBy = "creation desc";
    if (params.sort_by) {
        const [field, direction] = params.sort_by.split('_').reduce((acc, part) => {
            if (part === 'asc' || part === 'desc') {
                acc[1] = part;
            } else {
                acc[0] = acc[0] ? `${acc[0]}_${part}` : part;
            }
            return acc;
        }, ['', 'desc']);
        orderBy = `${field} ${direction}`;
    }

    const query = new URLSearchParams({
        doctype: "Lead",
        fields: JSON.stringify([
            "name",
            "lead_name",
            "company_name",
            "gstin",
            "phone_number",
            "email",
            "service",
            "leads_type",
            "leads_from",
            "status",
            "workflow_state",
            "country",
            "state",
            "city",
            "billing_address",
            "remarks",
            "interest_level",
            "owner",
            "creation",
            "modified"
        ]),
        filters: JSON.stringify(filters),
        or_filters: JSON.stringify(or_filters),
        limit_start: String((params.page - 1) * params.page_size),
        limit_page_length: String(params.page_size),
        order_by: orderBy
    });

    const [res, countRes] = await Promise.all([
        frappeRequest(`/api/method/frappe.client.get_list?${query.toString()}`),
        frappeRequest(`/api/method/company.company.frontend_api.get_permitted_count?doctype=Lead&filters=${encodeURIComponent(JSON.stringify(filters))}&or_filters=${encodeURIComponent(JSON.stringify(or_filters))}`)
    ]);

    if (!res.ok) throw new Error("Failed to fetch leads");

    const data = await res.json();
    const countData = await countRes.json();

    return {
        data: data.message || [],
        total: countData.message || 0
    };
}


export async function createLead(data: Partial<Lead>) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doc: {
                doctype: "Lead",
                ...data
            }
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create lead"));
    return json.message;
}

export async function createLeadFrom(name: string) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doc: {
                doctype: "Lead From",
                lead_from: name,
            }
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create Lead From"));
    return json.message;
}

export async function createService(name: string) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doc: {
                doctype: "Service",
                service_id: name,
                service_name: name,
            }
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create Service"));
    return json.message;
}


export async function updateLead(name: string, data: Partial<Lead>) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/frappe.client.set_value", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doctype: "Lead",
            name,
            fieldname: data
        })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update lead"));
    return json.message;
}


export async function deleteLead(name: string) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doctype: "Lead",
            name
        })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete lead"));
    return json.message;
}


export async function getDoctypeList(doctype: string, fields?: string[], filters?: Record<string, any>, limit?: number) {
    const params: any = {
        doctype,
    };

    if (limit !== undefined) {
        params.limit = limit.toString();
    }

    if (fields) {
        params.fields = JSON.stringify(fields);
    }

    if (filters) {
        params.filters = JSON.stringify(filters);
    }

    const query = new URLSearchParams(params);

    const res = await frappeRequest(
        `/api/method/company.company.frontend_api.get_doctype_list?${query.toString()}`
    );

    if (!res.ok) {
        console.error(`Failed to fetch list for ${doctype}`);
        return [];
    }
    const data = await res.json();
    const message = data.message || [];

    // If it's a list of objects and we only wanted names, it would have been plucked on backend
    // but just in case, or if fields were specified, we return the message as is.
    return message;
}

export async function getStates(country: string) {
    const res = await frappeRequest(
        `/api/method/company.company.api.get_states?country=${encodeURIComponent(country)}`
    );

    if (!res.ok) {
        return [];
    }

    return (await res.json()).message || [];
}

export async function getCities(country: string, state: string) {
    const res = await frappeRequest(
        `/api/method/company.company.api.get_cities?country=${encodeURIComponent(country)}&state=${encodeURIComponent(state)}`
    );

    if (!res.ok) {
        return [];
    }

    return (await res.json()).message || [];
}

export async function getDoc(doctype: string, name: string) {
    const res = await frappeRequest(`/api/method/frappe.client.get?doctype=${encodeURIComponent(doctype)}&name=${encodeURIComponent(name)}`);

    if (!res.ok) {
        throw new Error(`Failed to fetch ${doctype} details`);
    }

    return (await res.json()).message;
}

export async function getLead(name: string) {
    return getDoc("Lead", name);
}

export async function getLeadPermissions() {
    const res = await frappeRequest("/api/method/company.company.frontend_api.get_lead_permissions");

    if (!res.ok) {
        return { read: false, write: false, delete: false };
    }

    return (await res.json()).message || { read: false, write: false, delete: false };
}

export async function getFollowupHistory(
    reference_type: string,
    reference_name: string
) {
    const res = await frappeRequest(
        `/api/method/company.company.frontend_api.get_followup_history?reference_type=${encodeURIComponent(reference_type)}&reference_name=${encodeURIComponent(reference_name)}`
    );

    if (!res.ok) {
        throw new Error(
            `Failed to fetch follow-up history`
        );
    }

    return (await res.json()).message || [];
}

export async function getProposalByLeadId(leadId: string) {
    const res = await frappeRequest(
        `/api/method/company.company.frontend_api.get_proposal_by_lead_id?lead_id=${encodeURIComponent(leadId)}`
    );

    if (!res.ok) {
        throw new Error('Failed to fetch proposals');
    }

    return (await res.json()).message;
}

export interface WorkflowTransition {
    state: string;
    action: string;
    next_state: string;
    allowed: string;
}

export interface WorkflowStates {
    states: string[];
    transitions: WorkflowTransition[];
    actions: { action: string; next_state: string }[];
}

export async function getWorkflowStates(doctype: string = 'Lead'): Promise<WorkflowStates> {
    const res = await frappeRequest(
        `/api/method/company.company.frontend_api.get_workflow_states?doctype=${doctype}`
    );

    if (!res.ok) {
        return { states: [], transitions: [], actions: [] };
    }

    return (await res.json()).message || { states: [], transitions: [], actions: [] };
}

export async function getWorkflowActions(doctype: string = 'Lead', currentState: string): Promise<{ action: string; next_state: string }[]> {
    const res = await frappeRequest(
        `/api/method/company.company.frontend_api.get_workflow_states?doctype=${doctype}&current_state=${encodeURIComponent(currentState)}`
    );

    if (!res.ok) {
        return [];
    }

    const data = (await res.json()).message || { actions: [] };
    return data.actions || [];
}

export function getNextStates(currentState: string, transitions: WorkflowTransition[]): string[] {
    // Get all allowed next states from the current state
    const nextStates = transitions
        .filter(t => t.state === currentState)
        .map(t => t.next_state);

    // Always include the current state so user can keep it
    return [currentState, ...nextStates];
}

export interface ConvertLeadResponse {
    account: string;
    contact: string;
    messages: Array<{
        type: 'success' | 'warning' | 'error';
        text: string;
    }>;
}

export async function convertLead(leadName: string): Promise<ConvertLeadResponse> {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/company.company.crm_api.convert_lead", {
        method: "POST",
        headers,
        body: JSON.stringify({
            lead_name: leadName
        })
    });

    const json = await res.json();

    if (!res.ok || json.exc) {
        throw new Error(handleFrappeError(json, "Failed to convert lead"));
    }

    return json.message;
}
export async function applyWorkflowAction(doctype: string, name: string, action: string) {
    console.log('applyWorkflowAction calling:', { doctype, name, action });
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/company.company.frontend_api.apply_workflow_action", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doctype,
            name,
            action
        })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to apply workflow action"));
    return json.message;
}

export async function getAutomationPreview(
    doctype: string,
    docname: string,
    previousState: string
): Promise<{
    show_confirmation: boolean;
    title?: string;
    message?: string;
    preview: string;
    automation_name: string;
}> {
    const res = await frappeRequest(
        `/api/method/company.company.doctype.crm_whatsapp_automation.crm_whatsapp_automation.get_automation_preview?doctype=${encodeURIComponent(doctype)}&docname=${encodeURIComponent(docname)}&previous_state=${encodeURIComponent(previousState)}`
    );
    if (!res.ok) {
        throw new Error("Failed to fetch WhatsApp automation preview");
    }
    const data = await res.json();
    return data.message;
}

export async function sendAutomationMessage(
    automationName: string,
    doctype: string,
    docname: string,
    proposalName: string | null,
    attachments?: { file_url: string }[] | null
): Promise<any> {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(
        "/api/method/company.company.doctype.crm_whatsapp_automation.crm_whatsapp_automation.send_automation_message",
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                automation_name: automationName,
                doctype,
                docname,
                proposal_name: proposalName,
                attachments: attachments || null,
            }),
        }
    );
    const json = await res.json();
    if (!res.ok || json.exc) {
        throw new Error(handleFrappeError(json, "Unable to send WhatsApp message."));
    }
    return json.message;
}

export async function getLatestWhatsAppMessage(
    docname: string,
    isDeal: boolean
): Promise<{ status: string; raw_payload?: string } | null> {
    const filters = isDeal ? { prospect: docname } : { lead: docname };
    const res = await frappeRequest(
        `/api/method/frappe.client.get_list?doctype=CRM WhatsApp Message&filters=${encodeURIComponent(JSON.stringify(filters))}&fields=${encodeURIComponent(JSON.stringify(["status", "raw_payload"]))}&order_by=creation desc&limit=1`
    );
    if (!res.ok) {
        throw new Error("Failed to fetch WhatsApp message status");
    }
    const data = await res.json();
    return data.message && data.message.length > 0 ? data.message[0] : null;
}

export async function getEmailAutomationPreview(
    doctype: string,
    docname: string,
    previousState: string
): Promise<{
    show_confirmation: boolean;
    title?: string;
    message?: string;
    preview: string;
    automation_name: string;
}> {
    const res = await frappeRequest(
        `/api/method/company.company.doctype.crm_email_automation.crm_email_automation.get_automation_preview?doctype=${encodeURIComponent(doctype)}&docname=${encodeURIComponent(docname)}&previous_state=${encodeURIComponent(previousState)}`
    );
    if (!res.ok) {
        throw new Error("Failed to fetch email automation preview");
    }
    const data = await res.json();
    return data.message;
}

export async function getProposalAttachments(
    proposalName: string
): Promise<{ name: string; file_name: string; file_url: string; file_size?: number }[]> {
    const res = await frappeRequest(
        `/api/method/company.company.doctype.crm_email_automation.crm_email_automation.get_proposal_attachments?proposal_name=${encodeURIComponent(proposalName)}`
    );
    if (!res.ok) {
        throw new Error("Failed to fetch proposal attachments");
    }
    const data = await res.json();
    return data.message || [];
}

export async function sendEmailAutomationMessage(
    automationName: string,
    doctype: string,
    docname: string,
    proposalName: string | null,
    attachments?: { file_url: string }[] | null
): Promise<any> {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(
        "/api/method/company.company.doctype.crm_email_automation.crm_email_automation.send_automation_message",
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                automation_name: automationName,
                doctype,
                docname,
                proposal_name: proposalName,
                attachments: attachments || null,
            }),
        }
    );
    const json = await res.json();
    if (!res.ok || json.exc) {
        throw new Error(handleFrappeError(json, "Unable to send WhatsApp message."));
    }
    return json.message;
}

export async function saveLead(doc: any) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.save", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doc: {
                doctype: "Lead",
                ...doc
            }
        })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to save lead"));
    return json.message;
}

export async function getMetaLeadInfo(leadId: string) {
    const res = await frappeRequest(
        `/api/method/company.company.frontend_api.get_meta_lead_info?lead_id=${encodeURIComponent(leadId)}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.message || null;
}