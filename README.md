# Unity Drop API - Backend Services Developer Manual

The Unity Drop API is a secure, structured Express.js backend that acts as the core database and coordination engine for the Unity Drop Blood Donation Management System. It manages user authentication, role-based access, automated caching, email OTP verification, captcha validation, rate limiting, and system logging.

---

## 🛠️ Technology Stack

* **Server Environment**: **Node.js** running an **Express 5** server configured in ES Modules (`"type": "module"`).
* **Database Layer**: **MongoDB** connected using **Mongoose** schemas with optimized indexes and automatic pagination handlers (`mongoose-paginate-v2`).
* **Session Security**: **Passport.js** using the **JWT (passport-jwt)** strategy to authenticate API sessions securely via httpOnly cookies.
* **Database Caching**: Custom in-memory **LRU-Cache** module to store heavy database query aggregates (e.g. stats, list configurations).
* **Logging System**: **Winston** with a daily rotating file transport to log operations, warnings, and errors.
* **Email Service**: **Nodemailer** SMTP configurations to send registration verification codes (OTP) and password reset links.

---

## 📂 Backend Project Directory Structure

```
unity-drop-api/
├── src/
│   ├── app.js                 # Global express configuration and middleware setup
│   ├── server.js              # Server entry point and bootloader
│   ├── cache/                 # Smart LRU Cache setup, namespaces, and utility clears
│   ├── config/                # Environment variables and CORS configuration
│   ├── controllers/           # Logical request handlers for Admins, Donors, and Patients
│   ├── jobs/                  # Background automation tasks
│   ├── lib/                   # Passport strategies and authentication helpers
│   ├── middlewares/           # Authentication validation, rate limiters, recaptchas, caching hooks
│   ├── models/                # MongoDB Mongoose schemas
│   ├── routes/                # Express router path configurations
│   ├── services/              # Authentication helpers, email and Nodemailer triggers
│   └── utils/                 # Winston logging setup
├── logs/                      # Automatically generated daily system log files
├── tests/                     # Local automated unit test files
├── server.js                  # Standalone local launcher script
└── vercel.json               # Serverless host configurations
```

---

## ⚡ Key Core Abstractions

### 1. Smart Caching Architecture (`/src/cache`)
To prevent redundant database lookups and speed up general response times, a centralized caching system is implemented using `lru-cache`.
* **Namespaces (`CacheNamespaces`)**:
  * `admins`: Cached lists and profile states of administrative users.
  * `donors`: Cached profile details and searches of blood donors.
  * `patients`: Cached patient profiles and lists.
  * `requests`: Active blood requests.
  * `stats`: Heavy aggregation counts (total blood requests, verified users, etc.).
  * `feedbacks`: User feedback reports.
  * `users`: Cached admin filters.
* **Cache Middleware (`cacheMiddleware`)**: Intercepts `GET` requests and automatically serves matching data from memory if it exists.
* **Cache Auto-Reset Hook (`autoResetCache`)**: Mounted on mutating requests (like `POST`, `PUT`, `DELETE`). It automatically clears matching cache namespaces when data is modified to prevent stale data.

### 2. Multi-Tier Security Middlewares
* **Rate-Limiting**:
  * `globalLimiter`: Shields the backend from denial-of-service attempts.
  * `authLimiter`: Strict limitation applied to login, registration, and OTP verification endpoints to prevent brute-force attacks.
* **Sanitation**:
  * `express-mongo-sanitize`: Automatically strips MongoDB command keys (like `$`) from user inputs to prevent NoSQL injections.
  * `express-xss-sanitizer`: Sanitizes and filters HTML/script tags from user inputs.
* **ReCAPTCHA Verification (`verifyCaptcha`)**:
  * Intercepts new registration and login requests to validate the client Google ReCAPTCHA token before executing any database operation.

### 3. Core System Logging
* **Winston Logger**: Logs system events into two targets:
  * **Console**: Color-coded debug logs for active local development.
  * **Daily Rotating Files (`logs/system-%DATE%.log`)**: Persisted audit files that rotate daily, keeping operational logs and errors clean and structured.

---

## 💾 Database Schemas & Models (`/src/models`)

The database architecture is designed with clear separation and referential integrity using Mongoose:
1. **Admin Model (`admin-model.js`)**: Holds details of administrative users, including email, encrypted password, role (`admin`), status, and admin privileges.
2. **Donor Model (`donor-model.js`)**: Holds blood donor accounts, their available blood group, phone number, location (city/state), health status, and coordinates.
3. **Patient Model (`patient-model.js`)**: Holds patient accounts, location details, compatible blood needs, and medical requests.
4. **OTP Model (`otp-model.js`)**: Manages short-lived email verification One-Time Passwords.
5. **Password Verify Model (`password-verify-model.js`)**: Handles secure reset tokens for user password recovery.
6. **Donor Request Model (`donor-request-model.js`)**: Tracks blood donation coordination requests between patients and donors.
7. **Feedback Model (`feedback-model.js`)**: Logs feedback and bug reports sent by donors or patients.
8. **Public Feedback Model (`public-feedback-model.js`)**: Logs general feedback submitted via public landing forms.

---

## 📡 API Endpoint Reference

### 🔐 Authentication & Session Endpoints
* `POST /api/admin/register` — Register an admin account *(requires Captcha validation)*.
* `POST /api/admin/verify-email-for-admin` — Verifies administrative email using OTP.
* `POST /api/admin/admin-login` — Log in as admin and return httpOnly cookie.
* `POST /api/admin/admin-logout` — Clear session cookies.
* `POST /api/admin/admin-password-reset-link` — Sends reset token email.
* `POST /api/admin/admin-password-reset/:id/:token` — Saves new admin password.

* `POST /api/donor/donor-register` — Register a donor account *(requires Captcha)*.
* `POST /api/donor/verify-email-for-donor` — Verifies donor email using OTP.
* `POST /api/donor/donor-login` — Authenticates donor session.
* `POST /api/donor/donor-logout` — Clear donor session cookies.
* `POST /api/donor/donor-password-reset-link` — Sends password reset link.
* `POST /api/donor/donor-password-reset/:id/:token` — Saves new donor password.

* `POST /api/patient/patient-register` — Register a patient account *(requires Captcha)*.
* `POST /api/patient/verify-email-for-patient` — Verifies patient email using OTP.
* `POST /api/patient/patient-login` — Authenticates patient session.
* `POST /api/patient/patient-logout` — Clear patient session cookies.
* `POST /api/patient/patient-password-reset-link` — Sends password reset link.
* `POST /api/patient/patient-password-reset/:id/:token` — Saves new patient password.

### 👥 Donor Dashboard Operations (Private)
* `GET /api/donor/get-donor` — Fetches active donor profile.
* `PUT /api/donor/donor-update-profile` — Updates donor details *(invalidates donor cache)*.
* `PUT /api/donor/donor-change-password` — Update password securely.
* `DELETE /api/donor/donor-delete-ourself` — Delete own donor account.
* `GET /api/donor/get-all-patients-for-donor` — List all registered patients.
* `GET /api/donor/get-patient-by-id-for-donor/:id` — Retrieve specific patient details.
* `GET /api/donor/filter-all-patients` — Filter patients by location and blood group.
* `GET /api/donor/get-all-patient-requests-for-donor` — List active blood requests sent to this donor.
* `PUT /api/donor/update-patient-request-status-by-donor/:id` — Accept/decline patient blood request *(invalidates request cache)*.
* `POST /api/donor/feedback/add` — Submit private feedback to administrators.
* `GET /api/donor/get-stats` — Fetch stats for this donor.

### 🩺 Patient Dashboard Operations (Private)
* `GET /api/patient/get-patient` — Fetches active patient profile.
* `PUT /api/patient/patient-update-profile` — Updates patient details *(invalidates patient cache)*.
* `PUT /api/patient/patient-change-password` — Update password securely.
* `DELETE /api/patient/patient-delete-ourself` — Delete own patient account.
* `GET /api/patient/get-all-donors-for-patient` — List compatible blood donors.
* `GET /api/patient/get-donor-by-id-for-patient/:id` — Retrieve specific donor details.
* `GET /api/patient/filter-donors` — Search donors by location and blood groups.
* `POST /api/patient/send-blood-request-to-donor/:donorId` — Dispatch coordination request to donor.
* `GET /api/patient/get-all-donor-requests-for-patient` — List request histories sent to donors.
* `POST /api/patient/feedback/add` — Submit feedback.
* `GET /api/patient/get-stats` — General aggregate statistics.

### 🛡️ Admin Management Operations (Private)
* `GET /api/admin/get-admin` — Fetches active admin profile.
* `PUT /api/admin/admin-update-profile` — Updates admin details.
* `PUT /api/admin/admin-change-password` — Updates admin password.
* `DELETE /api/admin/admin-delete-ourself` — Deletes own admin account.
* `GET /api/admin/get-all-donors-from-admin` — View all registered blood donors.
* `GET /api/admin/getSingleDonor/:id` — Inspect individual donor details.
* `DELETE /api/admin/deleteSingleDonor/:id` — Administrative removal of a donor account.
* `GET /api/admin/get-all-patients-from-admin` — View all registered patients.
* `GET /api/admin/getSinglePatient/:id` — Inspect individual patient details.
* `DELETE /api/admin/deleteSinglePatient/:id` — Administrative removal of a patient account.
* `GET /api/admin/get-all-admins` — View other system administrators.
* `PATCH /api/admin/admin-approval/:id` — Toggle authorization of pending admin registrations.
* `PATCH /api/admin/admin-privileges/:id` — Edit system access permissions for another admin.
* `DELETE /api/admin/deleteSingleAdmin/:id` — Delete another admin account.
* `GET /api/admin/feedback/all` — View user feedback logs.
* `GET /api/admin/get-stats` — Global aggregates dashboard stats.

---

## 🛠️ Operations & Setup

1. **Install Service Dependencies**:
   ```bash
   npm install
   ```
2. **Setup Local Environment Configurations**:
   Create a `.env` file at the root of `unity-drop-api`:
   ```env
   NODE_ENV=development
   PORT=8000
   MONGODB_URI=mongodb://127.0.0.1:27017/unity-drop
   JWT_SECRET=your-backend-jwt-secret
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-smtp-email@gmail.com
   EMAIL_PASS=your-smtp-app-password
   ```
3. **Execute Local Development Server**:
   ```bash
   npm run dev
   ```
4. **Run Backend Automated Unit Tests**:
   ```bash
   npm run test
   ```
   This will run local tests in order:
   * **`tests/ut-1-otp-generation.test.js`**: Validates OTP generation length, expiry timer, and structure.
   * **`tests/ut-2-password-encryption.test.js`**: Validates bcrypt password hashing and comparators.
   * **`tests/ut-3-cache-invalidation.test.js`**: Confirms automatic cache invalidation on database modifications.

---
*Maintained under secure, professional development standards.* 🩸
