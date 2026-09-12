import { generateULPIN, getMaskedAadhaar } from '../utils/ulpinService';

/**
 * storageService.js — Client-side persistence and PostGIS/GeoJSON export bridge.
 * Stores verified records, pending review queues, audit logs, and AI training feedback.
 */

const STORAGE_KEYS = {
  VERIFIED_RECORDS: 'sih_cadastre_verified_records',
  LAND_DATABASE: 'sih_cadastre_land_database',
  REVIEW_QUEUE: 'sih_cadastre_review_queue',
  AUDIT_LOGS: 'sih_cadastre_audit_logs',
  AI_FEEDBACK: 'sih_cadastre_ai_feedback',
  USER_ROLE: 'sih_cadastre_active_role',
  DISTRICT_STATS: 'sih_cadastre_district_stats',
};

// Initial Seed Records for the Land Database with ULPIN & Aadhaar metadata
export const INITIAL_LAND_DATABASE = [
  {
    id: 'REC-KA-2026-0891',
    createdAt: '2026-08-30T10:15:00.000Z',
    sourceType: 'Bhoomi RTC Scan (Gemini Vision AI)',
    fileName: 'kadugodi_rtc_extract_48_2a.png',
    building_name: 'Shree Sai Residency',
    house_number: 'Flat 302, Bldg 4B',
    street_name: 'Kadugodi Main Road',
    locality: 'Whitefield Zone',
    village_city: 'Kadugodi, Bengaluru',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    country: 'India',
    pincode: '560067',
    owner_name: 'Ramesh Kumar Sharma & Meera Ramesh',
    survey_number: '48/2A',
    floors: '3',
    size: '1450',
    size_unit: 'sft',
    area_sqm: 134.7,
    confidence: 96,
    ulpin: '29841029471024',
    aadhaar_number: 'XXXX-XXXX-8492',
    aadhaar_verified: true,
    dilrmp_sync_status: 'SYNCED',
    dilrmp_txn_id: 'DILRMP-MIS-2026-891024',
    dilrmp_sync_timestamp: '2026-08-30T10:18:00.000Z',
  },
  {
    id: 'REC-KA-2026-0892',
    createdAt: '2026-08-30T10:20:00.000Z',
    sourceType: 'Bhoomi RTC Mutation Extract',
    fileName: 'kadugodi_commercial_annex_48_2b.png',
    building_name: 'Shree Sai Commercial Wing',
    house_number: 'Shop G-04, Ground Floor',
    street_name: 'Kadugodi Main Road',
    locality: 'Whitefield Zone',
    village_city: 'Kadugodi, Bengaluru',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    country: 'India',
    pincode: '560067',
    owner_name: 'Ramesh Kumar Sharma',
    survey_number: '48/2B',
    floors: '1',
    size: '950',
    size_unit: 'sft',
    area_sqm: 88.5,
    confidence: 98,
    ulpin: '29841029471025',
    aadhaar_number: 'XXXX-XXXX-8492',
    aadhaar_verified: true,
    dilrmp_sync_status: 'SYNCED',
    dilrmp_txn_id: 'DILRMP-MIS-2026-891025',
    dilrmp_sync_timestamp: '2026-08-30T10:22:00.000Z',
  },
  {
    id: 'REC-UP-2026-4102',
    createdAt: '2026-08-30T09:40:00.000Z',
    sourceType: 'UP Bhulekh / Khatauni Upload',
    fileName: 'up_khatauni_scan_184.pdf',
    building_name: 'Pratap Mansion',
    house_number: 'House No. 184/A',
    street_name: 'GT Road Bypass',
    locality: 'Shivpur Industrial Sector',
    village_city: 'Shivpur, Varanasi',
    district: 'Varanasi',
    state: 'Uttar Pradesh',
    country: 'India',
    pincode: '221003',
    owner_name: 'विरेन्द्र प्रताप सिंह व सन्तोष कुमार',
    survey_number: '184/3',
    floors: '3',
    size: '2900',
    size_unit: 'sqy',
    area_sqm: 2424.8,
    confidence: 94,
    ulpin: '09712048912048',
    aadhaar_number: 'XXXX-XXXX-3829',
    aadhaar_verified: true,
    dilrmp_sync_status: 'SYNCED',
    dilrmp_txn_id: 'DILRMP-MIS-2026-410291',
    dilrmp_sync_timestamp: '2026-08-30T09:44:00.000Z',
  },
  {
    id: 'REC-MH-2026-9311',
    createdAt: '2026-08-30T08:20:00.000Z',
    sourceType: 'Maharashtra 7/12 Extract',
    fileName: 'wagholi_7_12_extract.jpg',
    building_name: 'Patil Commercial Arcade',
    house_number: 'Building 12',
    street_name: 'Nagar Highway',
    locality: 'Wagholi East',
    village_city: 'Wagholi, Pune',
    district: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    pincode: '412207',
    owner_name: 'राजेश मारुती पाटील (Rajesh M. Patil)',
    survey_number: '302/1B',
    floors: '4',
    size: '1.2',
    size_unit: 'acr',
    area_sqm: 4856.2,
    confidence: 95,
    ulpin: '27649102849102',
    aadhaar_number: 'XXXX-XXXX-9104',
    aadhaar_verified: false,
    dilrmp_sync_status: 'PENDING',
    dilrmp_txn_id: null,
    dilrmp_sync_timestamp: null,
  }
];

export const INITIAL_REVIEW_QUEUE = [];

export const storageService = {
  // ─── Land Database (Local Memory Persistence) ───
  getDatabaseRecords() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LAND_DATABASE);
      if (data) {
        let parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          // Guarantee all seed records (e.g. both Ramesh Sharma records 48/2A and 48/2B) are present
          const existingKeys = new Set(parsed.map((r) => r.id || r.ulpin));
          let changed = false;
          INITIAL_LAND_DATABASE.forEach((seed) => {
            if (!existingKeys.has(seed.id) && !existingKeys.has(seed.ulpin)) {
              parsed.push(seed);
              changed = true;
            }
          });
          if (changed) {
            localStorage.setItem(STORAGE_KEYS.LAND_DATABASE, JSON.stringify(parsed));
          }
          return parsed;
        }
      }
      localStorage.setItem(STORAGE_KEYS.LAND_DATABASE, JSON.stringify(INITIAL_LAND_DATABASE));
      return INITIAL_LAND_DATABASE;
    } catch {
      return INITIAL_LAND_DATABASE;
    }
  },

  saveDatabaseRecords(records) {
    try {
      localStorage.setItem(STORAGE_KEYS.LAND_DATABASE, JSON.stringify(records));
    } catch (e) {
      console.warn('Failed to persist land database:', e);
    }
  },

  /**
   * Validate that all critical cadastral fields are filled (no blanks).
   * @param {object} record
   * @returns {{ isValid: boolean, missingFields: string[] }}
   */
  validateCadastralRecord(record) {
    const requiredFields = [
      { key: 'building_name', label: 'Building Name' },
      { key: 'house_number', label: 'Building/House Number' },
      { key: 'street_name', label: 'Street/Road Name' },
      { key: 'locality', label: 'Locality/Area' },
      { key: 'village_city', label: 'Village/Town/City' },
      { key: 'district', label: 'District' },
      { key: 'state', label: 'State/Province' },
      { key: 'country', label: 'Country' },
      { key: 'pincode', label: 'PIN/ZIP Code' },
      { key: 'owner_name', label: 'Owner / Khatadar Name' },
      { key: 'aadhaar_number', label: 'Aadhaar Number (UIDAI)' },
      { key: 'survey_number', label: 'Survey / Hissa No' },
      { key: 'floors', label: 'Storeys (Floors)' },
      { key: 'size', label: 'Size' },
    ];

    const missingFields = [];
    requiredFields.forEach(({ key, label }) => {
      const val = record[key];
      if (val === undefined || val === null || String(val).trim() === '' || (key === 'size' && isNaN(Number(val)))) {
        missingFields.push(label);
      }
    });

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  },

  /**
   * Add records with strict deduplication check.
   * Duplicate identified by matching Survey No + Village/City + District (case-insensitive) or existing ID.
   */
  addRecordsToDatabase(newRecords) {
    const existing = this.getDatabaseRecords();
    let addedCount = 0;
    let updatedCount = 0;
    let duplicateWarnings = [];
    let lastRecord = null;

    const updatedList = [...existing];

    newRecords.forEach((rec) => {
      const surveyKey = String(rec.survey_number || rec.khasra_number || '').trim().toLowerCase();
      const villageKey = String(rec.village_city || rec.village || '').trim().toLowerCase();
      const districtKey = String(rec.district || '').trim().toLowerCase();
      const recId = rec.id ? String(rec.id).trim() : null;

      // Find existing match by ID or Survey+Village+District
      const matchIndex = updatedList.findIndex((item) => {
        if (recId && item.id === recId) return true;

        const itemSurvey = String(item.survey_number || item.khasra_number || '').trim().toLowerCase();
        const itemVillage = String(item.village_city || item.village || '').trim().toLowerCase();
        const itemDistrict = String(item.district || '').trim().toLowerCase();

        if (surveyKey && itemSurvey && surveyKey === itemSurvey) {
          if (!villageKey || !itemVillage || villageKey === itemVillage) {
            if (!districtKey || !itemDistrict || districtKey === itemDistrict) {
              return true;
            }
          }
        }
        return false;
      });

      // Calculate area_sqm from size & size_unit
      const unit = String(rec.size_unit || 'sft').toLowerCase();
      const numSize = Number(rec.size) || 1200;
      let calculatedSqm = numSize;
      if (unit === 'sft') calculatedSqm = Math.round(numSize * 0.092903 * 10) / 10;
      else if (unit === 'sqy') calculatedSqm = Math.round(numSize * 0.836127 * 10) / 10;
      else if (unit === 'acr') calculatedSqm = Math.round(numSize * 4046.86 * 10) / 10;

      if (matchIndex >= 0) {
        // Update existing record in-place to guarantee zero duplicates
        const existingRec = updatedList[matchIndex];
        const merged = {
          ...existingRec,
          ...rec,
          id: existingRec.id,
          createdAt: existingRec.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          building_name: String(rec.building_name || existingRec.building_name || '').trim(),
          house_number: String(rec.house_number || existingRec.house_number || '').trim(),
          street_name: String(rec.street_name || existingRec.street_name || '').trim(),
          locality: String(rec.locality || existingRec.locality || '').trim(),
          village_city: String(rec.village_city || rec.village || existingRec.village_city || existingRec.village || '').trim(),
          district: String(rec.district || existingRec.district || '').trim(),
          state: String(rec.state || existingRec.state || 'Karnataka').trim(),
          country: String(rec.country || existingRec.country || 'India').trim(),
          pincode: String(rec.pincode || existingRec.pincode || '').trim(),
          owner_name: String(rec.owner_name || existingRec.owner_name || '').trim(),
          survey_number: String(rec.survey_number || rec.khasra_number || existingRec.survey_number || '').trim(),
          floors: String(rec.floors || existingRec.floors || '2').trim(),
          size: String(rec.size || existingRec.size || '1200').trim(),
          size_unit: String(rec.size_unit || existingRec.size_unit || 'sft').toLowerCase().trim(),
          area_sqm: calculatedSqm,
          ulpin: rec.ulpin || existingRec.ulpin || generateULPIN(77.728, 12.985, rec.state || existingRec.state, rec.survey_number || existingRec.survey_number),
          aadhaar_number: rec.aadhaar_number || existingRec.aadhaar_number || getMaskedAadhaar(rec.owner_name || existingRec.owner_name),
          aadhaar_verified: rec.aadhaar_verified !== undefined ? rec.aadhaar_verified : (existingRec.aadhaar_verified !== undefined ? existingRec.aadhaar_verified : false),
          verification_mode: rec.verification_mode || existingRec.verification_mode || 'PENDING',
          digilocker_txn_id: rec.digilocker_txn_id || existingRec.digilocker_txn_id || null,
          dilrmp_sync_status: rec.dilrmp_sync_status || existingRec.dilrmp_sync_status || 'PENDING',
          dilrmp_txn_id: rec.dilrmp_txn_id || existingRec.dilrmp_txn_id || null,
          dilrmp_sync_timestamp: rec.dilrmp_sync_timestamp || existingRec.dilrmp_sync_timestamp || null,
        };
        updatedList[matchIndex] = merged;
        updatedCount++;
        lastRecord = merged;
        duplicateWarnings.push(`Survey No. ${merged.survey_number} already existed — updated existing entry with zero duplicate creation.`);
      } else {
        // Generate clean state prefix code
        const stateCode = (rec.district || rec.state || 'KA').substring(0, 2).toUpperCase();
        const year = new Date().getFullYear();
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const newId = rec.id || `REC-${stateCode}-${year}-${Date.now().toString().slice(-4)}-${randomNum}`;

        const newEntry = {
          ...rec,
          id: newId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sourceType: rec._source ? String(rec._source).toUpperCase() : (rec.sourceType || 'AI VISION SCAN'),
          fileName: rec._fileName || rec.fileName || 'Scanned Cadastral Document',
          building_name: String(rec.building_name || '').trim(),
          house_number: String(rec.house_number || '').trim(),
          street_name: String(rec.street_name || '').trim(),
          locality: String(rec.locality || '').trim(),
          village_city: String(rec.village_city || rec.village || '').trim(),
          district: String(rec.district || '').trim(),
          state: String(rec.state || 'Karnataka').trim(),
          country: String(rec.country || 'India').trim(),
          pincode: String(rec.pincode || '').trim(),
          owner_name: String(rec.owner_name || '').trim(),
          survey_number: String(rec.survey_number || rec.khasra_number || '').trim(),
          floors: String(rec.floors || '2').trim(),
          size: String(rec.size || '1200').trim(),
          size_unit: String(rec.size_unit || 'sft').toLowerCase().trim(),
          area_sqm: calculatedSqm,
          confidence: rec.confidence || rec._confidence || 95,
          ulpin: rec.ulpin || generateULPIN(77.728, 12.985, rec.state, rec.survey_number),
          aadhaar_number: rec.aadhaar_number || getMaskedAadhaar(rec.owner_name || rec.survey_number),
          aadhaar_verified: rec.aadhaar_verified !== undefined ? rec.aadhaar_verified : false,
          verification_mode: rec.verification_mode || 'PENDING',
          digilocker_txn_id: rec.digilocker_txn_id || null,
          dilrmp_sync_status: rec.dilrmp_sync_status || 'PENDING',
          dilrmp_txn_id: rec.dilrmp_txn_id || null,
          dilrmp_sync_timestamp: rec.dilrmp_sync_timestamp || null,
        };
        updatedList.unshift(newEntry);
        addedCount++;
        lastRecord = newEntry;
      }
    });

    this.saveDatabaseRecords(updatedList);
    return {
      success: true,
      addedCount,
      updatedCount,
      totalCount: updatedList.length,
      duplicateWarnings,
      lastRecord,
    };
  },

  /**
   * Add a single verified record with blank validation and deduplication.
   */
  addSingleRecord(record) {
    const validation = this.validateCadastralRecord(record);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Please fill in all blanks before saving: ${validation.missingFields.join(', ')}`,
        missingFields: validation.missingFields,
      };
    }

    const res = this.addRecordsToDatabase([record]);
    return {
      success: true,
      ...res,
    };
  },

  deleteDatabaseRecord(id) {
    const records = this.getDatabaseRecords();
    const filtered = records.filter(r => r.id !== id);
    this.saveDatabaseRecords(filtered);
    return filtered;
  },

  updateAadhaarVerification(recordId, verificationData) {
    const records = this.getDatabaseRecords();
    const updated = records.map((r) => {
      if (r.id === recordId || r.survey_number === recordId) {
        return {
          ...r,
          aadhaar_number: verificationData.maskedAadhaar || r.aadhaar_number,
          aadhaar_verified: true,
          aadhaar_auth_txnid: verificationData.authTransactionId,
          aadhaar_verified_at: verificationData.verifiedAt,
        };
      }
      return r;
    });
    this.saveDatabaseRecords(updated);
    return updated;
  },

  syncAllRecordsToDilrmp(txnId = null) {
    const records = this.getDatabaseRecords();
    const resolvedTxnId = txnId || `DILRMP-MIS-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const timestamp = new Date().toISOString();
    const updated = records.map((r) => ({
      ...r,
      dilrmp_sync_status: 'SYNCED',
      dilrmp_txn_id: resolvedTxnId,
      dilrmp_sync_timestamp: timestamp,
    }));
    this.saveDatabaseRecords(updated);
    return { updatedRecords: updated, txnId: resolvedTxnId, timestamp };
  },

  getReviewQueue() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REVIEW_QUEUE);
      if (data) return JSON.parse(data);
      localStorage.setItem(STORAGE_KEYS.REVIEW_QUEUE, JSON.stringify(INITIAL_REVIEW_QUEUE));
      return INITIAL_REVIEW_QUEUE;
    } catch {
      return INITIAL_REVIEW_QUEUE;
    }
  },

  saveReviewQueue(queue) {
    try {
      localStorage.setItem(STORAGE_KEYS.REVIEW_QUEUE, JSON.stringify(queue));
    } catch (e) {
      console.warn('Failed to persist review queue:', e);
    }
  },

  addToReviewQueue(item) {
    const queue = this.getReviewQueue();
    const updated = [item, ...queue];
    this.saveReviewQueue(updated);
    return updated;
  },

  updateQueueItem(id, updatedFields, newStatus = 'APPROVED', verifiedBy = 'Patwari') {
    const queue = this.getReviewQueue();
    const updated = queue.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          fields: { ...item.fields, ...updatedFields },
          status: newStatus,
          verifiedAt: new Date().toISOString(),
          verifiedBy,
          overallConfidence: 100,
        };
      }
      return item;
    });
    this.saveReviewQueue(updated);
    return updated;
  },

  getActiveRole() {
    return localStorage.getItem(STORAGE_KEYS.USER_ROLE) || 'patwari';
  },

  setActiveRole(role) {
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
  },

  exportDatabaseDump() {
    const exportBundle = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      system: 'SVAMITVA 3D Land Cadastre Normalizer',
      landDatabase: this.getDatabaseRecords(),
      reviewQueue: this.getReviewQueue(),
      auditLogs: localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS) ? JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) : [],
      aiFeedback: localStorage.getItem(STORAGE_KEYS.AI_FEEDBACK) ? JSON.parse(localStorage.getItem(STORAGE_KEYS.AI_FEEDBACK)) : [],
    };
    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `svamitva_land_database_dump_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
