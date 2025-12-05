# Guía Paso a Paso: Despliegue en Oracle Cloud Free Tier

Esta guía te llevará paso a paso a través del proceso completo de desplegar tu bot de Discord en Oracle Cloud Free Tier.

## Requisitos Previos

- Una cuenta de correo electrónico válida
- Una tarjeta de crédito (para verificación, no se te cobrará si usas solo recursos gratuitos)
- Acceso a Discord Developer Portal para obtener el token del bot

## Paso 1: Crear Cuenta en Oracle Cloud

1. Ve a [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
2. Haz clic en "Start for Free"
3. Completa el formulario de registro:
   - Nombre, email, país
   - Número de teléfono para verificación
   - Información de la tarjeta de crédito (solo para verificación, no se cobrará si usas solo recursos gratuitos)
4. Verifica tu email y teléfono
5. Espera a que se procese tu cuenta (puede tomar unos minutos)

## Paso 2: Crear una Instancia de Computación

1. **Acceder a la Consola de Oracle Cloud**
   - Inicia sesión en [cloud.oracle.com](https://cloud.oracle.com)
   - Selecciona tu región (recomendado: una cercana a ti)

2. **Crear una Nueva Instancia**
   - En el menú principal, ve a **"Compute" → "Instances"**
   - Haz clic en **"Create Instance"**

3. **Configurar la Instancia**
   
   a. **Nombre y Forma**:
   - Nombre: `discord-bot` (o el que prefieras)
   - Image: Selecciona **"Canonical Ubuntu"** y elige la versión **22.04** o superior
   - Shape: 
     - Para ARM (recomendado): Selecciona "Ampere" y elige **VM.Standard.A1.Flex**
     - Para AMD: Selecciona **VM.Standard.E2.1.Micro** (Always Free)
   
   b. **Configuración de Red**:
   - VCN: Si no tienes una, haz clic en "Create new VCN" (se crearán automáticamente todas las configuraciones necesarias)
   - Subnet: Selecciona la subnet pública
   - Public IP: Selecciona **"Assign a public IPv4 address"** (IMPORTANTE)

   c. **Claves SSH**:
   - Opción 1: **Generar nueva clave**
     - Haz clic en "Generate SSH Key Pair"
     - Descarga las claves privada y pública
     - **¡IMPORTANTE!** Guarda la clave privada en un lugar seguro. La necesitarás para conectarte.
   - Opción 2: **Usar tu clave pública existente**
     - Pega tu clave pública SSH en el campo

   d. **Configuración de Boot Volume**:
   - Puedes dejar los valores por defecto (47 GB es suficiente para un bot)

4. **Crear la Instancia**
   - Revisa la configuración
   - Haz clic en **"Create"**
   - Espera 1-2 minutos mientras se crea la instancia

## Paso 3: Obtener la IP Pública y Conectarte

1. **Obtener la IP Pública**
   - Una vez que la instancia esté en estado "Running"
   - En la página de detalles de la instancia, copia la **"Public IP address"**

2. **Conectarte por SSH**
   
   Si usaste la clave generada por Oracle:
   ```bash
   chmod 400 /ruta/a/tu/clave-privada.key
   ssh -i /ruta/a/tu/clave-privada.key ubuntu@TU_IP_PUBLICA
   ```
   
   Si usaste tu propia clave:
   ```bash
   ssh ubuntu@TU_IP_PUBLICA
   ```

3. **Verificar la Conexión**
   - Deberías ver el prompt de Ubuntu
   - Actualiza el sistema:
     ```bash
     sudo apt update && sudo apt upgrade -y
     ```

## Paso 4: Configurar Security Lists (Firewall)

**IMPORTANTE**: Los bots de Discord hacen conexiones **salientes** a Discord, no necesitas abrir puertos entrantes. Sin embargo, necesitas SSH para conectarte.

### Verificar que SSH está permitido

1. En la consola de Oracle Cloud, ve a tu instancia
2. Haz clic en la VCN (Virtual Cloud Network) asociada
3. Ve a **"Security Lists"**
4. Selecciona la Security List por defecto
5. Verifica que existe una regla de "Ingress" para:
   - Puerto: 22
   - Protocolo: TCP
   - Origen: 0.0.0.0/0 (o un rango IP específico para mayor seguridad)

Si no existe, agrega una regla:
- Source: `0.0.0.0/0` (o tu IP específica)
- IP Protocol: TCP
- Destination Port Range: 22

**Nota**: No necesitas abrir ningún otro puerto para el bot de Discord, ya que usa conexiones salientes.

## Paso 5: Clonar y Configurar el Bot

1. **Instalar Git** (si no está instalado):
   ```bash
   sudo apt install -y git
   ```

2. **Clonar el repositorio**:
   ```bash
   cd ~
   git clone <URL_DEL_REPOSITORIO> acceptbotdiscordcbot
   cd acceptbotdiscordcbot
   ```

3. **Crear el archivo .env**:
   ```bash
   cp .env.example .env
   nano .env
   ```
   
   Edita el archivo con tus valores:
   ```
   DISCORD_TOKEN=tu_token_del_bot_aqui
   TARGET_ROLE_ID=id_del_rol_aqui
   ```
   
   Guarda y cierra (Ctrl+X, luego Y, luego Enter)

## Paso 6: Ejecutar el Script de Despliegue

1. **Hacer el script ejecutable y correrlo**:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

2. El script hará todo automáticamente:
   - Instalará Node.js si es necesario
   - Instalará las dependencias
   - Configurará el servicio systemd
   - Iniciará el bot

3. **Verificar que funciona**:
   ```bash
   sudo systemctl status acceptbot
   ```

4. **Ver los logs en tiempo real**:
   ```bash
   sudo journalctl -u acceptbot -f
   ```

## Paso 7: Verificar que el Bot está Funcionando

1. En Discord, verifica que el bot está en línea
2. Envía un mensaje de prueba en un servidor donde esté el bot
3. El bot debería asignar el rol automáticamente

## Comandos Útiles

### Gestión del Servicio

```bash
# Ver estado
sudo systemctl status acceptbot

# Ver logs
sudo journalctl -u acceptbot -f

# Reiniciar
sudo systemctl restart acceptbot

# Detener
sudo systemctl stop acceptbot

# Iniciar
sudo systemctl start acceptbot
```

### Scripts Útiles Incluidos

```bash
# Health check
chmod +x health-check.sh
./health-check.sh

# Crear backup
chmod +x backup.sh
./backup.sh

# Actualizar el bot
chmod +x update.sh
./update.sh
```

## Solución de Problemas

### El bot no inicia

1. Revisa los logs:
   ```bash
   sudo journalctl -u acceptbot -n 50
   ```

2. Verifica que el archivo `.env` existe y tiene los valores correctos:
   ```bash
   cat .env
   ```

3. Verifica permisos:
   ```bash
   ls -la .env
   # Debe mostrar: -rw------- (600)
   ```

### No puedo conectarme por SSH

1. Verifica que la instancia está en estado "Running"
2. Verifica que tienes la IP pública correcta
3. Verifica que la Security List permite conexiones SSH (puerto 22)
4. Si usas una clave privada, verifica los permisos:
   ```bash
   chmod 400 tu-clave.key
   ```

### La instancia se detiene inesperadamente

1. Revisa en la consola de Oracle Cloud si hay notificaciones
2. Verifica que no has excedido los límites del Free Tier
3. Las instancias Always Free pueden tener limitaciones de CPU
4. Verifica que el servicio está configurado para iniciarse automáticamente:
   ```bash
   sudo systemctl is-enabled acceptbot
   ```

### El bot se desconecta frecuentemente

1. Revisa los logs para ver si hay errores
2. Verifica la conexión a internet de la instancia:
   ```bash
   ping discord.com
   ```
3. Verifica que no hay problemas de CPU o memoria:
   ```bash
   htop
   ```

## Límites del Free Tier

- **Compute**: 2 VM.Standard.E2.1.Micro (AMD) O 4 VM.Standard.A1.Flex (ARM) con hasta 24 GB RAM
- **Transferencia de datos salientes**: 10 TB por mes
- **Almacenamiento**: 200 GB total de boot volumes

**Nota**: El bot de Discord usa muy pocos recursos. Un bot simple como este puede funcionar perfectamente en una instancia Always Free.

## Seguridad Adicional

1. **Limitar acceso SSH a tu IP**:
   - En Security Lists, cambia `0.0.0.0/0` por tu IP específica
   - Para obtener tu IP pública: `curl ifconfig.me`

2. **Usar firewall local** (ufw):
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw enable
   ```

3. **Actualizar regularmente**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

## Próximos Pasos

Una vez que el bot esté funcionando:

1. Configura backups regulares del archivo `data/state.json`
2. Monitorea los logs periódicamente
3. Actualiza el bot cuando haya nuevas versiones
4. Considera configurar alertas si el servicio se detiene

## Recursos Adicionales

- [Documentación de Oracle Cloud Free Tier](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- [Discord.js Documentation](https://discord.js.org/)
- [Discord Developer Portal](https://discord.com/developers/applications)






