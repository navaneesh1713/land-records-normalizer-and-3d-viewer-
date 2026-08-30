/**
 * apiGateway.js — External REST API Specifications & Interactive Dispatcher (Point 14).
 * Provides documented REST endpoints for NIC / State Revenue / GIS integration.
 */

import { storageService } from './storageService';
import { auditTrailService } from './auditTrailService';

export const API_ENDPOINTS_SPEC = [
  {
    method: 'GET',
    path: '/api/v1/parcel/{id}',
    summary: 'Fetch 3D Cadastral Parcel & Floor Titles',
    description: 'Retrieves 3D extruded geometry, floor-wise ownership records, FAR consumption, and encumbrance certificates.',
    params: [
      { name: 'id', in: 'path', required: true, example: 'BLDG-B1-KADUGODI-F0', type: 'string' }
    ],
    sampleRequest: 'curl -X GET "https://api.svamitva-cadastre.gov.in/api/v1/parcel/BLDG-B1-KADUGODI-F0" \\\n  -H "Authorization: Bearer GOV_KEY_8492019482"',
    sampleResponse: {
      status: 'success',
      statusCode: 200,
      data: {
        unit_id: 'BLDG-B1-KADUGODI-F0',
        plot_id: 'BLDG-B1-KADUGODI',
        building_name: 'Kadugodi Commercial Arcade (Block A)',
        floor_level: 0,
        floor_name: 'Ground Floor Unit G-1',
        min_height: 0,
        height: 3.5,
        owner_name: 'Ramesh Gowda',
        share_percentage: 100,
        khata_number: '712/B',
        survey_number: '48/2A',
        area_sqm: 320.5,
        classification: 'Commercial',
        tax_status: 'PAID (FY 2025-26)',
        encumbrance_status: 'CLEAR',
        digital_seal: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
      }
    }
  },
  {
    method: 'POST',
    path: '/api/v1/records/verify',
    summary: 'Submit Human-in-the-Loop Verification Decision',
    description: 'Approve, correct, or reject low-confidence OCR extracts into the official state 3D cadastre registry.',
    headers: { 'Content-Type': 'application/json' },
    sampleRequestBody: {
      document_id: 'DOC-2026-KA-0891',
      verifier_id: 'KA-REV-8492',
      verifier_role: 'Patwari / Field Verifier',
      status: 'APPROVED',
      corrected_fields: {
        owner_name: 'Ramesh Gowda',
        khata_number: '712/B'
      },
      remarks: 'Spelling verified with physical RoR Register Book 4, Page 88.'
    },
    sampleRequest: 'curl -X POST "https://api.svamitva-cadastre.gov.in/api/v1/records/verify" \\\n  -H "Authorization: Bearer GOV_KEY_8492019482" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"document_id":"DOC-2026-KA-0891","status":"APPROVED","verifier_id":"KA-REV-8492"}\'',
    sampleResponse: {
      status: 'success',
      statusCode: 201,
      message: 'Record successfully committed to 3D Cadastre registry.',
      audit_ref: 'AUDIT-LOG-1049',
      digital_seal: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'
    }
  },
  {
    method: 'GET',
    path: '/api/v1/analytics/district-stats',
    summary: 'Get State & District Digitization KPIs',
    description: 'Returns real-time SVAMITVA 3D digitization percentages, dispute counts, and processing volumes for executive dashboards.',
    params: [
      { name: 'state', in: 'query', required: false, example: 'Karnataka', type: 'string' }
    ],
    sampleRequest: 'curl -X GET "https://api.svamitva-cadastre.gov.in/api/v1/analytics/district-stats?state=Karnataka" \\\n  -H "Authorization: Bearer GOV_KEY_8492019482"',
    sampleResponse: {
      status: 'success',
      timestamp: '2026-08-30T12:00:00.000Z',
      summary: {
        total_parcels_digitized: 284190,
        total_3d_buildings_modeled: 48920,
        average_ocr_confidence: 91.4,
        pending_verification_queue: 18,
        dispute_rate_percentage: 1.84,
      },
      districts: [
        { name: 'Bengaluru Urban', progress_percent: 88.4, total_parcels: 74200, active_disputes: 14 },
        { name: 'Varanasi', progress_percent: 76.2, total_parcels: 62100, active_disputes: 28 },
        { name: 'Pune', progress_percent: 82.0, total_parcels: 89400, active_disputes: 19 },
        { name: 'Indore', progress_percent: 93.5, total_parcels: 58490, active_disputes: 8 }
      ]
    }
  },
  {
    method: 'POST',
    path: '/api/v1/ocr/extract',
    summary: 'Extract Indian Land Record Entities & Confidence Scores',
    description: 'Multi-lingual extraction of Khatiyan, 7/12, RTC, and Jamabandi records with field-level confidence ratings.',
    headers: { 'Content-Type': 'application/json' },
    sampleRequestBody: {
      raw_ocr_text: 'District: Bengaluru Urban | Survey No: 48/2A | Owner: Ramesh Gowda | Area: 1480.50 Sq.M',
      state_hint: 'Karnataka'
    },
    sampleRequest: 'curl -X POST "https://api.svamitva-cadastre.gov.in/api/v1/ocr/extract" \\\n  -H "Authorization: Bearer GOV_KEY_8492019482" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"raw_ocr_text":"..."}\'',
    sampleResponse: {
      status: 'success',
      extracted_fields: {
        owner_name: { value: 'Ramesh Gowda', confidence: 96, is_uncertain: false },
        survey_number: { value: '48/2A', confidence: 95, is_uncertain: false },
        district: { value: 'Bengaluru Urban', confidence: 98, is_uncertain: false },
        area_sqm: { value: 1480.5, confidence: 94, is_uncertain: false }
      },
      overall_confidence: 95.7,
      routing: 'AUTO_APPROVED_DIRECT_TO_3D'
    }
  }
];

export const apiGateway = {
  getEndpoints() {
    return API_ENDPOINTS_SPEC;
  },

  async executeEndpoint(method, path, inputParams = {}, requestBody = null) {
    // Simulate realistic network delay (180ms)
    await new Promise((resolve) => setTimeout(resolve, 180));

    if (path.includes('/parcel/')) {
      const id = inputParams.id || 'BLDG-B1-KADUGODI-F0';
      return {
        status: 'success',
        statusCode: 200,
        data: {
          unit_id: id,
          plot_id: 'BLDG-B1-KADUGODI',
          building_name: 'Kadugodi Commercial Arcade (Block A)',
          floor_level: 0,
          floor_name: 'Ground Floor Unit G-1',
          min_height: 0,
          height: 3.5,
          owner_name: 'Ramesh Gowda',
          share_percentage: 100,
          khata_number: '712/B',
          survey_number: '48/2A',
          area_sqm: 320.5,
          classification: 'Commercial',
          tax_status: 'PAID (FY 2025-26)',
          encumbrance_status: 'CLEAR',
          digital_seal: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
        }
      };
    }

    if (path.includes('/records/verify')) {
      const docId = requestBody?.document_id || 'DOC-2026-KA-0891';
      const role = requestBody?.verifier_role || 'Patwari / Field Verifier';
      auditTrailService.logAction({
        action: 'API_VERIFICATION_DISPATCH',
        actor: requestBody?.verifier_id || 'API Client',
        role,
        targetId: docId,
        details: `Verified via external REST endpoint: ${JSON.stringify(requestBody?.corrected_fields || {})}`
      });

      return {
        status: 'success',
        statusCode: 201,
        message: 'Record successfully verified and synchronized to 3D Cadastre spatial layer.',
        audit_ref: `AUDIT-LOG-${Date.now().toString().slice(-4)}`,
        digital_seal: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'
      };
    }

    if (path.includes('/analytics/district-stats')) {
      const queue = storageService.getReviewQueue();
      const pendingCount = queue.filter(q => q.status === 'PENDING_REVIEW').length;
      return {
        status: 'success',
        timestamp: new Date().toISOString(),
        summary: {
          total_parcels_digitized: 284190,
          total_3d_buildings_modeled: 48920,
          average_ocr_confidence: 91.4,
          pending_verification_queue: pendingCount,
          dispute_rate_percentage: 1.84,
        },
        districts: [
          { name: 'Bengaluru Urban (KA)', progress_percent: 88.4, total_parcels: 74200, active_disputes: 14 },
          { name: 'Varanasi (UP)', progress_percent: 76.2, total_parcels: 62100, active_disputes: 28 },
          { name: 'Pune (MH)', progress_percent: 82.0, total_parcels: 89400, active_disputes: 19 },
          { name: 'Indore (MP)', progress_percent: 93.5, total_parcels: 58490, active_disputes: 8 }
        ]
      };
    }

    if (path.includes('/ocr/extract')) {
      return {
        status: 'success',
        extracted_fields: {
          owner_name: { value: 'Ramesh Gowda', confidence: 96, is_uncertain: false },
          survey_number: { value: '48/2A', confidence: 95, is_uncertain: false },
          district: { value: 'Bengaluru Urban', confidence: 98, is_uncertain: false },
          area_sqm: { value: 1480.5, confidence: 94, is_uncertain: false }
        },
        overall_confidence: 95.7,
        routing: 'AUTO_APPROVED_DIRECT_TO_3D'
      };
    }

    return {
      status: 'error',
      statusCode: 404,
      message: `Endpoint ${method} ${path} not found.`
    };
  }
};
