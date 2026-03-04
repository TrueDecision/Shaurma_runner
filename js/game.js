// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Константы игры
const INITIAL_STAMINA = 100;
const DRAIN_RATE = 0.5;      // трата стамины в секунду
const BASE_SPEED = 3;         // пикселей в секунду
const BASE_REGEN = 1;         // восстановление в секунду
const KIOSK_INTERVAL = 200;   // метров между киосками (после 500м)
const KIOSK_POSITIONS = [100, 300, 500]; // первые три киоска

// Состояния персонажа
const State = {
    IDLE: 'idle',
    RUNNING: 'running',
    SPRINTING: 'sprinting',
    SITTING: 'sitting',
    EATING: 'eating'
};

// Глобальные переменные
let app;
let gameState = {
    state: State.IDLE,
    stamina: INITIAL_STAMINA,
    maxStamina: INITIAL_STAMINA,
    speed: BASE_SPEED,
    regenRate: BASE_REGEN,
    distance: 0,
    skillPoints: 0,
    nextKiosk: KIOSK_POSITIONS[0] // первый киоск на 100м
};

// Спрайты
let bg1, bg2, bg3;
let bgScale = 1; // масштаб фона для resize
let playerSprite;
let runAnim;
let kioskSprite;
let kioskActive = false;

// UI элементы
const distanceEl = document.getElementById('distance');
const staminaEl = document.getElementById('stamina');
const skillPointsEl = document.getElementById('skill-points');
const upgradeMenu = document.getElementById('upgrade-menu');
const upgradeStaminaBtn = document.getElementById('upgrade-stamina');
const upgradeSpeedBtn = document.getElementById('upgrade-speed');
const upgradeRegenBtn = document.getElementById('upgrade-regen');
const resetBtn = document.getElementById('reset-btn');

// Загрузка прогресса из localStorage
function loadProgress() {
    const saved = localStorage.getItem('shaurmaRunner');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            gameState.maxStamina = data.maxStamina || INITIAL_STAMINA;
            gameState.stamina = Math.min(gameState.stamina, gameState.maxStamina);
            gameState.speed = data.speed || BASE_SPEED;
            gameState.regenRate = data.regenRate || BASE_REGEN;
            gameState.skillPoints = data.skillPoints || 0;
            gameState.distance = data.distance || 0;
            gameState.nextKiosk = data.nextKiosk || KIOSK_POSITIONS[0];
        } catch (e) {
            console.warn('Ошибка загрузки сохранений');
        }
    }
}

// Сохранение прогресса
function saveProgress() {
    const data = {
        maxStamina: gameState.maxStamina,
        speed: gameState.speed,
        regenRate: gameState.regenRate,
        skillPoints: gameState.skillPoints,
        distance: gameState.distance,
        nextKiosk: gameState.nextKiosk
    };
    localStorage.setItem('shaurmaRunner', JSON.stringify(data));
}

// Обновление интерфейса
function updateUI() {
    distanceEl.textContent = Math.floor(gameState.distance);
    staminaEl.textContent = Math.floor(gameState.stamina);
    skillPointsEl.textContent = gameState.skillPoints;
}

// Переключение состояния персонажа
function setState(newState) {
    if (gameState.state === newState) return;

    // Убираем старые спрайты
    if (playerSprite) app.stage.removeChild(playerSprite);
    if (runAnim && runAnim.parent) app.stage.removeChild(runAnim);

    gameState.state = newState;

    // Константа отступа от нижнего края
    const BOTTOM_OFFSET = 400;

    switch (newState) {
        case State.IDLE:
            const idleTex = PIXI.Assets.get('idle');
            playerSprite = new PIXI.Sprite(idleTex);
            playerSprite.anchor.set(0.5);
            playerSprite.scale.set(0.85);
            playerSprite.x = app.screen.width / 2;
            playerSprite.y = app.screen.height - BOTTOM_OFFSET;
            app.stage.addChild(playerSprite);
            playerSprite.interactive = true;
            playerSprite.on('pointerdown', onPlayerClick);
            break;

        case State.RUNNING:
            runAnim = new PIXI.AnimatedSprite([
                PIXI.Assets.get('run1'),
                PIXI.Assets.get('run2')
            ]);
            runAnim.anchor.set(0.5);
            runAnim.scale.set(0.85);
            runAnim.x = app.screen.width / 2;
            runAnim.y = app.screen.height - BOTTOM_OFFSET;
            runAnim.animationSpeed = 0.15;
            runAnim.play();
            app.stage.addChild(runAnim);
            runAnim.interactive = true;
            runAnim.on('pointerdown', onPlayerClick);
            break;

        case State.SPRINTING:
            runAnim = new PIXI.AnimatedSprite([
                PIXI.Assets.get('run1'),
                PIXI.Assets.get('run2')
            ]);
            runAnim.anchor.set(0.5);
            runAnim.scale.set(0.85);
            runAnim.x = app.screen.width / 2;
            runAnim.y = app.screen.height - BOTTOM_OFFSET;
            runAnim.animationSpeed = 0.3; // x2 скорость анимации
            runAnim.play();
            app.stage.addChild(runAnim);
            runAnim.interactive = true;
            runAnim.on('pointerdown', onPlayerClick);
            break;

        case State.SITTING:
            playerSprite = new PIXI.Sprite(PIXI.Assets.get('sit'));
            playerSprite.anchor.set(0.5);
            playerSprite.scale.set(0.85);
            playerSprite.x = app.screen.width / 2;
            playerSprite.y = app.screen.height - BOTTOM_OFFSET + 20;
            app.stage.addChild(playerSprite);
            playerSprite.interactive = true;
            playerSprite.on('pointerdown', onPlayerClick);
            break;

        case State.EATING:
            playerSprite = new PIXI.Sprite(PIXI.Assets.get('eat'));
            playerSprite.anchor.set(0.5);
            playerSprite.scale.set(0.85);
            playerSprite.x = app.screen.width / 2;
            playerSprite.y = app.screen.height - BOTTOM_OFFSET;
            app.stage.addChild(playerSprite);
            playerSprite.interactive = true;
            playerSprite.on('pointerdown', onPlayerClick);
            break;
    }
}

// Клик по персонажу
function onPlayerClick() {
    switch (gameState.state) {
        case State.IDLE:
            setState(State.RUNNING);
            break;
        case State.RUNNING:
            setState(State.SPRINTING);
            break;
        case State.SPRINTING:
            setState(State.SITTING);
            break;
        case State.SITTING:
            setState(State.IDLE);
            break;
        case State.EATING:
            setState(State.IDLE);
            break;
    }
}

// Показать меню прокачки
function showUpgradeMenu() {
    upgradeMenu.classList.remove('hidden');
    if (gameState.state === State.RUNNING) {
        setState(State.IDLE);
    }
}

// Скрыть меню прокачки
function hideUpgradeMenu() {
    upgradeMenu.classList.add('hidden');
}

// Сбросить прогресс
function resetGame() {
    localStorage.removeItem('shaurmaRunner');
    gameState.maxStamina = INITIAL_STAMINA;
    gameState.stamina = INITIAL_STAMINA;
    gameState.speed = BASE_SPEED;
    gameState.regenRate = BASE_REGEN;
    gameState.skillPoints = 0;
    gameState.distance = 0;
    gameState.nextKiosk = KIOSK_POSITIONS[0];
    updateUI();
    hideUpgradeMenu();
    setState(State.IDLE);
}

// Применить улучшение
function upgrade(stat) {
    if (gameState.skillPoints <= 0) return;
    switch (stat) {
        case 'stamina':
            gameState.maxStamina += 10;
            gameState.stamina = gameState.maxStamina;
            break;
        case 'speed':
            gameState.speed += 0.5;
            break;
        case 'regen':
            gameState.regenRate += 0.2;
            break;
    }
    gameState.skillPoints--;
    updateUI();
    saveProgress();
    hideUpgradeMenu();
    setState(State.IDLE);
}

// Создание киоска
function spawnKiosk() {
    if (kioskActive) return;
    kioskActive = true;

    kioskSprite = new PIXI.Sprite(PIXI.Assets.get('kiosk'));
    kioskSprite.anchor.set(0.5, 1);
    kioskSprite.x = app.screen.width + 100;
    kioskSprite.y = app.screen.height - 80;
    app.stage.addChild(kioskSprite);

    const moveKiosk = () => {
        if (!kioskActive) return;
        kioskSprite.x -= gameState.speed * 0.5;
        if (kioskSprite.x <= app.screen.width / 2) {
            kioskSprite.x = app.screen.width / 2;
            setState(State.EATING);
            gameState.skillPoints++;
            updateUI();
            showUpgradeMenu();
            setTimeout(() => {
                if (kioskSprite.parent) app.stage.removeChild(kioskSprite);
                kioskActive = false;
                // Определяем следующий киоск
                if (gameState.nextKiosk < 500) {
                    // Находим следующий киоск из списка
                    for (const pos of KIOSK_POSITIONS) {
                        if (pos > gameState.nextKiosk) {
                            gameState.nextKiosk = pos;
                            break;
                        }
                    }
                } else {
                    // После 500м - каждые 200м
                    gameState.nextKiosk += KIOSK_INTERVAL;
                }
                saveProgress();
            }, 1000);
        } else {
            requestAnimationFrame(moveKiosk);
        }
    };
    moveKiosk();
}

// Инициализация игры
async function initGame() {
    app = new PIXI.Application({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x87CEEB, // голубое небо
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: true
    });
    document.getElementById('game-container').appendChild(app.view);

    // Загрузка ресурсов с алиасами
    // Используем абсолютные пути для Telegram Web App
    const basepath = window.location.origin + '/';
    const assets = await PIXI.Assets.load([
        { alias: 'bg', src: basepath + 'assets/bg.jpg' },
        { alias: 'idle', src: basepath + 'assets/idle.png' },
        { alias: 'sit', src: basepath + 'assets/sit.png' },
        { alias: 'run1', src: basepath + 'assets/run1.png' },
        { alias: 'run2', src: basepath + 'assets/run2.png' },
        { alias: 'eat', src: basepath + 'assets/eat.png' },
        { alias: 'kiosk', src: basepath + 'assets/kiosk.png' }
    ]);

    // Создаём фон с масштабированием
    const bgTex = PIXI.Texture.from('bg');
    
    // Масштабируем фон по высоте экрана
    bgScale = app.screen.height / bgTex.height;

    bg1 = new PIXI.Sprite(bgTex);
    bg2 = new PIXI.Sprite(bgTex);
    bg3 = new PIXI.Sprite(bgTex); // третий спрайт для запаса

    bg1.scale.set(bgScale);
    bg2.scale.set(bgScale);
    bg3.scale.set(bgScale);

    bg1.x = 0;
    bg2.x = bg1.width;
    bg3.x = bg2.width + bg1.width;
    bg1.y = app.screen.height - bg1.height;
    bg2.y = app.screen.height - bg2.height;
    bg3.y = app.screen.height - bg3.height;

    app.stage.addChild(bg1, bg2, bg3);

    // Загружаем прогресс
    loadProgress();

    // Сбрасываем состояние чтобы персонаж создался
    gameState.state = null;

    // Начальное состояние
    setState(State.IDLE);

    // Обновляем UI
    updateUI();

    // Игровой цикл
    app.ticker.add((delta) => {
        const dt = delta / 60; // время в секундах

        switch (gameState.state) {
            case State.RUNNING:
                gameState.stamina -= DRAIN_RATE * dt;
                if (gameState.stamina <= 0) {
                    gameState.stamina = 0;
                    setState(State.SITTING);
                }
                gameState.distance += gameState.speed * dt;
                if (gameState.distance >= gameState.nextKiosk && !kioskActive) {
                    spawnKiosk();
                }
                break;
            case State.SPRINTING:
                gameState.stamina -= DRAIN_RATE * 2 * dt; // x2 расход стамины
                if (gameState.stamina <= 0) {
                    gameState.stamina = 0;
                    setState(State.SITTING);
                }
                gameState.distance += gameState.speed * 2 * dt; // x2 скорость дистанции
                if (gameState.distance >= gameState.nextKiosk && !kioskActive) {
                    spawnKiosk();
                }
                break;
            case State.SITTING:
                gameState.stamina += gameState.regenRate * dt;
                if (gameState.stamina > gameState.maxStamina) {
                    gameState.stamina = gameState.maxStamina;
                }
                break;
        }

        // Движение фона
        if (gameState.state === State.RUNNING) {
            bg1.x -= gameState.speed * dt * 10;
            bg2.x -= gameState.speed * dt * 10;
            bg3.x -= gameState.speed * dt * 10;

            // Циклический перенос трёх спрайтов
            if (bg1.x <= -bg1.width) bg1.x = bg3.x + bg3.width;
            if (bg2.x <= -bg2.width) bg2.x = bg1.x + bg1.width;
            if (bg3.x <= -bg3.width) bg3.x = bg2.x + bg2.width;
        }
        
        // Движение фона при спринте (x2 быстрее)
        if (gameState.state === State.SPRINTING) {
            bg1.x -= gameState.speed * dt * 20;
            bg2.x -= gameState.speed * dt * 20;
            bg3.x -= gameState.speed * dt * 20;

            // Циклический перенос трёх спрайтов
            if (bg1.x <= -bg1.width) bg1.x = bg3.x + bg3.width;
            if (bg2.x <= -bg2.width) bg2.x = bg1.x + bg1.width;
            if (bg3.x <= -bg3.width) bg3.x = bg2.x + bg2.width;
        }

        updateUI();
    });

    // Кнопки улучшений
    upgradeStaminaBtn.addEventListener('click', () => upgrade('stamina'));
    upgradeSpeedBtn.addEventListener('click', () => upgrade('speed'));
    upgradeRegenBtn.addEventListener('click', () => upgrade('regen'));
    resetBtn.addEventListener('click', resetGame);

    // Обработка изменения размера окна (поворот экрана)
    window.addEventListener('resize', () => {
        app.renderer.resize(window.innerWidth, window.innerHeight);

        // Пересчёт масштаба фона
        bg1.scale.set(bgScale);
        bg2.scale.set(bgScale);
        bg3.scale.set(bgScale);
        bg1.x = 0;
        bg2.x = bg1.width;
        bg3.x = bg2.width + bg1.width;
        bg1.y = app.screen.height - bg1.height;
        bg2.y = app.screen.height - bg2.height;
        bg3.y = app.screen.height - bg3.height;

        // Корректировка позиции персонажа
        const BOTTOM_OFFSET = 400;
        if (playerSprite) {
            playerSprite.x = app.screen.width / 2;
            playerSprite.y = app.screen.height - BOTTOM_OFFSET;
            if (gameState.state === State.SITTING) playerSprite.y += 20;
        }
        if (runAnim) {
            runAnim.x = app.screen.width / 2;
            runAnim.y = app.screen.height - BOTTOM_OFFSET;
        }
    });
}

// Старт
window.addEventListener('load', initGame);