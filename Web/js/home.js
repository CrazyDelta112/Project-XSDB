function renderHome() {
    if (App.currentPage !== "home")
        return;

    const root = document.getElementById("page-root");
    const games = App.games.slice(0, 10);

    root.innerHTML = `
        <section class="page home-page">
            <div class="home-shell">
                ${renderHomeGameRow(games)}
                ${renderHomeLowerGrid()}
            </div>
        </section>
    `;

    root.querySelectorAll("[data-game-id]").forEach(element => {
        element.addEventListener("contextmenu", event => {
            event.preventDefault();
            const id = Number(element.dataset.gameId || 0);

            if (id > 0)
                openGameEditor(id);
        });
    });

    setTimeout(() => refreshSpatialFocus(true), 25);
}

function renderHomeGameRow(games) {
    if (!games.length) {
        return `
            <button class="home-empty focusable"
                    onclick="App.page('library');setTimeout(()=>openAddGameMenu(),80)">
                <img src="./assets/icons/plus.svg" alt="">
                <span>Add your first game</span>
            </button>
        `;
    }

    const [featured, ...rest] = games;

    return `
        <div class="home-game-row">
            ${renderHomeGameCard(featured, true)}
            ${rest.map(game => renderHomeGameCard(game, false)).join("")}

            <button class="game-card focusable"
                    onclick="App.page('library')"
                    title="Full library">
                <div class="game-card-image"
                     style="display:grid;place-items:center;background:rgba(28,29,31,.94)">
                    <img src="./assets/icons/library.svg"
                         alt=""
                         style="width:34px;height:34px;opacity:.9">
                </div>
                <div class="game-card-meta">
                    <strong>Full library</strong>
                    <span>${App.games.length} games</span>
                </div>
            </button>
        </div>
    `;
}

function renderHomeGameCard(game, featured) {
    const image = game.cover || game.icon || "";

    return `
        <button class="game-card focusable ${featured ? "featured" : ""}"
                data-game-id="${game.id}"
                onclick="launchHomeGame(${game.id})"
                title="${escapeAttribute(game.name)}">
            <div class="game-card-image"
                 style="${image ? `background-image:url('${image}')` : ""}">
            </div>

            <div class="game-card-meta">
                <strong>${escapeHtml(game.name)}</strong>
                <span>${featured ? formatLastPlayed(game.lastPlayed) : escapeHtml(game.type)}</span>
            </div>
        </button>
    `;
}

function renderHomeLowerGrid() {
    const news = App.news.slice(0, 3);
    const slots = [];

    slots.push(`
        <button class="home-tile store-tile focusable"
                onclick="App.send({type:'openStore'})">
            <img class="home-tile-icon"
                 src="./assets/icons/store.svg"
                 alt="">
            <div class="home-tile-copy">
                <strong>Microsoft Store</strong>
                <span>Browse apps and games</span>
            </div>
        </button>
    `);

    for (const item of news) {
        slots.push(renderHomeNewsTile(item));
    }

    const fallbacks = [
        {
            icon: "library.svg",
            title: "My games & apps",
            subtitle: "Manage your full library",
            action: "App.page('library')"
        },
        {
            icon: "profile.svg",
            title: "Profile",
            subtitle: "Customize your profile",
            action: "App.page('profile')"
        },
        {
            icon: "settings.svg",
            title: "Settings",
            subtitle: "Personalization and system",
            action: "App.page('settings')"
        }
    ];

    let fallbackIndex = 0;

    while (slots.length < 4) {
        const item = fallbacks[fallbackIndex++ % fallbacks.length];

        slots.push(`
            <button class="home-tile focusable"
                    onclick="${item.action}">
                <div class="home-tile-bg"
                     style="background:linear-gradient(135deg,#24282c,#151719)"></div>
                <img class="home-tile-icon"
                     style="z-index:2;left:34px;top:34px;transform:none;width:26px;height:26px"
                     src="./assets/icons/${item.icon}"
                     alt="">
                <div class="home-tile-copy">
                    <strong>${item.title}</strong>
                    <span>${item.subtitle}</span>
                </div>
            </button>
        `);
    }

    return `
        <div class="home-lower-grid">
            ${slots.join("")}
        </div>
    `;
}

function renderHomeNewsTile(item) {
    const image = item.image || "";
    const action = item.action || "";

    return `
        <button class="home-tile focusable"
                onclick="${action ? `App.openUrl('${escapeJsString(action)}')` : ""}">
            <div class="home-tile-bg"
                 style="${image ? `background-image:url('${image}')` : "background:linear-gradient(135deg,#26333a,#151719)"}">
            </div>

            <div class="home-tile-copy">
                <strong>${escapeHtml(item.title || "News")}</strong>
                <span>${escapeHtml(item.description || "")}</span>
            </div>
        </button>
    `;
}

function escapeJsString(value = "") {
    return String(value)
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'")
        .replaceAll("\n", "\\n")
        .replaceAll("\r", "");
}

function launchHomeGame(id) {
    App.focusGame(id);
    App.send({
        type: "launchGame",
        id
    });
}

window.renderHome = renderHome;

document.addEventListener("app:page", event => {
    if (event.detail === "home")
        renderHome();
});
