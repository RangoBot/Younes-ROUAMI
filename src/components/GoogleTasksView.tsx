import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  RefreshCw,
  Clock,
  Filter,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  List,
  Columns,
  Loader2,
  ArrowRight
} from 'lucide-react';
import type { GoogleTask } from '../lib/googleTasksApi.ts';
import { fetchTaskBreakdown } from '../lib/aiApi.ts';
import confetti from 'canvas-confetti';
import { playNotificationSound } from '../lib/notifications.ts';

interface GoogleTasksViewProps {
  tasks: GoogleTask[];
  isLoading: boolean;
  isGoogleConnected: boolean;
  onConnectGoogle: () => void;
  onRefreshTasks: () => void;
  onToggleComplete: (task: GoogleTask) => void;
  onAddTask: (task: { title: string; notes?: string; due?: string; priority?: 'high' | 'medium' | 'low'; estimatedMinutes?: number }) => void;
  onRequestDeleteTask: (task: GoogleTask) => void;
  onScheduleTaskToCalendar: (task: GoogleTask, durationMinutes?: number) => void;
}

export const GoogleTasksView: React.FC<GoogleTasksViewProps> = ({
  tasks,
  isLoading,
  isGoogleConnected,
  onConnectGoogle,
  onRefreshTasks,
  onToggleComplete,
  onAddTask,
  onRequestDeleteTask,
  onScheduleTaskToCalendar,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'high'>('all');
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newDue, setNewDue] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [isAddingOpen, setIsAddingOpen] = useState(false);
  const [breakdownLoadingId, setBreakdownLoadingId] = useState<string | null>(null);
  const [activeBreakdown, setActiveBreakdown] = useState<{ taskId: string; summary: string; subtasks: any[] } | null>(null);

  const filteredTasks = tasks.filter(task => {
    if (filter === 'pending') return task.status !== 'completed';
    if (filter === 'completed') return task.status === 'completed';
    if (filter === 'high') return task.priority === 'high' && task.status !== 'completed';
    return true;
  });

  const pendingCount = tasks.filter(t => t.status !== 'completed').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddTask({
      title: newTitle.trim(),
      notes: newNotes.trim() || undefined,
      due: newDue ? new Date(newDue).toISOString() : undefined,
      priority: newPriority,
      estimatedMinutes: 30,
    });

    setNewTitle('');
    setNewNotes('');
    setNewDue('');
    setIsAddingOpen(false);
    playNotificationSound('gentle');
  };

  const handleBreakdown = async (task: GoogleTask) => {
    setBreakdownLoadingId(task.id);
    setActiveBreakdown(null);
    try {
      const res = await fetchTaskBreakdown(task.title, task.notes);
      setActiveBreakdown({
        taskId: task.id,
        summary: res.summary,
        subtasks: res.subtasks,
      });
    } catch (err) {
      console.error('Task breakdown error:', err);
    } finally {
      setBreakdownLoadingId(null);
    }
  };

  const handleAddSubtasksAsNew = (subtasks: any[]) => {
    subtasks.forEach(st => {
      onAddTask({
        title: st.title,
        notes: `Subtask guidance: ${st.tips}`,
        priority: 'medium',
        estimatedMinutes: st.estimatedMinutes || 25,
      });
    });
    setActiveBreakdown(null);
    confetti({ particleCount: 30, spread: 50 });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white flex flex-col min-h-screen">
      {/* Top Header */}
      <div className="sticky top-0 z-20 px-8 py-4 bg-white/95 backdrop-blur-md border-b border-[#f0f0ef] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">✅</span>
            <h1 className="text-2xl font-bold text-[#2f2f2f] tracking-tight">
              Google Tasks
            </h1>
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
              {pendingCount} remaining
            </span>
          </div>
          <p className="text-xs text-[#787774] mt-0.5">
            {isGoogleConnected
              ? 'Real-time 2-way sync enabled with your Google Account'
              : 'Workspace local storage active • Connect Google Tasks for cloud sync'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center bg-[#f4f4f2] p-1 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md flex items-center gap-1 font-medium transition-all ${
                viewMode === 'list' ? 'bg-white shadow-2xs text-[#2f2f2f]' : 'text-[#787774] hover:text-[#2f2f2f]'
              }`}
              title="List view"
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-md flex items-center gap-1 font-medium transition-all ${
                viewMode === 'board' ? 'bg-white shadow-2xs text-[#2f2f2f]' : 'text-[#787774] hover:text-[#2f2f2f]'
              }`}
              title="Kanban Board view"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
          </div>

          <button
            onClick={onRefreshTasks}
            disabled={isLoading}
            className="p-2 rounded-lg border border-[#e5e5e4] text-[#4a4a4a] hover:bg-gray-50 transition-colors"
            title="Refresh tasks"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {!isGoogleConnected ? (
            <button
              onClick={onConnectGoogle}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <span>Connect Google Tasks</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Google Synced
            </div>
          )}

          <button
            onClick={() => setIsAddingOpen(!isAddingOpen)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#1f1f1f] hover:bg-[#333] transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl w-full mx-auto px-8 py-6 flex-1 flex flex-col">
        {/* Quick Add Form */}
        {isAddingOpen && (
          <form
            onSubmit={handleCreateTask}
            className="mb-6 p-4 rounded-xl border border-[#e5e5e4] bg-[#fbfbfa] shadow-2xs animate-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#f0f0ef]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#787774]">
                Create Task
              </span>
              <button
                type="button"
                onClick={() => setIsAddingOpen(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>

            <input
              type="text"
              required
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="What needs to get done? (e.g. Prepare deck for team sync)"
              className="w-full text-sm font-medium px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-hidden focus:border-blue-500 mb-3"
              autoFocus
            />

            <textarea
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
              placeholder="Add details, notes, links or context..."
              rows={2}
              className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-hidden focus:border-blue-500 mb-3 resize-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <input
                    type="date"
                    value={newDue}
                    onChange={e => setNewDue(e.target.value)}
                    className="text-xs px-2 py-1 rounded border border-gray-200 bg-white"
                  />
                </div>

                <div className="flex items-center gap-1">
                  {(['high', 'medium', 'low'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewPriority(p)}
                      className={`px-2 py-0.5 text-[11px] rounded uppercase font-semibold transition-colors ${
                        newPriority === p
                          ? p === 'high'
                            ? 'bg-red-500 text-white'
                            : p === 'medium'
                            ? 'bg-amber-500 text-white'
                            : 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-2xs"
              >
                Add to Google Tasks
              </button>
            </div>
          </form>
        )}

        {/* AI Task Breakdown Modal Overlay or Card */}
        {activeBreakdown && (
          <div className="mb-6 p-4 rounded-xl bg-purple-50 border border-purple-200 shadow-sm animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-purple-100 mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold text-purple-900">
                  AI Task Breakdown
                </span>
              </div>
              <button
                onClick={() => setActiveBreakdown(null)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-purple-800 mb-3">{activeBreakdown.summary}</p>

            <div className="space-y-2 mb-3">
              {activeBreakdown.subtasks.map((st, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg bg-white border border-purple-100 flex items-start justify-between gap-3 text-xs"
                >
                  <div>
                    <h5 className="font-semibold text-gray-800">{st.title}</h5>
                    <p className="text-[11px] text-gray-500 mt-0.5">{st.tips}</p>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-medium text-[10px]">
                    ~{st.estimatedMinutes} min
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => handleAddSubtasksAsNew(activeBreakdown.subtasks)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors"
              >
                Convert All into Google Tasks
              </button>
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mb-4 text-xs">
          <Filter className="w-3.5 h-3.5 text-gray-400 mr-1" />
          {(
            [
              { key: 'all', label: `All (${tasks.length})` },
              { key: 'pending', label: `To Do (${pendingCount})` },
              { key: 'high', label: 'High Priority' },
              { key: 'completed', label: `Done (${completedCount})` },
            ] as const
          ).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1 rounded-full font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-[#1f1f1f] text-white shadow-2xs'
                  : 'bg-[#f4f4f2] text-gray-600 hover:bg-[#e9e9e7]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List View */}
        {viewMode === 'list' && (
          <div className="space-y-2">
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-[#e5e5e4] rounded-2xl text-gray-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-medium">No tasks found for this view</p>
                <p className="text-xs text-gray-400 mt-1">
                  Click "+ New Task" above to add an item to Google Tasks.
                </p>
              </div>
            ) : (
              filteredTasks.map(task => {
                const isCompleted = task.status === 'completed';
                const isBreakdownLoading = breakdownLoadingId === task.id;

                return (
                  <div
                    key={task.id}
                    className={`group p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
                      isCompleted
                        ? 'bg-[#fafafa] border-[#f0f0ef] opacity-60'
                        : 'bg-white border-[#e9e9e7] hover:border-gray-400/70 hover:shadow-2xs'
                    }`}
                  >
                    <button
                      onClick={() => onToggleComplete(task)}
                      className="mt-0.5 text-gray-400 hover:text-blue-600 transition-colors"
                      title={isCompleted ? 'Mark incomplete' : 'Mark completed'}
                    >
                      {isCompleted ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium leading-snug ${
                            isCompleted ? 'line-through text-gray-400' : 'text-[#2f2f2f]'
                          }`}
                        >
                          {task.title}
                        </span>

                        {task.priority && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                              task.priority === 'high'
                                ? 'bg-red-50 text-red-600'
                                : task.priority === 'medium'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-blue-50 text-blue-600'
                            }`}
                          >
                            {task.priority}
                          </span>
                        )}
                      </div>

                      {task.notes && (
                        <p className="text-xs text-[#666] mt-1 line-clamp-2 leading-relaxed">
                          {task.notes}
                        </p>
                      )}

                      <div className="mt-2 flex items-center gap-3 text-[11px] text-[#787774]">
                        {task.due && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            Due {new Date(task.due).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                        {task.estimatedMinutes && (
                          <span>~{task.estimatedMinutes} mins</span>
                        )}
                      </div>
                    </div>

                    {/* Task Action Bar */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      {/* AI Task Breakdown */}
                      <button
                        onClick={() => handleBreakdown(task)}
                        disabled={isBreakdownLoading}
                        className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
                        title="AI Breakdown into subtasks"
                      >
                        {isBreakdownLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </button>

                      {/* Schedule on Calendar */}
                      <button
                        onClick={() => onScheduleTaskToCalendar(task, task.estimatedMinutes || 30)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Schedule dedicated focus block in Google Calendar"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>

                      {/* Delete Task */}
                      <button
                        onClick={() => onRequestDeleteTask(task)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete task from Google Tasks"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Board View (Kanban) */}
        {viewMode === 'board' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Column 1: Backlog / To Do */}
            <div className="bg-[#fbfbfa] p-3.5 rounded-2xl border border-[#e5e5e4]">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  To Do
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                  {tasks.filter(t => t.status !== 'completed' && t.priority !== 'high').length}
                </span>
              </div>
              <div className="space-y-2.5">
                {tasks
                  .filter(t => t.status !== 'completed' && t.priority !== 'high')
                  .map(task => (
                    <div
                      key={task.id}
                      className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs hover:shadow-xs transition-shadow"
                    >
                      <h4 className="text-xs font-semibold text-gray-800">{task.title}</h4>
                      {task.notes && (
                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{task.notes}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-100 text-[11px]">
                        <button
                          onClick={() => onToggleComplete(task)}
                          className="text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          Complete →
                        </button>
                        <button
                          onClick={() => onScheduleTaskToCalendar(task)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Column 2: High Priority / In Progress */}
            <div className="bg-[#fbfbfa] p-3.5 rounded-2xl border border-[#e5e5e4]">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                  High Priority
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  {tasks.filter(t => t.status !== 'completed' && t.priority === 'high').length}
                </span>
              </div>
              <div className="space-y-2.5">
                {tasks
                  .filter(t => t.status !== 'completed' && t.priority === 'high')
                  .map(task => (
                    <div
                      key={task.id}
                      className="p-3 bg-white rounded-xl border border-red-200 shadow-2xs hover:shadow-xs transition-shadow ring-1 ring-red-100"
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-50 text-red-600 font-bold uppercase">
                          Urgent
                        </span>
                        <span className="text-[10px] text-gray-400">~{task.estimatedMinutes || 25}m</span>
                      </div>
                      <h4 className="text-xs font-semibold text-gray-800">{task.title}</h4>
                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-100 text-[11px]">
                        <button
                          onClick={() => onScheduleTaskToCalendar(task)}
                          className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          <Calendar className="w-3 h-3" />
                          Block time
                        </button>
                        <button
                          onClick={() => onToggleComplete(task)}
                          className="text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          Mark Done
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Column 3: Completed */}
            <div className="bg-[#fbfbfa] p-3.5 rounded-2xl border border-[#e5e5e4]">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                  Completed
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  {completedCount}
                </span>
              </div>
              <div className="space-y-2.5">
                {tasks
                  .filter(t => t.status === 'completed')
                  .map(task => (
                    <div
                      key={task.id}
                      className="p-3 bg-white/70 rounded-xl border border-gray-200 opacity-70"
                    >
                      <h4 className="text-xs font-semibold text-gray-500 line-through">
                        {task.title}
                      </h4>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                        <span>Done</span>
                        <button
                          onClick={() => onRequestDeleteTask(task)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
