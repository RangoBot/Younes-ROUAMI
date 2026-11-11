import type { GoogleTask } from './googleTasksApi.ts';
import type { CalendarEvent } from './googleCalendarApi.ts';

export interface NotionPage {
  id: string;
  title: string;
  icon: string;
  coverImage?: string;
  updatedAt: string;
  content: string;
  favorite?: boolean;
}

const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
const todayIso = `${yyyy}-${mm}-${dd}`;

export const initialNotionPages: NotionPage[] = [
  {
    id: 'page_1',
    title: 'Product Strategy & Google Tasks Sync',
    icon: '🚀',
    coverImage: 'https://images.unsplash.com/photo-1507842229451-7f01be8510ab?auto=format&fit=crop&w=1200&q=80',
    updatedAt: 'Just now',
    favorite: true,
    content: `# Product Strategy & NotionPlan Workflow

Welcome to your unified Notion workspace connected with **Google Tasks** and **AI Calendar**.

> 💡 **Tip:** Type \`/\` on an empty line to insert blocks, headings, checklists, or trigger Calendar AI actions!

---

### 🎯 Key Deliverables for This Sprint
- [x] Integrate Google Tasks OAuth and 2-way sync
- [ ] Connect Google Calendar API for real-time schedule alignment
- [ ] Implement smart AI Calendar day planner with Gemini
- [ ] Set up instant phone & desktop browser notification alerts

### 🗓️ Scheduling Guideline
Plan all deep work blocks in the morning between 09:00 and 11:30. Reserve afternoons for review meetings and rapid task execution.

> 🔔 **Phone Alerts:** Turn on phone notifications from the top bar to get pinged 15 minutes before critical tasks and calendar meetings.
`,
  },
  {
    id: 'page_2',
    title: 'Weekly Focus & AI Calendar Blocks',
    icon: '⚡',
    coverImage: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1200&q=80',
    updatedAt: '2 hours ago',
    favorite: true,
    content: `# Weekly Focus Protocol

Use Calendar AI to automatically translate task backlog items into dedicated focus blocks.

### Priority Areas
1. **Core Architecture:** Optimize local sync and in-memory OAuth tokens
2. **AI Day Planner:** Run morning briefings to balance calendar load
3. **Mobile Experience:** Installable PWA feel with audio chimes and native notification banners

---

### Daily Checklist
- [ ] Morning AI schedule generation
- [ ] Review pending Google Tasks
- [ ] Clear open inbox items before 17:00
`,
  },
  {
    id: 'page_3',
    title: 'Meeting Notes: Stakeholder Review',
    icon: '📝',
    coverImage: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80',
    updatedAt: 'Yesterday',
    content: `# Meeting Notes: Quarterly Review

**Attendees:** Product Lead, Eng Team, Design

### Key Discussions
- Need 1-click scheduling directly from Google Tasks into Google Calendar
- Audio notification alerts on phone are essential when away from desk
- Block editor should feel as responsive and distraction-free as Notion

### Action Items
- [ ] Refine AI natural language parser prompt
- [ ] Add sound test button in Notification Center
`,
  },
];

export const initialTasks: GoogleTask[] = [
  {
    id: 'task_demo_1',
    title: 'Review Google Calendar AI day schedule',
    notes: 'Confirm proposed focus blocks and adjust lunch buffer',
    status: 'needsAction',
    due: `${todayIso}T18:00:00.000Z`,
    priority: 'high',
    estimatedMinutes: 25,
  },
  {
    id: 'task_demo_2',
    title: 'Test phone notifications & chime sound',
    notes: 'Verify Web Audio bell and browser notification permissions',
    status: 'needsAction',
    due: `${todayIso}T20:00:00.000Z`,
    priority: 'high',
    estimatedMinutes: 15,
  },
  {
    id: 'task_demo_3',
    title: 'Draft Notion workspace documentation',
    notes: 'Detail slash commands and AI block generation',
    status: 'needsAction',
    due: new Date(Date.now() + 86400000).toISOString(),
    priority: 'medium',
    estimatedMinutes: 45,
  },
  {
    id: 'task_demo_4',
    title: 'Sync quarterly milestones to Google Tasks',
    notes: 'Organized under the Notion Workspace list',
    status: 'completed',
    completed: new Date().toISOString(),
    priority: 'low',
    estimatedMinutes: 30,
  },
];

export const initialCalendarEvents: CalendarEvent[] = [
  {
    id: 'event_demo_1',
    summary: 'Daily Product Standup',
    description: 'Sprint progress check and roadmap review',
    location: 'Google Meet',
    start: {
      dateTime: `${todayIso}T09:30:00Z`,
    },
    end: {
      dateTime: `${todayIso}T10:00:00Z`,
    },
    colorId: '1',
  },
  {
    id: 'event_demo_2',
    summary: 'Deep Work: Core Feature Implementation',
    description: 'Scheduled by Calendar AI for high-priority Google Tasks',
    start: {
      dateTime: `${todayIso}T10:30:00Z`,
    },
    end: {
      dateTime: `${todayIso}T12:00:00Z`,
    },
    colorId: '2',
    isAiScheduled: true,
  },
  {
    id: 'event_demo_3',
    summary: 'Design & Notion UI Polish Review',
    description: 'Review typography, slash menu, and mobile notifications',
    location: 'Conference Room B',
    start: {
      dateTime: `${todayIso}T14:00:00Z`,
    },
    end: {
      dateTime: `${todayIso}T15:00:00Z`,
    },
    colorId: '5',
  },
];
