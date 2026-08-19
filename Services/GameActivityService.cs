using System.Diagnostics;
using System.IO;

using XboxDashboard.Models;

namespace XboxDashboard.Services;

public sealed class GameActivityService : IDisposable
{
    private readonly object _sync = new();
    private CancellationTokenSource? _sessionCts;
    private int _sessionId;

    public GameActivity Current { get; private set; } = new();

    public event Action<GameActivity>? ActivityChanged;

    public void Start(Game game, Process? launchedProcess = null)
    {
        CancellationTokenSource cts;
        int sessionId;

        lock (_sync)
        {
            _sessionCts?.Cancel();
            _sessionCts?.Dispose();

            _sessionCts = new CancellationTokenSource();
            cts = _sessionCts;
            sessionId = ++_sessionId;

            Current = new GameActivity
            {
                IsPlaying = true,
                GameId = game.Id,
                GameName = game.Name,
                StartedAt = DateTime.Now
            };
        }

        RaiseChanged();

        string? directory = ResolveMonitorDirectory(game);

        if (launchedProcess is not null &&
            game.Type != GameType.Steam)
        {
            _ = MonitorLaunchedProcessAsync(
                launchedProcess,
                directory,
                sessionId,
                cts.Token);
            return;
        }

        if (!string.IsNullOrWhiteSpace(directory) &&
            Directory.Exists(directory))
        {
            _ = MonitorDirectoryProcessesAsync(
                directory,
                sessionId,
                cts.Token);
            return;
        }

        // URI shortcuts do not expose a reliable target process.
        _ = FallbackSessionTimeoutAsync(
            sessionId,
            cts.Token,
            TimeSpan.FromHours(4));
    }

    public void Clear()
    {
        lock (_sync)
        {
            _sessionCts?.Cancel();
            _sessionCts?.Dispose();
            _sessionCts = null;
            _sessionId++;
            Current = new GameActivity();
        }

        RaiseChanged();
    }

    private static string? ResolveMonitorDirectory(Game game)
    {
        if (game.Type == GameType.Steam &&
            !string.IsNullOrWhiteSpace(game.SteamInstallPath))
        {
            return game.SteamInstallPath;
        }

        if (!string.IsNullOrWhiteSpace(game.ExecutablePath))
        {
            return Path.GetDirectoryName(
                game.ExecutablePath);
        }

        return null;
    }

    private async Task MonitorLaunchedProcessAsync(
        Process process,
        string? directory,
        int sessionId,
        CancellationToken token)
    {
        try
        {
            try
            {
                await process.WaitForExitAsync(token);
            }
            catch (InvalidOperationException)
            {
                // Some shell-launched processes may not expose a wait handle.
            }

            if (token.IsCancellationRequested)
                return;

            // Some launchers exit and leave the real game running. If the
            // executable directory still has processes, keep the status alive.
            if (!string.IsNullOrWhiteSpace(directory) &&
                Directory.Exists(directory))
            {
                await WaitForDirectoryToBecomeIdleAsync(
                    directory,
                    sessionId,
                    token,
                    TimeSpan.FromSeconds(6));
                return;
            }

            ClearIfCurrent(sessionId);
        }
        catch (OperationCanceledException)
        {
        }
        finally
        {
            process.Dispose();
        }
    }

    private async Task MonitorDirectoryProcessesAsync(
        string directory,
        int sessionId,
        CancellationToken token)
    {
        DateTime launchDeadline =
            DateTime.UtcNow.AddMinutes(2);

        bool detected = false;
        DateTime? emptySince = null;

        try
        {
            while (!token.IsCancellationRequested)
            {
                bool running =
                    IsProcessRunningFromDirectory(directory);

                if (running)
                {
                    detected = true;
                    emptySince = null;
                }
                else if (detected)
                {
                    emptySince ??= DateTime.UtcNow;

                    if ((DateTime.UtcNow - emptySince.Value)
                        .TotalSeconds >= 6)
                    {
                        ClearIfCurrent(sessionId);
                        return;
                    }
                }
                else if (DateTime.UtcNow >= launchDeadline)
                {
                    // Steam/launcher never produced a process in the game folder.
                    ClearIfCurrent(sessionId);
                    return;
                }

                await Task.Delay(2000, token);
            }
        }
        catch (OperationCanceledException)
        {
        }
    }

    private async Task WaitForDirectoryToBecomeIdleAsync(
        string directory,
        int sessionId,
        CancellationToken token,
        TimeSpan grace)
    {
        DateTime? emptySince = null;

        try
        {
            while (!token.IsCancellationRequested)
            {
                if (IsProcessRunningFromDirectory(directory))
                {
                    emptySince = null;
                }
                else
                {
                    emptySince ??= DateTime.UtcNow;

                    if (DateTime.UtcNow - emptySince.Value >= grace)
                    {
                        ClearIfCurrent(sessionId);
                        return;
                    }
                }

                await Task.Delay(1500, token);
            }
        }
        catch (OperationCanceledException)
        {
        }
    }

    private async Task FallbackSessionTimeoutAsync(
        int sessionId,
        CancellationToken token,
        TimeSpan duration)
    {
        try
        {
            await Task.Delay(duration, token);
            ClearIfCurrent(sessionId);
        }
        catch (OperationCanceledException)
        {
        }
    }

    private static bool IsProcessRunningFromDirectory(string directory)
    {
        string root;

        try
        {
            root = Path.GetFullPath(directory)
                .TrimEnd(
                    Path.DirectorySeparatorChar,
                    Path.AltDirectorySeparatorChar)
                + Path.DirectorySeparatorChar;
        }
        catch
        {
            return false;
        }

        foreach (Process process in Process.GetProcesses())
        {
            try
            {
                string? fileName =
                    process.MainModule?.FileName;

                if (!string.IsNullOrWhiteSpace(fileName) &&
                    Path.GetFullPath(fileName)
                        .StartsWith(
                            root,
                            StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
            catch
            {
            }
            finally
            {
                process.Dispose();
            }
        }

        return false;
    }

    private void ClearIfCurrent(int sessionId)
    {
        lock (_sync)
        {
            if (sessionId != _sessionId)
                return;

            _sessionCts?.Cancel();
            _sessionCts?.Dispose();
            _sessionCts = null;
            Current = new GameActivity();
            _sessionId++;
        }

        RaiseChanged();
    }

    private void RaiseChanged()
    {
        ActivityChanged?.Invoke(new GameActivity
        {
            IsPlaying = Current.IsPlaying,
            GameId = Current.GameId,
            GameName = Current.GameName,
            StartedAt = Current.StartedAt
        });
    }

    public void Dispose()
    {
        lock (_sync)
        {
            _sessionCts?.Cancel();
            _sessionCts?.Dispose();
            _sessionCts = null;
        }
    }
}
