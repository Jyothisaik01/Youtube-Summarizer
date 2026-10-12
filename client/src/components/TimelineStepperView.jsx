import React, { useState } from 'react';
import {
  Target,
  Wrench,
  Layers,
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Square,
  ArrowDown
} from 'lucide-react';
import './TimelineStepperView.scss';

export default function TimelineStepperView({ summary }) {
  const [checkedPrereqs, setCheckedPrereqs] = useState({});
  const [checkedDod, setCheckedDod] = useState({});

  const prereqs = summary?.highlights_items || [];
  const phases = summary?.sections || summary?.detailed_notes || [];
  const gotchas = summary?.aux_left_items || [];
  const dodItems = summary?.aux_right_items || [];

  const togglePrereq = (idx) => {
    setCheckedPrereqs(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const toggleDod = (idx) => {
    setCheckedDod(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  return (
    <div className="timeline-stepper-container">
      {/* OBJECTIVE BOX */}
      {summary?.overview_content && (
        <div className="sop-objective-card glass-panel">
          <div className="objective-badge">
            <Target size={16} />
            <span>{summary.overview_title || "Mission Objective & Deliverables"}</span>
          </div>
          <p className="objective-text">{summary.overview_content}</p>
        </div>
      )}

      {/* PREREQUISITES / TOOL STACK CHECKLIST */}
      {prereqs.length > 0 && (
        <div className="prereqs-card glass-panel">
          <div className="prereqs-header">
            <div className="prereqs-title">
              <Wrench size={18} color="#10b981" />
              <span>{summary.highlights_title || "Prerequisites & Tooling Setup Stack"}</span>
            </div>
            <span className="prereq-badge">Interactive Checklist</span>
          </div>

          <div className="prereqs-grid">
            {prereqs.map((item, idx) => {
              const isChecked = !!checkedPrereqs[idx];
              return (
                <div
                  key={idx}
                  className={`prereq-interactive-item ${isChecked ? 'completed' : ''}`}
                  onClick={() => togglePrereq(idx)}
                >
                  <div className="check-box-icon">
                    {isChecked ? (
                      <CheckSquare size={18} color="#10b981" />
                    ) : (
                      <Square size={18} color="var(--text-muted)" />
                    )}
                  </div>
                  <div className="prereq-content">
                    <strong className="prereq-label">{item.label}</strong>
                    <p className="prereq-detail">{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VERTICAL STEP-BY-STEP SOP TIMELINE */}
      {phases.length > 0 && (
        <div className="sop-timeline-section glass-panel">
          <h3 className="timeline-heading">
            <Layers size={20} color="#10b981" />
            <span>{summary.sections_title || "Step-by-Step SOP Execution Phases"}</span>
          </h3>

          <div className="vertical-timeline">
            {phases.map((phase, idx) => (
              <div key={idx} className="timeline-step">
                <div className="timeline-step-indicator">
                  <div className="step-circle">{idx + 1}</div>
                  {idx < phases.length - 1 && <div className="step-connector-line" />}
                </div>

                <div className="step-card">
                  <div className="step-badge">Phase {idx + 1}</div>
                  <h4 className="step-title">{phase.section_title}</h4>
                  <p className="step-content">{phase.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GOTCHAS & DEFINITION OF DONE */}
      <div className="sop-bottom-grid">
        {gotchas.length > 0 && (
          <div className="gotchas-card glass-panel">
            <h4 className="gotchas-heading">
              <AlertTriangle size={18} color="#f59e0b" />
              <span>{summary.aux_left_title || "Bottlenecks & Gotchas"}</span>
            </h4>
            <ul className="gotchas-list">
              {gotchas.map((item, i) => (
                <li key={i}>
                  <AlertTriangle size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: 3 }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {dodItems.length > 0 && (
          <div className="dod-card glass-panel">
            <h4 className="dod-heading">
              <CheckCircle2 size={18} color="#10b981" />
              <span>{summary.aux_right_title || "Definition of Done (DoD) Verification"}</span>
            </h4>
            <div className="dod-checklist">
              {dodItems.map((item, i) => {
                const isDone = !!checkedDod[i];
                return (
                  <div
                    key={i}
                    className={`dod-item ${isDone ? 'done' : ''}`}
                    onClick={() => toggleDod(i)}
                  >
                    {isDone ? (
                      <CheckSquare size={16} color="#10b981" />
                    ) : (
                      <Square size={16} color="var(--text-muted)" />
                    )}
                    <span>{item}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

