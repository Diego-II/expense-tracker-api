/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "expense-tracker-api",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const { bucket, expensesTable } = await import("./infra/storage");
    const api = await import("./infra/api");

    return {
      api: api.myApi.url,
      expensesApi: api.expensesApi.url,
      domain: domain.name,
      bucket,
      expensesTable,
    };
  },
});
