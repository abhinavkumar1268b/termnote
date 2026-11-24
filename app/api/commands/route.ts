import { NextResponse } from "next/server";
import { z } from "zod";
import { executeCommand } from "@/lib/commands/executor";
import { realCommandServices } from "@/lib/commands/real-services";
import { setCommandServices } from "@/lib/commands/services";
import type { CommandResult } from "@/lib/commands/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const schema = z.object({ command: z.string().trim().min(1).max(500) });

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid command payload." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  setCommandServices(realCommandServices);
  const result: CommandResult = await executeCommand(parsed.data.command);
  return NextResponse.json(result);
}
