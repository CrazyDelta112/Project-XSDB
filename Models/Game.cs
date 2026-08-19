namespace XboxDashboard.Models;

public enum GameType
{
    Steam,
    Executable,
    Shortcut
}

public sealed class Game
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public GameType Type { get; set; }
    public int? SteamAppId { get; set; }
    public string? SteamInstallPath { get; set; }
    public string? ExecutablePath { get; set; }
    public string? LaunchUri { get; set; }
    public string? IconPath { get; set; }
    public string? CoverPath { get; set; }
    public string? BackgroundPath { get; set; }
    public string? Description { get; set; }
    public DateTime AddedAt { get; set; }
    public DateTime? LastPlayed { get; set; }
    public bool IsFavorite { get; set; }
    public bool IsHidden { get; set; }
}
