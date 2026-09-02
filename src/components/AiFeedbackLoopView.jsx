import React, { useState } from 'react';
import {
  BrainCircuit, Sparkles, Download, CheckCircle2, TrendingUp, RefreshCw,
  Layers, Database, ArrowRight, BookOpen, AlertCircle, Cpu, Sliders, Check
} from 'lucide-react';
import { aiFeedbackService } from '../services/aiFeedbackService';

export default function AiFeedbackLoopView() {
  const [feedbackLogs, setFeedbackLogs] = useState(() => aiFeedbackService.getFeedbackLogs());
  const [selectedTargetModel, setSelectedTargetModel] = useState('Gemini 2.5 Flash');
  const stats = aiFeedbackService.getStats();

  const handleExportJSONL = () => {
    aiFeedbackService.exportJSONL();
  };

  return (
    <div className="ai-feedback-page-root animate-fade-in" style={{ flex: 1, height: '100%', overflowY: 'auto', background: '#f8fafc', padding: '28px 32px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(124, 58, 237, 0.25)' }}>
            <BrainCircuit size={20} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Continuous AI Learning & Feedback Loop
            </h1>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Captures every Patwari ground-truth verification to periodically fine-tune Multimodal OCR & spatial normalizer models
            </span>
          </div>
        </div>

        {/* Export JSONL Button */}
        <button
          onClick={handleExportJSONL}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
          }}
        >
          <Download size={15} /> Export Training JSONL (LoRA / DoTR)
        </button>
      </div>

      {/* Metrics Cards Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '24px' }}>
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Human Corrections Logged</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>{stats.totalCorrections}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Ground-truth pairs captured from HITL review</div>
        </div>

        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Queued for Next Fine-Tuning</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#7c3aed', marginBottom: '4px' }}>{stats.queuedForTraining}</div>
          <div style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 600 }}>Target Epoch: v2.4 Scheduled</div>
        </div>

        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Incorporated in Production Model</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a', marginBottom: '4px' }}>{stats.incorporatedInModel}</div>
          <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>Active Baseline: Epoch v2.3</div>
        </div>

        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Accuracy Gain Trajectory</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#2563eb', marginBottom: '4px' }}>{stats.estimatedAccuracyGain}</div>
          <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600 }}>+12.4% gain over raw OCR baseline</div>
        </div>
      </div>

      {/* 4-Step Visual HITL Pipeline Banner */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '20px 24px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>1</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Raw OCR Extraction</div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>Noisy document scanning</div>
          </div>
        </div>

        <ArrowRight size={16} color="#cbd5e1" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>2</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Ambiguity Flagged</div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>Tokens with &lt;75% confidence</div>
          </div>
        </div>

        <ArrowRight size={16} color="#cbd5e1" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#EDF2FE', color: '#0052FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>3</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Patwari Ground Truth</div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>Verified human input</div>
          </div>
        </div>

        <ArrowRight size={16} color="#cbd5e1" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>4</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Automated JSONL Retraining</div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>Weights updated periodically</div>
          </div>
        </div>
      </div>

      {/* Captured Training Pairs Table */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Captured Ground-Truth Pairs ({feedbackLogs.length})
          </h3>
          <span style={{ fontSize: '12.5px', color: '#64748b' }}>Ready for LoRA adapter tuning</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>ID</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>State & Format</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Target Field</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Noisy OCR Value</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Human-Verified Ground Truth</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Initial Score</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Verified By</th>
              </tr>
            </thead>
            <tbody>
              {feedbackLogs.map((log, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                    {log.documentId || `PAIR-${idx + 1}`}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600 }}>
                      {log.state || 'Karnataka'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: '#475569' }}>
                    {(log.field || '').toUpperCase()}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', fontWeight: 600 }}>
                      {log.extractedOcrValue}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', fontWeight: 700 }}>
                      {log.humanCorrectedValue}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                      {log.originalConfidence}%
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', color: '#475569', fontSize: '12.5px' }}>
                    {log.verifiedBy || 'Patwari (Field Verifier)'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
