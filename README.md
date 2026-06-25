# DirectCredit - Loan Application & Eligibility Management System

DirectCredit is a full-stack, comprehensive loan management platform that replicates the digital lending journey used by banks and NBFCs. The platform allows customers to apply for loans online, undergo automated eligibility checks, and track their application status. Concurrently, it provides administrators with a centralized portal to review, approve, reject, and disburse loans.

## 🚀 Key Features

* **Multi-Portal Architecture**: Dedicated interfaces for Customers (`/frontend`) and Administrators (`/admin`).
* **Deterministic Credit Simulator**: A built-in bureau simulator that generates consistent, realistic credit reports. 
  - **How it works:** Instead of generating random numbers, the engine uses the applicant's unique `user_id`, `employment_type`, and `monthly_income` as mathematical seeds. 
  - This ensures that a specific user will **always** get the exact same credit score (between 300-900), active accounts count, total outstanding debt, and credit utilization percentage across multiple logins, perfectly mimicking a static real-world CIBIL/Experian report.
* **Banking Eligibility Engine**: A sophisticated 7-rule assessment engine that evaluates applicants based on:
  - Age Criteria
  - Minimum Income Requirements
  - Minimum Credit Score Thresholds
  - Debt-to-Income Ratio (FOIR)
  - Loan-to-Income Limits (LTI)
  - Employment Stability
  - Loan Amount Range Validations
* **End-to-End Application Lifecycle**: Tracks loans through `SUBMITTED` ➔ `UNDER_REVIEW` ➔ `ELIGIBLE/INELIGIBLE` ➔ `APPROVED/REJECTED` ➔ `DISBURSED`.
* **System Audit Logging**: Tracks every major state change and admin action for compliance and security.

---

## 🛠️ Technology Stack

* **Backend API**: Node.js, Express.js
* **Database**: PostgreSQL (connected via `@neondatabase/serverless` over WebSockets to bypass firewalls)
* **Customer Portal**: React 18, Vite, React Router, Custom CSS Design System
* **Admin Portal**: React 18, Vite, Recharts (for Analytics), Custom CSS Design System
* **Security & Auth**: JWT (Access/Refresh token rotation), bcryptjs, helmet

---

## 👥 Roles and Capabilities

### 1. Customer (Applicant)
* **Registration & Profile**: Can register and manage personal, employment, and address details.
* **Credit Score Dashboard**: Can view their simulated CIBIL score and detailed credit factors (payment history, utilization, enquiries).
* **Loan Applications**: Can submit applications for various loan types (Personal, Home, Auto, Education, Business).
* **Status Tracking**: Can monitor the real-time status of their applications and view detailed timelines from submission to disbursement.

### 2. Administrator (Standard Admin)
* **Dashboard Analytics**: Views real-time KPI metrics, recent applications, and loan distribution charts.
* **Application Processing**: Can review detailed applicant profiles alongside the Eligibility Engine's analysis and rule-by-rule breakdown.
* **Decision Making**: Has authority to Approve or Reject loans based on the engine's recommendation and manual review. Must provide rejection reasons and internal remarks.

### 3. Super Administrator (Super Admin)
* **All Admin Privileges**: Inherits all capabilities of a standard Administrator.
* **Financial Disbursement**: Only Super Admins have the authority to process the final funds transfer (NEFT/RTGS/IMPS) and disburse money for approved loans.
* **User & Audit Management**: Has exclusive access to view all registered customers and inspect the immutable system activity audit logs.
* **System Settings**: (Future Scope) Ability to manage eligibility rules, interest rates, and system-wide configurations.

---

## ⚙️ Local Setup Instructions

### Prerequisites
- Node.js (v18+ recommended)
- A PostgreSQL Database (Cloud or Local)

### 1. Database Configuration
In the `backend` folder, copy `.env.example` to `.env` (if not already done) and configure your variables. The system uses Neon Serverless, so cloud DB URLs will work even on restricted networks (Port 5432 blocked).
```env
PORT=5000
NODE_ENV=development

# Database URL
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

### 2. Install Dependencies & Migrate
Open a terminal in the `backend` directory:
```bash
cd backend
npm install
npm run migrate   # Creates all tables, rules, and seed data
```

### 3. Start the Servers
You will need 3 terminal windows to run the full platform.

**Terminal 1: Backend Server**
```bash
cd backend
npm start
# Runs on http://localhost:5000
```

**Terminal 2: Customer Frontend**
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

**Terminal 3: Admin Portal**
```bash
cd admin
npm install
npm run dev
# Runs on http://localhost:5174
```

---

## 🔑 Demo Accounts

The `npm run migrate` script automatically seeds demo accounts for testing purposes:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@directcredit.in` | `Admin@123` |
| **Customer** | `demo@directcredit.in` | `Password@123` |

*(Note: The login pages on both portals include 1-click "Fill Demo" buttons for rapid testing).*

---

## 📂 Project Structure
```text
directCredit/
├── admin/                 # React Admin Dashboard
│   ├── src/pages/         # Dashboard, Review, Audit Logs
│   └── src/context/       # Admin Auth state management
├── backend/               # Express.js REST API
│   ├── src/controllers/   # Request handlers
│   ├── src/services/      # Core Logic (EligibilityEngine, CreditBureau)
│   ├── src/routes/        # Express routers
│   └── migrations/        # SQL schema & seed files
└── frontend/              # React Customer Portal
    ├── src/pages/         # Applications, Apply Loan, Credit Score
    └── src/context/       # Customer Auth state management
```

## 🛡️ Firewall & Network Notes
The backend has been configured to use `@neondatabase/serverless` with the `ws` library. This tunnels raw database traffic over WebSockets (Port 443) instead of the standard PostgreSQL TCP port (5432). This ensures that developers can run the system seamlessly on restrictive corporate, university, or public Wi-Fi networks without encountering `ETIMEDOUT` database connection errors.
