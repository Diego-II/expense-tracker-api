import { bucket, expensesTable } from './storage'

const expensesApi = new sst.aws.ApiGatewayV2('ExpensesApi', {
  domain: 'expense-tracker-api.diego-ii.com',
  transform: {
    route: {
      handler: (args, opts) => {
        args.runtime ??= 'nodejs22.x'
        args.logging ??= {
          retention: '1 month',
        }
      },
    },
  },
})

expensesApi.route('POST /expenses', {
  handler: 'packages/functions/src/expenses.handler',
  link: [bucket, expensesTable],
})

expensesApi.route('GET /health', {
  handler: 'packages/functions/src/api.handler',
  link: [bucket],
})

export { expensesApi }
