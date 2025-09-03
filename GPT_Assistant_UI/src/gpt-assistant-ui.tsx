// src/gpt-assistant-ui.tsx
import { useCallback, useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UploadCloud,
  Calendar,
  ImageIcon,
  SendHorizontal,
  CheckCircle2,
} from 'lucide-react';

const API_BASE = (import.meta as any).env?.VITE_API_BASE;

type Role = 'user' | 'assistant' | 'system';
type Message = { id: string; role: Role; text: string };
type UploadItem = {
  id: string;
  name: string;
  size: number;
  status: 'queued' | 'uploading' | 'uploaded' | 'error';
};

export default function AssistantUI() {
  const [isThinking, setIsThinking] = useState(false);
  const [isSending, setIsSending] = useState(false); // 🛑 block double sends
  const hasCheckedTokens = useRef(false);

  // 🔐 Auth tokens
  const [userToken, setUserToken] = useState<string | null>(
    localStorage.getItem('userToken')
  );
  const [apiToken, setApiToken] = useState<string | null>(
    localStorage.getItem('apiToken')
  );

  const checkTokens = async () => {
    if (userToken && apiToken) {
      return;
    }

    const secret = prompt('🔐 No token found.\nEnter your secret access word:');
    if (!secret) return;

    try {
      const res = await fetch(`${API_BASE}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretWord: secret }),
      });

      const data = await res.json();
      if (res.ok && data.userToken === 'ACCESS_GRANTED') {
        localStorage.setItem('userToken', data.userToken);
        localStorage.setItem('apiToken', data.apiToken);
        setUserToken(data.userToken);
        setApiToken(data.apiToken);
      } else {
        alert('❌ Invalid secret word');
      }
    } catch (err) {
      alert('⚠️ Error calling /token API');
      console.error(err);
    }
  };

  useEffect(() => {
    if (hasCheckedTokens.current) return;
    hasCheckedTokens.current = true;

    const wakeUpLambda = async () => {
      try {
        if (!API_BASE) return;
        await fetch(`${API_BASE}/ping`, {
          method: 'POST', // ✅ match your existing route
          cache: 'no-store',
          keepalive: true,
          // no headers, no body ⇒ no preflight
        });
      } catch (err) {
        console.warn('⚠️ Lambda wake-up failed:', err);
      }
    };

    // First check tokens, then send cheap warm-up
    checkTokens().then(() => {
      wakeUpLambda();
    });
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: 'How can I assist you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addMessage = (role: Role, text: string) => {
    setMessages((m) => [...m, { id: crypto.randomUUID(), role, text }]);
  };

  // keep a ref of latest messages
  const latestMessagesRef = useRef<Message[]>([]);
  useEffect(() => {
    latestMessagesRef.current = messages;
  }, [messages]);

  const onSend = async () => {
    const text = input.trim();

    if (!text || isSending) return; // 🔒 block double sends
    setIsSending(true);

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text };
    const tempId = crypto.randomUUID();

    setMessages((m) => [
      ...m,
      userMsg,
      { id: tempId, role: 'assistant', text: '...' },
    ]);
    setInput('');
    setIsThinking(true);

    try {
      if (!API_BASE) {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === tempId
              ? { ...msg, text: `👋 (Mock) You said: "${text}"` }
              : msg
          )
        );
        return;
      }

      const history = latestMessagesRef.current
        .filter((m) => m.text !== '...')
        .map((m) => ({ role: m.role, content: m.text }));

      const payload = {
        messages: [...history, { role: 'user', content: text }],
      };

      const res = await fetch(`${API_BASE}/CHAT`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Token': apiToken || '',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok)
        throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);

      const data = await res.json();
      setMessages((m) =>
        m.map((msg) =>
          msg.id === tempId ? { ...msg, text: data.reply || '(no reply)' } : msg
        )
      );
    } catch (err: any) {
      console.error('❌ Error from fetch:', err);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === tempId
            ? { ...msg, text: `⚠️ Error: ${err?.message || String(err)}` }
            : msg
        )
      );
    } finally {
      setIsThinking(false);
      setIsSending(false); // ✅ unlock button
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setIsUploading(true);

    const items: UploadItem[] = Array.from(files).map((f: File) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      status: 'uploaded',
    }));

    // Simulate latency for Stage 1 mock
    await new Promise((r) => setTimeout(r, 800));
    setUploads((u) => [...items, ...u]);
    setIsUploading(false);
    addMessage(
      'assistant',
      `✅ (Mock) ${files.length} file(s) sent to S3 bucket`
    );
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  }, []);

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const openFilePicker = () => fileInputRef.current?.click();

  if (!userToken || !apiToken) {
    return (
      <div className='flex justify-center items-center h-screen text-slate-300 text-lg'>
        🔐 Awaiting access…
      </div>
    );
  }

  return (
    <div className='min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100 p-4 md:p-8'>
      <div className='mx-auto max-w-5xl'>
        {/* Header */}
        <div className='flex items-center gap-3 mb-4'>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className='w-12 h-12 rounded-2xl bg-slate-800/80 grid place-items-center shadow-lg'
          >
            <span className='text-lg'>🤖</span>
          </motion.div>
          <div>
            <div className='text-xl font-semibold'>My GPT Assistant</div>
            <div className='text-slate-400 text-sm'>
              Chats • Upload images to S3 Bucket • Add calendar events
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {/* Left panel */}
          <div className='md:col-span-1 space-y-4'>
            {/* Bucket Card */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className='rounded-2xl bg-slate-800/60 p-4 shadow-xl border border-slate-700/40'
            >
              <div className='flex items-center gap-2 mb-3'>
                <UploadCloud className='w-5 h-5' />
                <div className='font-medium'>S3 Photo Bucket</div>
              </div>

              {/* Desktop drag-drop */}
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                className='hidden md:flex items-center justify-center rounded-xl border-2 border-dashed border-slate-600/70 hover:border-slate-400 transition-colors h-36 cursor-pointer'
                onClick={openFilePicker}
                title='Drag & drop or click'
              >
                {isUploading ? (
                  <div className='text-sm'>Uploading…</div>
                ) : (
                  <div className='flex flex-col items-center gap-1'>
                    <ImageIcon className='w-6 h-6' />
                    <div className='text-sm'>Drag & drop images here</div>
                    <div className='text-xs text-slate-400'>
                      or click to select
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile upload button */}
              <button
                className='md:hidden w-full mt-0 rounded-xl bg-slate-700/60 hover:bg-slate-700 py-3 text-sm flex items-center justify-center gap-2'
                onClick={openFilePicker}
              >
                <UploadCloud className='w-4 h-4' /> Choose image(s)
              </button>

              <input
                ref={fileInputRef}
                type='file'
                accept='image/*'
                multiple
                className='hidden'
                onChange={(e) => handleFiles(e.target.files)}
              />

              {/* Upload list */}
              <div className='mt-4 space-y-2 max-h-40 overflow-auto pr-1'>
                {uploads.length === 0 ? (
                  <div className='text-xs text-slate-400'>No uploads yet.</div>
                ) : (
                  uploads.map((u: UploadItem) => (
                    <div
                      key={u.id}
                      className='flex items-center gap-2 text-xs bg-slate-900/50 rounded-lg px-2 py-2'
                    >
                      <CheckCircle2 className='w-3.5 h-3.5' />
                      <div className='truncate'>{u.name}</div>
                      <div className='ml-auto text-slate-400'>
                        {Math.ceil(u.size / 1024)} KB
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Calendar quick action (mock) */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className='rounded-2xl bg-slate-800/60 p-4 shadow-xl border border-slate-700/40'
            >
              <div className='flex items-center gap-2 mb-3'>
                <Calendar className='w-5 h-5' />
                <div className='font-medium'>Quick Calendar</div>
              </div>
              <div className='text-sm text-slate-300'>
                Type a natural sentence in chat like:
              </div>
              <div className='text-xs text-slate-400 mt-1'>
                “Dentist on 9th Dec at 3pm for 30 minutes.”
              </div>
            </motion.div>
          </div>

          {/* Right panel: Chat */}
          <div className='md:col-span-2 flex flex-col rounded-2xl bg-slate-800/60 shadow-xl border border-slate-700/40 overflow-hidden'>
            <div className='flex-1 overflow-auto p-4 space-y-3'>
              {messages.map((m: Message) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === 'assistant'
                      ? 'bg-slate-900/60'
                      : 'bg-indigo-600/70 ml-auto'
                  }`}
                >
                  {m.text === '...' && isThinking ? (
                    <div className='dot-container'>
                      <div className='dot' />
                      <div className='dot' />
                      <div className='dot' />
                    </div>
                  ) : (
                    <span>{m.text}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Footer: Chat Input */}
            <div className='p-3 border-t border-slate-700/40'>
              <div className='flex items-center gap-2'>
                <button
                  className='hidden md:inline-flex rounded-xl px-3 py-2 bg-slate-900/60 border border-slate-700/40 hover:bg-slate-900'
                  onClick={openFilePicker}
                  title='Upload image(s)'
                >
                  <ImageIcon className='w-4 h-4' />
                </button>
                <input
                  className='flex-1 rounded-xl bg-slate-900/60 px-3 py-2 outline-none border border-slate-700/40 focus:border-slate-500'
                  placeholder={'Ask anything… e.g., "Add dentist 9 Dec 3pm"'}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSend()}
                />
                <button
                  disabled={isSending}
                  className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 ${
                    isSending
                      ? 'bg-indigo-400 cursor-not-allowed'
                      : 'bg-indigo-600/80 hover:bg-indigo-600'
                  }`}
                  onClick={onSend}
                >
                  <SendHorizontal className='w-4 h-4' />
                  {isSending ? 'Sending…' : 'Send'}
                </button>
              </div>
              <div className='mt-2 text-[11px] text-slate-400'>
                This is a <strong>mock</strong>. Drag & drop works on desktop;
                tap the bucket on mobile.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
