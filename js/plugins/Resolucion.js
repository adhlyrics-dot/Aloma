/*:
 * @plugindesc Celular con juego vertical que no cambia al girar, PC en horizontal.
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
 * @param ImagenFondo
 * @desc Nombre (sin .png) de la imagen de img/system que sale en vez de la pantalla negra.
 * @default Fondo
 *
 * @param MantenerVertical
 * @desc true = en celular, al girarlo el juego se queda igual que en vertical (como rotacion bloqueada).
 * @default true
 *
 * @param InvertirGiro
 * @desc Pon true si al girar el celular el juego se ve de cabeza.
 * @default false
 *
 * @param AvisoHorizontal
 * @desc true = al girar el celular a horizontal tapa el juego con un aviso. false = el juego sigue visible.
 * @default false
 *
 * @help
 * Reemplaza a: PantallaVertical.js, GirarCelular.js y PantallaCompleta.js.
 *
 * Celular: el juego es vertical y NO cambia al girar el celular. Con MantenerVertical
 *          en true, el contenido se gira por codigo para que siga llenando la
 *          pantalla igual que en vertical (como si la rotacion estuviera bloqueada).
 *          Al girar el celular, el juego se vera de lado respecto a ti: es lo normal.
 * PC:      el juego es horizontal.
 *
 * IMAGEN EN VEZ DE PANTALLA NEGRA: pon tu imagen en img/system/Fondo.png
 * (o el nombre que pongas en ImagenFondo). Sale al abrir o recargar el juego
 * y en cada transicion (cambio de mapa, menu...), en lugar del negro.
 *
 * En celular se bloquea la pantalla completa (tambien con doble toque)
 * y el zoom por doble toque, salvo que pongas PantallaCompleta en true.
 */
(function() {

    var p = PluginManager.parameters('Resolucion');
    var aH = Number(p['Ancho'] || 1280);
    var hH = Number(p['Alto'] || 720);
    var aV = Number(p['AnchoVertical'] || 576);
    var maxV = Number(p['AltoVerticalMax'] || 1008);
    var usarPantallaCompleta = String(p['PantallaCompleta'] || 'false') === 'true';
    var avisoHorizontal = String(p['AvisoHorizontal'] || 'false') === 'true';
    var mantenerVertical = String(p['MantenerVertical'] || 'true') === 'true';
    var invertirGiro = String(p['InvertirGiro'] || 'false') === 'true';
    var imagenFondo = String(p['ImagenFondo'] || 'Fondo');

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

    // =====================================================
    //  IMAGEN EN VEZ DE PANTALLA NEGRA
    // =====================================================

    // 1) Pantalla de carga: tapa el negro al abrir o recargar el juego
    var splash = null;

    function crearSplash() {
        if (splash || !document.body) return;
        splash = document.createElement('div');
        splash.style.cssText =
            'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;' +
            'background:#000 url("img/system/' + imagenFondo + '.png") center/cover no-repeat;' +
            'transition:opacity .4s;';
        document.body.appendChild(splash);
        document.body.style.background =
            '#000 url("img/system/' + imagenFondo + '.png") center/cover no-repeat';
        setTimeout(quitarSplash, 20000);   // por seguridad
    }

    function quitarSplash() {
        if (!splash) return;
        var s = splash;
        splash = null;
        s.style.opacity = '0';
        setTimeout(function() { if (s.parentNode) s.parentNode.removeChild(s); }, 450);
    }

    if (document.body) crearSplash();
    else document.addEventListener('DOMContentLoaded', crearSplash);

    var _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        quitarSplash();
    };

    // 2) Transiciones del juego: la imagen sustituye al fundido a negro
    ImageManager.loadSystem(imagenFondo);   // precarga

    Scene_Base.prototype.createFadeSprite = function(white) {
        if (this._fadeSprite) return;
        var cont = new Sprite();
        var negro = new ScreenSprite();     // respaldo por si falta la imagen
        negro.setBlack();
        negro.opacity = 255;
        var img = new Sprite(ImageManager.loadSystem(imagenFondo));
        img.anchor.x = 0.5;
        img.anchor.y = 0.5;
        img.x = Graphics.width / 2;
        img.y = Graphics.height / 2;
        img.visible = false;
        cont._img = img;
        cont.opacity = 0;
        cont.addChild(negro);
        cont.addChild(img);
        this._fadeSprite = cont;
        this.addChild(cont);
    };

    var _Scene_Base_updateFade = Scene_Base.prototype.updateFade;
    Scene_Base.prototype.updateFade = function() {
        _Scene_Base_updateFade.call(this);
        var c = this._fadeSprite;
        if (c && c._img && !c._img.visible && c._img.bitmap.isReady()) {
            var b = c._img.bitmap;
            var e = Math.max(Graphics.width / b.width, Graphics.height / b.height);
            c._img.scale.x = e;
            c._img.scale.y = e;
            c._img.visible = true;
        }
    };

    // =====================================================
    //  MANTENER VERTICAL AL GIRAR EL CELULAR
    // =====================================================
    // rot = 0: sin giro | 1: celular girado con su parte de arriba a la izquierda
    //         | 2: celular girado con su parte de arriba a la derecha
    var rot = 0;

    function anguloGiro() {
        if (screen.orientation && typeof screen.orientation.angle === 'number') {
            return screen.orientation.angle;
        }
        if (typeof window.orientation === 'number') return window.orientation;
        return 90;
    }

    function aplicarRotacion() {
        if (!movil || !mantenerVertical || !document.body) return;
        var nuevo = 0;
        if (esHorizontal()) {
            var a = anguloGiro();
            var izquierda = (a === 90);                 // arriba del celular a la izquierda
            if (invertirGiro) izquierda = !izquierda;
            nuevo = izquierda ? 1 : 2;
        }
        rot = nuevo;

        var b = document.body.style;
        var S = window.innerHeight;    // lado corto
        var L = window.innerWidth;     // lado largo (solo cuenta si esta girado)
        if (rot === 0) {
            b.position = ''; b.top = ''; b.left = '';
            b.width = ''; b.height = ''; b.transform = ''; b.transformOrigin = '';
        } else {
            b.position = 'fixed';
            b.top = '0';
            b.left = '0';
            b.width = S + 'px';
            b.height = L + 'px';
            b.transformOrigin = '0 0';
            b.transform = (rot === 1)
                ? 'translateY(' + S + 'px) rotate(-90deg)'
                : 'translateX(' + L + 'px) rotate(90deg)';
        }
        try { Graphics._updateAllElements(); } catch (e) {}
    }

    // La escala del juego usa las medidas ya giradas
    var _Graphics_updateRealScale = Graphics._updateRealScale;
    Graphics._updateRealScale = function() {
        if (rot !== 0) {
            if (this._stretchEnabled && this._width && this._height) {
                var h = window.innerHeight / this._width;
                var v = window.innerWidth / this._height;
                this._realScale = Math.min(h, v);
            } else {
                this._realScale = 1;
            }
        } else {
            _Graphics_updateRealScale.call(this);
        }
    };

    // Los toques tambien hay que girarlos para que el personaje responda bien
    function convertir(x, y) {
        var S = window.innerHeight, L = window.innerWidth;
        return (rot === 1) ? { x: S - y, y: x } : { x: y, y: L - x };
    }

    function convertirLista(lista) {
        var r = [];
        for (var i = 0; lista && i < lista.length; i++) {
            var c = convertir(lista[i].pageX, lista[i].pageY);
            r.push({ identifier: lista[i].identifier, pageX: c.x, pageY: c.y });
        }
        return r;
    }

    function adaptar(e) {
        if (rot === 0 || !e) return e;
        var c = convertir(e.pageX || 0, e.pageY || 0);
        return {
            type: e.type, button: e.button,
            deltaX: e.deltaX, deltaY: e.deltaY,
            pointerType: e.pointerType, isPrimary: e.isPrimary,
            pageX: c.x, pageY: c.y,
            touches: convertirLista(e.touches),
            changedTouches: convertirLista(e.changedTouches),
            preventDefault: function() { e.preventDefault(); },
            stopPropagation: function() { e.stopPropagation(); }
        };
    }

    ['_onMouseDown', '_onMouseMove', '_onMouseUp', '_onWheel', '_onTouchStart',
     '_onTouchMove', '_onTouchEnd', '_onTouchCancel', '_onPointerDown'].forEach(function(n) {
        var orig = TouchInput[n];
        if (typeof orig !== 'function') return;
        TouchInput[n] = function(e) { return orig.call(this, adaptar(e)); };
    });

    // ---------- Que el doble toque no active pantalla completa ni zoom ----------
    function bloquearPantallaCompletaYZoom() {
        if (!movil || usarPantallaCompleta) return;
        document.body.style.touchAction = 'manipulation';
        document.addEventListener('dblclick', function(e) { e.preventDefault(); }, { passive: false });
        function salir() {
            if (document.fullscreenElement && document.exitFullscreen) {
                try { document.exitFullscreen(); } catch (e) {}
            } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
                try { document.webkitExitFullscreen(); } catch (e) {}
            }
        }
        document.addEventListener('fullscreenchange', salir);
        document.addEventListener('webkitfullscreenchange', salir);
    }

    // ---------- Al cargar la pagina ----------
    window.addEventListener('load', function() {
        if (avisoHorizontal) crearAviso();
        aplicarRotacion();
        bloquearVertical();
        bloquearPantallaCompletaYZoom();
        if (Utils.isNwjs()) {
            var dx = ancho - window.innerWidth;
            var dy = alto - window.innerHeight;
            window.moveBy(-dx / 2, -dy / 2);
            window.resizeBy(dx, dy);
        }
        document.body.style.overflow = 'hidden';
        document.body.style.margin = '0';
    });

    function alCambiar() { revisar(); aplicarRotacion(); }
    window.addEventListener('orientationchange', function() { setTimeout(alCambiar, 150); });
    window.addEventListener('resize', alCambiar);
    if (screen.orientation && screen.orientation.addEventListener) {
        screen.orientation.addEventListener('change', function() { setTimeout(alCambiar, 150); });
    }

})();
