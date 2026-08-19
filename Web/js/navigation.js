let focusedElement = null;
let inputMode = "pointer";
let lastPointerX = null;
let lastPointerY = null;

function setInputMode(mode) {
    if (!["pointer", "keyboard", "controller"].includes(mode))
        return;

    if (inputMode === mode) {
        window.updateControllerHints?.();
        return;
    }

    inputMode = mode;
    document.body.dataset.inputMode = mode;

    if (mode === "pointer") {
        document
            .querySelectorAll(".focused")
            .forEach(element =>
                element.classList.remove("focused")
            );
    } else {
        refreshSpatialFocus(true);
    }

    window.updateControllerHints?.();
}

function activeFocusRoot() {
    const overlayRoot = document.getElementById("overlay-root");
    const guideRoot = document.getElementById("guide-root");

    if (overlayRoot?.innerHTML)
        return overlayRoot;

    if (guideRoot?.innerHTML)
        return guideRoot;

    return document.getElementById("app");
}

function focusables() {
    const root = activeFocusRoot();

    if (!root)
        return [];

    return [...root.querySelectorAll(
        ".focusable, .game-card, .library-card, .library-nav-button, " +
        ".settings-nav-button, .profile-action, .guide-action, .guide-tab, " +
        ".source-card, .wallpaper-card, .color-swatch, .steam-item"
    )].filter(element => {
        const style = getComputedStyle(element);

        return element.offsetParent !== null &&
               style.visibility !== "hidden" &&
               style.pointerEvents !== "none" &&
               !element.disabled;
    });
}

function setFocused(element, options = {}) {
    if (!element)
        return;

    document
        .querySelectorAll(".focused")
        .forEach(item => item.classList.remove("focused"));

    focusedElement = element;

    if (inputMode !== "pointer")
        element.classList.add("focused");

    if (!options.noScroll) {
        element.scrollIntoView({
            block: "nearest",
            inline: "nearest",
            behavior: App.settings.reducedMotion ? "auto" : "smooth"
        });
    }

    const gameId = Number(element.dataset.gameId || 0);

    if (gameId > 0 && App.currentPage === "home")
        App.focusGame(gameId);
    else if (App.currentPage === "home")
        App.clearGameFocus();
}

function elementCenter(element) {
    const rect = element.getBoundingClientRect();

    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        rect
    };
}

function moveSpatialFocus(direction) {
    if (inputMode !== "controller")
        setInputMode("keyboard");

    const elements = focusables();

    if (!elements.length)
        return;

    const current =
        focusedElement && elements.includes(focusedElement)
            ? focusedElement
            : elements[0];

    if (!current) {
        setFocused(elements[0]);
        return;
    }

    if (!focusedElement || !elements.includes(focusedElement)) {
        setFocused(current);
        return;
    }

    const origin = elementCenter(current);
    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const candidate of elements) {
        if (candidate === current)
            continue;

        const target = elementCenter(candidate);
        const dx = target.x - origin.x;
        const dy = target.y - origin.y;

        const valid =
            direction === "LEFT" ? dx < -8 :
            direction === "RIGHT" ? dx > 8 :
            direction === "UP" ? dy < -8 :
            dy > 8;

        if (!valid)
            continue;

        const horizontal =
            direction === "LEFT" ||
            direction === "RIGHT";

        const mainDistance =
            horizontal
                ? Math.abs(dx)
                : Math.abs(dy);

        const crossDistance =
            horizontal
                ? Math.abs(dy)
                : Math.abs(dx);

        const overlap = horizontal
            ? Math.max(
                0,
                Math.min(origin.rect.bottom, target.rect.bottom) -
                Math.max(origin.rect.top, target.rect.top)
              )
            : Math.max(
                0,
                Math.min(origin.rect.right, target.rect.right) -
                Math.max(origin.rect.left, target.rect.left)
              );

        const score =
            mainDistance +
            crossDistance * 1.7 +
            (overlap > 0 ? -75 : 0);

        if (score < bestScore) {
            bestScore = score;
            best = candidate;
        }
    }

    if (!best) {
        const index = elements.indexOf(current);
        const delta =
            direction === "LEFT" ||
            direction === "UP"
                ? -1
                : 1;

        best = elements[
            Math.max(
                0,
                Math.min(
                    elements.length - 1,
                    index + delta
                )
            )
        ];
    }

    if (best && best !== current) {
        playSound("navigate");
        setFocused(best);
    }
}

function refreshSpatialFocus(force = false) {
    const elements = focusables();

    if (!elements.length) {
        focusedElement = null;
        return;
    }

    if (inputMode === "pointer") {
        document
            .querySelectorAll(".focused")
            .forEach(element =>
                element.classList.remove("focused")
            );
        return;
    }

    if (
        force ||
        !focusedElement ||
        !document.body.contains(focusedElement) ||
        !elements.includes(focusedElement)
    ) {
        setFocused(elements[0], { noScroll: true });
    }
}

function isTypingTarget(element) {
    return element &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
}

function navigationKey(event) {
    return [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Enter",
        " "
    ].includes(event.key);
}

document.addEventListener("keydown", event => {
    setInputMode("keyboard");

    if (isTypingTarget(document.activeElement)) {
        if (event.key === "Escape") {
            document.activeElement.blur();
            setInputMode("keyboard");
            event.preventDefault();
        }

        return;
    }

    if (navigationKey(event))
        setInputMode("keyboard");

    switch (event.key) {
        case "ArrowUp":
            moveSpatialFocus("UP");
            event.preventDefault();
            break;

        case "ArrowDown":
            moveSpatialFocus("DOWN");
            event.preventDefault();
            break;

        case "ArrowLeft":
            moveSpatialFocus("LEFT");
            event.preventDefault();
            break;

        case "ArrowRight":
            moveSpatialFocus("RIGHT");
            event.preventDefault();
            break;

        case "Enter":
        case " ":
            if (!focusedElement)
                refreshSpatialFocus(true);

            activateFocused();
            event.preventDefault();
            break;

        case "Escape":
            if (!closeTopLayer() && App.currentPage !== "home")
                App.page("home");
            event.preventDefault();
            break;

        case "F2":
            toggleGuide();
            event.preventDefault();
            break;

        case "F11":
            App.send({ type: "toggleFullscreen" });
            event.preventDefault();
            break;

        case "e":
        case "E":
            editFocusedGame();
            break;
    }

    if (event.ctrlKey && event.key.toLowerCase() === "f") {
        App.page("library");
        setTimeout(
            () => document.getElementById("library-search")?.focus(),
            60
        );
        event.preventDefault();
    }
});

document.addEventListener("pointermove", event => {
    if (lastPointerX === null || lastPointerY === null) {
        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
        return;
    }

    const distance =
        Math.abs(event.clientX - lastPointerX) +
        Math.abs(event.clientY - lastPointerY);

    lastPointerX = event.clientX;
    lastPointerY = event.clientY;

    if (distance >= 3)
        setInputMode("pointer");
}, { passive: true });

document.addEventListener("pointerdown", event => {
    setInputMode("pointer");

    const target = event.target.closest(
        ".focusable, .game-card, .library-card, .library-nav-button, " +
        ".settings-nav-button, .profile-action, .guide-action, .guide-tab, " +
        ".source-card, .wallpaper-card, .color-swatch, .steam-item"
    );

    if (target)
        focusedElement = target;
});

document.addEventListener("pointerover", event => {
    if (inputMode !== "pointer" || App.currentPage !== "home")
        return;

    const game = event.target.closest("[data-game-id]");

    if (!game)
        return;

    const id = Number(game.dataset.gameId || 0);

    if (id > 0)
        App.focusGame(id);
});

document.addEventListener("pointerout", event => {
    if (inputMode !== "pointer" || App.currentPage !== "home")
        return;

    const fromGame = event.target.closest("[data-game-id]");
    const toGame = event.relatedTarget?.closest?.("[data-game-id]");

    if (fromGame && !toGame)
        App.clearGameFocus();
});

document.addEventListener(
    "app:page",
    () => {
        focusedElement = null;
        setTimeout(
            () => refreshSpatialFocus(true),
            40
        );
    }
);

window.setInputMode = setInputMode;
