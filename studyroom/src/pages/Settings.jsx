import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
  DEFAULT_SETTINGS,
  loadUserSettings,
  saveUserSettings,
} from "../lib/userPreferences";

const REMINDER_OPTIONS = [15, 30, 45, 60, 90, 120];
const POMODORO_BREAK_OPTIONS = [5, 10, 15, 20, 25, 30];

export default function Settings() {
  const { user, logout, loginWithRedirect, isAuthenticated } = useAuth0();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      if (!user?.sub) return;

      try {
        const response = await fetch(
          `/api/settings?userId=${encodeURIComponent(user.sub)}`
        );
        if (!response.ok) {
          throw new Error(`Failed to load settings (${response.status})`);
        }

        const data = await response.json();
        setSettings(data ? { ...DEFAULT_SETTINGS, ...data } : loadUserSettings(user.sub));
      } catch {
        setSettings(loadUserSettings(user.sub));
      } finally {
        setHasLoadedSettings(true);
      }
    }

    fetchSettings();
  }, [user?.sub]);

  useEffect(() => {
    async function persistSettings() {
      if (!user?.sub || !hasLoadedSettings) return;

      saveUserSettings(user.sub, settings);

      try {
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.sub,
            waterReminderEnabled: settings.waterReminderEnabled,
            waterReminderMinutes: settings.waterReminderMinutes,
            pomodoroBreakMinutes: settings.pomodoroBreakMinutes,
          }),
        });
      } catch {
        // localStorage fallback already saved above
      }
    }

    persistSettings();
  }, [hasLoadedSettings, settings, user?.sub]);

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#7b5ca8]">
            Preferences
          </p>
          <h1 className="text-4xl text-[#3e1e68]">Settings</h1>
        </div>
      </div>

      <div className="mt-6 rounded-[32px] bg-[#fff9fb] p-6 shadow-[0_18px_38px_rgba(62,30,104,0.12)]">
        <section>
          <h2 className="mt-2 text-2xl text-[#3e1e68]">Account</h2>
          <p className="mt-2 text-[#7b5ca8]">
            Your current active account
          </p>

          <div className="mt-6 rounded-[20px] bg-white p-4 shadow-sm">
            <p className="text-sm uppercase tracking-[0.18em] text-[#7b5ca8]">
              Logged in as
            </p>
            <p className="mt-2 text-xl text-[#3e1e68]">
              {user?.name || user?.email || "Unknown user"}
            </p>
            {user?.email && (
              <p className="mt-1 text-sm text-[#7b5ca8]">{user.email}</p>
            )}
          </div>

          <div className="mt-5 flex gap-3">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() =>
                  logout({ logoutParams: { returnTo: window.location.origin } })
                }
                className="rounded-lg bg-[#e45a92] px-4 py-2 text-white shadow-[0_4px_0_#bb4775] hover:translate-y-[1px] hover:bg-[#ff8db8] hover:shadow-[0_3px_0_#bb4775]"
              >
                Log Out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => loginWithRedirect()}
                className="rounded-lg bg-[#e45a92] px-4 py-2 text-white shadow-[0_4px_0_#bb4775] hover:translate-y-[1px] hover:bg-[#ff8db8] hover:shadow-[0_3px_0_#bb4775]"
              >
                Log In
              </button>
            )}
          </div>
        </section>

        <div className="my-8 h-px bg-[#eed9e2]" />

        <section>
          <h2 className="text-2xl text-[#3e1e68]">Drink Water Reminder</h2>
          <p className="mt-2 text-[#7b5ca8]">
            Choose whether the reminder appears in Workspace and how often it should show up.
          </p>

          <div className="mt-6 space-y-5">
            <label className="flex items-center justify-between gap-4 rounded-[20px] bg-white p-4 shadow-sm">
              <div>
                <p className="text-lg text-[#3e1e68]">Enable reminders</p>
                <p className="text-sm text-[#7b5ca8]">
                  Show the drink water popup in Workspace.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.waterReminderEnabled}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    waterReminderEnabled: event.target.checked,
                  }))
                }
                className="h-5 w-5 accent-[#e45a92]"
              />
            </label>

            <div className="rounded-[20px] bg-white p-4 shadow-sm">
              <label className="block">
                <span className="text-lg text-[#3e1e68]">Remind me every</span>
                <select
                  value={settings.waterReminderMinutes}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      waterReminderMinutes: Number(event.target.value),
                    }))
                  }
                  className="mt-3 w-full rounded-[16px] bg-[#fff9fb] px-3 py-2 text-[#3e1e68] outline-none focus:ring-2 focus:ring-[#e45a92]"
                >
                  {REMINDER_OPTIONS.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      every {minutes} min
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </section>

        <div className="my-8 h-px bg-[#eed9e2]" />

        <section>
          <h2 className="text-2xl text-[#3e1e68]">Pomodoro</h2>
          <p className="mt-2 text-[#7b5ca8]">
            Set how long your break should be after a focus session ends.
          </p>

          <div className="mt-6 rounded-[20px] bg-white p-4 shadow-sm">
            <label className="block">
              <span className="text-lg text-[#3e1e68]">Break length</span>
              <select
                value={settings.pomodoroBreakMinutes}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    pomodoroBreakMinutes: Number(event.target.value),
                  }))
                }
                className="mt-3 w-full rounded-[16px] bg-[#fff9fb] px-3 py-2 text-[#3e1e68] outline-none focus:ring-2 focus:ring-[#e45a92]"
              >
                {POMODORO_BREAK_OPTIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} min break
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
