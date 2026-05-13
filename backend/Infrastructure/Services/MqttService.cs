using MQTTnet;
using MQTTnet.Client;
using SmartHomeHub.Backend.Application.Interfaces;

namespace SmartHomeHub.Backend.Infrastructure.Services
{
    public class MqttService : IMqttService
    {
        private readonly IConfiguration _config;
        private IMqttClient? _mqttClient;

        public MqttService(IConfiguration config)
        {
            _config = config;
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

            await _mqttClient.ConnectAsync(options);
            
            // Subscribe logic can go here
            await _mqttClient.SubscribeAsync("smarthome/sensor/#");
        }
    }
}