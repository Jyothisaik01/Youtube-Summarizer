import React, { useState } from 'react';
import {
  GraduationCap,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import './FlashcardsView.scss';

export default function FlashcardsView({ summary }) {
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [revealedQuestions, setRevealedQuestions] = useState({});

  const cards = summary?.highlights_items || [];
  const questions = summary?.aux_left_items || [];
  const checklist = summary?.aux_right_items || [];
  const syllabus = summary?.sections || summary?.detailed_notes || [];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentCard(idx => (idx + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentCard(idx => (idx - 1 + cards.length) % cards.length);
  };

  const toggleQuestion = (idx) => {
    setRevealedQuestions(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const activeCard = cards[currentCard] || { label: 'Concept', detail: 'Study definition' };

  return (
    <div className="flashcards-view-container">
      {/* HEADER OVERVIEW */}
      {summary?.overview_content && (
        <div className="study-overview-card glass-panel">
          <div className="study-badge">
            <GraduationCap size={16} />
            <span>{summary?.overview_title || "Academic Core Thesis"}</span>
          </div>
          <p className="overview-body">{summary.overview_content}</p>
        </div>
      )}

      {/* 3D INTERACTIVE FLASHCARD SECTION */}
      {cards.length > 0 && (
        <div className="flashcard-deck-section glass-panel">
          <div className="deck-header">
            <div className="deck-title">
              <BookOpen size={18} color="#818cf8" />
              <span>Interactive Concept Flashcards</span>
            </div>
            <span className="card-counter-tag">Card {currentCard + 1} of {cards.length}</span>
          </div>

          <div className="flashcard-stage">
            <div
              className={`flip-card ${isFlipped ? 'flipped' : ''}`}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div className="flip-card-inner">
                {/* FRONT FACE */}
                <div className="flip-card-front">
                  <span className="tap-hint">Tap card to flip definition ↺</span>
                  <div className="card-badge">Key Concept</div>
                  <h3 className="card-term">{activeCard.label}</h3>
                  <div className="hint-bottom">Click to reveal meaning</div>
                </div>

                {/* BACK FACE */}
                <div className="flip-card-back">
                  <span className="tap-hint">Tap card to return to term ↺</span>
                  <div className="card-badge back-badge">Definition & Meaning</div>
                  <p className="card-definition">{activeCard.detail}</p>
                  <div className="hint-bottom success-hint">Concept Mastered ✓</div>
                </div>
              </div>
            </div>
          </div>

          {/* DECK NAVIGATION */}
          <div className="deck-nav-row">
            <button className="deck-nav-btn" onClick={handlePrev}>
              <ChevronLeft size={16} /> Previous
            </button>
            <div className="deck-dots">
              {cards.map((_, i) => (
                <span
                  key={i}
                  className={`dot ${i === currentCard ? 'active' : ''}`}
                  onClick={() => { setIsFlipped(false); setCurrentCard(i); }}
                />
              ))}
            </div>
            <button className="deck-nav-btn primary" onClick={handleNext}>
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* SELF-ASSESSMENT Q&A INTERACTIVE ACCORDION */}
      {questions.length > 0 && (
        <div className="quiz-section glass-panel">
          <h3 className="quiz-heading">
            <HelpCircle size={20} color="#818cf8" />
            <span>{summary.aux_left_title || "Self-Assessment Practice Exam Questions"}</span>
          </h3>
          <div className="quiz-list">
            {questions.map((q, idx) => {
              // Parse question vs answer if formatted with Q: and A:
              const parts = q.split(/A:|Answer:/i);
              const questionText = parts[0].replace(/^Q:\s*/i, '').trim();
              const answerText = parts[1]?.trim() || "Review the video syllabus sections above for full conceptual context.";
              const isRevealed = !!revealedQuestions[idx];

              return (
                <div key={idx} className="quiz-item-card">
                  <div className="quiz-header" onClick={() => toggleQuestion(idx)}>
                    <div className="q-tag">Q{idx + 1}</div>
                    <span className="question-text">{questionText}</span>
                    <button type="button" className="reveal-btn">
                      {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                      <span>{isRevealed ? 'Hide Answer' : 'Reveal Answer'}</span>
                    </button>
                  </div>

                  {isRevealed && (
                    <div className="quiz-answer-body">
                      <div className="answer-badge">Verified Model Answer</div>
                      <p>{answerText}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SYLLABUS & RETENTION HOMEWORK */}
      <div className="study-bottom-row">
        {syllabus.length > 0 && (
          <div className="syllabus-card glass-panel">
            <h4 className="syllabus-heading">
              <BookOpen size={18} color="#818cf8" />
              <span>{summary.sections_title || "Curriculum Syllabus Breakdown"}</span>
            </h4>
            <div className="syllabus-accordion">
              {syllabus.map((sec, i) => (
                <div key={i} className="syllabus-item">
                  <h5>{sec.section_title}</h5>
                  <p>{sec.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {checklist.length > 0 && (
          <div className="homework-card glass-panel">
            <h4 className="homework-heading">
              <CheckCircle2 size={18} color="#10b981" />
              <span>{summary.aux_right_title || "Retention Exercises & Tasks"}</span>
            </h4>
            <ul className="homework-list">
              {checklist.map((item, i) => (
                <li key={i}>
                  <CheckCircle2 size={15} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

