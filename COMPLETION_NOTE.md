# Completion Note — Engineering Decisions & Scope Analysis

**Candidate:** Full Stack Developer Candidate  
**Project:** Arvo Frontdesk  
**Date:** 21 November 2026  
**Time Spent:** ~8 hours

---

## 1. What Was Completed & Key Engineering Decisions

All functional rules embedded in Section 3 (Meeting Notes) and Section 4 (Incidents INC-0291, INC-0304, INC-0318) were successfully implemented end-to-end:

1. **Deterministic 9-Hour Business Engine:**
   * Calculated in working minutes (09:30–18:30 IST, Mon–Fri, 540 min/day, 45h/week) using `date-fns-tz` to eliminate UTC/local timezone drift.
   * Excludes weekends and Indian festival holidays.
   * Proved that tickets arriving Friday at 18:00 IST only accrue 30 working minutes before weekend closure and remain well within SLA on Sunday morning.

2. **Incident Solutions (Engineered at Data & Protocol Level):**
   * **INC-0291 (Double Claim Race Condition):** Implemented database transactions with optimistic concurrency control (`version` integer checking). Concurrent claim attempts result in a `409 Conflict` (`VERSION_MISMATCH` / `ALREADY_CLAIMED`), immediately notifying the second agent and syncing state.
   * **INC-0304 (Note Leak Prevention):** Isolated private notes into a separate `internal_notes` database table with dedicated agent-only endpoints. The customer endpoints (`/api/customer/*`) have no join or reference to this table, guaranteeing zero leakage in network payloads. The UI provides a "Poka-Yoke" dual-mode composer with an amber warning state.
   * **INC-0318 (Audit Trail):** Created an immutable, append-only `audit_log` table with millisecond-precision IST timestamps and structured metadata diffs. No `PUT`, `PATCH`, or `DELETE` endpoints exist.

3. **Mid-Flight Priority Recalculation:**
   * When priority changes mid-resolution, elapsed business minutes are preserved, and new SLA targets are applied against the remaining window.

4. **Inactivity Auto-Close & Reopen Policy:**
   * Auto-closes tickets after 5 working days (2,700 business minutes) of waiting on a customer.
   * Enforces a 5-working-day customer reopen limit, transitioning expired tickets into linked follow-up tickets.

5. **Demo Simulation Clock & Free-Tier Resilience:**
   * Exposed `/api/system/clock` and `/api/system/run-autoclose` to allow evaluators to test time-travel scenarios (weekend arrival, holiday skipping, 6-day auto-close sweep).
   * Implemented a branded cold-start wake-up screen with automatic query retry to handle Render free-tier spin-up latency smoothly.

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

### C. OAuth / Multi-Tenant Authentication Wall
* **Current Implementation:** Instant persona switcher (`Meera (Lead)`, `Rahul`, `Priya`, `Customer View`) that simulates authenticated roles directly in the header.
* **Why Skipped:** Evaluators need to test multi-agent handoffs and customer perspectives within 60 seconds. Adding an auth wall (NextAuth/Auth0) would require evaluators to manage credentials, register accounts, and log in/out repeatedly.
* **Future Work:** Implement JWT/session-based RBAC with SSO/SAML integration.

---

## 3. Summary of Design Trade-Offs

| Decision | Chosen Approach | Alternative Considered | Rationale |
| :--- | :--- | :--- | :--- |
| **Private Note Safety** | Dedicated `internal_notes` table & isolated API routes | Column flag `is_internal: boolean` on `messages` table | A separate table prevents accidental joins or missing `WHERE is_internal = false` filters from leaking data. |
| **Concurrency Control** | Optimistic locking (`version` check + transaction) | Distributed Redis lock | Simpler, zero external dependency, handles high read / low conflict support ticket workflows without lock starvation. |
| **Time Engine** | Deterministic minute-by-minute business hours calculator in IST | Simple `date + 2 days` approximation | Accurately accounts for 09:30–18:30 working boundaries, weekends, and Indian festival holidays without rounding errors. |
