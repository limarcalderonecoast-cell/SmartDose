import { MedicineSchedule, NotificationAccess } from '../types';
import { buildScheduledDate } from '../utils/medicine';

const scheduledReminderTimers = new Map<string, number>();

function getNextReminderDate(schedule: MedicineSchedule): Date {
  const now = new Date();
  const todayReminder = buildScheduledDate(schedule.time, now);

  if (todayReminder.getTime() > now.getTime()) {
    return todayReminder;
  }

  const tomorrowReminder = new Date(todayReminder);
  tomorrowReminder.setDate(tomorrowReminder.getDate() + 1);
  return tomorrowReminder;
}

function showBrowserNotification(schedule: MedicineSchedule) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  new Notification('Time to take your medicine', {
    body: `${schedule.medicineName} is ready. Compartment ${schedule.compartment} is open.`,
    tag: schedule.id,
  });
}

function playAudioReminder(schedule: MedicineSchedule) {
  if (!schedule.audioReminder?.dataUrl) {
    return;
  }

  const audio = new Audio(schedule.audioReminder.dataUrl);
  audio.play().catch((error) => {
    console.warn('Unable to play custom reminder audio.', error);
  });
}

export async function initializeNotifications(): Promise<NotificationAccess> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted' ? 'granted' : 'denied';
}

export async function cancelReminder(notificationId: string | null): Promise<void> {
  if (!notificationId) {
    return;
  }

  const timerId = scheduledReminderTimers.get(notificationId);
  if (timerId) {
    window.clearTimeout(timerId);
    scheduledReminderTimers.delete(notificationId);
  }
}

export async function scheduleMedicineReminder(
  schedule: MedicineSchedule,
  notificationAccess: NotificationAccess
): Promise<string | null> {
  if (notificationAccess !== 'granted' || !schedule.enabled) {
    return null;
  }

  const notificationId = `web-reminder-${schedule.id}`;
  await cancelReminder(notificationId);

  const nextReminder = getNextReminderDate(schedule);
  const delayMs = Math.max(0, nextReminder.getTime() - Date.now());
  const timerId = window.setTimeout(() => {
    showBrowserNotification(schedule);
    playAudioReminder(schedule);
    void scheduleMedicineReminder(schedule, notificationAccess);
  }, delayMs);

  scheduledReminderTimers.set(notificationId, timerId);
  return notificationId;
}
