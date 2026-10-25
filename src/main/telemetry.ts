import { randomUUID } from 'crypto';
import { app, net } from 'electron';
import { isTelemetryFeature } from '../shared/telemetryFeatures';
import { loadSettings, saveSettings } from './settings';

export const TELEMETRY_URL = 'https://telemetry.achu.app/v1/ping';
export const FEATURE_RE = /^[a-z0-9_]{1,40}$/;
export const MAX_FEATURES = 50;
export const MAX_COUNT = 1_000_000;

let enabledCache = false;
let memCounts: Record<string, number> = {};
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;
let inFlightController: AbortController | null = null;
let settingsExistedAtLaunch = false;
let initCalled = false;
let started = false;

export function isTelemetrySuppressed(): boolean {
  return !app.isPackaged
    || process.env.DO_NOT_TRACK === '1'
    || process.env.DO_NOT_TRACK === 'true'
    || process.env.ACHU_TELEMETRY === '0'
    || process.env.ACHU_TELEMETRY === 'false'
    || Boolean(process.env.VITEST)
    || process.env.NODE_ENV === 'test';
}

export function getChannel(): string {
  if (process.platform === 'win32') {
    if ((process as any).windowsStore) return 'appx';
    if (process.env.PORTABLE_EXECUTABLE_FILE) return 'portable';
    return 'nsis';
  }
  if (process.platform === 'darwin') return 'mac';
  if (process.platform === 'linux') return process.env.APPIMAGE ? 'appimage' : 'deb';
  return process.platform;
}

function schedulePersist(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistCounts();
  }, 5_000);
}

export function recordFeature(name: unknown): void {
  if (isTelemetrySuppressed() || !enabledCache || !isTelemetryFeature(name) || !FEATURE_RE.test(name)) {
    return;
  }

  const hasMemoryFeature = Object.prototype.hasOwnProperty.call(memCounts, name);
  if (!hasMemoryFeature) {
    const pending = loadSettings().telemetryPendingFeatures ?? {};
    const knownFeatures = new Set([...Object.keys(pending), ...Object.keys(memCounts)]);
    if (!knownFeatures.has(name) && knownFeatures.size >= MAX_FEATURES) return;
  }

  Object.defineProperty(memCounts, name, {
    value: Math.min(MAX_COUNT, (hasMemoryFeature ? memCounts[name] : 0) + 1),
    enumerable: true,
    configurable: true,
    writable: true,
  });
  schedulePersist();
}

export function persistCounts(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (Object.keys(memCounts).length === 0) return;

  const settings = { ...loadSettings() };
  const pending = Object.assign(
    Object.create(null) as Record<string, number>,
    settings.telemetryPendingFeatures ?? {}
  );
  for (const [name, count] of Object.entries(memCounts)) {
    pending[name] = Math.min(MAX_COUNT, (pending[name] ?? 0) + count);
  }
  settings.telemetryPendingFeatures = pending;
  if (saveSettings(settings)) memCounts = {};
}

function startTelemetry(isLaunch: boolean): void {
  if (started || !enabledCache || isTelemetrySuppressed()) return;
  started = true;

  const settings = { ...loadSettings() };
  if (!settings.telemetryInstallId) {
    settings.telemetryInstallId = randomUUID();
    settings.telemetryPendingFirstRun = isLaunch && !settingsExistedAtLaunch;
    saveSettings(settings);
  }

  setTimeout(() => {
    void maybeSendDailyPing();
    setInterval(() => {
      void maybeSendDailyPing();
    }, 60 * 60 * 1_000);
  }, 30 * 1_000);
  app.on('before-quit', persistCounts);
}

export function setTelemetryEnabled(enabled: boolean): void {
  enabledCache = enabled;
  if (enabled) {
    if (initCalled && !isTelemetrySuppressed()) startTelemetry(false);
    return;
  }

  inFlightController?.abort();
  memCounts = {};
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }

  const settings = { ...loadSettings() };
  if (settings.telemetryPendingFeatures !== undefined || settings.telemetryPendingFirstRun !== undefined) {
    delete settings.telemetryPendingFeatures;
    delete settings.telemetryPendingFirstRun;
    saveSettings(settings);
  }
}

export function initTelemetry(options: { settingsExistedAtLaunch: boolean }): void {
  initCalled = true;
  settingsExistedAtLaunch = options.settingsExistedAtLaunch;
  const settings = loadSettings();
  enabledCache = settings.telemetryEnabled !== false;
  if (!isTelemetrySuppressed() && enabledCache) startTelemetry(true);
}

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function maybeSendDailyPing(now = new Date()): Promise<void> {
  if (inFlight) return;
  inFlight = true;

  try {
    if (isTelemetrySuppressed() || !enabledCache) return;

    const day = utcDay(now);
    if (loadSettings().telemetryLastPingDay === day) return;

    persistCounts();
    const settings = loadSettings();
    if (!settings.telemetryInstallId) return;

    const features = Object.fromEntries(
      Object.entries(settings.telemetryPendingFeatures ?? {})
        .filter(([, count]) => count > 0)
        .slice(0, MAX_FEATURES)
    );
    const payload = {
      installId: settings.telemetryInstallId.slice(0, 64),
      event: 'daily'.slice(0, 64),
      appVersion: app.getVersion().slice(0, 64),
      electronVersion: (process.versions.electron ?? '').slice(0, 64),
      os: process.platform.slice(0, 64),
      arch: process.arch.slice(0, 64),
      channel: getChannel().slice(0, 64),
      locale: app.getLocale().slice(0, 64),
      firstRun: settings.telemetryPendingFirstRun === true,
      features,
    };

    inFlightController = new AbortController();
    const response = await net.fetch(TELEMETRY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.any([
        inFlightController.signal,
        AbortSignal.timeout(10_000),
      ]),
    });

    if (!enabledCache) return;
    if (!response.ok && response.status !== 400) return;

    const latest = { ...loadSettings() };
    const pending = Object.assign(
      Object.create(null) as Record<string, number>,
      latest.telemetryPendingFeatures ?? {}
    );
    for (const [name, count] of Object.entries(features)) {
      const remaining = (pending[name] ?? 0) - count;
      if (remaining <= 0) delete pending[name];
      else pending[name] = remaining;
    }
    if (Object.keys(pending).length > 0) latest.telemetryPendingFeatures = pending;
    else delete latest.telemetryPendingFeatures;
    latest.telemetryLastPingDay = day;
    delete latest.telemetryPendingFirstRun;
    saveSettings(latest);
  } catch {
    console.warn('Telemetry request failed');
  } finally {
    inFlight = false;
    inFlightController = null;
  }
}
