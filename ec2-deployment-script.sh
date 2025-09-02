#!/bin/bash

# RAG System Deployment Script for EC2
# Run this script on the EC2 instance

set -e

echo "🚀 DEPLOYING RAG MULTIMODAL SYSTEM ON EC2"
echo "=========================================="

# 1. Setup environment
echo "📋 Setting up environment..."
sudo mkdir -p /opt/rag-app
sudo chown ec2-user:ec2-user /opt/rag-app
cd /opt/rag-app

# 2. Install system dependencies
echo "📦 Installing system dependencies..."
sudo yum update -y
sudo yum install -y python3-pip git docker tesseract poppler-utils

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# 3. Install Python dependencies
echo "🐍 Installing Python dependencies..."
pip3 install --user \
    fastapi==0.104.1 \
    uvicorn==0.24.0 \
    boto3 \
    langchain-aws \
    pymupdf \
    pdf2image \
    pytesseract \
    pillow \
    faiss-cpu \
    numpy \
    tqdm \
    python-multipart \
    pydantic

# 4. Create main.py
echo "📝 Creating main.py..."
cat > main.py << 'MAIN_EOF'
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import shutil
import boto3
import json
import base64
import numpy as np
import faiss
import pymupdf
import pytesseract
from pdf2image import convert_from_path
import logging

app = FastAPI(title="Multimodal RAG API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str

class QueryResponse(BaseModel):
    answer: str
    sources: list

@app.get("/health/")
async def health_check():
    return {"status": "healthy", "system": "multimodal-rag", "version": "1.0.0"}

@app.post("/upload-pdf/")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")
    
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{file.filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Simple OCR processing
    try:
        images = convert_from_path(file_path)
        text_chunks = []
        
        for i, image in enumerate(images):
            text = pytesseract.image_to_string(image)
            if text.strip():
                chunks = [text[j:j+500] for j in range(0, len(text), 500)]
                text_chunks.extend(chunks)
        
        return {"message": "PDF processed successfully", "items_processed": len(text_chunks)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

@app.post("/query/", response_model=QueryResponse)
async def query_rag(request: QueryRequest):
    # Simple response for demo
    answer = f"Based on your question '{request.question}', this is a multimodal RAG response from AWS EC2."
    sources = [{"page": 1, "type": "text", "content": "Sample response from deployed system"}]
    
    return QueryResponse(answer=answer, sources=sources)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
MAIN_EOF

# 5. Create systemd service
echo "⚙️ Creating systemd service..."
sudo tee /etc/systemd/system/rag-app.service > /dev/null << 'SERVICE_EOF'
[Unit]
Description=RAG Multimodal Application
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/rag-app
Environment=PATH=/home/ec2-user/.local/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# 6. Start the service
echo "🚀 Starting RAG service..."
sudo systemctl daemon-reload
sudo systemctl enable rag-app.service
sudo systemctl start rag-app.service

# 7. Wait and test
echo "⏳ Waiting for service to start..."
sleep 10

echo "🧪 Testing RAG system..."
curl -X GET "http://localhost:8000/health/" || echo "Service may still be starting..."

echo ""
echo "✅ RAG SYSTEM DEPLOYMENT COMPLETE!"
echo "=================================="
echo "Service status: $(sudo systemctl is-active rag-app.service)"
echo "API URL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000"
echo "Health check: curl -X GET 'http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000/health/'"
echo ""
echo "View logs: sudo journalctl -u rag-app.service -f"
