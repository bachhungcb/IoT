using System.Text.Json.Serialization;

namespace SmartHomeHub.Backend.Application.DTOs
{
    public class SensorPayload
    {
        [JsonPropertyName("devID")]
        public string? DevID { get; set; }
        
        [JsonPropertyName("packetno")]
        public int? PacketNo { get; set; }
        
        [JsonPropertyName("temperature")]
        public double? Temperature { get; set; }
        
        [JsonPropertyName("humidity")]
        public double? Humidity { get; set; }
        
        [JsonPropertyName("light")]
        public double? Light { get; set; }
        
        [JsonPropertyName("sound_db")]
        public double? SoundDb { get; set; }
    }
}