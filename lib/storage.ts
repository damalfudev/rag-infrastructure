import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

interface S3Props {
  environment: string;
  project: string;
}

export default class S3Storage extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: S3Props) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, 'RagDocumentsBucket', {
      bucketName: `${props.environment}-${props.project}-rag-documents`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: true,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
    });
  }
}
