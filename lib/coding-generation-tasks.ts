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
  mode?: "coding";
  requestId?: string;
  requestPrompt?: string;
  chargedUserId?: string;
  creditCost?: number;
  promptPreview: string;
  progressMessage?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  partialCode?: string;
  code?: string;
  error?: string;
  degraded?: boolean;
  degradedReason?: string;
  modelAttempts?: Array<{
    slot: "A" | "B" | "C";
    label: string;
    model: string;
    endpointUrl: string;
    result:
      | "success"
      | "failure"
      | "timeout"
      | "skipped_missing_key"
      | "stopped"
      | "cooldown_skipped";
    status?: number;
    message?: string;
  }>;
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
  mode?: string | null;
  request_id?: string | null;
  request_prompt?: string | null;
  charged_user_id?: string | null;
  credit_cost?: number | null;
  prompt_preview: string;
  progress_message?: string | null;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  partial_code?: string | null;
  code?: string | null;
  error?: string | null;
  degraded?: boolean | null;
  degraded_reason?: string | null;
  model_attempts?:
    | Array<{
        slot: "A" | "B" | "C";
        label: string;
        model: string;
        endpointUrl: string;
        result:
          | "success"
          | "failure"
          | "timeout"
          | "skipped_missing_key"
          | "stopped"
          | "cooldown_skipped";
        status?: number;
        message?: string;
      }>
    | null;
  remaining_credits?: number | null;
  http_status?: number | null;
}) {
  return {
    id: row.id,
    status: row.status as CodingGenerationTaskStatus,
    mode: row.mode === "coding" ? "coding" : undefined,
    requestId: row.request_id ?? undefined,
    requestPrompt: row.request_prompt ?? undefined,
    chargedUserId: row.charged_user_id ?? undefined,
    creditCost: row.credit_cost ?? undefined,
    promptPreview: row.prompt_preview,
    progressMessage: row.progress_message ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    partialCode: row.partial_code ?? undefined,
    code: row.code ?? undefined,
    error: row.error ?? undefined,
    degraded: row.degraded ?? undefined,
    degradedReason: row.degraded_reason ?? undefined,
    modelAttempts: row.model_attempts ?? undefined,
    remainingCredits: row.remaining_credits ?? undefined,
    httpStatus: row.http_status ?? undefined,
  } satisfies CodingGenerationTaskRecord;
}

function mapTaskRecordToRow(task: CodingGenerationTaskRecord) {
  return {
    id: task.id,
    status: task.status,
    mode: task.mode ?? "coding",
    request_id: task.requestId ?? null,
    request_prompt: task.requestPrompt ?? null,
    charged_user_id: task.chargedUserId ?? null,
    credit_cost: task.creditCost ?? null,
    prompt_preview: task.promptPreview,
    progress_message: task.progressMessage ?? null,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    started_at: task.startedAt ?? null,
    completed_at: task.completedAt ?? null,
    partial_code: task.partialCode ?? null,
    code: task.code ?? null,
    error: task.error ?? null,
    degraded: task.degraded ?? false,
    degraded_reason: task.degradedReason ?? null,
    model_attempts: task.modelAttempts ?? null,
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

async function listTasksFromSupabaseByStatuses(
  statuses: CodingGenerationTaskStatus[],
  limit?: number,
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    let query = supabaseAdmin
      .from(SUPABASE_TASKS_TABLE)
      .select("*")
      .in("status", statuses)
      .order("created_at", { ascending: true });

    if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error || !data) {
      return null;
    }

    return data.map(mapTaskRowToRecord);
  } catch {
    return null;
  }
}

async function listTasksFromFilesByStatuses(
  statuses: CodingGenerationTaskStatus[],
  limit?: number,
) {
  try {
    await ensureTasksDir();
    const entries = await fs.readdir(TASKS_DIR);
    const tasks: CodingGenerationTaskRecord[] = [];

    for (const entry of entries) {
      if (!entry.endsWith(".json")) {
        continue;
      }

      const task = await readCodingGenerationTask(entry.replace(/\.json$/i, ""));

      if (task && statuses.includes(task.status)) {
        tasks.push(task);
      }
    }

    tasks.sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );

    if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
      return tasks.slice(0, limit);
    }

    return tasks;
  } catch {
    return [];
  }
}

export async function listCodingGenerationTasksByStatus(
  statuses: CodingGenerationTaskStatus[],
  limit?: number,
) {
  const supabaseTasks = await listTasksFromSupabaseByStatuses(statuses, limit);

  if (supabaseTasks) {
    return supabaseTasks;
  }

  return listTasksFromFilesByStatuses(statuses, limit);
}

export async function countCodingGenerationTasksByStatus(
  statuses: CodingGenerationTaskStatus[],
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { count, error } = await supabaseAdmin
      .from(SUPABASE_TASKS_TABLE)
      .select("id", { count: "exact", head: true })
      .in("status", statuses);

    if (!error && typeof count === "number") {
      return count;
    }
  } catch {
    // Fall through to file storage.
  }

  const tasks = await listTasksFromFilesByStatuses(statuses);
  return tasks.length;
}

export async function countQueuedCodingGenerationTasksAhead(
  taskId: string,
  createdAt: string,
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { count, error } = await supabaseAdmin
      .from(SUPABASE_TASKS_TABLE)
      .select("id", { count: "exact", head: true })
      .eq("status", "queued")
      .lt("created_at", createdAt);

    if (!error && typeof count === "number") {
      return count;
    }
  } catch {
    // Fall through to file storage.
  }

  const queuedTasks = await listTasksFromFilesByStatuses(["queued"]);
  return queuedTasks.filter(
    (task) => task.id !== taskId && task.createdAt < createdAt,
  ).length;
}

export async function claimCodingGenerationTask(
  taskId: string,
  patch?: Partial<CodingGenerationTaskRecord>,
) {
  const existingTask = await readCodingGenerationTask(taskId);

  if (!existingTask || existingTask.status !== "queued") {
    return null;
  }

  const nextTask: CodingGenerationTaskRecord = {
    ...existingTask,
    ...patch,
    id: existingTask.id,
    status: "processing",
    updatedAt: new Date().toISOString(),
  };

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const updateRow = mapTaskRecordToRow(nextTask);

    const { data, error } = await supabaseAdmin
      .from(SUPABASE_TASKS_TABLE as never)
      .update({
        status: "processing",
        mode: updateRow.mode,
        request_id: updateRow.request_id,
        request_prompt: updateRow.request_prompt,
        charged_user_id: updateRow.charged_user_id,
        credit_cost: updateRow.credit_cost,
        prompt_preview: updateRow.prompt_preview,
        progress_message: updateRow.progress_message,
        partial_code: updateRow.partial_code,
        started_at: updateRow.started_at,
        updated_at: updateRow.updated_at,
        remaining_credits: updateRow.remaining_credits,
      } as never)
      .eq("id", taskId)
      .eq("status", "queued")
      .select("*")
      .maybeSingle();

    if (!error && data) {
      return mapTaskRowToRecord(data);
    }
  } catch {
    // Fall through to file storage.
  }

  await writeCodingGenerationTask(nextTask);
  return nextTask;
}
