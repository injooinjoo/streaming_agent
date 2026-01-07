const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// Initialize SQLite Database
const dbPath = path.resolve(__dirname, "weflab_clone.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Database connection error:", err.message);
  } else {
    console.log("Connected to SQLite database.");
    db.run(`CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      sender TEXT,
      amount INTEGER,
      message TEXT,
      platform TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);
  }
});

// Settings API
app.get("/api/settings/:key", (req, res) => {
  db.get("SELECT value FROM settings WHERE key = ?", [req.params.key], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.json({ value: "{}" });
    res.json({ value: row.value });
  });
});

app.post("/api/settings", (req, res) => {
  const { key, value } = req.body;
  db.run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, JSON.stringify(value)],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      // Notify overlays to refresh via socket
      io.emit("settings-updated", { key });
      res.json({ success: true });
    }
  );
});

// Basic Routes
app.get("/", (req, res) => {
  res.send("Weflab Clone Backend is running.");
});

// Simulated Event Trigger (for testing)
app.post("/api/simulate-event", (req, res) => {
  const { type, sender, amount, message, platform } = req.body;

  const event = {
    type: type || "chat",
    sender: sender || "User123",
    amount: amount || 0,
    message: message || "Hello Weflab!",
    platform: platform || "twitch",
    timestamp: new Date().toISOString(),
  };

  // Save to DB
  db.run(
    `INSERT INTO events (type, sender, amount, message, platform) VALUES (?, ?, ?, ?, ?)`,
    [event.type, event.sender, event.amount, event.message, event.platform],
    function (err) {
      if (err) {
        console.error("Error saving event:", err.message);
        return res.status(500).json({ error: "Failed to save event" });
      }

      // Emit to all connected clients
      io.emit("new-event", { ...event, id: this.lastID });
      res.json({ success: true, event: { ...event, id: this.lastID } });
    }
  );
});

// Get Historical Events
app.get("/api/events", (req, res) => {
  db.all(
    `SELECT * FROM events ORDER BY timestamp DESC LIMIT 50`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// Socket.io Connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
