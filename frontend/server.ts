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
    mqttClient.subscribe("/smarthome/sensor/#");
    mqttClient.subscribe("smarthome/status/#");
    mqttClient.subscribe("/smarthome/status/#");
  });

  mqttClient.on("error", (err) => {
    console.error("MQTT connection error:", err);
  });

  mqttClient.on("message", (topic, message) => {
    const payload = message.toString();
    console.log(`MQTT Message: ${topic} -> ${payload}`);

    if (topic.startsWith("smarthome/sensor") || topic.startsWith("/smarthome/sensor")) {
      try {
        const data = JSON.parse(payload);
        
        // Map the payload properties to our sensor types
        if (data.temperature !== undefined) {
          sensorData.temperature = data.temperature;
          io.emit("sensor_update", { sensor: "temperature", value: sensorData.temperature });
        }
        if (data.humidity !== undefined) {
          sensorData.humidity = data.humidity;
          io.emit("sensor_update", { sensor: "humidity", value: sensorData.humidity });
        }
        if (data.light !== undefined) {
          sensorData.light = data.light;
          io.emit("sensor_update", { sensor: "light", value: sensorData.light });
        }
        if (data.sound_db !== undefined) {
          sensorData.noise = data.sound_db;
          io.emit("sensor_update", { sensor: "noise", value: sensorData.noise });
        }
      } catch (e) {
        console.error("Failed to parse JSON payload on frontend:", e);
      }
    } else if (topic.startsWith("smarthome/status/")) {
      const device = topic.split("/").pop();
      if (device && device in deviceStatus) {
        deviceStatus[device as keyof typeof deviceStatus] = payload === "true" || payload === "on" || payload === "1";
        io.emit("device_update", { device, status: deviceStatus[device as keyof typeof deviceStatus] });
      }
    }
  });


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
