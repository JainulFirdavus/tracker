import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { MusicPlayer } from "../components/MusicPlayer";
import { saveLibraryFiles } from "../lib/musicLibrary";
import MusicPage from "./MusicPage";

const libraryMocks = vi.hoisted(() => ({
  deleteLibraryFile: vi.fn(),
  loadAudioFile: vi.fn(),
  loadLibraryFile: vi.fn(),
  loadLibraryFiles: vi.fn(),
  saveAudioFile: vi.fn(),
  saveLibraryFiles: vi.fn(),
}));

vi.mock("../lib/musicLibrary", () => ({
  MAX_AUDIO_BYTES: 104857600,
  deleteLibraryFile: libraryMocks.deleteLibraryFile,
  loadAudioFile: libraryMocks.loadAudioFile,
  isAudioFile: (file) => file.type.startsWith("audio/"),
  loadLibraryFile: libraryMocks.loadLibraryFile,
  loadLibraryFiles: libraryMocks.loadLibraryFiles,
  saveAudioFile: libraryMocks.saveAudioFile,
  saveLibraryFiles: libraryMocks.saveLibraryFiles,
}));

const music = {
  trackName: "",
  trackType: "",
  trackSizeBytes: 0,
  theme: "moss",
  glassEffect: true,
  transparency: 82,
  visualizer: "bars",
  volume: 55,
};

function renderMusicPage() {
  const preferences = createPreferences();
  render(<MusicPage preferences={preferences} />);
  return preferences;
}

function createPreferences() {
  return {
    draft: { music },
    saved: { music },
    saving: false,
    musicMessage: "",
    setMusic: vi.fn(),
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  libraryMocks.loadLibraryFiles.mockResolvedValue([]);
  libraryMocks.saveAudioFile.mockResolvedValue(undefined);
  libraryMocks.saveLibraryFiles.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

it("plays SoundCloud embeds and organizes tracks into favorites and playlists", async () => {
  const user = userEvent.setup();
  renderMusicPage();

  await user.type(
    screen.getByRole("textbox", { name: "SoundCloud URL" }),
    "https://soundcloud.com/artist/track",
  );
  await user.click(screen.getByRole("button", { name: "Add link" }));

  expect(
    screen.getByTitle("SoundCloud player: artist / track").getAttribute("src"),
  ).toContain("w.soundcloud.com/player");
  await user.click(
    screen.getByRole("button", { name: "Add to favorites: artist / track" }),
  );
  await user.click(
    within(
      screen.getByRole("navigation", { name: "Music library filters" }),
    ).getByRole("button", { name: /Favorites/ }),
  );
  expect(
    screen.getByRole("button", {
      name: "Remove from favorites: artist / track",
    }),
  ).not.toBeNull();

  await user.type(
    screen.getByRole("textbox", { name: "New playlist" }),
    "Focus mix",
  );
  await user.click(screen.getByRole("button", { name: "Create" }));
  await user.click(screen.getByRole("button", { name: "Add", exact: true }));
  await user.click(
    within(
      screen.getByRole("navigation", { name: "Music library filters" }),
    ).getByRole("button", { name: /Focus mix/ }),
  );
  expect(
    screen.getByRole("button", {
      name: "Remove from favorites: artist / track",
    }),
  ).not.toBeNull();
});

it("rejects links that do not point to SoundCloud", async () => {
  const user = userEvent.setup();
  renderMusicPage();
  await user.type(
    screen.getByRole("textbox", { name: "SoundCloud URL" }),
    "https://example.com/audio",
  );
  await user.click(screen.getByRole("button", { name: "Add link" }));

  expect(
    screen
      .getAllByRole("status")
      .some((status) =>
        status.textContent.includes("Use an https://soundcloud.com"),
      ),
  ).toBe(true);
  expect(screen.queryByTitle(/SoundCloud player:/)).toBeNull();
});

it("imports supported audio from a selected folder into the local library", async () => {
  const user = userEvent.setup();
  renderMusicPage();
  const file = new File(["audio"], "song.mp3", { type: "audio/mpeg" });
  Object.defineProperty(file, "webkitRelativePath", {
    value: "Music/song.mp3",
  });

  await user.upload(screen.getByLabelText("Choose a music folder"), file);

  expect(saveLibraryFiles).toHaveBeenCalledTimes(1);
  expect(await screen.findByText("song.mp3")).not.toBeNull();
  expect(
    screen
      .getAllByRole("status")
      .some((status) => status.textContent.includes("1 audio file added")),
  ).toBe(true);
});

it("selects a local track for the restored header player", async () => {
  const user = userEvent.setup();
  const preferences = createPreferences();
  const file = new File(["audio"], "song.mp3", { type: "audio/mpeg" });
  libraryMocks.loadLibraryFiles.mockResolvedValue([{ id: "local-song", file }]);
  libraryMocks.loadLibraryFile.mockResolvedValue(file);

  render(<MusicPage preferences={preferences} />);
  const trackName = await screen.findByText("song.mp3", {
    selector: ".music-track-select strong",
  });
  await user.click(trackName.closest("button"));

  expect(libraryMocks.saveAudioFile).toHaveBeenCalledWith(file);
  expect(preferences.setMusic).toHaveBeenCalledWith(
    expect.objectContaining({
      trackName: "song.mp3",
      trackType: "audio/mpeg",
      trackSizeBytes: file.size,
    }),
  );
});

it("provides volume rocker controls and saves the selected gradient theme", async () => {
  const user = userEvent.setup();
  const onVolumeChange = vi.fn();
  render(
    <MemoryRouter>
      <MusicPlayer
        music={{ ...music, trackName: "", theme: "aurora" }}
        onVolumeChange={onVolumeChange}
      />
    </MemoryRouter>,
  );
  await user.click(screen.getByRole("button", { name: "Open music player" }));

  expect(
    screen
      .getByRole("region", { name: "Music player" })
      .getAttribute("data-theme"),
  ).toBe("aurora");
  await user.click(
    screen.getByRole("button", { name: "Increase music volume" }),
  );
  expect(screen.getByRole("slider", { name: "Set music volume" }).value).toBe(
    "60",
  );
  expect(onVolumeChange).toHaveBeenCalledWith(
    expect.objectContaining({ volume: 60, theme: "aurora" }),
  );
  await user.click(
    screen.getByRole("button", { name: "Decrease music volume" }),
  );
  expect(screen.getByRole("slider", { name: "Set music volume" }).value).toBe(
    "55",
  );
});

it("toggles glass styling and adjusts transparency in music settings", async () => {
  const user = userEvent.setup();
  const preferences = renderMusicPage();
  const transparency = screen.getByRole("slider", {
    name: "Player transparency",
  });
  const glassToggle = screen.getByRole("checkbox", {
    name: /Glass player effect/,
  });

  expect(transparency.value).toBe("82");
  await user.click(glassToggle);
  expect(transparency.disabled).toBe(true);
  await user.click(glassToggle);
  fireEvent.change(transparency, { target: { value: "64" } });
  await user.click(screen.getByRole("radio", { name: "Aurora" }));
  await user.click(screen.getByRole("button", { name: "Save music settings" }));

  expect(preferences.setMusic).toHaveBeenCalledWith(
    expect.objectContaining({
      theme: "aurora",
      glassEffect: true,
      transparency: 64,
    }),
  );
});

it("previews all music themes in the page and floating player", async () => {
  const user = userEvent.setup();
  const preferences = createPreferences();
  render(
    <MemoryRouter>
      <MusicPlayer music={music} />
      <MusicPage preferences={preferences} />
    </MemoryRouter>,
  );

  for (const theme of ["Aurora", "Berry", "Neon", "Lavender"]) {
    const value = theme.toLowerCase();
    await user.click(screen.getByRole("radio", { name: theme }));
    expect(
      document.querySelector(".music-player-card")?.getAttribute("data-theme"),
    ).toBe(value);
    expect(
      document.querySelector(".music-launcher")?.getAttribute("data-theme"),
    ).toBe(value);
    expect(
      document.getElementById("music-player-panel")?.getAttribute("data-theme"),
    ).toBe(value);
  }
});
