/**
 * SUPABASE BULUT VERİTABANI İSTEMCİSİ
 * DentalLab Pro - PostgreSQL Entegrasyonu
 */

export const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) 
  || 'https://naoraqzmhjvtoewmgjyq.supabase.co';
export const SUPABASE_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) 
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hb3JhcXptaGp2dG9ld21nanlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3ODY2NTEsImV4cCI6MjEwNDM2MjY1MX0.cYoqUV25XQSZWnRu6qdPeD-mNyNpD7howik7op9oDrc';

const getHeaders = () => ({
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'resolution=merge-duplicates,return=representation'
});

const getReadHeaders = () => ({
  ...getHeaders(),
  Range: '0-9999'
});

// Güvenli ISO Tarih Dönüştürücü
function safeIso(val) {
  if (!val) return null;
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch (e) {
    return null;
  }
}

// 1. TÜM VERİLERİ SUPABASE'DEN ÇEK
export async function fetchAllFromSupabase() {
  try {
    const headers = getReadHeaders();
    const [compRes, docRes, patRes, ordRes, stepRes, fileRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/companies?select=*&order=created_at.desc&limit=10000`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/doctors?select=*&order=created_at.desc&limit=10000`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/patients?select=*&order=created_at.desc&limit=10000`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc&limit=10000`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/order_steps?select=*&order=step_order.asc&limit=20000`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/order_files?select=*&order=uploaded_at.desc&limit=10000`, { headers }).catch(() => ({ ok: false }))
    ]);

    if (!compRes.ok || !docRes.ok || !patRes.ok || !ordRes.ok) {
      console.warn('Supabase fetch failed or RLS blocked');
      return null;
    }

    const [compData, docData, patData, ordData, stepData, fileData] = await Promise.all([
      compRes.json(),
      docRes.json(),
      patRes.json(),
      ordRes.json(),
      stepRes.ok ? stepRes.json() : [],
      fileRes && fileRes.ok ? fileRes.json().catch(() => []) : []
    ]);

    // Snake_case -> camelCase dönüşümü (sys- önekli dahili kayıtlar hariç)
    const companies = (compData || [])
      .filter(c => !String(c.id).startsWith('sys-'))
      .map(c => ({
      id: c.id,
      name: c.name,
      contactPerson: c.contact_person,
      phone: c.phone,
      email: c.email,
      address: c.address,
      balance: c.balance || 0,
      createdAt: c.created_at
    }));

    const doctors = (docData || []).map(d => ({
      id: d.id,
      companyId: d.company_id,
      name: d.name,
      specialty: d.specialty,
      phone: d.phone,
      email: d.email,
      createdAt: d.created_at
    }));

    const patients = (patData || []).map(p => ({
      id: p.id,
      companyId: p.company_id,
      doctorId: p.doctor_id,
      name: p.name,
      chartNumber: p.chart_number,
      age: p.age,
      gender: p.gender,
      notes: p.notes,
      createdAt: p.created_at
    }));

    // Siparişler ve aşamalarını birleştir
    const orders = (ordData || []).map(o => {
      const relatedSteps = (stepData || [])
        .filter(s => s.order_id === o.id)
        .sort((a, b) => a.step_order - b.step_order)
        .map(s => ({
          order: s.step_order,
          name: s.name,
          description: s.description || '',
          status: s.status || 'pending',
          technician: s.technician || '',
          startedAt: s.started_at,
          completedAt: s.completed_at,
          notes: s.notes || ''
        }));

      return {
        id: o.id,
        companyId: o.company_id,
        doctorId: o.doctor_id,
        patientId: o.patient_id,
        materialId: o.material_id,
        teeth: Array.isArray(o.teeth) ? o.teeth : [],
        shade: o.shade,
        priority: o.priority || 'normal',
        status: o.status || 'in_progress',
        orderDate: o.order_date,
        trialDate: o.trial_date,
        deliveryDate: o.delivery_date,
        price: o.price || 0,
        notes: o.notes || '',
        currentStepIndex: o.current_step_index || 0,
        createdAt: o.created_at,
        steps: relatedSteps,
        stlFiles: (fileData || [])
          .filter(f => f.order_id === o.id)
          .map(f => ({
            id: f.id,
            orderId: f.order_id,
            name: f.file_name,
            url: f.file_url,
            size: f.file_size || 0,
            type: f.file_type || 'stl',
            uploadedAt: f.uploaded_at
          }))
      };
    });

    let technicians = null;
    const sysTech = (compData || []).find(c => c.id === 'sys-dentallab-technicians');
    if (sysTech?.address) {
      try {
        const parsed = JSON.parse(sysTech.address);
        if (Array.isArray(parsed)) technicians = parsed;
      } catch (e) {}
    }

    let users = null;
    const sysUsers = (compData || []).find(c => c.id === 'sys-dentallab-users');
    if (sysUsers?.address) {
      try {
        const parsed = JSON.parse(sysUsers.address);
        if (Array.isArray(parsed)) users = parsed;
      } catch (e) {}
    }

    let calendarEvents = null;
    const sysEvents = (compData || []).find(c => c.id === 'sys-dentallab-calendar');
    if (sysEvents?.address) {
      try {
        const parsed = JSON.parse(sysEvents.address);
        if (Array.isArray(parsed)) calendarEvents = parsed;
      } catch (e) {}
    }

    let customMaterials = null;
    const sysMaterials = (compData || []).find(c => c.id === 'sys-dentallab-materials');
    if (sysMaterials?.address) {
      try {
        const parsed = JSON.parse(sysMaterials.address);
        if (parsed && typeof parsed === 'object') customMaterials = parsed;
      } catch (e) {}
    }

    return { companies, doctors, patients, orders, technicians, users, calendarEvents, customMaterials };
  } catch (error) {
    console.error('Supabase fetch error:', error);
    return null;
  }
}

// 2. SİPARİŞİ VE AŞAMALARINI KAYDET / GÜNCELLE
export async function saveOrderToSupabase(order) {
  try {
    const headers = getHeaders();
    const orderPayload = {
      id: order.id,
      company_id: order.companyId || null,
      doctor_id: order.doctorId || null,
      patient_id: order.patientId || null,
      material_id: order.materialId || 'mdp',
      teeth: Array.isArray(order.teeth) ? order.teeth : [],
      shade: order.shade || 'A2',
      priority: order.priority || 'normal',
      status: order.status || 'in_progress',
      order_date: order.orderDate || new Date().toISOString().split('T')[0],
      trial_date: order.trialDate || null,
      delivery_date: order.deliveryDate || new Date().toISOString().split('T')[0],
      price: Number(order.price) || 0,
      notes: order.notes || '',
      current_step_index: order.currentStepIndex || 0
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(orderPayload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Supabase saveOrder error:', err);
      return false;
    }

    // Aşamaları kaydet
    if (Array.isArray(order.steps) && order.steps.length > 0) {
      // Önce bu siparişin eski adımlarını sil
      await fetch(`${SUPABASE_URL}/rest/v1/order_steps?order_id=eq.${order.id}`, {
        method: 'DELETE',
        headers
      });

      const stepsPayload = order.steps.map((st, idx) => ({
        order_id: order.id,
        step_order: st.order || (idx + 1),
        name: st.name,
        description: st.description || '',
        status: st.status || 'pending',
        technician: st.technician || '',
        started_at: safeIso(st.startedAt),
        completed_at: safeIso(st.completedAt),
        notes: st.notes || ''
      }));

      await fetch(`${SUPABASE_URL}/rest/v1/order_steps`, {
        method: 'POST',
        headers,
        body: JSON.stringify(stepsPayload)
      });
    }

    return true;
  } catch (error) {
    console.error('saveOrderToSupabase error:', error);
    return false;
  }
}

// 3. SİPARİŞİ SİL
export async function deleteOrderFromSupabase(orderId) {
  try {
    const headers = getHeaders();
    await fetch(`${SUPABASE_URL}/rest/v1/order_files?order_id=eq.${orderId}`, {
      method: 'DELETE',
      headers
    }).catch(() => {});
    await fetch(`${SUPABASE_URL}/rest/v1/order_steps?order_id=eq.${orderId}`, {
      method: 'DELETE',
      headers
    }).catch(() => {});
    await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
      method: 'DELETE',
      headers
    });
    return true;
  } catch (error) {
    console.error('deleteOrderFromSupabase error:', error);
    return false;
  }
}

// 4. FİRMA / KLİNİK KAYDET
export async function saveCompanyToSupabase(company) {
  try {
    const headers = getHeaders();
    const payload = {
      id: company.id,
      name: company.name,
      contact_person: company.contactPerson || '',
      phone: company.phone || '',
      email: company.email || '',
      address: company.address || '',
      balance: Number(company.balance) || 0
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/companies`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    return res.ok;
  } catch (error) {
    console.error('saveCompanyToSupabase error:', error);
    return false;
  }
}

// 5. FİRMA SİL
export async function deleteCompanyFromSupabase(companyId) {
  try {
    const headers = getHeaders();
    await fetch(`${SUPABASE_URL}/rest/v1/companies?id=eq.${companyId}`, {
      method: 'DELETE',
      headers
    });
    return true;
  } catch (error) {
    console.error('deleteCompanyFromSupabase error:', error);
    return false;
  }
}

// 6. DOKTOR / HEKİM KAYDET
export async function saveDoctorToSupabase(doctor) {
  try {
    const headers = getHeaders();
    const payload = {
      id: doctor.id,
      company_id: doctor.companyId || null,
      name: doctor.name,
      specialty: doctor.specialty || '',
      phone: doctor.phone || '',
      email: doctor.email || ''
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/doctors`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    return res.ok;
  } catch (error) {
    console.error('saveDoctorToSupabase error:', error);
    return false;
  }
}

// 7. DOKTOR SİL
export async function deleteDoctorFromSupabase(doctorId) {
  try {
    const headers = getHeaders();
    await fetch(`${SUPABASE_URL}/rest/v1/doctors?id=eq.${doctorId}`, {
      method: 'DELETE',
      headers
    });
    return true;
  } catch (error) {
    console.error('deleteDoctorFromSupabase error:', error);
    return false;
  }
}

// 8. HASTA KAYDET
export async function savePatientToSupabase(patient) {
  try {
    const headers = getHeaders();
    const payload = {
      id: patient.id,
      company_id: patient.companyId || null,
      doctor_id: patient.doctorId || null,
      name: patient.name,
      chart_number: patient.chartNumber || '',
      age: Number(patient.age) || null,
      gender: patient.gender || '',
      notes: patient.notes || ''
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/patients`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    return res.ok;
  } catch (error) {
    console.error('savePatientToSupabase error:', error);
    return false;
  }
}

// 9. HASTA SİL
export async function deletePatientFromSupabase(patientId) {
  try {
    const headers = getHeaders();
    await fetch(`${SUPABASE_URL}/rest/v1/patients?id=eq.${patientId}`, {
      method: 'DELETE',
      headers
    });
    return true;
  } catch (error) {
    console.error('deletePatientFromSupabase error:', error);
    return false;
  }
}

// 10. TÜM VERİLERİ SUPABASE'DEN TAMAMEN SİL (SIFIRLAMA)
export async function clearAllFromSupabase() {
  try {
    const headers = getHeaders();
    // İlişkisel yabancı anahtar sırası: order_files -> order_steps -> orders -> patients -> doctors -> companies
    await fetch(`${SUPABASE_URL}/rest/v1/order_files?id=gte.0`, { method: 'DELETE', headers }).catch(() => {});
    await fetch(`${SUPABASE_URL}/rest/v1/order_steps?step_order=gte.0`, { method: 'DELETE', headers }).catch(() => {});
    await fetch(`${SUPABASE_URL}/rest/v1/orders?id=neq.dummy`, { method: 'DELETE', headers }).catch(() => {});
    await fetch(`${SUPABASE_URL}/rest/v1/patients?id=neq.dummy`, { method: 'DELETE', headers }).catch(() => {});
    await fetch(`${SUPABASE_URL}/rest/v1/doctors?id=neq.dummy`, { method: 'DELETE', headers }).catch(() => {});
    await fetch(`${SUPABASE_URL}/rest/v1/companies?id=neq.dummy`, { method: 'DELETE', headers }).catch(() => {});
    return true;
  } catch (error) {
    console.error('clearAllFromSupabase error:', error);
    return false;
  }
}

// 11. STL DOSYASI YÜKLE (SUPABASE STORAGE + ORDER_FILES TABLOSU)
export async function uploadStlToSupabase(file, orderId) {
  try {
    const bucket = 'stl-files';
    const timestamp = Date.now();
    const safeName = (file.name || 'tarama.stl')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .toLowerCase();
    const filePath = `${orderId || 'draft'}/${timestamp}_${safeName}`;

    // 1. Supabase Storage Bucket'ına Yükle
    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'true'
      },
      body: file
    });

    if (!uploadRes.ok) {
      const errJson = await uploadRes.json().catch(() => ({}));
      const msg = errJson.message || errJson.error || uploadRes.statusText || 'Bilinmeyen hata';
      console.error('Supabase Storage yükleme hatası:', msg);
      if (uploadRes.status === 404 || msg?.includes('Bucket not found') || msg?.includes('not found')) {
        throw new Error('Supabase Storage üzerinde "stl-files" bucket henüz oluşturulmamış! Lütfen Supabase panelinde Storage > New Bucket > "stl-files" (Public) oluşturun veya SQL kodunu çalıştırın.');
      }
      throw new Error(`Storage yükleme hatası: ${msg}`);
    }

    // 2. Herkese Açık Erişim URL'si
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;

    // 3. order_files Tablosuna Kayıt Ekle
    const fileRecord = {
      order_id: orderId || null,
      file_name: file.name,
      file_url: publicUrl,
      file_size: file.size || 0,
      file_type: file.type || 'model/stl'
    };

    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/order_files`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(fileRecord)
    });

    let savedDb = null;
    if (dbRes.ok) {
      const dbData = await dbRes.json().catch(() => null);
      if (Array.isArray(dbData) && dbData[0]) {
        savedDb = dbData[0];
      }
    }

    return {
      id: savedDb?.id || 'file-' + timestamp,
      orderId: orderId || null,
      name: file.name,
      url: publicUrl,
      size: file.size || 0,
      type: file.type || 'model/stl',
      uploadedAt: savedDb?.uploaded_at || new Date().toISOString()
    };
  } catch (error) {
    console.error('uploadStlToSupabase error:', error);
    throw error;
  }
}

// 12. STL DOSYASI SİL
export async function deleteStlFromSupabase(fileId, fileUrl) {
  try {
    const headers = getHeaders();
    if (fileId) {
      await fetch(`${SUPABASE_URL}/rest/v1/order_files?id=eq.${fileId}`, {
        method: 'DELETE',
        headers
      }).catch(() => {});
    }
    if (fileUrl && fileUrl.includes('/storage/v1/object/public/stl-files/')) {
      const storagePath = fileUrl.split('/storage/v1/object/public/stl-files/')[1];
      if (storagePath) {
        await fetch(`${SUPABASE_URL}/storage/v1/object/stl-files/${storagePath}`, {
          method: 'DELETE',
          headers
        }).catch(() => {});
      }
    }
    return true;
  } catch (error) {
    console.error('deleteStlFromSupabase error:', error);
    return false;
  }
}

// 13. SİPARİŞ DOSYALARINI ÇEK
export async function fetchOrderFilesFromSupabase(orderId) {
  try {
    const headers = getReadHeaders();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/order_files?order_id=eq.${orderId}&order=uploaded_at.desc`, { headers });
    if (!res.ok) return [];
    const data = await res.json().catch(() => []);
    return (data || []).map(f => ({
      id: f.id,
      orderId: f.order_id,
      name: f.file_name,
      url: f.file_url,
      size: f.file_size || 0,
      type: f.file_type || 'stl',
      uploadedAt: f.uploaded_at
    }));
  } catch (error) {
    console.error('fetchOrderFilesFromSupabase error:', error);
    return [];
  }
}

// 14. TASLAK OLARAK YÜKLENEN DOSYALARI SİPARİŞ NUMARASIYLA BAĞLA
export async function linkFilesToOrderInSupabase(orderId, fileIds = []) {
  if (!orderId || !fileIds || !fileIds.length) return;
  try {
    const headers = getHeaders();
    for (const fid of fileIds) {
      if (fid && typeof fid !== 'string' || (typeof fid === 'string' && !fid.startsWith('temp-'))) {
        await fetch(`${SUPABASE_URL}/rest/v1/order_files?id=eq.${fid}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ order_id: orderId })
        }).catch(() => {});
      }
    }
  } catch (e) {
    console.warn('linkFilesToOrderInSupabase warning:', e);
  }
}

// 15. KULLANICI HESAPLARINI BULUTTA SENKRONİZE ETME (CİHAZLAR VE GİZLİ SEKMELER ARASI)
export const SYS_USERS_COMPANY_ID = 'sys-dentallab-users';

export async function fetchUsersFromSupabase() {
  try {
    const headers = getReadHeaders();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/companies?id=eq.${SYS_USERS_COMPANY_ID}&select=address`, { headers });
    if (!res.ok) return null;
    const rows = await res.json().catch(() => []);
    if (Array.isArray(rows) && rows.length > 0 && rows[0]?.address) {
      const parsed = JSON.parse(rows[0].address);
      if (Array.isArray(parsed)) return parsed;
    }
    return null;
  } catch (error) {
    console.warn('fetchUsersFromSupabase error:', error);
    return null;
  }
}

export async function saveUsersToSupabase(usersList) {
  try {
    if (!Array.isArray(usersList)) return false;
    const headers = getHeaders();
    const payload = {
      id: SYS_USERS_COMPANY_ID,
      name: 'SYSTEM_USERS_STORAGE',
      contact_person: 'SYSTEM',
      phone: '',
      email: 'system@dentallab.internal',
      address: JSON.stringify(usersList),
      balance: 0
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/companies`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (error) {
    console.warn('saveUsersToSupabase error:', error);
    return false;
  }
}

// 16. TEKNİSYEN VE EKİP BULUT SENKRONİZASYONU (HER CİHAZDA KALICI EKİP LİSTESİ)
export const SYS_TECHS_COMPANY_ID = 'sys-dentallab-technicians';

export async function fetchTechniciansFromSupabase() {
  try {
    const headers = getReadHeaders();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/companies?id=eq.${SYS_TECHS_COMPANY_ID}&select=address`, { headers });
    if (!res.ok) return null;
    const rows = await res.json().catch(() => []);
    if (Array.isArray(rows) && rows.length > 0 && rows[0]?.address) {
      const parsed = JSON.parse(rows[0].address);
      if (Array.isArray(parsed)) return parsed;
    }
    return null;
  } catch (error) {
    console.warn('fetchTechniciansFromSupabase error:', error);
    return null;
  }
}

export async function saveTechniciansToSupabase(techsList) {
  try {
    if (!Array.isArray(techsList)) return false;
    const headers = getHeaders();
    const payload = {
      id: SYS_TECHS_COMPANY_ID,
      name: 'SYSTEM_TECHNICIANS_STORAGE',
      contact_person: 'SYSTEM',
      phone: '',
      email: 'system@dentallab.internal',
      address: JSON.stringify(techsList),
      balance: 0
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/companies`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (error) {
    console.warn('saveTechniciansToSupabase error:', error);
    return false;
  }
}

// 17. ÖZEL TAKVİM & RANDEVU & KURYE ETKİNLİKLERİNİ BULUTTA SENKRONİZE ETME
export const SYS_CALENDAR_EVENTS_COMPANY_ID = 'sys-dentallab-calendar';

export async function fetchCalendarEventsFromSupabase() {
  try {
    const headers = getReadHeaders();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/companies?id=eq.${SYS_CALENDAR_EVENTS_COMPANY_ID}&select=address`, { headers });
    if (!res.ok) return null;
    const rows = await res.json().catch(() => []);
    if (Array.isArray(rows) && rows.length > 0 && rows[0]?.address) {
      const parsed = JSON.parse(rows[0].address);
      if (Array.isArray(parsed)) return parsed;
    }
    return null;
  } catch (error) {
    console.warn('fetchCalendarEventsFromSupabase error:', error);
    return null;
  }
}

export async function saveCalendarEventsToSupabase(eventsList) {
  try {
    if (!Array.isArray(eventsList)) return false;
    const headers = getHeaders();
    const payload = {
      id: SYS_CALENDAR_EVENTS_COMPANY_ID,
      name: 'SYSTEM_CALENDAR_EVENTS_STORAGE',
      contact_person: 'SYSTEM',
      phone: '',
      email: 'system@dentallab.internal',
      address: JSON.stringify(eventsList),
      balance: 0
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/companies`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (error) {
    console.warn('saveCalendarEventsToSupabase error:', error);
    return false;
  }
}

// 18. DİNAMİK RESTORASYON MATERYALLERİ VE ÜRETİM HATLARI BULUT SENKRONİZASYONU
export const SYS_MATERIALS_COMPANY_ID = 'sys-dentallab-materials';

export async function fetchMaterialsFromSupabase() {
  try {
    const headers = getReadHeaders();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/companies?id=eq.${SYS_MATERIALS_COMPANY_ID}&select=address`, { headers });
    if (!res.ok) return null;
    const rows = await res.json().catch(() => []);
    if (Array.isArray(rows) && rows.length > 0 && rows[0]?.address) {
      const parsed = JSON.parse(rows[0].address);
      if (parsed && typeof parsed === 'object') return parsed;
    }
    return null;
  } catch (error) {
    console.warn('fetchMaterialsFromSupabase error:', error);
    return null;
  }
}

export async function saveMaterialsToSupabase(materialsData) {
  try {
    if (!materialsData || typeof materialsData !== 'object') return false;
    const headers = getHeaders();
    const payload = {
      id: SYS_MATERIALS_COMPANY_ID,
      name: 'SYSTEM_MATERIALS_STORAGE',
      contact_person: 'SYSTEM',
      phone: '',
      email: 'system@dentallab.internal',
      address: JSON.stringify(materialsData),
      balance: 0
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/companies`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (error) {
    console.warn('saveMaterialsToSupabase error:', error);
    return false;
  }
}
