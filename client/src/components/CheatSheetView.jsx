import React, { useState } from 'react';
import {
  Zap,
  Copy,
  Check,
  Flame,
  XCircle,
  CheckCircle2,
  ListOrdered
} from 'lucide-react';
import './CheatSheetView.scss';

export default function CheatSheetView({ summary }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const rules = summary?.highlights_items || [];
  const principles = summary?.sections || summary?.detailed_notes || [];
  const donts = summary?.aux_left_items || [];
  const dos = summary?.aux_right_items || [];

  const copyPoint = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="cheatsheet-view-container">
      {/* 60-SECOND ELEVATOR PITCH */}
      {summary?.overview_content && (
        <div className="pitch-card glass-panel">
          <div className="pitch-badge">
            <Zap size={16} />
            <span>{summary.overview_title || "60-Second Elevator Pitch"}</span>
          </div>
          <p className="pitch-text">{summary.overview_content}</p>
        </div>
      )}

      {/* RAPID-FIRE RULES & FACTS WITH 1-CLICK COPY */}
      {rules.length > 0 && (
        <div className="rules-section glass-panel">
          <div className="rules-header">
            <div className="rules-title">
              <ListOrdered size={18} color="#f59e0b" />
              <span>{summary.highlights_title || "Rapid-Reference Rules & Key Facts"}</span>
            </div>
            <span className="fast-tag">Quick Reference</span>
          </div>

          <div className="rules-list">
            {rules.map((rule, idx) => (
              <div key={idx} className="rule-item-card">
                <div className="rule-badge-col">
                  <span className="rule-num">#{idx + 1}</span>
                </div>
                <div className="rule-content-col">
                  <strong className="rule-label">{rule.label}</strong>
                  <p className="rule-detail">{rule.detail}</p>
                </div>
                <button
                  type="button"
                  className="copy-point-btn"
                  title="Copy bullet rule"
                  onClick={() => copyPoint(`${rule.label}: ${rule.detail}`, idx)}
                >
                  {copiedIndex === idx ? (
                    <Check size={14} color="#10b981" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CORE PARADIGM SHIFTS */}
      {principles.length > 0 && (
        <div className="principles-section glass-panel">
          <h3 className="principles-heading">
            <Flame size={20} color="#f59e0b" />
            <span>{summary.sections_title || "Golden Principles & Paradigm Shifts"}</span>
          </h3>

          <div className="principles-grid">
            {principles.map((p, idx) => (
              <div key={idx} className="principle-card">
                <div className="principle-num-badge">0{idx + 1}</div>
                <h4 className="principle-title">{p.section_title}</h4>
                <p className="principle-content">{p.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SIDE-BY-SIDE DO'S & DON'TS COMPARISON */}
      <div className="comparison-grid">
        {/* DON'TS */}
        <div className="comparison-card donts-card glass-panel">
          <div className="comparison-header dont-header">
            <XCircle size={18} color="#ef4444" />
            <span>{summary.aux_left_title || "Common Pitfalls to Avoid (Don'ts)"}</span>
          </div>
          <ul className="comparison-list">
            {donts.map((item, i) => (
              <li key={i} className="dont-item">
                <XCircle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: 3 }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* DO'S */}
        <div className="comparison-card dos-card glass-panel">
          <div className="comparison-header do-header">
            <CheckCircle2 size={18} color="#10b981" />
            <span>{summary.aux_right_title || "High-Impact Best Practices (Do's)"}</span>
          </div>
          <ul className="comparison-list">
            {dos.map((item, i) => (
              <li key={i} className="do-item">
                <CheckCircle2 size={15} color="#10b981" style={{ flexShrink: 0, marginTop: 3 }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

