import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Global leaderboard storage.
 * - Upstash Redis (REST) when UPSTASH_REDIS_REST_URL / _TOKEN are set — works on Vercel and friends.
 * - Otherwise a JSON file at .data/leaderboard.json (fine for local play / a single server).
 */

export interface OnlineEntry {
  id: string;
  name: string;
  score: number;
  top: number;
  size: number;
  mode: "classic" | "timed" | "daily";
  moves: number;
  date: string;
}

export const BOARD_LIMIT = 25;
const KEEP = 100;

interface Store {
  list(board: string): Promise<OnlineEntry[]>;
  add(board: string, entry: OnlineEntry): Promise<void>;
}

// ---------- Upstash ----------

function upstash(): Store | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  async function cmd<T>(...args: (string | number)[]): Promise<T> {
    const res = await fetch(url as string, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`upstash ${res.status}`);
    const json = (await res.json()) as { result: T; error?: string };
    if (json.error) throw new Error(json.error);
    return json.result;
  }

  return {
    async list(board) {
      const raw = await cmd<string[]>("ZREVRANGE", `lb:${board}`, 0, BOARD_LIMIT - 1);
      return raw.map((s) => JSON.parse(s) as OnlineEntry);
    },
    async add(board, entry) {
      const key = `lb:${board}`;
      await cmd("ZADD", key, entry.score, JSON.stringify(entry));
      await cmd("ZREMRANGEBYRANK", key, 0, -(KEEP + 1));
    },
  };
}

// ---------- JSON file ----------

const FILE = path.join(process.cwd(), ".data", "leaderboard.json");
let memory: Record<string, OnlineEntry[]> | null = null;
let writing: Promise<void> = Promise.resolve();

async function readFile(): Promise<Record<string, OnlineEntry[]>> {
  if (memory) return memory;
  try {
    memory = JSON.parse(await fs.readFile(FILE, "utf8")) as Record<string, OnlineEntry[]>;
  } catch {
    memory = {};
  }
  return memory;
}

async function writeFile(data: Record<string, OnlineEntry[]>): Promise<void> {
  // Serialise writes so concurrent submissions don't clobber each other.
  writing = writing.then(async () => {
    try {
      await fs.mkdir(path.dirname(FILE), { recursive: true });
      await fs.writeFile(FILE, JSON.stringify(data));
    } catch {
      /* read-only filesystem: keep it in memory for this process */
    }
  });
  return writing;
}

const fileStore: Store = {
  async list(board) {
    const data = await readFile();
    return (data[board] ?? []).slice(0, BOARD_LIMIT);
  },
  async add(board, entry) {
    const data = await readFile();
    const list = [...(data[board] ?? []), entry]
      .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
      .slice(0, KEEP);
    data[board] = list;
    await writeFile(data);
  },
};

export function getStore(): Store {
  return upstash() ?? fileStore;
}

export function storeKind(): "upstash" | "file" {
  return upstash() ? "upstash" : "file";
}
