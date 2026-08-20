# XSDB

XSDB is the first Xbox Series dashboard recreation with multiple features like controller support, local profile data, steam library connection, profile customization, custom wallpapers and much more.

XSDB is still under development.


## Features

- Console-inspired dashboard interface
- Custom game library
- Steam game scanning and launching
- Support for manually added executables and launch links
- Custom game covers, icons and backgrounds
- Local profile customization
- Controller-first navigation with keyboard and mouse support
- Guide-style overlay and quick actions
- Discord Rich Presence
- Game activity detection
- Desktop wallpaper integration for selected games
- Remote news support
- Dashboard themes, wallpapers and accent colors
- Fullscreen and windowed modes
- Local SQLite database for game information

## Requirements

For normal use:

- Windows 10 or Windows 11 x64
- Microsoft Edge WebView2 Runtime

For building the project from source:

- .NET 8 SDK
- Visual Studio 2022 with the .NET desktop development workload
- Premake5 if you want to generate the Visual Studio solution

## Building the Project

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

You can also build directly with the .NET CLI:

```powershell
dotnet restore
dotnet build
```

Run the development build with:

```powershell
dotnet run
```

Create the Windows x64 release build with:

```powershell
dotnet publish -c Release -r win-x64 --self-contained true -o ".\dist\XSDB"
```

## Controls

Controller controls may depend on the current screen, but the main navigation uses:

- `A`: select / open
- `B`: back
- `X`: edit or context action where available
- `Y`: search / secondary action where available
- `LB` / `RB`: switch between main pages
- `LT` / `RT`: scroll
- `Menu` / Guide input: open the XSDB Guide when enabled

Keyboard and mouse can also be used throughout the dashboard.

## Working on the Project

XSDB is available for people who want to study the project, experiment with it and contribute improvements.

If you build something based on XSDB or reuse substantial parts of the project, please keep clear credit to the original XSDB project and its creator.

Do not present XSDB or a modified version in a way that suggests it is an official Microsoft or Xbox product.


## Legal / Disclaimer

XSDB is an unofficial community project.

It is not affiliated with, endorsed by, sponsored by, or developed by Microsoft or Xbox. It is also not affiliated with Valve, Steam, Discord, Activision, or any other third-party company whose products or services may be referenced or supported by the application.

Xbox, Microsoft, Steam, Discord, Activision, and other names, logos, trademarks and related imagery belong to their respective owners.

Any references to third-party platforms or products are used only to describe compatibility, integration or the visual inspiration of the project.
