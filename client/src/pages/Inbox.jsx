import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listThreads, getThread, sendMessage, markThreadRead, getStartOptions, createOrFindThreadByJobOrApplication } from "../api/messages";
import { useToast } from "../context/ToastContext";
import { ROLES } from "../constants/roles";
import { useModalA11y } from "../hooks/useModalA11y";

function threadPreviewText(thread) {
  const preview = thread?.lastMessagePreview;
  return preview && String(preview).trim() ? preview : "No messages yet";
}

export default function Inbox() {
  const { user, authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const threadIdFromUrl = searchParams.get("thread");
  const toast = useToast();
  const modalRef = useRef(null);
  const newMessageTriggerRef = useRef(null);
  const [threads, setThreads] = useState([]);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [startOptions, setStartOptions] = useState(null);
  const [startOptionsLoading, setStartOptionsLoading] = useState(false);
  const [creatingThreadId, setCreatingThreadId] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);
  const [startOptionsFilter, setStartOptionsFilter] = useState("");
  const [threadsError, setThreadsError] = useState(null);

  const loadThreads = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setThreadsError(null);
      const res = await listThreads({});
      const threadsData = Array.isArray(res) ? res : (res?.data ?? []);
      setThreads(Array.isArray(threadsData) ? threadsData : []);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to load inbox";
      setThreadsError(msg);
      toast.show(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  const openNewMessageModal = useCallback(() => {
    setNewMessageOpen(true);
    setStartOptions(null);
    setStartOptionsLoading(true);
    setStartOptionsFilter("");
  }, []);

  useModalA11y(newMessageOpen, modalRef, newMessageTriggerRef, () => setNewMessageOpen(false));

  useEffect(() => {
    if (newMessageOpen && modalRef.current && !startOptionsLoading) {
      const firstFocusable = modalRef.current.querySelector("input, button");
      firstFocusable?.focus();
    }
  }, [newMessageOpen, startOptionsLoading]);

  useEffect(() => {
    if (!newMessageOpen || !user) return;
    let cancelled = false;
    getStartOptions()
      .then((res) => {
        if (cancelled) return;
        const opts = res?.data ?? res ?? {};
        setStartOptions(opts);
      })
      .catch((err) => {
        if (!cancelled) toast.show(err.response?.data?.message || "Failed to load options", "error");
      })
      .finally(() => {
        if (!cancelled) setStartOptionsLoading(false);
      });
    return () => { cancelled = true; };
  }, [newMessageOpen, user, toast]);

  const handleStartThread = useCallback(
    async (applicationId) => {
      if (!applicationId) return;
      try {
        setCreatingThreadId(applicationId);
        const threadId = await createOrFindThreadByJobOrApplication({ applicationId });
        if (threadId) {
          setNewMessageOpen(false);
          navigate(`/inbox?thread=${threadId}`);
        } else {
          toast.show("Could not start conversation", "error");
        }
      } catch (err) {
        toast.show(err.response?.data?.message || err.message || "Could not start message", "error");
      } finally {
        setCreatingThreadId(null);
      }
    },
    [navigate, toast]
  );

  /* Open thread from ?thread= even when threads list is empty (e.g. newly created thread) */
  useEffect(() => {
    if (!threadIdFromUrl || !user) return;
    let cancelled = false;
    const t = threads.find((x) => x._id === threadIdFromUrl);
    if (t) setSelectedThread(t);
    setMessageLoading(true);
    getThread(threadIdFromUrl)
      .then(async (res) => {
        if (cancelled) return;
        const threadData = res?.data ?? res;
        const thread = threadData?.thread ?? threadData;
        const msgList = threadData?.messages ?? thread?.messages ?? [];
        if (thread) {
          setSelectedThread(thread);
          setMessages(msgList);
          try {
            await markThreadRead(threadIdFromUrl);
          } catch {
            /* ignore */
          }
          loadThreads();
          setSearchParams({});
        }
      })
      .catch((err) => {
        if (!cancelled) toast.show(err.response?.data?.message || "Failed to load thread", "error");
        setSearchParams({});
      })
      .finally(() => {
        if (!cancelled) setMessageLoading(false);
      });
    return () => { cancelled = true; };
  }, [threadIdFromUrl, threads, user, toast, loadThreads]);

  const selectThread = async (thread) => {
    setSelectedThread(thread);
    setComposerText("");
    try {
      setMessageLoading(true);
      const res = await getThread(thread._id);
      setMessages(res.data?.messages || []);
      await markThreadRead(thread._id);
      loadThreads();
    } catch (err) {
      toast.show(err.response?.data?.message || "Failed to load messages", "error");
    } finally {
      setMessageLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = composerText.trim();
    if (!text || !selectedThread || sending) return;
    try {
      setSending(true);
      const res = await sendMessage(selectedThread._id, text);
      setMessages((prev) => [...prev, res.data]);
      setComposerText("");
      loadThreads();
    } catch (err) {
      toast.show(err.response?.data?.message || "Failed to send", "error");
    } finally {
      setSending(false);
    }
  };

  const filterStartOptions = (items) => {
    const q = (startOptionsFilter || "").trim().toLowerCase();
    if (!q) return items;
    return items.filter((opt) => {
      const name = (opt.candidateName || opt.jobTitle || opt.recruiterName || opt.companyName || "").toLowerCase();
      const email = (opt.candidateEmail || "").toLowerCase();
      const job = (opt.jobTitle || "").toLowerCase();
      const company = (opt.companyName || "").toLowerCase();
      return name.includes(q) || email.includes(q) || job.includes(q) || company.includes(q);
    });
  };

  const otherParticipant = (thread) => {
    const p = thread.participants?.find(
      (x) => x.userId?._id?.toString() !== user?._id?.toString()
    );
    return p?.userId?.name || p?.userId?.email || "Unknown";
  };

  if (authLoading) {
    return (
      <div className="inbox-page">
        <div className="inbox-loading" aria-live="polite">
          <span className="auth-loading-spinner" aria-hidden="true" />
          <p>Loading inbox…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="inbox-page">
        <p>Please sign in to view your inbox.</p>
      </div>
    );
  }

  return (
    <div className="inbox-page">
      <div className="inbox-header-row">
        <h1 className="inbox-title">Inbox</h1>
        <button
          ref={newMessageTriggerRef}
          type="button"
          className="inbox-new-message-btn"
          onClick={openNewMessageModal}
          aria-label="Start new message"
        >
          New Message
        </button>
      </div>
      {newMessageOpen && (
        <div className="inbox-modal-backdrop" onClick={() => setNewMessageOpen(false)} aria-hidden="true" />
      )}
      {newMessageOpen && (
        <div ref={modalRef} className="inbox-modal" role="dialog" aria-labelledby="new-message-title" aria-modal="true" tabIndex={-1}>
          <h2 id="new-message-title" className="inbox-modal-title">
            {user?.role === ROLES.APPLICANT ? "Message recruiter" : "Message candidate"}
          </h2>
          <button type="button" className="inbox-modal-close" onClick={() => setNewMessageOpen(false)} aria-label="Close">×</button>
          {startOptionsLoading ? (
            <p className="inbox-modal-loading">Loading…</p>
          ) : user?.role === ROLES.APPLICANT ? (
            <>
              <input
                type="search"
                placeholder="Search by job title, company, recruiter…"
                value={startOptionsFilter}
                onChange={(e) => setStartOptionsFilter(e.target.value)}
                className="inbox-modal-search"
                aria-label="Filter applications"
              />
              <ul className="inbox-modal-list">
                {filterStartOptions(startOptions?.applications || []).length === 0 ? (
                  <li className="inbox-modal-empty">
                    {(startOptions?.applications || []).length === 0
                      ? "No applications to message from. Apply to jobs first."
                      : "No matches. Try a different search."}
                  </li>
                ) : (
                  filterStartOptions(startOptions?.applications || [], "applicant").map((opt) => (
                  <li key={opt.applicationId}>
                    <button
                      type="button"
                      className="inbox-modal-option"
                      onClick={() => handleStartThread(opt.applicationId)}
                      disabled={creatingThreadId === opt.applicationId}
                    >
                      <span className="inbox-modal-option-title">{opt.jobTitle}</span>
                      <span className="inbox-modal-option-meta">{opt.companyName} • {opt.recruiterName}</span>
                      {creatingThreadId === opt.applicationId && <span className="inbox-modal-option-loading">Opening…</span>}
                    </button>
                  </li>
                  ))
                )}
              </ul>
            </>
          ) : (
            <>
              <input
                type="search"
                placeholder="Search by candidate name, email, job title…"
                value={startOptionsFilter}
                onChange={(e) => setStartOptionsFilter(e.target.value)}
                className="inbox-modal-search"
                aria-label="Filter candidates"
              />
              <ul className="inbox-modal-list">
                {filterStartOptions(startOptions?.candidates || [], "recruiter").length === 0 ? (
                  <li className="inbox-modal-empty">
                    {(startOptions?.candidates || []).length === 0
                      ? "No candidates to message yet. Applicants will appear here."
                      : "No matches. Try a different search."}
                  </li>
                ) : (
                  filterStartOptions(startOptions?.candidates || []).map((opt) => (
                  <li key={opt.applicationId}>
                    <button
                      type="button"
                      className="inbox-modal-option"
                      onClick={() => handleStartThread(opt.applicationId)}
                      disabled={creatingThreadId === opt.applicationId}
                    >
                      <span className="inbox-modal-option-title">{opt.candidateName}</span>
                      <span className="inbox-modal-option-meta">{opt.jobTitle}</span>
                      {creatingThreadId === opt.applicationId && <span className="inbox-modal-option-loading">Opening…</span>}
                    </button>
                  </li>
                  ))
                )}
              </ul>
            </>
          )}
        </div>
      )}
      <div className="inbox-layout">
        <aside className="inbox-sidebar">
          {threadsError && (
            <div className="inbox-error-banner">
              <p>{threadsError}</p>
              <button type="button" className="inbox-placeholder-link" onClick={() => loadThreads()}>
                Retry
              </button>
            </div>
          )}
          {loading && !threadsError ? (
            <p>Loading…</p>
          ) : threads.length === 0 ? (
            <div className="inbox-empty">
              <p>No conversations yet.</p>
              <button type="button" className="inbox-placeholder-link" onClick={openNewMessageModal}>
                New Message
              </button>
            </div>
          ) : (
            <ul className="inbox-thread-list">
              {threads.map((t) => (
                <li
                  key={t._id}
                  className={`inbox-thread-item ${selectedThread?._id === t._id ? "selected" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => selectThread(t)}
                    className="inbox-thread-btn"
                  >
                    <div className="inbox-thread-content">
                      <span className="inbox-thread-name" title={otherParticipant(t)}>{otherParticipant(t)}</span>
                      <span className="inbox-thread-preview">{threadPreviewText(t)}</span>
                    </div>
                    {t.unreadCount > 0 && (
                      <span className="inbox-unread-badge">{t.unreadCount}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <main className="inbox-main">
          {!selectedThread ? (
            <div className="inbox-placeholder">
              Select a conversation or <button type="button" className="inbox-placeholder-link" onClick={openNewMessageModal}>start a new message</button>.
            </div>
          ) : (
            <>
              <div className="inbox-messages">
                {messageLoading ? (
                  <p>Loading messages…</p>
                ) : messages.length === 0 ? (
                  <p className="inbox-no-messages">No messages yet.</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m._id}
                      className={`inbox-msg ${m.senderId?._id?.toString() === user._id ? "sent" : "received"}`}
                    >
                      <span className="inbox-msg-sender">
                        {m.senderId?.name || m.senderId?.email || "Unknown"}
                      </span>
                      <p className="inbox-msg-body">{m.body}</p>
                      <span className="inbox-msg-time">
                        {m.createdAt
                          ? new Date(m.createdAt).toLocaleString()
                          : ""}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleSend} className="inbox-composer">
                <textarea
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  placeholder="Type a message…"
                  rows={2}
                  disabled={sending}
                />
                <button type="submit" disabled={sending || !composerText.trim()}>
                  {sending ? "Sending…" : "Send"}
                </button>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
