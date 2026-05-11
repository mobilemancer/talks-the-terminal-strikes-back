using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Options;

namespace SpeakerNotes.Functions.Middleware;

public sealed class CorsMiddleware(IOptions<CorsSettings> options) : IFunctionsWorkerMiddleware
{
    private readonly CorsSettings settings = options.Value;

    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        var request = await context.GetHttpRequestDataAsync();
        if (request is null)
        {
            await next(context);
            return;
        }

        if (string.Equals(request.Method, "OPTIONS", StringComparison.OrdinalIgnoreCase))
        {
            var preflightResponse = request.CreateResponse(HttpStatusCode.NoContent);
            ApplyHeaders(request, preflightResponse);
            context.GetInvocationResult().Value = preflightResponse;
            return;
        }

        await next(context);

        var response = context.GetHttpResponseData();
        if (response is not null)
        {
            ApplyHeaders(request, response);
        }
    }

    private void ApplyHeaders(HttpRequestData request, HttpResponseData response)
    {
        response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, x-functions-key, x-requested-with");
        response.Headers.Add("Access-Control-Max-Age", "86400");

        var origin = GetOrigin(request);
        if (origin is null || !IsAllowed(origin))
        {
            return;
        }

        response.Headers.Add("Access-Control-Allow-Origin", origin);
        response.Headers.Add("Vary", "Origin");
    }

    private bool IsAllowed(string origin)
    {
        if (!Uri.TryCreate(origin, UriKind.Absolute, out var originUri))
        {
            return false;
        }

        if (settings.AllowLocalhost && string.Equals(originUri.Host, "localhost", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (settings.AllowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
        {
            return true;
        }

        return settings.AllowedOriginHostSuffixes.Any(
            suffix => originUri.Host.EndsWith(suffix.TrimStart('.'), StringComparison.OrdinalIgnoreCase));
    }

    private static string? GetOrigin(HttpRequestData request)
    {
        return request.Headers.TryGetValues("Origin", out var values)
            ? values.FirstOrDefault()
            : null;
    }
}

public sealed class CorsSettings
{
    public const string SectionName = "Cors";

    public string[] AllowedOrigins { get; set; } = [];

    public string[] AllowedOriginHostSuffixes { get; set; } =
    [
        ".azurestaticapps.net"
    ];

    public bool AllowLocalhost { get; set; } = true;
}
