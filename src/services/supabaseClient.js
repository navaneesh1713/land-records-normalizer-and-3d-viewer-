import { createClient } from '@supabase/supabase-js';
import { generateULPIN, getMaskedAadhaar } from '../utils/ulpinService';
import { INITIAL_LAND_DATABASE, storageService } from './storageService';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://yxhpbiyfkllnitqlmrjk.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4aHBiaXlma2xsbml0cWxtcmprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMjg1OTQsImV4cCI6MjEwNDgwNDU5NH0.Sti05Epz9EHf8I--FuqvMvCmmJFe37eH7IyF-q4GhUg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Standardize Aadhaar input (extract digits or normalized format)
 */
export function normalizeAadhaarKey(val = '') {
  return String(val || '').replace(/[\s-]/g, '').trim();
}

/**
 * Standardize 14-digit ULPIN code
 */
export function normalizeUlpinKey(val = '') {
  return String(val || '').trim();
}

export const supabaseService = {
  /**
   * Retrieve all land records belonging to an owner by their Aadhaar Number.
   * Mode 1: Search by Aadhaar -> Multiple land records
   */
  async getRecordsByAadhaar(aadhaarInput) {
    const rawDigits = normalizeAadhaarKey(aadhaarInput);
    if (!rawDigits) return [];

    // 1. Get all local records first to guarantee local data is always accessible
    const localDb = storageService.getDatabaseRecords() || INITIAL_LAND_DATABASE;
    const localMatches = localDb.filter((r) => {
      const recAadhaar = normalizeAadhaarKey(r.aadhaar_number);
      const recOwner = (r.owner_name || '').toLowerCase();
      const qLower = aadhaarInput.toLowerCase().trim();
      return (
        recAadhaar.includes(rawDigits) ||
        (r.aadhaar_number && r.aadhaar_number.toLowerCase().includes(qLower)) ||
        (rawDigits.length >= 4 && recAadhaar.endsWith(rawDigits)) ||
        recOwner.includes(qLower)
      );
    });

    const resultMap = new Map();
    localMatches.forEach((rec) => resultMap.set(rec.ulpin || rec.id, rec));

    try {
      // 2. Query Supabase cloud table
      const { data, error } = await supabase
        .from('land_records')
        .select('*')
        .or(`aadhaar_number.ilike.%${rawDigits}%,aadhaar_number.ilike.%${aadhaarInput.trim()}%,owner_name.ilike.%${aadhaarInput.trim()}%`);

      if (!error && Array.isArray(data)) {
        data.forEach((rec) => {
          const key = rec.ulpin || rec.id;
          resultMap.set(key, { ...(resultMap.get(key) || {}), ...rec });
        });
      }
    } catch (e) {
      console.warn('[Supabase] Remote query failed, falling back to local cadastre:', e);
    }

    return Array.from(resultMap.values());
  },

  /**
   * Retrieve the exact single land record by its 14-digit ULPIN (Bhu-Aadhaar).
   * Mode 2: Search by ULPIN -> Exact unique land parcel
   */
  async getRecordByULPIN(ulpinInput) {
    const cleanUlpin = normalizeUlpinKey(ulpinInput);
    if (!cleanUlpin) return null;

    try {
      // 1. Try Supabase cloud table query
      const { data, error } = await supabase
        .from('land_records')
        .select('*')
        .eq('ulpin', cleanUlpin)
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn('[Supabase] Remote ULPIN query failed, falling back to local database:', e);
    }

    // 2. Fallback to local cadastral database
    const localDb = JSON.parse(localStorage.getItem('sih_cadastre_land_database') || '[]') || INITIAL_LAND_DATABASE;
    return localDb.find((r) => {
      const recUlpin = normalizeUlpinKey(r.ulpin);
      return recUlpin === cleanUlpin || (r.ulpin && r.ulpin.toLowerCase() === cleanUlpin.toLowerCase());
    }) || null;
  },

  /**
   * Sync a land parcel record into Supabase tables
   */
  async upsertLandRecord(record) {
    const ulpin = record.ulpin || generateULPIN(record.longitude || 77.728, record.latitude || 12.985, record.state, record.survey_number);
    const aadhaar = record.aadhaar_number || getMaskedAadhaar(record.owner_name || 'Citizen');

    const payload = {
      id: record.id || `REC-${Date.now()}`,
      ulpin,
      aadhaar_number: aadhaar,
      owner_name: record.owner_name || 'Unspecified',
      survey_number: record.survey_number || record.khasra_number || '',
      khasra_number: record.khasra_number || record.survey_number || '',
      building_name: record.building_name || '',
      house_number: record.house_number || '',
      street_name: record.street_name || '',
      locality: record.locality || '',
      village_city: record.village_city || record.village || '',
      district: record.district || '',
      state: record.state || 'Karnataka',
      pincode: record.pincode || '',
      area_sqm: Number(record.area_sqm) || 120,
      floors: Number(record.floors) || 2,
      classification: record.classification || 'residential',
      confidence: Number(record.confidence) || 95,
      dilrmp_sync_status: record.dilrmp_sync_status || 'SYNCED',
      dilrmp_txn_id: record.dilrmp_txn_id || `DILRMP-MIS-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('land_records')
        .upsert(payload, { onConflict: 'ulpin' });

      if (error) {
        console.warn('[Supabase] Upsert error:', error.message);
      }
      return { success: !error, data, payload };
    } catch (err) {
      console.warn('[Supabase] Exception on upsert:', err);
      return { success: false, payload };
    }
  },

  /**
   * Seed/Bulk Sync all existing database records to Supabase
   */
  async syncAllToSupabase(records = []) {
    const results = [];
    for (const r of records) {
      const res = await this.upsertLandRecord(r);
      results.push(res);
    }
    return results;
  }
};
