namespace XboxDashboard.Models;

public sealed class AppSettings
{
    public bool StartFullscreen { get; set; }
    public bool EnableController { get; set; } = true;
    public bool RememberLastGame { get; set; } = true;

    public string AccentColor { get; set; } = "#8BF000";
    public string DashboardBackgroundPath { get; set; } = "";
    public string DashboardWallpaperPreset { get; set; } = "xbox-green";
    public double BackgroundDim { get; set; } = 0.22;
    public bool ReducedMotion { get; set; }

    public bool UiSounds { get; set; } = true;
    public double UiVolume { get; set; } = 0.75;

    public bool GamesBackground { get; set; } = true;
    public int GamesBackgroundDelaySeconds { get; set; } = 4;

    public int ControllerDeadzone { get; set; } = 16000;
    public int ControllerRepeatMs { get; set; } = 125;
    public bool MenuButtonOpensGuide { get; set; } = true;

    public bool DiscordRpc { get; set; } = true;
    public string DiscordApplicationId { get; set; } = "";
    public bool DiscordRpcShowElapsedTime { get; set; } = true;
    public string DiscordRpcLargeImageKey { get; set; } = "";
    public string DiscordRpcLargeImageText { get; set; } = "Xbox Dashboard";
    public string DiscordRpcSmallImageKey { get; set; } = "";

    public string NewsUrl { get; set; } = "";
}
