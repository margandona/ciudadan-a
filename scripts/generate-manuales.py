# -*- coding: utf-8 -*-
"""Genera los manuales en PDF (UTP/Evaluador, PIE y Estudiantes)."""
import os
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    ListFlowable, ListItem,
)
from reportlab.lib.styles import ParagraphStyle

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "..", "docs", "manuales")
os.makedirs(OUT, exist_ok=True)
MEMBRETE = os.path.join(ROOT, "..", "functions", "assets", "Imagen1.png")

URL = "https://ciudadania-lab.web.app"
INST = "Colegio La Providencia · Ovalle — Educación Ciudadana"
PLAT = "Observatorio Ciudadano · Ovalle 2035"

DARK = HexColor("#123a5f")
LINE = HexColor("#9fb3c8")
SOFT = HexColor("#eef3f8")
GREEN = HexColor("#1e7d46")
AMBER = HexColor("#b45309")
RED = HexColor("#b3261e")

def S(name, **kw):
    base = {
        "fontName": "Helvetica",
        "fontSize": 10,
        "leading": 14,
        "textColor": HexColor("#1a1a1a"),
        "alignment": TA_LEFT,
    }
    base.update(kw)
    return ParagraphStyle(name, **base)

st_title = S("title", fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=DARK)
st_sub = S("sub", fontName="Helvetica-Oblique", fontSize=11, leading=15, textColor=HexColor("#444444"))
st_h1 = S("h1", fontName="Helvetica-Bold", fontSize=14, leading=18, textColor=DARK, spaceBefore=14, spaceAfter=6)
st_h2 = S("h2", fontName="Helvetica-Bold", fontSize=11.5, leading=15, textColor=HexColor("#0e4a7a"), spaceBefore=10, spaceAfter=4)
st_body = S("body")
st_bullet = S("bullet", leftIndent=14, bulletIndent=4, spaceAfter=3)
st_code = S("code", fontName="Courier", fontSize=10, leading=14, textColor=DARK)
st_tip = S("tip", fontSize=9.5, leading=13)
st_table = S("table", fontSize=9, leading=12)

def h1(text):
    return Paragraph(text, st_h1)

def h2(text):
    return Paragraph(text, st_h2)

def body(text):
    return Paragraph(text, st_body)

def bullets(items):
    return ListFlowable(
        [ListItem(Paragraph(i, st_bullet), leftIndent=14) for i in items],
        bulletType="bullet", start="•", leftIndent=10,
    )

def callout(text, color=DARK, bg=SOFT, title=None):
    inner = []
    if title:
        inner.append(Paragraph("<b>" + title + "</b>", S("ct", fontName="Helvetica-Bold", fontSize=9.5, leading=12, textColor=color)))
    inner.append(Paragraph(text, st_tip))
    t = Table([[inner]], colWidths=[17.2 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.8, color),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return [Spacer(1, 6), t, Spacer(1, 6)]

def cred_table(rows, header=None, widths=None):
    data = []
    if header:
        data.append([Paragraph("<b>" + c + "</b>", st_table) for c in header])
    for r in rows:
        data.append([Paragraph(str(c), st_table) for c in r])
    if not widths:
        widths = [6.2 * cm, 6.2 * cm, 4.8 * cm]
    t = Table(data, colWidths=widths)
    style = [
        ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if header:
        style.append(("BACKGROUND", (0, 0), (-1, 0), DARK))
    t.setStyle(TableStyle(style))
    return t

def header_footer(canvas, doc):
    canvas.saveState()
    w, h = LETTER
    canvas.setFillColor(SOFT)
    canvas.rect(0, h - 2.1 * cm, w, 2.1 * cm, stroke=0, fill=1)
    canvas.setFillColor(DARK)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(1.8 * cm, h - 1.2 * cm, INST)
    canvas.setFont("Helvetica", 8.5)
    canvas.drawString(1.8 * cm, h - 1.6 * cm, PLAT)
    canvas.drawRightString(w - 1.8 * cm, h - 1.35 * cm, URL)
    if os.path.exists(MEMBRETE):
        try:
            from reportlab.lib.utils import ImageReader
            canvas.drawImage(MEMBRETE, 1.8 * cm, h - 2.0 * cm, width=1.4 * cm, height=1.9 * cm, preserveAspectRatio=True)
        except Exception:
            pass
    canvas.setFillColor(DARK)
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(w / 2.0, 1.0 * cm, "Página " + str(doc.page))
    canvas.setFillColor(HexColor("#5b6572"))
    canvas.setFont("Helvetica", 7.5)
    canvas.drawCentredString(w / 2.0, 1.5 * cm, "Providencia Ciudadanía Lab — " + URL)
    canvas.restoreState()

def flatten(items):
    out = []
    for it in items:
        if isinstance(it, (list, tuple)):
            out.extend(flatten(it))
        else:
            out.append(it)
    return out

def build(file_name, title, subtitle, story):
    doc = BaseDocTemplate(
        os.path.join(OUT, file_name),
        pagesize=LETTER,
        leftMargin=1.8 * cm, rightMargin=1.8 * cm,
        topMargin=2.4 * cm, bottomMargin=1.8 * cm,
        title=title, author="Colegio La Providencia",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="f")
    doc.addPageTemplates([PageTemplate(id="pt", frames=[frame], onPage=header_footer)])
    cover = [Spacer(1, 0.4 * cm), Paragraph(title, st_title), Spacer(1, 4), Paragraph(subtitle, st_sub), Spacer(1, 10)]
    doc.build(cover + flatten(story))

TEST_STUDENTS_HEADER = ["Cuenta", "Nombre a elegir", "Clave (RUT sin puntos ni guiones)"]
TEST_STUDENTS_ROWS = [
    ["Curso D · Prueba 1", "Estudiante Prueba 1 D", "111111111"],
    ["Curso D · Prueba 2", "Estudiante Prueba 2 D", "222222222"],
    ["Curso D · Prueba 3", "Estudiante Prueba 3 D", "333333333"],
    ["Curso E · Prueba 1", "Estudiante Prueba 1 E", "111111111"],
    ["Curso E · Prueba 2", "Estudiante Prueba 2 E", "222222222"],
]

HOW_PLATFORM = (
    "La plataforma combina un recorrido de <b>12 misiones</b> (gamificadas desde la 7) con guías de trabajo "
    "que las estudiantes leen o descargan en la app, aulas invertidas para preparar en casa, evaluación de evidencias "
    "con retroalimentación, quiz en vivo, medallero y analítica."
)

# ===========================================================================
# 1) UTP / EVALUADOR
# ===========================================================================
story = []
story.extend(callout(
    "Este manual explica tu rol y cómo funciona hoy la plataforma. "
    "La plataforma está disponible en <b>" + URL + "</b>.",
    title="Bienvenido/a",
))
story.extend([
    h1("1. Cómo funciona hoy la plataforma"),
    body(HOW_PLATFORM),
    h2("Zonas que la componen"),
    cred_table([
        ["Docente", "Dashboard del curso, plan de la clase, centro de misiones, evidencias, quizzes, seguimiento en vivo, analítica, materiales"],
        ["Estudiante", "Misiones y aulas invertidas, guías en la app (leer/escuchar/descargar), evidencias, tickets, medallero y quiz en vivo"],
        ["Revisión", "Flujo de materiales entre docente, evaluador/a, PIE y UTP hasta «Listo para imprimir»"],
    ], header=["Zona", "Qué incluye"], widths=[4.4 * cm, 12.8 * cm]),
    h2("Novedades (versión 0.20)"),
    bullets([
        "<b>Granja Ciudadana</b>: las estudiantes cultivan su parcela, la decoran con ayudantes, animalitos y accesorios, ganan XP y suben de nivel; incluye una casa con estilos y pisos.",
        "<b>Otorgamientos del docente</b>: desde el perfil de cada estudiante se pueden otorgar <b>medallas manuales</b> (comportamiento, colaboración, mérito, esfuerzo…) y <b>regalar avatares y objetos</b> de la Granja.",
        "<b>Notificaciones</b>: cada recompensa (XP, medallas, regalos, subida de nivel) genera un aviso dentro de la app.",
    ]),
    h1("2. ¿Cómo ingreso?"),
    body("1) Abre el navegador y entra a la plataforma:"),
    Paragraph(URL, st_code),
    body("2) En la página de inicio elige la pestaña <b>«Docente / equipo»</b>."),
    body("3) Escribe tu correo institucional y tu contraseña, y pulsa «Entrar»."),
    h2("Credenciales de acceso (UTP y Evaluador/a)"),
    cred_table([
        ["Evaluadora", "evaluador@demo.cl", "Demo1234"],
        ["UTP", "utp@demo.cl", "Demo1234"],
        ["Profesor/a", "profesor@demo.cl", "Demo1234"],
    ], header=["Rol", "Correo", "Contraseña"]),
    Spacer(1, 8),
])
story.extend(callout("Guarda estas credenciales en un lugar seguro. No las compartas con estudiantes.", title="Seguridad", color=RED))
story.extend([
    h1("3. Revisar materiales (tu flujo principal)"),
    h2("Dónde"),
    bullets([
        "Menú <b>«Materiales»</b>: revisa los que están <b>«Enviados a revisión»</b> o <b>«En revisión»</b>.",
        "Abre cada material con <b>«Ver»</b>: verás currículo (OA, objetivo, indicadores), el documento completo (contenido, lecturas, actividades, espacios de respuesta) y las versiones.",
    ]),
    h2("Qué revisas"),
    bullets([
        "Guías de trabajo por clase (ahora con lectura, preguntas de comprensión, tareas con fuentes externas y espacios para responder).",
        "Aulas invertidas y contenidos de las misiones (7–12 con retos de laboratorio).",
        "Evaluaciones (U3 y U4, de 70 minutos), versiones DUA, solucionarios y rúbricas.",
        "Presentaciones/proyecciones de cada clase.",
    ]),
    h2("Tu decisión"),
    bullets([
        "Escribe tu <b>comentario</b> indicando la sección (p. ej. «Lectura», «Ítem 3», «Espacio de respuesta»).",
        "Elige: <b>Aprobar</b>, <b>Con observaciones</b> o <b>Solicitar cambios</b>.",
    ]),
    h2("Estados del material"),
    cred_table([
        ["Borrador", "Lo edita el/la docente; aún no está en revisión"],
        ["Enviado / En revisión", "Espera tu revisión y la de otros roles"],
        ["Con observaciones / Requiere cambios", "El/la docente debe corregir y reenviar"],
        ["Aprobado final", "Todas las revisiones obligatorias fueron aprobadas"],
        ["Listo para imprimir", "Puede imprimirse (gate institucional)"],
    ], header=["Estado", "Qué significa"]),
    h2("Descargar material"),
    bullets([
        "Cada material tiene botones <b>«Descargar PDF»</b> y <b>«Descargar DOCX»</b>.",
        "Para descargar todo de una vez usa <b>«Descargar todo (PDF/DOCX)»</b>: genera un ZIP ordenado con un <b>00_INDICE.txt</b>.",
    ]),
    h2("Plazos"),
    bullets([
        "Envío al evaluador/a: al menos <b>7 días</b> antes de la clase.",
        "«Listo para imprimir»: al menos <b>3 días</b> antes de la clase.",
    ]),
    h1("4. Ver el sitio como lo ve una docente y una estudiante"),
    body("Para comprobar la experiencia completa, cierra sesión y entra como <b>profesor/a</b> (revisar «Plan de la clase», "
         "«Seguimiento en vivo», «Evidencias» y «Guía para llevar la clase») y luego como <b>estudiante</b> "
         "para abrir una guía en la app y descargarla:"),
    h2("Estudiantes de prueba (para revisar el material)"),
    cred_table(TEST_STUDENTS_ROWS, header=TEST_STUDENTS_HEADER),
    Spacer(1, 8),
])
story.extend(callout("La clave de las estudiantes es su RUT sin puntos ni guiones. En las cuentas de prueba la clave es el número indicado.",
                     title="Recordatorio", color=AMBER))
story.extend([
    h1("5. Preguntas frecuentes"),
    bullets([
        "No veo el material pendiente: revisa que estés con tu rol correcto en «Materiales».",
        "«Listo para imprimir» no funciona: todas las revisiones obligatorias deben estar aprobadas.",
        "Quiero ver cómo se ve una guía: abre la misión en la vista de estudiante → «Guía de trabajo» → «Leer la guía en la app».",
    ]),
])
build("Manual_UTP_Evaluador.pdf", "Manual UTP y Evaluador/a", "Cómo funciona la plataforma y cómo revisar materiales · " + URL, story)

# ===========================================================================
# 2) PIE
# ===========================================================================
story = []
story.extend(callout(
    "Este manual explica tu rol de accesibilidad e inclusión (DUA) y cómo funciona hoy la plataforma. "
    "Está disponible en <b>" + URL + "</b>.",
    title="Bienvenido/a",
))
story.extend([
    h1("1. Tu rol y el sitio actual"),
    body("Como integrante del <b>Programa de Integración Escolar (PIE)</b> revisas que los materiales sean accesibles. "
         "Hoy cada guía incluye lectura con comprensión, preguntas, tareas con fuentes externas y <b>espacios de respuesta</b>; "
         "las misiones se pueden escuchar en la app y el tema claro/oscuro y el tamaño de letra son opciones accesibles para estudiantes. "
         "La <b>Granja Ciudadana</b> es una actividad visual con textos de apoyo y emojis, y respeta esas opciones de accesibilidad "
         "(modo oscuro, tamaño de letra y contraste)."),
    h1("2. ¿Cómo ingreso?"),
    body("1) Abre el navegador y entra a la plataforma:"),
    Paragraph(URL, st_code),
    body("2) Elige la pestaña <b>«Docente / equipo»</b>."),
    body("3) Escribe tu correo y contraseña, y pulsa «Entrar»."),
    h2("Credenciales de acceso (PIE)"),
    cred_table([
        ["PIE", "pie@demo.cl", "Demo1234"],
    ], header=["Rol", "Correo", "Contraseña"]),
    Spacer(1, 8),
])
story.extend(callout("Guarda estas credenciales en un lugar seguro. No las compartas con estudiantes.", title="Seguridad", color=RED))
story.extend([
    h1("3. Cómo revisar un material"),
    bullets([
        "Menú <b>«Materiales»</b>: revisa los que están <b>«En revisión»</b> o <b>«Reenviados»</b>.",
        "Abre con <b>«Ver»</b> y revisa desde una mirada de accesibilidad.",
    ]),
    h2("Lista de chequeo de accesibilidad"),
    cred_table([
        ["Instrucciones", "¿Son claras, numeradas y en pasos cortos?"],
        ["Lectura", "¿El vocabulario es simple, con ejemplos y suficiente espacio?"],
        ["Respuesta", "¿Cada consigna y pregunta tiene líneas o espacio para escribir?"],
        ["Distractores", "¿Hay pocas alternativas y sin trampas?"],
        ["Versión DUA/PIE", "¿Existe una versión adecuada de la evaluación?"],
    ], header=["Aspecto", "Revisar que…"]),
    h2("Tu decisión"),
    body("Puedes <b>Aprobar</b>, dejar <b>Observaciones</b> o <b>Solicitar cambios</b>, siempre con un comentario por sección."),
    h1("4. Ver el material como lo verá una estudiante"),
    body("Cierra sesión e ingresa como estudiante (pestaña <b>«Estudiante»</b>). Abre una misión y usa "
         "<b>«Guía de trabajo»</b>: lee, escucha y descarga. En las evaluaciones revisa la <b>versión DUA</b>."),
    h2("Estudiantes de prueba"),
    cred_table(TEST_STUDENTS_ROWS, header=TEST_STUDENTS_HEADER),
    Spacer(1, 8),
])
story.extend(callout("Al revisar desde la vista de estudiante, la clave de las cuentas de prueba es el número de la tabla.",
                     title="Recordatorio", color=AMBER))
story.extend([
    h1("5. Descargar y compartir"),
    bullets([
        "Cada material: botones <b>«Descargar PDF»</b> y <b>«Descargar DOCX»</b>.",
        "Todo el curso de una vez: <b>«Descargar todo (PDF/DOCX)»</b> en «Materiales».",
    ]),
    h1("6. Preguntas frecuentes"),
    bullets([
        "¿Falta la versión DUA? Pídelo al/la docente (Generar → «GENERAR VERSIÓN DUA»).",
        "¿Un material es difícil de leer? Solicita cambios indicando la sección exacta.",
    ]),
])
build("Manual_PIE.pdf", "Manual PIE", "Revisión de accesibilidad de materiales (DUA) · " + URL, story)

# ===========================================================================
# 3) ESTUDIANTES
# ===========================================================================
story = []
story.extend(callout(
    "¡Hola! Este es tu manual para entrar a la plataforma del curso. "
    "Todo lo que necesitas está en <b>" + URL + "</b>.",
    title="Bienvenida a tu curso",
))
story.extend([
    h1("1. ¿Qué es la plataforma?"),
    body("Es el espacio de tu curso de <b>Educación Ciudadana</b>. Tienes <b>12 misiones</b> (una por clase). "
         "Las misiones 7 a 12 son <b>desafíos de laboratorio</b> que se juegan en la sala de computación. "
         "También hay guías de trabajo para la clase, entrenamiento para la prueba, medallas y quiz en vivo. "
         "Y ahora tienes tu propia <b>Granja Ciudadana</b> 🌱 para cultivar, decorar y subir de nivel."),
    h1("2. Cómo entrar (paso a paso)"),
    bullets([
        "Abre tu navegador (Chrome, Edge, Firefox…) en tu computador, tablet o teléfono.",
        "Escribe esta dirección y pulsa Enter: <b>" + URL + "</b>",
        "En la pantalla de inicio elige la pestaña <b>«Estudiante»</b>.",
        "Elige tu <b>curso</b>: <b>3º Medio D</b> o <b>3º Medio E</b>.",
        "Busca y elige <b>tu nombre</b> en la lista.",
        "Escribe tu <b>clave</b>: tu RUT <b>sin puntos ni guiones</b>.",
        "Pulsa <b>«Entrar»</b> y listo.",
    ]),
])
story.extend(callout(
    "Si tu RUT es <b>20.123.456-7</b>, tu clave es <b>201234567</b>.<br/>"
    "Si tu RUT termina en K, por ejemplo <b>23.132.318-K</b>, tu clave es <b>23132318K</b> (con la K en MAYÚSCULA).",
    title="¿Cómo es mi clave?", color=GREEN,
))
story.extend([
    h1("3. Qué hay dentro"),
    h2("Mis misiones"),
    bullets([
        "Cada misión tiene su <b>aula invertida</b> (para preparar en casa: lee o escucha).",
        "Al completar la preparación aparecen los pasos de la misión.",
        "En la parte superior de cada misión puedes elegir tu <b>rol</b> del día.",
    ]),
    h2("Guía de trabajo"),
    bullets([
        "Dentro de cada misión está la <b>«Guía de trabajo»</b>: es el material de la clase.",
        "Puedes <b>leerla en la app</b>, <b>escucharla</b> y <b>descargarla</b> en PDF o DOCX.",
        "La guía tiene lectura, preguntas de comprensión, tareas con fuentes y espacios para responder.",
    ]),
    h2("Dilema de la clase"),
    bullets([
        "En algunas misiones verás el <b>«Dilema de la clase»</b>: el caso que debes analizar y responder.",
        "Puede traer varias <b>perspectivas</b> para comparar (por ejemplo, la tradición republicana, liberal y comunitaria) y una pregunta para tu evidencia.",
    ]),
    h2("Tu recorrido en cada misión"),
    cred_table([
        ["1 · Explorar", "Aula invertida y contenido de la misión"],
        ["2 · Demostrar", "Entrega tu evidencia (texto, foto o audio)"],
        ["3 · Cerrar", "«La última jugada» (ticket con tus ideas)"],
        ["4 · Contar", "«Tu voz cuenta» (feedback del curso)"],
    ], header=["Paso", "Qué haces"], widths=[4.6 * cm, 12.6 * cm]),
    h2("Otros lugares"),
    bullets([
        "<b>Granja</b> 🌱: cultiva, decora y sube de nivel (ver la sección 4).",
        "<b>Entrenamiento</b>: resumen y preguntas para preparar la prueba.",
        "<b>Quiz en vivo</b>: escribe el código cuando tu profesora inicie un quiz.",
        "<b>Medallero</b>: tus medallas; toca una para ver qué significa.",
        "<b>Retroalimentación</b>: cuando tu profesora revise tu evidencia, te avisa en tu inicio.",
    ]),
    h1("4. La Granja Ciudadana 🌱"),
    body("La Granja es tu espacio para cultivar tu bien común. Ganas semillas y monedas con tus misiones y, "
         "además, decoras tu propia granja. La encuentras en el menú superior: <b>«Granja»</b>. "
         "Dentro de la granja tienes un botón <b>«¿Cómo juego?»</b> con estos mismos pasos."),
    h2("Plantar y cosechar"),
    bullets([
        "Toca una <b>casilla</b> y elige un <b>cultivo</b> (Trigo, Zanahoria, Tomate…).",
        "Mientras crece verás el tiempo; cuando aparezca <b>«¡Cosechar!»</b>, tócala.",
        "Cada cosecha te da <b>monedas 🪙, semillas 🌰 y XP ⭐</b>.",
        "Usa <b>«Ocultar/Mostrar cultivos»</b> para colapsar la parcela cuando quieras dejar espacio al mapa.",
    ]),
    h2("Comprar en la Tienda"),
    bullets([
        "Toca <b>«Tienda»</b> (botón arriba y abajo): cultivos, animalitos, herramientas, vestimenta, accesorios y decoración.",
        "Cada objeto te da una <b>mejora</b>: más semillas, monedas, XP o velocidad de crecimiento.",
        "¿Sin espacio en la parcela? Compra <b>cercos 🚧 o estanques 🪷</b> con <b>«＋ Ampliar parcela»</b> para tener más casillas.",
    ]),
    h2("Decorar tu granja 🎨"),
    bullets([
        "En <b>«Decora tu granja»</b> (debajo del mapa) <b>arrastra</b> una ficha al mapa o <b>tócala</b> para colocarla.",
        "Puedes colocar <b>animalitos, decoraciones, herramientas y talismanes</b>.",
        "Toca un objeto colocado para <b>quitarlo</b>; arrástralo para moverlo.",
        "Al empezar a colocar, <b>los cultivos se ocultan solos</b> para dejarte espacio.",
        "<b>Cada objeto colocado te da mejora</b>: más monedas 🪙, XP ⭐ o crecimiento ⚡.",
    ]),
    h2("Mi casa 🏠"),
    bullets([
        "Toca tu casa (<b>«Mi casa · entrar»</b>) para entrar.",
        "Elige entre <b>10 estilos</b> de casa (cabaña, castillo, palacete…); cada uno cambia los colores del interior.",
        "Sube de nivel para desbloquear <b>pisos</b>: Living, Cocina, Dormitorio, Estudio, Taller y Terraza, cada uno con sus muebles.",
    ]),
    h2("Desafío de conceptos y nivel"),
    bullets([
        "En cada <b>nivel</b> hay un <b>«Desafío de conceptos»</b>: responde preguntas de lo que aprendiste y gana <b>XP</b>.",
        "La barra de nivel llega hasta <b>100%</b>; al completarla <b>subes de nivel</b> y desbloqueas mejoras.",
    ]),
    h2("Avisos y regalos"),
    bullets([
        "Cada vez que ganas algo (cosecha, quiz, medalla o nivel) te aparece un <b>aviso</b> arriba de la pantalla.",
        "Tu profesor/a puede <b>regalarte avatares y objetos</b>: te llega un aviso al instante.",
        "En <b>«Mi personaje»</b> eliges tu avatar y los avatares especiales que te regalen.",
    ]),
    h1("5. Consejos para ti"),
    bullets([
        "Lee cada pregunta <b>dos veces</b> antes de responder.",
        "Si algo no entiendes, <b>pide ayuda</b>: no pasa nada.",
        "En la parte inferior puedes poner <b>modo oscuro</b>, aumentar la letra o activar el contraste.",
        "Usa <b>«¿Cómo usar?»</b> en la parte superior para ver esta guía dentro de la app.",
        "En la granja, toca <b>«¿Cómo juego?»</b> si no recuerdas algún paso.",
        "En las evaluaciones tendrás <b>70 minutos</b> y las instrucciones están al comienzo.",
    ]),
    h1("6. Si algo no funciona"),
    cred_table([
        ["No encuentro mi nombre", "Avisa a tu profesor/a para que revise tu cuenta"],
        ["Dice que la clave es incorrecta", "Escribe tu RUT sin puntos ni guiones; si termina en K, usa mayúscula"],
        ["No recuerdo mi RUT", "Pídelo a tu apoderado/a o al profesor/a"],
        ["La página no carga", "Revisa tu conexión y recarga con Ctrl+F5"],
    ], header=["Problema", "Qué hacer"]),
    Spacer(1, 8),
])
story.extend(callout(
    "Si usas una cuenta de prueba para practicar: Estudiante Prueba 1 (clave 111111111), "
    "Prueba 2 (clave 222222222), Prueba 3 (clave 333333333).",
    title="Cuentas de práctica", color=AMBER,
))
build("Manual_Estudiantes.pdf", "Manual para Estudiantes", "Cómo usar tu curso en la plataforma · " + URL, story)

print("PDFs generados en", OUT)
