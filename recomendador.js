// ============================================================
// Recomendador de películas (portada)
// ============================================================
// La persona escribe en cualquiera de los 4 idiomas qué le apetece
// ("el viernes por la noche, algo chileno", "Doku am Wochenende",
// "after 8pm, something from Mexico"...). Aquí se entiende ese texto
// sin servidor: se buscan palabras de día, hora, tipo (ficción /
// documental / cortos), género, país, duración, temas y tono
// ("misterio", "algo tierno"), referencias ("como David Lynch") y
// palabras de la trama o del reparto, y se puntúa cada función.
// Si hay un servicio de IA configurado (RECOMENDADOR_IA_URL, ver
// README), index.html lo usa primero y esto queda como respaldo.
//
// Datos que usa de cada película (movies.json):
//   fecha, hora, sinopsis (tipo, países en alemán, "108 min", "Regie: …")
//   generos, temas: claves de GENEROS y TEMAS, p. ej. ["drama"], ["misterio"]
//   trama: { de, es, en, pt }, reparto: [...], direccion
//   tipo, duracion, paises (opcionales): si la sinopsis no lo dice
// ============================================================

// Dirección del servicio de IA (opcional, ver README → "Recomendador con IA").
// Vacío = solo el motor local de este archivo.
const RECOMENDADOR_IA_URL = '';

function normalizar(s) {
  return String(s || '').toLowerCase().replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ---------- Vocabulario (texto ya normalizado: minúsculas, sin acentos) ----------

// Índice = getDay() (0 = domingo)
const DIAS_RE = [
  /\b(sonntags?|domingos?|sundays?)\b/,
  /\b(montags?|lunes|mondays?|segunda)\b/,
  /\b(dienstags?|martes|tuesdays?|terca)\b/,
  /\b(mittwochs?|miercoles|wednesdays?|quarta)\b/,
  /\b(donnerstags?|jueves|thursdays?|quinta)\b/,
  /\b(freitags?|viernes|fridays?|sexta)\b/,
  /\b(samstags?|sonnabends?|sabados?|saturdays?)\b/
];
const FINDE_RE = /\b(wochenende|fin de semana|finde|weekend|fim de semana)\b/;
const HOY_RE = /\b(heute|hoy|today|tonight|hoje)\b/;
const MANANA_RE = /\b(morgen|tomorrow|amanha)\b|(^\s*|[^a]\s)manana\b/;   // "por la mañana" no es "mañana"

// Franjas horarias [desde, hasta) en horas decimales
const FRANJAS = [
  { re: /\b(mittags?|mediodia|noon|midday|meio-dia|meio dia)\b/, r: [11.5, 15.5] },
  { re: /\b(nachmittags?|afternoon|media tarde)\b/, r: [12, 17.5] },
  { re: /\btarde\b/, r: [12, 20.5] },
  { re: /\b(abends?|evening|feierabend|after work|despues del trabajo|depois do trabalho)\b/, r: [17.5, 23] },
  { re: /\b(noche|noite|night|tonight)\b/, r: [19.5, 24] },
  { re: /\b(nachts?|spat|late|madrugada|trasnoche)\b/, r: [21, 24] }
];

const TIPOS = {
  documental: /\b(doku\w*|dokumentar\w*|documental\w*|documentar\w*|documentary|documentaries|docu\w*)\b/,
  cortos: /\b(kurzfilm\w*|cortometraje\w*|cortos|short films?|shorts|curtas?[- ]metragens?|curtas)\b/,
  ficcion: /\b(spielfilm\w*|ficcion|fiction|ficcao|feature films?|largometraje\w*|longa[- ]metragem)\b/
};

// Géneros: para que cuenten hay que ponerlos en "generos" de movies.json
const GENEROS = {
  drama:    { re: /\bdram/, n: { de: 'Drama', es: 'drama', en: 'drama', pt: 'drama' } },
  comedia:  { re: /\b(komod|comed|humor|lustig|witzig|funny|divertid|engracad|reir\b|lachen|laugh|rir\b)/, n: { de: 'Komödie', es: 'comedia', en: 'comedy', pt: 'comédia' } },
  thriller: { re: /\b(thrill|suspens|spannend|spannung|krimi|crime|policia)/, n: { de: 'Thriller', es: 'thriller', en: 'thriller', pt: 'thriller' } },
  terror:   { re: /\b(horror|terror|grusel|miedo|scary|medo\b|susto)/, n: { de: 'Horror', es: 'terror', en: 'horror', pt: 'terror' } },
  romance:  { re: /\b(romanc|romant|liebe|amor\b|love\b)/, n: { de: 'Liebesfilm', es: 'romance', en: 'romance', pt: 'romance' } },
  musica:   { re: /\b(musi)/, n: { de: 'Musik', es: 'música', en: 'music', pt: 'música' } },
  politica: { re: /\b(politi|dictadur|diktatur|dictator|ditadur|historic|historisch|geschichte)/, n: { de: 'Politik & Geschichte', es: 'política e historia', en: 'politics & history', pt: 'política e história' } },
  familia:  { re: /\b(famil)/, n: { de: 'Familie', es: 'familia', en: 'family', pt: 'família' } },
  lgbtiq:   { re: /\b(queer|lgb|gay\b|lesb|trans\b)/, n: { de: 'Queer', es: 'LGBTIQ+', en: 'LGBTIQ+', pt: 'LGBTIQ+' } },
  juventud: { re: /\b(jugend|teen|adolesc|joven|jovem|juventud|coming of age|erwachsenwerden)/, n: { de: 'Jugend', es: 'juventud', en: 'coming of age', pt: 'juventude' } }
};

// Países. "de" es el nombre tal como aparece en la sinopsis de movies.json.
const PAISES = [
  { de: 'Argentinien', re: /\bargentin/, n: { es: 'Argentina', en: 'Argentina', pt: 'Argentina' }, zona: 'sur' },
  { de: 'Bolivien', re: /\bbolivi/, n: { es: 'Bolivia', en: 'Bolivia', pt: 'Bolívia' }, zona: 'sur' },
  { de: 'Brasilien', re: /\b(brasil|brazil)/, n: { es: 'Brasil', en: 'Brazil', pt: 'Brasil' }, zona: 'sur' },
  { de: 'Chile', re: /\bchile/, n: { es: 'Chile', en: 'Chile', pt: 'Chile' }, zona: 'sur' },
  { de: 'Ecuador', re: /\b(ecuador|equador)/, n: { es: 'Ecuador', en: 'Ecuador', pt: 'Equador' }, zona: 'sur' },
  { de: 'Kolumbien', re: /\b(colomb|kolumb)/, n: { es: 'Colombia', en: 'Colombia', pt: 'Colômbia' }, zona: 'sur' },
  { de: 'Paraguay', re: /\bparagu/, n: { es: 'Paraguay', en: 'Paraguay', pt: 'Paraguai' }, zona: 'sur' },
  { de: 'Peru', re: /\b(peru|perua)/, n: { es: 'Perú', en: 'Peru', pt: 'Peru' }, zona: 'sur' },
  { de: 'Uruguay', re: /\burugu/, n: { es: 'Uruguay', en: 'Uruguay', pt: 'Uruguai' }, zona: 'sur' },
  { de: 'Venezuela', re: /\bvenez/, n: { es: 'Venezuela', en: 'Venezuela', pt: 'Venezuela' }, zona: 'sur' },
  { de: 'Mexiko', re: /\b(mexi|mejic)/, n: { es: 'México', en: 'Mexico', pt: 'México' }, zona: 'centro' },
  { de: 'Panama', re: /\bpanam/, n: { es: 'Panamá', en: 'Panama', pt: 'Panamá' }, zona: 'centro' },
  { de: 'Guatemala', re: /\bguatemal/, n: { es: 'Guatemala', en: 'Guatemala', pt: 'Guatemala' }, zona: 'centro' },
  { de: 'Costa Rica', re: /\bcosta ?ric/, n: { es: 'Costa Rica', en: 'Costa Rica', pt: 'Costa Rica' }, zona: 'centro' },
  { de: 'Kuba', re: /\b(cuba|kuba|kuban)/, n: { es: 'Cuba', en: 'Cuba', pt: 'Cuba' }, zona: 'centro' },
  { de: 'USA', re: /\b(usa|eeuu|ee ?uu|estados unidos|united states|vereinigte staaten|eua)\b/, n: { es: 'EE. UU.', en: 'USA', pt: 'EUA' } },
  { de: 'Kanada', re: /\b(kanada|canada)\b/, n: { es: 'Canadá', en: 'Canada', pt: 'Canadá' } },
  { de: 'Spanien', re: /\b(spanien|espana|spain|espanha)\b/, n: { es: 'España', en: 'Spain', pt: 'Espanha' }, zona: 'europa' },
  { de: 'Portugal', re: /\bportugal\b/, n: { es: 'Portugal', en: 'Portugal', pt: 'Portugal' }, zona: 'europa' },
  { de: 'Deutschland', re: /\b(deutschland|germany|alemania|alemanha)\b/, n: { es: 'Alemania', en: 'Germany', pt: 'Alemanha' }, zona: 'europa' },
  { de: 'Frankreich', re: /\b(frankreich|france|francia|franca)\b/, n: { es: 'Francia', en: 'France', pt: 'França' }, zona: 'europa' },
  { de: 'Italien', re: /\b(italien|italy|italia)\b/, n: { es: 'Italia', en: 'Italy', pt: 'Itália' }, zona: 'europa' },
  { de: 'Belgien', re: /\b(belgi|belgica)/, n: { es: 'Bélgica', en: 'Belgium', pt: 'Bélgica' }, zona: 'europa' },
  { de: 'Luxemburg', re: /\bluxemb/, n: { es: 'Luxemburgo', en: 'Luxembourg', pt: 'Luxemburgo' }, zona: 'europa' }
];
const ZONAS = [
  { re: /\b(lateinamerika\w*|latinoameric\w*|latin america\w*|america latina|latino\w*)\b/, zonas: ['sur', 'centro'], n: { de: 'Lateinamerika', es: 'Latinoamérica', en: 'Latin America', pt: 'América Latina' } },
  { re: /\b(sudamerika\w*|sudameric\w*|south america\w*|america do sul)\b/, zonas: ['sur'], n: { de: 'Südamerika', es: 'Sudamérica', en: 'South America', pt: 'América do Sul' } },
  { re: /\b(mittelamerika\w*|centroameric\w*|central america\w*|america central)\b/, zonas: ['centro'], n: { de: 'Mittelamerika', es: 'Centroamérica', en: 'Central America', pt: 'América Central' } },
  { re: /\b(europa|europe|europ\w+)\b/, zonas: ['europa'], n: { de: 'Europa', es: 'Europa', en: 'Europe', pt: 'Europa' } }
];

// Temas y tono: se ponen en "temas" (o "generos") de movies.json
const TEMAS = {
  misterio:     { re: /\b(mister|myster|geheimnis|enigm|intriga|whodunit|desaparec|verschwind|disappear|desapar)/, n: { de: 'Mystery', es: 'misterio', en: 'mystery', pt: 'mistério' } },
  onirico:      { re: /\b(onir|surreal|traumhaft|traumartig|dream|sueno|sonho|alucin|halluc|weird|bizarr|seltsam|extran|estranh|kafka)/, n: { de: 'traumartige Stimmung', es: 'atmósfera onírica', en: 'dreamlike mood', pt: 'clima onírico' } },
  inquietante:  { re: /\b(inquiet|perturb|unsettl|unheimlich|verstor|beklemm|creepy|tension|dread|atmosf|atmosph|angustia|mulmig)/, n: { de: 'beklemmende Atmosphäre', es: 'tono inquietante', en: 'unsettling tone', pt: 'tom inquietante' } },
  oscuro:       { re: /\b(oscur|dark\b|dunkel|duster|sombri|escur|gotic|gothic|gotisch)/, n: { de: 'düster', es: 'oscura', en: 'dark', pt: 'sombria' } },
  noir:         { re: /\b(noir|cine negro)/, n: { de: 'Noir', es: 'noir', en: 'noir', pt: 'noir' } },
  humor_negro:  { re: /\b(humor negro|schwarz\w* humor|dark (comedy|humou?r)|sarcas|sardon|ironi|absurd)/, n: { de: 'schwarzer Humor', es: 'humor negro', en: 'dark humour', pt: 'humor negro' } },
  ternura:      { re: /\b(tiern|ternur|tern[oa]\b|tender|zartlich|herzlich|warmherzig|conmov|moving|beruhr|emotiv|feel[- ]?good|bonit|sweet|dulce|entranabl|heartwarming)/, n: { de: 'Zärtlichkeit', es: 'ternura', en: 'tenderness', pt: 'ternura' } },
  melancolia:   { re: /\b(melanc|triste|sad\b|traurig|nostalg|llorar|weinen|cry\b|chorar)/, n: { de: 'Melancholie', es: 'melancolía', en: 'melancholy', pt: 'melancolia' } },
  infancia:     { re: /\b(infan|ninos?\b|ninas?\b|kindheit|kinder\b|child|kids?\b|crianc|menin[oa])/, n: { de: 'Kindheit', es: 'infancia', en: 'childhood', pt: 'infância' } },
  memoria:      { re: /\b(memori|erinner|memory|olvid|vergessen|forget|vergangenheit|passado)/, n: { de: 'Erinnerung', es: 'memoria', en: 'memory', pt: 'memória' } },
  duelo:        { re: /\b(trauma|duelo|grief|trauer|luto|perdida|verlust|loss\b|sanar|heilung|heal|supervivi|uberleb|surviv|sobreviv)/, n: { de: 'Trauma und Trauer', es: 'trauma y duelo', en: 'trauma and grief', pt: 'trauma e luto' } },
  mujeres:      { re: /\b(femin|mujer|frauen|women|woman|mulher|femizid|sororid|hermanas|schwestern|sisters|irmas)/, n: { de: 'Frauenfiguren', es: 'mujeres', en: 'women', pt: 'mulheres' } },
  masculinidad: { re: /\b(masculin|mannlich|toxic|toxisch|machis|misogin|misogyn)/, n: { de: 'Männlichkeit', es: 'masculinidad', en: 'masculinity', pt: 'masculinidade' } },
  violencia:    { re: /\b(violen|gewalt|sangr|blood|blut|brutal|slasher|giallo|gore)/, n: { de: 'Gewalt', es: 'violencia', en: 'violence', pt: 'violência' } },
  venganza:     { re: /\b(vengan|revenge|rache|vinganc|western)/, n: { de: 'Rache', es: 'venganza', en: 'revenge', pt: 'vingança' } },
  herencia:     { re: /\b(herenc|inherit|erbe\b|erbschaft|heranc|coloni|kolonial|plantac|plantag|cacao|kakao|hacienda)/, n: { de: 'Erbe und Kolonialgeschichte', es: 'herencia y pasado colonial', en: 'inheritance and colonial past', pt: 'herança e passado colonial' } },
  esoterico:    { re: /\b(esoter|okkult|occult|espiritu|spiritu|brujer|witch|hexe|sekte|secta|cult\b|magia\b|magie|magic)/, n: { de: 'Esoterik', es: 'lo esotérico', en: 'the esoteric', pt: 'o esotérico' } },
  rock:         { re: /\b(rock|elvis|fifties|50er|anos 50|rockabilly)/, n: { de: 'Rock ’n’ Roll', es: 'rock and roll', en: 'rock ’n’ roll', pt: 'rock and roll' } },
  tango:        { re: /\b(tango|gardel|milonga|bandone)/, n: { de: 'Tango', es: 'tango', en: 'tango', pt: 'tango' } },
  guitarra:     { re: /\b(guitarr|gitarr|guitar|violao|violoes|luthier)/, n: { de: 'Gitarre', es: 'guitarra', en: 'guitar', pt: 'violão' } },
  migracion:    { re: /\b(migra|inmigr|immigr|imigra|einwander|exil|refugi|fluchtling|asyl|frontera|fronteira|xenofob|fremdenfeind|rassis|racism)/, n: { de: 'Migration', es: 'migración', en: 'migration', pt: 'migração' } },
  arte:         { re: /\b(arte\b|artista|artist|kunst|pintur|painting|maler|pintor|grabad|printmak)/, n: { de: 'Kunst', es: 'arte', en: 'art', pt: 'arte' } },
  biografia:    { re: /\b(biogra|retrato de|portrat|portrait)/, n: { de: 'Porträt', es: 'retrato biográfico', en: 'biographical portrait', pt: 'retrato biográfico' } },
  amistad:      { re: /\b(amistad|freundschaft|friendship|amizade)/, n: { de: 'Freundschaft', es: 'amistad', en: 'friendship', pt: 'amizade' } },
  nieve:        { re: /\b(nieve|schnee|snow|neve\b|esqui|ski\b|montan|mountain|berge\b|hielo|eisig|icy)/, n: { de: 'Schnee und Berge', es: 'nieve y montaña', en: 'snow and mountains', pt: 'neve e montanha' } },
  desierto:     { re: /\b(desiert|wuste|desert|atacama)/, n: { de: 'Wüste', es: 'desierto', en: 'desert', pt: 'deserto' } },
  playa:        { re: /\b(playa|strand|beach|praia|verano|sommer|summer|verao)/, n: { de: 'Strand und Sommer', es: 'playa y verano', en: 'beach and summer', pt: 'praia e verão' } },
  selva:        { re: /\b(selva|jungle|dschungel|tropic|tropen|floresta)/, n: { de: 'Dschungel', es: 'selva', en: 'jungle', pt: 'selva' } },
  huida:        { re: /\b(huida|huir|fuga\b|fugitiv|on the run|road ?movie|auf der flucht)/, n: { de: 'auf der Flucht', es: 'huida', en: 'on the run', pt: 'fuga' } },
  blanco_negro: { re: /\b(blanco y negro|black[- ]and[- ]white|schwarz[- ]?weiss|preto e branco|b&w)/, n: { de: 'Schwarz-Weiß', es: 'blanco y negro', en: 'black and white', pt: 'preto e branco' } },
  personal:     { re: /\b(primera persona|first[- ]person|primeira pessoa|ich-perspektive|diario|tagebuch|diary|ensayo|essay)/, n: { de: 'persönliche Perspektive', es: 'mirada en primera persona', en: 'first-person perspective', pt: 'olhar em primeira pessoa' } }
};

// Referencias: "me gusta David Lynch" → temas parecidos (clave de TEMAS o GENEROS)
const REFERENCIAS = [
  { re: /\b(david lynch|lynch\w*|twin peaks|blue velvet|terciopelo azul|mulholland|lost highway|carretera perdida)\b/, nombre: 'David Lynch', temas: ['misterio', 'onirico', 'inquietante', 'oscuro', 'noir'] },
  { re: /\b(hitchcock|vertigo)\b/, nombre: 'Hitchcock', temas: ['misterio', 'inquietante', 'thriller'] },
  { re: /\b(dario argento|giallo|suspiria)\b/, nombre: 'Dario Argento', temas: ['terror', 'violencia', 'onirico'] },
  { re: /\btarantino\b/, nombre: 'Tarantino', temas: ['violencia', 'venganza', 'humor_negro'] },
  { re: /\balmodovar\b/, nombre: 'Almodóvar', temas: ['mujeres', 'familia', 'lgbtiq', 'humor_negro'] },
  { re: /\bwes anderson\b/, nombre: 'Wes Anderson', temas: ['ternura', 'comedia', 'familia'] },
  { re: /\bbaumbach\b/, nombre: 'Noah Baumbach', temas: ['familia', 'humor_negro', 'comedia'] },
  { re: /\b(haneke|funny games|white ribbon|weisse band|cinta blanca)\b/, nombre: 'Michael Haneke', temas: ['inquietante', 'violencia', 'oscuro'] },
  { re: /\b(lucrecia martel|la cienaga|zama)\b/, nombre: 'Lucrecia Martel', temas: ['inquietante', 'familia', 'misterio'] },
  { re: /\b(kaurismaki|jarmusch)\b/, nombre: 'Kaurismäki / Jarmusch', temas: ['ternura', 'comedia', 'melancolia', 'blanco_negro'] },
  { re: /\bcuaron\b/, nombre: 'Alfonso Cuarón', temas: ['blanco_negro', 'infancia', 'familia', 'memoria'] },
  { re: /\blarrain\b/, nombre: 'Pablo Larraín', temas: ['politica', 'oscuro', 'memoria'] },
  { re: /\b(coen|fargo)\b/, nombre: 'los Coen', temas: ['humor_negro', 'thriller', 'violencia', 'huida'] },
  { re: /\b(del toro|laberinto del fauno|pan'?s labyrinth)\b/, nombre: 'Guillermo del Toro', temas: ['terror', 'onirico', 'politica'] },
  { re: /\b(bong joon|parasite|parasitos|parasiten)\b/, nombre: 'Bong Joon-ho', temas: ['humor_negro', 'thriller', 'familia'] },
  { re: /\bbergman\b/, nombre: 'Bergman', temas: ['familia', 'duelo', 'melancolia'] },
  { re: /\b(kiarostami|panahi)\b/, nombre: 'Kiarostami', temas: ['ternura', 'infancia'] },
  { re: /\b(ken loach|loach|dardenne)\b/, nombre: 'Ken Loach / Dardenne', temas: ['politica', 'migracion'] },
  { re: /\b(apichatpong|weerasethakul)\b/, nombre: 'Apichatpong', temas: ['onirico', 'selva'] },
  { re: /\b(sofia coppola|virgin suicides)\b/, nombre: 'Sofia Coppola', temas: ['juventud', 'mujeres', 'melancolia'] },
  { re: /\b(linklater|boyhood)\b/, nombre: 'Linklater', temas: ['juventud', 'infancia'] },
  { re: /\b(call me by your name|guadagnino)\b/, nombre: 'Guadagnino', temas: ['lgbtiq', 'juventud', 'romance', 'playa'] },
  { re: /\b(realismo magico|magischer? realismus|magic(al)? realism|garcia marquez|cortazar|borges)\b/, nombre: 'realismo mágico', temas: ['onirico', 'esoterico'] }
];

function nombreTema(k) { const x = TEMAS[k] || GENEROS[k]; return x ? (x.n[LANG] || x.n.de) : k; }

// Palabras que no dicen nada del tema (para buscar en la trama)
const VACIAS = new Set(('quiero quisiera busco buscando algo alguna alguno pelicula peliculas peli pelis film filme filmes films movie movies cine kino ' +
  'gusta gustan gustaria mucho muchos mucha muito muita sehr gerne mochte mag something anything about sobre donde where which ' +
  'tengo tiene tienen haben habe would could should really realmente bastante eine einen einem einer etwas nicht keine ' +
  'como parecido parecida similar ahnlich igual semelhante tipo estilo style gente leute people personas pessoas ' +
  'ver sehen watch assistir mirar dieser diese esta este isso esse essa quiere queremos amigos freunden friends ' +
  'noche tarde abend evening night noite despues antes nach before after desde hasta semana woche week ' +
  'quero gostaria gosto adorei gostei loved liked enjoyed really wanted want would assim parecido algum alguma mochte liebe finde').split(' '));

function nombrePais(p) { return LANG === 'de' ? p.de : (p.n[LANG] || p.de); }
function nombreGenero(k) { return GENEROS[k].n[LANG] || GENEROS[k].n.de; }

// ---------- Datos de cada película ----------

function datosPelicula(p) {
  const s = p.sinopsis || '';
  const n = normalizar(s);
  let tipo = p.tipo || null;
  if (!tipo) {
    if (/^dokument/.test(n)) tipo = 'documental';
    else if (/^kurzfilm/.test(n)) tipo = 'cortos';
    else if (/^spielfilm/.test(n)) tipo = 'ficcion';
  }
  const dur = s.match(/(\d{2,3})\s*min/i);
  const regie = s.match(/Regie:\s*(.+)$/i);
  const [h, m] = String(p.hora || '0:0').split(':').map(Number);
  return {
    tipo,
    paises: Array.isArray(p.paises)
      ? PAISES.filter(x => p.paises.includes(x.de))
      : PAISES.filter(x => new RegExp('\\b' + x.de + '\\b').test(s)),
    generos: Array.isArray(p.generos) ? p.generos.filter(g => GENEROS[g]) : [],
    temas: [...new Set([...(p.temas || []), ...(p.generos || [])])],
    reparto: Array.isArray(p.reparto) ? p.reparto : [],
    texto: normalizar([p.titulo, p.sinopsis, p.direccion, ...(p.reparto || []), ...Object.values(p.trama || {})].join(' ')),
    minutos: p.duracion || (dur ? Number(dur[1]) : null),
    hora: h + (m || 0) / 60,
    dia: new Date(p.fecha + 'T00:00:00').getDay(),
    directores: (p.direccion || (regie ? regie[1] : '')).split(/,|\bund\b|&/).map(x => x.trim()).filter(Boolean)
  };
}

// ---------- Entender el texto ----------

function horaDe(num, min, sufijo) {
  let h = Number(num) + (min ? Number(min) / 60 : 0);
  if (sufijo === 'pm' && h < 12) h += 12;
  else if (sufijo !== 'am' && h < 11) h += 12;   // "a las 8" en un cine = 20:00
  return h;
}

function interpretar(texto, peliculas, hoyISO) {
  let q = ' ' + normalizar(texto) + ' ';
  // "Freitagabend" → "freitag abend"
  q = q.replace(/(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)(abend|nachmittag|mittag|nacht)/g, '$1 $2');
  const c = { dias: new Set(), franjas: [], desde: null, hasta: null, tipos: new Set(), generos: new Set(), paises: new Set(), zonas: [], maxMin: null, textos: [], temas: new Set(), refs: [], palabras: [], reparto: [] };
  const original = ' ' + normalizar(texto) + ' ';

  // Fechas del festival: "27.11", "27/11", "27 de noviembre", "nov 27", "am 27."
  const fechas = [...new Set(peliculas.map(p => p.fecha))];
  const porDia = n => fechas.filter(f => Number(f.slice(8, 10)) === Number(n));
  q = q.replace(/\b(\d{1,2})\s*(?:\.|\/|-|de|th|st|nd|rd|of)?\s*(?:11|nov\w*)\b|\b(?:nov\w*)\s+(\d{1,2})\b|\b(\d{1,2})\.(?!\d)|\b(?:el|am|on|the|dia|no dia)\s+(\d{1,2})(?:th)?\b(?!\s*(?:h|uhr|pm|am|:|min))/g, (m, a, b, cc, dd) => {
    const f = porDia(a || b || cc || dd);
    f.forEach(x => c.dias.add(new Date(x + 'T00:00:00').getDay()));
    return f.length ? ' ' : m;
  });

  DIAS_RE.forEach((re, i) => { if (re.test(q)) c.dias.add(i); });
  if (FINDE_RE.test(q)) { c.dias.add(6); c.dias.add(0); }
  // "hoy" / "mañana" solo cuentan si caen en días del festival
  if (hoyISO) {
    const d = new Date(hoyISO + 'T12:00:00');
    const iso = n => new Date(d.getTime() + n * 864e5).toISOString().slice(0, 10);
    if (HOY_RE.test(q) && fechas.includes(iso(0))) c.dias.add(d.getDay());
    if (MANANA_RE.test(q) && fechas.includes(iso(1))) c.dias.add((d.getDay() + 1) % 7);
  }

  // Cortos antes que "corto/kurz/short" (duración)
  for (const [k, re] of Object.entries(TIPOS)) if (re.test(q)) { c.tipos.add(k); q = q.replace(re, ' '); }

  // Duración: "menos de 100 min", "unter 90 Minuten", "under 90 minutes", "até 95 min"
  q = q.replace(/(\d{2,3})\s*(?:min\w*)/g, (m, n) => { c.maxMin = Number(n); return ' '; });
  if (c.maxMin == null && /\b(corta|cortita|kurz\w*|short|curt[oa]|no muy larga|nicht zu lang|not too long|nao muito long[oa])\b/.test(q)) c.maxMin = 100;

  // Horas: "después de las 19", "nach 19 Uhr", "after 7pm", "ab 20", "antes de las 21", "um 20 Uhr", "8pm"
  const H = '(\\d{1,2})(?:[:.h](\\d{2}))?\\s*(am|pm|uhr|h)?\\b';
  q = q.replace(new RegExp('\\b(?:despues de(?: las)?|a partir de(?: las)?|desde las|nach|ab|after|from|depois das?|a partir das?)\\s+' + H, 'g'),
    (m, h, mi, suf) => { const v = horaDe(h, mi, suf); c.desde = Math.max(c.desde ?? 0, v); return ' '; });
  q = q.replace(new RegExp('\\b(?:antes de(?: las)?|hasta las|vor|bis|before|until|by|antes das?|ate as)\\s+' + H, 'g'),
    (m, h, mi, suf) => { const v = horaDe(h, mi, suf); c.hasta = Math.min(c.hasta ?? 24, v); return ' '; });
  // "a las 20", "um 20", "at 8" (con palabra delante) o "20 Uhr", "8pm", "20h" (con sufijo)
  const alrededor = (m, h, mi, suf) => { const v = horaDe(h, mi, suf); if (v < 10 || v > 24) return m; c.franjas.push([v - 1, v + 1.01]); return ' '; };
  q = q.replace(new RegExp('\\b(?:a las|sobre las|hacia las|um|gegen|at|around|as)\\s+' + H, 'g'), alrededor);
  q = q.replace(/\b(\d{1,2})(?:[:.h](\d{2}))?\s*(am|pm|uhr|h)\b/g, alrededor);
  FRANJAS.forEach(f => { if (f.re.test(q)) c.franjas.push(f.r); });

  for (const [k, g] of Object.entries(GENEROS)) if (g.re.test(q)) c.generos.add(k);

  // Referencias ("como David Lynch") y temas ("algo inquietante", "sobre migración")
  REFERENCIAS.forEach(r => { if (r.re.test(q)) { c.refs.push(r); q = q.replace(r.re, ' '); } });
  for (const [k, x] of Object.entries(TEMAS)) if (x.re.test(q)) c.temas.add(k);

  PAISES.forEach(p => { if (p.re.test(q)) c.paises.add(p.de); });
  ZONAS.forEach(z => {
    if (!z.re.test(q)) return;
    c.zonas.push(z);
    PAISES.filter(p => z.zonas.includes(p.zona)).forEach(p => c.paises.add(p.de));
  });

  // Título o apellido de dirección escritos tal cual
  peliculas.forEach(p => {
    const d = datosPelicula(p);
    const titulo = normalizar(p.titulo);
    if (titulo.length >= 5 && q.includes(titulo)) c.textos.push({ id: p.id, q: p.titulo });
    d.directores.forEach(dir => {
      const ap = normalizar(dir).split(' ').pop();
      if (ap.length >= 4 && new RegExp('\\b' + ap + '\\b').test(q)) c.textos.push({ id: p.id, q: dir });
    });
  });

  // Reparto: nombre completo o apellido
  peliculas.forEach(p => (p.reparto || []).forEach(nombre => {
    const n = normalizar(nombre), ap = n.split(' ').pop();
    if ((original.includes(n) || (ap.length >= 5 && new RegExp('\\b' + ap + '\\b').test(original))) && !c.reparto.includes(nombre)) c.reparto.push(nombre);
  }));

  // Palabras sueltas que quedan (para buscar en la trama): "guitarras", "cacao", "Iquique"…
  const quedan = q;
  c.palabras = [...new Set(quedan.split(/[^a-z0-9ñ]+/).filter(w => w.length >= 5 && !VACIAS.has(w) && !/^\d+$/.test(w)))]
    .filter(w => {
      const x = ' ' + w + ' ';
      const yaEntendida = [...DIAS_RE, FINDE_RE, HOY_RE, MANANA_RE, ...FRANJAS.map(f => f.re), ...Object.values(TIPOS),
        ...Object.values(TEMAS).map(v => v.re), ...Object.values(GENEROS).map(v => v.re), ...PAISES.map(v => v.re), ...ZONAS.map(v => v.re)]
        .some(re => re.test(x));
      const esNombre = [...c.textos.map(v => v.q), ...c.reparto].some(n => normalizar(n).includes(w));
      return !yaEntendida && !esNombre;
    });

  c.vacio = !c.refs.length && !c.temas.size && !c.reparto.length && !c.palabras.length && !c.dias.size && !c.franjas.length && c.desde == null && c.hasta == null && !c.tipos.size &&
    !c.generos.size && !c.paises.size && c.maxMin == null && !c.textos.length;
  return c;
}

// ---------- Puntuar ----------

function fmtHora(h) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return `${String(hh % 24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function evaluar(p, c, libres) {
  const d = datosPelicula(p);
  const si = [], no = [];
  let puntos = 0, total = 0;
  const dia = t('days_long')[d.dia];
  const hora = p.hora + t('time_suffix');

  if (c.dias.size) {
    total += 3;
    if (c.dias.has(d.dia)) { puntos += 3; si.push(t('r_day', { day: dia })); } else no.push(t('m_day', { day: dia }));
  }
  if (c.franjas.length || c.desde != null || c.hasta != null) {
    total += 2;
    const enFranja = !c.franjas.length || c.franjas.some(([a, b]) => d.hora >= a && d.hora < b);
    const ok = enFranja && d.hora >= (c.desde ?? 0) && d.hora < (c.hasta ?? 24.01);
    if (ok) { puntos += 2; si.push(t('r_time', { time: hora })); } else no.push(t('m_time', { time: hora }));
  }
  if (c.tipos.size) {
    total += 2;
    if (d.tipo && c.tipos.has(d.tipo)) { puntos += 2; si.push(t('r_type', { type: t('type_' + d.tipo) })); } else no.push(t('m_type'));
  }
  if (c.paises.size) {
    total += 2;
    const comunes = d.paises.filter(x => c.paises.has(x.de));
    if (comunes.length) { puntos += 2; si.push(t('r_country', { list: comunes.map(nombrePais).join(', ') })); } else no.push(t('m_country'));
  }
  if (c.generos.size) {
    total += 2;
    const comunes = d.generos.filter(g => c.generos.has(g));
    if (comunes.length) { puntos += 2; si.push(t('r_genre', { g: comunes.map(nombreGenero).join(', ') })); } else no.push(t('m_genre'));
  }
  if (c.maxMin != null && d.minutos) {
    total += 1;
    if (d.minutos <= c.maxMin) { puntos += 1; si.push(t('r_len', { n: d.minutos })); } else no.push(t('m_len', { n: d.minutos }));
  }
  // Afinidad (suma, pero no resta): referencias, temas, reparto y trama
  const suyos = new Set(d.temas);
  let afin = 0;
  c.refs.forEach(r => {
    const comunes = r.temas.filter(k => suyos.has(k));
    total += 3;
    if (comunes.length) { afin++; puntos += comunes.length; si.push(t('r_ref', { ref: r.nombre, list: comunes.map(nombreTema).join(', ') })); }
  });
  const pedidos = [...c.temas];
  if (pedidos.length) {
    total += 2 * pedidos.length;
    const comunes = pedidos.filter(k => suyos.has(k));
    if (comunes.length) { afin++; puntos += 2 * comunes.length; si.push(t('r_tema', { list: comunes.map(nombreTema).join(', ') })); }
  }
  const actores = c.reparto.filter(n => d.reparto.includes(n));
  if (c.reparto.length) total += 4;
  if (actores.length) { afin++; puntos += 4; si.unshift(t('r_cast', { name: actores.join(', ') })); }
  if (c.palabras.length) {
    const halladas = c.palabras.filter(w => new RegExp('\\b' + w.slice(0, Math.max(5, w.length - 2))).test(d.texto));
    total += 2;
    if (halladas.length) { afin++; puntos += Math.min(4, 2 * halladas.length); si.push(t('r_plot', { q: halladas.join(', ') })); }
  }

  const blandos = c.refs.length || c.temas.size || c.reparto.length || c.palabras.length;
  if (blandos && !afin) no.push(t('m_afin'));

  const texto = c.textos.find(x => x.id === p.id);
  if (texto) { puntos += 4; si.unshift(t('r_text', { q: texto.q })); }
  if (c.textos.length) total += 4;

  // Información práctica (no suma puntos, solo desempata)
  let extra;
  if (p.enlaceExterno) extra = t('r_online');
  else if (libres <= 0) extra = t('r_full');
  else extra = libres === 1 ? t('r_seats_one') : t('r_seats', { n: libres });

  return { p, puntos, total, si, no, extra, completo: !p.enlaceExterno && libres <= 0 };
}

// Devuelve { lista, exacto } con las mejores funciones para los criterios
function recomendar(c, peliculas, libresDe, hoyISO, max = 3) {
  const futuras = peliculas.filter(p => !hoyISO || p.fecha >= hoyISO);
  const res = futuras.map(p => evaluar(p, c, libresDe(p)))
    .filter(r => r.puntos > 0)
    .sort((a, b) => (b.puntos - a.puntos) || (a.completo - b.completo) ||
      (a.p.fecha + a.p.hora).localeCompare(b.p.fecha + b.p.hora));
  const exactas = res.filter(r => !r.no.length);
  return exactas.length
    ? { lista: exactas.slice(0, max), exacto: true, mas: Math.max(0, exactas.length - max) }
    : { lista: res.slice(0, max), exacto: false, mas: 0 };
}

// Etiquetas "He entendido: viernes · desde las 20:00 · Chile"
function resumenCriterios(c) {
  const out = [];
  [...c.dias].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).forEach(i => out.push(t('days_long')[i]));
  const r = h => Math.round(h * 4) / 4;
  c.franjas.forEach(([a, b]) => out.push(t('lbl_between', { a: fmtHora(r(a)), b: fmtHora(r(Math.min(b, 24))) })));
  if (c.desde != null) out.push(t('lbl_from', { t: fmtHora(c.desde) }));
  if (c.hasta != null) out.push(t('lbl_until', { t: fmtHora(c.hasta) }));
  c.tipos.forEach(k => out.push(t('type_' + k)));
  c.generos.forEach(k => out.push(nombreGenero(k)));
  const enZona = new Set(c.zonas.flatMap(z => PAISES.filter(p => z.zonas.includes(p.zona)).map(p => p.de)));
  c.zonas.forEach(z => out.push(z.n[LANG] || z.n.de));
  PAISES.filter(p => c.paises.has(p.de) && !enZona.has(p.de)).forEach(p => out.push(nombrePais(p)));
  if (c.maxMin != null) out.push(t('lbl_maxlen', { n: c.maxMin }));
  c.textos.forEach(x => out.push('«' + x.q + '»'));
  c.refs.forEach(r => out.push(t('lbl_ref', { ref: r.nombre })));
  c.temas.forEach(k => out.push(nombreTema(k)));
  c.reparto.forEach(n => out.push(n));
  c.palabras.forEach(w => out.push('«' + w + '»'));
  return [...new Set(out)];
}

// Países de América Latina que hay en el programa (para las sugerencias)
function paisesDelPrograma(peliculas) {
  const set = new Set(peliculas.flatMap(p => datosPelicula(p).paises.filter(x => x.zona === 'sur' || x.zona === 'centro').map(x => x.de)));
  return PAISES.filter(p => set.has(p.de));
}
