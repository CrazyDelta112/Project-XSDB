const App = {
    games: [],
    news: [],
    profile: null,
    systemInfo: null,
    activity: {
        isPlaying: false,
        gameId: null,
        gameName: "",
        startedAt: null
    },
    controllerConnected: false,
    currentPage: "home",
    focusedGameId: null,
    settings: {
        accentColor: "#8BF000",
        dashboardWallpaperPreset: "xbox-green",
        dashboardBackground: "",
        backgroundDim: 0.22,
        reducedMotion: false,
        uiSounds: true,
        uiVolume: 0.75,
        enableController: true,
        gamesBackground: true,
        gamesBackgroundDelaySeconds: 4,
        controllerDeadzone: 16000,
        controllerRepeatMs: 125,
        menuButtonOpensGuide: true,
        discordRpc: true,
        discordApplicationId: "",
        discordRpcShowElapsedTime: true,
        discordRpcLargeImageKey: "",
        discordRpcLargeImageText: "Xbox Dashboard",
        discordRpcSmallImageKey: ""
    },

    send(message) {
        window.chrome?.webview?.postMessage(message);
    },

    page(page) {
        this.currentPage = page;

        const systemPage =
            page === "library" ||
            page === "settings";

        document.body.classList.toggle(
            "system-page",
            systemPage
        );

        document.body.classList.toggle(
            "library-mode",
            page === "library"
        );

        document
            .querySelectorAll("[data-page]")
            .forEach(button => {
                button.classList.toggle(
                    "active",
                    button.dataset.page === page
                );
            });

        document.dispatchEvent(
            new CustomEvent(
                "app:page",
                { detail: page }
            )
        );

        requestAnimationFrame(() => {
            animateCurrentPage();
            updateControllerHints();
        });

        this.send({
            type: "pageChanged",
            page
        });
    },

    showOverlay(html) {
        document.getElementById("overlay-root").innerHTML = html;
        setTimeout(() => {
            refreshSpatialFocus(true);
            updateControllerHints();
        }, 20);
    },

    closeOverlay() {
        document.getElementById("overlay-root").innerHTML = "";
        setTimeout(() => {
            refreshSpatialFocus(true);
            updateControllerHints();
        }, 20);
    },

    toast(message) {
        const root = document.getElementById("toast-root");
        const element = document.createElement("div");

        element.className = "toast";
        element.textContent = message;
        root.appendChild(element);

        setTimeout(() => element.remove(), 2300);
    },

    openUrl(url) {
        if (!url)
            return;

        this.send({
            type: "openUrl",
            url
        });
    },

    focusGame(id) {
        if (!id || this.focusedGameId === id)
            return;

        const game = this.games.find(item => item.id === id);

        if (!game)
            return;

        this.focusedGameId = id;
        setGameBackground(game.background || game.cover || "");

        this.send({
            type: "selectGame",
            id
        });
    },

    clearGameFocus() {
        if (this.focusedGameId === null)
            return;

        this.focusedGameId = null;
        setGameBackground("");

        this.send({
            type: "clearSelection"
        });
    }
};

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeAttribute(value = "") {
    return escapeHtml(value);
}

function imageOrEmpty(value) {
    return value || "";
}

function formatLastPlayed(value) {
    if (!value)
        return "Never played";

    const date = new Date(value);

    if (Number.isNaN(date.getTime()))
        return "Never played";

    return date.toLocaleDateString(
        undefined,
        {
            month: "short",
            day: "numeric",
            year: date.getFullYear() === new Date().getFullYear()
                ? undefined
                : "numeric"
        }
    );
}

function formatBytes(bytes) {
    const value = Number(bytes || 0);

    if (!Number.isFinite(value) || value <= 0)
        return "0 GB";

    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(
        Math.floor(Math.log(value) / Math.log(1024)),
        units.length - 1
    );

    const number = value / Math.pow(1024, index);

    return `${number >= 100 ? number.toFixed(0) : number.toFixed(1)} ${units[index]}`;
}

function updateClock() {
    const clock = document.getElementById("clock");

    if (!clock)
        return;

    clock.textContent = new Date().toLocaleTimeString(
        undefined,
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

function hexToRgbString(hex) {
    const normalized = String(hex || "")
        .replace("#", "")
        .trim();

    const value = normalized.length === 3
        ? normalized.split("").map(char => char + char).join("")
        : normalized;

    if (!/^[0-9a-fA-F]{6}$/.test(value))
        return "139, 240, 0";

    return [
        parseInt(value.slice(0, 2), 16),
        parseInt(value.slice(2, 4), 16),
        parseInt(value.slice(4, 6), 16)
    ].join(", ");
}

function applySettingsTheme() {
    const settings = App.settings || {};
    const accent = settings.accentColor || "#8BF000";

    document.documentElement.style.setProperty(
        "--accent",
        accent
    );

    document.documentElement.style.setProperty(
        "--accent-rgb",
        hexToRgbString(accent)
    );

    document.documentElement.style.setProperty(
        "--background-dim",
        String(settings.backgroundDim ?? 0.22)
    );

    document.body.classList.toggle(
        "reduced-motion",
        !!settings.reducedMotion
    );

    const background = document.getElementById("dashboard-background");

    if (settings.dashboardBackground) {
        background.style.backgroundImage =
            `url("${settings.dashboardBackground}")`;
    } else {
        const preset = settings.dashboardWallpaperPreset || "xbox-green";
        background.style.backgroundImage =
            `url("./assets/wallpapers/${preset}.svg")`;
    }

    const soundIndicator = document.getElementById("sound-indicator");

    if (soundIndicator) {
        soundIndicator.style.opacity = settings.uiSounds === false
            ? ".35"
            : ".9";
    }
}

function setGameBackground(url) {
    const layer = document.getElementById("game-background");

    if (!layer)
        return;

    if (!url) {
        layer.classList.remove("visible");

        setTimeout(() => {
            if (!layer.classList.contains("visible"))
                layer.style.backgroundImage = "";
        }, 460);

        return;
    }

    layer.style.backgroundImage = `url("${url}")`;

    requestAnimationFrame(() => {
        layer.classList.add("visible");
    });
}

function renderProfileHeader() {
    const profile = App.profile || {};
    const name = document.getElementById("profile-name");
    const handle = document.getElementById("profile-handle");
    const avatar = document.getElementById("profile-avatar");

    if (name)
        name.textContent = profile.name || "User";

    if (handle)
        handle.textContent = `@${profile.gamertag || profile.name || "User"}`;

    const activity = document.getElementById("profile-activity");

    if (activity) {
        activity.textContent = App.activity?.isPlaying
            ? `Playing ${App.activity.gameName}`
            : "";
        activity.classList.toggle(
            "visible",
            !!App.activity?.isPlaying
        );
    }

    if (avatar) {
        avatar.textContent = profile.avatar
            ? ""
            : (profile.name || "D")[0].toUpperCase();

        avatar.style.backgroundImage = profile.avatar
            ? `url("${profile.avatar}")`
            : "";
    }
}

function animateCurrentPage() {
    if (App.settings.reducedMotion)
        return;

    const root = document.getElementById("page-root");
    const element = root?.firstElementChild;

    if (!element)
        return;

    element.classList.remove("page-transition-enter");
    void element.offsetWidth;
    element.classList.add("page-transition-enter");
}

function closeTopLayer() {
    const overlayRoot = document.getElementById("overlay-root");
    const guideRoot = document.getElementById("guide-root");

    if (overlayRoot?.innerHTML) {
        App.closeOverlay();
        playSound("back");
        return true;
    }

    if (guideRoot?.innerHTML) {
        closeGuide();
        playSound("back");
        return true;
    }

    return false;
}

function cyclePrimaryPage(direction) {
    const pages = ["home", "library", "profile", "settings"];
    let index = pages.indexOf(App.currentPage);

    if (index < 0)
        index = 0;

    index = (index + direction + pages.length) % pages.length;
    App.page(pages[index]);
}

function handleControllerButton(button) {
    window.setInputMode?.("controller");

    switch (button) {
        case "UP":
        case "DOWN":
        case "LEFT":
        case "RIGHT":
            moveSpatialFocus(button);
            break;

        case "A":
            activateFocused();
            break;

        case "B":
            if (!closeTopLayer() && App.currentPage !== "home")
                App.page("home");
            break;

        case "X":
            editFocusedGame();
            break;

        case "Y":
            App.page("library");
            setTimeout(() => document.getElementById("library-search")?.focus(), 70);
            break;

        case "GUIDE":
            toggleGuide();
            break;

        case "START":
            App.page("settings");
            break;

        case "BACK":
            App.page("library");
            break;

        case "LB":
            cyclePrimaryPage(-1);
            break;

        case "RB":
            cyclePrimaryPage(1);
            break;

        case "LT":
            scrollCurrentPage(-1);
            break;

        case "RT":
            scrollCurrentPage(1);
            break;
    }

    updateControllerHints();
}

function editFocusedGame() {
    const focused = document.querySelector(".focused[data-game-id]");

    if (!focused)
        return;

    const id = Number(focused.dataset.gameId);

    if (id > 0 && window.openGameEditor)
        openGameEditor(id);
}

function scrollCurrentPage(direction) {
    const scrollable = document.querySelector(
        ".page, .library-content, .settings-content, .panel"
    );

    scrollable?.scrollBy({
        top: direction * Math.max(280, window.innerHeight * 0.45),
        behavior: App.settings.reducedMotion ? "auto" : "smooth"
    });
}

function activateFocused() {
    const element = document.querySelector(".focused");

    if (!element)
        return;

    playSound("select");
    element.click();
}

function controllerHint(icon, label) {
    return `
        <span class="controller-hint">
            <img src="./assets/controller/${icon}.svg" alt="${escapeAttribute(icon.toUpperCase())}">
            <span>${escapeHtml(label)}</span>
        </span>
    `;
}

function updateControllerHints() {
    const root = document.getElementById("controller-hints");

    if (!root)
        return;

    const show =
        App.controllerConnected &&
        document.body.dataset.inputMode === "controller";

    root.classList.toggle("visible", show);

    if (!show) {
        root.innerHTML = "";
        return;
    }

    let hints;

    if (document.getElementById("overlay-root")?.innerHTML) {
        hints = [
            ["a", "Select"],
            ["b", "Back"]
        ];
    } else if (document.getElementById("guide-root")?.innerHTML) {
        hints = [
            ["a", "Select"],
            ["b", "Close"]
        ];
    } else if (App.currentPage === "library") {
        hints = [
            ["a", "Open"],
            ["x", "Edit"],
            ["y", "Search"],
            ["lb", "Previous"],
            ["rb", "Next"],
            ["menu", "Guide"]
        ];
    } else if (App.currentPage === "settings") {
        hints = [
            ["a", "Select"],
            ["b", "Home"],
            ["lt", "Up"],
            ["rt", "Down"],
            ["menu", "Guide"]
        ];
    } else {
        hints = [
            ["a", "Select"],
            ["x", "Edit"],
            ["y", "Search"],
            ["lb", "Previous"],
            ["rb", "Next"],
            ["menu", "Guide"]
        ];
    }

    root.innerHTML = hints
        .map(([icon, label]) => controllerHint(icon, label))
        .join("");
}

updateClock();
setInterval(updateClock, 1000);

document
    .querySelectorAll("[data-page]")
    .forEach(button => {
        button.addEventListener("click", () => {
            playSound("navigate");
            App.page(button.dataset.page);
        });
    });

document
    .getElementById("profile-button")
    ?.addEventListener("click", () => {
        App.page("profile");
    });

document.addEventListener("click", event => {
    const action = event.target.closest("[data-action]");

    if (!action)
        return;

    switch (action.dataset.action) {
        case "search":
            App.page("library");
            setTimeout(() => document.getElementById("library-search")?.focus(), 60);
            break;

        case "guide":
            toggleGuide();
            break;
    }
});

window.chrome?.webview?.addEventListener(
    "message",
    event => {
        const message = event.data;

        switch (message.type) {
            case "profileUpdated":
                App.profile = message.profile;
                renderProfileHeader();

                if (App.currentPage === "profile")
                    window.renderProfilePage?.();
                break;

            case "settingsUpdated":
                App.settings = {
                    ...App.settings,
                    ...message.settings
                };

                applySettingsTheme();

                if (App.currentPage === "settings")
                    window.renderSettings?.();
                break;

            case "gamesUpdated":
                App.games = message.games || [];

                if (App.currentPage === "home")
                    window.renderHome?.();

                if (App.currentPage === "library")
                    window.renderLibrary?.();
                break;

            case "systemInfoUpdated":
                App.systemInfo = message.storage || null;

                if (App.currentPage === "library")
                    window.renderLibrary?.();

                if (document.getElementById("guide-root")?.innerHTML)
                    window.renderGuide?.();
                break;

            case "gameActivityUpdated":
                App.activity = message.activity || {
                    isPlaying: false,
                    gameId: null,
                    gameName: "",
                    startedAt: null
                };

                renderProfileHeader();

                if (App.currentPage === "profile")
                    window.renderProfilePage?.();
                break;

            case "gameLaunchFailed":
                App.toast(message.message || "The game could not be started.");
                break;

            case "newsUpdated":
                App.news = message.items || [];

                if (App.currentPage === "home")
                    window.renderHome?.();
                break;

            case "controllerConnection":
                App.controllerConnected = !!message.connected;
                document.body.dataset.controllerConnected =
                    App.controllerConnected ? "true" : "false";

                if (!App.controllerConnected &&
                    document.body.dataset.inputMode === "controller") {
                    window.setInputMode?.("pointer");
                }

                updateControllerHints();
                break;

            case "controllerButton":
                App.controllerConnected = true;
                document.body.dataset.controllerConnected = "true";
                handleControllerButton(message.button);
                break;

            case "imageSelected":
                window.handleImageSelected?.(message);
                break;

            case "executableSelected":
                document.dispatchEvent(
                    new CustomEvent(
                        "app:executable-selected",
                        { detail: message }
                    )
                );
                break;

            case "steamScanResult":
                window.handleSteamScanResult?.(message.games || []);
                break;

            case "toast":
                App.toast(message.message || "Done");
                playSound("select");
                break;
        }
    }
);

window.addEventListener("load", () => {
    renderProfileHeader();
    applySettingsTheme();
    App.page("home");

    App.send({ type: "requestGames" });
    App.send({ type: "requestSystemInfo" });
});

window.updateControllerHints = updateControllerHints;
