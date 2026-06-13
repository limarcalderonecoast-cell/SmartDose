import React from 'react';
import { CalendarPlus, Clock3, Pencil, Package, Plus, Trash2 } from 'lucide-react';

import { MedicineSchedule } from './types';
import { formatBytes, formatLastSeen, formatScheduleTime } from './utils/medicine';

interface ScheduleFormProps {
  schedules: MedicineSchedule[];
  onAdd: () => void;
  onEdit: (schedule: MedicineSchedule) => void;
  onDelete: (id: string) => void;
}

function ScheduleCard({
  schedule,
  onEdit,
  onDelete,
}: {
  schedule: MedicineSchedule;
  onEdit: (schedule: MedicineSchedule) => void;
  onDelete: (id: string) => void;
}) {
  const confirmDelete = () => {
    if (window.confirm(`Delete ${schedule.medicineName} from the schedule?`)) {
      void onDelete(schedule.id);
    }
  };

  return (
    <article className="schedule-card">
      <div className="schedule-card-top">
        <div>
          <span className={schedule.enabled ? 'status-pill status-pill-success' : 'status-pill status-pill-muted'}>
            {schedule.enabled ? 'Active' : 'Paused'}
          </span>
          <h3>{schedule.medicineName}</h3>
          <p>{schedule.dosage}</p>
        </div>
        <div className="icon-action-row">
          <button
            type="button"
            className="icon-button"
            onClick={() => onEdit(schedule)}
            title="Edit medicine"
            aria-label={`Edit ${schedule.medicineName}`}
          >
            <Pencil size={17} />
          </button>
          <button
            type="button"
            className="icon-button icon-button-danger"
            onClick={confirmDelete}
            title="Delete medicine"
            aria-label={`Delete ${schedule.medicineName}`}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <div className="schedule-meta-grid">
        <div>
          <Clock3 size={17} aria-hidden="true" />
          <span>{formatScheduleTime(schedule.time)}</span>
        </div>
        <div>
          <Package size={17} aria-hidden="true" />
          <span>Compartment {schedule.compartment}</span>
        </div>
      </div>

      {schedule.instructions && <p className="schedule-note">{schedule.instructions}</p>}

      <div className="schedule-footer">
        <span>{schedule.reminderWindowMinutes} min window</span>
        <span>Synced {formatLastSeen(schedule.lastSyncedAt)}</span>
      </div>
    </article>
  );
}

export const ScheduleForm: React.FC<ScheduleFormProps> = ({
  schedules,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const activeSchedules = schedules.filter((schedule) => schedule.enabled);
  const pausedSchedules = schedules.filter((schedule) => !schedule.enabled);

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Medicine plan</p>
          <h1>Schedule</h1>
        </div>
        <button type="button" className="btn btn-primary" onClick={onAdd}>
          <Plus size={18} aria-hidden="true" />
          <span>Add medicine</span>
        </button>
      </div>

      {schedules.length === 0 ? (
        <section className="panel empty-panel">
          <CalendarPlus size={38} aria-hidden="true" />
          <h2>No medicines scheduled</h2>
          <p>Create a medicine schedule to start tracking reminders.</p>
          <button type="button" className="btn btn-primary" onClick={onAdd}>
            <Plus size={18} aria-hidden="true" />
            <span>Add medicine</span>
          </button>
        </section>
      ) : (
        <>
          <section className="schedule-section">
            <div className="section-title-row">
              <div>
                <p className="eyebrow">Running now</p>
                <h2>Active medicines</h2>
              </div>
              <span className="count-badge">{activeSchedules.length}</span>
            </div>

            {activeSchedules.length === 0 ? (
              <div className="panel empty-state compact">
                <p>No active medicines.</p>
              </div>
            ) : (
              <div className="schedule-grid">
                {activeSchedules.map((schedule) => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </section>

          {pausedSchedules.length > 0 && (
            <section className="schedule-section">
              <div className="section-title-row">
                <div>
                  <p className="eyebrow">Not reminding</p>
                  <h2>Paused medicines</h2>
                </div>
                <span className="count-badge">{pausedSchedules.length}</span>
              </div>
              <div className="schedule-grid">
                {pausedSchedules.map((schedule) => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
