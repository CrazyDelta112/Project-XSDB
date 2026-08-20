# XSDB

XSDB is an open-source gaming dashboard for Windows built to provide a console-style experience on PC.

It combines a native C# / WPF application with a WebView2 interface written in HTML, CSS and JavaScript. The native side handles Windows integration, game launching, settings, storage and controller input, while the web layer renders the dashboard itself.

XSDB is still under active development, so features and behavior may change between versions.

## Features

- Custom game library
- Manual executable support
- Steam game detection and launching
- Custom game covers, icons and backgrounds
- Profile customization
- Controller navigation through XInput
- Discord Rich Presence
- Game activity detection
- Desktop wallpaper integration
- Remote news support
- Dashboard personalization
- Fullscreen and windowed modes
- Local SQLite database

## Built with

- C#
- .NET 8
- WPF
- Microsoft Edge WebView2
- HTML, CSS and JavaScript
- Microsoft.Data.Sqlite
- DiscordRichPresence
- XInput
- Premake5

## Requirements

To build XSDB from source you will need:

- Windows 10 or Windows 11
- .NET 8 SDK
- Visual Studio 2022 with the .NET desktop development workload
- Premake5 if you want to generate the Visual Studio solution
- Microsoft Edge WebView2 Runtime

NuGet dependencies are restored automatically by the .NET SDK.

## Building from source

Clone the repository:

```powershell
git clone https://github.com/CrazyDelta112/Project-XSDB.git
cd Project-XSDB
```

Generate the Visual Studio 2022 solution with Premake5:

```powershell
premake5 vs2022
```

The generated solution will be placed in the `Build` directory.

Premake is only used to generate the solution. The existing SDK-style `.csproj` remains the main project definition for .NET, WPF and NuGet configuration.

You can also build directly with the .NET CLI:

```powershell
dotnet restore
dotnet build
```

Run the development build with:

```powershell
dotnet run
```

Create a Windows x64 release build with:

```powershell
dotnet publish -c Release -r win-x64 --self-contained true -o ".\dist\XSDB"
```

## Project layout

```text
Project-XSDB/
├── Models/
├── Services/
├── Web/
├── App.xaml
├── App.xaml.cs
├── MainWindow.xaml
├── MainWindow.xaml.cs
├── XboxDashboard.App.csproj
├── premake5.lua
└── README.md
```

`Models` contains the application data structures, `Services` contains most native application logic, and `Web` contains the dashboard interface and assets.

The WebView2 interface communicates with the C# side through WebView2 messages.

## User data

XSDB keeps user data outside the repository and application source directory. This includes settings, profile data, the local game database and copied game assets.

Build output, local databases, generated solution files and personal settings should not be committed.

## Contributing

Contributions are welcome.

Keep changes focused, avoid committing generated or personal files, and test both the native and web sides when changing communication between C# and WebView2.

## Credits

XSDB was created and is maintained by Delta.

The project uses and depends on technologies and libraries including Microsoft .NET, WPF, Microsoft Edge WebView2, Microsoft.Data.Sqlite, SQLite, DiscordRichPresence and Premake5.

Third-party projects remain subject to their own licenses and terms.

## Disclaimer

XSDB is an independent project and is not affiliated with or endorsed by Microsoft, Xbox, Valve, Steam, Discord, Activision or other third-party companies whose products or services may be supported by the application.

All trademarks and product names belong to their respective owners.

## License

XSDB is released under the MIT License. See the `LICENSE` file for details.
