using Microsoft.EntityFrameworkCore;
using MQTTnet;
using MQTTnet.Client;
using SmartHomeHub.Backend.Data;
using SmartHomeHub.Backend.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database Context
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// MQTT Service
builder.Services.AddSingleton<MqttService>();

// CORS for Frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy => policy.WithOrigins("http://localhost:3000", "http://frontend:3000")
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials());
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseAuthorization();
app.MapControllers();

// Start MQTT Service
var mqttService = app.Services.GetRequiredService<MqttService>();
await mqttService.ConnectAsync();

app.Run();

namespace SmartHomeHub.Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
        public DbSet<SensorReading> SensorReadings { get; set; } = null!;
        public DbSet<DeviceStatus> DeviceStatuses { get; set; } = null!;
    }

    public class SensorReading
    {
        public int Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public double Value { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    public class DeviceStatus
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    }
}

namespace SmartHomeHub.Backend.Services
{
    public class MqttService
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
