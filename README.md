# E-Commerce Admin Backend

REST API for an e-commerce administration dashboard with authentication, role-based access control, shared media, nested categories, brands, attributes, simple products, and variable products.

## Live Links

### Frontend

```text
https://ecommerce-admin-frontend-24gqhp1v8-nowshinrezas-projects.vercel.app?_vercel_share=RBfYv9vgWavaUtTOBKNLjazjckCEHgMt
```

### Backend API

```text
https://ecommerce-admin-backend-u5sd.onrender.com
```

### Swagger API Documentation

```text
https://ecommerce-admin-backend-u5sd.onrender.com/api-docs
```

## Seeded Accounts

### Super Administrator

```text
Email: admin@example.com
Password: Admin123!
```

The Super Administrator has every permission in the system.

### Catalog Manager

```text
Email: catalog@example.com
Password: Catalog123!
```

The Catalog Manager has limited catalog permissions and does not have permission, role, or user administration access.

This account can be used to verify `403 Forbidden` responses.

---

## Technology Stack

- Node.js 22 LTS
- Express.js
- JavaScript with ES Modules
- PostgreSQL
- Prisma ORM
- JSON Web Tokens
- bcrypt
- Zod
- Multer
- Cloudinary
- Swagger/OpenAPI

---

## Main Features

### Authentication

- Email and password login
- Short-lived access token
- Long-lived refresh token
- Refresh-token rotation
- Current-session endpoint
- Server-side refresh-token storage
- Server-side logout and token revocation
- Inactive-user protection
- No public registration

### Role-Based Access Control

- One role per user
- Many permissions per role
- Permission format: `module:action`
- Backend authentication middleware
- Backend permission middleware
- `401 Unauthorized` for invalid authentication
- `403 Forbidden` for insufficient permissions
- Permission-aware frontend navigation

### Administration Modules

- Authentication
- Permissions
- Roles
- Users
- Media
- Categories
- Brands
- Attributes
- Products

### Product Catalog

- Simple products
- Variable products
- Product variants
- Unique product and variant SKUs
- Product categories
- Product brands
- Product media
- Product thumbnails
- Prices and sale prices
- Stock management
- Attribute values

---

## Project Structure

```text
src/
├── config/
│   └── cloudinary.js
├── controllers/
├── middleware/
├── routes/
├── services/
├── validators/
├── prisma.js
├── server.js
└── swagger.js

prisma/
├── migrations/
├── schema.prisma
└── seed.js
```

The project separates routes, controllers, validation, authentication, authorization, services, and database operations.

---

## Local Installation

### 1. Clone the repository

```bash
git clone https://github.com/nowshinreza/ecommerce-admin-backend.git
cd ecommerce-admin-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the environment file

Create a file named:

```text
.env
```

Add:

```env
DATABASE_URL="postgresql://postgres:admin123@localhost:5432/ecommerce_admin?schema=public"

PORT=5000
NODE_ENV=development

ACCESS_TOKEN_SECRET=replace_with_a_long_random_access_secret
REFRESH_TOKEN_SECRET=replace_with_a_different_long_random_refresh_secret

FRONTEND_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

BACKEND_URL=http://localhost:5000
```

Do not commit the real `.env` file.

### 4. Create the PostgreSQL database

Create a PostgreSQL database named:

```text
ecommerce_admin
```

Example local connection string:

```env
DATABASE_URL="postgresql://postgres:admin123@localhost:5432/ecommerce_admin?schema=public"
```

### 5. Generate the Prisma client

```bash
npx prisma generate
```

### 6. Run migrations

For local development:

```bash
npx prisma migrate dev
```

For production:

```bash
npx prisma migrate deploy
```

### 7. Seed the database

```bash
npm run prisma:seed
```

### 8. Start the development server

```bash
npm run dev
```

The local backend will run at:

```text
http://localhost:5000
```

Swagger documentation:

```text
http://localhost:5000/api-docs
```

---

## Available Commands

### Development server

```bash
npm run dev
```

### Production server

```bash
npm start
```

### Prisma development migration

```bash
npm run prisma:migrate
```

### Prisma client generation

```bash
npx prisma generate
```

### Production migration deployment

```bash
npx prisma migrate deploy
```

### Database seeding

```bash
npm run prisma:seed
```

---

## Authentication Strategy

The application uses bearer-token authentication.

Protected requests send:

```http
Authorization: Bearer ACCESS_TOKEN
```

The access token is short-lived. The refresh token has a longer lifetime and is stored server-side so it can be rotated and revoked.

### Login flow

1. The user submits an email and password.
2. The password is checked with bcrypt.
3. The server returns an access token and refresh token.
4. The refresh token is stored so it can later be revoked.

### Refresh flow

1. The frontend sends the current refresh token.
2. The backend validates the token.
3. The backend checks that the user is still active.
4. The old refresh token is rotated.
5. A new access token and refresh token are returned.

### Logout flow

1. The frontend calls the backend logout endpoint.
2. The refresh token is revoked on the server.
3. The previous refresh token can no longer be used.

Password hashes and refresh tokens are never returned in API responses.

---

## Permission Model

Permissions use lowercase `module:action` names.

Examples:

```text
dashboard:watch
permission:create
role:update
user:delete
media:upload
category:read
brand:update
attribute:create
product:delete
```

The `watch` permission controls whether a user can see and open a module screen.

Operation permissions such as `create`, `read`, `update`, `delete`, `upload`, and `write` control API access.

The backend is the final authority. Hiding buttons in the frontend is only a usability feature.

---

## Seeded Permissions

### Dashboard

```text
dashboard:watch
```

### Permission

```text
permission:watch
permission:create
permission:read
permission:update
permission:delete
```

### Role

```text
role:watch
role:create
role:read
role:update
role:delete
```

### User

```text
user:watch
user:create
user:read
user:update
user:delete
```

### Media

```text
media:watch
media:read
media:upload
media:write
media:delete
```

### Category

```text
category:watch
category:create
category:read
category:update
category:delete
```

### Brand

```text
brand:watch
brand:create
brand:read
brand:update
brand:delete
```

### Attribute

```text
attribute:watch
attribute:create
attribute:read
attribute:update
attribute:delete
```

### Product

```text
product:watch
product:create
product:read
product:update
product:delete
```

---

## Important Design Decisions

### Role changes

A changed role or permission takes effect on the next authenticated request because authorization is checked by the backend.

### User deletion

Users are hard deleted.

### Self-escalation

Users cannot change their own role.

### Role deletion

A role cannot be deleted while users still hold it.

### Brand deletion

A brand cannot be deleted while products reference it.

### Category deletion

Categories with dependent children or product relationships must be handled safely to prevent orphaned records.

### Attribute deletion

Attributes and attribute values used by product variants cannot be removed silently.

### Product deletion

Deleting a product removes its variants and attachment records, but shared media assets remain available.

### Media storage

Cloudinary is used for persistent media storage.

The process is:

1. Multer receives the file using `memoryStorage`.
2. File content is validated.
3. The file buffer is uploaded to Cloudinary.
4. Cloudinary returns a permanent HTTPS URL.
5. Media metadata is stored in PostgreSQL.
6. Other modules attach the shared media record.

---

## Response Format

Successful response example:

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {}
}
```

Error response example:

```json
{
  "success": false,
  "message": "Request failed",
  "errors": {}
}
```

---

## HTTP Status Codes

```text
200 Successful request
201 Resource created
400 Invalid request or validation error
401 Missing, invalid, expired, or revoked authentication
403 Valid authentication but insufficient permission
404 Resource not found
409 Duplicate or conflicting resource
500 Unexpected server error
```

---

## Module Status

| Module | Status | Notes |
|---|---|---|
| Authentication | Complete | Login, refresh, session, and logout |
| Permission | Complete | Permission groups, actions, search, and CRUD |
| Role | Complete | Role CRUD and permission assignment |
| User | Complete | Role assignment, filters, status, and CRUD |
| Media | Complete | Shared upload library with Cloudinary |
| Category | Complete | Nested hierarchy, parent, image, status, and order |
| Brand | Complete | CRUD, search, status, and media logo |
| Attribute | Complete | Attribute types and value management |
| Product | Complete | Simple and variable products, variants, categories, brand, and media |

---

## Render Deployment

### Build command

```bash
npm install && npx prisma generate && npx prisma migrate deploy
```

### Start command

```bash
npm start
```

### Render environment variables

```env
DATABASE_URL=your_neon_postgresql_connection_string

NODE_ENV=production

ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret

FRONTEND_URL=https://ecommerce-admin-frontend-24gqhp1v8-nowshinrezas-projects.vercel.app

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

BACKEND_URL=https://ecommerce-admin-backend-u5sd.onrender.com
```

After the first production deployment, run:

```bash
npm run prisma:seed
```

---

## API Documentation

Swagger is available at:

```text
https://ecommerce-admin-backend-u5sd.onrender.com/api-docs
```

It can be used to inspect and test the available API endpoints.

---

## Known Issues

- Render free services may take several seconds to wake after inactivity.
- Temporary Vercel preview URLs may change after new deployments.
- The provided frontend link includes a Vercel sharing token for reviewer access.
- Automated tests are not included.
- Upload size is limited to 5 MB per file.
- A maximum of 10 files can be uploaded in one request.
