let guideSection = "main";

function toggleGuide() {
    const root = document.getElementById("guide-root");

    if (root.innerHTML) {
        closeGuide();
        return;
    }

    openGuide();
}

function openGuide(section = "main") {
    guideSection = section;
    renderGuide();
    playSound("open");
}

function closeGuide() {
    const root = document.getElementById("guide-root");

    if (!root.innerHTML)
        return;

    root.innerHTML = "";
    setTimeout(() => refreshSpatialFocus(true), 20);
}

function guideNavigate(page) {
    closeGuide();
    App.page(page);
}

function guideStore() {
    closeGuide();
    App.send({ type: "openStore" });
}

function guideSearch() {
    closeGuide();
    App.page("library");
    setTimeout(() => document.getElementById("library-search")?.focus(), 70);
}

function guideFullscreen() {
    App.send({ type: "toggleFullscreen" });
    closeGuide();
}

function renderGuide() {
    const root = document.getElementById("guide-root");

    if (!root)
        return;

    if (!root.innerHTML && !["main", "profile", "audio", "system", "power"].includes(guideSection))
        guideSection = "main";

    root.innerHTML = `
        <div class="guide-overlay" onclick="guideBackdropClick(event)">
            <aside class="guide-panel" onclick="event.stopPropagation()">
                <div class="guide-tabs">
                    ${guideTab("main", "guide.svg", "Guide")}
                    ${guideTab("profile", "profile.svg", "Profile")}
                    ${guideTab("audio", "sound.svg", "Audio")}
                    ${guideTab("system", "display.svg", "System")}
                    ${guideTab("power", "power.svg", "Power")}
                </div>

                <div class="guide-list">
                    ${renderGuideSection()}
                </div>

                <div class="guide-footer">
                    <button class="focusable" onclick="closeGuide()" title="Back">
                        <img src="./assets/icons/back.svg" alt="">
                    </button>

                    <button class="focusable" onclick="guideNavigate('home')" title="Home">
                        <img src="./assets/icons/home.svg" alt="">
                    </button>

                    <button class="focusable" onclick="guideSearch()" title="Search">
                        <img src="./assets/icons/search.svg" alt="">
                    </button>

                    <button class="focusable" onclick="guideNavigate('settings')" title="Settings">
                        <img src="./assets/icons/settings.svg" alt="">
                    </button>
                </div>
            </aside>
        </div>
    `;

    setTimeout(() => refreshSpatialFocus(true), 30);
}

function guideTab(id, icon, label) {
    return `
        <button class="guide-tab focusable ${guideSection === id ? "active" : ""}"
                onclick="guideSection='${id}';renderGuide()"
                title="${label}">
            <img src="./assets/icons/${icon}" alt="">
        </button>
    `;
}

function renderGuideSection() {
    switch (guideSection) {
        case "profile":
            return `
                ${guideProfileHeader()}

                ${guideAction(
                    "profile.svg",
                    "Open profile",
                    "Edit gamerpic, gamertag and profile theme.",
                    "guideNavigate('profile')"
                )}

                ${guideAction(
                    "palette.svg",
                    "Personalization",
                    "Wallpaper and accent color.",
                    "closeGuide();settingsSection='personalization';App.page('settings')"
                )}
            `;

        case "audio":
            return `
                <div style="padding:10px 10px 16px">
                    <strong style="font-size:20px">Audio</strong>
                    <p style="margin-top:5px;color:var(--muted);font-size:11px">
                        UI sounds are ${App.settings.uiSounds === false ? "off" : "on"}.
                    </p>
                </div>

                ${guideAction(
                    "sound.svg",
                    "Sound settings",
                    `UI volume ${Math.round((App.settings.uiVolume ?? .75) * 100)}%.`,
                    "closeGuide();settingsSection='sound';App.page('settings')"
                )}
            `;

        case "system":
            return `
                <div style="padding:10px 10px 16px">
                    <strong style="font-size:20px">System</strong>
                    <p style="margin-top:5px;color:var(--muted);font-size:11px">
                        ${guideStorageText()}
                    </p>
                </div>

                ${guideAction(
                    "fullscreen.svg",
                    "Toggle fullscreen",
                    "Switch between windowed and immersive mode.",
                    "guideFullscreen()"
                )}

                ${guideAction(
                    "disk.svg",
                    "Storage",
                    guideStorageText(),
                    "closeGuide();App.page('library')"
                )}

                ${guideAction(
                    "controller.svg",
                    "Controller",
                    "Deadzone and repeat speed.",
                    "closeGuide();settingsSection='controller';App.page('settings')"
                )}
            `;

        case "power":
            return `
                <div style="padding:10px 10px 16px">
                    <strong style="font-size:20px">Power</strong>
                    <p style="margin-top:5px;color:var(--muted);font-size:11px">
                        Application controls.
                    </p>
                </div>

                ${guideAction(
                    "power.svg",
                    "Exit Xbox Dashboard",
                    "Close the application.",
                    "App.send({type:'closeApp'})"
                )}
            `;

        default:
            return `
                ${guideProfileHeader()}

                ${guideAction(
                    "home.svg",
                    "Home",
                    "Return to dashboard.",
                    "guideNavigate('home')",
                    App.currentPage === "home"
                )}

                ${guideAction(
                    "library.svg",
                    "My games & apps",
                    `${App.games.length} games in your library.`,
                    "guideNavigate('library')",
                    App.currentPage === "library"
                )}

                ${guideAction(
                    "store.svg",
                    "Microsoft Store",
                    "Open the Store installed on Windows.",
                    "guideStore()"
                )}

                ${guideAction(
                    "search.svg",
                    "Search",
                    "Find a game in your library.",
                    "guideSearch()"
                )}

                ${guideAction(
                    "settings.svg",
                    "Settings",
                    "Personalization, controller and more.",
                    "guideNavigate('settings')",
                    App.currentPage === "settings"
                )}
            `;
    }
}

function guideProfileHeader() {
    const profile = App.profile || {};

    return `
        <button class="guide-action focusable"
                onclick="guideNavigate('profile')"
                style="min-height:70px;margin-bottom:6px">
            <div class="avatar"
                 style="width:44px;height:44px;flex-basis:44px;${
                     profile.avatar
                        ? `background-image:url('${profile.avatar}')`
                        : ""
                 }">
                ${profile.avatar ? "" : escapeHtml((profile.name || "D")[0])}
            </div>

            <span>
                <strong style="display:block">${escapeHtml(profile.name || "Delta")}</strong>
                <span style="display:block;color:var(--muted);font-size:10px;margin-top:3px">
                    ${
                        App.activity?.isPlaying
                            ? `Playing ${escapeHtml(App.activity.gameName)}`
                            : `@${escapeHtml(profile.gamertag || profile.name || "Delta")}`
                    }
                </span>
            </span>
        </button>
    `;
}

function guideAction(icon, title, subtitle, action, active = false) {
    return `
        <button class="guide-action focusable ${active ? "active" : ""}"
                onclick="${action}">
            <img src="./assets/icons/${icon}" alt="">
            <span>
                <strong style="display:block">${title}</strong>
                <span style="display:block;color:var(--muted);font-size:10px;margin-top:3px">
                    ${subtitle}
                </span>
            </span>
        </button>
    `;
}

function guideStorageText() {
    const storage = App.systemInfo;

    if (!storage || !storage.totalBytes)
        return "Storage information unavailable.";

    return `${storage.driveName || "Drive"} · ${formatBytes(storage.freeBytes)} free of ${formatBytes(storage.totalBytes)}`;
}

function guideBackdropClick(event) {
    if (event.target.classList.contains("guide-overlay"))
        closeGuide();
}

window.toggleGuide = toggleGuide;
window.openGuide = openGuide;
window.closeGuide = closeGuide;
window.renderGuide = renderGuide;
