let editingGameId = null;
let editorDraft = null;

function createEmptyDraft(type = "executable") {
    return {
        name: "",
        gameType: type,
        steamAppId: null,
        steamInstallPath: "",
        executablePath: "",
        launchUri: "",
        icon: "",
        cover: "",
        background: "",
        description: "",
        favorite: false
    };
}

function draftFromGame(game) {
    return {
        name: game?.name || "",
        gameType: game?.type === "Steam"
            ? "steam"
            : game?.type === "Shortcut"
                ? "shortcut"
                : "executable",
        steamAppId: game?.steamAppId || null,
        steamInstallPath: game?.steamInstallPath || "",
        executablePath: game?.executablePath || "",
        launchUri: game?.launchUri || "",
        icon: game?.icon || "",
        cover: game?.cover || "",
        background: game?.background || "",
        description: game?.description || "",
        favorite: !!game?.favorite
    };
}

function openAddGameMenu() {
    App.showOverlay(`
        <div class="overlay" onclick="overlayBackdropClose(event)">
            <div class="panel compact" onclick="event.stopPropagation()">
                <div class="panel-header">
                    <div>
                        <h2>Add a game</h2>
                        <p>Choose where the game comes from.</p>
                    </div>

                    <button class="close-button focusable" onclick="App.closeOverlay()">
                        <img src="./assets/icons/close.svg" alt="Close">
                    </button>
                </div>

                <div class="panel-body">
                    <div class="source-grid">
                        <button class="source-card focusable"
                                onclick="openGameEditor(null, 'executable')">
                            <img src="./assets/icons/folder.svg" alt="">
                            <div>
                                <strong>Windows game</strong>
                                <span>Select a local .exe and customize its artwork.</span>
                            </div>
                        </button>

                        <button class="source-card focusable"
                                onclick="App.closeOverlay();setTimeout(openSteamImport,30)">
                            <img src="./assets/icons/controller.svg" alt="">
                            <div>
                                <strong>Steam</strong>
                                <span>Scan installed Steam libraries and import a game.</span>
                            </div>
                        </button>

                        <button class="source-card focusable"
                                onclick="openGameEditor(null, 'shortcut')">
                            <img src="./assets/icons/plus.svg" alt="">
                            <div>
                                <strong>Custom shortcut</strong>
                                <span>Add a URI or other launcher entry manually.</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `);
}

function openGameEditor(id = null, forcedType = null) {
    editingGameId = id;

    const game = id
        ? App.games.find(item => item.id === id)
        : null;

    editorDraft = game
        ? draftFromGame(game)
        : createEmptyDraft(forcedType || "executable");

    if (forcedType)
        editorDraft.gameType = forcedType;

    renderGameEditor();
}


function openSteamGameEditor(appId, name, installPath = "") {
    editingGameId = null;
    editorDraft = createEmptyDraft("steam");
    editorDraft.name = name || "Steam game";
    editorDraft.steamAppId = Number(appId) || null;
    editorDraft.launchUri = editorDraft.steamAppId
        ? `steam://rungameid/${editorDraft.steamAppId}`
        : "";
    editorDraft.steamInstallPath = installPath || "";

    renderGameEditor();
}

function renderGameEditor() {
    if (!editorDraft)
        return;

    const isEditing = Number(editingGameId || 0) > 0;

    App.showOverlay(`
        <div class="overlay" onclick="overlayBackdropClose(event)">
            <div class="panel" onclick="event.stopPropagation()">
                <div class="panel-header">
                    <div>
                        <h2>${isEditing ? "Edit game" : "Add game"}</h2>
                        <p>Artwork, launch behavior and library information.</p>
                    </div>

                    <button class="close-button focusable" onclick="App.closeOverlay()">
                        <img src="./assets/icons/close.svg" alt="Close">
                    </button>
                </div>

                <div class="panel-body">
                    <div class="editor-layout">
                        <aside class="editor-preview">
                            <div>
                                <div id="editor-cover-preview"
                                     class="cover-preview"
                                     style="${backgroundStyle(editorDraft.cover)}">
                                </div>
                                <div class="preview-caption">Library cover</div>
                            </div>

                            <div>
                                <div id="editor-background-preview"
                                     class="background-preview"
                                     style="${backgroundStyle(editorDraft.background)}">
                                </div>
                                <div class="preview-caption">Game background</div>

                                <div class="editor-assets">
                                    <div id="editor-icon-preview"
                                         class="icon-preview"
                                         style="${backgroundStyle(editorDraft.icon)}">
                                    </div>

                                    <div>
                                        <strong style="display:block;font-size:13px">Game icon</strong>
                                        <span id="editor-icon-file" class="preview-caption">
                                            ${escapeHtml(fileName(editorDraft.icon))}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </aside>

                        <section>
                            <div class="form-grid">
                                <div class="form-group full">
                                    <label>Name</label>
                                    <input id="game-name"
                                           class="text-input"
                                           value="${escapeAttribute(editorDraft.name)}"
                                           maxlength="100"
                                           placeholder="Game name">
                                </div>

                                <div class="form-group">
                                    <label>Type</label>
                                    <select id="game-type"
                                            class="select-input"
                                            onchange="editorTypeChanged(this.value)">
                                        <option value="executable" ${editorDraft.gameType === "executable" ? "selected" : ""}>
                                            Windows game
                                        </option>
                                        <option value="steam" ${editorDraft.gameType === "steam" ? "selected" : ""}>
                                            Steam
                                        </option>
                                        <option value="shortcut" ${editorDraft.gameType === "shortcut" ? "selected" : ""}>
                                            Shortcut
                                        </option>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label>Favorite</label>
                                    <button id="game-favorite"
                                            class="switch focusable ${editorDraft.favorite ? "on" : ""}"
                                            type="button"
                                            onclick="toggleEditorFavorite()"
                                            aria-label="Favorite">
                                    </button>
                                </div>

                                <div class="form-group full" id="executable-group">
                                    <label>Executable</label>
                                    <div class="inline-input">
                                        <input id="game-executable"
                                               class="text-input"
                                               value="${escapeAttribute(editorDraft.executablePath)}"
                                               placeholder="C:\\Games\\Game\\game.exe">

                                        <button class="action with-icon focusable"
                                                type="button"
                                                onclick="chooseExecutable()">
                                            <img src="./assets/icons/folder.svg" alt="">
                                            Browse
                                        </button>
                                    </div>
                                </div>

                                <div class="form-group" id="steam-id-group">
                                    <label>Steam App ID</label>
                                    <input id="game-steam-id"
                                           class="text-input"
                                           type="number"
                                           min="0"
                                           value="${editorDraft.steamAppId || ""}"
                                           placeholder="Optional">
                                </div>

                                <div class="form-group">
                                    <label>Launch URI</label>
                                    <input id="game-launch-uri"
                                           class="text-input"
                                           value="${escapeAttribute(editorDraft.launchUri)}"
                                           placeholder="steam://... or custom URI">
                                </div>

                                <div class="form-group">
                                    <label>Icon</label>
                                    <button class="action with-icon focusable"
                                            type="button"
                                            onclick="chooseGameImage('icon')">
                                        <img src="./assets/icons/profile.svg" alt="">
                                        Change icon
                                    </button>
                                </div>

                                <div class="form-group">
                                    <label>Cover</label>
                                    <button class="action with-icon focusable"
                                            type="button"
                                            onclick="chooseGameImage('cover')">
                                        <img src="./assets/icons/wallpaper.svg" alt="">
                                        Change cover
                                    </button>
                                </div>

                                <div class="form-group full">
                                    <label>Background</label>
                                    <button class="action with-icon focusable"
                                            type="button"
                                            onclick="chooseGameImage('background')">
                                        <img src="./assets/icons/wallpaper.svg" alt="">
                                        Change game background
                                    </button>
                                </div>

                                <div class="form-group full">
                                    <label>Description</label>
                                    <textarea id="game-description"
                                              class="text-area"
                                              placeholder="Optional description">${escapeHtml(editorDraft.description)}</textarea>
                                </div>
                            </div>

                            <div class="action-row">
                                ${
                                    isEditing
                                        ? `
                                            <button class="action danger with-icon focusable"
                                                    type="button"
                                                    style="margin-right:auto"
                                                    onclick="deleteCurrentGame()">
                                                <img src="./assets/icons/trash.svg" alt="">
                                                Remove
                                            </button>
                                          `
                                        : ""
                                }

                                <button class="action focusable"
                                        type="button"
                                        onclick="App.closeOverlay()">
                                    Cancel
                                </button>

                                <button class="action primary with-icon focusable"
                                        type="button"
                                        onclick="saveGame()">
                                    <img src="./assets/icons/check.svg" alt="">
                                    ${isEditing ? "Save changes" : "Add game"}
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    `);

    updateEditorTypeVisibility();
    setTimeout(() => refreshSpatialFocus(true), 25);
}

function backgroundStyle(value) {
    return value
        ? `background-image:url('${value}')`
        : "";
}

function collectEditorForm() {
    if (!editorDraft)
        return;

    const value = id => document.getElementById(id)?.value ?? "";

    editorDraft.name = value("game-name").trim();
    editorDraft.gameType = value("game-type") || editorDraft.gameType;
    editorDraft.executablePath = value("game-executable").trim();
    editorDraft.launchUri = value("game-launch-uri").trim();
    editorDraft.description = value("game-description");

    const steamId = Number(value("game-steam-id") || 0);
    editorDraft.steamAppId = steamId > 0 ? steamId : null;
}

function editorTypeChanged(type) {
    collectEditorForm();
    editorDraft.gameType = type;
    updateEditorTypeVisibility();
}

function updateEditorTypeVisibility() {
    if (!editorDraft)
        return;

    const executable = document.getElementById("executable-group");
    const steam = document.getElementById("steam-id-group");

    if (executable) {
        executable.style.opacity = editorDraft.gameType === "steam" ? ".5" : "1";
    }

    if (steam) {
        steam.style.opacity = editorDraft.gameType === "steam" ? "1" : ".55";
    }
}

function toggleEditorFavorite() {
    collectEditorForm();
    editorDraft.favorite = !editorDraft.favorite;

    document
        .getElementById("game-favorite")
        ?.classList.toggle("on", editorDraft.favorite);
}

function chooseExecutable() {
    collectEditorForm();
    App.send({ type: "selectExecutable" });
}

function chooseGameImage(field) {
    collectEditorForm();

    App.send({
        type: "selectImage",
        field
    });
}

function applyEditorImage(field, path) {
    if (!editorDraft)
        return;

    editorDraft[field] = path;

    const map = {
        icon: "editor-icon-preview",
        cover: "editor-cover-preview",
        background: "editor-background-preview"
    };

    const element = document.getElementById(map[field]);

    if (element) {
        element.style.backgroundImage = path
            ? `url("${path}")`
            : "";
    }

    if (field === "icon") {
        const label = document.getElementById("editor-icon-file");

        if (label)
            label.textContent = fileName(path);
    }
}

function saveGame() {
    collectEditorForm();

    if (!editorDraft)
        return;

    if (!editorDraft.name) {
        App.toast("Give the game a name first.");
        document.getElementById("game-name")?.focus();
        return;
    }

    if (editorDraft.gameType === "steam" && editorDraft.steamAppId) {
        editorDraft.launchUri ||= `steam://rungameid/${editorDraft.steamAppId}`;
    }

    const message = {
        type: editingGameId ? "updateGame" : "addGame",
        ...(editingGameId ? { id: editingGameId } : {}),
        ...editorDraft
    };

    App.send(message);
    App.closeOverlay();
    App.page("library");
}

function deleteCurrentGame() {
    if (!editingGameId)
        return;

    const game = App.games.find(item => item.id === editingGameId);
    const name = game?.name || "this game";

    if (!confirm(`Remove ${name} from the library?`))
        return;

    App.send({
        type: "deleteGame",
        id: editingGameId
    });

    App.closeOverlay();
    App.page("library");
}

function fileName(path) {
    if (!path)
        return "No file selected";

    try {
        const decoded = decodeURIComponent(path);
        return decoded.split(/[\\/]/).pop() || decoded;
    } catch {
        return String(path).split(/[\\/]/).pop() || String(path);
    }
}

window.handleImageSelected = function(message) {
    if (message.field === "dashboardBackground") {
        document.dispatchEvent(
            new CustomEvent(
                "app:image-selected",
                { detail: message }
            )
        );
        return;
    }

    applyEditorImage(
        message.field,
        message.path || ""
    );
};

document.addEventListener("app:executable-selected", event => {
    if (!editorDraft)
        return;

    editorDraft.executablePath = event.detail.path || "";

    const input = document.getElementById("game-executable");

    if (input)
        input.value = editorDraft.executablePath;

    const nameInput = document.getElementById("game-name");

    if (nameInput && !nameInput.value.trim()) {
        const derived = fileName(editorDraft.executablePath)
            .replace(/\.exe$/i, "");

        nameInput.value = derived;
        editorDraft.name = derived;
    }
});

window.openAddGameMenu = openAddGameMenu;
window.openGameEditor = openGameEditor;
window.openSteamGameEditor = openSteamGameEditor;
window.saveGame = saveGame;
window.deleteCurrentGame = deleteCurrentGame;
