#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { RagProjectStack } from '../lib/rag-project-stack';

const app = new cdk.App();
new RagProjectStack(app, 'RagProjectStack', {
  
    env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  },

  stackName: `${process.env.ENV}-${process.env.PROJECT}-stack`


});
//tag
cdk.Tags.of(app).add('env', process.env.ENV as  string);
cdk.Tags.of(app).add('PROJECT', process.env.PROJECT as  string);
