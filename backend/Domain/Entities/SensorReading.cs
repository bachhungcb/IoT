namespace SmartHomeHub.Backend.Domain.Entities
{
    public class SensorReading
    {
        public int Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public double Value { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}