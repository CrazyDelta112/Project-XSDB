using System.Diagnostics;
using System.IO;
using System.Text.Json;
using System.Windows;
using System.Windows.Input;
using Microsoft.Win32;
using XboxDashboard.Models;
using XboxDashboard.Services;

namespace XboxDashboard;

public partial class MainWindow : Window
{
    private readonly DatabaseService _database;
    private readonly GameService _gameService;
    private readonly SteamService _steamService;
    private readonly WindowsService _windowsService;
    private readonly SettingsService _settingsService;
    private readonly ControllerService _controllerService;
    private readonly NewsService _newsService;
    private readonly WallpaperService _wallpaperService;
    private readonly DiscordRpcService _discordRpcService;
    private readonly SoundService _soundService;
    private readonly StorageService _storageService;
    private readonly GameActivityService _gameActivityService;

    private Profile _profile;
    private AppSettings _settings;

    private bool _isFullscreen;
    private WindowState _previousWindowState = WindowState.Normal;
    private WindowStyle _previousWindowStyle = WindowStyle.None;
    private ResizeMode _previousResizeMode = ResizeMode.CanResize;

    private CancellationTokenSource? _gameWallpaperCts;
    private string? _originalDesktopWallpaper;
    private int? _selectedGameId;
    private string _currentPage = "home";

    public MainWindow()
    {
        InitializeComponent();

        _database = new DatabaseService();
        _gameService = new GameService(_database);
        _steamService = new SteamService();
        _windowsService = new WindowsService();
        _settingsService = new SettingsService();
        _controllerService = new ControllerService();
        _newsService = new NewsService();
        _wallpaperService = new WallpaperService();
        _discordRpcService = new DiscordRpcService();
        _soundService = new SoundService();
        _storageService = new StorageService();
        _gameActivityService = new GameActivityService();

        _profile = _settingsService.LoadProfile();
        _settings = _settingsService.LoadSettings();

        ApplyControllerSettings();

        _controllerService.ButtonPressed +=
            ControllerService_ButtonPressed;

        _controllerService.ConnectionChanged +=
            ControllerService_ConnectionChanged;

        _gameActivityService.ActivityChanged +=
            GameActivityService_ActivityChanged;


        Loaded += MainWindow_Loaded;
    }

    private async void MainWindow_Loaded(
        object sender,
        RoutedEventArgs e)
    {
        try
        {
            await DashboardView.EnsureCoreWebView2Async();

            DashboardView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            DashboardView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            DashboardView.CoreWebView2.Settings.AreDevToolsEnabled = false;

            DashboardView.CoreWebView2.WebMessageReceived +=
                CoreWebView2_WebMessageReceived;

            DashboardView.CoreWebView2.NavigationCompleted +=
                DashboardView_NavigationCompleted;

            string webPath = Path.Combine(
                AppContext.BaseDirectory,
                "Web",
                "index.html");

            if (!File.Exists(webPath))
            {
                MessageBox.Show(
                    $"Missing dashboard file:\n{webPath}",
                    "Xbox Dashboard",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);

                return;
            }

            DashboardView.CoreWebView2.Navigate(
                new Uri(webPath).AbsoluteUri);

            if (_settings.EnableController)
                _controllerService.Start();

            ConfigureDiscordRpc();


            if (_settings.StartFullscreen)
            {
                await Dispatcher.InvokeAsync(
                    ToggleFullscreen);
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                $"Startup error:\n\n{ex.Message}",
                "Xbox Dashboard",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
        }
    }

    private async void DashboardView_NavigationCompleted(
        object? sender,
        Microsoft.Web.WebView2.Core.CoreWebView2NavigationCompletedEventArgs e)
    {
        SendProfileToWeb();
        SendSettingsToWeb();
        SendGamesToWeb();
        SendSystemInfoToWeb();
        SendGameActivityToWeb();
        SendControllerStateToWeb();

        await SendNewsToWebAsync();
    }

    private async void CoreWebView2_WebMessageReceived(
        object? sender,
        Microsoft.Web.WebView2.Core.CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            using JsonDocument document =
                JsonDocument.Parse(e.WebMessageAsJson);

            JsonElement root = document.RootElement;

            if (!root.TryGetProperty(
                    "type",
                    out JsonElement typeElement))
            {
                return;
            }

            string? type = typeElement.GetString();

            switch (type)
            {
                case "requestGames":
                    SendGamesToWeb();
                    break;

                case "requestSystemInfo":
                    SendSystemInfoToWeb();
                    break;


                case "launchGame":
                    HandleLaunchGame(root);
                    break;

                case "selectGame":
                    HandleGameSelection(root);
                    break;

                case "clearSelection":
                    ClearGameSelection();
                    break;

                case "openStore":
                    _windowsService.OpenMicrosoftStore();
                    break;

                case "openUrl":
                    HandleOpenUrl(root);
                    break;

                case "chooseAvatar":
                    ChooseAvatar();
                    break;

                case "selectImage":
                    SelectImage(root);
                    break;

                case "selectExecutable":
                    SelectExecutable();
                    break;

                case "saveProfile":
                    HandleSaveProfile(root);
                    break;

                case "saveSettings":
                    HandleSaveSettings(root);
                    break;

                case "addGame":
                    HandleAddGame(root);
                    break;

                case "updateGame":
                    HandleUpdateGame(root);
                    break;

                case "deleteGame":
                    HandleDeleteGame(root);
                    break;

                case "scanSteam":
                    SendSteamScanToWeb();
                    break;

                case "toggleFullscreen":
                    ToggleFullscreen();
                    break;

                case "minimizeApp":
                    WindowState = WindowState.Minimized;
                    break;

                case "maximizeApp":
                    ToggleMaximize();
                    break;

                case "closeApp":
                    Close();
                    break;

                case "pageChanged":
                    HandlePageChanged(root);
                    break;

                case "refreshNews":
                    await SendNewsToWebAsync();
                    break;
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine(
                $"WebView2 message error: {ex}");
        }
    }

    private void HandleOpenUrl(JsonElement root)
    {
        if (!root.TryGetProperty(
                "url",
                out JsonElement urlElement))
        {
            return;
        }

        string? value = urlElement.GetString();

        if (!Uri.TryCreate(
                value,
                UriKind.Absolute,
                out Uri? uri))
        {
            return;
        }

        if (uri.Scheme != Uri.UriSchemeHttp &&
            uri.Scheme != Uri.UriSchemeHttps)
        {
            return;
        }

        _windowsService.OpenUri(uri.AbsoluteUri);
    }

    private void HandleLaunchGame(JsonElement root)
    {
        if (!TryGetId(root, out int id))
            return;

        Game? game = _gameService.Get(id);

        if (game is null)
            return;

        bool launched = false;
        Process? launchedProcess = null;

        if (game.Type == GameType.Steam)
        {
            string? steamUri = !string.IsNullOrWhiteSpace(game.LaunchUri)
                ? game.LaunchUri
                : game.SteamAppId is int steamAppId
                    ? $"steam://rungameid/{steamAppId}"
                    : null;

            if (!string.IsNullOrWhiteSpace(steamUri))
                launched = _windowsService.OpenUri(steamUri);
        }
        else if (!string.IsNullOrWhiteSpace(game.ExecutablePath))
        {
            launchedProcess = _windowsService.StartExecutable(
                game.ExecutablePath);

            launched = launchedProcess is not null;
        }
        else if (!string.IsNullOrWhiteSpace(game.LaunchUri))
        {
            launched = _windowsService.OpenUri(game.LaunchUri);
        }

        if (!launched)
        {
            SendWebMessage(new
            {
                type = "gameLaunchFailed",
                id = game.Id,
                name = game.Name,
                message = "The game could not be started. Check its executable or launch URI."
            });

            return;
        }

        game.LastPlayed = DateTime.Now;
        _gameService.Update(game);

        _gameActivityService.Start(
            game,
            launchedProcess);

        SendGamesToWeb();
        SendToastToWeb($"Launching {game.Name}");
    }

    private void HandleGameSelection(JsonElement root)
    {
        if (!TryGetId(root, out int id))
            return;

        Game? game = _gameService.Get(id);

        if (game is null)
            return;

        if (_selectedGameId == id &&
            _gameWallpaperCts is not null)
        {
            return;
        }

        _selectedGameId = id;
        _gameWallpaperCts?.Cancel();

        if (!_settings.GamesBackground)
            return;

        string? background =
            game.BackgroundPath;

        if (string.IsNullOrWhiteSpace(background) ||
            !File.Exists(background))
        {
            return;
        }

        _originalDesktopWallpaper ??=
            _wallpaperService.GetCurrentWallpaper();

        _gameWallpaperCts =
            new CancellationTokenSource();

        _ = ApplyGameWallpaperLaterAsync(
            background,
            _gameWallpaperCts.Token);
    }

    private async Task ApplyGameWallpaperLaterAsync(
        string wallpaper,
        CancellationToken token)
    {
        try
        {
            await Task.Delay(
                TimeSpan.FromSeconds(
                    Math.Clamp(
                        _settings.GamesBackgroundDelaySeconds,
                        1,
                        30)),
                token);

            if (!token.IsCancellationRequested)
            {
                _wallpaperService.SetWallpaper(
                    wallpaper);
            }
        }
        catch (OperationCanceledException)
        {
        }
    }

    private void ClearGameSelection()
    {
        _selectedGameId = null;
        _gameWallpaperCts?.Cancel();
        _gameWallpaperCts = null;

        if (_originalDesktopWallpaper is not null)
        {
            _wallpaperService.RestoreWallpaper(
                _originalDesktopWallpaper);

            _originalDesktopWallpaper = null;
        }

    }

    private void HandlePageChanged(JsonElement root)
    {
        string page = root.TryGetProperty(
                "page",
                out JsonElement pageElement)
            ? pageElement.GetString() ?? "home"
            : "home";

        _currentPage = page;

        if (_gameActivityService.Current.IsPlaying)
        {
            _discordRpcService.SetGame(
                _gameActivityService.Current.GameName,
                _gameActivityService.Current.StartedAt);
        }
        else
        {
            _discordRpcService.SetPage(page);
        }

        if (page != "home")
            ClearGameSelection();

        if (page == "library")
            SendSystemInfoToWeb();
    }

    private void HandleSaveProfile(JsonElement root)
    {
        SetStringProperty(
            root,
            "name",
            value => _profile.Name = value,
            _profile.Name);

        SetStringProperty(
            root,
            "gamertag",
            value => _profile.Gamertag = value,
            _profile.Gamertag);

        SetStringProperty(
            root,
            "bio",
            value => _profile.Bio = value,
            _profile.Bio,
            allowEmpty: true);

        SetStringProperty(
            root,
            "location",
            value => _profile.Location = value,
            _profile.Location,
            allowEmpty: true);

        SetStringProperty(
            root,
            "status",
            value => _profile.Status = value,
            _profile.Status,
            allowEmpty: true);

        SetStringProperty(
            root,
            "theme",
            value => _profile.Theme = value,
            _profile.Theme);

        if (string.IsNullOrWhiteSpace(_profile.Gamertag))
            _profile.Gamertag = _profile.Name;

        _settingsService.SaveProfile(_profile);
        SendProfileToWeb();
    }

    private static void SetStringProperty(
        JsonElement root,
        string key,
        Action<string> setter,
        string fallback,
        bool allowEmpty = false)
    {
        if (!root.TryGetProperty(
                key,
                out JsonElement element))
        {
            return;
        }

        string value =
            element.GetString()?.Trim()
            ?? fallback;

        if (!allowEmpty &&
            string.IsNullOrWhiteSpace(value))
        {
            value = fallback;
        }

        setter(value);
    }

    private void HandleSaveSettings(JsonElement root)
    {
        if (TryGetBoolean(root, "startFullscreen", out bool startFullscreen))
            _settings.StartFullscreen = startFullscreen;

        if (TryGetBoolean(root, "enableController", out bool enableController))
            _settings.EnableController = enableController;

        if (TryGetBoolean(root, "rememberLastGame", out bool rememberLastGame))
            _settings.RememberLastGame = rememberLastGame;

        if (TryGetBoolean(root, "uiSounds", out bool uiSounds))
            _settings.UiSounds = uiSounds;

        if (TryGetBoolean(root, "gamesBackground", out bool gamesBackground))
            _settings.GamesBackground = gamesBackground;

        if (TryGetBoolean(root, "reducedMotion", out bool reducedMotion))
            _settings.ReducedMotion = reducedMotion;

        if (TryGetBoolean(root, "menuButtonOpensGuide", out bool menuGuide))
            _settings.MenuButtonOpensGuide = menuGuide;

        if (TryGetBoolean(root, "discordRpc", out bool discordRpc))
            _settings.DiscordRpc = discordRpc;


        if (TryGetInt(root, "gamesBackgroundDelaySeconds", out int backgroundDelay))
        {
            _settings.GamesBackgroundDelaySeconds =
                Math.Clamp(backgroundDelay, 1, 30);
        }

        if (TryGetInt(root, "controllerDeadzone", out int controllerDeadzone))
        {
            _settings.ControllerDeadzone =
                Math.Clamp(controllerDeadzone, 6000, 30000);
        }

        if (TryGetInt(root, "controllerRepeatMs", out int controllerRepeatMs))
        {
            _settings.ControllerRepeatMs =
                Math.Clamp(controllerRepeatMs, 70, 350);
        }

        if (TryGetDouble(root, "uiVolume", out double uiVolume))
            _settings.UiVolume = Math.Clamp(uiVolume, 0, 1);

        if (TryGetDouble(root, "backgroundDim", out double backgroundDim))
            _settings.BackgroundDim = Math.Clamp(backgroundDim, 0, 0.8);

        if (root.TryGetProperty("discordApplicationId", out JsonElement discordId))
            _settings.DiscordApplicationId = discordId.GetString()?.Trim() ?? "";

        if (TryGetBoolean(root, "discordRpcShowElapsedTime", out bool rpcElapsed))
            _settings.DiscordRpcShowElapsedTime = rpcElapsed;

        if (root.TryGetProperty("discordRpcLargeImageKey", out JsonElement rpcLargeKey))
            _settings.DiscordRpcLargeImageKey = rpcLargeKey.GetString()?.Trim() ?? "";

        if (root.TryGetProperty("discordRpcLargeImageText", out JsonElement rpcLargeText))
            _settings.DiscordRpcLargeImageText = rpcLargeText.GetString()?.Trim() ?? "Xbox Dashboard";

        if (root.TryGetProperty("discordRpcSmallImageKey", out JsonElement rpcSmallKey))
            _settings.DiscordRpcSmallImageKey = rpcSmallKey.GetString()?.Trim() ?? "";

        if (root.TryGetProperty("newsUrl", out JsonElement newsUrl))
            _settings.NewsUrl = newsUrl.GetString()?.Trim() ?? "";


        if (root.TryGetProperty("accentColor", out JsonElement accentColor))
            _settings.AccentColor = accentColor.GetString()?.Trim() ?? "#8BF000";

        if (root.TryGetProperty("dashboardWallpaperPreset", out JsonElement wallpaperPreset))
            _settings.DashboardWallpaperPreset = wallpaperPreset.GetString()?.Trim() ?? "xbox-green";

        if (root.TryGetProperty("dashboardBackgroundPath", out JsonElement dashboardBackground))
        {
            _settings.DashboardBackgroundPath =
                ToLocalPath(
                    dashboardBackground.GetString());
        }

        _settingsService.SaveSettings(_settings);

        ApplyControllerSettings();

        if (_settings.EnableController)
            _controllerService.Start();
        else
            _controllerService.Stop();

        ConfigureDiscordRpc();

        if (!_settings.GamesBackground)
            ClearGameSelection();

        SendSettingsToWeb();
    }

    private void ApplyControllerSettings()
    {
        _controllerService.Deadzone =
            _settings.ControllerDeadzone;

        _controllerService.RepeatMilliseconds =
            _settings.ControllerRepeatMs;
    }

    private static bool TryGetBoolean(
        JsonElement root,
        string key,
        out bool value)
    {
        value = false;

        if (!root.TryGetProperty(key, out JsonElement element) ||
            (element.ValueKind != JsonValueKind.True &&
             element.ValueKind != JsonValueKind.False))
        {
            return false;
        }

        value = element.GetBoolean();
        return true;
    }

    private static bool TryGetInt(
        JsonElement root,
        string key,
        out int value)
    {
        value = 0;

        return root.TryGetProperty(key, out JsonElement element) &&
               element.TryGetInt32(out value);
    }

    private static bool TryGetDouble(
        JsonElement root,
        string key,
        out double value)
    {
        value = 0;

        return root.TryGetProperty(key, out JsonElement element) &&
               element.TryGetDouble(out value);
    }

    private void HandleAddGame(JsonElement root)
    {
        Game game = GameFromJson(root);

        game.AddedAt = DateTime.Now;

        _gameService.Add(game);
        PrepareGameFiles(game);
        _gameService.Update(game);

        SendGamesToWeb();
        SendSystemInfoToWeb();
        SendToastToWeb("Game added");
    }

    private void HandleUpdateGame(JsonElement root)
    {
        if (!TryGetId(root, out int id))
            return;

        Game? existing = _gameService.Get(id);

        if (existing is null)
            return;

        Game updated =
            GameFromJson(root, existing);

        PrepareGameFiles(updated);
        _gameService.Update(updated);

        SendGamesToWeb();
        SendToastToWeb("Game updated");
    }

    private void HandleDeleteGame(JsonElement root)
    {
        if (!TryGetId(root, out int id))
            return;

        _gameService.Delete(id);

        if (_selectedGameId == id)
            ClearGameSelection();

        SendGamesToWeb();
        SendToastToWeb("Game removed");
    }

    private static bool TryGetId(
        JsonElement root,
        out int id)
    {
        id = 0;

        return root.TryGetProperty(
                   "id",
                   out JsonElement idElement) &&
               idElement.TryGetInt32(out id);
    }

    private Game GameFromJson(
        JsonElement root,
        Game? existing = null)
    {
        Game game =
            existing ??
            new Game
            {
                AddedAt = DateTime.Now
            };

        if (root.TryGetProperty("name", out JsonElement name))
            game.Name = name.GetString()?.Trim() ?? game.Name;

        if (root.TryGetProperty("gameType", out JsonElement gameType))
            game.Type = ParseGameType(gameType.GetString());

        if (root.TryGetProperty("steamAppId", out JsonElement steamId))
        {
            if (steamId.ValueKind == JsonValueKind.Null)
            {
                game.SteamAppId = null;
            }
            else if (steamId.TryGetInt32(out int appId))
            {
                game.SteamAppId = appId;
            }
        }

        if (root.TryGetProperty("steamInstallPath", out JsonElement steamInstallPath))
            game.SteamInstallPath = ToLocalPath(steamInstallPath.GetString());

        if (root.TryGetProperty("executablePath", out JsonElement executablePath))
            game.ExecutablePath = executablePath.GetString();

        if (root.TryGetProperty("launchUri", out JsonElement launchUri))
            game.LaunchUri = launchUri.GetString();

        if (root.TryGetProperty("icon", out JsonElement icon))
            game.IconPath = icon.GetString();

        if (root.TryGetProperty("cover", out JsonElement cover))
            game.CoverPath = cover.GetString();

        if (root.TryGetProperty("background", out JsonElement background))
            game.BackgroundPath = background.GetString();

        if (root.TryGetProperty("description", out JsonElement description))
            game.Description = description.GetString();

        if (TryGetBoolean(root, "favorite", out bool favorite))
            game.IsFavorite = favorite;

        return game;
    }

    private static GameType ParseGameType(string? type)
    {
        return type?.ToLowerInvariant() switch
        {
            "steam" => GameType.Steam,
            "shortcut" => GameType.Shortcut,
            _ => GameType.Executable
        };
    }

    private void PrepareGameFiles(Game game)
    {
        string directory = Path.Combine(
            _database.DataDirectory,
            "Games",
            game.Id.ToString());

        Directory.CreateDirectory(directory);

        game.IconPath = CopySelectedAsset(
            game.IconPath,
            directory,
            "icon");

        game.CoverPath = CopySelectedAsset(
            game.CoverPath,
            directory,
            "cover");

        game.BackgroundPath = CopySelectedAsset(
            game.BackgroundPath,
            directory,
            "background");
    }

    private static string? CopySelectedAsset(
        string? path,
        string directory,
        string name)
    {
        if (string.IsNullOrWhiteSpace(path))
            return null;

        if (path.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return path;
        }

        string source = ToLocalPath(path);

        if (!File.Exists(source))
            return path;

        string destination = Path.Combine(
            directory,
            name + Path.GetExtension(source));

        try
        {
            if (!string.Equals(
                    Path.GetFullPath(source),
                    Path.GetFullPath(destination),
                    StringComparison.OrdinalIgnoreCase))
            {
                File.Copy(source, destination, true);
            }

            return destination;
        }
        catch
        {
            return source;
        }
    }

    private void SelectExecutable()
    {
        OpenFileDialog dialog = new()
        {
            Title = "Select game executable",
            Filter = "Executable|*.exe"
        };

        if (dialog.ShowDialog() != true)
            return;

        SendWebMessage(
            new
            {
                type = "executableSelected",
                path = dialog.FileName
            });
    }

    private void SelectImage(JsonElement root)
    {
        string field = root.TryGetProperty(
                "field",
                out JsonElement fieldElement)
            ? fieldElement.GetString() ?? "cover"
            : "cover";

        OpenFileDialog dialog = new()
        {
            Title = "Select image",
            Filter = "Images|*.png;*.jpg;*.jpeg;*.webp;*.bmp"
        };

        if (dialog.ShowDialog() != true)
            return;

        SendWebMessage(
            new
            {
                type = "imageSelected",
                field,
                path = new Uri(dialog.FileName).AbsoluteUri
            });
    }

    private void ChooseAvatar()
    {
        OpenFileDialog dialog = new()
        {
            Title = "Choose profile picture",
            Filter = "Images|*.png;*.jpg;*.jpeg;*.webp;*.bmp"
        };

        if (dialog.ShowDialog() != true)
            return;

        string profileDirectory = Path.Combine(
            _database.DataDirectory,
            "Profile");

        Directory.CreateDirectory(profileDirectory);

        string destination = Path.Combine(
            profileDirectory,
            "avatar" + Path.GetExtension(dialog.FileName));

        File.Copy(
            dialog.FileName,
            destination,
            true);

        _profile.Avatar = destination;

        _settingsService.SaveProfile(_profile);
        SendProfileToWeb();
    }

    private void SendSteamScanToWeb()
    {
        List<SteamGameCandidate> games;

        try
        {
            games = _steamService.ScanInstalledGames();
        }
        catch
        {
            games = [];
        }

        SendWebMessage(
            new
            {
                type = "steamScanResult",
                games = games.Select(
                    game => new
                    {
                        appId = game.AppId,
                        name = game.Name,
                        installDirectory = game.InstallDirectory,
                        libraryPath = game.LibraryPath,
                        fullInstallPath = game.FullInstallPath
                    })
            });
    }

    private void SendGamesToWeb()
    {
        var games = _gameService
            .GetAll()
            .OrderByDescending(game => game.LastPlayed)
            .ThenBy(game => game.Name)
            .Select(
                game => new
                {
                    id = game.Id,
                    name = game.Name,
                    type = game.Type.ToString(),
                    steamAppId = game.SteamAppId,
                    steamInstallPath = game.SteamInstallPath,
                    executablePath = game.ExecutablePath,
                    launchUri = game.LaunchUri,
                    icon = ToWebUri(game.IconPath),
                    cover = ToWebUri(game.CoverPath),
                    background = ToWebUri(game.BackgroundPath),
                    description = game.Description ?? "",
                    addedAt = game.AddedAt,
                    lastPlayed = game.LastPlayed,
                    favorite = game.IsFavorite
                });

        SendWebMessage(
            new
            {
                type = "gamesUpdated",
                games
            });
    }

    private void SendSystemInfoToWeb()
    {
        StorageInfo storage =
            _storageService.GetAppDriveInfo();

        SendWebMessage(
            new
            {
                type = "systemInfoUpdated",
                storage = new
                {
                    driveName = storage.DriveName,
                    volumeLabel = storage.VolumeLabel,
                    fileSystem = storage.FileSystem,
                    totalBytes = storage.TotalBytes,
                    freeBytes = storage.FreeBytes,
                    usedBytes = storage.UsedBytes,
                    usedPercent = storage.UsedPercent
                }
            });
    }

    private async Task SendNewsToWebAsync()
{
    List<NewsItem> news =
        await _newsService.FetchAsync(
            _settings.NewsUrl);

    var items = news.Select(item => new
    {
        title = item.Title,
        description = item.Description,
        image = item.Image,
        action = item.Action,
        publishedAt = item.PublishedAt
    });

    SendWebMessage(new
    {
        type = "newsUpdated",
        items
    });
}

    private void SendProfileToWeb()
    {
        SendWebMessage(
            new
            {
                type = "profileUpdated",
                profile = new
                {
                    name = _profile.Name,
                    gamertag = _profile.Gamertag,
                    avatar = ToWebUri(_profile.Avatar) ?? "",
                    bio = _profile.Bio,
                    location = _profile.Location,
                    status = _profile.Status,
                    theme = _profile.Theme
                }
            });
    }

    private void SendSettingsToWeb()
    {
        SendWebMessage(
            new
            {
                type = "settingsUpdated",
                settings = new
                {
                    startFullscreen = _settings.StartFullscreen,
                    enableController = _settings.EnableController,
                    rememberLastGame = _settings.RememberLastGame,
                    accentColor = _settings.AccentColor,
                    dashboardBackground = ToWebUri(
                        _settings.DashboardBackgroundPath) ?? "",
                    dashboardBackgroundPath = _settings.DashboardBackgroundPath,
                    dashboardWallpaperPreset = _settings.DashboardWallpaperPreset,
                    backgroundDim = _settings.BackgroundDim,
                    reducedMotion = _settings.ReducedMotion,
                    uiSounds = _settings.UiSounds,
                    uiVolume = _settings.UiVolume,
                    gamesBackground = _settings.GamesBackground,
                    gamesBackgroundDelaySeconds = _settings.GamesBackgroundDelaySeconds,
                    controllerDeadzone = _settings.ControllerDeadzone,
                    controllerRepeatMs = _settings.ControllerRepeatMs,
                    menuButtonOpensGuide = _settings.MenuButtonOpensGuide,
                    discordRpc = _settings.DiscordRpc,
                    discordApplicationId = _settings.DiscordApplicationId,
                    discordRpcShowElapsedTime = _settings.DiscordRpcShowElapsedTime,
                    discordRpcLargeImageKey = _settings.DiscordRpcLargeImageKey,
                    discordRpcLargeImageText = _settings.DiscordRpcLargeImageText,
                    discordRpcSmallImageKey = _settings.DiscordRpcSmallImageKey,
                    newsUrl = _settings.NewsUrl
                }
            });
    }

    private static string ToLocalPath(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return "";

        if (!value.StartsWith(
                "file://",
                StringComparison.OrdinalIgnoreCase))
        {
            return value;
        }

        try
        {
            return new Uri(value).LocalPath;
        }
        catch
        {
            return value;
        }
    }

    private static string? ToWebUri(string? path)
    {
        if (string.IsNullOrWhiteSpace(path))
            return null;

        if (path.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("file://", StringComparison.OrdinalIgnoreCase))
        {
            return path;
        }

        if (!File.Exists(path))
            return null;

        return new Uri(path).AbsoluteUri;
    }

    private void SendToastToWeb(string message)
    {
        SendWebMessage(
            new
            {
                type = "toast",
                message
            });
    }

    private void SendWebMessage(object payload)
    {
        if (DashboardView.CoreWebView2 is null)
            return;

        DashboardView.CoreWebView2.PostWebMessageAsJson(
            JsonSerializer.Serialize(payload));
    }

    private void ControllerService_ButtonPressed(string button)
    {
        Dispatcher.Invoke(
            () =>
            {
                string outbound = button;

                if (button == "START" &&
                    _settings.MenuButtonOpensGuide)
                {
                    outbound = "GUIDE";
                }

                SendControllerStateToWeb(true);

                SendWebMessage(
                    new
                    {
                        type = "controllerButton",
                        button = outbound
                    });
            });
    }

    private void GameActivityService_ActivityChanged(GameActivity activity)
    {
        Dispatcher.Invoke(() =>
        {
            if (activity.IsPlaying)
            {
                _discordRpcService.SetGame(
                    activity.GameName,
                    activity.StartedAt);
            }
            else
            {
                _discordRpcService.SetPage(_currentPage);
            }

            SendGameActivityToWeb();
        });
    }

    private void SendGameActivityToWeb()
    {
        GameActivity activity = _gameActivityService.Current;

        SendWebMessage(new
        {
            type = "gameActivityUpdated",
            activity = new
            {
                isPlaying = activity.IsPlaying,
                gameId = activity.GameId,
                gameName = activity.GameName,
                startedAt = activity.StartedAt
            }
        });
    }

    private void ConfigureDiscordRpc()
    {
        _discordRpcService.Configure(
            _settings.DiscordApplicationId,
            _settings.DiscordRpc,
            _settings.DiscordRpcShowElapsedTime,
            _settings.DiscordRpcLargeImageKey,
            _settings.DiscordRpcLargeImageText,
            _settings.DiscordRpcSmallImageKey);

        if (_gameActivityService.Current.IsPlaying)
        {
            _discordRpcService.SetGame(
                _gameActivityService.Current.GameName,
                _gameActivityService.Current.StartedAt);
        }
        else
        {
            _discordRpcService.SetPage(_currentPage);
        }
    }

    private void ControllerService_ConnectionChanged(bool connected)
    {
        Dispatcher.Invoke(() =>
        {
            SendControllerStateToWeb(connected);
        });
    }

    private void SendControllerStateToWeb()
        => SendControllerStateToWeb(_controllerService.IsConnected);

    private void SendControllerStateToWeb(bool connected)
    {
        SendWebMessage(new
        {
            type = "controllerConnection",
            connected
        });
    }

    private void ToggleMaximize()
    {
        WindowState =
            WindowState == WindowState.Maximized
                ? WindowState.Normal
                : WindowState.Maximized;
    }

    private void ToggleFullscreen()
    {
        if (_isFullscreen)
        {
            WindowStyle = _previousWindowStyle;
            WindowState = _previousWindowState;
            ResizeMode = _previousResizeMode;

            TitleBarRow.Height =
                new GridLength(34);

            TitleBar.Visibility =
                Visibility.Visible;

            _isFullscreen = false;
            return;
        }

        _previousWindowStyle = WindowStyle;
        _previousWindowState = WindowState;
        _previousResizeMode = ResizeMode;

        WindowStyle = WindowStyle.None;
        WindowState = WindowState.Maximized;
        ResizeMode = ResizeMode.NoResize;

        TitleBarRow.Height =
            new GridLength(0);

        TitleBar.Visibility =
            Visibility.Collapsed;

        _isFullscreen = true;
    }

    private void MinimizeButton_Click(
        object sender,
        RoutedEventArgs e)
    {
        WindowState = WindowState.Minimized;
    }

    private void MaximizeButton_Click(
        object sender,
        RoutedEventArgs e)
    {
        ToggleMaximize();
    }

    private void CloseButton_Click(
        object sender,
        RoutedEventArgs e)
    {
        Close();
    }

    private void TitleBar_MouseLeftButtonDown(
        object sender,
        MouseButtonEventArgs e)
    {
        if (_isFullscreen)
            return;

        if (e.ClickCount == 2)
        {
            ToggleMaximize();
            return;
        }

        try
        {
            DragMove();
        }
        catch
        {
        }
    }

    protected override void OnClosed(EventArgs e)
    {
        _gameWallpaperCts?.Cancel();

        if (_originalDesktopWallpaper is not null)
        {
            _wallpaperService.RestoreWallpaper(
                _originalDesktopWallpaper);
        }

        _controllerService.Stop();
        _gameActivityService.Dispose();
        _discordRpcService.Dispose();

        base.OnClosed(e);
    }
}
