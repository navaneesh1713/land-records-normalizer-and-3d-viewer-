/**
 * aiFeedbackService.js — Continuous AI Learning & Model Improvement Feedback Loop (Point 13).
 * Captures human corrections (wrong OCR value -> verified human value) to feed periodic model retraining.
 */

const STORAGE_KEY = 'sih_cadastre_ai_feedback';

export const INITIAL_FEEDBACK_LOGS = [
  {
    id: 'TR-PAIR-0198',
    timestamp: '2026-08-30T11:45:12.000Z',
    documentId: 'DOC-2026-KA-0891',
    state: 'Karnataka (Bhoomi RTC)',
    field: 'owner_name',
    extractedOcrValue: 'Rameeshh Gowwda',
    humanCorrectedValue: 'Ramesh Gowda',
    originalConfidence: 64,
    correctedConfidence: 100,
    errorCategory: 'OCR Character Glitch / Redundant Consonants',
    verifiedBy: 'Patwari K. Suresh (KA-REV-8492)',
    trainingStatus: 'QUEUED_FOR_EPOCH_14',
  },
  {
    id: 'TR-PAIR-0197',
    timestamp: '2026-08-30T10:02:18.000Z',
    documentId: 'DOC-2026-UP-4102',
    state: 'Uttar Pradesh (Bhulekh)',
    field: 'khata_number',
    extractedOcrValue: '00491',
    humanCorrectedValue: '491',
    originalConfidence: 58,
    correctedConfidence: 100,
    errorCategory: 'Leading Zero Normalization',
    verifiedBy: 'Patwari R. Sharma (UP-REV-3910)',
    trainingStatus: 'QUEUED_FOR_EPOCH_14',
  },
  {
    id: 'TR-PAIR-0196',
    timestamp: '2026-08-29T17:14:05.000Z',
    documentId: 'DOC-2026-MH-9311',
    state: 'Maharashtra (7/12)',
    field: 'classification',
    extractedOcrValue: 'Institutional',
    humanCorrectedValue: 'Commercial (Mixed Multi-Tenant)',
    originalConfidence: 52,
    correctedConfidence: 100,
    errorCategory: 'Land-Use Taxonomy Disambiguation',
    verifiedBy: 'Talathi M. Deshmukh (MH-REV-1094)',
    trainingStatus: 'INCORPORATED_IN_EPOCH_13',
  },
  {
    id: 'TR-PAIR-0195',
    timestamp: '2026-08-29T14:33:50.000Z',
    documentId: 'DOC-2026-KA-0711',
    state: 'Karnataka (Bhoomi RTC)',
    field: 'area_sqm',
    extractedOcrValue: '148O.5',
    humanCorrectedValue: '1480.5',
    originalConfidence: 45,
    correctedConfidence: 100,
    errorCategory: 'Letter "O" vs Digit "0" OCR Misclassification',
    verifiedBy: 'Patwari K. Suresh (KA-REV-8492)',
    trainingStatus: 'INCORPORATED_IN_EPOCH_13',
  }
];

export const aiFeedbackService = {
  getFeedbackLogs() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) return JSON.parse(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_FEEDBACK_LOGS));
      return INITIAL_FEEDBACK_LOGS;
    } catch {
      return INITIAL_FEEDBACK_LOGS;
    }
  },

  logCorrection({ documentId, state, field, extractedOcrValue, humanCorrectedValue, originalConfidence, verifiedBy, errorCategory }) {
    const logs = this.getFeedbackLogs();
    const newEntry = {
      id: `TR-PAIR-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      documentId: documentId || 'DOC-UNASSIGNED',
      state: state || 'Karnataka (Bhoomi RTC)',
      field,
      extractedOcrValue: String(extractedOcrValue || ''),
      humanCorrectedValue: String(humanCorrectedValue || ''),
      originalConfidence: originalConfidence || 60,
      correctedConfidence: 100,
      errorCategory: errorCategory || 'Manual Verifier Revision',
      verifiedBy: verifiedBy || 'Patwari / Verifier',
      trainingStatus: 'QUEUED_FOR_NEXT_EPOCH',
    };

    const updated = [newEntry, ...logs];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save AI feedback:', e);
    }
    return updated;
  },

  getStats() {
    const logs = this.getFeedbackLogs();
    const total = logs.length;
    const queued = logs.filter(l => l.trainingStatus.includes('QUEUED')).length;
    const incorporated = logs.filter(l => l.trainingStatus.includes('INCORPORATED')).length;

    // Field-wise breakdown
    const fieldCounts = {};
    logs.forEach(l => {
      fieldCounts[l.field] = (fieldCounts[l.field] || 0) + 1;
    });

    return {
      totalCorrections: total,
      queuedForTraining: queued,
      incorporatedInModel: incorporated,
      fieldCounts,
      estimatedAccuracyGain: `+${(total * 0.18).toFixed(2)}%`,
    };
  },

  exportJSONL() {
    const logs = this.getFeedbackLogs();
    const jsonlRows = logs.map(l => JSON.stringify({
      instruction: `Extract structured Indian revenue entity for field: ${l.field}`,
      input: l.extractedOcrValue,
      target_output: l.humanCorrectedValue,
      metadata: {
        document_id: l.documentId,
        state: l.state,
        verified_by: l.verifiedBy,
        timestamp: l.timestamp,
      }
    }));

    const blob = new Blob([jsonlRows.join('\n')], { type: 'application/x-jsonlines' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sih_cadastre_ocr_finetune_dataset_${Date.now()}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
