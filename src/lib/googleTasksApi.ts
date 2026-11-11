export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
}

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string; // RFC 3339 timestamp (e.g. "2026-11-12T00:00:00.000Z")
  completed?: string;
  updated?: string;
  parent?: string;
  position?: string;
  taskListId?: string;
  // Local/UI enhancements
  priority?: 'high' | 'medium' | 'low';
  tags?: string[];
  estimatedMinutes?: number;
}

/**
 * Fetch all task lists for user
 */
export async function getGoogleTaskLists(accessToken: string): Promise<GoogleTaskList[]> {
  const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch task lists (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.items || [];
}

/**
 * Fetch tasks inside a specific task list
 */
export async function getGoogleTasks(accessToken: string, taskListId: string = '@default'): Promise<GoogleTask[]> {
  const url = `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks?showCompleted=true&showHidden=true&maxResults=100`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch tasks (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const items: GoogleTask[] = (data.items || []).map((item: any) => ({
    ...item,
    taskListId,
  }));
  return items;
}

/**
 * Create a new task in Google Tasks
 */
export async function createGoogleTask(
  accessToken: string,
  taskListId: string = '@default',
  task: { title: string; notes?: string; due?: string }
): Promise<GoogleTask> {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      title: task.title,
      notes: task.notes || '',
      due: task.due || undefined,
      status: 'needsAction',
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create task (${res.status}): ${errorText}`);
  }

  const created = await res.json();
  return { ...created, taskListId };
}

/**
 * Update an existing task (e.g. toggle complete or update due date)
 */
export async function updateGoogleTask(
  accessToken: string,
  taskListId: string = '@default',
  taskId: string,
  updates: Partial<GoogleTask>
): Promise<GoogleTask> {
  const body: any = {};
  if (updates.title !== undefined) body.title = updates.title;
  if (updates.notes !== undefined) body.notes = updates.notes;
  if (updates.status !== undefined) {
    body.status = updates.status;
    if (updates.status === 'completed') {
      body.completed = new Date().toISOString();
    } else {
      body.completed = null;
    }
  }
  if (updates.due !== undefined) body.due = updates.due;

  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to update task (${res.status}): ${errorText}`);
  }

  const updated = await res.json();
  return { ...updated, taskListId };
}

/**
 * Delete a task in Google Tasks (Must be preceded by user confirmation)
 */
export async function deleteGoogleTask(
  accessToken: string,
  taskListId: string = '@default',
  taskId: string
): Promise<boolean> {
  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok && res.status !== 204) {
    const errorText = await res.text();
    throw new Error(`Failed to delete task (${res.status}): ${errorText}`);
  }

  return true;
}
