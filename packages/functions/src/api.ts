import { Handler } from "aws-lambda";

export const handler: Handler = async (_event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ status: "healthy" }),
  };
};
