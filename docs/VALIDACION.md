# Validación de PocketStore

Fecha de entrega: 2 de octubre de 2026. Autor: JOSUE GALVAN ARANA.

La aplicación se ejecutó en localhost y se verificó en Chrome sin interfaz gráfica. Se utilizaron los archivos reales del proyecto y la API pública. La primera carga respondió con «Datos actualizados · JSONPlaceholder».

| Comprobación | Resultado |
|---|---|
| Carga del App Shell y diez usuarios | Correcto |
| Búsqueda por ciudad y empresa | Correcto |
| Estado sin coincidencias | Correcto |
| Favorito guardado y conservado tras recargar sin red | Correcto |
| Ficha con correo, dirección, teléfono y empresa | Correcto |
| Cierre con Escape y retorno del foco | Correcto |
| Service Worker activo y caché del App Shell | Correcto |
| Recarga en navegador sin conexión | Correcto |
| Última respuesta de API accesible offline | Correcto |
| Copia incluida cuando la API no responde | Correcto |
| Regreso de conexión y actualización habilitada | Correcto |
| Vista a 390 px sin desbordamiento horizontal | Correcto |
| Manifiesto standalone e iconos HTTP 200 | Correcto |
| Excepciones JavaScript no controladas | Ninguna |

La prueba reproducible se encuentra en `tests/offline.cjs`. Las capturas se generaron durante esa ejecución. La portada se adaptó a partir del modelo institucional, conservando el logo, universidad, programa, composición y pie; se renderizó y revisó visualmente su única página. Las capturas de escritorio, ficha, modo offline y móvil también se revisaron visualmente.

La instalación real en un teléfono no se probó. Se verificaron el manifiesto, sus iconos y la disponibilidad del botón de instalación en Chrome. El almacenamiento offline requiere una carga inicial completa y puede ser eliminado por el usuario o el navegador.
