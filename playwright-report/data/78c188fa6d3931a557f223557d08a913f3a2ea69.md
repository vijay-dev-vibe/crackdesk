# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: site.spec.ts >> Protected Route Soft-Gate >> [AdminSeeder] redirects unauthenticated users to /login
- Location: src\e2e\tests\site.spec.ts:84:5

# Error details

```
Error: AdminSeeder did NOT redirect unauthenticated user. Still on: http://localhost:5173/admin/seeder

expect(received).toBeTruthy()

Received: false
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - button "💬" [ref=e3] [cursor=pointer]
  - generic [ref=e5]:
    - heading "404" [level=1] [ref=e6]
    - paragraph [ref=e7]: Oops! Page not found
    - link "Return to Home" [ref=e8] [cursor=pointer]:
      - /url: /
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | 
  3   | // ============================================================
  4   | // 🗺️  ROUTES — extracted from App.tsx
  5   | // ============================================================
  6   | const PUBLIC_ROUTES = [
  7   |   { path: '/',                 name: 'Landing' },
  8   |   { path: '/login',            name: 'Login' },
  9   |   { path: '/signup',           name: 'Signup' },
  10  |   { path: '/forgot-password',  name: 'ForgotPassword' },
  11  |   { path: '/reset-password',   name: 'ResetPassword' },
  12  | ];
  13  | 
  14  | const PROTECTED_ROUTES = [
  15  |   { path: '/dashboard',              name: 'Dashboard' },
  16  |   { path: '/mock-test',              name: 'MockTest' },
  17  |   { path: '/test-library',           name: 'TestLibrary' },
  18  |   { path: '/test-history',           name: 'TestHistory' },
  19  |   { path: '/profile',                name: 'Profile' },
  20  |   { path: '/pricing',                name: 'Pricing' },
  21  |   { path: '/ai-interview/room',      name: 'InterviewRoom' },
  22  |   { path: '/ai-interview/analysis',  name: 'InterviewAnalysis' },
  23  |   { path: '/admin/seeder',           name: 'AdminSeeder' },
  24  |   { path: '/admin/dashboard',        name: 'AdminDashboard' },
  25  | ];
  26  | 
  27  | // ============================================================
  28  | // Helper: collect JS console errors on a page
  29  | // ============================================================
  30  | function attachErrorListener(page: Page): string[] {
  31  |   const errors: string[] = [];
  32  |   page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  33  |   page.on('pageerror', (err) => errors.push(err.message));
  34  |   return errors;
  35  | }
  36  | 
  37  | // ============================================================
  38  | // 1. ✅ PUBLIC PAGE LOAD — every public route loads fine
  39  | // ============================================================
  40  | test.describe('✅ Public Page Load', () => {
  41  |   for (const route of PUBLIC_ROUTES) {
  42  |     test(`[${route.name}] loads without crash`, async ({ page }) => {
  43  |       const errors = attachErrorListener(page);
  44  |       const response = await page.goto(route.path);
  45  | 
  46  |       expect(response?.status(), `${route.name} bad HTTP status`).toBeLessThan(400);
  47  | 
  48  |       const body = await page.locator('body').innerText();
  49  |       expect(body.trim().length, `${route.name} body is empty`).toBeGreaterThan(0);
  50  | 
  51  |       expect(errors, `JS errors on ${route.name}: ${errors.join(', ')}`).toHaveLength(0);
  52  | 
  53  |       await page.screenshot({
  54  |         path: `screenshots/load-${route.name.toLowerCase()}.png`,
  55  |         fullPage: true,
  56  |       });
  57  |     });
  58  |   }
  59  | });
  60  | 
  61  | // ============================================================
  62  | // 2. 🔄 REFRESH TESTS — refresh stays on same page (no 404)
  63  | // ============================================================
  64  | test.describe('🔄 Refresh Stays on Same Page', () => {
  65  |   for (const route of PUBLIC_ROUTES) {
  66  |     test(`[${route.name}] refresh does NOT show 404`, async ({ page }) => {
  67  |       await page.goto(route.path);
  68  |       await page.reload();
  69  | 
  70  |       expect(page.url()).not.toContain('404');
  71  |       expect(page.url()).not.toContain('not-found');
  72  | 
  73  |       const body = await page.locator('body').innerText();
  74  |       expect(body.trim().length, `${route.name} empty after refresh`).toBeGreaterThan(0);
  75  |     });
  76  |   }
  77  | });
  78  | 
  79  | // ============================================================
  80  | // 3. 🔒 PROTECTED ROUTES — redirect to /login when not logged in
  81  | // ============================================================
  82  | test.describe('Protected Route Soft-Gate', () => {
  83  |   for (const route of PROTECTED_ROUTES) {
  84  |     test(`[${route.name}] redirects unauthenticated users to /login`, async ({ page }) => {
  85  |       await page.goto(route.path);
  86  |       await page.waitForTimeout(1000);
  87  | 
  88  |       const currentUrl = page.url();
  89  |       const isOnLogin = currentUrl.includes('/login');
  90  |       const isOnLanding = currentUrl.endsWith('/') || currentUrl.includes('/#');
  91  | 
  92  |       expect(
  93  |         isOnLogin || isOnLanding,
  94  |         `${route.name} did NOT redirect unauthenticated user. Still on: ${currentUrl}`
> 95  |       ).toBeTruthy();
      |         ^ Error: AdminSeeder did NOT redirect unauthenticated user. Still on: http://localhost:5173/admin/seeder
  96  |     });
  97  |   }
  98  | });
  99  | 
  100 | // ============================================================
  101 | // 4. 🔗 BROKEN LINKS — scan all <a> tags on public pages
  102 | // ============================================================
  103 | test.describe('🔗 No Broken Links', () => {
  104 |   for (const route of PUBLIC_ROUTES) {
  105 |     test(`[${route.name}] has no broken internal links`, async ({ page, request }) => {
  106 |       await page.goto(route.path);
  107 | 
  108 |       const links = await page.locator('a[href]').evaluateAll((anchors) =>
  109 |         anchors
  110 |           .map((a) => (a as HTMLAnchorElement).href)
  111 |           .filter(
  112 |             (href) =>
  113 |               href &&
  114 |               !href.startsWith('mailto:') &&
  115 |               !href.startsWith('tel:') &&
  116 |               !href.startsWith('javascript:')
  117 |           )
  118 |       );
  119 | 
  120 |       const broken: string[] = [];
  121 |       for (const link of [...new Set(links)]) {
  122 |         try {
  123 |           const res = await request.get(link, { timeout: 8000 });
  124 |           if (res.status() === 404 || res.status() === 500) {
  125 |             broken.push(`${link} → ${res.status()}`);
  126 |           }
  127 |         } catch {
  128 |           broken.push(`${link} → unreachable`);
  129 |         }
  130 |       }
  131 | 
  132 |       expect(broken, `Broken links on ${route.name}:\n${broken.join('\n')}`).toHaveLength(0);
  133 |     });
  134 |   }
  135 | });
  136 | 
  137 | // ============================================================
  138 | // 5. ⚡ PERFORMANCE — each public page loads within 5s
  139 | // ============================================================
  140 | test.describe('⚡ Performance', () => {
  141 |   for (const route of PUBLIC_ROUTES) {
  142 |     test(`[${route.name}] loads within 5 seconds`, async ({ page }) => {
  143 |       const start = Date.now();
  144 |       await page.goto(route.path, { waitUntil: 'networkidle' });
  145 |       const duration = Date.now() - start;
  146 | 
  147 |       console.log(`⏱ ${route.name}: ${duration}ms`);
  148 |       expect(duration, `${route.name} too slow: ${duration}ms`).toBeLessThan(5000);
  149 |     });
  150 |   }
  151 | });
  152 | 
  153 | // ============================================================
  154 | // 6. 📱 RESPONSIVENESS — no horizontal scroll on mobile
  155 | // ============================================================
  156 | test.describe('📱 Mobile Responsiveness', () => {
  157 |   for (const route of PUBLIC_ROUTES) {
  158 |     test(`[${route.name}] no horizontal overflow on mobile (375px)`, async ({ page }) => {
  159 |       await page.setViewportSize({ width: 375, height: 812 });
  160 |       await page.goto(route.path);
  161 | 
  162 |       const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
  163 |       const viewportWidth = await page.evaluate(() => window.innerWidth);
  164 | 
  165 |       expect(
  166 |         bodyScrollWidth,
  167 |         `${route.name} overflows on mobile (body: ${bodyScrollWidth}px, viewport: ${viewportWidth}px)`
  168 |       ).toBeLessThanOrEqual(viewportWidth + 5);
  169 | 
  170 |       await page.screenshot({
  171 |         path: `screenshots/mobile-${route.name.toLowerCase()}.png`,
  172 |         fullPage: true,
  173 |       });
  174 |     });
  175 |   }
  176 | });
  177 | 
  178 | // ============================================================
  179 | // 7. ♿ ACCESSIBILITY — basic checks
  180 | // ============================================================
  181 | test.describe('♿ Accessibility', () => {
  182 |   for (const route of PUBLIC_ROUTES) {
  183 |     test(`[${route.name}] images have alt text`, async ({ page }) => {
  184 |       await page.goto(route.path);
  185 |       const missing = await page.locator('img:not([alt])').count();
  186 |       expect(missing, `${route.name}: ${missing} image(s) missing alt`).toBe(0);
  187 |     });
  188 | 
  189 |     test(`[${route.name}] has an H1`, async ({ page }) => {
  190 |       await page.goto(route.path);
  191 |       const h1 = await page.locator('h1').count();
  192 |       expect(h1, `${route.name} has no H1`).toBeGreaterThan(0);
  193 |     });
  194 | 
  195 |     test(`[${route.name}] has a page title`, async ({ page }) => {
```