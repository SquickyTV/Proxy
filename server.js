const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();

app.use(cors({ origin: "*" }));
app.use(express.static("."));

let computer;

async function cleanup() {
  try {
    const resp = await axios.get("https://engine.hyperbeam.com/v0/vm", {
      headers: { Authorization: `Bearer ${process.env.HB_API_KEY}` },
    });
    const sessions = resp.data.results;
    for (const session of sessions) {
      await axios.delete(`https://engine.hyperbeam.com/v0/vm/${session.id}`, {
        headers: { Authorization: `Bearer ${process.env.HB_API_KEY}` },
      });
      console.log("Deleted old session:", session.id);
    }
  } catch (err) {
    console.error("Cleanup error:", err.message);
  }
}

app.get("/computer", async (req, res) => {
  if (computer) {
    res.send(computer);
    return;
  }
  try {
    const resp = await axios.post(
      "https://engine.hyperbeam.com/v0/vm",
      {},
      {
        headers: { Authorization: `Bearer ${process.env.HB_API_KEY}` },
      }
    );
    computer = resp.data;
    res.send(computer);
  } catch (err) {
    console.error("Hyperbeam error:", err.message);
    res.status(500).send({ error: err.message });
  }
});

app.listen(process.env.PORT || 8080, async () => {
  console.log("Server running");
  await cleanup();
});