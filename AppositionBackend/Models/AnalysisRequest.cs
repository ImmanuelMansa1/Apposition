namespace AppositionBackend.Models;

public class AnalysisRequest
{
    public string AppIdea { get; set; } = string.Empty;

    public List<string> KeyFeatures { get; set; } = [];

    public string TargetAudience { get; set; } = string.Empty;
}