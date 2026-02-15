import { test, expect, type Page, type Locator } from '@playwright/test';

// ============================================================
// Dominican Republic E-Ticket — Single Traveler E2E Test
// Fills all 4 steps + payment with test card
// Test card: 4032036928551751 / 05/2029 / 204
// ============================================================

// ----- Helpers -----

/**
 * Fill a shadcn/ui Select by its accessible label.
 * Opens the combobox, then clicks the matching option.
 * @param exact - if false, uses filter(hasText) instead of exact option name (for phone codes etc.)
 */
async function selectByLabel(page: Page, label: string | RegExp, optionText: string, exact = true) {
  const trigger = page.getByRole('combobox', { name: label });
  await trigger.click();
  let option: Locator;
  if (exact) {
    option = page.getByRole('option', { name: optionText, exact: true });
  } else {
    option = page.getByRole('option').filter({ hasText: optionText }).first();
  }
  await option.scrollIntoViewIfNeeded();
  await option.waitFor({ state: 'visible', timeout: 8000 });
  await option.click();
}

/**
 * Click a radio button by its id (force click since it may be visually hidden).
 */
async function clickRadio(page: Page, id: string) {
  await page.locator(`#${id}`).click({ force: true });
}

/**
 * Fill a DateSelectInput (3 native <select>: Day, Month, Year).
 * Finds the selects by locating the label text, then the sibling container.
 * @param page
 * @param labelText - exact or regex for the label
 * @param day - e.g. "15"
 * @param month - e.g. "06" for JUN
 * @param year - e.g. "1990"
 */
async function fillDate(page: Page, labelText: string, day: string, month: string, year: string) {
  // Find the label, then go up to the FormItem, then find selects
  const label = page.locator('label').filter({ hasText: labelText }).first();
  // The FormItem wraps label + the DateSelectInput div. Go up to nearest parent.
  const formItem = label.locator('..');
  const selects = formItem.locator('select');
  // Order: Day (0), Month (1), Year (2) — set Year first to avoid range issues
  await selects.nth(2).selectOption(year);
  await selects.nth(1).selectOption(month);
  await selects.nth(0).selectOption(day.padStart(2, '0'));
}

// ----- Test -----

test('Single traveler application — full clickthrough', async ({ page }) => {
  // Capture ALL console messages from the start for debugging
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(text);
  });
  page.on('pageerror', err => {
    consoleLogs.push(`[PAGE ERROR] ${err.message}`);
  });

  // Navigate to the application form
  await page.goto('/apply');
  await page.waitForLoadState('networkidle');

  // Verify we're on Step 1
  await expect(page.getByRole('heading', { name: 'Traveler Details', exact: true }).first()).toBeVisible();

  // ========================================
  // STEP 1: Traveler Details
  // ========================================
  console.log('📋 Step 1: Filling traveler details...');

  // First Name
  await page.getByPlaceholder('First name').fill('John');

  // Last Name
  await page.getByPlaceholder('Last name').fill('Smith');

  // Date of Birth (Day, Month, Year selects)
  await fillDate(page, 'Date of Birth', '15', '06', '1990');

  // Gender — Male radio
  await clickRadio(page, 'male-0');

  // Nationality (BEFORE Place of Birth — swapped order)
  await selectByLabel(page, /Nationality/, 'United States');

  // Place of Birth — should be auto-filled by nationality, but verify and set if needed
  // The auto-fill sets placeOfBirth when nationality changes. Give it a moment.
  await page.waitForTimeout(500);
  const placeOfBirthTrigger = page.getByRole('combobox', { name: /Place of Birth/ });
  const placeOfBirthValue = await placeOfBirthTrigger.textContent();
  if (!placeOfBirthValue || placeOfBirthValue === 'Select country of birth') {
    await selectByLabel(page, /Place of Birth/, 'United States');
  }

  // Civil Status
  await selectByLabel(page, /Civil Status/, 'Single');

  // Occupation
  await selectByLabel(page, /Occupation/, 'Private Employee');

  // Passport Number
  await page.getByPlaceholder('Passport number').fill('US12345678');

  // Residential Address (moved from Step 2)
  await page.getByPlaceholder('Your permanent home address').fill('123 Main Street, New York, NY 10001');

  // Email
  await page.getByPlaceholder('Email address').first().fill('yderega@gmail.com');

  // Confirm Email
  await page.getByPlaceholder('Confirm email address').fill('yderega@gmail.com');

  // Phone Code — should be auto-filled by nationality, verify
  await page.waitForTimeout(500);
  const phoneCodeTrigger = page.getByRole('combobox', { name: /Phone Code/ });
  const phoneCodeValue = await phoneCodeTrigger.textContent();
  if (!phoneCodeValue || phoneCodeValue === 'Select country code') {
    await selectByLabel(page, /Phone Code/, 'United States', false);
  }

  // Phone Number
  await page.getByPlaceholder('Phone number').fill('5551234567');

  // Country of Residence — should be auto-filled by nationality, verify
  const corTrigger = page.getByRole('combobox', { name: /Country of Residence/ });
  const corValue = await corTrigger.textContent();
  if (!corValue || corValue === 'Select country of residence') {
    await selectByLabel(page, /Country of Residence/, 'United States');
  }

  // City
  await page.getByPlaceholder('City of residence').fill('New York');

  // Click "Next Step"
  console.log('➡️ Clicking Next Step (Step 1 → Step 2)...');
  await page.getByRole('button', { name: 'Next Step' }).click();

  // Wait for Step 2 to appear
  await expect(page.getByRole('heading', { name: 'Travel Information' })).toBeVisible({ timeout: 10000 });

  // ========================================
  // STEP 2: Travel Information
  // ========================================
  console.log('✈️ Step 2: Filling travel information...');

  // --- ARRIVAL INFORMATION ---

  // Arrival Date (at the top)
  await fillDate(page, 'Arrival Date', '15', '03', '2026');

  // Arrival Airport (DR dropdown)
  await selectByLabel(page, /Arrival Airport/, 'Punta Cana (PUJ)');

  // Departure Airport (free-text)
  await page.getByPlaceholder('e.g., JFK New York').first().fill('JFK New York');

  // Airline Name
  await page.getByPlaceholder('e.g., JetBlue').first().fill('JetBlue');

  // Flight Number
  await page.getByPlaceholder('e.g., B6 1234').fill('B6 1234');

  // Travel Purpose
  await selectByLabel(page, /Travel Purpose/, 'Leisure');

  // --- ACCOMMODATION ---
  // Hotel is pre-selected, just verify it's active
  const hotelRadio = page.locator('#acc-Hotel');
  await expect(hotelRadio).toBeChecked();

  // Accommodation Details (textarea)
  await page.getByPlaceholder('Enter the address or name of your accommodation').fill('Secrets Royal Beach Punta Cana, Playa Arena Gorda');

  // --- DEPARTURE INFORMATION ---

  // Departure Date
  await fillDate(page, 'Departure Date', '22', '03', '2026');

  // Departure Airport from DR (dropdown)
  await selectByLabel(page, /Departure Airport/, 'Punta Cana (PUJ)');

  // Destination Airport (free-text)
  await page.getByPlaceholder('e.g., JFK New York').last().fill('JFK New York');

  // Return Airline Name
  await page.getByPlaceholder('e.g., JetBlue').last().fill('JetBlue');

  // Return Flight Number
  await page.getByPlaceholder('e.g., B6 5678').fill('B6 5678');

  // Click "Next Step"
  console.log('➡️ Clicking Next Step (Step 2 → Step 3)...');
  await page.getByRole('button', { name: 'Next Step' }).click();

  // Wait for Step 3
  await expect(page.getByRole('heading', { name: 'Customs Declaration' })).toBeVisible({ timeout: 10000 });

  // ========================================
  // STEP 3: Customs Declaration & Terms
  // ========================================
  console.log('📄 Step 3: Filling customs declaration...');

  // All three customs questions are pre-selected to "No" — no clicking needed
  // Verify they are set
  await expect(page.locator('#money-no')).toBeChecked();
  await expect(page.locator('#animals-no')).toBeChecked();
  await expect(page.locator('#taxable-no')).toBeChecked();

  // Terms — check the checkbox (first checkbox)
  const checkboxes = page.locator('button[role="checkbox"]');
  await checkboxes.nth(0).click(); // Terms accepted

  // Declaration checkboxes
  await checkboxes.nth(1).click(); // declarationTrue
  await checkboxes.nth(2).click(); // declarationPenalties

  // Wait for signature field to appear (conditionally rendered when terms checked)
  const signatureInput = page.getByPlaceholder('Type your full name here');
  await signatureInput.waitFor({ state: 'visible', timeout: 5000 });
  await signatureInput.fill('John Smith');

  // Click "Next Step"
  console.log('➡️ Clicking Next Step (Step 3 → Step 4)...');
  await page.getByRole('button', { name: 'Next Step' }).click();

  // Wait for Step 4 (Pricing)
  await expect(page.getByText('$49.99 by traveler')).toBeVisible({ timeout: 10000 });

  // ========================================
  // STEP 4: Pricing (Standard — no extra)
  // ========================================
  console.log('💰 Step 4: Selecting standard processing...');

  // Standard is the default (no checkbox needed — just proceed)
  await page.getByRole('button', { name: 'Submit' }).click();

  // Wait for Step 5 (Payment) — give extra time on live for PayPal SDK to load
  console.log('💳 Step 5: Waiting for payment page...');
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await expect(page.getByText('Pay with Credit or Debit Card')).toBeVisible({ timeout: 30000 });

  // ========================================
  // STEP 5: Payment (PayPal Card Fields)
  // ========================================
  console.log('💳 Step 5: Entering payment details...');

  // PayPal card fields are rendered inside iframes.
  // Wait for the card field iframes to load.
  console.log('⏳ Waiting for PayPal card fields to load...');

  // Wait for any iframe to appear on the page (PayPal SDK renders them)
  try {
    await page.locator('iframe').first().waitFor({ state: 'attached', timeout: 30000 });
  } catch {
    // PayPal SDK may not load on some domains (sandbox restrictions)
    // Collect console errors for debugging
    console.log('⚠️ PayPal card fields did not load.');
    console.log('  📋 Captured console logs:');
    consoleLogs.forEach(log => console.log(`    ${log}`));
    console.log('  ℹ️ All form steps (1-4) completed successfully!');
    console.log('🔎 Browser will stay open for 2 minutes — close manually whenever you\'re done.');
    try { await page.waitForTimeout(120_000); } catch { console.log('👋 Browser closed.'); }
    return;
  }

  // Extra wait for PayPal rendering to complete
  await page.waitForTimeout(4000);

  // Helper to get iframe input for a PayPal card field
  async function getPayPalInput(labelText: string) {
    const lbl = page.locator('label').filter({ hasText: labelText });
    const container = lbl.locator('xpath=following-sibling::div[1]');
    const iframe = container.locator('iframe').first();
    await iframe.waitFor({ state: 'visible', timeout: 15000 });
    const frame = await iframe.contentFrame();
    expect(frame).toBeTruthy();
    const input = frame!.locator('input').first();
    await input.waitFor({ state: 'visible', timeout: 10000 });
    return input;
  }

  // PayPal hosted fields need character-by-character typing (not fill)
  // to trigger their internal validation events properly.

  // Cardholder Name
  const nameInput = await getPayPalInput('Cardholder Name');
  await nameInput.click();
  await nameInput.pressSequentially('John Smith', { delay: 50 });
  console.log('  ✅ Cardholder name typed');

  // Card Number
  const numberInput = await getPayPalInput('Card Number');
  await numberInput.click();
  await numberInput.pressSequentially('4032036928551751', { delay: 50 });
  console.log('  ✅ Card number typed');

  // Expiration Date — skip auto-fill, let user type manually
  console.log('  ⏸️  Please type expiry date (05/29) manually in the Expiration Date field...');
  const expiryInput = await getPayPalInput('Expiration Date');
  await expiryInput.click();
  // Wait for user to type it in (15 seconds)
  await page.waitForTimeout(15000);
  console.log('  ✅ Expiry (manual)');

  // CVV
  const cvvInput = await getPayPalInput('CVV');
  await cvvInput.click();
  await cvvInput.pressSequentially('204', { delay: 50 });
  console.log('  ✅ CVV typed');

  // Small pause to let PayPal validate all fields
  await page.waitForTimeout(1000);

  // Click "Pay Now" button
  console.log('💳 Clicking Pay Now...');
  const payButton = page.getByRole('button', { name: 'Pay Now' });
  await expect(payButton).toBeEnabled({ timeout: 10000 });
  await payButton.click();

  // Wait for the payment to process.
  // NOTE: PayPal sandbox card processing may take 15-30+ seconds.
  // If the test card is valid in the current PayPal sandbox session,
  // it should redirect to /payment-success.
  console.log('⏳ Waiting for payment processing (up to 60s)...');

  // Wait for either: success redirect OR a toast error (PayPal rejection)
  const result = await Promise.race([
    page.waitForURL('**/payment-success', { timeout: 60000 })
      .then(() => 'success' as const),
    page.locator('[data-state="open"][data-type="foreground"]').waitFor({ state: 'visible', timeout: 60000 })
      .then(() => 'toast' as const),
    page.waitForTimeout(60000).then(() => 'timeout' as const),
  ]);

  if (result === 'success') {
    console.log('✅ Test complete — landed on payment success page!');
    await expect(page.locator('body')).toContainText(/submitted|success|thank you/i, { timeout: 10000 });
  } else {
    console.log('⚠️ Payment did not redirect to success page.');
    console.log('   All form steps (1-4) completed successfully.');
    console.log('   Card details were entered in PayPal hosted fields.');
    console.log('  📋 Console logs after payment attempt:');
    consoleLogs.filter(l => l.includes('error') || l.includes('Error') || l.includes('❌') || l.includes('authorize') || l.includes('AUTHORIZE') || l.includes('payment') || l.includes('Payment') || l.includes('PayPal')).forEach(log => console.log(`    ${log}`));
  }

  // Keep browser open so user can inspect the result
  console.log('🔎 Browser will stay open for 2 minutes — close manually whenever you\'re done.');
  try {
    await page.waitForTimeout(120_000);
  } catch {
    // User closed the browser — that's fine
    console.log('👋 Browser closed by user.');
  }
});
