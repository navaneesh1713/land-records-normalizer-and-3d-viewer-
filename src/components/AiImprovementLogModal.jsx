import React, { useState } from 'react';
import {
  BrainCircuit, Sparkles, Download, CheckCircle2, TrendingUp, RefreshCw,
  X, Layers, Database, ArrowRight, BookOpen, AlertCircle
} from 'lucide-react';
import { aiFeedbackService } from '../services/aiFeedbackService';

export default function AiImprovementLogModal({ onClose }) {
  const [feedbackLogs, setFeedbackLogs] = useState(() => aiFeedbackService.getFeedbackLogs());
  const stats = aiFeedbackService.getStats();

  const handleExportJSONL = () => {
    aiFeedbackService.exportJSONL();
  };

  return (
    <div className="modal-backdrop animate-fade-in">
      <div className="ai-log-modal glass-panel animate-scale-up">
        {/* Header */}
        <div className="ai-log-header">
          <div className="ai-log-header-left">
            <div className="ai-icon-pill">
              <BrainCircuit size={18} color="#8b5cf6" />
            </div>
            <div>
              <h2 className="ai-log-title">Continuous AI Learning & Model Improvement Loop</h2>
              <p className="ai-log-subtitle">
                Captures every Patwari correction (Wrong OCR $\rightarrow$ Verified Truth) to feed periodic neural model fine-tuning
              </p>
            </div>
          </div>
          <button onClick={onClose} className="sidebar-close-btn">
            <X size={16} />
          </button>
        </div>

        {/* Key Metrics Strip */}
        <div className="ai-stats-grid">
          <div className="ai-stat-card">
            <div className="ai-stat-label">Human Corrections Captured</div>
            <div className="ai-stat-value">{stats.totalCorrections}</div>
            <div className="ai-stat-sub">Ground-truth pairs logged</div>
          </div>
          <div className="ai-stat-card">
            <div className="ai-stat-label">Queued for Next Fine-Tuning</div>
            <div className="ai-stat-value highlight-purple">{stats.queuedForTraining}</div>
            <div className="ai-stat-sub">Target Epoch: v2.4 Scheduled</div>
          </div>
          <div className="ai-stat-card">
            <div className="ai-stat-label">Incorporated in Active Model</div>
            <div className="ai-stat-value highlight-green">{stats.incorporatedInModel}</div>
            <div className="ai-stat-sub">Baseline Epoch v2.3</div>
          </div>
          <div className="ai-stat-card">
            <div className="ai-stat-label">Accuracy Gain Trajectory</div>
            <div className="ai-stat-value highlight-indigo">{stats.estimatedAccuracyGain}</div>
            <div className="ai-stat-sub">Over raw baseline OCR</div>
          </div>
        </div>

        {/* Feedback Explanation Banner */}
        <div className="ai-learning-pipeline-banner">
          <div className="pipeline-step">
            <span className="step-num">1</span>
            <span className="step-text">OCR extracts noisy text from land records</span>
          </div>
          <ArrowRight size={14} color="#6366f1" />
          <div className="pipeline-step">
            <span className="step-num">2</span>
            <span className="step-text">Uncertain tokens flagged (&lt; 75% conf)</span>
          </div>
          <ArrowRight size={14} color="#6366f1" />
          <div className="pipeline-step">
            <span className="step-num">3</span>
            <span className="step-text">Patwari reviews & inputs ground truth</span>
          </div>
          <ArrowRight size={14} color="#6366f1" />
          <div className="pipeline-step active">
            <span className="step-num">4</span>
            <span className="step-text">Logged to retraining dataset (JSONL)</span>
          </div>
        </div>

        {/* Feedback Table */}
        <div className="ai-table-section">
          <div className="ai-table-header">
            <span>Captured Training Pairs ({feedbackLogs.length})</span>
            <button onClick={handleExportJSONL} className="ai-export-btn">
              <Download size={13} />
              <span>Export Fine-Tuning JSONL (LoRA/DoTR)</span>
            </button>
          </div>

          <div className="ai-table-wrapper">
            <table className="ai-logs-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>State / Dataset</th>
                  <th>Target Field</th>
                  <th>Extracted Value (Raw OCR)</th>
                  <th>Verified Value (Human Truth)</th>
                  <th>Error Category</th>
                  <th>Verified By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {feedbackLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="log-id-col"><code>{log.id}</code></td>
                    <td>{log.state}</td>
                    <td><span className="field-badge">{log.field}</span></td>
                    <td className="ocr-wrong-val">
                      <span className="strikethrough">{log.extractedOcrValue}</span>
                      <span className="conf-pill-sm">{log.originalConfidence}%</span>
                    </td>
                    <td className="human-correct-val">
                      <strong>{log.humanCorrectedValue}</strong>
                      <span className="conf-pill-sm green">100%</span>
                    </td>
                    <td className="error-cat-col">{log.errorCategory}</td>
                    <td className="verifier-col">{log.verifiedBy}</td>
                    <td>
                      <span className={`training-status-pill ${log.trainingStatus.includes('QUEUED') ? 'queued' : 'done'}`}>
                        {log.trainingStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
