import { frappeRequest } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';


// ----------------------------------------------------------------------

export async function callFrappe(method: string, data: any = {}) {
  const res = await frappeRequest(`/api/method/company.company.frontend_api.${method}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(handleFrappeError(json, `Failed to call ${method}`));
  return json.message;
}

export async function callFrappeDocMethod(doctype: string, name: string, method: string, data: any = {}) {
  const res = await frappeRequest('/api/method/frappe.desk.form.run_method.run_doc_method', {
    method: 'POST',
    body: JSON.stringify({ dt: doctype, dn: name, method, ...data }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(handleFrappeError(json, `Failed to call method ${method} on ${doctype}`));
  return json.message;
}

// ----------------------------------------------------------------------

export async function fetchOpenJobs(search?: string, filters?: any, page: number = 0, rowsPerPage: number = 10, orderBy?: string) {
  return callFrappe('get_open_jobs', { 
    search, 
    filters,
    limit_start: page * rowsPerPage,
    limit_page_length: rowsPerPage,
    order_by: orderBy
  });
}

export async function fetchMyReferrals(search?: string, filters?: any, page: number = 0, rowsPerPage: number = 10, orderBy?: string) {
  return callFrappe('get_my_referrals', { 
    search, 
    filters,
    limit_start: page * rowsPerPage,
    limit_page_length: rowsPerPage,
    order_by: orderBy
  });
}

export async function submitReferral(data: any) {
  return callFrappe('submit_referral', data);
}

export async function createJobApplicant(referralName: string) {
  return callFrappe('handle_create_job_applicant', { referral_name: referralName });
}


