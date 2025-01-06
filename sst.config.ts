/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'expense-tracker-api',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      home: 'aws',
    }
  },
  async run() {
    const { bucket, expensesTable } = await import('./infra/storage')
    const { emailQueue } = await import('./infra/email')
    const api = await import('./infra/api')

    return {
      ExpensesApi: api.expensesApi.url,
      ExpenseTrackerBucket: bucket.name,
      ExpensesTable: expensesTable.name,
      EmailQueue: emailQueue.name,
    }
  },
})
