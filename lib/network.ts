import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';


interface NetworkProps {
    readonly environment: string;
    readonly project: string;
}

export default class Network extends Construct {

    public readonly vpc: ec2.Vpc;
    public readonly publicSubnets: ec2.SubnetSelection;
    public readonly securityGroup: ec2.SecurityGroup;



    constructor(scope: Construct, id: string, props: NetworkProps) {
        super(scope, id);

         // Create VPC with public subnets 
        this.vpc = new ec2.Vpc(this, 'vpc', {

            vpcName: `${props.environment}-${props.project}-vpc`,
            maxAzs: 2,
            natGateways: 0, 
            subnetConfiguration: [

                {
                    cidrMask: 24,
                    name: 'public-subnet',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
            ],
        });

        this.publicSubnets = {
            subnets: this.vpc.publicSubnets,
        };


        this.securityGroup = new ec2.SecurityGroup(this, 'security-group', {
            vpc: this.vpc,
            allowAllOutbound: true, // Allow outbound traffic for SSM
            description: `${props.environment}-${props.project}-sg-ec2`,
        });

        // Allow port 8000 for API access
        this.securityGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(8000),
            'Allow API Gateway access to port 8000'
        );


    }
}

