using System.IO;
using System.Net.Http;

using System.Text.Json;
using XboxDashboard.Models;

namespace XboxDashboard.Services;

public sealed class NewsService
{
    private readonly HttpClient _httpClient = new();

    public async Task<List<NewsItem>> FetchAsync(string? remoteUrl)
    {
        // 1. tenta remoto
        if (!string.IsNullOrWhiteSpace(remoteUrl))
        {
            try
            {
                string json =
                    await _httpClient.GetStringAsync(remoteUrl);

                List<NewsItem>? remote =
                    Parse(json);

                if (remote is { Count: > 0 })
                    return remote;
            }
            catch
            {
                // cai para o local
            }
        }

        // 2. fallback local
        string localPath = Path.Combine(
            AppContext.BaseDirectory,
            "Web",
            "data",
            "news.json"
        );

        if (!File.Exists(localPath))
            return [];

        try
        {
            string json =
                await File.ReadAllTextAsync(localPath);

            return Parse(json) ?? [];
        }
        catch
        {
            return [];
        }
    }

    private static List<NewsItem>? Parse(string json)
    {
        JsonSerializerOptions options = new()
        {
            PropertyNameCaseInsensitive = true
        };

        // formato array direto
        try
        {
            List<NewsItem>? direct =
                JsonSerializer.Deserialize<List<NewsItem>>(
                    json,
                    options
                );

            if (direct is not null)
                return direct;
        }
        catch
        {
        }

        // formato { "items": [...] }
        try
        {
            NewsWrapper? wrapper =
                JsonSerializer.Deserialize<NewsWrapper>(
                    json,
                    options
                );

            return wrapper?.Items;
        }
        catch
        {
            return null;
        }
    }

    private sealed class NewsWrapper
    {
        public List<NewsItem> Items { get; set; } = [];
    }
}