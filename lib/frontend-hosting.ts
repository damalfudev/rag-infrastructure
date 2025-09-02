import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export interface FrontendHostingProps {
  readonly environment: string;
  readonly projectName: string;
  readonly apiGatewayUrl: string;
}

export class FrontendHosting extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly domainName: string;

  constructor(scope: Construct, id: string, props: FrontendHostingProps) {
    super(scope, id);

    // S3 Bucket for hosting frontend (private with OAC)
    this.bucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `${props.environment}-${props.projectName}-frontend-${cdk.Aws.ACCOUNT_ID}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // Single CloudFront Distribution with 2 behaviors
    this.distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin('ssylxqeqdj.execute-api.us-east-1.amazonaws.com', {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
            originPath: '/prod',
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    this.domainName = this.distribution.distributionDomainName;

    // Deploy frontend files
    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3deploy.Source.asset('../rag-frontend')],
      destinationBucket: this.bucket,
    });

    // Outputs
    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: this.bucket.bucketName,
      description: 'S3 Bucket for frontend hosting',
    });

    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: `https://${this.domainName}`,
      description: 'Complete Application URL (Frontend + Backend API)',
    });
  }
}
