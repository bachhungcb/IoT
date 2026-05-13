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

            var options = new MqttClientOptionsBuilder()
                .WithTcpServer(broker, port)
                .WithCredentials(_config["MQTT:Username"], _config["MQTT:Password"])
                .Build();

            _mqttClient.DisconnectedAsync += async e =>
            {
                await Task.Delay(TimeSpan.FromSeconds(5));
                try { await _mqttClient.ConnectAsync(options); } catch { }
            };

            _mqttClient.ApplicationMessageReceivedAsync += async e =>
            {
                var topic = e.ApplicationMessage.Topic;
                var payload = Encoding.UTF8.GetString(e.ApplicationMessage.PayloadSegment);

                // Assuming your sensor publishes to a topic like "smarthome/sensor/data"
                if (topic.StartsWith("smarthome/sensor/"))
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
            
            // Subscribe to important topics
            await _mqttClient.SubscribeAsync("smarthome/sensor/#");
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