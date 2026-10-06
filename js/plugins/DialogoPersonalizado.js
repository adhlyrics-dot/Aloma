/*:
 * @plugindesc Cambia fuente, tamaño, transparencia y líneas del cuadro de diálogo.
 */
(function() {

    // Fuente propia (ponla en la carpeta fonts/). Quita estas dos partes si no usas una.
    Graphics.loadFont("MiFuente", "fonts/MiFuente.ttf");
    Window_Base.prototype.standardFontFace = function() {
        return "MiFuente, GameFont";
    };

    Window_Base.prototype.standardFontSize = function() {
        return 26;               // tamaño del texto (por defecto 28)
    };

    Window_Base.prototype.standardPadding = function() {
        return 18;               // margen interior (por defecto 18)
    };

    Window_Base.prototype.standardBackOpacity = function() {
        return 220;              // opacidad del fondo, 0 a 255 (por defecto 192)
    };

    Window_Message.prototype.numVisibleRows = function() {
        return 4;                // líneas del cuadro de texto
    };

})();
