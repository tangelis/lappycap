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
      const sentMessages = [];
      const messageListeners = [];
      const session = {
        sendMessage(namespace, message) {
          sentMessages.push({ namespace, message });
          return Promise.resolve();
        },
        addMessageListener(namespace, handler) {
          messageListeners.push({ namespace, handler });
        },
        getCastDevice() {
          return { friendlyName: 'Living Room TV' };
        },
        getSessionId() {
          return 'test-session';
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

      const castFramework = {
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
      };

      window.cast = { framework: castFramework };
      window.__castMock = {
        sentMessages,
        messageListeners,
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
    await page.waitForSelector('#volume');

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

    await page.$eval('#volume', (el) => {
      el.value = '75';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.$eval('#cycle-speed', (el) => {
      el.value = '15';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.$eval('#blend-speed', (el) => {
      el.value = '3';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const sentMessages = await page.evaluate(() => window.__castMock.sentMessages);
    assert(
      sentMessages.some((entry) => entry.message?.type === 'settings' && entry.message.volume === 0.75),
      'volume changes should be forwarded to the cast receiver',
    );
    assert(
      sentMessages.some((entry) => entry.message?.type === 'settings' && entry.message.cycleDuration === 15),
      'cycle changes should be forwarded to the cast receiver',
    );
    assert(
      sentMessages.some((entry) => entry.message?.type === 'settings' && entry.message.blendDuration === 3),
      'blend changes should be forwarded to the cast receiver',
    );
    const localVolume = await page.$eval('#audio-element', (el) => el.volume);
    assert.equal(localVolume, 0, 'local audio should stay muted while casting even if the slider changes');

    const beforeShuffle = await page.$eval('#btn-shuffle', (el) => el.classList.contains('active'));
    await page.keyboard.press('s');
    const afterShuffle = await page.$eval('#btn-shuffle', (el) => el.classList.contains('active'));
    assert.notEqual(afterShuffle, beforeShuffle, 'keyboard shuffle toggle should update the button state');

    const listenerCount = await page.evaluate(() => window.__castMock.messageListeners.length);
    assert.equal(listenerCount, 1, 'main sender should subscribe to receiver status messages');
    await page.evaluate(() => {
      const listener = window.__castMock.messageListeners[0];
      listener.handler(listener.namespace, JSON.stringify({
        type: 'status',
        stationName: 'Groove Salad',
        sceneName: 'Ocean Dreams',
        playing: false,
        stopped: true,
      }));
    });
    const pauseButtonText = await page.$eval('#btn-pause', (el) => el.textContent?.trim());
    const nowPlayingVisible = await page.$eval('#now-playing', (el) => el.classList.contains('visible'));
    assert.match(pauseButtonText || '', /▶|Play/, 'main sender should reflect receiver stop state');
    assert.equal(nowPlayingVisible, false, 'main sender should clear now-playing when the receiver stops playback');

    const sentBeforeRestart = sentMessages.length;
    await page.click('#btn-pause');
    const sentAfterRestart = await page.evaluate(() => window.__castMock.sentMessages);
    assert.equal(
      sentAfterRestart[sentBeforeRestart]?.message?.type,
      'load',
      'after a receiver stop, the main play button should start the selected sound again',
    );

    const castStatus = await page.$eval('#session-chip', (el) => el.textContent?.trim());
    assert.match(castStatus || '', /Living Room TV/, 'cast status should show the device name');

    console.log('test-cast-sender: PASS');
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error('test-cast-sender: FAIL');
  console.error(error);
  process.exitCode = 1;
});
