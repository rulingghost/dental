/**
 * DEMO MODU - VERİTABANI BAĞLANTISI DEVRE DIŞI (YEREL HAFIZA / LOCALSTORAGE)
 * Canlı Supabase veritabanı ile hiçbir bağlantı kurulmaz.
 * Tüm işlemler tarayıcı üzerinde izole demo verileriyle çalışır.
 */

export const SUPABASE_URL = '';
export const SUPABASE_KEY = '';

export const SYS_USERS_COMPANY_ID = 'sys-dentallab-users';
export const SYS_TECHS_COMPANY_ID = 'sys-dentallab-technicians';
export const SYS_CALENDAR_EVENTS_COMPANY_ID = 'sys-dentallab-calendar';
export const SYS_MATERIALS_COMPANY_ID = 'sys-dentallab-materials';

export async function fetchAllFromSupabase() {
  return null;
}

export async function saveOrderToSupabase() {
  return true;
}

export async function deleteOrderFromSupabase() {
  return true;
}

export async function saveCompanyToSupabase() {
  return true;
}

export async function deleteCompanyFromSupabase() {
  return true;
}

export async function saveDoctorToSupabase() {
  return true;
}

export async function deleteDoctorFromSupabase() {
  return true;
}

export async function savePatientToSupabase() {
  return true;
}

export async function deletePatientFromSupabase() {
  return true;
}

export async function clearAllFromSupabase() {
  return true;
}

export async function uploadStlToSupabase(file, orderId) {
  const timestamp = Date.now();
  const localUrl = typeof URL !== 'undefined' && file ? URL.createObjectURL(file) : '#';
  return {
    id: 'demo-file-' + timestamp,
    orderId: orderId || null,
    name: file?.name || 'ornek_tarama.stl',
    url: localUrl,
    size: file?.size || 0,
    type: file?.type || 'model/stl',
    uploadedAt: new Date().toISOString()
  };
}

export async function deleteStlFromSupabase() {
  return true;
}

export async function fetchOrderFilesFromSupabase() {
  return [];
}

export async function linkFilesToOrderInSupabase() {
  return true;
}

export async function fetchUsersFromSupabase() {
  return null;
}

export async function saveUsersToSupabase() {
  return true;
}

export async function fetchTechniciansFromSupabase() {
  return null;
}

export async function saveTechniciansToSupabase() {
  return true;
}

export async function fetchCalendarEventsFromSupabase() {
  return null;
}

export async function saveCalendarEventsToSupabase() {
  return true;
}

export async function fetchMaterialsFromSupabase() {
  return null;
}

export async function saveMaterialsToSupabase() {
  return true;
}
