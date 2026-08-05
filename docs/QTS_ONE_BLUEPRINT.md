# QTS One - Product and Architecture Blueprint

## 1. Product direction

QTS One is a unified digital-service platform for QTS and its customers. It is
not only a corporate website and it is not a collection of disconnected admin
screens.

The product has three primary surfaces:

1. **Corporate Website** for discovery, trust, SEO, pricing, case studies and
   lead generation.
2. **Client Portal** for ordering, delivery, operation, support, billing and
   governance of customer services.
3. **Internal Portal** for CRM, sales, project delivery, helpdesk, technical
   operations, security operations and finance.

Partner Portal, mobile applications, an integration marketplace, advanced SOC
automation and QTS AI Assistant are expansion surfaces, not MVP dependencies.

## 2. Product promise

> One platform to manage all technology services of a business.

QTS One must let a customer move through the complete service lifecycle:

```text
Discover -> Consult -> Quote -> Contract -> Deliver -> Approve
         -> Operate -> Support -> Invoice -> Renew
```

The public website creates demand. The Client Portal and Internal Portal must
continue the same customer journey without re-entering data or moving to an
untracked communication channel.

## 3. Architecture decision

The current repository remains the implementation baseline. QTS One will evolve
as a modular monolith with explicit domain boundaries before any service is
split out.

```text
Corporate Website + Client Portal + Internal Portal
                         |
                 Same-origin HTTP API
                         |
                 Modular Monolith
                         |
       PostgreSQL + private object storage
                         |
                Outbox and workers
```

The current Next.js frontend and Node.js/PostgreSQL backend are not rewritten
only to match a target technology list. Another framework migration is justified
only when it removes a measured limitation:

- Split the authenticated portals from the public Next.js application only when
  deployment ownership, release cadence or measured performance requires it.
- Introduce NestJS when module ownership, dependency injection and team scale
  make the current backend structure costly to maintain.
- Introduce a managed or self-hosted identity platform when customer SSO, SAML,
  passkeys, delegated administration or identity lifecycle automation becomes a
  committed requirement.
- Introduce OPA when policies must be authored and released independently from
  application code. Centralized backend authorization remains authoritative in
  the meantime.
- Introduce Redis or a message broker for real background work, retry,
  scheduling, distributed locking or throughput requirements; do not use it as
  an empty architectural layer.
- Use PostgreSQL search first. Introduce OpenSearch only after relevance, data
  volume or ingestion tests show that PostgreSQL is insufficient.
- Introduce Kubernetes, Kafka and ClickHouse only after operational load and
  team ownership justify their running cost.

## 4. Domain boundaries

| Module | Owns | MVP |
| --- | --- | --- |
| Identity and Organization | identities, users, organizations, memberships, sessions, invitations | Yes |
| CRM and Sales | leads, contacts, opportunities, activities, quotations | Basic |
| Catalog and Orders | services, plans, add-ons, orders, service instances | Yes |
| Projects and Delivery | projects, milestones, tasks, approvals, change requests, handover | Yes |
| Support and SLA | tickets, comments, SLA clocks, escalation, satisfaction | Yes |
| Assets and Operations | domains, hosting, servers, certificates, licenses, warranties | Yes |
| Contracts and Billing | contracts, appendices, invoices, payment records, renewals | Yes |
| Content and Knowledge | pages, case studies, articles, guides, release notes | Basic |
| Notifications | in-app notifications, preferences, delivery attempts | Basic |
| Security Operations | alerts, vulnerabilities, incidents, cases, playbooks | Existing baseline only |
| Integrations | credentials, webhooks, connectors, synchronization state | Inventory only |
| Audit and Policy | access decisions, business events, immutable audit evidence | Yes |

Each module owns its rules and persistence access. Cross-module behavior uses an
application service and a transactional outbox, not direct table updates spread
across unrelated modules.

## 5. Identity and multi-organization model

The current one-identity/one-membership shape is incompatible with QTS One. A
single identity must be able to work in multiple customer organizations and,
where authorized, in the QTS workforce workspace.

The target model is:

```text
Identity (issuer + subject)
  -> User
       -> OrganizationMembership -> Organization/Tenant
       -> WorkforceMembership    -> QTS internal organization

Organization
  -> Branch
  -> ProjectMembership
  -> ResourceGrant
```

Required invariants:

- `issuer + subject` identifies the external identity, never the email address.
- A user may have many organization memberships.
- A session has an explicit active organization and workspace.
- Switching organization re-resolves authorization server-side.
- Internal workforce access and customer access are separate memberships.
- Privileged identities are separate from daily workforce identities.
- Role assignment is scoped to an organization; project/resource grants narrow
  access further.
- Tenant or organization status is checked on login, session refresh and every
  protected request.
- Disabling a membership, organization or privileged role revokes affected
  sessions.

Authorization remains layered:

1. RBAC grants a capability by role.
2. Attributes constrain the capability by workspace, organization, status, MFA
   and request context.
3. Relationships constrain it to a project, contract, ticket or asset.
4. PostgreSQL RLS provides defense in depth for tenant-owned records.

## 6. Data rules

Every tenant-owned aggregate must include at least:

```text
id, tenant_id, status, version,
created_at, created_by, updated_at, updated_by
```

The following rules are mandatory:

- All repository queries establish tenant context inside the transaction.
- Browser-supplied tenant, role and ownership values are never trusted.
- Optimistic version checks protect concurrent updates.
- Contracts, invoices, approvals, tickets and audit evidence are not physically
  deleted through normal product flows.
- State changes follow explicit transition tables, not unrestricted status
  updates.
- Sensitive fields have classification, retention and redaction rules.
- Documents live in private object storage and pass type, size and malware
  validation before becoming downloadable.
- Audit records include actor, organization, action, target, result, timestamp,
  source context, correlation ID and justified before/after data.

## 7. MVP scope

The MVP proves one complete customer lifecycle, not every feature listed in the
product vision.

### Foundation and production hardening

1. Enforce tenant suspension and session revocation. **Implemented.**
2. Separate migration credentials from the runtime database role.
3. Complete invitation expiry, revocation and acceptance semantics. **Implemented.**
4. Close authorization gaps for target-member and cross-tenant operations.
5. Add state-transition rules, complete audit coverage and SLA lifecycle tests.
6. Add CI security gates, structured telemetry, backup/restore rehearsal and a
   production deployment runbook.

### QTS One core

1. Implement multi-organization identity, organization switching and scoped
   member management.
2. Connect public contact requests to the CRM lead pipeline.
3. Deliver a service catalog and service request/order lifecycle.
4. Deliver project workspaces with milestones, tasks, documents, approvals and
   change requests.
5. Complete ticket conversation, SLA escalation and customer feedback.
6. Unify contracts, invoices, renewal reminders and customer-visible status.
7. Add digital-asset expiry tracking and notification preferences.
8. Present one customer dashboard and one internal operations dashboard sourced
   only from persisted data.

### Deferred from MVP

- Full ITIL problem/change/release management.
- Automated SIEM/SOAR/EDR ingestion and full SOC case orchestration.
- Online payments, digital signatures and accounting synchronization.
- Google Ads, Meta Ads and TikTok Ads connectors.
- Partner Portal, marketplace, mobile application and learning certificates.
- Autonomous AI actions, data warehouse and advanced forecasting.
- Kubernetes, service mesh, Kafka and independent microservices.

## 8. Delivery roadmap

| Phase | Outcome | Exit signal |
| --- | --- | --- |
| 0. Harden | Existing portal has enforceable tenant, auth, workflow and audit guarantees | Security regression suite and staging gates pass |
| 1. Foundation | Multi-organization IAM and stable domain boundaries | User can switch organizations without cross-tenant access |
| 2. Core journey | Lead, order, project, support, contract, invoice and renewal form one traceable lifecycle | A real customer completes the journey in QTS One |
| 3. Automation | Notifications, SLA jobs, asset expiry, payment/signing and approved connectors | Retry, reconciliation and operational ownership are proven |
| 4. Ecosystem | Partner, mobile, AI, SOC automation and analytics | Capacity and business demand justify each subsystem |

Work is delivered as vertical slices. Each slice includes database migration,
authorization, API contract, audit, UI states, tests, observability and runbook
updates. A module is not complete when only its dashboard exists.

## 9. Experience principles

- One primary action per screen and predictable navigation by domain.
- Global search and command palette search only authorized resources.
- Dashboards display source scope and freshness, with explicit empty/error states.
- Customer and internal terminology differ where their mental models differ;
  shared data does not require identical screens.
- Vietnamese and English content is structured for localization.
- Portal interactions meet WCAG 2.2 AA, keyboard and responsive requirements.
- Notifications are actionable and configurable; they are not a second activity
  feed with no ownership.
- The public website adopts the conversion logic of mature SaaS products without
  copying their visual language.

## 10. Definition of done

A QTS One feature is done only when:

- tenant and resource-level authorization has positive and negative tests;
- state transitions, idempotency and concurrent updates are deterministic;
- important success and denial paths create usable audit evidence;
- loading, empty, error, denied and mobile states are implemented;
- logs, metrics and traces diagnose failures without exposing secrets;
- migrations have rollback or forward-recovery instructions;
- user-facing behavior and API contracts are documented;
- no synthetic fallback data hides an unavailable integration;
- security, accessibility and browser smoke checks pass.

## 11. Immediate implementation order

1. Finish the current production-hardening findings.
2. Write and approve the multi-organization migration ADR.
3. Migrate identity and membership without breaking existing sessions abruptly.
4. Add organization switching and permission regression tests.
5. Build CRM lead intake from the existing public contact request flow.
6. Add service catalog/order and project-delivery vertical slices.
7. Expand billing, asset renewal and notification automation.

This order keeps current functionality usable while creating the data foundation
that every later QTS One module depends on.
