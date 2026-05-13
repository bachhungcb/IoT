using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Backend.Application.Interfaces;
using SmartHomeHub.Backend.Infrastructure.Data;
using SmartHomeHub.Backend.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database Context
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// MQTT Service
builder.Services.AddSingleton<IMqttService, MqttService>();

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
var mqttService = app.Services.GetRequiredService<IMqttService>();
await mqttService.ConnectAsync();

app.Run();
