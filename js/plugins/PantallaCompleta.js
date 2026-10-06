/*:
 * @plugindesc Pantalla completa en celular al primer toque (sin bloqueo de orientacion).
 */
(function() {

    Graphics._stretchEnabled = true;   // el juego se ajusta al tamaño de la pantalla

    var hecho = false;
    function pantallaCompleta() {
        if (hecho) return;
        hecho = true;
        var el = document.documentElement;
        var pedir = el.requestFullscreen || el.webkitRequestFullscreen;
        if (pedir && !document.fullscreenElement && !document.webkitFullscreenElement) {
            try { pedir.call(el); } catch (e) {}
        }
    }

    document.addEventListener('touchend', pantallaCompleta);
    document.addEventListener('click', pantallaCompleta);

})();
