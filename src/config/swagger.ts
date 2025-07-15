import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Digipank API',
      version: '1.0.0',
      description: 'Pangarakendus, mis ühildub keskpangaga ja võimaldab teiste pankadega rahaülekandeid teha',
      contact: {
        name: 'Digipank Support',
        email: 'support@digipank.ee'
      }
    },        servers: [
            {
                url: 'https://pank.digikaup.online',
                description: 'Production server'
            },
            {
                url: 'http://localhost:3001',
                description: 'Development server'
            }
        ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            username: { type: 'string' },
            accounts: {
              type: 'array',
              items: { $ref: '#/components/schemas/Account' }
            }
          }
        },
        Account: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            number: { type: 'string' },
            balance: { type: 'number' },
            currency: { type: 'string' }
          }
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            accountFrom: { type: 'string' },
            accountTo: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string' },
            explanation: { type: 'string' },
            status: { type: 'string' },
            createdAt: { type: 'string' }
          }
        },
        BankRegistration: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Bank name' },
            prefix: { type: 'string', description: 'Bank prefix (e.g., DIGI)' },
            owners: { type: 'string', description: 'Bank owners' },
            url: { type: 'string', description: 'Bank base URL' },
            transactionUrl: { type: 'string', description: 'Bank B2B transaction endpoint' },
            jwksUrl: { type: 'string', description: 'Bank JWKS endpoint' }
          },
          required: ['name', 'prefix', 'owners', 'url', 'transactionUrl', 'jwksUrl']
        },
        CentralBankResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Bank ID from central bank' },
            name: { type: 'string', description: 'Bank name' },
            prefix: { type: 'string', description: 'Bank prefix' },
            owners: { type: 'string', description: 'Bank owners' },
            url: { type: 'string', description: 'Bank base URL' },
            transactionUrl: { type: 'string', description: 'Bank B2B transaction endpoint' },
            jwksUrl: { type: 'string', description: 'Bank JWKS endpoint' },
            createdAt: { type: 'string', description: 'Registration timestamp' }
          }
        },
        B2BTransaction: {
          type: 'object',
          properties: {
            jwt: { type: 'string', description: 'JWT signed transaction data' }
          },
          required: ['jwt']
        },
        JWKSResponse: {
          type: 'object',
          properties: {
            keys: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  kty: { type: 'string', description: 'Key type (RSA)' },
                  use: { type: 'string', description: 'Key usage (sig)' },
                  kid: { type: 'string', description: 'Key ID' },
                  n: { type: 'string', description: 'RSA modulus' },
                  e: { type: 'string', description: 'RSA exponent' }
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
