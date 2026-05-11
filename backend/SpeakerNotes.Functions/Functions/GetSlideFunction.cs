using System.Net;
using System.Text.RegularExpressions;
using Azure;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using SpeakerNotes.Functions.Models;
using SpeakerNotes.Functions.Services;

namespace SpeakerNotes.Functions.Functions;

public sealed partial class GetSlideFunction(
    IBlobService blobService,
    ISlideValidator slideValidator,
    ILogger<GetSlideFunction> logger)
{
    [GeneratedRegex("^[A-Za-z0-9][A-Za-z0-9._-]*\\.json$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex ValidFilenamePattern();

    [Function("GetSlideFile")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", "options", Route = "get-slide")]
        HttpRequestData request,
        CancellationToken cancellationToken)
    {
        if (string.Equals(request.Method, "OPTIONS", StringComparison.OrdinalIgnoreCase))
        {
            return request.CreateResponse(HttpStatusCode.NoContent);
        }

        var filename = GetFilename(request);
        if (!IsValidFilename(filename))
        {
            return await WriteResponseAsync(
                request,
                HttpStatusCode.BadRequest,
                new SlideResponse
                {
                    Filename = filename ?? string.Empty,
                    Errors = ["The filename query parameter is required and must be a safe .json blob name."],
                    IsValid = false
                },
                cancellationToken);
        }

        try
        {
            var slideFile = await blobService.GetSlideFileAsync(filename!, cancellationToken);
            if (slideFile is null)
            {
                return await WriteResponseAsync(
                    request,
                    HttpStatusCode.NotFound,
                    new SlideResponse
                    {
                        Filename = filename!,
                        Errors = ["The requested slide file was not found in Blob Storage."],
                        IsValid = false
                    },
                    cancellationToken);
            }

            var validationResult = slideValidator.Validate(slideFile.Content);
            var statusCode = validationResult.IsValid ? HttpStatusCode.OK : HttpStatusCode.UnprocessableEntity;

            return await WriteResponseAsync(
                request,
                statusCode,
                new SlideResponse
                {
                    Filename = slideFile.Filename,
                    IsValid = validationResult.IsValid,
                    SlideSet = validationResult.SlideSet,
                    Errors = validationResult.Errors
                },
                cancellationToken);
        }
        catch (RequestFailedException ex)
        {
            logger.LogError(ex, "Failed to fetch slide file {Filename} from Blob Storage.", filename);
            return await WriteResponseAsync(
                request,
                HttpStatusCode.BadGateway,
                new SlideResponse
                {
                    Filename = filename!,
                    Errors = ["Unable to read the requested slide file from Blob Storage.", ex.Message],
                    IsValid = false
                },
                cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error while fetching slide file {Filename}.", filename);
            return await WriteResponseAsync(
                request,
                HttpStatusCode.InternalServerError,
                new SlideResponse
                {
                    Filename = filename!,
                    Errors = ["An unexpected error occurred while retrieving the slide file.", ex.Message],
                    IsValid = false
                },
                cancellationToken);
        }
    }

    private static string? GetFilename(HttpRequestData request)
    {
        var queryParameters = QueryHelpers.ParseQuery(request.Url.Query);
        return queryParameters.TryGetValue("filename", out var filename)
            ? filename.ToString()
            : null;
    }

    private static bool IsValidFilename(string? filename)
    {
        return !string.IsNullOrWhiteSpace(filename)
            && filename.Length <= 256
            && ValidFilenamePattern().IsMatch(filename);
    }

    private static async Task<HttpResponseData> WriteResponseAsync(
        HttpRequestData request,
        HttpStatusCode statusCode,
        SlideResponse responsePayload,
        CancellationToken cancellationToken)
    {
        var response = request.CreateResponse(statusCode);
        await response.WriteAsJsonAsync(responsePayload, cancellationToken);
        return response;
    }
}
