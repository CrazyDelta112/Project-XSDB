using System.Text.Json; using XboxDashboard.Models;
using System.IO;

namespace XboxDashboard.Services;
public sealed class SettingsService {
 private readonly string _dir; private readonly string _settings; private readonly string _profile; private static readonly JsonSerializerOptions Opt=new(){WriteIndented=true};
 public SettingsService(){_dir=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),"XboxDashboard");Directory.CreateDirectory(_dir);_settings=Path.Combine(_dir,"settings.json");_profile=Path.Combine(_dir,"profile.json");}
 public AppSettings LoadSettings(){if(!File.Exists(_settings)){var s=new AppSettings();SaveSettings(s);return s;}try{return JsonSerializer.Deserialize<AppSettings>(File.ReadAllText(_settings))??new AppSettings();}catch{return new AppSettings();}}
 public void SaveSettings(AppSettings s)=>File.WriteAllText(_settings,JsonSerializer.Serialize(s,Opt));
 public Profile LoadProfile(){if(!File.Exists(_profile)){var p=new Profile();SaveProfile(p);return p;}try{return JsonSerializer.Deserialize<Profile>(File.ReadAllText(_profile))??new Profile();}catch{return new Profile();}}
 public void SaveProfile(Profile p)=>File.WriteAllText(_profile,JsonSerializer.Serialize(p,Opt));
}
