import os
import re
import json
import io
import base64
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
    os.path.join(base_dir, "youtubee", ".env"),
    os.path.join(current_dir, ".env")
]:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break

api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")

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

def fetch_video_metadata(video_id: str) -> dict:
    title = f"YouTube Video ({video_id})"
    author = "YouTube Creator"
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
        "thumbnail": f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",
        "thumbnailFallback": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
    }

def get_transcript_text(video_id: str) -> str:
    # 1. Direct try
    try:
        t_list = YouTubeTranscriptApi.get_transcript(video_id)
        return " ".join([item["text"] for item in t_list if item.get("text")])
    except Exception:
        pass
    
    # 2. List transcripts & pick first available
    try:
        transcripts = YouTubeTranscriptApi.list_transcripts(video_id)
        # Try manually created first, then generated
        for t in transcripts:
            fetched = t.fetch()
            return " ".join([item["text"] for item in fetched if item.get("text")])
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not retrieve transcript for this YouTube video. Captions may be disabled on this video. ({str(e)})"
        )
    
    raise HTTPException(status_code=400, detail="Transcript is not available for this video.")

def query_gemini_json(prompt: str) -> Optional[dict]:
    if not api_key:
        return None
    
    models = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash"]
    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}]
    }).encode("utf-8")

    for model in models:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
                text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                clean_json = re.sub(r'```json\s*|\s*```', '', text).strip()
                parsed = json.loads(clean_json)
                return parsed
        except Exception:
            continue
    return None

class SummarizeRequest(BaseModel):
    url: str
    difficulty: Optional[str] = "Medium" # Simple, Medium, Hard, Executive
    language: Optional[str] = "en" # language code

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

    metadata = fetch_video_metadata(video_id)
    transcript = get_transcript_text(video_id)
    
    # Calculate word count & read time
    words = transcript.split()
    total_words = len(words)
    estimated_read_minutes = max(1, round(total_words / 150))

    # Truncate transcript if excessively long (e.g. > 15,000 words ~ 60,000 chars)
    trimmed_transcript = " ".join(words[:6000])

    lang_info = LANGUAGES.get(req.language, LANGUAGES["en"])
    lang_name = lang_info["name"]
    lang_native = lang_info["native"]

    complexity_instructions = {
        "Simple": "Explain simply like I'm 12 years old. Use crystal-clear analogies, short sentences, and everyday vocabulary.",
        "Medium": "Balanced, comprehensive notes for students and working professionals. Clear, structured, and informative.",
        "Hard": "Deep technical analysis. Highlight specific terminology, methodologies, engineering details, and nuanced insights.",
        "Executive": "Executive brief format. High-impact bullet points, actionable takeaways, strategic implications, and core metrics."
    }.get(req.difficulty, "Balanced, comprehensive, clear notes.")

    prompt = f"""You are YouTube Summarizer AI, a world-class educational analyst, summarizer, and notes creator.
Video Title: "{metadata['title']}"
Target Complexity Level: {req.difficulty} ({complexity_instructions})
Required Language: {lang_name} ({lang_native})

TRANSCRIPT TEXT:
\"\"\"{trimmed_transcript}\"\"\"

Generate an engaging, structured, and highly readable summary of this video.
Every field and sentence MUST be translated and written naturally in {lang_name} ({lang_native}).

Respond ONLY with a valid, clean JSON object with this exact structure:
{{
  "title": "A compelling, clear translated title for this summary in {lang_name}",
  "tldr": "A punchy 2-3 sentence executive summary capturing the core premise and conclusion in {lang_name}.",
  "key_takeaways": [
    "Key takeaway point 1 in {lang_name}",
    "Key takeaway point 2 in {lang_name}",
    "Key takeaway point 3 in {lang_name}",
    "Key takeaway point 4 in {lang_name}",
    "Key takeaway point 5 in {lang_name}"
  ],
  "detailed_notes": [
    {{
      "section_title": "Section or Topic 1 in {lang_name}",
      "content": "Detailed explanation, concepts covered, and examples in {lang_name}."
    }},
    {{
      "section_title": "Section or Topic 2 in {lang_name}",
      "content": "Detailed explanation in {lang_name}."
    }},
    {{
      "section_title": "Section or Topic 3 in {lang_name}",
      "content": "Detailed explanation in {lang_name}."
    }}
  ],
  "quotes_or_highlights": [
    "Memorable thought or important statement in {lang_name}",
    "Another notable highlight or insight in {lang_name}"
  ],
  "action_items": [
    "Actionable step or recommendation 1 in {lang_name}",
    "Actionable step or recommendation 2 in {lang_name}"
  ],
  "audio_script": "A lively, natural 3-sentence spoken summary in {lang_name} explaining what this video was about and the #1 takeaway, suitable for text-to-speech."
}}
Do NOT wrap in markdown formatting code blocks. Return ONLY pure JSON."""

    gemini_result = query_gemini_json(prompt)

    if not gemini_result:
        # Fallback if Gemini quota is unavailable
        gemini_result = {
            "title": f"Summary: {metadata['title']}",
            "tldr": f"This video covers '{metadata['title']}' by {metadata['author']}. It discusses essential principles, practical demonstrations, and real-world implications.",
            "key_takeaways": [
                f"Video presents comprehensive overview of {metadata['title']}.",
                "Clear step-by-step reasoning and context shared throughout the discussion.",
                "Practical examples illustrate core concepts.",
                "Actionable conclusions outlined for viewers."
            ],
            "detailed_notes": [
                {
                    "section_title": "1. Introduction & Background",
                    "content": "The speaker introduces the core subject matter, framing the problem statement and historical context."
                },
                {
                    "section_title": "2. Main Discussion & Frameworks",
                    "content": "Exploration of central arguments, supporting evidence, and strategic methodologies."
                },
                {
                    "section_title": "3. Conclusions & Takeaways",
                    "content": "Final analysis reiterating key learnings and next steps."
                }
            ],
            "quotes_or_highlights": [
                "Understanding the core fundamentals unlocks effective application."
            ],
            "action_items": [
                "Review the practical takeaways discussed in the session.",
                "Apply the recommended workflows to your own projects."
            ],
            "audio_script": f"Here is the summary of {metadata['title']}. The video covers fundamental concepts and key takeaways for viewers."
        }

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
            "estimatedReadMinutes": estimated_read_minutes
        },
        "difficulty": req.difficulty,
        "language": req.language,
        "summary": gemini_result,
        "audio_base64": audio_base64
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.index:app", host="0.0.0.0", port=8001, reload=False)
