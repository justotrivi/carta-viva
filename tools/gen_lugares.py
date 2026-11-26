"""Genera las páginas bilingües (ES/EN) de El Baluarte y Época Café desde lugar.tpl.html."""
import json, pathlib
R = pathlib.Path('/home/claude/carta-viva'); tpl = (R/'tools/lugar.tpl.html').read_text()
G = 'https://grupodelsolsas.com/wp-content/uploads/2017/'
H = lambda i: f'https://synergy.booking-channel.com/api/hotels/2446/medias/{i}'
E = 'https://cdn.shopify.com/s/files/1/0270/8193/2865/t/2/assets/'
# WhatsApp de reservas de cada lugar (confirmados por Justo, 26 nov 2026)
WA = {'baluarte.html': '573174288954', 'epoca.html': '573008656816'}

COMUN = {
 'es': dict(back='← Grupo Del Sol', descubrir='Descubrir', asoma='Asómate', visita='Para tu visita', llegar='Cómo llegar',
            tambien='Conoce <em>también</em>', by='EXPERIENCIA DIGITAL · <b>SOCIAL</b>', quiero='Quiero esto', soy=' (Soy {n})'),
 'en': dict(back='← Grupo Del Sol', descubrir='Discover', asoma='Take a look', visita='Plan your visit', llegar='Get directions',
            tambien='Discover <em>more</em>', by='DIGITAL EXPERIENCE · <b>SOCIAL</b>', quiero='I want this', soy=' (My name is {n})'),
}
OTROS_T = {
 'arz': {'es': ['Hotel boutique', 'Casa del Arzobispado'], 'en': ['Boutique hotel', 'Casa del Arzobispado']},
 'bal': {'es': ['Bar · Restaurante · Tapas', 'El Baluarte'], 'en': ['Bar · Restaurant · Tapas', 'El Baluarte']},
 'epo': {'es': ['All-day café bar', 'Época Café'], 'en': ['All-day café bar', 'Época Café']},
}
OTROS_C = {'arz': {'href': '/arzobispado', 'f': H(101)}, 'bal': {'href': '/baluarte', 'f': G+'08/baluarte_02.jpg'},
           'epo': {'href': '/epoca', 'f': G+'10/slider03.jpg'}}

def build(out, theme, C, T, otros):
    C = dict(C, wa=WA[out], otros=[OTROS_C[o] for o in otros])
    for l in ('es', 'en'):
        T[l] = {**COMUN[l], **T[l], 'otros': [OTROS_T[o][l] for o in otros]}
        assert len(T[l]['exp']) == len(C['exp']) and len(T[l]['anios']) == len(C['anios']) and len(T[l]['redes']) == len(C['redes']), (out, l)
    s = tpl
    for k, v in theme.items(): s = s.replace('{{'+k+'}}', v)
    s = s.replace('{{T}}', json.dumps(T, ensure_ascii=False)).replace('{{C}}', json.dumps(C, ensure_ascii=False))
    assert '{{' not in s, [l for l in s.split('\n') if '{{' in l][:3]
    (R/'public/invitaciones'/out).write_text(s)

# ---------------- EL BALUARTE ----------------
build('baluarte.html',
 dict(TITLE='El Baluarte San Francisco Javier · Cartagena', DESC='Atardeceres sobre la muralla, cocteles de autor, tapas del Caribe y música en vivo frente al mar. · Sunsets on the city walls, signature cocktails and live music by the sea.',
      OG=G+'08/baluarte_01.jpg', BG='#0D1119', BG2='#151B26', FG='#F3ECE2', MUTED='#A9A7A3', ACC='#E07A3F', ACC2='#F2B27A', LINE='rgba(224,122,63,.28)', BTNFG='#1A0D05', SHADE='rgba(13,17,25,.97)',
      LOGO=G+'08/baluarte_logo.gif', LOGOW='96', HISTIMG=H(355), INFOIMG=G+'08/baluarte_01.jpg', FINALIMG=G+'08/baluarte_02.jpg',
      MAPS='https://www.google.com/maps/search/?api=1&query=El+Baluarte+San+Francisco+Javier+Cartagena'),
 dict(hero=[G+'08/baluarte_02.jpg', G+'10/slider04-1.jpg', G+'08/baluarte_01.jpg', H(355)],
      anios=[1630, 1987],
      exp=[{'f': G+'08/baluarte_01.jpg'}, {'f': G+'08/header01-1.jpg'}, {'f': G+'10/slider04-1.jpg'}, {'f': G+'08/baluarte_02.jpg'}, {'f': H(365)}],
      gal=[[G+'08/baluarte_02.jpg', 't'], [G+'10/slider04-1.jpg', 'w'], [G+'08/baluarte_01.jpg', ''], [H(355), ''], [G+'08/header01-1.jpg', 'w'], [H(365), 'w']],
      redes=['https://www.instagram.com/baluartesfj/', 'https://baluartesfj.com/'],
      extraHref='', fsecHref='https://www.hotelcasadelarzobispado.com/templates/cadenas/air/images/hotels/SYN2446/fiesta_info_es.pdf'),
 {'es': dict(
    hola='Te esperamos al atardecer', holaN='te esperamos al atardecer',
    h1='Donde el sol <em>se despide</em> de Cartagena', sub='Bar, restaurante y tapas sobre el trozo más hermoso de la muralla, frente al mar Caribe.', cta='Reservar mi mesa',
    cinta=['Desde 1630', 'Atardeceres', 'Cocteles de autor', 'Tapas del Caribe', 'Música en vivo', 'Frente al mar'],
    heye='Una muralla con historia', htit='Construido en 1630, <em>vivido cada noche</em>',
    htxt='El Gobernador Francisco de Murga levantó este baluarte para defender la ciudad de los ataques enemigos. Desde 1987 Grupo Del Sol le hace honor con noches inolvidables, música en vivo y eventos que se quedan en la memoria.',
    anios=['Construido', 'Abre El Baluarte'],
    eeye='Lo que te espera', etit='La noche <em>en cinco tiempos</em>',
    exp=[dict(n='El atardecer', d='Las puestas de sol más mágicas de Cartagena, vistas desde lo alto de la muralla.', w='Hola, quiero reservar una mesa en El Baluarte para el atardecer.'),
         dict(n='Cocteles de autor', d='Coctelería de autor y una extensa carta de licores en un lugar único frente al mar Caribe.', w='Hola, quiero reservar en El Baluarte para unos cocteles al atardecer.'),
         dict(n='Tapas del Caribe', d='Una propuesta de nuestro chef desde la tradición de la cocina colombiana, con sabores inspirados en el Caribe, bajo las luces de la muralla.', w='Hola, quiero reservar para cenar en El Baluarte.'),
         dict(n='Música en vivo', d='Música tropical en vivo mientras cae la noche y la cúpula de la Catedral se ilumina.', w='Hola, quiero reservar una noche con música en vivo en El Baluarte.'),
         dict(n='Fin de año 2027', d='Recibe el 2027 con música, gastronomía y la magia de Cartagena sobre la muralla.', w='Hola, quiero información y reserva para la fiesta de fin de año en El Baluarte.', b='Quiero mi cupo')],
    gtit='Así se vive <em>El Baluarte</em>',
    itit='Llega <em>antes del atardecer</em>', itxt='Sobre la muralla del Centro Histórico, frente al mar. Un paseo por la ciudad antigua y el sol cayendo al fondo: así empieza la noche.',
    info=[['Dónde', 'Sobre la muralla, Centro Histórico'], ['Mejor momento', 'Al atardecer'], ['Ambiente', 'Música en vivo'], ['Eventos', 'Celebraciones privadas']],
    inota='Recomendamos reservar, sobre todo fines de semana y temporada.', extra='',
    feye='Tu mesa frente al mar', ftit='Ven a ver <em>caer el sol</em>', ftxt='Escríbenos y te guardamos la mejor mesa para el atardecer, una celebración o un evento privado.',
    fcta='Reservar por WhatsApp', fsec='Fiesta de fin de año', redes=['Instagram', 'Web'], barx='La noche', barc='Reservar',
    ctas=['Hola, recibí la invitación de El Baluarte y quiero reservar una mesa.', 'Hola, quiero reservar mi mesa en El Baluarte San Francisco Javier.', 'Hola, quiero reservar en El Baluarte.']),
  'en': dict(
    hola='See you at sunset', holaN='we’ll see you at sunset',
    h1='Where the sun <em>says goodbye</em> to Cartagena', sub='Bar, restaurant and tapas on the most beautiful stretch of the city walls, facing the Caribbean Sea.', cta='Book my table',
    cinta=['Since 1630', 'Sunsets', 'Signature cocktails', 'Caribbean tapas', 'Live music', 'By the sea'],
    heye='A wall with a story', htit='Built in 1630, <em>alive every night</em>',
    htxt='Governor Francisco de Murga raised this bastion to defend the city from enemy attacks. Since 1987, Grupo Del Sol has honored it with unforgettable nights, live music and events that stay with you.',
    anios=['Built', 'El Baluarte opens'],
    eeye='What awaits you', etit='The night <em>in five moments</em>',
    exp=[dict(n='The sunset', d='Cartagena’s most magical sunsets, seen from the top of the colonial wall.', w='Hi, I’d like to book a sunset table at El Baluarte.'),
         dict(n='Signature cocktails', d='Signature mixology and an extensive spirits list in a one-of-a-kind spot facing the Caribbean.', w='Hi, I’d like to book at El Baluarte for sunset cocktails.'),
         dict(n='Caribbean tapas', d='Our chef’s menu, rooted in Colombian culinary tradition with Caribbean-inspired flavors, under the lights of the old wall.', w='Hi, I’d like to book a dinner table at El Baluarte.'),
         dict(n='Live music', d='Live tropical music as night falls and the Cathedral dome lights up.', w='Hi, I’d like to book a night with live music at El Baluarte.'),
         dict(n='New Year’s Eve 2027', d='Ring in 2027 with music, great food and the magic of Cartagena on the city walls.', w='Hi, I’d like information and a reservation for the New Year’s Eve party at El Baluarte.', b='Save my spot')],
    gtit='This is <em>El Baluarte</em>',
    itit='Arrive <em>before sunset</em>', itxt='On the walls of the Historic Center, facing the sea. A stroll through the old city with the sun going down: that’s how the night begins.',
    info=[['Where', 'On the city walls, Historic Center'], ['Best time', 'At sunset'], ['Vibe', 'Live music'], ['Events', 'Private celebrations']],
    inota='We recommend booking ahead, especially on weekends and in high season.', extra='',
    feye='Your table by the sea', ftit='Come watch <em>the sun go down</em>', ftxt='Message us and we’ll save you the best table for sunset, a celebration or a private event.',
    fcta='Book on WhatsApp', fsec='New Year’s Eve party', redes=['Instagram', 'Website'], barx='The night', barc='Book',
    ctas=['Hi, I received the El Baluarte invitation and I’d like to book a table.', 'Hi, I’d like to book my table at El Baluarte San Francisco Javier.', 'Hi, I’d like to book at El Baluarte.'])},
 ['arz', 'epo'])

# ---------------- ÉPOCA CAFÉ ----------------
build('epoca.html',
 dict(TITLE='Época Café · Cartagena', DESC='El primer café de autor de Cartagena: cafés de origen, brunch y cocteles clásicos. · Cartagena’s first specialty café: single-origin coffee, brunch and classic cocktails.',
      OG=G+'10/slider03.jpg', BG='#F3EEE4', BG2='#EAE2D3', FG='#1C2B4A', MUTED='#5E6577', ACC='#1F3156', ACC2='#A8823F', LINE='rgba(28,43,74,.18)', BTNFG='#F3EEE4', SHADE='rgba(12,18,34,.95)',
      LOGO=G+'08/epoca_logo.gif', LOGOW='92', HISTIMG=E+'02_dUlF.jpg', INFOIMG=E+'01_756G.jpg', FINALIMG=G+'10/slider03.jpg',
      MAPS='https://www.google.com/maps/search/?api=1&query=%C3%89poca+Caf%C3%A9+Cartagena'),
 dict(hero=[G+'10/slider03.jpg', E+'01_756G.jpg', H(109), 'https://epocacafe.co/cdn/shop/files/cafe2_2048x.png', H(118)],
      anios=[2017, 151],
      exp=[{'f': H(113)}, {'f': 'https://epocacafe.co/cdn/shop/files/cafe2_2048x.png'}, {'f': G+'10/slider03.jpg'}, {'f': G+'08/epoca_01.jpg'},
           {'f': G+'08/epoca_02.jpg', 'href': 'https://epocacafe.co/collections/cafe-epoca-con-envio-en-colombia'}],
      gal=[[E+'02_dUlF.jpg', 't'], [H(109), ''], [H(110), ''], [G+'10/slider03.jpg', 'w'], [H(111), ''], [E+'03_XdoW.jpg', 't'], [H(115), ''], [G+'08/epoca_02.jpg', 'w'], [H(117), ''], [H(118), '']],
      redes=['https://www.instagram.com/weare.epoca/', 'https://epocacafe.co/collections/cafe-epoca-con-envio-en-colombia'],
      extraHref='https://epocacafe.co/collections/cafe-epoca-con-envio-en-colombia', fsecHref='https://epocacafe.co/'),
 {'es': dict(
    hola='Pasa, el café está listo', holaN='pasa, el café está listo',
    h1='El café que <em>Cartagena</em> esperaba', sub='All-day café bar en el Centro Histórico: desayuno, almuerzo y cena, cafés especiales de origen y cocteles clásicos.', cta='Reservar mesa',
    cinta=['Café de origen', 'Brunch', 'Cocteles clásicos', 'La Pavoni de los 50', 'Centro Histórico', 'Desde 2017'],
    heye='Desde 2017', htit='El primer café <em>de autor</em> de Cartagena',
    htxt='Inspirado en los cafés tradicionales europeos, con la herencia colonial de la ciudad. El alma del lugar es una La Pavoni original de los años 50, restaurada, que brilla en su barra de mármol: solo existen 151 en el mundo.',
    anios=['Abrió sus puertas', 'La Pavoni en el mundo'],
    eeye='Lo que te espera', etit='Un día entero <em>en Época</em>',
    exp=[dict(n='Brunch', d='Desayunos y brunch con sabores locales, además de platos internacionales, buena música y gran ambiente.', w='Hola, quiero reservar para un brunch en Época Café.'),
         dict(n='Café de origen', d='Especialistas en cafés especiales de origen, preparados con dedicación en cada detalle.', w='Hola, quiero ir a Época Café a probar sus cafés de origen.'),
         dict(n='La Pavoni', d='Una máquina original de los años 50, restaurada, en el centro de la barra de mármol. Solo hay 151 en el mundo.', w='Hola, quiero reservar una mesa en Época Café.'),
         dict(n='Cocteles clásicos', d='Al caer la tarde, Época se vuelve bar: cocteles clásicos y buenos tragos.', w='Hola, quiero reservar en Época Café para unos cocteles.'),
         dict(n='Café a tu casa', d='Café fresco, recién tostado, con envío en Colombia.', b='Comprar café')],
    gtit='Cada taza <em>cuenta algo</em>',
    itit='Te esperamos <em>todo el día</em>', itxt='En el corazón del Centro Histórico de Cartagena.',
    info=[['Lunes a miércoles', '7:30 a. m. – 9 p. m.'], ['Jueves a sábado', '7:30 a. m. – 10 p. m.'], ['Domingos y festivos', '7:30 a. m. – 6 p. m.']],
    inota='Horario de Época Cartagena publicado en su web.', extra='Café a tu casa',
    feye='Tu mesa te espera', ftit='Ven por <em>un café</em>', ftxt='Brunch, café de origen o un coctel clásico al final del día. Escríbenos y te guardamos la mesa.',
    fcta='Reservar por WhatsApp', fsec='Ver la web', redes=['Instagram', 'Tienda de café'], barx='El día', barc='Reservar',
    ctas=['Hola, recibí la invitación de Época Café y quiero reservar una mesa.', 'Hola, quiero reservar una mesa en Época Café.', 'Hola, quiero reservar en Época Café.']),
  'en': dict(
    hola='Come in, the coffee’s ready', holaN='come in, the coffee’s ready',
    h1='The café <em>Cartagena</em> was waiting for', sub='All-day café bar in the Historic Center: breakfast, lunch and dinner, single-origin specialty coffee and classic cocktails.', cta='Book a table',
    cinta=['Single-origin coffee', 'Brunch', 'Classic cocktails', '1950s La Pavoni', 'Historic Center', 'Since 2017'],
    heye='Since 2017', htit='Cartagena’s first <em>specialty café</em>',
    htxt='Inspired by traditional European cafés, with the city’s colonial heritage. Its soul is an original 1950s La Pavoni, restored and shining on the marble bar: only 151 exist in the world.',
    anios=['Opened its doors', 'La Pavoni machines in the world'],
    eeye='What awaits you', etit='A whole day <em>at Época</em>',
    exp=[dict(n='Brunch', d='Breakfast and brunch with local flavors, plus international dishes, good music and a great atmosphere.', w='Hi, I’d like to book a brunch table at Época Café.'),
         dict(n='Single-origin coffee', d='Specialists in single-origin specialty coffee, prepared with care in every detail.', w='Hi, I’d like to visit Época Café and try your single-origin coffee.'),
         dict(n='La Pavoni', d='An original 1950s machine, restored, at the heart of the marble bar. Only 151 exist in the world.', w='Hi, I’d like to book a table at Época Café.'),
         dict(n='Classic cocktails', d='As the afternoon fades, Época turns into a bar: classic cocktails and great drinks.', w='Hi, I’d like to book at Época Café for cocktails.'),
         dict(n='Coffee to your door', d='Fresh, just-roasted coffee, shipped within Colombia.', b='Shop coffee')],
    gtit='Every cup <em>tells a story</em>',
    itit='We’re here <em>all day</em>', itxt='In the heart of Cartagena’s Historic Center.',
    info=[['Monday to Wednesday', '7:30 a.m. – 9 p.m.'], ['Thursday to Saturday', '7:30 a.m. – 10 p.m.'], ['Sundays and holidays', '7:30 a.m. – 6 p.m.']],
    inota='Época Cartagena opening hours as published on its website.', extra='Coffee to your door',
    feye='Your table awaits', ftit='Come for <em>a coffee</em>', ftxt='Brunch, single-origin coffee or a classic cocktail at the end of the day. Message us and we’ll save you a table.',
    fcta='Book on WhatsApp', fsec='Visit the website', redes=['Instagram', 'Coffee shop'], barx='The day', barc='Book',
    ctas=['Hi, I received the Época Café invitation and I’d like to book a table.', 'Hi, I’d like to book a table at Época Café.', 'Hi, I’d like to book at Época Café.'])},
 ['arz', 'bal'])
print('ok')
