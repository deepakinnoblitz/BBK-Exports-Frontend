import { handleFrappeError } from 'src/utils/api-error-handler';
import { getCSRFToken, frappeRequest, getAuthHeaders } from 'src/utils/csrf';

export interface WhatsappMessage {
    name: string;
    message_direction: 'Incoming' | 'Outgoing';
    message_content?: string;
    attachment?: string;
    status?: string;
    creation: string;
}

export async function fetchWhatsappMessages(phone: string, start: number = 0, limit: number = 10): Promise<WhatsappMessage[]> {
    const res = await frappeRequest(
        `/api/method/company.company.crm_whatsapp_api.get_whatsapp_messages?phone=${encodeURIComponent(phone)}&start=${start}&limit=${limit}`
    );
    if (!res.ok) {
        const json = await res.json();
        throw new Error(handleFrappeError(json, "Failed to fetch WhatsApp messages"));
    }
    const data = await res.json();
    return data.message || [];
}

export async function sendWhatsappMessage(phone: string, message: string, attachment?: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(
        '/api/method/company.company.crm_whatsapp_api.send_whatsapp',
        {
            method: 'POST',
            headers,
            body: JSON.stringify({
                phone,
                message,
                attachment,
            }),
        }
    );
    const json = await res.json();
    if (!res.ok) {
        throw new Error(handleFrappeError(json, "Failed to send WhatsApp message"));
    }
    if (json.message && json.message.success === false) {
        throw new Error(json.message.error || "Failed to send WhatsApp message");
    }
    return json.message;
}

export async function uploadWhatsappAttachment(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('is_private', '0');

    // Get only the CSRF token — do NOT set Content-Type manually.
    // The browser must set it automatically with the multipart boundary.
    const csrfToken = await getCSRFToken();
    const res = await fetch('/api/method/upload_file', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'X-Frappe-CSRF-Token': csrfToken,
        },
        body: formData,
    });

    const json = await res.json();
    if (!res.ok) {
        throw new Error(handleFrappeError(json, "File upload failed"));
    }
    const fileUrl = json.message?.file_url;
    if (!fileUrl) {
        throw new Error("Upload succeeded but no file URL was returned");
    }
    return fileUrl;
}
