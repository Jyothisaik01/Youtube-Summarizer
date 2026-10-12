import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Tv, FileText, Sparkles, CheckCircle2 } from 'lucide-react';
import './SlideDeckView.scss';

export default function SlideDeckView({ summary, metadata }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showSpeakerNotes, setShowSpeakerNotes] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!summary) return null;

  // Build the slides dynamically from summary content
  const slides = [];

  // Slide 1: Title & Executive Premise
  slides.push({
    type: 'intro',
    badge: 'Presentation Overview',
    title: summary.title || metadata?.title || 'Video Synthesis',
    subtitle: metadata?.author ? `Presented by ${metadata.author}` : 'Executive Knowledge Brief',
    content: summary.overview_content || summary.tldr || 'Comprehensive deconstruction of key concepts.',
    bullets: (summary.highlights_items || []).slice(0, 3).map(it => it.label || it),
    speakerNotes: summary.audio_script || 'Introduction to the core thesis and background context of this video.'
  });

  // Slide 2: Core Highlights / Pillars
  if (summary.highlights_items && summary.highlights_items.length > 0) {
    slides.push({
      type: 'highlights',
      badge: summary.highlights_title || 'Core Principles & Pillars',
      title: summary.highlights_title || 'Key Insights',
      items: summary.highlights_items.map(it => ({
        label: it.label || 'Takeaway',
        detail: it.detail || (typeof it === 'string' ? it : '')
      })),
      speakerNotes: 'High-impact insights and foundational mental models explained in this discussion.'
    });
  }

  // Slide 3..N: Topical Chapters
  (summary.sections || summary.detailed_notes || []).forEach((sec, idx) => {
    // Split content into clean bullet points
    const sentences = (sec.content || '')
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 15);

    slides.push({
      type: 'chapter',
      badge: `Topic ${idx + 1}`,
      title: sec.section_title || `Theme ${idx + 1}`,
      paragraph: sentences[0] || sec.content,
      bullets: sentences.slice(1, 4),
      speakerNotes: `Detailed discussion covering: ${sec.section_title}. Pay attention to practical applications.`
    });
  });

  // Final Slide: Directives & Conclusions
  const leftItems = summary.aux_left_items || summary.action_items || [];
  const rightItems = summary.aux_right_items || summary.quotes_or_highlights || [];
  if (leftItems.length > 0 || rightItems.length > 0) {
    slides.push({
      type: 'conclusion',
      badge: 'Action Items & Takeaways',
      title: 'Strategic Directives & Next Steps',
      leftTitle: summary.aux_left_title || 'Key Action Items',
      leftItems: leftItems,
      rightTitle: summary.aux_right_title || 'Notable Soundbites',
      rightItems: rightItems,
      speakerNotes: 'Summary conclusion and immediate action items for the viewer to execute.'
    });
  }

  const activeSlide = slides[currentSlide] || slides[0];

  const handlePrev = () => {
    setCurrentSlide(prev => (prev > 0 ? prev - 1 : slides.length - 1));
  };

  const handleNext = () => {
    setCurrentSlide(prev => (prev < slides.length - 1 ? prev + 1 : 0));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length]);

  return (
    <div className={`slide-deck-container ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      {/* HEADER CONTROLS */}
      <div className="slide-deck-toolbar">
        <div className="deck-info">
          <span className="deck-tag">
            <Tv size={14} /> Interactive Slide Deck
          </span>
          <span className="slide-counter">
            Slide <strong>{currentSlide + 1}</strong> of {slides.length}
          </span>
        </div>

        <div className="deck-actions">
          <button
            type="button"
            className={`deck-tool-btn ${showSpeakerNotes ? 'active' : ''}`}
            onClick={() => setShowSpeakerNotes(!showSpeakerNotes)}
            title="Toggle Speaker Notes"
          >
            <FileText size={14} />
            <span>Speaker Notes</span>
          </button>
          <button
            type="button"
            className="deck-tool-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* PROGRESS TRACK */}
      <div className="deck-progress-track">
        <div
          className="deck-progress-bar"
          style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
        />
      </div>

      {/* MAIN SLIDE SCREEN (16:9 PROPORTION) */}
      <div className="slide-screen-wrapper">
        <div className="slide-screen glass-panel">
          <div className="slide-top-bar">
            <span className="slide-badge">{activeSlide.badge}</span>
            <span className="slide-index-pill">#{currentSlide + 1}</span>
          </div>

          <div className="slide-body">
            {activeSlide.type === 'intro' && (
              <div className="slide-content intro-layout">
                <h2 className="slide-main-title">{activeSlide.title}</h2>
                <p className="slide-subtitle">{activeSlide.subtitle}</p>
                <div className="intro-card">
                  <p className="intro-text">{activeSlide.content}</p>
                </div>
                {activeSlide.bullets && activeSlide.bullets.length > 0 && (
                  <div className="intro-bullets">
                    {activeSlide.bullets.map((b, i) => (
                      <div key={i} className="intro-bullet-item">
                        <Sparkles size={14} color="#ff416c" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSlide.type === 'highlights' && (
              <div className="slide-content highlights-layout">
                <h2 className="slide-main-title">{activeSlide.title}</h2>
                <div className="slide-highlights-grid">
                  {activeSlide.items.map((item, i) => (
                    <div key={i} className="slide-highlight-card">
                      <div className="highlight-number">0{i + 1}</div>
                      <h4 className="highlight-label">{item.label}</h4>
                      <p className="highlight-detail">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSlide.type === 'chapter' && (
              <div className="slide-content chapter-layout">
                <h2 className="slide-main-title">{activeSlide.title}</h2>
                <div className="chapter-lead-box">
                  <p className="chapter-lead-text">{activeSlide.paragraph}</p>
                </div>
                {activeSlide.bullets && activeSlide.bullets.length > 0 && (
                  <ul className="chapter-points-list">
                    {activeSlide.bullets.map((pt, i) => (
                      <li key={i} className="chapter-point-item">
                        <CheckCircle2 size={16} color="#818cf8" className="bullet-icon" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeSlide.type === 'conclusion' && (
              <div className="slide-content conclusion-layout">
                <h2 className="slide-main-title">{activeSlide.title}</h2>
                <div className="conclusion-two-col">
                  <div className="conclusion-col left-col">
                    <h4 className="col-heading">{activeSlide.leftTitle}</h4>
                    <ul className="col-list">
                      {activeSlide.leftItems.map((it, i) => (
                        <li key={i} className="col-item">
                          <span className="dot" />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="conclusion-col right-col">
                    <h4 className="col-heading">{activeSlide.rightTitle}</h4>
                    <div className="quotes-stack">
                      {activeSlide.rightItems.map((q, i) => (
                        <blockquote key={i} className="slide-quote">
                          "{q}"
                        </blockquote>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SPEAKER NOTES DRAWER */}
          {showSpeakerNotes && activeSlide.speakerNotes && (
            <div className="speaker-notes-drawer">
              <div className="notes-header">
                <FileText size={13} />
                <span>Presenter Notes:</span>
              </div>
              <p className="notes-text">{activeSlide.speakerNotes}</p>
            </div>
          )}
        </div>

        {/* NAVIGATION CONTROLS */}
        <div className="slide-navigation-bar">
          <button
            type="button"
            className="slide-nav-btn prev"
            onClick={handlePrev}
            aria-label="Previous Slide"
          >
            <ChevronLeft size={20} />
            <span>Previous</span>
          </button>

          <div className="slide-dots">
            {slides.map((_, idx) => (
              <button
                type="button"
                key={idx}
                className={`dot-pill ${idx === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(idx)}
                title={`Jump to slide ${idx + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            className="slide-nav-btn next"
            onClick={handleNext}
            aria-label="Next Slide"
          >
            <span>Next</span>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

