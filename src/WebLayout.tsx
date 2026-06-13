import React, { useState } from 'react';
import { CalendarClock, History, LayoutDashboard, Menu, Pill, Settings, Wifi, X } from 'lucide-react';

import { DeviceState } from './types';

interface WebLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  device: DeviceState;
  onPageChange: (page: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'schedule', label: 'Schedule', icon: CalendarClock },
  { id: 'history', label: 'History', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const WebLayout: React.FC<WebLayoutProps> = ({
  children,
  currentPage,
  device,
  onPageChange,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const selectPage = (page: string) => {
    onPageChange(page);
    setMobileMenuOpen(false);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Pill size={20} aria-hidden="true" />
          </div>
          <div>
            <p className="brand-name">SmartDose</p>
            <p className="brand-caption">Smart medicine tray</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                onClick={() => selectPage(item.id)}
              >
                <Icon size={19} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="device-card">
          <div className={`status-dot ${device.isConnected ? 'status-dot-online' : ''}`} />
          <div>
            <p className="device-title">{device.isConnected ? 'Tray online' : 'Tray offline'}</p>
            <p className="device-copy">
              {device.mode} / {device.signalStrength}
            </p>
          </div>
          <Wifi size={18} aria-hidden="true" />
        </div>
      </aside>

      <div className="content-shell">
        <header className="mobile-header">
          <div className="brand-lockup">
            <div className="brand-mark">
              <Pill size={19} aria-hidden="true" />
            </div>
            <p className="brand-name">SmartDose</p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={() => setMobileMenuOpen((isOpen) => !isOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {mobileMenuOpen && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                  onClick={() => selectPage(item.id)}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        <main className="page-content">{children}</main>
      </div>
    </div>
  );
};
