# Todo Calendar App

**CPS 630: Web Application Development — A3: The Final Submission**
Toronto Metropolitan University | Dr. Anthony Scavarelli | Winter 2026

---

## Overview

The Todo Calendar App is a full-stack productivity web application that allows users to create, manage, and track tasks on an interactive calendar. The core idea is to give users a visual, date-driven way to organise their day-to-day responsibilities — with recurring tasks, priority levels, status tracking, drag-and-drop rescheduling, and a statistics dashboard.

The application was built with React (Vite) on the frontend, Node.js/Express on the backend, MongoDB (Mongoose) as the database, and Socket.io for real-time communication.

### How All Requirements Were Met

| Requirement | How It Was Addressed |
|---|---|
| Full-stack web application | React frontend + Express/Node.js backend + MongoDB |
| Multiple pages / views | Calendar, Dashboard, Completed Tasks, Task Detail, Auth |
| CRUD operations | Create, read, update, delete tasks via REST API |
| Authentication | OTP-based signup and login via Gmail (Nodemailer) |
| Nielsen usability heuristics | All 10 heuristics applied across every page (see Reflection) |
| Real-time communication | Socket.io — server pushes task events to connected clients instantly |

---

## Documentation

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas URI)
- A Gmail account with an App Password (for OTP emails)

### Environment Setup

Create a `.env` file inside the `backend/` folder:

```
PORT=8080
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_password
CLIENT_ORIGIN=http://localhost:5173
```

### Running the Project

**1. Install backend dependencies and start the server:**

```bash
cd backend
npm install
npm run dev
```

The API and WebSocket server will start at `http://localhost:8080`.

**2. Install frontend dependencies and start the dev server:**

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### How to Use the App

1. **Sign Up** — Enter your email and password on the Auth page. An OTP will be sent to your email. Enter the code to verify and activate your account.
2. **Log In** — Use your email and password. A JWT token is stored in localStorage to maintain your session.
3. **Calendar View** — The home page shows a monthly calendar. Click any date to see tasks for that day. Drag a task chip onto another date to reschedule it.
4. **Create a Task** — Click "+ Create Task" in the navbar, or press **N** anywhere on the calendar page. Fill in the title, date, time, priority, status, and optional recurrence.
5. **Task Detail** — Click "Open" on any task to view and edit all its fields, or delete it with an undo window.
6. **Dashboard** — View weekly KPIs, a completion heatmap, and a detailed breakdown of your tasks by status and priority.
7. **Completed Tasks** — Browse all tasks you have marked as done.
8. **Filters & Search** — Use the priority/status dropdowns to filter tasks on the selected date, or use the global search bar to find any task by title or description.

---

## Reflection

### Submitted Content Overview

The project is a task management system with calendar integration where each user has their own private account and data. The key technical highlights are:

- **Recurring tasks** — tasks can repeat daily, weekly, or monthly with a configurable interval. Each occurrence tracks its own status (`doingDates`, `completedDates` arrays on the model).
- **Drag-and-drop** — implemented with `@dnd-kit/core` so tasks can be moved between dates on the calendar.
- **Recharts dashboard** — a completion heatmap and KPI cards give users insight into their productivity trends.
- **Optimistic UI** — deletes are applied to local state immediately and only committed to the database after a 4.5-second undo window expires.

---

### Additional Components

#### 1. Authentication

The app implements a full OTP-based authentication flow using **Nodemailer** and a Gmail SMTP service:

- **Sign Up** — the user submits their email and password. The server sends a 6-digit OTP to their inbox. The account is only created in MongoDB after the OTP is verified. Passwords are hashed with `bcryptjs` before storage.
- **Log In** — credentials are verified against the hashed password. On success, a signed JWT is returned and stored in the browser's localStorage.
- **Forgot Password** — a reset OTP is emailed. The user enters the code and sets a new password.
- **Session management** — all protected API routes use a `requireAuth` middleware that validates the JWT on every request.
- **Data isolation** — every task is stored with a `userId` field and every query filters by `req.user.id`, so two users logged into the same app have completely separate task lists.

#### 2. Nielsen Usability Heuristics (Complete UI)

All 10 of Nielsen's heuristics were audited and implemented across the application:

| # | Heuristic | Implementation |
|---|---|---|
| H1 | Visibility of system status | CSS spinner replaces all loading text; global toast system (bottom-right, auto-dismiss) confirms every action |
| H2 | Match between system and real world | "med" rendered as "Medium"; status badges use icons: ○ todo, ◑ doing, ✓ done |
| H3 | User control and freedom | Delete uses undo-toast (4.5s restore window) instead of a confirm dialog; Escape closes modals; Back arrows on all sub-screens |
| H4 | Consistency and standards | Active route highlighted in navbar via `useLocation`; keyboard shortcut documented in the UI |
| H5 | Error prevention | Inline field validation with red highlight and error text; required field asterisks; password strength meter; show/hide password toggle |
| H6 | Recognition rather than recall | Today's date has a purple accent dot; active filter count badge; descriptive search placeholder; ARIA combobox/listbox roles |
| H7 | Flexibility and efficiency of use | Press **N** to open the create modal from anywhere on the calendar page without touching the mouse |
| H8 | Aesthetic and minimalist design | Dashboard labelled into three clear sections; consistent card-based layout throughout |
| H9 | Help users recognize and recover from errors | `friendlyError()` maps raw API/network errors to plain-language messages; every error state has a "Try again" button |
| H10 | Help and documentation | ARIA `role="dialog"`, `aria-labelledby`, `aria-live="polite"` throughout; descriptive placeholders and title tooltips on interactive controls |

#### 3. Real-Time Communication (Socket.io)

Socket.io was integrated so that any data mutation on the server is immediately reflected in the client UI without requiring a page refresh or polling:

- **Server setup** — the Express app is wrapped in a Node.js `http.Server` and Socket.io is attached to it. A JWT authentication middleware runs on every socket handshake, verifying the same token used by the REST API. Each authenticated socket is automatically joined to a private room named `user:<userId>`.
- **Event emission** — every mutating task route (`POST`, `PUT`, `DELETE`, and the two occurrence-status routes) emits a scoped event to the user's room after the database write:
  - `task:created` — carries the full new task object
  - `task:updated` — carries the updated task object
  - `task:deleted` — carries the deleted task's ID
- **Client handling** — `CalendarPage` connects to the socket on login using a singleton (`socket.js`) that attaches the JWT in the handshake `auth` field. It registers listeners for all three events and updates React state directly — no extra HTTP round-trip needed. On logout, `disconnectSocket()` is called to cleanly close the connection.
- **User isolation** — because events are emitted to `io.to('user:<userId>')`, a task created by one user is never broadcast to another user's socket.

---

### Challenges

- **Recurring task status per occurrence** — the trickiest data modelling challenge. A single task document needed to track which specific dates it was marked "doing" or "done" without duplicating the task. This was solved using `doingDates` and `completedDates` arrays on the Mongoose schema, with a `statusOnDate(task, iso)` helper on the frontend to derive the correct status for any given calendar cell.
- **Circular dependency with Socket.io and Express routes** — passing the `io` instance into route files without creating circular `require` chains required using `app.set('io', io)` in `server.js` and `req.app.get('io')` inside routes, keeping the server file as the single source of truth.
- **OTP expiry and email reliability** — ensuring OTP codes were short-lived and that Gmail SMTP was configured correctly (App Passwords vs. account passwords) took several iterations of testing.

### Successes

- The drag-and-drop calendar integration with `@dnd-kit` worked seamlessly alongside the recurrence and Socket.io layers without any state conflicts.
- The optimistic-UI undo delete pattern gives the app a polished, modern feel — users can act quickly without fear of permanent accidental deletion.
- Applying all 10 Nielsen heuristics systematically resulted in a noticeably more accessible and intuitive UI compared to the starting point, with zero external UI libraries added.
