namespace XboxDashboard.Models;

public sealed class GameActivity
{
    public bool IsPlaying { get; set; }
    public int? GameId { get; set; }
    public string GameName { get; set; } = "";
    public DateTime? StartedAt { get; set; }
}
