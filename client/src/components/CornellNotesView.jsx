import React, { useState } from 'react';
import { BookOpen, HelpCircle, Key, Highlighter, Check, Copy } from 'lucide-react';
import './CornellNotesView.scss';

export default function CornellNotesView({ summary, metadata }) {
  const [activeCueIndex, setActiveCueIndex] = useState(null);
  const [copiedSection, setCopiedSection] = useState(null);

  if (!summary) return null;

  // Extract Cues (Questions, Keywords, Formulas)
  const cues = [];
  (summary.highlights_items || []).forEach((it, idx) => {
    cues.push({
      type: 'term',
      title: it.label || `Concept ${idx + 1}`,
      hint: it.detail
    });
  });

  (summary.aux_left_items || []).forEach((it) => {
    cues.push({
      type: 'question',
      title: it.length > 50 ? `${it.slice(0, 48)}...` : it,
      hint: it
    });
  });

  const handleCopySection = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="cornell-notes-container glass-panel">
      {/* CORNELL HEADER BAND */}
      <div className="cornell-header">
        <div className="header-meta-grid">
          <div className="meta-item">
            <span className="meta-label">Topic / Subject</span>
            <span className="meta-val">{summary.title || metadata?.title || 'Video Analysis'}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Speaker / Source</span>
            <span className="meta-val">{metadata?.author || 'YouTube'}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Note Format</span>
            <span className="meta-val highlight-badge">Cornell System (High Retention)</span>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN SPLIT */}
      <div className="cornell-body-split">
        {/* LEFT COLUMN: CUES, RECALL KEYWORDS & QUESTIONS (~30%) */}
        <div className="cornell-cue-column">
          <div className="column-header">
            <Key size={14} color="#818cf8" />
            <span>Recall Cues & Keywords</span>
          </div>
          <p className="cue-instructions">
            Cover the right column to test active recall using these cues:
          </p>

          <div className="cues-list">
            {cues.map((cue, idx) => (
              <div
                key={idx}
                className={`cue-card ${activeCueIndex === idx ? 'active' : ''}`}
                onClick={() => setActiveCueIndex(activeCueIndex === idx ? null : idx)}
                title="Click to reveal recall detail"
              >
                <div className="cue-card-top">
                  <span className="cue-tag">
                    {cue.type === 'question' ? <HelpCircle size={12} /> : <BookOpen size={12} />}
                    {cue.type === 'question' ? 'Question' : 'Key Cue'}
                  </span>
                  <span className="cue-index">#{idx + 1}</span>
                </div>
                <h4 className="cue-title">{cue.title}</h4>
                {activeCueIndex === idx && (
                  <div className="cue-revealed-hint">
                    <p>{cue.hint}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: MAIN NOTES & CHAPTER BREAKDOWN (~70%) */}
        <div className="cornell-notes-column">
          <div className="column-header">
            <Highlighter size={14} color="#ff416c" />
            <span>Class Notes & Systematic Synthesis</span>
          </div>

          <div className="notes-sections-stack">
            {/* OVERVIEW PREMISE */}
            {(summary.overview_content || summary.tldr) && (
              <div className="cornell-note-block premise-block">
                <div className="block-top">
                  <h3 className="block-title">00. {summary.overview_title || 'Foundational Thesis'}</h3>
                  <button
                    type="button"
                    className="copy-block-btn"
                    onClick={() => handleCopySection(summary.overview_content || summary.tldr, 'overview')}
                  >
                    {copiedSection === 'overview' ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                  </button>
                </div>
                <p className="block-text">{summary.overview_content || summary.tldr}</p>
              </div>
            )}

            {/* TOPICAL CHAPTERS */}
            {(summary.sections || summary.detailed_notes || []).map((sec, idx) => (
              <div key={idx} className="cornell-note-block chapter-block">
                <div className="block-top">
                  <h3 className="block-title">
                    0{idx + 1}. {sec.section_title || `Lecture Theme ${idx + 1}`}
                  </h3>
                  <button
                    type="button"
                    className="copy-block-btn"
                    onClick={() => handleCopySection(sec.content, `sec-${idx}`)}
                  >
                    {copiedSection === `sec-${idx}` ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                  </button>
                </div>
                <div className="block-body">
                  <p className="block-text">{sec.content}</p>
                </div>
              </div>
            ))}

            {/* ACTION DIRECTIVES & MEMORABLE QUOTES */}
            <div className="cornell-note-block takeaways-block">
              <div className="block-top">
                <h3 className="block-title">
                  Directives & Key Soundbites
                </h3>
              </div>
              <div className="directives-bullets">
                {(summary.aux_left_items || []).map((it, i) => (
                  <div key={i} className="directive-row">
                    <span className="dot" />
                    <span>{it}</span>
                  </div>
                ))}
              </div>
              {(summary.aux_right_items || []).length > 0 && (
                <div className="soundbites-list">
                  {summary.aux_right_items.map((q, i) => (
                    <blockquote key={i} className="cornell-soundbite">
                      "{q}"
                    </blockquote>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM CORNELL SUMMARY FOOTER */}
      <div className="cornell-summary-footer">
        <div className="footer-title">
          <BookOpen size={16} color="#10b981" />
          <span>Synthesis Summary (30-Second Bottom Line)</span>
        </div>
        <p className="footer-content">
          {summary.audio_script || summary.overview_content || summary.tldr || 'Comprehensive synthesized takeaway of the full video session.'}
        </p>
      </div>
    </div>
  );
}

