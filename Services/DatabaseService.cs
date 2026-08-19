using Microsoft.Data.Sqlite;
using System.IO;


namespace XboxDashboard.Services;

public sealed class DatabaseService
{
    public string DataDirectory { get; }
    private readonly string _databasePath;

    public DatabaseService()
    {
        DataDirectory = Path.Combine(
            Environment.GetFolderPath(
                Environment.SpecialFolder.ApplicationData),
            "XboxDashboard");

        Directory.CreateDirectory(DataDirectory);

        _databasePath = Path.Combine(
            DataDirectory,
            "XboxDashboard.db");

        Initialize();
    }

    public SqliteConnection CreateConnection()
        => new($"Data Source={_databasePath}");

    private void Initialize()
    {
        using SqliteConnection connection = CreateConnection();
        connection.Open();

        using SqliteCommand command = connection.CreateCommand();
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS Games
            (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL,
                Type INTEGER NOT NULL,
                SteamAppId INTEGER NULL,
                SteamInstallPath TEXT NULL,
                ExecutablePath TEXT NULL,
                LaunchUri TEXT NULL,
                IconPath TEXT NULL,
                CoverPath TEXT NULL,
                BackgroundPath TEXT NULL,
                Description TEXT NULL,
                AddedAt TEXT NOT NULL,
                LastPlayed TEXT NULL,
                IsFavorite INTEGER NOT NULL DEFAULT 0,
                IsHidden INTEGER NOT NULL DEFAULT 0
            );
            """;

        command.ExecuteNonQuery();

        EnsureColumn(
            connection,
            "Games",
            "SteamInstallPath",
            "TEXT NULL");
    }

    private static void EnsureColumn(
        SqliteConnection connection,
        string table,
        string column,
        string declaration)
    {
        using SqliteCommand inspect = connection.CreateCommand();
        inspect.CommandText = $"PRAGMA table_info({table});";

        using SqliteDataReader reader = inspect.ExecuteReader();

        while (reader.Read())
        {
            if (string.Equals(
                    reader.GetString(1),
                    column,
                    StringComparison.OrdinalIgnoreCase))
            {
                return;
            }
        }

        reader.Close();

        using SqliteCommand alter = connection.CreateCommand();
        alter.CommandText =
            $"ALTER TABLE {table} ADD COLUMN {column} {declaration};";
        alter.ExecuteNonQuery();
    }
}
