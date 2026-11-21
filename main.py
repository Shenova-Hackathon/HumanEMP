"""
SHENOVA AI - Backend Server
===========================
FastAPI server connecting Member 4's AI text simplification module
with the React frontend (Member 1) and other backend pipelines.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ai.integration import router as ai_router

app = FastAPI(
    title="SHENOVA AI Backend",
    description="Backend API for SHENOVA AI accessibility companion",
    version="1.0.0",
)

# Enable CORS for the React frontend (running on Vite, typically http://localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Member 4's AI simplification router (POST /explain)
app.include_router(ai_router)


@app.get("/")
def health_check():
    """Health check endpoint."""
    return {
        "status": "online",
        "service": "SHENOVA AI Backend",
        "endpoints": ["/explain", "/docs"],
    }


if __name__ == "__main__":
    import uvicorn
    print("\nStarting SHENOVA AI Backend on http://127.0.0.1:8000 ...")
    print("API Documentation available at: http://127.0.0.1:8000/docs\n")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
