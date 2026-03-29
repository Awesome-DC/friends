// client/src/hooks/useNotifications.js
// ─────────────────────────────────────────────────────────────
// Handles:
//  - Requesting browser notification permission
//  - Polling the backend every 8s for new notifications
//  - Firing a real OS-level browser notification when a new one arrives
//  - Returning state (unread count, all notifs, permission status)
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { getNotifications, getUnreadCount, markNotificationsRead } from "../lib/api";

export function useNotifications(quizId, creatorName) {
  const [notifs, setNotifs]       = useState([]);
  const [unread, setUnread]       = useState(0);
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  // Track the IDs we've already fired a browser notification for
  // so we don't re-fire on every poll
  const seenIds = useRef(new Set());
  // Track whether this is the very first poll (don't notify for existing ones)
  const isFirstPoll = useRef(true);

  // ── Request permission ─────────────────────────────────────
  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "denied";
    if (Notification.permission === "granted") return "granted";
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  // ── Fire a real browser notification ──────────────────────
  function fireBrowserNotif(message) {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    const notif = new Notification(`🔔 FriendQuiz — ${creatorName}`, {
      body: message,
      icon: "https://em-content.zobj.net/source/apple/354/bell_1f514.png",
      badge: "https://em-content.zobj.net/source/apple/354/bell_1f514.png",
      tag: "friendquiz-notif",   // replaces previous instead of stacking
      renotify: true,
    });

    // Click brings browser tab into focus
    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    // Auto-close after 6 seconds
    setTimeout(() => notif.close(), 6000);
  }

  // ── Poll backend ───────────────────────────────────────────
  useEffect(() => {
    if (!quizId) return;

    let alive = true;

    async function poll() {
      if (!alive) return;
      try {
        const [allNotifs, unreadData] = await Promise.all([
          getNotifications(quizId),
          getUnreadCount(quizId),
        ]);

        if (!alive) return;

        // On the very first poll, seed seenIds with existing notifs
        // so we don't spam notifications for old results
        if (isFirstPoll.current) {
          allNotifs.forEach(n => seenIds.current.add(n.id));
          isFirstPoll.current = false;
          setNotifs(allNotifs);
          setUnread(unreadData.count);
          return;
        }

        // Find truly new notifications
        const newOnes = allNotifs.filter(n => !seenIds.current.has(n.id));

        // Fire a browser notification for each new one
        newOnes.forEach(n => {
          seenIds.current.add(n.id);
          fireBrowserNotif(n.message);
        });

        setNotifs(allNotifs);
        setUnread(unreadData.count);

      } catch {
        // silently ignore poll errors
      }
    }

    poll();
    const interval = setInterval(poll, 8000);
    return () => { alive = false; clearInterval(interval); };

  }, [quizId]);

  // ── Mark all as read ───────────────────────────────────────
  const markRead = useCallback(async () => {
    try {
      await markNotificationsRead(quizId);
      setUnread(0);
      // Update local state so panel shows them as read
      setNotifs(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch {}
  }, [quizId]);

  return {
    notifs,
    unread,
    permission,
    requestPermission,
    markRead,
    refetch: async () => {
      const n = await getNotifications(quizId);
      setNotifs(n);
    },
  };
}
