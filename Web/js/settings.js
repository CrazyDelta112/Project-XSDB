let settingsSection = "general";

const settingsSections = [
    ["general", "settings.svg", "General"],
    ["personalization", "palette.svg", "Personalization"],
    ["display", "display.svg", "Display"],
    ["sound", "sound.svg", "Sound"],
    ["controller", "controller.svg", "Controller"],
    ["gamesBackground", "wallpaper.svg", "Games Background"],
    ["discord", "discord.svg", "Discord"],
    ["news", "news.svg", "News"],
    ["about", "info.svg", "About"]
];

const dashboardWallpapers = [
    ["xbox-green", "Green Flow"],
    ["nebula-purple", "Nebula"],
    ["midnight-blue", "Midnight"],
    ["sunset", "Sunset"],
    ["carbon", "Carbon"],
    ["gamepad", "Number one"],
    ["gtav", "Hood Safari"],
    ["persona", "Persona"],
    ["xbox-og", "Project X"],
    ["fallout", "Fallout"],
    ["tatical-move", "Tatical Move"],
    ["jup-s6", "The Haunting"],
    ["codm-s3","Fire Station"]
];

const accentColors = [
    "#8BF000",
    "#29C5F6",
    "#9B6DFF",
    "#FF4F9A",
    "#FFB52E",
    "#F3F3F3"
];

function renderSettings() {
    if (App.currentPage !== "settings")
        return;

    const root = document.getElementById("page-root");

    root.innerHTML = `
        <div class="settings-shell">
            <aside class="settings-sidebar">
                <h1 class="settings-page-title">Settings</h1>

                <nav class="settings-nav">
                    ${settingsSections.map(([id, icon, label]) => `
                        <button class="settings-nav-button focusable ${settingsSection === id ? "active" : ""}"
                                onclick="settingsSection='${id}';renderSettings()">
                            <img src="./assets/icons/${icon}" alt="">
                            <span>${label}</span>
                        </button>
                    `).join("")}
                </nav>
            </aside>

            <section class="settings-content">
                ${renderSettingsSection()}
            </section>
        </div>
    `;

    setTimeout(() => refreshSpatialFocus(true), 25);
}

function renderSettingsSection() {
    switch (settingsSection) {
        case "personalization":
            return renderPersonalizationSettings();

        case "display":
            return renderDisplaySettings();

        case "sound":
            return renderSoundSettings();

        case "controller":
            return renderControllerSettings();

        case "gamesBackground":
            return renderGamesBackgroundSettings();

        case "discord":
            return renderDiscordSettings();

        case "news":
            return renderNewsSettings();

        case "about":
            return renderAboutSettings();

        default:
            return renderGeneralSettings();
    }
}

function heading(title, description) {
    return `
        <div class="settings-heading">
            <h2>${title}</h2>
            <p>${description}</p>
        </div>
    `;
}

function renderGeneralSettings() {
    return `
        ${heading(
            "General",
            "Common dashboard options and quick actions."
        )}

        <div class="settings-group-title">Dashboard</div>
        <div class="settings-card">
            ${settingToggle(
                "Start fullscreen",
                "Open Xbox Dashboard in immersive fullscreen mode.",
                "startFullscreen",
                !!App.settings.startFullscreen
            )}

            ${settingToggle(
                "Remember last game",
                "Keep recently played ordering between sessions.",
                "rememberLastGame",
                !!App.settings.rememberLastGame
            )}

            <div class="setting-row">
                <div class="setting-copy">
                    <strong>Fullscreen now</strong>
                    <span>Toggle fullscreen without restarting the app.</span>
                </div>

                <button class="action with-icon focusable"
                        onclick="App.send({type:'toggleFullscreen'})">
                    <img src="./assets/icons/fullscreen.svg" alt="">
                    Toggle
                </button>
            </div>
        </div>

        <div class="settings-group-title">Account</div>
        <div class="settings-card">
            <div class="setting-row">
                <div class="setting-copy">
                    <strong>Profile</strong>
                    <span>Change gamerpic, gamertag, bio, location and profile theme.</span>
                </div>

                <button class="action with-icon focusable"
                        onclick="App.page('profile')">
                    <img src="./assets/icons/profile.svg" alt="">
                    Open profile
                </button>
            </div>
        </div>
    `;
}

function renderPersonalizationSettings() {
    const selected = App.settings.dashboardWallpaperPreset || "xbox-green";

    return `
        ${heading(
            "Personalization",
            "Choose the dashboard wallpaper, accent and background intensity."
        )}

        <div class="settings-group-title">Preset wallpapers</div>
        <div class="wallpaper-grid">
            ${dashboardWallpapers.map(([id, label]) => `
                <button class="wallpaper-card focusable ${!App.settings.dashboardBackground && selected === id ? "selected" : ""}"
                        onclick="selectWallpaperPreset('${id}')">
                    <div class="wallpaper-thumb"
                         style="background-image:url('./assets/wallpapers/${id}.svg')">
                    </div>
                    <span>${label}</span>
                </button>
            `).join("")}
        </div>

        <div class="settings-group-title">Custom wallpaper</div>
        <div class="settings-card">
            <div class="setting-row">
                <div class="setting-copy">
                    <strong>Custom image</strong>
                    <span>${App.settings.dashboardBackground ? "A custom image is currently selected." : "Use a JPG, PNG, WEBP or BMP from your PC."}</span>
                </div>

                <div style="display:flex;gap:8px">
                    ${
                        App.settings.dashboardBackground
                            ? `<button class="action focusable" onclick="clearCustomWallpaper()">Use preset</button>`
                            : ""
                    }

                    <button class="action with-icon focusable"
                            onclick="selectDashboardBackground()">
                        <img src="./assets/icons/folder.svg" alt="">
                        Browse
                    </button>
                </div>
            </div>
        </div>

        <div class="settings-group-title">Accent color</div>
        <div class="settings-card" style="padding:16px">
            <div class="color-grid">
                ${accentColors.map(color => `
                    <button class="color-swatch focusable ${App.settings.accentColor === color ? "selected" : ""}"
                            style="background:${color}"
                            title="${color}"
                            onclick="setAccentColor('${color}')">
                    </button>
                `).join("")}
            </div>
        </div>

        <div class="settings-group-title">Background</div>
        <div class="settings-card">
            <div class="setting-row">
                <div class="setting-copy">
                    <strong>Background dim</strong>
                    <span>${Math.round((App.settings.backgroundDim ?? .22) * 100)}%</span>
                </div>

                <input class="slider"
                       type="range"
                       min="0"
                       max="65"
                       value="${Math.round((App.settings.backgroundDim ?? .22) * 100)}"
                       oninput="updateRangeSetting('backgroundDim', Number(this.value)/100, this)">
            </div>
        </div>
    `;
}

function renderDisplaySettings() {
    return `
        ${heading(
            "Display",
            "Window behavior and interface motion."
        )}

        <div class="settings-card">
            ${settingToggle(
                "Start fullscreen",
                "Launch directly into fullscreen.",
                "startFullscreen",
                !!App.settings.startFullscreen
            )}

            ${settingToggle(
                "Reduced motion",
                "Disable most UI movement and smooth scrolling.",
                "reducedMotion",
                !!App.settings.reducedMotion
            )}

            <div class="setting-row">
                <div class="setting-copy">
                    <strong>Fullscreen</strong>
                    <span>F11 can also toggle fullscreen.</span>
                </div>

                <button class="action with-icon focusable"
                        onclick="App.send({type:'toggleFullscreen'})">
                    <img src="./assets/icons/fullscreen.svg" alt="">
                    Toggle fullscreen
                </button>
            </div>
        </div>
    `;
}

function renderSoundSettings() {
    return `
        ${heading(
            "Sound",
            "Control dashboard navigation and confirmation sounds."
        )}

        <div class="settings-card">
            ${settingToggle(
                "UI sounds",
                "Play sounds while navigating and selecting items.",
                "uiSounds",
                App.settings.uiSounds !== false
            )}

            <div class="setting-row">
                <div class="setting-copy">
                    <strong>UI volume</strong>
                    <span>${Math.round((App.settings.uiVolume ?? .75) * 100)}%</span>
                </div>

                <input class="slider"
                       type="range"
                       min="0"
                       max="100"
                       value="${Math.round((App.settings.uiVolume ?? .75) * 100)}"
                       oninput="updateRangeSetting('uiVolume', Number(this.value)/100, this)">
            </div>
        </div>
    `;
}

function renderControllerSettings() {
    return `
        ${heading(
            "Controller",
            "Tune XInput navigation and Guide behavior."
        )}

        <div class="settings-card">
            ${settingToggle(
                "Enable controller",
                "Allow an Xbox/XInput controller to navigate the dashboard.",
                "enableController",
                App.settings.enableController !== false
            )}

            ${settingToggle(
                "Menu button opens Guide",
                "Use the controller Menu button as a reliable Guide fallback on Windows.",
                "menuButtonOpensGuide",
                App.settings.menuButtonOpensGuide !== false
            )}

            <div class="setting-row">
                <div class="setting-copy">
                    <strong>Stick deadzone</strong>
                    <span>${App.settings.controllerDeadzone || 16000}</span>
                </div>

                <input class="slider"
                       type="range"
                       min="6000"
                       max="30000"
                       step="500"
                       value="${App.settings.controllerDeadzone || 16000}"
                       oninput="updateRangeSetting('controllerDeadzone', Number(this.value), this)">
            </div>

            <div class="setting-row">
                <div class="setting-copy">
                    <strong>Navigation repeat</strong>
                    <span>${App.settings.controllerRepeatMs || 125} ms</span>
                </div>

                <input class="slider"
                       type="range"
                       min="70"
                       max="350"
                       step="5"
                       value="${App.settings.controllerRepeatMs || 125}"
                       oninput="updateRangeSetting('controllerRepeatMs', Number(this.value), this)">
            </div>
        </div>

        <div class="settings-group-title">Controls</div>
        <div class="settings-card">
            ${controllerMappingRow("D-pad / left stick", "Navigate spatially")}
            ${controllerMappingRow("A", "Select / launch")}
            ${controllerMappingRow("B", "Back")}
            ${controllerMappingRow("X", "Edit the focused game")}
            ${controllerMappingRow("Y", "Search library")}
            ${controllerMappingRow("LB / RB", "Switch main page")}
            ${controllerMappingRow("LT / RT", "Page scroll")}
            ${controllerMappingRow("Xbox / Guide", "Open Guide when available")}
            ${controllerMappingRow("View", "Open library")}
        </div>
    `;
}

function controllerMappingRow(button, action) {
    return `
        <div class="setting-row">
            <div class="setting-copy"><strong>${button}</strong></div>
            <span style="color:var(--muted);font-size:11px">${action}</span>
        </div>
    `;
}

function renderGamesBackgroundSettings() {
    return `
        ${heading(
            "Games Background",
            "Temporarily apply a selected game's background to the Windows desktop."
        )}

        <div class="settings-card">
            ${settingToggle(
                "Enable Games Background",
                "When a game stays selected, its background becomes the Windows desktop wallpaper.",
                "gamesBackground",
                !!App.settings.gamesBackground
            )}

            <div class="setting-row">
                <div class="setting-copy">
                    <strong>Activation delay</strong>
                    <span>${App.settings.gamesBackgroundDelaySeconds || 4} seconds</span>
                </div>

                <input class="slider"
                       type="range"
                       min="1"
                       max="30"
                       value="${App.settings.gamesBackgroundDelaySeconds || 4}"
                       oninput="updateRangeSetting('gamesBackgroundDelaySeconds', Number(this.value), this)">
            </div>
        </div>

        <div class="settings-group-title">Behavior</div>
        <div class="settings-card">
            <div class="setting-row">
                <div class="setting-copy">
                    <strong>Automatic restore</strong>
                    <span>The original Windows wallpaper is restored when you leave game selection or close the app.</span>
                </div>
                <img class="ui-icon" src="./assets/icons/check.svg" alt="Enabled">
            </div>
        </div>
    `;
}

function renderDiscordSettings() {
    return `
        ${heading(
            "Discord Rich Presence",
            "Show the dashboard page or current game directly on your Discord profile."
        )}

        <div class="settings-group-title">Connection</div>
        <div class="settings-card">
            ${settingToggle(
                "Discord Rich Presence",
                "Enable automatic Rich Presence while Xbox Dashboard is running.",
                "discordRpc",
                !!App.settings.discordRpc
            )}

            ${settingToggle(
                "Show elapsed game time",
                "Start a timer in Discord when a monitored game launches.",
                "discordRpcShowElapsedTime",
                App.settings.discordRpcShowElapsedTime !== false
            )}

            <div class="setting-row">
                <div class="setting-copy">
                    <strong>Application ID</strong>
                    <span>Your Discord Developer Application client ID.</span>
                </div>

                <input id="discord-id"
                       class="text-input setting-input"
                       value="${escapeAttribute(App.settings.discordApplicationId || "")}"
                       placeholder="Discord application ID">
            </div>
        </div>

        <div class="settings-group-title">Rich Presence assets</div>
        <div class="settings-card">
            <div class="setting-row">
                <div class="setting-copy">
                    <strong>Large image key</strong>
                    <span>Optional asset key uploaded in the Discord Developer Portal.</span>
                </div>

                <input id="discord-large-image-key"
                       class="text-input setting-input"
                       value="${escapeAttribute(App.settings.discordRpcLargeImageKey || "")}"
                       placeholder="dashboard">
            </div>

            <div class="setting-row">
                <div class="setting-copy">
                    <strong>Large image tooltip</strong>
                    <span>Text shown when hovering the large Rich Presence image.</span>
                </div>

                <input id="discord-large-image-text"
                       class="text-input setting-input"
                       value="${escapeAttribute(App.settings.discordRpcLargeImageText || "Xbox Dashboard")}"
                       placeholder="Xbox Dashboard">
            </div>

            <div class="setting-row">
                <div class="setting-copy">
                    <strong>Small image key</strong>
                    <span>Optional secondary Discord asset key.</span>
                </div>

                <input id="discord-small-image-key"
                       class="text-input setting-input"
                       value="${escapeAttribute(App.settings.discordRpcSmallImageKey || "")}"
                       placeholder="pc">
            </div>
        </div>

        <div class="settings-card rpc-preview-card">
            <div class="setting-copy">
                <strong>Automatic states</strong>
                <span>Home · Browsing game library · Customizing settings · Viewing profile · Playing on PC.</span>
            </div>
        </div>

        <div class="action-row">
            <button class="action primary with-icon focusable"
                    onclick="saveDiscordSettings()">
                <img src="./assets/icons/check.svg" alt="">
                Save Rich Presence
            </button>
        </div>
    `;
}

function renderNewsSettings() {
    return `
        ${heading(
            "News",
            "Load dashboard news from a JSON file hosted on GitHub or your own site."
        )}

        <div class="settings-card">
            <div class="setting-row">
                <div class="setting-copy">
                    <strong>Remote JSON URL</strong>
                    <span>Use an HTTPS endpoint returning the dashboard news array.</span>
                </div>
            </div>

            <div style="padding:14px">
                <input id="news-url"
                       class="text-input"
                       value="${escapeAttribute(App.settings.newsUrl || "")}"
                       placeholder="https://raw.githubusercontent.com/.../news.json">
            </div>
        </div>

        <div class="action-row">
            <button class="action primary with-icon focusable"
                    onclick="saveNewsSettings()">
                <img src="./assets/icons/check.svg" alt="">
                Save and refresh
            </button>
        </div>
    `;
}

function renderAboutSettings() {
    return `
        ${heading(
            "About",
            "Xbox Dashboard for Windows."
        )}

        <div class="settings-card">
            <div class="setting-row">
                <div class="setting-copy">
                    <strong>Application</strong>
                    <span>WPF + WebView2 desktop game dashboard.</span>
                </div>
                <span style="font-size:12px;color:var(--muted)">V6 Release Candidate</span>
            </div>

            <div class="setting-row">
                <div class="setting-copy">
                    <strong>Keyboard shortcuts</strong>
                    <span>F2 Guide · F11 fullscreen · Ctrl+F search · E edit focused game.</span>
                </div>
            </div>

            <div class="setting-row">
                <div class="setting-copy">
                    <strong>Game library</strong>
                    <span>${App.games.length} games stored in the local SQLite library.</span>
                </div>

                <button class="action with-icon focusable" onclick="App.page('library')">
                    <img src="./assets/icons/library.svg" alt="">
                    Open library
                </button>
            </div>
        </div>
    `;
}

function settingToggle(title, description, key, value) {
    return `
        <div class="setting-row">
            <div class="setting-copy">
                <strong>${title}</strong>
                <span>${description}</span>
            </div>

            <button class="switch focusable ${value ? "on" : ""}"
                    type="button"
                    onclick="toggleSetting('${key}')"
                    aria-label="${escapeAttribute(title)}">
            </button>
        </div>
    `;
}

function toggleSetting(key) {
    App.settings[key] = !App.settings[key];
    saveAllSettings(false);
    applySettingsTheme();
    renderSettings();
}

let settingSaveTimer = null;

function updateRangeSetting(key, value) {
    App.settings[key] = value;
    applySettingsTheme();

    clearTimeout(settingSaveTimer);
    settingSaveTimer = setTimeout(() => saveAllSettings(false), 120);
}

function selectWallpaperPreset(id) {
    App.settings.dashboardWallpaperPreset = id;
    App.settings.dashboardBackground = "";
    App.settings.dashboardBackgroundPath = "";

    saveAllSettings(false);
    applySettingsTheme();
    renderSettings();
    playSound("select");
}

function selectDashboardBackground() {
    App.send({
        type: "selectImage",
        field: "dashboardBackground"
    });
}

function clearCustomWallpaper() {
    App.settings.dashboardBackground = "";
    App.settings.dashboardBackgroundPath = "";

    saveAllSettings(false);
    applySettingsTheme();
    renderSettings();
}

function setAccentColor(color) {
    App.settings.accentColor = color;

    saveAllSettings(false);
    applySettingsTheme();
    renderSettings();
}

function saveDiscordSettings() {
    App.settings.discordApplicationId =
        document.getElementById("discord-id")?.value.trim() || "";

    App.settings.discordRpcLargeImageKey =
        document.getElementById("discord-large-image-key")?.value.trim() || "";

    App.settings.discordRpcLargeImageText =
        document.getElementById("discord-large-image-text")?.value.trim() || "Xbox Dashboard";

    App.settings.discordRpcSmallImageKey =
        document.getElementById("discord-small-image-key")?.value.trim() || "";

    saveAllSettings(true);
}

function saveNewsSettings() {
    App.settings.newsUrl =
        document.getElementById("news-url")?.value.trim() || "";

    saveAllSettings(true);
    App.send({ type: "refreshNews" });
}

function saveAllSettings(showToast = false, extra = {}) {
    App.send({
        type: "saveSettings",
        startFullscreen: !!App.settings.startFullscreen,
        enableController: App.settings.enableController !== false,
        rememberLastGame: App.settings.rememberLastGame !== false,
        accentColor: App.settings.accentColor || "#8BF000",
        dashboardBackgroundPath: App.settings.dashboardBackgroundPath || "",
        dashboardWallpaperPreset: App.settings.dashboardWallpaperPreset || "xbox-green",
        backgroundDim: Number(App.settings.backgroundDim ?? .22),
        reducedMotion: !!App.settings.reducedMotion,
        uiSounds: App.settings.uiSounds !== false,
        uiVolume: Number(App.settings.uiVolume ?? .75),
        gamesBackground: !!App.settings.gamesBackground,
        gamesBackgroundDelaySeconds: Number(App.settings.gamesBackgroundDelaySeconds || 4),
        controllerDeadzone: Number(App.settings.controllerDeadzone || 16000),
        controllerRepeatMs: Number(App.settings.controllerRepeatMs || 125),
        menuButtonOpensGuide: App.settings.menuButtonOpensGuide !== false,
        discordRpc: !!App.settings.discordRpc,
        discordApplicationId: App.settings.discordApplicationId || "",
        discordRpcShowElapsedTime: App.settings.discordRpcShowElapsedTime !== false,
        discordRpcLargeImageKey: App.settings.discordRpcLargeImageKey || "",
        discordRpcLargeImageText: App.settings.discordRpcLargeImageText || "Xbox Dashboard",
        discordRpcSmallImageKey: App.settings.discordRpcSmallImageKey || "",
        newsUrl: App.settings.newsUrl || "",
        ...extra
    });

    if (showToast)
        App.toast("Settings saved");
}

document.addEventListener("app:image-selected", event => {
    if (event.detail.field !== "dashboardBackground")
        return;

    App.settings.dashboardBackground = event.detail.path || "";
    App.settings.dashboardBackgroundPath = event.detail.path || "";

    saveAllSettings(false);
    applySettingsTheme();

    if (App.currentPage === "settings")
        renderSettings();
});

window.renderSettings = renderSettings;

document.addEventListener("app:page", event => {
    if (event.detail === "settings")
        renderSettings();
});
