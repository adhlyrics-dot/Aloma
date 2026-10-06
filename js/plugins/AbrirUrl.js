/*:
 * @plugindesc Sin titulo y perfil unico: carga solo tu partida, autoguarda e ir a la pagina.
 *
 * @param PaginaCine
 * @desc Ruta de la pagina a la que se va, relativa al index del juego.
 * @default verdad-o-reto.html
 *
 * @help
 * - Al abrir el juego carga automaticamente la partida del archivo 1.
 *   Si no existe (primera vez), empieza una partida nueva.
 * - Autoguarda en el archivo 1: al terminar cada evento, cada 10 segundos,
 *   y al cerrar o salir de la pestana.
 * - No uses el archivo 1 como guardado manual.
 *
 * Comando de plugin:  IrAlCine   (guarda y abre la pagina)
 * Script equivalente: $gameTemp._irAlCine = true;
 */
(function() {

    var params = PluginManager.parameters('AbrirUrl');
    var paginaCine = String(params['PaginaCine'] || 'verdad-o-reto.html');
    var SLOT = 1;

    // ---------- AUTOGUARDADO ----------
    function puedeGuardar() {
        return SceneManager._scene instanceof Scene_Map &&
               $gameMap && $gamePlayer && $gameSystem &&
               !$gameMap.isEventRunning() &&
               !$gamePlayer.isTransferring() &&
               !$gameMessage.isBusy() &&
               !SceneManager.isSceneChanging();
    }

    function guardarAuto() {
        try {
            if (!puedeGuardar()) return false;
            $gameSystem.onBeforeSave();
            return DataManager.saveGame(SLOT);
        } catch (e) {
            return false;
        }
    }
    window.guardarAuto = guardarAuto;   // lo usa Resolucion.js al girar el celular

    window.addEventListener('pagehide', guardarAuto);
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) guardarAuto();
    });

    // ---------- ARRANQUE: sin titulo, carga automatica ----------
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
            sessionStorage.removeItem('volverDelCine');

            if (DataManager.loadGame(SLOT)) {
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

    // ---------- COMANDO DE PLUGIN: IrAlCine ----------
    var _pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _pluginCommand.call(this, command, args);
        if (command === 'IrAlCine') {
            $gameTemp._irAlCine = true;
        }
    };

    // ---------- UPDATE DEL MAPA: autoguardar e ir a la pagina ----------
    var contador = 0;
    var habiaEvento = false;

    var _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);

        var corriendo = $gameMap.isEventRunning();

        if ($gameTemp._irAlCine && !corriendo) {
            $gameTemp._irAlCine = false;
            guardarAuto();
            window.location.href = paginaCine;
            return;
        }

        // al terminar un evento (por ejemplo el de crear perfil), guarda
        if (habiaEvento && !corriendo) guardarAuto();
        habiaEvento = corriendo;

        // y cada 10 segundos
        contador++;
        if (contador % 600 === 0) guardarAuto();
    };

    // ---------- QUITAR "NOW LOADING" ----------
    Graphics._paintUpperCanvas = function() {
        this._clearUpperCanvas();
    };

})();
