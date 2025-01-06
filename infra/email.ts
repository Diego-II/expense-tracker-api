import { bucket, expensesTable } from './storage'
export const emailQueue = new sst.aws.SnsTopic('EmailTopic')

emailQueue.subscribe('EmailQueueSubscription', {
  handler: 'packages/functions/src/processEmail.handler',
  permissions: [
    {
      actions: ['bedrock:InvokeModel'],
      resources: [
        'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
        'arn:aws:bedrock:us-east-1::*',
      ],
    },
  ],
  link: [bucket, expensesTable],
})
