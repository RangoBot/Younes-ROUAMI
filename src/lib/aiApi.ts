import type { GoogleTask } from './googleTasksApi.ts';
import type { CalendarEvent } from './googleCalendarApi.ts';

export interface DayPlanResult {
  briefing: string;
  recommendedBlocks: Array<{
    timeRange: string;
    startTime: string;
    endTime: string;
    title: string;
    taskId?: string;
    category: 'focus' | 'meeting' | 'break' | 'review';
    rationale: string;
  }>;
  productivityTip: string;
  alerts: string[];
}

export interface ParsedQuickInput {
  itemType: 'event' | 'task';
  title: string;
  description: string;
  startDateTime: string | null;
  endDateTime: string | null;
  dueDate: string | null;
  priority: 'high' | 'medium' | 'low';
  estimatedMinutes: number;
  notificationMinutesBefore: number;
}

export interface TaskBreakdownResult {
  summary: string;
  subtasks: Array<{
    title: string;
    estimatedMinutes: number;
    tips: string;
  }>;
}

export interface DocumentActionResult {
  action: string;
  summary: string;
  tasks: Array<{
    title: string;
    notes: string;
    priority: 'high' | 'medium' | 'low';
    suggestedDueOffsetDays: number;
  }>;
  suggestedCalendarSlots: Array<{
    title: string;
    durationMinutes: number;
    reason: string;
  }>;
}

export async function fetchDayPlan(
  tasks: GoogleTask[],
  events: CalendarEvent[],
  dateStr: string = new Date().toISOString()
): Promise<DayPlanResult> {
  const res = await fetch('/api/ai/plan-day', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        notes: t.notes,
        due: t.due,
        status: t.status,
        priority: t.priority,
      })),
      events: events.map(e => ({
        id: e.id,
        summary: e.summary,
        start: e.start,
        end: e.end,
        description: e.description,
      })),
      dateStr,
    }),
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Failed to generate day plan');
  }
  return json.data;
}

export async function fetchParsedNaturalLanguage(
  input: string,
  referenceTime: string = new Date().toISOString()
): Promise<ParsedQuickInput> {
  const res = await fetch('/api/ai/parse-nl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, referenceTime }),
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Failed to parse quick input');
  }
  return json.data;
}

export async function fetchTaskBreakdown(
  taskTitle: string,
  taskNotes?: string
): Promise<TaskBreakdownResult> {
  const res = await fetch('/api/ai/breakdown-task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskTitle, taskNotes }),
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Failed to break down task');
  }
  return json.data;
}

export async function fetchDocumentAiAction(
  content: string,
  action: 'extract-tasks' | 'summarize' | 'schedule-plan'
): Promise<DocumentActionResult> {
  const res = await fetch('/api/ai/document-actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, action }),
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Failed to process document');
  }
  return json.data;
}
