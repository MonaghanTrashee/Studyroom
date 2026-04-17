import { useEffect, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Link } from "react-router-dom";
import {
  DEFAULT_SETTINGS,
  loadPomodoroTracker,
  loadWaterTracker,
  savePomodoroTracker,
  saveWaterTracker,
} from "../lib/userPreferences";

const apiBaseUrl = import.meta.env.VITE_API_URL || ''
const apiUrl = (path) => `${apiBaseUrl}${path}`

export default function Workspace() {
  const { user } = useAuth0();
  const primaryButtonClass =
    "rounded-full bg-[#e45a92] px-5 py-2 text-white transition hover:bg-[#ffacac] disabled:cursor-not-allowed disabled:bg-[#d8a6bc]";
  const [tasks, setTasks] = useState([]);
  const [checkedTaskIds, setCheckedTaskIds] = useState({});
  const [newTask, setNewTask] = useState("");
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventError, setEventError] = useState("");
  const [eventsError, setEventsError] = useState("");
  const [isApiOffline, setIsApiOffline] = useState(false);
  const [lastDrinkAt, setLastDrinkAt] = useState(() => Date.now());
  const [waterCount, setWaterCount] = useState(0);
  const [waterSnoozedUntil, setWaterSnoozedUntil] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [pomodoroMinutesInput, setPomodoroMinutesInput] = useState("25");
  const [pomodoroSecondsLeft, setPomodoroSecondsLeft] = useState(25 * 60);
  const [pomodoroMode, setPomodoroMode] = useState("focus");
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [pomodoroEndsAt, setPomodoroEndsAt] = useState(null);
  const [isPomodoroAlertOpen, setIsPomodoroAlertOpen] = useState(false);
  const [pomodoroAlertText, setPomodoroAlertText] = useState("Timer ended!");
  const [hasLoadedPomodoro, setHasLoadedPomodoro] = useState(false);
  const [hasLoadedCheckedTasks, setHasLoadedCheckedTasks] = useState(false);
  const checkedTasksStorageKey = user?.sub
    ? `studyroom-checked-tasks:${user.sub}`
    : null;

  const pomodoroStateRef = useRef({});
  useEffect(() => {
    pomodoroStateRef.current = {
      minutesInput: pomodoroMinutesInput,
      mode: pomodoroMode,
      isRunning: isPomodoroRunning,
      secondsLeft: isPomodoroRunning && pomodoroEndsAt
        ? Math.max(0, Math.ceil((pomodoroEndsAt - Date.now()) / 1000))
        : pomodoroSecondsLeft,
      endsAt: pomodoroEndsAt,
    };
  }, [pomodoroMinutesInput, pomodoroMode, isPomodoroRunning, pomodoroSecondsLeft, pomodoroEndsAt]);

  useEffect(() => {
    if (!user?.sub) return;
    return () => {
      savePomodoroTracker(user.sub, pomodoroStateRef.current);
    };
  }, [user?.sub]);

  const reminderIntervalMs = settings.waterReminderMinutes * 60 * 1000;
  const msUntilReminder = Math.max(
    0,
    reminderIntervalMs - (currentTime - lastDrinkAt)
  );
  const isWaterDue =
    settings.waterReminderEnabled &&
    msUntilReminder === 0 &&
    (!waterSnoozedUntil || currentTime >= waterSnoozedUntil);

  function toUiError(err, fallback) {
    if (err instanceof TypeError) {
      return "Cannot reach API.";
    }
    return err?.message || fallback;
  }

  async function getErrorMessage(response, fallback) {
    try {
      const payload = await response.json();
      return payload?.details || payload?.error || fallback;
    } catch {
      if (response.url.includes("/api/")) {
        return "API is unavailable. Please try again later.";
      }
      return fallback;
    }
  }

  useEffect(() => {
    async function fetchTasks() {
      if (!user?.sub) return;

      setIsLoadingTasks(true);
      setError("");
      try {
        const response = await fetch(
          apiUrl(`/api/todos?userId=${encodeURIComponent(user.sub)}`)
        );
        if (!response.ok) {
          const message = await getErrorMessage(
            response,
            `Failed to load tasks (${response.status})`
          );
          throw new Error(message);
        }
        const data = await response.json();
        setTasks(data);
        setIsApiOffline(false);
      } catch (fetchError) {
        setError(toUiError(fetchError, "Failed to load tasks"));
        if (fetchError instanceof TypeError) {
          setIsApiOffline(true);
        }
      } finally {
        setIsLoadingTasks(false);
      }
    }

    fetchTasks();
  }, [user?.sub]);

  useEffect(() => {
    if (!checkedTasksStorageKey) {
      setCheckedTaskIds({});
      setHasLoadedCheckedTasks(false);
      return;
    }

    try {
      const storedValue = window.localStorage.getItem(checkedTasksStorageKey);
      setCheckedTaskIds(storedValue ? JSON.parse(storedValue) : {});
    } catch {
      setCheckedTaskIds({});
    } finally {
      setHasLoadedCheckedTasks(true);
    }
  }, [checkedTasksStorageKey]);

  useEffect(() => {
    if (!checkedTasksStorageKey || !hasLoadedCheckedTasks || isLoadingTasks) return;

    const taskIds = new Set(tasks.map((task) => String(task.id)));
    const filteredCheckedTaskIds = Object.fromEntries(
      Object.entries(checkedTaskIds).filter(
        ([taskId, isChecked]) => isChecked && taskIds.has(taskId)
      )
    );

    window.localStorage.setItem(
      checkedTasksStorageKey,
      JSON.stringify(filteredCheckedTaskIds)
    );

    if (
      Object.keys(filteredCheckedTaskIds).length !==
      Object.keys(checkedTaskIds).length
    ) {
      setCheckedTaskIds(filteredCheckedTaskIds);
    }
  }, [
    checkedTaskIds,
    checkedTasksStorageKey,
    hasLoadedCheckedTasks,
    isLoadingTasks,
    tasks,
  ]);

  useEffect(() => {
    async function fetchEvents() {
      if (!user?.sub) return;

      setEventsError("");
      try {
        const response = await fetch(
          apiUrl(`/api/events?userId=${encodeURIComponent(user.sub)}`)
        );
        if (!response.ok) {
          const message = await getErrorMessage(
            response,
            `Failed to load events (${response.status})`
          );
          throw new Error(message);
        }
        const data = await response.json();
        setEvents(Array.isArray(data) ? data : []);
        setIsApiOffline(false);
      } catch (fetchError) {
        setEventsError(toUiError(fetchError, "Failed to load events"));
        if (fetchError instanceof TypeError) {
          setIsApiOffline(true);
        }
      }
    }

    fetchEvents();
  }, [user?.sub]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isPomodoroRunning || !pomodoroEndsAt) return;

    if (currentTime < pomodoroEndsAt) {
      setPomodoroSecondsLeft(Math.max(0, Math.ceil((pomodoroEndsAt - currentTime) / 1000)));
      return;
    }

    const nextMode = pomodoroMode === "focus" ? "break" : "focus";
    const nextSeconds =
      nextMode === "focus"
        ? 25 * 60
        : settings.pomodoroBreakMinutes * 60;
    const nextEndsAt = currentTime + nextSeconds * 1000;

    playPomodoroChime();
    setPomodoroAlertText(
      pomodoroMode === "focus"
        ? "Focus session ended!"
        : "Break ended! Back to focus."
    );
    setIsPomodoroAlertOpen(true);
    setPomodoroMode(nextMode);
    setPomodoroSecondsLeft(nextSeconds);
    setPomodoroEndsAt(nextEndsAt);
  }, [
    currentTime,
    isPomodoroRunning,
    pomodoroEndsAt,
    pomodoroMode,
    settings.pomodoroBreakMinutes,
  ]);

  useEffect(() => {
    async function loadWorkspaceState() {
      if (!user?.sub) return;

      try {
        const response = await fetch(
          apiUrl(`/api/settings?userId=${encodeURIComponent(user.sub)}`)
        );
        if (!response.ok) {
          throw new Error(`Failed to load settings (${response.status})`);
        }

        const data = await response.json();
        setSettings(data ? { ...DEFAULT_SETTINGS, ...data } : loadUserSettings(user.sub));
      } catch {
        setSettings(loadUserSettings(user.sub));
      }

      const tracker = loadWaterTracker(user.sub);
      const pomodoroTracker = loadPomodoroTracker(user.sub);
      setLastDrinkAt(tracker.lastDrinkAt || Date.now());
      setWaterCount(tracker.waterCount || 0);
      setWaterSnoozedUntil(tracker.snoozedUntil || null);
      setPomodoroMinutesInput(pomodoroTracker.minutesInput || "25");
      setPomodoroMode(pomodoroTracker.mode || "focus");
      setIsPomodoroRunning(Boolean(pomodoroTracker.isRunning));
      setPomodoroEndsAt(pomodoroTracker.endsAt || null);

      if (pomodoroTracker.isRunning && pomodoroTracker.endsAt) {
        const initialSecondsLeft = Math.max(
          0,
          Math.ceil((pomodoroTracker.endsAt - Date.now()) / 1000)
        );
        setPomodoroSecondsLeft(initialSecondsLeft);
      } else {
        setPomodoroSecondsLeft(pomodoroTracker.secondsLeft || 25 * 60);
      }

      setCurrentTime(Date.now());
      setHasLoadedPomodoro(true);
    }

    loadWorkspaceState();
  }, [user?.sub]);

  useEffect(() => {
    if (!user?.sub) return;
    saveWaterTracker(user.sub, {
      lastDrinkAt,
      waterCount,
      snoozedUntil: waterSnoozedUntil,
    });
  }, [lastDrinkAt, user?.sub, waterCount, waterSnoozedUntil]);

  useEffect(() => {
    if (!user?.sub || !hasLoadedPomodoro) return;
    savePomodoroTracker(user.sub, {
      minutesInput: pomodoroMinutesInput,
      mode: pomodoroMode,
      isRunning: isPomodoroRunning,
      secondsLeft: pomodoroSecondsLeft,
      endsAt: pomodoroEndsAt,
    });
  }, [
    hasLoadedPomodoro,
    isPomodoroRunning,
    pomodoroEndsAt,
    pomodoroMinutesInput,
    pomodoroMode,
    pomodoroSecondsLeft,
    user?.sub,
  ]);

  async function addTask() {
    if (!user?.sub) return;
    const trimmedTask = newTask.trim();
    if (!trimmedTask) return;

    setError("");
    try {
      const response = await fetch(apiUrl("/api/todos"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.sub, text: trimmedTask }),
      });
      if (!response.ok) {
        const message = await getErrorMessage(
          response,
          `Failed to add task (${response.status})`
        );
        throw new Error(message);
      }

      const insertedTask = await response.json();
      setTasks((prev) => [insertedTask, ...prev]);
      setNewTask("");
      setIsApiOffline(false);
    } catch (postError) {
      setError(toUiError(postError, "Failed to add task"));
      if (postError instanceof TypeError) {
        setIsApiOffline(true);
      }
    }
  }

  async function deleteTask(id) {
    setError("");
    try {
      const response = await fetch(apiUrl(`/api/todos/${id}`), {
        method: "DELETE",
      });
      if (!response.ok) {
        const message = await getErrorMessage(
          response,
          `Failed to delete task (${response.status})`
        );
        throw new Error(message);
      }
      setTasks((prev) => prev.filter((task) => task.id !== id));
      setCheckedTaskIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setIsApiOffline(false);
    } catch (deleteError) {
      setError(toUiError(deleteError, "Failed to delete task"));
      if (deleteError instanceof TypeError) {
        setIsApiOffline(true);
      }
    }
  }

  function formatEventDate(dateTimeString) {
    const eventDateTime = new Date(dateTimeString);
    return eventDateTime.toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatEventLabel(event) {
    const eventDateTime = new Date(event.startAt);
    if (event.allDay) {
      return eventDateTime.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
      }) + " · All day";
    }

    return formatEventDate(event.startAt);
  }

  function toggleTaskChecked(id) {
    setCheckedTaskIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  async function addEvent() {
    if (!user?.sub) return;
    const trimmedTitle = eventTitle.trim();
    if (!trimmedTitle || !eventDate) {
      setEventError("Please fill title and date.");
      return;
    }

    try {
      const isAllDay = !eventTime;
      const startAt = isAllDay
        ? new Date(`${eventDate}T00:00:00`)
        : new Date(`${eventDate}T${eventTime}`);
      const endAt = isAllDay
        ? new Date(`${eventDate}T23:59:59`)
        : new Date(startAt.getTime() + 60 * 60 * 1000);

      const response = await fetch(apiUrl("/api/events"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.sub,
          title: trimmedTitle,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          allDay: isAllDay,
        }),
      });
      if (!response.ok) {
        const message = await getErrorMessage(
          response,
          `Failed to add event (${response.status})`
        );
        throw new Error(message);
      }

      const insertedEvent = await response.json();
      setEvents((prev) =>
        [...prev, insertedEvent].sort(
          (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        )
      );

      setEventTitle("");
      setEventDate("");
      setEventTime("");
      setEventError("");
      setIsEventModalOpen(false);
      setIsApiOffline(false);
    } catch (createError) {
      setEventError(toUiError(createError, "Failed to add event"));
      if (createError instanceof TypeError) {
        setIsApiOffline(true);
      }
    }
  }

  async function deleteEvent(id) {
    if (!user?.sub) return;

    try {
      const response = await fetch(
        apiUrl(`/api/events/${id}?userId=${encodeURIComponent(user.sub)}`),
        { method: "DELETE" }
      );
      if (!response.ok) {
        const message = await getErrorMessage(
          response,
          `Failed to delete event (${response.status})`
        );
        throw new Error(message);
      }
      setEvents((prev) => prev.filter((event) => event.id !== id));
      setIsApiOffline(false);
    } catch (deleteError) {
      setEventsError(toUiError(deleteError, "Failed to delete event"));
      if (deleteError instanceof TypeError) {
        setIsApiOffline(true);
      }
    }
  }

  function markWaterDrunk() {
    setLastDrinkAt(Date.now());
    setWaterSnoozedUntil(null);
    setCurrentTime(Date.now());
    setWaterCount((prev) => prev + 1);
  }

  function remindWaterLater() {
    const snoozeUntil = Date.now() + 10 * 60 * 1000;
    setWaterSnoozedUntil(snoozeUntil);
    setCurrentTime(Date.now());
  }

  function getPomodoroMinutes() {
    const parsedMinutes = Number(pomodoroMinutesInput);
    if (!Number.isFinite(parsedMinutes)) return 25;
    return Math.min(180, Math.max(1, parsedMinutes));
  }

  function resetPomodoro(minutes = getPomodoroMinutes()) {
    setPomodoroMode("focus");
    setPomodoroSecondsLeft(minutes * 60);
    setIsPomodoroRunning(false);
    setPomodoroEndsAt(null);
  }

  function applyPomodoroMinutes() {
    setPomodoroMode("focus");
    setPomodoroSecondsLeft(getPomodoroMinutes() * 60);
    setIsPomodoroRunning(false);
    setPomodoroEndsAt(null);
  }

  function togglePomodoroRunning() {
    if (isPomodoroRunning) {
      setIsPomodoroRunning(false);
      setPomodoroEndsAt(null);
      return;
    }

    const now = Date.now();
    setIsPomodoroRunning(true);
    setCurrentTime(now);
    setPomodoroEndsAt(now + pomodoroSecondsLeft * 1000);
  }

  function formatPomodoroTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function playPomodoroChime() {
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.18);
      gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.45);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.46);
      oscillator.onended = () => {
        audioContext.close().catch(() => {});
      };
    } catch {
      // ignore audio failures and still show the visual alert
    }
  }

  return (
    <div className="min-h-[90vh] rounded-2xl bg-[#fff0f3] p-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-4xl text-[#3e1e68]">Workspace</h1>
        {isApiOffline && (
          <div className="rounded-full border border-[#e6c6d4] bg-white/80 px-3 py-1 text-sm text-[#7a2f54] shadow-sm">
            Offline mode
          </div>
        )}
      </div>

      <div className="mt-6 grid min-h-[calc(90vh-6rem)] grid-cols-1 gap-6 xl:grid-cols-[320px_1fr_320px]">

        {/* LEFT COLUMN: Pomodoro + Water */}
        <div className="flex flex-col items-center gap-6 xl:items-stretch">

          {/* pomodoro */}
          <section className="w-full p-2">
            <div className="mx-auto flex w-full max-w-[260px] flex-col items-center">
              <div className="flex h-[260px] w-[260px] flex-col items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_35%,#ffffff_0%,#fff9fb_58%,#f6dce7_100%)] shadow-[0_18px_42px_rgba(62,30,104,0.14)]">
                <p className="text-sm uppercase tracking-[0.28em] text-[#7b5ca8]">
                  {pomodoroMode}
                </p>
                <p className="mt-3 text-[3.2rem] leading-none text-[#3e1e68]">
                  {formatPomodoroTime(pomodoroSecondsLeft)}
                </p>
                <label className="mt-4 flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
                  <span className="text-sm text-[#7b5ca8]">min</span>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={pomodoroMinutesInput}
                    onChange={(event) => setPomodoroMinutesInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        applyPomodoroMinutes();
                      }
                    }}
                    className="w-16 bg-transparent text-center text-[#3e1e68] outline-none"
                  />
                </label>
              </div>
              <div className="mt-4 flex w-full items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={togglePomodoroRunning}
                  className="rounded-full bg-[#e45a92] px-5 py-2 text-white hover:bg-[#ffacac]"
                >
                  {isPomodoroRunning ? "Pause" : "Start"}
                </button>
                <button
                  type="button"
                  onClick={() => resetPomodoro()}
                  className="rounded-full bg-white px-4 py-2 text-[#7a2f54] shadow-sm hover:bg-[#fff0f3]"
                >
                  Reset
                </button>
              </div>
            </div>
          </section>

          {/* water */}
          <section className="w-full text-center">
            <button
              type="button"
              onClick={() => { if (settings.waterReminderEnabled) markWaterDrunk(); }}
              disabled={!settings.waterReminderEnabled}
              className="mx-auto block transition enabled:hover:-translate-y-1 enabled:hover:drop-shadow-[0_12px_24px_rgba(62,30,104,0.14)] disabled:cursor-default"
            >
              <img src="/Water-bottle.png" alt="Water bottle" className="mx-auto h-44 w-44 object-contain" />
            </button>
            <div className="mt-4 space-y-1">
              <p className="text-[#3e1e68]">{waterCount} times drank</p>
              <p className="text-sm text-[#7b5ca8]">
                {settings.waterReminderEnabled
                  ? `Reminder set every ${settings.waterReminderMinutes} minutes`
                  : "Reminder is off"}
              </p>
            </div>
          </section>
        </div>

        {/* CENTER COLUMN: Event center + Whiteboard */}
        <div className="flex flex-col gap-6 xl:h-full">

          {/* event center */}
          <section className="rounded-[22px] bg-[#fff9fb] p-5 shadow-[0_16px_38px_rgba(62,30,104,0.12)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b5ca8]">
              Pinboard
            </p>
            <h2 className="text-2xl text-[#3e1e68]">Event center</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setEventError("");
              setIsEventModalOpen(true);
            }}
            disabled={isApiOffline}
            className={`shrink-0 self-start ${primaryButtonClass}`}
          >
            Add event
          </button>
        </div>

        <ul className="mt-5 grid gap-4 xl:max-h-[330px] xl:overflow-y-auto xl:pr-2">
          {eventsError && !isApiOffline && (
            <li className="rounded-[18px] bg-white px-4 py-3 text-sm text-[#b23a66] shadow-sm">
              {eventsError}
            </li>
          )}
          {events.length === 0 && (
            <li className="rounded-[18px] bg-white px-5 py-4 shadow-sm">
              <p className="text-sm uppercase tracking-[0.18em] text-[#7b5ca8]">Upcoming</p>
              <p className="mt-1 text-[#3e1e68]">No upcoming events yet.</p>
            </li>
          )}
          {events.map((event, index) => (
            <li
              key={event.id}
              className={`flex flex-col gap-3 rounded-[18px] px-5 py-4 shadow-sm sm:flex-row sm:items-start sm:justify-between ${
                index % 3 === 0
                  ? "bg-white"
                  : index % 3 === 1
                    ? "bg-[#fff0f3]"
                    : "bg-[#f6f2ff]"
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm uppercase tracking-[0.16em] text-[#7b5ca8]">
                  {formatEventLabel(event)}
                </p>
                <p className="mt-1 break-words text-xl text-[#3e1e68]">{event.title}</p>
              </div>
              <button
                type="button"
                onClick={() => deleteEvent(event.id)}
                className="self-end rounded-md bg-[#f3d5df] px-3 py-1.5 text-sm text-[#7a2f54] hover:bg-[#efc2d2] sm:self-start"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
          </section>

          {/* whiteboard card */}
          <Link
            to="/whiteboard"
            className="group mt-auto block w-full rounded-[24px] bg-[#fff9fb] p-5 shadow-[0_14px_32px_rgba(62,30,104,0.12)] transition hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(62,30,104,0.18)]"
          >
            <p className="text-xs uppercase tracking-[0.28em] text-[#a076c9]">whiteboard</p>
            <p className="mt-2 text-xl text-[#3e1e68] transition group-hover:opacity-0">open notes</p>
            <p className="-mt-8 text-xl text-[#e45a92] opacity-0 transition group-hover:opacity-100">enter whiteboard -&gt;</p>
          </Link>
        </div>

        {/* RIGHT COLUMN: Todo + Spotify */}
        <div className="flex flex-col gap-6 xl:h-full">

          {/* todo */}
          <aside className="w-full rounded-[18px] bg-[#fff9fb] p-4 shadow-[0_16px_38px_rgba(62,30,104,0.12)]">
            <div className="mb-3 flex items-center justify-between text-[#3e1e68]">
              <span className="text-lg">✦</span>
              <h2 className="text-xl tracking-[0.25em]">TO DO LIST</h2>
              <span className="text-lg">✦</span>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newTask}
                onChange={(event) => setNewTask(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") addTask(); }}
                placeholder="Add a task..."
                className="flex-1 rounded-lg border border-[#e6c6d4] px-3 py-2 text-[#3e1e68] outline-none focus:ring-2 focus:ring-[#e45a92]"
              />
              <button type="button" onClick={addTask} disabled={isApiOffline} className={primaryButtonClass}>
                Add
              </button>
            </div>
            <ul className="mt-4 max-h-64 space-y-1 overflow-y-auto pr-1">
              {error && !isApiOffline && <li className="text-sm text-[#b23a66]">{error}</li>}
              {isLoadingTasks && <li className="text-sm text-[#7b5ca8]">Loading tasks...</li>}
              {!isLoadingTasks && tasks.length === 0 && <li className="text-sm text-[#7b5ca8]">No tasks yet.</li>}
              {tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-2 border-b border-[#3e1e68]/40 px-1 py-2">
                  <input
                    type="checkbox"
                    checked={Boolean(checkedTaskIds[task.id])}
                    onChange={() => toggleTaskChecked(task.id)}
                    className="h-5 w-5 accent-[#e45a92]"
                  />
                  <span className={`flex-1 pr-2 ${checkedTaskIds[task.id] ? "text-[#7b5ca8] line-through opacity-70" : "text-[#3e1e68]"}`}>
                    {task.text}
                  </span>
                  <button type="button" onClick={() => deleteTask(task.id)} className="rounded-md bg-[#f3d5df] px-2 py-1 text-sm text-[#7a2f54] hover:bg-[#efc2d2]">
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* spotify */}
          <section className="mt-auto w-full rounded-[18px] p-4">
            <h2 className="mb-3 text-lg text-[#3e1e68]">Studyroom wannabe radio</h2>
            <iframe
              data-testid="embed-iframe"
              title="Spotify playlist embed"
              style={{ borderRadius: "12px" }}
              src="https://open.spotify.com/embed/playlist/3r0Q54dONwDjPmxBJikcLV?utm_source=generator"
              width="100%"
              height="152"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="shadow-md"
            />
            <a
              href="https://open.spotify.com/playlist/3r0Q54dONwDjPmxBJikcLV"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm text-[#5b3d88] underline underline-offset-2 hover:text-[#3e1e68]"
            >
              Open in Spotify
            </a>
          </section>
        </div>
      </div>

      {/* popup na new event*/}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[22px] border-[2px] border-[#3e1e68] bg-[#fff9fb] p-5 shadow-[0_18px_40px_rgba(62,30,104,0.28)]">
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b5ca8]">
              Event form
            </p>
            <h3 className="mt-1 text-2xl text-[#3e1e68]">New Event</h3>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={eventTitle}
                onChange={(event) => setEventTitle(event.target.value)}
                placeholder="Event title"
                className="w-full rounded-[18px] border border-[#e6c6d4] bg-white px-3 py-2 text-[#3e1e68] outline-none focus:ring-2 focus:ring-[#e45a92]"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                  className="w-full rounded-[18px] border border-[#e6c6d4] bg-white px-3 py-2 text-[#3e1e68] outline-none focus:ring-2 focus:ring-[#e45a92]"
                />
                <input
                  type="time"
                  value={eventTime}
                  onChange={(event) => setEventTime(event.target.value)}
                  placeholder="All day"
                  className="w-full rounded-[18px] border border-[#e6c6d4] bg-white px-3 py-2 text-[#3e1e68] outline-none focus:ring-2 focus:ring-[#e45a92]"
                />
              </div>
              <p className="text-sm text-[#7b5ca8]">
                Leave time empty to save it as all day.
              </p>
            </div>
            {eventError && <p className="mt-3 text-sm text-[#b23a66]">{eventError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEventError("");
                  setIsEventModalOpen(false);
                }}
                className="rounded-lg bg-[#f3d5df] px-3 py-2 text-[#7a2f54] hover:bg-[#efc2d2]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addEvent}
                className={primaryButtonClass}
              >
                Save event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* popup na drink water reminder */}
      {isWaterDue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a163f]/35 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-[28px] bg-[#fff9fb] p-6 text-center shadow-[0_24px_60px_rgba(62,30,104,0.28)]">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[30px] bg-[#fff0f3]">
              <img
                src="/Water-bottle.png"
                alt="Water bottle reminder"
                className="h-24 w-24 object-contain"
              />
            </div>
            <p className="mt-5 text-[2rem] leading-none text-[#3e1e68]">
              Drink water!
            </p>
            <p className="mt-3 text-[#7b5ca8]">
              Pause for a sip, then get back to work.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={remindWaterLater}
                className="rounded-xl bg-[#f3d5df] px-5 py-3 text-[#7a2f54] hover:bg-[#efc2d2]"
              >
                Remind me later
              </button>
              <button
                type="button"
                onClick={markWaterDrunk}
                className={primaryButtonClass}
              >
                Log a sip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* popup na pomodoro end */}
      {isPomodoroAlertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a163f]/25 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-[#fff9fb] p-6 text-center shadow-[0_24px_60px_rgba(62,30,104,0.24)]">
            <p className="text-xs uppercase tracking-[0.3em] text-[#a076c9]">
              pomodoro
            </p>
            <p className="mt-4 text-[2rem] leading-none text-[#3e1e68]">
              {pomodoroAlertText}
            </p>
            <p className="mt-3 text-[#7b5ca8]">
              Timer ended. Your next session is ready.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setIsPomodoroAlertOpen(false)}
                className={primaryButtonClass}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
}
