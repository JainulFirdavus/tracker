import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { SettingsPage } from "./SettingsPage";

afterEach(cleanup);

it("keeps notification appearance in Settings and saves it independently", async () => {
  const user = userEvent.setup();
  const appearance = {
    theme: "glass",
    notificationSize: "medium",
    notificationOpacity: 100,
  };
  const preferences = {
    draft: {
      ...appearance,
      dashboardFont: "system",
      dashboardTheme: "forest",
      dashboardGradientIntensity: 72,
      dashboardGlassIntensity: 72,
      loginEnabled: false,
      notificationDurationSeconds: 10,
      reminders: [
        {
          id: "eye-rest",
          name: "Eye rest",
          title: "Look away",
          message: "Take a short break.",
          icon: "assets/eye.gif",
        },
      ],
    },
    saved: { ...appearance },
    saving: false,
    error: "",
    fontMessage: "",
    themeMessage: "",
    loginMessage: "",
    setFont: vi.fn(),
    setTheme: vi.fn(),
    setThemeIntensity: vi.fn(),
    setLogin: vi.fn(),
    setNotificationAppearance: vi.fn(async () => "Notification style saved."),
  };
  const activityReminders = [
    {
      id: "eye-rest",
      name: "Activity eye reminder",
      title: "Look away",
      message: "Activity reminder preview.",
      icon: "assets/eye.gif",
    },
    {
      id: "hydration",
      name: "Activity water reminder",
      title: "Drink water",
      message: "Activity water preview.",
      icon: "assets/water.gif",
    },
  ];

  render(
    <MemoryRouter>
      <SettingsPage
        preferences={preferences}
        activityReminders={activityReminders}
      />
    </MemoryRouter>,
  );
  expect(screen.getByLabelText("Preview reminder").value).toBe("eye-rest");
  expect(
    screen.getByTitle("Notification live preview").getAttribute("src"),
  ).toContain("/notification.html?");
  await user.selectOptions(
    screen.getByLabelText("Preview reminder"),
    "hydration",
  );
  expect(
    screen.getByTitle("Notification live preview").getAttribute("src"),
  ).toContain("title=Drink+water");
  await user.click(screen.getByRole("radio", { name: /Daylight/ }));
  await user.click(
    screen.getByRole("button", { name: "Save notification style" }),
  );

  expect(preferences.setNotificationAppearance).toHaveBeenCalledWith({
    ...appearance,
    theme: "daylight",
  });
  expect(screen.getByText("Notification style saved.")).not.toBeNull();
});
