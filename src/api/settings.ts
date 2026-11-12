import { frappeRequest } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

import { getHRDoc } from './hr-management';

export type AppBranding = {
    app_logo: string;
    company_name: string;
};

export async function getAppBranding(): Promise<AppBranding | null> {
    try {
        const res = await fetch(
            `/api/method/company.company.frontend_api.get_app_branding?_=${Date.now()}`,
            {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store',
            }
        );

        if (!res.ok) {
            return null;
        }

        const json = await res.json();
        const message = json?.message;
        if (!message || typeof message !== 'object') {
            return null;
        }

        return {
            app_logo: typeof message.app_logo === 'string' ? message.app_logo : '',
            company_name: typeof message.company_name === 'string' ? message.company_name : '',
        };
    } catch (error) {
        console.error('Failed to fetch public app branding:', error);
        return null;
    }
}

export async function getHRMSSettings() {
    try {
        const settings = await getHRDoc('HRMS Settings', 'HRMS Settings');
        return settings;
    } catch (error) {
        console.error('Failed to fetch HRMS Settings:', error);
        return null;
    }
}

export async function updateHRMSSettings(data: any) {
    const {
        modified,
        creation,
        owner,
        modified_by,
        doctype,
        name,
        _user_tags,
        _comments,
        _assign,
        _liked_by,
        ...cleanData
    } = data || {};

    const res = await frappeRequest("/api/method/frappe.client.set_value", {
        method: "POST",
        body: JSON.stringify({
            doctype: "HRMS Settings",
            name: "HRMS Settings",
            fieldname: cleanData,
        })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update HRMS Settings"));
    return json.message;
}
