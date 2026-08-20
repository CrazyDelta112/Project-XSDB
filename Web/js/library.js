let libraryFilter = "all";
let librarySort = "az";
let librarySearch = "";

const libraryFilters = ["all", "favorite", "steam", "windows", "shortcut"];

function renderLibrary() {
    if (App.currentPage !== "library")
        return;

    const root = document.getElementById("page-root");
    const games = getFilteredLibraryGames();

    root.innerHTML = `
        <div class="library-shell">
            <aside class="library-sidebar">
                ${renderLibraryProfile()}

                <nav class="library-nav">
                    <button class="library-nav-button focusable active"
                            onclick="App.page('library')">
                        <img src="./assets/icons/library.svg" alt="">
                        <span>Full library</span>
                    </button>

                    <button class="library-nav-button focusable"
                            onclick="openAddGameMenu()">
                        <img src="./assets/icons/plus.svg" alt="">
                        <span>Add a game</span>
                    </button>

                    <button class="library-nav-button focusable"
                            onclick="openSteamImport()">
                        <img src="./assets/icons/controller.svg" alt="">
                        <span>Import from Steam</span>
                    </button>

                    <button class="library-nav-button focusable"
                            onclick="App.page('profile')">
                        <img src="./assets/icons/profile.svg" alt="">
                        <span>Profile</span>
                    </button>

                    <button class="library-nav-button focusable"
                            onclick="App.page('settings')">
                        <img src="./assets/icons/settings.svg" alt="">
                        <span>Settings</span>
                    </button>
                </nav>

                ${renderStorageCard()}
            </aside>

            <section class="library-content">
                <div class="library-title-row">
                    <div>
                        <h1>Full library</h1>
                        <p>${games.length} shown · ${App.games.length} total</p>
                    </div>

                    <div class="library-search-wrap">
                        <img src="./assets/icons/search.svg" alt="">
                        <input id="library-search"
                               class="search-box"
                               type="search"
                               autocomplete="off"
                               spellcheck="false"
                               placeholder="Search games"
                               value="${escapeAttribute(librarySearch)}">
                    </div>
                </div>

                <div class="library-toolbar">
                    <div class="library-filter-group">
                        ${libraryFilterButton("all", "All games")}
                        ${libraryFilterButton("favorite", "Favorites")}
                        ${libraryFilterButton("steam", "Steam")}
                        ${libraryFilterButton("windows", "Windows")}
                        ${libraryFilterButton("shortcut", "Shortcuts")}
                    </div>

                    <div style="display:flex;gap:8px;align-items:center">
                        <select class="select-input sort-button focusable"
                                id="library-sort"
                                style="width:auto"
                                onchange="setLibrarySort(this.value)">
                            <option value="az" ${librarySort === "az" ? "selected" : ""}>Sort A-Z</option>
                            <option value="recent" ${librarySort === "recent" ? "selected" : ""}>Recently played</option>
                            <option value="added" ${librarySort === "added" ? "selected" : ""}>Recently added</option>
                        </select>

                        <button class="action primary with-icon focusable"
                                onclick="openAddGameMenu()">
                            <img src="./assets/icons/plus.svg" alt="">
                            Add game
                        </button>
                    </div>
                </div>

                ${
                    games.length
                        ? `<div class="library-grid">${games.map(renderLibraryCard).join("")}</div>`
                        : renderLibraryEmptyState()
                }
            </section>
        </div>
    `;

    const search = document.getElementById("library-search");

    search?.addEventListener("input", event => {
        librarySearch = event.target.value;
        renderLibrary();

        setTimeout(() => {
            const input = document.getElementById("library-search");
            input?.focus();
            input?.setSelectionRange(input.value.length, input.value.length);
        }, 0);
    });

    root.querySelectorAll(".library-card").forEach(card => {
        card.addEventListener("dblclick", event => {
            event.preventDefault();
            const id = Number(card.dataset.gameId || 0);

            if (id > 0)
                launchLibraryGame(id);
        });

        card.addEventListener("contextmenu", event => {
            event.preventDefault();
            const id = Number(card.dataset.gameId || 0);

            if (id > 0)
                openGameEditor(id);
        });
    });

    setTimeout(() => refreshSpatialFocus(true), 25);
}

function renderLibraryProfile() {
    const profile = App.profile || {};

    return `
        <button class="library-profile profile-button focusable"
                onclick="App.page('profile')">
            <div class="avatar"
                 style="${profile.avatar ? `background-image:url('${profile.avatar}')` : ""}">
                ${profile.avatar ? "" : escapeHtml((profile.name || "D")[0])}
            </div>

            <div class="profile-copy" style="display:flex">
                <strong>${escapeHtml(profile.name || "User")}</strong>
                <span>@${escapeHtml(profile.gamertag || profile.name || "User")}</span>
            </div>
        </button>
    `;
}

function renderStorageCard() {
    const storage = App.systemInfo;

    if (!storage || !storage.totalBytes) {
        return `
            <div class="storage-card">
                <div class="storage-title">
                    <img src="./assets/icons/disk.svg" alt="">
                    <strong>App storage</strong>
                </div>
                <div class="storage-meta">Loading drive information...</div>
            </div>
        `;
    }

    const used = Math.max(0, Math.min(100, Number(storage.usedPercent || 0)));

    return `
        <div class="storage-card">
            <div class="storage-title">
                <span style="display:flex;align-items:center;gap:8px">
                    <img src="./assets/icons/disk.svg" alt="">
                    <strong>${escapeHtml(storage.driveName || "App drive")}</strong>
                </span>
                <strong>${used.toFixed(0)}%</strong>
            </div>

            <div class="storage-meta">
                ${formatBytes(storage.freeBytes)} free<br>
                ${formatBytes(storage.totalBytes)} total
                ${storage.fileSystem ? ` · ${escapeHtml(storage.fileSystem)}` : ""}
            </div>

            <div class="storage-bar">
                <span style="width:${used}%"></span>
            </div>
        </div>
    `;
}

function libraryFilterButton(id, label) {
    return `
        <button class="library-filter focusable ${libraryFilter === id ? "active" : ""}"
                onclick="setLibraryFilter('${id}')">
            ${label}
        </button>
    `;
}

function getFilteredLibraryGames() {
    const query = librarySearch.trim().toLowerCase();

    const filtered = App.games.filter(game => {
        if (query && !game.name.toLowerCase().includes(query))
            return false;

        switch (libraryFilter) {
            case "favorite":
                return !!game.favorite;

            case "steam":
                return game.type === "Steam";

            case "windows":
                return game.type === "Executable";

            case "shortcut":
                return game.type === "Shortcut";

            default:
                return true;
        }
    });

    return filtered.sort((a, b) => {
        switch (librarySort) {
            case "recent":
                return new Date(b.lastPlayed || 0) - new Date(a.lastPlayed || 0);

            case "added":
                return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);

            default:
                return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        }
    });
}

function renderLibraryCard(game) {
    const image = game.cover || game.icon || "";

    return `
        <article class="library-card focusable"
                 role="button"
                 data-game-id="${game.id}"
                 onclick="openGameDetails(${game.id})"
                 title="${escapeAttribute(game.name)}">
            <button class="library-edit-button"
                    type="button"
                    title="Edit game"
                    onclick="event.stopPropagation();openGameEditor(${game.id})">
                <img src="./assets/icons/edit.svg" alt="">
            </button>

            <div class="library-card-cover"
                 style="${image ? `background-image:url('${image}')` : ""}">
            </div>

            <div class="library-card-meta">
                <strong>${escapeHtml(game.name)}</strong>
                <span>${escapeHtml(readableGameType(game.type))}</span>
                <span>${formatLastPlayed(game.lastPlayed)}</span>
            </div>
        </article>
    `;
}

function readableGameType(type) {
    switch (type) {
        case "Executable":
            return "Windows game";
        case "Shortcut":
            return "Shortcut";
        default:
            return type || "Game";
    }
}

function renderLibraryEmptyState() {
    return `
        <div class="empty-state" style="margin-top:20px">
            <div>
                <img src="./assets/icons/library.svg" alt="">
                <strong style="display:block;color:#fff">No games found</strong>
                <span style="display:block;margin-top:5px">
                    Add a Windows game, import Steam games, or change the current filter.
                </span>
                <button class="action primary with-icon focusable"
                        style="margin-top:14px"
                        onclick="openAddGameMenu()">
                    <img src="./assets/icons/plus.svg" alt="">
                    Add game
                </button>
            </div>
        </div>
    `;
}

function setLibraryFilter(filter) {
    libraryFilter = filter;
    renderLibrary();
}

function setLibrarySort(sort) {
    librarySort = sort;
    renderLibrary();
}

window.libraryCycleFilter = function(direction) {
    let index = libraryFilters.indexOf(libraryFilter);

    if (index < 0)
        index = 0;

    index = (index + direction + libraryFilters.length) % libraryFilters.length;
    libraryFilter = libraryFilters[index];
    renderLibrary();
};

function openGameDetails(id) {
    const game = App.games.find(item => item.id === id);

    if (!game)
        return;

    App.showOverlay(`
        <div class="overlay" onclick="overlayBackdropClose(event)">
            <div class="panel compact" onclick="event.stopPropagation()">
                <div class="panel-header">
                    <div>
                        <h2>${escapeHtml(game.name)}</h2>
                        <p>${escapeHtml(readableGameType(game.type))}</p>
                    </div>

                    <button class="close-button focusable" onclick="App.closeOverlay()">
                        <img src="./assets/icons/close.svg" alt="Close">
                    </button>
                </div>

                <div class="panel-body">
                    <div class="game-detail">
                        <div class="game-detail-cover"
                             style="${game.cover ? `background-image:url('${game.cover}')` : ""}">
                        </div>

                        <div class="game-detail-copy">
                            <h3>${escapeHtml(game.name)}</h3>
                            <p>${escapeHtml(game.description || "No description added yet.")}</p>

                            <div class="game-detail-meta">
                                <div class="meta-box">
                                    <span>Type</span>
                                    <strong>${escapeHtml(readableGameType(game.type))}</strong>
                                </div>

                                <div class="meta-box">
                                    <span>Last played</span>
                                    <strong>${formatLastPlayed(game.lastPlayed)}</strong>
                                </div>
                            </div>

                            <div class="action-row" style="justify-content:flex-start">
                                <button class="action primary with-icon focusable"
                                        data-game-id="${game.id}"
                                        onclick="launchLibraryGame(${game.id})">
                                    <img src="./assets/icons/play.svg" alt="">
                                    Play
                                </button>

                                <button class="action with-icon focusable"
                                        data-game-id="${game.id}"
                                        onclick="App.closeOverlay();setTimeout(()=>openGameEditor(${game.id}),30)">
                                    <img src="./assets/icons/edit.svg" alt="">
                                    Edit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);
}

function launchLibraryGame(id) {
    App.send({
        type: "launchGame",
        id
    });

    App.closeOverlay();
}

function overlayBackdropClose(event) {
    if (event.target.classList.contains("overlay"))
        App.closeOverlay();
}

function openSteamImport() {
    App.showOverlay(`
        <div class="overlay" onclick="overlayBackdropClose(event)">
            <div class="panel" onclick="event.stopPropagation()">
                <div class="panel-header">
                    <div>
                        <h2>Import from Steam</h2>
                        <p>Select an installed Steam game to add it to your library.</p>
                    </div>

                    <button class="close-button focusable" onclick="App.closeOverlay()">
                        <img src="./assets/icons/close.svg" alt="Close">
                    </button>
                </div>

                <div class="panel-body">
                    <div id="steam-results" class="empty-state">
                        <div>
                            <img src="./assets/icons/controller.svg" alt="">
                            <strong style="display:block;color:#fff">Scanning Steam libraries...</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);

    App.send({ type: "scanSteam" });
}

window.handleSteamScanResult = function(games) {
    const root = document.getElementById("steam-results");

    if (!root)
        return;

    if (!games.length) {
        root.className = "empty-state";
        root.innerHTML = `
            <div>
                <img src="./assets/icons/info.svg" alt="">
                <strong style="display:block;color:#fff">No Steam games found</strong>
                <span style="display:block;margin-top:5px">
                    Steam may be installed in another location or no games are currently installed.
                </span>
            </div>
        `;
        return;
    }

    root.className = "steam-list";
    root.innerHTML = games.map(game => `
        <button class="steam-item focusable"
                onclick="importSteamGame(${game.appId}, '${escapeJsString(game.name)}', '${escapeJsString(game.fullInstallPath || "")}')">
            <strong>${escapeHtml(game.name)}</strong>
            <span>App ID ${game.appId}</span>
        </button>
    `).join("");

    refreshSpatialFocus(true);
};

function importSteamGame(appId, name, installPath = "") {
    App.closeOverlay();

    setTimeout(() => {
        openSteamGameEditor(appId, name, installPath);
    }, 25);
}

window.renderLibrary = renderLibrary;

document.addEventListener("app:page", event => {
    if (event.detail === "library") {
        App.send({ type: "requestSystemInfo" });
        renderLibrary();
    }
});
