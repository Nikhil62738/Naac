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
