# Changelog — Gestor de Matrices de Harris

«Gestor de Matrices de Harris» Copyright (C) 2026 iRO
Licencia: GNU General Public License v3 — https://www.gnu.org/licenses/

---

## [0.6] — en desarrollo (rama v0.6-gpkg)

### Nuevo
- **Muestras**: nueva tabla vinculada a cada UE (código propio, C14 BP, error,
  calibrada, fecha relativa, material, x/y/z libres). Pestaña "Muestras" y botón
  para añadirlas desde las propiedades de la UE.
- Fechas nominales (CE/BCE y HE/BH) de solo lectura, marcadas como
  "nominal, sin calibrar, aproximada".
- **Exportar a GeoPackage (.gpkg)**: botón "GPKG" a la izquierda de "Guardar".
  Tablas: proyecto, unidades_excavacion, ue, muestras, relaciones y puntos
  (única con geometría, EPSG:4326). Usa sql.js incluido; funciona sin internet.
- Formato de archivo .harris.json versión 6 (abre archivos de versiones anteriores).

### Corregido
- Al cancelar el aviso de "descartar cambios" ya no se pierde lo escrito en el formulario.

---

## [0.5] — 2026-07-10

Primera versión candidata a release público. Reestructuración completa a
arquitectura modular + estabilización de Electron tras pruebas reales en
Windows.

### Reestructuración a archivos modulares

- **De un solo HTML a estructura de carpetas.** `renderer/index.html` pasó de
  contener todo (CSS, JS, datos, diccionarios) embebido en un solo archivo a
  una estructura modular:
  ```
  renderer/
    index.html
    css/main.css
    js/{munsell-data,i18n,data,matrix,views,modals,main}.js
    lang/{es,en,index}.json
    data/figura_12.harris.json
    img/ (logo.svg del usuario, opcional)
  ```
- **Motivación doble:** (1) facilita mantenimiento y contribuciones — cada
  archivo tiene una responsabilidad clara; (2) hace que el HTML suelto ya no
  sea funcional por sí solo sin el resto de archivos, alineado con el modelo
  de distribución (código abierto en GitHub, instalador compilado de pago).

### Sistema de idiomas dinámico

- **Diccionarios externos en JSON.** `lang/es.json` y `lang/en.json` contienen
  cada uno ~98 strings, las etiquetas de relaciones (`rel_labels`) y las
  etiquetas de composición (`comp_labels`) — un solo archivo autocontenido por
  idioma, pensado para traducciones comunitarias sin tocar código.
- **`lang/index.json`** — manifest de idiomas disponibles con nombre y bandera.
  Añadir un idioma nuevo es agregar un archivo `{code}.json` + una entrada en
  el manifest; el selector se puebla solo.
- **Selector de idioma reemplaza los botones ES/EN.** Ahora es un `<select>`
  con bandera + nombre: 🇲🇽 Español, 🇬🇧 English (bandera de Reino Unido). Presente tanto en la home screen como en el header de
  trabajo.
- **Strings parametrizados sin funciones.** Como JSON no puede contener
  funciones, los mensajes de confirmación con variables (`del_ue_q`,
  `del_sec_q`) se guardan como templates con placeholders `{0}`/`{1}` y se
  resuelven con `tParam()` / `delUeQ()` / `delSecQ()`.

### Logo del proyecto

- **Tres puntos de anclaje preparados** para `img/logo.svg` (o `.png`): home
  screen (grande), modal "Acerca de / Referencias" (mediano), pestaña Ayuda
  (pequeño, junto al título). Usan `onerror` para ocultarse limpiamente si el
  archivo no existe — cero configuración para activarlo, solo colocar el
  archivo.

### Ejemplo oficial: Figura 12 del libro

- **"Ver ejemplo" ahora carga la Figura 12 real** de *Principles of
  Archaeological Stratigraphy* (Harris 1979) vía `fetch('data/figura_12.harris.json')`,
  con "Natural Ground" correctamente tipado como Roca madre y el corte 6
  como "Foundation trench". Reemplaza el ejemplo sintético del muro romano,
  que queda como función de respaldo (`loadSampleFallback()`) si el fetch
  falla.

### Corrección crítica: pérdida de foco de teclado en Windows

- **`window.confirm()` eliminado por completo de la aplicación.** Se
  identificó que el diálogo nativo de Windows usado para confirmaciones
  ("¿Descartar cambios?", "¿Eliminar UdE?", etc.) dejaba a veces el proceso de
  Chromium sin enrutar el teclado a los campos de texto después de cerrarse,
  obligando al usuario a cambiar de ventana y volver para recuperar el foco.
- **Reemplazado por `customConfirm()`** — un modal propio en HTML/CSS, con el
  mismo estilo visual del resto de la app (tema oscuro/claro, idioma actual),
  que nunca invoca el sistema de diálogos del sistema operativo. Elimina el
  bug de raíz en lugar de parchearlo, y de paso unifica visualmente toda la
  experiencia.
- Las funciones `tryClose()`, `doDelUE()`, `doDelSec()` y `newProject()` pasan
  a ser `async` para poder esperar la resolución del modal propio.

### Electron — ajustes de estabilidad

- **`preload.js`: nuevo método `refocus()`** expuesto vía `contextBridge`,
  para forzar un ciclo de blur/focus a nivel de sistema operativo cuando se
  necesite (usado como refuerzo adicional al abrir formularios).
- **`main.js`: handler IPC `win:refocus`** que ejecuta
  `mainWindow.blur(); mainWindow.focus(); mainWindow.webContents.focus()`.
- Acciones del menú nativo (`send()` en `main.js`) fuerzan foco de ventana
  antes de notificar al renderer, para el caso en que el usuario interactúe
  vía menú en lugar de clic directo en la interfaz.

### Otras correcciones menores

- CSS del split view (Relaciones/Matriz) corregido: las clases del divisor
  arrastrable (`.split-handle`, `.split-collapse-btn`, `.rm-split`) se habían
  quedado en una versión desactualizada tras la reestructuración; restauradas
  con scroll funcional y el divisor centrado con botones ← →.
- Versión mostrada en home screen ajustada a **v0.5** en lugar de v4.0,
  reflejando que este es el candidato a primer release público, no una
  iteración de desarrollo interno.

---

## [3.0] — 2026-07-09

### Pantalla de inicio y flujo de onboarding

- **Home screen.** Primera pantalla al abrir la app (o al pulsar 🏠). Cuatro
  cards: *Nuevo proyecto*, *Abrir proyecto*, *Ver ejemplo*, *Ayuda*. Desaparece
  al cargar un proyecto y puede recuperarse desde el botón Home del header.

- **Flujo guiado de nuevo proyecto.** Pulsar "Nuevo proyecto" abre un proceso
  de dos pasos: formulario de proyecto ("Paso 1 de 2") → formulario de sección
  ("Paso 2 de 2") → llega directo a la vista de Unidades lista para trabajar.

### Terminología y modelo de datos

- **"Localizaciones" renombradas a "Secciones".** Harris habla de *sections*
  como perfiles de excavación. El campo interior pasa de "Unidad / Sondeo" a
  "Nombre de sección". localStorage migra a `harris-db-v5`; al abrir proyectos
  anteriores, `localizacion_id` se renombra automáticamente a `seccion_id`.

- **UdE / UoS (Unidades de Estratificación / Units of Stratification).** El tab
  muestra "UdE" (ES) o "UoS" (EN). El formulario dice "Nueva Unidad de
  Estratificación (UdE)".

- **Tipos de UE ampliados de 2 a 10.** Estrato, Corte, Relleno, Derrumbe, Muro,
  Piso, Columna, Fosa, Roca madre, Otro. Corte y Fosa renderizan como elipse;
  el resto como rectángulo. Todos traducidos ES/EN.

- **Campo "Inclusiones".** Nuevo campo opcional en la ficha de UE (carbón,
  conchas, gravas, etc.).

- **"Anterior a" como alias inverso.** "A anterior a B" se almacena como
  "B sobre A". El análisis invierte los extremos antes de construir el grafo.
  Útil cuando se trabaja de abajo hacia arriba en el perfil.

### Visualización de la matriz

- **Routing reescrito: bus bar unificado.** El sistema de raíles por columna
  generaba rectángulos cuando el padre tenía hijos en columnas distintas. El
  nuevo algoritmo usa una sola barra horizontal que abarca todos los hijos con
  líneas rectas a cada uno — T's/brackets limpios como en la figura C de Harris
  (1979).

- **Nodos clicables.** Pulsar un nodo abre un popup de solo lectura con todos
  los datos de la UE y un botón "Editar".

- **Aviso de Roca madre.** El Diagnóstico avisa si una UE de tipo "Roca madre"
  no está en el nivel más bajo de la sección.

### Vista dividida Relaciones / Matriz

- **Split view con divisor arrastrable.** Paneles lado a lado en >1024px. La
  matriz actualiza en tiempo real.

- **Divisor central con botones de colapso (← →).** Clic = colapso total.
  Arrastrar = tamaño personalizado (20%–80%). El panel opuesto toma el 100%.

- **Comportamiento mobile.** En <1024px los paneles se apilan verticalmente con
  scroll.

- **Tab renombrada** a "Relaciones / Matriz" / "Relationships / Matrix".

### Tab de Ayuda

- **Nueva pestaña permanente** con contenido completo ES/EN:
  - Qué es la Matriz de Harris
  - **La innovación: teoría de grafos dirigidos.** El motor es un DAG. Describe
    los tres algoritmos: sort topológico (longest-path) para niveles, DFS para
    ciclos, y reducción transitiva para redundancias. Conecta con la Ley de
    Sucesión Estratigráfica de Harris.
  - Guía de uso, tabla de relaciones ES/EN, atajos de teclado, 6 FAQ.

### Atajos de teclado

| Atajo | Acción |
|---|---|
| `Ctrl+Enter` | Añadir relación |
| `Ctrl+S` | Guardar proyecto |
| `Escape` | Cerrar modal |

### Correcciones menores

- UE 415 del ejemplo ahora tiene **tipo** "Roca madre" (no solo etiqueta).
- Ícono de referencias: `ti-info-circle` → `ti-license`.
- Botón "Nuevo" añade `<span class="btn-lbl">` para ser traducible.

### Electron — primera versión de escritorio

- **`main.js`** — proceso principal. Ventana 1280×820 (mínimo 640×500). Links
  externos abren en el navegador por defecto.
- **`package.json`** — electron-builder: `.exe` (NSIS, Windows), `.dmg` (macOS,
  x64+arm64), `.AppImage` (Linux). AppId: `com.iro.harris-matrix`.
- **Menú nativo.** Archivo, Ver, Editar. `Ctrl+S` → Guardar, `Ctrl+O` → Abrir.
- `npm start` arranca. `npm run dev` abre DevTools. `npm run build` genera
  instaladores en `dist/`.
- El HTML entra sin cambios en `renderer/index.html`.

---

## [2.1] — 2026-06-18

### Arquitectura — Modelo relacional completo

- **Localización activa como eje del sistema.** Cada matriz está ahora asociada
  a una localización independiente. Cambiar de localización reinicia la vista de
  Relaciones, Unidades y Matriz mostrando solo los datos de esa localización.
  Las localizaciones son entidades aisladas; las relaciones son estrictamente
  internas a cada una.

- **Selector de localización activa en el header.** Siempre visible. Si no existe
  ninguna localización, se muestra el botón "Crear localización" que inicia el
  sistema. Sin localización activa, las pestañas de Relaciones, Unidades y Matriz
  quedan bloqueadas con un estado vacío y el botón para crear.

- **`proyecto_id` en localizaciones.** El campo faltante se añadió al modelo.
  Cada localización referencia ahora su proyecto por UUID, preparando el esquema
  para expansión futura a GeoPackage / SQLite.

- **Modelo de localización simplificado.** Los campos `este_x`, `norte_y`, `z`,
  `crs` fueron reemplazados por `lat`, `lon` (grados decimales) y `notas`. CRS
  siempre EPSG:4326 (WGS 84), implícito. Decisión basada en que las distancias
  entre localizaciones dentro de un mismo sitio son mínimas y lat/lon es el
  formato más directo para integración con visores web.

### Nuevas funcionalidades

- **Pestaña Localizaciones rediseñada.** Cards con estado visual activo (borde
  coral + badge verde). Clic en card inactiva = activar; botón de lápiz = editar
  sin cambiar la localización activa. El selector del header se actualiza al
  activar desde la card.

- **Pestaña Mapa.** Visor Leaflet (OpenStreetMap) que muestra todas las
  localizaciones con coordenadas como marcadores de puntos. Marcador activo en
  coral, resto en azul. Tooltip con nombre al hacer hover. Sin interacción
  adicional — vista de distribución espacial expedita. Requiere conexión a
  internet para cargar el mapa base.

- **Exportar GeoJSON.** Botón en pestaña Localizaciones. Genera un
  `FeatureCollection` con coordenadas `[lon, lat]` (convención GeoJSON / QGIS)
  y propiedades: `nombre`, `proyecto`, `temporada`, `director`, `num_ues`,
  `notas`. CRS declarado explícitamente como `urn:ogc:def:crs:OGC:1.3:CRS84`.
  Abre directamente en QGIS u otros SIG sin conversión.

- **Análisis filtrado por localización activa.** `analyze()` considera solo las
  UEs cuyo `localizacion_id` coincide con `activeLocId`, y solo las relaciones
  donde ambos extremos pertenecen a esa localización. Las relaciones
  inter-localización quedan almacenadas en el modelo pero no se procesan ni
  visualizan en esta versión (reservadas para futura "matriz de matrices").

- **Nomenclatura de UEs por localización.** El mismo nombre puede repetirse en
  localizaciones distintas sin generar error. La validación de duplicados opera
  dentro del ámbito de la localización activa únicamente.

### Correcciones

- **localStorage key actualizada** a `harris-db-v4` para evitar colisiones con
  esquemas anteriores al cargar proyectos guardados en el navegador.
- **`activeLocId` persiste** en el guardado automático y se restaura al recargar.

### Cambios de dependencias

- Tabler Icons actualizado a **3.35.0** via jsDelivr
  (`cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.35.0`). Migrado de cdnjs
  (versión 3.1.0) a jsDelivr para mayor confiabilidad en la entrega de fuentes
  del webfont.

---

## [2.0] — 2026-06-16

### Arquitectura — Separación de entidades

Refactorización mayor respecto a v1. Se abandona el modelo CSV plano de una sola
tabla para adoptar un **esquema relacional de cuatro tablas** con UUIDs:

| Tabla | Descripción |
|---|---|
| `proyecto` | Metadatos del sitio (nombre, director, temporada) |
| `localizaciones` | Unidades de excavación con coordenadas |
| `unidades` | Fichas de UE — fuente única de verdad |
| `relaciones` | Vínculos entre UEs (3 campos: ue1\_id, tipo, ue2\_id) |

- Las UEs se definen **independientemente** de las relaciones. El tipo, etiqueta,
  color y campos descriptivos viven en la ficha, no en cada fila de relación.
  Esto elimina la clase de errores "tipo contradictorio" que requería detección
  en v1.
- Los nombres de UE son la **etiqueta visible**; el UUID es el vínculo real.
  Renombrar una UE no rompe sus relaciones.
- Formato de archivo del proyecto: `.harris.json` — un único archivo JSON con
  las cuatro tablas. Diseñado para ser convertible a GeoJSON y extensible a
  GeoPackage en versiones futuras.
- Guardado automático en `localStorage` (`harris-db-v3`). Importar/exportar
  como `.harris.json`.

### Nuevas funcionalidades

- **Tres vistas principales:** Relaciones (3 campos: UE origen / relación / UE
  destino), Unidades (fichas en cards), Diagnóstico.
- **Fichas de UE con campos opcionales:** descripción, Munsell, color, composición
  del sedimento. Sección plegable para no sobrecargar el formulario en uso normal.
- **Selector de color Munsell con autocompletado.** 1 634 chips embebidos del
  dataset [munspace (David W. Craig)](https://github.com/davidwcraig/munspace/).
  Al teclear un código (ej. `10YR 5/3`) se sugieren chips válidos; al
  seleccionar uno, se autocompletan el hex y el nombre perceptual USDA (ej.
  `very dark grayish brown`). Nombres perceptuales basados en USDA Soil Survey
  Manual / Munsell Soil Color Charts (~239 chips con nombre del subconjunto de
  suelos).
- **Color de UE reflejado en la matriz.** Si una UE tiene color asignado, el nodo
  en la matriz se rellena con ese color. Toggle "Usar colores" para encender/apagar.
- **Toggle de tema claro / oscuro** con persistencia en `localStorage`. Tema
  oscuro por defecto.
- **Toggle ES / EN** — traducción completa de la interfaz (botones, pestañas,
  campos, mensajes, diagnósticos). Terminología Harris clásica en inglés: *Above,
  Cuts, Contemporary with, No physical relationship*. Los datos se guardan siempre
  en español internamente.
- **Diagnóstico mejorado:** ciclos estratigráficos, auto-referencias,
  duplicados, tipos contradictorios, UEs sin relaciones, redundancias por
  transitividad. Contador de errores/advertencias en el tab.
- **Formularios con detección de cambios sin guardar.** Clic fuera del diálogo,
  Cancelar o X preguntan "¿Descartar cambios?" si el formulario fue modificado.
- **Export SVG y PNG con fondo transparente** (2× resolución). Listo para
  publicaciones e impresión.
- **Botón de Referencias** con popup: atribución Munsell (munspace + USDA),
  enlace a *Principles of Archaeological Stratigraphy* (Harris, harrismatrix.com),
  cómo citar la herramienta, y texto completo de licencia GPL v3.

### Motor de la matriz

- **Sistema de columnas por `Orden`** — número que define la posición horizontal
  de cada UE en el perfil. Columnas fijas: UEs con el mismo `Orden` se dibujan
  en la misma columna vertical independientemente de su fase. Sin `Orden`
  asignado, la UE va al final por orden de primera aparición.
- **Routing de líneas con barra de bus.** Cuando un nodo tiene múltiples hijos,
  desciende una línea vertical hasta una barra horizontal que abarca todos los
  destinos, y de ahí bajan líneas rectas a cada hijo. Elimina el "espagueti" de
  versiones anteriores.
- **Raíles verticales entre columnas.** Para conexiones entre columnas distintas,
  se usa un raíl en el espacio de separación con stubs horizontales a cada hijo
  en su nivel exacto. Sistema de anti-colisión de raíles.
- **Detección de redundancias** (reducción transitiva): una relación A→C es
  redundante si existe A→B→C. Toggle para ocultarlas en la matriz.

---

## [1.0] — 2026-05-25

Versión inicial. Aplicación web standalone en un solo archivo HTML.

### Funcionalidades

- **Editor tabular de relaciones** con entrada CSV directa en un textarea.
  Formato: `UE1, Relación, UE2 [, Tipo] [, Orden] [, Etiqueta]`.
- **Relaciones soportadas:** Sobre, Corta, Contemporánea, Sin contacto.
  Reconocimiento normalizado (sin acento, sin distinción mayúsculas).
- **Tipos de UE:** Estrato (rectángulo) / Corte (elipse coral). Inferencia
  automática: si la relación es "Corta", UE1 se marca como Corte.
- **Etiquetas de UE** en columna opcional; se muestran a la derecha del nodo
  con línea guía punteada.
- **Orden horizontal** por columna numérica: define la posición izquierda-derecha
  de cada UE en el perfil. Primer número = más a la izquierda.
- **Asignación automática de fases** (F1, F2…) por el algoritmo de camino más
  largo (topological sort con longest-path). Contemporáneos (Union-Find) quedan
  en la misma fase.
- **Exportar SVG** y **Exportar PNG** (2× resolución).
- **Guardado automático** en `localStorage`.
- **Detección básica de errores:** tipos contradictorios, órdenes contradictorios,
  advertencia de relaciones redundantes.
- **Tema oscuro** únicamente.
- Sin separación de localizaciones; todas las UEs en un espacio único.

### Limitaciones conocidas (resueltas en v2.0)

- Tipo y etiqueta de UE definidos por fila de relación, no por ficha independiente.
  Una misma UE con tipo diferente en dos filas genera conflicto.
- Sin separación de proyectos ni localizaciones.
- Sin traducción de interfaz.
- Sin selector de color Munsell.
- Routing de líneas con L-shapes podía producir empalmes en matrices complejas.

---

## Hoja de ruta (futuras versiones)

- **v0.6–v0.9** — Ciclos de feedback con usuarios reales (distribución a
  colegas). Ajustes de usabilidad según lo reportado.
- **v1.0** — Primer release público: GitHub (código + instalador) + Gumroad
  (instalador, 10–15 libras). GitHub Actions para build automático en las tres
  plataformas.
- **Suma de secciones y periodización.** Correlación de UEs entre secciones
  distintas de un mismo proyecto (relaciones inter-sección, ya almacenadas en
  el modelo pero no visualizadas). Vista de "matriz de matrices" y agrupación
  de fases en periodos con nombre, inspirada en las figuras 21–22 de Harris
  (1979).
- **GeoPackage como exportador** (no como formato nativo — JSON se mantiene
  como formato de trabajo). Permite abrir las secciones directamente en QGIS
  sin conversión manual.
- **Tauri** como alternativa a Electron cuando el producto esté maduro y se
  priorice reducir el tamaño del instalador (~150MB en Electron → ~5–10MB en
  Tauri, mismo HTML/JS sin cambios).

---

## Dependencias y referencias

| Recurso | Versión / URL | Uso |
|---|---|---|
| Electron | ^36.0.0 | Runtime de escritorio |
| electron-builder | ^25.0.0 | Generación de instaladores |
| Tabler Icons | 3.35.0 · jsDelivr | Iconografía |
| Leaflet | 1.9.4 · unpkg | Visor de mapa |
| munspace (David W. Craig) | github.com/davidwcraig/munspace | Dataset Munsell hex (1 634 chips) |
| USDA Soil Survey Manual | — | Nombres perceptuales Munsell |
| Harris, E.C. (1979) | harrismatrix.com/about-the-book | *Principles of Archaeological Stratigraphy* |
