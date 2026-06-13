import React from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleGauge,
  Plus,
  RadioTower,
  Timer,
  XCircle,
} from 'lucide-react';

import { AppState, MedicineLog, MedicineLogStatus } from './types';
import {
  formatDateTime,
  formatLastSeen,
  formatScheduleTime,
  getActiveLog,
  getCompletionRate,
  getTodayStats,
  getUpcomingSchedules,
  isSameLocalDay,
} from './utils/medicine';

interface DashboardProps {
  state: AppState;
  onAddSchedule: () => void;
  onMarkTaken: (logId: string) => void;
  onMarkMissed: (logId: string) => void;
}

function statusClass(status: MedicineLogStatus) {
  if (status === 'taken') {
    return 'status-pill status-pill-success';
  }

  if (status === 'missed') {
    return 'status-pill status-pill-danger';
  }

  return 'status-pill status-pill-warning';
}

function getLogTime(log: MedicineLog) {
  return new Date(log.scheduledFor).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const Dashboard: React.FC<DashboardProps> = ({
  state,
  onAddSchedule,
  onMarkTaken,
  onMarkMissed,
}) => {
  const todayStats = getTodayStats(state.logs);
  const completionRate = getCompletionRate(state.logs);
  const activeLog = getActiveLog(state.logs);
  const upcomingSchedules = getUpcomingSchedules(state.schedules, new Date(), 4);
  const todayLogs = state.logs
    .filter((log) => isSameLocalDay(new Date(log.scheduledFor), new Date()))
    .sort((left, right) => new Date(left.scheduledFor).getTime() - new Date(right.scheduledFor).getTime());
  const activeScheduleCount = state.schedules.filter((schedule) => schedule.enabled).length;
  const totalToday = todayStats.taken + todayStats.pending + todayStats.missed;
  const progressOffset = 283 - (completionRate / 100) * 283;

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Medication overview</p>
          <h1>Dashboard</h1>
        </div>
        <button type="button" className="btn btn-primary" onClick={onAddSchedule}>
          <Plus size={18} aria-hidden="true" />
          <span>Add medicine</span>
        </button>
      </div>

      <div className="dashboard-overview">
        <section className="hero-panel">
          <div className="hero-copy">
            <p className="eyebrow">Today</p>
            <h2>{totalToday === 0 ? 'No doses logged yet' : `${todayStats.taken} of ${totalToday} doses taken`}</h2>
            <p>
              {activeLog
                ? `${activeLog.medicineName} is waiting in compartment ${activeLog.compartment}.`
                : 'The current schedule is quiet. Upcoming reminders are queued below.'}
            </p>
          </div>

          {totalToday > 0 && (
            <div className="progress-ring" aria-label={`${completionRate}% complete`}>
              <svg viewBox="0 0 100 100" role="presentation">
                <circle className="progress-track" cx="50" cy="50" r="45" />
                <circle
                  className="progress-value"
                  cx="50"
                  cy="50"
                  r="45"
                  style={{ strokeDashoffset: progressOffset }}
                />
              </svg>
              <div className="progress-label">
                <strong>{completionRate}%</strong>
                <span>Complete</span>
              </div>
            </div>
          )}
        </section>

        <section className="metric-grid dashboard-metrics" aria-label="Daily stats">
          <article className="metric-card">
            <CheckCircle2 size={22} aria-hidden="true" />
            <span>Taken</span>
            <strong>{todayStats.taken}</strong>
          </article>
          <article className="metric-card">
            <Timer size={22} aria-hidden="true" />
            <span>Pending</span>
            <strong>{todayStats.pending}</strong>
          </article>
          <article className="metric-card">
            <AlertTriangle size={22} aria-hidden="true" />
            <span>Missed</span>
            <strong>{todayStats.missed}</strong>
          </article>
          <article className="metric-card">
            <CircleGauge size={22} aria-hidden="true" />
            <span>Active schedules</span>
            <strong>{activeScheduleCount}</strong>
          </article>
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Dose queue</p>
              <h2>Today&apos;s medicines</h2>
            </div>
          </div>

          {todayLogs.length === 0 ? (
            <div className="empty-state">
              <CalendarClock size={32} aria-hidden="true" />
              <p>No medicine logs for today.</p>
            </div>
          ) : (
            <div className="data-list">
              {todayLogs.map((log) => (
                <div key={log.id} className="data-row">
                  <div className="row-main">
                    <span className={statusClass(log.status)}>{log.status}</span>
                    <div>
                      <h3>{log.medicineName}</h3>
                      <p>
                        {getLogTime(log)} / Compartment {log.compartment}
                      </p>
                    </div>
                  </div>

                  {log.status === 'pending' ? (
                    <div className="row-actions">
                      <button type="button" className="btn btn-success btn-sm" onClick={() => onMarkTaken(log.id)}>
                        <CheckCircle2 size={16} aria-hidden="true" />
                        <span>Taken</span>
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => onMarkMissed(log.id)}>
                        <XCircle size={16} aria-hidden="true" />
                        <span>Missed</span>
                      </button>
                    </div>
                  ) : (
                    <span className="row-time">{log.confirmedAt ? formatDateTime(log.confirmedAt) : getLogTime(log)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="side-stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Next up</p>
                <h2>Upcoming</h2>
              </div>
            </div>

            {upcomingSchedules.length === 0 ? (
              <div className="empty-state compact">
                <Timer size={28} aria-hidden="true" />
                <p>No active reminders.</p>
              </div>
            ) : (
              <div className="mini-list">
                {upcomingSchedules.map(({ schedule, scheduledAt }) => (
                  <div key={`${schedule.id}-${scheduledAt.toISOString()}`} className="mini-row">
                    <div>
                      <h3>{schedule.medicineName}</h3>
                      <p>{schedule.dosage}</p>
                    </div>
                    <span>{formatScheduleTime(schedule.time)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">ESP32 tray</p>
                <h2>Device</h2>
              </div>
              <RadioTower size={22} aria-hidden="true" />
            </div>

            <div className="device-summary">
              <div>
                <span className={`status-pill ${state.device.isConnected ? 'status-pill-success' : 'status-pill-muted'}`}>
                  {state.device.isConnected ? 'Online' : 'Offline'}
                </span>
                <h3>{state.device.trayState}</h3>
                <p>{state.device.lastEvent}</p>
              </div>
              <dl className="meta-grid">
                <div>
                  <dt>Mode</dt>
                  <dd>{state.device.mode}</dd>
                </div>
                <div>
                  <dt>Last sync</dt>
                  <dd>{formatLastSeen(state.device.lastSyncAt)}</dd>
                </div>
              </dl>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
