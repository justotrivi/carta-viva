import json, pathlib
R=pathlib.Path('/home/claude/carta-viva'); tpl=(R/'tools/lugar.tpl.html').read_text()
G='https://grupodelsolsas.com/wp-content/uploads/2017/'
H=lambda i:f'https://synergy.booking-channel.com/api/hotels/2446/medias/{i}'
E='https://cdn.shopify.com/s/files/1/0270/8193/2865/t/2/assets/'
WA='573175098738'
OTROS={
 'arz':{'href':'/arzobispado','f':H(101),'k':'Hotel boutique','n':'Casa del Arzobispado'},
 'bal':{'href':'/baluarte','f':G+'08/baluarte_02.jpg','k':'Bar · Restaurante · Tapas','n':'El Baluarte'},
 'epo':{'href':'/epoca','f':G+'10/slider03.jpg','k':'All-day café bar','n':'Época Café'}}
def build(out,v,cfg):
    s=tpl
    for k,val in v.items(): s=s.replace('{{'+k+'}}',val)
    s=s.replace('{{CONFIG}}',json.dumps(cfg,ensure_ascii=False))
    assert '{{' not in s, [l for l in s.split('\n') if '{{' in l][:3]
    (R/'public/invitaciones'/out).write_text(s)
# ---------- EL BALUARTE ----------
build('baluarte.html',dict(
 TITLE='El Baluarte San Francisco Javier · Cartagena',DESC='Atardeceres sobre la muralla, cocteles de autor, tapas del Caribe y música en vivo frente al mar.',
 OG=G+'08/baluarte_01.jpg',BG='#0D1119',BG2='#151B26',FG='#F3ECE2',MUTED='#A9A7A3',ACC='#E07A3F',ACC2='#F2B27A',LINE='rgba(224,122,63,.28)',BTNFG='#1A0D05',SHADE='rgba(13,17,25,.97)',
 LOGO=G+'08/baluarte_logo.gif',LOGOW='96',LOGOF='none',HOLA='Te esperamos al atardecer',
 H1='Donde el sol <em>se despide</em> de Cartagena',SUB='Bar, restaurante y tapas sobre el trozo más hermoso de la muralla, frente al mar Caribe.',CTA='Reservar mi mesa',
 HISTIMG=H(355),HEYE='Una muralla con historia',HTIT='Construido en 1630, <em>vivido cada noche</em>',
 HTXT='El Gobernador Francisco de Murga levantó este baluarte para defender la ciudad de los ataques enemigos. Desde 1987 Grupo Del Sol le hace honor con noches inolvidables, música en vivo y eventos que se quedan en la memoria.',
 EEYE='Lo que te espera',ETIT='La noche <em>en cinco tiempos</em>',GTIT='Así se vive <em>El Baluarte</em>',
 INFOIMG=G+'08/baluarte_01.jpg',ITIT='Llega <em>antes del atardecer</em>',ITXT='Sobre la muralla del Centro Histórico, frente al mar. Un paseo por la ciudad antigua y el sol cayendo al fondo: así empieza la noche.',INOTA='Recomendamos reservar, sobre todo fines de semana y temporada.',
 MAPS='https://www.google.com/maps/search/?api=1&query=El+Baluarte+San+Francisco+Javier+Cartagena',EXTRA='',
 FINALIMG=G+'08/baluarte_02.jpg',FEYE='Tu mesa frente al mar',FTIT='Ven a ver <em>caer el sol</em>',FTXT='Escríbenos y te guardamos la mejor mesa para el atardecer, una celebración o un evento privado.',FCTA='Reservar por WhatsApp',
 FSEC='<a class="btn btn-ghost" target="_blank" rel="noopener" href="https://www.hotelcasadelarzobispado.com/templates/cadenas/air/images/hotels/SYN2446/fiesta_info_es.pdf">Fiesta de fin de año</a>',
 REDES='<a target="_blank" rel="noopener" href="https://www.instagram.com/baluartesfj/">Instagram</a><a target="_blank" rel="noopener" href="https://baluartesfj.com/">Web</a>',
 BARX='La noche',BARC='Reservar'),
 dict(wa=WA,holaN='te esperamos al atardecer',
 hero=[G+'08/baluarte_02.jpg',G+'08/baluarte_01.jpg',H(355),G+'08/header01-1.jpg',H(365)],
 cinta=['Desde 1630','Atardeceres','Cocteles de autor','Tapas del Caribe','Música en vivo','Frente al mar'],
 anios=[[1630,'Construido'],[1987,'Abre El Baluarte']],
 exp=[{'n':'El atardecer','f':G+'08/baluarte_01.jpg','d':'Las puestas de sol más mágicas de Cartagena, vistas desde lo alto de la muralla.','w':'Hola, quiero reservar una mesa en El Baluarte para el atardecer.'},
  {'n':'Cocteles de autor','f':H(274),'d':'Coctelería de autor y una extensa carta de licores en un lugar único frente al mar Caribe.','w':'Hola, quiero reservar en El Baluarte para unos cocteles al atardecer.'},
  {'n':'Tapas del Caribe','f':H(349),'d':'Una propuesta de nuestro chef desde la tradición de la cocina colombiana, con sabores inspirados en el Caribe.','w':'Hola, quiero reservar para cenar en El Baluarte.'},
  {'n':'Música en vivo','f':G+'08/baluarte_02.jpg','d':'Música tropical en vivo mientras cae la noche y la cúpula de la Catedral se ilumina.','w':'Hola, quiero reservar una noche con música en vivo en El Baluarte.'},
  {'n':'Fin de año 2027','f':G+'08/header01-1.jpg','d':'Recibe el 2027 con música, gastronomía y la magia de Cartagena sobre la muralla.','w':'Hola, quiero información y reserva para la fiesta de fin de año en El Baluarte.','b':'Quiero mi cupo'}],
 gal=[[G+'08/baluarte_02.jpg','t'],[H(358),''],[H(271),''],[G+'08/header01-1.jpg','w'],[H(355),''],[H(272),'t'],[H(349),''],[G+'08/baluarte_01.jpg','w'],[H(273),''],[H(365),'']],
 info=[['Dónde','Sobre la muralla, Centro Histórico'],['Mejor momento','Al atardecer'],['Ambiente','Música en vivo'],['Eventos','Celebraciones privadas']],
 otros=[OTROS['arz'],OTROS['epo']],
 ctas=[{'w':'Hola, recibí la invitación de El Baluarte y quiero reservar una mesa.'},{'w':'Hola, quiero reservar mi mesa en El Baluarte San Francisco Javier.'},{'w':'Hola, quiero reservar en El Baluarte.'}]))
# ---------- ÉPOCA CAFÉ ----------
build('epoca.html',dict(
 TITLE='Época Café · Cartagena',DESC='El primer café de autor de Cartagena: cafés de origen, brunch, cocteles clásicos y una La Pavoni de los años 50.',
 OG=G+'10/slider03.jpg',BG='#F3EEE4',BG2='#EAE2D3',FG='#1C2B4A',MUTED='#5E6577',ACC='#1F3156',ACC2='#A8823F',LINE='rgba(28,43,74,.18)',BTNFG='#F3EEE4',SHADE='rgba(12,18,34,.95)',
 LOGO=G+'08/epoca_logo.gif',LOGOW='92',LOGOF='none',HOLA='Pasa, el café está listo',
 H1='El café que <em>Cartagena</em> esperaba',SUB='All-day café bar en el Centro Histórico: desayuno, almuerzo y cena, cafés especiales de origen y cocteles clásicos.',CTA='Reservar mesa',
 HISTIMG=E+'02_dUlF.jpg',HEYE='Desde 2017',HTIT='El primer café <em>de autor</em> de Cartagena',
 HTXT='Inspirado en los cafés tradicionales europeos, con la herencia colonial de la ciudad. El alma del lugar es una La Pavoni original de los años 50, restaurada, que brilla en su barra de mármol: solo existen 151 en el mundo.',
 EEYE='Lo que te espera',ETIT='Un día entero <em>en Época</em>',GTIT='Cada taza <em>cuenta algo</em>',
 INFOIMG=E+'01_756G.jpg',ITIT='Te esperamos <em>todo el día</em>',ITXT='En el corazón del Centro Histórico de Cartagena.',INOTA='Horario de Época Cartagena publicado en su web.',
 MAPS='https://www.google.com/maps/search/?api=1&query=%C3%89poca+Caf%C3%A9+Cartagena',
 EXTRA='<a class="btn btn-ghost" target="_blank" rel="noopener" href="https://epocacafe.co/collections/cafe-epoca-con-envio-en-colombia">Café a tu casa</a>',
 FINALIMG=G+'10/slider03.jpg',FEYE='Tu mesa te espera',FTIT='Ven por <em>un café</em>',FTXT='Brunch, café de origen o un coctel clásico al final del día. Escríbenos y te guardamos la mesa.',FCTA='Reservar por WhatsApp',
 FSEC='<a class="btn btn-ghost" target="_blank" rel="noopener" href="https://epocacafe.co/">Ver la web</a>',
 REDES='<a target="_blank" rel="noopener" href="https://www.instagram.com/weare.epoca/">Instagram</a><a target="_blank" rel="noopener" href="https://epocacafe.co/collections/cafe-epoca-con-envio-en-colombia">Tienda de café</a>',
 BARX='El día',BARC='Reservar'),
 dict(wa=WA,holaN='pasa, el café está listo',
 hero=[G+'10/slider03.jpg',E+'01_756G.jpg',H(109),'https://epocacafe.co/cdn/shop/files/cafe2_2048x.png',H(118)],
 cinta=['Café de origen','Brunch','Cocteles clásicos','La Pavoni de los 50','Centro Histórico','Desde 2017'],
 anios=[[2017,'Abrió sus puertas'],[151,'La Pavoni en el mundo']],
 exp=[{'n':'Brunch','f':H(113),'d':'Desayunos y brunch con sabores locales, además de platos internacionales, buena música y gran ambiente.','w':'Hola, quiero reservar para un brunch en Época Café.'},
  {'n':'Café de origen','f':'https://epocacafe.co/cdn/shop/files/cafe2_2048x.png','d':'Especialistas en cafés especiales de origen, preparados con dedicación en cada detalle.','w':'Hola, quiero ir a Época Café a probar sus cafés de origen.'},
  {'n':'La Pavoni','f':G+'10/slider03.jpg','d':'Una máquina original de los años 50, restaurada, en el centro de la barra de mármol. Solo hay 151 en el mundo.','w':'Hola, quiero reservar una mesa en Época Café.'},
  {'n':'Cocteles clásicos','f':G+'08/epoca_01.jpg','d':'Al caer la tarde, Época se vuelve bar: cocteles clásicos y buenos tragos.','w':'Hola, quiero reservar en Época Café para unos cocteles.'},
  {'n':'Café a tu casa','f':G+'08/epoca_02.jpg','d':'Café fresco, recién tostado, con envío en Colombia.','href':'https://epocacafe.co/collections/cafe-epoca-con-envio-en-colombia','b':'Comprar café'}],
 gal=[[E+'02_dUlF.jpg','t'],[H(109),''],[H(110),''],[G+'10/slider03.jpg','w'],[H(111),''],[E+'03_XdoW.jpg','t'],[H(115),''],[G+'08/epoca_02.jpg','w'],[H(117),''],[H(118),'']],
 info=[['Lunes a miércoles','7:30 a. m. – 9 p. m.'],['Jueves a sábado','7:30 a. m. – 10 p. m.'],['Domingos y festivos','7:30 a. m. – 6 p. m.']],
 otros=[OTROS['arz'],OTROS['bal']],
 ctas=[{'w':'Hola, recibí la invitación de Época Café y quiero reservar una mesa.'},{'w':'Hola, quiero reservar una mesa en Época Café.'},{'w':'Hola, quiero reservar en Época Café.'}]))
print('ok')
