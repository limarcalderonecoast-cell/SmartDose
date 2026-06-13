import React, { useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, Filter } from 'lucide-react';

import { MedicineLog, MedicineLogStatus, MedicineSchedule } from './types';
import { formatDateTime, sortLogsDescending } from './utils/medicine';

interface HistoryViewProps {
  logs: MedicineLog[];
  schedules: MedicineSchedule[];
}

type HistoryFilter = 'all' | MedicineLogStatus;

const FILTERS: Array<{ label: string; value: HistoryFilter; countKey: 'total' | MedicineLogStatus }> = [
  { label: 'All', value: 'all', countKey: 'total' },
  { label: 'Taken', value: 'taken', countKey: 'taken' },
  { label: 'Pending', value: 'pending', countKey: 'pending' },
  { label: 'Missed', value: 'missed', countKey: 'missed' },
];

function badgeClass(status: MedicineLogStatus) {
  if (status === 'taken') {
    return 'status-pill status-pill-success';
  }

  if (status === 'missed') {
    return 'status-pill status-pill-danger';
  }

  return 'status-pill status-pill-warning';
}

export const HistoryView: React.FC<HistoryViewProps> = ({ logs, schedules }) => {
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const sortedLogs = useMemo(() => {
    const visibleLogs = filter === 'all' ? logs : logs.filter((log) => log.status === filter);
    return sortLogsDescending(visibleLogs);
  }, [filter, logs]);

  const stats = useMemo(
    () => ({
      total: logs.length,
      taken: logs.filter((log) => log.status === 'taken').length,
      missed: logs.filter((log) => log.status === 'missed').length,
      pending: logs.filter((log) => log.status === 'pending').length,
    }),
    [logs]
  );

  const getDosage = (scheduleId: string) =>
    schedules.find((schedule) => schedule.id === scheduleId)?.dosage ?? 'Recorded dose';

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Adherence log</p>
          <h1>History</h1>
        </div>
      </div>

      <section className="metric-grid" aria-label="History stats">
        <article className="metric-card">
          <CalendarDays size={22} aria-hidden="true" />
          <span>Total logs</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="metric-card">
          <CheckCircle2 size={22} aria-hidden="true" />
          <span>Taken</span>
          <strong>{stats.taken}</strong>
        </article>
        <article className="metric-card">
          <Clock3 size={22} aria-hidden="true" />
          <span>Pending</span>
          <strong>{stats.pending}</strong>
        </article>
        <article className="metric-card">
          <AlertTriangle size={22} aria-hidden="true" />
          <span>Missed</span>
          <strong>{stats.missed}</strong>
        </article>
      </section>

      <section className="panel history-filter-panel">
        <div className="filter-toolbar history-filter-toolbar">
          <div className="filter-title">
            <Filter size={18} aria-hidden="true" />
            <span>Status</span>
          </div>
          <div className="segmented-control history-status-tabs" role="tablist" aria-label="Filter history by status">
            {FILTERS.map((item) => {
              const isActive = filter === item.value;
              const count = stats[item.countKey];

              return (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`history-status-tab history-status-tab-${item.value} ${isActive ? 'segment-active' : ''}`}
                  onClick={() => setFilter(item.value)}
                >
                  <span>{item.label}</span>
                  <strong>{count}</strong>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {sortedLogs.length === 0 ? (
        <section className="panel empty-panel">
          <CalendarDays size={38} aria-hidden="true" />
          <h2>No matching logs</h2>
          <p>{filter === 'all' ? 'Medicine logs will appear here as reminders are reconciled.' : `No ${filter} logs found.`}</p>
        </section>
      ) : (
        <section className="panel">
          <div className="data-list">
            {sortedLogs.map((log) => (
              <div key={log.id} className="data-row">
                <div className="row-main">
                  <span className={badgeClass(log.status)}>{log.status}</span>
                  <div>
                    <h3>{log.medicineName}</h3>
                    <p>
                      {getDosage(log.scheduleId)} / Compartment {log.compartment}
                    </p>
                  </div>
                </div>
                <span className="row-time">{formatDateTime(log.scheduledFor)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
