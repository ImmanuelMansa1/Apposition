using System.Text.Json;
using AppositionBackend.Models;

namespace AppositionBackend.Services;

public class ItunesService
{
    private readonly HttpClient _httpClient;

    public ItunesService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<List<Competitor>> Search(AnalysisRequest request)
    {
        var searchTerms = new List<string>
        {
            request.AppIdea,
            request.KeyFeatures,
            request.TargetAudience
        };

        var competitors = new List<Competitor>();

        foreach (var term in searchTerms)
        {
            var url =
                $"https://itunes.apple.com/search" +
                $"?term={Uri.EscapeDataString(term)}" +
                $"&entity=software" +
                $"&limit=10";

            var response = await _httpClient.GetAsync(url);

            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();

            var result = JsonSerializer.Deserialize<ItunesResponse>(
                json,
                new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }
            );

            if (result?.Results == null)
                continue;

            foreach (var app in result.Results)
            {
                competitors.Add(new Competitor
                {
                    Name = app.TrackName ?? "",
                    Description = app.Description ?? "",
                    Genre = app.PrimaryGenreName ?? "",
                    Rating = app.AverageUserRating ?? 0,
                    RatingCount = app.UserRatingCount ?? 0,
                    AppStoreUrl = app.TrackViewUrl ?? "",
                    ArtworkUrl = app.ArtworkUrl100 ?? ""
                });
            }
        }

        return competitors
            .GroupBy(x => x.Name)
            .Select(x => x.First())
            .ToList();
    }
}

public class ItunesResponse
{
    public int ResultCount { get; set; }

    public List<ItunesApp> Results { get; set; } = [];
}

public class ItunesApp
{
    public string? TrackName { get; set; }

    public string? Description { get; set; }

    public string? PrimaryGenreName { get; set; }

    public double? AverageUserRating { get; set; }

    public int? UserRatingCount { get; set; }

    public string? TrackViewUrl { get; set; }

    public string? ArtworkUrl100 { get; set; }
}