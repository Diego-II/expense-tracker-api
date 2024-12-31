export const bucket = new sst.aws.Bucket("ExpenseTrackerBucket");

export const expensesTable = new sst.aws.Dynamo("ExpensesTable", {
  fields: {
    id: "string",
    year: "string",
    month: "string",
  },
  primaryIndex: { hashKey: "id" },
  globalIndexes: {
    byDate: { hashKey: "year", rangeKey: "month", projection: "all" }
  },
});
