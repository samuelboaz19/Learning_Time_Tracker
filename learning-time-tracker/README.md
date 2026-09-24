# Learning Time Tracker

A Chrome extension that helps users understand how they spend their time online by automatically tracking active website usage, categorizing websites, and storing usage data for analysis.

## 🎯 Problem

When learning online, it is difficult to know how much time is actually spent on productive activities versus other websites.

Learning Time Tracker was built to provide a simple way to:

* Track active time spent on websites
* Understand where learning time is being spent
* Automatically categorize websites
* Review daily usage and activity
* Store historical usage data for analysis

## 💡 Solution

Learning Time Tracker runs as a Chrome extension and monitors active browsing sessions.

It detects the active website, measures active usage time, assigns a category, and periodically synchronizes the data with a FastAPI backend.

The backend stores the data in PostgreSQL/TimescaleDB, making the data available for historical analysis and visualization.

<img width="511" height="846" alt="Screenshot1" src="https://github.com/user-attachments/assets/5956ed8a-0da4-46bd-a016-9517052e33a4" />


## ✨ Features

* **Active Website Tracking** — Tracks time spent on the currently active website.
* **Idle Detection** — Prevents inactive periods from being counted as active usage.
* **Automatic Categorization** — Assigns websites to predefined categories.
* **Manual Categorization** — Allows users to change a website's category.
* **Session Tracking** — Records website activity over time.
* **Periodic Sync** — Synchronizes locally collected data with the backend.
* **Daily Usage Dashboard** — Shows how time is distributed across categories.
* **Activity Timeline** — Provides a chronological view of website activity.
* **Historical Storage** — Stores usage data in TimescaleDB for querying and analysis.

## 🏗️ Architecture

```text
┌──────────────────────┐
│   Chrome Extension   │
│                      │
│ • Active Tab         │
│ • Idle Detection     │
│ • Categorization     │
│ • Local Storage      │
└──────────┬───────────┘
           │
           │ Periodic Sync
           ▼
┌──────────────────────┐
│       FastAPI        │
│       Backend        │
│                      │
│ • API Endpoints      │
│ • Data Validation    │
│ • PostgreSQL Access  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ PostgreSQL +         │
│ TimescaleDB          │
│                      │
│ website_usage        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│       Grafana        │
│                      │
│ Data Visualization   │
└──────────────────────┘
```

## 🛠️ Tech Stack

| Technology         | Purpose                               |
| ------------------ | ------------------------------------- |
| JavaScript         | Chrome extension logic                |
| Chrome Manifest V3 | Browser extension platform            |
| Python             | Backend development                   |
| FastAPI            | REST API backend                      |
| PostgreSQL         | Relational database                   |
| TimescaleDB        | Time-series data storage and analysis |
| Grafana            | Data visualization                    |
| Docker             | Local database environment            |

## 📂 Project Structure

```text
Learning_Time_Tracker/
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
│
├── extension/
│   ├── manifest.json
│   ├── background.js
│   ├── popup.html
│   ├── popup.js
│   ├── styles.css
│   └── ...
│
├── database/
│   └── setup.sql
│
├── docs/
│   └── SETUP.md
│
├── screenshots/
│   ├── dashboard.png
│   └── timeline.png
│
├── .gitignore
└── README.md
```

## 🗄️ Database

The project uses a `website_usage` table to store website activity.

Current data model:

| Column             | Type          | Description          |
| ------------------ | ------------- | -------------------- |
| `time`             | `timestamptz` | Time of the activity |
| `website`          | `text`        | Website/domain       |
| `duration_seconds` | `bigint`      | Active duration      |
| `category`         | `text`        | Website category     |

Example categories include:

* PostgreSQL
* TimescaleDB
* Programming
* AI / ChatGPT
* Documentation
* GitHub
* Other

Database creation and SQL setup instructions are available in:

`database/setup.sql`

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/samuelboaz19/Learning_Time_Tracker.git
cd Learning_Time_Tracker
```

### 2. Set up the database

Follow the SQL instructions in:

```text
database/setup.sql
```

### 3. Set up the FastAPI backend

Navigate to:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file using `.env.example` as a template and add the local database connection details.

Start FastAPI:

```bash
uvicorn main:app --reload
```

The API will run locally on:

```text
http://127.0.0.1:8000
```

### 4. Load the Chrome extension

1. Open Chrome.
2. Navigate to:

```text
chrome://extensions
```

3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Select the `extension/` folder.
6. Open the extension and start browsing.

For complete installation and troubleshooting instructions, see:

`docs/SETUP.md`

## 📊 Example Use Case

A user spends time on several websites while learning:

```text
PostgreSQL documentation → Documentation
GitHub                  → GitHub
ChatGPT                 → AI / ChatGPT
Python tutorials        → Programming
Other websites          → Other
```

The extension records the active duration and periodically sends the collected data to the backend.

The stored data can then be queried and visualized to understand learning patterns.

## 📸 Screenshots

### Dashboard

![Learning Time Tracker Dashboard](screenshots/dashboard.png)

### Activity Timeline

![Learning Time Tracker Timeline](screenshots/timeline.png)

## 🔍 Example Analysis

The stored data can be queried to answer questions such as:

* How much time was spent learning today?
* Which category received the most time?
* Which websites were used most frequently?
* How has learning time changed over time?
* How much time was spent on PostgreSQL or programming?

This allows the tracker to function not only as a browser extension but also as a small time-series data application.

## 🔐 Security

Database credentials are stored locally in `.env` and are not committed to GitHub.

The repository contains `.env.example` with placeholder values instead.

Sensitive files such as `.env` and Python cache files are excluded through `.gitignore`.

## 🔮 Future Improvements

* More detailed learning analytics
* Weekly and monthly reports
* Improved category detection
* Additional Grafana dashboards
* Cloud deployment
* User-configurable productivity goals
* Better historical trend analysis

## 📄 Documentation

Detailed installation, database setup, and troubleshooting instructions:

`docs/SETUP.md`

---

## 

Built as a personal project to explore browser-based activity tracking, backend APIs, PostgreSQL/TimescaleDB, and data-driven productivity analysis.
