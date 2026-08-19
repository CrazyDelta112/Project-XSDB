namespace XboxDashboard.Models;

public sealed class StorageInfo
{
    public string DriveName { get; set; } = "";
    public string VolumeLabel { get; set; } = "";
    public string FileSystem { get; set; } = "";
    public long TotalBytes { get; set; }
    public long FreeBytes { get; set; }
    public long UsedBytes => Math.Max(0, TotalBytes - FreeBytes);
    public double UsedPercent => TotalBytes <= 0
        ? 0
        : Math.Clamp(UsedBytes * 100d / TotalBytes, 0, 100);
}
