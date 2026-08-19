using DiscordRPC;

namespace XboxDashboard.Services;

public sealed class DiscordRpcService : IDisposable
{
    private DiscordRpcClient? _client;
    private string _applicationId = "";
    private string _largeImageKey = "";
    private string _largeImageText = "Xbox Dashboard";
    private string _smallImageKey = "";
    private bool _showElapsedTime = true;

    public bool IsConfigured =>
        _client is not null &&
        !string.IsNullOrWhiteSpace(_applicationId);

    public void Configure(
        string? applicationId,
        bool enabled,
        bool showElapsedTime = true,
        string? largeImageKey = null,
        string? largeImageText = null,
        string? smallImageKey = null)
    {
        string id = applicationId?.Trim() ?? "";

        _showElapsedTime = showElapsedTime;
        _largeImageKey = largeImageKey?.Trim() ?? "";
        _largeImageText = string.IsNullOrWhiteSpace(largeImageText)
            ? "Xbox Dashboard"
            : largeImageText.Trim();
        _smallImageKey = smallImageKey?.Trim() ?? "";

        if (!enabled || string.IsNullOrWhiteSpace(id))
        {
            Dispose();
            return;
        }

        if (_client is not null && id == _applicationId)
        {
            SetPage("home");
            return;
        }

        Dispose();

        try
        {
            _applicationId = id;

            _client = new DiscordRpcClient(id)
            {
                SkipIdenticalPresence = true
            };

            _client.Initialize();
            SetPage("home");
        }
        catch
        {
            Dispose();
        }
    }

    public void SetDashboard()
        => SetPage("home");

    public void SetLibrary()
        => SetPage("library");

    public void SetPage(string page)
    {
        (string details, string state) = page switch
        {
            "library" => ("Xbox Dashboard", "Browsing game library"),
            "settings" => ("Xbox Dashboard", "Customizing settings"),
            "profile" => ("Xbox Dashboard", "Viewing profile"),
            _ => ("Xbox Dashboard", "On the home screen")
        };

        SetPresence(
            details,
            state,
            startedAt: null,
            gameName: null);
    }

    public void SetGame(
        string gameName,
        DateTime? startedAt = null)
    {
        SetPresence(
            gameName,
            "Playing on PC",
            startedAt,
            gameName);
    }

    private void SetPresence(
        string details,
        string state,
        DateTime? startedAt,
        string? gameName)
    {
        if (_client is null)
            return;

        try
        {
            RichPresence presence = new()
            {
                Details = details,
                State = state,
                Assets = BuildAssets(gameName)
            };

            if (_showElapsedTime && startedAt.HasValue)
            {
                presence.Timestamps = new Timestamps
                {
                    Start = startedAt.Value.ToUniversalTime()
                };
            }

            _client.SetPresence(presence);
        }
        catch
        {
        }
    }

    private Assets? BuildAssets(string? gameName)
    {
        if (string.IsNullOrWhiteSpace(_largeImageKey) &&
            string.IsNullOrWhiteSpace(_smallImageKey))
        {
            return null;
        }

        Assets assets = new();

        if (!string.IsNullOrWhiteSpace(_largeImageKey))
        {
            assets.LargeImageKey = _largeImageKey;
            assets.LargeImageText = _largeImageText;
        }

        if (!string.IsNullOrWhiteSpace(_smallImageKey))
        {
            assets.SmallImageKey = _smallImageKey;
            assets.SmallImageText = string.IsNullOrWhiteSpace(gameName)
                ? "Xbox Dashboard"
                : gameName;
        }

        return assets;
    }

    public void Dispose()
    {
        try
        {
            if (_client?.IsInitialized == true)
                _client.ClearPresence();
        }
        catch
        {
        }

        try
        {
            _client?.Dispose();
        }
        catch
        {
        }

        _client = null;
        _applicationId = "";
    }
}
