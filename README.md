# Unity Drop API — Backend Developer Manual

The **Unity Drop API** is a secure, production-grade **Express 5 / Node.js** backend that powers the entire Unity Drop Blood Donation Management System. It handles all user authentication, role-based access control (RBAC), real-time request coordination, automated email delivery, in-memory caching, and system logging.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Server Runtime | Node.js + Express 5 (ES Modules) |
| Database | MongoDB Atlas via Mongoose |
| Authentication | Passport.js + JWT (HttpOnly Cookies) |
| Password Security | bcryptjs (salt factor 10) |
| Caching | LRU-Cache (namespace-based invalidation) |
| Email Delivery | Nodemailer (SMTP via Gmail) |
| Logging | Winston + daily rotating log files |
| Security | Helmet, express-rate-limit, mongo-sanitize, xss-sanitizer |
| Pagination | mongoose-paginate-v2 |
| Deployment | Render (production) / Vercel (serverless fallback) |

---

## 📂 Project Directory Structure

```
unity-drop-api/
├── src/
│   ├── app.js                  # Express app config, global middlewares, route mounting
│   ├── cache/
│   │   ├── config.js           # LRU-Cache instance and TTL settings
│   │   ├── constants.js        # CacheNamespaces (donors, patients, admins, stats, etc.)
│   │   └── utils.js            # deleteByNamespace() and resetEntireCache() utilities
│   ├── config/
│   │   └── env.js              # Centralized environment variable config object
│   ├── controllers/
│   │   ├── admin-controller.js
│   │   ├── donor-controller.js
│   │   ├── patient-controller.js
│   │   └── public-feedback-controller.js
│   ├── lib/
│   │   └── passport-config.js  # JWT strategy (reads role from token, loads user from DB)
│   ├── middlewares/
│   │   ├── auth-middleware.js       # authenticateJWT(roles[]) guard factory
│   │   ├── cache-middleware.js      # cacheMiddleware() + autoResetCache()
│   │   ├── global-error-handler.js  # Centralized Express error handler
│   │   ├── morgan-middleware.js     # HTTP request logger
│   │   ├── rate-limiters.js         # globalLimiter + authLimiter
│   │   └── verify-captcha.js        # Google ReCAPTCHA v2 server-side validation
│   ├── models/
│   │   ├── admin-model.js
│   │   ├── donor-model.js          # Compound indexes: bloodGroup+location, fullName text
│   │   ├── patient-model.js
│   │   ├── donor-request-model.js  # TTL index on expiresAt (auto-deletes expired requests)
│   │   ├── otp-model.js
│   │   ├── password-verify-model.js
│   │   ├── feedback-model.js
│   │   └── public-feedback-model.js
│   ├── routes/
│   │   ├── index.js                # Main router (mounts /admin, /donor, /patient, /public)
│   │   ├── admin-routes.js
│   │   ├── donor-routes.js
│   │   ├── patient-routes.js
│   │   └── public-feedback-routes.js
│   ├── services/
│   │   └── email/
│   │       └── email-helper.js     # Nodemailer SMTP sender (sendEmail utility)
│   └── utils/
│       ├── logger.js               # Winston logger (console + daily rotating file)
│       └── generate-otp.js         # Cryptographically secure 6-digit OTP generator
├── logs/                           # Auto-generated daily log files (gitignored)
├── server.js                       # Local development entry point
├── vercel.json                     # Serverless deployment config
├── .env.example                    # Environment variable template (copy to .env)
└── package.json
```

---

## ⚡ Core Architecture Explained

### 1. Smart LRU Caching System (`/src/cache`)
To eliminate redundant MongoDB queries on frequently-read data, a centralized namespace-based caching system is built on `lru-cache`.

**Cache Namespaces:**
| Namespace | What It Caches |
|---|---|
| `donors` | Donor lists, search results, single donor lookups |
| `patients` | Patient lists, search results, single patient lookups |
| `admins` | Admin lists, approval states |
| `requests` | Active blood donation request records |
| `stats` | Aggregated system statistics (counts) |
| `feedbacks` | User feedback logs |
| `users` | Combined admin filter/search results |

**How It Works:**
- `cacheMiddleware(namespace)` — Mounted on `GET` routes. Intercepts the request, returns cached data if found. If not found, lets the controller run and caches the result automatically.
- `autoResetCache([namespaces])` — Mounted on `POST`, `PUT`, `DELETE`, `PATCH` routes that modify data. Instantly purges the relevant namespace(s) so the next `GET` fetches fresh data from MongoDB.

### 2. Multi-Tier Security
- **HttpOnly JWT Cookies** — Access tokens never exposed to JavaScript. Sent only over secure connections.
- **Passport.js JWT Strategy** — On every protected request, the token is decoded and the user is re-fetched from MongoDB by role (`admin`, `donor`, `patient`).
- **Role-Based Guards** — `authenticateJWT(['admin'])`, `authenticateJWT(['donor'])`, `authenticateJWT(['patient'])` — Each route only accepts the correct role.
- **Rate Limiting** — `authLimiter` caps login/register/OTP endpoints. `globalLimiter` protects all other routes.
- **Input Sanitization** — `express-mongo-sanitize` strips `$` operators. `express-xss-sanitizer` removes script/HTML tags.
- **Helmet** — Sets secure HTTP response headers automatically.

### 3. Database Optimizations
- All read-only queries use **`.lean()`** — returns plain JS objects (3–5× faster serialization).
- **Projections** on all queries — passwords are never returned to clients.
- **Compound indexes** on Donor and Patient models for fast blood group + location searches.
- **TTL index** on `DonorRequest.expiresAt` — MongoDB auto-deletes expired requests.
- **Pagination** via `mongoose-paginate-v2` on all list endpoints.

---

## 💾 Database Models (`/src/models`)

| Model | Purpose |
|---|---|
| `Admin` | Admin accounts with role, approval status, and delete privilege |
| `Donor` | Donor profiles with blood group, location, and availability status |
| `Patient` | Patient profiles with hospital info and blood needs |
| `DonorRequest` | Blood request records (Pending / Approved / Rejected), auto-expires |
| `Otp` | Short-lived 6-digit email verification codes |
| `PasswordVerifyModel` | Secure reset tokens for password recovery flows |
| `Feedback` | Private feedback submitted by donors/patients to admins |
| `PublicFeedback` | Public landing page feedback submissions |

---

## 📡 API Endpoint Reference

All routes are prefixed under `/api`.

### 🔐 Admin Auth (`/api/admin`)
| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/status` | Public | Server health check |
| POST | `/register` | Public | Register admin (captcha required) |
| POST | `/verify-email-for-admin` | Public | Verify OTP email |
| POST | `/admin-login` | Public | Login (captcha required) |
| POST | `/admin-logout` | Admin only | Clear session |
| POST | `/admin-password-reset-link` | Public | Send reset link |
| POST | `/admin-password-reset/:id/:token` | Public | Save new password |

### 🩸 Donor Auth + Dashboard (`/api/donor`)
| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/donor-register` | Public | Register donor (captcha required) |
| POST | `/verify-email-for-donor` | Public | Verify OTP email |
| POST | `/donor-login` | Public | Login (captcha required) |
| POST | `/donor-logout` | Donor only | Clear session |
| GET | `/get-donor` | Donor only | Fetch own profile |
| PUT | `/donor-update-profile` | Donor only | Update profile |
| PUT | `/donor-change-password` | Donor only | Change password |
| DELETE | `/donor-delete-ourself` | Donor only | Delete own account |
| GET | `/get-all-patients-for-donor` | Donor only | Paginated patient list |
| GET | `/get-patient-by-id-for-donor/:id` | Donor only | Single patient details |
| GET | `/filter-all-patients` | Donor only | Filter by name/bloodGroup/location |
| GET | `/get-all-patient-requests-for-donor` | Donor only | All blood requests received |
| PUT | `/update-patient-request-status-by-donor/:id` | Donor only | Accept / Reject request |
| POST | `/feedback/add` | Donor only | Submit feedback |
| GET | `/get-stats` | Donor only | Personal dashboard stats |

### 🩺 Patient Auth + Dashboard (`/api/patient`)
| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/patient-register` | Public | Register patient (captcha required) |
| POST | `/verify-email-for-patient` | Public | Verify OTP email |
| POST | `/patient-login` | Public | Login (captcha required) |
| POST | `/patient-logout` | Patient only | Clear session |
| GET | `/get-patient` | Patient only | Fetch own profile |
| PUT | `/patient-update-profile` | Patient only | Update profile |
| PUT | `/patient-change-password` | Patient only | Change password |
| DELETE | `/patient-delete-ourself` | Patient only | Delete own account |
| GET | `/get-all-donors-for-patient` | Patient only | Paginated donor list |
| GET | `/get-donor-by-id-for-patient/:id` | Patient only | Single donor details |
| GET | `/filter-donors` | Patient only | Filter by name/bloodGroup/location |
| POST | `/send-blood-request-to-donor/:donorId` | Patient only | Send blood request |
| GET | `/get-all-donor-requests-for-patient` | Patient only | All sent requests + status |
| POST | `/feedback/add` | Patient only | Submit feedback |
| GET | `/get-stats` | Patient only | Personal dashboard stats |

### 🛡️ Admin Management (`/api/admin`)
| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/get-admin` | Admin only | Fetch own profile |
| PUT | `/admin-update-profile` | Admin only | Update profile |
| PUT | `/admin-change-password` | Admin only | Change password |
| DELETE | `/admin-delete-ourself` | Admin only | Delete own account |
| GET | `/get-all-donors-from-admin` | Admin only | Paginated donor list |
| GET | `/getSingleDonor/:id` | Admin only | Single donor details |
| DELETE | `/deleteSingleDonor/:id` | Admin only | Remove donor account |
| GET | `/get-all-patients-from-admin` | Admin only | Paginated patient list |
| GET | `/getSinglePatient/:id` | Admin only | Single patient details |
| DELETE | `/deleteSinglePatient/:id` | Admin only | Remove patient account |
| GET | `/get-all-admins` | Admin only | Paginated admin list |
| PATCH | `/admin-approval/:id` | Admin only | Approve/reject admin registration |
| PATCH | `/admin-privileges/:id` | Admin only | Toggle delete privilege for admin |
| DELETE | `/deleteSingleAdmin/:id` | Admin only | Remove admin account |
| GET | `/feedback/all` | Admin only | View all user feedbacks |
| GET | `/get-stats` | Admin only | Global system statistics |
| GET | `/filter-users` | Admin only | Search all users by type/filters |

### 🌐 Public Feedback (`/api/public`)
| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/public-feedback` | Public | Submit feedback from landing page |
| GET | `/get-public-feedbacks` | Super Admin only | View landing page feedbacks |

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** v18 or higher
- **MongoDB Atlas** account (or local MongoDB instance)
- **Gmail App Password** for SMTP email delivery
- **Google ReCAPTCHA v2** site key and secret key

### Step 1 — Install Dependencies
```bash
npm install
```

### Step 2 — Configure Environment Variables
Copy the template and fill in your values:
```bash
cp .env.example .env
```

```env
# Server
NODE_ENV=development
PORT=8000

# Database (MongoDB Atlas recommended)
DATABASE_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/unitydrop?retryWrites=true&w=majority

# Frontend URL (CORS whitelist)
FRONTEND_URL=http://localhost:3000

# JWT Secrets (use strong random strings)
JWT_ACCESS_TOKEN_SECRET_KEY=your_jwt_access_secret
JWT_REFRESH_TOKEN_SECRET_KEY=your_jwt_refresh_secret
PASSWORD_RESET_TOKEN_PRIVATE_KEY=your_reset_token_secret

# Gmail SMTP (use a Gmail App Password, not your regular password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SERVICE=gmail
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_digit_app_password
SMTP_FROM_EMAIL=your_email@gmail.com

# Google reCAPTCHA v2
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key

# Expiry Durations
CACHE_TTL_MINUTES=5
DONATION_REQUEST_EXPIRY_DAYS=7
OTP_EXPIRY_MINUTES=10
PASSWORD_RESET_EXPIRY_MINUTES=10

# Admin Limit
ADMIN_QUOTA_LIMIT=2
```

### Step 3 — Start Development Server
```bash
npm run dev
```
> The API will run at **`http://localhost:8000`**
> Port 8000 is automatically freed before startup via the `predev` script.

### Step 4 — Start Production Server
```bash
npm start
```

---

## 🔒 Security Summary

| Practice | Implementation |
|---|---|
| Password Hashing | bcryptjs, salt factor 10, pre-save Mongoose hook |
| Session Tokens | JWT in HttpOnly cookies (not accessible by JS) |
| NoSQL Injection Prevention | express-mongo-sanitize |
| XSS Prevention | express-xss-sanitizer |
| Brute-Force Defense | express-rate-limit on auth routes |
| HTTP Headers | Helmet |
| Role Enforcement | authenticateJWT(['role']) middleware on every protected route |

---

## 📄 License
This project is licensed under the **ISC License**.

---
*Maintained under secure, professional development standards.* 🩸
