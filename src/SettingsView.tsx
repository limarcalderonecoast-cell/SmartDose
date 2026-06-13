import React from 'react';
import {
  Bell,
  Bluetooth,
  Database,
  FileAudio,
  HardDriveUpload,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Upload,
  Wifi,
  X,
} from 'lucide-react';

import { AppState, TransportMode } from './types';
import { formatBytes, formatLastSeen } from './utils/medicine';

interface SettingsViewProps {
  appState: AppState;
  isConnecting: boolean;
  isSyncing: boolean;
  onAutoSyncChange: (enabled: boolean) => void;
  onSyncNow: () => void;
  onToggleConnection: () => void;
  onTransportChange: (mode: TransportMode) => void;
  onUploadAudio: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAudio: () => void;
}

const transportOptions: Array<{ value: TransportMode; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { value: 'Bluetooth', label: 'Bluetooth', icon: Bluetooth },
  { value: 'Wi-Fi', label: 'Wi-Fi', icon: Wifi },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  appState,
  isConnecting,
  isSyncing,
  onAutoSyncChange,
  onSyncNow,
  onToggleConnection,
  onTransportChange,
  onUploadAudio,
  onRemoveAudio,
}) => {
  const { device, settings, schedules, logs } = appState;

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">System controls</p>
          <h1>Settings</h1>
        </div>
      </div>

      <div className="settings-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Connection</p>
              <h2>ESP32 tray</h2>
            </div>
            <PlugZap size={22} aria-hidden="true" />
          </div>

          <div className="device-summary">
            <div>
              <span className={`status-pill ${device.isConnected ? 'status-pill-success' : 'status-pill-muted'}`}>
                {device.isConnected ? 'Connected' : 'Disconnected'}
              </span>
              <h3>{device.firmwareVersion}</h3>
              <p>{device.lastEvent}</p>
            </div>
            <dl className="meta-grid">
              <div>
                <dt>Signal</dt>
                <dd>{device.signalStrength}</dd>
              </div>
              <div>
                <dt>Last sync</dt>
                <dd>{formatLastSeen(device.lastSyncAt)}</dd>
              </div>
              <div>
                <dt>Tray state</dt>
                <dd>{device.trayState}</dd>
              </div>
            </dl>
          </div>

          <div className="settings-block">
            <span className="field-caption">Transport</span>
            <div className="transport-grid">
              {transportOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = device.mode === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`transport-button ${isSelected ? 'transport-button-active' : ''}`}
                    onClick={() => onTransportChange(option.value)}
                  >
                    <Icon size={19} aria-hidden="true" />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="button-row">
            <button type="button" className="btn btn-primary" disabled={isConnecting} onClick={onToggleConnection}>
              <PlugZap size={18} aria-hidden="true" />
              <span>
                {isConnecting ? 'Connecting...' : device.isConnected ? 'Disconnect' : 'Connect'}
              </span>
            </button>
            <button type="button" className="btn btn-secondary" disabled={isSyncing} onClick={onSyncNow}>
              <RefreshCw size={18} aria-hidden="true" />
              <span>{isSyncing ? 'Syncing...' : 'Sync now'}</span>
            </button>
          </div>
        </section>

        <div className="side-stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Reminders</p>
                <h2>Automation</h2>
              </div>
              <Bell size={22} aria-hidden="true" />
            </div>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={settings.autoSync}
                onChange={(event) => onAutoSyncChange(event.target.checked)}
              />
              <span>Auto-sync schedules</span>
            </label>

            <dl className="meta-grid single-column">
              <div>
                <dt>Notification access</dt>
                <dd>{settings.notificationAccess}</dd>
              </div>
              <div>
                <dt>Last reminder event</dt>
                <dd>{settings.lastNotificationMessage ?? 'No reminder event yet'}</dd>
              </div>
            </dl>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Reminders</p>
                <h2>Audio reminder</h2>
              </div>
              <FileAudio size={22} aria-hidden="true" />
            </div>

            <div className="audio-upload-card">
              <div className="audio-upload-header">
                <div>
                  <span className="field-caption">Tray notification sound</span>
                  <strong>{settings.audioReminder ? settings.audioReminder.fileName : 'Default tray tone'}</strong>
                </div>
                <label className="btn btn-secondary audio-upload-button">
                  <Upload size={17} aria-hidden="true" />
                  <span>{settings.audioReminder ? 'Replace' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="audio/*,.aac,.flac,.m4a,.mp3,.ogg,.wav"
                    onChange={onUploadAudio}
                  />
                </label>
              </div>

              {settings.audioReminder ? (
                <div className="audio-preview">
                  <div className="audio-file-row">
                    <FileAudio size={20} aria-hidden="true" />
                    <div>
                      <span>{settings.audioReminder.sdCardPath}</span>
                      <small>{Math.round(settings.audioReminder.sizeBytes / 1024)} KB</small>
                    </div>
                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      onClick={onRemoveAudio}
                      aria-label="Remove custom audio reminder"
                    >
                      <X size={17} aria-hidden="true" />
                    </button>
                  </div>
                  <audio controls src={settings.audioReminder.dataUrl}>
                    Your browser does not support audio preview.
                  </audio>
                </div>
              ) : (
                <div className="audio-empty-row">
                  <FileAudio size={20} aria-hidden="true" />
                  <span>Using default tray notification sound.</span>
                </div>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">ESP32 storage</p>
                <h2>SD card status</h2>
              </div>
              <HardDriveUpload size={22} aria-hidden="true" />
            </div>

            <div className="data-summary">
              <FileAudio size={28} aria-hidden="true" />
              <div>
                <h3>{device.sdCardMounted ? 'SD card mounted' : 'SD card not mounted'}</h3>
                <p>Audio reminder will be synced to the tray device.</p>
              </div>
            </div>

            <dl className="meta-grid single-column storage-grid">
              <div>
                <dt>Mount path</dt>
                <dd>{device.sdCardMounted ? device.sdCardPath : 'Connect tray'}</dd>
              </div>
              <div>
                <dt>Synced to SD</dt>
                <dd>{device.audioFilesSynced} files / {formatBytes(device.audioStorageUsedBytes)}</dd>
              </div>
            </dl>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Privacy</p>
                <h2>Local data</h2>
              </div>
              <ShieldCheck size={22} aria-hidden="true" />
            </div>

            <div className="data-summary">
              <Database size={28} aria-hidden="true" />
              <div>
                <h3>Stored in this browser</h3>
                <p>{schedules.length} schedules and {logs.length} logs are saved locally.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
