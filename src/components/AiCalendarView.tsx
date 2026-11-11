import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  RefreshCw,
  Bell,
  Check,
  Zap
} from 'lucide-react';
import type { CalendarEvent } from '../lib/googleCalendarApi.ts';
import type { GoogleTask } from '../lib/googleTasksApi.ts';
import { fetchDayPlan, fetchParsedNaturalLanguage, type DayPlanResult } from '../lib/aiApi.ts';
import confetti from 'canvas-confetti';
import { playNotificationSound, dispatchNotification } from '../lib/notifications.ts';

interface AiCalendarViewProps {
  events: CalendarEvent[];
  tasks: GoogleTask[];
  isLoading: boolean;
  isGoogleConnected: boolean;
  onConnectGoogle: () => void;
  onRefreshEvents: () => void;
  onCreateEvent: (event: {
    summary: string;
    description?: string;
    location?: string;
    start: { dateTime: string };
    end: { dateTime: string };
    colorId?: string;
    isAiScheduled?: boolean;
  }) => void;
  onRequestDeleteEvent: (event: CalendarEvent) => void;
  onSendPhoneNotification: (title: string, body: string) => void;
}

export const AiCalendarView: React.FC<AiCalendarViewProps> = ({
  events,
  tasks,
  isLoading,
  isGoogleConnected,
  onConnectGoogle,
  onRefreshEvents,
  onCreateEvent,
  onRequestDeleteEvent,
  onSendPhoneNotification,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'day' | 'week' | 'month'>('day');
  const [quickInput, setQuickInput] = useState('');
  const [isParsingNl, setIsParsingNl] = useState(false);
  const [isPlanningDay, setIsPlanningDay] = useState(false);
  const [dayPlan, setDayPlan] = useState<DayPlanResult | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  // New Event Form State
  const [eventSummary, setEventSummary] = useState('');
  const [eventDate, setEventDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [eventStartTime, setEventStartTime] = useState('10:00');
  const [eventEndTime, setEventEndTime] = useState('11:00');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');

  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handlePrevDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() - 1);
    setCurrentDate(next);
  };

  const handleNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Natural Language Event/Task quick add with Gemini
  const handleNaturalLanguageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    setIsParsingNl(true);
    try {
      const parsed = await fetchParsedNaturalLanguage(quickInput.trim(), currentDate.toISOString());
      
      const now = new Date();
      const startIso = parsed.startDateTime || new Date(now.setHours(now.getHours() + 1, 0, 0, 0)).toISOString();
      const endIso = parsed.endDateTime || new Date(new Date(startIso).getTime() + (parsed.estimatedMinutes || 45) * 60000).toISOString();

      onCreateEvent({
        summary: parsed.title,
        description: parsed.description || `Created via Calendar AI: "${quickInput}"`,
        start: { dateTime: startIso },
        end: { dateTime: endIso },
        isAiScheduled: true,
      });

      // Also trigger a phone notification alert
      onSendPhoneNotification(
        `AI Scheduled: ${parsed.title}`,
        `Event added to your Google Calendar for ${new Date(startIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      );

      confetti({ particleCount: 35, spread: 60 });
      setQuickInput('');
    } catch (err: any) {
      console.error('Quick add error:', err);
    } finally {
      setIsParsingNl(false);
    }
  };

  // Calendar AI: Plan My Day
  const handlePlanMyDay = async () => {
    setIsPlanningDay(true);
    try {
      const result = await fetchDayPlan(tasks, events, currentDate.toISOString());
      setDayPlan(result);
      confetti({ particleCount: 45, spread: 70, origin: { y: 0.7 } });
      playNotificationSound('complete');

      onSendPhoneNotification(
        'Calendar AI: Daily Plan Ready',
        result.briefing || 'Your optimized Google Calendar schedule has been crafted.'
      );
    } catch (err: any) {
      console.error('Plan day error:', err);
    } finally {
      setIsPlanningDay(false);
    }
  };

  // Apply AI Recommended Blocks to Google Calendar
  const handleApplyAiBlocks = () => {
    if (!dayPlan?.recommendedBlocks) return;

    dayPlan.recommendedBlocks.forEach(block => {
      onCreateEvent({
        summary: block.title,
        description: `Calendar AI Focus Session • ${block.rationale}`,
        start: { dateTime: block.startTime },
        end: { dateTime: block.endTime },
        colorId: block.category === 'break' ? '8' : '2',
        isAiScheduled: true,
      });
    });

    confetti({ particleCount: 50, spread: 80 });
    onSendPhoneNotification(
      'Calendar Updated',
      `${dayPlan.recommendedBlocks.length} AI focus sessions scheduled on your Google Calendar.`
    );
    setDayPlan(null);
  };

  const handleManualCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventSummary.trim()) return;

    const startDateTime = `${eventDate}T${eventStartTime}:00`;
    const endDateTime = `${eventDate}T${eventEndTime}:00`;

    onCreateEvent({
      summary: eventSummary.trim(),
      description: eventDescription.trim() || undefined,
      location: eventLocation.trim() || undefined,
      start: { dateTime: new Date(startDateTime).toISOString() },
      end: { dateTime: new Date(endDateTime).toISOString() },
      colorId: '1',
    });

    setEventSummary('');
    setEventLocation('');
    setEventDescription('');
    setShowEventModal(false);
  };

  // Filter events for the selected day
  const targetDayStr = currentDate.toISOString().split('T')[0];
  const dayEvents = events.filter(evt => {
    const rawStart = evt.start?.dateTime || evt.start?.date;
    if (!rawStart) return false;
    return rawStart.startsWith(targetDayStr);
  });

  return (
    <div className="flex-1 overflow-y-auto bg-white flex flex-col min-h-screen">
      {/* Top Header */}
      <div className="sticky top-0 z-20 px-8 py-4 bg-white/95 backdrop-blur-md border-b border-[#f0f0ef] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📅</span>
            <h1 className="text-2xl font-bold text-[#2f2f2f] tracking-tight">
              AI Smart Calendar
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Calendar AI Active
            </span>
          </div>
          <p className="text-xs text-[#787774] mt-0.5">
            {isGoogleConnected
              ? 'Synchronized with your Google Calendar • AI schedule optimizer ready'
              : 'Workspace calendar view • Connect Google Calendar for 2-way cloud scheduling'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Day Navigation */}
          <div className="flex items-center bg-[#f4f4f2] p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={handlePrevDay}
              className="p-1 rounded-md text-gray-600 hover:text-black hover:bg-white transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs text-gray-700 hover:text-black font-semibold"
            >
              Today
            </button>
            <button
              onClick={handleNextDay}
              className="p-1 rounded-md text-gray-600 hover:text-black hover:bg-white transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-xs font-semibold text-[#2f2f2f] px-2 py-1 bg-gray-50 rounded-md border border-gray-100">
            {formattedDate}
          </span>

          <button
            onClick={onRefreshEvents}
            disabled={isLoading}
            className="p-2 rounded-lg border border-[#e5e5e4] text-[#4a4a4a] hover:bg-gray-50 transition-colors"
            title="Refresh events"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* AI Plan Day Button */}
          <button
            onClick={handlePlanMyDay}
            disabled={isPlanningDay}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center gap-1.5 shadow-2xs"
          >
            {isPlanningDay ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>Plan My Day with AI</span>
          </button>

          <button
            onClick={() => setShowEventModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#1f1f1f] hover:bg-[#333] transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="max-w-6xl w-full mx-auto px-8 py-6 flex-1 flex flex-col gap-6">
        {/* Natural Language AI Quick Bar */}
        <form
          onSubmit={handleNaturalLanguageSubmit}
          className="relative flex items-center gap-2 p-2 rounded-2xl border border-purple-200/80 bg-gradient-to-r from-purple-50/50 via-white to-blue-50/40 shadow-xs focus-within:ring-2 focus-within:ring-purple-400/30 transition-all"
        >
          <div className="pl-3 text-purple-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={quickInput}
            onChange={e => setQuickInput(e.target.value)}
            placeholder="Type naturally: 'Coffee with Sarah at 2pm tomorrow for 45 mins' or 'Deep work on slides Friday 10am'..."
            className="flex-1 text-xs md:text-sm text-gray-800 bg-transparent border-none outline-hidden placeholder-gray-400 py-1"
          />
          <button
            type="submit"
            disabled={isParsingNl || !quickInput.trim()}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs"
          >
            {isParsingNl ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>AI Scheduling...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Quick Add</span>
              </>
            )}
          </button>
        </form>

        {/* AI Day Plan Proposed Result */}
        {dayPlan && (
          <div className="p-5 rounded-2xl bg-[#faf9fe] border border-purple-200 shadow-sm animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-purple-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-600 text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-purple-950">
                    AI Calendar Master Plan
                  </h3>
                  <p className="text-xs text-purple-700/80">
                    Optimized around your Google Tasks and meeting schedule
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDayPlan(null)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Dismiss
              </button>
            </div>

            <p className="text-xs text-gray-700 mb-4 bg-white p-3.5 rounded-xl border border-purple-100 leading-relaxed font-medium">
              {dayPlan.briefing}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {dayPlan.recommendedBlocks.map((block, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-purple-700 font-semibold mb-1">
                      <span>{block.timeRange}</span>
                      <span className="capitalize px-1.5 py-0.2 rounded bg-purple-50 text-[10px]">
                        {block.category}
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-gray-800 leading-snug">
                      {block.title}
                    </h5>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                      {block.rationale}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {dayPlan.productivityTip && (
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 mb-4 flex items-center gap-2">
                <span className="font-bold">💡 AI Pro-Tip:</span>
                <span>{dayPlan.productivityTip}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDayPlan(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyAiBlocks}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Apply All {dayPlan.recommendedBlocks.length} Blocks to Google Calendar
              </button>
            </div>
          </div>
        )}

        {/* Calendar Timeline & Event Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Timeline / Schedule */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">
                Scheduled Events &amp; AI Focus Slots ({dayEvents.length})
              </h3>
              <span className="text-xs text-gray-400">
                Primary Google Calendar
              </span>
            </div>

            {dayEvents.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-[#e5e5e4] rounded-2xl text-gray-400">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-medium">No events scheduled for this day</p>
                <p className="text-xs text-gray-400 mt-1">
                  Click "+ Add Event" or use the AI Quick Add bar to schedule meetings.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dayEvents.map(evt => {
                  const startTimeStr = evt.start?.dateTime
                    ? new Date(evt.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'All day';
                  const endTimeStr = evt.end?.dateTime
                    ? new Date(evt.end.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <div
                      key={evt.id}
                      className={`group p-4 rounded-xl border transition-all flex items-start gap-4 ${
                        evt.isAiScheduled
                          ? 'bg-[#fcfaff] border-purple-200/80 hover:border-purple-300 shadow-2xs'
                          : 'bg-white border-[#e9e9e7] hover:border-gray-300 hover:shadow-2xs'
                      }`}
                    >
                      {/* Time slot column */}
                      <div className="w-24 shrink-0 text-xs">
                        <div className="font-semibold text-gray-900">{startTimeStr}</div>
                        {endTimeStr && (
                          <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                            to {endTimeStr}
                          </div>
                        )}
                        {evt.isAiScheduled && (
                          <span className="mt-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded">
                            <Sparkles className="w-2.5 h-2.5" />
                            AI Plan
                          </span>
                        )}
                      </div>

                      {/* Event Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 leading-snug">
                          {evt.summary}
                        </h4>
                        {evt.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                            {evt.description}
                          </p>
                        )}
                        {evt.location && (
                          <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-2">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span>{evt.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Event Actions */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            onSendPhoneNotification(
                              `Reminder: ${evt.summary}`,
                              `Event starting soon at ${startTimeStr}.`
                            );
                          }}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Send immediate phone notification reminder"
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onRequestDeleteEvent(evt)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete from Google Calendar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Col: Unscheduled Google Tasks Sidebar */}
          <div className="bg-[#fbfbfa] p-4 rounded-2xl border border-[#e5e5e4] flex flex-col h-fit space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f0ef]">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                Pending Google Tasks
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                {tasks.filter(t => t.status !== 'completed').length}
              </span>
            </div>

            <p className="text-xs text-[#787774] leading-relaxed">
              Drag or click "Schedule" to create a reserved time slot on your Google Calendar.
            </p>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {tasks
                .filter(t => t.status !== 'completed')
                .map(task => (
                  <div
                    key={task.id}
                    className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs hover:shadow-xs transition-shadow"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-semibold text-gray-900 truncate">
                        {task.title}
                      </span>
                      {task.priority && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          task.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {task.priority}
                        </span>
                      )}
                    </div>
                    {task.notes && (
                      <p className="text-[11px] text-gray-500 line-clamp-1">{task.notes}</p>
                    )}
                    <button
                      onClick={() => {
                        const now = new Date();
                        const start = new Date(now.setHours(now.getHours() + 1, 0, 0, 0)).toISOString();
                        const end = new Date(now.getTime() + (task.estimatedMinutes || 30) * 60000).toISOString();
                        onCreateEvent({
                          summary: `Focus: ${task.title}`,
                          description: task.notes || 'Scheduled focus block from Google Tasks',
                          start: { dateTime: start },
                          end: { dateTime: end },
                          isAiScheduled: true,
                        });
                        confetti({ particleCount: 25, spread: 50 });
                        onSendPhoneNotification(
                          `Calendar Block Scheduled`,
                          `Dedicated session for "${task.title}" added to your Google Calendar.`
                        );
                      }}
                      className="mt-2 w-full py-1 text-center text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Schedule on Calendar
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Add Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                Create Google Calendar Event
              </h3>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualCreateEvent} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={eventSummary}
                  onChange={e => setEventSummary(e.target.value)}
                  placeholder="e.g. Design review with engineering"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 focus:outline-hidden focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={e => setEventDate(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Start
                  </label>
                  <input
                    type="time"
                    required
                    value={eventStartTime}
                    onChange={e => setEventStartTime(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    End
                  </label>
                  <input
                    type="time"
                    required
                    value={eventEndTime}
                    onChange={e => setEventEndTime(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Location (optional)
                </label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={e => setEventLocation(e.target.value)}
                  placeholder="e.g. Google Meet or Conference Room 4"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description / Agenda
                </label>
                <textarea
                  value={eventDescription}
                  onChange={e => setEventDescription(e.target.value)}
                  rows={2}
                  placeholder="Meeting agenda, notes or links..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 focus:outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-3.5 py-1.5 text-xs text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
