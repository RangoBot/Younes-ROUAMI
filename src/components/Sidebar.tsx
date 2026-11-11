import React from 'react';
import {
  FileText,
  Calendar,
  CheckSquare,
  Bell,
  Plus,
  Settings,
  Sparkles,
  Smartphone,
  LogOut,
  ChevronRight,
  Trash2,
  Star,
  Search,
  ExternalLink
} from 'lucide-react';
import type { NotionPage } from '../lib/initialData.ts';
import type { User } from 'firebase/auth';

interface SidebarProps {
  currentTab: 'pages' | 'tasks' | 'calendar';
  onChangeTab: (tab: 'pages' | 'tasks' | 'calendar') => void;
  pages: NotionPage[];
  activePageId: string;
  onSelectPage: (id: string) => void;
  onCreatePage: () => void;
  onDeletePage: (id: string) => void;
  tasksCount: number;
  eventsCount: number;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  user: User | null;
  isGoogleConnected: boolean;
  onSignInWithGoogle: () => void;
  onSignOut: () => void;
  onTestNotification: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onChangeTab,
  pages,
  activePageId,
  onSelectPage,
  onCreatePage,
  onDeletePage,
  tasksCount,
  eventsCount,
  unreadNotificationsCount,
  onOpenNotifications,
  user,
  isGoogleConnected,
  onSignInWithGoogle,
  onSignOut,
  onTestNotification,
}) => {
  return (
    <aside className="w-64 h-screen bg-[#f7f7f5] border-r border-[#e9e9e7] flex flex-col justify-between shrink-0 select-none text-[#37352f] text-xs">
      {/* Top Workspace Identity & Switcher */}
      <div>
        <div className="p-3 border-b border-[#ecece9]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#2f2f2f] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                N
              </div>
              <span className="font-bold text-[#2f2f2f] text-sm tracking-tight">
                NotionPlan
              </span>
            </div>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
              AI + Tasks
            </span>
          </div>

          {/* Connected Google Account pill */}
          {isGoogleConnected && user ? (
            <div className="mt-1 p-2 bg-white rounded-lg border border-[#e5e5e4] shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="avatar"
                    className="w-5 h-5 rounded-full"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {user.email?.charAt(0).toUpperCase() || 'G'}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-gray-800 truncate">
                    {user.displayName || user.email?.split('@')[0]}
                  </div>
                  <div className="text-[9px] text-emerald-600 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Google Synced
                  </div>
                </div>
              </div>
              <button
                onClick={onSignOut}
                className="text-gray-400 hover:text-red-600 p-1 rounded"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="mt-1.5">
              {/* Official Google Sign-in button format */}
              <button
                onClick={onSignInWithGoogle}
                className="w-full flex items-center justify-center gap-2 px-2.5 py-1.5 bg-white hover:bg-gray-50 active:bg-gray-100 border border-[#d3d3d1] rounded-lg shadow-2xs text-[#37352f] text-[11px] font-semibold transition-colors"
              >
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="w-3.5 h-3.5"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  ></path>
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  ></path>
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  ></path>
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  ></path>
                </svg>
                <span>Connect Google Account</span>
              </button>
            </div>
          )}
        </div>

        {/* Primary Workspace Nav Views */}
        <div className="p-2 space-y-0.5">
          <button
            onClick={() => onChangeTab('tasks')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors font-medium ${
              currentTab === 'tasks'
                ? 'bg-[#ecece9] text-[#222]'
                : 'hover:bg-[#efefe9] text-[#555]'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              <span>Google Tasks</span>
            </div>
            {tasksCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-gray-200 text-gray-700">
                {tasksCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onChangeTab('calendar')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors font-medium ${
              currentTab === 'calendar'
                ? 'bg-[#ecece9] text-[#222]'
                : 'hover:bg-[#efefe9] text-[#555]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>AI Smart Calendar</span>
            </div>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" />
              AI
            </span>
          </button>

          <button
            onClick={onOpenNotifications}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#efefe9] text-[#555] transition-colors font-medium"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-amber-600" />
              <span>Phone Alerts</span>
            </div>
            {unreadNotificationsCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-amber-500 text-white">
                {unreadNotificationsCount}
              </span>
            ) : (
              <span className="text-[10px] text-gray-400">Settings</span>
            )}
          </button>
        </div>

        {/* Notion Pages Section */}
        <div className="px-3 pt-3 pb-1 flex items-center justify-between text-[#787774] font-semibold text-[11px] uppercase tracking-wider">
          <span>Notion Docs &amp; Notes</span>
          <button
            onClick={onCreatePage}
            className="p-1 rounded hover:bg-[#ecece9] text-gray-600 hover:text-black transition-colors"
            title="Create new page"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-2 space-y-0.5 max-h-64 overflow-y-auto">
          {pages.map(page => {
            const isActive = currentTab === 'pages' && activePageId === page.id;
            return (
              <div
                key={page.id}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#ecece9] text-[#222] font-semibold'
                    : 'hover:bg-[#efefe9] text-[#555]'
                }`}
                onClick={() => {
                  onChangeTab('pages');
                  onSelectPage(page.id);
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm select-none">{page.icon}</span>
                  <span className="truncate">{page.title || 'Untitled'}</span>
                </div>

                {pages.length > 1 && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onDeletePage(page.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-opacity"
                    title="Delete page"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Footer Action & Phone Test Trigger */}
      <div className="p-3 border-t border-[#ecece9] bg-[#f5f5f3] space-y-2">
        <button
          onClick={onTestNotification}
          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-[#e2e2e0] hover:bg-gray-50 text-[11px] font-semibold text-gray-700 shadow-2xs transition-colors"
        >
          <Bell className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
          <span>Test Phone Chime &amp; Alert</span>
        </button>

        <div className="flex items-center justify-between text-[10px] text-gray-400 px-1 pt-1">
          <span>NotionPlan Workspace</span>
          <span>v2.4 • Gemini 3.8</span>
        </div>
      </div>
    </aside>
  );
};
