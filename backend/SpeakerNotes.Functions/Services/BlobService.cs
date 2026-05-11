using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace SpeakerNotes.Functions.Services;

public interface IBlobService
{
    Task<IReadOnlyList<string>> ListSlideFilesAsync(CancellationToken cancellationToken);

    Task<BlobSlideFile?> GetSlideFileAsync(string filename, CancellationToken cancellationToken);
}

public sealed class BlobService(
    BlobContainerClient containerClient,
    IOptions<SlideStorageOptions> options,
    ILogger<BlobService> logger) : IBlobService
{
    private readonly SlideStorageOptions storageOptions = options.Value;

    public async Task<IReadOnlyList<string>> ListSlideFilesAsync(CancellationToken cancellationToken)
    {
        if (storageOptions.UseProjectSampleFiles)
        {
            logger.LogInformation("Listing slide files from project sample folder.");
            return GetSampleSlidePaths()
                .Select(Path.GetFileName)
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .Cast<string>()
                .OrderBy(name => name, StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }

        logger.LogInformation("Listing slide files from blob container {ContainerName}", containerClient.Name);

        var fileNames = new List<string>();
        await foreach (BlobItem blobItem in containerClient.GetBlobsAsync(cancellationToken: cancellationToken))
        {
            if (blobItem.Name.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
            {
                fileNames.Add(blobItem.Name);
            }
        }

        fileNames.Sort(StringComparer.OrdinalIgnoreCase);
        return fileNames;
    }

    public async Task<BlobSlideFile?> GetSlideFileAsync(string filename, CancellationToken cancellationToken)
    {
        if (storageOptions.UseProjectSampleFiles)
        {
            logger.LogInformation("Fetching slide file {Filename} from project sample folder.", filename);
            var samplePath = GetSampleSlidePaths()
                .FirstOrDefault(path => string.Equals(Path.GetFileName(path), filename, StringComparison.OrdinalIgnoreCase));

            if (samplePath is null)
            {
                return null;
            }

            var content = await File.ReadAllTextAsync(samplePath, cancellationToken);
            return new BlobSlideFile(filename, content, "sample", File.GetLastWriteTimeUtc(samplePath));
        }

        logger.LogInformation("Fetching slide file {Filename} from blob container {ContainerName}", filename, containerClient.Name);

        var blobClient = containerClient.GetBlobClient(filename);
        var existsResponse = await blobClient.ExistsAsync(cancellationToken);
        if (!existsResponse.Value)
        {
            return null;
        }

        var downloadResponse = await blobClient.DownloadContentAsync(cancellationToken);
        return new BlobSlideFile(
            filename,
            downloadResponse.Value.Content.ToString(),
            downloadResponse.Value.Details.ETag.ToString(),
            downloadResponse.Value.Details.LastModified);
    }

    private string[] GetSampleSlidePaths()
    {
        var root = Path.Combine(AppContext.BaseDirectory, storageOptions.SampleSlidesPath);
        return Directory.Exists(root)
            ? Directory.GetFiles(root, "*.json", SearchOption.TopDirectoryOnly)
            : [];
    }
}

public sealed class SlideStorageOptions
{
    public const string SectionName = "SlideStorage";

    public string ContainerName { get; set; } = "slide-decks";

    public string? ConnectionString { get; set; }

    public string? ServiceUri { get; set; }

    public bool UseProjectSampleFiles { get; set; }

    public string SampleSlidesPath { get; set; } = "SampleSlides";
}

public sealed record BlobSlideFile(string Filename, string Content, string ETag, DateTimeOffset? LastModified);
