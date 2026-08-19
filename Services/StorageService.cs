using XboxDashboard.Models;
using System.IO;


namespace XboxDashboard.Services;

public sealed class StorageService
{
    public StorageInfo GetAppDriveInfo()
    {
        try
        {
            string appPath = AppContext.BaseDirectory;
            string root = Path.GetPathRoot(appPath) ?? appPath;
            var drive = new DriveInfo(root);

            if (!drive.IsReady)
                return new StorageInfo { DriveName = root };

            return new StorageInfo
            {
                DriveName = drive.Name,
                VolumeLabel = drive.VolumeLabel,
                FileSystem = drive.DriveFormat,
                TotalBytes = drive.TotalSize,
                FreeBytes = drive.AvailableFreeSpace
            };
        }
        catch
        {
            return new StorageInfo();
        }
    }
}
