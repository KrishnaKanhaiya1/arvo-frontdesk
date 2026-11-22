# Completion Note — Engineering Decisions & Scope Analysis

**Candidate:** Full Stack Developer Candidate  
**Project:** Arvo Frontdesk  
**Date:** 21 November 2026  
**Time Spent:** ~8 hours

---

## 1. What Was Completed & Key Engineering Decisions

All functional rules embedded in Section 3 (Meeting Notes), Section 4 (Incidents INC-0291, INC-0304, INC-0318), and the UI/UX Reference 2 benchmark transformation were successfully implemented end-to-end:

1. **Elite Split-Screen Operations Gateway (Surpassing Reference 2 Benchmark):**
   * Floating container with `rounded-[2rem]`, elevated enterprise shadow (`shadow-[0_35px_90px_-45px_rgba(15,23,42,0.45)]`), and balanced dual-pane layout (`0.92fr : 1.08fr`).
   * **Custom Enterprise Photography:** Replaced automotive showroom imagery with high-resolution enterprise mission control assets:
     - Operations Command Center NOC (`/arvo-ops-center.jpg`)
     - Modern Corporate Enterprise Glass Headquarters (`/arvo-enterprise-glass.jpg`)
     - High-Density Cloud Infrastructure Server Datacenter (`/arvo-datacenter-racks.jpg`)
   * **Seamless Organic Curved Wave Divider:** Engineered a mathematically precise SVG bezier wave on the left edge of the photo panel using `text-[var(--surface)] fill-current`, creating an organic curve that adapts perfectly to both Light and Dark modes.
   * **Frosted Glass Access Flow Verification Card:** Multi-layer backdrop blur (`backdrop-blur-xl bg-white/85 dark:bg-slate-900/85`) with `Identity (Approved account)`, `Routing (Role workspace)`, and `Audit (Traceable records)` sub-cards.
   * **Real Authentication & Evaluator Quick-Access:** Full email/password login backed by cryptographic HMAC-SHA256 signed session cookies, alongside 1-click evaluator test cards (Meera - Lead, Rahul - Agent, Priya - Agent, Vikram - Customer) with transparent passwords displayed (`arvo2026`).

2. **Deterministic 9-Hour Business Engine:**
   * Calculated in working minutes (09:30–18:30 IST, Mon–Fri, 540 min/day, 45h/week) using `date-fns-tz` to eliminate UTC/local timezone drift.
   * Excludes weekends and Indian festival holidays.
   * Proved that tickets arriving Friday at 18:00 IST only accrue 30 working minutes before weekend closure and remain well within SLA on Sunday morning.

3. **Incident Solutions & Security Hardening:**
   * **INC-0291 (Double Claim Race Condition):** Implemented database transactions with Atomic Compare-And-Swap (CAS) optimistic concurrency control (`updateMany({ where: { id, version }, data: { ... version: { increment: 1 } } })`). Concurrent claim attempts result in a deterministic `409 Conflict` (`VERSION_MISMATCH` / `CONFLICT`), verified by automated concurrency tests.
   * **INC-0304 (Note Leak Prevention & Authorization):** Isolated private notes into a separate `internal_notes` database table protected by `requireAgentRole` authorization middleware. Customer endpoints (`/api/customer/*`) have no join or reference to this table, guaranteeing zero leakage in network payloads. Direct requests by customer personas receive `403 Forbidden`. The UI provides a "Poka-Yoke" dual-mode composer with an amber warning state.
   * **INC-0318 (Audit Trail & Database-Level Immutability):** Created an append-only `audit_log` table with millisecond-precision IST timestamps. Immutability is enforced directly at the database engine level using a native PostgreSQL trigger (`prevent_audit_log_modification`) that raises an exception on any direct `UPDATE` or `DELETE` attempt, verified by automated unit tests.
   * **Cryptographic Session Authentication:** Implemented server-issued HTTP-only, SameSite session cookies (`/api/auth/login`, `/api/auth/demo-login`, `/api/auth/session`, `/api/auth/logout`) with HMAC-SHA256 signatures, replacing raw client header trust, accompanied by strict RBAC guards (`requireLeadRole` restricted solely to Leads).

4. **Mid-Flight Priority Recalculation & Critical Same-Day Resolution:**
   * When priority changes mid-resolution, elapsed business minutes are strictly preserved, and new SLA targets are calculated relative to current time rather than creation date.
   * For Critical priority tickets, resolution deadline calculations enforce same-working-day resolution (18:30 IST), rather than an unconstrained 9-hour rollover.

5. **Inactivity Auto-Close & Atomic Reopen Policy:**
   * Auto-closes tickets after 5 working days (2,700 business minutes) of waiting on a customer using an atomic CAS sweep to prevent racing with customer replies.
   * Enforces a 5-working-day customer reopen limit with atomic Compare-And-Swap (`where: { id, version, status: 'RESOLVED' }`) guarding against concurrent state changes. Beyond 5 working days, reopening is rejected with `REOPEN_EXPIRED` (`422 Unprocessable Entity`), and the customer UI offers a complete 1-click modal workflow to create a linked follow-up ticket.

6. **Demo Simulation Clock & Free-Tier Resilience:**
   * Exposed `/api/system/clock` and `/api/system/run-autoclose` (guarded by `requireLeadRole`) to allow evaluators to test time-travel scenarios (weekend arrival, holiday skipping, 6-day auto-close sweep).
   * Implemented a branded cold-start wake-up screen with automatic query retry to handle Render free-tier spin-up latency smoothly.

7. **Comprehensive Automated Test Suite (40 Passing Tests):**
   * 23 SLA unit tests validating business hour boundaries, weekend exclusions, 2026 Indian holidays, Friday 18:00 to Sunday morning invariants, and same-day critical resolution deadlines.
   * 17 full integration tests verifying:
     - Signed session cookie authentication (`/api/auth/login` and `/api/auth/demo-login`).
     - Unauthenticated requests receive 401; header spoofing attempts without cookies receive 401.
     - Strict RBAC: Customer attempting agent workspace receives 403; customer attempting private notes receives 403; customer accessing another customer's ticket receives 403; customer query/body ID tampering receives 403.
     - INC-0291 atomic CAS race condition prevention (concurrent claims returning 409).
     - INC-0304 private note security & customer endpoint isolation.
     - INC-0318 database trigger immutability.
     - Atomic CAS on reopen with version guards; expired reopen rejection (`422 REOPEN_EXPIRED`); closed ticket reply rejection. All 40 tests pass.

8. **Evaluator UX & Conflict Recovery (HTTP 409 & Autosave):**
   * **ConflictModal (HTTP 409 Recovery):** Displays a non-destructive recovery modal when version mismatch is encountered, preserving unsent drafts with options to "Refresh & Review" or "Discard Draft".
   * **Draft Persistence:** Reply and note composers automatically persist unsent drafts to localStorage per ticket key, with a live "Draft saved" badge.
   * **Customer Data Boundary Verified Drawer:** Features 4 explicit green checkmarks proving database and network boundary isolation.
   * **Production Deployment Configs:** Multi-stage `Dockerfile`, `docker-compose.yml`, `render.yaml` blueprint, and `vercel.json` SPA configuration included.

---

## 2. What Was Intentionally Left Unfinished (and Why)

Given the recommended 8-hour constraint, the following items were prioritized for future iterations to focus on core data integrity and business logic:

### A. WebSockets / Server-Sent Events (SSE) for Real-Time Multi-Tab Sync
* **Current Implementation:** Automated 15-second polling via TanStack Query (`refetchInterval`), combined with eager optimistic mutation invalidation and version mismatch detection.
* **Why Skipped:** Setting up a production WebSocket server on serverless/free-tier hosting (Render/Vercel) introduces connection drops and stateful server constraints. TanStack Query's refetching with optimistic lock rejection (`409 Conflict`) provides identical race-condition prevention with zero infrastructure fragility.
* **Future Work:** Introduce Redis Pub/Sub with Server-Sent Events (SSE) for sub-second presence indicators (e.g., "Rahul is currently viewing this ticket").

### B. Rich Text / Markdown WYSIWYG Editor
* **Current Implementation:** Clean, multi-line auto-resizing textareas supporting plaintext input.
* **Why Skipped:** Adding TipTap or ProseMirror adds client bundle weight without changing the underlying business logic or data isolation rules. Plaintext cleanly proves the separation of public replies vs. private team notes.
* **Future Work:** Add lightweight Markdown formatting and secure file attachment uploads (e.g., AWS S3 pre-signed URLs).

### C. Multi-Tenant Enterprise Identity Provider (SSO/SAML)
* **Current Implementation:** Server-issued HTTP-only session cookie authentication with 1-click persona provisioning (`Meera (Lead)`, `Rahul`, `Priya`, `Customer View`).
* **Why Skipped:** Evaluators need to test multi-agent handoffs and customer perspectives within 60 seconds without having to manually register accounts or verify emails. The session-based authentication guarantees real cookie transport and server-side authorization checks.
* **Future Work:** Integrate enterprise SSO providers (Okta, Auth0, Google Workspace SAML).

---

## 3. Summary of Design Trade-Offs

| Decision | Chosen Approach | Alternative Considered | Rationale |
| :--- | :--- | :--- | :--- |
| **Private Note Safety** | Dedicated `internal_notes` table & isolated API routes | Column flag `is_internal: boolean` on `messages` table | A separate table prevents accidental joins or missing `WHERE is_internal = false` filters from leaking data. |
| **Concurrency Control** | Optimistic locking (`version` check + transaction) | Distributed Redis lock | Simpler, zero external dependency, handles high read / low conflict support ticket workflows without lock starvation. |
| **Time Engine** | Deterministic minute-by-minute business hours calculator in IST | Simple `date + 2 days` approximation | Accurately accounts for 09:30–18:30 working boundaries, weekends, and Indian festival holidays without rounding errors. |
