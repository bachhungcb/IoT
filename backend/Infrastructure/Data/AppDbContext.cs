using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Backend.Domain.Entities;

namespace SmartHomeHub.Backend.Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
        public DbSet<SensorReading> SensorReadings { get; set; } = null!;
        public DbSet<DeviceStatus> DeviceStatuses { get; set; } = null!;
    }
}