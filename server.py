import os
import uvicorn
from api.index import app

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    print(f"Starting YouTube Summarizer API server on http://localhost:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
