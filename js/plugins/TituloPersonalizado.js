/*:
 * @plugindesc Título del juego con fuente, color y posición personalizados.
 */
(function() {

    Graphics.loadFont("MiFuente", "fonts/MiFuente.ttf");

    Scene_Title.prototype.drawGameTitle = function() {
        var bmp = this._gameTitleSprite.bitmap;
        var texto = $dataSystem.gameTitle;

        bmp.fontFace     = "MiFuente, GameFont";    // tu fuente (con respaldo)
        bmp.fontSize     = 84;                      // tamaño
        bmp.textColor    = "#ffd54a";               // color del texto
        bmp.outlineColor = "rgba(60, 20, 0, 0.9)";  // color del borde
        bmp.outlineWidth = 10;                      // grosor del borde

        var x = 20;
        var y = Graphics.height / 4;                // altura: usa 3 o 2 para bajarlo
        var ancho = Graphics.width - x * 2;
        bmp.drawText(texto, x, y, ancho, 96, "center");
    };

})();
