using System.ComponentModel.DataAnnotations;

namespace SpeakerNotes.Functions.Models;

public sealed class SlideSet
{
    public string? Title { get; init; }

    [Required]
    [MinLength(1)]
    public required IReadOnlyList<Slide> Slides { get; init; }
}
