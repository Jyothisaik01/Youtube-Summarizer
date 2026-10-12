import streamlit as st
from dotenv import load_dotenv
import os
import google.generativeai as genai
from youtube_transcript_api import YouTubeTranscriptApi
from googletrans import Translator
import re

# Load all the environment variables
current_dir = os.path.dirname(os.path.abspath(__file__))
for env_path in [os.path.join(current_dir, ".env"), os.path.join(os.path.dirname(current_dir), ".env")]:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break

api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

# Define the base prompt for the generative AI model
base_prompt = """You are a YouTube video summarizer. You will be taking the transcript text and summarizing the entire video 
and providing the important summary in points within 500 words. Please provide the summary of the text given here: """

def get_difficulty_prompt(difficulty):
    if difficulty == "Simple":
        return base_prompt + " Use simple language that is easy to understand."
    elif difficulty == "Medium":
        return base_prompt + " Use a moderate level of language complexity."
    elif difficulty == "Hard":
        return base_prompt + " Use advanced language and include technical terms if applicable."
    else:
        return base_prompt

def extract_video_id(youtube_video_url):
    """Extract the video ID from the YouTube video URL."""
    video_id = None
    if "youtube.com/watch?v=" in youtube_video_url:
        video_id = youtube_video_url.split("v=")[1].split("&")[0]
    elif "youtu.be/" in youtube_video_url:
        video_id = youtube_video_url.split("youtu.be/")[1].split("?")[0]
    elif "youtube.com/shorts/" in youtube_video_url:
        video_id = youtube_video_url.split("youtube.com/shorts/")[1].split("?")[0]
    return video_id

def extract_transcript_details(video_id):
    """Extract the transcript from the YouTube video with robust language fallbacks."""
    try:
        transcript_text = YouTubeTranscriptApi.get_transcript(video_id)
        transcript = " ".join([i["text"] for i in transcript_text])
        return transcript
    except Exception:
        try:
            # Fallback to fetching any available transcript
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            for t in transcript_list:
                return " ".join([i["text"] for i in t.fetch()])
        except Exception as e:
            st.error(f"An error occurred while fetching the transcript: {e}")
            return None

def generate_gemini_content(transcript_text, prompt):
    """Generate summary using Google's generative AI model with modern model fallbacks."""
    models_to_try = ["gemini-flash-latest", "gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-pro"]
    for m_name in models_to_try:
        try:
            model = genai.GenerativeModel(m_name)
            response = model.generate_content(prompt + transcript_text)
            if response and response.text:
                return response.text
        except Exception:
            continue
    st.error("Could not generate summary from Gemini models. Please check your API key and quota.")
    return None

def translate_text(text, target_language):
    """Translate the given text to the target language."""
    try:
        translator = Translator()
        translation = translator.translate(text, dest=target_language)
        return translation.text
    except Exception as e:
        st.warning(f"Translation warning: {e}. Showing original English summary.")
        return text

# Set page configuration
st.set_page_config(page_title="YouTube Transcript Converter", page_icon="📹", layout="centered", initial_sidebar_state="auto")

st.markdown(
    """
    <style>
    .main {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    }
    .stButton>button {
        background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
        color: white;
        border-radius: 8px;
        font-weight: 600;
        border: none;
        padding: 0.5rem 1.5rem;
    }
    </style>
    """,
    unsafe_allow_html=True
)

st.title("📹 YouTube Transcript to Detailed Notes Converter")
youtube_link = st.text_input("Enter YouTube Video Link:")

if youtube_link:
    video_id = extract_video_id(youtube_link)
    if video_id:
        st.image(f"https://img.youtube.com/vi/{video_id}/0.jpg", use_container_width=True)
        
        # Language selection for translation
        languages = {
            "English": "en",
            "Spanish": "es",
            "French": "fr",
            "German": "de",
            "Chinese": "zh-cn",
            "Japanese": "ja",
            "Korean": "ko",
            "Hindi": "hi",
            "Urdu": "ur",
            "Telugu": "te",
            "Kannada": "kn"
        }
        target_language = st.selectbox("Select the target language for the summary:", list(languages.keys()))

        # Difficulty selection for the summary
        difficulty_levels = ["Simple", "Medium", "Hard"]
        difficulty = st.selectbox("Select the difficulty level of the summary:", difficulty_levels)

        if st.button("Get Summary Notes"):
            transcript_text = extract_transcript_details(video_id)

            if transcript_text:
                with st.spinner("Processing summary... Please wait."):
                    # Generate the summary with the selected difficulty level
                    prompt = get_difficulty_prompt(difficulty)
                    summary = generate_gemini_content(transcript_text, prompt)
                
                if summary:
                    # Translate the summary to the selected language if not English
                    if languages[target_language] != "en":
                        with st.spinner(f"Translating to {target_language}..."):
                            translated_summary = translate_text(summary, languages[target_language])
                    else:
                        translated_summary = summary

                    st.markdown("## Summarized Notes:")
                    st.write(translated_summary)

                    st.download_button(
                        label="Download Summary",
                        data=translated_summary,
                        file_name="summary.txt",
                        mime="text/plain"
                    )
    else:
        st.error("Invalid YouTube URL.")
