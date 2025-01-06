import { SNSEvent, SNSHandler } from 'aws-lambda'
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { Resource } from 'sst'
import { v4 as uuidv4 } from 'uuid'

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
})

const ddbClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(ddbClient)

const tool_list = {
  tools: [
    {
      name: 'summarize_email',
      description: 'Extract expense information from email content',
      input_schema: {
        type: 'object',
        json: {
          properties: {
            amount: {
              type: 'number',
              description: 'The amount of the transaction',
            },
            merchant: {
              type: 'string',
              description: 'The merchant or target of the transaction',
            },
            name: {
              type: 'string',
              description: 'The name of the transaction',
            },
            card: {
              type: 'string',
              description:
                'The card used for the transaction. Infer if its a credit card, debit or a account transaction.',
              enum: ['credit', 'debit', 'account'],
            },
          },
          required: ['amount', 'merchant', 'name', 'card'],
        },
      },
    },
  ],
}

interface EmailSummary {
  amount: number
  merchant: string
  name: string
  card?: string
}

async function extractEmailSummary(
  emailContent: string
): Promise<EmailSummary> {
  const message = {
    role: 'user',
    content: [
      { text: `<content>${emailContent}</content>`, type: 'text' },
      {
        text: 'Please use the summarize_email tool to generate the email summary JSON based on the content within the <content> tags. The email may be in spanish, and contain information about transactions and expenses in my bank account.',
        type: 'text',
      },
    ],
  }
  console.log('Sending message to Claude: ', JSON.stringify(message, null, 2))
  console.log('Tool list: ', JSON.stringify(tool_list, null, 2))
  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      temperature: 0,
      messages: [message],
      tools: tool_list.tools,
      tool_choice: { type: 'tool', name: 'summarize_email' },
    }),
  })

  try {
    const response = await bedrockClient.send(command)
    console.log('Response:', JSON.stringify(response, null, 2))
    const responseBody = JSON.parse(new TextDecoder().decode(response.body))
    console.log('Response body: ', JSON.stringify(responseBody, null, 2))

    // Check for tool_use in content array
    if (
      responseBody.content?.[0]?.type !== 'tool_use' ||
      !responseBody.content?.[0]?.input?.json
    ) {
      throw new Error(
        `Invalid response structure: ${JSON.stringify(responseBody, null, 2)}`
      )
    }

    return responseBody.content[0].input.json
  } catch (error) {
    console.error('Claude response error:', error)
    if (error instanceof Error) {
      throw new Error(
        `Failed to parse email summary from Claude response: ${error.message}`
      )
    }
    throw error
  }
}

export const handler: SNSHandler = async (event: SNSEvent) => {
  for (const record of event.Records) {
    try {
      console.log('Processing record:', JSON.stringify(record, null, 2))
      console.log('Processing email:', record.Sns.Message)
      // console.log('Record body:', record.body)

      const sesEmail = JSON.parse(record.Sns.Message)
      console.log('Parsed sesEmail:', JSON.stringify(sesEmail, null, 2))

      const emailContent = Buffer.from(sesEmail.content, 'base64').toString()
      console.log('Email content:', emailContent)

      // Extract email summary using Claude
      const summary = await extractEmailSummary(emailContent)

      const timestamp = new Date()
      const year = timestamp.getUTCFullYear().toString()
      const month = (timestamp.getUTCMonth() + 1).toString().padStart(2, '0')

      // Save to DynamoDB
      const summaryItem = {
        id: uuidv4(),
        ...summary,
        timestamp: timestamp.toISOString(),
        year,
        month,
        source: 'email',
      }

      await docClient.send(
        new PutCommand({
          TableName: Resource.ExpensesTable.name,
          Item: summaryItem,
        })
      )
    } catch (error) {
      console.error('Error processing email:', error)
      console.error('Error details:', {
        errorName: (error as Error).name,
        errorMessage: (error as Error).message,
        stack: (error as Error).stack,
      })
      throw error
    }
  }
}
