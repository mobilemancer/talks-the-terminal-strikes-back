using System.Net;
using Azure;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using SpeakerNotes.Functions.Services;

namespace SpeakerNotes.Functions.Functions;

public sealed class ListSlidesFunction(IBlobService blobService, ILogger<ListSlidesFunction> logger)
{
    [Function("ListSlideFiles")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", "options", Route = "list-slides")]
        HttpRequestData request,
        CancellationToken cancellationToken)
    {
        if (string.Equals(request.Method, "OPTIONS", StringComparison.OrdinalIgnoreCase))
        {
            return request.CreateResponse(HttpStatusCode.NoContent);
        }

        try
        {
            var files = await blobService.ListSlideFilesAsync(cancellationToken);
            var response = request.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(files, cancellationToken);
            return response;
        }
        catch (RequestFailedException ex)
        {
            logger.LogError(ex, "Failed to list slide files from Blob Storage.");
            return await CreateErrorResponseAsync(
                request,
                HttpStatusCode.BadGateway,
                "Unable to list slide files from Blob Storage.",
                ex.Message,
                cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error while listing slide files.");
            return await CreateErrorResponseAsync(
                request,
                HttpStatusCode.InternalServerError,
                "An unexpected error occurred while listing slide files.",
                ex.Message,
                cancellationToken);
        }
    }

    private static async Task<HttpResponseData> CreateErrorResponseAsync(
        HttpRequestData request,
        HttpStatusCode statusCode,
        string message,
        string? details,
        CancellationToken cancellationToken)
    {
        var response = request.CreateResponse(statusCode);
        await response.WriteAsJsonAsync(new { error = message, details }, cancellationToken);
        return response;
    }
}
