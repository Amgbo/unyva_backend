# High-Level Documentation for `unyva-backend` Project

## Overview

The `unyva-backend` is a Node.js backend application using ECMAScript modules (`type: "module"`) and primarily written in TypeScript (`ts-node`/`typescript`). It is designed for web API development with security, file handling, user authentication, and database connectivity.

---

## Core Features

- **API Server:** Built with Express.js.
- **TypeScript Support:** Uses `ts-node` for running TypeScript directly.
- **Environment Configuration:** Loads environment variables using `dotenv`.
- **User Authentication:** JWT-based authentication (`jsonwebtoken`).
- **Password Security:** Password hashing and validation (`bcrypt`).
- **File Uploads:** Handles uploads via `multer`, with direct storage integration for Cloudinary (`multer-storage-cloudinary`).
- **Database:** Connects to a PostgreSQL database (`pg`).
- **Data Validation:** Validates input data using Zod.
- **CORS Support:** Enables Cross-Origin Resource Sharing (`cors`).

---

## Development Tools

- **Nodemon:** Auto-restarts server on code changes.
- **Cross-Env:** Simplifies environment variable management in scripts.
- **Type Definitions:** Provides TypeScript typings for all major dependencies.

---

## How to Start

- **Development Mode:**  
  Run `npm run dev` to start the backend server using `ts-node` with ES module support.

---

## Dependencies

- **Production:** express, bcrypt, cloudinary, cors, dotenv, jsonwebtoken, multer, multer-storage-cloudinary, pg, zod
- **Development:** nodemon, ts-node, typescript, cross-env, and corresponding type packages for TypeScript compatibility

---

## Licensing

- Licensed under ISC.

---

This backend is suitable for scalable web API development, featuring security, cloud upload capability, and database integration.