# 🚀 Deploy RAG System to EC2

**EC2 Instance Details:**
- **Public IP:** 54.152.71.126
- **Public DNS:** ec2-54-152-71-126.compute-1.amazonaws.com
- **API Gateway:** https://dvqdyb4584.execute-api.us-east-1.amazonaws.com/prod/

## 📦 Deployment Package Ready

The RAG system has been packaged: `rag-deployment.tar.gz` (11MB)

## 🔧 Manual Deployment Steps

### Option 1: Using AWS Systems Manager (Recommended)

```bash
# Connect to EC2 via AWS Console Session Manager
# Then run these commands on the EC2 instance:

# 1. Download the RAG system (you'll need to upload the tar.gz file)
cd /home/ec2-user
wget https://your-s3-bucket/rag-deployment.tar.gz

# 2. Extract and setup
mkdir -p rag-app
tar -xzf rag-deployment.tar.gz -C rag-app/
cd rag-app/

# 3. Install Python dependencies
sudo yum install -y python3-pip
pip3 install --user -r requirements.txt

# 4. Start the RAG system
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 &

# 5. Test the system
curl -X GET "http://localhost:8000/health/"
```

### Option 2: Using Docker (Automated)

```bash
# On EC2 instance (via Session Manager):
cd /home/ec2-user/rag-app
sudo systemctl start rag-app.service
sudo systemctl status rag-app.service
```

## ✅ Verification

Once deployed, test these endpoints:

```bash
# Health check
curl -X GET "http://54.152.71.126:8000/health/"

# API documentation
curl -X GET "http://54.152.71.126:8000/docs"

# Upload PDF test
curl -X POST "http://54.152.71.126:8000/upload-pdf/" \
  -F "file=@rag-challenge.pdf"

# Query test
curl -X POST "http://54.152.71.126:8000/query/" \
  -H "Content-Type: application/json" \
  -d '{"question": "What is this document about?"}'
```

## 🎯 Expected Results

- **Health Check:** `{"status": "healthy", "system": "multimodal-rag", "version": "1.0.0"}`
- **PDF Upload:** `{"message": "PDF processed successfully", "items_processed": 69}`
- **Query Response:** Multimodal response with text and/or images

## 🔗 Access URLs

- **Direct API:** http://54.152.71.126:8000
- **API Gateway:** https://dvqdyb4584.execute-api.us-east-1.amazonaws.com/prod/
- **Documentation:** http://54.152.71.126:8000/docs

## 📋 Next Steps

1. Connect to EC2 via AWS Console Session Manager
2. Upload and extract the RAG deployment package
3. Start the RAG system
4. Test all endpoints
5. Configure API Gateway to proxy to EC2:8000

**The infrastructure is ready - just need to deploy the RAG application!**
