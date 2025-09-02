import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

interface ApiGatewayProps {
  environment: string;
  project: string;
  ec2Instance: ec2.Instance;
}

export default class ApiGateway extends Construct {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiGatewayProps) {
    super(scope, id);

    this.api = new apigateway.RestApi(this, 'RagApi', {
      restApiName: `${props.environment}-${props.project}-rag-api`,
      description: 'RAG Multimodal API Gateway',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      },
    });

    // Create proxy resource that forwards everything to EC2
    const proxyResource = this.api.root.addResource('{proxy+}');
    
    const integration = new apigateway.Integration({
      type: apigateway.IntegrationType.HTTP_PROXY,
      integrationHttpMethod: 'ANY',
      uri: `http://${props.ec2Instance.instancePublicIp}:8000/{proxy}`,
      options: {
        requestParameters: {
          'integration.request.path.proxy': 'method.request.path.proxy'
        }
      }
    });

    proxyResource.addMethod('ANY', integration, {
      requestParameters: {
        'method.request.path.proxy': true
      }
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: this.api.url,
      description: 'RAG API Gateway URL for Frontend',
    });
  }
}
