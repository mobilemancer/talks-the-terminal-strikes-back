using Azure.Identity;
using Azure.Storage.Blobs;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using SpeakerNotes.Functions.Middleware;
using SpeakerNotes.Functions.Services;

var builder = FunctionsApplication.CreateBuilder(args);

builder.ConfigureFunctionsWebApplication();

builder.Services
    .AddOptions<SlideStorageOptions>()
    .Bind(builder.Configuration.GetSection(SlideStorageOptions.SectionName))
    .PostConfigure(options =>
    {
        options.ContainerName = string.IsNullOrWhiteSpace(options.ContainerName)
            ? "slide-decks"
            : options.ContainerName.Trim();
    });

builder.Services
    .AddOptions<CorsSettings>()
    .Bind(builder.Configuration.GetSection(CorsSettings.SectionName))
    .PostConfigure(options =>
    {
        options.AllowedOrigins = options.AllowedOrigins
            .Where(origin => !string.IsNullOrWhiteSpace(origin))
            .Select(origin => origin.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        options.AllowedOriginHostSuffixes = options.AllowedOriginHostSuffixes
            .Where(suffix => !string.IsNullOrWhiteSpace(suffix))
            .Select(suffix => suffix.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (options.AllowedOriginHostSuffixes.Length == 0)
        {
            options.AllowedOriginHostSuffixes = [
                ".azurestaticapps.net"
            ];
        }
    });

builder.Services.AddSingleton(serviceProvider =>
{
    var options = serviceProvider.GetRequiredService<IOptions<SlideStorageOptions>>().Value;

    if (!string.IsNullOrWhiteSpace(options.ConnectionString))
    {
        return new BlobServiceClient(options.ConnectionString);
    }

    if (!string.IsNullOrWhiteSpace(options.ServiceUri))
    {
        return new BlobServiceClient(new Uri(options.ServiceUri), new DefaultAzureCredential());
    }

    var azureWebJobsStorage = builder.Configuration["AzureWebJobsStorage"];
    if (!string.IsNullOrWhiteSpace(azureWebJobsStorage))
    {
        return new BlobServiceClient(azureWebJobsStorage);
    }

    throw new InvalidOperationException(
        "Configure SlideStorage:ConnectionString, SlideStorage:ServiceUri, or AzureWebJobsStorage.");
});

builder.Services.AddSingleton(serviceProvider =>
{
    var options = serviceProvider.GetRequiredService<IOptions<SlideStorageOptions>>().Value;
    var blobServiceClient = serviceProvider.GetRequiredService<BlobServiceClient>();
    return blobServiceClient.GetBlobContainerClient(options.ContainerName);
});

builder.Services.AddSingleton<IBlobService, BlobService>();
builder.Services.AddSingleton<ISlideValidator, SlideValidator>();
builder.UseMiddleware<CorsMiddleware>();

builder.Build().Run();
