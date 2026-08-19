using Microsoft.Data.Sqlite;
using System.IO;

using XboxDashboard.Models;

namespace XboxDashboard.Services;

public sealed class GameService
{
    private readonly DatabaseService _database;

    private const string Columns = """
        Id, Name, Type, SteamAppId, SteamInstallPath,
        ExecutablePath, LaunchUri, IconPath, CoverPath,
        BackgroundPath, Description, AddedAt, LastPlayed,
        IsFavorite, IsHidden
        """;

    public GameService(DatabaseService database)
    {
        _database = database;
    }

    public List<Game> GetAll(bool includeHidden = false)
    {
        var games = new List<Game>();

        using SqliteConnection connection = _database.CreateConnection();
        connection.Open();

        using SqliteCommand command = connection.CreateCommand();
        command.CommandText = includeHidden
            ? $"SELECT {Columns} FROM Games ORDER BY Name COLLATE NOCASE;"
            : $"SELECT {Columns} FROM Games WHERE IsHidden = 0 ORDER BY Name COLLATE NOCASE;";

        using SqliteDataReader reader = command.ExecuteReader();

        while (reader.Read())
            games.Add(Read(reader));

        return games;
    }

    public Game? Get(int id)
    {
        using SqliteConnection connection = _database.CreateConnection();
        connection.Open();

        using SqliteCommand command = connection.CreateCommand();
        command.CommandText =
            $"SELECT {Columns} FROM Games WHERE Id = $id;";
        command.Parameters.AddWithValue("$id", id);

        using SqliteDataReader reader = command.ExecuteReader();
        return reader.Read() ? Read(reader) : null;
    }

    public int Add(Game game)
    {
        using SqliteConnection connection = _database.CreateConnection();
        connection.Open();

        using SqliteCommand command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO Games
            (
                Name, Type, SteamAppId, SteamInstallPath,
                ExecutablePath, LaunchUri, IconPath, CoverPath,
                BackgroundPath, Description, AddedAt, LastPlayed,
                IsFavorite, IsHidden
            )
            VALUES
            (
                $name, $type, $steam, $steamPath,
                $exe, $uri, $icon, $cover,
                $background, $description, $added, $last,
                $favorite, $hidden
            );
            SELECT last_insert_rowid();
            """;

        AddParameters(command, game);
        game.Id = Convert.ToInt32(command.ExecuteScalar());
        return game.Id;
    }

    public void Update(Game game)
    {
        using SqliteConnection connection = _database.CreateConnection();
        connection.Open();

        using SqliteCommand command = connection.CreateCommand();
        command.CommandText = """
            UPDATE Games SET
                Name = $name,
                Type = $type,
                SteamAppId = $steam,
                SteamInstallPath = $steamPath,
                ExecutablePath = $exe,
                LaunchUri = $uri,
                IconPath = $icon,
                CoverPath = $cover,
                BackgroundPath = $background,
                Description = $description,
                AddedAt = $added,
                LastPlayed = $last,
                IsFavorite = $favorite,
                IsHidden = $hidden
            WHERE Id = $id;
            """;

        command.Parameters.AddWithValue("$id", game.Id);
        AddParameters(command, game);
        command.ExecuteNonQuery();
    }

    public void Delete(int id)
    {
        using SqliteConnection connection = _database.CreateConnection();
        connection.Open();

        using SqliteCommand command = connection.CreateCommand();
        command.CommandText = "DELETE FROM Games WHERE Id = $id;";
        command.Parameters.AddWithValue("$id", id);
        command.ExecuteNonQuery();
    }

    private static void AddParameters(
        SqliteCommand command,
        Game game)
    {
        command.Parameters.AddWithValue("$name", game.Name);
        command.Parameters.AddWithValue("$type", (int)game.Type);
        command.Parameters.AddWithValue("$steam", (object?)game.SteamAppId ?? DBNull.Value);
        command.Parameters.AddWithValue("$steamPath", (object?)game.SteamInstallPath ?? DBNull.Value);
        command.Parameters.AddWithValue("$exe", (object?)game.ExecutablePath ?? DBNull.Value);
        command.Parameters.AddWithValue("$uri", (object?)game.LaunchUri ?? DBNull.Value);
        command.Parameters.AddWithValue("$icon", (object?)game.IconPath ?? DBNull.Value);
        command.Parameters.AddWithValue("$cover", (object?)game.CoverPath ?? DBNull.Value);
        command.Parameters.AddWithValue("$background", (object?)game.BackgroundPath ?? DBNull.Value);
        command.Parameters.AddWithValue("$description", (object?)game.Description ?? DBNull.Value);
        command.Parameters.AddWithValue("$added", game.AddedAt.ToString("O"));
        command.Parameters.AddWithValue("$last", (object?)game.LastPlayed?.ToString("O") ?? DBNull.Value);
        command.Parameters.AddWithValue("$favorite", game.IsFavorite ? 1 : 0);
        command.Parameters.AddWithValue("$hidden", game.IsHidden ? 1 : 0);
    }

    private static Game Read(SqliteDataReader reader)
    {
        return new Game
        {
            Id = reader.GetInt32(0),
            Name = reader.GetString(1),
            Type = (GameType)reader.GetInt32(2),
            SteamAppId = reader.IsDBNull(3) ? null : reader.GetInt32(3),
            SteamInstallPath = reader.IsDBNull(4) ? null : reader.GetString(4),
            ExecutablePath = reader.IsDBNull(5) ? null : reader.GetString(5),
            LaunchUri = reader.IsDBNull(6) ? null : reader.GetString(6),
            IconPath = reader.IsDBNull(7) ? null : reader.GetString(7),
            CoverPath = reader.IsDBNull(8) ? null : reader.GetString(8),
            BackgroundPath = reader.IsDBNull(9) ? null : reader.GetString(9),
            Description = reader.IsDBNull(10) ? null : reader.GetString(10),
            AddedAt = DateTime.Parse(reader.GetString(11)),
            LastPlayed = reader.IsDBNull(12) ? null : DateTime.Parse(reader.GetString(12)),
            IsFavorite = reader.GetInt32(13) != 0,
            IsHidden = reader.GetInt32(14) != 0
        };
    }
}
