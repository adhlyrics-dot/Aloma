/*:
 * @plugindesc En celular vertical, el juego cubre toda la pantalla y la cámara sigue al personaje.
 */
(function() {

    var camX = 0;

    function modoCubrir() {
        return Utils.isMobileDevice() && window.innerHeight > window.innerWidth;
    }

    // Escala: llenar el alto de la pantalla
    var _updateRealScale = Graphics._updateRealScale;
    Graphics._updateRealScale = function() {
        if (modoCubrir()) {
            this._realScale = window.innerHeight / this._height;
        } else {
            _updateRealScale.call(this);
        }
    };

    // Posición del lienzo
    Graphics._centerElement = function(el) {
        var w = el.width * this._realScale;
        var h = el.height * this._realScale;
        el.style.position = 'absolute';
        el.style.width = w + 'px';
        el.style.height = h + 'px';
        if (modoCubrir()) {
            el.style.margin = '0';
            el.style.top = '0px';
            el.style.bottom = 'auto';
            el.style.right = 'auto';
            el.style.left = (-camX) + 'px';
        } else {
            el.style.margin = 'auto';
            el.style.top = el.style.left = el.style.right = el.style.bottom = '0';
        }
    };

    // La cámara sigue al jugador
    var _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (!modoCubrir()) return;
        var escala = Graphics._realScale;
        var anchoTotal = Graphics.width * escala;
        var objetivo = $gamePlayer.screenX() * escala - window.innerWidth / 2;
        var nuevo = Math.max(0, Math.min(objetivo, anchoTotal - window.innerWidth));
        nuevo = Math.round(nuevo);
        if (nuevo !== camX) {
            camX = nuevo;
            Graphics._centerElement(Graphics._canvas);
            if (Graphics._upperCanvas) Graphics._centerElement(Graphics._upperCanvas);
        }
    };

    window.addEventListener('load', function() {
        document.body.style.overflow = 'hidden';
        document.body.style.margin = '0';
    });

})();
