import {
  IManagedPolicy,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import {CfnFunction, LayerVersion} from "aws-cdk-lib/aws-lambda"
import {Fn, RemovalPolicy} from "aws-cdk-lib"
import {Key} from "aws-cdk-lib/aws-kms"
import {LogGroup, CfnLogGroup, CfnSubscriptionFilter} from "aws-cdk-lib/aws-logs"
import {Stream} from "aws-cdk-lib/aws-kinesis"
import {Construct} from "constructs"

import {getDefaultLambdaOptions} from "./LambdaFunction/helpers"

const insightsLayerArn = "arn:aws:lambda:eu-west-2:580247275435:layer:LambdaInsightsExtension:53"

export interface LambdaFunctionProps {
  readonly serviceName: string
  readonly stackName: string
  readonly lambdaName: string
  readonly additionalPolicies?: Array<IManagedPolicy>
  readonly packageBasePath: string
  readonly entryPoint: string
  readonly lambdaEnvironmentVariables: {[key: string]: string}
  readonly logRetentionInDays: number
  readonly logLevel: string
}

/**
 * Resources for a nodejs lambda function
 * This should be used when we want to create a lambda

 */

export class LambdaFunction extends Construct {
  public readonly executeLambdaManagedPolicy: ManagedPolicy
  public readonly lambda: NodejsFunction

  public constructor(scope: Construct, id: string, props: LambdaFunctionProps) {
    super(scope, id)

    // Imports
    // These are imported here rather than at stack level as they are all imports from account-resources stacks
    const cloudWatchLogsKmsKey = Key.fromKeyArn(
      this, "cloudWatchLogsKmsKey", Fn.importValue("account-resources-cdk-uk:KMS:CloudwatchLogsKmsKey:Arn"))

    const splunkDeliveryStream = Stream.fromStreamArn(
      this, "SplunkDeliveryStream", Fn.importValue("account-resources-cdk-uk:Firehose:SplunkDeliveryStream:Arn"))

    const splunkSubscriptionFilterRole = Role.fromRoleArn(
      this, "splunkSubscriptionFilterRole",
      Fn.importValue("account-resources-cdk-uk:IAM:SplunkSubscriptionFilterRole:Arn"))

    const lambdaInsightsLogGroupPolicy = ManagedPolicy.fromManagedPolicyArn(
      this, "lambdaInsightsLogGroupPolicy",
      Fn.importValue("account-resources-cdk-uk:IAM:LambdaInsightsLogGroupPolicy:Arn"))

    const cloudwatchEncryptionKMSPolicyArn = ManagedPolicy.fromManagedPolicyArn(
      this, "cloudwatchEncryptionKMSPolicyArn",
      Fn.importValue("account-resources-cdk-uk:IAM:CloudwatchEncryptionKMSPolicy:Arn"))

    const lambdaDecryptSecretsKMSPolicy = ManagedPolicy.fromManagedPolicyArn(
      this, "lambdaDecryptSecretsKMSPolicy", Fn.importValue("secrets-cdk:IAM:LambdaDecryptSecretsKMSPolicy:Arn"))

    const insightsLambdaLayer = LayerVersion.fromLayerVersionArn(
      this, "LayerFromArn", insightsLayerArn)

    // Resources
    const lambdaLogGroup = new LogGroup(this, "LambdaLogGroup", {
      encryptionKey: cloudWatchLogsKmsKey,
      logGroupName: `/aws/lambda/${props.lambdaName!}`,
      retention: props.logRetentionInDays,
      removalPolicy: RemovalPolicy.DESTROY
    })

    const cfnlambdaLogGroup = lambdaLogGroup.node.defaultChild as CfnLogGroup
    cfnlambdaLogGroup.cfnOptions.metadata = {
      guard: {
        SuppressedRules: [
          "CW_LOGGROUP_RETENTION_PERIOD_CHECK"
        ]
      }
    }

    const lambdaManagedPolicy = new ManagedPolicy(this, "LambdaPutLogsManagedPolicy", {
      description: `write to ${props.lambdaName} logs`,
      statements: [
        new PolicyStatement({
          actions: [
            "logs:CreateLogStream",
            "logs:PutLogEvents"
          ],
          resources: [
            lambdaLogGroup.logGroupArn,
            `${lambdaLogGroup.logGroupArn}:log-stream:*`
          ]
        })]
    })

    new CfnSubscriptionFilter(this, "CoordinatorSplunkSubscriptionFilter", {
      destinationArn: splunkDeliveryStream.streamArn,
      filterPattern: "",
      logGroupName: lambdaLogGroup.logGroupName,
      roleArn: splunkSubscriptionFilterRole.roleArn
    })

    const lambdaRole = new Role(this, "LambdaRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        lambdaManagedPolicy,
        lambdaInsightsLogGroupPolicy,
        cloudwatchEncryptionKMSPolicyArn,
        lambdaDecryptSecretsKMSPolicy,
        ...(props.additionalPolicies ?? [])
      ]
    })

    const lambdaOptions = getDefaultLambdaOptions({
      functionName: `${props.serviceName}-${props.lambdaName}`,
      packageBasePath: props.packageBasePath,
      entryPoint: props.entryPoint
    })

    props.lambdaEnvironmentVariables["LOG_LEVEL"] = props.logLevel
    props.lambdaEnvironmentVariables["NODE_OPTIONS"] = "--enable-source-maps"

    const lambdaFunction = new NodejsFunction(this, props.lambdaName, {
      ...lambdaOptions,
      role: lambdaRole,
      environment: props.lambdaEnvironmentVariables,
      logGroup: lambdaLogGroup,
      layers: [
        insightsLambdaLayer
      ]
    })

    const cfnLambda = lambdaFunction.node.defaultChild as CfnFunction
    cfnLambda.cfnOptions.metadata = {
      guard: {
        SuppressedRules: [
          "LAMBDA_DLQ_CHECK",
          "LAMBDA_INSIDE_VPC",
          "LAMBDA_CONCURRENCY_CHECK"
        ]
      }
    }

    const executeLambdaManagedPolicy = new ManagedPolicy(this, "ExecuteLambdaManagedPolicy", {
      description: `execute lambda ${props.lambdaName}`,
      statements: [
        new PolicyStatement({
          actions: ["lambda:InvokeFunction"],
          resources: [lambdaFunction.functionArn]
        })]
    })

    // Outputs
    this.lambda = lambdaFunction
    this.executeLambdaManagedPolicy = executeLambdaManagedPolicy
  }
}
