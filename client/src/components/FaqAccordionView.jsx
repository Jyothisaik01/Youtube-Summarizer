import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Search, Check, Copy, MessageSquare, Sparkles } from 'lucide-react';
import './FaqAccordionView.scss';

export default function FaqAccordionView({ summary, metadata }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState({ 0: true }); // first item open by default
  const [copiedId, setCopiedId] = useState(null);

  if (!summary) return null;

  // Build the FAQ question-answer pairs
  const faqs = [];

  // Q1: Core Thesis
  if (summary.overview_content || summary.tldr) {
    faqs.push({
      id: 'faq-overview',
      category: 'Foundations',
      question: `What is the primary thesis of "${metadata?.title || 'this video'}"?`,
      badge: 'Core Thesis',
      answer: summary.overview_content || summary.tldr,
      takeaway: summary.audio_script || 'The foundational takeaway and thesis of the full presentation.'
    });
  }

  // Q2..N: Highlights & Concepts
  (summary.highlights_items || []).forEach((it, idx) => {
    faqs.push({
      id: `faq-highlight-${idx}`,
      category: 'Key Concepts',
      question: `What is ${it.label || 'this concept'} and why is it critical?`,
      badge: 'Key Concept',
      answer: it.detail || (typeof it === 'string' ? it : ''),
      takeaway: `Mastery of "${it.label || 'this rule'}" is essential to applying the speaker's methodology.`
    });
  });

  // Q..N: Topical Chapters
  (summary.sections || summary.detailed_notes || []).forEach((sec, idx) => {
    faqs.push({
      id: `faq-sec-${idx}`,
      category: 'Deep Dive',
      question: `How does the speaker explain "${sec.section_title || `Topic ${idx + 1}`}"?`,
      badge: `Chapter 0${idx + 1}`,
      answer: sec.content || '',
      takeaway: `Key milestone in the video progression.`
    });
  });

  // Action directives
  if (summary.aux_left_items && summary.aux_left_items.length > 0) {
    faqs.push({
      id: 'faq-actions',
      category: 'Execution',
      question: `What immediate action steps or gotchas should the viewer take away?`,
      badge: 'Action Items',
      answer: summary.aux_left_items.join(' • '),
      bullets: summary.aux_left_items,
      takeaway: 'Concrete execution checklist recommended by the author.'
    });
  }

  const toggleItem = (idx) => {
    setOpenItems(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleExpandAll = () => {
    const all = {};
    faqs.forEach((_, i) => { all[i] = true; });
    setOpenItems(all);
  };

  const handleCollapseAll = () => {
    setOpenItems({});
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredFaqs = faqs.filter(f =>
    f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="faq-view-container glass-panel">
      {/* FAQ TOP HEADER */}
      <div className="faq-top-bar">
        <div className="faq-header-info">
          <div className="faq-title-wrap">
            <HelpCircle size={18} color="#06b6d4" />
            <h3 className="faq-title">Interactive Q&A & FAQ Breakdown</h3>
          </div>
          <span className="faq-subtitle">
            {filteredFaqs.length} High-Yield Questions Answered
          </span>
        </div>

        <div className="faq-controls">
          <div className="faq-search-box">
            <Search size={14} />
            <input
              type="text"
              placeholder="Filter questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="faq-toggle-actions">
            <button type="button" className="faq-text-btn" onClick={handleExpandAll}>
              Expand All
            </button>
            <span className="divider">•</span>
            <button type="button" className="faq-text-btn" onClick={handleCollapseAll}>
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* ACCORDIONS LIST */}
      <div className="faq-list">
        {filteredFaqs.map((faq, idx) => {
          const isOpen = !!openItems[idx];
          return (
            <div
              key={faq.id}
              className={`faq-item-card ${isOpen ? 'open' : ''}`}
            >
              <button
                type="button"
                className="faq-question-header"
                onClick={() => toggleItem(idx)}
                aria-expanded={isOpen}
              >
                <div className="question-left">
                  <span className="faq-badge">{faq.badge}</span>
                  <span className="faq-question-text">{faq.question}</span>
                </div>
                <div className="question-right">
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {isOpen && (
                <div className="faq-answer-body">
                  {faq.bullets ? (
                    <ul className="faq-bullets-list">
                      {faq.bullets.map((b, i) => (
                        <li key={i} className="faq-bullet-item">
                          <span className="bullet-dot" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="faq-answer-text">{faq.answer}</p>
                  )}

                  {faq.takeaway && (
                    <div className="faq-takeaway-bar">
                      <Sparkles size={14} color="#06b6d4" />
                      <span>{faq.takeaway}</span>
                    </div>
                  )}

                  <div className="faq-footer-actions">
                    <button
                      type="button"
                      className="copy-answer-btn"
                      onClick={() => handleCopy(faq.answer, faq.id)}
                    >
                      {copiedId === faq.id ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      <span>{copiedId === faq.id ? 'Copied' : 'Copy Answer'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredFaqs.length === 0 && (
          <div className="faq-empty-state">
            <MessageSquare size={28} />
            <p>No questions matched your search term "{searchQuery}".</p>
          </div>
        )}
      </div>
    </div>
  );
}

