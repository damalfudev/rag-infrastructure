import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import Parameters from './Parameters';
import Network from './network';
import EC2 from './ec2';
import S3Storage from './storage';
import ApiGateway from './api-gateway';
import { FrontendHosting } from './frontend-hosting';

export class RagProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const params = new Parameters(this, 'Parameters');

    const networkConstruct = new Network(this, 'network', {
      environment: params.environment,
      project: params.project,
    });

    const storageConstruct = new S3Storage(this, 'storage', {
      environment: params.environment,
      project: params.project,
    });

    const ec2Construct = new EC2(this, 'ec2', {
      environment: params.environment,
      project: params.project,
      vpc: networkConstruct.vpc,
      securityGroup: networkConstruct.securityGroup,
    });

    const apiConstruct = new ApiGateway(this, 'api-gateway', {
      environment: params.environment,
      project: params.project,
      ec2Instance: ec2Construct.instance,
    });

    // Single CloudFront Distribution with 2 behaviors (Frontend + Backend)
    const frontendConstruct = new FrontendHosting(this, 'frontend-hosting', {
      environment: params.environment,
      projectName: params.project,
      apiGatewayUrl: apiConstruct.api.url,
    });

    // Output single URL
    new cdk.CfnOutput(this, 'ApplicationURL', {
      value: `https://${frontendConstruct.domainName}`,
      description: 'Complete RAG Application URL (Frontend + Backend)',
      exportName: `${params.environment}-${params.project}-app-url`,
    });
  }
}
