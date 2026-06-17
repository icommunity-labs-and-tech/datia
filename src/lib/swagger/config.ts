import { createSwaggerSpec } from 'next-swagger-doc';

export function getSwaggerSpec() {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api', // Path relative to project root
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'certypass API',
        version: '1.0.0',
        description: 'RESTful API for certypass platform',
      },
      servers: [
        {
          url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'API Token authentication using Bearer token',
          },
        },
      },
      tags: [
        {
          name: 'Items',
          description: 'Operations related to items management',
        },
        {
          name: 'States',
          description: 'Operations related to item states',
        },
        {
          name: 'Categories',
          description: 'Operations related to categories management',
        },
        {
          name: 'Events',
          description: 'Operations related to event logs',
        },
        {
          name: 'FraudReports',
          description: 'Operations related to fraud report management',
        },
      ],
    },
  });

  return spec;
}

