namespace AppositionBackend.Models;

public class AnalysisResult
{
    public List<Competitor> Competitors { get; set; } = [];

    public List<CompetitorResult> Similarities { get; set; } = [];

    public string Insights { get; set; } = string.Empty;
}