import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Sparkles,
  Volume2,
  Download,
  Printer,
  Copy,
  Check,
  Globe,
  Sliders,
  Clock,
  FileText,
  Bookmark,
  CheckCircle2,
  Sun,
  Moon,
  ExternalLink,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  Video,
  GraduationCap,
  BookOpen,
  Library,
  Target,
  Wrench,
  Layers,
  AlertTriangle,
  Zap,
  Briefcase,
  TrendingUp,
  Quote,
  Rocket,
  CheckSquare,
  ListChecks,
  Network,
  LayoutDashboard,
  Tv,
  ChevronDown,
  SlidersHorizontal
} from 'lucide-react';
import CustomDropdown from './components/CustomDropdown';
import MindMapView from './components/MindMapView';
import FlashcardsView from './components/FlashcardsView';
import TimelineStepperView from './components/TimelineStepperView';
import CheatSheetView from './components/CheatSheetView';
import SlideDeckView from './components/SlideDeckView';
import CornellNotesView from './components/CornellNotesView';
import FaqAccordionView from './components/FaqAccordionView';
import confetti from 'canvas-confetti';
import './App.scss';

const DIFFICULTY_OPTIONS = [
  { value: 'Simple', label: 'Simple (ELI5)', badge: 'ELI5', sublabel: 'Everyday terms & playful analogies' },
  { value: 'Medium', label: 'Medium (Balanced)', badge: 'Academic', sublabel: 'Structured college & professional notes' },
  { value: 'Hard', label: 'Hard (Technical)', badge: 'In-Depth', sublabel: 'Technical mechanisms, formulas & architecture' },
  { value: 'Executive', label: 'Executive Brief', badge: 'C-Suite', sublabel: 'High-impact metrics, ROI & strategic takeaways' }
];

const FORMAT_OPTIONS = [
  { value: 'structured', label: 'Comprehensive Notes', badge: 'Full Notes', sublabel: 'Complete 360° notes, quotes & action steps' },
  { value: 'mindmap', label: 'Visual Mind Map', badge: 'Interactive', sublabel: 'Central thesis with radiating thematic branches' },
  { value: 'study_guide', label: 'Study Guide & Flashcards', badge: 'Academic', sublabel: 'Key definitions, 3D flip cards & practice quiz' },
  { value: 'action_plan', label: 'Step-by-Step SOP Plan', badge: 'Workflow', sublabel: 'Execution phases, required tools & checklist' },
  { value: 'bullet_cheat_sheet', label: 'Rapid Cheat Sheet', badge: 'Quick Recap', sublabel: '60s pitch, key facts & do’s and don’ts' },
  { value: 'slides', label: 'Interactive Slide Deck', badge: '16:9 Slides', sublabel: 'Presentation slides with speaker notes & fullscreen' },
  { value: 'cornell', label: 'Cornell Notes System', badge: 'Cornell', sublabel: 'Recall cues column, detailed lecture notes & summary' },
  { value: 'faq', label: 'Interactive Q&A & FAQ', badge: 'Smart FAQ', sublabel: 'Searchable questions, answers & core takeaways' }
];

const FOCUS_OPTIONS = [
  { value: 'all', label: 'Entire Video (Balanced)', badge: '100% Scope', sublabel: 'Covers all topics evenly' },
  { value: 'key_insights', label: 'Breakthrough Insights', badge: 'High Signal', sublabel: 'Focus on core revelations & epiphanies' },
  { value: 'step_by_step', label: 'Methods & Workflows', badge: 'How-To', sublabel: 'Focus on procedures, recipes & techniques' },
  { value: 'quotes_and_lessons', label: 'Wisdom & Philosophy', badge: 'Mindset', sublabel: 'Focus on memorable aphorisms & life lessons' }
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English', sublabel: 'English' },
  { value: 'hi', label: 'हिंदी', sublabel: 'Hindi' },
  { value: 'te', label: 'తెలుగు', sublabel: 'Telugu' },
  { value: 'es', label: 'Español', sublabel: 'Spanish' },
  { value: 'fr', label: 'Français', sublabel: 'French' },
  { value: 'de', label: 'Deutsch', sublabel: 'German' },
  { value: 'zh', label: '中文', sublabel: 'Chinese' },
  { value: 'ja', label: '日本語', sublabel: 'Japanese' },
  { value: 'ko', label: '한국어', sublabel: 'Korean' },
  { value: 'ta', label: 'தமிழ்', sublabel: 'Tamil' },
  { value: 'kn', label: 'ಕನ್ನಡ', sublabel: 'Kannada' },
  { value: 'bn', label: 'বাংলা', sublabel: 'Bengali' },
  { value: 'ur', label: 'اردو', sublabel: 'Urdu' }
];

const SAMPLE_VIDEOS = [
  { title: "Veritasium: How Quantum Computers Work", url: "https://www.youtube.com/watch?v=g_IaVepNDT4" },
  { title: "Steve Jobs Stanford Commencement Speech", url: "https://www.youtube.com/watch?v=UF8uR6Z6KLc" },
  { title: "Kurzgesagt: The Last Human on Earth", url: "https://www.youtube.com/watch?v=5U14q8VCnLg" }
];

const PRIMARY_PRESENTATION_MODES = [
  { id: 'notes', label: 'Notes', fullLabel: 'Comprehensive Notes', icon: FileText, badge: 'Full Notes' },
  { id: 'mindmap', label: 'Mind Map', fullLabel: 'Visual Mind Map', icon: Network, badge: 'Interactive Map' },
  { id: 'flashcards', label: 'Flashcards & Quiz', fullLabel: 'Study Flashcards & Quiz', icon: GraduationCap, badge: 'Flip Cards' },
  { id: 'timeline', label: 'SOP Stepper', fullLabel: 'SOP Timeline Stepper', icon: Layers, badge: 'Execution' },
  { id: 'cheatsheet', label: 'Cheat Sheet', fullLabel: 'Rapid Cheat Sheet', icon: Zap, badge: 'High Density' },
  { id: 'slides', label: 'Slide Deck', fullLabel: 'Interactive Slide Deck', icon: Tv, badge: '16:9 Slides' }
];

const EXTRA_PRESENTATION_MODES = [
  { id: 'cornell', label: 'Cornell Notes System', icon: BookOpen, badge: 'Cornell System', description: 'Recall cues column, detailed lecture notes & summary' },
  { id: 'faq', label: 'Interactive Q&A & FAQ', icon: HelpCircle, badge: 'Smart Q&A', description: 'Question-answer accordions with search filter & takeaways' }
];

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [url, setUrl] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [formatStyle, setFormatStyle] = useState('structured');
  const [focusArea, setFocusArea] = useState('all');
  const [language, setLanguage] = useState('en');
  const [activeView, setActiveView] = useState('notes');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreDropdownRef = useRef(null);

  // Close extra formats dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Clean audio blob on change
  useEffect(() => {
    if (data?.audio_base64) {
      const blob = b64toBlob(data.audio_base64, 'audio/mp3');
      const blobUrl = URL.createObjectURL(blob);
      setAudioUrl(blobUrl);
      return () => URL.revokeObjectURL(blobUrl);
    } else {
      setAudioUrl(null);
    }
  }, [data]);

  const b64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
  };

  const handleSummarize = async (e) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          difficulty,
          format_style: formatStyle,
          focus_area: focusArea,
          language
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || 'Failed to process video summary');
      }

      setData(json);

      // Automatically select the native view matching user format
      if (json.format_style === 'study_guide') {
        setActiveView('flashcards');
      } else if (json.format_style === 'action_plan') {
        setActiveView('timeline');
      } else if (json.format_style === 'bullet_cheat_sheet') {
        setActiveView('cheatsheet');
      } else if (json.format_style === 'mindmap') {
        setActiveView('mindmap');
      } else if (json.format_style === 'slides') {
        setActiveView('slides');
      } else if (json.format_style === 'cornell') {
        setActiveView('cornell');
      } else if (json.format_style === 'faq') {
        setActiveView('faq');
      } else {
        setActiveView('notes');
      }

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (err) {}
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!data?.summary) return;
    const s = data.summary;
    const formatName = s.format_badge || data.format_style?.replace('_', ' ') || 'Summary';
    const notesText = `
# ${s.title || data.metadata?.title}
**Video:** ${data.metadata?.title} (${data.metadata?.author})
**Format:** ${formatName} | **Complexity:** ${data.difficulty}
**Source URL:** ${url}

---

## 📌 ${s.overview_title || 'Executive Summary'}
${s.overview_content || s.tldr}

---

## 🎯 ${s.highlights_title || 'Core Takeaways'}
${s.highlights_items?.map((item, i) => `### ${i + 1}. ${item.label}\n${item.detail}`).join('\n\n') || s.key_takeaways?.map((t, i) => `${i + 1}. ${t}`).join('\n')}

---

## 📖 ${s.sections_title || 'Detailed Topic Breakdown'}
${(s.sections || s.detailed_notes)?.map(sec => `### ${sec.section_title}\n${sec.content}`).join('\n\n')}

---

## 📋 ${s.aux_left_title || 'Action Items & Next Steps'}
${(s.aux_left_items || s.action_items)?.map(it => `- [ ] ${it}`).join('\n')}

---

## 💡 ${s.aux_right_title || 'Highlights & Directives'}
${(s.aux_right_items || s.quotes_or_highlights)?.map(it => `> "${it}"`).join('\n\n')}
    `.trim();

    navigator.clipboard.writeText(notesText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadTxt = () => {
    if (!data?.summary) return;
    const blob = new Blob([JSON.stringify(data.summary, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${data.metadata?.title || 'video'}-summary.json`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const getOverviewIcon = (style, diff) => {
    if (style === 'study_guide') return <GraduationCap size={16} />;
    if (style === 'action_plan') return <Target size={16} />;
    if (style === 'bullet_cheat_sheet') return <Zap size={16} />;
    if (style === 'executive' || diff === 'Executive') return <Briefcase size={16} />;
    return <Sparkles size={16} />;
  };

  const getHighlightsIcon = (style, diff) => {
    if (style === 'study_guide') return <BookOpen size={20} color="#818cf8" />;
    if (style === 'action_plan') return <Wrench size={20} color="#10b981" />;
    if (style === 'bullet_cheat_sheet') return <ListChecks size={20} color="#f59e0b" />;
    if (style === 'executive' || diff === 'Executive') return <TrendingUp size={20} color="#ef4444" />;
    return <CheckCircle2 size={20} color="var(--yt-red)" />;
  };

  const getSectionsIcon = (style) => {
    if (style === 'study_guide') return <Library size={20} color="#818cf8" />;
    if (style === 'action_plan') return <Layers size={20} color="#10b981" />;
    if (style === 'bullet_cheat_sheet') return <FileText size={20} color="#f59e0b" />;
    return <FileText size={20} color="var(--accent-cyan)" />;
  };

  const getAuxLeftIcon = (type) => {
    if (type === 'questions') return <HelpCircle size={18} color="#818cf8" />;
    if (type === 'warnings') return <AlertTriangle size={18} color="#f59e0b" />;
    return <CheckCircle2 size={18} color="#10b981" />;
  };

  const getAuxRightIcon = (type) => {
    if (type === 'quotes') return <Quote size={18} color="#c084fc" />;
    if (type === 'dos') return <Check size={18} color="#10b981" />;
    if (type === 'directives') return <Rocket size={18} color="#f43f5e" />;
    return <CheckSquare size={18} color="#818cf8" />;
  };

  return (
    <div className="app-layout">
      {/* NAVBAR */}
      <header className="navbar no-print">
        <div className="nav-container">
          <a href="/" className="nav-brand">
            <div className="brand-icon">
              <Video size={22} fill="white" />
            </div>
            <div className="brand-text">
              <span className="brand-title">TubeNotes AI</span>
              <span className="brand-subtitle">Smart Video Intelligence</span>
            </div>
          </a>

          <div className="nav-actions">
            <button
              className="theme-toggle-btn"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="hero-section no-print">
        <div className="hero-badge">
          <Sparkles size={14} />
          <span>Powered by Gemini Generative AI</span>
        </div>
        <h1 className="hero-headline">
          Turn Any YouTube Video into <br />
          <span className="gradient-text">Detailed Actionable Notes</span>
        </h1>
        <p className="hero-subhead">
          Skip hours of watching. Extract transcripts, summarize complex concepts, translate across 13+ languages, and listen to synthesized audio briefs.
        </p>
      </section>

      {/* INPUT CARD */}
      <div className="input-card glass-panel no-print">
        <form onSubmit={handleSummarize}>
          <div className="input-bar-wrapper">
            <Video size={20} className="input-icon" />
            <input
              type="text"
              className="yt-input"
              placeholder="Paste YouTube video or Shorts link (e.g. https://www.youtube.com/watch?v=...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="summarize-submit-btn"
              disabled={loading || !url.trim()}
            >
              {loading ? (
                <>
                  <div className="spinner" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Summarize Notes</span>
                </>
              )}
            </button>
          </div>

          <div className="controls-row four-cols">
            <CustomDropdown
              label="Complexity Level"
              icon={Sliders}
              options={DIFFICULTY_OPTIONS}
              value={difficulty}
              onChange={setDifficulty}
              disabled={loading}
            />

            <CustomDropdown
              label="Document Format"
              icon={FileText}
              options={FORMAT_OPTIONS}
              value={formatStyle}
              onChange={setFormatStyle}
              disabled={loading}
            />

            <CustomDropdown
              label="Content Focus"
              icon={Bookmark}
              options={FOCUS_OPTIONS}
              value={focusArea}
              onChange={setFocusArea}
              disabled={loading}
            />

            <CustomDropdown
              label="Output Language"
              icon={Globe}
              options={LANGUAGE_OPTIONS}
              value={language}
              onChange={setLanguage}
              disabled={loading}
              searchable={true}
              placeholder="Search or select language..."
            />
          </div>

          <div className="quick-samples">
            <span className="samples-label">Try Examples:</span>
            {SAMPLE_VIDEOS.map((s, idx) => (
              <button
                type="button"
                key={idx}
                className="sample-pill"
                onClick={() => setUrl(s.url)}
              >
                {s.title}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div style={{ maxWidth: 860, margin: '0 auto 2rem', padding: '1rem 1.25rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, display: 'flex', gap: '0.75rem', alignItems: 'center', color: '#ef4444' }}>
          <AlertCircle size={20} />
          <span style={{ fontSize: '0.92rem' }}>{error}</span>
        </div>
      )}

      {/* RESULTS DISPLAY */}
      {data && (
        <>
          {/* VIDEO METADATA CARD */}
          <div className="video-preview-card glass-panel">
            <div className="preview-thumb-wrap">
              <img
                src={data.metadata?.thumbnail}
                alt={data.metadata?.title}
                onError={(e) => {
                  e.target.src = data.metadata?.thumbnailFallback;
                }}
              />
            </div>
            <div className="preview-info">
              <h2 className="preview-title">{data.metadata?.title}</h2>
              <div className="preview-meta-row">
                <span><strong>Channel:</strong> {data.metadata?.author}</span>
                <span><Clock size={14} /> <strong>Words:</strong> {data.transcriptStats?.totalWords?.toLocaleString()}</span>
                <span><FileText size={14} /> <strong>Est. Read:</strong> ~{data.transcriptStats?.estimatedReadMinutes} mins</span>
                <span className="pill-tag difficulty-pill"><Sliders size={13} /> {data.difficulty}</span>
                {data.format_style && <span className="pill-tag format-pill"><FileText size={13} /> {data.format_style.replace('_', ' ')}</span>}
                {data.focus_area && <span className="pill-tag focus-pill"><Bookmark size={13} /> {data.focus_area.replace('_', ' ')}</span>}
              </div>
            </div>
          </div>

          {/* SUMMARY DASHBOARD */}
          <div className="summary-container notes-document">
            {/* ACTION TOOLBAR */}
            <div className="toolbar-card glass-panel no-print">
              <div className="audio-player-box">
                {audioUrl ? (
                  <>
                    <span className="audio-pill">
                      <Volume2 size={14} /> Audio Brief
                    </span>
                    <audio controls src={audioUrl} />
                  </>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Audio summary ready</span>
                )}
              </div>

              <div className="actions-box">
                <button className="action-btn" onClick={handleCopy} title="Copy notes to clipboard">
                  {copied ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button className="action-btn" onClick={handlePrint} title="Print or Save PDF">
                  <Printer size={15} />
                  <span>Print PDF</span>
                </button>
                <button className="action-btn primary-action" onClick={handleDownloadTxt} title="Export JSON">
                  <Download size={15} />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* PRESENTATION VIEW MODE SWITCHER */}
            {(() => {
              const allModes = [...PRIMARY_PRESENTATION_MODES, ...EXTRA_PRESENTATION_MODES];
              const currentModeObj = allModes.find(m => m.id === activeView) || PRIMARY_PRESENTATION_MODES[0];
              const isDropdownActive = EXTRA_PRESENTATION_MODES.some(m => m.id === activeView);
              const CurrentModeIcon = currentModeObj.icon;

              return (
                <div className="view-mode-selector-card glass-panel no-print">
                  <div className="view-selector-header">
                    <div className="header-left">
                      <LayoutDashboard size={16} className="header-icon" />
                      <h3 className="header-title">Presentation Mode:</h3>
                      <span className="active-mode-badge">
                        <CurrentModeIcon size={13} />
                        <span>{currentModeObj.label}</span>
                      </span>
                    </div>
                    <div className="header-right">
                      <span className="header-hint">8 Interactive Formats Available</span>
                    </div>
                  </div>

                  <div className="view-mode-toolbar">
                    <div className="view-mode-pills">
                      {PRIMARY_PRESENTATION_MODES.map((mode) => {
                        const ModeIcon = mode.icon;
                        const isActive = activeView === mode.id;
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            className={`view-pill-btn ${isActive ? 'active' : ''}`}
                            onClick={() => setActiveView(mode.id)}
                          >
                            <ModeIcon size={14} />
                            <span>{mode.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* DROPDOWN FOR OTHER EXTRAS (Direct sibling of pills container to prevent overflow clipping) */}
                    <div className="more-formats-dropdown-wrap" ref={moreDropdownRef}>
                      <button
                        type="button"
                        className={`more-formats-trigger ${isDropdownActive ? 'active' : ''} ${moreOpen ? 'menu-open' : ''}`}
                        onClick={() => setMoreOpen(!moreOpen)}
                        aria-haspopup="true"
                        aria-expanded={moreOpen}
                      >
                        {isDropdownActive ? (
                          <>
                            <CurrentModeIcon size={14} />
                            <span>{currentModeObj.label}</span>
                            <ChevronDown size={14} className={`dropdown-arrow ${moreOpen ? 'open' : ''}`} />
                          </>
                        ) : (
                          <>
                            <SlidersHorizontal size={14} />
                            <span>More Formats</span>
                            <span className="dropdown-count-pill">+{EXTRA_PRESENTATION_MODES.length}</span>
                            <ChevronDown size={14} className={`dropdown-arrow ${moreOpen ? 'open' : ''}`} />
                          </>
                        )}
                      </button>

                      {moreOpen && (
                        <div className="more-formats-menu">
                          <div className="dropdown-menu-title">Additional Presentation Formats</div>
                          {EXTRA_PRESENTATION_MODES.map((mode) => {
                            const ExtraIcon = mode.icon;
                            const isSelected = activeView === mode.id;
                            return (
                              <button
                                key={mode.id}
                                type="button"
                                className={`menu-option-btn ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                  setActiveView(mode.id);
                                  setMoreOpen(false);
                                }}
                              >
                                <div className="option-icon-box">
                                  <ExtraIcon size={16} />
                                </div>
                                <div className="option-text-group">
                                  <div className="option-label-row">
                                    <span className="option-label">{mode.label}</span>
                                    <span className="option-badge">{mode.badge}</span>
                                  </div>
                                  <p className="option-description">{mode.description}</p>
                                </div>
                                {isSelected && <Check size={16} className="option-check" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* DYNAMIC PRESENTATION VIEW RENDERING */}
            {activeView === 'mindmap' ? (
              <MindMapView mindmap={data.summary?.mindmap} />
            ) : activeView === 'flashcards' ? (
              <FlashcardsView summary={data.summary} />
            ) : activeView === 'timeline' ? (
              <TimelineStepperView summary={data.summary} />
            ) : activeView === 'cheatsheet' ? (
              <CheatSheetView summary={data.summary} />
            ) : activeView === 'slides' ? (
              <SlideDeckView summary={data.summary} metadata={data.metadata} />
            ) : activeView === 'cornell' ? (
              <CornellNotesView summary={data.summary} metadata={data.metadata} />
            ) : activeView === 'faq' ? (
              <FaqAccordionView summary={data.summary} metadata={data.metadata} />
            ) : (
              /* DEFAULT STRUCTURED NOTES VIEW */
              <>
                {/* OVERVIEW / TL;DR BOX */}
                {(data.summary?.overview_content || data.summary?.tldr) && (
                  <div className={`tldr-card glass-panel format-${data.format_style}`}>
                    <div className="card-label">
                      {getOverviewIcon(data.format_style, data.difficulty)}
                      <span>{data.summary.overview_title || "Executive TL;DR"}</span>
                    </div>
                    <p className="tldr-text">{data.summary.overview_content || data.summary.tldr}</p>
                  </div>
                )}

                {/* KEY HIGHLIGHTS / TAKEAWAYS */}
                {(data.summary?.highlights_items?.length > 0 || data.summary?.key_takeaways?.length > 0) && (
                  <div className="takeaways-card glass-panel">
                    <h3 className="section-heading">
                      {getHighlightsIcon(data.format_style, data.difficulty)}
                      <span>{data.summary.highlights_title || "Core Takeaways"}</span>
                    </h3>
                    <div className="highlights-grid">
                      {data.summary.highlights_items ? (
                        data.summary.highlights_items.map((item, i) => (
                          <div key={i} className="highlight-card-item">
                            <div className="highlight-header">
                              <span className="highlight-pill-badge">{i + 1}</span>
                              <strong className="highlight-title">{item.label}</strong>
                            </div>
                            <p className="highlight-detail">{item.detail}</p>
                          </div>
                        ))
                      ) : (
                        data.summary.key_takeaways.map((point, i) => (
                          <div key={i} className="takeaway-item">
                            <span className="bullet-number">{i + 1}</span>
                            <span>{point}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* DETAILED SECTION NOTES */}
                {(data.summary?.sections?.length > 0 || data.summary?.detailed_notes?.length > 0) && (
                  <div className="sections-card glass-panel">
                    <h3 className="section-heading">
                      {getSectionsIcon(data.format_style)}
                      <span>{data.summary.sections_title || "Comprehensive Topic Breakdown"}</span>
                    </h3>
                    <div className="topic-accordion">
                      {(data.summary.sections || data.summary.detailed_notes).map((sec, i) => (
                        <div key={i} className="topic-card">
                          <h4 className="topic-title">{sec.section_title}</h4>
                          <p className="topic-body">{sec.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AUXILIARY DYNAMIC CARDS */}
                <div className="bottom-grid">
                  {(data.summary?.aux_left_items?.length > 0 || data.summary?.action_items?.length > 0) && (
                    <div className="sub-card glass-panel aux-left-card">
                      <h4 className="sub-heading">
                        {getAuxLeftIcon(data.summary.aux_left_type)}
                        <span>{data.summary.aux_left_title || "Action Items & Next Steps"}</span>
                      </h4>
                      <ul className={`items-list type-${data.summary.aux_left_type || 'checklist'}`}>
                        {(data.summary.aux_left_items || data.summary.action_items).map((item, i) => (
                          <li key={i}>
                            {data.summary.aux_left_type === 'questions' ? (
                              <span className="q-badge">Q{i + 1}</span>
                            ) : data.summary.aux_left_type === 'warnings' ? (
                              <AlertTriangle size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: 3 }} />
                            ) : (
                              <CheckCircle2 size={16} color="var(--accent-emerald)" style={{ flexShrink: 0, marginTop: 2 }} />
                            )}
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(data.summary?.aux_right_items?.length > 0 || data.summary?.quotes_or_highlights?.length > 0) && (
                    <div className="sub-card glass-panel aux-right-card">
                      <h4 className="sub-heading">
                        {getAuxRightIcon(data.summary.aux_right_type)}
                        <span>{data.summary.aux_right_title || "Memorable Highlights"}</span>
                      </h4>
                      <ul className={`items-list type-${data.summary.aux_right_type || 'quotes'}`}>
                        {(data.summary.aux_right_items || data.summary.quotes_or_highlights).map((item, i) => (
                          <li key={i} className={data.summary.aux_right_type === 'quotes' ? 'quote-item' : ''}>
                            {data.summary.aux_right_type === 'dos' ? (
                              <Check size={16} color="var(--accent-emerald)" style={{ flexShrink: 0, marginTop: 2 }} />
                            ) : data.summary.aux_right_type === 'directives' ? (
                              <Rocket size={15} color="#f43f5e" style={{ flexShrink: 0, marginTop: 3 }} />
                            ) : data.summary.aux_right_type === 'quotes' ? null : (
                              <CheckSquare size={16} color="#818cf8" style={{ flexShrink: 0, marginTop: 2 }} />
                            )}
                            <span>{data.summary.aux_right_type === 'quotes' ? `“${item}”` : item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* FOOTER */}
      <footer className="footer no-print">
        <p>TubeNotes AI — Intelligent YouTube Video Summarization & Study Notes Platform</p>
      </footer>
    </div>
  );
}
