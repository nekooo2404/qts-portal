# QTS Việt Nam ecosystem redesign design

- **Date:** 2026-08-04
- **Status:** Approved for planning
- **Scope:** Full redesign of the public website, client portal, and internal admin workspace under one unified QTS Việt Nam brand

## 1. Context

The current frontend mixes a public marketing site with authenticated workspaces, but the brand, information architecture, and UI language are still centered on `QTS One` and `Internal Portal` in several key surfaces, including [frontend/src/app/layout.tsx](../frontend/src/app/layout.tsx), [frontend/src/app/page.tsx](../frontend/src/app/page.tsx), [frontend/src/components/SiteHeader.tsx](../frontend/src/components/SiteHeader.tsx), and [frontend/src/components/portal/PortalShell.tsx](../frontend/src/components/portal/PortalShell.tsx).

The redesign will merge all frontends under a single company brand: **QTS Việt Nam**. This is not a backend rewrite. It is a deep frontend redesign that changes the public information architecture, the design system, and the product UI across the public site, client portal, and admin workspace while preserving the core auth, tenant, RBAC, and API model already implemented in the repository.

## 2. Final decisions already approved

1. **Brand unification:** Remove `QTS One` as the primary product/public brand. Public site, portal, and admin all use QTS Việt Nam.
2. **Scope:** Take the largest redesign option. Redesign the public site and also redesign portal/admin experience strongly, not just lightly polish it.
3. **Public site depth:** Build a full multi-page corporate website, not just a homepage or anchor landing page.
4. **Data policy:** Use strict placeholders for any unverified contact information, projects, testimonials, statistics, and article content.
5. **Public intake:** Extend the backend public contact flow so it supports the corporate form fields in the brief instead of mapping the new website onto the old security-only intake enum.
6. **Visual direction:** Premium enterprise technology design; restrained motion; no startup-gloss clichés, fake dashboards, or fabricated credibility claims.

## 3. Product vision

The finished experience will behave like one digital ecosystem with three modes:

- **Public website:** editorial, credible, conversion-oriented, Vietnamese-first corporate presence
- **Client portal:** clear, trustworthy workspace for customers to follow operations and service artifacts
- **Internal admin workspace:** high-signal operational command center for QTS teams

All three modes share one design system, one brand voice, one token set, and one interaction language. They do **not** look identical. Each surface optimizes for its own context:

- public = persuade and explain
- portal = reassure and coordinate
- admin = operate and act

## 4. Goals

### 4.1 Primary goals

- Make QTS Việt Nam immediately understandable as a mature technology company
- Make the public website feel custom-designed for QTS Việt Nam rather than a generic startup theme
- Create a consistent brand experience before and after login
- Upgrade portal/admin from serviceable UI into a polished professional workspace
- Preserve working backend behavior and route-level business logic unless redesign needs a clearly scoped extension
- Keep all unsupported facts out of the experience

### 4.2 Non-goals

- Rewriting Google OIDC, sessions, RBAC, tenant scoping, or API authorization
- Changing business rules purely for aesthetic reasons
- Inventing projects, testimonials, customer logos, certifications, awards, or statistics
- Adding speculative features that are not in the brief

## 5. Technical constraints from the repository

- Frontend is a Next.js 16 App Router app in `frontend/`
- Public routes and authenticated routes already coexist under the same frontend app
- Backend already supports `POST /api/v1/contact-requests` and shows new requests inside the internal workspace
- The current public contact contract is security-oriented and does **not** match the corporate brief
- Existing public routes include `bang-gia`, `khach-hang`, `tai-nguyen`, and `ve-qts`; these must be reconciled with the new IA
- The redesign must continue to work inside the monorepo without breaking backend integration

## 6. Architecture overview

### 6.1 Surface model

The frontend will remain one Next.js application with three branded surface families:

1. **Public marketing surface**
   - `/(public)` style pages rendered with a light editorial shell
   - Strong SEO metadata and structured content
2. **Client portal surface**
   - `/portal/*`
   - Authenticated workspace for customers
3. **Internal operations surface**
   - `/admin/*`
   - Authenticated workspace for internal operators

### 6.2 Design system model

The redesign uses one token system and one component library with three presentation modes:

- **public mode**
- **portal mode**
- **admin mode**

The same primitives power all surfaces: button, field, select, checkbox, tabs, badge, dialog, drawer, table primitives, skeleton, empty state, feedback message, and section containers. Variants adapt by mode rather than each surface inventing its own UI language.

### 6.3 Backend relationship

The redesign keeps the backend as the source of truth for auth, permission, tenant isolation, session state, audit, and contact intake persistence. Frontend changes may extend API payloads and page presentation, but should not bypass existing backend enforcement.

## 7. Public information architecture

### 7.1 Canonical public routes

The new public site will use these primary routes:

- `/` — Trang chủ
- `/gioi-thieu` — Giới thiệu
- `/dich-vu` — overview dịch vụ
- `/dich-vu/[slug]` — chi tiết dịch vụ
- `/giai-phap` — overview giải pháp
- `/giai-phap/[slug]` — chi tiết giải pháp
- `/du-an` — danh sách dự án / case study placeholders
- `/du-an/[slug]` — chi tiết dự án placeholder
- `/tin-tuc` — danh sách bài viết placeholder
- `/tin-tuc/[slug]` — chi tiết bài viết placeholder
- `/lien-he` — trang liên hệ và form tư vấn
- `/phap-ly/bao-mat`
- `/phap-ly/dieu-khoan`

### 7.2 Route reconciliation with the current app

The current public IA must be cleaned up to match the approved corporate IA.

- `/ve-qts` will be retired and redirected to `/gioi-thieu`
- `/khach-hang` will be retired and redirected to `/du-an`
- `/tai-nguyen` will be retired and redirected to `/tin-tuc`
- `/bang-gia` will be retired from the main IA and redirected to `/lien-he` because no verified pricing data is available for a public pricing page
- `/ho-tro` will be retired from the public IA and redirected to `/lien-he`, because customer support belongs inside the authenticated portal and the public site should route support intent through the consultation/contact flow
- `/company` will be removed and redirected to `/gioi-thieu`
- `/login` stays as the authentication entry point and is reachable from the public header utility action
- The sitemap and canonical metadata must be updated to reflect the new routes only

Redirects are implemented as permanent redirects so existing indexed URLs do not become dead ends.

### 7.3 Public header model

Primary navigation:

- Trang chủ
- Giới thiệu
- Dịch vụ
- Giải pháp
- Dự án
- Tin tức
- Liên hệ

Global actions:

- Primary CTA: `Nhận tư vấn giải pháp`
- Secondary CTA where appropriate: `Xem dự án đã triển khai`
- Utility entry: `Đăng nhập hệ thống`

Header behavior:

- Transparent/minimal at the top of the homepage hero
- Solid after scroll
- Sticky across public pages
- Keyboard-accessible hover/focus states
- Accessible mobile drawer with prominent CTA

## 8. Homepage structure

The homepage must be the clearest expression of the QTS Việt Nam corporate story. It will contain all required sections from the brief, but arranged as a premium corporate composition rather than a repetitive landing page.

### 8.1 Final homepage sections

1. Sticky header
2. Hero
3. Business credibility
4. Services showcase
5. Featured solutions with accessible tabs
6. Why choose QTS Việt Nam
7. Featured projects placeholder section
8. Working process timeline
9. Company story
10. Testimonials placeholder section
11. Insights and news placeholder section
12. Final CTA with consultation form entry points
13. Enterprise footer

### 8.2 Homepage content rules

- No fake numbers
- Any unsupported metrics remain visibly bracketed placeholders
- Any unsupported projects, testimonials, or news items remain explicit placeholders
- Contact details remain placeholders until verified
- The hero must explain in under five seconds what QTS Việt Nam provides, who it serves, the value offered, and what action to take next

## 9. Public page templates

### 9.1 Overview template

Used for:

- Dịch vụ
- Giải pháp
- Dự án
- Tin tức

Template structure:

- compact page hero
- lead intro
- main listing/grid/filter block
- supporting trust or process content
- final CTA

### 9.2 Detail template

Used for:

- service details
- solution details
- project details
- article details

Template structure:

- page intro
- main narrative body
- supporting proof/structure block
- related links or next steps
- closing CTA

### 9.3 Trust template

Used for:

- Giới thiệu
- Liên hệ
- legal pages

Template structure:

- clear page heading
- narrative sections
- operational details or policy content
- CTA where appropriate

## 10. Public content model

### 10.1 Service taxonomy

The public website will use these six primary services:

- Thiết kế website
- Phát triển phần mềm
- Tư vấn chuyển đổi số
- Quảng cáo trực tuyến
- Digital Marketing
- Giải pháp công nghệ thông tin

Each service detail page must answer:

- customer problem
- QTS Việt Nam solution
- business benefit
- implementation framing
- next step CTA

### 10.2 Solution taxonomy

The public solution layer will organize around business needs:

- Giải pháp quản lý doanh nghiệp
- Giải pháp bán hàng trực tuyến
- Giải pháp chăm sóc khách hàng
- Giải pháp quản lý dữ liệu
- Giải pháp tự động hóa quy trình
- Giải pháp truyền thông và quảng cáo số

### 10.3 Placeholder policy

Strict placeholder handling is required:

- Projects: placeholder only
- Testimonials: placeholder only
- News/articles: placeholder only
- Company statistics: placeholder only when unverified
- Contact information: placeholder only when unverified

Placeholder content must be visually professional, clearly labeled, and impossible to mistake for verified production data.

## 11. Portal redesign

### 11.1 Brand model

The client portal no longer uses `Client Portal` as the primary branded identity. The branded frame is QTS Việt Nam, with a contextual sublabel such as `Cổng khách hàng` where needed.

### 11.2 Portal goals

- help customers understand current service state quickly
- make active work and outstanding issues obvious
- make tickets, documents, contracts, invoices, and knowledge easy to reach
- make the system feel stable, serious, and trustworthy

### 11.3 Portal information architecture

Portal navigation will be grouped by customer mental model:

**Tổng quan**
- Tổng quan

**Vận hành**
- Ticket
- Cảnh báo
- Tài sản
- License

**Hồ sơ dịch vụ**
- Hợp đồng
- Hóa đơn
- Tài liệu
- Tri thức

**Tổ chức**
- Thành viên
- Nhật ký hoạt động

The existing route structure can stay intact where practical, but labels, navigation grouping, and page composition must change to match this IA.

### 11.4 Portal page model

Every portal resource page should use a shared structure:

- page title and concise description
- contextual quick actions
- filter/search/sort controls where relevant
- content region
- empty/loading/error/denied states
- detail drawer or panel for supporting actions instead of navigation sprawl

### 11.5 Portal dashboard model

The dashboard becomes an action-oriented service overview rather than a loose KPI collection. It should prioritize:

- current service status
- active tickets
- new or important alerts
- new documents or updates
- renewals or contracts needing attention
- clear next actions

## 12. Admin redesign

### 12.1 Brand model

The internal workspace becomes a QTS Việt Nam operations product, not `Internal Portal`. Use a contextual label such as `Trung tâm vận hành` under the shared QTS Việt Nam brand.

### 12.2 Admin goals

- prioritize what internal teams need to act on now
- make multi-tenant context obvious
- reduce the feeling of a long undifferentiated sidebar
- increase hierarchy, readability, and operational confidence

### 12.3 Admin information architecture

Admin navigation will be grouped by internal work rather than flat resource listing:

**Điều phối vận hành**
- Tổng quan
- Cảnh báo
- Điều phối ticket
- Ca trực SOC

**Khách hàng & triển khai**
- Khách hàng
- Thành viên
- Tài sản
- License
- Hợp đồng
- Hóa đơn

**Tri thức & tài liệu**
- Tài liệu
- Tri thức

**Tích hợp & kiểm soát**
- Tích hợp
- Audit

### 12.4 Admin command center

The default admin landing page should become a command center with:

- prioritized alerts/incidents
- ticket workload and assignments
- tenant health summaries
- contact requests or new business intake visibility
- recent activity and updates
- operational queues rather than just decorative metric blocks

### 12.5 Tenant context

Tenant switching stays as part of the workspace because it reflects actual business logic. The redesign must make tenant context explicit in the header and page title row so users always know whether they are viewing all tenants or a specific customer scope.

## 13. Design system

### 13.1 Typography

Primary typeface: **Be Vietnam Pro**

Secondary utility face: existing monospace only for technical metadata, timestamps, or labels that benefit from monospaced alignment.

Typography rules:

- strong but readable headings
- comfortable Vietnamese body text
- consistent scale across public, portal, and admin
- tighter density in admin than in public pages
- avoid overusing all caps outside small labels or short CTAs

### 13.2 Color direction

- Primary brand base: deep navy / dark technology blue
- Main accent: electric blue / cyan
- Secondary accent: subtle violet used sparingly
- Public background: white and cool gray with occasional deep navy contrast sections
- Portal surface: neutral/cool light surfaces with controlled accent usage
- Admin surface: dark navy/graphite workspace with clear separation and strong contrast

### 13.3 Visual rules

Strictly avoid:

- random purple gradients
- heavy glow
- decorative blobs
- glassmorphism-heavy panels
- repeated generic 3-column cards everywhere
- fake dashboards or fake analytics visuals on the marketing site
- excessive shadows or pill overload

### 13.4 Token groups

Create reusable tokens for:

- brand colors
- text colors
- backgrounds
- borders
- focus ring
- shadows
- radius
- spacing
- container widths
- typography scale
- motion timing
- easing

## 14. Layout rules by surface

### 14.1 Public mode

- editorial grid
- asymmetrical hero layouts where helpful
- varied section rhythm
- strong spacing and visual hierarchy
- premium but restrained use of bento or split compositions
- no card-everything design

### 14.2 Portal mode

- structured workspace shell
- clear page header and status zones
- easy scanning of lists, documents, and service artifacts
- more neutral than public marketing surfaces

### 14.3 Admin mode

- dark operational shell
- higher information density
- stronger priority zoning
- tables, queues, filters, and panels optimized for real work
- less decoration than public or portal surfaces

## 15. Motion

Use Motion for React for restrained, purposeful motion.

Required motion patterns:

- staggered hero reveal
- sticky header transition
- scroll-based section reveal
- subtle image or block reveal
- link arrow movement
- button press feedback
- card/media hover zoom kept minimal
- tab transition
- timeline progress animation
- form success/error feedback
- mobile menu transition

Reduced motion behavior:

- remove large translations
- remove non-essential sequencing
- keep only simple fades and essential feedback

## 16. Accessibility

Target WCAG 2.2 AA.

Required accessibility behavior:

- semantic HTML
- logical heading hierarchy
- skip-to-content link
- visible focus states
- keyboard navigation
- accessible mobile menu, tabs, dialogs, and any carousel
- descriptive form labels
- field-level validation feedback
- screen reader announcements for important form states
- sufficient contrast in both light and dark surfaces
- no clickable `div` replacements for real controls

## 17. Performance

The redesign must favor excellent Core Web Vitals:

- server components by default in the App Router
- client components only for interactive UI
- Next.js `Image` where real images are used
- responsive image sizing
- lazy loading below the fold
- minimal client-side JavaScript
- no autoplay video backgrounds
- no animation that causes layout thrash

## 18. SEO and metadata

The new public site must implement:

- Vietnamese metadata across pages
- homepage title: `QTS Việt Nam – Thiết kế Website, Phần mềm và Giải pháp Công nghệ`
- homepage description aligned with the approved brief
- Open Graph and Twitter metadata
- canonical URLs aligned to the new IA
- Organization schema
- LocalBusiness schema where appropriate
- Service schema where appropriate
- sitemap and robots updated to match the new route set

## 19. Consultation form and public intake redesign

### 19.1 Existing mismatch

The current public intake endpoint exists, but its payload model is still oriented to older security service categories. The validation in [backend/src/portal-schema.js](../backend/src/portal-schema.js) and the database constraint in [backend/migrations/006_contact_requests.up.sql](../backend/migrations/006_contact_requests.up.sql) do not match the approved corporate website brief.

### 19.2 New intake form fields

The redesigned public consultation form must support:

- Họ và tên
- Số điện thoại
- Email
- Tên doanh nghiệp
- Dịch vụ quan tâm
- Nội dung cần tư vấn
- Consent checkbox

### 19.3 New service-interest taxonomy

The backend and frontend intake flow should use a service-interest taxonomy aligned to the new corporate site:

- `website-design`
- `software-development`
- `digital-transformation`
- `online-advertising`
- `digital-marketing`
- `it-solutions`

### 19.4 Intake behavior

The redesign should extend the **existing** public intake pipeline rather than create a parallel system. The internal workspace must continue to surface new contact requests, but with the new richer corporate lead fields.

### 19.5 Form UX states

The consultation form must include:

- client-side validation
- loading state
- success state that explains what happens next
- failure state with recovery guidance
- accessible error messages
- anti-spam-ready architecture

## 20. Content and imagery strategy

### 20.1 Public imagery

Do not use generic stock photography. When real company photography is unavailable, prefer custom UI-based compositions, structured abstract system visuals, and clearly labeled placeholder image frames over fake enterprise stock scenes.

### 20.2 Story imagery

For the company story section, avoid fake lifestyle photography. Use either authentic provided assets or a crafted placeholder visual treatment that clearly reads as a stand-in.

### 20.3 Workspace visuals

Portal and admin should rely primarily on real UI structures, icons, data states, and layout hierarchy rather than decorative art.

## 21. Component architecture

The redesign should standardize reusable components roughly along these groups:

### 21.1 Shared UI primitives

- Button
- Input
- Textarea
- Select
- Checkbox
- Tabs
- Badge
- Tooltip
- Dialog
- Drawer
- Table primitives
- Skeleton
- Empty state
- Inline feedback
- Section container

### 21.2 Public composites

- Header
- Mobile navigation drawer
- Hero
- Section heading
- Service showcase
- Solution tabs
- Case study block
- Process timeline
- Testimonial block
- Article card
- Consultation form
- Final CTA
- Footer

### 21.3 Portal/admin composites

- Workspace shell
- Sidebar/navigation groups
- Context header
- Summary/status strip
- Resource header
- Filter bar
- Data table/list patterns
- Detail drawer/panel
- Activity or audit timeline
- Operational queue panels
- Command center modules

## 22. Data flow and state rules

### 22.1 Public data model

Most public marketing content should come from typed local content/data files because verified company content is limited and must be controlled carefully.

### 22.2 Workspace data model

Portal and admin continue consuming the current backend APIs. The redesign changes their presentation, grouping, and interaction patterns rather than replacing their underlying data contract, except for the approved public intake extension.

### 22.3 State design

Every meaningful surface must have explicit handling for:

- loading
- empty
- error
- denied
- success
- disabled
- refreshing/stale where relevant

## 23. Testing and verification requirements

The implementation plan that follows this spec must verify:

- type safety and linting
- no hydration errors
- no console errors
- public CTA visible above the fold
- keyboard navigation across public nav, tabs, dialogs, drawer, and form
- reduced-motion behavior
- no horizontal overflow on 1440, 1280, 1024, 768, 390, and 320 widths
- functioning links, buttons, tabs, menus, and form states
- portal/admin brand rename completed consistently
- public intake works with the new corporate payload shape
- SEO metadata and structured data render correctly

## 24. Delivery phasing

This spec intentionally covers a large surface area. It must be implemented in ordered phases, each independently shippable and verifiable, rather than as one undifferentiated change.

### Phase 1 — Foundation and brand unification

- Establish the token system, typography, and shared UI primitives
- Remove `QTS One` and `Internal Portal` as brands across all surfaces
- Apply the unified brand shell to public, portal, and admin

Shippable outcome: one consistent brand and design foundation with no IA changes yet.

### Phase 2 — Public website

- Build the new public IA, routes, redirects, templates, and homepage
- Implement public composites, motion, SEO metadata, and structured data
- Implement the consultation form UI with full states against the existing contract shape

Shippable outcome: the complete corporate website.

### Phase 3 — Public intake extension

- Extend the backend contact-request schema, validation, migration, and internal surfacing to the new corporate lead fields and service taxonomy
- Connect the consultation form to the extended contract

Shippable outcome: corporate lead capture working end to end.

### Phase 4 — Portal redesign

- Apply the new navigation grouping, dashboard model, and shared resource page structure
- Implement portal state coverage and mobile patterns

Shippable outcome: redesigned customer workspace.

### Phase 5 — Admin redesign

- Apply the operational grouping, command center, tenant context header, and dense resource patterns

Shippable outcome: redesigned internal operations workspace.

Phase 1 and Phase 2 deliver the core of the approved brief. Phases 3 through 5 extend the same system outward. Each phase ends with the verification checklist in section 23 applied to the surfaces it touched.

## 25. Definition of done

This redesign is done when:

- the website clearly represents QTS Việt Nam as an established technology company
- visitors understand the service offering within seconds
- the design feels custom-made and premium
- public, portal, and admin read as one ecosystem
- unsupported facts have not been invented
- Vietnamese content renders correctly
- mobile layouts are intentional, not collapsed desktop views
- motion is smooth and restrained
- accessibility requirements are met at the intended level
- there are no broken interactions or obvious dead ends
- the product is ready for real company content and future backend integration improvements
