import React from 'react';
import { Bell, Calendar, CheckSquare, Sparkles, X } from 'lucide-react';
import type { AppNotification } from '../lib/notifications.ts';

interface PhoneNotificationBannerProps {
  notification: AppNotification | null;
  onDismiss: () => void;
  onOpenCenter: () => void;
}

export const PhoneNotificationBanner: React.FC<PhoneNotificationBannerProps> = ({
  notification,
  onDismiss,
  onOpenCenter,
}) => {
  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'calendar':
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'task':
        return <CheckSquare className="w-4 h-4 text-emerald-500" />;
      case 'ai':
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
      {/* Mobile-styled phone alert bubble */}
      <div className="bg-[#1e1e1e]/95 backdrop-blur-md text-white rounded-2xl p-3.5 shadow-2xl border border-white/10 ring-1 ring-black/20">
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10 text-xs text-white/70">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="p-1 rounded bg-white/10">{getIcon()}</span>
            <span className="tracking-wide">NOTIONPLAN • PHONE ALERT</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/50">Just now</span>
            <button
              onClick={onDismiss}
              className="text-white/60 hover:text-white p-0.5 rounded transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="pt-2 cursor-pointer" onClick={onOpenCenter}>
          <h4 className="text-sm font-semibold text-white tracking-tight">
            {notification.title}
          </h4>
          <p className="text-xs text-white/80 mt-1 line-clamp-2 leading-relaxed">
            {notification.body}
          </p>
        </div>

        <div className="mt-2.5 pt-2 flex items-center justify-between border-t border-white/5 text-[11px]">
          <span className="text-white/50 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Phone chime played
          </span>
          <button
            onClick={onOpenCenter}
            className="text-blue-300 hover:text-blue-200 font-medium px-2 py-0.5 rounded bg-white/10 hover:bg-white/15 transition-colors"
          >
            Open in Workspace →
          </button>
        </div>
      </div>
    </div>
  );
};
