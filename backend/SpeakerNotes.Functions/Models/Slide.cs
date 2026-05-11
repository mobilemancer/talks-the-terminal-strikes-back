using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SpeakerNotes.Functions.Models;

public sealed class Slide : IValidatableObject
{
    public SlideHeadlines? Headlines { get; init; }

    public IReadOnlyList<string>? Bullets { get; init; }

    [MinLength(1)]
    public IReadOnlyList<SlideSection>? Sections { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (HasHeadlinesContent() || Sections is { Count: > 0 })
        {
            yield break;
        }

        yield return new ValidationResult(
            "A slide must define either headlines or sections.",
            [nameof(Headlines), nameof(Sections)]);
    }

    private bool HasHeadlinesContent()
    {
        if (Headlines?.Items is { Count: > 0 })
        {
            return Headlines.Items.Any(item => !string.IsNullOrWhiteSpace(item));
        }

        return !string.IsNullOrWhiteSpace(Headlines?.Text);
    }
}

public sealed class SlideSection
{
    [Required]
    public required string Header { get; init; }

    public IReadOnlyList<string>? Bullets { get; init; }
}

[JsonConverter(typeof(SlideHeadlinesJsonConverter))]
public sealed class SlideHeadlines
{
    public SlideHeadlines(string text)
    {
        Text = text;
    }

    public SlideHeadlines(IReadOnlyList<string> items)
    {
        Items = items;
    }

    public string? Text { get; }

    public IReadOnlyList<string>? Items { get; }
}

internal sealed class SlideHeadlinesJsonConverter : JsonConverter<SlideHeadlines>
{
    public override SlideHeadlines Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        return reader.TokenType switch
        {
            JsonTokenType.String => new SlideHeadlines(reader.GetString() ?? string.Empty),
            JsonTokenType.StartArray => new SlideHeadlines(ReadArray(ref reader)),
            _ => throw new JsonException("The 'headlines' property must be either a string or an array of strings.")
        };
    }

    public override void Write(Utf8JsonWriter writer, SlideHeadlines value, JsonSerializerOptions options)
    {
        if (value.Items is { Count: > 0 })
        {
            writer.WriteStartArray();
            foreach (var item in value.Items)
            {
                writer.WriteStringValue(item);
            }

            writer.WriteEndArray();
            return;
        }

        writer.WriteStringValue(value.Text);
    }

    private static IReadOnlyList<string> ReadArray(ref Utf8JsonReader reader)
    {
        var values = new List<string>();

        while (reader.Read())
        {
            if (reader.TokenType == JsonTokenType.EndArray)
            {
                return values;
            }

            if (reader.TokenType != JsonTokenType.String)
            {
                throw new JsonException("The 'headlines' array must contain only strings.");
            }

            values.Add(reader.GetString() ?? string.Empty);
        }

        throw new JsonException("Unexpected end of JSON while reading the 'headlines' array.");
    }
}
