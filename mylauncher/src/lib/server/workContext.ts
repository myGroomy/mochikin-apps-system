import "server-only";

import type { Branch, ScheduleEntry, Shift, WorkContext } from "@/lib/types";

/**
 * MYSHIFT integration stub.
 * Schedules are owned by MYSHIFT — launcher only reads them.
 * Replace fetchScheduleToday() with a real MYSHIFT API call when available.
 */

const BRANCHES: Branch[] = [
  { branch_id: "branch_cibiru", name: "Cibiru" },
  { branch_id: "branch_antapani", name: "Antapani" },
  { branch_id: "branch_cimahi", name: "Cimahi" },
];

const SHIFTS: Shift[] = [
  { shift_id: "shift_morning", name: "Morning", start_time: "06:00", end_time: "14:00" },
  { shift_id: "shift_afternoon", name: "Afternoon", start_time: "14:00", end_time: "22:00" },
  { shift_id: "shift_evening", name: "Evening", start_time: "10:00", end_time: "18:00" },
];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mockSchedulesForToday(): ScheduleEntry[] {
  const date = todayISO();
  return [
    { schedule_id: "sch_001", employee_id: "emp_001", date, branch_id: "branch_cibiru", shift_id: "shift_afternoon", updated_via: "schedule" },
    { schedule_id: "sch_002", employee_id: "emp_002", date, branch_id: "branch_antapani", shift_id: "shift_morning", updated_via: "swap" },
    { schedule_id: "sch_003", employee_id: "emp_003", date, branch_id: "branch_cimahi", shift_id: "shift_evening", updated_via: "replacement" },
  ];
}

async function fetchScheduleToday(employeeId: string): Promise<ScheduleEntry | null> {
  // MYSHIFT source (mock). Identity never changes — only schedule fields.
  const schedule = mockSchedulesForToday().find((s) => s.employee_id === employeeId) ?? null;
  return schedule;
}

export async function getWorkContext(employeeId: string): Promise<WorkContext> {
  const date = todayISO();
  const schedule = await fetchScheduleToday(employeeId);
  if (!schedule) {
    return { employee_id: employeeId, date, branch: null, shift: null, schedule: null };
  }
  const branch = BRANCHES.find((b) => b.branch_id === schedule.branch_id) ?? null;
  const shift = SHIFTS.find((s) => s.shift_id === schedule.shift_id) ?? null;
  return { employee_id: employeeId, date, branch, shift, schedule };
}
