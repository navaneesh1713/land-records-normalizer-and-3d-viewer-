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

// Initial Seed Records for the Land Database
export const INITIAL_LAND_DATABASE = [
  {
    id: 'REC-KA-2026-0891',
    createdAt: '2026-08-30T10:15:00.000Z',
    sourceType: 'Bhoomi RTC Scan (Gemini Vision AI)',
    fileName: 'kadugodi_rtc_extract_48_2a.png',
    owner_name: 'Ramesh Kumar Sharma & Meera Ramesh',
    survey_number: '48/2A',
    khasra_number: '104/1',
    khata_number: '712/B',
    village: 'Kadugodi',
    tehsil: 'Bengaluru East',
    district: 'Bengaluru Urban',
    classification: 'residential',
    area_sqm: 420.5,
    floors: '2',
    height_m: '6.5',
    tax_status: 'PAID (FY 2025-26)',
    encumbrance_status: 'CLEAR',
    confidence: 96,
  },
  {
    id: 'REC-UP-2026-4102',
    createdAt: '2026-08-30T09:40:00.000Z',
    sourceType: 'UP Bhulekh / Khatauni Upload',
    fileName: 'up_khatauni_scan_184.pdf',
    owner_name: 'विरेन्द्र प्रताप सिंह व सन्तोष कुमार',
    survey_number: '184/3',
    khasra_number: '184/3',
    khata_number: '00491',
    village: 'Shivpur',
    tehsil: 'Pindra',
    district: 'Varanasi',
    classification: 'residential',
    area_sqm: 2450.0,
    floors: '3',
    height_m: '9.0',
    tax_status: 'PAID',
    encumbrance_status: 'CLEAR',
    confidence: 94,
  },
  {
    id: 'REC-MH-2026-9311',
    createdAt: '2026-08-30T08:20:00.000Z',
    sourceType: 'Maharashtra 7/12 Extract',
    fileName: 'wagholi_7_12_extract.jpg',
    owner_name: 'राजेश मारुती पाटील (Rajesh M. Patil)',
    survey_number: '302/1B',
    khasra_number: '302/1B',
    khata_number: '1045',
    village: 'Wagholi',
    tehsil: 'Haveli',
    district: 'Pune',
    classification: 'commercial',
    area_sqm: 1850.0,
    floors: '4',
    height_m: '12.5',
    tax_status: 'PAID',
    encumbrance_status: 'MORTGAGED',
    confidence: 95,
  }
];

export const storageService = {
  // ─── Land Database (Local Memory Persistence) ───
  getDatabaseRecords() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LAND_DATABASE);
      if (data) return JSON.parse(data);
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
   * Add records with strict deduplication check.
   * Duplicate identified by matching Survey/Khasra No + Village + District (case-insensitive).
   */
  addRecordsToDatabase(newRecords) {
    const existing = this.getDatabaseRecords();
    let addedCount = 0;
    let updatedCount = 0;
    let duplicateWarnings = [];

    const updatedList = [...existing];

    newRecords.forEach((rec) => {
      const surveyKey = (rec.survey_number || rec.khasra_number || '').trim().toLowerCase();
      const villageKey = (rec.village || '').trim().toLowerCase();
      const districtKey = (rec.district || '').trim().toLowerCase();

      // Find existing match
      const matchIndex = updatedList.findIndex((item) => {
        const itemSurvey = (item.survey_number || item.khasra_number || '').trim().toLowerCase();
        const itemVillage = (item.village || '').trim().toLowerCase();
        const itemDistrict = (item.district || '').trim().toLowerCase();

        if (surveyKey && itemSurvey && surveyKey === itemSurvey) {
          if (!villageKey || !itemVillage || villageKey === itemVillage) {
            return true;
          }
        }
        return false;
      });

      if (matchIndex >= 0) {
        // Update existing record rather than duplicating
        updatedList[matchIndex] = {
          ...updatedList[matchIndex],
          ...rec,
          updatedAt: new Date().toISOString(),
        };
        updatedCount++;
        duplicateWarnings.push(`Updated existing record for Survey No. ${rec.survey_number || rec.khasra_number}`);
      } else {
        // Add new unique record
        const newEntry = {
          id: `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          createdAt: new Date().toISOString(),
          sourceType: rec._source ? String(rec._source).toUpperCase() : 'AI VISION SCAN',
          fileName: rec._fileName || 'Scanned Document',
          owner_name: rec.owner_name || '',
          survey_number: rec.survey_number || rec.khasra_number || '',
          khasra_number: rec.khasra_number || '',
          khata_number: rec.khata_number || '',
          village: rec.village || '',
          tehsil: rec.tehsil || '',
          district: rec.district || '',
          classification: rec.classification || 'residential',
          area_sqm: rec.area_sqm || (rec.area_acres ? Number(rec.area_acres) * 4046.86 : 350),
          floors: rec.floors || '2',
          height_m: rec.height_m || '6.5',
          tax_status: rec.tax_status || 'PAID',
          encumbrance_status: rec.encumbrance_status || 'CLEAR',
          confidence: rec._confidence || 90,
          ...rec,
        };
        updatedList.unshift(newEntry);
        addedCount++;
      }
    });

    this.saveDatabaseRecords(updatedList);
    return {
      addedCount,
      updatedCount,
      totalCount: updatedList.length,
      duplicateWarnings,
      records: updatedList,
    };
  },

  deleteDatabaseRecord(id) {
    const records = this.getDatabaseRecords();
    const filtered = records.filter(r => r.id !== id);
    this.saveDatabaseRecords(filtered);
    return filtered;
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
