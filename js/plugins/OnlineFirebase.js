/*:
 * @plugindesc Multijugador Firebase v3: nombres, movimiento suave, chat traducido, idioma guardado y mas estable.
 *
 * @param databaseURL
 * @desc URL de tu Realtime Database (Firebase > Realtime Database).
 * @default https://verdadreto-6bb8d-default-rtdb.firebaseio.com
 *
 * @param IdiomaVariable
 * @desc Numero de la variable donde guardas el idioma (1=English, 2=Espanol, 3=Arabe).
 * @default 1
 *
 * @param MostrarMiNombre
 * @desc true = tambien se ve tu propio nombre sobre tu personaje. false = no.
 * @default true
 *
 * @param TraductorURL
 * @desc URL de tu Worker de Cloudflare (Gemma). Si lo dejas vacio se usa la de por defecto.
 * @default https://verdadreto-traductor.adhlyrics.workers.dev
 *
 * @help
 * Chat: pulsa la tecla T (PC) o el boton de globo (celular).
 *       Enter envia, Esc cierra.
 * Idioma: cada vez que cambie la variable de idioma se guarda en
 *         localStorage con la clave "idioma" (1, 2 o 3), para que
 *         verdad-o-reto.html pueda leerlo.
 */
(function() {

    var p = PluginManager.parameters('OnlineFirebase');
    var config = {
        apiKey: "AIzaSyDrtK1WFIwYNwY0gyiXl5o5RJ4b44Ekm7k",
        authDomain: "verdadreto-6bb8d.firebaseapp.com",
        databaseURL: String(p['databaseURL']),
        projectId: "verdadreto-6bb8d",
        storageBucket: "verdadreto-6bb8d.firebasestorage.app",
        messagingSenderId: "918592609096",
        appId: "1:918592609096:web:ee82aab620e3a360fc717d"
    };
    var idVar = Number(p['IdiomaVariable'] || 1);
    var mostrarMiNombre = String(p['MostrarMiNombre'] || 'true') === 'true';
    var traductorURL = String(p['TraductorURL'] ||
        'https://verdadreto-traductor.adhlyrics.workers.dev').trim().replace(/\/+$/, '');

    var VERSION = '10.12.2';
    var TIMEOUT = 15000;           // ms sin señal para ocultar a un jugador
    var LATIDO = 5000;             // cada cuanto se avisa que sigues conectado

    var db = null, miRef = null, chatRef = null, miId = null;
    var datos = {};
    var ultimo = '';
    var contador = 0;
    var offset = 0;
    var enviado = false;           // ya se subio al menos una vez mi registro completo
    var estado = 'sin iniciar';

    function num(v, def) {
        return (typeof v === 'number' && isFinite(v)) ? v : def;
    }

    // =====================================================
    //  IDIOMA GUARDADO (no depende de Firebase)
    // =====================================================
    function idiomaActual() {
        try { return Number(localStorage.getItem('idioma')) || 2; }
        catch (e) { return 2; }
    }

    var _setValue = Game_Variables.prototype.setValue;
    Game_Variables.prototype.setValue = function(variableId, value) {
        _setValue.call(this, variableId, value);
        if (variableId === idVar && Number(value) >= 1) {
            try { localStorage.setItem('idioma', String(Number(value))); } catch (e) {}
        }
    };

    // En partida nueva, recupera el idioma elegido la vez anterior
    var _setupNewGame = DataManager.setupNewGame;
    DataManager.setupNewGame = function() {
        _setupNewGame.call(this);
        try {
            var g = Number(localStorage.getItem('idioma'));
            if (g >= 1) $gameVariables.setValue(idVar, g);
        } catch (e) {}
    };

    // =====================================================
    //  CARGAR FIREBASE
    // =====================================================
    function cargar(src, cb) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = cb;
        s.onerror = function() {
            console.error('OnlineFirebase: no se pudo cargar ' + src);
            estado = 'error';
        };
        document.head.appendChild(s);
    }

    function iniciar() {
        if (estado !== 'sin iniciar') return;
        estado = 'cargando';
        var base = 'https://www.gstatic.com/firebasejs/' + VERSION + '/';
        cargar(base + 'firebase-app-compat.js', function() {
            cargar(base + 'firebase-database-compat.js', conectar);
        });
    }

    function conectar() {
        try {
            firebase.initializeApp(config);
            db = firebase.database();
            miId = 'p' + Math.random().toString(36).slice(2, 10);
            miRef = db.ref('players/' + miId);

            // Solo se descargan los cambios de cada jugador, no toda la lista cada vez
            var playersRef = db.ref('players');
            var guardar = function(s) { datos[s.key] = s.val(); };
            var errLectura = function(err) {
                console.error('OnlineFirebase: error de lectura (revisa las reglas)', err);
            };
            playersRef.on('child_added', guardar, errLectura);
            playersRef.on('child_changed', guardar, errLectura);
            playersRef.on('child_removed', function(s) { delete datos[s.key]; });

            // Al conectar (y al reconectar) se vuelve a registrar el borrado automatico
            db.ref('.info/connected').on('value', function(s) {
                if (s.val() === true) {
                    miRef.onDisconnect().remove();
                    ultimo = '';       // fuerza a volver a subir mi registro completo
                }
            });

            db.ref('.info/serverTimeOffset').once('value', function(s) {
                offset = s.val() || 0;
                iniciarChat();
            });

            // Latido aparte del juego: sigue funcionando aunque la pestaña quede en segundo plano
            setInterval(function() {
                if (estado === 'listo' && enviado) {
                    miRef.child('t').set(firebase.database.ServerValue.TIMESTAMP)
                        .catch(function() {});
                }
            }, LATIDO);

            estado = 'listo';
        } catch (e) {
            console.error('OnlineFirebase:', e);
            estado = 'error';
        }
    }

    function activo(d) {
        if (!d || !d.t) return true;
        return (Date.now() + offset - d.t) < TIMEOUT;
    }

    // =====================================================
    //  CHAT
    // =====================================================
    var chatBox, chatLog, chatInput, chatBtn;
    var ultimoEnvio = 0;
    var PLACEHOLDER = { 1: 'Message...', 2: 'Mensaje...', 3: '...رسالة' };

    function abrirChat() {
        chatInput.style.display = 'block';
        chatInput.placeholder = PLACEHOLDER[idiomaActual()] || PLACEHOLDER[2];
        chatInput.focus();
        Input.clear();
    }

    function cerrarChat() {
        chatInput.value = '';
        chatInput.style.display = 'none';
        chatInput.blur();
        Input.clear();
    }

    // ---------- TRADUCCIÓN ----------
    var CODIGOS = { 1: 'en', 2: 'es', 3: 'ar' };
    var cacheTrad = {};

    function miCodigo() { return CODIGOS[idiomaActual()] || 'es'; }

    // Detecta en qué idioma está escrito el texto (en, es o ar)
    function detectarIdioma(texto, pista) {
        if (/[\u0600-\u06FF]/.test(texto)) return 'ar';
        if (/[áéíóúñü¿¡]/i.test(texto)) return 'es';
        var palabras = texto.toLowerCase().match(/[a-z']+/g) || [];
        var EN = ['the','is','are','you','i','and','to','of','what','how','hello','hi',
                  'my','your','do','it','this','that','we','can','im','yes'];
        var ES = ['el','la','los','las','es','son','tu','yo','y','de','que','como','hola',
                  'mi','un','una','por','con','te','se','muy','pero','bien'];
        var en = 0, es = 0;
        palabras.forEach(function(w) {
            if (EN.indexOf(w) >= 0) en++;
            if (ES.indexOf(w) >= 0) es++;
        });
        if (en > es) return 'en';
        if (es > en) return 'es';
        return (pista === 'en' || pista === 'es') ? pista : 'es';
    }

    function decodificar(t) {
        var ta = document.createElement('textarea');
        ta.innerHTML = t;
        return ta.value;
    }

    // Respaldo: MyMemory
    function traducirMyMemory(texto, de, a, cb) {
        var url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(texto) +
                  '&langpair=' + de + '|' + a;
        fetch(url).then(function(r) { return r.json(); }).then(function(j) {
            var t = j && j.responseData && j.responseData.translatedText;
            var ok = j && Number(j.responseStatus) === 200 && t &&
                     String(t).indexOf('MYMEMORY WARNING') !== 0;
            cb(ok ? decodificar(String(t)) : null);
        }).catch(function() { cb(null); });
    }

    // Principal: tu Worker de Cloudflare (acepta "translated" o "translation")
    function traducirWorker(texto, de, a, cb) {
        fetch(traductorURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: texto, from: de, to: a })
        }).then(function(r) {
            if (!r.ok) throw new Error('worker ' + r.status);
            return r.json();
        }).then(function(j) {
            var tr = j && (j.translated || j.translation);
            if (tr) cb(String(tr));
            else traducirMyMemory(texto, de, a, cb);
        }).catch(function() { traducirMyMemory(texto, de, a, cb); });
    }

    function traducir(texto, de, a, cb) {
        var clave = de + '|' + a + '|' + texto;
        if (cacheTrad[clave]) { cb(cacheTrad[clave]); return; }
        // Solo se guardan en memoria las traducciones que salieron bien
        var fin = function(t) { if (t) cacheTrad[clave] = t; cb(t); };
        if (traductorURL) traducirWorker(texto, de, a, fin);
        else traducirMyMemory(texto, de, a, fin);
    }

    function enviarChat() {
        var t = chatInput.value.trim();
        if (!t) { cerrarChat(); return; }
        if (Date.now() - ultimoEnvio < 1000) return;   // anti-spam
        var lider = $gameParty && $gameParty.leader();
        if (!lider || !chatRef) { cerrarChat(); return; }
        ultimoEnvio = Date.now();
        var texto = t.slice(0, 100);
        chatRef.push({
            name: String(lider.name()).slice(0, 20),
            text: texto,
            src: detectarIdioma(texto, miCodigo()),
            uid: miId,
            t: firebase.database.ServerValue.TIMESTAMP
        });
        cerrarChat();
    }

    function mostrarMensaje(m) {
        if (!m || !m.text) return;
        var orig = String(m.text);
        var linea = document.createElement('div');
        linea.dir = 'auto';
        linea.style.cssText = 'background:rgba(0,0,0,.55);padding:3px 8px;border-radius:6px;' +
                              'margin-top:2px;word-break:break-word;';
        var n = document.createElement('b');
        n.textContent = String(m.name || '?') + ': ';
        var s = document.createElement('span');
        s.textContent = orig;                // textContent: nada se ejecuta como HTML
        linea.appendChild(n);
        linea.appendChild(s);
        chatLog.appendChild(linea);

        // Si lo escribió otra persona en otro idioma, lo traducimos al mío
        var src = m.src || detectarIdioma(orig, null);
        var destino = miCodigo();
        if (m.uid !== miId && src !== destino) {
            traducir(orig, src, destino, function(tr) {
                if (!tr) return;             // si falla, se queda el original
                s.textContent = tr;
                var o = document.createElement('div');
                o.dir = 'auto';
                o.style.cssText = 'font-size:11px;opacity:.7;';
                o.textContent = orig;
                linea.appendChild(o);
            });
        }
        while (chatLog.children.length > 6) chatLog.removeChild(chatLog.firstChild);
        setTimeout(function() {
            if (linea.parentNode) linea.parentNode.removeChild(linea);
        }, 15000);
    }

    function crearChat() {
        chatBox = document.createElement('div');
        chatBox.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99998;' +
            'width:min(320px,70vw);font:14px sans-serif;color:#fff;';

        chatLog = document.createElement('div');
        chatLog.style.cssText = 'pointer-events:none;margin-bottom:4px;';

        chatInput = document.createElement('input');
        chatInput.type = 'text';
        chatInput.maxLength = 100;
        chatInput.dir = 'auto';
        chatInput.style.cssText = 'display:none;width:100%;box-sizing:border-box;padding:6px;' +
            'border-radius:6px;border:1px solid #fff;background:rgba(0,0,0,.75);' +
            'color:#fff;font-size:16px;margin-bottom:4px;';

        chatBtn = document.createElement('button');
        chatBtn.textContent = '\uD83D\uDCAC';
        chatBtn.style.cssText = 'font-size:20px;padding:4px 10px;border-radius:8px;' +
            'border:0;background:rgba(0,0,0,.6);color:#fff;';

        chatBox.appendChild(chatLog);
        chatBox.appendChild(chatInput);
        chatBox.appendChild(chatBtn);
        document.body.appendChild(chatBox);

        // Que el juego no reciba teclas ni toques mientras escribes
        ['keydown', 'keyup', 'keypress'].forEach(function(ev) {
            chatInput.addEventListener(ev, function(e) {
                e.stopPropagation();
                if (ev === 'keydown') {
                    if (e.keyCode === 13) { e.preventDefault(); enviarChat(); }
                    if (e.keyCode === 27) { e.preventDefault(); cerrarChat(); }
                }
            });
        });
        ['mousedown', 'mouseup', 'touchstart', 'touchend', 'touchmove', 'pointerdown', 'wheel']
            .forEach(function(ev) {
                chatBox.addEventListener(ev, function(e) { e.stopPropagation(); });
            });

        chatBtn.addEventListener('click', function() {
            if (chatInput.style.display === 'none') abrirChat(); else cerrarChat();
        });

        // Tecla T abre el chat (solo en el mapa)
        document.addEventListener('keydown', function(e) {
            if (e.keyCode === 84 && document.activeElement !== chatInput &&
                SceneManager._scene instanceof Scene_Map) {
                e.preventDefault();
                abrirChat();
            }
        });
    }

    function iniciarChat() {
        crearChat();
        var ahora = Date.now() + offset;
        chatRef = db.ref('chat');
        // limpia mensajes de hace más de 1 hora
        chatRef.orderByChild('t').endAt(ahora - 3600000).once('value', function(s) {
            s.forEach(function(c) { c.ref.remove(); });
        });
        // escucha solo mensajes nuevos
        chatRef.orderByChild('t').startAt(ahora - 1000).on('child_added', function(s) {
            mostrarMensaje(s.val());
        });
    }

    // =====================================================
    //  ENVIAR MI POSICIÓN
    // =====================================================
    var _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        iniciar();
        if (estado !== 'listo' || !miRef) return;
        contador++;
        if (contador % 6 !== 0) return;
        // Durante un cambio de mapa no se sube nada (evita mapa y posicion mezclados)
        if ($gamePlayer.isTransferring()) return;
        var lider = $gameParty.leader();
        if (!lider) return;
        try {
            var e = {
                name: String(lider.name()).slice(0, 20),
                map: $gameMap.mapId(),
                x: $gamePlayer.x,
                y: $gamePlayer.y,
                d: $gamePlayer.direction(),
                img: $gamePlayer.characterName(),
                idx: $gamePlayer.characterIndex(),
                spd: $gamePlayer.realMoveSpeed()
            };
            var texto = JSON.stringify(e);
            if (texto !== ultimo || contador % 300 === 0) {
                ultimo = texto;
                e.t = firebase.database.ServerValue.TIMESTAMP;
                miRef.set(e);
                enviado = true;
            }
        } catch (err) {
            console.error('OnlineFirebase: no se pudo enviar la posicion', err);
        }
    };

    // =====================================================
    //  DIBUJAR A LOS OTROS (con nombre y movimiento suave)
    // =====================================================
    function crearEtiqueta(texto) {
        var bmp = new Bitmap(160, 28);
        bmp.fontSize = 18;
        bmp.outlineWidth = 4;
        bmp.drawText(texto, 0, 0, 160, 28, 'center');
        var sp = new Sprite(bmp);
        sp.anchor.x = 0.5;
        sp.anchor.y = 1;
        return sp;
    }

    // Altura del sprite sin fallar si su imagen aun no se ha cargado
    function alturaSprite(sp) {
        var b = sp.bitmap;
        if (b && b.isReady && b.isReady()) return sp.patternHeight();
        return 48;
    }

    // Convierte un salto en pasos de 1 casilla (primero X, luego Y)
    function agregarPasos(r, desdeX, desdeY, aX, aY) {
        var dist = Math.abs(aX - desdeX) + Math.abs(aY - desdeY);
        if (dist > 6) { r.cola.push({ tp: true, x: aX, y: aY }); return; }
        var x = desdeX, y = desdeY;
        while (x !== aX) { x += aX > x ? 1 : -1; r.cola.push({ x: x, y: y }); }
        while (y !== aY) { y += aY > y ? 1 : -1; r.cola.push({ x: x, y: y }); }
    }

    var _createCharacters = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function() {
        _createCharacters.call(this);
        this._remotos = {};
        this._miEtiqueta = null;
        if (mostrarMiNombre) {
            for (var i = 0; i < this._characterSprites.length; i++) {
                var sp = this._characterSprites[i];
                if (sp._character === $gamePlayer) {
                    var lider = $gameParty.leader();
                    var et = crearEtiqueta(String(lider ? lider.name() : ''));
                    sp.addChild(et);
                    this._miEtiqueta = { sprite: sp, et: et };
                    break;
                }
            }
        }
    };

    var _Spriteset_update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        _Spriteset_update.call(this);
        this.actualizarRemotos();
        if (this._miEtiqueta) {
            this._miEtiqueta.et.y = -alturaSprite(this._miEtiqueta.sprite);
        }
    };

    Spriteset_Map.prototype.actualizarRemotos = function() {
        if (!this._remotos) return;
        var mapa = $gameMap.mapId();
        var id;

        // Quitar a los que ya no estan, cambiaron de mapa o dejaron de dar señal
        for (id in this._remotos) {
            var dd = datos[id];
            if (!dd || dd.map !== mapa || !activo(dd)) {
                this._tilemap.removeChild(this._remotos[id].sprite);
                delete this._remotos[id];
            }
        }

        // Un jugador con datos raros no debe romper el juego de los demas
        for (id in datos) {
            if (id === miId) continue;
            try {
                this.actualizarRemoto(id, datos[id], mapa);
            } catch (err) {
                console.error('OnlineFirebase: jugador ' + id, err);
            }
        }
    };

    Spriteset_Map.prototype.actualizarRemoto = function(id, d, mapa) {
        if (!d || typeof d !== 'object' || d.map !== mapa || !activo(d)) return;

        // Se validan los datos que llegan de internet
        var x = num(d.x, null), y = num(d.y, null);
        if (x === null || y === null) return;
        var img = typeof d.img === 'string' ? d.img : '';
        var idx = num(d.idx, 0);
        var dir = [2, 4, 6, 8].indexOf(d.d) >= 0 ? d.d : 2;
        var spd = Math.max(1, Math.min(6, num(d.spd, 4)));
        var nombre = String(d.name || '').slice(0, 20);

        var r = this._remotos[id];
        if (!r) {
            var ch = new Game_Character();
            ch.setImage(img, idx);
            ch.locate(x, y);
            ch.setDirection(dir);
            ch.setMoveSpeed(spd);
            ch.setThrough(true);
            var sp = new Sprite_Character(ch);
            var et = crearEtiqueta(nombre);
            sp.addChild(et);
            r = this._remotos[id] = {
                char: ch, sprite: sp, etiqueta: et, nombre: nombre,
                cola: [], lx: x, ly: y
            };
            this._tilemap.addChild(sp);
        }

        var c = r.char;
        if (c.characterName() !== img || c.characterIndex() !== idx) {
            c.setImage(img, idx);
        }

        // Si cambio su nombre, se redibuja la etiqueta
        if (r.nombre !== nombre) {
            r.sprite.removeChild(r.etiqueta);
            r.etiqueta = crearEtiqueta(nombre);
            r.sprite.addChild(r.etiqueta);
            r.nombre = nombre;
        }

        // Si llegó una posición nueva, la metemos a la cola de pasos
        if (x !== r.lx || y !== r.ly) {
            agregarPasos(r, r.lx, r.ly, x, y);
            r.lx = x;
            r.ly = y;
        }

        // Si la cola se acumuló demasiado (lag), salta al final
        if (r.cola.length > 8) {
            r.cola = [];
            c.locate(x, y);
        }

        // Velocidad: la del jugador, +1 si va atrasado para alcanzarlo
        var vel = spd;
        if (r.cola.length > 2) vel += 1;
        c.setMoveSpeed(vel);

        // Dar el siguiente paso cuando termina el anterior
        if (!c.isMoving() && r.cola.length > 0) {
            var s = r.cola.shift();
            var dx = s.x - c.x, dy = s.y - c.y;
            if (!s.tp && Math.abs(dx) + Math.abs(dy) === 1) {
                c.moveStraight(dx > 0 ? 6 : dx < 0 ? 4 : dy > 0 ? 2 : 8);
            } else {
                c.locate(s.x, s.y);
            }
        } else if (!c.isMoving() && r.cola.length === 0) {
            c.setDirection(dir);
        }

        c.update();
        r.etiqueta.y = -alturaSprite(r.sprite);
    };

})();
