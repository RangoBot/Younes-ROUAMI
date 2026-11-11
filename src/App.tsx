/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  setMemoryAccessToken,
} from './lib/firebase.ts';
import {
  getGoogleTasks,
  createGoogleTask,
  updateGoogleTask,
  deleteGoogleTask,
  type GoogleTask,
} from './lib/googleTasksApi.ts';
import {
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  type CalendarEvent,
} from './lib/googleCalendarApi.ts';
import {
  type AppNotification,
  type NotificationPermissionStatus,
  getNotificationPermission,
  dispatchNotification,
  playNotificationSound,
} from './lib/notifications.ts';
import {
  initialNotionPages,
  initialTasks,
  initialCalendarEvents,
  type NotionPage,
} from './lib/initialData.ts';

import { Sidebar } from './components/Sidebar.tsx';
import { NotionEditor } from './components/NotionEditor.tsx';
import { GoogleTasksView } from './components/GoogleTasksView.tsx';
import { AiCalendarView } from './components/AiCalendarView.tsx';
import { PhoneNotificationBanner } from './components/PhoneNotificationBanner.tsx';
import { PhoneNotificationCenterModal } from './components/PhoneNotificationCenterModal.tsx';
import { ConfirmModal } from './components/ConfirmModal.tsx';

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Workspace Nav
  const [currentTab, setCurrentTab] = useState<'pages' | 'tasks' | 'calendar'>('pages');
  const [pages, setPages] = useState<NotionPage[]>(() => {
    const saved = localStorage.getItem('notionplan_pages');
    return saved ? JSON.parse(saved) : initialNotionPages;
  });
  const [activePageId, setActivePageId] = useState<string>(() => pages[0]?.id || 'page_1');

  // Google Tasks State
  const [tasks, setTasks] = useState<GoogleTask[]>(() => {
    const saved = localStorage.getItem('notionplan_tasks');
    return saved ? JSON.parse(saved) : initialTasks;
  });
  const [tasksLoading, setTasksLoading] = useState(false);

  // Google Calendar State
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('notionplan_events');
    return saved ? JSON.parse(saved) : initialCalendarEvents;
  });
  const [eventsLoading, setEventsLoading] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('notionplan_notifications');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeBannerNotification, setActiveBannerNotification] = useState<AppNotification | null>(null);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>('default');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [chimeType, setChimeType] = useState<'gentle' | 'alert' | 'complete'>('gentle');
  const [leadTimeMinutes, setLeadTimeMinutes] = useState(15);

  // Destructive Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Keep track of alerted event/task IDs to avoid repeat pings
  const alertedIdsRef = useRef<Set<string>>(new Set());

  // Save local caches
  useEffect(() => {
    localStorage.setItem('notionplan_pages', JSON.stringify(pages));
  }, [pages]);

  useEffect(() => {
    localStorage.setItem('notionplan_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('notionplan_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('notionplan_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Initialize Auth
  useEffect(() => {
    setPermissionStatus(getNotificationPermission());

    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setMemoryAccessToken(token);
        loadCloudData(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch real Google Tasks and Google Calendar data when authenticated
  const loadCloudData = async (token: string) => {
    setTasksLoading(true);
    setEventsLoading(true);

    try {
      const [fetchedTasks, fetchedEvents] = await Promise.allSettled([
        getGoogleTasks(token),
        getCalendarEvents(token),
      ]);

      if (fetchedTasks.status === 'fulfilled' && fetchedTasks.value.length > 0) {
        setTasks(fetchedTasks.value);
      }

      if (fetchedEvents.status === 'fulfilled' && fetchedEvents.value.length > 0) {
        setEvents(fetchedEvents.value);
      }
    } catch (err) {
      console.warn('Initial cloud fetch notice:', err);
    } finally {
      setTasksLoading(false);
      setEventsLoading(false);
    }
  };

  const handleSignInWithGoogle = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        await loadCloudData(res.accessToken);

        triggerNotification(
          'Google Account Connected',
          `Logged in as ${res.user.email}. Tasks and Calendar are synchronized in real-time.`,
          { type: 'system', soundType: 'complete' }
        );
      }
    } catch (err: any) {
      console.error('Sign-in failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    triggerNotification(
      'Signed Out',
      'Switched back to NotionPlan local workspace mode.',
      { type: 'system', soundType: 'gentle' }
    );
  };

  // Central Notification Dispatcher
  const triggerNotification = (
    title: string,
    body: string,
    options?: {
      type?: 'calendar' | 'task' | 'ai' | 'system';
      playSound?: boolean;
      soundType?: 'gentle' | 'alert' | 'complete';
    }
  ) => {
    const notif = dispatchNotification(title, body, {
      type: options?.type || 'system',
      playSound: soundEnabled ? (options?.playSound ?? true) : false,
      soundType: options?.soundType || chimeType,
    });

    setNotifications(prev => [notif, ...prev.slice(0, 49)]);
    setActiveBannerNotification(notif);

    // Auto-dismiss banner after 6 seconds
    setTimeout(() => {
      setActiveBannerNotification(current => (current?.id === notif.id ? null : current));
    }, 6000);
  };

  // Background ticker for scheduled phone alerts
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const leadMs = leadTimeMinutes * 60 * 1000;

      // 1. Check Upcoming Calendar Events
      events.forEach(evt => {
        const startStr = evt.start?.dateTime;
        if (!startStr) return;
        const startTime = new Date(startStr).getTime();
        const diff = startTime - now.getTime();

        // Alert if event starts within lead time window (e.g. 0 to leadMs) and hasn't been alerted yet
        if (diff > 0 && diff <= leadMs) {
          const alertKey = `evt_${evt.id}_${Math.floor(startTime / 60000)}`;
          if (!alertedIdsRef.current.has(alertKey)) {
            alertedIdsRef.current.add(alertKey);
            const mins = Math.max(1, Math.round(diff / 60000));
            triggerNotification(
              `Upcoming Meeting: ${evt.summary}`,
              `Starts in ${mins} minute${mins > 1 ? 's' : ''}${evt.location ? ` at ${evt.location}` : ''}.`,
              { type: 'calendar', soundType: 'alert' }
            );
          }
        }
      });

      // 2. Check Tasks Due Soon Today
      tasks.forEach(task => {
        if (task.status === 'completed' || !task.due) return;
        const dueTime = new Date(task.due).getTime();
        const diff = dueTime - now.getTime();

        if (diff > 0 && diff <= leadMs * 2) {
          const alertKey = `task_${task.id}_${Math.floor(dueTime / 60000)}`;
          if (!alertedIdsRef.current.has(alertKey)) {
            alertedIdsRef.current.add(alertKey);
            triggerNotification(
              `Task Due Soon: ${task.title}`,
              `Deadline approaching today. Keep up the momentum!`,
              { type: 'task', soundType: 'gentle' }
            );
          }
        }
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [events, tasks, leadTimeMinutes, soundEnabled, chimeType]);

  // Tasks Handlers
  const handleToggleTaskComplete = async (task: GoogleTask) => {
    const nextStatus = task.status === 'completed' ? 'needsAction' : 'completed';

    // Optimistic update
    setTasks(prev =>
      prev.map(t => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    if (nextStatus === 'completed') {
      playNotificationSound('complete');
    }

    if (accessToken) {
      try {
        await updateGoogleTask(accessToken, task.taskListId || '@default', task.id, {
          status: nextStatus,
        });
      } catch (err) {
        console.error('Failed to sync task status:', err);
      }
    }
  };

  const handleAddTask = async (newTask: {
    title: string;
    notes?: string;
    due?: string;
    priority?: 'high' | 'medium' | 'low';
    estimatedMinutes?: number;
  }) => {
    const tempId = 'task_' + Date.now();
    const created: GoogleTask = {
      id: tempId,
      title: newTask.title,
      notes: newTask.notes,
      due: newTask.due,
      status: 'needsAction',
      priority: newTask.priority || 'medium',
      estimatedMinutes: newTask.estimatedMinutes || 30,
    };

    setTasks(prev => [created, ...prev]);

    if (accessToken) {
      try {
        const real = await createGoogleTask(accessToken, '@default', {
          title: newTask.title,
          notes: newTask.notes,
          due: newTask.due,
        });
        setTasks(prev => prev.map(t => (t.id === tempId ? { ...real, priority: newTask.priority } : t)));
      } catch (err) {
        console.error('Failed to create task on Google Tasks:', err);
      }
    }

    triggerNotification(
      'Task Added',
      `"${newTask.title}" added to your Google Tasks list.`,
      { type: 'task', soundType: 'gentle' }
    );
  };

  const handleRequestDeleteTask = (task: GoogleTask) => {
    // MANDATORY explicit user confirmation dialog
    setConfirmModal({
      isOpen: true,
      title: 'Delete Google Task?',
      message: `Are you sure you want to permanently delete "${task.title}"? This will remove it from your Google Tasks and workspace.`,
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        // Remove locally
        setTasks(prev => prev.filter(t => t.id !== task.id));

        if (accessToken) {
          try {
            await deleteGoogleTask(accessToken, task.taskListId || '@default', task.id);
          } catch (err) {
            console.error('Failed to delete Google task:', err);
          }
        }

        triggerNotification('Task Deleted', `"${task.title}" was removed.`, {
          type: 'task',
          playSound: false,
        });
      },
    });
  };

  // Calendar Event Handlers
  const handleCreateEvent = async (newEvent: {
    summary: string;
    description?: string;
    location?: string;
    start: { dateTime: string };
    end: { dateTime: string };
    colorId?: string;
    isAiScheduled?: boolean;
  }) => {
    const tempId = 'event_' + Date.now();
    const created: CalendarEvent = {
      id: tempId,
      summary: newEvent.summary,
      description: newEvent.description,
      location: newEvent.location,
      start: newEvent.start,
      end: newEvent.end,
      colorId: newEvent.colorId || '1',
      isAiScheduled: newEvent.isAiScheduled,
    };

    setEvents(prev => [created, ...prev]);

    if (accessToken) {
      try {
        const real = await createCalendarEvent(accessToken, newEvent);
        setEvents(prev => prev.map(e => (e.id === tempId ? { ...real, isAiScheduled: newEvent.isAiScheduled } : e)));
      } catch (err) {
        console.error('Failed to create Google Calendar event:', err);
      }
    }

    triggerNotification(
      'Event Scheduled',
      `"${newEvent.summary}" added to Google Calendar.`,
      { type: 'calendar', soundType: 'gentle' }
    );
  };

  const handleRequestDeleteEvent = (event: CalendarEvent) => {
    // MANDATORY explicit user confirmation dialog
    setConfirmModal({
      isOpen: true,
      title: 'Delete Calendar Event?',
      message: `Are you sure you want to delete "${event.summary}" from your Google Calendar?`,
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setEvents(prev => prev.filter(e => e.id !== event.id));

        if (accessToken) {
          try {
            await deleteCalendarEvent(accessToken, event.id);
          } catch (err) {
            console.error('Failed to delete Google calendar event:', err);
          }
        }

        triggerNotification('Event Deleted', `"${event.summary}" was removed from your calendar.`, {
          type: 'calendar',
          playSound: false,
        });
      },
    });
  };

  // Schedule task directly to Google Calendar
  const handleScheduleTaskToCalendar = (task: GoogleTask, durationMinutes: number = 30) => {
    const now = new Date();
    // Default to the next clean top of hour
    const start = new Date(now);
    start.setHours(start.getHours() + 1, 0, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60000);

    handleCreateEvent({
      summary: `Focus: ${task.title}`,
      description: `Dedicated focus time scheduled from Google Tasks.\n${task.notes || ''}`,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      colorId: '2',
      isAiScheduled: true,
    });
  };

  // Notion Page Management
  const handleCreatePage = () => {
    const newPage: NotionPage = {
      id: 'page_' + Date.now(),
      title: 'Untitled Document',
      icon: '📝',
      updatedAt: 'Just now',
      content: '# Untitled Document\n\nType `/` to insert blocks, to-dos, or trigger Calendar AI.\n\n- [ ] First action item\n',
    };
    setPages(prev => [newPage, ...prev]);
    setActivePageId(newPage.id);
    setCurrentTab('pages');
  };

  const handleDeletePage = (pageId: string) => {
    const pageToDelete = pages.find(p => p.id === pageId);
    setConfirmModal({
      isOpen: true,
      title: 'Delete Notion Page?',
      message: `Are you sure you want to delete "${pageToDelete?.title || 'this page'}"? This cannot be undone.`,
      isDestructive: true,
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        const updated = pages.filter(p => p.id !== pageId);
        setPages(updated);
        if (activePageId === pageId && updated.length > 0) {
          setActivePageId(updated[0].id);
        }
      },
    });
  };

  const activePage = pages.find(p => p.id === activePageId) || pages[0];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-[#37352f] font-sans antialiased">
      {/* Phone Notification Banner (Floating alert top-right) */}
      <PhoneNotificationBanner
        notification={activeBannerNotification}
        onDismiss={() => setActiveBannerNotification(null)}
        onOpenCenter={() => setIsNotificationCenterOpen(true)}
      />

      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        pages={pages}
        activePageId={activePageId}
        onSelectPage={setActivePageId}
        onCreatePage={handleCreatePage}
        onDeletePage={handleDeletePage}
        tasksCount={tasks.filter(t => t.status !== 'completed').length}
        eventsCount={events.length}
        unreadNotificationsCount={notifications.filter(n => !n.read).length}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        user={user}
        isGoogleConnected={!!accessToken}
        onSignInWithGoogle={handleSignInWithGoogle}
        onSignOut={handleSignOut}
        onTestNotification={() => {
          triggerNotification(
            'Test Phone Notification 🔔',
            'Your phone notifications and Web Audio chime are working perfectly!',
            { type: 'system', soundType: chimeType }
          );
        }}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {currentTab === 'pages' && activePage && (
          <NotionEditor
            page={activePage}
            onUpdatePage={updated => {
              setPages(prev => prev.map(p => (p.id === updated.id ? updated : p)));
            }}
            onAddGoogleTasks={newTasks => {
              newTasks.forEach(t => handleAddTask(t));
            }}
            onAddCalendarEvents={newEvents => {
              newEvents.forEach(e => {
                const now = new Date();
                const start = new Date(now.setHours(now.getHours() + 1, 0, 0, 0)).toISOString();
                const end = new Date(now.getTime() + (e.durationMinutes || 60) * 60000).toISOString();
                handleCreateEvent({
                  summary: e.summary,
                  description: e.description,
                  start: { dateTime: start },
                  end: { dateTime: end },
                  isAiScheduled: true,
                });
              });
            }}
            isGoogleConnected={!!accessToken}
            onConnectGoogle={handleSignInWithGoogle}
          />
        )}

        {currentTab === 'tasks' && (
          <GoogleTasksView
            tasks={tasks}
            isLoading={tasksLoading}
            isGoogleConnected={!!accessToken}
            onConnectGoogle={handleSignInWithGoogle}
            onRefreshTasks={() => {
              if (accessToken) loadCloudData(accessToken);
            }}
            onToggleComplete={handleToggleTaskComplete}
            onAddTask={handleAddTask}
            onRequestDeleteTask={handleRequestDeleteTask}
            onScheduleTaskToCalendar={handleScheduleTaskToCalendar}
          />
        )}

        {currentTab === 'calendar' && (
          <AiCalendarView
            events={events}
            tasks={tasks}
            isLoading={eventsLoading}
            isGoogleConnected={!!accessToken}
            onConnectGoogle={handleSignInWithGoogle}
            onRefreshEvents={() => {
              if (accessToken) loadCloudData(accessToken);
            }}
            onCreateEvent={handleCreateEvent}
            onRequestDeleteEvent={handleRequestDeleteEvent}
            onSendPhoneNotification={(title, body) => {
              triggerNotification(title, body, { type: 'calendar' });
            }}
          />
        )}
      </main>

      {/* Phone Notification Center Modal */}
      <PhoneNotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={notifications}
        onClearNotifications={() => setNotifications([])}
        permissionStatus={permissionStatus}
        onPermissionUpdated={setPermissionStatus}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        chimeType={chimeType}
        onChangeChimeType={setChimeType}
        leadTimeMinutes={leadTimeMinutes}
        onChangeLeadTime={setLeadTimeMinutes}
        onTriggerTestNotification={() => {
          triggerNotification(
            'Phone Alert Test: Team Standup in 15m',
            'Your calendar alarm and mobile chime are operational.',
            { type: 'calendar', soundType: chimeType }
          );
        }}
      />

      {/* Destructive Operation Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive ?? true}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
