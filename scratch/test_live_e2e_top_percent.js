const http = require('http');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = 'C:/Users/HP/.gemini/antigravity/brain/55253471-cf34-40a7-834e-b92a7ff37669/top_percent_evidence';
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

function getWebSocketDebuggerUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json/list', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          const page = list.find(p => p.type === 'page');
          if (page && page.webSocketDebuggerUrl) {
            resolve(page.webSocketDebuggerUrl);
          } else {
            reject(new Error('No page found in Chrome CDP'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const parsed = JSON.parse(event.data);
        if (parsed.id && this.callbacks.has(parsed.id)) {
          const cb = this.callbacks.get(parsed.id);
          this.callbacks.delete(parsed.id);
          if (parsed.error) cb.reject(parsed.error);
          else cb.resolve(parsed.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
  }

  async screenshot(filename) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    const fullPath = path.join(EVIDENCE_DIR, filename);
    fs.writeFileSync(fullPath, Buffer.from(data, 'base64'));
    console.log(`📸 Screenshot saved: ${filename}`);
  }

  async sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

async function run() {
  console.log('Connecting to Chrome CDP...');
  const wsUrl = await getWebSocketDebuggerUrl();
  const client = new CDPClient(wsUrl);
  await client.connect();
  console.log('Connected to CDP.');

  await client.send('Page.enable');
  await client.send('DOM.enable');

  const results = {};

  // ─────────────────────────────────────────────────────────────
  // TEST 1: Unauthenticated Deep Link (/tickets/ARV-102)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 1: Unauthenticated Deep Link ---');
  await client.eval(`
    localStorage.clear();
    sessionStorage.clear();
  `);
  await client.send('Network.clearBrowserCookies');

  console.log('Navigating directly to unauthenticated deep link /tickets/ARV-102...');
  await client.send('Page.navigate', { url: 'https://arvo-frontdesk.vercel.app/tickets/ARV-102' });
  await client.sleep(3000);

  const currentUrlAfterRedirect = await client.eval('window.location.href');
  console.log('URL after direct access (should be /login):', currentUrlAfterRedirect);
  results.test1_redirect_url = currentUrlAfterRedirect;

  const hasLoginForm = await client.eval(`!!document.querySelector('input[type="password"]')`);
  console.log('Login form rendered immediately without wake hang:', hasLoginForm);
  results.test1_has_login_form = hasLoginForm;

  // Log in as Lead Meera Krishnan using quick demo card
  console.log('Clicking 1-Click Lead Demo card...');
  await client.eval(`
    const meeraBtn = document.querySelector('button[title*="Meera Krishnan"]');
    if (meeraBtn) {
      meeraBtn.click();
    } else {
      // Fallback: fill email and submit
      const emailInput = document.querySelector('input[type="email"]');
      const passInput = document.querySelector('input[type="password"]');
      if (emailInput && passInput) {
        emailInput.value = 'meera@arvo.systems';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        passInput.value = 'arvo2026';
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('button[type="submit"]')?.click();
      }
    }
  `);
  await client.sleep(4000);

  const urlAfterLogin = await client.eval('window.location.href');
  console.log('URL after login (should return to ARV-102):', urlAfterLogin);
  results.test1_returned_url = urlAfterLogin;
  await client.screenshot('01_deep_link_redirect_and_return.png');

  // ─────────────────────────────────────────────────────────────
  // TEST 2: Takeover Confirmation Modal (MAJ-02)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 2: Takeover Confirmation Modal ---');
  // Navigate to ARV-104 (assigned to Priya)
  await client.send('Page.navigate', { url: 'https://arvo-frontdesk.vercel.app/tickets/ARV-104' });
  await client.sleep(3000);

  const ticketTitle = await client.eval(`
    document.querySelector('h2')?.innerText || ''
  `);
  console.log('Ticket loaded on ARV-104:', ticketTitle);

  // Look for "Take Over Ticket" button
  const hasTakeOverBtn = await client.eval(`
    Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('Take Over Ticket'))
  `);
  console.log('Has Take Over Ticket button:', hasTakeOverBtn);

  if (hasTakeOverBtn) {
    console.log('Clicking Take Over Ticket button...');
    await client.eval(`
      const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('Take Over Ticket'));
      if (b) b.click();
    `);
    await client.sleep(1000);

    const hasConfirmModal = await client.eval(`
      document.body.innerText.includes('Confirm Ticket Takeover') &&
      document.body.innerText.includes('Are you sure you want to take over ownership?')
    `);
    console.log('Takeover confirmation modal appeared:', hasConfirmModal);
    results.test2_modal_appeared = hasConfirmModal;
    await client.screenshot('02_takeover_confirmation_modal.png');

    console.log('Clicking Confirm Takeover in modal...');
    await client.eval(`
      const confirmBtn = Array.from(document.querySelectorAll('button')).find(x => x.innerText === 'Confirm Takeover');
      if (confirmBtn) confirmBtn.click();
    `);
    await client.sleep(3000);

    const currentAssignee = await client.eval(`
      document.body.innerText.includes('Meera Krishnan')
    `);
    console.log('Ticket successfully reassigned to Meera:', currentAssignee);
    results.test2_reassigned = currentAssignee;
    await client.screenshot('02_takeover_confirmed_success.png');
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 3: CSV Queue Export (MIN-02)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 3: Export Queue (CSV) ---');
  const hasCsvBtn = await client.eval(`
    Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('CSV'))
  `);
  console.log('CSV Export button present in queue header:', hasCsvBtn);
  results.test3_has_csv_export = hasCsvBtn;
  await client.screenshot('03_csv_export_cta_present.png');

  // ─────────────────────────────────────────────────────────────
  // TEST 4: Interactive Holiday Management & Daemon Telemetry
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 4: Interactive Holiday Management ---');
  // Open Demo Clock Popover
  await client.eval(`
    const clockBtn = Array.from(document.querySelectorAll('button')).find(b => b.title && b.title.includes('Simulation Clock'));
    if (clockBtn) clockBtn.click();
  `);
  await client.sleep(1000);

  const popoverContent = await client.eval(`document.body.innerText`);
  const hasDaemonStatus = popoverContent.includes('Auto-Close Daemon: Active');
  console.log('Daemon status visible in popover:', hasDaemonStatus);
  results.test4_has_daemon_status = hasDaemonStatus;

  const hasAddHolidayBtn = await client.eval(`
    Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('Add Holiday'))
  `);
  console.log('Has Add Holiday button:', hasAddHolidayBtn);
  results.test4_has_add_holiday_btn = hasAddHolidayBtn;

  if (hasAddHolidayBtn) {
    console.log('Opening Add Holiday form...');
    await client.eval(`
      const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('Add Holiday'));
      if (b) b.click();
    `);
    await client.sleep(500);

    // Type name and date
    await client.eval(`
      const nameInput = document.querySelector('input[placeholder*="Holiday Name"]');
      const dateInput = document.querySelector('input[type="date"]');
      if (nameInput) {
        nameInput.value = 'National Innovation Day';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (dateInput) {
        dateInput.value = '2026-12-25';
        dateInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);
    await client.sleep(500);

    console.log('Submitting new holiday...');
    await client.eval(`
      const saveBtn = Array.from(document.querySelectorAll('button')).find(x => x.innerText === 'Save');
      if (saveBtn) saveBtn.click();
    `);
    await client.sleep(3000);

    const holidayPresent = await client.eval(`
      document.body.innerText.includes('National Innovation Day')
    `);
    console.log('Newly added holiday is rendered:', holidayPresent);
    results.test4_holiday_added = holidayPresent;
    await client.screenshot('04_holiday_added_interactive.png');

    // Now delete the holiday
    console.log('Deleting holiday via trash button...');
    await client.eval(`
      const trashBtns = Array.from(document.querySelectorAll('button[title*="Remove holiday"]'));
      if (trashBtns.length > 0) trashBtns[trashBtns.length - 1].click();
    `);
    await client.sleep(3000);
    await client.screenshot('04_holiday_deleted_restored.png');
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 5: Dedicated Branded 404 Page (MIN-03)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 5: Dedicated 404 Page ---');
  await client.send('Page.navigate', { url: 'https://arvo-frontdesk.vercel.app/operational-black-hole-999' });
  await client.sleep(2500);

  const is404Page = await client.eval(`
    document.body.innerText.includes('HTTP 404 · NOT FOUND') &&
    document.body.innerText.includes('Destination Unreachable')
  `);
  console.log('Dedicated 404 page rendered:', is404Page);
  results.test5_dedicated_404 = is404Page;
  await client.screenshot('05_branded_404_page.png');

  // ─────────────────────────────────────────────────────────────
  // TEST 6: 768px Split-Screen Polish (COSMETIC-01)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 6: 768px Viewport Responsiveness ---');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 768,
    height: 850,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await client.send('Page.navigate', { url: 'https://arvo-frontdesk.vercel.app/tickets/ARV-101' });
  await client.sleep(3000);

  const scrollWidth = await client.eval('document.documentElement.scrollWidth');
  const clientWidth = await client.eval('document.documentElement.clientWidth');
  const hasHorizontalScroll = scrollWidth > clientWidth;
  console.log(`Viewport check: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}, hasHorizontalScroll=${hasHorizontalScroll}`);
  results.test6_768px_clean = !hasHorizontalScroll;
  await client.screenshot('06_responsive_768px_split_screen.png');

  // Restore viewport
  await client.send('Emulation.clearDeviceMetricsOverride');

  // Write results JSON
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'test_results.json'), JSON.stringify(results, null, 2));
  console.log('\n✅ All tests complete! Results:\n', JSON.stringify(results, null, 2));
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
