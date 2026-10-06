/*:
 * @plugindesc Muestra un aviso "Gira tu celular" cuando el celular está en vertical.
 */
(function() {

    var aviso = null;

    function crear() {
        aviso = document.createElement('div');
        aviso.style.cssText =
            'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;' +
            'background:#000;color:#fff;display:none;flex-direction:column;' +
            'align-items:center;justify-content:center;text-align:center;' +
            'font-family:sans-serif;font-size:22px;padding:20px;box-sizing:border-box;';
        aviso.innerHTML = '<div style="font-size:70px;">📱↻</div>' +
                          '<p>Gira tu celular<br>para jugar en horizontal</p>';
        document.body.appendChild(aviso);
        revisar();
    }

    function revisar() {
        if (!aviso) return;
        var vertical = window.innerHeight > window.innerWidth;
        var celular = Utils.isMobileDevice();
        aviso.style.display = (vertical && celular) ? 'flex' : 'none';
    }

    window.addEventListener('load', crear);
    window.addEventListener('resize', revisar);
    window.addEventListener('orientationchange', revisar);

})();
