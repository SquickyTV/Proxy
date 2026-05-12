const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();

app.use(cors({ origin: "*" }));
app.use(express.static("."));

const API_KEYS = [
  process.env.HB_API_KEY_1,
  process.env.HB_API_KEY_2,
  process.env.HB_API_KEY_3,
  process.env.HB_API_KEY_4,
  process.env.HB_API_KEY_5,
  process.env.HB_API_KEY_6,
  process.env.HB_API_KEY_7,
  process.env.HB_API_KEY_8,
  process.env.HB_API_KEY_9,
  process.env.HB_API_KEY_10,
];

// Track which sessions are in use
const sessions = {}; // { apiKey: sessionData }

async function cleanup() {
  for (const key of API_KEYS) {
    try {
      const resp = await axios.get("https://engine.hyperbeam.com/v0/vm", {
        headers: { Authorization: `Bearer ${key}` },
      });
      for (const session of resp.data.results) {
        await axios.delete(`https://engine.hyperbeam.com/v0/vm/${session.id}`, {
          headers: { Authorization: `Bearer ${key}` },
        });
        console.log("Deleted old session:", session.id);
      }
    } catch (err) {
      console.error("Cleanup error:", err.message);
    }
  }
  // Clear session cache
  Object.keys(sessions).forEach(k => delete sessions[k]);
}

app.get("/computer", async (req, res) => {
  // Find a key that doesn't have an active session
  const availableKey = API_KEYS.find(key => !sessions[key]);

  if (!availableKey) {
    return res.status(503).send({ error: "No available sessions, please try again later." });
  }

  try {
    const resp = await axios.post(
      "https://engine.hyperbeam.com/v0/vm",
      {},
      { headers: { Authorization: `Bearer ${availableKey}` } }
    );
    sessions[availableKey] = resp.data;
    res.send(resp.data);
  } catch (err) {
    console.error("Hyperbeam error:", err.message);
    res.status(500).send({ error: err.message });
  }
});

app.delete("/computer/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const key = API_KEYS.find(k => sessions[k]?.session_id === sessionId);
  if (!key) return res.status(404).send({ error: "Session not found" });

  try {
    await axios.delete(`https://engine.hyperbeam.com/v0/vm/${sessionId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    delete sessions[key];
    res.send({ success: true });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.listen(process.env.PORT || 8080, async () => {
  console.log("Server running");
  await cleanup();
});