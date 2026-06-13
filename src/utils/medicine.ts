import { MedicineLog, MedicineSchedule } from '../types';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_HISTORY_DAYS = 5;

export function createId(prefix = 'item'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function parseTime24(time: string): { hour: number; minute: number } {
  const [rawHour = '0', rawMinute = '0'] = time.split(':');
  const hour = Number.parseInt(rawHour, 10);
  const minute = Number.parseInt(rawMinute, 10);

  return {
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

export function formatScheduleTime(time: string): string {
  const { hour, minute } = parseTime24(time);
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${twelveHour}:${minute.toString().padStart(2, '0')} ${meridiem}`;
}

export function toTwelveHourParts(
  time: string
): { hour: string; minute: string; meridiem: 'AM' | 'PM' } {
  const { hour, minute } = parseTime24(time);
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;

  return {
    hour: twelveHour.toString(),
    minute: minute.toString().padStart(2, '0'),
    meridiem,
  };
}

export function fromTwelveHourParts(
  hourInput: string,
  minuteInput: string,
  meridiem: 'AM' | 'PM'
): string | null {
  const hour = Number.parseInt(hourInput, 10);
  const minute = Number.parseInt(minuteInput, 10);

  if (!Number.isFinite(hour) || hour < 1 || hour > 12) {
    return null;
  }

  if (!Number.isFinite(minute) || minute < 0 || minute > 59) {
    return null;
  }

  let convertedHour = hour % 12;
  if (meridiem === 'PM') {
    convertedHour += 12;
  }

  return `${convertedHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

export function buildScheduledDate(time: string, anchorDate: Date): Date {
  const { hour, minute } = parseTime24(time);
  const scheduledDate = new Date(anchorDate);
  scheduledDate.setHours(hour, minute, 0, 0);
  return scheduledDate;
}

function startOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function createOccurrenceKey(scheduleId: string, scheduledFor: string): string {
  return `${scheduleId}__${scheduledFor}`;
}

function derivePendingStatus(schedule: MedicineSchedule, scheduledAt: Date, now: Date) {
  const minutesLate = (now.getTime() - scheduledAt.getTime()) / (60 * 1000);
  return minutesLate > schedule.reminderWindowMinutes ? 'missed' : 'pending';
}

export function sortSchedules(schedules: MedicineSchedule[]): MedicineSchedule[] {
  return [...schedules].sort(
    (left, right) =>
      left.time.localeCompare(right.time) ||
      left.compartment - right.compartment ||
      left.medicineName.localeCompare(right.medicineName)
  );
}

export function sortLogsDescending(logs: MedicineLog[]): MedicineLog[] {
  return [...logs].sort(
    (left, right) => new Date(right.scheduledFor).getTime() - new Date(left.scheduledFor).getTime()
  );
}

export function reconcileLogs(
  schedules: MedicineSchedule[],
  currentLogs: MedicineLog[],
  now: Date = new Date()
): MedicineLog[] {
  const logsByOccurrence = new Map<string, MedicineLog>();

  currentLogs.forEach((log) => {
    logsByOccurrence.set(log.occurrenceKey, log);
  });

  const baseDay = startOfDay(now);

  schedules
    .filter((schedule) => schedule.enabled)
    .forEach((schedule) => {
      for (let offset = RECENT_HISTORY_DAYS - 1; offset >= 0; offset -= 1) {
        const targetDay = new Date(baseDay.getTime() - offset * ONE_DAY_MS);
        const scheduledAt = buildScheduledDate(schedule.time, targetDay);

        if (scheduledAt.getTime() > now.getTime()) {
          continue;
        }

        const scheduledFor = scheduledAt.toISOString();
        const occurrenceKey = createOccurrenceKey(schedule.id, scheduledFor);
        const existingLog = logsByOccurrence.get(occurrenceKey);

        if (!existingLog) {
          logsByOccurrence.set(occurrenceKey, {
            id: createId('log'),
            occurrenceKey,
            scheduleId: schedule.id,
            medicineName: schedule.medicineName,
            compartment: schedule.compartment,
            scheduledFor,
            status: derivePendingStatus(schedule, scheduledAt, now),
            confirmedAt: null,
          });
          continue;
        }

        if (existingLog.status === 'pending') {
          logsByOccurrence.set(occurrenceKey, {
            ...existingLog,
            medicineName: schedule.medicineName,
            compartment: schedule.compartment,
            status: derivePendingStatus(schedule, scheduledAt, now),
          });
          continue;
        }

        logsByOccurrence.set(occurrenceKey, {
          ...existingLog,
          medicineName: schedule.medicineName,
          compartment: schedule.compartment,
        });
      }
    });

  return sortLogsDescending(Array.from(logsByOccurrence.values()));
}

export function getUpcomingSchedules(
  schedules: MedicineSchedule[],
  now: Date = new Date(),
  count = 3
): Array<{ schedule: MedicineSchedule; scheduledAt: Date }> {
  return schedules
    .filter((schedule) => schedule.enabled)
    .map((schedule) => {
      const todayCandidate = buildScheduledDate(schedule.time, now);
      const scheduledAt =
        todayCandidate.getTime() >= now.getTime()
          ? todayCandidate
          : new Date(todayCandidate.getTime() + ONE_DAY_MS);

      return { schedule, scheduledAt };
    })
    .sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime())
    .slice(0, count);
}

export function getTodayStats(logs: MedicineLog[], now: Date = new Date()) {
  return logs.reduce(
    (stats, log) => {
      if (!isSameLocalDay(new Date(log.scheduledFor), now)) {
        return stats;
      }

      if (log.status === 'taken') {
        stats.taken += 1;
      } else if (log.status === 'missed') {
        stats.missed += 1;
      } else {
        stats.pending += 1;
      }

      return stats;
    },
    { taken: 0, pending: 0, missed: 0 }
  );
}

export function getCompletionRate(logs: MedicineLog[], now: Date = new Date()): number {
  const stats = getTodayStats(logs, now);
  const total = stats.taken + stats.pending + stats.missed;

  if (total === 0) {
    return 100;
  }

  return Math.round((stats.taken / total) * 100);
}

export function getActiveLog(logs: MedicineLog[]): MedicineLog | undefined {
  return [...logs]
    .filter((log) => log.status === 'pending')
    .sort((left, right) => new Date(left.scheduledFor).getTime() - new Date(right.scheduledFor).getTime())[0];
}

export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatCompactDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

export function formatLastSeen(isoString: string | null): string {
  if (!isoString) {
    return 'Not yet';
  }

  return new Date(isoString).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 || unitIndex === 0 ? Math.round(value) : value.toFixed(1)} ${units[unitIndex]}`;
}
