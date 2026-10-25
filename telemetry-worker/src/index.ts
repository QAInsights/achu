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

function loginPage(): string {
	return `<!doctype html><html><head><meta charset="utf-8"><title>achu telemetry login</title></head><body>
<form method="post" action="/stats">
<label>Stats token <input type="password" name="token" required autocomplete="current-password"></label>
<button type="submit">View stats</button>
</form></body></html>`;
}

function table(title: string, headers: string[], rows: unknown[][]): string {
	const head = headers.map(h => `<th>${esc(h)}</th>`).join("");
	const body = rows.length === 0
		? `<tr><td colspan="${headers.length}" class="empty">no data</td></tr>`
		: rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("");
	return `<h2>${esc(title)}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

/** Week-over-week change, e.g. "+120%"; "-" when there is no previous week to compare. */
function change(now: number, prev: number): string {
	if (prev <= 0) return "-";
	const p = Math.round(((now - prev) / prev) * 100);
	return `${p > 0 ? "+" : ""}${p}%`;
}

/** Pivot of installs per day (rows) and app version (columns, the 6 most common). */
function adoptionTable(rows: StatsRow[]): string {
	const totals = new Map<string, number>();
	for (const r of rows) {
		const v = String(r.version ?? "(none)");
		totals.set(v, (totals.get(v) ?? 0) + Number(r.installs));
	}
	const versions = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]);
	const byDay = new Map<string, Map<string, number>>();
	for (const r of rows) {
		const d = String(r.day);
		if (!byDay.has(d)) byDay.set(d, new Map());
		byDay.get(d)!.set(String(r.version ?? "(none)"), Number(r.installs));
	}
	const body = [...byDay.entries()].map(([d, m]) => [d, ...versions.map(v => m.get(v) ?? 0)]);
	return table("App version adoption (30d, installs per day)", ["day", ...versions], body);
}

function statsPage(s: Record<string, unknown>): string {
	const bd = s.breakdowns as Record<string, StatsRow[]>;
	const rows = (r: StatsRow[]) => r.map(x => [x.value ?? "(none)", x.installs]);
	const features = s.features as StatsRow[];
	const growth = s.growth as { newThisWeek: number; newPrevWeek: number; wau: number; wauPrev: number };
	return `<!doctype html><html><head><meta charset="utf-8"><title>achu telemetry</title>
<style>
body { font-family: system-ui, sans-serif; margin: 2rem; color: #222; }
h1 { font-size: 1.4rem; }
h2 { font-size: 1.05rem; margin-top: 1.6rem; }
.cards { display: flex; gap: 1rem; flex-wrap: wrap; }
.card { border: 1px solid #ddd; border-radius: 8px; padding: 0.8rem 1.2rem; }
.card .n { font-size: 1.6rem; font-weight: 600; }
table { border-collapse: collapse; min-width: 20rem; }
th, td { border: 1px solid #ddd; padding: 0.3rem 0.7rem; text-align: left; font-size: 0.9rem; }
th { background: #f5f5f5; }
.empty { color: #999; }
.note { color: #666; font-size: 0.85rem; }
</style></head><body>
<h1>achu telemetry (${esc(s.today)} UTC)</h1>
<div class="cards">
<div class="card"><div class="n">${esc(s.dau)}</div>DAU</div>
<div class="card"><div class="n">${esc(s.wau)}</div>WAU</div>
<div class="card"><div class="n">${esc(s.mau)}</div>MAU</div>
<div class="card"><div class="n">${esc(s.totalInstalls)}</div>Total installs</div>
</div>
<p class="note">DAU, WAU and MAU count installs active today, in the last 7 days and in the last 30 days (UTC).</p>
${table("Weekly growth (last 7 days vs the 7 before)", ["metric", "last 7 days", "previous 7 days", "change"], [
		["New installs", growth.newThisWeek, growth.newPrevWeek, change(growth.newThisWeek, growth.newPrevWeek)],
		["Active installs (WAU)", growth.wau, growth.wauPrev, change(growth.wau, growth.wauPrev)],
	])}
${table("Daily active installs (30d)", ["day", "installs"], (s.dailyActive as StatsRow[]).map(r => [r.day, r.installs]))}
${table("New installs (30d)", ["day", "installs"], (s.newInstalls as StatsRow[]).map(r => [r.day, r.installs]))}
${table("App versions (30d)", ["version", "installs"], rows(bd.appVersion))}
${table("OS (30d)", ["os", "installs"], rows(bd.os))}
${table("CPU architecture (30d)", ["arch", "installs"], rows(bd.arch))}
${table("Release channels (30d)", ["channel", "installs"], rows(bd.channel))}
${table("Locales (30d)", ["locale", "installs"], rows(bd.locale))}
${table("Countries (30d)", ["country", "installs"], rows(bd.country))}
${table("Retention (all time)", ["came back after", "eligible installs", "returned", "rate"],
		(s.retention as { days: number; cohort: number; retained: number }[])
			.map(r => [`${r.days} day${r.days === 1 ? "" : "s"}`, r.cohort, r.retained,
				r.cohort > 0 ? `${Math.round((r.retained / r.cohort) * 100)}%` : "-"]))}
${adoptionTable(s.versionAdoption as StatsRow[])}
${table("Feature usage (30d)", ["feature", "total events", "installs"],
		features.map(r => [r.feature, r.total, r.installs]))}
</body></html>`;
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
