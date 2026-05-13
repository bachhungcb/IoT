using System.Text;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using MQTTnet;
using MQTTnet.Client;
using SmartHomeHub.Backend.Application.DTOs;
using SmartHomeHub.Backend.Application.Interfaces;
using SmartHomeHub.Backend.Domain.Entities;
using SmartHomeHub.Backend.Infrastructure.Data;

namespace SmartHomeHub.Backend.Infrastructure.Services
{
    public class MqttService : IMqttService
    {
        private readonly IConfiguration _config;
        private readonly IServiceScopeFactory _scopeFactory;
        private IMqttClient? _mqttClient;

        public MqttService(IConfiguration config, IServiceScopeFactory scopeFactory)
        {
            _config = config;
            _scopeFactory = scopeFactory;
        }

        public async Task ConnectAsync()
        {
            var mqttFactory = new MqttFactory();
            _mqttClient = mqttFactory.CreateMqttClient();

            var broker = _config["MQTT:Broker"] ?? "broker.hivemq.com";
            var port = int.Parse(_config["MQTT:Port"] ?? "1883");

            // Strip prefix if any exists so we can cleanly control it
            broker = broker.Replace("wss://", "").Replace("ws://", "").Replace("mqtt://", "");

            var optionsBuilder = new MqttClientOptionsBuilder()
                .WithCredentials(_config["MQTT:Username"], _config["MQTT:Password"]);

            // If the port is 443, it is extremely likely this is a WebSocket over TLS hosted behind a proxy/Tailscale
            if (port == 443)
            {
                optionsBuilder
                    .WithWebSocketServer(o => o.WithUri($"wss://{broker}:{port}/mqtt"))
                    .WithTlsOptions(o => 
                    {
                        o.UseTls();
                        o.WithCertificateValidationHandler(_ => true); // Trust proxy certificates
                    });
            }
            else
            {
                // Fallback to standard TCP for local/internal connections
                optionsBuilder.WithTcpServer(broker, port);
            }

            var options = optionsBuilder.Build();

            _mqttClient.DisconnectedAsync += async e =>
            {
                await Task.Delay(TimeSpan.FromSeconds(5));
                try { await _mqttClient.ConnectAsync(options); } catch { }
            };

            _mqttClient.ApplicationMessageReceivedAsync += async e =>
            {
                var topic = e.ApplicationMessage.Topic;
                var payload = Encoding.UTF8.GetString(e.ApplicationMessage.PayloadSegment);

                // Check for topics with or without leading/trailing slash
                if (topic.StartsWith("smarthome/sensor") || topic.StartsWith("/smarthome/sensor"))
                {
                    try 
                    {
                        var data = JsonSerializer.Deserialize<SensorPayload>(payload);
                        if (data != null)
                        {
                            using var scope = _scopeFactory.CreateScope();
                            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                            var timestamp = DateTime.UtcNow;

                            if (data.Temperature.HasValue) 
                                dbContext.SensorReadings.Add(CreateReading("temperature", data.Temperature.Value, timestamp));
                            if (data.Humidity.HasValue) 
                                dbContext.SensorReadings.Add(CreateReading("humidity", data.Humidity.Value, timestamp));
                            if (data.Light.HasValue) 
                                dbContext.SensorReadings.Add(CreateReading("light", data.Light.Value, timestamp));
                            if (data.SoundDb.HasValue) 
                                dbContext.SensorReadings.Add(CreateReading("noise", data.SoundDb.Value, timestamp)); // "noise" to match frontend mapping

                            await dbContext.SaveChangesAsync();
                        }
                    }
                    catch (JsonException ex)
                    {
                        Console.WriteLine($"Failed to parse MQTT payload on {topic}: {ex.Message}");
                    }
                }
            };

            await _mqttClient.ConnectAsync(options);
            
            // Subscribe to important topics, handling both with and without leading slash
            await _mqttClient.SubscribeAsync("smarthome/sensor/#");
            await _mqttClient.SubscribeAsync("/smarthome/sensor/#");
        }

        private SensorReading CreateReading(string type, double value, DateTime timestamp)
        {
            return new SensorReading
            {
                Type = type,
                Value = value,
                Timestamp = timestamp,
                Unit = GetUnitForSensor(type)
            };
        }

        private string GetUnitForSensor(string type) => type switch
        {
            "temperature" => "°C",
            "humidity" => "%",
            "air_quality" => "AQI",
            "noise" => "dB",
            "light" => "LUX",
            _ => ""
        };
    }
}