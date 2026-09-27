using System.Text.Json.Serialization;

namespace AppositionBackend.Models;

public class CompetitorResult
{
    [JsonPropertyName("AppName")]
    public string CompetitorName { get; set; } = string.Empty;

    public string Developer { get; set; } = string.Empty;

    public string Price { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    // Raw cosine score, usually between -1 and 1.
    [JsonPropertyName("similarity_score")]
    public double Score { get; set; }

    // Score scaled to 0–100 for display.
    [JsonPropertyName("similarity_percentage")]
    public double SimilarityPercentage { get; set; }
}