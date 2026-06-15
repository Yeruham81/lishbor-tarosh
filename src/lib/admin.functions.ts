import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---- helpers ------------------------------------------------------------
async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("forbidden");
}

const CLUE_STATUSES = ["draft", "active", "inactive", "archived", "hidden"] as const;

// ============================================================
// DEFINITIONS (clues)
// ============================================================
const DEF_SORT = ["created_at", "clue", "answer", "difficulty", "solved_count", "likes_count", "status"] as const;
const listDefinitionsSchema = z.object({
  status: z.enum(CLUE_STATUSES).optional(),
  search: z.string().max(200).optional(),
  includeDeleted: z.boolean().optional(),
  category: z.string().max(100).optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  sort_by: z.enum(DEF_SORT).default("created_at"),
  sort_dir: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().int().min(1).max(500).default(100),
  offset: z.number().int().min(0).default(0),
});

export const adminListDefinitions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => listDefinitionsSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("clues").select("*", { count: "exact" });
    if (data.status) q = q.eq("status", data.status);
    if (data.category) q = q.eq("category", data.category);
    if (typeof data.difficulty === "number") q = q.eq("difficulty", data.difficulty);
    if (!data.includeDeleted) q = q.is("deleted_at", null);
    if (data.search) {
      const s = data.search.replace(/[%,]/g, " ");
      q = q.or(`clue.ilike.%${s}%,answer.ilike.%${s}%,category.ilike.%${s}%`);
    }
    q = q.order(data.sort_by, { ascending: data.sort_dir === "asc" }).range(data.offset, data.offset + data.limit - 1);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const adminListCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("clues").select("category").not("category", "is", null).limit(5000);
    const set = new Set<string>();
    for (const r of data ?? []) if (r.category) set.add(r.category as string);
    return Array.from(set).sort();
  });

const clueUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  clue: z.string().min(1).max(2000),
  answer: z.string().min(1).max(200),
  alt_answer: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  type: z.string().max(100).optional().nullable(),
  difficulty: z.number().int().min(1).max(5).default(1),
  hint: z.string().max(1000).optional().nullable(),
  explanation: z.string().max(2000).optional().nullable(),
  status: z.enum(CLUE_STATUSES).default("active"),
  internal_notes: z.string().max(4000).optional().nullable(),
  publish_at: z.string().datetime().optional().nullable(),
  expire_at: z.string().datetime().optional().nullable(),
});


export const adminUpsertDefinition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => clueUpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Soft warning: detect duplicates
    const { data: dupes } = await supabaseAdmin
      .from("clues")
      .select("id, clue, answer")
      .eq("answer", data.answer)
      .limit(5);
    const warnings: string[] = [];
    const duplicateAnswer = (dupes ?? []).filter((d) => d.id !== data.id);
    if (duplicateAnswer.length > 0) warnings.push("answer_already_exists");
    const exactPair = duplicateAnswer.find((d) => d.clue.trim() === data.clue.trim());
    if (exactPair) {
      throw new Error("duplicate_definition_and_answer");
    }

    const payload = {
      clue: data.clue, answer: data.answer, alt_answer: data.alt_answer,
      category: data.category, type: data.type, difficulty: data.difficulty,
      hint: data.hint, explanation: data.explanation, status: data.status,
      internal_notes: data.internal_notes,
      publish_at: data.publish_at, expire_at: data.expire_at,
    };
    if (data.id) {
      const { data: updated, error } = await supabaseAdmin
        .from("clues").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      return { row: updated, warnings };
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("clues").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return { row: inserted, warnings };
  });


export const adminSetDefinitionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    status: z.enum(CLUE_STATUSES),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("clues").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSoftDeleteDefinition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await context.supabase.rpc("admin_soft_delete_clue", { _clue_id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRestoreDefinition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("clues")
      .update({ deleted_at: null, status: "active" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// SUBMISSIONS
// ============================================================
const SUB_SORT = ["created_at", "status"] as const;
const subListSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
  search: z.string().max(200).optional(),
  sort_by: z.enum(SUB_SORT).default("created_at"),
  sort_dir: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().int().min(1).max(500).default(100),
  offset: z.number().int().min(0).default(0),
});

export const adminListSubmissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => subListSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("puzzle_submissions").select("*", { count: "exact" });
    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.search) {
      const s = data.search.replace(/[%,]/g, " ");
      q = q.or(`clue_text.ilike.%${s}%,suggested_answer.ilike.%${s}%,edited_clue.ilike.%${s}%,edited_answer.ilike.%${s}%,category.ilike.%${s}%`);
    }
    q = q.order(data.sort_by, { ascending: data.sort_dir === "asc" }).range(data.offset, data.offset + data.limit - 1);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    const userIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id).filter(Boolean)));
    let profilesById: Record<string, any> = {};
    if (userIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles").select("id, username, display_name, avatar_url").in("id", userIds);
      profilesById = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
    }
    const withProfiles = (rows ?? []).map((r: any) => ({ ...r, profiles: profilesById[r.user_id] ?? null }));
    return { rows: withProfiles, total: count ?? 0 };
  });

export const adminEditSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    edited_clue: z.string().max(2000).optional().nullable(),
    edited_answer: z.string().max(200).optional().nullable(),
    edited_category: z.string().max(100).optional().nullable(),
    admin_notes: z.string().max(2000).optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("puzzle_submissions").update({
      edited_clue: data.edited_clue, edited_answer: data.edited_answer,
      edited_category: data.edited_category, admin_notes: data.admin_notes,
    }).eq("id", data.id).eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminApproveSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    points: z.number().int().min(0).max(10000).default(50),
    difficulty: z.number().int().min(1).max(5).default(1),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: clueId, error } = await context.supabase.rpc("admin_approve_submission", {
      _submission_id: data.id, _points: data.points, _difficulty: data.difficulty,
    });
    if (error) throw new Error(error.message);
    return { clueId };
  });

export const adminRejectSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    notes: z.string().max(2000).optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await context.supabase.rpc("admin_reject_submission", {
      _submission_id: data.id, _notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// CONTACT MESSAGES (feedback)
// ============================================================
export const adminListMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    status: z.enum(["new", "in_progress", "resolved", "closed", "all"]).default("all"),
    search: z.string().max(200).optional(),
    sort_by: z.enum(["created_at", "status"]).default("created_at"),
    sort_dir: z.enum(["asc", "desc"]).default("desc"),
    limit: z.number().int().min(1).max(500).default(100),
    offset: z.number().int().min(0).default(0),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("feedback").select("*", { count: "exact" });
    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.search) {
      const s = data.search.replace(/[%,]/g, " ");
      q = q.or(`subject.ilike.%${s}%,message.ilike.%${s}%,contact_email.ilike.%${s}%`);
    }
    q = q.order(data.sort_by, { ascending: data.sort_dir === "asc" }).range(data.offset, data.offset + data.limit - 1);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    const userIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id).filter(Boolean)));
    let profilesById: Record<string, any> = {};
    if (userIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles").select("id, username, display_name, email").in("id", userIds);
      profilesById = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
    }
    const enriched = (rows ?? []).map((r: any) => {
      const p = r.user_id ? profilesById[r.user_id] : null;
      return {
        ...r,
        name: p?.display_name ?? p?.username ?? null,
        email: p?.email ?? r.contact_email ?? null,
      };
    });
    return { rows: enriched, total: count ?? 0 };
  });

export const adminUpdateMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    status: z.enum(["new", "in_progress", "resolved", "closed"]).optional(),
    reply_text: z.string().max(4000).optional().nullable(),
    mark_read: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: any = {};
    if (data.status) patch.status = data.status;
    if (data.reply_text !== undefined) {
      patch.reply_text = data.reply_text;
      patch.replied_by = context.userId;
      patch.replied_at = new Date().toISOString();
    }
    if (data.mark_read) patch.read_at = new Date().toISOString();
    const { error } = await supabaseAdmin.from("feedback").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// PLAYERS
// ============================================================
const PLAYER_SORT = ["total_score", "created_at", "solved_count", "current_streak", "last_seen_at", "level"] as const;
export const adminListPlayers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    search: z.string().max(100).optional(),
    blocked: z.boolean().optional(),
    sort_by: z.enum(PLAYER_SORT).default("total_score"),
    sort_dir: z.enum(["asc", "desc"]).default("desc"),
    limit: z.number().int().min(1).max(500).default(100),
    offset: z.number().int().min(0).default(0),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("profiles").select("*", { count: "exact" });
    if (data.blocked !== undefined) q = q.eq("is_blocked", data.blocked);
    if (data.search) {
      const s = data.search.replace(/[%,]/g, " ");
      q = q.or(`username.ilike.%${s}%,display_name.ilike.%${s}%,email.ilike.%${s}%`);
    }
    q = q.order(data.sort_by, { ascending: data.sort_dir === "asc", nullsFirst: false }).range(data.offset, data.offset + data.limit - 1);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const adminAdjustPoints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    user_id: z.string().uuid(),
    delta: z.number().int().min(-100000).max(100000),
    reason: z.string().max(500).optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: total, error } = await context.supabase.rpc("admin_adjust_points", {
      _user_id: data.user_id, _delta: data.delta, _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { total };
  });

export const adminSetBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    user_id: z.string().uuid(),
    blocked: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await context.supabase.rpc("admin_set_user_blocked", {
      _user_id: data.user_id, _blocked: data.blocked,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// SETTINGS
// ============================================================
export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("app_settings").select("*");
    if (error) throw new Error(error.message);
    const settings: Record<string, any> = {};
    for (const row of data ?? []) settings[row.key] = row.value;
    return settings;
  });

export const adminSetSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    key: z.string().min(1).max(100).regex(/^[a-z_][a-z0-9_]*$/),
    value: z.any(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_settings").upsert({
      key: data.key, value: data.value, updated_by: context.userId, updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Public read for clients to know whether to show the submit form
export const getSubmissionsEnabled = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_settings").select("value").eq("key", "allow_player_submissions").maybeSingle();
    const v = data?.value;
    return { enabled: v === true || v === "true" || v === null || v === undefined ? (v ?? true) === true || v === "true" || v == null : false };
  });

// ============================================================
// ANALYTICS / KPIs
// ============================================================
export const adminKpis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ activeWindowDays: z.number().int().min(1).max(365).default(7) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: kpis, error } = await context.supabase.rpc("admin_kpis", { _active_window_days: data.activeWindowDays });
    if (error) throw new Error(error.message);
    return kpis;
  });

export const adminDailyActiveUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ days: z.number().int().min(1).max(180).default(30) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await context.supabase.rpc("admin_daily_active_users", { _days: data.days });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminSubmissionTrends = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ days: z.number().int().min(1).max(180).default(30) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await context.supabase.rpc("admin_submission_trends", { _days: data.days });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminCategoryPerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await context.supabase.rpc("admin_category_performance");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminContentHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    flag: z.enum(["low_success_rate", "high_dislikes", "missing_hint", "missing_explanation", "never_shown", "very_high_failure"]).optional(),
    limit: z.number().int().min(1).max(500).default(100),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("clue_health").select("*").limit(data.limit);
    if (data.flag) q = q.eq(data.flag, true);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============================================================
// IMPORT / EXPORT
// ============================================================
const importRowSchema = z.object({
  clue: z.string().min(1).max(2000),
  answer: z.string().min(1).max(200),
  category: z.string().max(100).optional().nullable(),
  type: z.string().max(100).optional().nullable(),
  difficulty: z.number().int().min(1).max(5).optional().default(1),
  hint: z.string().max(1000).optional().nullable(),
  explanation: z.string().max(2000).optional().nullable(),
  alt_answer: z.string().max(200).optional().nullable(),
  external_id: z.string().max(100).optional().nullable(),
});

export const adminImportDefinitions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    rows: z.array(z.any()).min(1).max(2000),
    mode: z.enum(["skip", "overwrite"]).default("skip"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let inserted = 0, skipped = 0;
    const failed: { row: number; reason: string }[] = [];
    const toInsert: any[] = [];
    const toUpsert: any[] = [];

    // Pre-load existing answers for duplicate detection
    const { data: existing } = await supabaseAdmin.from("clues").select("id, answer, clue, external_id");
    const byExternal = new Map<string, any>();
    const byClueAnswer = new Map<string, any>();
    for (const r of existing ?? []) {
      if (r.external_id) byExternal.set(r.external_id, r);
      byClueAnswer.set(`${(r.clue ?? "").trim()}|${(r.answer ?? "").trim()}`, r);
    }

    data.rows.forEach((raw: any, idx: number) => {
      const parsed = importRowSchema.safeParse(raw);
      if (!parsed.success) {
        failed.push({ row: idx + 1, reason: parsed.error.issues.map(i => i.message).join(", ") });
        return;
      }
      const row = parsed.data;
      const key = `${row.clue.trim()}|${row.answer.trim()}`;
      const dupe = (row.external_id && byExternal.get(row.external_id)) || byClueAnswer.get(key);
      if (dupe) {
        if (data.mode === "skip") { skipped += 1; return; }
        toUpsert.push({ id: dupe.id, ...row, status: "active" });
        return;
      }
      toInsert.push({ ...row, status: "active" });
    });

    if (toInsert.length > 0) {
      const { error } = await supabaseAdmin.from("clues").insert(toInsert);
      if (error) failed.push({ row: 0, reason: `insert_batch: ${error.message}` });
      else inserted += toInsert.length;
    }
    for (const row of toUpsert) {
      const { id, ...rest } = row;
      const { error } = await supabaseAdmin.from("clues").update(rest).eq("id", id);
      if (error) failed.push({ row: 0, reason: `update ${id}: ${error.message}` });
      else inserted += 1;
    }

    return { inserted, skipped, failed };
  });

export const adminExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    dataset: z.enum(["definitions", "submissions", "players", "messages", "snapshot"]),
    includeDeleted: z.boolean().default(false),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.dataset === "definitions" || data.dataset === "snapshot") {
      let q = supabaseAdmin.from("clues").select("*");
      if (!data.includeDeleted) q = q.is("deleted_at", null);
      const { data: clues } = await q;
      if (data.dataset === "definitions") return { definitions: clues ?? [] };
      const [{ data: subs }, { data: profs }] = await Promise.all([
        supabaseAdmin.from("puzzle_submissions").select("*"),
        supabaseAdmin.from("profiles").select("id, username, display_name, total_score, level, solved_count, is_blocked"),
      ]);
      return { definitions: clues ?? [], submissions: subs ?? [], players: profs ?? [], exported_at: new Date().toISOString() };
    }
    if (data.dataset === "submissions") {
      const { data: rows } = await supabaseAdmin.from("puzzle_submissions").select("*");
      return { submissions: rows ?? [] };
    }
    if (data.dataset === "players") {
      const { data: rows } = await supabaseAdmin.from("profiles").select("*");
      return { players: rows ?? [] };
    }
    if (data.dataset === "messages") {
      const { data: rows } = await supabaseAdmin.from("feedback").select("*");
      return { messages: rows ?? [] };
    }
    return {};
  });

// ============================================================
// LAST-SEEN PING (any signed-in user)
// ============================================================
export const touchLastSeen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", context.userId);
    return { ok: true };
  });

// ============================================================
// BULK OPERATIONS
// ============================================================
const idArray = z.array(z.string().uuid()).min(1).max(500);

export const adminBulkSetDefinitionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ids: idArray, status: z.enum(CLUE_STATUSES) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("clues").update({ status: data.status }).in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

export const adminBulkSoftDeleteDefinitions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ids: idArray }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("clues")
      .update({ deleted_at: new Date().toISOString() }).in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

export const adminBulkUpdateDefinitions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    ids: idArray,
    category: z.string().max(100).optional().nullable(),
    difficulty: z.number().int().min(1).max(5).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: any = {};
    if (data.category !== undefined) patch.category = data.category;
    if (typeof data.difficulty === "number") patch.difficulty = data.difficulty;
    if (Object.keys(patch).length === 0) return { ok: true, count: 0 };
    const { error } = await supabaseAdmin.from("clues").update(patch).in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

export const adminDuplicateDefinition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: src, error: e1 } = await supabaseAdmin.from("clues").select("*").eq("id", data.id).single();
    if (e1) throw new Error(e1.message);
    const { id, created_at, updated_at, deleted_at, external_id,
      solved_count, likes_count, dislikes_count, fail_count, shown_count,
      ...rest } = src as any;
    const payload = { ...rest, clue: `${rest.clue} (עותק)`, status: "draft" };
    const { data: row, error: e2 } = await supabaseAdmin.from("clues").insert(payload).select().single();
    if (e2) throw new Error(e2.message);
    return { row };
  });

export const adminBulkApproveSubmissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    ids: idArray,
    points: z.number().int().min(0).max(10000).default(50),
    difficulty: z.number().int().min(1).max(5).default(1),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let ok = 0; const errors: string[] = [];
    for (const id of data.ids) {
      const { error } = await context.supabase.rpc("admin_approve_submission", {
        _submission_id: id, _points: data.points, _difficulty: data.difficulty,
      });
      if (error) errors.push(`${id}: ${error.message}`); else ok++;
    }
    return { ok, errors };
  });

export const adminBulkRejectSubmissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ids: idArray, notes: z.string().max(2000).optional().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let ok = 0; const errors: string[] = [];
    for (const id of data.ids) {
      const { error } = await context.supabase.rpc("admin_reject_submission", {
        _submission_id: id, _notes: data.notes ?? undefined,
      });
      if (error) errors.push(`${id}: ${error.message}`); else ok++;
    }
    return { ok, errors };
  });

export const adminBulkSetBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_ids: idArray, blocked: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let ok = 0; const errors: string[] = [];
    for (const id of data.user_ids) {
      const { error } = await context.supabase.rpc("admin_set_user_blocked", { _user_id: id, _blocked: data.blocked });
      if (error) errors.push(`${id}: ${error.message}`); else ok++;
    }
    return { ok, errors };
  });
