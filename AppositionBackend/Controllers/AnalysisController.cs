using Microsoft.AspNetCore.Mvc;
using AppositionBackend.Models;
using AppositionBackend.Services;

namespace AppositionBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AnalysisController : ControllerBase
{
    private readonly ItunesService _itunesService;
    private readonly PythonService _pythonService;

    public AnalysisController(
        ItunesService itunesService,
        PythonService pythonService)
    {
        _itunesService = itunesService;
        _pythonService = pythonService;
    }

    [HttpPost]
    public async Task<ActionResult<List<CompetitorResult>>> Analyze(
        AnalysisRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AppIdea))
            return BadRequest("App idea is required.");

        if (string.IsNullOrWhiteSpace(request.KeyFeatures))
            return BadRequest("Key features are required.");

        if (string.IsNullOrWhiteSpace(request.TargetAudience))
            return BadRequest("Target audience is required.");

        // Get potential competitors from iTunes
        var candidates = await _itunesService.Search(request);

        // Send candidates to Python and get the top 10
        var topCompetitors = await _pythonService.GetTopCompetitors(
            request,
            candidates
        );

        return Ok(topCompetitors);
    }
}