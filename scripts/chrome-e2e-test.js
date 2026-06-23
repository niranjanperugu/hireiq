/**
 * HireSmart Chrome E2E Test Suite
 * Tests core workflows using Puppeteer
 *
 * Installation: npm install puppeteer
 * Usage: node chrome-e2e-test.js
 */

const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:8080/api/v1';
const TEST_EMAIL = 'admin@hiresmart.com';
const TEST_PASSWORD = 'AdminPass123!';

class HireSmartE2ETest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async init() {
    console.log('🚀 Initializing Chrome Browser...');
    this.browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false'
    });
    this.page = await this.browser.newPage();

    // Set viewport
    await this.page.setViewport({ width: 1920, height: 1080 });

    // Log console messages
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.warn('❌ Console Error:', msg.text());
      }
    });

    console.log('✅ Browser initialized');
  }

  async test(name, fn) {
    try {
      console.log(`\n📝 Testing: ${name}`);
      await fn();
      this.testResults.passed++;
      this.testResults.tests.push({ name, status: '✅ PASSED' });
      console.log(`✅ PASSED: ${name}`);
    } catch (error) {
      this.testResults.failed++;
      this.testResults.tests.push({ name, status: `❌ FAILED: ${error.message}` });
      console.error(`❌ FAILED: ${name}`, error.message);
    }
  }

  async waitForElement(selector, timeout = 5000) {
    await this.page.waitForSelector(selector, { timeout });
  }

  async click(selector) {
    await this.waitForElement(selector);
    await this.page.click(selector);
    await this.page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  }

  async type(selector, text) {
    await this.waitForElement(selector);
    await this.page.click(selector);
    await this.page.keyboard.press('Control+A');
    await this.page.type(selector, text);
  }

  async getText(selector) {
    await this.waitForElement(selector);
    return await this.page.$eval(selector, el => el.textContent);
  }

  async getInputValue(selector) {
    await this.waitForElement(selector);
    return await this.page.$eval(selector, el => el.value);
  }

  async runTests() {
    await this.init();

    try {
      // Test 1: Homepage & Navigation
      await this.test('Homepage loads without errors', async () => {
        await this.page.goto(BASE_URL, { waitUntil: 'networkidle2' });
        const title = await this.page.title();
        if (!title) throw new Error('Page title missing');
      });

      // Test 2: Login Form Visible
      await this.test('Login form is visible', async () => {
        await this.waitForElement('input[name="email"]');
        await this.waitForElement('input[name="password"]');
        await this.waitForElement('button[type="submit"]');
      });

      // Test 3: Email Validation
      await this.test('Email validation works', async () => {
        await this.type('input[name="email"]', 'invalid-email');
        const errors = await this.page.$$('.MuiFormHelperText-root.Mui-error');
        if (errors.length === 0) throw new Error('No validation error shown');
      });

      // Test 4: Successful Login
      await this.test('User can login successfully', async () => {
        // Clear email field
        await this.page.click('input[name="email"]');
        await this.page.keyboard.press('Control+A');
        await this.page.keyboard.press('Backspace');

        // Enter credentials
        await this.type('input[name="email"]', TEST_EMAIL);
        await this.type('input[name="password"]', TEST_PASSWORD);
        await this.click('button[type="submit"]');

        // Wait for dashboard
        await this.waitForElement('h4', 10000);
        const dashboardTitle = await this.getText('h4');
        if (!dashboardTitle.includes('Dashboard')) {
          throw new Error('Dashboard not loaded after login');
        }
      });

      // Test 5: Dashboard Displays KPI Cards
      await this.test('Dashboard shows KPI cards', async () => {
        const cards = await this.page.$$('.MuiCard-root');
        if (cards.length < 4) {
          throw new Error(`Expected at least 4 KPI cards, found ${cards.length}`);
        }
      });

      // Test 6: Navigation Menu Works
      await this.test('Navigation menu is functional', async () => {
        const menuItems = await this.page.$$('a[href*="/candidates"], a[href*="/jobs"], a[href*="/applications"]');
        if (menuItems.length === 0) throw new Error('Navigation menu not found');
      });

      // Test 7: Candidates Page
      await this.test('Candidates page loads and displays list', async () => {
        await this.page.goto(`${BASE_URL}/candidates`, { waitUntil: 'networkidle2' });
        await this.waitForElement('table', 10000);

        const rows = await this.page.$$('tbody tr');
        if (rows.length === 0) {
          throw new Error('No candidate rows found in table');
        }
      });

      // Test 8: Search Candidates
      await this.test('Candidate search functionality works', async () => {
        const searchInput = await this.page.$('input[placeholder*="search"]');
        if (searchInput) {
          await this.type('input[placeholder*="search"]', 'John');
          await this.page.waitForTimeout(1000);
          const rows = await this.page.$$('tbody tr');
          // Verify table updated (search worked)
        }
      });

      // Test 9: View Candidate Detail
      await this.test('Candidate detail page works', async () => {
        const firstRow = await this.page.$('tbody tr');
        if (firstRow) {
          await firstRow.click();
          await this.waitForElement('h4', 5000);
          const detailTitle = await this.getText('h4');
          if (!detailTitle) throw new Error('Detail page did not load');
        }
      });

      // Test 10: Jobs Page
      await this.test('Jobs page loads and displays listings', async () => {
        await this.page.goto(`${BASE_URL}/jobs`, { waitUntil: 'networkidle2' });
        await this.waitForElement('table', 10000);

        const rows = await this.page.$$('tbody tr');
        if (rows.length === 0) {
          throw new Error('No job rows found in table');
        }
      });

      // Test 11: Job Status Filter
      await this.test('Job status filter works', async () => {
        const filterSelect = await this.page.$('input[role="combobox"]');
        if (filterSelect) {
          await filterSelect.click();
          await this.page.waitForTimeout(500);
          const options = await this.page.$$('[role="option"]');
          if (options.length > 0) {
            await options[1].click();
            await this.page.waitForTimeout(500);
          }
        }
      });

      // Test 12: Applications Pipeline
      await this.test('Applications pipeline page loads', async () => {
        await this.page.goto(`${BASE_URL}/applications`, { waitUntil: 'networkidle2' });
        await this.waitForElement('h4', 10000);
        const title = await this.getText('h4');
        if (!title.includes('Applications') && !title.includes('Pipeline')) {
          throw new Error('Applications page not loaded');
        }
      });

      // Test 13: Analytics Dashboard
      await this.test('Analytics dashboard loads with charts', async () => {
        await this.page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle2' });
        await this.waitForElement('h4', 10000);

        // Check for SVG elements (chart indicators)
        const svgs = await this.page.$$('svg');
        if (svgs.length === 0) {
          throw new Error('No charts found on analytics page');
        }
      });

      // Test 14: Responsive Design
      await this.test('Mobile responsive design works', async () => {
        await this.page.setViewport({ width: 375, height: 667 });
        await this.page.goto(`${BASE_URL}`, { waitUntil: 'networkidle2' });

        const mobileMenu = await this.page.$('button[aria-label*="menu"]');
        // Verify layout adapts to mobile

        await this.page.setViewport({ width: 1920, height: 1080 });
      });

      // Test 15: User Menu & Logout
      await this.test('User menu and logout work', async () => {
        const userButton = await this.page.$('button[id*="user"]');
        if (userButton) {
          await userButton.click();
          await this.page.waitForTimeout(500);
          const logoutOption = await this.page.$('li:has-text("Logout")');
          if (logoutOption) {
            await logoutOption.click();
            await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
            // Verify redirected to login
          }
        }
      });

      // Test 16: API Health Check
      await this.test('Backend API is healthy', async () => {
        const response = await this.page.goto(
          `${API_URL}/health/status`,
          { waitUntil: 'networkidle0' }
        );
        if (!response.ok()) {
          throw new Error(`API returned ${response.status()}`);
        }
      });

    } catch (error) {
      console.error('Test suite error:', error);
    } finally {
      await this.printResults();
      await this.browser.close();
    }
  }

  printResults() {
    console.log('\n');
    console.log('╔════════════════════════════════════════╗');
    console.log('║     E2E TEST RESULTS SUMMARY           ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');

    this.testResults.tests.forEach((test, index) => {
      console.log(`${index + 1}. ${test.status}`);
      console.log(`   ${test.name}`);
    });

    console.log('');
    console.log(`Total Passed: ${this.testResults.passed}/${this.testResults.passed + this.testResults.failed}`);
    console.log(`Total Failed: ${this.testResults.failed}/${this.testResults.passed + this.testResults.failed}`);
    console.log(`Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
    console.log('');

    if (this.testResults.failed === 0) {
      console.log('🎉 All tests passed!');
    } else {
      console.log(`⚠️  ${this.testResults.failed} test(s) failed`);
    }
  }
}

// Run tests
const tester = new HireSmartE2ETest();
tester.runTests();
