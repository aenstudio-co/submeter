import App from "@/components/App";
import { getSession, hasAdminSession } from "@/lib/session";
import { db } from "@/lib/supabase";
import type { Entry, Settings } from "@/lib/types";

export const dynamic = "force-dynamic";

function Notice({ title, message }: { title: string; message: string }) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-3 text-mute">{message}</p>
    </main>
  );
}

async function load(): Promise<{ settings: Settings; entries: Entry[] } | { error: string }> {
  try {
    const supabase = db();

    const { data: s, error: sErr } = await supabase.from("settings").select("*").eq("id", 1).single();
    if (sErr || !s) return { error: sErr?.message ?? "No settings row found. Run schema.sql in Supabase first." };

    const settings: Settings = {
      rate: Number(s.rate),
      previous_reading: Number(s.previous_reading),
      cycle_start: s.cycle_start,
      cycle_end: s.cycle_end,
    };

    // The cycle runs from cycle_start up to (not including) cycle_end, when the next cycle begins.
    const { data: rows, error: eErr } = await supabase
      .from("entries")
      .select("id, person, start_at, start_reading, end_at, end_reading")
      .gte("start_at", `${settings.cycle_start}T00:00:00`)
      .lt("start_at", `${settings.cycle_end}T00:00:00`);
    if (eErr) return { error: eErr.message };

    const entries: Entry[] = (rows ?? []).map((r) => ({
      id: r.id,
      person: r.person,
      start_at: r.start_at,
      start_reading: Number(r.start_reading),
      end_at: r.end_at,
      end_reading: r.end_reading === null ? null : Number(r.end_reading),
    }));

    return { settings, entries };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export default async function Home() {
  let user;
  try {
    user = await getSession();
  } catch (e) {
    return <Notice title="Setup needed" message={e instanceof Error ? e.message : "Check .env.local."} />;
  }
  if (!user) return <App session={null} />;

  const result = await load();
  if ("error" in result) {
    return (
      <Notice
        title="Can't reach the database"
        message={`${result.error} Check .env.local and that schema.sql was run in Supabase.`}
      />
    );
  }

  let admin = false;
  try {
    admin = await hasAdminSession();
  } catch {}

  return <App session={{ user, settings: result.settings, entries: result.entries, admin }} />;
}
