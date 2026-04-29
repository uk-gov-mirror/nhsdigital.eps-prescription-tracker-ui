import {
  StackProps,
  Stack,
  App,
  Fn
} from "aws-cdk-lib"
import {CloudfrontDistribution} from "../resources/CloudfrontDistribution"
import {
  AaaaRecord,
  ARecord,
  HostedZone,
  RecordTarget
} from "aws-cdk-lib/aws-route53"

export interface FrontDoorStackProps extends StackProps {
  readonly cloudfrontDistribution: CloudfrontDistribution
}

/**
 * Clinical Prescription Tracker UI Stateless Resources

 */

export class FrontDoorStack extends Stack {
  public constructor(scope: App, id: string, props: FrontDoorStackProps) {
    super(scope, id, props)

    // Context
    /* context values passed as --context cli arguments are passed as strings so coerce them to expected types*/
    const epsDomainName: string = this.node.tryGetContext("epsDomainName")
    const epsHostedZoneId: string = this.node.tryGetContext("epsHostedZoneId")
    const shortCloudfrontDomain: string = this.node.tryGetContext("shortCloudfrontDomain")

    // Imports
    const hostedZone = HostedZone.fromHostedZoneAttributes(this, "hostedZone", {
      hostedZoneId: epsHostedZoneId,
      zoneName: epsDomainName
    })

    // Resources
    // All cloudfront distributions have the same hosted zone id, so we can hardcode it here, see:
    // eslint-disable-next-line max-len
    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/quickref-route53.html#scenario-user-friendly-url-for-cloudfront-distribution
    const hostedZoneId = "Z2FDTNDATAQYW2"
    // Cloudformation will automatically import the existing route53 records if they exactly match the existing records
    // but the existing records have a . at the end of the alias target domain name
    // even though the cloudfront distribution domain name doesn't have a . at the end
    // so we have to add it here to ensure the record is imported
    // instead of trying to create a new record and failing because it already exists
    const target = RecordTarget.fromAlias({
      bind: () => ({
        hostedZoneId,
        dnsName: Fn.sub("${domainName}.", {
          domainName: props.cloudfrontDistribution.distribution.distributionDomainName
        })
      })
    })

    if (shortCloudfrontDomain === "APEX_DOMAIN") {
      new ARecord(this, "CloudFrontAliasIpv4Record", {
        zone: hostedZone,
        target
      })
      new AaaaRecord(this, "CloudFrontAliasIpv6Record", {
        zone: hostedZone,
        target
      })
    } else {
      new ARecord(this, "CloudFrontAliasIpv4Record", {
        zone: hostedZone,
        recordName: shortCloudfrontDomain,
        target
      })
      new AaaaRecord(this, "CloudFrontAliasIpv6Record", {
        zone: hostedZone,
        recordName: shortCloudfrontDomain,
        target
      })
    }

  }
}
