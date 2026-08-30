import React, { useState } from 'react';
import {
  Terminal, Play, Copy, Check, Download, Code2, Globe, Server, X,
  ArrowRight, ShieldCheck, Cpu, Database
} from 'lucide-react';
import { apiGateway, API_ENDPOINTS_SPEC } from '../services/apiGateway';

export default function ApiExplorerModal({ onClose }) {
  const [selectedEndpoint, setSelectedEndpoint] = useState(API_ENDPOINTS_SPEC[0]);
  const [inputParam, setInputParam] = useState('BLDG-B1-KADUGODI-F0');
  const [requestBodyText, setRequestBodyText] = useState(
    JSON.stringify(API_ENDPOINTS_SPEC[0].sampleRequestBody || {}, null, 2)
  );
  const [executing, setExecuting] = useState(false);
  const [responseOutput, setResponseOutput] = useState(null);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const handleSelectEndpoint = (ep) => {
    setSelectedEndpoint(ep);
    setResponseOutput(null);
    if (ep.sampleRequestBody) {
      setRequestBodyText(JSON.stringify(ep.sampleRequestBody, null, 2));
    }
  };

  const handleExecute = async () => {
    setExecuting(true);
    try {
      let body = null;
      if (selectedEndpoint.method === 'POST' && requestBodyText) {
        try {
          body = JSON.parse(requestBodyText);
        } catch {
          body = { raw: requestBodyText };
        }
      }
      const res = await apiGateway.executeEndpoint(
        selectedEndpoint.method,
        selectedEndpoint.path,
        { id: inputParam },
        body
      );
      setResponseOutput(res);
    } catch (e) {
      setResponseOutput({ status: 'error', message: e.message });
    } finally {
      setExecuting(false);
    }
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(selectedEndpoint.sampleRequest);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleDownloadOpenAPI = () => {
    const spec = {
      openapi: '3.0.3',
      info: {
        title: 'SVAMITVA 3D Land Cadastre & Normalizer Interoperability API',
        version: '1.0.0',
        description: 'Standardized REST API for National Land Records Modernization Programme (NLRMP) and State Revenue Portals.',
      },
      servers: [{ url: 'https://api.svamitva-cadastre.gov.in/api/v1' }],
      paths: {
        '/parcel/{id}': {
          get: { summary: 'Fetch 3D Cadastre Parcel Geometry & Ownership' }
        },
        '/records/verify': {
          post: { summary: 'Commit Human-in-the-Loop Verifications' }
        },
        '/analytics/district-stats': {
          get: { summary: 'Retrieve District Digitization KPIs' }
        }
      }
    };
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'svamitva_3d_cadastre_openapi_spec.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop animate-fade-in">
      <div className="api-modal glass-panel animate-scale-up">
        {/* Header */}
        <div className="api-modal-header">
          <div className="api-header-left">
            <div className="api-icon-pill">
              <Terminal size={18} color="#0284c7" />
            </div>
            <div>
              <h2 className="api-modal-title">National Land Registry REST API & Interoperability Gateway</h2>
              <p className="api-modal-subtitle">
                Standardized REST endpoints for seamless integration with Bhoomi, Bhulekh, MahaBhulekh, and PM GatiShakti GIS
              </p>
            </div>
          </div>
          <div className="api-header-right">
            <button onClick={handleDownloadOpenAPI} className="api-spec-btn">
              <Download size={13} />
              <span>Download OpenAPI Spec</span>
            </button>
            <button onClick={onClose} className="sidebar-close-btn">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Main API Workspace */}
        <div className="api-workspace-layout">
          {/* Endpoint Sidebar */}
          <div className="api-endpoints-sidebar">
            <div className="api-sidebar-title">REST Endpoints (v1)</div>
            <div className="api-endpoints-list">
              {API_ENDPOINTS_SPEC.map((ep) => {
                const isSelected = selectedEndpoint.path === ep.path && selectedEndpoint.method === ep.method;
                return (
                  <div
                    key={`${ep.method}-${ep.path}`}
                    onClick={() => handleSelectEndpoint(ep)}
                    className={`api-endpoint-item ${isSelected ? 'active' : ''}`}
                  >
                    <span className={`method-badge ${ep.method.toLowerCase()}`}>{ep.method}</span>
                    <span className="endpoint-path">{ep.path}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Endpoint Live Console */}
          <div className="api-console-pane">
            <div className="api-endpoint-detail-header">
              <div className="api-detail-top">
                <span className={`method-badge ${selectedEndpoint.method.toLowerCase()}`}>
                  {selectedEndpoint.method}
                </span>
                <span className="api-endpoint-full-path">
                  https://api.svamitva-cadastre.gov.in{selectedEndpoint.path}
                </span>
              </div>
              <p className="api-endpoint-desc">{selectedEndpoint.description}</p>
            </div>

            {/* Request Configuration */}
            <div className="api-request-section">
              {selectedEndpoint.params && (
                <div className="api-param-group">
                  <label className="api-input-label">Path Parameter: <code>id</code></label>
                  <input
                    type="text"
                    value={inputParam}
                    onChange={(e) => setInputParam(e.target.value)}
                    className="api-input-field"
                    placeholder="Enter parcel / building ID"
                  />
                </div>
              )}

              {selectedEndpoint.method === 'POST' && (
                <div className="api-param-group">
                  <label className="api-input-label">Request Payload (JSON)</label>
                  <textarea
                    rows={4}
                    value={requestBodyText}
                    onChange={(e) => setRequestBodyText(e.target.value)}
                    className="api-textarea-field"
                  />
                </div>
              )}

              {/* cURL snippet */}
              <div className="api-curl-box">
                <div className="curl-header">
                  <span>cURL Command</span>
                  <button onClick={handleCopyCurl} className="copy-curl-btn">
                    {copiedCurl ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    <span>{copiedCurl ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <pre>{selectedEndpoint.sampleRequest}</pre>
              </div>

              {/* Execute Button */}
              <button
                onClick={handleExecute}
                disabled={executing}
                className="api-execute-btn"
              >
                <Play size={14} fill="currentColor" />
                <span>{executing ? 'Executing Live Query...' : 'Send API Request'}</span>
              </button>
            </div>

            {/* Response Viewer */}
            <div className="api-response-section">
              <div className="api-response-header">
                <span>API Response Output</span>
                {responseOutput && (
                  <span className="response-status-badge">
                    Status: {responseOutput.statusCode || 200} OK (180ms)
                  </span>
                )}
              </div>
              <div className="api-response-body">
                <pre>
                  {responseOutput
                    ? JSON.stringify(responseOutput, null, 2)
                    : '// Click "Send API Request" to test live dispatcher'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
