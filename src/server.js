import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import swaggerUi from "swagger-ui-express";

import prisma from "./prisma.js";
import swaggerSpec from "./swagger.js";

import authRoutes from "./routes/auth.routes.js";
import permissionRoutes from "./routes/permission.routes.js";
import roleRoutes from "./routes/role.routes.js";
import userRoutes from "./routes/user.routes.js";
import mediaRoutes from "./routes/media.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import brandRoutes from "./routes/brand.routes.js";
import attributeRoutes from "./routes/attribute.routes.js";
import productRoutes from "./routes/product.routes.js";

import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error-handler.js";

dotenv.config();

const app = express();

/*
  FRONTEND_URLS can contain multiple comma-separated URLs.

  Example:
  FRONTEND_URLS=https://site-one.vercel.app,https://site-two.vercel.app
*/
const environmentOrigins = (
  process.env.FRONTEND_URLS ||
  process.env.FRONTEND_URL ||
  ""
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [
  "http://localhost:5173",
  ...environmentOrigins,
];

function isAllowedVercelOrigin(origin) {
  if (!origin) {
    return false;
  }

  try {
    const { hostname, protocol } = new URL(origin);

    return (
      protocol === "https:" &&
      hostname.endsWith(".vercel.app") &&
      hostname.startsWith("ecommerce-admin-frontend")
    );
  } catch {
    return false;
  }
}

const corsOptions = {
  origin(origin, callback) {
    /*
      Requests without an Origin header include server-to-server
      requests, Postman, Swagger and health checks.
    */
    if (!origin) {
      return callback(null, true);
    }

    const isExplicitlyAllowed =
      allowedOrigins.includes(origin);

    const isProjectVercelDomain =
      isAllowedVercelOrigin(origin);

    if (
      isExplicitlyAllowed ||
      isProjectVercelDomain
    ) {
      return callback(null, true);
    }

    console.error(`Blocked by CORS: ${origin}`);

    return callback(
      new Error(`Origin not allowed by CORS: ${origin}`),
    );
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],
};

app.use(cors(corsOptions));

app.use(express.json());

app.use(
  "/uploads",
  express.static(path.resolve("uploads")),
);

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec),
);

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "E-commerce Admin API is running",
    documentation: "/api-docs",
  });
});

app.get("/healthz", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Server is healthy",
  });
});

app.get(
  "/database-test",
  async (req, res, next) => {
    try {
      await prisma.$queryRaw`SELECT 1`;

      return res.status(200).json({
        success: true,
        message: "Database connected successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

app.use("/api/auth", authRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/users", userRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/attributes", attributeRoutes);
app.use("/api/products", productRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(
    `Allowed frontend origins: ${
      allowedOrigins.join(", ") || "none"
    }`,
  );
});