import { frappeRequest, getAuthHeaders } from 'src/utils/csrf';
import { handleFrappeError } from 'src/utils/api-error-handler';

import { fetchFrappeList } from './hr-management';

export interface BiometricSettingsData {
  enabled: number;
  api_base_url?: string;
  api_key?: string;
  auto_sync_enabled: number;
  sync_mode: 'Manual Only' | 'Interval in Minutes' | 'Specific Times Daily';
  sync_interval_minutes: number;
  daily_sync_times?: string;
  overlap_minutes: number;
  auto_reconciliation_enabled: number;
  last_successful_sync?: string | null;
  last_sync_from?: string | null;
  last_sync_to?: string | null;
  last_sync_status?: string;
  last_error_message?: string | null;
}

export interface BiometricStatus {
  enabled: number;
  auto_sync_enabled: number;
  sync_mode: string;
  sync_interval_minutes: number;
  daily_sync_times?: string;
  last_successful_sync?: string | null;
  last_sync_status: string;
  last_error_message?: string | null;
  total_logs: number;
  pending_logs: number;
  error_logs: number;
  devices_count: number;
  recent_syncs: any[];
}

export async function getBiometricSettings(): Promise<BiometricSettingsData | null> {
  try {
    const res = await frappeRequest('/api/method/frappe.client.get?doctype=Biometric Settings&name=Biometric Settings');
    if (!res.ok) {
      const err = await res.json();
      throw new Error(handleFrappeError(err, 'Failed to fetch Biometric Settings'));
    }
    const data = await res.json();
    return data.message;
  } catch (error) {
    console.error('Failed to fetch Biometric Settings:', error);
    return null;
  }
}

export async function updateBiometricSettings(data: Partial<BiometricSettingsData>): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/frappe.client.set_value', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      doctype: 'Biometric Settings',
      name: 'Biometric Settings',
      fieldname: data,
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(handleFrappeError(json, 'Failed to update Biometric Settings'));
  return json.message;
}

export async function getBiometricStatus(): Promise<BiometricStatus> {
  const res = await frappeRequest('/api/method/company.company.biometric.biometric_sync.get_biometric_status');
  const json = await res.json();
  if (!res.ok) throw new Error(handleFrappeError(json, 'Failed to fetch Biometric Status'));
  return json.message;
}

export async function triggerManualSync(fromDate?: string, toDate?: string): Promise<any> {
  const headers = await getAuthHeaders();
  const params: Record<string, any> = {};
  if (fromDate) params.from_date = fromDate;
  if (toDate) params.to_date = toDate;

  const res = await frappeRequest('/api/method/company.company.biometric.biometric_sync.trigger_manual_sync', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(handleFrappeError(json, 'Manual biometric sync failed'));
  return json.message;
}

export async function testBiometricConnection(): Promise<{ status: string; message: string }> {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.biometric.biometric_sync.test_connection', {
    method: 'POST',
    headers,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(handleFrappeError(json, 'Failed to test SmartOffice connection'));
  return json.message;
}

export async function reprocessUnmappedLogs(): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await frappeRequest('/api/method/company.company.biometric.biometric_sync.reprocess_unmapped_logs', {
    method: 'POST',
    headers,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(handleFrappeError(json, 'Failed to reprocess unmapped logs'));
  return json.message;
}

export function fetchBiometricLogs(params: any) {
  return fetchFrappeList('Biometric Log', params);
}

export function fetchBiometricDevices(params?: any) {
  return fetchFrappeList('Biometric Device', params || { limit_page_length: 100 });
}

export function fetchAttendanceSyncLogs(params: any) {
  return fetchFrappeList('Attendance Sync Log', params);
}
