import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Search,
  Plus,
  MessageSquare,
  Pencil,
  Trash2,
  Send,
  Square,
  ChevronLeft,
  Copy,
  Check,
  Clock,
  AlertCircle,
  Paperclip,
  Image,
  Video,
  FileText,
  File,
  X,
  Loader2,
  Mic,
  Play,
  Pause,
  RotateCcw,
  Download,
} from 'lucide-react';
import StudentLayout from '../../components/layout/StudentLayout';
import AdminLayout from '../../components/layout/AdminLayout';
import useAuthStore from '../../store/authStore';
import api from '../../utils/api';
import { formatDate } from '../../utils/helpers';

const AI_PROXY_URL = import.meta.env.VITE_AI_PROXY_URL || '/api';

function normalizeAssistantText(text) {
  if (!text) return '';
  let out = String(text);
  out = out.replace(/\r\n/g, '\n');
  out = out.replace(/\n{3,}/g, '\n\n');
  out = out.replace(/[ \t]{2,}/g, ' ');
  out = out.split('\n').map(l => l.trim()).join('\n');
  return out.trim();
}

function autoFormatToMarkdown(text) {
  if (!text) return '';

  let output = String(text)
    .replace(/\r\n/g, '\n')
    // Repair headings that have been streamed without their line breaks.
    .replace(/\*\*\s*([^*\n]+?)\s*\*\*\s*[=-]{3,}/g, '\n\n## $1\n\n')
    .replace(/\*\*\s*Important Points\s*:?\s*\*\*/gi, '\n\n## Important Points\n\n')
    // Start each compressed numbered or bulleted item on its own line.
    .replace(/([^\n])\s*(\d{1,2})\.\s*(?=\*\*|[A-Z])/g, '$1\n$2. ')
    .replace(/([^\n])\s*[-•]\s+(?=[A-Z])/g, '$1\n- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const lines = output.split('\n').map(line => line.trim());
  const formatted = [];
  let paragraph = [];
  const flushParagraph = () => {
    if (paragraph.length) {
      formatted.push(paragraph.join(' '));
      paragraph = [];
    }
  };

  for (const line of lines) {
    if (!line) {
      flushParagraph();
      continue;
    }
    if (/^#{1,3}\s+/.test(line) || /^\d+[.)]\s+/.test(line) || /^[-*+]\s+/.test(line) || /^```/.test(line)) {
      flushParagraph();
      formatted.push(/^\d+\)\s+/.test(line) ? line.replace(/^(\d+)\)\s+/, '$1. ') : line);
    } else {
      paragraph.push(line);
    }
  }
  flushParagraph();

  return formatted.join('\n\n');
}
// Some model providers emit stream chunks without a word-leading space.
function appendAssistantChunk(previous, chunk) {
  const current = String(previous || '');
  const next = String(chunk || '');
  if (!current || !next) return current + next;

  const startsWithWord = /^[\p{L}\p{N}]/u.test(next);
  const endsWithWordOrSentence = /[\p{L}\p{N}\])}.!?,;:]$/u.test(current);
  const endsWithBoldMarker = /\*\*$/.test(current);
  const needsSpace = startsWithWord && (endsWithWordOrSentence || endsWithBoldMarker);
  return current + (needsSpace ? ' ' : '') + next;
}

function formatAssistantContent(content) {
  const cleaned = normalizeAssistantText(content);
  return autoFormatToMarkdown(cleaned) || cleaned;
}
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

function CodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group rounded-xl overflow-hidden my-3 border border-white/10">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 border-b border-white/5">
        <span className="text-xs text-gray-400 uppercase">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          {copied ? (
            <><Check className="w-3.5 h-3.5 text-white" /> Copied</>
          ) : (
            <><Copy className="w-3.5 h-3.5" /> Copy</>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto bg-gray-900/50 text-sm text-gray-200 leading-relaxed">
        <code>{value}</code>
      </pre>
    </div>
  );
}

function ChatMessage({ message, isStreaming }) {
  const isUser = message?.role === 'user';
  const displayContent = isUser ? message?.content : formatAssistantContent(message?.content);
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
          isUser
            ? 'bg-white text-black'
            : 'bg-white/10 text-gray-300'
        }`}
      >
        {isUser ? 'U' : 'AI'}
      </div>
      <div className={`min-w-0 flex flex-col ${isUser ? 'max-w-[min(32rem,calc(100%-2.5rem))] items-end' : 'max-w-[min(46rem,calc(100%-2.5rem))] items-start'}`}>
        <div
          className={`w-fit max-w-full rounded-2xl px-4 py-3 shadow-sm ${
            isUser
              ? 'bg-white text-black rounded-tr-sm'
              : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-sm'
          }`}
        >
          {isUser ? (
            <div className="text-sm leading-6 whitespace-pre-wrap break-words">{message?.content}</div>
          ) : (
            <div className="text-sm leading-6 prose prose-invert prose-p:my-0 prose-ul:my-2 prose-ol:my-2 max-w-none break-words [overflow-wrap:anywhere]">
              {isStreaming && !message?.content ? (
                <TypingDots />
              ) : (
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const value = String(children).replace(/\n$/, '');
                      if (!inline && match) {
                        return <CodeBlock language={match[1]} value={value} />;
                      }
                      return (
                        <code className="px-1.5 py-0.5 rounded-md bg-white/10 text-gray-300 text-xs" {...props}>
                          {children}
                        </code>
                      );
                    },
                    p({ children }) {
                      return <p className="mb-4 last:mb-0 leading-7 text-gray-200">{children}</p>;
                    },
                    ul({ children }) {
                      return <ul className="list-disc pl-6 mb-4 space-y-2 marker:text-gray-400">{children}</ul>;
                    },
                    ol({ children }) {
                      return <ol className="list-decimal pl-6 mb-4 space-y-2 marker:text-gray-400">{children}</ol>;
                    },
                    h1({ children }) {
                      return <h1 className="text-xl font-semibold mb-3 mt-6 first:mt-0 text-white">{children}</h1>;
                    },
                    h2({ children }) {
                      return <h2 className="text-base font-semibold mb-3 mt-6 first:mt-0 text-white">{children}</h2>;
                    },
                    h3({ children }) {
                      return <h3 className="text-sm font-semibold mb-2 mt-5 first:mt-0 text-white">{children}</h3>;
                    },
                    strong({ children }) {
                      return <strong className="font-semibold text-white">{children}</strong>;
                    },
                    li({ children }) {
                      return <li className="pl-1 leading-7 text-gray-200">{children}</li>;
                    },                    blockquote({ children }) {
                      return (
                        <blockquote className="border-l-2 border-white/30 pl-3 my-2 text-gray-400 italic">
                          {children}
                        </blockquote>
                      );
                    },
                  }}
                >
                  {displayContent || ''}
                </ReactMarkdown>
              )}
            </div>
          )}
        </div>
        {message?.timestamp && (
          <div className={`flex items-center gap-1 mt-1 ${isUser ? 'justify-end' : ''}`}>
            <Clock className="w-3 h-3 text-gray-600" />
            <span className="text-[10px] text-gray-600">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatItem({ chat, active, onSelect, onRename, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title);

  const handleRename = () => {
    if (editTitle.trim()) {
      onRename(chat.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
        active
          ? 'bg-white/10 border border-white/20'
          : 'hover:bg-white/5 border border-transparent'
      }`}
      onClick={() => onSelect(chat.id)}
    >
      <MessageSquare className="w-4 h-4 flex-shrink-0 text-gray-500" />
      {isEditing ? (
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          className="flex-1 bg-transparent text-sm text-gray-200 focus:outline-none border-b border-white/30"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="flex-1 min-w-0">
          <span className="text-sm text-gray-300 truncate block">{chat.title}</span>
          <span className="text-[10px] text-gray-500">{formatDate(chat.updatedAt || chat.createdAt)}</span>
        </div>
      )}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
            setEditTitle(chat.title);
          }}
          className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-white/5"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(chat.id);
          }}
          className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-white/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}


function UploadMenu({ onSelect, onClose, textareaRef }) {
  const items = [
    { type: 'image', icon: Image, label: 'Image', accept: 'image/*' },
    { type: 'video', icon: Video, label: 'Upload Video', accept: 'video/*,audio/*' },
    { type: 'document', icon: FileText, label: 'Document', accept: '.txt,.md,.csv,.json,.js,.py,.html,.css,.pdf' },
  ];

  const triggerFilePick = (type, accept) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) onSelect(type, file);
      document.body.removeChild(input);
      requestAnimationFrame(() => textareaRef?.current?.focus());
    };
    document.body.appendChild(input);
    input.click();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-white/10 rounded-xl p-2 shadow-xl z-50"
    >
      {items.map(({ type, icon: Icon, label, accept, action }) => (
        <button
          key={type}
          onClick={() => { triggerFilePick(type, accept); }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Icon className="w-4 h-4 text-white" />
          {label}
        </button>
      ))}
    </motion.div>
  );
}

export default function StudentAiChat() {
  const { user } = useAuthStore();
  const Layout = user?.role === 'student' ? StudentLayout : AdminLayout;
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (activeChatId) {
      fetchMessages(activeChatId);
    } else {
      setMessages([]);
    }
  }, [activeChatId]);

  const fetchChats = async () => {
    setLoadingChats(true);
    try {
      const { data } = await api.get('/chat');
      setChats(data.chats || []);
    } catch {
      setError('Failed to load chats');
    } finally {
      setLoadingChats(false);
    }
  };

  const normalizeMessages = (items = []) =>
    (Array.isArray(items) ? items : []).map((msg, index) => ({
      ...msg,
      id: msg?.id || `msg-${index}-${msg?.role || 'unknown'}-${msg?.timestamp || Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }));

  const fetchMessages = async (chatId) => {
    setLoadingMessages(true);
    setError(null);
    try {
      const { data } = await api.get(`/chat/${chatId}`);
      setMessages(normalizeMessages(data.messages || []));
    } catch {
      setError('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSearch = async (query) => {
    setSearch(query);
    if (!query.trim()) {
      fetchChats();
      return;
    }
    try {
      const { data } = await api.get(`/chat/search/${encodeURIComponent(query)}`);
      setChats(data.chats || []);
    } catch {}
  };

  const handleNewChat = async () => {
    const fallbackChat = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const { data } = await api.post('/chat');
      const serverChat = data?.chat || data;
      const newChat = serverChat && typeof serverChat === 'object'
        ? {
            ...fallbackChat,
            ...serverChat,
            id: serverChat.id || fallbackChat.id,
            title: serverChat.title || 'New Chat',
            messages: Array.isArray(serverChat.messages) ? serverChat.messages : [],
            createdAt: serverChat.createdAt || serverChat.created_at || fallbackChat.createdAt,
            updatedAt: serverChat.updatedAt || serverChat.updated_at || fallbackChat.updatedAt,
          }
        : fallbackChat;

      setChats((prev) => [newChat, ...prev.filter((chat) => chat.id !== newChat.id)]);
      setActiveChatId(newChat.id);
      setMessages([]);
      setSidebarOpen(false);
      setError(null);
    } catch {
      setChats((prev) => [fallbackChat, ...prev.filter((chat) => chat.id !== fallbackChat.id)]);
      setActiveChatId(fallbackChat.id);
      setMessages([]);
      setSidebarOpen(false);
      setError(null);
    }
  };

  const handleSelectChat = (chatId) => {
    setActiveChatId(chatId);
    setSidebarOpen(false);
  };

  const handleRenameChat = async (chatId, title) => {
    try {
      await api.put(`/chat/${chatId}/rename`, { title });
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, title } : c))
      );
    } catch {}
  };

  const handleDeleteChat = async (chatId) => {
    try {
      await api.delete(`/chat/${chatId}`);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setMessages([]);
      }
    } catch {
      setError('Failed to delete chat');
    }
  };

  const isBinaryFile = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    const binaryExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', '7z', 'gz', 'tar', 'exe', 'dll', 'bin', 'wasm', 'ico', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'mp4', 'mp3', 'wav', 'avi', 'mov', 'mkv', 'flv', 'woff', 'woff2', 'ttf', 'eot'];
    return binaryExts.includes(ext);
  };

  const handleFileSelect = async (type, file) => {
    if (type === 'document') {
      if (isBinaryFile(file.name)) {
        setAttachedFile({ type, name: file.name, file, needsServerProcessing: true });
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target.result;
          setAttachedFile({ type, name: file.name, content: typeof content === 'string' ? content : '', needsServerProcessing: false });
        };
        reader.readAsText(file);
      }
    } else if (type === 'image') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        setAttachedFile({ type, name: file.name, content: typeof content === 'string' ? content : '' });
      };
      reader.readAsDataURL(file);
    } else {
      setAttachedFile({ type, name: file.name, file, needsServerProcessing: true });
    }
  };

  const removeAttachedFile = () => setAttachedFile(null);

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && !attachedFile) || sending || !activeChatId) return;
    setInput('');
    setSending(true);

    let messageContent = text;
    let imageBase64 = null;
    let isVideoAudio = attachedFile?.type === 'video';
    let progressMsg = null;

    if (attachedFile) {
      if (isVideoAudio) {
        progressMsg = { id: `progress-${Date.now()}`, role: 'user', content: `⏳ Transcribing "${attachedFile.name}"...`, timestamp: new Date().toISOString() };
        setMessages((prev) => [...prev, progressMsg]);

        const formData = new FormData();
        formData.append('video', attachedFile.file);
        try {
          const uploadRes = await fetch(`${AI_PROXY_URL}/video/analyze`, {
            method: 'POST', body: formData,
          });
          
          if (!uploadRes.ok) {
            throw new Error(`Video processing failed: ${uploadRes.statusText}`);
          }

          const uploadJson = await uploadRes.json();
          
          if (uploadJson.success && uploadJson.data) {
            const { transcript, analysis } = uploadJson.data;
            const transcriptText = transcript
              ? `\n\n📝 **Transcript:**\n${transcript}\n\n📊 **Analysis:**\n${analysis}`
              : '\n\n[Could not extract speech from video]';
            messageContent = messageContent ? `${messageContent}${transcriptText}` : `Please analyze this video:\n\n**File:** "${attachedFile.name}"${transcriptText}`;
          } else {
            const errorMsg = uploadJson.error || 'Could not process video';
            messageContent = messageContent ? `${messageContent}\n\n⚠️ Error: ${errorMsg}` : `⚠️ Failed to process "${attachedFile.name}": ${errorMsg}`;
          }
          
          setMessages((prev) => prev.filter(m => m.id !== progressMsg.id));
        } catch (err) {
          const errorMsg = err.message || 'Unknown error occurred';
          messageContent = messageContent ? `${messageContent}\n\n⚠️ Error: ${errorMsg}` : `⚠️ Failed to process "${attachedFile.name}": ${errorMsg}`;
          setMessages((prev) => prev.filter(m => m.id !== progressMsg.id));
        }
      } else if (attachedFile.type === 'image') {
        imageBase64 = attachedFile.content;
        messageContent = text || `Analyze this image: "${attachedFile.name}"`;
      } else if (attachedFile.needsServerProcessing) {
        progressMsg = { id: `progress-${Date.now()}`, role: 'user', content: `⏳ Processing document "${attachedFile.name}"...`, timestamp: new Date().toISOString() };
        setMessages((prev) => [...prev, progressMsg]);

        const formData = new FormData();
        formData.append('document', attachedFile.file);
        try {
          const docRes = await fetch(`${AI_PROXY_URL}/document/analyze`, {
            method: 'POST', body: formData,
          });

          if (!docRes.ok) {
            throw new Error(`Document processing failed: ${docRes.statusText}`);
          }

          const docJson = await docRes.json();
          
          if (docJson.success && docJson.data) {
            const { analysis } = docJson.data;
            const docText = analysis
              ? `\n\n📄 **Document Analysis:**\n${analysis}`
              : '\n\n[Could not analyze document]';
            messageContent = messageContent ? `${messageContent}${docText}` : `Please analyze this document:\n\n**File:** "${attachedFile.name}"${docText}`;
          } else {
            const errorMsg = docJson.error || 'Could not process document';
            messageContent = messageContent ? `${messageContent}\n\n⚠️ Error: ${errorMsg}` : `⚠️ Failed to process "${attachedFile.name}": ${errorMsg}`;
          }
          
          setMessages((prev) => prev.filter(m => m.id !== progressMsg.id));
        } catch (err) {
          const errorMsg = err.message || 'Unknown error occurred';
          messageContent = messageContent ? `${messageContent}\n\n⚠️ Error: ${errorMsg}` : `⚠️ Failed to process "${attachedFile.name}": ${errorMsg}`;
          setMessages((prev) => prev.filter(m => m.id !== progressMsg.id));
        }
      } else {
        const fileContent = attachedFile.content || '';
        messageContent = messageContent
          ? `${messageContent}\n\n[File: "${attachedFile.name}"]\n\`\`\`\n${fileContent.substring(0, 50000)}\n\`\`\`\nPlease analyze this file.`
          : `Please analyze this file: "${attachedFile.name}"\n\`\`\`\n${fileContent.substring(0, 50000)}\n\`\`\`\n`;
      }
    }

    setAttachedFile(null);

    const userMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    const aiPlaceholder = {
      id: `temp-ai-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, aiPlaceholder]);

    const controller = new AbortController();
    abortRef.current = controller;

    const tryStream = async () => {
      const res = await fetch(`${AI_PROXY_URL}/chat/${activeChatId}/message/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageContent, imageBase64 }),
        signal: controller.signal,
      });

      if (!res.ok || !res.headers.get('Content-Type')?.includes('text/event-stream')) {
        const fallbackRes = await fetch(`${AI_PROXY_URL}/chat/${activeChatId}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: messageContent, imageBase64 }),
        });
        const fallbackJson = await fallbackRes.json();
        if (!fallbackJson.success) throw new Error(fallbackJson.error || 'Send failed');
        const fallbackText = fallbackJson.data?.aiResponse?.trim() || 'I apologize, but I was unable to generate a response. Please try rephrasing your question.';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiPlaceholder.id ? { ...m, content: fallbackText } : m
          )
        );
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Streaming response is not available');

      const decoder = new TextDecoder();
      let buffer = '';
      let completed = false;

      while (!completed) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim()) {
            const lines = buffer.split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              const jsonStr = trimmed.slice(6);
              if (jsonStr === '[DONE]') {
                completed = true;
                break;
              }
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.type === 'chunk') {
                  setMessages((prev) =>
                    prev.map((m) => {
                      if (m.id !== aiPlaceholder.id) return m;
                      return { ...m, content: appendAssistantChunk(m.content, parsed.content) };
                    })
                  );
                } else if (parsed.type === 'done') {
                  completed = true;
                }
              } catch {}
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') {
            completed = true;
            break;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'chunk') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiPlaceholder.id ? { ...m, content: appendAssistantChunk(m.content, parsed.content) } : m
                )
              );
            } else if (parsed.type === 'done') {
              completed = true;
            } else if (parsed.type === 'error') {
              throw new Error(parsed.error);
            }
          } catch {}
        }
      }

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== aiPlaceholder.id) return m;
                          const raw = String(m.content || '');
                          const cleaned = normalizeAssistantText(raw);
                          const md = autoFormatToMarkdown(cleaned).trim();
                          const content = md || cleaned.trim();
                          return content
                            ? { ...m, content }
                            : { ...m, content: 'I apologize, but I was unable to generate a response. Please try rephrasing your question.' };
        })
      );
      setChats((prev) =>
        prev.map((c) => c.id === activeChatId ? { ...c, updatedAt: new Date().toISOString() } : c)
      );
    };

    try {
      await tryStream();
    } catch (err) {
      if (err.name === 'AbortError') return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiPlaceholder.id
            ? { ...m, content: m.content || 'Sorry, I encountered an error. Please try again.' }
            : m
        )
      );
    } finally {
      abortRef.current = null;
      setSending(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setSending(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const adjustTextarea = () => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    }
  };

  const filteredChats = chats.filter((c) =>
    (c.title || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="fixed inset-0 top-16 lg:top-16 left-0 lg:left-64 right-0 bottom-0 flex overflow-hidden">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute lg:relative z-20 h-full w-72 flex-shrink-0 bg-gray-900/95 backdrop-blur-xl border-r border-white/10"
            >
              <div className="flex flex-col h-full">
                <div className="p-3 border-b border-white/10">
                  <button
                    onClick={handleNewChat}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-gray-200 transition-all duration-200"
                  >
                    <Plus className="w-4 h-4" />
                    New Chat
                  </button>
                </div>
                <div className="p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Search chats..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                  {loadingChats ? (
                    <div className="space-y-2 p-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
                      ))}
                    </div>
                  ) : filteredChats.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      {search ? 'No chats found' : 'No chats yet. Start a new one!'}
                    </p>
                  ) : (
                    filteredChats.map((chat) => (
                      <ChatItem
                        key={chat.id}
                        chat={chat}
                        active={chat.id === activeChatId}
                        onSelect={handleSelectChat}
                        onRename={handleRenameChat}
                        onDelete={handleDeleteChat}
                      />
                    ))
                  )}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-3 left-3 z-10 p-2 rounded-xl bg-gray-800 border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
        </button>

        <div className="flex-1 flex flex-col bg-gray-950">
          {!activeChatId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md px-4">
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-black" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Start a New Conversation</h2>
                <p className="text-gray-400 text-sm mb-6">
                  Click "New Chat" to begin chatting with your AI learning assistant.
                </p>
                <button
                  onClick={handleNewChat}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-gray-200 transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  New Chat
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-5 lg:px-8 lg:py-6">
                <div className="mx-auto w-full max-w-5xl space-y-5">
                {loadingMessages ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={`flex gap-2.5 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                        <div className="w-8 h-8 rounded-xl bg-white/5 animate-pulse" />
                        <div className={`${i % 2 === 0 ? 'w-2/3' : 'w-1/2'}`}>
                          <div className="h-16 rounded-2xl bg-white/5 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">Send a message to start chatting</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <ChatMessage
                      key={msg.id || `msg-${index}-${msg.role || 'unknown'}`}
                      message={msg}
                      isStreaming={sending && !msg.content && msg.role === 'assistant'}
                    />
                  ))
                )}
                {sending && messages.length > 0 && !messages[messages.length - 1]?.content && (
                  <div className="flex gap-2.5">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-gray-300">
                      AI
                    </div>
                    <div className="rounded-2xl px-3.5 py-2.5 bg-white/5 border border-white/10">
                      <TypingDots />
                    </div>
                  </div>
                )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {error && (
                <div className="px-4 lg:px-6 pb-2">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-red-400 text-xs">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">Dismiss</button>
                  </div>
                </div>
              )}

              <div className="border-t border-white/10 px-4 py-3 lg:px-6 lg:py-4">
                <div className="max-w-4xl mx-auto flex items-end gap-2.5">
                  {attachedFile && (
                    <div className="mb-2 self-start">
                      {attachedFile.type === 'image' && attachedFile.content?.startsWith('data:image') ? (
                        <div className="relative group rounded-xl overflow-hidden border border-white/10 w-48">
                          <img src={attachedFile.content} alt={attachedFile.name} className="w-full h-32 object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <button onClick={removeAttachedFile} className="p-1.5 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent">
                            <span className="text-[10px] text-white truncate block">{attachedFile.name}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-800 border border-white/10">
                          {attachedFile.type === 'video' ? (
                            <Video className="w-3.5 h-3.5 text-amber-400" />
                          ) : attachedFile.type === 'document' ? (
                            <FileText className="w-3.5 h-3.5 text-blue-400" />
                          ) : (
                            <File className="w-3.5 h-3.5 text-indigo-400" />
                          )}
                          <span className="text-xs text-dark-300 truncate max-w-[180px]">{attachedFile.name}</span>
                          <button onClick={removeAttachedFile} className="p-0.5 rounded hover:bg-white/10 text-dark-500 hover:text-red-400">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {attachedFile.type === 'video' && (
                        <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                          <Loader2 className="w-3 h-3 animate-spin text-white" />
                          <span className="text-[10px] text-white">Will be transcribed on send</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex-1 relative flex items-end gap-2">
                    <div className="relative">
                      <button
                        onClick={() => setShowUploadMenu(!showUploadMenu)}
                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Attach file"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <AnimatePresence>
                        {showUploadMenu && (
                          <UploadMenu
                            textareaRef={textareaRef}
                            onSelect={(type, file) => {
                              handleFileSelect(type, file);
                              setShowUploadMenu(false);
                            }}
                            onClose={() => setShowUploadMenu(false)}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value);
                        adjustTextarea();
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your message..."
                      rows={1}
                      className="flex-1 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm leading-6 text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 transition-all"
                      style={{ maxHeight: '160px' }}
                    />
                  </div>
                  {sending ? (
                    <button
                      onClick={handleStop}
                      className="flex-shrink-0 p-3 rounded-xl bg-white text-black hover:bg-gray-200 transition-colors"
                      title="Stop generating"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() && !attachedFile}
                      className="flex-shrink-0 p-3 rounded-xl bg-white text-black hover:bg-gray-200 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Send message"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
