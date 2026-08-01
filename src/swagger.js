import swaggerJsdoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",

  info: {
    title: "E-commerce Admin API",
    version: "1.0.0",
    description:
      "Backend API for authentication, RBAC, users, media, categories, brands, attributes and products.",
  },

  servers: [
    {
      url: "http://localhost:5000",
      description: "Local development server",
    },
  ],

  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },

  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,

  apis: [
    "./src/routes/*.js",
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;