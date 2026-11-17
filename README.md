# 🚚 TruckFlow — Load Management System

A full-stack trucking company management app built with **React**, **Node.js/Express**, and **MongoDB**.

## Features
- ✅ Load management (add, edit, track status)
- ✅ Driver, Truck, Trailer, Broker management
- ✅ Auto-calculate miles from addresses (free, no API key needed)
- ✅ Document uploads (BOLs, Ratecons)
- ✅ PDF invoice generation
- ✅ Analytics dashboard with charts
- ✅ Dark mode UI
- ✅ Runs 100% locally — your data stays on your machine

---

## Prerequisites

Make sure you have installed:
- [Node.js](https://nodejs.org) (v18 or newer)
- [MongoDB Community Edition](https://www.mongodb.com/try/download/community) for Mac

### Install & Start MongoDB on Mac
```bash
# Using Homebrew (recommended)
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community
```

---

## Getting Started

### 1. Open the project in VS Code
```
File > Open Folder > select the truckflow folder
```

### 2. Open the integrated terminal (Ctrl+` or Cmd+`)

### 3. Install all dependencies
```bash
npm run install-all
```

### 4. Start the app
```bash
npm run dev
```

This will start:
- **Backend** on http://localhost:5000
- **Frontend** on http://localhost:80

Your browser should open automatically. If not, go to **http://localhost:80**

---

## Project Structure

```
truckflow/
├── package.json          ← Root (run scripts here)
├── server/               ← Node.js + Express backend
│   ├── index.js          ← Main server entry
│   ├── models/           ← MongoDB schemas
│   ├── routes/           ← API endpoints
│   ├── uploads/          ← Uploaded documents & invoices
│   └── .env              ← Config (MongoDB URI, port)
└── client/               ← React frontend
    └── src/
        ├── pages/        ← Dashboard, Loads, Drivers, etc.
        ├── components/   ← Shared components
        └── utils/api.js  ← API calls
```

---

## Usage Tips

### Adding Your First Load
1. Go to **Settings** and fill in your company info (used on invoices)
2. Add a **Driver**, **Truck**, and **Trailer** first
3. Add a **Broker**
4. Go to **Loads** → **Add Load**
5. Fill in pickup/delivery → click **Auto-calculate Miles**

### Generating an Invoice
1. Open a load → click **Generate Invoice**
2. Confirm your company info
3. PDF opens in a new tab — save or print it

### Documents (BOLs, Ratecons)
- Open any load → scroll to **Documents**
- Click **Upload** — files auto-detect type from filename
  - Files with "bol" in name → tagged as BOL
  - Files with "rate" in name → tagged as Ratecon

---

## Mile Calculation
Uses free OpenStreetMap/OSRM routing — **no API key required**.
Requires internet connection to calculate miles.

---

## Stopping the App
Press `Ctrl+C` in the terminal.

To stop MongoDB:
```bash
brew services stop mongodb-community
```
