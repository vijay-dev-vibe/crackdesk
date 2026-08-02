# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: site.spec.ts >> Protected Route Soft-Gate >> [Pricing] redirects unauthenticated users to /login
- Location: src\e2e\tests\site.spec.ts:84:5

# Error details

```
Error: Pricing did NOT redirect unauthenticated user. Still on: http://localhost:5173/pricing

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
  - generic [ref=e4]:
    - navigation [ref=e5]:
      - generic [ref=e6]:
        - link "MapReducer" [ref=e7] [cursor=pointer]:
          - /url: /
        - generic [ref=e18]:
          - link "Home" [ref=e19] [cursor=pointer]:
            - /url: /
          - link "Dashboard" [ref=e20] [cursor=pointer]:
            - /url: /dashboard
          - link "Mock Test" [ref=e21] [cursor=pointer]:
            - /url: /mock-test
          - link "AI-Interview NEW" [ref=e22] [cursor=pointer]:
            - /url: /ai-interview
            - text: AI-Interview
            - generic [ref=e23]: NEW
          - link "History" [ref=e24] [cursor=pointer]:
            - /url: /test-history
          - link "Pricing" [ref=e25] [cursor=pointer]:
            - /url: /pricing
          - link "About" [ref=e26] [cursor=pointer]:
            - /url: /About
          - generic [ref=e27]: Test Library
        - generic [ref=e32]:
          - link [ref=e33] [cursor=pointer]:
            - /url: /login
            - button "Log in" [ref=e34]
          - link [ref=e35] [cursor=pointer]:
            - /url: /signup
            - button "Sign up free" [ref=e36]
    - main [ref=e37]:
      - generic [ref=e38]:
        - heading "Simple, transparent Pricing" [level=1] [ref=e39]
        - paragraph [ref=e40]: Choose the plan that fits your placement preparation needs
      - generic [ref=e41]:
        - generic [ref=e43]:
          - generic [ref=e44]:
            - heading "Free" [level=3] [ref=e48]
            - paragraph [ref=e49]: Get started with basic mock tests
          - generic [ref=e50]:
            - generic [ref=e51]:
              - generic [ref=e52]: ₹0
              - paragraph [ref=e53]: Always free
            - list [ref=e54]:
              - listitem [ref=e55]:
                - generic [ref=e58]: "Mock Tests/Month: 2"
              - listitem [ref=e59]:
                - generic [ref=e62]: "AI Interviews/Month: 1"
              - listitem [ref=e63]:
                - generic [ref=e66]: "History Retention: 7 days"
              - listitem [ref=e67]:
                - generic [ref=e68]: —
                - generic [ref=e69]: Dashboard
              - listitem [ref=e70]:
                - generic [ref=e71]: —
                - generic [ref=e72]: Full Score Report
              - listitem [ref=e73]:
                - generic [ref=e74]: —
                - generic [ref=e75]: Skill Breakdown
              - listitem [ref=e76]:
                - generic [ref=e77]: —
                - generic [ref=e78]: Progress Tracking
              - listitem [ref=e79]:
                - generic [ref=e80]: —
                - generic [ref=e81]: Weekly Activity Chart
              - listitem [ref=e82]:
                - generic [ref=e83]: —
                - generic [ref=e84]: Score Distribution
              - listitem [ref=e85]:
                - generic [ref=e86]: —
                - generic [ref=e87]: PDF Export
              - listitem [ref=e88]:
                - generic [ref=e89]: —
                - generic [ref=e90]: Certificate Download
            - link [ref=e91] [cursor=pointer]:
              - /url: /Landing
              - button "Get Started" [ref=e92]
        - generic [ref=e94]:
          - generic [ref=e95]:
            - heading "Starter" [level=3] [ref=e99]
            - paragraph [ref=e100]: For students beginning placement prep
          - generic [ref=e101]:
            - generic [ref=e102]:
              - generic [ref=e103]: ₹99
              - paragraph [ref=e104]: Per month
            - list [ref=e105]:
              - listitem [ref=e106]:
                - generic [ref=e109]: "Mock Tests/Month: 8"
              - listitem [ref=e110]:
                - generic [ref=e113]: "AI Interviews/Month: 2"
              - listitem [ref=e114]:
                - generic [ref=e117]: "History Retention: 30 days"
              - listitem [ref=e118]:
                - generic [ref=e121]: Full Score Report
              - listitem [ref=e122]:
                - generic [ref=e125]: Skill Breakdown
              - listitem [ref=e126]:
                - generic [ref=e127]: —
                - generic [ref=e128]: Dashboard
              - listitem [ref=e129]:
                - generic [ref=e130]: —
                - generic [ref=e131]: Progress Tracking
              - listitem [ref=e132]:
                - generic [ref=e133]: —
                - generic [ref=e134]: Weekly Activity Chart
              - listitem [ref=e135]:
                - generic [ref=e136]: —
                - generic [ref=e137]: Score Distribution
              - listitem [ref=e138]:
                - generic [ref=e139]: —
                - generic [ref=e140]: PDF Export
              - listitem [ref=e141]:
                - generic [ref=e142]: —
                - generic [ref=e143]: Certificate Download
            - link [ref=e144] [cursor=pointer]:
              - /url: /checkout?plan=starter
              - button "Get Starter" [ref=e145]
        - generic [ref=e147]:
          - generic [ref=e148]: Most Popular
          - generic [ref=e150]:
            - heading "Pro" [level=3] [ref=e154]
            - paragraph [ref=e155]: For serious placement preparation
          - generic [ref=e156]:
            - generic [ref=e157]:
              - generic [ref=e158]: ₹199
              - paragraph [ref=e159]: Per month
            - list [ref=e160]:
              - listitem [ref=e161]:
                - generic [ref=e164]: "Mock Tests/Month: 20"
              - listitem [ref=e165]:
                - generic [ref=e168]: "AI Interviews/Month: 5"
              - listitem [ref=e169]:
                - generic [ref=e172]: Dashboard
              - listitem [ref=e173]:
                - generic [ref=e176]: "History Retention: Forever"
              - listitem [ref=e177]:
                - generic [ref=e180]: Full Score Report
              - listitem [ref=e181]:
                - generic [ref=e184]: Skill Breakdown
              - listitem [ref=e185]:
                - generic [ref=e188]: Progress Tracking
              - listitem [ref=e189]:
                - generic [ref=e192]: Weekly Activity Chart
              - listitem [ref=e193]:
                - generic [ref=e196]: Score Distribution
              - listitem [ref=e197]:
                - generic [ref=e200]: PDF Export
              - listitem [ref=e201]:
                - generic [ref=e204]: Certificate Download
            - link [ref=e205] [cursor=pointer]:
              - /url: /checkout?plan=pro
              - button "Upgrade to Pro" [ref=e206]
        - generic [ref=e208]:
          - generic [ref=e209]:
            - heading "Premium" [level=3] [ref=e216]
            - paragraph [ref=e217]: Maximum preparation with all features
          - generic [ref=e218]:
            - generic [ref=e219]:
              - generic [ref=e220]: ₹349
              - paragraph [ref=e221]: Per month
            - list [ref=e222]:
              - listitem [ref=e223]:
                - generic [ref=e226]: "Mock Tests/Month: 40"
              - listitem [ref=e227]:
                - generic [ref=e230]: "AI Interviews/Month: 10"
              - listitem [ref=e231]:
                - generic [ref=e234]: Dashboard
              - listitem [ref=e235]:
                - generic [ref=e238]: "History Retention: Forever"
              - listitem [ref=e239]:
                - generic [ref=e242]: Full Score Report
              - listitem [ref=e243]:
                - generic [ref=e246]: Skill Breakdown
              - listitem [ref=e247]:
                - generic [ref=e250]: Progress Tracking
              - listitem [ref=e251]:
                - generic [ref=e254]: Weekly Activity Chart
              - listitem [ref=e255]:
                - generic [ref=e258]: Score Distribution
              - listitem [ref=e259]:
                - generic [ref=e262]: PDF Export
              - listitem [ref=e263]:
                - generic [ref=e266]: Certificate Download
            - link [ref=e267] [cursor=pointer]:
              - /url: /checkout?plan=premium
              - button "Go Premium" [ref=e268]
    - contentinfo [ref=e269]:
      - generic [ref=e270]:
        - generic [ref=e271]:
          - generic [ref=e272]:
            - link "MapReducer by Minimize Technology Pvt. Ltd." [ref=e273] [cursor=pointer]:
              - /url: /
              - generic [ref=e282]:
                - text: MapReducer
                - generic [ref=e283]: by Minimize Technology Pvt. Ltd.
            - paragraph [ref=e284]: AI-powered mock tests tailored to your dream job description.
          - generic [ref=e285]:
            - heading "Product" [level=4] [ref=e286]
            - generic [ref=e287]:
              - link "JD Mock Test" [ref=e288] [cursor=pointer]:
                - /url: /mock-test
              - link "Test Library" [ref=e289] [cursor=pointer]:
                - /url: /test-library
              - link "Test History" [ref=e290] [cursor=pointer]:
                - /url: /test-history
          - generic [ref=e291]:
            - heading "Company" [level=4] [ref=e292]
            - generic [ref=e293]:
              - generic [ref=e294]: About Us
              - generic [ref=e295]: Careers
              - generic [ref=e296]: Contact
          - generic [ref=e297]:
            - heading "Legal" [level=4] [ref=e298]
            - generic [ref=e299]:
              - generic [ref=e300]: Privacy Policy
              - generic [ref=e301]: Terms of Service
        - generic [ref=e302]: © 2026 Minimize Technology. All rights reserved.
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
      |         ^ Error: Pricing did NOT redirect unauthenticated user. Still on: http://localhost:5173/pricing
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