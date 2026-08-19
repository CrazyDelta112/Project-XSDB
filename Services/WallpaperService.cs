using System.IO;
using System.Runtime.InteropServices;
using System.Text;

namespace XboxDashboard.Services;

public sealed class WallpaperService
{
    private const uint SpiGetDesktopWallpaper = 0x0073;
    private const uint SpiSetDesktopWallpaper = 0x0014;
    private const uint SpifUpdateIniFile = 0x0001;
    private const uint SpifSendChange = 0x0002;
    private const int MaxPath = 32768;

    [DllImport(
        "user32.dll",
        EntryPoint = "SystemParametersInfoW",
        CharSet = CharSet.Unicode,
        SetLastError = true)]
    private static extern bool GetSystemParametersInfo(
        uint uiAction,
        uint uiParam,
        StringBuilder pvParam,
        uint fWinIni);

    [DllImport(
        "user32.dll",
        EntryPoint = "SystemParametersInfoW",
        CharSet = CharSet.Unicode,
        SetLastError = true)]
    private static extern bool SetSystemParametersInfo(
        uint uiAction,
        uint uiParam,
        string pvParam,
        uint fWinIni);

    public string? GetCurrentWallpaper()
    {
        var buffer = new StringBuilder(MaxPath);

        return GetSystemParametersInfo(
            SpiGetDesktopWallpaper,
            (uint)buffer.Capacity,
            buffer,
            0)
                ? buffer.ToString()
                : null;
    }

    public bool SetWallpaper(string path)
    {
        if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
            return false;

        return SetSystemParametersInfo(
            SpiSetDesktopWallpaper,
            0,
            path,
            SpifUpdateIniFile | SpifSendChange);
    }

    public bool RestoreWallpaper(string? path)
    {
        return !string.IsNullOrWhiteSpace(path) && SetWallpaper(path);
    }
}
