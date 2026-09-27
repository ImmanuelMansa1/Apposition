using System.Net.Http.Json;
using System.Linq;
using AppositionBackend.Models;

namespace AppositionBackend.Services;

public class PythonService
{
    private readonly HttpClient _httpClient;

    public PythonService(HttpClient httpClient) => _httpClient = httpClient;

    public async Task<List<CompetitorResult>> GetTopCompetitors(
        AnalysisRequest request,
        List<Competitor> competitors)
    {
        var pythonRequest = new
        {
            appIdea = request.AppIdea,
            keyFeatures = request.KeyFeatures,
            targetAudience = request.TargetAudience,
            competitors = competitors.Select(app => new
            {
                name = app.Name,
                developer = app.Developer,
                price = app.Price,
                description = app.Description,
                trackId = app.TrackId
            }).ToList()
        };

        using var response = await _httpClient.PostAsJsonAsync(
            "/similarity",
            pythonRequest);

        response.EnsureSuccessStatusCode();

        var result = await response.Content
            .ReadFromJsonAsync<PythonSimilarityResponse>();

        return result?.Results ?? [];
    }
}