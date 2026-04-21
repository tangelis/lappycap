#!/usr/bin/env node

import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const CHROMIUM = '/usr/bin/chromium-browser';
const URL = process.env.TEST_URL || 'http://127.0.0.1:4176/remote.html';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.url().includes('cast_sender.js')) {
        request.abort();
      } else {
        request.continue();
      }
    });
    await page.evaluateOnNewDocument(() => {
      const listeners = new Map();
      const sentMessages = [];
      const messageListeners = [];
      let visibilityState = 'visible';

      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get() {
          return visibilityState;
        },
      });

      const session = {
        sendMessage(namespace, message) {
          sentMessages.push({ namespace, message });
          return Promise.resolve();
        },
        getCastDevice() {
          return { friendlyName: 'Bedroom TV' };
        },
        addMessageListener(namespace, handler) {
          messageListeners.push({ namespace, handler });
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
      };

      window.chrome = {
        cast: {
          AutoJoinPolicy: {
            ORIGIN_SCOPED: 'ORIGIN_SCOPED',
          },
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
        sentMessages,
        messageListeners,
        emit(type, payload) {
          for (const handler of listeners.get(type) || []) handler(payload);
        },
        setVisibility(nextState) {
          visibilityState = nextState;
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
    await page.waitForSelector('#stationSelect');

    await page.evaluate(() => {
      window.__onGCastApiAvailable(true);
      window.__castMock.emit(
        cast.framework.CastContextEventType.CAST_STATE_CHANGED,
        { castState: cast.framework.CastState.CONNECTED },
      );
      window.__castMock.emit(
        cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
        { sessionState: cast.framework.SessionState.SESSION_STARTED },
      );
    });

    const listenerCount = await page.evaluate(() => window.__castMock.messageListeners.length);
    assert.equal(listenerCount, 1, 'remote should register exactly one receiver message listener per session');

    await page.evaluate(() => {
      const listener = window.__castMock.messageListeners[0];
      listener.handler(listener.namespace, JSON.stringify({
        type: 'status',
        stationName: 'Groove Salad',
        scene: 'Ocean Dreams',
      }));
    });

    const nowPlaying = await page.evaluate(() => ({
      station: document.getElementById('npStation')?.textContent?.trim(),
      scene: document.getElementById('npScene')?.textContent?.trim(),
      visible: getComputedStyle(document.getElementById('nowPlaying')).display !== 'none',
    }));
    assert.equal(nowPlaying.station, 'Groove Salad', 'remote should show station updates from the receiver');
    assert.equal(nowPlaying.scene, 'Ocean Dreams', 'remote should accept receiver scene updates');
    assert.equal(nowPlaying.visible, true, 'remote should show the now playing card after a receiver update');

    await page.evaluate(() => {
      const listener = window.__castMock.messageListeners[0];
      listener.handler(listener.namespace, JSON.stringify({
        type: 'status',
        stationName: 'Groove Salad',
        sceneName: 'Ocean Dreams',
        playing: false,
      }));
    });
    const pauseText = await page.$eval('#pauseBtn', (el) => el.textContent?.trim());
    assert.match(pauseText || '', /Resume/, 'remote pause button should reflect receiver-originated pause state');

    await page.evaluate(() => {
      const listener = window.__castMock.messageListeners[0];
      listener.handler(listener.namespace, JSON.stringify({
        type: 'status',
        stationName: '',
        sceneName: 'Ocean Dreams',
        playing: false,
        stopped: true,
      }));
    });
    const stoppedState = await page.evaluate(() => ({
      pauseText: document.getElementById('pauseBtn')?.textContent?.trim(),
      nowPlayingVisible: getComputedStyle(document.getElementById('nowPlaying')).display !== 'none',
    }));
    assert.match(stoppedState.pauseText || '', /Start/, 'remote stop state should offer a fresh start instead of resume');
    assert.equal(stoppedState.nowPlayingVisible, false, 'remote should hide now-playing when playback is stopped');

    await page.evaluate(() => {
      window.__castMock.setVisibility('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const hiddenStopCount = await page.evaluate(
      () => window.__castMock.sentMessages.filter((entry) => entry.message?.type === 'stop').length,
    );
    assert.equal(hiddenStopCount, 0, 'backgrounding the remote should not stop TV playback automatically');

    console.log('test-remote-cast: PASS');
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error('test-remote-cast: FAIL');
  console.error(error);
  process.exitCode = 1;
});
