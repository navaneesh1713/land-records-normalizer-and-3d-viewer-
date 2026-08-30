/**
 * ocrExtractor.js — Regex & heuristic key-value extraction with Confidence Scoring (Point 11).
 *
 * Designed for Indian land revenue documents:
 *   - 7/12 extracts (Maharashtra)
 *   - RTC / RoR (Karnataka Bhoomi)
 *   - Khatiyan / Jamabandi (Bihar, UP, Rajasthan)
 *   - SVAMITVA Property Cards
 *
 * Provides:
 *   - Extracted field values
 *   - Per-field confidence score (0-100%)
 *   - Uncertainty flags and reason explanations
 *   - Overall document extraction confidence
 */

/**
 * Calculate heuristic confidence for an individual extracted field value.
 */
function scoreFieldConfidence(fieldKey, value, matchedPatternIndex, totalPatterns, sourceText) {
  if (!value) {
    return { score: 0, isUncertain: true, reason: 'Field missing or not recognized in document OCR' };
  }

  let baseScore = 95 - (matchedPatternIndex * 5); // higher precedence regex = higher base confidence

  // Heuristic adjustments based on field semantics
  let reason = 'High pattern match certainty';
  let isUncertain = false;

  switch (fieldKey) {
    case 'owner_name':
      // Check for suspicious OCR characters (numbers, punctuation, repetitive letters)
      if (/\d/.test(value)) {
        baseScore -= 30;
        reason = 'Numbers found in owner name string (OCR glitch)';
        isUncertain = true;
      } else if (/(.)\1{2,}/.test(value)) {
        baseScore -= 25;
        reason = 'Repetitive OCR character sequence detected';
        isUncertain = true;
      } else if (value.length < 3) {
        baseScore -= 35;
        reason = 'Name string abnormally short';
        isUncertain = true;
      }
      break;

    case 'khasra_number':
    case 'survey_number':
      // Survey numbers typically look like '48/2', '184/3A', '302-B'
      if (!/[\d]/.test(value)) {
        baseScore -= 45;
        reason = 'No digits found in parcel identifier';
        isUncertain = true;
      } else if (value.length > 15) {
        baseScore -= 20;
        reason = 'Identifier string unusually long';
        isUncertain = true;
      }
      break;

    case 'khata_number':
      if (/^0{2,}/.test(value)) {
        baseScore -= 20;
        reason = 'Leading zeros detected (needs registry prefix validation)';
        isUncertain = true;
      }
      break;

    case 'area_sqm':
      if (typeof value === 'number') {
        if (value <= 0 || value > 500000) {
          baseScore -= 35;
          reason = 'Area figure out of expected urban/rural parcel bounds';
          isUncertain = true;
        }
      } else {
        baseScore -= 40;
        reason = 'Area could not be parsed as a numeric value';
        isUncertain = true;
      }
      break;

    case 'classification':
      const validClasses = ['residential', 'commercial', 'agricultural', 'industrial', 'vacant', 'institutional'];
      if (!validClasses.includes(value.toLowerCase())) {
        baseScore -= 30;
        reason = 'Non-standard land classification taxonomy';
        isUncertain = true;
      }
      break;

    default:
      break;
  }

  // Bound score between 10 and 99%
  const finalScore = Math.min(99, Math.max(15, baseScore));
  if (finalScore < 75) {
    isUncertain = true;
  }

  return {
    score: finalScore,
    isUncertain,
    reason: isUncertain ? reason : 'Extracted with high confidence'
  };
}

/**
 * Attempt to extract structured land record fields from raw OCR text with confidence metrics.
 * @param {string} rawText - The OCR output string
 * @returns {object} Extracted fields + fieldConfidence breakdown + overallConfidence
 */
export function extractFieldsFromOCR(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      owner_name: null,
      khasra_number: null,
      survey_number: null,
      khata_number: null,
      village: null,
      tehsil: null,
      district: null,
      classification: null,
      area_sqm: null,
      fieldConfidence: {},
      overallConfidence: 0,
      uncertainFields: [],
    };
  }

  const text = rawText.replace(/\r\n/g, '\n');

  // ── Owner Name ──
  const ownerPatterns = [
    /(?:owner(?:\s*name)?|malik|naam|name|नाम|मालिक)(?:\s*\/[^\:\-\n]+)?\s*[:\-–—]\s*([^\n\r,;]+)/i,
    /(?:khatedar|खातेदार|pattadar|पट्टादार)(?:\s*\/[^\:\-\n]+)?\s*[:\-–—]\s*([^\n\r,;]+)/i,
    /(?:s\/o|d\/o|w\/o|c\/o)\s+([^\n\r,;]+)/i,
  ];
  const { match: rawOwner, index: ownerIdx } = matchWithIndex(text, ownerPatterns);
  const owner_name = cleanValue(rawOwner);

  // ── Khasra Number ──
  const khasraPatterns = [
    /(?:khasra(?:\s*(?:no|number|num))?|खसरा(?:\s*(?:नं|संख्या))?)(?:\s*\/[^\:\-\n]+)?\s*[:\-–—.]\s*([\d\/\-A-Za-z]+)/i,
    /(?:gat(?:\s*no)?|गट(?:\s*नं)?)(?:\s*\/[^\:\-\n]+)?\s*[:\-–—.]\s*([\d\/\-A-Za-z]+)/i,
  ];
  const { match: rawKhasra, index: khasraIdx } = matchWithIndex(text, khasraPatterns);
  const khasra_number = cleanValue(rawKhasra);

  // ── Survey Number ──
  const surveyPatterns = [
    /(?:survey\s*(?:no|number|num)|sy\.?\s*no|सर्वे\s*(?:नं|संख्या))(?:\s*\/[^\:\-\n]+)?\s*[:\-–—.]\s*([\d\/\-A-Za-z]+)/i,
    /(?<!date\s+of\s+)(?<!survey\s+)(?:survey\s*(?:no|number)?)\s*[:\-–—.]\s*([\d\/\-A-Za-z]+)/i,
    /(?:hissa(?:\s*no)?|हिस्सा(?:\s*नं)?)(?:\s*\/[^\:\-\n]+)?\s*[:\-–—.]\s*([\d\/\-A-Za-z]+)/i,
  ];
  const { match: rawSurvey, index: surveyIdx } = matchWithIndex(text, surveyPatterns);
  const survey_number = cleanValue(rawSurvey);

  // ── Khata Number ──
  const khataPatterns = [
    /(?:khata(?:\s*(?:no|number))?|खाता(?:\s*(?:नं|संख्या))?)(?:\s*\/[^\:\-\n]+)?\s*[:\-–—.]\s*([\d\/\-A-Za-z]+)/i,
    /(?:khewat|खेवट)(?:\s*\/[^\:\-\n]+)?\s*[:\-–—.]\s*([\d\/\-A-Za-z]+)/i,
  ];
  const { match: rawKhata, index: khataIdx } = matchWithIndex(text, khataPatterns);
  const khata_number = cleanValue(rawKhata);

  // ── Village ──
  const villagePatterns = [
    /(?:village|gram|gaon|गांव|ग्राम|गाँव|mouza|मौजा)(?:\s*\/[^\:\-\n]+)?\s*[:\-–—]\s*([^\n\r,;]+)/i,
  ];
  const { match: rawVillage, index: villageIdx } = matchWithIndex(text, villagePatterns);
  const village = cleanValue(rawVillage);

  // ── Tehsil / Taluk ──
  const tehsilPatterns = [
    /(?:tehsil|taluk|taluka|तहसील|तालुक|तालुका)(?:\s*\/[^\:\-\n]+)?\s*[:\-–—]\s*([^\n\r,;]+)/i,
  ];
  const { match: rawTehsil, index: tehsilIdx } = matchWithIndex(text, tehsilPatterns);
  const tehsil = cleanValue(rawTehsil);

  // ── District ──
  const districtPatterns = [
    /(?:district|zila|jila|जिला|ज़िला)(?:\s*\/[^\:\-\n]+)?\s*[:\-–—]\s*([^\n\r,;]+)/i,
  ];
  const { match: rawDistrict, index: districtIdx } = matchWithIndex(text, districtPatterns);
  const district = cleanValue(rawDistrict);

  // ── Classification / Land Use ──
  const classPatterns = [
    /(?:classification|land\s*use|bhumi\s*upyog|भूमि\s*उपयोग|प्रकार)(?:\s*\/[^\:\-\n]+)?\s*[:\-–—]\s*([^\n\r,;]+)/i,
    /(?:type|category)\s*[:\-–—]?\s*(residential|commercial|agricultural|industrial|vacant)/i,
  ];
  const { match: rawClass, index: classIdx } = matchWithIndex(text, classPatterns);
  let classification = rawClass ? inferClassification(rawClass) : null;

  // ── Area ──
  const areaPatterns = [
    /(?:area|kshetra|क्षेत्रफल|रकबा)(?:\s*\/[^\:\-\n]+)?\s*[:\-–—]\s*([\d.,]+)\s*(?:sq\.?\s*m|sqm|m2|वर्ग\s*मीटर)?/i,
    /(?:area|kshetra)\s*[:\-–—]?\s*([\d.,]+)\s*(?:acres?|hectares?|bigha|biswa)/i,
  ];
  let area_sqm = null;
  const { match: rawArea, index: areaIdx } = matchWithIndex(text, areaPatterns);
  if (rawArea) {
    const num = parseFloat(rawArea.replace(/,/g, ''));
    if (!isNaN(num)) area_sqm = num;
  }

  // ── Calculate Field Confidence Breakdown ──
  const fieldConfidence = {
    owner_name: scoreFieldConfidence('owner_name', owner_name, ownerIdx, ownerPatterns.length, text),
    khasra_number: scoreFieldConfidence('khasra_number', khasra_number, khasraIdx, khasraPatterns.length, text),
    survey_number: scoreFieldConfidence('survey_number', survey_number, surveyIdx, surveyPatterns.length, text),
    khata_number: scoreFieldConfidence('khata_number', khata_number, khataIdx, khataPatterns.length, text),
    village: scoreFieldConfidence('village', village, villageIdx, villagePatterns.length, text),
    tehsil: scoreFieldConfidence('tehsil', tehsil, tehsilIdx, tehsilPatterns.length, text),
    district: scoreFieldConfidence('district', district, districtIdx, districtPatterns.length, text),
    classification: scoreFieldConfidence('classification', classification, classIdx, classPatterns.length, text),
    area_sqm: scoreFieldConfidence('area_sqm', area_sqm, areaIdx, areaPatterns.length, text),
  };

  // Identify uncertain fields
  const uncertainFields = Object.entries(fieldConfidence)
    .filter(([_, conf]) => conf.isUncertain)
    .map(([key, conf]) => ({ field: key, ...conf }));

  // Aggregate overall confidence
  const nonNullScores = Object.values(fieldConfidence)
    .filter(f => f.score > 0)
    .map(f => f.score);

  const overallConfidence = nonNullScores.length > 0
    ? Math.round(nonNullScores.reduce((a, b) => a + b, 0) / nonNullScores.length)
    : 0;

  return {
    owner_name,
    khasra_number,
    survey_number,
    khata_number,
    village,
    tehsil,
    district,
    classification: classification || null,
    area_sqm,
    fieldConfidence,
    overallConfidence,
    uncertainFields,
  };
}

/**
 * Try multiple regex patterns and return the first capture group match along with matched index.
 */
function matchWithIndex(text, patterns) {
  for (let i = 0; i < patterns.length; i++) {
    const m = text.match(patterns[i]);
    if (m && m[1]) return { match: m[1].trim(), index: i };
  }
  return { match: null, index: -1 };
}

/**
 * Normalize a classification string to one of the standard categories.
 */
function inferClassification(raw) {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (/resid|आवासीय|housing|flat|apartment/i.test(lower)) return 'residential';
  if (/commerc|व्यावसायिक|shop|office|market/i.test(lower)) return 'commercial';
  if (/agri|कृषि|farm|crop|kheti/i.test(lower)) return 'agricultural';
  if (/indust|औद्योगिक|factory|manufactur/i.test(lower)) return 'industrial';
  if (/vacant|खाली|empty|barren/i.test(lower)) return 'vacant';
  if (/instit|संस्था|school|hospital|office/i.test(lower)) return 'institutional';
  return raw.toLowerCase();
}

/**
 * Clean trailing punctuation and common OCR artifacts from extracted values.
 */
function cleanValue(val) {
  if (!val) return null;
  return val.replace(/[,;:.\s]+$/, '').replace(/^\s+/, '').trim() || null;
}
