using AppositionBackend.Models;

namespace AppositionBackend.Models;

public class PythonAnalysisRequest
{
    public string AppIdea { get; set; } = string.Empty;
    public string KeyFeatures { get; set; } = string.Empty;
    public string TargetAudience { get; set; } = string.Empty;
    public List<Competitor> Competitors { get; set; } = [];
}