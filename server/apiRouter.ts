import type { Request, Response } from 'express';
import {
  planDayWithAi,
  parseNaturalLanguageInput,
  breakdownTaskWithAi,
  processDocumentWithAi,
} from './aiService.ts';

export async function handlePlanDay(req: Request, res: Response) {
  try {
    const { tasks = [], events = [], dateStr = new Date().toISOString() } = req.body;
    const plan = await planDayWithAi(tasks, events, dateStr);
    res.json({ success: true, data: plan });
  } catch (error: any) {
    console.error('Plan day AI error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate plan' });
  }
}

export async function handleParseNaturalLanguage(req: Request, res: Response) {
  try {
    const { input, referenceTime = new Date().toISOString() } = req.body;
    if (!input || typeof input !== 'string') {
      res.status(400).json({ success: false, error: 'Input text is required' });
      return;
    }
    const parsed = await parseNaturalLanguageInput(input, referenceTime);
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Parse NL error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to parse natural language' });
  }
}

export async function handleBreakdownTask(req: Request, res: Response) {
  try {
    const { taskTitle, taskNotes } = req.body;
    if (!taskTitle) {
      res.status(400).json({ success: false, error: 'Task title is required' });
      return;
    }
    const breakdown = await breakdownTaskWithAi(taskTitle, taskNotes);
    res.json({ success: true, data: breakdown });
  } catch (error: any) {
    console.error('Breakdown task error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to break down task' });
  }
}

export async function handleProcessDocument(req: Request, res: Response) {
  try {
    const { content, action = 'extract-tasks' } = req.body;
    if (!content) {
      res.status(400).json({ success: false, error: 'Document content is required' });
      return;
    }
    const result = await processDocumentWithAi(content, action);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Document AI error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to process document' });
  }
}
