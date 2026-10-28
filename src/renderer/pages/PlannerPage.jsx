import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import {
  CalendarDays,
  List,
  Plus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { EventEditor } from "../components/EventEditor";
import { IconButton } from "../components/IconButton";
import { request } from "../lib/api";

const plugins = [dayGridPlugin, listPlugin, interactionPlugin];

export default function PlannerPage({ active }) {
  const calendar = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("Loading reminders...");
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [view, setView] = useState("dayGridMonth");
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState("all");
  const [completed, setCompleted] = useState(false);
  const [editor, setEditor] = useState(null);

  useEffect(() => {
    if (!active || editor) return;
    const controller = new AbortController();
    let timer;
    async function load() {
      try {
        const next = await request("/api/events", {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setEvents(next);
          setLoaded(true);
          setError(false);
          setMessage("");
        }
      } catch (failure) {
        if (failure.name !== "AbortError") {
          setError(true);
          setMessage(`Could not load reminders: ${failure.message}`);
        }
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(load, 30000);
      }
    }
    load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [active, editor, retry]);
  useEffect(() => {
    if (!active || !loaded) return;
    const reminderId = new URLSearchParams(location.search).get("reminder");
    if (!reminderId) return;
    const entry = events.find((event) => event.id === reminderId);
    if (entry) {
      calendar.current?.getApi().gotoDate(entry.start);
      setEditor({ entry });
    } else {
      setError(true);
      setMessage("The linked reminder is no longer available.");
    }
    navigate("/planner", { replace: true });
  }, [active, loaded, events, location.search, navigate]);
  useEffect(() => {
    if (!active) return;
    const frame = requestAnimationFrame(() =>
      calendar.current?.getApi().updateSize(),
    );
    return () => cancelAnimationFrame(frame);
  }, [active]);

  async function save(next) {
    const updated = await request("/api/events", {
      method: "PUT",
      body: JSON.stringify(next),
    });
    setEvents(updated);
    setEditor(null);
    setMessage("Reminder changes saved.");
    setError(false);
  }
  const visible = events.filter(
    (event) =>
      (filter === "all" || event.type === filter) &&
      (completed || !event.completed),
  );
  return (
    <>
      <div className="planner-heading">
        <div>
          <p className="kicker">YOUR SCHEDULE</p>
          <h1 tabIndex={-1}>Reminders</h1>
        </div>
        <div className="view-switch" role="group" aria-label="Reminder view">
          {[
            ["dayGridMonth", CalendarDays, "Calendar"],
            ["listMonth", List, "List"],
          ].map(([name, Icon, label]) => (
            <button
              type="button"
              key={name}
              aria-pressed={view === name}
              onClick={() => {
                setView(name);
                calendar.current.getApi().changeView(name);
              }}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        <button
          id="new-event"
          className="planner-primary"
          type="button"
          disabled={!loaded}
          onClick={() => setEditor({})}
        >
          <Plus size={16} aria-hidden="true" />
          New reminder
        </button>
      </div>
      <div className="planner-toolbar">
        <div className="planner-period">
          <IconButton
            icon={ChevronLeft}
            label="Previous month"
            onClick={() => calendar.current.getApi().prev()}
          />
          <IconButton
            icon={ChevronRight}
            label="Next month"
            onClick={() => calendar.current.getApi().next()}
          />
          <h2 id="planner-period-title">{title}</h2>
          <button
            className="secondary-button"
            type="button"
            onClick={() => calendar.current.getApi().today()}
          >
            Today
          </button>
        </div>
        <div className="planner-filters">
          <label>
            <span className="sr-only">Reminder type</span>
            <select
              id="planner-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">All reminders</option>
              <option value="task">Tasks</option>
              <option value="meeting">Meetings</option>
            </select>
          </label>
          <label className="planner-check">
            <input
              id="planner-completed"
              type="checkbox"
              checked={completed}
              onChange={(event) => setCompleted(event.target.checked)}
            />
            Show completed
          </label>
        </div>
      </div>
      <div className="planner-legend">
        <span>
          <b className="task-dot" />
          Task
        </span>
        <span>
          <b className="meeting-dot" />
          Meeting
        </span>
        <span id="planner-count">
          {visible.length} {visible.length === 1 ? "reminder" : "reminders"}
        </span>
      </div>
      <p
        id="planner-status"
        role="status"
        className={error ? "planner-error" : ""}
      >
        {message}
      </p>
      {error && (
        <button
          id="planner-retry"
          className="secondary-button command-button"
          onClick={() => setRetry((value) => value + 1)}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Retry
        </button>
      )}
      <div id="planner-calendar" aria-label="Tasks and meetings calendar">
        <FullCalendar
          ref={calendar}
          plugins={plugins}
          initialView="dayGridMonth"
          headerToolbar={false}
          height="auto"
          fixedWeekCount={false}
          dayMaxEvents={3}
          firstDay={1}
          nowIndicator
          noEventsContent="No reminders this month"
          events={visible.map((event) => ({
            ...event,
            classNames: [
              event.type === "meeting" ? "planner-meeting" : "planner-task",
              ...(event.completed ? ["planner-done"] : []),
            ],
            backgroundColor: event.type === "meeting" ? "#316d94" : "#36765c",
            borderColor: event.type === "meeting" ? "#316d94" : "#36765c",
          }))}
          datesSet={(info) => setTitle(info.view.title)}
          dateClick={(info) => {
            if (loaded) setEditor({ selectedDate: info.date });
          }}
          eventClick={(info) => {
            info.jsEvent.preventDefault();
            setEditor({
              entry: events.find((event) => event.id === info.event.id),
            });
          }}
          eventTimeFormat={{
            hour: "numeric",
            minute: "2-digit",
            meridiem: "short",
          }}
          eventDidMount={(info) => {
            info.el.title = `${info.event.extendedProps.type === "meeting" ? "Meeting" : "Task"}: ${info.event.title}`;
            info.el.setAttribute("role", "button");
            info.el.tabIndex = 0;
            info.el.addEventListener("keydown", (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                info.el.click();
              }
            });
          }}
        />
      </div>
      {editor && (
        <EventEditor
          entry={editor.entry}
          selectedDate={editor.selectedDate}
          onClose={() => setEditor(null)}
          onSave={(item) =>
            save(
              editor.entry
                ? events.map((event) => (event.id === item.id ? item : event))
                : [...events, item],
            )
          }
          onDelete={(id) => save(events.filter((event) => event.id !== id))}
        />
      )}
    </>
  );
}
