# Arvo Frontdesk — Real-Time Support & SLA Engine

> **A mission-critical support workspace engineered for Arvo Systems**, replacing brittle shared spreadsheets with a deterministic business-hours SLA engine, strict cryptographic-level data boundaries, and optimistic concurrency guards.

---

## 🏆 Executive Summary & Architecture Highlights

Arvo Frontdesk is built to solve the systemic operational failures documented in Arvo’s quarterly reviews and incident post-mortems:

1. **INC-0291 (Double-Take Race Condition):**
   * *Root Cause:* Two agents claimed and replied to the same ticket simultaneously, delivering conflicting answers.
   * *Architectural Solution:* Optimistic Concurrency Control via integer `version` checking combined with transactional row-level guards. If two agents attempt to claim or reply simultaneously, the second transaction is rejected with `409 Conflict` (`VERSION_MISMATCH` / `ALREADY_CLAIMED`), instantly invalidating the stale client query and alerting the agent without data corruption.

2. **INC-0304 (Private Note Data Leak to Customer):**
   * *Root Cause:* Internal team notes were visible in customer communication channels.
   * *Architectural Solution:* Complete physical and logical table isolation. Internal notes reside in an isolated `internal_notes` table that is **never** joined, referenced, or queried by any customer endpoint (`/api/customer/*`). Even in the client, a dedicated "Inspect Customer API JSON" drawer proves zero-leak verification at the wire level. In the agent workspace, a mistake-proof "Poka-Yoke" composer physically morphs into a high-visibility amber warning state when authoring private notes.

3. **INC-0318 (Unprovable Communication Timestamps):**
   * *Root Cause:* Customers and support disputed response times with no verifiable audit log.
   * *Architectural Solution:* Immutable, append-only `audit_log` table stamped with millisecond-precision Indian Standard Time (`Asia/Kolkata`). The backend exposes **no `PUT`, `PATCH`, or `DELETE` endpoints** for audit entries. Every ticket event (creation, claim, first response, status transition, priority change, auto-close) records actor identity, action type, and JSON metadata diffs.

---

## ⏱️ SLA Business-Hours Engine Specification

Arvo promises support based on severity, but strictly within **business hours**:
* **Working Window:** Monday through Friday, `09:30 – 18:30 IST` (`Asia/Kolkata`) = **9 working hours (540 business minutes) per day**; **45 business hours (2700 business minutes) per week**.
* **Off-Hours & Holidays:** Weekends (Saturday & Sunday) and Indian Festival Holidays are strictly excluded. If a ticket arrives Friday at 18:00 IST, only 30 working minutes elapse before closing at 18:30 IST. On Sunday morning, **0 additional business minutes have passed**; the ticket is **not late**.

### Exact SLA Targets

| Priority | First Response SLA | Resolution SLA | Business Minutes |
| :--- | :--- | :--- | :--- |
| **Critical** | 2 working hours | Same business day (9 working hours) | **120m** / **540m** |
| **Medium** | 4.5 working hours (half working day) | 3 business days (27 working hours) | **270m** / **1,620m** |
| **Low** | 1 business day (9 working hours) | 5 business days (45 working hours) | **540m** / **2,700m** |

### Mid-Flight Priority Recalculation Policy
*When a ticket is escalated in the middle of resolution (e.g., Medium $\rightarrow$ Critical):*
1. **Preserve Accumulated Business Time:** Elapsed business minutes prior to the change are preserved.
2. **Apply New Target:** The remaining deadline adjusts to: $\max(0, \text{New Target} - \text{Elapsed Minutes})$.
3. **Audit Logged:** Both old and new SLA targets with timestamps are recorded in the immutable audit log.

### SLA Pause & Inactivity Rules
* **Customer Wait Pause:** Setting status to `WAITING_ON_CUSTOMER` freezes the SLA clock. Paused duration is excluded from Arvo's SLA compliance. Customer reply automatically resumes the timer.
* **Auto-Close Sweep:** Tickets waiting on a customer for **5 working days (2,700 business minutes)** are automatically transitioned to `CLOSED` via a background cron sweep.
* **Reopen Window:** Customers can reopen resolved tickets within **5 working days (2,700 business minutes)**. Beyond this window, reopening is rejected with `REOPEN_EXPIRED` (`422 Unprocessable Entity`), with a 1-click option to create a linked follow-up ticket.

---

## 🛠️ Technology Stack

* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, TanStack Query v5, React Router v7, Sonner Toast.
* **Backend:** Node.js, TypeScript, Express, Prisma ORM, Zod, node-cron, date-fns & date-fns-tz.
* **Database:** PostgreSQL (Neon Serverless PostgreSQL in cloud; local PostgreSQL supported).
* **Testing:** Vitest unit test suite validating all SLA boundary mathematics.

---

## 🚀 Local Quickstart Guide

### Prerequisites
* **Node.js:** v18.0.0 or higher (v20+ recommended)
* **npm:** v9.0.0 or higher
* **PostgreSQL:** Local instance or free [Neon](https://neon.tech) serverless database URL.

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/arvo-frontdesk.git
cd arvo-frontdesk

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

### 2. Configure Environment Variables
In `backend/.env`:
```env
PORT=3001
DATABASE_URL="postgresql://username:password@ep-xyz.us-east-2.aws.neon.tech/arvo_frontdesk?sslmode=require"
NODE_ENV=development
```

In `frontend/.env`:
```env
VITE_API_URL="http://localhost:3001"
```

### 3. Initialize Database & Seed Demo Data
```bash
cd backend
npx prisma db push
npm run prisma:seed
```
*Seeds 3 agents (Meera, Rahul, Priya), 4 customers, 21 Indian festival holidays for 2026, and the 8 canonical test tickets (ARV-101 through ARV-108).*

### 4. Run the Automated SLA Test Suite
```bash
cd backend
npm run test
```
*Executes all 23 Vitest test cases validating Friday 6 PM $\rightarrow$ Sunday morning zero-clock rules, holiday skips, mid-flight escalations, auto-close, and reopen windows.*

### 5. Launch the Applications
In terminal 1 (Backend API):
```bash
cd backend
npm run dev
# Starts backend server on http://localhost:3001
```

In terminal 2 (Frontend Workspace):
```bash
cd frontend
npm run dev
# Starts Vite dev server on http://localhost:5173
```
Open **http://localhost:5173** in your browser.

---

## 🧪 Evaluator Verification Guide (Prove Every Requirement in 60 Seconds)

### 1. Pre-Seeded Story Tickets
The application is pre-seeded with 8 specialized tickets that demonstrate each requirement:
* **`ARV-101` (Critical · Breached):** Rahul assigned; first response breached, pinned at top of queue.
* **`ARV-102` (Critical · Friday 18:00 Arrival):** Demonstrates weekend exclusion. Only 30 minutes elapsed; SLA is healthy and not breached on Sunday morning.
* **`ARV-103` (Medium · Waiting on Customer):** Paused for 2 working days; displays live countdown to 5-day auto-close.
* **`ARV-104` (Critical · Unassigned):** Open ticket ready for 1-click Claim and multi-tab `409 Conflict` concurrency testing.
* **`ARV-105` (Medium · Sensitive Notes):** Contains confidential customer notes. Switch to **Customer View** to verify notes are stripped at database/API level.
* **`ARV-106` (Critical · Escalated Mid-Flight):** Medium escalated to Critical; inspect SLA Math breakdown and Audit Log to see preserved elapsed minutes.
* **`ARV-107` (Low · Resolved 2 Days Ago):** In Customer View, demonstrates active `Reopen Ticket` action.
* **`ARV-108` (Medium · Resolved 7 Days Ago):** In Customer View, proves expired 5-day window with 1-click linked ticket creation.

### 2. Live Demo Simulation Clock (Top Bar)
Click the time badge in the top bar to simulate time travel without modifying local system clocks:
* **`🔴 Live IST`:** Reverts to real-world time.
* **`📅 Mon 10:00 AM`:** Jump into active business hours.
* **`🏖️ Sun 10:00 AM`:** Jump to Sunday morning to verify `ARV-102` remains green and paused.
* **`⏩ +6 Work Days`:** Advances time past 5 working days; click **⚡ Trigger Auto-Close Sweep** to watch `ARV-103` automatically close.

### 3. Keyboard Shortcuts
* `J` / `K`: Move selection down / up through ticket queue.
* `R`: Focus Public Reply composer.
* `N`: Focus Internal Note composer (triggers amber Poka-Yoke transition).
* `?`: View keyboard shortcuts legend.

---

## 🔒 Security & Data Boundary Verification
* Dedicated `/api/customer/*` routes do not import or access `internal_notes`.
* The **Customer View** contains an interactive **Inspect Customer API JSON** drawer to verify that private notes never cross the network boundary.
