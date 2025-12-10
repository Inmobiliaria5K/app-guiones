# Despliegue automático con GitHub Actions (branch `live`)

Resumen rápido:

- Al hacer push a la rama `live`, GitHub Actions ejecuta el job en un runner `self-hosted` (el runner que ya instalaste en el servidor).
- El workflow instala dependencias, ejecuta `npm run build` y llama a `scripts/deploy.sh`.
- El script copia el contenido de `dist/` al directorio destino (configurable) usando `rsync`.

Configuración requerida:

1. Añadir en la configuración del repositorio (Settings -> Secrets) el secret `DEPLOY_DIR` con la ruta absoluta del directorio donde nginx sirve la app. Ejemplo: `/var/www/live`.
2. (Opcional) Añadir secret `RUNNER_USER` con el usuario del runner (ej. `gitlab-runner`, `github-runner` o `deploy`) para que el script haga `chown` de los archivos.

Permisos en el servidor:

- Asegúrate de que el usuario del runner tenga permisos de escritura sobre el `DEPLOY_DIR` o que el directorio pertenezca al `RUNNER_USER`.
- Comandos de ejemplo en el servidor (ajusta `gitrunner` y la ruta):

```bash
sudo mkdir -p /var/www/live
sudo chown -R gitrunner:gitrunner /var/www/live
```

Notas sobre reload de nginx:

- Si el runner se ejecuta como root, el script intentará `systemctl reload nginx` al final.
- Si no es root, el script saltará el reload y deberás recargar nginx manualmente o dar permisos/sudoers apropiados.

Probar localmente:

- Haz un push a la rama `live` y revisa la ejecución en Actions -> workflow `Deploy to Live Server`.
- Los logs mostrarán salida del build y del script `deploy.sh`.

Seguridad y recomendaciones:

- Mantén `DEPLOY_DIR` fuera de repositorios públicos si es confidencial (es un secreto del repo).
- Controla el acceso al runner; cualquier push a `live` ejecutará el deploy.
