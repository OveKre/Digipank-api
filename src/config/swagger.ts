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
    },
    servers: [
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
