using System.Diagnostics;
using System.IO;

using Microsoft.Win32;

namespace XboxDashboard.Services;

public sealed class WindowsService
{
    public bool OpenMicrosoftStore()
        => OpenUri("ms-windows-store:");

    public bool OpenUri(string uri)
    {
        if (string.IsNullOrWhiteSpace(uri))
            return false;

        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = uri,
                UseShellExecute = true
            });

            return true;
        }
        catch
        {
            return false;
        }
    }

    public Process? StartExecutable(string executable)
    {
        if (string.IsNullOrWhiteSpace(executable) ||
            !File.Exists(executable))
        {
            return null;
        }

        try
        {
            return Process.Start(new ProcessStartInfo
            {
                FileName = executable,
                WorkingDirectory =
                    Path.GetDirectoryName(executable) ?? "",
                UseShellExecute = true
            });
        }
        catch
        {
            return null;
        }
    }

    public bool OpenExecutable(string executable)
        => StartExecutable(executable) is not null;

    public static string? GetSteamInstallPath()
    {
        string[] localMachineKeys =
        [
            @"SOFTWARE\WOW6432Node\Valve\Steam",
            @"SOFTWARE\Valve\Steam"
        ];

        foreach (string keyPath in localMachineKeys)
        {
            try
            {
                using RegistryKey? key =
                    Registry.LocalMachine.OpenSubKey(keyPath);

                string? path =
                    key?.GetValue("InstallPath") as string;

                if (!string.IsNullOrWhiteSpace(path))
                    return path;
            }
            catch
            {
            }
        }

        try
        {
            using RegistryKey? key =
                Registry.CurrentUser.OpenSubKey(
                    @"Software\Valve\Steam");

            string? path =
                key?.GetValue("SteamPath") as string
                ?? key?.GetValue("SteamExe") as string;

            if (!string.IsNullOrWhiteSpace(path))
            {
                if (File.Exists(path))
                    path = Path.GetDirectoryName(path);

                return path;
            }
        }
        catch
        {
        }

        return null;
    }
}
