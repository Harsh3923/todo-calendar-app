# TODO Calendar App (MERN CRUD Application)

## Overview

TaskCalendar is a full-stack web application that allows users to manage tasks through a calendar-based interface. The application is built using the MERN stack (MongoDB, Express, React, Node.js) and demonstrates how a client-side application communicates with a backend server through a RESTful API.

Users can create, view, update, and delete tasks while organizing them by date. The frontend provides multiple pages and reusable components that allow users to navigate between a dashboard, calendar view, and task details. These interactions send HTTP requests to the backend server, which processes the requests and retrieves or modifies task data stored in a MongoDB database.

This project was developed to meet the requirements of CPS630 Assignment 2, which focuses on developing a medium-fidelity MERN web application with a REST API and full CRUD functionality. The application demonstrates how a React frontend interacts with a Node.js and Express backend while using MongoDB for persistent data storage.

In the future, the application could be extended with additional features such as task notifications, drag-and-drop scheduling within the calendar, and integration with external calendar services. These improvements would expand the functionality of the application while maintaining the same client–server architecture.

## Technologies Used

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- CORS

### Frontend

- React
- Vite
- JavaScript (Fetch API / HTTP requests)
- HTML5
- CSS3

## Features

- MERN stack full-stack architecture
- Express backend server with REST API
- MongoDB database connection using Mongoose
- Automatic database test data seeding on startup
- Multiple React frontend views
- Full CRUD task management
- Modular backend structure (routes, models, middleware)
- Calendar-based task organization
- Error handling for invalid requests (404 handling)
- Client–server communication using HTTP requests

## Application Pages

### Dashboard Page

- Provides an overview of tasks
- Displays completion statistics and visual representations of tasks

### Calendar Page

- Displays tasks organized by date in a calendar-style interface.
- Users can view tasks scheduled for specific days.

### Create Task Page

- allows users to create tasks by specifying:
  - _Title_, _Description_, _Date_, _Recurrence_, _Priority_ and _Status_

### Authentication Page

- Provides a login interface for future authentication features.

## Project Structure

```
todo-calendar-app
│
├── backend
│   ├── server.js
│   ├── package.json
│   ├── .env
│   └── src
│       ├── middleware
│       ├── models
│       ├── routes
│       └── seed
│
├── frontend
│   ├── index.html
│   ├── package.json
│   └── src
│       ├── api
│       │   └── client.js
│       ├── components
│       │   ├── Calendar.jsx
│       │   ├── Navbar.jsx
│       │   └── TaskModal.jsx
│       ├── pages
│       │   ├── AuthPage.jsx
│       │   ├── CalendarPage.jsx
│       │   ├── CompletedTasksPage.jsx
│       │   ├── DashboardPage.jsx
│       │   └── TaskDetailPage.jsx
│       ├── App.jsx
│       ├── main.jsx
│       └── styles.css
│
└── README.md
```

## How to Run the Application

### Prerequisites

- Node.js
- npm
- MongoDB running locally or a MongoDB connection string

### Steps

#### 1. Clone the repository

- `git clone https://github.com/Harsh3923/todo-calendar-app.git`

#### 2. Navigate to the project directory

- `cd todo-calendar-app`

#### 3. Backend Setup:

- Navigate to the backend directory: `cd backend`
- Install dependencies: `npm install` or `npm i`
- Start the server: `npm run start`
- The backend server will run at `http://localhost:8080`

#### 4. Frontend Setup:

- Open a new terminal and navigate to the frontend directory: `cd frontend`
- Install dependencies: `npm install` or `npm i`
- Run the development server: `npm run dev`
- The frontend will run at `http://localhost:5173/`

#### 5. How to Use the Application

1. Open the frontend in a browser at `http://localhost:5173/`
2. Login using given credentials `demo@todo.com / demo123`
3. Create a new task using the task modal.
4. Tasks appear on the calendar according to their scheduled date.
5. Click on a task to view or edit its details.
6. Tasks can be updated or deleted through the interface.
7. View all tasks statistics in Dashboard

## Notes

The application connects to MongoDB and automatically sends test data if the database is empty when the server starts. This allows the application to demonstrate functionality immediately without manually adding tasks.

## Reflection

### Brief Overview

This assignment involved building a full-stack MERN application that demonstrates CRUD operations using a REST API and a React frontend. The project required implementing both backend and frontend components, connecting them through HTTP requests, and storing application data in a MongoDB database. Through this assignment, we gained a deeper understanding of how the MERN stack operates and how client applications communicate with backend servers.

### Challenges/Successes

One challenge in this project was ensuring proper communication between the React frontend and the Express backend, particularly when handling asynchronous API requests and database operations. Debugging issues related to request handling and ensuring correct API responses required careful testing of both frontend and backend components.

A success of this assignment was successfully implementing a modular backend structure with separate routes, models, and middleware while building a React interface that supports multiple views and CRUD operations. The final application demonstrates how a full-stack web application can be structured and extended for more complex features.
