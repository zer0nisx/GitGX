# GitGX - Tareas

## ✅ Completadas
- [x] Desactivar monitoreo automático al iniciar la aplicación
- [x] Desactivar monitoreo automático al crear nuevos nodos
- [x] Arreglar errores de Next.js 15 con `params.id` en rutas dinámicas

## Configuración
El monitoreo automático está desactivado por defecto. Para activar/desactivar el monitoreo:

1. **Control Manual**: Usa los botones Start/Stop en la interfaz para cada nodo
2. **Auto-inicio (opcional)**: Descomenta la línea en `src/lib/monitor-service.ts` constructor

## Notas
- El puerto API de MikroTik por defecto es 8728
- Asegúrate de que Winbox no esté usando el mismo puerto API cuando uses esta aplicación
- Los nodos deben iniciarse manualmente después de crearlos
