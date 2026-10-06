/*:
 * @plugindesc Cambia la resolución del juego.
 *
 * @param Ancho
 * @desc Ancho de la pantalla en píxeles
 * @default 1280
 *
 * @param Alto
 * @desc Alto de la pantalla en píxeles
 * @default 720
 */
(function() {
    var params = PluginManager.parameters('Resolucion');
    var ancho = Number(params['Ancho'] || 1280);
    var alto  = Number(params['Alto'] || 720);

    SceneManager._screenWidth  = ancho;
    SceneManager._screenHeight = alto;
    SceneManager._boxWidth     = ancho;
    SceneManager._boxHeight    = alto;

    var _SceneManager_initialize = SceneManager.initialize;
    SceneManager.initialize = function() {
        _SceneManager_initialize.call(this);
    };

    var _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (Utils.isNwjs()) {
            var dx = ancho - window.innerWidth;
            var dy = alto - window.innerHeight;
            window.moveBy(-dx / 2, -dy / 2);
            window.resizeBy(dx, dy);
        }
    };
})();
