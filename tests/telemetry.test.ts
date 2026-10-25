import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  app: {
    isPackaged: true as boolean,
    getVersion: vi.fn(() => '1.2.3'),
    getLocale: vi.fn(() => 'en-US'),
    on: vi.fn(),
  },
  fetch: vi.fn(),
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
}));

vi.mock('electron', () => ({
  app: mocks.app,
  net: { fetch: mocks.fetch },
}));

vi.mock('../src/main/settings', () => ({
  loadSettings: mocks.loadSettings,
  saveSettings: mocks.saveSettings,
}));

let storedSettings: Record<string, any> = {};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

async function loadTelemetry() {
  return import('../src/main/telemetry');
}

function response(status: number): Response {
  return new Response(null, { status });
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubEnv('VITEST', '');
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('DO_NOT_TRACK', '');
  vi.stubEnv('ACHU_TELEMETRY', '');
  vi.stubEnv('APPIMAGE', '');
  vi.stubEnv('PORTABLE_EXECUTABLE_FILE', '');
  storedSettings = { telemetryEnabled: true };
  mocks.app.isPackaged = true;
  mocks.app.getVersion.mockReset().mockReturnValue('1.2.3');
  mocks.app.getLocale.mockReset().mockReturnValue('en-US');
  mocks.app.on.mockReset();
  mocks.fetch.mockReset().mockResolvedValue(response(204));
  mocks.loadSettings.mockImplementation(() => clone(storedSettings));
  mocks.saveSettings.mockImplementation((settings: Record<string, any>) => {
    storedSettings = clone(settings);
    return true;
  });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('telemetry suppression', () => {
  it.each([
    ['unpackaged builds', () => { mocks.app.isPackaged = false; }],
    ['DO_NOT_TRACK', () => { vi.stubEnv('DO_NOT_TRACK', '1'); }],
    ['ACHU_TELEMETRY', () => { vi.stubEnv('ACHU_TELEMETRY', '0'); }],
  ])('suppresses %s', async (_name, suppress) => {
    const telemetry = await loadTelemetry();
    suppress();
    telemetry.initTelemetry({ settingsExistedAtLaunch: false });
    telemetry.recordFeature('app_open');
    await telemetry.maybeSendDailyPing();
    telemetry.persistCounts();

    expect(telemetry.isTelemetrySuppressed()).toBe(true);
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(storedSettings.telemetryPendingFeatures).toBeUndefined();
  });

  it('checks VITEST and NODE_ENV at call time', async () => {
    const telemetry = await loadTelemetry();
    expect(telemetry.isTelemetrySuppressed()).toBe(false);
    vi.stubEnv('VITEST', '1');
    expect(telemetry.isTelemetrySuppressed()).toBe(true);
    vi.stubEnv('VITEST', '');
    vi.stubEnv('NODE_ENV', 'test');
    expect(telemetry.isTelemetrySuppressed()).toBe(true);
  });
});

describe('telemetry initialization', () => {
  it('creates an install UUID and marks a first-run install', async () => {
    const telemetry = await loadTelemetry();
    telemetry.initTelemetry({ settingsExistedAtLaunch: false });

    expect(storedSettings.telemetryInstallId).toMatch(/^[0-9a-f-]{36}$/);
    expect(storedSettings.telemetryPendingFirstRun).toBe(true);
    expect(mocks.app.on).toHaveBeenCalledWith('before-quit', telemetry.persistCounts);
  });

  it('does not mark an existing settings file as a first-run install', async () => {
    const telemetry = await loadTelemetry();
    telemetry.initTelemetry({ settingsExistedAtLaunch: true });

    expect(storedSettings.telemetryInstallId).toMatch(/^[0-9a-f-]{36}$/);
    expect(storedSettings.telemetryPendingFirstRun).toBe(false);
  });

  it('starts once when telemetry is enabled mid-session', async () => {
    storedSettings.telemetryEnabled = false;
    vi.setSystemTime(new Date('2026-10-08T12:00:00.000Z'));
    const telemetry = await loadTelemetry();
    telemetry.initTelemetry({ settingsExistedAtLaunch: false });

    expect(storedSettings.telemetryInstallId).toBeUndefined();
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    storedSettings.telemetryEnabled = true;
    telemetry.setTelemetryEnabled(true);
    expect(storedSettings.telemetryInstallId).toMatch(/^[0-9a-f-]{36}$/);
    expect(storedSettings.telemetryPendingFirstRun).toBe(false);
    telemetry.setTelemetryEnabled(true);

    expect(vi.getTimerCount()).toBe(1);
    expect(mocks.app.on).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(30_000);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(30_000);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('daily telemetry pings', () => {
  it('posts the telemetry payload and recorded features', async () => {
    mocks.app.getVersion.mockReturnValue('v'.repeat(80));
    mocks.app.getLocale.mockReturnValue('l'.repeat(80));
    const telemetry = await loadTelemetry();
    telemetry.initTelemetry({ settingsExistedAtLaunch: false });
    telemetry.recordFeature('app_open');
    telemetry.recordFeature('export');

    await telemetry.maybeSendDailyPing(new Date('2026-10-01T12:00:00.000Z'));

    const [url, options] = mocks.fetch.mock.calls[0];
    expect(url).toBe(telemetry.TELEMETRY_URL);
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(options.body)).toEqual({
      installId: storedSettings.telemetryInstallId,
      event: 'daily',
      appVersion: 'v'.repeat(64),
      electronVersion: process.versions.electron ?? '',
      os: process.platform,
      arch: process.arch,
      channel: process.platform === 'linux' ? 'deb' : telemetry.getChannel(),
      locale: 'l'.repeat(64),
      firstRun: true,
      features: { app_open: 1, export: 1 },
    });
  });

  it('does not send twice in one UTC day and sends again the next day', async () => {
    const telemetry = await loadTelemetry();
    telemetry.initTelemetry({ settingsExistedAtLaunch: true });

    await telemetry.maybeSendDailyPing(new Date('2026-10-01T23:59:00.000Z'));
    await telemetry.maybeSendDailyPing(new Date('2026-10-01T23:59:59.000Z'));
    expect(mocks.fetch).toHaveBeenCalledTimes(1);

    await telemetry.maybeSendDailyPing(new Date('2026-10-02T00:00:00.000Z'));
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it('clears sent counts and first-run state while preserving features recorded in flight', async () => {
    let resolveFetch!: (res: Response) => void;
    mocks.fetch.mockReturnValueOnce(new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    }));

    const telemetry = await loadTelemetry();
    telemetry.initTelemetry({ settingsExistedAtLaunch: false });
    telemetry.recordFeature('sent_feature');
    telemetry.persistCounts();

    const ping = telemetry.maybeSendDailyPing(new Date('2026-10-03T12:00:00.000Z'));
    await Promise.resolve();
    telemetry.recordFeature('during_request');
    resolveFetch(response(204));
    await ping;

    expect(storedSettings.telemetryPendingFeatures).toBeUndefined();
    expect(storedSettings.telemetryPendingFirstRun).toBeUndefined();
    expect(storedSettings.telemetryLastPingDay).toBe('2026-10-03');

    telemetry.persistCounts();
    expect(storedSettings.telemetryPendingFeatures).toEqual({ during_request: 1 });
  });

  it('keeps pending counts after a network error or 503', async () => {
    const telemetry = await loadTelemetry();
    telemetry.initTelemetry({ settingsExistedAtLaunch: true });
    telemetry.recordFeature('failed_send');
    mocks.fetch.mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(response(503));

    await telemetry.maybeSendDailyPing(new Date('2026-10-04T12:00:00.000Z'));
    expect(storedSettings.telemetryPendingFeatures).toEqual({ failed_send: 1 });
    expect(storedSettings.telemetryLastPingDay).toBeUndefined();

    await telemetry.maybeSendDailyPing(new Date('2026-10-05T12:00:00.000Z'));
    expect(storedSettings.telemetryPendingFeatures).toEqual({ failed_send: 1 });
    expect(storedSettings.telemetryLastPingDay).toBeUndefined();
  });

  it('aborts an in-flight request and does not restore data after opt-out', async () => {
    let resolveFetch!: (res: Response) => void;
    let requestSignal!: AbortSignal;
    mocks.fetch.mockImplementationOnce((_url, init) => {
      requestSignal = init.signal;
      return new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
    });

    const telemetry = await loadTelemetry();
    telemetry.initTelemetry({ settingsExistedAtLaunch: false });
    telemetry.recordFeature('pending_feature');

    const ping = telemetry.maybeSendDailyPing(new Date('2026-10-05T12:00:00.000Z'));
    expect(storedSettings.telemetryPendingFeatures).toEqual({ pending_feature: 1 });
    expect(requestSignal).toBeInstanceOf(AbortSignal);

    telemetry.setTelemetryEnabled(false);
    expect(requestSignal.aborted).toBe(true);
    expect(storedSettings.telemetryPendingFeatures).toBeUndefined();

    resolveFetch(response(204));
    await ping;

    expect(storedSettings.telemetryLastPingDay).toBeUndefined();
    expect(storedSettings.telemetryPendingFeatures).toBeUndefined();
  });

  it('drops pending counts after a 400 response', async () => {
    mocks.fetch.mockResolvedValueOnce(response(400));
    const telemetry = await loadTelemetry();
    telemetry.initTelemetry({ settingsExistedAtLaunch: false });
    telemetry.recordFeature('invalid_payload');

    await telemetry.maybeSendDailyPing(new Date('2026-10-06T12:00:00.000Z'));

    expect(storedSettings.telemetryPendingFeatures).toBeUndefined();
    expect(storedSettings.telemetryPendingFirstRun).toBeUndefined();
    expect(storedSettings.telemetryLastPingDay).toBe('2026-10-06');
  });
});

describe('feature counters and opt-out', () => {
  it('keeps in-memory counts when saving settings fails', async () => {
    const telemetry = await loadTelemetry();
    telemetry.initTelemetry({ settingsExistedAtLaunch: true });
    telemetry.recordFeature('retry_me');

    mocks.saveSettings.mockImplementationOnce(() => false);
    telemetry.persistCounts();
    expect(storedSettings.telemetryPendingFeatures).toBeUndefined();

    telemetry.persistCounts();
    expect(storedSettings.telemetryPendingFeatures).toEqual({ retry_me: 1 });
  });

  it('ignores invalid names and limits distinct pending features to 50', async () => {
    storedSettings.telemetryPendingFeatures = { existing_feature: 1 };
    const telemetry = await loadTelemetry();
    telemetry.initTelemetry({ settingsExistedAtLaunch: true });

    telemetry.recordFeature('Bad-Name');
    telemetry.recordFeature('');
    telemetry.recordFeature('a'.repeat(41));
    telemetry.recordFeature(42);
    for (let i = 0; i < 60; i++) telemetry.recordFeature(`feature_${i}`);
    telemetry.persistCounts();

    expect(Object.keys(storedSettings.telemetryPendingFeatures)).toHaveLength(50);
    expect(storedSettings.telemetryPendingFeatures.feature_48).toBe(1);
    expect(storedSettings.telemetryPendingFeatures.feature_49).toBeUndefined();
  });

  it('clears pending and in-memory data when telemetry is disabled', async () => {
    const telemetry = await loadTelemetry();
    telemetry.initTelemetry({ settingsExistedAtLaunch: false });
    storedSettings.telemetryPendingFeatures = { previously_saved: 2 };
    telemetry.recordFeature('unsaved_feature');
    telemetry.setTelemetryEnabled(false);
    telemetry.recordFeature('after_opt_out');
    telemetry.persistCounts();
    await telemetry.maybeSendDailyPing(new Date('2026-10-07T12:00:00.000Z'));

    expect(storedSettings.telemetryPendingFeatures).toBeUndefined();
    expect(storedSettings.telemetryPendingFirstRun).toBeUndefined();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
