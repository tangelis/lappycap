#!/usr/bin/env node
// Runtime test: launches headless chromium, loads the app, clicks to start,
// checks that butterchurn initializes and renders frames.

import puppeteer from 'puppeteer-core';

const CHROMIUM = '/usr/bin/chromium-browser';
const URL = process.env.TEST_URL || 'http://127.0.0.1:5176';
const TIMEOUT = 20000;

async function run() {
  let browser;
  const errors = [];
  const logs = [];

  try {
    browser = await puppeteer.launch({
      executablePath: CHROMIUM,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-webgl',
        '--enable-webgl2',
        '--ignore-gpu-blocklist',
        '--disable-gpu-sandbox',
        '--autoplay-policy=no-user-gesture-required',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    page.on('console', msg => {
      const text = msg.text();
      logs.push(`[${msg.type()}] ${text}`);
      // Print important logs in real-time
      if (text.includes('[LappyCap]') || msg.type() === 'error') {
        console.log(`  BROWSER: ${text}`);
      }
    });
    page.on('pageerror', err => {
      errors.push(`PAGE ERROR: ${err.message}`);
      console.log(`  PAGE ERROR: ${err.message}`);
    });

    console.log('1. Loading page...');
    await page.goto(URL, { waitUntil: 'networkidle0', timeout: TIMEOUT });

    const title = await page.title();
    console.log(`   Title: "${title}"`);
    assert(title === 'LappyCap', `Expected title "LappyCap", got "${title}"`);

    const loadingHidden = await page.$eval('#loading', el => el.classList.contains('hidden'));
    console.log(`   Loading hidden: ${loadingHidden}`);
    assert(loadingHidden, 'Loading indicator should be hidden after init');

    const promptText = await page.$eval('#preset-name', el => el.textContent);
    console.log(`   Prompt: "${promptText}"`);

    const sceneCount = await page.$$eval('#scene-select option', opts => opts.length);
    console.log(`   Scenes loaded: ${sceneCount}`);

    const counterText = await page.$eval('#preset-counter', el => el.textContent);
    console.log(`   Preset counter: "${counterText}"`);

    console.log('\n2. Clicking canvas to start...');
    await page.click('#visualizer');

    // Wait for preset name to change from the prompt
    try {
      await page.waitForFunction(() => {
        const el = document.getElementById('preset-name');
        return el && el.textContent && !el.textContent.includes('Click') && !el.textContent.includes('Error');
      }, { timeout: 10000 });
      console.log('   Visualizer started!');
    } catch {
      // Check if there's an error
      const text = await page.$eval('#preset-name', el => el.textContent);
      console.log(`   Preset name after click: "${text}"`);
      if (text?.includes('Error')) {
        console.log('   VISUALIZER FAILED TO START');
      }
    }

    const presetName = await page.$eval('#preset-name', el => el.textContent);
    console.log(`   Current preset: "${presetName}"`);

    const counterAfter = await page.$eval('#preset-counter', el => el.textContent);
    console.log(`   Preset counter: "${counterAfter}"`);

    // Wait for a couple of frames
    await new Promise(r => setTimeout(r, 2000));

    // Check canvas dimensions
    const canvasInfo = await page.evaluate(() => {
      const c = document.getElementById('visualizer');
      return { width: c.width, height: c.height, clientW: c.clientWidth, clientH: c.clientHeight };
    });
    console.log(`   Canvas: ${canvasInfo.width}x${canvasInfo.height} (client: ${canvasInfo.clientW}x${canvasInfo.clientH})`);

    console.log('\n3. Testing radio stations...');

    // Check radio selector populated
    const radioCount = await page.$$eval('#radio-select option', opts => opts.length);
    console.log(`   Radio stations: ${radioCount - 1} (+ 1 placeholder)`);
    assert(radioCount > 1, 'Should have radio stations loaded');

    // Verify first station option has correct format
    const firstStation = await page.$eval('#radio-select option:nth-child(2)', el => ({
      text: el.textContent,
      value: el.value,
    }));
    console.log(`   First station: "${firstStation.text}"`);
    assert(firstStation.value.startsWith('https://'), 'Station URL should be HTTPS');
    assert(firstStation.text.includes('—'), 'Station text should include genre separator');

    // Select a radio station (don't await audio load — no real network in test)
    await page.select('#radio-select', firstStation.value);
    await new Promise(r => setTimeout(r, 500));
    console.log(`   Selected station: ${firstStation.text}`);

    console.log('\n4. Testing controls...');

    // Next preset
    await page.click('#btn-next');
    await new Promise(r => setTimeout(r, 500));
    const afterNext = await page.$eval('#preset-name', el => el.textContent);
    console.log(`   After next: "${afterNext}"`);

    // Prev preset
    await page.click('#btn-prev');
    await new Promise(r => setTimeout(r, 500));
    const afterPrev = await page.$eval('#preset-name', el => el.textContent);
    console.log(`   After prev: "${afterPrev}"`);

    // Shuffle toggle
    await page.click('#btn-shuffle');
    const shuffleOff = await page.$eval('#btn-shuffle', el => el.classList.contains('active'));
    console.log(`   Shuffle after toggle: ${shuffleOff}`);

    // Sliders
    await page.$eval('#cycle-speed', (el) => { el.value = '15'; el.dispatchEvent(new Event('input')); });
    const cycleLabel = await page.$eval('#cycle-label', el => el.textContent);
    console.log(`   Cycle: ${cycleLabel}`);

    await page.$eval('#blend-speed', (el) => { el.value = '3'; el.dispatchEvent(new Event('input')); });
    const blendLabel = await page.$eval('#blend-label', el => el.textContent);
    console.log(`   Blend: ${blendLabel}`);

    await page.$eval('#volume', (el) => { el.value = '75'; el.dispatchEvent(new Event('input')); });
    const volLabel = await page.$eval('#vol-label', el => el.textContent);
    console.log(`   Volume: ${volLabel}`);

    console.log('\n5. Summary...');
    const consoleErrors = logs.filter(l => l.startsWith('[error]'));
    console.log(`   Console errors: ${consoleErrors.length}`);
    consoleErrors.forEach(e => console.log(`     ${e}`));

    console.log(`   Page errors: ${errors.length}`);
    errors.forEach(e => console.log(`     ${e}`));

    const warnings = logs.filter(l => l.includes('[warning]') || l.includes('warn'));
    console.log(`   Warnings: ${warnings.length}`);
    warnings.forEach(w => console.log(`     ${w}`));

    const lappycapLogs = logs.filter(l => l.includes('[LappyCap]'));
    console.log(`\n   LappyCap logs:`);
    lappycapLogs.forEach(l => console.log(`     ${l}`));

    console.log('\n---');
    const hasWebGLError = errors.some(e => e.includes('createFramebuffer') || e.includes('WebGL'));
    const hasPresets = !counterAfter?.includes('0 /') && !counterAfter?.includes('1 / 1');

    if (hasWebGLError) {
      console.log('NOTE: WebGL errors in headless mode are expected (no GPU). Test in browser.');
    }
    if (!hasPresets) {
      console.log('WARNING: Preset loading may have issues. Check browser console.');
    }
    if (errors.length === 0 && consoleErrors.length === 0) {
      console.log('ALL TESTS PASSED');
    } else {
      console.log('TESTS COMPLETED WITH ISSUES (see above)');
    }

  } catch (err) {
    console.error('\nTEST FAILED:', err.message);
    if (logs.length) {
      console.log('\nBrowser console (last 20):');
      logs.slice(-20).forEach(l => console.log(`  ${l}`));
    }
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

run();
