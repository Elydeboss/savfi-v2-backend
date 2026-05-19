// Simple API documentation generator for existing Express routes
import type { Request, Response } from 'express'

export const apiDocumentation = {
  info: {
    title: 'SavFi Solana Platform API',
    version: '1.0.0',
    description: 'API documentation for SavFi savings platform',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  paths: {
    '/api/auth/register': {
      post: {
        summary: 'Register a new user',
        description: 'Sends OTP for email verification',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  username: { type: 'string', minLength: 3 },
                  password: { type: 'string', minLength: 8 },
                  referralCode: { type: 'string' },
                },
                required: ['email', 'username', 'password'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'OTP sent successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    requiresOTP: { type: 'boolean' },
                    email: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Login user',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    token: { type: 'string' },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        username: { type: 'string' },
                        role: { type: 'string' },
                        kycVerified: { type: 'boolean' },
                        phantomWallet: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/verify-otp': {
      post: {
        summary: 'Verify OTP and complete registration',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  otp: { type: 'string', pattern: '^\\d{6}$' },
                },
                required: ['email', 'otp'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Registration completed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    token: { type: 'string' },
                    user: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/me': {
      get: {
        summary: 'Get current user',
        description: 'Requires authentication',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/savings/create': {
      post: {
        summary: 'Create a savings plan',
        description: 'Requires authentication and connected wallet',
        tags: ['Savings'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  planType: {
                    type: 'string',
                    enum: ['vaultfi', 'growfi', 'flexifi', 'swiftfi'],
                  },
                  amount: { type: 'number', minimum: 1 },
                },
                required: ['planType', 'amount'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Savings plan created',
          },
        },
      },
    },
    '/api/savings/plans': {
      get: {
        summary: 'Get user savings plans',
        description: 'Requires authentication',
        tags: ['Savings'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Plans retrieved successfully',
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and registration endpoints',
    },
    {
      name: 'Savings',
      description: 'Savings plans and transactions',
    },
  ],
}

export function getAPISpec(_req: Request, res: Response): void {
  res.setHeader('Content-Type', 'application/json')
  res.json(apiDocumentation)
}
