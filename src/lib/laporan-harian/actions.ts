export type DailyActionPriority = "high" | "medium" | "low";
export type DailyActionStatus = "todo" | "in_progress" | "blocked" | "done";

export interface DailyActionItem {
  id: string;
  period: string;
  title: string;
  description: string;
  priority: DailyActionPriority;
  status: DailyActionStatus;
  assignee: string;
  dueDate: string;
  source: string;
  metric?: string;
  outcome?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

const STORAGE_KEY = "freshvision-daily-actions-v1";

function readAll(): DailyActionItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: DailyActionItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function loadDailyActions(period: string): DailyActionItem[] {
  return readAll()
    .filter((item) => item.period === period)
    .sort((a, b) => {
      if (a.status === "done" && b.status !== "done") return 1;
      if (a.status !== "done" && b.status === "done") return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
}

export function saveDailyAction(item: DailyActionItem): DailyActionItem[] {
  const items = readAll();
  const index = items.findIndex((existing) => existing.id === item.id);
  if (index >= 0) items[index] = item;
  else items.push(item);
  writeAll(items);
  return loadDailyActions(item.period);
}

export function deleteDailyAction(id: string, period: string): DailyActionItem[] {
  writeAll(readAll().filter((item) => item.id !== id));
  return loadDailyActions(period);
}

export function createDailyAction(
  period: string,
  input: Pick<DailyActionItem, "title" | "description" | "priority" | "assignee" | "dueDate" | "source"> & Partial<Pick<DailyActionItem, "metric">>,
): DailyActionItem {
  const now = new Date().toISOString();
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    period,
    status: "todo",
    outcome: "",
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}

export function isActionOverdue(item: DailyActionItem, today = new Date()): boolean {
  if (item.status === "done" || !item.dueDate) return false;
  const endOfDueDate = new Date(`${item.dueDate}T23:59:59`);
  return endOfDueDate.getTime() < today.getTime();
}
