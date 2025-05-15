const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const dotenv = require('dotenv');

dotenv.config();

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: process.env.BANK_NAME || 'DigiPank API',
      version: '1.0.0',
      description: 'DigiPank API Documentation - Harupank, mis suhtleb keskpangaga ja võimaldab rahaülekandeid',
      contact: {
        name: process.env.BANK_OWNERS || 'Ove'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3001}`,
        description: 'Development server'
      },
      {
        url: 'https://pank.digikaup.online',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
    // Eemalda globaalne security seadistus
    // security: [
    //   {
    //     bearerAuth: []
    //   }
    // ]
  },
  apis: [
    './routes/*.js',
    './models/*.js'
  ]
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

/**
 * Setup Swagger documentation for Express app
 * @param {Express} app - Express application
 */
const setupSwagger = (app) => {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, { explorer: true }));
  app.get('/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocs);
  });
};

module.exports = {
  setupSwagger
};