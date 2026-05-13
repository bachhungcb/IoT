namespace SmartHomeHub.Backend.Domain.Entities
{
    public class DeviceStatus
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    }
}