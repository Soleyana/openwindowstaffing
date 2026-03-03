import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { getMyNotifications, markNotificationRead, markAllNotificationsRead } from "../api/notifications";

const BellIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await getMyNotifications();
      setList(res.data || []);
      setUnreadCount(res.unreadCount ?? 0);
    } catch {
      setList([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open]);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setList((prev) =>
        prev.map((n) => (n._id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  };

  const handleMarkAllRead = async () => {
    if (loading || unreadCount === 0) return;
    setLoading(true);
    try {
      await markAllNotificationsRead();
      setList((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const unread = list.filter((n) => !n.readAt);

  return (
    <div className="notification-bell-wrap" ref={ref}>
      <button
        type="button"
        className="notification-bell-btn"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="notification-bell-badge" aria-hidden="true">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="notification-bell-dropdown">
          <div className="notification-bell-header">
            <span className="notification-bell-title">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-bell-mark-all"
                onClick={handleMarkAllRead}
                disabled={loading}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="notification-bell-list">
            {list.length === 0 ? (
              <div className="notification-bell-empty">No notifications</div>
            ) : (
              list.slice(0, 8).map((n) => (
                <Link
                  key={n._id}
                  to={n.url || "/notifications"}
                  className={`notification-bell-item ${n.readAt ? "" : "notification-bell-item--unread"}`}
                  onClick={() => {
                    if (!n.readAt) handleMarkRead(n._id);
                    setOpen(false);
                  }}
                >
                  <div className="notification-bell-item-title">{n.title}</div>
                  {n.body && <div className="notification-bell-item-body">{n.body}</div>}
                  <div className="notification-bell-item-time">
                    {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""}
                  </div>
                </Link>
              ))
            )}
          </div>
          <Link
            to="/notifications"
            className="notification-bell-footer"
            onClick={() => setOpen(false)}
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
