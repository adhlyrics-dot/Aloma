/*:
 * @plugindesc Sin título. Ir a la página (guarda y redirige) y volver cargando la partida.
 *
 * @param PaginaCine
 * @desc Ruta de la página a la que se va, relativa al index del juego.
 * @default verdad-o-reto.html
 */
(function() {

    var params = PluginManager.parameters('CineAuto');
    var paginaCine = String(params['PaginaCine'] || 'verdad-o-reto.html');

    // ---------- 1. ARRANQUE: sin título ----------
    // Si vienes de la página, carga el archivo 1; si no, partida nueva.
    Scene_Boot.prototype.start = function() {
        Scene_Base.prototype.start.call(this);
        SoundManager.preloadImportantSounds();

        if (DataManager.isBattleTest()) {
            DataManager.setupBattleTest();
            SceneManager.goto(Scene_Battle);
        } else if (DataManager.isEventTest()) {
            DataManager.setupEventTest();
            SceneManager.goto(Scene_Map);
        } else {
            var volviendo = sessionStorage.getItem('volverDelCine') === '1';
            sessionStorage.removeItem('volverDelCine');

            if (volviendo && DataManager.loadGame(1)) {
                if ($gameSystem.versionId() !== $dataSystem.versionId) {
                    $gamePlayer.reserveTransfer($gameMap.mapId(), $gamePlayer.x, $gamePlayer.y);
                    $gamePlayer.requestMapReload();
                }
                SceneManager.goto(Scene_Map);
                $gameSystem.onAfterLoad();
            } else {
                this.checkPlayerLocation();
                DataManager.setupNewGame();
                SceneManager.goto(Scene_Map);
            }
        }
        this.updateDocumentTitle();
    };

    // ---------- 2. IR A LA PÁGINA: guardar en el archivo 1 y redirigir ----------
    var _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if ($gameTemp._irAlCine && !$gameMap.isEventRunning()) {
            $gameTemp._irAlCine = false;
            $gameSystem.onBeforeSave();
            DataManager.saveGame(1);   // siempre el 1: se sobreescribe
            sessionStorage.setItem('volverDelCine', '1');
            window.location.href = paginaCine;
        }
    };

    // ---------- 3. QUITAR "NOW LOADING" ----------
    Graphics._paintUpperCanvas = function() {
        this._clearUpperCanvas();
    };

})();
