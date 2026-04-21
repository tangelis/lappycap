#!/usr/bin/env node

import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const CHROMIUM = '/usr/bin/chromium-browser';
const URL = process.env.TEST_URL || 'http://127.0.0.1:4176';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      const listeners = new Map();
      const session = {
        sendMessage() {
          return Promise.resolve();
        },
        addMessageListener() {},
        getCastDevice() {
          return { friendlyName: 'Living Room TV' };
        },
        getSessionId() {
          return 'layout-session';
        },
      };

      const context = {
        setOptions() {},
        addEventListener(type, handler) {
          const handlers = listeners.get(type) || [];
          handlers.push(handler);
          listeners.set(type, handlers);
        },
        getCurrentSession() {
          return session;
        },
        requestSession() {
          return Promise.resolve();
        },
        getCastState() {
          return 'NOT_CONNECTED';
        },
      };

      window.cast = {
        framework: {
          CastContext: {
            getInstance() {
              return context;
            },
          },
          SessionState: {
            SESSION_STARTED: 'SESSION_STARTED',
            SESSION_RESUMED: 'SESSION_RESUMED',
            SESSION_ENDED: 'SESSION_ENDED',
          },
          CastContextEventType: {
            SESSION_STATE_CHANGED: 'SESSION_STATE_CHANGED',
            CAST_STATE_CHANGED: 'CAST_STATE_CHANGED',
          },
          CastState: {
            NO_DEVICES_AVAILABLE: 'NO_DEVICES_AVAILABLE',
            NOT_CONNECTED: 'NOT_CONNECTED',
            CONNECTING: 'CONNECTING',
            CONNECTED: 'CONNECTED',
          },
        },
      };

      window.__castMock = {
        emit(type, payload) {
          for (const handler of listeners.get(type) || []) handler(payload);
        },
      };

      const originalAppendChild = HTMLHeadElement.prototype.appendChild;
      HTMLHeadElement.prototype.appendChild = function appendChild(node) {
        if (node.tagName === 'SCRIPT' && /cast_sender\.js/.test(node.src)) {
          queueMicrotask(() => window.__onGCastApiAvailable?.(true));
          return node;
        }
        return originalAppendChild.call(this, node);
      };
    });

    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 20000 });
    await page.waitForSelector('#controls');

    const shellExists = await page.evaluate(() => ({
      primary: !!document.getElementById('primary-controls'),
      secondary: !!document.getElementById('secondary-actions'),
      sessionChip: !!document.getElementById('session-chip'),
      playlistHidden: getComputedStyle(document.getElementById('btn-playlist')).display === 'none',
    }));
    assert.equal(shellExists.primary, true, 'primary control strip should exist');
    assert.equal(shellExists.secondary, true, 'secondary actions strip should exist');
    assert.equal(shellExists.sessionChip, true, 'persistent cast session chip should exist');
    assert.equal(shellExists.playlistHidden, true, 'playlist button should be hidden until the feature is ready');

    await page.evaluate(() => {
      window.__castMock.emit(
        cast.framework.CastContextEventType.CAST_STATE_CHANGED,
        { castState: cast.framework.CastState.CONNECTED },
      );
      window.__castMock.emit(
        cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
        { sessionState: cast.framework.SessionState.SESSION_STARTED },
      );
    });

    const sessionText = await page.$eval('#session-chip', (el) => el.textContent?.trim());
    assert.match(sessionText || '', /Living Room TV/, 'session chip should show the active Cast device');

    await page.mouse.move(100, 100);
    await new Promise((resolve) => setTimeout(resolve, 4300));
    const visibility = await page.evaluate(() => ({
      controlsHidden: document.getElementById('controls')?.classList.contains('hidden'),
      chipVisible: getComputedStyle(document.getElementById('session-chip')).opacity !== '0',
    }));
    assert.equal(visibility.controlsHidden, true, 'control surface should still auto-hide');
    assert.equal(visibility.chipVisible, true, 'session chip should stay visible when controls hide');

    console.log('test-main-ui-layout: PASS');
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error('test-main-ui-layout: FAIL');
  console.error(error);
  process.exitCode = 1;
});
