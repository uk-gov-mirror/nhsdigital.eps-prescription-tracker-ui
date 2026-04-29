import {ICertificate} from "aws-cdk-lib/aws-certificatemanager"
import {
  BehaviorOptions,
  Distribution,
  ErrorResponse,
  HttpVersion,
  SecurityPolicyProtocol,
  SSLMethod
} from "aws-cdk-lib/aws-cloudfront"
import {Construct} from "constructs"

/**
 * Cloudfront distribution and supporting resources

 */

export interface CloudfrontDistributionProps {
  readonly serviceName: string
  readonly stackName: string
  readonly defaultBehavior: BehaviorOptions,
  readonly additionalBehaviors: Record<string, BehaviorOptions>
  readonly errorResponses: Array<ErrorResponse>
  readonly fullCloudfrontDomain: string
  readonly cloudfrontCert: ICertificate
  readonly webAclAttributeArn: string
  readonly wafAllowGaRunnerConnectivity: boolean
}

/**
 * Resources for a Cloudfront Distribution

 */

export class CloudfrontDistribution extends Construct {
  public readonly distribution

  public constructor(scope: Construct, id: string, props: CloudfrontDistributionProps){
    super(scope, id)

    // Resources
    const cloudfrontDistribution = new Distribution(this, "CloudfrontDistribution", {
      domainNames: [props.fullCloudfrontDomain],
      certificate: props.cloudfrontCert,
      httpVersion: HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
      sslSupportMethod: SSLMethod.SNI,
      publishAdditionalMetrics: true,
      enableLogging: false,
      logIncludesCookies: true, // may actually want to be false, don't know if it includes names of cookies or contents
      defaultBehavior: props.defaultBehavior,
      additionalBehaviors: props.additionalBehaviors,
      errorResponses: props.errorResponses,
      geoRestriction: {
        locations: props.wafAllowGaRunnerConnectivity ? ["GB", "JE", "GG", "IM", "US"] : ["GB", "JE", "GG", "IM"],
        restrictionType: "whitelist"
      },
      webAclId: props.webAclAttributeArn
    })

    // Outputs
    this.distribution = cloudfrontDistribution
  }
}
