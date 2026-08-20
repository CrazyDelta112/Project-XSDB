const profileThemes = [
    ["nebula-purple", "Nebula"],
    ["xbox-green", "Green"],
    ["midnight-blue", "Midnight"],
    ["sunset", "Sunset"],
    ["carbon", "Carbon"]
];

function renderProfilePage() {
    if (App.currentPage !== "profile")
        return;

    const root = document.getElementById("page-root");
    const profile = App.profile || {};
    const theme = profile.theme || "nebula-purple";

    root.innerHTML = `
        <section class="profile-page">
            <div class="profile-background"
                 style="background-image:url('./assets/wallpapers/${theme}.svg')">
            </div>

            <div class="profile-page-content">
                <div class="profile-info-stack">
                    <div class="profile-info-box profile-name-box">
                        <label>Gamertag</label>
                        <strong>${escapeHtml(profile.gamertag || profile.name || "User")}</strong>
                    </div>

                    <div class="profile-info-box">
                        <label>Location</label>
                        <span>${escapeHtml(profile.location || "Home")}</span>
                    </div>

                    <div class="profile-info-box">
                        <label>Bio</label>
                        <span>${escapeHtml(profile.bio || "Ready to play.")}</span>
                    </div>
                </div>

                <div class="profile-center">
                    <div class="profile-big-avatar"
                         style="${profile.avatar ? `background-image:url('${profile.avatar}')` : ""}">
                        ${profile.avatar ? "" : escapeHtml((profile.name || "D")[0].toUpperCase())}
                    </div>

                    <h2>${escapeHtml(profile.name || "User")}</h2>
                    <p class="profile-live-status">
                        ${
                            App.activity?.isPlaying
                                ? `Playing ${escapeHtml(App.activity.gameName)}`
                                : escapeHtml(profile.status || "Online")
                        }
                    </p>
                </div>

                <div class="profile-actions">
                    <button class="profile-action focusable"
                            onclick="openProfileEditor()">
                        <img src="./assets/icons/edit.svg" alt="">
                        <span>Edit profile</span>
                    </button>

                    <button class="profile-action focusable"
                            onclick="App.send({type:'chooseAvatar'})">
                        <img src="./assets/icons/profile.svg" alt="">
                        <span>Change gamerpic</span>
                    </button>

                    <button class="profile-action focusable"
                            onclick="App.page('settings');setTimeout(()=>{settingsSection='personalization';renderSettings()},30)">
                        <img src="./assets/icons/palette.svg" alt="">
                        <span>Dashboard personalization</span>
                    </button>

                    <div class="profile-info-box" style="margin-top:5px">
                        <label>Profile theme</label>
                        <div class="profile-theme-grid">
                            ${profileThemes.map(([id, label]) => `
                                <button class="profile-theme-dot focusable ${theme === id ? "selected" : ""}"
                                        title="${label}"
                                        style="background-image:url('./assets/wallpapers/${id}.svg')"
                                        onclick="setProfileTheme('${id}')">
                                </button>
                            `).join("")}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;

    setTimeout(() => refreshSpatialFocus(true), 25);
}

function openProfileEditor() {
    const profile = App.profile || {};

    App.showOverlay(`
        <div class="overlay" onclick="overlayBackdropClose(event)">
            <div class="panel compact" onclick="event.stopPropagation()">
                <div class="panel-header">
                    <div>
                        <h2>Customize profile</h2>
                        <p>These details are stored locally in Xbox Dashboard.</p>
                    </div>

                    <button class="close-button focusable" onclick="App.closeOverlay()">
                        <img src="./assets/icons/close.svg" alt="Close">
                    </button>
                </div>

                <div class="panel-body">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Display name</label>
                            <input id="profile-display-name"
                                   class="text-input"
                                   maxlength="32"
                                   value="${escapeAttribute(profile.name || "User")}">
                        </div>

                        <div class="form-group">
                            <label>Gamertag</label>
                            <input id="profile-gamertag"
                                   class="text-input"
                                   maxlength="32"
                                   value="${escapeAttribute(profile.gamertag || profile.name || "User")}">
                        </div>

                        <div class="form-group">
                            <label>Status</label>
                            <select id="profile-status" class="select-input">
                                ${["Online", "Busy", "Away", "Offline"].map(status => `
                                    <option value="${status}" ${profile.status === status ? "selected" : ""}>
                                        ${status}
                                    </option>
                                `).join("")}
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Location</label>
                            <input id="profile-location"
                                   class="text-input"
                                   maxlength="60"
                                   value="${escapeAttribute(profile.location || "Home")}">
                        </div>

                        <div class="form-group full">
                            <label>Bio</label>
                            <textarea id="profile-bio"
                                      class="text-area"
                                      maxlength="180">${escapeHtml(profile.bio || "")}</textarea>
                        </div>
                    </div>

                    <div class="action-row">
                        <button class="action focusable" onclick="App.closeOverlay()">
                            Cancel
                        </button>

                        <button class="action primary with-icon focusable" onclick="saveProfileEditor()">
                            <img src="./assets/icons/check.svg" alt="">
                            Save profile
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `);
}

function saveProfileEditor() {
    const value = id => document.getElementById(id)?.value ?? "";

    const name = value("profile-display-name").trim();
    const gamertag = value("profile-gamertag").trim();

    if (!name || !gamertag) {
        App.toast("Display name and gamertag are required.");
        return;
    }

    App.send({
        type: "saveProfile",
        name,
        gamertag,
        bio: value("profile-bio").trim(),
        location: value("profile-location").trim(),
        status: value("profile-status"),
        theme: App.profile?.theme || "nebula-purple"
    });

    App.closeOverlay();
}

function setProfileTheme(theme) {
    const profile = App.profile || {};

    App.send({
        type: "saveProfile",
        name: profile.name || "User",
        gamertag: profile.gamertag || profile.name || "User",
        bio: profile.bio || "",
        location: profile.location || "",
        status: profile.status || "Online",
        theme
    });

    App.profile = {
        ...profile,
        theme
    };

    renderProfilePage();
}

window.renderProfilePage = renderProfilePage;
window.openProfileEditor = openProfileEditor;

document.addEventListener("app:page", event => {
    if (event.detail === "profile")
        renderProfilePage();
});
