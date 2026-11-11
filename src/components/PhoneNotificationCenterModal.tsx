import React from 'react';
import {
  Bell,
  Smartphone,
  Volume2,
  CheckCircle,
  X,
  VolumeX,
  Clock,
  Trash2,
  Calendar,
  CheckSquare,
  Sparkles,
  Play
} from 'lucide-react';
import {
  type AppNotification,
  type NotificationPermissionStatus,
  playNotificationSound,
  requestNotificationPermission,
  dispatchNotification,
} from '../lib/notifications.ts';

interface PhoneNotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onClearNotifications: () => void;
  permissionStatus: NotificationPermissionStatus;
  onPermissionUpdated: (status: NotificationPermissionStatus) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  chimeType: 'gentle' | 'alert' | 'complete';
  onChangeChimeType: (type: 'gentle' | 'alert' | 'complete') => void;
  leadTimeMinutes: number;
  onChangeLeadTime: (minutes: number) => void;
  onTriggerTestNotification: () => void;
}

export const PhoneNotificationCenterModal: React.FC<PhoneNotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onClearNotifications,
  permissionStatus,
  onPermissionUpdated,
  soundEnabled,
  onToggleSound,
  chimeType,
  onChangeChimeType,
  leadTimeMinutes,
  onChangeLeadTime,
  onTriggerTestNotification,
}) => {
  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    onPermissionUpdated(res);
    if (res === 'granted') {
      dispatchNotification(
        'Phone & Desktop Notifications Enabled',
        'NotionPlan will now alert you for Google Calendar events and task deadlines.',
        { type: 'system', soundType: 'complete' }
      );
    }
  };

  const testChime = (type: 'gentle' | 'alert' | 'complete') => {
    playNotificationSound(type);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#e5e5e4] overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#f0f0ef] flex items-center justify-between bg-[#fafafa]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#1f1f1f]">
                Phone &amp; Browser Notifications
              </h3>
              <p className="text-xs text-[#787774]">
                Alerts for Google Tasks, Calendar commitments, and AI briefings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Tabs / Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Permission Status Box */}
          <div className="p-4 rounded-xl border border-[#e5e5e4] bg-[#fbfbfa] flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {permissionStatus === 'granted' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Bell className="w-5 h-5 text-amber-500" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#1f1f1f]">
                    System Push Notifications
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      permissionStatus === 'granted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : permissionStatus === 'denied'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {permissionStatus === 'granted'
                      ? 'Active & Allowed'
                      : permissionStatus === 'denied'
                      ? 'Blocked by Browser'
                      : 'Permission Needed'}
                  </span>
                </div>
                <p className="text-xs text-[#787774] mt-0.5">
                  Allows notifications to pop up on your computer or mobile screen even when NotionPlan is in the background.
                </p>
              </div>
            </div>

            {permissionStatus !== 'granted' && (
              <button
                onClick={handleRequestPermission}
                className="shrink-0 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors"
              >
                Enable Notifications
              </button>
            )}
          </div>

          {/* Quick Actions & Live Test */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Test Phone Alert */}
            <div className="p-4 rounded-xl border border-[#e5e5e4] bg-white shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#787774]">
                  Live Notification Test
                </span>
                <span className="text-[11px] text-emerald-600 font-medium">Ready</span>
              </div>
              <p className="text-xs text-[#555] leading-relaxed">
                Test how the alert chimes and how the mobile banner appears on your device.
              </p>
              <button
                onClick={onTriggerTestNotification}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-[#1f1f1f] bg-[#f0f0ef] hover:bg-[#e6e6e4] active:bg-[#dededb] rounded-lg transition-colors"
              >
                <Smartphone className="w-4 h-4 text-blue-600" />
                Send Test Phone Notification
              </button>
            </div>

            {/* Audio Settings */}
            <div className="p-4 rounded-xl border border-[#e5e5e4] bg-white shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#787774]">
                  Phone Audio &amp; Chime
                </span>
                <button
                  onClick={onToggleSound}
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  {soundEnabled ? (
                    <>
                      <Volume2 className="w-4 h-4" /> Sound On
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4 text-gray-400" /> Sound Muted
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {(['gentle', 'alert', 'complete'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      onChangeChimeType(type);
                      testChime(type);
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                      chimeType === type
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                        : 'bg-[#fafafa] text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Play className="w-3 h-3" />
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500">
                Click a sound style to preview the chime.
              </p>
            </div>
          </div>

          {/* Lead time settings */}
          <div className="p-4 rounded-xl border border-[#e5e5e4] bg-white shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#787774]" />
                <span className="text-sm font-semibold text-[#1f1f1f]">
                  Reminder Lead Time
                </span>
              </div>
              <span className="text-xs text-blue-600 font-semibold">
                {leadTimeMinutes} min before
              </span>
            </div>
            <p className="text-xs text-[#787774] mb-3">
              How early NotionPlan alerts your phone before scheduled Google Calendar events or task deadlines.
            </p>
            <div className="flex items-center gap-2">
              {[5, 10, 15, 30, 60].map(mins => (
                <button
                  key={mins}
                  onClick={() => onChangeLeadTime(mins)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    leadTimeMinutes === mins
                      ? 'bg-[#1f1f1f] text-white'
                      : 'bg-[#f4f4f3] text-[#474747] hover:bg-[#e9e9e8]'
                  }`}
                >
                  {mins} mins
                </button>
              ))}
            </div>
          </div>

          {/* Notification History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#787774]">
                Recent Notifications ({notifications.length})
              </span>
              {notifications.length > 0 && (
                <button
                  onClick={onClearNotifications}
                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-[#e5e5e4] rounded-xl text-gray-400 text-xs">
                No recent notifications. Upcoming task reminders and calendar alerts will appear here.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className="p-3 rounded-xl border border-[#f0f0ef] bg-[#fbfbfa] flex items-start gap-3"
                  >
                    <div className="mt-0.5 p-1.5 rounded-lg bg-white border border-gray-100 shrink-0">
                      {n.type === 'calendar' ? (
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      ) : n.type === 'task' ? (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-[#1f1f1f] truncate">
                          {n.title}
                        </h4>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-[#555] mt-0.5 leading-relaxed">
                        {n.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#fafafa] border-t border-[#f0f0ef] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-white bg-[#1f1f1f] hover:bg-[#333] rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
