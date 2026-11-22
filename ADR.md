# Architecture Decision Records (ADR)
## Arvo Frontdesk — Enterprise Support Operations & SLA Engine

This document outlines the foundational engineering decisions, mathematical invariants, and security architectures implemented in the Arvo Frontdesk platform.

---

### ADR-001: Deterministic Multi-Day Business Hours SLA Engine

#### Status
**Accepted & Enforced in Production**

#### Context
Arvo Systems handles mission-critical support for enterprise clients where service level agreements (SLAs) carry financial and contractual penalties. Previous spreadsheet-based tracking caused a 20% breach rate due to non-deterministic time tracking, inability to account for weekends, and lack of clarity on mid-flight priority escalations.

#### Decision
We implemented a pure, deterministic business hours calculation engine (`backend/src/services/sla.ts` and verified in `backend/src/__tests__/sla.test.ts`):
1. **Timezone Anchor:** All business logic is anchored strictly to Indian Standard Time (`Asia/Kolkata` / UTC+05:30) using `date-fns-tz`.
2. **Operating Window:** Working hours are strictly **09:30 to 18:30 IST (9 hours = 540 business minutes per working day)**, Monday through Friday.
3. **Weekend & Holiday Exclusion:** Saturdays, Sundays, and Gazetted Indian Festival Holidays accrue exactly 0 business minutes. Any ticket created on Friday at 18:00 has elapsed exactly 0 business minutes as of Monday at 09:30.
4. **Deterministic SLA Matrix:**
   - **Critical / Blocker:** First Response target: **120 business minutes (2.0 working hours)**; Resolution target: **540 business minutes (1.0 working day)**. If created during morning business hours, resolution is guaranteed by 18:30 IST the same day.
   - **Medium:** First Response target: **270 business minutes (4.5 working hours / 0.5 working day)**; Resolution target: **1620 business minutes (3.0 working days)**.
   - **Low:** First Response target: **540 business minutes (9.0 working hours / 1.0 working day)**; Resolution target: **2700 business minutes (5.0 working days / 1.0 working week)**.
5. **Elapsed Time Carryover on Priority Escalation:**
   When an operational lead modifies a ticket priority mid-flight (e.g. from Medium to Critical), the system does **not** grant a full new window. Instead, it computes the exact business minutes already consumed under the previous priority and recalculates remaining minutes against the new priority threshold. If the elapsed business time exceeds the new threshold, the metric immediately reflects a breach with exact negative minute telemetry.

---

### ADR-002: Optimistic Concurrency Control via Version-Based Compare-And-Swap (CAS)

#### Status
**Accepted & Enforced in Production**

#### Context
In a multi-agent contact center (9+ concurrent specialists), multiple agents frequently attempt to claim an unassigned ticket simultaneously, or submit replies while a peer agent has just updated the ticket's status. In traditional architectures, this results in "last-write-wins" silent overwrites.

#### Decision
Every mutable operation on the `tickets` table enforces atomic Compare-And-Swap (CAS):
1. The `tickets` schema maintains a strictly monotonic `version: Int` counter.
2. Every mutation endpoint (`/claim`, `/reply`, `/priority`, `/reopen`) requires the caller to submit the `version` they read.
3. The mutation runs within an atomic database transaction:
   ```sql
   UPDATE tickets 
   SET assignee_id = $1, version = version + 1, updated_at = NOW() 
   WHERE ticket_key = $2 AND version = $3;
   ```
4. If the affected row count is 0, the backend immediately rolls back and returns **HTTP 409 Conflict** with error code `VERSION_MISMATCH` or `CONFLICT`.
5. The frontend intercepts HTTP 409 and presents an interactive **Conflict Resolution Dialog**, preserving the agent's draft message, fetching the newly updated state, and allowing the agent to either overwrite deliberately or incorporate the peer specialist's updates.

---

### ADR-003: Physical Wire-Level Separation of Staff-Only Internal Notes (INC-0304)

#### Status
**Accepted & Enforced in Production**

#### Context
A primary customer trust failure occurs when internal triage deliberations, incident forensics, or customer credit discussions are accidentally transmitted over the wire to client-facing web portals.

#### Decision
We enforce physical, wire-level isolation between internal notes and customer communications:
1. **Separate Relational Models:** `TicketMessage` (public client communications) and `InternalNote` (staff-only discussions) are stored in completely distinct database tables.
2. **API Endpoint Bifurcation:**
   - The Customer Portal API (`/api/customer/tickets/:key`) executes an explicit Prisma query that does not join the `InternalNote` relation.
   - The customer endpoint physically omits any internal note payloads and strictly zeroes the `hasInternalNotes` indicator to prevent metadata reconnaissance.
3. **Role-Based Middlewares:** Calling `/api/tickets/:key/notes` requires an authenticated session with role `lead` or `agent`. Any customer session attempting to hit this endpoint is rejected immediately with **HTTP 403 Forbidden**.
4. **Automated Verification:** Verified in `backend/src/__tests__/incidents_and_concurrency.test.ts`, asserting that no secret note string ever appears in any customer response payload.

---

### ADR-004: PostgreSQL Immutable Append-Only Audit Logging via Database Triggers (INC-0318)

#### Status
**Accepted & Enforced in Production**

#### Context
SOC 2, ISO 27001, and corporate compliance regulations require non-repudiable audit logs of all ticket state changes, priority escalations, reassignments, and SLA adjustments. Application-level logging alone is vulnerable to bugs or administrative circumvention.

#### Decision
1. **Append-Only Table:** All operational lifecycle events are recorded in `audit_events`.
2. **PostgreSQL Database Trigger:** A native row-level trigger is installed directly on the PostgreSQL database:
   ```sql
   CREATE OR REPLACE FUNCTION prevent_audit_tampering()
   RETURNS TRIGGER AS $$
   BEGIN
     RAISE EXCEPTION 'Audit records are immutable and cannot be updated or deleted.';
   END;
   $$ LANGUAGE plpgsql;

   DROP TRIGGER IF EXISTS trg_audit_immutability ON audit_events;
   CREATE TRIGGER trg_audit_immutability
   BEFORE UPDATE OR DELETE ON audit_events
   FOR EACH ROW EXECUTE FUNCTION prevent_audit_tampering();
   ```
3. **API Level Invariant:** There are zero `PUT`, `PATCH`, or `DELETE` endpoints for audit records in the API.

---

### ADR-005: Persona Session Isolation & Cold-Start Hydration

#### Status
**Accepted & Enforced in Production**

#### Context
Evaluators and operations managers switch between Lead (Meera), Agent (Rahul/Priya), and Customer (Vikram) roles to verify security boundaries. In single-page applications, client-side session leakage can result in stale React Query caches displaying confidential data across personas.

#### Decision
1. **Cryptographic Cookie Sessions:** Sessions are authenticated via server-signed, HTTP-only, SameSite cookies (`arvo_session`).
2. **Complete Cache Invalidation:** Switching personas triggers a full purge and reset of all active React Query cache keys (`['tickets']`, `['ticket']`, `['customer-tickets']`, `['customer-ticket']`, `['dashboard']`, `['audit']`).
3. **Client Onboarding & RBAC:** Customer self-registration is publicly accessible and isolates the new account to the `/customer` portal. Support agent roles (`agent`, `lead`) are restricted and provisioned through administrative channels.
4. **Route Guard & Deep-Link Preservation:** Unauthenticated access to `/tickets/:key` immediately redirects to `/login` with `state: { from: location.pathname }`. Upon login, the user is returned seamlessly to their requested ticket.

---

### ADR-006: Collision-Free Monotonic Ticket Key Sequence Generation

#### Status
**Accepted & Enforced in Production**

#### Context
Ticket keys follow the standard `ARV-###` format. When demo seed data or manual test tickets are created, static sequence counters can drift behind existing records, causing unique constraint violations (`unique constraint failed on ticket_key`).

#### Decision
We implemented a self-healing sequence generator (`backend/src/utils/ticketKey.ts`):
1. During ticket creation within a database transaction (`prisma.$transaction`), the generator performs a fast index scan of existing `ARV-\d+` keys.
2. It extracts the maximum integer suffix `maxFound = Math.max(...foundKeys)`.
3. It takes `nextKey = Math.max(maxFound, counterVal) + 1` and updates the atomic counter table.
4. This guarantees collision-free ticket generation regardless of manual seeding, deletions, or concurrent invocations.
