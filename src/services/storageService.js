/**
 * storageService.js — Client-side persistence and PostGIS/GeoJSON export bridge.
 * Stores verified records, pending review queues, audit logs, and AI training feedback.
 */

const STORAGE_KEYS = {
  VERIFIED_RECORDS: 'sih_cadastre_verified_records',
  REVIEW_QUEUE: 'sih_cadastre_review_queue',
  AUDIT_LOGS: 'sih_cadastre_audit_logs',
  AI_FEEDBACK: 'sih_cadastre_ai_feedback',
  USER_ROLE: 'sih_cadastre_active_role',
  DISTRICT_STATS: 'sih_cadastre_district_stats',
};

// Default initial mock data for review queue
export const INITIAL_REVIEW_QUEUE = [
  {
    id: 'DOC-2026-KA-0891',
    timestamp: '2026-08-30T10:15:00.000Z',
    documentType: 'Bhoomi RTC / 7-12 Extract',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    taluk: 'Bengaluru East',
    village: 'Kadugodi',
    sourceText: `GOVERNMENT OF KARNATAKA - REVENUE DEPARTMENT
RECORD OF RIGHTS, TENANCY AND CROPS (RTC) - FORM NO. 16
District: Bengaluru Urban | Taluk: Bengaluru East | Hobli: Bidarahalli | Village: Kadugodi
Survey / Hissa No: 48/2A
Khata No: 712/B
Pattadar / Owner Name: Rameeshh Gowwda (S/O Late Venkataswamy)
Total Extent / Area: 1480.50 Sq.M (15,935 Sq.Ft)
Land Classification: Non-Agricultural (Commercial Complex - B+G+3)
Status: Active Tenancy`,
    fields: {
      owner_name: { value: 'Rameeshh Gowwda', confidence: 64, isUncertain: true, reason: 'Double consonant OCR artefact detected' },
      survey_number: { value: '48/2A', confidence: 95, isUncertain: false },
      khata_number: { value: '712/B', confidence: 91, isUncertain: false },
      village: { value: 'Kadugodi', confidence: 98, isUncertain: false },
      tehsil: { value: 'Bengaluru East', confidence: 94, isUncertain: false },
      district: { value: 'Bengaluru Urban', confidence: 97, isUncertain: false },
      classification: { value: 'Commercial', confidence: 88, isUncertain: false },
      area_sqm: { value: 1480.5, confidence: 93, isUncertain: false },
    },
    overallConfidence: 77,
    status: 'PENDING_REVIEW',
    assignedTo: 'Patwari K. Suresh (EmpID: KA-REV-8492)',
    flaggedReason: 'Uncertain Owner Name spelling requiring Patwari verification',
    imageSampleUrl: 'bhoomi_rtc_sample_48_2a.png',
  },
  {
    id: 'DOC-2026-UP-4102',
    timestamp: '2026-08-30T09:40:00.000Z',
    documentType: 'UP Bhulekh / Khatauni',
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    taluk: 'Pindra',
    village: 'Shivpur',
    sourceText: `उत्तर प्रदेश राजस्व परिषद - खतौनी (अधिकार अभिलेख)
ग्राम: शिवपुर | परगना: शिवपुर | तहसील: पिण्डरा | जनपद: वाराणसी
खसरा / गाटा संख्या: 184/3
खाता संख्या: 00491
खातेदार का नाम: विरेन्द्र प्रताप सिंह व सन्तोष कुमार (बराबर हिस्सा)
क्षेत्रफल: 0.2450 हेक्टेयर (2450 वर्ग मीटर)
भूमि उपयोग: आवासीय (G+2 Floors)
टिप्पणी: बंधक मुक्त / कोई विवाद नहीं`,
    fields: {
      owner_name: { value: 'विरेन्द्र प्रताप सिंह व सन्तोष कुमार', confidence: 91, isUncertain: false },
      khasra_number: { value: '184/3', confidence: 94, isUncertain: false },
      khata_number: { value: '00491', confidence: 58, isUncertain: true, reason: 'Leading zeros check needed in registry' },
      village: { value: 'शिवपुर (Shivpur)', confidence: 96, isUncertain: false },
      tehsil: { value: 'पिण्डरा (Pindra)', confidence: 92, isUncertain: false },
      district: { value: 'वाराणसी (Varanasi)', confidence: 98, isUncertain: false },
      classification: { value: 'Residential', confidence: 89, isUncertain: false },
      area_sqm: { value: 2450.0, confidence: 94, isUncertain: false },
    },
    overallConfidence: 79,
    status: 'PENDING_REVIEW',
    assignedTo: 'Patwari R. Sharma (EmpID: UP-REV-3910)',
    flaggedReason: 'Joint share split validation required for 3D cadastre multi-unit zoning',
    imageSampleUrl: 'up_khatauni_sample_184.png',
  },
  {
    id: 'DOC-2026-MH-9311',
    timestamp: '2026-08-30T08:20:00.000Z',
    documentType: 'Maharashtra 7/12 Extract',
    state: 'Maharashtra',
    district: 'Pune',
    taluk: 'Haveli',
    village: 'Wagholi',
    sourceText: `महाराष्ट्र शासन - महसूल विभाग
गाव नमुना ७/१२ (अधिकार अभिलेख पत्रक)
जिल्हा: पुणे | तालुका: हवेली | गाव: वाघोली
गट क्रमांक: 302/1B
खाते क्रमांक: 1045
भोगवटदाराचे नाव: राजेश मारुती पाटील
एकूण क्षेत्र: 1850 चौ.मी.
आकार / कर: रु. 14.50
इतर हक्क: बँक ऑफ महाराष्ट्र कडे तारण`,
    fields: {
      owner_name: { value: 'राजेश मारुती पाटील (Rajesh M. Patil)', confidence: 95, isUncertain: false },
      khasra_number: { value: '302/1B', confidence: 93, isUncertain: false },
      khata_number: { value: '1045', confidence: 90, isUncertain: false },
      village: { value: 'वाघोली (Wagholi)', confidence: 96, isUncertain: false },
      tehsil: { value: 'हवेली (Haveli)', confidence: 94, isUncertain: false },
      district: { value: 'पुणे (Pune)', confidence: 98, isUncertain: false },
      classification: { value: 'Institutional', confidence: 52, isUncertain: true, reason: 'Bank encumbrance flagged in other rights column' },
      area_sqm: { value: 1850.0, confidence: 95, isUncertain: false },
    },
    overallConfidence: 76,
    status: 'PENDING_REVIEW',
    assignedTo: 'Talathi M. Deshmukh (EmpID: MH-REV-1094)',
    flaggedReason: 'Mortgage / Encumbrance flag verification on 3D building title',
    imageSampleUrl: 'mh_712_sample_302.png',
  }
];

export const storageService = {
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
      reviewQueue: this.getReviewQueue(),
      auditLogs: localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS) ? JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) : [],
      aiFeedback: localStorage.getItem(STORAGE_KEYS.AI_FEEDBACK) ? JSON.parse(localStorage.getItem(STORAGE_KEYS.AI_FEEDBACK)) : [],
    };
    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `svamitva_cadastre_state_dump_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
