# Node.js + TypeScript + Express + Sequelize + PostgreSQL - Authentication API with Email Verification, JWT Refresh Tokens & Role-Based Access

This project is a TypeScript-based authentication API built with Node.js, Express, Sequelize ORM, and PostgreSQL. It provides a complete user management system with secure authentication flows suitable for production applications.

## Features

- **TypeScript Implementation:** Strongly typed codebase for improved developer experience and code reliability.
- **Email Sign Up and Verification:** New users must verify their email address before they can authenticate.
- **JWT Authentication with Refresh Tokens:** Short-lived JWTs (15 minutes) for secure API access, paired with long-lived refresh tokens (7 days) stored in HTTP-only cookies.
- **Refresh Token Rotation:** Each token refresh revokes the old token and issues a new one, minimizing the impact of token compromise.
- **Role-Based Authorization:** Supports `User` and `Admin` roles to restrict route access based on user privileges.
- **Forgot Password & Reset Password:** Complete password recovery flow with time-limited reset tokens sent via email.
- **Account Management (CRUD):** Admin users can manage all accounts; regular users can only manage their own profile.
- **Swagger API Documentation:** Interactive API documentation available at the `/api-docs` route.
- **PostgreSQL Database:** Uses Sequelize ORM with PostgreSQL, including SSL connection support for cloud deployments (e.g., Supabase).
- **Environment-Based Configuration:** All settings are managed via environment variables (`.env`) for secure and flexible configuration.

## Table of Contents

- [Overview](#overview)
- [JWT Authentication & Refresh Tokens](#jwt-authentication--refresh-tokens)
- [Local Setup Instructions](#local-setup-instructions)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Testing the API](#testing-the-api)

---

## Overview

There are no users registered in the API by default. To authenticate, you must first register and verify an account. The API sends a verification email upon registration containing a unique token. A verification URL is also logged to the console for convenience during development.

**Email Configuration:** SMTP settings must be configured via environment variables (see `.env.example`). The project comes pre-configured with Ethereal Email credentials for testing purposes, but you should update these for production.

**Role Assignment:** The very first account registered is automatically assigned the `Admin` role. All subsequent accounts default to the `User` role. Admins have full access to all CRUD routes, while regular users can only view, update, or delete their own profile.

**PostgreSQL Database:** The API uses Sequelize ORM with PostgreSQL. On startup, Sequelize automatically syncs the database schema. The connection supports both local PostgreSQL instances and cloud providers like Supabase (with SSL).

## JWT Authentication & Refresh Tokens

Authentication utilizes a dual-token system for enhanced security:

1. **JWT Access Token:** Returned on successful login, expires in **15 minutes**. Used in the `Authorization: Bearer <token>` header to access secure routes.
2. **Refresh Token:** Expires in **7 days** and is sent as an **HTTP-only cookie**. This protects against XSS (Cross-Site Scripting) attacks since JavaScript cannot access the cookie. The refresh token is used exclusively at the `/accounts/refresh-token` endpoint to generate new JWTs, which also mitigates CSRF (Cross-Site Request Forgery).

### Refresh Token Rotation
Every time a refresh token is used to generate a new JWT, it is immediately revoked and replaced with a new one. This reduces the lifetime of refresh tokens and ensures that if a token is compromised, its validity window is minimized. An audit trail of revoked and replaced tokens is maintained in the PostgreSQL database.

---

## Local Setup Instructions

### Prerequisites
- Node.js and NPM installed
- PostgreSQL Server installed and running (local or remote)

### 1. Clone the repository and install dependencies
```bash
# Clone the repository (if you haven't already)
# git clone <your-repo-url>
cd final-project-backend-main

# Install dependencies
npm install
```

### 2. Configure Environment Variables
Copy the `.env.example` file to `.env` and update the values with your local configuration:

```bash
cp .env.example .env
```

Open the `.env` file and configure the following:

```env
# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/node_api

# JWT
JWT_SECRET=your-super-secret-key-change-in-production

# CORS
CORS_ORIGIN=http://localhost:4200

# SMTP (Ethereal recommended for development)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-ethereal-user
SMTP_PASS=your-ethereal-pass
```

*Note: If `DATABASE_URL` is not set, the API falls back to a default local PostgreSQL connection (`postgres:postgres:root@localhost:5432`). The API uses Sequelize, which will automatically sync the tables on startup.*

### 3. Start the API
You can run the API using `ts-node-dev` for development with auto-reloading, or build and run for production:

```bash
# Run for development (auto-reloads on file changes)
npm run dev

# OR build and run for production
npm run prod
```

You should see the message: `Server running on port 4000` (or the port you configured).

### 4. View API Documentation
Navigate to [http://localhost:4000/api-docs](http://localhost:4000/api-docs) in your browser to view and interact with the Swagger API documentation.

---

## Project Structure

The project is written in TypeScript and compiled to JavaScript using the TypeScript compiler (`tsc`).

- `src/server.ts`: The entry point of the application. Configures Express, binds middleware, registers API routes, and starts the server.
- `.env.example`: Template for environment variables (database URL, JWT secret, SMTP config, CORS origin, etc.).
- `tsconfig.json`: TypeScript compiler configuration.
- `src/_helpers/`: Contains utility functions and configurations.
  - `db.ts`: Initializes the PostgreSQL database connection using Sequelize and binds the models. Supports both local connections and cloud URLs (e.g., Supabase with SSL).
  - `role.ts`: Defines the available user roles (`Admin`, `User`).
  - `send-email.ts`: Wrapper for Nodemailer to send emails.
  - `swagger.ts`: Loads the Swagger YAML specification and configures the Swagger UI Express middleware.
- `src/_middleware/`: Contains Express middleware functions.
  - `authorize.ts`: Validates JWT tokens and checks user roles against route requirements.
  - `error-handler.ts`: Global error handling middleware.
  - `validate-request.ts`: Uses Joi to validate incoming request bodies against schemas defined in the controller.
- `src/accounts/`: The core domain module containing the business logic for users.
  - `account.model.ts`: Sequelize model definition for the Account table.
  - `refresh-token.model.ts`: Sequelize model definition for the RefreshToken table.
  - `account.service.ts`: Contains all the core business logic (registration, authentication, email verification, token management, password reset, CRUD operations).
  - `accounts.controller.ts`: Defines the Express routes, Joi request validation schemas, and maps routes to service functions.
- `src/swagger.yaml`: OpenAPI/Swagger specification file for API documentation.

---

## Environment Variables

The following environment variables are used by the application. Copy `.env.example` to `.env` and configure as needed.

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (optional, falls back to local config) | `postgresql://user:password@host:5432/database` |
| `JWT_SECRET` | Secret key used to sign JWT tokens | `your-super-secret-jwt-key-change-in-production` |
| `CORS_ORIGIN` | Allowed origin for CORS requests | `http://localhost:4200` |
| `COOKIE_SECURE` | Whether refresh token cookies use the Secure flag | `false` |
| `COOKIE_SAMESITE` | SameSite policy for cookies (`lax`, `strict`, or `none`) | `lax` |
| `SMTP_HOST` | SMTP server hostname | `smtp.ethereal.email` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_SECURE` | Whether SMTP connection uses TLS | `false` |
| `SMTP_USER` | SMTP authentication username | — |
| `SMTP_PASS` | SMTP authentication password | — |
| `PORT` | Port number for the Express server | `4000` |
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` |

---

## Testing the API

The easiest way to test the API is using the built-in Swagger documentation at `http://localhost:4000/api-docs`.

### Registration Flow:
1. Go to the **POST /accounts/register** endpoint.
2. Click "Try it out" and enter your details (title, firstName, lastName, email, password, confirmPassword). Execute the request.
3. If SMTP is configured (Ethereal), check your inbox for the verification email. Otherwise, check your terminal output for the verification token and URL logged to the console.
4. Go to **POST /accounts/verify-email** and provide the token to activate the account.

### Authentication Flow:
1. Go to **POST /accounts/authenticate**.
2. Enter the email and password you registered with.
3. The response will contain your details, a `jwtToken`, and a `refreshToken`. (Additionally, the refresh token is set automatically in your browser cookies via an HTTP-only cookie).
4. Copy the `jwtToken`.
5. Scroll to the top of the Swagger UI, click the **Authorize** button, and paste the token (no need to add 'Bearer ' prefix, Swagger does this for you).
6. You can now access secure routes like **GET /accounts** (Admin only) or **GET /accounts/{id}** (own account or Admin).