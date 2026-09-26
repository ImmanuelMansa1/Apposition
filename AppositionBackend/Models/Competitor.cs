namespace AppositionBackend.Models;

public class Competitor
{
    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string Genre { get; set; } = string.Empty;

    public double Rating { get; set; }

    public int RatingCount { get; set; }

    public string AppStoreUrl { get; set; } = string.Empty;

    public string ArtworkUrl { get; set; } = string.Empty;
}