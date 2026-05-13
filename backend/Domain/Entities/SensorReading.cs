namespace SmartHomeHub.Backend.Domain.Entities
{
    public class SensorReading
    {
        public int Id { get; set; }
        public string Type { get; set; } = string.Empty; // e.g., "temperature", "humidity", "air_quality"
        public string Unit { get; set; } = string.Empty; // e.g., "C", "%", "AQI"
        public double Value { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}