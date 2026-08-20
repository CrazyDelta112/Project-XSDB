# XSDB

XSDB is an open-source gaming dashboard for Windows focused on bringing a console-style experience to PC without replacing the tools people already use.

The project is built with C# and WPF, while most of the interface is rendered through WebView2 using HTML, CSS and JavaScript. The goal is to keep the native Windows side responsible for system integration and application logic, while the web layer handles the dashboard interface.

XSDB is still in development. Features, file structure and behavior may change between versions.

## What XSDB does

XSDB is designed to act as a central place for launching and organizing games on Windows.

Current functionality includes:

- Custom game library
- Support for manually added executables
- Steam game detection and launching
- Custom covers, icons and backgrounds
- Profile customization
- Controller navigation through XInput
- Discord Rich Presence
- Game activity detection
- Desktop wallpaper integration for selected games
- Remote news support
- Dashboard personalization options
- Fullscreen and windowed modes
- Local SQLite database for the game library

The dashboard interface is intentionally inspired by console navigation, but XSDB is an independent open-source project and is not affiliated with Microsoft, Xbox, Valve, Steam, Discord, Activision or any other company whose products may be supported by the application.

## Technology

XSDB currently uses:

- C#
- .NET 8
- WPF
- Microsoft WebView2
- HTML, CSS and JavaScript
- SQLite through Microsoft.Data.Sqlite
- DiscordRichPresence
- XInput for controller support
- Premake5 for Visual Studio solution generation

## Requirements

To build XSDB from source, you will need:

- Windows 10 or Windows 11
- .NET 8 SDK
- Visual Studio 2022 with .NET desktop development tools
- Premake5 if you want to generate the Visual Studio solution
- Microsoft Edge WebView2 Runtime

The NuGet dependencies are restored automatically by the .NET SDK when the project is built.

## Getting the source

Clone the repository:

```powershell
git clone https://github.com/CrazyDelta112/Project-XSDB.git
cd Project-XSDB
```

## Generating the Visual Studio solution with Premake5

XSDB includes a `premake5.lua` file so contributors can generate a Visual Studio solution instead of relying on a solution file committed to the repository.

Place `premake5.exe` somewhere available in your PATH, or copy it to the repository directory, then run:

```powershell
premake5 vs2022
```

The generated solution will be placed in:

```text
Build/
```

Open the generated solution with Visual Studio 2022.

Premake is used only to generate the solution. The existing SDK-style `.csproj` remains the main project definition because it contains the .NET 8, WPF and NuGet configuration used by XSDB.

## Building without Visual Studio

You can build the project directly with the .NET CLI:

```powershell
dotnet restore
dotnet build
```

To run the development build:

```powershell
dotnet run
```

## Release build

A normal Release build can be created with:

```powershell
dotnet publish -c Release -r win-x64 --self-contained true -o ".\dist\XSDB"
```

Release packaging may change while the project is under development.

## Project structure

```text
Project-XSDB/
├── Models/                 Application data models
├── Services/               Windows integration and application services
├── Web/                    Dashboard HTML, CSS, JavaScript and assets
├── App.xaml                WPF application definition
├── App.xaml.cs             WPF application startup code
├── MainWindow.xaml         Native application window
├── MainWindow.xaml.cs      Main bridge between WPF and the dashboard
├── XboxDashboard.App.csproj
├── premake5.lua            Premake5 solution generator
└── README.md
```

### Models

The `Models` directory contains the data structures used by the application, including games, profile information, application settings, news entries, storage information and game activity state.

### Services

The `Services` directory contains most of the native application logic. This includes game management, Steam detection, SQLite access, controller input, Discord Rich Presence, wallpaper handling, Windows actions, settings, storage information and game activity tracking.

### Web

The `Web` directory contains the dashboard interface.

The interface is loaded inside WebView2 and communicates with the C# application through the WebView2 messaging API. This allows the interface to remain easy to modify while native Windows functionality stays in C#.

## Application data

XSDB stores user data outside the source directory.

The current code stores application data under the user's roaming AppData directory. This includes the SQLite database, settings, profile data and copied game assets.

Do not commit local runtime data, build output, databases or generated Visual Studio files to the repository.

## Contributing

Contributions are welcome.

If you want to modify XSDB, try to keep changes focused and understandable. For larger changes, it is usually better to explain the goal first before rewriting major parts of the project.

When contributing:

- Keep generated build files out of commits
- Avoid committing personal settings or local databases
- Keep the dashboard responsive for both mouse and controller navigation
- Test both Debug and Release builds when possible
- Keep native and web-side changes synchronized when modifying WebView2 messages

## Credits

XSDB was created and is maintained by Delta.

The project also depends on and benefits from several open-source and platform technologies:

- Microsoft .NET and WPF
- Microsoft Edge WebView2
- Microsoft.Data.Sqlite
- DiscordRichPresence
- Premake5
- SQLite

Additional contributors should be credited here as the project grows.

## Third-party services and trademarks

XSDB can interact with third-party applications and services such as Steam and Discord. Their names, logos and trademarks belong to their respective owners.

XSDB is not an official Xbox application and is not affiliated with or endorsed by Microsoft.

The project does not attempt to replace Steam, Discord or other game platforms. It acts as a local dashboard and launcher that can integrate with supported software already installed on the user's system.

## Development status

XSDB is currently under active development.

Some functionality may be unfinished, experimental or changed in future releases. If you are building directly from the latest source, expect occasional bugs or incomplete features.

## License

A license file has not been added yet.

Before publishing the project as a public open-source repository, add a `LICENSE` file so contributors and users clearly know what they are allowed to do with the source code.
