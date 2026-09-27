namespace AppositionBackend.Models;

// What the frontend sends: the founder's one-message pitch.
public class IdeaPrompt
{
    // Same limit as the UI and the Python request models; longer text is rejected, not cut.
    public const int MaxLength = 1000;

    public string Prompt { get; set; } = string.Empty;
}
