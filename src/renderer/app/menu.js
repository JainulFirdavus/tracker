import {
  Activity,
  BookOpen,
  CalendarDays,
  Headphones,
  LayoutDashboard,
  NotebookPen,
  Settings2,
} from "lucide-react";

export const menuSections = [
  {
    label: "YOUR SPACE",
    ariaLabel: "Main navigation",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard, quick: true },
      { id: "activity", label: "Activity", icon: Activity, quick: true },
      { id: "planner", label: "Reminders", icon: CalendarDays, quick: true },
      { id: "notes", label: "Notes", icon: NotebookPen, quick: true },
      {
        id: "documentation",
        label: "Documentation",
        icon: BookOpen,
        quick: false,
      },
      { id: "settings", label: "Settings", icon: Settings2, quick: true },
    ],
  },
  {
    label: "LISTENING",
    ariaLabel: "Music navigation",
    items: [{ id: "music", label: "Music", icon: Headphones, quick: true }],
  },
];

const menuItems = menuSections.flatMap(({ items }) => items);

export const pages = menuItems.map(({ id, label }) => [id, label]);

export const quickLinks = menuItems
  .filter(({ quick }) => quick)
  .map(({ id, label, icon }) => [id, label, icon]);

export const pageIcons = Object.fromEntries(
  menuItems.map(({ id, icon }) => [id, icon]),
);
