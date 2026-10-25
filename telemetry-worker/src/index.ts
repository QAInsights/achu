export interface Env {
	DB: D1Database;
	PING_LIMITER: RateLimit;
	LOGIN_LIMITER: RateLimit;
	STATS_TOKEN?: string;
}

const MAX_BODY_BYTES = 4096;
const MAX_STRING_FIELD = 64;
const MAX_FEATURES = 50;
const FEATURE_KEY_RE = /^[a-z0-9_]{1,40}$/;
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const STRING_FIELDS = [
	"appVersion",
	"electronVersion",
	"os",
	"arch",
	"channel",
	"locale",
] as const;

function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json", ...headers },
	});
}

function badRequest(msg: string): Response {
	return json({ error: msg }, 400);
}

function todayUTC(d = new Date()): string {
	return d.toISOString().slice(0, 10);
}

function dateOffset(daysBack: number): string {
	return new Date(Date.now() - daysBack * 86400_000).toISOString().slice(0, 10);
}

async function tokenOk(provided: string | null | undefined, env: Env): Promise<boolean> {
	const expected = env.STATS_TOKEN ?? "";
	// Compare SHA-256 digests so the check does not depend on token length or content.
	const enc = new TextEncoder();
	const [a, b] = await Promise.all([
		crypto.subtle.digest("SHA-256", enc.encode(provided ?? "")),
		crypto.subtle.digest("SHA-256", enc.encode(expected)),
	]);
	const xa = new Uint8Array(a);
	const xb = new Uint8Array(b);
	let diff = 0;
	for (let i = 0; i < xa.length; i++) diff |= xa[i] ^ xb[i];
	return expected.length > 0 && diff === 0;
}

interface Ping {
	installId: string;
	event: string;
	appVersion?: string;
	electronVersion?: string;
	os?: string;
	arch?: string;
	channel?: string;
	locale?: string;
	firstRun?: boolean;
	features?: Record<string, number>;
}

function validate(body: unknown): Ping | Response {
	if (typeof body !== "object" || body === null || Array.isArray(body)) {
		return badRequest("expected a JSON object");
	}
	const b = body as Record<string, unknown>;

	if (typeof b.installId !== "string" || !UUID_RE.test(b.installId)) {
		return badRequest("installId must be a UUID");
	}
	if (b.event !== "daily") {
		return badRequest("event must be \"daily\"");
	}
	for (const f of STRING_FIELDS) {
		const v = b[f];
		if (v !== undefined && (typeof v !== "string" || v.length > MAX_STRING_FIELD)) {
			return badRequest(`${f} must be a string of at most ${MAX_STRING_FIELD} characters`);
		}
	}
	if (b.firstRun !== undefined && typeof b.firstRun !== "boolean") {
		return badRequest("firstRun must be a boolean");
	}
	if (b.features !== undefined) {
		if (typeof b.features !== "object" || b.features === null || Array.isArray(b.features)) {
			return badRequest("features must be an object");
		}
		const entries = Object.entries(b.features as Record<string, unknown>);
		if (entries.length > MAX_FEATURES) {
			return badRequest(`features may have at most ${MAX_FEATURES} keys`);
		}
		for (const [k, v] of entries) {
			if (!FEATURE_KEY_RE.test(k)) {
				return badRequest(`invalid feature key: ${k}`);
			}
			if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 1_000_000) {
				return badRequest(`invalid feature count for ${k}`);
			}
		}
	}
	return b as unknown as Ping;
}

async function handlePing(request: Request, env: Env): Promise<Response> {
	const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
	const { success } = await env.PING_LIMITER.limit({ key: ip });
	if (!success) {
		return json({ error: "rate limited" }, 429);
	}

	const contentLength = Number(request.headers.get("Content-Length") ?? "0");
	if (contentLength > MAX_BODY_BYTES) {
		return badRequest("body too large");
	}
	let raw = "";
	try {
		if (request.body) {
			const reader = request.body.getReader();
			const chunks: Uint8Array[] = [];
			let total = 0;
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				if (!value) continue;
				total += value.byteLength;
				if (total > MAX_BODY_BYTES) {
					try {
						await reader.cancel();
					} catch {
						// The request is already being rejected.
					}
					return badRequest("body too large");
				}
				chunks.push(value);
			}
			const bytes = new Uint8Array(total);
			let offset = 0;
			for (const chunk of chunks) {
				bytes.set(chunk, offset);
				offset += chunk.byteLength;
			}
			raw = new TextDecoder().decode(bytes);
		}
	} catch {
		return badRequest("unreadable body");
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return badRequest("body is not valid JSON");
	}
	const result = validate(parsed);
	if (result instanceof Response) return result;
	const p = result;

	const day = todayUTC();
	const ts = Date.now();
	const country = (request.cf?.country as string | undefined) ?? null;
	const requestId = crypto.randomUUID();

	const statements = [
		env.DB.prepare(
		`INSERT OR IGNORE INTO pings
		 (install_id, day, ts, request_id, event, app_version, electron_version, os, arch,
		  channel, locale, first_run, country)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		).bind(
			p.installId, day, ts, requestId, p.event,
			p.appVersion ?? null, p.electronVersion ?? null, p.os ?? null, p.arch ?? null,
			p.channel ?? null, p.locale ?? null,
			p.firstRun === undefined ? null : p.firstRun ? 1 : 0,
			country
		),
	];

	for (const [feature, count] of Object.entries(p.features ?? {}).filter(([, count]) => count > 0)) {
		statements.push(
			env.DB.prepare(
				`INSERT INTO feature_counts (install_id, day, feature, count)
				 SELECT ?, ?, ?, ? WHERE EXISTS (
					SELECT 1 FROM pings WHERE install_id = ? AND day = ? AND request_id = ?
				 )`
			).bind(p.installId, day, feature, count, p.installId, day, requestId)
		);
	}
	await env.DB.batch(statements);
	return new Response(null, { status: 204 });
}

interface StatsRow { [k: string]: unknown }

async function gatherStats(env: Env): Promise<Record<string, unknown>> {
	const today = todayUTC();
	const wauSince = dateOffset(6);
	const mauSince = dateOffset(29);

	const scalar = async (sql: string, ...binds: string[]) => {
		const r = await env.DB.prepare(sql).bind(...binds).first<{ n: number }>();
		return r?.n ?? 0;
	};

	const prevWeekSince = dateOffset(13);
	const [dau, wau, mau, totalInstalls, wauPrev, newThisWeek, newPrevWeek] = await Promise.all([
		scalar("SELECT COUNT(DISTINCT install_id) AS n FROM pings WHERE day = ?", today),
		scalar("SELECT COUNT(DISTINCT install_id) AS n FROM pings WHERE day >= ?", wauSince),
		scalar("SELECT COUNT(DISTINCT install_id) AS n FROM pings WHERE day >= ?", mauSince),
		scalar("SELECT COUNT(DISTINCT install_id) AS n FROM pings"),
		scalar("SELECT COUNT(DISTINCT install_id) AS n FROM pings WHERE day >= ? AND day < ?",
			prevWeekSince, wauSince),
		scalar(`SELECT COUNT(*) AS n FROM (SELECT MIN(day) AS first_day FROM pings
			 GROUP BY install_id) WHERE first_day >= ?`, wauSince),
		scalar(`SELECT COUNT(*) AS n FROM (SELECT MIN(day) AS first_day FROM pings
			 GROUP BY install_id) WHERE first_day >= ? AND first_day < ?`, prevWeekSince, wauSince),
	]);

	const dailyActive = (await env.DB.prepare(
		`SELECT day, COUNT(DISTINCT install_id) AS installs
		 FROM pings WHERE day >= ? GROUP BY day ORDER BY day`
	).bind(mauSince).all<StatsRow>()).results;

	const newInstalls = (await env.DB.prepare(
		`SELECT first_day AS day, COUNT(*) AS installs FROM (
			 SELECT install_id, MIN(day) AS first_day FROM pings GROUP BY install_id
		 ) WHERE first_day >= ? GROUP BY first_day ORDER BY first_day`
	).bind(mauSince).all<StatsRow>()).results;

	const breakdown = async (col: string) =>
		(await env.DB.prepare(
			`SELECT ${col} AS value, COUNT(*) AS installs FROM (
				 SELECT install_id, ${col},
					ROW_NUMBER() OVER (PARTITION BY install_id ORDER BY ts DESC) AS rn
				 FROM pings WHERE day >= ?
			 ) WHERE rn = 1 GROUP BY ${col} ORDER BY installs DESC`
		).bind(mauSince).all<StatsRow>()).results;

	const [appVersions, oses, arches, channels, locales, countries, features] = await Promise.all([
		breakdown("app_version"),
		breakdown("os"),
		breakdown("arch"),
		breakdown("channel"),
		breakdown("locale"),
		breakdown("country"),
		env.DB.prepare(
			`SELECT feature, SUM(count) AS total, COUNT(DISTINCT install_id) AS installs
			 FROM feature_counts WHERE day >= ? GROUP BY feature ORDER BY total DESC`
		).bind(mauSince).all<StatsRow>().then(r => r.results),
	]);

	const retention = await Promise.all([1, 7, 30].map(async (days) => {
		const r = await env.DB.prepare(
			`WITH firsts AS (SELECT install_id, MIN(day) AS first_day FROM pings GROUP BY install_id)
			 SELECT COUNT(*) AS cohort,
				SUM(CASE WHEN EXISTS (
					SELECT 1 FROM pings p WHERE p.install_id = f.install_id
					AND julianday(p.day) - julianday(f.first_day) >= ?2
				) THEN 1 ELSE 0 END) AS retained
			 FROM firsts f WHERE julianday(?1) - julianday(f.first_day) >= ?2`
		).bind(today, days).first<{ cohort: number; retained: number | null }>();
		return { days, cohort: r?.cohort ?? 0, retained: r?.retained ?? 0 };
	}));

	const versionAdoption = (await env.DB.prepare(
		`SELECT day, app_version AS version, COUNT(DISTINCT install_id) AS installs
		 FROM pings WHERE day >= ? GROUP BY day, app_version ORDER BY day, installs DESC`
	).bind(mauSince).all<StatsRow>()).results;

	return {
		today, dau, wau, mau, totalInstalls,
		growth: { newThisWeek, newPrevWeek, wau, wauPrev },
		dailyActive, newInstalls, retention, versionAdoption,
		breakdowns: {
			appVersion: appVersions,
			os: oses,
			arch: arches,
			channel: channels,
			locale: locales,
			country: countries,
		},
		features,
	};
}

function esc(s: unknown): string {
	return String(s ?? "")
		.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

const fmt = (n: unknown): string => Number(n ?? 0).toLocaleString("en-US");

const STYLE = `
:root {
	--bg: #f6f7f9; --surface: #ffffff; --line: #e6e8ec; --text: #0f1115; --muted: #6b7280;
	--faint: #9ca3af; --accent: #5b5bd6; --accent-2: #8e8ef0; --accent-soft: #eef0ff;
	--good: #16a34a; --good-soft: #e8f7ee; --warn: #d97706; --warn-soft: #fdf3e2;
	--bad: #dc2626; --bad-soft: #fdecec; --track: #eef0f3;
	--shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06);
}
@media (prefers-color-scheme: dark) {
	:root {
		--bg: #0b0c0f; --surface: #14161b; --line: #23262d; --text: #f3f4f6; --muted: #9aa1ad;
		--faint: #6b7280; --accent: #8b8bf5; --accent-2: #5b5bd6; --accent-soft: #1d1f33;
		--good: #4ade80; --good-soft: #10261a; --warn: #fbbf24; --warn-soft: #2a2010;
		--bad: #f87171; --bad-soft: #2c1414; --track: #1d2027;
		--shadow: 0 0 0 1px rgba(255, 255, 255, 0.02);
	}
}
* { box-sizing: border-box; }
body {
	margin: 0; background: var(--bg); color: var(--text);
	font: 14px/1.5 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Inter, Roboto, sans-serif;
	-webkit-font-smoothing: antialiased; font-feature-settings: "tnum" 1;
}
.wrap { max-width: 1180px; margin: 0 auto; padding: 40px 28px 64px; }
header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 28px; }
.brand { display: flex; align-items: center; gap: 12px; }
.mark {
	width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center;
	background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #fff; font-weight: 700;
	box-shadow: 0 6px 16px rgba(91, 91, 214, 0.28);
}
h1 { font-size: 20px; font-weight: 650; letter-spacing: -0.01em; margin: 0; }
.sub { color: var(--muted); font-size: 13px; margin: 2px 0 0; }
.pill {
	border: 1px solid var(--line); background: var(--surface); color: var(--muted);
	border-radius: 999px; padding: 6px 12px; font-size: 12px; white-space: nowrap;
}
.grid { display: grid; gap: 16px; }
.kpis { grid-template-columns: repeat(5, minmax(0, 1fr)); margin-bottom: 16px; }
.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
@media (max-width: 960px) { .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } .two, .three { grid-template-columns: 1fr; } }
.card {
	background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
	padding: 18px 20px; box-shadow: var(--shadow); min-width: 0;
}
section { margin-top: 32px; }
.section-title { font-size: 13px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 12px; }
h2 { font-size: 14px; font-weight: 600; margin: 0 0 4px; }
.hint { color: var(--muted); font-size: 12px; margin: 0 0 16px; }
.kpi .label { color: var(--muted); font-size: 12px; font-weight: 500; }
.kpi .value { font-size: 28px; font-weight: 650; letter-spacing: -0.02em; margin: 6px 0 4px; }
.delta { font-size: 12px; font-weight: 600; border-radius: 6px; padding: 2px 6px; }
.delta.up { color: var(--good); background: var(--good-soft); }
.delta.down { color: var(--bad); background: var(--bad-soft); }
.delta.flat { color: var(--muted); background: var(--track); }
.kpi .foot { color: var(--faint); font-size: 12px; margin-left: 6px; }
.chart { display: flex; align-items: flex-end; gap: 3px; height: 140px; padding-top: 8px; border-bottom: 1px solid var(--line); }
.chart .col { flex: 1; height: 100%; display: flex; align-items: flex-end; }
.chart .bar {
	width: 100%; min-height: 2px; border-radius: 4px 4px 1px 1px;
	background: linear-gradient(180deg, var(--accent), var(--accent-2)); opacity: 0.9;
}
.chart .bar.zero { background: var(--track); opacity: 1; }
.chart .col:hover .bar { opacity: 1; filter: brightness(1.08); }
.axis { display: flex; justify-content: space-between; color: var(--faint); font-size: 11px; margin-top: 8px; }
.chart-head { display: flex; justify-content: space-between; align-items: baseline; }
.chart-head .big { font-size: 13px; color: var(--muted); }
.chart-head .big b { color: var(--text); font-size: 16px; font-weight: 650; }
.bars { display: grid; gap: 10px; }
.bar-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 12px; align-items: center; }
.bar-row .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.bar-row .num { color: var(--muted); font-size: 12px; text-align: right; }
.bar-row .num b { color: var(--text); font-weight: 600; margin-right: 6px; }
.track { grid-column: 1 / -1; height: 6px; border-radius: 999px; background: var(--track); overflow: hidden; }
.fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--accent), var(--accent-2)); }
.empty { color: var(--faint); font-size: 13px; padding: 12px 0; }
.ret .value { font-size: 26px; font-weight: 650; letter-spacing: -0.02em; margin: 4px 0; }
.ret .meta { color: var(--muted); font-size: 12px; margin-bottom: 12px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: var(--muted); font-weight: 500; font-size: 12px; padding: 0 10px 10px; border-bottom: 1px solid var(--line); white-space: nowrap; }
td { padding: 10px; border-bottom: 1px solid var(--line); vertical-align: middle; }
tr:last-child td { border-bottom: 0; }
td.n, th.n { text-align: right; white-space: nowrap; }
.key { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 11px; color: var(--faint); margin-left: 8px; }
.group td { padding-top: 18px; color: var(--muted); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 0; }
.mini { display: inline-block; width: 90px; height: 6px; border-radius: 999px; background: var(--track); vertical-align: middle; overflow: hidden; }
.mini .fill { display: block; }
.badge { font-size: 12px; font-weight: 600; border-radius: 6px; padding: 2px 8px; }
.badge.ok { color: var(--good); background: var(--good-soft); }
.badge.warn { color: var(--warn); background: var(--warn-soft); }
.badge.bad { color: var(--bad); background: var(--bad-soft); }
.badge.none { color: var(--muted); background: var(--track); }
.scroll { overflow-x: auto; }
footer { margin-top: 40px; color: var(--faint); font-size: 12px; text-align: center; }
.login { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
.login .card { width: 100%; max-width: 380px; padding: 28px; }
.login h1 { margin-top: 18px; }
.login label { display: block; font-size: 12px; font-weight: 500; color: var(--muted); margin: 22px 0 6px; }
.login input {
	width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--line);
	background: var(--bg); color: var(--text); font: inherit;
}
.login input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.login button {
	width: 100%; margin-top: 16px; padding: 10px 12px; border: 0; border-radius: 10px; cursor: pointer;
	background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #fff; font: inherit; font-weight: 600;
}
.login .sub { margin-top: 4px; }
`;

function page(title: string, body: string): string {
	return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title><style>${STYLE}</style></head><body>${body}</body></html>`;
}

function loginPage(): string {
	return page("achu telemetry", `<main class="login"><div class="card">
<div class="mark">a</div>
<h1>achu telemetry</h1>
<p class="sub">Anonymous usage stats for the achu desktop app.</p>
<form method="post" action="/stats">
<label for="token">Stats token</label>
<input id="token" type="password" name="token" required autocomplete="current-password" autofocus>
<button type="submit">View stats</button>
</form></div></main>`);
}

const FEATURE_GROUPS: { title: string; features: [string, string][] }[] = [
	{ title: "Export", features: [
		["export_png", "Export PNG"], ["export_jpeg", "Export JPEG"], ["export_webp", "Export WebP"],
		["export_copy", "Copy to clipboard"], ["export_before_after", "Before and after"],
		["gallery_save", "Save to gallery"], ["burst_pack_save", "Burst pack"],
	] },
	{ title: "Capture and input", features: [
		["capture_hotkey", "Capture by hotkey"], ["capture_tray", "Capture from tray"],
		["capture_button", "Capture button"], ["capture_import", "Clipboard screenshot import"],
		["image_open", "Open image"], ["paste_clipboard", "Paste image"],
	] },
	{ title: "Editing", features: [
		["bg_color", "Background: color"], ["bg_gradient", "Background: gradient"], ["bg_blur", "Background: blur"],
		["bg_mesh", "Background: mesh"], ["bg_shader", "Background: shader"], ["preset_apply", "Apply preset"],
		["code_studio_open", "Open Code Studio"],
	] },
	{ title: "Annotations", features: [
		["annot_rect", "Rectangle"], ["annot_filled_rect", "Filled rectangle"], ["annot_circle", "Circle"],
		["annot_filled_circle", "Filled circle"], ["annot_line", "Line"], ["annot_arrow", "Arrow"],
		["annot_text", "Text"], ["annot_pen", "Pen"], ["annot_emoji", "Emoji"],
	] },
	{ title: "Privacy and OCR", features: [
		["privacy_scan", "Privacy scan"], ["redact_all", "Redact all"], ["ocr_grab", "Grab text (OCR)"],
	] },
	{ title: "AI and GitHub", features: [
		["ai_issue_ollama", "AI issue: Ollama"], ["ai_issue_openai", "AI issue: OpenAI"],
		["ai_issue_google", "AI issue: Google"], ["ai_issue_claude", "AI issue: Claude"],
		["ai_issue_offline", "Issue draft (offline)"], ["github_push", "Push to GitHub"],
	] },
	{ title: "Lifecycle", features: [
		["onboarding_done", "Onboarding completed"], ["onboarding_skip", "Onboarding skipped"],
		["share_prompt_shown", "Share prompt shown"], ["update_install", "Update installed"],
	] },
];

const RELIABILITY: { label: string; error: string; success: string[] }[] = [
	{ label: "Export to file", error: "err_export", success: ["export_png", "export_jpeg", "export_webp"] },
	{ label: "Save to gallery", error: "err_gallery_save", success: ["gallery_save"] },
	{ label: "Burst pack", error: "err_burst_pack", success: ["burst_pack_save"] },
	{ label: "Privacy scan", error: "err_privacy_scan", success: ["privacy_scan"] },
	{ label: "Grab text (OCR)", error: "err_ocr", success: ["ocr_grab"] },
	{ label: "AI issue generation", error: "err_ai_issue",
		success: ["ai_issue_ollama", "ai_issue_openai", "ai_issue_google", "ai_issue_claude"] },
	{ label: "Push to GitHub", error: "err_github_push", success: ["github_push"] },
];

function deltaBadge(now: number, prev: number): string {
	if (prev <= 0) return `<span class="delta flat">${now > 0 ? "new" : "-"}</span>`;
	const p = Math.round(((now - prev) / prev) * 100);
	const cls = p > 0 ? "up" : p < 0 ? "down" : "flat";
	return `<span class="delta ${cls}">${p > 0 ? "+" : ""}${p}%</span>`;
}

function kpi(label: string, value: unknown, extra = ""): string {
	return `<div class="card kpi"><div class="label">${esc(label)}</div><div class="value">${fmt(value)}</div><div>${extra}</div></div>`;
}

/** Last 30 UTC days, oldest first, with missing days filled with zero. */
function dailySeries(rows: StatsRow[], valueKey: string): { day: string; value: number }[] {
	const byDay = new Map(rows.map(r => [String(r.day), Number(r[valueKey] ?? 0)]));
	return Array.from({ length: 30 }, (_, i) => {
		const d = dateOffset(29 - i);
		return { day: d, value: byDay.get(d) ?? 0 };
	});
}

function columnChart(title: string, hint: string, series: { day: string; value: number }[], unit: string): string {
	const max = Math.max(1, ...series.map(p => p.value));
	const total = series.reduce((a, p) => a + p.value, 0);
	const cols = series.map(p => {
		const h = p.value === 0 ? 0 : Math.max(3, Math.round((p.value / max) * 100));
		return `<div class="col" title="${esc(p.day)}: ${fmt(p.value)} ${esc(unit)}"><div class="bar${p.value === 0 ? " zero" : ""}" style="height:${h}%"></div></div>`;
	}).join("");
	const short = (d: string) => d.slice(5);
	return `<div class="card"><div class="chart-head"><h2>${esc(title)}</h2>
<span class="big"><b>${fmt(Math.max(0, ...series.map(p => p.value)))}</b> peak · ${fmt(total)} total</span></div>
<p class="hint">${esc(hint)}</p><div class="chart">${cols}</div>
<div class="axis"><span>${esc(short(series[0].day))}</span><span>${esc(short(series[14].day))}</span><span>${esc(short(series[29].day))}</span></div></div>`;
}

function barList(title: string, rows: StatsRow[], limit = 8): string {
	const total = rows.reduce((a, r) => a + Number(r.installs ?? 0), 0);
	const top = rows.slice(0, limit);
	const body = top.length === 0
		? `<div class="empty">No data yet</div>`
		: top.map(r => {
			const n = Number(r.installs ?? 0);
			const share = total > 0 ? Math.round((n / total) * 100) : 0;
			return `<div class="bar-row"><span class="name">${esc(r.value ?? "(none)")}</span>
<span class="num"><b>${fmt(n)}</b>${share}%</span><div class="track"><div class="fill" style="width:${share}%"></div></div></div>`;
		}).join("");
	return `<div class="card"><h2>${esc(title)}</h2><p class="hint">Installs active in the last 30 days, by latest ping</p><div class="bars">${body}</div></div>`;
}

function retentionCard(r: { days: number; cohort: number; retained: number }): string {
	const rate = r.cohort > 0 ? Math.round((r.retained / r.cohort) * 100) : null;
	return `<div class="card ret"><div class="label hint" style="margin:0">Day ${r.days} retention</div>
<div class="value">${rate === null ? "-" : `${rate}%`}</div>
<div class="meta">${fmt(r.retained)} of ${fmt(r.cohort)} eligible installs came back</div>
<div class="track"><div class="fill" style="width:${rate ?? 0}%"></div></div></div>`;
}

/** Pivot of installs per day (rows) and app version (columns, the 6 most common). */
function adoptionTable(rows: StatsRow[]): string {
	const byDay = new Map<string, Map<string, number>>();
	for (const r of rows) {
		const d = String(r.day);
		if (!byDay.has(d)) byDay.set(d, new Map());
		byDay.get(d)!.set(String(r.version ?? "(none)"), Number(r.installs));
	}
	const days = [...byDay.keys()].sort().reverse().slice(0, 14);
	const totals = new Map<string, number>();
	for (const day of days) {
		for (const [version, installs] of byDay.get(day)!) {
			totals.set(version, (totals.get(version) ?? 0) + installs);
		}
	}
	const versions = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]);
	const head = `<tr><th>Day</th>${versions.map(v => `<th class="n">${esc(v)}</th>`).join("")}</tr>`;
	const body = days.length === 0
		? `<tr><td class="empty">No data yet</td></tr>`
		: days.map(d => `<tr><td>${esc(d)}</td>${versions.map(v => `<td class="n">${fmt(byDay.get(d)!.get(v) ?? 0)}</td>`).join("")}</tr>`).join("");
	return `<div class="card"><h2>Version adoption</h2><p class="hint">Active installs per day for the 6 most common versions, last 14 days with data</p>
<div class="scroll"><table><thead>${head}</thead><tbody>${body}</tbody></table></div></div>`;
}

function featureTable(features: StatsRow[], mau: number): string {
	const byKey = new Map(features.map(f => [String(f.feature), f]));
	const max = Math.max(1, ...features.filter(f => !String(f.feature).startsWith("err_")).map(f => Number(f.total ?? 0)));
	const known = new Set<string>();
	const row = (key: string, label: string) => {
		const f = byKey.get(key);
		const total = Number(f?.total ?? 0);
		const installs = Number(f?.installs ?? 0);
		const adoption = mau > 0 ? Math.round((installs / mau) * 100) : 0;
		return `<tr><td>${esc(label)}<span class="key">${esc(key)}</span></td>
<td><span class="mini"><span class="fill" style="width:${Math.round((total / max) * 100)}%"></span></span></td>
<td class="n">${fmt(total)}</td><td class="n">${fmt(installs)}</td><td class="n">${installs > 0 ? `${adoption}%` : "-"}</td></tr>`;
	};
	const groups = FEATURE_GROUPS.map(g => {
		const present = g.features.filter(([k]) => byKey.has(k));
		g.features.forEach(([k]) => known.add(k));
		if (present.length === 0) return "";
		present.sort((a, b) => Number(byKey.get(b[0])!.total) - Number(byKey.get(a[0])!.total));
		return `<tr class="group"><td colspan="5">${esc(g.title)}</td></tr>${present.map(([k, l]) => row(k, l)).join("")}`;
	}).join("");
	RELIABILITY.forEach(r => known.add(r.error));
	const others = features.filter(f => !known.has(String(f.feature)));
	const other = others.length === 0 ? "" :
		`<tr class="group"><td colspan="5">Other</td></tr>${others.map(f => row(String(f.feature), String(f.feature))).join("")}`;
	const body = groups + other || `<tr><td colspan="5" class="empty">No feature counts yet</td></tr>`;
	return `<div class="card"><h2>Feature usage</h2><p class="hint">Events and distinct installs in the last 30 days. Adoption is the share of monthly active installs that used the feature.</p>
<div class="scroll"><table><thead><tr><th>Feature</th><th></th><th class="n">Events</th><th class="n">Installs</th><th class="n">Adoption</th></tr></thead><tbody>${body}</tbody></table></div></div>`;
}

function reliabilityTable(features: StatsRow[]): string {
	const total = (k: string) => Number(features.find(f => f.feature === k)?.total ?? 0);
	const rows = RELIABILITY.map(r => {
		const errors = total(r.error);
		const ok = r.success.reduce((a, k) => a + total(k), 0);
		const attempts = ok + errors;
		const rate = attempts > 0 ? (errors / attempts) * 100 : null;
		const cls = rate === null ? "none" : rate < 2 ? "ok" : rate < 10 ? "warn" : "bad";
		const text = rate === null ? "no data" : `${rate < 10 && rate > 0 ? rate.toFixed(1) : Math.round(rate)}%`;
		return `<tr><td>${esc(r.label)}</td><td class="n">${fmt(ok)}</td><td class="n">${fmt(errors)}</td><td class="n"><span class="badge ${cls}">${text}</span></td></tr>`;
	}).join("");
	return `<div class="card"><h2>Reliability</h2><p class="hint">Failures as a share of attempts in the last 30 days</p>
<table><thead><tr><th>Action</th><th class="n">Succeeded</th><th class="n">Failed</th><th class="n">Failure rate</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function statsPage(s: Record<string, unknown>): string {
	const bd = s.breakdowns as Record<string, StatsRow[]>;
	const features = s.features as StatsRow[];
	const growth = s.growth as { newThisWeek: number; newPrevWeek: number; wau: number; wauPrev: number };
	const retention = s.retention as { days: number; cohort: number; retained: number }[];
	const mau = Number(s.mau ?? 0);
	return page("achu telemetry", `<div class="wrap">
<header><div class="brand"><div class="mark">a</div><div><h1>achu telemetry</h1>
<p class="sub">Anonymous usage of the achu desktop app · ${esc(s.today)} UTC</p></div></div>
<span class="pill">Last 30 days</span></header>
<div class="grid kpis">
${kpi("Active today", s.dau)}
${kpi("Weekly active", s.wau, `${deltaBadge(growth.wau, growth.wauPrev)}<span class="foot">vs prior week</span>`)}
${kpi("Monthly active", s.mau)}
${kpi("New this week", growth.newThisWeek, `${deltaBadge(growth.newThisWeek, growth.newPrevWeek)}<span class="foot">vs prior week</span>`)}
${kpi("Total installs", s.totalInstalls, `<span class="foot" style="margin:0">all time</span>`)}
</div>
<div class="grid two">
${columnChart("Daily active installs", "Distinct installs that sent a ping each UTC day", dailySeries(s.dailyActive as StatsRow[], "installs"), "installs")}
${columnChart("New installs", "Installs whose first ping landed on each UTC day", dailySeries(s.newInstalls as StatsRow[], "installs"), "new installs")}
</div>
<section><p class="section-title">Retention</p><div class="grid three">${retention.map(retentionCard).join("")}</div></section>
<section><p class="section-title">Features</p><div class="grid">
${featureTable(features, mau)}
${reliabilityTable(features)}
</div></section>
<section><p class="section-title">Releases and platforms</p><div class="grid two">
${barList("App versions", bd.appVersion)}
${barList("Release channels", bd.channel)}
${barList("Operating systems", bd.os)}
${barList("CPU architecture", bd.arch)}
</div><div class="grid" style="margin-top:16px">${adoptionTable(s.versionAdoption as StatsRow[])}</div></section>
<section><p class="section-title">Audience</p><div class="grid two">
${barList("Countries", bd.country, 10)}
${barList("Locales", bd.locale, 10)}
</div></section>
<footer>One anonymous ping per install per day. No screenshots, text, file paths, tokens or IP addresses are stored.</footer>
</div>`);
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname === "/v1/ping" && request.method === "POST") {
			return handlePing(request, env);
		}
		if (url.pathname === "/v1/stats" && request.method === "GET") {
			const header = request.headers.get("Authorization");
			const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
			const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
			if (!(await tokenOk(token, env))) {
				return json({ error: "unauthorized" }, 401, headers);
			}
			return json(await gatherStats(env), 200, headers);
		}
		if (url.pathname === "/stats" && request.method === "GET") {
			const header = request.headers.get("Authorization");
			const bearer = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
			const cookieValue = request.headers.get("Cookie")?.split(";")
				.map(value => value.trim())
				.find(value => value.startsWith("achu_stats="))
				?.slice("achu_stats=".length);
			let cookie: string | null = null;
			try {
				cookie = cookieValue === undefined ? null : decodeURIComponent(cookieValue);
			} catch {
				cookie = null;
			}
			const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
			if (!(await tokenOk(bearer, env)) && !(await tokenOk(cookie, env))) {
				return new Response(loginPage(), {
					status: 401,
					headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
				});
			}
			return new Response(statsPage(await gatherStats(env)), {
				headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
			});
		}
		if (url.pathname === "/stats" && request.method === "POST") {
			const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
			const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
			const { success } = await env.LOGIN_LIMITER.limit({ key: ip });
			if (!success) {
				return new Response("Too many login attempts. Try again in a minute.", {
					status: 429,
					headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
				});
			}
			let token: string | null = null;
			try {
				const form = await request.formData();
				const value = form.get("token");
				token = typeof value === "string" ? value : null;
			} catch {
				return new Response(loginPage(), {
					status: 401,
					headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
				});
			}
			const submittedToken = token ?? "";
			if (!(await tokenOk(submittedToken, env))) {
				return new Response(loginPage(), {
					status: 401,
					headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
				});
			}
			return new Response(null, {
				status: 303,
				headers: {
					...headers,
					Location: "/stats",
					"Set-Cookie": `achu_stats=${encodeURIComponent(submittedToken)}; HttpOnly; Secure; SameSite=Strict; Path=/stats; Max-Age=2592000`,
				},
			});
		}
		return json({ error: "not found" }, 404);
	},
} satisfies ExportedHandler<Env>;
