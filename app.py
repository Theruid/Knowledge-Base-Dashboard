from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
import os
from retrieve_docs import information_retrieve
from initiate_vdb import initiate_vector_database  

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RAG API Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

class TextRequest(BaseModel):
    text: str

@app.get("/")
async def root():
    return {"message": "RAG API Service is running"}

@app.get("/initiate_vdb")
async def initiate_vdb():
    initiate_vector_database()
    return {"message": "Vector database initiated successfully"}

@app.post("/rag/retrieve/")
async def retrieve(request: TextRequest):
    try:
        logger.info(f"Received request: {request.text}")
        result = information_retrieve(request.text)
        return result
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

# For testing purposes
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8099)  # Changed to match Dockerfile port
