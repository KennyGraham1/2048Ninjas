import { NextResponse } from "next/server";
import { BOARD_LIMIT, getStore, storeKind, type OnlineEntry } from "@/lib/server/leaderboardStore";
import { plausibleScore } from "@/lib/plausible";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODES = new Set(["classic", "timed", "daily"]);
const MAX_TILE = 131072;
const NAME_MAX = 16;

// Light per-IP rate limit for submissions (10 / minute, per server instance).
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 10;
}

function boardKey(mode: string, size: number, date?: string): string {
  return mode === "daily" ? `daily:${date}` : `${mode}:${size}`;
}

function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, NAME_MAX);
  return name.length ? name : null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "classic";
  const size = Number(url.searchParams.get("size") ?? 4);
  const date = url.searchParams.get("date") ?? undefined;
  if (!MODES.has(mode) || !Number.isInteger(size) || size < 3 || size > 6) {
    return NextResponse.json({ error: "bad board" }, { status: 400 });
  }
  if (mode === "daily" && !/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
    return NextResponse.json({ error: "bad date" }, { status: 400 });
  }
  try {
    const entries = await getStore().list(boardKey(mode, size, date));
    return NextResponse.json({ entries: entries.slice(0, BOARD_LIMIT), store: storeKind() });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return NextResponse.json({ error: "slow down" }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const name = cleanName(body.name);
  const score = Number(body.score);
  const top = Number(body.top);
  const size = Number(body.size);
  const moves = Number(body.moves);
  const mode = String(body.mode);
  const date = typeof body.date === "string" ? body.date : undefined;

  const powerOfTwo = Number.isInteger(top) && top >= 2 && (top & (top - 1)) === 0 && top <= MAX_TILE;
  const plausible = plausibleScore(score, top);
  if (
    !name ||
    !MODES.has(mode) ||
    !Number.isInteger(size) || size < 3 || size > 6 ||
    !powerOfTwo || !plausible ||
    !Number.isInteger(moves) || moves < 1 || moves > 50_000 ||
    (mode === "daily" && !/^\d{4}-\d{2}-\d{2}$/.test(date ?? ""))
  ) {
    return NextResponse.json({ error: "invalid score" }, { status: 400 });
  }

  const entry: OnlineEntry = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    score,
    top,
    size,
    mode: mode as OnlineEntry["mode"],
    moves,
    date: new Date().toISOString(),
  };
  try {
    const store = getStore();
    const board = boardKey(mode, size, date);
    await store.add(board, entry);
    const entries = await store.list(board);
    const rank = entries.findIndex((e) => e.id === entry.id);
    return NextResponse.json({ ok: true, rank: rank === -1 ? null : rank + 1, entries });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
