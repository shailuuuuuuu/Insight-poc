import { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';

const SUGGESTIONS = [
  'Which students need help?',
  'What to focus on today?',
  'Group students by risk',
  'Show overall progress',
];

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ResponseContent({ message }) {
  if (message.response_type === 'table' && Array.isArray(message.data)) {
    const keys = message.data.length > 0 ? Object.keys(message.data[0]) : [];
    return (
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              {keys.map(k => (
                <th key={k} className="text-left px-2 py-1 border-b border-gray-200 font-semibold text-gray-600 capitalize">
                  {k.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {message.data.map((row, i) => (
              <tr key={i} className="border-b border-gray-50">
                {keys.map(k => (
                  <td key={k} className="px-2 py-1 text-gray-700">{String(row[k] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (message.response_type === 'cards' && Array.isArray(message.data)) {
    return (
      <div className="space-y-2 mt-2">
        {message.data.map((card, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
            <p className="font-medium text-sm text-gray-900">{card.name || card.student_name}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              {card.grade && <span>Grade {card.grade}</span>}
              {card.risk && (
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                  card.risk === 'high' ? 'bg-red-100 text-red-700' :
                  card.risk === 'moderate' ? 'bg-amber-100 text-amber-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {card.risk}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-sm whitespace-pre-wrap">{message.text}</p>;
}

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hi! I'm your AI Teaching Assistant. Ask me anything about your students, assessments, or what to focus on today.",
      response_type: 'text',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = async (text) => {
    const query = text || input.trim();
    if (!query || sending) return;

    const userMsg = { role: 'user', text: query, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await api.askAssistant(query);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: res.text || res.message || '',
          response_type: res.response_type || 'text',
          data: res.data,
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: "Sorry, I couldn't process that request. Please try again.",
          response_type: 'text',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          open
            ? 'bg-gray-600 hover:bg-gray-700 rotate-90'
            : 'bg-purple-600 hover:bg-purple-700'
        }`}
      >
        {open ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageSquare className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[400px] max-w-full bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-purple-600 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm">AI Teaching Assistant</h2>
              <p className="text-xs text-purple-200">Powered by AI</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-purple-500 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message History */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                <div className="flex items-end gap-2">
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md'
                    }`}
                  >
                    <ResponseContent message={msg} />
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                  )}
                </div>
                <p className={`text-[10px] text-gray-400 mt-1 ${msg.role === 'user' ? 'text-right mr-8' : 'ml-8'}`}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-end gap-2">
                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Queries */}
        <div className="px-4 py-2 border-t border-gray-100 flex-shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                disabled={sending}
                className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium hover:bg-purple-100 transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="px-4 py-3 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              disabled={sending}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
