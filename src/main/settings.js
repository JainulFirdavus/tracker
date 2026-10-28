const fs = require("node:fs");

const themes = ["glass", "daylight", "midnight", "sunset"];
const dashboardThemes = [
  "forest",
  "paper",
  "ocean",
  "rose",
  "graphite",
  "gradient",
  "glass",
];
const dashboardFonts = [
  "system",
  "dm-sans",
  "manrope",
  "plus-jakarta-sans",
  "space-grotesk",
  "lexend",
];
const musicThemes = [
  "moss",
  "ocean",
  "sunset",
  "aurora",
  "berry",
  "neon",
  "lavender",
];
const visualizers = ["bars", "wave", "orbit"];
const icons = ["assets/eye.gif", "assets/water.gif", "assets/walk.gif"];

function validateSettings(input) {
  function number(value, min, max, label) {
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new Error(`${label} must be a whole number from ${min} to ${max}.`);
    }
    return value;
  }
  function text(value, max, label) {
    if (typeof value !== "string" || !value.trim() || value.length > max) {
      throw new Error(
        `${label} is required and must be at most ${max} characters.`,
      );
    }
    return value.trim();
  }
  if (!input || typeof input !== "object")
    throw new Error("Settings must be an object.");
  if (
    input.loginEnabled !== undefined &&
    typeof input.loginEnabled !== "boolean"
  ) {
    throw new Error("Login enabled must be true or false.");
  }
  const theme = input.theme ?? "glass";
  if (!themes.includes(theme))
    throw new Error("Choose one of the four notification themes.");
  const dashboardTheme = input.dashboardTheme ?? "glass";
  if (!dashboardThemes.includes(dashboardTheme))
    throw new Error("Choose a valid dashboard theme.");
  const dashboardGradientIntensity = number(
    input.dashboardGradientIntensity ?? 72,
    20,
    100,
    "Dashboard gradient intensity",
  );
  const dashboardGlassIntensity = number(
    input.dashboardGlassIntensity ?? 72,
    20,
    100,
    "Dashboard glass intensity",
  );
  const dashboardFont = input.dashboardFont ?? "system";
  if (!dashboardFonts.includes(dashboardFont))
    throw new Error("Choose a valid dashboard font.");
  const notificationSize = input.notificationSize ?? "medium";
  if (!["small", "medium", "large"].includes(notificationSize)) {
    throw new Error("Choose a small, medium, or large notification size.");
  }
  const musicInput = input.music ?? {};
  if (
    !musicInput ||
    typeof musicInput !== "object" ||
    Array.isArray(musicInput)
  )
    throw new Error("Music settings must be an object.");
  const musicTheme = musicInput.theme ?? "moss";
  if (!musicThemes.includes(musicTheme))
    throw new Error("Choose a valid music theme.");
  const visualizer = musicInput.visualizer ?? "bars";
  if (!visualizers.includes(visualizer))
    throw new Error("Choose a valid music visualizer.");
  const trackName = musicInput.trackName ?? "";
  const trackType = musicInput.trackType ?? "";
  if (typeof trackName !== "string" || trackName.length > 255)
    throw new Error("Music filename must be at most 255 characters.");
  if (
    typeof trackType !== "string" ||
    trackType.length > 120 ||
    (trackType && !/^audio\/[a-z0-9.+-]+$/i.test(trackType))
  ) {
    throw new Error("Choose a valid audio file.");
  }
  const music = {
    trackName: trackName.trim(),
    trackType,
    trackSizeBytes: number(
      musicInput.trackSizeBytes ?? 0,
      0,
      104857600,
      "Music file size",
    ),
    theme: musicTheme,
    glassEffect: musicInput.glassEffect ?? true,
    transparency: number(
      musicInput.transparency ?? 82,
      20,
      100,
      "Music player transparency",
    ),
    visualizer,
    volume: number(musicInput.volume ?? 55, 0, 100, "Music volume"),
  };
  if (typeof music.glassEffect !== "boolean")
    throw new Error("Glass effect must be true or false.");
  const ids = ["eye-rest", "hydration", "stand-up"];
  if (
    !Array.isArray(input.reminders) ||
    input.reminders.length !== ids.length
  ) {
    throw new Error(
      "Settings must contain the eye, water, and movement reminders.",
    );
  }
  const seen = new Set();
  const reminders = input.reminders.map((reminder) => {
    if (!reminder || !ids.includes(reminder.id) || seen.has(reminder.id)) {
      throw new Error(
        "Reminder IDs must be unique eye, water, and movement IDs.",
      );
    }
    seen.add(reminder.id);
    if (
      reminder.enabled !== undefined &&
      typeof reminder.enabled !== "boolean"
    ) {
      throw new Error("Reminder enabled must be true or false.");
    }
    if (!icons.includes(reminder.icon))
      throw new Error("Choose a built-in reminder animation.");
    const result = {
      id: reminder.id,
      enabled: reminder.enabled ?? true,
      name: text(reminder.name, 60, "Reminder name"),
      intervalMinutes: number(
        reminder.intervalMinutes,
        1,
        1440,
        "Active interval",
      ),
      title: text(reminder.title, 80, "Notification title"),
      message: text(reminder.message, 240, "Notification message"),
      icon: reminder.icon,
    };
    if (reminder.resetAfterIdleSeconds !== undefined) {
      result.resetAfterIdleSeconds = number(
        reminder.resetAfterIdleSeconds,
        1,
        86400,
        "Idle reset",
      );
    }
    return result;
  });
  return {
    idleAfterSeconds: number(input.idleAfterSeconds, 1, 3600, "Idle threshold"),
    notificationDurationSeconds: number(
      input.notificationDurationSeconds ?? 10,
      3,
      120,
      "Popup duration",
    ),
    notificationSize,
    notificationOpacity: number(
      input.notificationOpacity ?? 100,
      40,
      100,
      "Background opacity",
    ),
    theme,
    dashboardTheme,
    dashboardGradientIntensity,
    dashboardGlassIntensity,
    dashboardFont,
    music,
    loginEnabled: input.loginEnabled ?? false,
    reminders,
  };
}

function saveSettings(file, settings) {
  const temporary = `${file}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(settings, null, 2)}\n`, {
      mode: 0o600,
    });
    fs.renameSync(temporary, file);
  } catch (error) {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    throw error;
  }
}

module.exports = { validateSettings, saveSettings, themes, icons };
