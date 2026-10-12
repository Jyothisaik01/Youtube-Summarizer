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
  Video
} from 'lucide-react';
import confetti from 'canvas-confetti';
import './App.scss';

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिंदी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'zh', name: 'Chinese', native: '中文' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'ur', name: 'Urdu', native: 'اردو' }
];

const SAMPLE_VIDEOS = [
  { title: "Veritasium: How Quantum Computers Work", url: "https://www.youtube.com/watch?v=g_IaVepNDT4" },
  { title: "Steve Jobs Stanford Commencement Speech", url: "https://www.youtube.com/watch?v=UF8uR6Z6KLc" },
  { title: "Kurzgesagt: The Last Human on Earth", url: "https://www.youtube.com/watch?v=5U14q8VCnLg" }
];

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [url, setUrl] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);

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
          language
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || 'Failed to process video summary');
      }

      setData(json);
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
    const notesText = `
${data.summary.title}
YouTube Video: ${data.metadata?.title} (${data.metadata?.author})
Source URL: ${url}

TL;DR:
${data.summary.tldr}

KEY TAKEAWAYS:
${data.summary.key_takeaways?.map((t, i) => `${i + 1}. ${t}`).join('\n')}

DETAILED NOTES:
${data.summary.detailed_notes?.map(n => `### ${n.section_title}\n${n.content}\n`).join('\n')}

ACTION ITEMS:
${data.summary.action_items?.map(a => `• ${a}`).join('\n')}
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

          <div className="controls-row">
            <div className="control-group">
              <label><Sliders size={13} style={{ display: 'inline', marginRight: 4 }} /> Complexity Level</label>
              <select
                className="custom-select"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                disabled={loading}
              >
                <option value="Simple">Simple (ELI5 — Everyday terms & analogies)</option>
                <option value="Medium">Medium (Balanced academic & professional)</option>
                <option value="Hard">Hard (Deep technical terminology)</option>
                <option value="Executive">Executive Brief (High-impact bullet points)</option>
              </select>
            </div>

            <div className="control-group">
              <label><Globe size={13} style={{ display: 'inline', marginRight: 4 }} /> Output Language</label>
              <select
                className="custom-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={loading}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.native} ({l.name})
                  </option>
                ))}
              </select>
            </div>
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
                <span><Sliders size={14} /> <strong>Format:</strong> {data.difficulty}</span>
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

            {/* TL;DR BOX */}
            {data.summary?.tldr && (
              <div className="tldr-card glass-panel">
                <div className="card-label">
                  <Sparkles size={14} /> Executive TL;DR
                </div>
                <p className="tldr-text">{data.summary.tldr}</p>
              </div>
            )}

            {/* KEY TAKEAWAYS */}
            {data.summary?.key_takeaways?.length > 0 && (
              <div className="takeaways-card glass-panel">
                <h3 className="section-heading">
                  <CheckCircle2 size={20} color="var(--yt-red)" /> Core Takeaways
                </h3>
                <div className="takeaways-grid">
                  {data.summary.key_takeaways.map((point, i) => (
                    <div key={i} className="takeaway-item">
                      <span className="bullet-number">{i + 1}</span>
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DETAILED SECTION NOTES */}
            {data.summary?.detailed_notes?.length > 0 && (
              <div className="sections-card glass-panel">
                <h3 className="section-heading">
                  <FileText size={20} color="var(--accent-cyan)" /> Comprehensive Topic Breakdown
                </h3>
                <div className="topic-accordion">
                  {data.summary.detailed_notes.map((sec, i) => (
                    <div key={i} className="topic-card">
                      <h4 className="topic-title">{sec.section_title}</h4>
                      <p className="topic-body">{sec.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ACTION ITEMS & MEMORABLE QUOTES */}
            <div className="bottom-grid">
              {data.summary?.action_items?.length > 0 && (
                <div className="sub-card glass-panel">
                  <h4 className="sub-heading">
                    <Bookmark size={18} color="var(--accent-amber)" /> Action Items & Next Steps
                  </h4>
                  <ul>
                    {data.summary.action_items.map((item, i) => (
                      <li key={i}>
                        <CheckCircle2 size={16} color="var(--accent-emerald)" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.summary?.quotes_or_highlights?.length > 0 && (
                <div className="sub-card glass-panel">
                  <h4 className="sub-heading">
                    <Sparkles size={18} color="var(--accent-purple)" /> Memorable Quotes & Highlights
                  </h4>
                  <ul>
                    {data.summary.quotes_or_highlights.map((quote, i) => (
                      <li key={i} style={{ fontStyle: 'italic' }}>
                        <span>“{quote}”</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
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
