import { frappeRequest } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

export async function uploadFile(
    file: File,
    doctype?: string,
    docname?: string,
    fieldname?: string,
    options?: { isPrivate?: boolean }
) {
    const isPrivate = options?.isPrivate ?? true;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("is_private", isPrivate ? "1" : "0");
    formData.append("folder", "Home");

    if (doctype) formData.append("doctype", doctype);
    if (docname) formData.append("docname", docname);
    if (fieldname) formData.append("fieldname", fieldname);

    const res = await frappeRequest("/api/method/upload_file", {
        method: "POST",
        body: formData
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, "Failed to upload file"));
    }

    return (await res.json()).message;
}

export async function createDataImport(data: any) {
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        body: JSON.stringify({
            doc: {
                doctype: "Data Import",
                ...data
            }
        })
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, "Failed to create data import"));
    }

    return (await res.json()).message;
}

export async function startDataImport(name: string) {
    const res = await frappeRequest("/api/method/frappe.core.doctype.data_import.data_import.form_start_import", {
        method: "POST",
        body: JSON.stringify({
            data_import: name
        })
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, "Failed to start data import"));
    }

    return (await res.json()).message;
}

export async function getImportStatus(name: string) {
    const res = await frappeRequest(`/api/method/frappe.core.doctype.data_import.data_import.get_import_status?data_import_name=${name}`);

    if (!res.ok) {
        const error = await res.json();
        let errorMessage = "Failed to get import status";
        if (error.message) {
            errorMessage = error.message;
        } else if (error.exception) {
            const colonIndex = error.exception.indexOf(':');
            errorMessage = colonIndex !== -1 ? error.exception.substring(colonIndex + 1).trim() : error.exception;
        }
        throw new Error(errorMessage);
    }

    return (await res.json()).message;
}

export async function getImportPreview(name: string) {
    const res = await frappeRequest(`/api/method/company.company.frontend_api.get_custom_import_preview?data_import_name=${name}`);

    if (!res.ok) {
        const error = await res.json();
        let errorMessage = "Failed to get import preview";
        if (error.message) {
            errorMessage = error.message;
        } else if (error.exception) {
            const colonIndex = error.exception.indexOf(':');
            errorMessage = colonIndex !== -1 ? error.exception.substring(colonIndex + 1).trim() : error.exception;
        }
        throw new Error(errorMessage);
    }

    return (await res.json()).message;
}

export async function getImportLogs(name: string) {
    const res = await frappeRequest(`/api/method/frappe.core.doctype.data_import.data_import.get_import_logs?data_import=${name}`);

    if (!res.ok) {
        const error = await res.json();
        let errorMessage = "Failed to get import logs";
        if (error.message) {
            errorMessage = error.message;
        } else if (error.exception) {
            const colonIndex = error.exception.indexOf(':');
            errorMessage = colonIndex !== -1 ? error.exception.substring(colonIndex + 1).trim() : error.exception;
        }
        throw new Error(errorMessage);
    }

    return (await res.json()).message;
}

export async function updateDataImport(name: string, data: any) {
    const res = await frappeRequest("/api/method/frappe.client.set_value", {
        method: "POST",
        body: JSON.stringify({
            doctype: "Data Import",
            name,
            fieldname: data
        })
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, "Failed to update data import"));
    }

    return (await res.json()).message;
}

export async function getDocFields(doctype: string) {
    const res = await frappeRequest(`/api/method/company.company.frontend_api.get_doc_fields?doctype=${doctype}`);

    if (!res.ok) {
        const error = await res.json();
        let errorMessage = `Failed to fetch ${doctype} fields`;
        if (error.message) {
            errorMessage = error.message;
        } else if (error.exception) {
            const colonIndex = error.exception.indexOf(':');
            errorMessage = colonIndex !== -1 ? error.exception.substring(colonIndex + 1).trim() : error.exception;
        }
        throw new Error(errorMessage);
    }

    return (await res.json()).message;
}

export function getTemplateUrl(doctype: string) {
    return `/api/method/company.company.frontend_api.download_import_template?doctype=${doctype}`;
}

export async function updateImportFile(name: string, data: any[][]) {
    const res = await frappeRequest(`/api/method/company.company.frontend_api.update_import_file`, {
        method: 'POST',
        body: JSON.stringify({
            data_import_name: name,
            data: JSON.stringify(data)
        }),
        credentials: "include"
    });

    return (await res.json()).message;
}

export async function getImportWarnings(name: string) {
    const res = await frappeRequest(`/api/method/frappe.client.get_value?doctype=Data Import&filters=${encodeURIComponent(JSON.stringify({ name }))}&fieldname=template_warnings`);

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.exception || error.message || "Failed to get import warnings");
    }

    const message = (await res.json()).message;
    return message?.template_warnings ? JSON.parse(message.template_warnings) : [];
}
