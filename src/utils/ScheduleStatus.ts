const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function computeStatusFromScheduledDate(scheduledDate: Date) {
  const today = startOfDay(new Date());
  const sched = startOfDay(scheduledDate);
  const diffDays = Math.round((sched.getTime() - today.getTime()) / MS_PER_DAY);

  if (diffDays < 0) {
    const daysAgo = Math.abs(diffDays);
    if (daysAgo > 3) return "overdue";
    if (diffDays <= 3) return "due_soon";
  }

  return "scheduled";
}
