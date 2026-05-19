"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { useApi } from "@/lib/hooks/useApi";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/client";
import { MemberMultiSelect } from "@/components/dashboard/MemberMultiSelect";

interface MemberOption {
  memberId: number;
  fullName: string;
  departmentName: string | null;
  departmentId: number | null;
  position?: string | null;
}

interface DepartmentOption {
  id: number;
  slug: string;
  name: string;
}

type Priority = "low" | "medium" | "high" | "urgent";

/**
 * HR-only panel to assign generic tasks to any member or leader across any
 * department. Each pick fans out as a separate task (one-task-per-assignee),
 * matching the multi-assign convention used everywhere else.
 *
 * Server-side: /api/tasks POST now allows HR leadership to set any
 * departmentId (see canManageDepartmentTasks).
 */
export function AssignWorkPanel() {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const { data: members = [] } = useApi<MemberOption[]>("/api/members");
  const { data: departments = [] } = useApi<DepartmentOption[]>("/api/departments");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [creditHours, setCreditHours] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [scopeDeptId, setScopeDeptId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Member list is server-filtered to active members. Sort alphabetically.
  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [members],
  );

  function reset() {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setCreditHours("");
    setAssigneeIds([]);
    setScopeDeptId("");
  }

  async function submit() {
    if (!title.trim() || assigneeIds.length === 0) return;
    setSaving(true);
    try {
      // Fan out one POST per assignee. If a department scope was picked,
      // the task gets that departmentId; otherwise it inherits the
      // assignee's home department (cleanest for cross-dept assignments).
      const memberById = new Map(sortedMembers.map((m) => [m.memberId, m]));
      const results = await Promise.allSettled(
        assigneeIds.map((memberId) => {
          const member = memberById.get(memberId);
          const departmentId = scopeDeptId
            ? Number(scopeDeptId)
            : member?.departmentId ?? undefined;
          return api.post("/api/tasks", {
            title: title.trim(),
            description: description.trim() || undefined,
            assignedTo: memberId,
            departmentId,
            dueDate: dueDate || undefined,
            priority,
            creditHours: creditHours ? Number(creditHours) : undefined,
          });
        }),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      const created = results.length - failed;
      if (failed === 0) {
        toast.success(
          created === 1
            ? tr("Task assigned", "تم إسناد المهمة")
            : tr(`${created} tasks assigned`, `أُسندت ${created} مهام`),
        );
        reset();
      } else if (created > 0) {
        toast.error(tr(`${created} assigned · ${failed} failed`, `${created} نجحت · ${failed} فشلت`));
      } else {
        throw new Error("All assignments failed");
      }
    } catch {
      toast.error(tr("Assignment failed. Please try again.", "فشل الإسناد. حاول مرة أخرى."));
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "surface-input px-3 py-2 text-sm";
  const labelCls = "block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5";

  return (
    <section className="space-y-5">
      <div className="panel-soft p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {tr("Assign Work", "إسناد عمل")}
            </h3>
            <p className="mt-1 text-xs text-muted">
              {tr(
                "Send a task to one or more members or leaders. One task is created per assignee.",
                "أرسل مهمة إلى عضو أو أكثر من الأعضاء أو القادة. تُنشأ مهمة لكل مكلَّف.",
              )}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelCls}>{tr("Task Title", "عنوان المهمة")}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tr("Prepare semester report draft", "تجهيز مسودة تقرير الفصل")}
              className={inputCls}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>{tr("Description", "الوصف")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={tr("What does this person need to deliver?", "ماذا يجب أن يسلّم هذا الشخص؟")}
              className={`${inputCls} resize-none`}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>
              {tr("Assignees (one task per person)", "المكلَّفون (مهمة لكل شخص)")}
            </label>
            <MemberMultiSelect
              members={sortedMembers.map((m) => ({
                memberId: m.memberId,
                fullName: m.fullName,
                meta: m.departmentName,
              }))}
              value={assigneeIds}
              onChange={setAssigneeIds}
              lang={lang as "en" | "ar"}
              placeholder={tr("Search any member or leader…", "ابحث عن أي عضو أو قائد…")}
              emptyHint={["Pick at least one person to assign", "اختر شخصًا واحدًا على الأقل"]}
            />
          </div>
          <div>
            <label className={labelCls}>{tr("Priority", "الأولوية")}</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={inputCls}>
              <option value="low">{tr("Low", "منخفضة")}</option>
              <option value="medium">{tr("Medium", "متوسطة")}</option>
              <option value="high">{tr("High", "مرتفعة")}</option>
              <option value="urgent">{tr("Urgent", "عاجلة")}</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>{tr("Due Date", "تاريخ الاستحقاق")}</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{tr("Credit Hours", "ساعات الاعتماد")}</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={creditHours}
              onChange={(e) => setCreditHours(e.target.value)}
              placeholder="0"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>
              {tr("Department scope (optional)", "نطاق اللجنة (اختياري)")}
            </label>
            <select value={scopeDeptId} onChange={(e) => setScopeDeptId(e.target.value)} className={inputCls}>
              <option value="">{tr("Use each assignee's department", "استخدم لجنة كل مُكلَّف")}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={saving || !title.trim() || assigneeIds.length === 0}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-50"
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
            {assigneeIds.length > 1
              ? tr(`Send ${assigneeIds.length} tasks`, `أرسل ${assigneeIds.length} مهام`)
              : tr("Send task", "أرسل المهمة")}
          </button>
          {assigneeIds.length > 0 && (
            <span className="text-[11px] text-muted">
              {tr(
                `${assigneeIds.length} assignee${assigneeIds.length === 1 ? "" : "s"} selected`,
                `تم اختيار ${assigneeIds.length} مكلَّف`,
              )}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
