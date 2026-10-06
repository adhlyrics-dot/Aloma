/*:
 * @plugindesc Salta la pantalla de título por completo y empieza el juego directo, sin parpadeo.
 */
(function() {

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
            this.checkPlayerLocation();
            DataManager.setupNewGame();
            SceneManager.goto(Scene_Map);
        }
        this.updateDocumentTitle();
    };

})();
