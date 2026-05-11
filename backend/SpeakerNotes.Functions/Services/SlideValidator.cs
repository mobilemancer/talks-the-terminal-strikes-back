using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using SpeakerNotes.Functions.Models;

namespace SpeakerNotes.Functions.Services;

public interface ISlideValidator
{
    SlideValidationResult Validate(string jsonContent);
}

public sealed class SlideValidator : ISlideValidator
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true,
        WriteIndented = true
    };

    public SlideValidationResult Validate(string jsonContent)
    {
        if (string.IsNullOrWhiteSpace(jsonContent))
        {
            return SlideValidationResult.Invalid(["Slide JSON content is empty."]);
        }

        var errors = new List<string>();
        JsonDocument jsonDocument;

        try
        {
            jsonDocument = JsonDocument.Parse(jsonContent);
        }
        catch (JsonException ex)
        {
            return SlideValidationResult.Invalid([ex.Message]);
        }

        using (jsonDocument)
        {
            ValidateRoot(jsonDocument.RootElement, errors);
            if (errors.Count > 0)
            {
                return SlideValidationResult.Invalid(errors);
            }
        }

        SlideSet? slideSet;
        try
        {
            slideSet = JsonSerializer.Deserialize<SlideSet>(jsonContent, SerializerOptions);
        }
        catch (JsonException ex)
        {
            return SlideValidationResult.Invalid([ex.Message]);
        }

        if (slideSet is null)
        {
            return SlideValidationResult.Invalid(["Slide JSON could not be deserialized into a slide set."]);
        }

        ValidateDataAnnotations(slideSet, errors, "$", new HashSet<object>(ReferenceEqualityComparer.Instance));
        return errors.Count > 0
            ? SlideValidationResult.Invalid(errors)
            : SlideValidationResult.Valid(slideSet);
    }

    private static void ValidateRoot(JsonElement root, ICollection<string> errors)
    {
        if (root.ValueKind != JsonValueKind.Object)
        {
            errors.Add("The JSON root must be an object.");
            return;
        }

        if (root.TryGetProperty("title", out var titleElement) && titleElement.ValueKind != JsonValueKind.String)
        {
            errors.Add("$.title must be a string when provided.");
        }

        if (!root.TryGetProperty("slides", out var slidesElement))
        {
            errors.Add("The JSON root must contain a 'slides' array.");
            return;
        }

        if (slidesElement.ValueKind != JsonValueKind.Array)
        {
            errors.Add("$.slides must be an array.");
            return;
        }

        if (slidesElement.GetArrayLength() == 0)
        {
            errors.Add("$.slides must contain at least one slide.");
            return;
        }

        var index = 0;
        foreach (var slideElement in slidesElement.EnumerateArray())
        {
            ValidateSlide(slideElement, index++, errors);
        }
    }

    private static void ValidateSlide(JsonElement slideElement, int slideIndex, ICollection<string> errors)
    {
        var path = $"$.slides[{slideIndex}]";
        if (slideElement.ValueKind != JsonValueKind.Object)
        {
            errors.Add($"{path} must be an object.");
            return;
        }

        if (!slideElement.TryGetProperty("headlines", out var headlinesElement))
        {
            errors.Add($"{path}.headlines is required.");
        }
        else
        {
            ValidateHeadlines(headlinesElement, $"{path}.headlines", errors);
        }

        if (slideElement.TryGetProperty("bullets", out var bulletsElement))
        {
            ValidateStringArray(bulletsElement, $"{path}.bullets", errors, allowEmptyArray: true);
        }
    }

    private static void ValidateHeadlines(JsonElement headlinesElement, string path, ICollection<string> errors)
    {
        switch (headlinesElement.ValueKind)
        {
            case JsonValueKind.String:
                if (string.IsNullOrWhiteSpace(headlinesElement.GetString()))
                {
                    errors.Add($"{path} cannot be empty.");
                }
                break;
            case JsonValueKind.Array:
                ValidateStringArray(headlinesElement, path, errors, allowEmptyArray: false);
                break;
            default:
                errors.Add($"{path} must be either a string or an array of strings.");
                break;
        }
    }

    private static void ValidateStringArray(JsonElement arrayElement, string path, ICollection<string> errors, bool allowEmptyArray)
    {
        if (arrayElement.ValueKind != JsonValueKind.Array)
        {
            errors.Add($"{path} must be an array of strings.");
            return;
        }

        if (!allowEmptyArray && arrayElement.GetArrayLength() == 0)
        {
            errors.Add($"{path} must contain at least one string.");
            return;
        }

        var index = 0;
        foreach (var item in arrayElement.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(item.GetString()))
            {
                errors.Add($"{path}[{index}] must be a non-empty string.");
            }

            index++;
        }
    }

    private static void ValidateDataAnnotations(object instance, ICollection<string> errors, string path, ISet<object> visited)
    {
        if (!visited.Add(instance))
        {
            return;
        }

        var context = new ValidationContext(instance);
        var validationResults = new List<ValidationResult>();
        Validator.TryValidateObject(instance, context, validationResults, validateAllProperties: true);

        foreach (var validationResult in validationResults)
        {
            var memberNames = validationResult.MemberNames.Any() ? string.Join(", ", validationResult.MemberNames) : path;
            errors.Add($"{memberNames}: {validationResult.ErrorMessage}");
        }

        switch (instance)
        {
            case SlideSet slideSet:
                for (var index = 0; index < slideSet.Slides.Count; index++)
                {
                    ValidateDataAnnotations(slideSet.Slides[index], errors, $"$.slides[{index}]", visited);
                }
                break;
            case Slide slide when slide.Bullets is not null:
                for (var index = 0; index < slide.Bullets.Count; index++)
                {
                    if (string.IsNullOrWhiteSpace(slide.Bullets[index]))
                    {
                        errors.Add($"{path}.bullets[{index}] must be a non-empty string.");
                    }
                }
                break;
        }
    }
}

public sealed record SlideValidationResult(bool IsValid, SlideSet? SlideSet, IReadOnlyList<string> Errors)
{
    public static SlideValidationResult Valid(SlideSet slideSet) => new(true, slideSet, []);

    public static SlideValidationResult Invalid(IReadOnlyList<string> errors) => new(false, null, errors);
}
