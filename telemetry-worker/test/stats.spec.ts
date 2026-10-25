import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";

const TOKEN = "test-stats-token";

function day(offset: number): string {
	return new Date(Date.now() - offset * 86400_000).toISOString().slice(0, 10);
}

async function insertPing(
	installId: string,
	dayStr: string,
	fields: {
		app_version?: string;
		electron_version?: string;
		os?: string;
		arch?: string;
		channel?: string;
		locale?: string;
		country?: string;
		ts?: number;
	} = {}
) {
	await env.DB.prepare(
		`INSERT OR IGNORE INTO pings
		 (install_id, day, ts, event, app_version, electron_version, os, arch, channel, locale, first_run, country)
		 VALUES (?, ?, ?, 'daily', ?, '37.2.0', ?, 'aarch64', 'stable', 'en-US', 1, ?)`
	).bind(
		installId, dayStr,
		fields.ts ?? Date.now(),
		fields.app_version ?? "1.2.3",
		fields.os ?? "Mac OS X",
		fields.country ?? "US"
	).run();
}

function stats(path: string, token?: string) {
	const headers: Record<string, string> = {};
	if (token) headers.Authorization = `Bearer ${token}`;
	return SELF.fetch(`https://example.com${path}`, { headers });
}

beforeEach(async () => {
	await env.DB.exec("DELETE FROM pings; DELETE FROM feature_counts;");
});

describe("stats auth", () => {
	it("returns 401 without a token", async () => {
		expect((await stats("/v1/stats")).status).toBe(401);
		expect((await stats("/stats")).status).toBe(401);
	});

	it("returns 401 with a wrong token", async () => {
		expect((await stats("/v1/stats", "wrong")).status).toBe(401);
	});

	it("accepts the token via a Bearer header or query parameter", async () => {
		expect((await stats("/v1/stats", TOKEN)).status).toBe(200);
		expect((await stats(`/v1/stats?token=${TOKEN}`)).status).toBe(200);
	});

	it("serves the HTML stats page with a token", async () => {
		const res = await stats(`/stats?token=${TOKEN}`);
		expect(res.status).toBe(200);
		expect(res.headers.get("Content-Type")).toContain("text/html");
		expect(await res.text()).toContain("<title>achu telemetry</title>");
	});
});

describe("stats numbers", () => {
	it("computes activity, installs, growth, breakdowns, and feature counts", async () => {
		await insertPing("a", day(0));
		await insertPing("b", day(5));
		await insertPing("c", day(20));
		await insertPing("d", day(60));
		await insertPing("a", day(1), { app_version: "1.2.2", ts: Date.now() - 86400_000 });
		await insertPing("d", day(50));

		await env.DB.prepare(
			"INSERT INTO feature_counts (install_id, day, feature, count) VALUES ('a', ?, 'chat_open', 10), ('a', ?, 'chat_open', 5), ('b', ?, 'export', 2), ('b', ?, 'old_feature', 7)"
		).bind(day(0), day(1), day(5), day(60)).run();

		const res = await stats(`/v1/stats?token=${TOKEN}`);
		expect(res.status).toBe(200);
		const result = await res.json() as any;

		expect(result.dau).toBe(1);
		expect(result.wau).toBe(2);
		expect(result.mau).toBe(3);
		expect(result.totalInstalls).toBe(4);
		expect(result.growth).toEqual({ newThisWeek: 2, newPrevWeek: 0, wau: 2, wauPrev: 0 });

		expect(result.dailyActive).toEqual([
			{ day: day(20), installs: 1 },
			{ day: day(5), installs: 1 },
			{ day: day(1), installs: 1 },
			{ day: day(0), installs: 1 },
		]);

		expect(result.newInstalls).toEqual([
			{ day: day(20), installs: 1 },
			{ day: day(5), installs: 1 },
			{ day: day(1), installs: 1 },
		]);

		expect(result.breakdowns.appVersion).toEqual([{ value: "1.2.3", installs: 3 }]);
		expect(result.breakdowns.os).toEqual([{ value: "Mac OS X", installs: 3 }]);
		expect(result.breakdowns.arch).toEqual([{ value: "aarch64", installs: 3 }]);
		expect(result.breakdowns.channel).toEqual([{ value: "stable", installs: 3 }]);
		expect(result.breakdowns.locale).toEqual([{ value: "en-US", installs: 3 }]);
		expect(result.breakdowns.country).toEqual([{ value: "US", installs: 3 }]);
		expect(result.features).toEqual([
			{ feature: "chat_open", total: 15, installs: 1 },
			{ feature: "export", total: 2, installs: 1 },
		]);
	});

	it("computes retention and adoption by day", async () => {
		await insertPing("x", day(10), { ts: Date.now() - 10 * 86400_000 });
		await insertPing("x", day(2), { app_version: "1.2.8", ts: Date.now() - 2 * 86400_000 });
		await insertPing("y", day(3));
		await insertPing("z", day(0));

		const result = await (await stats(`/v1/stats?token=${TOKEN}`)).json() as any;
		expect(result.retention).toEqual([
			{ days: 1, cohort: 2, retained: 1 },
			{ days: 7, cohort: 1, retained: 1 },
			{ days: 30, cohort: 0, retained: 0 },
		]);
		expect(result.versionAdoption).toEqual([
			{ day: day(10), version: "1.2.3", installs: 1 },
			{ day: day(3), version: "1.2.3", installs: 1 },
			{ day: day(2), version: "1.2.8", installs: 1 },
			{ day: day(0), version: "1.2.3", installs: 1 },
		]);
	});

	it("escapes malicious feature and version values on the HTML page", async () => {
		await insertPing("malicious", day(0), {
			app_version: `<img src=x onerror="alert(1)">`,
		});
		await env.DB.prepare(
			"INSERT INTO feature_counts (install_id, day, feature, count) VALUES ('malicious', ?, '<script>alert(1)</script>', 3)"
		).bind(day(0)).run();

		const html = await (await stats(`/stats?token=${TOKEN}`)).text();
		expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
		expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
		expect(html).not.toContain(`<img src=x onerror="alert(1)">`);
		expect(html).not.toContain("<script>alert(1)</script>");
	});
});
