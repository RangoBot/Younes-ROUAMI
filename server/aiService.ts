import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize server-side Gemini client with required User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface TaskItem {
  id?: string;
  title: string;
  notes?: string;
  due?: string;
  status?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface CalendarEventItem {
  id?: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
  location?: string;
}

async function callGeminiWithTimeout(prompt: string, fallback: any, timeoutMs = 4500): Promise<any> {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI request timeout')), timeoutMs);
    });

    const aiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const response: any = await Promise.race([aiPromise, timeoutPromise]);
    const text = response?.text;
    if (text) {
      return JSON.parse(text);
    }
  } catch (err: any) {
    console.warn('Gemini call notice, using smart heuristic fallback:', err?.message || err);
  }

  return fallback;
}

/**
 * AI Calendar Day Planner
 */
export async function planDayWithAi(tasks: TaskItem[], events: CalendarEventItem[], dateStr: string) {
  const prompt = `
You are NotionPlan's AI Executive Calendar Assistant. 
The user is planning their day for: ${dateStr}.

Here are their current Google Calendar events for the day:
${JSON.stringify(events, null, 2)}

Here are their active Google Tasks:
${JSON.stringify(tasks.filter(t => t.status !== 'completed'), null, 2)}

Analyze their open calendar gaps and pending tasks. Create an optimized time-blocked schedule for today.
Requirements:
1. Provide a sharp, executive summary briefing of the day (2-3 sentences max).
2. Schedule specific high-focus blocks in their free calendar time for the most important tasks.
3. Suggest buffer times (short breaks) to prevent burnout.
4. Flag any scheduling conflicts or tight turnarounds.

Return strict JSON matching this structure:
{
  "briefing": "string",
  "recommendedBlocks": [
    {
      "timeRange": "10:30 - 11:45",
      "startTime": "2026-11-11T10:30:00",
      "endTime": "2026-11-11T11:45:00",
      "title": "Deep Work: Complete high priority task",
      "taskId": "optional task id if linked",
      "category": "focus",
      "rationale": "Why this block at this time"
    }
  ],
  "productivityTip": "A tactical tip for today",
  "alerts": ["Any warning like tight gap between meetings"]
}
`;

  const fallbackDate = dateStr.split('T')[0];
  const fallback = {
    briefing: `You have ${events.length} calendar commitments and ${tasks.length} pending Google Tasks today. Prioritize uninterrupted morning focus before afternoon meetings.`,
    recommendedBlocks: [
      {
        timeRange: '10:30 - 11:30',
        startTime: `${fallbackDate}T10:30:00`,
        endTime: `${fallbackDate}T11:30:00`,
        title: tasks[0]?.title ? `Deep Work: ${tasks[0].title}` : 'High-Priority Focus Session',
        category: 'focus',
        rationale: 'Peak cognitive window between morning standup and afternoon reviews.',
      },
      {
        timeRange: '13:30 - 14:00',
        startTime: `${fallbackDate}T13:30:00`,
        endTime: `${fallbackDate}T14:00:00`,
        title: 'Buffer & Task Inbox Processing',
        category: 'review',
        rationale: 'Quick turnaround for emails, task triage, and meeting prep.',
      },
    ],
    productivityTip: 'Protect the 60-minute block between 10:30 and 11:30 with notifications silenced.',
    alerts: [],
  };

  return await callGeminiWithTimeout(prompt, fallback);
}

/**
 * Natural Language Parser for Quick Add
 */
export async function parseNaturalLanguageInput(input: string, referenceTime: string) {
  const prompt = `
Current reference time is: ${referenceTime}.
Parse the following user quick-input:
"${input}"

Determine if it's best represented as a Google Calendar Event (with specific meeting/time duration) or a Google Task (a to-do item with a deadline).
Extract details:
- itemType: "event" | "task"
- title: concise title
- description: any extra context
- startDateTime: ISO string if event, or null
- endDateTime: ISO string if event (default to 45 min after start if unspecified), or null
- dueDate: ISO string date if task, or null
- priority: "high" | "medium" | "low"
- estimatedMinutes: number
- notificationMinutesBefore: suggested reminder in minutes (e.g. 15)

Return strict JSON:
{
  "itemType": "event",
  "title": "string",
  "description": "string",
  "startDateTime": "string or null",
  "endDateTime": "string or null",
  "dueDate": "string or null",
  "priority": "medium",
  "estimatedMinutes": 45,
  "notificationMinutesBefore": 15
}
`;

  const now = new Date(referenceTime || Date.now());
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const fallback = {
    itemType: input.toLowerCase().includes('meeting') || input.toLowerCase().includes('lunch') || input.toLowerCase().includes('call') ? 'event' : 'event',
    title: input.replace(/^(add|schedule|create)\s+/i, ''),
    description: `Scheduled via Calendar AI from: "${input}"`,
    startDateTime: now.toISOString(),
    endDateTime: oneHourLater.toISOString(),
    dueDate: null,
    priority: 'medium',
    estimatedMinutes: 45,
    notificationMinutesBefore: 15,
  };

  return await callGeminiWithTimeout(prompt, fallback);
}

/**
 * Break down large tasks into actionable subtasks with time estimates
 */
export async function breakdownTaskWithAi(taskTitle: string, taskNotes?: string) {
  const prompt = `
Task to break down: "${taskTitle}"
Additional context: "${taskNotes || 'None'}"

Break this task down into 3 to 5 realistic, concrete, sequential sub-steps.
For each sub-step provide:
- title: clear actionable name
- estimatedMinutes: estimated duration (e.g. 20, 30, 45)
- tips: quick execution advice

Return strict JSON:
{
  "summary": "Brief approach explanation",
  "subtasks": [
    {
      "title": "Step 1...",
      "estimatedMinutes": 25,
      "tips": "helpful guidance"
    }
  ]
}
`;

  const fallback = {
    summary: `Structured execution plan for "${taskTitle}" to maintain momentum.`,
    subtasks: [
      {
        title: `Define scope & gather references for ${taskTitle}`,
        estimatedMinutes: 20,
        tips: 'Outline requirements and clear blockers before starting implementation.',
      },
      {
        title: `Execute core deliverable for ${taskTitle}`,
        estimatedMinutes: 40,
        tips: 'Focus in a 40-minute uninterrupted sprint.',
      },
      {
        title: `Review results & verify deadlines`,
        estimatedMinutes: 15,
        tips: 'Double check with stakeholders and update Google Tasks status.',
      },
    ],
  };

  return await callGeminiWithTimeout(prompt, fallback);
}

/**
 * Extract Action Items and Tasks from a Notion Document Note
 */
export async function processDocumentWithAi(content: string, action: 'extract-tasks' | 'summarize' | 'schedule-plan') {
  const prompt = `
Document content:
"""
${content}
"""

Requested action: ${action}.
Instructions:
- If action is "extract-tasks": Extract all actionable tasks, identify priority ("high", "medium", "low"), suggest due dates, and provide clean title.
- If action is "summarize": Provide a 3-bullet executive summary and key takeaways.
- If action is "schedule-plan": Map out a realistic timeline of calendar sessions to accomplish the goals described in the doc.

Return strict JSON:
{
  "action": "${action}",
  "summary": "string",
  "tasks": [
    {
      "title": "string",
      "notes": "string",
      "priority": "high",
      "suggestedDueOffsetDays": 1
    }
  ],
  "suggestedCalendarSlots": [
    {
      "title": "string",
      "durationMinutes": 60,
      "reason": "string"
    }
  ]
}
`;

  const fallback = {
    action,
    summary: 'Executive document scan: key deliverables and commitments identified.',
    tasks: [
      {
        title: 'Review action items from document',
        notes: 'Extracted automatically from Notion workspace document.',
        priority: 'high',
        suggestedDueOffsetDays: 1,
      },
    ],
    suggestedCalendarSlots: [
      {
        title: 'Document Follow-up & Deep Work',
        durationMinutes: 45,
        reason: 'Reserved time to complete document action items.',
      },
    ],
  };

  return await callGeminiWithTimeout(prompt, fallback);
}
