import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, BellOff, AlertTriangle, Clock, TrendingUp, CheckCircle, X
} from 'lucide-react';
import { api } from '../services/api';

const TYPE_ICONS = {
  alert: AlertTriangle,
  warning: AlertTriangle,
  deadline: Clock,
  trend: TrendingUp,
  success: CheckCircle,
};

function relativeTime(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef(null);
  const btnRef = useRef(null);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });

  const updatePanelPos = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPanelPos({
        top: rect.bottom + 8,
        left: Math.max(8, rect.left),
      });
    }
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(Array.isArray(data) ? data : data.items ?? []);
    } catch {
      /* silent */
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const data = await api.getUnreadCount();
      setUnreadCount(typeof data === 'number' ? data : data.unread_count ?? data.count ?? 0);
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) {
      fetchNotifications();
      updatePanelPos();
    }
  }, [open, updatePanelPos]);

  useEffect(() => {
    function handleClickOutside(e) {
      const clickedPanel = panelRef.current && panelRef.current.contains(e.target);
      const clickedBtn = btnRef.current && btnRef.current.contains(e.target);
      if (!clickedPanel && !clickedBtn) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleMarkRead = async (id, link) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      /* silent */
    }
    if (link) {
      setOpen(false);
      navigate(link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      /* silent */
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(prev => !prev)}
        className="relative p-2 rounded-lg text-primary-200 hover:bg-primary-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="fixed w-96 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-2xl border border-gray-200 z-[100] overflow-hidden"
          style={{ top: panelPos.top, left: panelPos.left }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Mark all read
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <BellOff className="w-10 h-10 mb-3" />
                <p className="text-sm font-medium">No notifications</p>
              </div>
            ) : (
              notifications.map(n => {
                const Icon = TYPE_ICONS[n.type] || Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleMarkRead(n.id, n.link)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="mt-0.5 p-1.5 rounded-lg bg-gray-100 text-gray-600 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                        {n.message}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {relativeTime(n.created_at)}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
}
