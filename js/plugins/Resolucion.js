/*:
 * @plugindesc Resolucion automatica: vertical en celular (sin girarlo), horizontal en el resto.
 *
 * @param Ancho
 * @desc Ancho en PC o celular girado (horizontal).
 * @default 1280
 *
 * @param Alto
 * @desc Alto en PC o celular girado (horizontal).
 * @default 720
 *
 * @param AnchoVertical
 * @desc Ancho cuando el celular esta en vertical.
 * @default 576
 *
 * @param AltoVerticalMax
 * @desc Alto maximo en vertical. Si tu mapa mide 21 casillas de alto, usa 1008 (21 x 48).
 * @default 1008
 *
 * @help
 * Este plugin reemplaza a: PantallaVertical.js, GirarCelular.js y PantallaCompleta.js.
 * Ponlos en OFF y deja este en ON (arriba de la lista).
 *
 * Si el jugador gira el celular, el juego guarda en el archivo 1 y se recarga
 * (CineAuto.js lo carga solo). No bloquea la orientacion.
 */
(function() {

    var p = PluginManager.parameters('Resolucion');
    var aH = Number(p['Ancho'] || 1280);
    var hH = Number(p['Alto'] || 720);
    var aV = Number(p['AnchoVertical'] || 576);
    var maxV = Number(p['AltoVerticalMax'] || 1008);

    function esMovil() { return Utils.isMobileDevice(); }

    // screen.orientation no cambia cuando se abre el teclado del chat
    function esVertical() {
        if (screen.orientation && screen.orientation.type) {
            return screen.orientation.type.indexOf('portrait') === 0;
        }
        return window.innerHeight > window.innerWidth;
    }

    var modoVertical = esMovil() && esVertical();
    var ancho, alto;

    if (modoVertical) {
        ancho = aV;
        alto = Math.round(aV * window.innerHeight / window.innerWidth);
        alto = Math.max(800, Math.min(maxV, alto));
    } else {
        ancho = aH;
        alto = hH;
    }

    SceneManager._screenWidth  = ancho;
    SceneManager._screenHeight = alto;
    SceneManager._boxWidth     = ancho;
    SceneManager._boxHeight    = alto;

    // El juego se ajusta al tamano de la pantalla
    Graphics._stretchEnabled = true;

    // ---------- Si giran el celular: guardar y recargar ----------
    function recargar() {
        try {
            if (SceneManager._scene instanceof Scene_Map && !$gameMap.isEventRunning()) {
                $gameSystem.onBeforeSave();
                DataManager.saveGame(1);
                sessionStorage.setItem('volverDelCine', '1');   // CineAuto lo lee
            }
        } catch (e) {}
        location.reload();
    }

    function revisar() {
        var ahora = esMovil() && esVertical();
        if (ahora !== modoVertical) recargar();
    }

    window.addEventListener('orientationchange', function() { setTimeout(revisar, 500); });
    if (screen.orientation && screen.orientation.addEventListener) {
        screen.orientation.addEventListener('change', function() { setTimeout(revisar, 500); });
    }

    // ---------- Pantalla completa al primer toque (sin bloquear orientacion) ----------
    var hecho = false;
    function pantallaCompleta() {
        if (hecho || !esMovil()) return;
        hecho = true;
        var el = document.documentElement;
        var pedir = el.requestFullscreen || el.webkitRequestFullscreen;
        if (pedir && !document.fullscreenElement && !document.webkitFullscreenElement) {
            try { pedir.call(el); } catch (e) {}
        }
    }
    document.addEventListener('touchend', pantallaCompleta);
    document.addEventListener('click', pantallaCompleta);

    // ---------- Ventana en PC (NW.js) ----------
    window.addEventListener('load', function() {
        if (Utils.isNwjs()) {
            var dx = ancho - window.innerWidth;
            var dy = alto - window.innerHeight;
            window.moveBy(-dx / 2, -dy / 2);
            window.resizeBy(dx, dy);
        }
        document.body.style.overflow = 'hidden';
        document.body.style.margin = '0';
    });

})();
