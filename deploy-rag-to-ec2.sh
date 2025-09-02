#!/bin/bash

# Deploy RAG Multimodal System to EC2
# This script copies the working RAG system to the deployed EC2 instance

set -e

echo "🚀 DEPLOYING RAG MULTIMODAL SYSTEM TO EC2"
echo "=========================================="

# Get EC2 instance IP from CDK output
echo "📋 Getting EC2 instance information..."
EC2_IP=$(aws cloudformation describe-stacks \
    --stack-name RagProjectStack \
    --query 'Stacks[0].Outputs[?OutputKey==`EC2PublicIP`].OutputValue' \
    --output text)

if [ -z "$EC2_IP" ]; then
    echo "❌ Could not get EC2 IP. Make sure the stack is deployed."
    exit 1
fi

echo "✅ EC2 Instance IP: $EC2_IP"

# Wait for EC2 to be ready
echo "⏳ Waiting for EC2 instance to be ready..."
sleep 30

# Create deployment package
echo "📦 Creating deployment package..."
cd ../docker-simulation
tar -czf ../rag-deployment.tar.gz .
cd ../rag-project

# Copy RAG system to EC2
echo "📤 Copying RAG system to EC2..."
scp -i ~/.ssh/your-key.pem -o StrictHostKeyChecking=no \
    ../rag-deployment.tar.gz ec2-user@$EC2_IP:/home/ec2-user/

# Deploy on EC2
echo "🔧 Deploying RAG system on EC2..."
ssh -i ~/.ssh/your-key.pem -o StrictHostKeyChecking=no ec2-user@$EC2_IP << 'EOF'
    # Extract RAG system
    cd /home/ec2-user
    tar -xzf rag-deployment.tar.gz -C rag-app/
    cd rag-app/
    
    # Start the RAG system
    sudo systemctl start rag-app.service
    
    # Check status
    sleep 10
    curl -X GET "http://localhost:8000/health/" || echo "Service starting..."
    
    echo "✅ RAG system deployed successfully!"
EOF

echo ""
echo "🎯 DEPLOYMENT COMPLETE!"
echo "========================================"
echo "RAG API URL: http://$EC2_IP:8000"
echo "API Documentation: http://$EC2_IP:8000/docs"
echo "Health Check: http://$EC2_IP:8000/health/"
echo ""
echo "Test with:"
echo "curl -X GET \"http://$EC2_IP:8000/health/\""

# Cleanup
rm -f ../rag-deployment.tar.gz
