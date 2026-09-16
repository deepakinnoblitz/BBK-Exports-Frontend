import { frappeRequest, getAuthHeaders } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

import { fetchFrappeList } from './hr-management';

export interface Department {
    name: string;
    department_name: string;
    department_code?: string;
    department_head?: string;
    status: 'Active' | 'Inactive';
    description?: string;
}

export interface Project {
    name: string;
    project_name: string; // Display name
    status: string;
    customer?: string;
    department?: string;
    start_date?: string;
    end_date?: string;
    creation?: string;
    modified?: string;
}

export interface ActivityType {
    name: string;
    activity_type: string;
    billing_rate?: number;
    description?: string;
    creation?: string;
    modified?: string;
}

export interface BankAccount {
    name: string;
    bank_account_name: string;
    account_number: string;
    bank_name: string;
    branch?: string;
    ifsc_code?: string;
    account_type: 'Savings' | 'Current' | 'Salary Account' | 'Other';
    creation?: string;
    modified?: string;
}

export interface ClaimType {
    name: string;
    claim_type: string;
    creation?: string;
    modified?: string;
}

export interface BloodGroup {
    name: string;
    blood_group: string;
    creation?: string;
    modified?: string;
}

export interface Qualification {
    name: string;
    qualification: string;
    creation?: string;
    modified?: string;
}

export interface AssetCategory {
    name: string;
    category_name: string;
    description?: string;
    creation?: string;
    modified?: string;
}

export interface EvaluationTraitCategory {
    name: string;
    category_name: string;
    creation?: string;
    modified?: string;
}

export interface Designation {
    name: string;
    designation_name: string;
    designation_code?: string;
    department: string;
    level?: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Manager' | 'Director';
    status: 'Active' | 'Inactive';
    description?: string;
    creation?: string;
    modified?: string;
}

export interface HRDocumentCategoryMaster {
    name: string;
    category_name: string;
    is_active?: number | boolean;
    description?: string;
    creation?: string;
    modified?: string;
}

// Department APIs
export const fetchDepartments = (params: any) => {
    const { search, ...restParams } = params;

    const or_filters = search ? [
        ["Department", "department_name", "like", `%${search}%`],
        ["Department", "department_code", "like", `%${search}%`],
        ["Department", "department_head", "like", `%${search}%`],
    ] : undefined;

    return fetchFrappeList("Department", {
        ...restParams,
        search: undefined,
        or_filters
    });
};

export async function createDepartment(data: Partial<Department>) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Department", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create department"));
    return json.message;
}

export async function updateDepartment(name: string, data: Partial<Department>) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/frappe.client.set_value", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Department", name, fieldname: data })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update department"));
    return json.message;
}

export async function deleteDepartment(name: string) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Department", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete department"));
    return true;
}

export async function renameDepartment(oldName: string, newName: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.rename_doc", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doctype: "Department",
            old_name: oldName,
            new_name: newName,
            merge: false
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to rename department"));
    return json.message;
}

export async function getDepartment(name: string) {
    const res = await frappeRequest(`/api/method/frappe.client.get?doctype=Department&name=${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error("Failed to fetch department details");
    return (await res.json()).message;
}

// Project APIs
export const fetchProjects = (params: any) => {
    const { search, ...restParams } = params;

    const or_filters = search ? [
        ["Project", "project", "like", `%${search}%`],
        ["Project", "name", "like", `%${search}%`],
    ] : undefined;

    return fetchFrappeList("Project", {
        ...restParams,
        search: undefined,
        or_filters
    });
};

export async function createProject(data: Partial<Project>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Project", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create project"));
    return json.message;
}

export async function updateProject(name: string, data: Partial<Project>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.set_value", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Project", name, fieldname: data })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update project"));
    return json.message;
}

export async function deleteProject(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Project", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete project"));
    return true;
}

export async function renameProject(oldName: string, newName: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.rename_doc", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doctype: "Project",
            old_name: oldName,
            new_name: newName,
            merge: false
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to rename project"));
    return json.message;
}

export async function getProject(name: string) {
    const res = await frappeRequest(`/api/method/frappe.client.get?doctype=Project&name=${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error("Failed to fetch project details");
    return (await res.json()).message;
}

// Activity Type APIs
export const fetchActivityTypes = (params: any) => {
    const { search, ...restParams } = params;

    const or_filters = search ? [
        ["Activity Type", "name", "like", `%${search}%`],
        ["Activity Type", "activity_type", "like", `%${search}%`],
    ] : undefined;

    return fetchFrappeList("Activity Type", {
        ...restParams,
        search: undefined,
        or_filters
    });
};

export async function createActivityType(data: Partial<ActivityType>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Activity Type", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create activity type"));
    return json.message;
}

export async function updateActivityType(name: string, data: Partial<ActivityType>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.set_value", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Activity Type", name, fieldname: data })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update activity type"));
    return json.message;
}

export async function deleteActivityType(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Activity Type", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete activity type"));
    return true;
}

export async function renameActivityType(oldName: string, newName: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.rename_doc", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doctype: "Activity Type",
            old_name: oldName,
            new_name: newName,
            merge: false
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to rename activity type"));
    return json.message;
}

export async function getActivityType(name: string) {
    const res = await frappeRequest(`/api/method/frappe.client.get?doctype=Activity Type&name=${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error("Failed to fetch activity type details");
    return (await res.json()).message;
}

// Bank Account APIs
export const fetchBankAccounts = (params: any) => {
    const { search, ...restParams } = params;

    const or_filters = search ? [
        ["Bank Account", "bank_account_name", "like", `%${search}%`],
        ["Bank Account", "account_number", "like", `%${search}%`],
        ["Bank Account", "bank_name", "like", `%${search}%`],
    ] : undefined;

    return fetchFrappeList("Bank Account", {
        ...restParams,
        search: undefined,
        or_filters
    });
};

export async function createBankAccount(data: Partial<BankAccount>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Bank Account", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create bank account"));
    return json.message;
}

export async function updateBankAccount(name: string, data: Partial<BankAccount>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.set_value", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Bank Account", name, fieldname: data })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update bank account"));
    return json.message;
}

export async function deleteBankAccount(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Bank Account", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete bank account"));
    return true;
}

export async function renameBankAccount(oldName: string, newName: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.rename_doc", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doctype: "Bank Account",
            old_name: oldName,
            new_name: newName,
            merge: false
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to rename bank account"));
    return json.message;
}

export async function getBankAccount(name: string) {
    const res = await frappeRequest(`/api/method/frappe.client.get?doctype=Bank Account&name=${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error("Failed to fetch bank account details");
    return (await res.json()).message;
}

// Claim Type APIs
export const fetchClaimTypes = (params: any) => {
    const { search, ...restParams } = params;

    const or_filters = search ? [
        ["Claim Type", "claim_type", "like", `%${search}%`],
    ] : undefined;

    return fetchFrappeList("Claim Type", {
        ...restParams,
        search: undefined,
        or_filters
    });
};

export async function createClaimType(data: Partial<ClaimType>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Claim Type", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create claim type"));
    return json.message;
}

export async function updateClaimType(name: string, data: Partial<ClaimType>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.set_value", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Claim Type", name, fieldname: data })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update claim type"));
    return json.message;
}

export async function deleteClaimType(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Claim Type", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete claim type"));
    return true;
}

export async function renameClaimType(oldName: string, newName: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.rename_doc", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doctype: "Claim Type",
            old_name: oldName,
            new_name: newName,
            merge: false
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to rename claim type"));
    return json.message;
}

export async function getClaimType(name: string) {
    const res = await frappeRequest(`/api/method/frappe.client.get?doctype=Claim Type&name=${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error("Failed to fetch claim type details");
    return (await res.json()).message;
}
// Asset Category APIs
export const fetchAssetCategories = (params: any) => {
    const { search, ...restParams } = params;

    const or_filters = search ? [
        ["Asset Category", "category_name", "like", `%${search}%`],
    ] : undefined;

    return fetchFrappeList("Asset Category", {
        ...restParams,
        search: undefined,
        or_filters
    });
};

export async function createAssetCategory(data: Partial<AssetCategory>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Asset Category", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create asset category"));
    return json.message;
}

export async function updateAssetCategory(name: string, data: Partial<AssetCategory>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.set_value", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Asset Category", name, fieldname: data })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update asset category"));
    return json.message;
}

export async function deleteAssetCategory(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Asset Category", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete asset category"));
    return true;
}

export async function renameAssetCategory(oldName: string, newName: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.rename_doc", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doctype: "Asset Category",
            old_name: oldName,
            new_name: newName,
            merge: false
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to rename asset category"));
    return json.message;
}

export async function getAssetCategory(name: string) {
    const res = await frappeRequest(`/api/method/frappe.client.get?doctype=Asset Category&name=${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error("Failed to fetch asset category details");
    return (await res.json()).message;
}

// Evaluation Trait Category APIs
export const fetchEvaluationTraitCategories = (params: any) => {
    const { search, ...restParams } = params;

    const or_filters = search ? [
        ["Evaluation Trait Category", "category_name", "like", `%${search}%`],
    ] : undefined;

    return fetchFrappeList("Evaluation Trait Category", {
        ...restParams,
        search: undefined,
        or_filters
    });
};

export async function createEvaluationTraitCategory(data: Partial<EvaluationTraitCategory>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Evaluation Trait Category", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create evaluation trait category"));
    return json.message;
}

export async function updateEvaluationTraitCategory(name: string, data: Partial<EvaluationTraitCategory>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.set_value", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Evaluation Trait Category", name, fieldname: data })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update evaluation trait category"));
    return json.message;
}

export async function deleteEvaluationTraitCategory(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Evaluation Trait Category", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete evaluation trait category"));
    return true;
}

export async function renameEvaluationTraitCategory(oldName: string, newName: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.rename_doc", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doctype: "Evaluation Trait Category",
            old_name: oldName,
            new_name: newName,
            merge: false
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to rename evaluation trait category"));
    return json.message;
}

export async function getEvaluationTraitCategory(name: string) {
    const res = await frappeRequest(`/api/method/frappe.client.get?doctype=Evaluation Trait Category&name=${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error("Failed to fetch evaluation trait category details");
    return (await res.json()).message;
}

// Designation APIs
export const fetchDesignations = (params: any) => {
    const { search, ...restParams } = params;

    const or_filters = search ? [
        ["Designation", "designation_name", "like", `%${search}%`],
        ["Designation", "department", "like", `%${search}%`],
    ] : undefined;

    return fetchFrappeList("Designation", {
        ...restParams,
        search: undefined,
        or_filters
    });
};

export async function createDesignation(data: Partial<Designation>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Designation", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create designation"));
    return json.message;
}

export async function updateDesignation(name: string, data: Partial<Designation>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.set_value", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Designation", name, fieldname: data })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update designation"));
    return json.message;
}

export async function deleteDesignation(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Designation", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete designation"));
    return true;
}

export async function renameDesignation(oldName: string, newName: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.rename_doc", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doctype: "Designation",
            old_name: oldName,
            new_name: newName,
            merge: false
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to rename designation"));
    return json.message;
}

export async function getDesignation(name: string) {
    const res = await frappeRequest(`/api/method/frappe.client.get?doctype=Designation&name=${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error("Failed to fetch designation details");
    return (await res.json()).message;
}

export interface SalaryStructureComponent {
    name: string;
    component_name: string;
    type?: 'Earning' | 'Deduction';
    is_default?: number;
    percentage?: number;
    static_amount?: number;
    creation?: string;
    modified?: string;
}

// Salary Structure Component APIs
export const fetchSalaryStructureComponents = (params: any) => {
    const { search, ...restParams } = params;

    const or_filters = search ? [
        ["Salary Structure Component", "component_name", "like", `%${search}%`],
    ] : undefined;

    return fetchFrappeList("Salary Structure Component", {
        ...restParams,
        search: undefined,
        or_filters
    });
};

export async function createSalaryStructureComponent(data: Partial<SalaryStructureComponent>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Salary Structure Component", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create salary structure component"));
    return json.message;
}

export async function updateSalaryStructureComponent(name: string, data: Partial<SalaryStructureComponent>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.set_value", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Salary Structure Component", name, fieldname: data })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update salary structure component"));
    return json.message;
}

export async function deleteSalaryStructureComponent(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Salary Structure Component", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete salary structure component"));
    return true;
}

export async function getSalaryStructureComponent(name: string) {
    const res = await frappeRequest(`/api/method/frappe.client.get?doctype=Salary Structure Component&name=${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error("Failed to fetch salary structure component details");
    return (await res.json()).message;
}

export interface LeaveType {
    name: string;
    leave_type_name: string;
    is_paid?: number;
    max_leaves?: number;
    status?: 'Active' | 'Inactive';
    carry_forward?: number;
    reset_frequency?: 'Every 3 months' | 'Every 4 months' | 'Every 6 months' | 'Whole year';
    restrict_during_probation?: number;
    probation_period_months?: number;
    creation?: string;
    modified?: string;
}

// Leave Type APIs
export const fetchLeaveTypes = (params: any) => {
    const { search, ...restParams } = params;

    const or_filters = search ? [
        ["Leave Type", "leave_type_name", "like", `%${search}%`],
    ] : undefined;

    return fetchFrappeList("Leave Type", {
        ...restParams,
        search: undefined,
        or_filters
    });
};

export async function createLeaveType(data: Partial<LeaveType>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Leave Type", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create leave type"));
    return json.message;
}

export async function updateLeaveType(name: string, data: Partial<LeaveType>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.set_value", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Leave Type", name, fieldname: data })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update leave type"));
    return json.message;
}

export interface LeadFrom {
    name: string;
    lead_from: string;
    creation?: string;
    modified?: string;
}

// Lead From APIs
export const fetchLeadFroms = (params: any) => {
    const { search, ...restParams } = params;

    const or_filters = search ? [
        ["Lead From", "lead_from", "like", `%${search}%`],
        ["Lead From", "name", "like", `%${search}%`],
    ] : undefined;

    return fetchFrappeList("Lead From", {
        ...restParams,
        search: undefined,
        or_filters,
        fields: ["name", "lead_from", "modified", "creation"]
    });
};

export async function createLeadFrom(data: Partial<LeadFrom>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Lead From", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create lead source"));
    return json.message;
}

export async function updateLeadFrom(name: string, data: Partial<LeadFrom>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(`/api/resource/Lead From/${encodeURIComponent(name)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update lead source"));
    return json.data || json.message;
}

export async function renameLeadFrom(oldName: string, newName: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.rename_doc", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doctype: "Lead From",
            old_name: oldName,
            new_name: newName,
            merge: false
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to rename lead from"));

    // Touch the renamed document using frappe.client.set_value to update `modified` timestamp
    try {
        const touchRes = await frappeRequest("/api/method/frappe.client.set_value", {
            method: "POST",
            headers,
            body: JSON.stringify({
                doctype: "Lead From",
                name: newName,
                fieldname: { lead_from: newName }
            })
        });
        if (!touchRes.ok) {
            console.error("Failed to touch Lead From after rename");
        }
    } catch (touchErr) {
        console.error("Error touching Lead From after rename:", touchErr);
    }

    return json.message;
}

export async function deleteLeadFrom(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Lead From", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete lead source"));
    return true;
}

export interface CompanyBankAccount {
    name: string;
    bank_name: string;
    account_holder_name?: string;
    account_no?: string;
    ifsc_code?: string;
    upi_id?: string;
    status?: 'Active' | 'Inactive';
    creation?: string;
    modified?: string;
}

// Company Bank Account APIs
export const fetchCompanyBankAccounts = (params: any) => {
    const { search, ...restParams } = params;

    const or_filters = search ? [
        ["Company Bank Account", "bank_name", "like", `%${search}%`],
        ["Company Bank Account", "account_no", "like", `%${search}%`],
        ["Company Bank Account", "ifsc_code", "like", `%${search}%`],
        ["Company Bank Account", "account_holder_name", "like", `%${search}%`],
        ["Company Bank Account", "name", "like", `%${search}%`],
    ] : undefined;

    return fetchFrappeList("Company Bank Account", {
        ...restParams,
        search: undefined,
        or_filters,
        fields: ["name", "bank_name", "account_holder_name", "account_no", "ifsc_code", "upi_id", "status", "modified", "creation"]
    });
};

export async function createCompanyBankAccount(data: Partial<CompanyBankAccount>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Company Bank Account", status: "Active", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create company bank account"));
    return json.message;
}

export async function updateCompanyBankAccount(name: string, data: Partial<CompanyBankAccount>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.set_value", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Company Bank Account", name, fieldname: data })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update company bank account"));
    return json.message;
}

export async function deleteCompanyBankAccount(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Company Bank Account", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete company bank account"));
    return true;
}

export async function getCompanyBankAccount(name: string) {
    const res = await frappeRequest(`/api/method/frappe.client.get?doctype=Company Bank Account&name=${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error("Failed to fetch company bank account details");
    return (await res.json()).message;
}

export interface Service {
    name: string;
    service_id: string;
    service_name: string;
    creation?: string;
    modified?: string;
}

// Service APIs
export const fetchServices = (params: any) => {
    const { search, ...restParams } = params;

    const or_filters = search ? [
        ["Service", "service_name", "like", `%${search}%`],
        ["Service", "service_id", "like", `%${search}%`],
        ["Service", "name", "like", `%${search}%`],
    ] : undefined;

    return fetchFrappeList("Service", {
        ...restParams,
        search: undefined,
        or_filters,
        fields: ["name", "service_name", "service_id", "modified", "creation"]
    });
};

export async function createService(data: Partial<Service>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Service", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create service"));
    return json.message;
}

export async function updateService(name: string, data: Partial<Service>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(`/api/resource/Service/${encodeURIComponent(name)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update service"));
    return json.data || json.message;
}

export async function renameService(oldName: string, newName: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.rename_doc", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doctype: "Service",
            old_name: oldName,
            new_name: newName,
            merge: false
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to rename service"));

    // Touch the renamed document using frappe.client.set_value to update `modified` timestamp
    try {
        const touchRes = await frappeRequest("/api/method/frappe.client.set_value", {
            method: "POST",
            headers,
            body: JSON.stringify({
                doctype: "Service",
                name: newName,
                fieldname: { service_name: newName }
            })
        });
        if (!touchRes.ok) {
            console.error("Failed to touch Service after rename");
        }
    } catch (touchErr) {
        console.error("Error touching Service after rename:", touchErr);
    }

    return json.message;
}

export async function deleteService(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Service", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete service"));
    return true;
}

export async function deleteLeaveType(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Leave Type", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete leave type"));
    return true;
}

export async function renameLeaveType(oldName: string, newName: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.rename_doc", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doctype: "Leave Type",
            old_name: oldName,
            new_name: newName,
            merge: false
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to rename leave type"));
    return json.message;
}

export async function getLeaveType(name: string) {
    const res = await frappeRequest(`/api/method/frappe.client.get?doctype=Leave Type&name=${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error("Failed to fetch leave type details");
    return (await res.json()).message;
}

export interface Item {
    name: string;
    item_code: string; // HSN Code
    item_name: string;
    rate: number;
    creation?: string;
    modified?: string;
}

// Item APIs
export const fetchItems = async (params: any) => {
    const { search, ...restParams } = params;

    const or_filters = search ? [
        ["Item", "item_name", "like", `%${search}%`],
        ["Item", "item_code", "like", `%${search}%`],
    ] : undefined;

    let orderByParam = "modified desc";
    if (params.orderBy) {
        if (params.order) {
            orderByParam = `${params.orderBy} ${params.order}`;
        } else {
            orderByParam = `${params.orderBy} desc`;
        }
    }

    const query = new URLSearchParams({
        fields: JSON.stringify(["name", "item_code", "item_name", "rate", "modified", "creation"]),
        filters: JSON.stringify([]),
        or_filters: or_filters ? JSON.stringify(or_filters) : "[]",
        limit_start: String((params.page - 1) * params.page_size),
        limit_page_length: String(params.page_size),
        order_by: orderByParam,
        _: String(Date.now())
    });

    const [res, countRes] = await Promise.all([
        frappeRequest(`/api/resource/Item?${query.toString()}`),
        frappeRequest(`/api/method/company.company.frontend_api.get_permitted_count?doctype=Item&filters=${encodeURIComponent(JSON.stringify([]))}&or_filters=${or_filters ? encodeURIComponent(JSON.stringify(or_filters)) : "[]"}`)
    ]);

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, "Failed to fetch items"));
    }

    const data = await res.json();
    const countData = await countRes.json();

    return {
        data: data.data || [],
        total: countData.message || 0
    };
};

export async function createItem(data: Partial<Item>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/resource/Item", {
        method: "POST",
        headers,
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create item"));
    return json.data || json.message;
}

export async function updateItem(name: string, data: Partial<Item>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(`/api/resource/Item/${encodeURIComponent(name)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update item"));
    return json.data || json.message;
}

export async function deleteItem(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(`/api/resource/Item/${encodeURIComponent(name)}`, {
        method: "DELETE",
        headers
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete item"));
    return true;
}

export interface PaymentTerm {
    name: string;
    payment_terms: string;
    creation?: string;
    modified?: string;
}

// Payment Terms APIs
export const fetchPaymentTerms = async (params: any) => {
    const { search } = params;

    const or_filters = search ? [
        ["Payment Terms", "payment_terms", "like", `%${search}%`],
    ] : undefined;

    let orderByParam = "modified desc";
    if (params.orderBy) {
        if (params.order) {
            orderByParam = `${params.orderBy} ${params.order}`;
        } else {
            orderByParam = `${params.orderBy} desc`;
        }
    }

    const query = new URLSearchParams({
        fields: JSON.stringify(["name", "payment_terms", "modified", "creation"]),
        filters: JSON.stringify([]),
        or_filters: or_filters ? JSON.stringify(or_filters) : "[]",
        limit_start: String((params.page - 1) * params.page_size),
        limit_page_length: String(params.page_size),
        order_by: orderByParam,
        _: String(Date.now())
    });

    const [res, countRes] = await Promise.all([
        frappeRequest(`/api/resource/Payment Terms?${query.toString()}`),
        frappeRequest(`/api/method/company.company.frontend_api.get_permitted_count?doctype=Payment Terms&filters=${encodeURIComponent(JSON.stringify([]))}&or_filters=${or_filters ? encodeURIComponent(JSON.stringify(or_filters)) : "[]"}`)
    ]);

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, "Failed to fetch payment terms"));
    }

    const data = await res.json();
    const countData = await countRes.json();

    return {
        data: data.data || [],
        total: countData.message || 0
    };
};

export async function createPaymentTerm(data: Partial<PaymentTerm>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/resource/Payment Terms", {
        method: "POST",
        headers,
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create payment term"));
    return json.data || json.message;
}

export async function updatePaymentTerm(name: string, data: Partial<PaymentTerm>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(`/api/resource/Payment Terms/${encodeURIComponent(name)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update payment term"));
    return json.data || json.message;
}

export async function deletePaymentTerm(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(`/api/resource/Payment Terms/${encodeURIComponent(name)}`, {
        method: "DELETE",
        headers
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete payment term"));
    return true;
}

export interface PaymentType {
    name: string;
    payment_type: string;
    creation?: string;
    modified?: string;
}

export interface TaxType {
    name: string;
    tax_name: string;
    tax_percentage?: number;
    tax_type: 'GST' | 'IGST';
    status: 'Active' | 'Inactive';
    creation?: string;
    modified?: string;
}

// Tax Types APIs
export const fetchTaxTypesCustom = async (params: any) => {
    const { search } = params;

    const or_filters = search ? [
        ["Tax Types", "tax_name", "like", `%${search}%`],
        ["Tax Types", "tax_type", "like", `%${search}%`],
    ] : undefined;

    let orderByParam = "modified desc";
    if (params.orderBy) {
        if (params.order) {
            orderByParam = `${params.orderBy} ${params.order}`;
        } else {
            orderByParam = `${params.orderBy} desc`;
        }
    }

    const query = new URLSearchParams({
        fields: JSON.stringify(["name", "tax_name", "tax_percentage", "tax_type", "status", "modified", "creation"]),
        filters: JSON.stringify([]),
        or_filters: or_filters ? JSON.stringify(or_filters) : "[]",
        limit_start: String((params.page - 1) * params.page_size),
        limit_page_length: String(params.page_size),
        order_by: orderByParam,
        _: String(Date.now())
    });

    const [res, countRes] = await Promise.all([
        frappeRequest(`/api/resource/Tax Types?${query.toString()}`),
        frappeRequest(`/api/method/company.company.frontend_api.get_permitted_count?doctype=Tax Types&filters=${encodeURIComponent(JSON.stringify([]))}&or_filters=${or_filters ? encodeURIComponent(JSON.stringify(or_filters)) : "[]"}`)
    ]);

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, "Failed to fetch tax types"));
    }

    const data = await res.json();
    const countData = await countRes.json();

    return {
        data: data.data || [],
        total: countData.message || 0
    };
};

export async function createTaxTypeCustom(data: Partial<TaxType>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/resource/Tax Types", {
        method: "POST",
        headers,
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create tax type"));
    return json.data || json.message;
}

export async function updateTaxTypeCustom(name: string, data: Partial<TaxType>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(`/api/resource/Tax Types/${encodeURIComponent(name)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update tax type"));
    return json.data || json.message;
}

export async function deleteTaxTypeCustom(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(`/api/resource/Tax Types/${encodeURIComponent(name)}`, {
        method: "DELETE",
        headers
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete tax type"));
    return true;
}

// Payment Type APIs
export const fetchPaymentTypesCustom = async (params: any) => {
    const { search } = params;

    const or_filters = search ? [
        ["Payment Type", "payment_type", "like", `%${search}%`],
    ] : undefined;

    let orderByParam = "modified desc";
    if (params.orderBy) {
        if (params.order) {
            orderByParam = `${params.orderBy} ${params.order}`;
        } else {
            orderByParam = `${params.orderBy} desc`;
        }
    }

    const query = new URLSearchParams({
        fields: JSON.stringify(["name", "payment_type", "modified", "creation"]),
        filters: JSON.stringify([]),
        or_filters: or_filters ? JSON.stringify(or_filters) : "[]",
        limit_start: String((params.page - 1) * params.page_size),
        limit_page_length: String(params.page_size),
        order_by: orderByParam,
        _: String(Date.now())
    });

    const [res, countRes] = await Promise.all([
        frappeRequest(`/api/resource/Payment Type?${query.toString()}`),
        frappeRequest(`/api/method/company.company.frontend_api.get_permitted_count?doctype=Payment Type&filters=${encodeURIComponent(JSON.stringify([]))}&or_filters=${or_filters ? encodeURIComponent(JSON.stringify(or_filters)) : "[]"}`)
    ]);

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, "Failed to fetch payment types"));
    }

    const data = await res.json();
    const countData = await countRes.json();

    return {
        data: data.data || [],
        total: countData.message || 0
    };
};

export async function createPaymentTypeCustom(data: Partial<PaymentType>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/resource/Payment Type", {
        method: "POST",
        headers,
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create payment type"));
    return json.data || json.message;
}

export async function updatePaymentTypeCustom(name: string, data: Partial<PaymentType>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(`/api/resource/Payment Type/${encodeURIComponent(name)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update payment type"));
    return json.data || json.message;
}

export async function deletePaymentTypeCustom(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(`/api/resource/Payment Type/${encodeURIComponent(name)}`, {
        method: "DELETE",
        headers
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete payment type"));
    return true;
}

export interface CrmEmailTemplateCategory {
    name: string;
    category: string;
    creation?: string;
    modified?: string;
}

// CRM Email Template Category APIs
export const fetchCrmEmailTemplateCategories = (params: any) => {
    const { search, ...restParams } = params;

    const or_filters = search ? [
        ["CRM Email Template Category", "category", "like", `%${search}%`],
        ["CRM Email Template Category", "name", "like", `%${search}%`],
    ] : undefined;

    return fetchFrappeList("CRM Email Template Category", {
        ...restParams,
        search: undefined,
        or_filters,
        fields: ["name", "category", "modified", "creation"]
    });
};

export async function createCrmEmailTemplateCategory(data: Partial<CrmEmailTemplateCategory>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "CRM Email Template Category", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create email template category"));
    return json.message;
}

export async function updateCrmEmailTemplateCategory(name: string, data: Partial<CrmEmailTemplateCategory>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(`/api/resource/CRM Email Template Category/${encodeURIComponent(name)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update email template category"));
    return json.data || json.message;
}

export async function renameCrmEmailTemplateCategory(oldName: string, newName: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.rename_doc", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doctype: "CRM Email Template Category",
            old_name: oldName,
            new_name: newName,
            merge: false
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to rename email template category"));

    try {
        const touchRes = await frappeRequest("/api/method/frappe.client.set_value", {
            method: "POST",
            headers,
            body: JSON.stringify({
                doctype: "CRM Email Template Category",
                name: newName,
                fieldname: { category: newName }
            })
        });
        if (!touchRes.ok) {
            console.error("Failed to touch CRM Email Template Category after rename");
        }
    } catch (touchErr) {
        console.error("Error touching CRM Email Template Category after rename:", touchErr);
    }

    return json.message;
}

export async function deleteCrmEmailTemplateCategory(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "CRM Email Template Category", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete email template category"));
    return true;
}

export interface CrmWhatsAppTemplateCategory {
    name: string;
    category: string;
    creation?: string;
    modified?: string;
}

// CRM WhatsApp Template Category APIs
export const fetchCrmWhatsAppTemplateCategories = (params: any) => {
    const { search, ...restParams } = params;

    const or_filters = search ? [
        ["CRM WhatsApp Template Category", "category", "like", `%${search}%`],
        ["CRM WhatsApp Template Category", "name", "like", `%${search}%`],
    ] : undefined;

    return fetchFrappeList("CRM WhatsApp Template Category", {
        ...restParams,
        search: undefined,
        or_filters,
        fields: ["name", "category", "modified", "creation"]
    });
};

export async function createCrmWhatsAppTemplateCategory(data: Partial<CrmWhatsAppTemplateCategory>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "CRM WhatsApp Template Category", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create whatsapp template category"));
    return json.message;
}

export async function updateCrmWhatsAppTemplateCategory(name: string, data: Partial<CrmWhatsAppTemplateCategory>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(`/api/resource/CRM WhatsApp Template Category/${encodeURIComponent(name)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update whatsapp template category"));
    return json.data || json.message;
}

export async function renameCrmWhatsAppTemplateCategory(oldName: string, newName: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.rename_doc", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doctype: "CRM WhatsApp Template Category",
            old_name: oldName,
            new_name: newName,
            merge: false
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to rename whatsapp template category"));

    try {
        const touchRes = await frappeRequest("/api/method/frappe.client.set_value", {
            method: "POST",
            headers,
            body: JSON.stringify({
                doctype: "CRM WhatsApp Template Category",
                name: newName,
                fieldname: { category: newName }
            })
        });
        if (!touchRes.ok) {
            console.error("Failed to touch CRM WhatsApp Template Category after rename");
        }
    } catch (touchErr) {
        console.error("Error touching CRM WhatsApp Template Category after rename:", touchErr);
    }

    return json.message;
}

export async function deleteCrmWhatsAppTemplateCategory(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "CRM WhatsApp Template Category", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete whatsapp template category"));
    return true;
}

export interface CallStatus {
    name: string;
    call_status: string;
    status: 'Active' | 'Inactive';
    creation?: string;
    modified?: string;
}

// Call Status APIs
export const fetchCallStatuses = (params: any) => {
    const { search, ...restParams } = params;

    const or_filters = search ? [
        ["Call Status", "call_status", "like", `%${search}%`],
        ["Call Status", "name", "like", `%${search}%`],
    ] : undefined;

    return fetchFrappeList("Call Status", {
        ...restParams,
        search: undefined,
        or_filters,
        fields: ["name", "call_status", "status", "modified", "creation"]
    });
};

export async function createCallStatus(data: Partial<CallStatus>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Call Status", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create Call Status"));
    return json.message;
}

export async function updateCallStatus(name: string, data: Partial<CallStatus>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(`/api/resource/Call Status/${encodeURIComponent(name)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update Call Status"));
    return json.data || json.message;
}

export async function renameCallStatus(oldName: string, newName: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.rename_doc", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doctype: "Call Status",
            old_name: oldName,
            new_name: newName,
            merge: false
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to rename Call Status"));

    try {
        const touchRes = await frappeRequest("/api/method/frappe.client.set_value", {
            method: "POST",
            headers,
            body: JSON.stringify({
                doctype: "Call Status",
                name: newName,
                fieldname: { call_status: newName }
            })
        });
        if (!touchRes.ok) {
            console.error("Failed to touch Call Status after rename");
        }
    } catch (touchErr) {
        console.error("Error touching Call Status after rename:", touchErr);
    }

    return json.message;
}

export async function deleteCallStatus(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Call Status", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete Call Status"));
    return true;
}

export interface MeetingStatus {
    name: string;
    meeting_status: string;
    status: 'Active' | 'Inactive';
    creation?: string;
    modified?: string;
}

// Meeting Status APIs
export const fetchMeetingStatuses = (params: any) => {
    const { search, ...restParams } = params;

    const or_filters = search ? [
        ["Meeting Status", "meeting_status", "like", `%${search}%`],
        ["Meeting Status", "name", "like", `%${search}%`],
    ] : undefined;

    return fetchFrappeList("Meeting Status", {
        ...restParams,
        search: undefined,
        or_filters
    });
};

export async function createMeetingStatus(data: Partial<MeetingStatus>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Meeting Status", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create Meeting Status"));
    return json.data || json.message;
}

export async function updateMeetingStatus(name: string, data: Partial<MeetingStatus>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.set_value", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Meeting Status", name, fieldname: data })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update Meeting Status"));
    return json.data || json.message;
}

export async function renameMeetingStatus(oldName: string, newName: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.rename_doc", {
        method: "POST",
        headers,
        body: JSON.stringify({
            doctype: "Meeting Status",
            old_name: oldName,
            new_name: newName,
            merge: false
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to rename Meeting Status"));

    try {
        const touchRes = await frappeRequest("/api/method/frappe.client.set_value", {
            method: "POST",
            headers,
            body: JSON.stringify({
                doctype: "Meeting Status",
                name: newName,
                fieldname: { meeting_status: newName }
            })
        });
        if (!touchRes.ok) {
            console.error("Failed to touch Meeting Status after rename");
        }
    } catch (touchErr) {
        console.error("Error touching Meeting Status after rename:", touchErr);
    }

    return json.message;
}

export async function deleteMeetingStatus(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Meeting Status", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete Meeting Status"));
    return true;
}

export async function createBloodGroup(data: Partial<BloodGroup>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Blood Group", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create blood group"));
    return json.message;
}

export const fetchBloodGroups = (params: any) => {
    const { search, ...restParams } = params;

    const or_filters = search ? [
        ["Blood Group", "blood_group", "like", `%${search}%`],
        ["Blood Group", "name", "like", `%${search}%`],
    ] : undefined;

    return fetchFrappeList("Blood Group", {
        ...restParams,
        search: undefined,
        or_filters
    });
};

export async function updateBloodGroup(name: string, data: Partial<BloodGroup>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.set_value", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Blood Group", name, fieldname: data })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update blood group"));
    return json.message;
}

export async function deleteBloodGroup(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Blood Group", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete blood group"));
    return true;
}

export async function getBloodGroup(name: string) {
    const res = await frappeRequest(`/api/method/frappe.client.get?doctype=Blood Group&name=${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error("Failed to fetch blood group details");
    return (await res.json()).message;
}

// HR Document Category Master APIs
export const fetchHRDocumentCategoriesMaster = (params: any) => {
    const { search, ...restParams } = params;

    const or_filters = search ? [
        ["HR Document Category", "category_name", "like", `%${search}%`],
        ["HR Document Category", "description", "like", `%${search}%`],
    ] : undefined;

    return fetchFrappeList("HR Document Category", {
        ...restParams,
        search: undefined,
        or_filters,
        fields: ["name", "category_name", "is_active", "description", "creation", "modified"]
    });
};

export async function createHRDocumentCategoryMaster(data: Partial<HRDocumentCategoryMaster>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "HR Document Category", is_active: 1, ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create HR document category"));
    return json.message;
}

export async function updateHRDocumentCategoryMaster(name: string, data: Partial<HRDocumentCategoryMaster>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.set_value", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "HR Document Category", name, fieldname: data })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update HR document category"));
    return json.message;
}

export async function renameHRDocumentCategoryMaster(oldName: string, newName: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.rename_doc", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "HR Document Category", old_name: oldName, new_name: newName })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to rename HR document category"));
    return json.message;
}

export async function deleteHRDocumentCategoryMaster(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "HR Document Category", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete HR document category"));
    return true;
}

export async function getHRDocumentCategoryMaster(name: string): Promise<HRDocumentCategoryMaster> {
    const res = await frappeRequest(`/api/method/frappe.client.get?doctype=HR Document Category&name=${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error("Failed to fetch HR document category details");
    return (await res.json()).message;
}

// Qualification Master APIs
export const fetchQualifications = (params: any) => {
    const { search, ...restParams } = params;

    const or_filters = search ? [
        ["Qualification", "qualification", "like", `%${search}%`],
        ["Qualification", "name", "like", `%${search}%`],
    ] : undefined;

    return fetchFrappeList("Qualification", {
        ...restParams,
        search: undefined,
        or_filters
    });
};

export async function createQualification(data: Partial<Qualification>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Qualification", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create qualification"));
    return json.message;
}

export async function updateQualification(name: string, data: Partial<Qualification>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.set_value", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Qualification", name, fieldname: data })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to update qualification"));
    return json.message;
}

export async function deleteQualification(name: string) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ doctype: "Qualification", name })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to delete qualification"));
    return true;
}

export async function getQualification(name: string) {
    const res = await frappeRequest(`/api/method/frappe.client.get?doctype=Qualification&name=${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error("Failed to fetch qualification details");
    return (await res.json()).message;
}

// Line Order APIs
export interface LineOrder {
    name: string;
    line_name: string;
    status?: string;
    description?: string;
}

export async function createLineOrder(data: Partial<LineOrder>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Line Order", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create line order"));
    return json.message;
}

// Shift APIs
export interface Shift {
    name: string;
    shift_name: string;
    start_time?: string;
    end_time?: string;
    status?: string;
    description?: string;
}

export async function createShift(data: Partial<Shift>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Shift", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create shift"));
    return json.message;
}

// Bus Travel Route APIs
export interface BusTravelRoute {
    name: string;
    route_name: string;
    bus_number?: string;
    driver_contact?: string;
    status?: string;
    description?: string;
}

export async function createBusTravelRoute(data: Partial<BusTravelRoute>) {
    const headers = await getAuthHeaders();
    const res = await frappeRequest("/api/method/frappe.client.insert", {
        method: "POST",
        headers,
        body: JSON.stringify({ doc: { doctype: "Bus Travel Route", ...data } })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(handleFrappeError(json, "Failed to create bus travel route"));
    return json.message;
}



