namespace AppositionBackend.Models;

// The pitch split into fields by Gemini (Python /extract).
public class IdeaBrief
{
    public string AppName { get; set; } = string.Empty;

    public string AppIdea { get; set; } = string.Empty;

    public List<string> KeyFeatures { get; set; } = [];

    public string TargetAudience { get; set; } = string.Empty;

    // True when the pitch named none and Gemini derived them.
    public bool FeaturesInferred { get; set; }

    public bool AudienceInferred { get; set; }

    // "available", or "unavailable" when Gemini failed and the raw pitch is used.
    public string Status { get; set; } = string.Empty;
}
