using Microsoft.AspNetCore.Mvc;
using AppositionBackend.Models;
using AppositionBackend.Services;

namespace AppositionBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AnalysisController : ControllerBase
{
    private const string DocxMime =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    private readonly ItunesService _itunesService;
    private readonly PythonService _pythonService;
    private readonly ILogger<AnalysisController> _logger;

    public AnalysisController(
        ItunesService itunesService,
        PythonService pythonService,
        ILogger<AnalysisController> logger)
    {
        _itunesService = itunesService;
        _pythonService = pythonService;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Analyze(IdeaPrompt request)
    {
        if (string.IsNullOrWhiteSpace(request.Prompt))
            return BadRequest("Describe your app idea.");

        if (request.Prompt.Length > IdeaPrompt.MaxLength)
            return BadRequest(
                $"Keep the idea to {IdeaPrompt.MaxLength:N0} characters (it is {request.Prompt.Length:N0}).");

        try
        {
            // Gemini pulls the idea, features and audience out of the pitch
            var brief = await _pythonService.ExtractBrief(request.Prompt);

            // Get potential competitors from iTunes
            var candidates = await _itunesService.Search(brief);

            // Python ranks the top five, then adds evidence, reviews and analysis
            var result = await _pythonService.Analyze(brief, candidates);

            return Ok(new { brief, result });
        }
        catch (Exception error) when (error is HttpRequestException or TaskCanceledException)
        {
            _logger.LogError(error, "Analysis pipeline failed");
            return Problem(
                "The analysis service is unavailable. Check that the Python API is running on port 8000.",
                statusCode: StatusCodes.Status502BadGateway);
        }
    }

    [HttpPost("report")]
    public async Task<IActionResult> Report(ReportRequest request)
    {
        if (request.Result.ValueKind != System.Text.Json.JsonValueKind.Object)
            return BadRequest("Send the analysis result to build a report.");

        try
        {
            var bytes = await _pythonService.BuildReport(request);
            return File(bytes, DocxMime, "market_analysis.docx");
        }
        catch (Exception error) when (error is HttpRequestException or TaskCanceledException)
        {
            _logger.LogError(error, "Report generation failed");
            return Problem(
                "The market analysis could not be generated.",
                statusCode: StatusCodes.Status502BadGateway);
        }
    }
}
