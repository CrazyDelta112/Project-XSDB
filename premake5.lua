workspace "XSDB"
    location "Build"
    configurations { "Debug", "Release" }
    startproject "XSDB"

-- XSDB already uses an SDK-style .NET 8 WPF project. Premake is used to
-- generate the Visual Studio solution while the existing .csproj remains
-- the source of truth for .NET, WPF and NuGet configuration.
externalproject "XSDB"
    location "."
    filename "XboxDashboard.App"
    uuid "47B540D3-E8A0-4E9D-A2B3-D14B6EE954F2"
    kind "WindowedApp"
    language "C#"
