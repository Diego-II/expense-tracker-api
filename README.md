# Expense Tracker API

A serverless API built with SST ❍ Ion for tracking expenses. The API stores expense data in both CSV format (S3) and DynamoDB for flexible querying and reporting.

## Features

- Store expenses with amount, merchant, name, and optional card details
- Automatic organization of expenses by year/month in CSV files
- DynamoDB storage with efficient querying capabilities
- Serverless architecture using AWS Lambda and API Gateway

## API Endpoints

### POST /expenses

Creates a new expense entry. Example request:
```json
{
"amount": 42.99,
"merchant": "Amazon",
"name": "Office Supplies",
"card": "Business Visa"
}```

### GET /health

Health check endpoint that returns API status.

## Project Structure

- `functions/` - Lambda functions for the API endpoints
- `infra/` - Infrastructure code (API Gateway, S3, DynamoDB)
- `core/` - Shared code and utilities

## Deployment

1. Install dependencies

   ```bash
   npm install
   ```

2. Deploy to AWS

   ```bash
   npx sst deploy
   ```

   For development environment:

   ```bash
   npm run deploy-development
   ```

## Infrastructure

The application uses:

- S3 bucket for storing CSV files
- DynamoDB table with GSI for date-based queries
- API Gateway for RESTful endpoints
- Lambda functions for serverless compute

## Development

To run locally:

```bash
npm run dev
```