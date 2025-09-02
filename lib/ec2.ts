import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as Cdk from 'aws-cdk-lib';

interface EC2Props {
    readonly environment: string;
    readonly project: string;
    readonly vpc: ec2.Vpc;
    readonly securityGroup: ec2.SecurityGroup;
}

export default class EC2 extends Construct {
    public readonly instance: ec2.Instance;

    constructor(scope: Construct, id: string, props: EC2Props) {
        super(scope, id);

        const roleec2 = new iam.Role(this, 'ec2-role', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
            ],
            inlinePolicies: {
                'RagSystemPolicy': new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: ['s3:*'],
                            resources: ['*']
                        }),
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: ['bedrock:*'],
                            resources: ['*']
                        })
                    ]
                })
            }
        });

        const userData = ec2.UserData.forLinux();
        userData.addCommands(
            '#!/bin/bash',
            'yum update -y',
            'yum install -y python3-pip tesseract poppler-utils',
            'pip3 install fastapi uvicorn boto3 pymupdf pdf2image pytesseract pillow numpy pydantic python-multipart',
            
            'mkdir -p /opt/rag-app',
            'chown ec2-user:ec2-user /opt/rag-app',
            
            'cat > /opt/rag-app/main.py << "EOF"',
            'from fastapi import FastAPI, File, UploadFile',
            'from fastapi.middleware.cors import CORSMiddleware',
            'from pydantic import BaseModel',
            '',
            'app = FastAPI(title="RAG Multimodal API")',
            'app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])',
            '',
            'class QueryRequest(BaseModel):',
            '    question: str',
            '',
            '@app.get("/health/")',
            'def health():',
            '    return {"status": "healthy", "system": "rag-multimodal"}',
            '',
            '@app.post("/query/")',
            'def query(request: QueryRequest):',
            '    return {',
            '        "answer": f"Multimodal RAG: {request.question}",',
            '        "sources": [',
            '            {"type": "text", "content": "AWS processing"},',
            '            {"type": "image", "file": "diagram.png", "size": 467734}',
            '        ],',
            '        "multimodal": True',
            '    }',
            'EOF',
            
            'cat > /etc/systemd/system/rag-app.service << "EOF"',
            '[Unit]',
            'Description=RAG API',
            'After=network.target',
            '[Service]',
            'Type=simple',
            'User=ec2-user',
            'WorkingDirectory=/opt/rag-app',
            'ExecStart=/usr/local/bin/uvicorn main:app --host 0.0.0.0 --port 8000',
            'Restart=always',
            '[Install]',
            'WantedBy=multi-user.target',
            'EOF',
            
            'systemctl daemon-reload',
            'systemctl enable rag-app.service',
            'systemctl start rag-app.service'
        );

        this.instance = new ec2.Instance(this, 'ec2-instance', {
            vpc: props.vpc,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
            machineImage: new ec2.AmazonLinuxImage({ generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2 }),
            securityGroup: props.securityGroup,
            vpcSubnets: props.vpc.selectSubnets({
                subnetType: ec2.SubnetType.PUBLIC,
            }),
            role: roleec2,
            requireImdsv2: true,
            associatePublicIpAddress: true,
            userData: userData,
        });

        new Cdk.CfnOutput(this, 'EC2PublicIP', {
            value: this.instance.instancePublicIp,
            description: 'RAG API URL',
        });
    }
}
