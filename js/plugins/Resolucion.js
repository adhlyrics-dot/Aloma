/*:
 * @plugindesc Celular siempre en vertical, PC siempre en horizontal.
 *
 * @param Ancho
 * @desc Ancho en PC (horizontal).
 * @default 1280
 *
 * @param Alto
 * @desc Alto en PC (horizontal).
 * @default 720
 *
 * @param AnchoVertical
 * @desc Ancho en celular (vertical).
 * @default 576
 *
 * @param AltoVerticalMax
 * @desc Alto maximo en celular. Si tu mapa mide 21 casillas de alto, usa 1008 (21 x 48).
 * @default 1008
 *
 * @param PantallaCompleta
 * @desc true = pide pantalla completa al primer toque en celular. false = no (recomendado).
 * @default false
 *
 * @help
 * Reemplaza a: PantallaVertical.js, GirarCelular.js y PantallaCompleta.js.
 *
 * Celular: el juego es vertical. Si el jugador gira el celular a horizontal,
 *          se tapa la pantalla con un aviso para que lo vuelva a poner vertical.
 * PC:      el juego es horizontal.
 *
 * Los navegadores solo permiten bloquear la orientacion de verdad en pantalla
 * completa o en una app instalada, por eso se usa el aviso.
 */
(function() {

    var p = PluginManager.parameters('Resolucion');
    var aH = Number(p['Ancho'] || 1280);
    var hH = Number(p['Alto'] || 720);
    var aV = Number(p['AnchoVertical'] || 576);
    var maxV = Number(p['AltoVerticalMax'] || 1008);
    var usarPantallaCompleta = String(p['PantallaCompleta'] || 'false') === 'true';

    function esMovil() { return Utils.isMobileDevice(); }

    // No depende del tamano de la ventana, asi el teclado del chat no lo confunde
    function esHorizontal() {
        if (screen.orientation && screen.orientation.type) {
            return screen.orientation.type.indexOf('landscape') === 0;
        }
        if (typeof window.orientation === 'number') {
            return Math.abs(window.orientation) === 90;
        }
        return window.innerWidth > window.innerHeight;
    }

    var movil = esMovil();
    var ancho, alto;

    if (movil) {
        // Proporcion del celular, sin importar como estaba al abrir
        var largo = Math.max(window.innerWidth, window.innerHeight);
        var corto = Math.max(1, Math.min(window.innerWidth, window.innerHeight));
        ancho = aV;
        alto = Math.round(aV * largo / corto);
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

    // ---------- Aviso cuando el celular esta en horizontal ----------
    var aviso = null;

    function crearAviso() {
        aviso = document.createElement('div');
        aviso.style.cssText =
            'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;' +
            'background:#000;color:#fff;display:none;flex-direction:column;' +
            'align-items:center;justify-content:center;text-align:center;' +
            'font-family:sans-serif;font-size:18px;padding:16px;box-sizing:border-box;';
        aviso.innerHTML =
            '<div style="font-size:60px;">\uD83D\uDCF1</div>' +
            '<p>Please turn your phone upright<br>' +
            'Pon el celular en vertical</p>' +
            '<p dir="rtl">\u064A\u0631\u062C\u0649 \u062A\u062F\u0648\u064A\u0631 \u0627\u0644\u0647\u0627\u062A\u0641 \u0625\u0644\u0649 \u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0631\u0623\u0633\u064A</p>';
        document.body.appendChild(aviso);
        revisar();
    }

    function revisar() {
        if (!aviso) return;
        aviso.style.display = (movil && esHorizontal()) ? 'flex' : 'none';
    }

    // ---------- Intentar bloquear en vertical (solo funciona en algunos casos) ----------
    function bloquearVertical() {
        try {
            if (movil && screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('portrait').catch(function() {});
            }
        } catch (e) {}
    }

    // ---------- Pantalla completa (solo si activas el parametro) ----------
    var hecho = false;
    function pantallaCompleta() {
        if (hecho || !usarPantallaCompleta || !movil) return;
        hecho = true;
        var el = document.documentElement;
        var pedir = el.requestFullscreen || el.webkitRequestFullscreen;
        if (pedir && !document.fullscreenElement && !document.webkitFullscreenElement) {
            try { pedir.call(el); } catch (e) {}
        }
        bloquearVertical();
    }
    document.addEventListener('touchend', pantallaCompleta);
    document.addEventListener('click', pantallaCompleta);

    // ---------- Al cargar la pagina ----------
    window.addEventListener('load', function() {
        crearAviso();
        bloquearVertical();
        if (Utils.isNwjs()) {
            var dx = ancho - window.innerWidth;
            var dy = alto - window.innerHeight;
            window.moveBy(-dx / 2, -dy / 2);
            window.resizeBy(dx, dy);
        }
        document.body.style.overflow = 'hidden';
        document.body.style.margin = '0';
    });

    window.addEventListener('orientationchange', function() { setTimeout(revisar, 150); });
    window.addEventListener('resize', revisar);
    if (screen.orientation && screen.orientation.addEventListener) {
        screen.orientation.addEventListener('change', function() { setTimeout(revisar, 150); });
    }

})();
