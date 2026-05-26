import { test, expect, Page } from '@playwright/test';

// ============================================================
// 🗺️  ROUTES — extracted from App.tsx
// ============================================================
const PUBLIC_ROUTES = [
  { path: '/',                 name: 'Landing' },
  { path: '/login',            name: 'Login' },
  { path: '/signup',           name: 'Signup' },
  { path: '/forgot-password',  name: 'ForgotPassword' },
  { path: '/reset-password',   name: 'ResetPassword' },
];

const PROTECTED_ROUTES = [
  { path: '/dashboard',              name: 'Dashboard' },
  { path: '/mock-test',              name: 'MockTest' },
  { path: '/test-library',           name: 'TestLibrary' },
  { path: '/test-history',           name: 'TestHistory' },
  { path: '/profile',                name: 'Profile' },
  { path: '/pricing',                name: 'Pricing' },
  { path: '/ai-interview',           name: 'InterviewSetup' },
  { path: '/ai-interview/room',      name: 'InterviewRoom' },
  { path: '/ai-interview/analysis',  name: 'InterviewAnalysis' },
  { path: '/admin/seeder',           name: 'AdminSeeder' },
  { path: '/admin/dashboard',        name: 'AdminDashboard' },
];

// ============================================================
// Helper: collect JS console errors on a page
// ============================================================
function attachErrorListener(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

// ============================================================
// 1. ✅ PUBLIC PAGE LOAD — every public route loads fine
// ============================================================
test.describe('✅ Public Page Load', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`[${route.name}] loads without crash`, async ({ page }) => {
      const errors = attachErrorListener(page);
      const response = await page.goto(route.path);

      expect(response?.status(), `${route.name} bad HTTP status`).toBeLessThan(400);

      const body = await page.locator('body').innerText();
      expect(body.trim().length, `${route.name} body is empty`).toBeGreaterThan(0);

      expect(errors, `JS errors on ${route.name}: ${errors.join(', ')}`).toHaveLength(0);

      await page.screenshot({
        path: `screenshots/load-${route.name.toLowerCase()}.png`,
        fullPage: true,
      });
    });
  }
});

// ============================================================
// 2. 🔄 REFRESH TESTS — refresh stays on same page (no 404)
// ============================================================
test.describe('🔄 Refresh Stays on Same Page', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`[${route.name}] refresh does NOT show 404`, async ({ page }) => {
      await page.goto(route.path);
      await page.reload();

      expect(page.url()).not.toContain('404');
      expect(page.url()).not.toContain('not-found');

      const body = await page.locator('body').innerText();
      expect(body.trim().length, `${route.name} empty after refresh`).toBeGreaterThan(0);
    });
  }
});

// ============================================================
// 3. 🔒 PROTECTED ROUTES — redirect to /login when not logged in
// ============================================================
test.describe('🔒 Protected Route Redirect', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`[${route.name}] redirects unauthenticated users to /login`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForTimeout(1000);

      const currentUrl = page.url();
      const isOnLogin = currentUrl.includes('/login');
      const isOnLanding = currentUrl.endsWith('/') || currentUrl.includes('/#');

      expect(
        isOnLogin || isOnLanding,
        `${route.name} did NOT redirect unauthenticated user. Still on: ${currentUrl}`
      ).toBeTruthy();
    });
  }
});

// ============================================================
// 4. 🔗 BROKEN LINKS — scan all <a> tags on public pages
// ============================================================
test.describe('🔗 No Broken Links', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`[${route.name}] has no broken internal links`, async ({ page, request }) => {
      await page.goto(route.path);

      const links = await page.locator('a[href]').evaluateAll((anchors) =>
        anchors
          .map((a) => (a as HTMLAnchorElement).href)
          .filter(
            (href) =>
              href &&
              !href.startsWith('mailto:') &&
              !href.startsWith('tel:') &&
              !href.startsWith('javascript:')
          )
      );

      const broken: string[] = [];
      for (const link of [...new Set(links)]) {
        try {
          const res = await request.get(link, { timeout: 8000 });
          if (res.status() === 404 || res.status() === 500) {
            broken.push(`${link} → ${res.status()}`);
          }
        } catch {
          broken.push(`${link} → unreachable`);
        }
      }

      expect(broken, `Broken links on ${route.name}:\n${broken.join('\n')}`).toHaveLength(0);
    });
  }
});

// ============================================================
// 5. ⚡ PERFORMANCE — each public page loads within 5s
// ============================================================
test.describe('⚡ Performance', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`[${route.name}] loads within 5 seconds`, async ({ page }) => {
      const start = Date.now();
      await page.goto(route.path, { waitUntil: 'networkidle' });
      const duration = Date.now() - start;

      console.log(`⏱ ${route.name}: ${duration}ms`);
      expect(duration, `${route.name} too slow: ${duration}ms`).toBeLessThan(5000);
    });
  }
});

// ============================================================
// 6. 📱 RESPONSIVENESS — no horizontal scroll on mobile
// ============================================================
test.describe('📱 Mobile Responsiveness', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`[${route.name}] no horizontal overflow on mobile (375px)`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(route.path);

      const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);

      expect(
        bodyScrollWidth,
        `${route.name} overflows on mobile (body: ${bodyScrollWidth}px, viewport: ${viewportWidth}px)`
      ).toBeLessThanOrEqual(viewportWidth + 5);

      await page.screenshot({
        path: `screenshots/mobile-${route.name.toLowerCase()}.png`,
        fullPage: true,
      });
    });
  }
});

// ============================================================
// 7. ♿ ACCESSIBILITY — basic checks
// ============================================================
test.describe('♿ Accessibility', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`[${route.name}] images have alt text`, async ({ page }) => {
      await page.goto(route.path);
      const missing = await page.locator('img:not([alt])').count();
      expect(missing, `${route.name}: ${missing} image(s) missing alt`).toBe(0);
    });

    test(`[${route.name}] has an H1`, async ({ page }) => {
      await page.goto(route.path);
      const h1 = await page.locator('h1').count();
      expect(h1, `${route.name} has no H1`).toBeGreaterThan(0);
    });

    test(`[${route.name}] has a page title`, async ({ page }) => {
      await page.goto(route.path);
      const title = await page.title();
      expect(title.trim(), `${route.name} has no <title>`).not.toBe('');
    });
  }
});

// ============================================================
// 8. 🌐 NETWORK — no failed requests on public pages
// ============================================================
test.describe('🌐 No Failed Network Requests', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`[${route.name}] has no failed network requests`, async ({ page }) => {
      const failed: string[] = [];
      page.on('requestfailed', (req) => {
        failed.push(`${req.url()} — ${req.failure()?.errorText}`);
      });

      await page.goto(route.path, { waitUntil: 'networkidle' });

      expect(
        failed,
        `Failed requests on ${route.name}:\n${failed.join('\n')}`
      ).toHaveLength(0);
    });
  }
});

// ============================================================
// 9. 🧭 404 PAGE — unknown route shows NotFound, not blank
// ============================================================
test.describe('🧭 404 Not Found Page', () => {
  test('unknown route renders NotFound page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-xyz');
    const body = await page.locator('body').innerText();
    expect(body.trim().length, '404 page is blank').toBeGreaterThan(0);
    expect(page.url()).not.toContain('error');
  });
});

// ============================================================
// 10. 🔑 AUTH FORMS — login & signup forms have required fields
// ============================================================
test.describe('🔑 Auth Forms', () => {
  test('[Login] has email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('[Signup] has email and password fields', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('[ForgotPassword] has email field', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
  });

  test('[Login] empty submit keeps user on /login', async ({ page }) => {
    await page.goto('/login');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/login');
  });
});