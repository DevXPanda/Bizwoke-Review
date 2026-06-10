# Bizorm Reviews (Modern)

A premium Next.js and Convex application for multi-branch customer feedback management, star gating, review monitoring, and audit compliance.

---

## 🚀 Key Features

### 1. Role-Based Access Control (RBAC) & Branch Isolation
*   **SUPER_ADMIN**: Full global system configuration, quota controls, plan updates, transaction history, branch creation, user provisioning, and full branch impersonation/drill-down access.
*   **BRANCH_ADMIN**: Scoped control over their assigned branch. Provision/manage staff users, review configured platforms, inspect local metrics, and send campaigns.
*   **BRANCH_USER**: Strictly read-only access to branch metrics, configured platforms, reviews, and logs.
*   **Strict Security Isolation**: The backend database queries in Convex enforce server-side validation to isolate branch metrics, preventing cross-branch access or privilege escalation.

### 2. Super Admin Branch Overview & Drill-Down
*   **Branch Summary Bar**: An interactive, horizontally scrollable slider rendering performance aggregates (ratings average, total reviews, user counts, active status) for each branch.
*   **Detail Drawer Overlay**: Sliding tabbed diagnostic inspector displaying complete analytics, star distributions, user lists, campaign invite logs, recent feedback records, audit logs, and remaining quota balances.

### 3. Star Gating & Widgets
*   **Review Gating**: Captures customer feedback. Redirects positive feedback (4–5 stars) to external review sites (e.g. Google Reviews) while keeping critical feedback (1–3 stars) private for branch handling.
*   **Dynamic Widgets**: Renders generated iframe review widgets and QR code download badges.

### 4. Production-Grade Logging System
*   **Request Access Logging**: Incoming HTTP requests are logged in the format: `METHOD path status (durationms)`.
*   **Centralized Logger**: Level filtering suppresses debugging outputs in production environments while routing errors and warnings safely.
*   **Privacy scrubbing**: Automatically sanitizes tokens, cookies, emails, and identifiers from logs.

---

## 🛠️ Technology Stack
*   **Frontend**: [Next.js 15](https://nextjs.org/) (App Router, React 19)
*   **Backend & DB**: [Convex Cloud](https://www.convex.dev/) (Queries, Mutations, Actions, Schedulers)
*   **Authentication**: [@convex-dev/auth](https://auth.convex.dev/) (Session JWT & Password Providers)
*   **Styling**: TailwindCSS & Vanilla CSS
*   **Icons**: Lucide React

---

## ⚙️ Project Setup

### 1. Prerequisites
Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (v18.x or above)
*   npm or yarn

### 2. Installation
Clone the repository and install packages:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory and define the following variables:
```env
# Convex Deployment Urls
CONVEX_DEPLOYMENT=dev:your-deployment-id
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://your-deployment.convex.site

# Convex Auth Configuration
AUTH_LOG_LEVEL=WARN

# Razorpay Credentials
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxx

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=no-reply@yourdomain.com

# SMS Gateway credentials
SMS_USER=xxxxxx
SMS_AUTHKEY=xxxxxxxxxx
SMS_SENDER=xxxxxx
SMS_ENTITYID=xxxxxxxxxxxxx
SMS_TEMPLATEID=xxxxxxxxxxxxx
```

### 4. Run Development Servers
Start both the Convex development backend and the Next.js local server concurrently:

```bash
# In Terminal 1: Starts Convex watcher & function builder
npx convex dev

# In Terminal 2: Starts Next.js development server
npm run dev
```

### 5. Production Compilation
Verify code compilation and create optimized bundles:
```bash
# Verify Typescript compilation
npx tsc --noEmit

# Compile production bundle
npm run build
```
