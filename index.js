const express = require("express");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

let client;

function initClient() {
  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true },
  });

  client.on("qr", (qr) => {
    console.log("Scan this QR code with WhatsApp:");
    qrcode.generate(qr, { small: true });
  });

  client.on("authenticated", () => {
    console.log("WhatsApp authenticated!");
  });

  client.on("ready", () => {
    console.log("WhatsApp is ready to send messages!");
  });

  client.on("message", (message) => {
    console.log(`Message from ${message.from}: ${message.body}`);
  });

  client.initialize();
}

initClient();

// -------------------- API 1: Send Text Message --------------------
app.post("/send-message", async (req, res) => {
  const { number, message } = req.body;

  if (!number || !message) {
    return res.status(400).json({ error: "Please provide number and message" });
  }

  const chatId = number.replace(/[^0-9]/g, "") + "@c.us";

  try {
    const sentMsg = await client.sendMessage(chatId, message);
    console.log(`Message sent to ${number}: ${message}`);
    res.json({ success: true, id: sentMsg.id._serialized });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------- API 2: Send Image --------------------
app.post("/send-image", async (req, res) => {
  const { number, imageUrl } = req.body;

  if (!number || !imageUrl) {
    return res
      .status(400)
      .json({ error: "Please provide number and imageUrl" });
  }

  const chatId = number.replace(/[^0-9]/g, "") + "@c.us";

  try {
    const media = await MessageMedia.fromUrl(imageUrl);
    const sentMsg = await client.sendMessage(chatId, media);
    console.log(`Image sent to ${number}: ${imageUrl}`);
    res.json({ success: true, id: sentMsg.id._serialized });
  } catch (err) {
    console.error("Error sending image:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------- API 3: Send Image with Caption --------------------
app.post("/send-image-text", async (req, res) => {
  const { number, imageUrl, caption } = req.body;

  if (!number || !imageUrl || !caption) {
    return res
      .status(400)
      .json({ error: "Please provide number, imageUrl, and caption" });
  }

  const chatId = number.replace(/[^0-9]/g, "") + "@c.us";

  try {
    const media = await MessageMedia.fromUrl(imageUrl);
    const sentMsg = await client.sendMessage(chatId, media, { caption });
    console.log(`Image with caption sent to ${number}: ${caption}`);
    res.json({ success: true, id: sentMsg.id._serialized });
  } catch (err) {
    console.error("Error sending image with text:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------- Logout API --------------------
app.post("/logout", async (req, res) => {
  try {
    await client.destroy();
    console.log("WhatsApp session has been closed!");

    const sessionPath = path.join(__dirname, ".wwebjs_auth");
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log("Session folder deleted! Next start will require QR scan.");
    }

    initClient();

    res.json({
      success: true,
      message: "WhatsApp session closed! Please scan QR again.",
    });
  } catch (err) {
    console.error("Error closing session:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
