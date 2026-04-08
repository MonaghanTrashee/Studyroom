export const DEFAULT_SETTINGS = {
  waterReminderEnabled: true,
  waterReminderMinutes: 45,
  pomodoroBreakMinutes: 5,
};

const DEFAULT_WATER_TRACKER = {
  lastDrinkAt: Date.now(),
  waterCount: 0,
  snoozedUntil: null,
};

const DEFAULT_POMODORO_TRACKER = {
  minutesInput: "25",
  mode: "focus",
  isRunning: false,
  secondsLeft: 25 * 60,
  endsAt: null,
};

function readJson(key, fallbackValue) {
  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) return fallbackValue;
    return { ...fallbackValue, ...JSON.parse(rawValue) };
  } catch {
    return fallbackValue;
  }
}

export function loadUserSettings(userId) {
  if (!userId) return DEFAULT_SETTINGS;
  return readJson(`studyroom-settings:${userId}`, DEFAULT_SETTINGS);
}

export function saveUserSettings(userId, settings) {
  if (!userId) return;
  window.localStorage.setItem(
    `studyroom-settings:${userId}`,
    JSON.stringify(settings)
  );
}

export function loadWaterTracker(userId) {
  if (!userId) return DEFAULT_WATER_TRACKER;
  return readJson(`studyroom-water:${userId}`, DEFAULT_WATER_TRACKER);
}

export function saveWaterTracker(userId, tracker) {
  if (!userId) return;
  window.localStorage.setItem(
    `studyroom-water:${userId}`,
    JSON.stringify(tracker)
  );
}

export function loadPomodoroTracker(userId) {
  if (!userId) return DEFAULT_POMODORO_TRACKER;
  return readJson(`studyroom-pomodoro:${userId}`, DEFAULT_POMODORO_TRACKER);
}

export function savePomodoroTracker(userId, tracker) {
  if (!userId) return;
  window.localStorage.setItem(
    `studyroom-pomodoro:${userId}`,
    JSON.stringify(tracker)
  );
}
