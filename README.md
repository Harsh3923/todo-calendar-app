
# todo-calendar-app
a MERN stack based to-do calendar app
# 🗓️ TaskFlow – Calendar Based To-Do Web Application

![MongoDB](https://img.shields.io/badge/Database-MongoDB-green)
![Express](https://img.shields.io/badge/Backend-Express.js-darkgrey)
![React](https://img.shields.io/badge/Frontend-React-blue)
![Node](https://img.shields.io/badge/Runtime-Node.js-yellow)
![Status](https://img.shields.io/badge/Project-Completed-success)

TaskFlow is a **modern calendar-based task management web application** that helps users organize their tasks visually and track productivity using analytics dashboards.

The system combines the simplicity of a **traditional to-do list** with the **visual clarity of a calendar interface**, allowing users to easily schedule tasks, track progress, and monitor productivity patterns.

---

# 📌 Overview

TaskFlow was designed to provide a simple yet powerful productivity tool where users can create tasks for specific dates and track their progress through a clean and intuitive interface.

Unlike basic to-do list applications, TaskFlow integrates a **calendar view and productivity dashboard** to provide a more comprehensive planning experience. Tasks can be created, prioritized, completed, and searched through an interactive interface.

The application also includes **data visualization tools** that help users analyze their productivity, such as completion rate statistics, task distribution charts, and monthly activity heatmaps.

### Future Extensions

This project can be expanded with several additional features:

* User authentication and account system
* Cloud database storage for persistent data
* Reminders for tasks
* Email or push notifications
* Collaboration features for shared task boards
* Mobile-responsive optimization
* AI-based productivity recommendations

---

# 🚀 Features
### ☀️/🌙 Change UI Themes
* Can toggle between light mode and dark mode with the press of a button

### 📅 Calendar Task Management

* Create tasks assigned to specific dates
* Create recurring task
* View tasks directly on the calendar
* Select a date to display tasks scheduled for that day

### ✔ Task Completion Tracking

* Mark tasks as completed with a checkbox
* Completed tasks move to a **Done list**
* Tasks appear with **strikethrough styling**

### 🔍 Task Search and Filters

* Search tasks using a live search bar
* Dropdown suggestions for matching tasks
* Filter tasks by:

  * Priority
  * Status
  * Date range

### 📊 Productivity Dashboard

Visual analytics include:

* Tasks completed this week
* Completion rate statistics
* Tasks grouped by priority
* Tasks grouped by status
* Monthly productivity heatmap
* Most productive day tracking

### 🎨 Clean UI Design

* Minimalistic layout
* Responsive components
* Organized task lists and calendar interface

---

# 🛠 Technologies Used

| Technology              | Role                                  |
| ----------------------- | ------------------------------------- |
| **MongoDB**             | Stores task data and user information |
| **Express.js**          | Backend server and API handling       |
| **React.js**            | Frontend user interface               |
| **Node.js**             | Server runtime environment            |
| **Recharts / Chart.js** | Data visualization for dashboards     |
| **JavaScript (ES6)**    | Application logic                     |
| **CSS**                 | UI styling                            |


---
# ⚙ Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/todo-calendar-app.git
```

### 2. Navigate to the project directory

```bash
cd todo-calendar-app
```

### 3. Install dependencies

```bash
cd backend
npm install
```
```bash
cd frontend
npm install
```

### 4. Install chart library

```bash
cd frontend
npm install recharts
```

---

# ▶ Running the Project

Start the development server:

```bash
cd backend
npm run start
```
```bash
cd frontend
npm run dev
```

Then open the application in your browser:

```
http://localhost:5173/
```

The project will automatically reload whenever changes are made to the source code.
If an error occurs then manually connect the database with your mongoDB compass and the run the backend and frontend.

---

# 📖 How to Use the Application

### Creating Tasks

Users can create tasks by selecting a date on the calendar and entering the task title and priority.

### Task Priorities

Each task can be assigned one of the following priorities:

* High
* Medium
* Low

This helps users identify important tasks quickly.

### Completing Tasks

Tasks can be marked as completed using a checkbox. When completed:

* The task moves to the completed list
* The task text is displayed with a strikethrough

### Searching Tasks

The search bar allows users to quickly find tasks. Matching tasks appear in a dropdown list for easy navigation.

### Viewing Productivity

The dashboard provides visual insights through charts and heatmaps that display task completion statistics and productivity trends.

---

# 🧠 Reflection

This project focused on designing and implementing a modern task management system using contemporary web development tools. The primary goal was to create a user-friendly interface that allows users to manage tasks visually while also providing productivity insights through analytics.

One of the main successes of the project was the integration of multiple interactive features such as calendar scheduling, search functionality, task completion tracking, and data visualization dashboards. These features work together to create a comprehensive productivity tool that goes beyond a simple to-do list.

One challenge encountered during development was maintaining compatibility between different UI components while continuously adding new features. As the application evolved, ensuring that new additions such as dashboards and filters did not interfere with existing functionality required careful debugging and testing.

Overall, the project successfully demonstrates the implementation of an interactive web application using modern front-end technologies. It also highlights the importance of clean UI design, modular component development, and data visualization for improving user productivity tools.

---

# 📌 Project Status

✅ Core functionality implemented
✅ Calendar based task management
✅ Task completion tracking
✅ Productivity dashboard and charts

Future improvements may include user accounts authorization and mobile optimization.

---
