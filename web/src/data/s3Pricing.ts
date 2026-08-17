/**
 * S3 Standard storage pricing per GB per month by AWS region.
 * First 50 TB tier (most common for personal/small use).
 * Source: https://aws.amazon.com/s3/pricing/
 * Last updated: August 2026
 */
export const s3StandardPricePerGbMonth: Record<string, number> = {
  // US
  'us-east-1': 0.023,
  'us-east-2': 0.023,
  'us-west-1': 0.026,
  'us-west-2': 0.023,

  // Canada
  'ca-central-1': 0.025,
  'ca-west-1': 0.026,

  // Europe
  'eu-west-1': 0.023,
  'eu-west-2': 0.024,
  'eu-west-3': 0.024,
  'eu-central-1': 0.0245,
  'eu-central-2': 0.027,
  'eu-north-1': 0.023,
  'eu-south-1': 0.025,
  'eu-south-2': 0.025,

  // Asia Pacific
  'ap-southeast-1': 0.025,
  'ap-southeast-2': 0.025,
  'ap-southeast-3': 0.025,
  'ap-southeast-4': 0.025,
  'ap-south-1': 0.025,
  'ap-south-2': 0.025,
  'ap-northeast-1': 0.025,
  'ap-northeast-2': 0.025,
  'ap-northeast-3': 0.025,
  'ap-east-1': 0.025,

  // South America
  'sa-east-1': 0.0405,

  // Middle East
  'me-south-1': 0.025,
  'me-central-1': 0.025,

  // Africa
  'af-south-1': 0.0274,

  // GovCloud
  'us-gov-east-1': 0.025,
  'us-gov-west-1': 0.025,
};

export const DEFAULT_REGION = 'eu-west-1';

export function getS3PricePerGb(region: string): number {
  return s3StandardPricePerGbMonth[region] ?? s3StandardPricePerGbMonth[DEFAULT_REGION];
}
