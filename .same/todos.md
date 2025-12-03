# GitGX - Tareas

## ✅ Completadas
- [x] Desactivar monitoreo automático al iniciar la aplicación
- [x] Desactivar monitoreo automático al crear nuevos nodos
- [x] Arreglar errores de Next.js 15 con `params.id` en rutas dinámicas
- [x] Agregar capacidad de editar nodos existentes
- [x] Git commit y push de los cambios

## Configuración
El monitoreo automático está desactivado por defecto. Para activar/desactivar el monitoreo:

1. **Control Manual**: Usa los botones Start/Stop en la interfaz para cada nodo
2. **Auto-inicio (opcional)**: Descomenta la línea en `src/lib/monitor-service.ts` constructor

## Diferencias entre Winbox y API
- **Winbox**: Puerto 8291 - Interfaz gráfica de MikroTik
- **API de MikroTik**: Puerto 8728 - Para aplicaciones y scripts (usado por esta app)
- Ambos pueden funcionar simultáneamente sin conflictos

## Notas
- Para conectarse con esta aplicación, asegúrate de que el servicio API esté habilitado en tu MikroTik
- Comando MikroTik para habilitar API: `/ip service enable api`
- Los nodos deben iniciarse manualmente después de crearlos
