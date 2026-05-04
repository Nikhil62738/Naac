# NAAC File Management System

A full-stack React, Node.js, and MongoDB portal for departmental NAAC documentation.

## Features

- Teacher and HOD login with role-based access control
- Dynamic forms for all 7 NAAC criteria
- Secure document upload for PDF, DOCX, JPG, and PNG
- Teacher progress dashboard
- HOD consolidated dashboard
- HOD verification workflow with comments
- Teacher PDF export
- Teacher Excel export
- HOD consolidated Excel export
- Notifications/reminders
- Nodemailer email reminders
- Audit trail
- Simultaneous multi-role login with session switching

## Tech Stack

- Frontend: React, Vite, React Router, Axios, Lucide icons
- Backend: Node.js, Express, MongoDB, Mongoose
- Auth: JWT and bcrypt password hashing
- Uploads: Multer with authenticated download endpoints
- Reports: ExcelJS and PDFKit
- Email: Nodemailer

## Setup

1. Install dependencies:

```bash
npm run install:all
```

2. Copy environment file:

```bash
copy server\.env.example server\.env
```

3. Start MongoDB locally.

Default MongoDB URI:

```text
mongodb://127.0.0.1:27017/naac_file_management
```

4. Seed demo accounts:

```bash
npm run seed
```

5. Start development servers:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:5000`

## Deploy Backend on Render

The repo includes a root `render.yaml` blueprint for the backend service.

1. Push this project to GitHub.
2. In Render, create a new Blueprint from the GitHub repo.
3. Render will use:

```text
Root directory: server
Build command: npm ci
Start command: npm start
Health check: /api/health
```

4. Add these Render environment variables:

```text
MONGO_URI=your MongoDB Atlas connection string
JWT_SECRET=use a long random secret
CLIENT_ORIGIN=your deployed frontend URL
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your Gmail app password
SMTP_FROM=NAAC Portal <your-gmail@gmail.com>
```

`UPLOAD_DIR` is already set in `render.yaml` to `/var/data/uploads` and the blueprint attaches a 1 GB disk at `/var/data`, so uploaded files survive redeploys and restarts.

5. After Render deploys the backend, copy the service URL and set the frontend environment variable:

```text
VITE_API_URL=https://your-render-service.onrender.com/api
```

## Demo Accounts

HOD:

```text
hod@naac.local
hod12345
```

Teacher:

```text
teacher@naac.local
teacher12345
```

IQAC:

```text
iqac@naac.local
iqac12345
```

## Email Reminders

The reminder endpoint uses Nodemailer. If `SMTP_HOST` is empty, the app uses Nodemailer's JSON transport for safe local demo testing without sending real email.

To send real emails, set these in `server/.env`:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=NAAC Portal <your-gmail@gmail.com>
```

For Gmail, use a Google **App Password**, not your normal Gmail password.

## Verified PDF Signature

For local/private deployment, place the verifier signature image at:

```text
server/assets/verified-sign.png
```

This file is intentionally ignored by Git so a personal signature is not uploaded to a public repository.

## Multi-Role Login

The app stores multiple role sessions in the browser and shows an `Active logins` switcher in the sidebar when more than one role has logged in.

## Forgot Password

The forgot-password flow sends a 6-digit OTP to the user's registered/login email.

1. Enter registered email on the login page.
2. Click `Forgot Password`.
3. Enter the OTP received by email.
4. Enter and confirm the new password.
5. Login with the new password.

The OTP is valid for 10 minutes and is stored hashed in MongoDB.

## Main API Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/criteria`
- `GET /api/dashboard`
- `GET /api/submissions/:criterionCode`
- `PUT /api/submissions/:criterionCode`
- `POST /api/documents/:criterionCode`
- `GET /api/documents/:id/download`
- `PATCH /api/hod/review`
- `POST /api/hod/reminders`
- `GET /api/exports/teacher/pdf`
- `GET /api/exports/teacher/excel`
- `GET /api/exports/hod/excel`
- `GET /api/logs`

## Notes

Uploaded files are stored in `server/uploads`. Direct public access is blocked; files are downloaded through authenticated API routes.
