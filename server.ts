import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mqtt from "mqtt";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // --- MQTT Integration ---
  const brokerUrl = process.env.MQTT_BROKER_URL || "broker.hivemq.com";
  const mqttPort = parseInt(process.env.MQTT_PORT || "1883");
  const mqttUsername = process.env.MQTT_USERNAME;
  const mqttPassword = process.env.MQTT_PASSWORD;

  // Kiểm tra nếu brokerUrl đã chứa giao thức thì dùng luôn, nếu không thì thêm mqtt://
  const connectionString = brokerUrl.includes("://") ? brokerUrl : `mqtt://${brokerUrl}`;

  console.log(`Connecting to MQTT broker at ${connectionString}${!brokerUrl.includes("://") ? `:${mqttPort}` : ""}...`);
  
  const mqttClient = mqtt.connect(connectionString, {
    port: mqttPort,
    username: mqttUsername,
    password: mqttPassword,
    reconnectPeriod: 5000,
  });

  const sensorData = {
    temperature: 0,
    humidity: 0,
    air_quality: 0,
    noise: 0,
    light: 0
  };

  const deviceStatus = {
    lights: false,
    alarm: false
  };

  mqttClient.on("connect", () => {
    console.log("Connected to MQTT broker");
    mqttClient.subscribe("smarthome/sensor/#");
    mqttClient.subscribe("smarthome/status/#");
  });

  mqttClient.on("error", (err) => {
    console.error("MQTT connection error:", err);
  });

  mqttClient.on("message", (topic, message) => {
    const payload = message.toString();
    console.log(`MQTT Message: ${topic} -> ${payload}`);

    if (topic.startsWith("smarthome/sensor/")) {
      const sensor = topic.split("/").pop();
      if (sensor && sensor in sensorData) {
        sensorData[sensor as keyof typeof sensorData] = parseFloat(payload);
        io.emit("sensor_update", { sensor, value: sensorData[sensor as keyof typeof sensorData] });
      }
    } else if (topic.startsWith("smarthome/status/")) {
      const device = topic.split("/").pop();
      if (device && device in deviceStatus) {
        deviceStatus[device as keyof typeof deviceStatus] = payload === "true" || payload === "on" || payload === "1";
        io.emit("device_update", { device, status: deviceStatus[device as keyof typeof deviceStatus] });
      }
    }
  });

  // --- Simulated Data for Preview ---
  setInterval(() => {
    // Random variations
    sensorData.temperature = 22 + Math.random() * 5;
    sensorData.humidity = 40 + Math.random() * 20;
    sensorData.air_quality = 10 + Math.random() * 40;
    sensorData.noise = 30 + Math.random() * 15;
    sensorData.light = 400 + Math.random() * 200;

    // Send updates to clients
    Object.entries(sensorData).forEach(([sensor, value]) => {
      io.emit("sensor_update", { sensor, value });
    });
  }, 3000);

  // --- WebSocket Integration ---
  io.on("connection", (socket) => {
    console.log("Client connected via WebSocket");
    
    // Send initial state
    socket.emit("init_state", { sensorData, deviceStatus });

    socket.on("toggle_device", (data: { device: string, status: boolean }) => {
      const { device, status } = data;
      console.log(`Toggling ${device} to ${status}`);
      
      // Update local state (optimistic)
      if (device in deviceStatus) {
        deviceStatus[device as keyof typeof deviceStatus] = status;
        
        // Publish command via MQTT
        mqttClient.publish(`smarthome/command/${device}`, status ? "on" : "off", { retain: true });
        
        // Broadcast to others
        socket.broadcast.emit("device_update", { device, status });
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

  // --- Vite Middleware / Static Files ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
