import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  LogOut,
  MessageCircle,
  Search,
  Send,
  Smile,
  UserPlus,
  Clock,
  CheckSquare,
  Briefcase,
  Users,
  Shield,
  Bell,
  Phone,
  Paperclip,
  Download,
  Newspaper,
  ExternalLink,
  X,
} from "lucide-react";
import { api, apiUrl } from "./api.js";

const initials = (name) =>
  name
    ?.split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
const time = (date) =>
  new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const EMOJIS = ["😀", "😂", "🥰", "😍", "😊", "😎", "🤔", "😢", "😭", "😡", "🥳", "🤩", "😴", "🙈", "👍", "👎", "👏", "🙏", "💪", "🤝", "👋", "👌", "✌️", "🤞", "❤️", "💜", "💙", "💚", "🔥", "✨", "🎉", "🎂", "🚀", "💯", "✅", "⭐", "📌", "💬", "📞", "😂"];
const lastSeenText = (date) => {
  if (!date) return "Offline";
  const value = new Date(date);
  const now = new Date();
  const sameDay = value.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay) return `Last seen today at ${time(value)}`;
  if (value.toDateString() === yesterday.toDateString())
    return `Last seen yesterday at ${time(value)}`;
  return `Last seen ${value.toLocaleDateString([], { day: "numeric", month: "short" })} at ${time(value)}`;
};

function LogoMark({ compact = false }) {
  return <img className={`logo-image ${compact ? "logo-compact" : ""}`} src="/pulsechat-icon.svg" alt="PulseChat" />;
}

function Auth({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const data = await api(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onAuth(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-brand">
        <div className="brand-mark">
          <LogoMark />
        </div>
        <h1>
          Conversations that
          <br />
          <span>keep life in sync.</span>
        </h1>
        <p>
          One beautifully focused space for private chats, shared files,
          everyday plans, and the people who matter most.
        </p>
        <div className="hero-features">
          <span><Shield /> Private by design</span>
          <span><MessageCircle /> Truly real-time</span>
          <span><Paperclip /> Share without limits</span>
        </div>
        <div className="orb orb-one" />
        <div className="orb orb-two" />
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <div className="mobile-logo">
            <LogoMark compact /> PulseChat
          </div>
          <p className="eyebrow">WELCOME TO PULSECHAT</p>
          <h2>
            {mode === "login" ? "Good to see you again" : "Create your account"}
          </h2>
          <p className="muted">
            {mode === "login"
              ? "Sign in to continue your conversations."
              : "Start chatting in less than a minute."}
          </p>
          <form onSubmit={submit}>
            {mode === "register" && (
              <><label>Full name<input name="name" placeholder="Alex Morgan" required /></label><label>Phone number<input name="phone" type="tel" placeholder="+91 98765 43210" required /></label></>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                placeholder="At least 6 characters"
                minLength="6"
                required
              />
            </label>
            {error && <div className="error">{error}</div>}
            <button className="primary" disabled={loading}>
              {loading
                ? "Please wait…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
          <p className="switch">
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}

function Avatar({ person, online, size = "" }) {
  return (
    <div
      className={`avatar ${size}`}
      style={{ background: person?.avatarColor }}
    >
      {initials(person?.name)}
      {online && <i />}
    </div>
  );
}

function Chat({ user, onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [online, setOnline] = useState([]);
  const [typing, setTyping] = useState(false);
  const [search, setSearch] = useState("");
  const [showPeople, setShowPeople] = useState(false);
  const [text, setText] = useState("");
  const [peopleError, setPeopleError] = useState("");
  const [requests, setRequests] = useState([]);
  const [peopleTab, setPeopleTab] = useState("discover");
  const [space, setSpace] = useState("personal");
  const [composeKind, setComposeKind] = useState("text");
  const [scheduleAt, setScheduleAt] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => typeof Notification !== "undefined" && Notification.permission === "granted");
  const [unread, setUnread] = useState({});
  const [toast, setToast] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsUpdatedAt, setNewsUpdatedAt] = useState(null);
  const fileInput = useRef();
  const socket = useRef();
  const activeRef = useRef();
  const bottom = useRef();
  const other = (conversation) =>
    conversation?.members.find((member) => member._id !== user.id);
  const conversationSpace = (conversation) => conversation.spaces?.find((item) => (item.user?._id || item.user) === user.id)?.value || "personal";
  const filtered = useMemo(
    () =>
      conversations.filter((c) => conversationSpace(c) === space &&
        other(c)?.name.toLowerCase().includes(search.toLowerCase())),
    [conversations, search, space],
  );
  useEffect(() => {
    Promise.all([api("/conversations"), api("/users")]).then(([c, u]) => {
      setConversations(c);
      setUsers(u);
      if (c[0]) setActive(c[0]);
    });
  }, []);
  useEffect(() => {
    if (!showPeople) return;
    setPeopleError("");
    Promise.all([api("/users"), api("/friend-requests")])
      .then(([people, incoming]) => { setUsers(people); setRequests(incoming); })
      .catch((error) => setPeopleError(error.message));
  }, [showPeople]);
  useEffect(() => {
    socket.current = io(apiUrl, {
      auth: { token: localStorage.getItem("token") },
    });
    socket.current.on("presence", setOnline);
    socket.current.on("last-seen", ({ userId, lastSeen }) => {
      setConversations((old) =>
        old.map((conversation) => ({
          ...conversation,
          members: conversation.members.map((member) =>
            member._id === userId ? { ...member, lastSeen } : member,
          ),
        })),
      );
      setUsers((old) =>
        old.map((person) =>
          person._id === userId ? { ...person, lastSeen } : person,
        ),
      );
      setActive((current) =>
        current
          ? {
              ...current,
              members: current.members.map((member) =>
                member._id === userId ? { ...member, lastSeen } : member,
              ),
            }
          : current,
      );
    });
    socket.current.on("new-message", (message) => {
      if (message.conversation === activeRef.current?._id)
        setMessages((old) =>
          old.some((m) => m._id === message._id) ? old : [...old, message],
        );
    });
    socket.current.on("typing", (data) => {
      if (data.conversationId === activeRef.current?._id)
        setTyping(data.active);
    });
    socket.current.on("conversation-updated", ({ conversationId, message }) => {
      api("/conversations").then(setConversations);
      const senderId = message?.sender?._id || message?.sender;
      if (!message || senderId === user.id) return;
      const senderName = message.sender?.name || "New message";
      if (conversationId !== activeRef.current?._id) setUnread(old => ({ ...old, [conversationId]: (old[conversationId] || 0) + 1 }));
      const preview = message.text || `Sent a file: ${message.attachment?.name || "Attachment"}`;
      setToast({ name: senderName, text: preview, conversationId });
      window.setTimeout(() => setToast(null), 4200);
      if (Notification.permission === "granted" && (document.hidden || conversationId !== activeRef.current?._id)) {
        const notification = new Notification(`Message from ${senderName}`, { body: preview, tag: conversationId, icon: "/pulsechat-icon.svg" });
        notification.onclick = () => { window.focus(); api("/conversations").then(items => { setConversations(items); const target = items.find(item => item._id === conversationId); if (target) setActive(target); }); notification.close(); };
      }
    });
    return () => socket.current.disconnect();
  }, []);
  useEffect(() => {
    activeRef.current = active;
    setTyping(false);
    if (active) {
      socket.current?.emit("join-conversation", active._id);
      api(`/conversations/${active._id}/messages`).then(setMessages);
      setUnread(old => ({ ...old, [active._id]: 0 }));
    }
  }, [active]);
  useEffect(
    () => bottom.current?.scrollIntoView({ behavior: "smooth" }),
    [messages, typing],
  );
  async function start(userId) {
    try {
      setPeopleError("");
      const selected = users.find((person) => person._id === userId);
      if (selected && !selected.isFriend) {
        await api(`/friends/${userId}`, { method: "POST" });
        setUsers((old) =>
          old.map((person) =>
            person._id === userId ? { ...person, requestStatus: "sent" } : person,
          ),
        );
        setPeopleError("Friend request sent. You can message after they accept it.");
        return;
      }
      const item = await api("/conversations", {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      setConversations((old) => [
        item,
        ...old.filter((conversation) => conversation._id !== item._id),
      ]);
      setActive(item);
      setShowPeople(false);
    } catch (error) {
      setPeopleError(error.message);
    }
  }
  async function addFriend(person) {
    try {
      setPeopleError("");
      await api(`/friends/${person._id}`, { method: "POST" });
      setUsers((old) =>
        old.map((item) =>
          item._id === person._id ? { ...item, isFriend: true } : item,
        ),
      );
    } catch (error) {
      setPeopleError(error.message);
    }
  }
  async function respondToRequest(request, status) {
    await api(`/friend-requests/${request._id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    setRequests(old => old.filter(item => item._id !== request._id));
    if (status === "accepted") setUsers(old => old.map(person => person._id === request.from._id ? { ...person, isFriend: true, requestStatus: null } : person));
  }
  async function updateConversationSettings(values) {
    const updated = await api(`/conversations/${active._id}/settings`, { method: "PATCH", body: JSON.stringify(values) });
    setActive(current => ({ ...current, spaces: updated.spaces, stealthFor: updated.stealthFor }));
    setConversations(old => old.map(item => item._id === active._id ? { ...item, spaces: updated.spaces, stealthFor: updated.stealthFor } : item));
  }
  async function toggleTask(message) {
    const updated = await api(`/messages/${message._id}/task`, { method: "PATCH", body: JSON.stringify({ completed: !message.task?.completed }) });
    setMessages(old => old.map(item => item._id === message._id ? { ...item, task: updated.task } : item));
  }
  async function enableNotifications() {
    if (!("Notification" in window)) return setToast({ name: "Notifications unavailable", text: "This browser does not support desktop notifications." });
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
    setToast({ name: permission === "granted" ? "Notifications enabled" : "Notifications blocked", text: permission === "granted" ? "We’ll alert you when new messages arrive." : "You can allow notifications from your browser settings." });
    window.setTimeout(() => setToast(null), 4200);
  }
  async function uploadFile(event) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file || !active) return;
    if (file.size > 100 * 1024 * 1024) return setToast({ name: "File is too large", text: "Choose a file up to 100 MB." });
    try {
      setUploading(true);
      const body = new FormData(); body.append("file", file);
      const response = await fetch(`${apiUrl}/api/conversations/${active._id}/attachments`, { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, body });
      const attachment = await response.json();
      if (!response.ok) throw new Error(attachment.message || "Upload failed");
      socket.current.emit("send-message", { conversationId: active._id, text: "", attachment });
    } catch (error) { setToast({ name: "Upload failed", text: error.message }); }
    finally { setUploading(false); }
  }
  async function updatePhone() {
    const phone = window.prompt("Enter your phone number with country code", user.phone || "+91 ");
    if (!phone) return;
    try {
      const result = await api("/profile", { method: "PATCH", body: JSON.stringify({ phone }) });
      localStorage.setItem("user", JSON.stringify({ ...user, phone: result.phone }));
      window.location.reload();
    } catch (error) { setToast({ name: "Could not save number", text: error.message }); }
  }
  async function openCurrentAffairs() {
    setShowNews(true);
    if (news.length) return;
    await loadNews();
  }
  async function loadNews(force = false) {
    setNewsLoading(true);
    try { setNews(await api(`/current-affairs${force ? '?refresh=1' : ''}`)); setNewsUpdatedAt(new Date()); }
    catch (error) { setToast({ name: 'Could not load current affairs', text: error.message }); }
    finally { setNewsLoading(false); }
  }
  useEffect(() => {
    if (!showNews) return;
    const timer = window.setInterval(() => loadNews(true), 60 * 1000);
    return () => window.clearInterval(timer);
  }, [showNews]);
  function send(event) {
    event.preventDefault();
    const value = text.trim();
    if (!value || !active) return;
    setText("");
    setShowEmoji(false);
    socket.current.emit("typing", {
      conversationId: active._id,
      active: false,
    });
    socket.current.emit("send-message", {
      conversationId: active._id,
      text: value,
      kind: composeKind,
      assignee: composeKind === "task" ? person?._id : undefined,
      scheduledFor: scheduleAt || undefined,
    });
    setComposeKind("text"); setScheduleAt("");
  }
  const person = other(active);
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <header className="logo">
          <div className="brand-mark small">
            <LogoMark compact />
          </div>
          <span>PulseChat</span>
        </header>
        <div className="profile">
          <Avatar person={user} />
          <div>
            <strong>{user.name}</strong>
            <small>{user.email}</small><button className="phone-setup" onClick={updatePhone}>{user.phone || "+ Add phone number"}</button>
          </div>
          <button className="icon-button" title="Sign out" onClick={onLogout}>
            <LogOut />
          </button>
          <button className={`icon-button notification-toggle ${notificationsEnabled ? "enabled" : ""}`} title={notificationsEnabled ? "Message notifications enabled" : "Enable message notifications"} onClick={enableNotifications}>
            <Bell />
          </button>
        </div>
        <div className="side-heading">
          <span>Messages</span>
          <button
            className="icon-button accent"
            onClick={() => setShowPeople(true)}
            title="Add friend"
          >
            <UserPlus />
          </button>
        </div>
        <div className="space-tabs">
          <button className={space === "personal" ? "active" : ""} onClick={() => setSpace("personal")}><Users />Personal</button>
          <button className={space === "work" ? "active" : ""} onClick={() => setSpace("work")}><Briefcase />Work</button>
        </div>
        <button className="news-entry" onClick={openCurrentAffairs}><Newspaper/><span>Current Affairs</span><i>LIVE</i></button>
        <label className="search">
          <Search />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
          />
        </label>
        <div className="conversation-list">
          {filtered.map((c) => {
            const p = other(c);
            return (
              <button
                key={c._id}
                className={`conversation ${active?._id === c._id ? "active" : ""}`}
                onClick={() => setActive(c)}
              >
                <Avatar person={p} online={online.includes(p._id)} />
                <div>
                  <strong>{p.name}</strong>
                  <p>{c.lastMessage?.text || (c.lastMessage?.attachment ? `📎 ${c.lastMessage.attachment.name}` : "Start the conversation")}</p>
                </div>
                <small>{c.lastMessage && time(c.lastMessage.createdAt)}</small>
                {unread[c._id] > 0 && <b className="unread-badge">{unread[c._id] > 9 ? "9+" : unread[c._id]}</b>}
              </button>
            );
          })}
          {!filtered.length && (
            <div className="empty-side">
              No conversations yet.
              <br />
              Add a friend to begin.
            </div>
          )}
        </div>
      </aside>
      <section className="chat-panel">
        {active ? (
          <>
            <header className="chat-header">
              <Avatar person={person} online={online.includes(person?._id)} />
              <div>
                <strong>{person?.name}</strong>
                <small>
                  {online.includes(person?._id)
                    ? "Online now"
                    : lastSeenText(person?.lastSeen)}
                </small>
              </div>
              <div className="chat-actions">
                <a className={`privacy-action ${person?.phone ? "" : "disabled"}`} href={person?.phone ? `tel:${person.phone}` : undefined} title={person?.phone ? `Call ${person.phone}` : "This friend has not added a phone number"}><Phone /></a>
                <button className="privacy-action" title="Move between Personal and Work" onClick={() => updateConversationSettings({ space: conversationSpace(active) === "work" ? "personal" : "work" })}>{conversationSpace(active) === "work" ? <Briefcase /> : <Users />}</button>
                <button className={`privacy-action ${active.stealthFor?.some(id => (id._id || id) === user.id) ? "enabled" : ""}`} title="Stealth mode hides your typing indicator in this chat" onClick={() => updateConversationSettings({ stealth: !active.stealthFor?.some(id => (id._id || id) === user.id) })}><Shield /></button>
              </div>
            </header>
            <div className="messages">
              <div className="day-label">Conversation</div>
              {messages.map((message, index) => {
                const mine = (message.sender._id || message.sender) === user.id;
                const showAvatar =
                  !mine &&
                  (index === 0 ||
                    (messages[index - 1].sender._id ||
                      messages[index - 1].sender) !==
                      (message.sender._id || message.sender));
                return (
                  <div
                    key={message._id}
                    className={`message-row ${mine ? "mine" : ""}`}
                  >
                    {!mine &&
                      (showAvatar ? (
                        <Avatar person={message.sender} size="tiny" />
                      ) : (
                        <div className="avatar-space" />
                      ))}
                    <div>
                      <div onClick={() => message.kind === "task" && toggleTask(message)} className={`bubble ${message.kind === "task" ? "task-bubble" : ""} ${message.task?.completed ? "completed" : ""}`}>{message.kind === "task" && <CheckSquare />}{message.text}{message.attachment && <a className="file-card" href={`${apiUrl}${message.attachment.url}`} target="_blank" rel="noreferrer" download><span><Paperclip/><b>{message.attachment.name}</b><small>{(message.attachment.size / 1024 / 1024).toFixed(1)} MB</small></span><Download/></a>}</div>
                      <span className="message-time">
                        {time(message.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
              {typing && (
                <div className="typing">
                  <span />
                  <span />
                  <span />
                </div>
              )}
              <div ref={bottom} />
            </div>
            <form className="composer" onSubmit={send}>
              <input ref={fileInput} className="file-input" type="file" onChange={uploadFile} />
              <button type="button" className="icon-button" disabled={uploading} title="Attach a file up to 100 MB" onClick={() => fileInput.current?.click()}><Paperclip /></button>
              <button type="button" className={`icon-button ${showEmoji ? "selected" : ""}`} title="Choose emoji" onClick={() => setShowEmoji(!showEmoji)}>
                <Smile />
              </button>
              {showEmoji && <div className="emoji-picker"><header><strong>Emojis</strong><button type="button" onClick={() => setShowEmoji(false)}><X /></button></header><div>{EMOJIS.map((emoji, index) => <button type="button" key={`${emoji}-${index}`} onClick={() => setText(value => `${value}${emoji}`)}>{emoji}</button>)}</div></div>}
              <input
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  socket.current.emit("typing", {
                    conversationId: active._id,
                    active: Boolean(e.target.value),
                  });
                }}
                placeholder={`Message ${person?.name}…`}
              />
              <button type="button" className={`icon-button ${composeKind === "task" ? "selected" : ""}`} title="Create task" onClick={() => setComposeKind(composeKind === "task" ? "text" : "task")}><CheckSquare /></button>
              <label className={`schedule-control ${scheduleAt ? "selected" : ""}`} title="Schedule message"><Clock /><input type="datetime-local" value={scheduleAt} min={new Date().toISOString().slice(0, 16)} onChange={event => setScheduleAt(event.target.value)} /></label>
              <button className="send" disabled={!text.trim()}>
                <Send />
              </button>
            </form>
          </>
        ) : (
          <div className="welcome">
            <div className="welcome-icon">
              <MessageCircle />
            </div>
            <h2>Your conversations live here</h2>
            <p>Add a registered user as a friend, then start chatting.</p>
            <button
              className="primary compact"
              onClick={() => setShowPeople(true)}
            >
              Add a friend
            </button>
          </div>
        )}
      </section>
      {showPeople && (
        <div className="modal-backdrop" onClick={() => setShowPeople(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <p className="eyebrow">ADD FRIEND</p>
                <h2>Choose someone</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setShowPeople(false)}
              >
                <X />
              </button>
            </header>
            <div className="people-tabs"><button className={peopleTab === "discover" ? "active" : ""} onClick={() => setPeopleTab("discover")}>Discover</button><button className={peopleTab === "requests" ? "active" : ""} onClick={() => setPeopleTab("requests")}>Requests {requests.length ? `(${requests.length})` : ""}</button></div>
            {peopleError && <div className="error">{peopleError}</div>}
            <div className="people">
              {peopleTab === "discover" && users.map((p) => (
                <button key={p._id} onClick={() => start(p._id)}>
                  <Avatar person={p} online={online.includes(p._id)} />
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      {p.isFriend ? "Friend · Click to message" : p.requestStatus === "sent" ? "Request sent" : `@${p.username || "user"}`}
                    </small>
                  </div>
                </button>
              ))}
              {peopleTab === "requests" && requests.map(request => <div className="request-row" key={request._id}><Avatar person={request.from}/><div><strong>{request.from.name}</strong><small>@{request.from.username || "user"}</small></div><button onClick={() => respondToRequest(request, "accepted")}>Accept</button><button className="decline" onClick={() => respondToRequest(request, "declined")}>Decline</button></div>)}
              {peopleTab === "requests" && !requests.length && <div className="empty-people"><Shield/><strong>No pending requests</strong><p>Unknown senders stay screened until you approve them.</p></div>}
              {peopleTab === "discover" && !users.length && (
                <div className="empty-people">
                  <UserPlus />
                  <strong>No other registered users</strong>
                  <p>
                    Create a second account in another browser or incognito
                    window, then reopen this dialog.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showNews && <div className="modal-backdrop" onClick={() => setShowNews(false)}><section className="modal news-modal" onClick={event => event.stopPropagation()}><header><div><p className="eyebrow live-label"><i/> LIVE UPDATES</p><h2>Current Affairs</h2><p className="news-subtitle">A quick look at what’s happening now.</p></div><button className="icon-button" onClick={() => setShowNews(false)}><X/></button></header>{newsLoading && !news.length ? <div className="news-loading"><span/><span/><span/><p>Fetching the latest stories…</p></div> : <div className="news-grid">{news.map((story, index) => <a href={story.link} target="_blank" rel="noreferrer" className="news-card" key={story.id}><span className="news-number">{String(index + 1).padStart(2, '0')}</span><div><small>{story.source} · {new Date(story.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small><h3>{story.title}</h3></div><ExternalLink/></a>)}</div>}<footer><span>{newsLoading ? 'Updating live feed…' : `Live · Updated ${newsUpdatedAt ? newsUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'just now'} · Auto-refreshes every minute`}</span><button disabled={newsLoading} onClick={() => loadNews(true)}>Refresh now</button></footer></section></div>}
      {toast && <button className="message-toast" onClick={() => { const target = conversations.find(item => item._id === toast.conversationId); if (target) setActive(target); setToast(null); }}><span className="toast-icon"><Bell /></span><span><strong>{toast.name}</strong><small>{toast.text}</small></span><X /></button>}
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "null"),
  );
  function logout() {
    localStorage.clear();
    setUser(null);
  }
  return user ? (
    <Chat user={user} onLogout={logout} />
  ) : (
    <Auth onAuth={setUser} />
  );
}
