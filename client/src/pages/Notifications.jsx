import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMyNotifications, markNotificationRead, markAllNotificationsRead } from "../api/notifications";

export default function Notifications() {
  const [list, setList] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await getMyNotifications();
      setList(res.data || []);
      setUnreadCount(res.unreadCount ?? 0);
    } catch {
      setList([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

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
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setList((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <h1 className="dashboard-title">Notifications</h1>
        <p className="dashboard-subtitle">
          {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        </p>
        {unreadCount > 0 && (
          <button
            type="button"
            className="btn"
            onClick={handleMarkAllRead}
            disabled={markingAll}
            style={{ marginTop: "0.75rem" }}
          >
            {markingAll ? "Marking…" : "Mark all as read"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="skeleton-block" style={{ height: 200 }} />
      ) : list.length === 0 ? (
        <div className="dashboard-hero" style={{ textAlign: "center", color: "#64748b" }}>
          No notifications yet.
        </div>
      ) : (
        <ul className="notifications-list">
          {list.map((n) => (
            <li key={n._id} className={`notifications-item ${n.readAt ? "" : "notifications-item--unread"}`}>
              <Link
                to={n.url || "/notifications"}
                className="notifications-item-link"
                onClick={() => !n.readAt && handleMarkRead(n._id)}
              >
                <div className="notifications-item-title">{n.title}</div>
                {n.body && <div className="notifications-item-body">{n.body}</div>}
                <div className="notifications-item-meta">
                  {n.createdAt && new Date(n.createdAt).toLocaleString()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
