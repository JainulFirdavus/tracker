import { useEffect, useRef, useState } from "react";
import { request } from "../lib/api";

export function useSettings() {
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Loading settings...");
  const [error, setError] = useState("");
  const [themeMessage, setThemeMessage] = useState("");
  const [fontMessage, setFontMessage] = useState("");
  const [musicMessage, setMusicMessage] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [reload, setReload] = useState(0);
  const themeIntensityTimer = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    request("/api/settings", { signal: controller.signal })
      .then((settings) => {
        setSaved(settings);
        setDraft(settings);
        setError("");
        setMessage("Settings loaded from your local JSON file.");
      })
      .catch((failure) => {
        if (failure.name !== "AbortError")
          setError(`Could not load settings: ${failure.message}`);
      });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    if (draft)
      document.documentElement.dataset.dashboardTheme =
        draft.dashboardTheme ?? "forest";
  }, [draft?.dashboardTheme]);

  useEffect(() => {
    if (!draft) return;
    const root = document.documentElement;
    const gradientIntensity = draft.dashboardGradientIntensity ?? 72;
    const glassIntensity = draft.dashboardGlassIntensity ?? 72;
    root.style.setProperty(
      "--dashboard-gradient-intensity",
      `${gradientIntensity}%`,
    );
    root.style.setProperty(
      "--dashboard-glass-opacity",
      `${15 + glassIntensity * 0.7}%`,
    );
    root.style.setProperty(
      "--dashboard-glass-blur",
      `${3 + glassIntensity * 0.17}px`,
    );
  }, [draft?.dashboardGradientIntensity, draft?.dashboardGlassIntensity]);

  useEffect(() => () => clearTimeout(themeIntensityTimer.current), []);

  useEffect(() => {
    if (draft)
      document.documentElement.dataset.dashboardFont =
        draft.dashboardFont ?? "system";
  }, [draft?.dashboardFont]);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  function update(patch) {
    setDraft((current) =>
      typeof patch === "function" ? patch(current) : { ...current, ...patch },
    );
    setDirty(true);
    setError("");
    setMessage("Unsaved changes");
  }

  async function save() {
    if (saving || !draft) return;
    setSaving(true);
    setError("");
    setMessage("Saving settings...");
    try {
      const settings = await request("/api/settings", {
        method: "PUT",
        body: JSON.stringify(draft),
      });
      setSaved(settings);
      setDraft(settings);
      setDirty(false);
      setMessage("Saved to your local JSON file. Changes are now active.");
    } catch (failure) {
      setError(failure.message);
    } finally {
      setSaving(false);
    }
  }

  async function setTheme(theme) {
    if (saving || !draft) return;
    clearTimeout(themeIntensityTimer.current);
    const previous = draft.dashboardTheme ?? "forest";
    setSaving(true);
    setDraft((current) => ({ ...current, dashboardTheme: theme }));
    setThemeMessage("Saving theme...");
    try {
      const appearance = {
        dashboardTheme: theme,
        dashboardGradientIntensity: draft.dashboardGradientIntensity ?? 72,
        dashboardGlassIntensity: draft.dashboardGlassIntensity ?? 72,
      };
      const settings = await request("/api/dashboard-theme", {
        method: "PUT",
        body: JSON.stringify(appearance),
      });
      setSaved((current) => ({
        ...current,
        ...appearance,
        dashboardTheme: settings.dashboardTheme,
      }));
      setDraft((current) => ({
        ...current,
        ...appearance,
        dashboardTheme: settings.dashboardTheme,
      }));
      setThemeMessage("Theme saved.");
    } catch (failure) {
      setDraft((current) => ({
        ...current,
        dashboardTheme: previous,
        dashboardGradientIntensity: saved?.dashboardGradientIntensity ?? 72,
        dashboardGlassIntensity: saved?.dashboardGlassIntensity ?? 72,
      }));
      setThemeMessage(failure.message);
    } finally {
      setSaving(false);
    }
  }

  function setThemeIntensity(field, value) {
    if (saving || !draft) return;
    if (
      !["dashboardGradientIntensity", "dashboardGlassIntensity"].includes(field)
    ) {
      throw new Error("Choose a valid dashboard theme intensity.");
    }
    const intensity = Number(value);
    setDraft((current) => ({ ...current, [field]: intensity }));
    setThemeMessage("Saving theme intensity...");
    clearTimeout(themeIntensityTimer.current);
    themeIntensityTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        const appearance = {
          dashboardTheme: draft.dashboardTheme ?? "forest",
          dashboardGradientIntensity:
            field === "dashboardGradientIntensity"
              ? intensity
              : (draft.dashboardGradientIntensity ?? 72),
          dashboardGlassIntensity:
            field === "dashboardGlassIntensity"
              ? intensity
              : (draft.dashboardGlassIntensity ?? 72),
        };
        const settings = await request("/api/dashboard-theme", {
          method: "PUT",
          body: JSON.stringify(appearance),
        });
        setSaved((current) => ({
          ...current,
          ...appearance,
          dashboardTheme: settings.dashboardTheme,
        }));
        setDraft((current) => ({
          ...current,
          ...appearance,
          dashboardTheme: settings.dashboardTheme,
        }));
        setThemeMessage("Theme intensity saved.");
      } catch (failure) {
        setDraft((current) => ({
          ...current,
          dashboardGradientIntensity: saved?.dashboardGradientIntensity ?? 72,
          dashboardGlassIntensity: saved?.dashboardGlassIntensity ?? 72,
        }));
        setThemeMessage(failure.message);
      } finally {
        setSaving(false);
      }
    }, 350);
  }

  async function setFont(dashboardFont) {
    if (saving || !draft) return;
    const previous = draft.dashboardFont ?? "system";
    setSaving(true);
    setDraft((current) => ({ ...current, dashboardFont }));
    setFontMessage("Applying typeface...");
    try {
      const settings = await request("/api/dashboard-font", {
        method: "PUT",
        body: JSON.stringify({ dashboardFont }),
      });
      setSaved((current) => ({
        ...current,
        dashboardFont: settings.dashboardFont,
      }));
      setDraft((current) => ({
        ...current,
        dashboardFont: settings.dashboardFont,
      }));
      setFontMessage("Typeface saved.");
    } catch (failure) {
      setDraft((current) => ({ ...current, dashboardFont: previous }));
      setFontMessage(failure.message);
    } finally {
      setSaving(false);
    }
  }

  async function setMusic(music) {
    if (saving || !draft) return;
    setSaving(true);
    setMusicMessage("Saving music settings...");
    try {
      const settings = await request("/api/music-settings", {
        method: "PUT",
        body: JSON.stringify({ music }),
      });
      setSaved((current) => ({ ...current, music: settings.music }));
      setDraft((current) => ({ ...current, music: settings.music }));
      setMusicMessage("Music settings saved locally.");
    } catch (failure) {
      setMusicMessage(failure.message);
    } finally {
      setSaving(false);
    }
  }

  async function setNotificationAppearance(appearance) {
    if (saving || !draft) return "Settings are still saving.";
    setSaving(true);
    try {
      const settings = await request("/api/notification-appearance", {
        method: "PUT",
        body: JSON.stringify(appearance),
      });
      const savedAppearance = {
        theme: settings.theme,
        notificationSize: settings.notificationSize,
        notificationOpacity: settings.notificationOpacity,
      };
      setSaved((current) => ({ ...current, ...savedAppearance }));
      setDraft((current) => ({ ...current, ...savedAppearance }));
      return "Notification style saved.";
    } catch (failure) {
      return failure.message;
    } finally {
      setSaving(false);
    }
  }

  async function setLogin(loginEnabled) {
    if (saving || dirty || !draft) return;
    setSaving(true);
    setLoginMessage("Saving login preference...");
    try {
      const settings = await request("/api/auth/settings", {
        method: "PUT",
        body: JSON.stringify({ loginEnabled }),
      });
      setSaved(settings);
      setDraft(settings);
      setLoginMessage("Login preference saved.");
      window.dispatchEvent(new Event("auth:changed"));
    } catch (failure) {
      setLoginMessage(failure.message);
    } finally {
      setSaving(false);
    }
  }

  return {
    saved,
    draft,
    dirty,
    saving,
    message,
    error,
    themeMessage,
    fontMessage,
    musicMessage,
    loginMessage,
    update,
    save,
    setTheme,
    setThemeIntensity,
    setFont,
    setMusic,
    setNotificationAppearance,
    setLogin,
    retry: () => setReload((value) => value + 1),
  };
}
