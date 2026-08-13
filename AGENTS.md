# Product Requirements Document: APEA — School Pickup Authorization Platform

**Status:** Draft v2
**Owner:** Samuel
**Last updated:** 2026-08-13

---

## 1. Overview

APEA is a multi-tenant SaaS platform that lets schools verify, in real time, who is authorized to pick up a given student. Guardians manage a digital authorization list for their children (standing or one-time authorized pickup people); school security staff verify pickups at the gate via QR code or backup code, with live server-side validation and instant SMS notifications to guardians.

## 2. Problem Statement

School pickup is a high-frequency, high-stakes moment with weak verification in most schools today — often just a name on a clipboard or visual recognition by staff. This creates risk of unauthorized pickups (custody disputes, impersonation, human error) and gives schools no reliable audit trail. Parents also have no visibility into who picked up their child or when.

## 3. Goals

- Give guardians real-time control over who can pick up their child, including same-day one-off authorizations.
- Give school staff a fast, reliable way to verify a pickup person's identity and authorization at the gate.
- Give schools an audit trail of every pickup event.
- Support multiple schools under a single organizational (district/school-group) account.
- Keep the verification flow fast enough not to create gate congestion.

## 4. Non-Goals (MVP)

- Offline verification (explicitly dropped — system requires connectivity at the gate).
- Facial recognition / biometric matching (manual visual confirmation by guard is sufficient for MVP).
- Payments or billing flows.
- Parent-to-parent messaging or scheduling features.
- Cross-organization guardian accounts (a guardian with kids at schools under different organizations needs separate accounts per organization).

## 5. Personas

| Persona | Description | Core need |
|---|---|---|
| Guardian | Parent/legal guardian of a student | Control and visibility over who can pick up their child |
| Authorized Person | Someone a guardian has granted pickup rights to (nanny, grandparent, coworker, etc.) | A simple, presentable digital ID to show at the gate |
| Security Guard / Staff | Front-line school staff verifying pickups | Fast, unambiguous verification with minimal training needed |
| School Admin | Manages roster, staff, and disputes | Oversight, audit trail, authority to resolve custody/access conflicts |

## 6. User Stories

**Guardian**
- As a guardian, I can see all my children linked to APEA.
- As a guardian, I can add a person to my child's standing authorized pickup list.
- As a guardian, I can grant a same-day (daily) authorization to someone not normally on the list.
- As a guardian, I can revoke a standing or daily authorization I granted at any time.
- As a guardian, I receive an SMS the moment my child is picked up, including who picked them up.
- As a guardian, I cannot revoke another guardian's (e.g. co-parent's) right to pick up our shared child — only a school admin can do that.

**Authorized Person**
- As an authorized person, I have a digital ID (photo, name, relationship) with a QR code and backup numeric code.
- As an authorized person, my daily authorization is valid for the full day it was granted, even across multiple pickups (e.g. re-entry).

**Security Guard**
- As a guard, I scan a QR code (or enter a backup code) and instantly see whether the person is authorized for the specific child being picked up.
- As a guard, I see a photo of the authorized person and the child side by side to visually confirm the match before completing the pickup.
- As a guard, every completed or denied pickup attempt is logged automatically.

**School Admin**
- As an admin, I upload/manage the student and guardian roster for my school.
- As an admin, I manage staff accounts and roles (guard vs admin).
- As an admin, I am the only one who can revoke a guardian's own pickup rights for a student (e.g. in a custody dispute).
- As an admin, I can view a full audit log of pickup events, filterable by student, date, or staff member.
- As an admin, I manage schools within my organization (if multi-school).

## 7. Functional Requirements

### 7.1 Multi-Tenancy
- `Organization` is the top-level tenant. An organization can contain multiple `School` records.
- `Guardian` and `AuthorizedPerson` are scoped to a single `Organization` (not global) — strict tenant data isolation.
- `Staff` and `Student` are scoped to a `School`, which belongs to an `Organization`.
- All API queries must be scoped by `organizationId` (and `schoolId` where applicable) to prevent cross-tenant data access.

### 7.2 Roster Management
- School admin uploads/manages student roster (name, photo, class/grade, school).
- School admin uploads/manages guardian records and links them to students via `GuardianStudentLink`, including `relationship` and `isPrimary`.
- A student can have multiple guardians (e.g. mother and father).

### 7.3 Authorization Management
- A guardian can grant pickup authorization to an `AuthorizedPerson` for a specific student.
- Two authorization types:
  - **Standing** — indefinite validity until explicitly revoked.
  - **Daily** — valid only for the calendar day it was granted (`validFrom`–`validUntil` = that day), but supports multiple pickups within the day (not single-use).
- A guardian can revoke any `AuthorizationLink` they personally granted, at any time, with immediate effect.
- A guardian **cannot** revoke a `GuardianStudentLink` (another guardian's own right to pick up the shared child) — only school admin (`Staff.role == admin`) can revoke this, with a required `revocationReason` logged.

### 7.4 Digital ID & QR/Code
- Each `AuthorizationLink` is represented by a signed QR token (encoding student, authorized person, and validity window) plus a 6-digit fallback code.
- QR tokens are cryptographically signed to prevent forgery.

### 7.5 Gate Verification
- Guard scans QR or enters fallback code via a camera-enabled web app (PWA) on a smartphone/tablet.
- System performs a live server-side check:
  1. Token signature is valid.
  2. Corresponding `AuthorizationLink` (or `GuardianStudentLink`, for a guardian's own pickup) is `active` and within its validity window.
  3. Returns match details: student photo/name, pickup person photo/name, relationship, and APPROVED/DENIED status.
- Guard visually confirms the match and taps to complete the pickup, creating a `PickupEvent` record.
- Denied attempts are also logged, with a reason (expired, revoked, not found).

### 7.6 Notifications
- Guardian receives an SMS the moment their child is picked up, including who picked them up and the time.
- SMS sent via a third-party SMS gateway/provider (e.g. Termii, Africa's Talking, or Twilio — evaluate for Nigeria deliverability/cost).
- Delivery status (sent/failed) tracked per notification for retry/monitoring purposes.

### 7.7 Admin Dashboard
- View and manage roster, staff, and schools (if multi-school org).
- Revoke `GuardianStudentLink` records with mandatory reason logging.
- View full `PickupEvent` audit log with filters (student, date range, staff member, status).

## 8. Non-Functional Requirements

- **Security:** All authorization checks enforced server-side (never trust client-side state). QR tokens signed (HMAC or JWT) with short-lived validity where applicable. Passwords hashed (bcrypt or equivalent).
- **Tenant isolation:** No query path may return data across `Organization` boundaries. Enforce at the ORM/query layer, not just UI.
- **Availability:** Gate verification depends on live connectivity — target school WiFi/data reliability should be confirmed with pilot schools before rollout, since there is no offline fallback in MVP.
- **Performance:** Gate verification round-trip should complete in under ~2 seconds to avoid pickup-line congestion.
- **Auditability:** Every pickup attempt (approved or denied) and every authorization change (grant/revoke) must be logged with actor, timestamp, and reason where applicable.

## 9. Full Data Model

### Organization
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | string | |
| plan | string | subscription tier |
| createdAt | datetime | |

### School
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| organizationId | uuid | FK → Organization |
| name | string | |
| address | string | |
| contactEmail | string | |
| contactPhone | string | |
| createdAt | datetime | |

### Staff
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| schoolId | uuid | FK → School |
| name | string | |
| email | string | |
| phone | string | |
| role | string | `admin` \| `guard` |
| passwordHash | string | |
| createdAt | datetime | |

### Guardian
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| organizationId | uuid | FK → Organization |
| name | string | |
| email | string | |
| phone | string | used for SMS delivery |
| passwordHash | string | |
| photoUrl | string | |
| createdAt | datetime | |

### Student
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| schoolId | uuid | FK → School |
| firstName | string | |
| lastName | string | |
| photoUrl | string | |
| dateOfBirth | date | |
| classGrade | string | |
| status | string | `active` \| `inactive` |
| createdAt | datetime | |

### GuardianStudentLink
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| guardianId | uuid | FK → Guardian |
| studentId | uuid | FK → Student |
| relationship | string | e.g. mother, father, legal guardian |
| isPrimary | boolean | |
| status | string | `active` \| `revoked` |
| revokedByStaffId | uuid | FK → Staff, nullable, must be `role == admin` |
| revokedAt | datetime | nullable |
| revocationReason | string | nullable |
| createdAt | datetime | |

### AuthorizedPerson
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| organizationId | uuid | FK → Organization |
| name | string | |
| phone | string | |
| photoUrl | string | |
| idDocumentNumber | string | nullable, optional ID verification |
| createdAt | datetime | |

### AuthorizationLink
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| studentId | uuid | FK → Student |
| authorizedPersonId | uuid | FK → AuthorizedPerson |
| grantedByGuardianId | uuid | FK → Guardian |
| type | string | `standing` \| `daily` |
| validFrom | datetime | |
| validUntil | datetime | nullable for standing |
| status | string | `active` \| `expired` \| `revoked` |
| qrTokenHash | string | signed token reference |
| createdAt | datetime | |
| revokedAt | datetime | nullable |

### PickupEvent
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| studentId | uuid | FK → Student |
| authorizedPersonId | uuid | FK → AuthorizedPerson |
| authorizationLinkId | uuid | FK → AuthorizationLink, nullable if guardian self-pickup |
| scannedByStaffId | uuid | FK → Staff |
| schoolId | uuid | FK → School |
| method | string | `qr` \| `code` |
| timestamp | datetime | |
| status | string | `approved` \| `denied` |
| denialReason | string | nullable |

### Notification
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| guardianId | uuid | FK → Guardian |
| pickupEventId | uuid | FK → PickupEvent |
| type | string | e.g. `pickup_confirmation` |
| channel | string | `sms` |
| sentAt | datetime | |
| status | string | `sent` \| `failed` |

## 10. Tech Stack

**Frontend**
- Next.js — guardian dashboard and school admin dashboard (web)
- PWA (camera-enabled, browser-based) — guard-facing gate verification app; avoids needing a native app for MVP since guards use provided smartphones/tablets

**Backend**
- Express.js — REST API, business logic, auth
- Node.js runtime

**Database**
- MongoDB — consistent with existing team stack experience; schema enforced at the application/ODM layer (e.g. Mongoose) given the FK-heavy relational structure
- Alternative to evaluate: PostgreSQL, if stronger relational integrity/constraints are preferred over app-level enforcement — worth a quick spike given how relationship-heavy this schema is (many FKs, referential rules like admin-only revocation)

**Auth**
- JWT-based sessions for Guardian and Staff logins
- Role-based access control (`admin` vs `guard` for Staff)

**QR / Signed Tokens**
- HMAC-signed or JWT-based QR payloads (student ID, authorized person ID, expiry) — verifiable server-side without exposing internal DB IDs directly

**SMS**
- Third-party SMS gateway — Termii or Africa's Talking recommended for Nigeria deliverability/cost; Twilio as an international fallback option

**Hosting/Infra**
- API + web: containerized deployment (e.g. Render, Railway, or AWS) — to be finalized based on budget and scaling needs
- Object storage for photos (student, guardian, authorized person) — e.g. S3-compatible storage (AWS S3, Cloudflare R2)

## 11. Success Metrics (post-launch)

- % of pickups completed via QR/code verification (vs manual override, if any exists)
- Average gate verification time (target: under a few seconds)
- Number of denied/flagged pickup attempts caught (proxy for fraud/error prevention value)
- Guardian adoption rate (% of guardians who complete onboarding and add at least one authorized person)
- SMS delivery success rate
- School admin satisfaction / audit log usage frequency

## 12. Phased Rollout (see accompanying MVP Build Plan for detailed breakdown)

1. Foundation — multi-tenant setup, auth, org/school onboarding
2. Roster & guardian onboarding
3. Authorization management (standing + daily)
4. Gate verification (guard-facing PWA) — highest priority, core value prop
5. Notifications (SMS)
6. Admin dashboard & revocation controls

## 13. proposed folder structure

apea/
├── guardian-web/                     # Next.js — guardian dashboard
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── activate/page.tsx              # invite/claim account
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx                       # guardian dashboard (children list)
│   │   │   └── children/[studentId]/
│   │   │       ├── page.tsx                   # child detail
│   │   │       ├── authorized-people/page.tsx
│   │   │       └── history/page.tsx            # pickup history & notifications
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ChildCard.tsx
│   │   ├── AuthorizedPersonRow.tsx
│   │   ├── AddAuthorizedPersonModal.tsx
│   │   └── PickupHistoryItem.tsx
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── auth.ts
│   │   └── types.ts                            # or copy from server/src/types
│   ├── public/
│   ├── .env.local.example
│   └── package.json
│
├── admin-web/                        # Next.js — school admin dashboard
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx                       # overview
│   │   │   ├── roster/
│   │   │   │   ├── page.tsx                   # roster management
│   │   │   │   └── [studentId]/page.tsx        # student detail
│   │   │   ├── staff/page.tsx
│   │   │   ├── audit-log/page.tsx
│   │   │   ├── revoke-access/page.tsx
│   │   │   └── schools/page.tsx                # multi-school switcher/settings
│   │   └── layout.tsx
│   ├── components/
│   │   ├── StatCard.tsx
│   │   ├── RosterTable.tsx
│   │   ├── StaffTable.tsx
│   │   ├── AuditLogTable.tsx
│   │   ├── RevokeAccessDialog.tsx
│   │   └── SchoolSwitcher.tsx
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── auth.ts
│   │   └── types.ts
│   ├── public/
│   ├── .env.local.example
│   └── package.json
│
├── guard-pwa/                        # Next.js PWA — gate verification app
│   ├── app/
│   │   ├── login/page.tsx
│   │   ├── scan/page.tsx                       # camera viewfinder + code entry
│   │   ├── verify/[token]/page.tsx             # verification result
│   │   ├── confirm/page.tsx                    # confirm pickup
│   │   ├── denied/page.tsx
│   │   └── log/page.tsx                        # guard's pickup log
│   ├── components/
│   │   ├── QrScanner.tsx
│   │   ├── CodeEntryPad.tsx
│   │   ├── MatchCompareCard.tsx                # side-by-side photo verification
│   │   └── StatusBanner.tsx                    # APPROVED / DENIED
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── auth.ts
│   │   └── types.ts
│   ├── public/
│   │   ├── manifest.json                       # PWA manifest
│   │   └── icons/
│   ├── .env.local.example
│   └── package.json
│
├── server/                           # Express backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts
│   │   │   └── env.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts                         # JWT verification
│   │   │   ├── tenantScope.ts                  # enforces organizationId scoping
│   │   │   ├── requireRole.ts                   # admin vs guard checks
│   │   │   └── errorHandler.ts
│   │   ├── modules/
│   │   │   ├── organization/
│   │   │   │   ├── organization.routes.ts
│   │   │   │   ├── organization.controller.ts
│   │   │   │   ├── organization.model.ts
│   │   │   │   └── organization.service.ts
│   │   │   ├── school/
│   │   │   ├── staff/
│   │   │   ├── guardian/
│   │   │   ├── student/
│   │   │   ├── guardianStudentLink/
│   │   │   │   ├── ...
│   │   │   │   └── revoke.service.ts            # admin-only revocation logic
│   │   │   ├── authorizedPerson/
│   │   │   ├── authorizationLink/
│   │   │   │   ├── ...
│   │   │   │   ├── qrToken.service.ts            # signed token generation/validation
│   │   │   │   └── revoke.service.ts             # guardian-self revocation logic
│   │   │   ├── pickupEvent/
│   │   │   │   ├── ...
│   │   │   │   └── verify.service.ts             # live gate verification logic
│   │   │   └── notification/
│   │   │       ├── ...
│   │   │       └── sms.service.ts                # Termii/Africa's Talking integration
│   │   ├── routes/
│   │   │   └── index.ts                          # mounts all module routes
│   │   ├── types/                                # shared TS types, mirrored into frontends
│   │   │   ├── organization.ts
│   │   │   ├── student.ts
│   │   │   ├── guardian.ts
│   │   │   ├── authorizationLink.ts
│   │   │   ├── pickupEvent.ts
│   │   │   └── index.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   ├── .env.example
│   └── package.json
│
├── docs/
│   ├── apea-PRD.md
│   ├── apea-erd.md
│   └── apea-stitch-design-prompt.md
│
└── README.md

**Estimated MVP timeline:** 7–8 weeks (solo development)
