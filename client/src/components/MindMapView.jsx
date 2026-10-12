import React, { useState } from 'react';
import { Network, ZoomIn, ZoomOut, RotateCcw, ChevronRight, Sparkles, Layers } from 'lucide-react';
import './MindMapView.scss';

export default function MindMapView({ mindmap }) {
  const [zoom, setZoom] = useState(1);
  const [expandedBranches, setExpandedBranches] = useState({});

  if (!mindmap || !mindmap.branches || mindmap.branches.length === 0) {
    return (
      <div className="mindmap-empty glass-panel">
        <Network size={32} color="var(--yt-red)" />
        <p>No mind map branches available for this video.</p>
      </div>
    );
  }

  const toggleBranch = (idx) => {
    setExpandedBranches(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const expandAll = () => {
    const all = {};
    mindmap.branches.forEach((_, idx) => { all[idx] = true; });
    setExpandedBranches(all);
  };

  const collapseAll = () => {
    setExpandedBranches({});
  };

  // Divide branches into Left & Right sides for a balanced symmetrical mindmap
  const leftBranches = mindmap.branches.filter((_, i) => i % 2 === 0);
  const rightBranches = mindmap.branches.filter((_, i) => i % 2 !== 0);

  return (
    <div className="mindmap-wrapper glass-panel">
      {/* TOOLBAR */}
      <div className="mindmap-toolbar">
        <div className="mindmap-title">
          <Network size={18} color="#818cf8" />
          <span>Interactive Conceptual Mind Map</span>
          <span className="branch-count-badge">{mindmap.branches.length} Branches</span>
        </div>

        <div className="mindmap-controls">
          <button className="ctrl-btn" onClick={expandAll} title="Expand All Branches">
            Expand All
          </button>
          <button className="ctrl-btn" onClick={collapseAll} title="Collapse All Branches">
            Collapse All
          </button>
          <button className="ctrl-btn icon-only" onClick={() => setZoom(z => Math.min(z + 0.1, 1.4))} title="Zoom In">
            <ZoomIn size={15} />
          </button>
          <button className="ctrl-btn icon-only" onClick={() => setZoom(z => Math.max(z - 0.1, 0.7))} title="Zoom Out">
            <ZoomOut size={15} />
          </button>
          <button className="ctrl-btn icon-only" onClick={() => setZoom(1)} title="Reset Zoom">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* MINDMAP CANVAS */}
      <div className="mindmap-canvas-container" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
        <div className="mindmap-tree-layout">
          {/* LEFT WING */}
          <div className="mindmap-wing left-wing">
            {leftBranches.map((branch, idx) => {
              const origIdx = idx * 2;
              const isExpanded = expandedBranches[origIdx] ?? true;
              return (
                <div key={origIdx} className="branch-group left-group">
                  <div className="sub-nodes-container">
                    {isExpanded && branch.children?.map((child, cIdx) => (
                      <div key={cIdx} className="leaf-node left-leaf" style={{ borderLeftColor: branch.color }}>
                        <span className="leaf-text">{child}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="branch-node left-branch-node"
                    style={{ borderColor: branch.color }}
                    onClick={() => toggleBranch(origIdx)}
                  >
                    <span className="branch-indicator" style={{ background: branch.color }} />
                    <span className="branch-text">{branch.title}</span>
                    <span className="leaf-counter">{branch.children?.length || 0}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* CENTER CORE NODE */}
          <div className="mindmap-core-node">
            <div className="core-node-inner">
              <div className="core-icon-pulse">
                <Sparkles size={20} color="#ff416c" />
              </div>
              <h3 className="core-title">{mindmap.center}</h3>
              <span className="core-tag">Central Video Thesis</span>
            </div>
          </div>

          {/* RIGHT WING */}
          <div className="mindmap-wing right-wing">
            {rightBranches.map((branch, idx) => {
              const origIdx = idx * 2 + 1;
              const isExpanded = expandedBranches[origIdx] ?? true;
              return (
                <div key={origIdx} className="branch-group right-group">
                  <button
                    type="button"
                    className="branch-node right-branch-node"
                    style={{ borderColor: branch.color }}
                    onClick={() => toggleBranch(origIdx)}
                  >
                    <span className="branch-indicator" style={{ background: branch.color }} />
                    <span className="branch-text">{branch.title}</span>
                    <span className="leaf-counter">{branch.children?.length || 0}</span>
                  </button>

                  <div className="sub-nodes-container">
                    {isExpanded && branch.children?.map((child, cIdx) => (
                      <div key={cIdx} className="leaf-node right-leaf" style={{ borderLeftColor: branch.color }}>
                        <span className="leaf-text">{child}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

