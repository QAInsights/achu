import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";

const UUID = "3f6b9f2e-9c1a-4d2b-8e5f-1a2b3c4d5e6f";

function pingBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		installId: UUID,
		event: "daily",
		appVersion: "1.2.3",
		electronVersion: "37.2.0",
		os: "Mac OS X",
		arch: "aarch64",
		channel: "stable",
		locale: "en-US",
		firstRun: false,
		features: { chat_open: 2, export: 1 },
		...overrides,
	};
}

function postPing(body: unknown, headers: Record<string, string> = {}) {
	return SELF.fetch("https://example.com/v1/ping", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"CF-Connecting-IP": `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
			...headers,
		},
		body: typeof body === "string" ? body : JSON.stringify(body),
		cf: { country: "US" },
	});
}

beforeEach(async () => {
	await env.DB.exec("DELETE FROM pings; DELETE FROM feature_counts;");
});

describe("POST /v1/ping", () => {
	it("returns 204 and writes a ping with the Cloudflare country", async () => {
		const res = await postPing(pingBody());
		expect(res.status).toBe(204);

		const ping = await env.DB.prepare("SELECT * FROM pings").first<Record<string, unknown>>();
		expect(ping).toMatchObject({
			install_id: UUID,
			event: "daily",
			app_version: "1.2.3",
			electron_version: "37.2.0",
			os: "Mac OS X",
			arch: "aarch64",
			channel: "stable",
			locale: "en-US",
			first_run: 0,
			country: "US",
		});
		expect(String(ping!.day)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(typeof ping!.ts).toBe("number");

		const features = await env.DB.prepare(
			"SELECT feature, count FROM feature_counts ORDER BY feature"
		).all<{ feature: string; count: number }>();
		expect(features.results).toEqual([
			{ feature: "chat_open", count: 2 },
			{ feature: "export", count: 1 },
		]);
	});

	it("ignores a second ping on the same day, including its feature counts", async () => {
		expect((await postPing(pingBody())).status).toBe(204);
		const res = await postPing(pingBody({ appVersion: "9.9.9", features: { chat_open: 99 } }));
		expect(res.status).toBe(204);

		const pings = await env.DB.prepare("SELECT COUNT(*) AS n FROM pings").first<{ n: number }>();
		expect(pings!.n).toBe(1);
		const features = await env.DB.prepare(
			"SELECT SUM(count) AS n FROM feature_counts"
		).first<{ n: number }>();
		expect(features!.n).toBe(3);
	});

	it("skips zero-count features", async () => {
		const res = await postPing(pingBody({ features: { chat_open: 0, export: 2 } }));
		expect(res.status).toBe(204);
		const features = await env.DB.prepare("SELECT feature FROM feature_counts").all<{ feature: string }>();
		expect(features.results.map(r => r.feature)).toEqual(["export"]);
	});

	it("accepts unknown top-level fields", async () => {
		expect((await postPing(pingBody({ futureField: { nested: true } }))).status).toBe(204);
	});

	it("never stores the client IP", async () => {
		await postPing(pingBody(), { "CF-Connecting-IP": "203.0.113.7" });
		const columns = await env.DB.prepare("PRAGMA table_info(pings)").all<{ name: string }>();
		expect(columns.results.map(c => c.name)).not.toContain("ip");
		const row = await env.DB.prepare("SELECT * FROM pings").first<Record<string, unknown>>();
		expect(Object.values(row!).map(String)).not.toContain("203.0.113.7");
	});

	it("rejects an invalid UUID", async () => {
		expect((await postPing(pingBody({ installId: "not-a-uuid" }))).status).toBe(400);
	});

	it("rejects an event other than daily", async () => {
		expect((await postPing(pingBody({ event: "startup" }))).status).toBe(400);
	});

	it("rejects a string longer than 64 characters", async () => {
		expect((await postPing(pingBody({ os: "x".repeat(65) }))).status).toBe(400);
	});

	it("rejects a non-boolean firstRun", async () => {
		expect((await postPing(pingBody({ firstRun: "yes" }))).status).toBe(400);
	});

	it("rejects more than 50 feature keys", async () => {
		const features: Record<string, number> = {};
		for (let i = 0; i < 51; i++) features[`f_${i}`] = 1;
		expect((await postPing(pingBody({ features }))).status).toBe(400);
	});

	it("rejects a malformed feature key", async () => {
		expect((await postPing(pingBody({ features: { "Bad-Key": 1 } }))).status).toBe(400);
	});

	it("rejects negative, fractional, and out-of-range feature counts", async () => {
		expect((await postPing(pingBody({ features: { a: -1 } }))).status).toBe(400);
		expect((await postPing(pingBody({ features: { a: 1.5 } }))).status).toBe(400);
		expect((await postPing(pingBody({ features: { a: 1_000_001 } }))).status).toBe(400);
	});

	it("rejects invalid JSON", async () => {
		expect((await postPing("not json")).status).toBe(400);
	});

	it("rejects bodies over 4096 bytes", async () => {
		expect((await postPing(pingBody({ padding: "x".repeat(5000) }))).status).toBe(400);
	});

	it("rejects oversized bodies based on Content-Length", async () => {
		const res = await SELF.fetch("https://example.com/v1/ping", {
			method: "POST",
			headers: { "Content-Type": "application/json", "Content-Length": "9999" },
			body: JSON.stringify(pingBody()),
		});
		expect(res.status).toBe(400);
	});

	it("rate limits repeated requests from the same IP", async () => {
		let last = 0;
		for (let i = 0; i < 11; i++) {
			const res = await postPing(pingBody(), { "CF-Connecting-IP": "198.51.100.9" });
			last = res.status;
		}
		expect(last).toBe(429);
	});

	it("returns 404 for an unknown route", async () => {
		expect((await SELF.fetch("https://example.com/nope", { method: "POST" })).status).toBe(404);
	});
});
