# E-Commerce Admin Backend

REST API for an e-commerce administration dashboard built for the Trends Bird Limited Backend Developer Intern assignment.

The backend implements JWT authentication, refresh-token rotation, role-based access control, PostgreSQL persistence, product catalog management, shared media management, validation, and permission-protected API routes.

## Live API

```text
https://ecommerce-admin-backend-u5sd.onrender.com
```

### API Documentation

```text
https://ecommerce-admin-backend-u5sd.onrender.com/api-docs
```

> Replace the URLs above if the deployed Render service URL changes.

---

## Technology Stack

- Node.js
- Express.js
- JavaScript with ES Modules
- PostgreSQL
- Prisma ORM
- JSON Web Tokens
- bcrypt
- Zod
- Multer
- Cloudinary
- Swagger / OpenAPI

## Node.js Version

Node.js 22 LTS is recommended.

Check your version:

```bash
node --version
```

---

## Main Features

### Authentication

- Email and password login
- Short-lived access token
- Long-lived refresh token
- Refresh-token rotation
- Current-session endpoint
- Server-side logout and refresh-token revocation
- Inactive-user protection
- No public user registration

### Role-Based Access Control

- Permission names use `module:action`
- Each user holds exactly one role
- Each role can hold many permissions
- API routes enforce permissions server-side
- Unauthorized requests return `401`
- Insufficient permissions return `403`
- The limited catalog account can be used to test denied routes

### Catalog Management

- Permission groups and actions
- Roles and permission assignment
- Dashboard users
- Shared media library
- Nested categories
- Brands
- Attributes and values
- Simple products
- Variable products and variants
- Product categories, brand, media, price, stock, and status

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

The project separates:

- routing
- authentication and authorization middleware
- controllers
- business logic
- validation
- database access

---

## Local Setup

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

Create:

```text
.env
```

Use the following example:

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/ecommerce_admin?schema=public"

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

Never commit the real `.env` file.

### 4. Create the PostgreSQL database

Example database name:

```text
ecommerce_admin
```

Your local connection string may look like:

```env
DATABASE_URL="postgresql://postgres:admin123@localhost:5432/ecommerce_admin?schema=public"
```

### 5. Generate the Prisma client

```bash
npx prisma generate
```

### 6. Run database migrations

For local development:

```bash
npx prisma migrate dev
```

For an existing production database:

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

The API should run at:

```text
http://localhost:5000
```

Swagger documentation:

```text
http://localhost:5000/api-docs
```

---

## Available Scripts

```bash
npm run dev
```

Starts the server using Nodemon.

```bash
npm start
```

Starts the production server.

```bash
npm run prisma:migrate
```

Runs a Prisma development migration.

```bash
npm run prisma:seed
```

Seeds permissions, roles, and users.

---

## Seeded Accounts

### Super Administrator

```text
Email: admin@example.com
Password: Admin123!
```

The administrator role contains all seeded permissions.

### Catalog Manager

```text
Email: catalog@example.com
Password: Catalog123!
```

The catalog manager has access only to catalog-related modules and does not have permission, role, or user administration access.

This account can be used to verify `403 Forbidden` responses.

> Seed credentials are included for assignment review only. They should be changed in a real production system.

---

## Authentication Strategy

The application uses the `Authorization` header.

Example:

```http
Authorization: Bearer ACCESS_TOKEN
```

The access token is short-lived. The refresh token has a longer lifetime and is stored server-side so that it can be revoked.

During refresh:

1. The client sends the current refresh token.
2. The server validates the token and active-user status.
3. The previous refresh token is revoked or replaced.
4. A new access token and refresh token are issued.

During logout:

1. The frontend calls the backend logout endpoint.
2. The stored refresh token is revoked.
3. The old refresh token can no longer be used.

Password hashes and refresh tokens are never returned by API responses.

---

## Permission Model

Permissions use the following format:

```text
module:action
```

Examples:

```text
product:create
media:upload
role:update
user:delete
```

The main permission groups include:

- Dashboard
- Permission
- Role
- User
- Media
- Category
- Brand
- Attribute
- Product

The sidebar uses `watch` permissions, while individual API operations use actions such as:

```text
create
read
update
delete
upload
write
```

Access control is enforced by backend middleware and not only by the frontend.

---

## User and Deletion Decisions

### Role changes

When a user's role is changed, the new role applies on the next authenticated request because the server retrieves or validates the current user's authorization state.

### User deletion

Users are currently deleted using a hard-delete operation.

### Role deletion

A role cannot be deleted while users are assigned to it.

### Brand deletion

A brand cannot be deleted while products reference it.

### Attribute deletion

An attribute or value cannot be safely deleted while it is used by a product variant.

### Media deletion

The intended behavior is to prevent broken references. Media still attached to another record should be refused or detached safely before deleting the Cloudinary asset and database record.

---

## Module Status

| Module | Status | Notes |
|---|---|---|
| Authentication | Complete | Login, refresh, session and logout implemented |
| Permission | Complete | Permission groups, actions, CRUD, search and pagination |
| Role | Complete | Permission assignment, grant-all, CRUD and user-count support |
| User | Complete | Role assignment, status, search, filters and CRUD |
| Media | Partial | CRUD and upload flow implemented; Cloudinary production migration must be fully verified |
| Category | Complete | Nested categories, images, status and ordering |
| Brand | Complete | CRUD, logo selection, search and status |
| Attribute | Complete | Attribute types and value management |
| Product | Partial | Simple and variable product flows implemented; production create flow requires final verification |

This status list is intentionally honest. Media and product should be changed to `Complete` only after their deployed upload and creation flows are verified successfully.

---

## Important API Behavior

The API uses consistent HTTP status codes:

```text
200 Successful read or update
201 Successful creation
400 Invalid request or validation failure
401 Missing, invalid, expired or revoked authentication
403 Valid authentication but insufficient permission
404 Record not found
409 Duplicate or conflicting data
500 Unexpected server error
```

Expected bad input should be handled as a validation or conflict response rather than an internal server error.

---

## Media Storage

Cloudinary is used for persistent production media storage.

The upload flow is:

1. Multer receives files using `memoryStorage`.
2. File contents are validated.
3. The file buffer is uploaded to Cloudinary.
4. Cloudinary returns a secure HTTPS URL.
5. The URL and metadata are stored in PostgreSQL.
6. Products, brands, categories, and attribute values reference the shared media record.

This avoids storing permanent uploads on Render's temporary filesystem.

---

## Production Deployment

### Render settings

```text
Runtime: Node
Build Command:
npm install && npx prisma generate && npx prisma migrate deploy

Start Command:
npm start
```

### Required Render environment variables

```env
DATABASE_URL=your_neon_postgresql_connection_string
NODE_ENV=production

ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret

FRONTEND_URL=https://your-production-vercel-domain.vercel.app

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

BACKEND_URL=https://ecommerce-admin-backend-u5sd.onrender.com
```

After the first production deployment, seed the production database:

```bash
npm run prisma:seed
```

---

## Known Issues

- Render free services may take time to wake after inactivity.
- Media upload must use Cloudinary or another persistent object-storage service; Render's normal filesystem is temporary.
- Existing media records created before the Cloudinary migration may contain old `/uploads/...` paths.
- Product creation should be tested again after the final production database and media configuration are active.
- Vercel preview URLs may change. The stable production domain should be configured in `FRONTEND_URL`.
- Automated tests are not currently included.

---

## Security Notes

- Passwords are hashed with bcrypt.
- Access and refresh secrets are stored in environment variables.
- Database credentials are never committed.
- Cloudinary API secrets remain backend-only.
- Routes require authentication unless intentionally public.
- Permissions are enforced on the API.
- Uploaded file extensions and client MIME types are not trusted as the only validation source.
- Refresh tokens can be revoked on logout.

---

