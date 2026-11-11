import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  CheckSquare,
  Image as ImageIcon,
  Smile,
  ListTodo,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  AlertCircle,
  FileText,
  Share2,
  MoreHorizontal,
  ChevronDown,
  Loader2,
  Check,
  Plus
} from 'lucide-react';
import type { NotionPage } from '../lib/initialData.ts';
import { fetchDocumentAiAction } from '../lib/aiApi.ts';
import confetti from 'canvas-confetti';

interface NotionEditorProps {
  page: NotionPage;
  onUpdatePage: (updated: NotionPage) => void;
  onAddGoogleTasks: (tasks: Array<{ title: string; notes?: string; priority?: 'high' | 'medium' | 'low'; due?: string }>) => void;
  onAddCalendarEvents: (events: Array<{ summary: string; description?: string; durationMinutes?: number }>) => void;
  isGoogleConnected: boolean;
  onConnectGoogle: () => void;
}

const EMOJI_OPTIONS = ['🚀', '📝', '⚡', '📅', '🎯', '💡', '🧠', '📌', '🔥', '📊', '✨', '☕'];

export const NotionEditor: React.FC<NotionEditorProps> = ({
  page,
  onUpdatePage,
  onAddGoogleTasks,
  onAddCalendarEvents,
  isGoogleConnected,
  onConnectGoogle,
}) => {
  const [content, setContent] = useState(page.content);
  const [title, setTitle] = useState(page.title);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiActionResult, setAiActionResult] = useState<any | null>(null);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuPos, setSlashMenuPos] = useState({ top: 0, left: 0 });
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(page.content);
    setTitle(page.title);
    setAiActionResult(null);
  }, [page.id]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    onUpdatePage({ ...page, title: newTitle, updatedAt: 'Just now' });
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    onUpdatePage({ ...page, content: newContent, updatedAt: 'Just now' });
  };

  const handleEmojiSelect = (emoji: string) => {
    onUpdatePage({ ...page, icon: emoji });
    setShowEmojiPicker(false);
  };

  const handleTriggerAi = async (action: 'extract-tasks' | 'summarize' | 'schedule-plan') => {
    setIsAiLoading(true);
    setAiActionResult(null);
    try {
      const res = await fetchDocumentAiAction(content, action);
      setAiActionResult(res);
      if (action === 'extract-tasks' && res.tasks?.length > 0) {
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });
      }
    } catch (err: any) {
      console.error('Document AI error:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const applyExtractedTasks = () => {
    if (!aiActionResult?.tasks?.length) return;
    const formatted = aiActionResult.tasks.map((t: any) => {
      const due = new Date();
      due.setDate(due.getDate() + (t.suggestedDueOffsetDays || 1));
      return {
        title: t.title,
        notes: `From Notion Doc: "${page.title}"\n${t.notes || ''}`,
        priority: t.priority || 'medium',
        due: due.toISOString(),
      };
    });
    onAddGoogleTasks(formatted);
    setAiActionResult(null);
  };

  const applyCalendarSlots = () => {
    if (!aiActionResult?.suggestedCalendarSlots?.length) return;
    const formatted = aiActionResult.suggestedCalendarSlots.map((s: any) => ({
      summary: s.title,
      description: `Scheduled from Notion Note: ${page.title}\n${s.reason || ''}`,
      durationMinutes: s.durationMinutes || 60,
    }));
    onAddCalendarEvents(formatted);
    setAiActionResult(null);
  };

  const insertSnippet = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = text.substring(0, start) + snippet + text.substring(end);
    handleContentChange(newText);
    setSlashMenuOpen(false);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === '/' && !slashMenuOpen) {
      setSlashMenuOpen(true);
      // Rough position
      setSlashMenuPos({ top: 320, left: 60 });
    } else if (e.key === 'Escape') {
      setSlashMenuOpen(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white flex flex-col min-h-screen">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="sticky top-0 z-20 px-6 py-2.5 bg-white/90 backdrop-blur-md border-b border-[#f0f0ef] flex items-center justify-between text-xs text-[#787774]">
        <div className="flex items-center gap-1.5 font-medium">
          <span>Workspace</span>
          <span>/</span>
          <span className="flex items-center gap-1 text-[#37352f] font-semibold">
            <span>{page.icon}</span>
            <span className="truncate max-w-[200px]">{title || 'Untitled'}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Quick Actions Dropdown */}
          <div className="flex items-center gap-1 bg-[#f7f7f5] p-0.5 rounded-lg border border-[#e8e8e6]">
            <button
              onClick={() => handleTriggerAi('extract-tasks')}
              disabled={isAiLoading}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium text-[#37352f] hover:bg-white hover:shadow-2xs transition-all flex items-center gap-1"
              title="Extract tasks from this note into Google Tasks"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>To Google Tasks</span>
            </button>
            <button
              onClick={() => handleTriggerAi('schedule-plan')}
              disabled={isAiLoading}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium text-[#37352f] hover:bg-white hover:shadow-2xs transition-all flex items-center gap-1"
              title="Schedule deep work sessions from note into Calendar"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Schedule AI Blocks</span>
            </button>
            <button
              onClick={() => handleTriggerAi('summarize')}
              disabled={isAiLoading}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium text-[#37352f] hover:bg-white hover:shadow-2xs transition-all flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Summarize</span>
            </button>
          </div>

          <div className="h-4 w-[1px] bg-gray-200"></div>

          <span className="text-[11px] text-gray-400">
            Edited {page.updatedAt}
          </span>
        </div>
      </div>

      {/* Cover Image */}
      {page.coverImage && (
        <div className="relative h-44 w-full overflow-hidden bg-gray-100 group">
          <img
            src={page.coverImage}
            alt="Page cover"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
          <button
            onClick={() => {
              const urls = [
                'https://images.unsplash.com/photo-1507842229451-7f01be8510ab?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
              ];
              const next = urls[(urls.indexOf(page.coverImage!) + 1) % urls.length];
              onUpdatePage({ ...page, coverImage: next });
            }}
            className="absolute bottom-3 right-4 px-2.5 py-1 text-xs font-medium text-white/90 bg-black/50 hover:bg-black/70 backdrop-blur-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Change Cover
          </button>
        </div>
      )}

      {/* Main Document Content Canvas */}
      <div className="max-w-3xl w-full mx-auto px-8 py-8 flex-1 flex flex-col">
        {/* Page Icon & Title Header */}
        <div className="relative mb-6">
          <div className="relative inline-block mb-3">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-4xl p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer select-none"
              title="Change icon"
            >
              {page.icon}
            </button>

            {showEmojiPicker && (
              <div className="absolute top-full left-0 z-30 mt-1 p-2 bg-white rounded-xl shadow-xl border border-gray-200 grid grid-cols-4 gap-1 w-44">
                {EMOJI_OPTIONS.map(em => (
                  <button
                    key={em}
                    onClick={() => handleEmojiSelect(em)}
                    className="text-2xl p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            type="text"
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="Untitled Page"
            className="w-full text-3xl font-bold text-[#2f2f2f] placeholder-gray-300 border-none outline-hidden focus:ring-0 px-0 bg-transparent tracking-tight font-sans"
          />
        </div>

        {/* AI Action Results Notification Card */}
        {isAiLoading && (
          <div className="mb-6 p-4 rounded-xl bg-purple-50/70 border border-purple-100 flex items-center gap-3 text-purple-700 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
            <div className="text-xs">
              <span className="font-semibold">Gemini AI is analyzing document...</span>
              <p className="text-purple-600/80">Extracting tasks, estimating durations, and preparing calendar slots.</p>
            </div>
          </div>
        )}

        {aiActionResult && (
          <div className="mb-6 p-4 rounded-xl bg-[#faf9fe] border border-purple-200 shadow-sm animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-purple-100 mb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-900">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>AI Insights &amp; Suggestions</span>
              </div>
              <button
                onClick={() => setAiActionResult(null)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Dismiss
              </button>
            </div>

            {aiActionResult.summary && (
              <p className="text-xs text-[#444] mb-3 leading-relaxed bg-white p-3 rounded-lg border border-purple-100">
                {aiActionResult.summary}
              </p>
            )}

            {aiActionResult.tasks?.length > 0 && (
              <div className="space-y-2 mb-3">
                <div className="text-xs font-semibold text-[#333]">
                  Identified Google Tasks ({aiActionResult.tasks.length}):
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {aiActionResult.tasks.map((t: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-white border border-gray-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-medium text-[#2f2f2f]">{t.title}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                        t.priority === 'high' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {t.priority}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={applyExtractedTasks}
                  className="mt-2 w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add All to Google Tasks
                </button>
              </div>
            )}

            {aiActionResult.suggestedCalendarSlots?.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#333]">
                  Suggested Calendar Focus Blocks ({aiActionResult.suggestedCalendarSlots.length}):
                </div>
                <div className="space-y-1.5">
                  {aiActionResult.suggestedCalendarSlots.map((s: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-white border border-gray-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-medium text-blue-900">{s.title}</span>
                        <p className="text-[10px] text-gray-500">{s.reason}</p>
                      </div>
                      <span className="text-xs text-blue-600 font-semibold">{s.durationMinutes}m</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={applyCalendarSlots}
                  className="mt-2 w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Schedule in Google Calendar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Slash Menu Quick Commands Helper */}
        {slashMenuOpen && (
          <div
            className="absolute z-40 bg-white rounded-xl shadow-2xl border border-gray-200 w-64 p-1 text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={{ top: slashMenuPos.top, left: slashMenuPos.left }}
          >
            <div className="px-3 py-1.5 font-semibold text-gray-400 uppercase tracking-wider text-[10px] border-b border-gray-100">
              Insert Notion Blocks
            </div>
            <div className="py-1">
              <button
                onClick={() => insertSnippet('\n### Heading\n')}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-gray-100 rounded-lg text-gray-700"
              >
                <Heading2 className="w-4 h-4 text-gray-500" />
                <span>Heading 2</span>
              </button>
              <button
                onClick={() => insertSnippet('\n- [ ] ')}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-gray-100 rounded-lg text-gray-700"
              >
                <ListTodo className="w-4 h-4 text-emerald-500" />
                <span>To-do Task Checklist</span>
              </button>
              <button
                onClick={() => insertSnippet('\n> 💡 **Callout:** ')}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-gray-100 rounded-lg text-gray-700"
              >
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>Callout Box</span>
              </button>
              <button
                onClick={() => insertSnippet('\n- Bullet point ')}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-gray-100 rounded-lg text-gray-700"
              >
                <span className="w-4 text-center font-bold text-gray-400">•</span>
                <span>Bullet List</span>
              </button>
              <button
                onClick={() => insertSnippet('\n```\n// Code block\n```\n')}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-gray-100 rounded-lg text-gray-700"
              >
                <Code className="w-4 h-4 text-purple-500" />
                <span>Code Block</span>
              </button>
              <button
                onClick={() => insertSnippet('\n---\n')}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-gray-100 rounded-lg text-gray-700"
              >
                <span className="w-4 text-center font-bold text-gray-400">—</span>
                <span>Divider</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab view switcher: Markdown Editor vs Clean Notion View */}
        <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => setActiveTab('editor')}
              className={`pb-1 font-medium transition-colors ${
                activeTab === 'editor'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Write / Edit
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`pb-1 font-medium transition-colors ${
                activeTab === 'preview'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Formatted View
            </button>
          </div>
          <span className="text-[11px] text-gray-400 font-mono">
            Type / for commands
          </span>
        </div>

        {activeTab === 'editor' ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => handleContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type '/' for commands or write notes here..."
            className="w-full flex-1 min-h-[420px] font-sans text-sm text-[#37352f] leading-relaxed resize-none border-none outline-hidden focus:ring-0 p-0 bg-transparent placeholder-gray-300"
          />
        ) : (
          <div className="prose prose-sm max-w-none text-[#37352f] leading-relaxed py-2">
            {content.split('\n').map((line, i) => {
              if (line.startsWith('# ')) {
                return (
                  <h1 key={i} className="text-2xl font-bold mt-4 mb-2 text-[#222]">
                    {line.replace('# ', '')}
                  </h1>
                );
              }
              if (line.startsWith('## ')) {
                return (
                  <h2 key={i} className="text-xl font-semibold mt-3 mb-1.5 text-[#222]">
                    {line.replace('## ', '')}
                  </h2>
                );
              }
              if (line.startsWith('### ')) {
                return (
                  <h3 key={i} className="text-base font-semibold mt-2.5 mb-1 text-[#333]">
                    {line.replace('### ', '')}
                  </h3>
                );
              }
              if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
                const checked = line.startsWith('- [x] ');
                const text = line.replace(/- \[[ x]\] /, '');
                return (
                  <div key={i} className="flex items-center gap-2.5 my-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      readOnly
                      className="rounded border-gray-300 text-blue-600 focus:ring-0"
                    />
                    <span className={checked ? 'line-through text-gray-400' : 'text-gray-800'}>
                      {text}
                    </span>
                  </div>
                );
              }
              if (line.startsWith('> ')) {
                return (
                  <div
                    key={i}
                    className="p-3 my-2 bg-[#f7f6f3] border-l-3 border-[#37352f] rounded-r-lg text-xs text-[#444]"
                  >
                    {line.replace('> ', '')}
                  </div>
                );
              }
              if (line.startsWith('- ')) {
                return (
                  <li key={i} className="ml-4 list-disc text-sm my-0.5 text-gray-800">
                    {line.replace('- ', '')}
                  </li>
                );
              }
              if (line.trim() === '---') {
                return <hr key={i} className="my-4 border-gray-200" />;
              }
              if (!line.trim()) {
                return <div key={i} className="h-2" />;
              }
              return (
                <p key={i} className="my-1 text-sm text-gray-800">
                  {line}
                </p>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
