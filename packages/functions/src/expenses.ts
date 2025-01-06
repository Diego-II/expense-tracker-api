import { Resource } from 'sst'
import { Handler } from 'aws-lambda'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { Readable } from 'stream'
import { v4 as uuidv4 } from 'uuid'

interface ExpenseData {
  amount: number
  merchant: string
  name: string
  card?: string
}

const s3Client = new S3Client({})
const ddbClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(ddbClient)

async function getExistingContent(
  bucket: string,
  key: string
): Promise<string> {
  try {
    const response = await s3Client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    )

    if (!response.Body) return ''

    const stream = response.Body as Readable
    const chunks: Buffer[] = []

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
    }

    return Buffer.concat(chunks).toString('utf-8')
  } catch (error: any) {
    if (error.name === 'NoSuchKey') return ''
    throw error
  }
}

function formatForCsv(value: any): string {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

export const handler: Handler = async (event) => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Request body is required' }),
      }
    }

    const expense: ExpenseData = JSON.parse(event.body)
    const timestamp = new Date()
    const year = timestamp.getUTCFullYear().toString()
    const month = (timestamp.getUTCMonth() + 1).toString().padStart(2, '0')

    // Generate CSV file path
    const csvKey = `${year}/${month}/expenses.csv`

    // Format new CSV row
    const csvRow =
      [
        formatForCsv(expense.amount),
        formatForCsv(expense.merchant),
        formatForCsv(expense.name),
        formatForCsv(expense.card),
        formatForCsv(timestamp.toISOString()),
      ].join(',') + '\n'

    // Get existing content and append new row
    const existingContent = await getExistingContent(
      Resource.ExpenseTrackerBucket.name,
      csvKey
    )
    const newContent = existingContent
      ? existingContent + csvRow
      : 'Amount,Merchant,Name,Card,Timestamp\n' + csvRow

    // Save to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: Resource.ExpenseTrackerBucket.name,
        Key: csvKey,
        Body: newContent,
        ContentType: 'text/csv',
      })
    )

    // Save to DynamoDB
    const expenseItem = {
      id: uuidv4(),
      amount: expense.amount,
      merchant: expense.merchant,
      name: expense.name,
      card: expense.card || null,
      timestamp: timestamp.toISOString(),
      year,
      month,
    }

    await docClient.send(
      new PutCommand({
        TableName: Resource.ExpensesTable.name,
        Item: expenseItem,
      })
    )

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Expense saved successfully',
        id: expenseItem.id,
        csvPath: csvKey,
      }),
    }
  } catch (error) {
    console.error('Error saving expense:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to save expense' }),
    }
  }
}
