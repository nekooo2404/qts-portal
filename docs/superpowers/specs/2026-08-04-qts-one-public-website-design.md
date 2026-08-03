# QTS One — Sub-project A: Public Website Foundation

Ngày: 2026-08-04
Trạng thái: đã được người dùng phê duyệt theo từng phần (Phần 1–4)

## 1. Bối cảnh

Brief "QTS ONE PORTAL" yêu cầu ba khu vực: Public Corporate Website, Client Portal và Internal/Admin Portal. Khối lượng này vượt phạm vi một spec, nên công việc được chia thành bốn sub-project độc lập, thực thi theo thứ tự người dùng đã chọn: **A → B → C → D**.

| Sub-project | Phạm vi |
| --- | --- |
| **A** (spec này) | Migration sang Next.js, design system marketing, homepage, các route public |
| B | Trải nghiệm đăng nhập và tài khoản |
| C | Redesign Client Portal |
| D | Redesign Internal/Admin Portal |

Spec này chỉ mô tả **A**. B, C, D sẽ có spec riêng.

### 1.1 Điểm khởi đầu thực tế của repository

Brief giả định repository chưa có frontend. Thực tế không phải vậy:

- Frontend là **React 19.2.8 + Vite 7.3.6 + TypeScript** (`frontend/package.json`), không phải Next.js, không có Tailwind.
- Routing tự viết bằng `pushState` + `useSyncExternalStore` (`frontend/src/lib/navigation.ts`), không có React Router.
- Design token là CSS custom property dạng OKLCH, ba lớp: `tokens.css` → `styles.css` → `portal.css`.
- Đã có substrate của shadcn: `class-variance-authority`, `clsx`, `@radix-ui/react-slot`, `@radix-ui/react-tooltip`, `lucide-react`.
- Backend là Node HTTP thuần, **chỉ** phục vụ `/api/*`; không phục vụ static asset.
- Production hiện tại: `frontend/dist/` trên static host, reverse proxy `/api/*` cùng public origin (`frontend/README.md`).
- Portal đã có nền tảng multi-tenant thật với PostgreSQL RLS, Google OIDC, CSRF, audit append-only.

Vì vậy nhánh "khởi tạo frontend mới" của brief §3.6 không áp dụng. Người dùng đã chọn **migrate toàn bộ sang Next.js** thay vì giữ Vite hoặc dựng app Next song song.

### 1.2 Bất biến hệ thống phải được bảo toàn

Từ `docs/QTS_WORKSPACE_SPEC.md` §3. Sub-project A không được vi phạm bất kỳ điều nào:

1. Browser không nhận Google Client Secret, authorization code, ID token hoặc access token.
2. Định danh ổn định là `issuer + subject`.
3. Tenant và role lấy từ membership gắn với session, không tin dữ liệu browser tự khai.
4. Client session chỉ truy cập tenant của chính nó.
5. Mutation cần CSRF; ticket create cần idempotency key.
6. Integration secret không trả về plaintext.
7. **UI không tạo record hoặc số liệu thay thế khi backend rỗng hoặc lỗi.**

Điều 7 chỉ áp dụng cho dữ liệu portal. Nội dung marketing tĩnh là nội dung biên tập, không phải dữ liệu backend — nhưng vẫn chịu các quy tắc trung thực ở §6 của spec này.

## 2. Kiến trúc migration

### 2.1 Render target: `output: 'export'`

Next.js chạy ở chế độ **static export**, không dùng `next start`.

Lý do: session cookie là `__Host-qts_session` (`backend/src/auth-service.js:139`). Tiền tố `__Host-` khóa cookie vào đúng một host, nên Next.js buộc phải cùng origin với `/api/*` — đúng như mô hình hiện tại. Static export giữ nguyên hợp đồng deploy (thư mục tĩnh + reverse proxy), không thêm trust boundary mới mà `QTS_WORKSPACE_SPEC.md` chưa phủ.

Những gì static export không có — middleware, route handler, ISR, dynamic OG image — QTS không cần cho phạm vi A.

Những gì brief cần và static export vẫn cung cấp đủ: App Router, file-based routing, layout lồng nhau, React Server Component cho nội dung tĩnh, metadata API, `sitemap.ts`, `robots.ts`, JSON-LD, per-route title/description/canonical.

### 2.2 Dynamic route: dùng được cho public, không dùng cho portal

- Slug **biết lúc build** (dịch vụ, giải pháp, case study — đều khai báo trong `content.ts`): dùng `generateStaticParams()`, mỗi trang sinh một file HTML, SEO đầy đủ.
- Slug **là dữ liệu tenant** (ticket ID, asset ID): không pre-render được. Các màn hình chi tiết của portal dùng **query param + drawer/panel** (`?ticket=<id>`), không phải route riêng.

Cách thứ hai cũng đúng pattern `PortalWorkspace` hiện tại (dialog, không push route) và phù hợp hơn với ops console. Không route nào bị mất.

### 2.3 Data fetching: portal giữ nguyên client-side

React Server Component **không** được dùng cho `/portal` và `/admin`. Nếu RSC đọc dữ liệu tenant, nó phải forward cookie `__Host-` từ server Next sang backend, tạo hop mới và phá bất biến §1.2.3. Giữ fetch ở browser: không đổi backend, không đổi spec.

RSC chỉ dùng cho nội dung marketing tĩnh.

### 2.4 Token bridge

- `tokens.css` **không bị xóa**. Nó trở thành nguồn của `@theme inline` trong Tailwind v4, sinh utility từ đúng tên token hiện có.
- `portal.css` giữ nguyên, vẫn scope bởi `[data-portal='true']`, để B/C/D không vỡ khi chưa được redesign.
- `styles.css` (~1771 dòng) **không port nguyên khối** sang Tailwind. Marketing đang được thiết kế lại nên nó được thay theo từng trang ở A1/A2, không dịch máy.

Thứ tự import trong `app/globals.css`: `tokens.css` → Tailwind → `portal.css`. Thứ tự này để Tailwind preflight không ghi đè token, và `portal.css` vẫn thắng ở phạm vi portal.

### 2.5 Chi phí phải trả

Nêu rõ để không bị bất ngờ khi thực thi:

- **`App.test.tsx` phải viết lại.** 17 test hiện tại điều khiển routing bằng `window.history.replaceState` rồi render một `<App/>`. Dưới Next, routing thuộc framework nên test phải render page component trực tiếp và mock `next/navigation`.
- **Router `useSyncExternalStore` bị bỏ**, thay bằng `next/link` + `useRouter`. `document.title` thủ công thay bằng metadata API.
- **Version Next và Tailwind đã pin.** Next **16.2.12** (peer dep `react: "^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0"`, engines `node: ">=20.9.0"`) và Tailwind **4.3.3** + `@tailwindcss/postcss` 4.3.3. Cả hai tương thích React 19.2.8 và Node `^20.19.0 || >=22.12.0` của repo — đã verify trước khi lập plan.

## 3. Information architecture

### 3.1 Đổi `/client` → `/portal`

Brief gọi client portal là `/portal`. Backend hiện hardcode prefix theo workspace (`backend/src/auth-service.js:90-94`):

```js
function authorizedReturnTo(returnTo, workspace) {
  const prefix = workspace === "client" ? "/client" : "/admin";
  ...
}
```

Chi phí đổi: ~1 dòng logic ở `auth-service.js`, 4 chỗ trong `backend/test/auth-service.test.js`, 12 chỗ trong `README.md`. Không đụng policy, RLS hay session logic. Đây là rename có test bao phủ, không phải ghi đè tùy tiện.

`/admin` giữ nguyên — brief cũng dùng `/admin`.

### 3.2 `/` đổi vai

| Path | Hiện tại | Sau A |
| --- | --- | --- |
| `/` | login gateway | marketing homepage |
| `/login` | không có | trang đăng nhập |
| `/company` | marketing homepage | bỏ |

Kiểm tra an toàn: `returnTo` mặc định là `"/"` (`backend/src/app.js:695`). Qua `authorizedReturnTo("/")`, giá trị này không match prefix nào nên fallback về `/portal` hoặc `/admin/soc` — đúng hành vi mong muốn, không cần sửa thêm.

`/company` bị bỏ hẳn, không để redirect stub: site chưa launch công khai, không có backlink cần bảo tồn, và static export không có middleware nên redirect phải là meta-refresh HTML — một thứ rác SEO không đáng giữ.

### 3.3 Slug tiếng Việt

Brief viết `/services`, `/pricing` như tên gọi chức năng, không phải chỉ định slug. Audience là CTO/IT Manager Việt Nam với search intent tiếng Việt, nên slug tiếng Việt thắng về SEO. Mapping nằm trong một chỗ duy nhất (`content.ts`) nên đổi lại rất rẻ.

### 3.4 Cây `app/`

```
frontend/
  app/
    layout.tsx              html lang="vi", next/font, globals.css, skip link
    globals.css             tokens.css -> Tailwind @theme inline -> portal.css
    page.tsx                /                     homepage QTS One
    sitemap.ts
    robots.ts
    not-found.tsx

    (site)/                 route group: chung SiteHeader + SiteFooter
      layout.tsx
      dich-vu/page.tsx           + [slug]/page.tsx   (generateStaticParams)
      giai-phap/page.tsx         + [slug]/page.tsx
      bang-gia/page.tsx
      khach-hang/page.tsx        + [slug]/page.tsx
      ve-qts/page.tsx
      lien-he/page.tsx
      tai-nguyen/page.tsx
      ho-tro/page.tsx
      phap-ly/bao-mat/page.tsx
      phap-ly/dieu-khoan/page.tsx

    login/page.tsx          'use client'
    portal/                 'use client'  (sub-project C)
    admin/                  'use client'  (sub-project D)

  src/                      giữ nguyên vị trí, không di dời
    content.ts
    lib/                    contact.ts, search.ts, cn.ts
    components/             ui/, portal/, magic/
```

Hai điểm cố ý:

- **`src/` không bị dọn.** `content.ts`, `lib/*`, `components/ui/*`, `components/portal/*` giữ đúng chỗ, được `app/` import qua alias `@/`. Migration chỉ thêm `app/`, không di chuyển file hàng loạt — giữ diff đọc được và `git blame` còn nguyên.
- **`(site)` là route group, không phải path segment.** URL vẫn là `/dich-vu`. Header/footer marketing sống ở layout của group nên `/login`, `/portal`, `/admin` không thừa hưởng chrome marketing.

### 3.5 Metadata và SEO

- `app/layout.tsx`: `metadataBase`, `title.template = '%s | QTS One'`, OG default, `lang="vi"`.
- Mỗi `page.tsx`: `export const metadata` với title, description, canonical riêng.
- JSON-LD: `Organization` ở homepage, `Service` ở `/dich-vu/[slug]`, `FAQPage` ở nơi có FAQ. Render bằng `<script type="application/ld+json">{JSON.stringify(data)}</script>`.
- `sitemap.ts` sinh từ cùng `content.ts` mà nav dùng, nên không có route nào lọt sitemap mà thiếu trong nav và ngược lại.

## 4. Design system

### 4.1 Token: giá trị theo brief, tên semantic theo repo

Cấu trúc ba lớp của `tokens.css` được giữ. Lớp primitive được thay bằng bảng màu QTS ở brief §5.1, viết dưới dạng OKLCH tương đương (OKLCH cho phép chỉnh lightness/chroma nhất quán khi làm dark mode; hex gốc ghi trong comment để đối chiếu).

Tên semantic hiện có (`--color-accent`, `--color-body`, `--color-muted`, …) **giữ nguyên** để `portal.css` và component cũ không vỡ khi primitive đổi giá trị.

### 4.2 Contrast: WCAG AA thắng khi xung đột với hex

Brief §6 yêu cầu WCAG 2.2 AA. Bốn giá trị ở brief §5.1 không đạt ngưỡng 4.5:1 trên nền trắng.

Các tỉ lệ dưới đây được tính bằng công thức WCAG 2.x relative luminance, không phải ước lượng:

| Token | Hex | Tỉ lệ trên `#FFFFFF` | Đạt AA body |
| --- | --- | --- | --- |
| Text primary | `#14202B` | 16.52 | có |
| Blue 700 | `#075FB8` | 6.29 | có |
| Text secondary | `#526171` | 6.35 | có |
| Danger | `#C9362B` | 5.19 | có |
| Info | `#2563EB` | 5.17 | có |
| Success | `#15803D` | 5.02 | có |
| Blue 600 | `#0874D1` | 4.74 | có |
| Text muted | `#748292` | 3.92 | **không** |
| Warning | `#C56A00` | 3.86 | **không** |
| Blue 500 | `#1593F5` | 3.22 | **không** |
| Cyan 500 | `#08A9C7` | 2.80 | **không** |

Trên nền `QTS Navy 950` `#071A2E`, các token fail ở nền trắng lại đạt AA:

| Token | Hex | Tỉ lệ trên `#071A2E` |
| --- | --- | --- |
| Blue 50 | `#F1F8FF` | 16.39 |
| Blue 100 | `#DDEEFF` | 14.84 |
| Cyan 500 | `#08A9C7` | 6.28 |
| Blue 500 | `#1593F5` | 5.45 |

Đây là cơ sở cho việc tách vai trò dưới đây, thay vì sửa hex người dùng đã chọn:

- **Blue 500** `#1593F5`: dùng cho focus ring, border trạng thái active, và làm accent **trên nền navy** (5.45:1). Không dùng làm nền button chữ trắng. Primary button dùng **Blue 600**, hover sang **Blue 700** — tối dần nên contrast tăng.
- **Cyan 500** `#08A9C7`: chỉ dùng cho graphic và glow trên nền sáng, đúng vai trò brief §9 mô tả. Làm màu chữ chỉ khi đặt trên navy (6.28:1).
- **Text muted**: thêm `--color-muted-text: #68747F` (4.78:1) cho văn bản. Giá trị này được chọn thay vì `#6B7887` vì `#6B7887` chỉ đạt đúng 4.50 — sát ngưỡng đến mức không còn margin cho sai số làm tròn. `#748292` gốc giữ lại cho icon phụ và label ≥18px (large text chỉ cần 3:1).
- **Warning**: thêm `--color-warning-text: #A85A00` (5.09:1). `#C56A00` giữ cho fill và border của badge.

Section 15 của homepage có background navy theo brief, nên bảng thứ hai là cơ sở contrast cho toàn bộ khối đó.

### 4.3 Những giá trị đã khớp sẵn

- Container marketing: brief muốn 1200–1280px; repo có `--page-max: 76rem` = 1216px. Nằm trong khoảng, giữ nguyên.
- Spacing: repo đã theo hệ 4px. Thiếu `20px` và `120px` — thêm hai token.
- Motion: brief muốn 150–250ms, ease-out khi mở, ease-in khi đóng. Repo có `--dur-short: 180ms`, `--ease-out`, `--ease-in`. Chỉ hạ `--dur-medium` từ 260ms xuống 240ms.
- `prefers-reduced-motion` đã có ở cuối `styles.css`, giữ và mở rộng.

Phải thêm mới: **radius**. Repo tối đa 8px; brief cần card 12px, modal 14px, hero 20px — thêm ba token.

### 4.4 Typography

- **Be Vietnam Pro** qua `next/font/google`. Font này thiết kế cho tiếng Việt, dấu không bị cắt ở weight cao.
- Thang ở brief §5.2 (Display 56/64 … Caption 12/18) áp bằng `clamp()`, ví dụ `--text-display: clamp(2.25rem, 5vw, 3.5rem)` → 36px ở mobile, 56px ở desktop, không tràn ở 320px.
- Thêm font thứ ba cho số liệu: **IBM Plex Mono** với tabular figures, để cột số trong portal không nhảy. `--font-mono` hiện trỏ vào Space Grotesk — sai vai trò, sẽ sửa.
- **Không italic ở heading.** Nhấn mạnh bằng weight, màu accent hoặc underline vẽ tay. Italic chỉ tồn tại trong body copy.

## 5. Homepage: 15 section, có kỷ luật chống template

Brief §9 chỉ định 15 section rất chặt. Spec này làm đủ 15 section theo đúng thứ tự và nội dung brief đã cho.

Rủi ro là kết quả trở thành landing page generic. Ba biện pháp:

1. **Section 5 (hệ sinh thái hub-and-spoke) là signature element.** Đây là chỗ duy nhất được phép "bold"; mọi thứ xung quanh giữ kỷ luật. Nó tái dùng kinh nghiệm SVG topology từ `SecurityMap.tsx`, và theo yêu cầu brief "không phụ thuộc animation để hiểu nội dung" nên là SVG + text thật, không phải canvas.
2. **Section 6 dùng alternating feature layout** (brief đã yêu cầu) để phá nhịp card-grid liên tục.
3. **Hero visual là composition mô phỏng UI QTS One**, dựng bằng DOM và token thật thay vì ảnh stock. Nhưng **không vẽ lại browser chrome giả** (URL pill, ba đèn giao thông) — chỉ là các card dashboard nổi nhẹ với dữ liệu hợp lý.

## 6. Quy tắc trung thực nội dung

Từ brief và bổ sung của spec này:

- **`15+ năm kinh nghiệm` là số thật** — QTS thành lập 05/07/2011, đến 2026 là 15 năm. Dùng không cần nhãn.
- **`500+ dự án` và `99,9% uptime` chưa xác thực** — gắn nhãn `Dữ liệu minh họa`, đúng như brief §9.2 tự yêu cầu.
- **Không đặt giá thật.** Bảng giá hiển thị `Liên hệ` / `Nhận báo giá`, hoặc giá có nhãn `Giá minh họa` rõ ràng.
- **Không tuyên bố ISO, SOC 2 hay chứng nhận nào** khi chưa có dữ liệu xác thực. Section 11 mô tả năng lực kỹ thuật (MFA, SSO, RBAC, audit log, mã hóa, backup, giám sát, phân tách dữ liệu) chứ không phải chứng nhận.
- **Không tạo phát ngôn giả cho người thật.** Testimonial dùng tên mẫu, có nhãn `Nội dung minh họa`.
- **Không vẽ logo thương hiệu thật.** Dải logo khách hàng là ô placeholder trung tính.
- **Không bịa địa chỉ, email, số điện thoại.** Dùng placeholder dễ thay thế.
- **Không dùng Lorem Ipsum.**
- **Không dùng tài sản của MISA.** Chỉ tham khảo cách tổ chức thông tin B2B, nhóm mega menu, nhịp bố cục landing, trình bày lợi ích trước tính năng, CTA, hệ sinh thái tích hợp, bảng giá phân tầng, case study, form chuyển đổi, FAQ. Không sao chép logo, nội dung nguyên văn, hình ảnh, icon, illustration, màu sắc, typography hay layout chính xác; không hotlink; không tạo giao diện gây nhầm QTS với MISA.

## 7. Trang đăng nhập

Brief §11 yêu cầu form email/mật khẩu, MFA và password expired. Hệ thống không có password store; Google OIDC là cơ chế duy nhất, và `docs/decisions/ADR-003-remove-local-operational-data.md` cùng test hiện tại khẳng định điều này:

```js
expect(screen.queryByLabelText(/mật khẩu/i)).not.toBeInTheDocument();
```

Brief cũng tự nói "Không triển khai authentication giả không an toàn", nên hai yêu cầu trong brief xung đột. Người dùng đã chọn: **chỉ Google OIDC**.

Do đó `/login`:

- Giữ layout split-screen đúng brief §11: bên trái là logo QTS One, value proposition, ba lợi ích ngắn, hình dashboard, trust message.
- Bên phải là nút đăng nhập Google, cùng các trạng thái **thật**: loading, network error, OIDC chưa cấu hình, không có quyền truy cập, session hết hạn.
- **Không có** field mật khẩu, không có form MFA, không có password expired — vì không có backend tương ứng.
- ADR-003 và các assertion hiện tại được giữ nguyên.

## 8. Test, lint, typecheck, build

### 8.1 Test: đổi runner setup, giữ assertion

Vitest được giữ, không chuyển sang Jest. 17 test hiện tại đều là Testing Library và chạy tốt dưới Vitest. Thay đổi tối thiểu:

- `vite.config.ts` → `vitest.config.ts`: chỉ còn block `test` và `@vitejs/plugin-react`. Phần `server.proxy` và `build` chuyển sang `next.config.ts`.
- Mock `next/navigation` một lần trong `src/test/setup.ts`: `useRouter`, `usePathname`, `useSearchParams`.
- Test không render `<App/>` kèm `replaceState` nữa, mà render page component trực tiếp và set pathname qua mock.

Mất: khả năng test "gõ URL ra đúng page" — đó là việc của framework. Giữ: toàn bộ assertion về nội dung, a11y, form flow, header CSRF/idempotency, permission denial.

### 8.2 Sửa lỗi vitest filtered-run đang tồn tại

`npm run test:frontend -- App.test.tsx` hiện fail 2 suite với 0 test, báo lỗi lệch chỗ ở `src/test/setup.ts`. Nguyên nhân: `test:frontend` kết thúc bằng `--` (`package.json:28`), nên lệnh tạo ra `-- -- App.test.tsx` và vitest đọc `--` như một positional filter rỗng.

Sửa bằng cách thêm script chạy trực tiếp trong workspace, không qua chuỗi `--` lồng:

```json
"test:file": "npm exec --workspace @qts/frontend -- vitest run"
```

### 8.3 tsconfig

- `tsconfig.app.json`: `include: ["src", "app", "next-env.d.ts"]`, thêm `"plugins": [{ "name": "next" }]`, `"incremental": true`, `paths: { "@/*": ["./*"] }`.
- `strict`, `noUnusedLocals`, `noUnusedParameters` **giữ nguyên**. Brief §3 yêu cầu strict mode và repo đã có; không hạ chuẩn.
- `tsconfig.node.json`: đổi `vite.config.ts` thành `vitest.config.ts` và `next.config.ts`.

### 8.4 ESLint

`next lint` đã deprecated ở Next 15+, nên giữ `eslint.config.js` flat config hiện tại. Chỉ thêm một override: **tắt `react-refresh/only-export-components` trong phạm vi `app/**`** — vì `page.tsx` buộc phải export `metadata` và `generateStaticParams` bên cạnh component, rule này sẽ báo warn sai hàng loạt. Tắt có phạm vi, không tắt toàn cục.

### 8.5 Quality gate

`npm run check` (typecheck && lint && test && build) giữ nguyên hợp đồng. `build:frontend` chạy `next build` với `output: 'export'` nên sinh `out/` thay vì `dist/`. Cần cập nhật:

- `frontend/README.md`: `dist/` → `out/` trong mục deploy.
- `.gitignore`: thêm `out/` và `.next/`.
- `productionBrowserSourceMaps: false` khai báo tường minh trong `next.config.ts`, để `QTS_WORKSPACE_SPEC.md` §10 ("production không ship sourcemap") không bị vi phạm do quên.

### 8.6 Hợp đồng deploy static: ba thứ phải sửa

Audit trước khi lập plan phát hiện ba thứ trong `frontend/public/` sẽ vỡ khi chuyển từ SPA một file sang static export nhiều trang. Không phát hiện ở §2.1 vì §2.1 chỉ xét trust boundary, không xét file deploy.

**1. `public/_redirects` phải bị xóa.** Nội dung hiện tại:

```
/* /index.html 200
```

Đây là catch-all của SPA. Với static export nhiều trang, nó phục vụ homepage cho **mọi** route — `/dich-vu` cũng trả về nội dung `/`. Thay bằng `trailingSlash: true` trong `next.config.ts`: Next sinh `out/dich-vu/index.html`, mà nginx và mọi static host phục vụ sẵn theo cơ chế index file. Không cần rewrite rule.

Điều này **loại bỏ rủi ro §12.3** — pretty URL không còn cần cấu hình hạ tầng.

**2. CSP `script-src 'self'` sẽ chặn hydration.** `public/_headers` hiện đặt `script-src 'self'` không có `'unsafe-inline'`. Next App Router chèn inline `<script>self.__next_f.push(...)</script>` vào mỗi trang static export để mang RSC payload. CSP hiện tại chặn script đó và trang không hydrate.

Hướng xử lý người dùng đã chọn: **thử strict trước, chỉ hạ khi chứng minh được là không thể**. A0.1 có gate bắt buộc:

- Thử `experimental.sri: { algorithm: 'sha256' }` trong `next.config.ts` cùng `script-src 'self' 'strict-dynamic'` trong `_headers`.
- Build `out/`, serve kèm đúng header production, mở DevTools Console.
- **0 CSP violation** → giữ strict.
- **Có violation** → hạ xuống `'unsafe-inline'`, và ghi lý do vào `frontend/README.md` cùng §11 của spec này. Không hạ trước khi thử.

Đây là website của một công ty an ninh, nên CSP cuối cùng phải là kết quả đã kiểm chứng, không phải mặc định copy từ docs.

**3. `style-src` đã có `'unsafe-inline'` gián tiếp.** `_headers` hiện có `style-src-attr 'unsafe-inline'`, cho phép `style=""` attribute. `next/font` sinh `<style>` inline trong `<head>`, thuộc `style-src` chứ không phải `style-src-attr`. Gate ở điểm 2 phải kiểm cả directive này.

**4. `src/vite-env.d.ts` bị thay bằng `next-env.d.ts`.** `.gitignore` đã có `out/`; chỉ thiếu `.next/`.

## 9. Thứ tự thực thi

| Task | Nội dung | Gate |
| --- | --- | --- |
| **A0.1** | Install Next 16.2.12 + Tailwind 4.3.3, `next.config.ts` với `output: 'export'` + `trailingSlash: true`, xóa `public/_redirects`, reconfig tsconfig/eslint/vitest, `app/layout.tsx` + `globals.css` với token bridge, **gate CSP §8.6** | typecheck + build xanh; 0 CSP violation hoặc đã ghi lý do hạ |
| **A0.2** | Port `/company` sang `app/page.tsx` **giữ nguyên visual 1:1**, chuyển 7 component sang `next/link`, viết lại test theo §8.1 | cả bốn gate xanh |
| **A0.3** | Rename `/client` → `/portal`, port `/login` + `/portal/*` + `/admin/*` sang `app/` dạng `'use client'`, **giữ nguyên UI** | cả bốn gate xanh; `git diff` không chứa thay đổi logic auth |
| **A1** | Token QTS mới (§4), homepage 15 section (§5) | cả bốn gate, kiểm 320/375/414/768px |
| **A2** | `/dich-vu`, `/giai-phap`, `/bang-gia`, `/khach-hang` cùng `[slug]`, sitemap/robots/JSON-LD | cả bốn gate |

Nguyên tắc xuyên suốt: **A0 không thay đổi một pixel nào.** Nếu build vỡ ở A0, nguyên nhân chắc chắn là migration. Nếu vỡ ở A1, nguyên nhân chắc chắn là CSS mới. Thiết kế mới chỉ bắt đầu từ A1.

## 10. Accessibility

Áp WCAG 2.2 AA ở mức frontend theo brief §6, và những gì repo đã có được giữ:

- Semantic HTML, heading hierarchy đúng, skip-to-content link.
- Label thật cho form; không dùng placeholder thay label.
- `aria-label` cho icon button; `aria-live` cho thông báo động; `aria-invalid` + `aria-describedby` cho lỗi form.
- Modal có focus trap, Esc đóng — dùng `<dialog>` native như hiện tại.
- Table có header và caption; chart có bảng dữ liệu thay thế.
- Không phân biệt trạng thái chỉ bằng màu.
- Touch target tối thiểu 44px trên mobile (`--control-height: 2.75rem` = 44px đã đạt).
- Hỗ trợ zoom 200%; không layout shift lớn.
- `prefers-reduced-motion` được tôn trọng.

Responsive: mobile-first, breakpoint 360–767 / 768–1023 / 1024–1439 / ≥1440. Không horizontal overflow ở 320px. Mega menu thành accordion drawer trên mobile. Bảng dữ liệu chuyển card list hoặc scroll ngang có kiểm soát.

## 11. Bảo mật frontend

Theo brief §21, áp dụng cho A và ràng buộc trước cho B/C/D:

- Không lưu access token nhạy cảm trong `localStorage`. Session hiện tại là cookie `HttpOnly` do backend cấp — giữ nguyên mô hình này.
- Không render secret. `/portal/assets` không hiển thị API key, password hay secret dạng plaintext.
- Escape và sanitize rich text. Không dùng `dangerouslySetInnerHTML` khi không có sanitization. JSON-LD dùng `JSON.stringify` trên dữ liệu do ta kiểm soát, không phải input người dùng.
- Không để thông tin nội bộ trong client bundle. Không đặt secret vào biến `NEXT_PUBLIC_*`.
- Có permission guard ở UI nhưng không coi đó là cơ chế bảo mật duy nhất — backend luôn là authoritative source.
- Form upload giới hạn định dạng và dung lượng ở UI (10 MiB, PDF/text/Markdown như spec hiện tại).
- External link dùng thuộc tính an toàn phù hợp.
- Confirmation bắt buộc cho: xóa thành viên, hủy dịch vụ, thu hồi quyền, tạo API key, thanh toán, hành động bảo mật.

## 12. Rủi ro chưa loại bỏ được

1. **Version Next và Tailwind đã pin, rủi ro này đã đóng.** Next 16.2.12 + Tailwind 4.3.3 đã verify peer dep và engines (xem §2.5). Giữ mục này để ghi nhận rủi ro đã được xử lý, không phải rủi ro còn mở.
2. **`portal.css` cùng tồn tại với Tailwind preflight.** Preflight có thể đụng base style trong `styles.css` (`box-sizing`, `overflow-x: clip`, `img/svg display: block`, `button font: inherit`). Giảm thiểu bằng thứ tự import ở §2.4, và A0.2 phải so sánh visual trước/sau ở cả marketing và portal.
3. **CSP có thể phải hạ xuống `'unsafe-inline'`.** Xem §8.6 điểm 2. Chỉ hạ sau khi `experimental.sri` + `'strict-dynamic'` được chứng minh là không đủ, và phải ghi lý do.

Rủi ro "static export cần rewrite rule cho pretty URL" đã được loại bỏ bằng `trailingSlash: true` (§8.6 điểm 1).

## 13. Ngoài phạm vi A

- Sub-project B: trạng thái đăng nhập và quản lý tài khoản chi tiết.
- Sub-project C: redesign portal shell, dashboard, projects, tickets, assets.
- Sub-project D: redesign admin shell, executive dashboard, CRM, ticket operations, customer detail, audit.
- Bất kỳ thay đổi nào với backend ngoài rename `/client` → `/portal` ở §3.1.
- Dark mode cho marketing site (token có hỗ trợ, nhưng bật ở sub-project sau).
