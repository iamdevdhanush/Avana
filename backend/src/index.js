console.log("🔥 FILE STARTED");

try {
  const express = require("express");

  console.log("🔥 EXPRESS LOADED");

  const app = express();

  app.get("/", (req, res) => {
    res.send("WORKING");
  });

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log("🔥 SERVER RUNNING ON", PORT);
  });

} catch (err) {
  console.error("❌ CRASHED HERE:", err);
}