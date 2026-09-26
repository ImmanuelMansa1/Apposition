using System.Net.Http.Json;
using AppositionBackend.Models;

namespace AppositionBackend.Services;

public class PythonService
{
    private readonly HttpClient _httpClient;

    public PythonService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<List<CompetitorResult>> GetTopCompetitors(
        AnalysisRequest request,
        List<Competitor> competitors)
    {
        var pythonRequest = new PythonAnalysisRequest
        {
            AppIdea = request.AppIdea,
            KeyFeatures = request.KeyFeatures,
            TargetAudience = request.TargetAudience,
            Competitors = competitors
        };

        var response = await _httpClient.PostAsJsonAsync(
            "/similarity",
            pythonRequest
        );

        response.EnsureSuccessStatusCode();

        var result =
            await response.Content.ReadFromJsonAsync<PythonSimilarityResponse>();

        return result?.Results ?? [];
    }
}