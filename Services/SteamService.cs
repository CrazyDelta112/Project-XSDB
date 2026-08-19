using System.Text.RegularExpressions;
using System.IO;


namespace XboxDashboard.Services;

public sealed record SteamGameCandidate(
    int AppId,
    string Name,
    string InstallDirectory,
    string LibraryPath,
    string FullInstallPath);

public sealed class SteamService
{
    private static readonly Regex LibraryPathRegex = new(
        "\\\"path\\\"\\s+\\\"([^\\\"]+)\\\"",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex AppIdRegex = new(
        "\\\"appid\\\"\\s+\\\"(\\d+)\\\"",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex NameRegex = new(
        "\\\"name\\\"\\s+\\\"([^\\\"]*)\\\"",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex InstallDirRegex = new(
        "\\\"installdir\\\"\\s+\\\"([^\\\"]*)\\\"",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex LoginUserRegex = new(
        "\\\"(?<id>7656\\d{13})\\\"\\s*\\{(?<body>.*?)\\n\\s*\\}",
        RegexOptions.IgnoreCase |
        RegexOptions.Singleline |
        RegexOptions.Compiled);

    public string? FindSteamPath()
        => WindowsService.GetSteamInstallPath();

    public string? TryDetectMostRecentSteamId()
    {
        string? steamPath = FindSteamPath();

        if (string.IsNullOrWhiteSpace(steamPath))
            return null;

        string loginUsers = Path.Combine(
            steamPath,
            "config",
            "loginusers.vdf");

        if (!File.Exists(loginUsers))
            return null;

        try
        {
            string content = File.ReadAllText(loginUsers);
            string? first = null;

            foreach (Match match in LoginUserRegex.Matches(content))
            {
                string id = match.Groups["id"].Value;
                string body = match.Groups["body"].Value;
                first ??= id;

                if (Regex.IsMatch(
                        body,
                        "\\\"MostRecent\\\"\\s+\\\"1\\\"",
                        RegexOptions.IgnoreCase))
                {
                    return id;
                }
            }

            return first;
        }
        catch
        {
            return null;
        }
    }

    public List<SteamGameCandidate> ScanInstalledGames()
    {
        var results =
            new Dictionary<int, SteamGameCandidate>();

        string? steamPath = FindSteamPath();

        if (string.IsNullOrWhiteSpace(steamPath))
            return [];

        foreach (string library in FindLibraryPaths(steamPath))
        {
            string steamApps =
                Path.Combine(library, "steamapps");

            if (!Directory.Exists(steamApps))
                continue;

            foreach (string manifest in Directory.EnumerateFiles(
                         steamApps,
                         "appmanifest_*.acf",
                         SearchOption.TopDirectoryOnly))
            {
                SteamGameCandidate? game =
                    ParseManifest(manifest, library);

                if (game is not null)
                    results[game.AppId] = game;
            }
        }

        return results.Values
            .OrderBy(
                game => game.Name,
                StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static List<string> FindLibraryPaths(
        string steamPath)
    {
        var paths = new HashSet<string>(
            StringComparer.OrdinalIgnoreCase)
        {
            steamPath
        };

        string vdfPath = Path.Combine(
            steamPath,
            "steamapps",
            "libraryfolders.vdf");

        if (!File.Exists(vdfPath))
            return paths.ToList();

        string content = File.ReadAllText(vdfPath);

        foreach (Match match in LibraryPathRegex.Matches(content))
        {
            string path = match.Groups[1].Value
                .Replace("\\\\", "\\")
                .Trim();

            if (Directory.Exists(path))
                paths.Add(path);
        }

        return paths.ToList();
    }

    private static SteamGameCandidate? ParseManifest(
        string manifestPath,
        string libraryPath)
    {
        string content;

        try
        {
            content = File.ReadAllText(manifestPath);
        }
        catch
        {
            return null;
        }

        Match appIdMatch = AppIdRegex.Match(content);
        Match nameMatch = NameRegex.Match(content);
        Match installDirMatch = InstallDirRegex.Match(content);

        if (!appIdMatch.Success ||
            !nameMatch.Success ||
            !installDirMatch.Success ||
            !int.TryParse(
                appIdMatch.Groups[1].Value,
                out int appId))
        {
            return null;
        }

        string installDirectory =
            installDirMatch.Groups[1].Value;

        string fullInstallPath = Path.Combine(
            libraryPath,
            "steamapps",
            "common",
            installDirectory);

        return new SteamGameCandidate(
            appId,
            nameMatch.Groups[1].Value,
            installDirectory,
            libraryPath,
            fullInstallPath);
    }
}
