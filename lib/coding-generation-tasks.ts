import "server-only";
import path from "node:path";
import { promises as fs } from "node:fs";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type CodingGenerationTaskStatus =
  | "queued"
  | "processing"
  | "succeeded"
  | "failed";

export type CodingGenerationTaskRecord = {
  id: string;
  status: CodingGenerationTaskStatus;
  promptPreview: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  code?: string;
  error?: string;
  degraded?: boolean;
  degradedReason?: string;
  remainingCredits?: number;
  httpStatus?: number;
};

const TASKS_DIR = path.join(process.cwd(), ".runtime", "coding-generation-tasks");
const SUPABASE_TASKS_TABLE = "coding_generation_tasks";

async function ensureTasksDir() {
  await fs.mkdir(TASKS_DIR, { recursive: true });
}

function resolveTaskFilePath(taskId: string) {
  return path.join(TASKS_DIR, `${taskId}.json`);
}

function mapTaskRowToRecord(row: {
  id: string;
  status: string;
  prompt_preview: string;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  code?: string | null;
  error?: string | null;
  degraded?: boolean | null;
  degraded_reason?: string | null;
  remaining_credits?: number | null;
  http_status?: number | null;
}) {
  return {
    id: row.id,
    status: row.status as CodingGenerationTaskStatus,
    promptPreview: row.prompt_preview,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    code: row.code ?? undefined,
    error: row.error ?? undefined,
    degraded: row.degraded ?? undefined,
    degradedReason: row.degraded_reason ?? undefined,
    remainingCredits: row.remaining_credits ?? undefined,
    httpStatus: row.http_status ?? undefined,
  } satisfies CodingGenerationTaskRecord;
}

function mapTaskRecordToRow(task: CodingGenerationTaskRecord) {
  return {
    id: task.id,
    status: task.status,
    prompt_preview: task.promptPreview,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    started_at: task.startedAt ?? null,
    completed_at: task.completedAt ?? null,
    code: task.code ?? null,
    error: task.error ?? null,
    degraded: task.degraded ?? false,
    degraded_reason: task.degradedReason ?? null,
    remaining_credits: task.remainingCredits ?? null,
    http_status: task.httpStatus ?? null,
  };
}

async function readTaskFromSupabase(taskId: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from(SUPABASE_TASKS_TABLE)
      .select("*")
      .eq("id", taskId)
      .maybeSingle();

    if (error) {
      return null;
    }

    return data ? mapTaskRowToRecord(data) : null;
  } catch {
    return null;
  }
}

async function writeTaskToSupabase(task: CodingGenerationTaskRecord) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const taskRow = mapTaskRecordToRow(task);
    const { error } = await supabaseAdmin
      .from(SUPABASE_TASKS_TABLE as never)
      .upsert([taskRow] as never, { onConflict: "id" });

    return !error;
  } catch {
    return false;
  }
}

export async function readCodingGenerationTask(taskId: string) {
  const supabaseTask = await readTaskFromSupabase(taskId);

  if (supabaseTask) {
    return supabaseTask;
  }

  try {
    const fileContent = await fs.readFile(resolveTaskFilePath(taskId), "utf8");
    return JSON.parse(fileContent) as CodingGenerationTaskRecord;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function writeCodingGenerationTask(
  task: CodingGenerationTaskRecord,
) {
  const persistedToSupabase = await writeTaskToSupabase(task);

  if (persistedToSupabase) {
    return;
  }

  await ensureTasksDir();
  await fs.writeFile(
    resolveTaskFilePath(task.id),
    JSON.stringify(task, null, 2),
    "utf8",
  );
}

export async function updateCodingGenerationTask(
  taskId: string,
  patch: Partial<CodingGenerationTaskRecord>,
) {
  const existingTask = await readCodingGenerationTask(taskId);

  if (!existingTask) {
    return null;
  }

  const nextTask: CodingGenerationTaskRecord = {
    ...existingTask,
    ...patch,
    id: existingTask.id,
    updatedAt: new Date().toISOString(),
  };

  await writeCodingGenerationTask(nextTask);
  return nextTask;
}
