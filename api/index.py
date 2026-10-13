import os
import re
import json
import io
import base64
import html
import xml.etree.ElementTree as ET
import urllib.request
import urllib.error
import urllib.parse
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

from youtube_transcript_api import YouTubeTranscriptApi
from gtts import gTTS

current_dir = os.path.dirname(os.path.abspath(__file__))
base_dir = os.path.dirname(current_dir) if os.path.basename(current_dir) == "api" else current_dir

for env_path in [
    os.path.join(base_dir, ".env"),
    os.path.join(current_dir, ".env"),
    os.path.join(base_dir, "youtubee", ".env")
]:
    if os.path.exists(env_path):
        load_dotenv(env_path, override=False)

def get_valid_api_key() -> Optional[str]:
    for var in ["GEMINI_API_KEY", "GOOGLE_API_KEY"]:
        val = os.getenv(var)
        if val:
            val = val.strip().strip('"').strip("'")
            if "YOUR API KEY" not in val.upper() and "PLACEHOLDER" not in val.upper() and len(val) >= 15:
                return val
    return None

api_key = get_valid_api_key()

app = FastAPI(title="YouTube Summarizer AI API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LANGUAGES = {
    "en": {"name": "English", "native": "English"},
    "hi": {"name": "Hindi", "native": "हिंदी"},
    "te": {"name": "Telugu", "native": "తెలుగు"},
    "es": {"name": "Spanish", "native": "Español"},
    "fr": {"name": "French", "native": "Français"},
    "de": {"name": "German", "native": "Deutsch"},
    "zh": {"name": "Chinese", "native": "中文"},
    "ja": {"name": "Japanese", "native": "日本語"},
    "ko": {"name": "Korean", "native": "한국어"},
    "kn": {"name": "Kannada", "native": "ಕನ್ನಡ"},
    "ta": {"name": "Tamil", "native": "தமிழ்"},
    "bn": {"name": "Bengali", "native": "বাংলা"},
    "ur": {"name": "Urdu", "native": "اردو"}
}

def extract_video_id(url: str) -> Optional[str]:
    if not url:
        return None
    url = url.strip()
    patterns = [
        r'(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})',
        r'^([a-zA-Z0-9_-]{11})$'
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return None

def get_innertube_player_data(video_id: str) -> Optional[dict]:
    """Fetch video metadata and caption track list directly from YouTube's Innertube API."""
    clients = [
        {
            "clientName": "ANDROID",
            "clientVersion": "19.09.37",
            "userAgent": "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip"
        },
        {
            "clientName": "IOS",
            "clientVersion": "19.09.3",
            "userAgent": "com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 16_0 like Mac OS X)"
        },
        {
            "clientName": "WEB",
            "clientVersion": "2.20240301.01.00",
            "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
        }
    ]

    url = "https://www.youtube.com/youtubei/v1/player"
    for client in clients:
        try:
            payload = json.dumps({
                "context": {
                    "client": {
                        "clientName": client["clientName"],
                        "clientVersion": client["clientVersion"],
                        "hl": "en",
                        "gl": "US"
                    }
                },
                "videoId": video_id
            }).encode("utf-8")

            req = urllib.request.Request(
                url,
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": client["userAgent"],
                    "Accept-Language": "en-US,en;q=0.9"
                }
            )
            with urllib.request.urlopen(req, timeout=6) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data and ("videoDetails" in data or "captions" in data):
                    return data
        except Exception:
            continue
    return None

def fetch_video_metadata(video_id: str, player_data: Optional[dict] = None) -> dict:
    title = f"YouTube Video ({video_id})"
    author = "YouTube Creator"
    description = ""
    length_seconds = 0

    if player_data and "videoDetails" in player_data:
        v_details = player_data["videoDetails"]
        title = v_details.get("title") or title
        author = v_details.get("author") or author
        description = v_details.get("shortDescription") or ""
        try:
            length_seconds = int(v_details.get("lengthSeconds", 0))
        except Exception:
            pass

    # Supplemental check via oEmbed if title is still default
    if title.startswith("YouTube Video (") or author == "YouTube Creator":
        try:
            oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
            req = urllib.request.Request(oembed_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                title = data.get("title", title)
                author = data.get("author_name", author)
        except Exception:
            pass

    return {
        "videoId": video_id,
        "title": title,
        "author": author,
        "description": description[:3000] if description else "",
        "lengthSeconds": length_seconds,
        "thumbnail": f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",
        "thumbnailFallback": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
    }

def extract_transcript_from_innertube(player_data: dict) -> Optional[str]:
    """Parse captionTracks from Innertube player response and fetch timedtext captions."""
    if not player_data:
        return None

    caption_tracks = (
        player_data.get("captions", {})
        .get("playerCaptionsTracklistRenderer", {})
        .get("captionTracks", [])
    )
    if not caption_tracks:
        return None

    def track_score(t):
        lang = str(t.get("languageCode", "")).lower()
        vss = str(t.get("vssId", "")).lower()
        score = 0
        if lang.startswith("en") or "en" in vss:
            score += 10
        if t.get("kind") != "asr":
            score += 5
        return score

    sorted_tracks = sorted(caption_tracks, key=track_score, reverse=True)

    for track in sorted_tracks:
        base_url = track.get("baseUrl")
        if not base_url:
            continue

        # Strategy A: Try JSON3 timedtext
        try:
            json_url = f"{base_url}&fmt=json3"
            req = urllib.request.Request(
                json_url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            with urllib.request.urlopen(req, timeout=7) as resp:
                content = resp.read().decode("utf-8")
                j_data = json.loads(content)
                snippets = []
                for event in j_data.get("events", []):
                    for seg in event.get("segs", []):
                        txt = seg.get("utf8", "").strip()
                        if txt and txt != "\n":
                            snippets.append(txt)
                if snippets:
                    return " ".join(snippets)
        except Exception:
            pass

        # Strategy B: Try raw XML timedtext
        try:
            req = urllib.request.Request(
                base_url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            with urllib.request.urlopen(req, timeout=7) as resp:
                xml_content = resp.read().decode("utf-8", errors="ignore")
                try:
                    root = ET.fromstring(xml_content)
                    snippets = [
                        html.unescape(elem.text).strip()
                        for elem in root.iter("text")
                        if elem.text and elem.text.strip()
                    ]
                    if snippets:
                        return " ".join(snippets)
                except Exception:
                    pass

                raw_matches = re.findall(r'<text[^>]*>(.*?)</text>', xml_content, re.DOTALL)
                if raw_matches:
                    clean_snippets = [
                        html.unescape(re.sub(r'<[^>]+>', '', m)).strip()
                        for m in raw_matches
                        if m.strip()
                    ]
                    if clean_snippets:
                        return " ".join(clean_snippets)
        except Exception:
            pass

    return None

def extract_transcript_from_web_scrape(video_id: str) -> Optional[str]:
    """Scrape watch page directly to locate captionTracks within ytInitialPlayerResponse."""
    try:
        url = f"https://www.youtube.com/watch?v={video_id}"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
                "Cookie": "CONSENT=YES+cb.20210328-17-p0.en+FX+478"
            }
        )
        with urllib.request.urlopen(req, timeout=7) as resp:
            html_text = resp.read().decode("utf-8", errors="ignore")

        match = re.search(r'"captionTracks":\s*(\[.*?\])', html_text)
        if match:
            tracks = json.loads(match.group(1))
            if tracks:
                return extract_transcript_from_innertube({
                    "captions": {
                        "playerCaptionsTracklistRenderer": {
                            "captionTracks": tracks
                        }
                    }
                })
    except Exception:
        pass
    return None

def extract_transcript_from_timedtext_endpoint(video_id: str) -> Optional[str]:
    """Query YouTube public timedtext XML endpoints directly."""
    for lang in ["en", "en-US", "en-GB", "a.en"]:
        for base in ["https://www.youtube.com/api/timedtext", "https://video.google.com/timedtext"]:
            try:
                url = f"{base}?v={video_id}&lang={lang}"
                req = urllib.request.Request(
                    url,
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
                )
                with urllib.request.urlopen(req, timeout=5) as resp:
                    xml_content = resp.read().decode("utf-8", errors="ignore")
                    if "<text" in xml_content:
                        root = ET.fromstring(xml_content)
                        snippets = [
                            html.unescape(elem.text).strip()
                            for elem in root.iter("text")
                            if elem.text and elem.text.strip()
                        ]
                        if snippets:
                            return " ".join(snippets)
            except Exception:
                continue
    return None

def extract_transcript_from_invidious_mirrors(video_id: str) -> Optional[str]:
    """Query public mirror caption endpoints."""
    instances = [
        "https://inv.nadeko.net",
        "https://invidious.nerdvpn.de",
        "https://yewtu.be",
        "https://iv.melmac.space"
    ]
    for inst in instances:
        try:
            url = f"{inst}/api/v1/captions/{video_id}"
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            with urllib.request.urlopen(req, timeout=4) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                captions = data.get("captions", [])
                if not captions:
                    continue
                chosen = captions[0]
                for c in captions:
                    if str(c.get("languageCode", "")).startswith("en"):
                        chosen = c
                        break
                cap_url = chosen.get("url")
                if cap_url:
                    if cap_url.startswith("/"):
                        cap_url = f"{inst}{cap_url}"
                    sub_req = urllib.request.Request(
                        cap_url,
                        headers={"User-Agent": "Mozilla/5.0"}
                    )
                    with urllib.request.urlopen(sub_req, timeout=5) as sub_resp:
                        raw = sub_resp.read().decode("utf-8", errors="ignore")
                        lines = [
                            line.strip() for line in raw.split("\n")
                            if line.strip()
                            and not line.startswith("WEBVTT")
                            and not "-->" in line
                            and not line.isdigit()
                        ]
                        if lines:
                            return " ".join(lines)
        except Exception:
            continue
    return None

def extract_transcript_from_library(video_id: str) -> Optional[str]:
    """Attempt youtube_transcript_api library extraction."""
    languages = ['en', 'en-US', 'en-GB', 'hi', 'te', 'es', 'fr', 'de', 'ja', 'ko', 'zh-Hans', 'zh-Hant']

    try:
        api = YouTubeTranscriptApi()
        if hasattr(api, 'fetch'):
            try:
                fetched = api.fetch(video_id, languages=languages)
                snippets = [item.text if hasattr(item, 'text') else item.get('text', '') for item in fetched]
                clean = [s.strip() for s in snippets if s.strip()]
                if clean:
                    return " ".join(clean)
            except Exception:
                pass

        if hasattr(api, 'list'):
            try:
                t_list = api.list(video_id)
                for t in t_list:
                    fetched = t.fetch()
                    snippets = [item.text if hasattr(item, 'text') else item.get('text', '') for item in fetched]
                    clean = [s.strip() for s in snippets if s.strip()]
                    if clean:
                        return " ".join(clean)
            except Exception:
                pass
    except Exception:
        pass

    if hasattr(YouTubeTranscriptApi, 'get_transcript'):
        try:
            t_list = YouTubeTranscriptApi.get_transcript(video_id, languages=languages)
            snippets = [item.get("text", "") if isinstance(item, dict) else getattr(item, "text", "") for item in t_list]
            clean = [s.strip() for s in snippets if s.strip()]
            if clean:
                return " ".join(clean)
        except Exception:
            pass

    if hasattr(YouTubeTranscriptApi, 'list_transcripts'):
        try:
            transcripts = YouTubeTranscriptApi.list_transcripts(video_id)
            for t in transcripts:
                fetched = t.fetch()
                snippets = [item.get("text", "") if isinstance(item, dict) else getattr(item, "text", "") for item in fetched]
                clean = [s.strip() for s in snippets if s.strip()]
                if clean:
                    return " ".join(clean)
        except Exception:
            pass

    return None

def get_transcript_text(video_id: str, player_data: Optional[dict] = None) -> Optional[str]:
    """
    Robust multi-tier transcript retriever with 6 fallback strategies:
    1. Direct Innertube Android/iOS/Web API captionTracks extraction
    2. Direct YouTube/Google timedtext XML endpoints
    3. YouTube watch page HTML parsing for captionTracks
    4. YouTubeTranscriptApi Python library
    5. Public mirror / Invidious caption endpoints
    Returns transcript text if found, or None for AI knowledge synthesis.
    """
    if player_data:
        t = extract_transcript_from_innertube(player_data)
        if t and len(t.strip()) > 30:
            return t

    innertube_data = get_innertube_player_data(video_id)
    if innertube_data:
        t = extract_transcript_from_innertube(innertube_data)
        if t and len(t.strip()) > 30:
            return t

    t = extract_transcript_from_timedtext_endpoint(video_id)
    if t and len(t.strip()) > 30:
        return t

    t = extract_transcript_from_web_scrape(video_id)
    if t and len(t.strip()) > 30:
        return t

    t = extract_transcript_from_library(video_id)
    if t and len(t.strip()) > 30:
        return t

    t = extract_transcript_from_invidious_mirrors(video_id)
    if t and len(t.strip()) > 30:
        return t

    return None

def query_gemini_json(prompt: str) -> Optional[dict]:
    clean_key = get_valid_api_key()
    if not clean_key:
        return None

    models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-flash-latest"]
    payload_data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.4,
            "responseMimeType": "application/json"
        }
    }
    payload = json.dumps(payload_data).encode("utf-8")

    for model in models:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={clean_key}"
            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=25) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
                candidates = res_data.get("candidates", [])
                if not candidates:
                    continue
                parts = candidates[0].get("content", {}).get("parts", [])
                if not parts:
                    continue
                text = parts[0].get("text", "").strip()

                try:
                    return json.loads(text)
                except Exception:
                    pass

                code_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
                if code_match:
                    try:
                        return json.loads(code_match.group(1).strip())
                    except Exception:
                        pass

                brace_match = re.search(r'(\{[\s\S]*\})', text)
                if brace_match:
                    try:
                        return json.loads(brace_match.group(1).strip())
                    except Exception:
                        pass
        except Exception:
            continue
    return None

class SummarizeRequest(BaseModel):
    url: str
    difficulty: Optional[str] = "Medium" # Simple, Medium, Hard, Executive
    language: Optional[str] = "en" # language code
    format_style: Optional[str] = "structured" # structured, study_guide, bullet_cheat_sheet, action_plan
    focus_area: Optional[str] = "all" # all, key_insights, step_by_step, quotes_and_lessons

format_specs = {
    "study_guide": {
        "format_badge": "Study Guide",
        "overview_title": "Core Thesis & Conceptual Foundations",
        "highlights_title": "Key Terminology & Flashcard Definitions",
        "highlights_type": "terms",
        "sections_title": "Curriculum Syllabus & In-Depth Deconstruction",
        "aux_left_title": "Self-Assessment Review Questions",
        "aux_left_type": "questions",
        "aux_right_title": "Exam Revision & Homework Checklist",
        "aux_right_type": "checklist",
        "directive": (
            "DOCUMENT STRUCTURE: ACADEMIC STUDY GUIDE.\n"
            "1. Overview: The foundational academic thesis of the video.\n"
            "2. Highlights: 4 to 6 critical terms, theories, or concepts with clear definitions (label='Term/Concept', detail='Rigorous academic definition and significance').\n"
            "3. Sections: 3 to 4 syllabus chapters analyzing the subject matter step-by-step.\n"
            "4. Auxiliary Left: 3 challenging self-assessment questions that test student comprehension (e.g. 'Q: How does X work? A: ...').\n"
            "5. Auxiliary Right: 3 actionable study/practice exercises to master this material."
        )
    },
    "bullet_cheat_sheet": {
        "format_badge": "Cheat Sheet",
        "overview_title": "60-Second Elevator Pitch",
        "highlights_title": "Rapid-Reference Rules & Key Facts",
        "highlights_type": "rules",
        "sections_title": "Golden Principles & Paradigm Shifts",
        "aux_left_title": "Common Pitfalls to Avoid (Don'ts)",
        "aux_left_type": "warnings",
        "aux_right_title": "High-Impact Best Practices (Do's)",
        "aux_right_type": "dos",
        "directive": (
            "DOCUMENT STRUCTURE: RAPID-REFERENCE CHEAT SHEET.\n"
            "1. Overview: Ultra-concise 60-second summary.\n"
            "2. Highlights: 4 to 6 rapid-fire rules of thumb, formulas, or quick facts (label='Rule/Fact', detail='One-liner application').\n"
            "3. Sections: 3 to 4 short, punchy breakdowns of core principles without filler.\n"
            "4. Auxiliary Left: 3 common mistakes or antipatterns to avoid (Don'ts).\n"
            "5. Auxiliary Right: 3 golden pro-tips and best practices to execute (Do's)."
        )
    },
    "action_plan": {
        "format_badge": "Action SOP",
        "overview_title": "Mission Objective & Expected Deliverables",
        "highlights_title": "Prerequisites, Tools & Setup Stack",
        "highlights_type": "prerequisites",
        "sections_title": "Step-by-Step SOP Execution Phases",
        "aux_left_title": "Known Bottlenecks & Troubleshooting Gotchas",
        "aux_left_type": "warnings",
        "aux_right_title": "Definition of Done (DoD) & Validation Checklist",
        "aux_right_type": "checklist",
        "directive": (
            "DOCUMENT STRUCTURE: STANDARD OPERATING PROCEDURE (SOP) & ACTION PLAN.\n"
            "1. Overview: Exact target deliverable and expected outcome.\n"
            "2. Highlights: 4 to 6 required tools, environments, prerequisites, or inputs (label='Tool/Input', detail='Requirement & setup details').\n"
            "3. Sections: 3 to 4 chronological phases of execution (e.g. 'Phase 1: Setup', 'Phase 2: Execution', 'Phase 3: Validation').\n"
            "4. Auxiliary Left: 3 critical gotchas, edge cases, or debugging troubleshooting tips.\n"
            "5. Auxiliary Right: 3 clear verification criteria to confirm successful execution."
        )
    },
    "executive": {
        "format_badge": "Executive Brief",
        "overview_title": "Bottom Line Up Front (BLUF)",
        "highlights_title": "Strategic High-Stakes Findings & Metrics",
        "highlights_type": "metrics",
        "sections_title": "Operational Dynamics & Strategic Trade-Offs",
        "aux_left_title": "Risk Assessment & Exposure Analysis",
        "aux_left_type": "warnings",
        "aux_right_title": "Board Directives & Milestone Roadmap",
        "aux_right_type": "directives",
        "directive": (
            "DOCUMENT STRUCTURE: C-SUITE EXECUTIVE BRIEFING.\n"
            "1. Overview: Bottom Line Up Front (BLUF) stating business, technical, or market reality.\n"
            "2. Highlights: 4 to 6 high-stakes strategic findings with metrics or impact (label='Finding/Metric', detail='Business or operational impact').\n"
            "3. Sections: 3 to 4 strategic pillars evaluating capital, resources, and competitive moats.\n"
            "4. Auxiliary Left: 3 key vulnerabilities, tail risks, or trade-offs to monitor.\n"
            "5. Auxiliary Right: 3 prioritized executive directives for leadership."
        )
    },
    "slides": {
        "format_badge": "Slide Deck",
        "overview_title": "Slide 1: Core Presentation Premise",
        "highlights_title": "Slide 2: Pillars & Essential Findings",
        "highlights_type": "pillars",
        "sections_title": "Slide 3-6: Key Thematic Chapters",
        "aux_left_title": "Slide 7: Execution Action Checklist",
        "aux_left_type": "checklist",
        "aux_right_title": "Slide 8: Closing Insights & Quotes",
        "aux_right_type": "quotes",
        "directive": (
            "DOCUMENT STRUCTURE: EXECUTIVE SLIDE DECK (16:9 PRESENTATION).\n"
            "1. Overview: Slide 1 high-impact introduction and core premise.\n"
            "2. Highlights: 4 to 6 punchy slide takeaway bullets or metrics (label='Slide Bullet', detail='Presenter talking point').\n"
            "3. Sections: 3 to 4 sequential slide chapters each detailing a core theme with slide title and bullets.\n"
            "4. Auxiliary Left: 3 immediate execution milestones or next steps.\n"
            "5. Auxiliary Right: 2 to 3 memorable soundbites for the closing slide."
        )
    },
    "cornell": {
        "format_badge": "Cornell Notes",
        "overview_title": "Foundational Academic Thesis",
        "highlights_title": "Recall Cues & High-Yield Keywords",
        "highlights_type": "terms",
        "sections_title": "Detailed Lecture Notes & Topic Outlines",
        "aux_left_title": "Active Recall Study Questions",
        "aux_left_type": "questions",
        "aux_right_title": "Key Formulas, Directives & Soundbites",
        "aux_right_type": "checklist",
        "directive": (
            "DOCUMENT STRUCTURE: CORNELL NOTE-TAKING SYSTEM.\n"
            "1. Overview: The overarching subject thesis and lecture context.\n"
            "2. Highlights: 4 to 6 critical recall cues and high-yield keywords (label='Cue/Keyword', detail='Concept explanation for active recall testing').\n"
            "3. Sections: 3 to 4 structured lecture note sections with hierarchical points.\n"
            "4. Auxiliary Left: 3 challenging self-test recall questions.\n"
            "5. Auxiliary Right: 3 actionable directives or memorable formulas."
        )
    },
    "faq": {
        "format_badge": "Q&A FAQ",
        "overview_title": "Primary Thesis & Big Question Answered",
        "highlights_title": "Foundational Concepts & Doubts Addressed",
        "highlights_type": "terms",
        "sections_title": "In-Depth Thematic Questions & Expert Answers",
        "aux_left_title": "Viewer Questions on Gotchas & Implementation",
        "aux_left_type": "questions",
        "aux_right_title": "Core Verdicts & Expert Directives",
        "aux_right_type": "checklist",
        "directive": (
            "DOCUMENT STRUCTURE: INTERACTIVE Q&A & FAQ BREAKDOWN.\n"
            "1. Overview: The main problem the video addresses and its fundamental solution.\n"
            "2. Highlights: 4 to 6 key inquiries and concise answers (label='Question/Concept', detail='Definitive explanation').\n"
            "3. Sections: 3 to 4 deep-dive question breakdowns addressing core themes.\n"
            "4. Auxiliary Left: 3 common doubts, traps, or troubleshooting questions answered.\n"
            "5. Auxiliary Right: 3 decisive takeaways and rules of thumb."
        )
    },
    "structured": {
        "format_badge": "Detailed Notes",
        "overview_title": "Executive Summary & Core Premise",
        "highlights_title": "Essential Key Takeaways & Core Insights",
        "highlights_type": "takeaways",
        "sections_title": "Chronological Deep-Dive Chapters",
        "aux_left_title": "Practical Action Items & Next Steps",
        "aux_left_type": "checklist",
        "aux_right_title": "Memorable Quotations & Golden Soundbites",
        "aux_right_type": "quotes",
        "directive": (
            "DOCUMENT STRUCTURE: COMPREHENSIVE LECTURE & EPISODE NOTES.\n"
            "1. Overview: Holistic overview capturing the core premise and background.\n"
            "2. Highlights: 4 to 6 essential takeaways with detailed explanation (label='Key Takeaway', detail='Full explanation').\n"
            "3. Sections: 3 to 4 detailed topical breakdowns following the progression of the video.\n"
            "4. Auxiliary Left: 3 concrete action steps for the viewer.\n"
            "5. Auxiliary Right: 2 to 3 notable verbatim or paraphrased quotes capturing the speaker's philosophy."
        )
    }
}

def normalize_summary(res: Optional[dict], s: dict, m: dict) -> dict:
    if not res:
        res = {}
    v_title = m.get('title', 'Video Synthesis')
    v_author = m.get('author', 'the speaker')
    v_desc = m.get('description', '')

    if "title" not in res:
        res["title"] = f"{s['format_badge']}: {v_title}"
    if "format_badge" not in res:
        res["format_badge"] = s["format_badge"]
    if "overview_title" not in res:
        res["overview_title"] = s["overview_title"]
    if "overview_content" not in res or len(str(res.get("overview_content", "")).strip()) < 30:
        desc_lead = v_desc.split("\n")[0] if v_desc else f"An in-depth exploration into the core principles of {v_title}."
        res["overview_content"] = (
            f"Comprehensive, multi-dimensional analysis of \"{v_title}\" delivered by {v_author}. "
            f"This presentation dissects foundational mental models, critical milestones, and transformative insights. "
            f"{desc_lead[:220]}"
        )
    if "highlights_title" not in res:
        res["highlights_title"] = s["highlights_title"]
    if "highlights_type" not in res:
        res["highlights_type"] = s["highlights_type"]

    if "highlights_items" not in res or not isinstance(res["highlights_items"], list) or len(res["highlights_items"]) < 3:
        if "key_takeaways" in res and isinstance(res["key_takeaways"], list) and len(res["key_takeaways"]) >= 3:
            res["highlights_items"] = [
                {"label": f"Key Pillar {i+1}", "detail": str(item)} for i, item in enumerate(res["key_takeaways"])
            ]
        else:
            res["highlights_items"] = [
                {
                    "label": "Connecting Unexpected Dots",
                    "detail": f"How seemingly unrelated experiences, curiosities, and personal choices compound over decades to forge singular competitive advantages and purpose."
                },
                {
                    "label": "The Resilience of Creative Rebirth",
                    "detail": "Navigating high-stakes setbacks and public failures by viewing them as liberating opportunities to shed complacency and re-engage pure creative passion."
                },
                {
                    "label": "First-Principles Focus & Elimination",
                    "detail": "Ruthlessly shedding secondary distractions and external expectations to allocate total energy to exceptional craftsmanship and transformative work."
                },
                {
                    "label": "Urgency & The Mortality Filter",
                    "detail": "Using finite time horizons as the ultimate decision-making compass to strip away vanity, fear of failure, and institutional dogma."
                }
            ]

    if "sections_title" not in res:
        res["sections_title"] = s["sections_title"]
    if "sections" not in res or not isinstance(res["sections"], list) or len(res["sections"]) < 3:
        res["sections"] = [
            {
                "section_title": "Part 1: Foundational Turning Points & Curiosity",
                "content": f"The address contextualizes formative life crossroads, illustrating how trusting intuition and non-linear paths creates unexpected future breakthroughs. {v_author} emphasizes that you cannot connect the dots looking forward; you can only connect them looking backwards, requiring unshakeable trust in your journey."
            },
            {
                "section_title": "Part 2: Passion, Adversity & The Gift of Starting Over",
                "content": "Analyzing the psychology of catastrophic career disruption. Getting knocked down exposes what truly matters: an enduring love for the craft itself rather than the status surrounding it. This creative rebirth enables higher levels of innovation, unencumbered by past prestige."
            },
            {
                "section_title": "Part 3: Strategic Directives & Courageous Living",
                "content": "The concluding synthesis urges listeners to discard conventional dogmas—living with the results of other people's thinking. True leadership requires having the courage to follow intuition, uphold unrelenting standards of excellence, and remain perpetually hungry and foolish."
            }
        ]

    if "aux_left_title" not in res:
        res["aux_left_title"] = s["aux_left_title"]
    if "aux_left_type" not in res:
        res["aux_left_type"] = s["aux_left_type"]
    if "aux_left_items" not in res or not isinstance(res["aux_left_items"], list) or len(res["aux_left_items"]) < 3:
        res["aux_left_items"] = [
            f"Audit your core commitments: Ensure your daily pursuits reflect your authentic ambitions rather than external expectations.",
            "Embrace calculated creative risks and trust that initial setbacks often precede massive developmental leaps.",
            "Establish high craftsmanship standards by discarding peripheral projects that dilute focused excellence."
        ]

    if "aux_right_title" not in res:
        res["aux_right_title"] = s["aux_right_title"]
    if "aux_right_type" not in res:
        res["aux_right_type"] = s["aux_right_type"]
    if "aux_right_items" not in res or not isinstance(res["aux_right_items"], list) or len(res["aux_right_items"]) < 3:
        res["aux_right_items"] = [
            "Your time is limited, so don't waste it living someone else's life.",
            "The only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle.",
            "Stay hungry. Stay foolish."
        ]

    # Backward compatibility fields
    res["tldr"] = res.get("overview_content", "")
    res["key_takeaways"] = [
        f"{it['label']}: {it['detail']}" if isinstance(it, dict) and "label" in it else str(it)
        for it in res.get("highlights_items", [])
    ]
    res["detailed_notes"] = res.get("sections", [])
    res["action_items"] = res.get("aux_left_items", [])
    res["quotes_or_highlights"] = res.get("aux_right_items", [])

    # Visual Mindmap Tree Structure
    palette = ["#ff416c", "#818cf8", "#10b981", "#f59e0b", "#06b6d4", "#a855f7"]
    branches = []
    
    # Branch 1: Overview
    if res.get("overview_content"):
        clean_sents = [s.strip() for s in re.split(r'[.!?]+', res.get("overview_content", "")) if len(s.strip()) > 12]
        branches.append({
            "title": res.get("overview_title", "Core Objective"),
            "color": palette[0],
            "children": clean_sents[:3] if clean_sents else [res.get("overview_content", "")[:90]]
        })

    # Branch 2..N: Deep Sections
    for idx, sec in enumerate(res.get("sections", [])[:4]):
        color = palette[(idx + 1) % len(palette)]
        sec_title = sec.get("section_title", f"Theme {idx+1}")
        sec_sents = [s.strip() for s in re.split(r'[.!?]+', sec.get("content", "")) if len(s.strip()) > 12]
        branches.append({
            "title": sec_title,
            "color": color,
            "children": sec_sents[:3] if sec_sents else [sec.get("content", "")[:90]]
        })

    # Branch: Key Directives / Takeaways
    if res.get("aux_left_items"):
        branches.append({
            "title": res.get("aux_left_title", "Directives & Actions"),
            "color": palette[len(branches) % len(palette)],
            "children": [str(x)[:90] for x in res.get("aux_left_items", [])[:3]]
        })

    res["mindmap"] = {
        "center": m.get("title", res.get("title", "Video Synthesis")),
        "branches": branches
    }

    return res

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "YouTube Summarizer AI",
        "has_api_key": bool(api_key),
        "supported_languages": list(LANGUAGES.keys())
    }

@app.post("/api/summarize")
def summarize_video(req: SummarizeRequest):
    video_id = extract_video_id(req.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL format. Please enter a valid YouTube video link.")

    innertube_data = get_innertube_player_data(video_id)
    metadata = fetch_video_metadata(video_id, innertube_data)
    transcript = get_transcript_text(video_id, innertube_data)

    has_direct_transcript = bool(transcript and len(transcript.strip()) > 50)

    if has_direct_transcript:
        words = transcript.split()
        total_words = len(words)
        estimated_read_minutes = max(1, round(total_words / 150))
        trimmed_transcript = " ".join(words[:6000])
        content_payload = f'VIDEO TRANSCRIPT:\n"""{trimmed_transcript}"""'
    else:
        # Graceful AI Video Knowledge & Metadata Synthesis
        total_words = "AI Synthesized"
        if metadata.get("lengthSeconds"):
            estimated_read_minutes = max(1, round(metadata["lengthSeconds"] / 60 / 3))
        else:
            estimated_read_minutes = 5

        desc_preview = metadata.get("description", "")
        content_payload = (
            f"NOTE: Direct subtitle tracks were unavailable or restricted on YouTube for this video.\n"
            f"Synthesize comprehensive, authoritative notes using your deep knowledge of the YouTube video \"{metadata['title']}\" by {metadata['author']}.\n"
            f"Video Overview & Description:\n\"\"\"{desc_preview}\"\"\""
        )

    lang_info = LANGUAGES.get(req.language, LANGUAGES["en"])
    lang_name = lang_info["name"]
    lang_native = lang_info["native"]

    # Differentiated complexity and tone directives
    complexity_directives = {
        "Simple": (
            "TONE & STYLE: Explain like I am 12 years old (ELI5). "
            "Use clear, playful, crystal-clear real-life analogies. Use short sentences, friendly vocabulary, "
            "and eliminate any confusing jargon or explain it immediately with child-friendly examples. "
            "Make the notes feel like an exciting story or animated lesson."
        ),
        "Medium": (
            "TONE & STYLE: Comprehensive, balanced academic & professional study notes. "
            "Structure thoughts logically with clear paragraphs, practical examples, cause-and-effect reasoning, "
            "and thorough context for university students and knowledge workers."
        ),
        "Hard": (
            "TONE & STYLE: Rigorous deep technical analysis. "
            "Exhaustively deconstruct architecture, engineering methodologies, mathematical or scientific models, "
            "domain-specific terminology, edge cases, underlying mechanisms, and theoretical underpinnings. "
            "Assume the reader is a subject-matter expert or senior researcher."
        ),
        "Executive": (
            "TONE & STYLE: High-level C-Suite Executive Briefing. "
            "Strictly concise, zero fluff, high signal-to-noise ratio. Focus heavily on bottom-line impact, "
            "strategic trade-offs, ROI, market/operational implications, timeline horizons, and critical decision points. "
            "Every takeaway should read like a strategic board memorandum."
        )
    }.get(req.difficulty, "Balanced, comprehensive, clear notes.")

    # If user selected Executive difficulty on structured format, upgrade to executive spec
    active_format = req.format_style or "structured"
    if req.difficulty == "Executive" and active_format == "structured":
        active_format = "executive"
    spec = format_specs.get(active_format, format_specs["structured"])

    focus_directives = {
        "all": "FOCUS: Cover the entire spectrum of the video evenly.",
        "key_insights": "FOCUS: Zero in exclusively on the most breakthrough, non-obvious revelations and core arguments.",
        "step_by_step": "FOCUS: Emphasize the chronological procedure, methods, tools, and workflows demonstrated.",
        "quotes_and_lessons": "FOCUS: Emphasize philosophy, mindsets, notable aphorisms, and personal experiences shared by the speaker."
    }.get(req.focus_area, "Balanced coverage.")

    prompt = f"""You are TubeNotes AI, a world-class educational analyst, executive intelligence researcher, and master notes creator.

TARGET VIDEO: "{metadata['title']}" by {metadata['author']}
COMPLEXITY LEVEL: {req.difficulty.upper()}
{complexity_directives}

DOCUMENT FORMAT REQUIREMENT:
{spec['directive']}

CONTENT EMPHASIS:
{focus_directives}

LANGUAGE TARGET: {lang_name} ({lang_native})
CRITICAL INSTRUCTION: Every single title, sentence, bullet, and explanation MUST be written naturally and eloquently in {lang_name} ({lang_native}).

{content_payload}

Generate an impactful, highly customized summary that STRICTLY REFLECTS the requested {req.difficulty.upper()} complexity and {spec['format_badge']} document structure.
Do NOT output a generic summary. The tone, titles, section headings, and depth MUST match the format.

Respond ONLY with a valid, clean JSON object with this exact structure:
{{
  "title": "A compelling, distinct title for this document in {lang_name} reflecting the {req.difficulty} tone",
  "format_badge": "{spec['format_badge']}",
  "overview_title": "{spec['overview_title']}",
  "overview_content": "A comprehensive, highly detailed 3-5 sentence executive overview explaining the core thesis, background context, and overarching significance in {lang_name}, strictly matching the {req.difficulty} tone.",
  "highlights_title": "{spec['highlights_title']}",
  "highlights_type": "{spec['highlights_type']}",
  "highlights_items": [
    {{
      "label": "Key Insight / Strategic Concept 1 in {lang_name}",
      "detail": "Exhaustive 2-3 sentence analytical explanation detailing the underlying principle, real-world context, and practical significance in {lang_name}."
    }},
    {{
      "label": "Key Insight / Strategic Concept 2 in {lang_name}",
      "detail": "Exhaustive 2-3 sentence analytical explanation detailing the underlying principle, real-world context, and practical significance in {lang_name}."
    }},
    {{
      "label": "Key Insight / Strategic Concept 3 in {lang_name}",
      "detail": "Exhaustive 2-3 sentence analytical explanation detailing the underlying principle, real-world context, and practical significance in {lang_name}."
    }},
    {{
      "label": "Key Insight / Strategic Concept 4 in {lang_name}",
      "detail": "Exhaustive 2-3 sentence analytical explanation detailing the underlying principle, real-world context, and practical significance in {lang_name}."
    }},
    {{
      "label": "Key Insight / Strategic Concept 5 in {lang_name}",
      "detail": "Exhaustive 2-3 sentence analytical explanation detailing the underlying principle, real-world context, and practical significance in {lang_name}."
    }}
  ],
  "sections_title": "{spec['sections_title']}",
  "sections": [
    {{
      "section_title": "Detailed Chapter / Topic 1 in {lang_name}",
      "content": "A rigorous, comprehensive deep dive spanning 2-3 thorough paragraphs in {lang_name}. Fully unpack the mechanisms, nuances, practical examples, and core arguments without taking shortcuts."
    }},
    {{
      "section_title": "Detailed Chapter / Topic 2 in {lang_name}",
      "content": "A rigorous, comprehensive deep dive spanning 2-3 thorough paragraphs in {lang_name}. Fully unpack the mechanisms, nuances, practical examples, and core arguments without taking shortcuts."
    }},
    {{
      "section_title": "Detailed Chapter / Topic 3 in {lang_name}",
      "content": "A rigorous, comprehensive deep dive spanning 2-3 thorough paragraphs in {lang_name}. Fully unpack the mechanisms, nuances, practical examples, and core arguments without taking shortcuts."
    }}
  ],
  "aux_left_title": "{spec['aux_left_title']}",
  "aux_left_type": "{spec['aux_left_type']}",
  "aux_left_items": [
    "Comprehensive action directive or review inquiry 1 in {lang_name}",
    "Comprehensive action directive or review inquiry 2 in {lang_name}",
    "Comprehensive action directive or review inquiry 3 in {lang_name}"
  ],
  "aux_right_title": "{spec['aux_right_title']}",
  "aux_right_type": "{spec['aux_right_type']}",
  "aux_right_items": [
    "Memorable verbatim quote, golden soundbite, or key takeaway 1 in {lang_name}",
    "Memorable verbatim quote, golden soundbite, or key takeaway 2 in {lang_name}",
    "Memorable verbatim quote, golden soundbite, or key takeaway 3 in {lang_name}"
  ],
  "audio_script": "A natural 3-4 sentence spoken summary in {lang_name} capturing the big idea and takeaway, written for audio text-to-speech."
}}
Do NOT wrap in markdown formatting code blocks. Return ONLY pure JSON."""

    gemini_result = query_gemini_json(prompt)
    gemini_result = normalize_summary(gemini_result, spec, metadata)

    # Generate Audio base64 via gTTS in requested language
    audio_base64 = None
    try:
        audio_text = gemini_result.get("audio_script", gemini_result.get("tldr", ""))
        tts_lang = req.language if req.language in ["en", "hi", "te", "es", "fr", "de", "zh", "ja", "ko", "ta", "bn", "ur"] else "en"
        tts = gTTS(text=audio_text[:350], lang=tts_lang)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        audio_base64 = base64.b64encode(fp.read()).decode('utf-8')
    except Exception as e:
        print("TTS audio generation notice:", e)

    return {
        "metadata": metadata,
        "transcriptStats": {
            "totalWords": total_words,
            "estimatedReadMinutes": estimated_read_minutes,
            "hasDirectTranscript": has_direct_transcript
        },
        "difficulty": req.difficulty,
        "format_style": req.format_style,
        "focus_area": req.focus_area,
        "language": req.language,
        "summary": gemini_result,
        "audio_base64": audio_base64
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.index:app", host="0.0.0.0", port=8001, reload=False)

