namespace SpeakerNotes.Functions.Models;

public sealed class SlideResponse
{
    public required string Filename { get; init; }

    public bool IsValid { get; init; }

    public SlideSet? SlideSet { get; init; }

    public IReadOnlyList<string> Errors { get; init; } = [];
}
