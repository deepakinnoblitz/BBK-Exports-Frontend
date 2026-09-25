import { frappeRequest, getAuthHeaders } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

import { handleResponse } from './utils';

export interface TaskAssignee {
    name: string;
    employee: string;
    employee_name: string;
    user?: string;
    profile_pic?: string;
}

export interface TaskHistory {
    name: string;
    event: 'Closed' | 'Reopened' | 'Accepted' | 'Submitted for Review' | 'On Hold' | 'Resumed';
    done_by: string;
    done_on: string;
    hours_spent?: string;
    remarks?: string;
    closing_attachment?: string;
}

export interface TaskManager {
    name: string;
    title: string;
    project?: string;
    department?: string;
    fetch_from_department?: number;
    due_date?: string;
    due_time?: string;
    estimated_time?: number;
    priority: 'Low' | 'Medium' | 'High';
    status: 'Open' | 'In Progress' | 'Completed' | 'Reopened' | 'On Hold';
    tag_member?: string;
    attachment_required?: number;
    recurring_task?: number;
    recurring_frequency?: string;
    description?: string;
    owner: string;
    creation: string;
    modified: string;
    closed_by?: string;
    closed_on?: string;
    assignees?: TaskAssignee[];
    history?: TaskHistory[];
}

export async function fetchTaskManagerList(filters: any[] = []): Promise<TaskManager[]> {
    const query = new URLSearchParams({
        doctype: "Task Manager",
        fields: JSON.stringify(["*"]),
        filters: JSON.stringify(filters),
        limit_page_length: "1000",
        order_by: "creation desc"
    });

    const res = await frappeRequest(`/api/method/frappe.client.get_list?${query.toString()}`);
    const data = await handleResponse(res);
    const tasks: TaskManager[] = data.message || [];

    if (tasks.length > 0) {
        try {
            const taskNames = tasks.map(t => t.name);
            const assigneeRes = await frappeRequest(`/api/method/company.company.doctype.task_manager.task_manager.get_assignees?task_names=${JSON.stringify(taskNames)}`);
            const assigneeData = await handleResponse(assigneeRes);
            const allAssignees = assigneeData.message || [];

            // Group assignees by parent task
            const assigneesByTask: Record<string, TaskAssignee[]> = {};
            allAssignees.forEach((a: any) => {
                if (!assigneesByTask[a.parent]) {
                    assigneesByTask[a.parent] = [];
                }
                assigneesByTask[a.parent].push({
                    name: a.name,
                    employee: a.employee,
                    employee_name: a.employee_name,
                    user: a.user,
                    profile_pic: a.profile_pic
                });
            });

            // Attach assignees to tasks
            tasks.forEach(task => {
                task.assignees = assigneesByTask[task.name] || [];
            });

            // Fetch histories for tasks
            const historyRes = await frappeRequest(`/api/method/company.company.doctype.task_manager.task_manager.get_task_histories?task_names=${JSON.stringify(taskNames)}`);
            const historyData = await handleResponse(historyRes);
            const allHistories = historyData.message || [];

            // Group histories by parent task
            const historiesByTask: Record<string, TaskHistory[]> = {};
            allHistories.forEach((h: any) => {
                if (!historiesByTask[h.parent]) {
                    historiesByTask[h.parent] = [];
                }
                historiesByTask[h.parent].push(h);
            });

            // Attach histories to tasks
            tasks.forEach(task => {
                task.history = historiesByTask[task.name] || [];
            });
        } catch (error) {
            console.error("Failed to fetch related data for task list:", error);
        }
    }

    return tasks;
}

export async function getEmployeesFromDepartment(department: string): Promise<TaskAssignee[]> {
    const res = await frappeRequest(`/api/method/company.company.doctype.task_manager.task_manager.get_employees_from_department?department=${encodeURIComponent(department)}`);
    const data = await handleResponse(res);
    return data.message || [];
}

export async function getTaskManager(name: string): Promise<TaskManager> {
    const res = await frappeRequest(`/api/method/frappe.client.get?doctype=Task Manager&name=${name}`);
    const data = await handleResponse(res);
    return data.message;
}

export async function createTaskManager(data: Partial<TaskManager>): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(`/api/method/frappe.client.insert`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            doc: {
                doctype: "Task Manager",
                ...data
            }
        })
    });

    if (!res.ok) {
        const json = await res.json();
        throw new Error(handleFrappeError(json, "Failed to create task"));
    }
}

export async function updateTaskStatus(name: string, status: string): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(`/api/method/frappe.client.set_value`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            doctype: "Task Manager",
            name,
            fieldname: "status",
            value: status
        })
    });

    if (!res.ok) {
        const json = await res.json();
        throw new Error(handleFrappeError(json, "Failed to update task status"));
    }
}

export async function updateTaskManager(name: string, data: Partial<TaskManager>): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(`/api/method/frappe.client.set_value`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            doctype: "Task Manager",
            name,
            fieldname: data
        })
    });

    if (!res.ok) {
        const json = await res.json();
        throw new Error(handleFrappeError(json, "Failed to update task"));
    }
}

export async function closeTaskManager(name: string, hours: string, remarks: string, attachment?: string): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(`/api/method/company.company.doctype.task_manager.task_manager.close_task`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            task_name: name,
            hours_spent: hours,
            remarks,
            attachment
        })
    });

    if (!res.ok) {
        const json = await res.json();
        throw new Error(handleFrappeError(json, "Failed to close task"));
    }
}

export async function reopenTaskManager(name: string, remarks: string): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(`/api/method/company.company.doctype.task_manager.task_manager.reopen_task`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ task_name: name, remarks })
    });

    if (!res.ok) {
        const json = await res.json();
        throw new Error(handleFrappeError(json, "Failed to reopen task"));
    }
}

export async function putOnHoldTaskManager(name: string, remarks: string): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(`/api/method/company.company.doctype.task_manager.task_manager.put_on_hold_task`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ task_name: name, remarks })
    });

    if (!res.ok) {
        const json = await res.json();
        throw new Error(handleFrappeError(json, "Failed to put task on hold"));
    }
}

export async function resumeTaskManager(name: string, remarks: string): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(`/api/method/company.company.doctype.task_manager.task_manager.resume_task`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ task_name: name, remarks })
    });

    if (!res.ok) {
        const json = await res.json();
        throw new Error(handleFrappeError(json, "Failed to resume task"));
    }
}

export async function acceptTaskManager(name: string): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(`/api/method/company.company.doctype.task_manager.task_manager.accept_task`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ task_name: name })
    });

    if (!res.ok) {
        const json = await res.json();
        throw new Error(handleFrappeError(json, "Failed to accept task"));
    }
}

export async function deleteTaskManager(name: string): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await frappeRequest(`/api/method/frappe.client.delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            doctype: "Task Manager",
            name
        })
    });

    if (!res.ok) {
        const json = await res.json();
        throw new Error(handleFrappeError(json, "Failed to delete task"));
    }
}

export async function fetchProjects(search?: string): Promise<{ name: string; project: string }[]> {
    const filters: any[] = [];
    if (search) {
        filters.push(['Project', 'project', 'like', `%${search}%`]);
    }

    const query = new URLSearchParams({
        doctype: "Project",
        fields: JSON.stringify(["name", "project"]),
        filters: JSON.stringify(filters),
        limit_page_length: "1000",
        order_by: "project asc"
    });

    const res = await frappeRequest(`/api/method/frappe.client.get_list?${query.toString()}`);
    const data = await handleResponse(res);
    return data.message || [];
}

export async function createProject(projectName: string) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest('/api/method/frappe.client.insert', {
        method: 'POST',
        headers,
        body: JSON.stringify({ doc: { doctype: 'Project', project: projectName } }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, 'Failed to create project'));
    }

    return (await res.json()).message;
}

export async function fetchDepartments(search?: string): Promise<{ name: string; department_name: string }[]> {
    const filters: any[] = [];
    if (search) {
        filters.push(['Department', 'department_name', 'like', `%${search}%`]);
    }

    const query = new URLSearchParams({
        doctype: "Department",
        fields: JSON.stringify(["name", "department_name"]),
        filters: JSON.stringify(filters),
        limit_page_length: "1000",
        order_by: "department_name asc"
    });

    const res = await frappeRequest(`/api/method/frappe.client.get_list?${query.toString()}`);
    const data = await handleResponse(res);
    return data.message || [];
}

export async function createDepartment(departmentName: string) {
    const headers = await getAuthHeaders();

    const res = await frappeRequest('/api/method/frappe.client.insert', {
        method: 'POST',
        headers,
        body: JSON.stringify({ doc: { doctype: 'Department', department_name: departmentName } }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(handleFrappeError(error, 'Failed to create department'));
    }

    return (await res.json()).message;
}

export async function fetchEmployees(): Promise<{ name: string; employee_name: string }[]> {
    const query = new URLSearchParams({
        doctype: "Employee",
        fields: JSON.stringify(["name", "employee_name"]),
        filters: JSON.stringify([["Employee", "status", "=", "Active"]]),
        limit_page_length: "1000",
        order_by: "employee_name asc"
    });

    const res = await frappeRequest(`/api/method/frappe.client.get_list?${query.toString()}`);
    const data = await handleResponse(res);
    return data.message || [];
}

/**
 * Fetch all active employees ignoring Frappe User Permissions.
 * Used for the Task Manager Assignees dropdown so users with restricted
 * Employee permissions (e.g. Team Leads) can still assign tasks to anyone.
 */
export async function fetchAllActiveEmployees(): Promise<{ name: string; employee_name: string }[]> {
    const res = await frappeRequest(`/api/method/company.company.doctype.task_manager.task_manager.get_all_active_employees`);
    const data = await handleResponse(res);
    return data.message || [];
}

export async function getTaskManagerPermissions(): Promise<{ read: boolean; write: boolean; create: boolean; delete: boolean }> {
    const res = await frappeRequest("/api/method/company.company.frontend_api.get_doc_permissions?doctype=Task Manager");

    if (!res.ok) {
        return { read: false, write: false, create: false, delete: false };
    }

    const data = await res.json();
    return data.message || { read: false, write: false, create: false, delete: false };
}

export async function fetchHRTaskStats(project?: string, department?: string, fromDate?: string, toDate?: string, employeeId?: string): Promise<{ total: number; open: number; reopen: number; in_progress: number; completed: number; on_hold: number; employee_task_names?: string[] }> {
    let url = '/api/method/company.company.frontend_api.get_hr_task_stats';
    const params = new URLSearchParams();
    if (project && project !== 'All') params.append('project', project);
    if (department && department !== 'All') params.append('department', department);
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    if (employeeId) params.append('employee_id', employeeId);
    
    if (params.toString()) url += `?${params.toString()}`;

    const res = await frappeRequest(url);
    const data = await handleResponse(res);
    return data.message || { total: 0, open: 0, reopen: 0, in_progress: 0, completed: 0, on_hold: 0 };
}
