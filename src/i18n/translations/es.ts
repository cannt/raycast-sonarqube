/**
 * Spanish translations
 */

const translations = {
  common: {
    success: "Éxito",
    failure: "Fallo",
    error: "Error",
    warning: "Advertencia",
    loading: "Cargando...",
    completed: "Completado",
    cancel: "Cancelar",
    save: "Guardar",
    delete: "Eliminar",
    edit: "Editar",
    add: "Añadir",
    select: "Seleccionar",
    continue: "Continuar",
    back: "Atrás",
  },
  
  commands: {
    startSonarQube: {
      title: "Iniciar SonarQube Localmente (Podman)",
      description: "Inicia la instancia local de SonarQube usando Podman. Verifica si SonarQube ya está en ejecución y notifica al usuario en ese caso.",
      starting: "Iniciando SonarQube...",
      alreadyRunning: "SonarQube ya está en ejecución",
      startSuccess: "SonarQube se ha iniciado correctamente",
      startError: "Error al iniciar SonarQube",
      startingPodman: "Iniciando SonarQube Local (Podman)",
      success: "SonarQube iniciado",
      accessUrl: "Accede en",
      waiting: "Esperando a que SonarQube esté completamente iniciado",
      pleaseWait: "SonarQube está iniciándose, por favor espera un momento",
      checkingStatus: "Comprobando el estado de SonarQube...",
      initializing: "SonarQube podría estar inicializándose. Comprobando de nuevo con mayor tiempo de espera...",
      statusChecking: "Comprobando el estado de SonarQube...",
      statusInitializing: "SonarQube podría estar inicializándose. Comprobando de nuevo con mayor tiempo de espera...",
      statusRunning: "SonarQube está en ejecución",
      statusNotRunning: "SonarQube no está en ejecución",
      statusUnknown: "El estado de SonarQube es desconocido",
    },
    
    stopSonarQube: {
      title: "Detener SonarQube Localmente (Podman)",
      description: "Para la instancia local de SonarQube y la máquina Podman. Intenta detener primero las tareas de Gradle en curso en todos los proyectos configurados.",
      stopping: "Deteniendo SonarQube...",
      stoppingGradle: "Deteniendo tareas de Gradle primero...",
      stopSuccess: "SonarQube se ha detenido correctamente",
      stopError: "Error al detener SonarQube",
    },
    
    openSonarQubeApp: {
      title: "Abrir Aplicación SonarQube",
      description: "Abre la aplicación SonarQube o su URL web.",
      opening: "Abriendo SonarQube...",
      openError: "Error al abrir SonarQube",
    },
    
    runSonarAnalysis: {
      title: "Ejecutar Análisis de SonarQube",
      description: "Selecciona un proyecto para ejecutar el análisis de SonarQube y abrir la aplicación. Gestiona proyectos desde este comando.",
      noProjects: "No hay proyectos configurados",
      selectProject: "Seleccionar un proyecto",
      addNewProject: "Añadir nuevo proyecto",
      editProject: "Editar proyecto",
      deleteProject: "Eliminar proyecto",
      runningAnalysis: "Ejecutando análisis de SonarQube",
      analysisSuccess: "El análisis de SonarQube se completó correctamente",
      analysisError: "Error al ejecutar el análisis de SonarQube",
      searchPlaceholder: "Buscar proyectos...",
    },
    
    allInOne: {
      title: "Iniciar, Analizar SonarQube y Abrir Aplicación",
      description: "Inicia SonarQube si es necesario, ejecuta análisis y abre la aplicación en un solo paso.",
      actionTitle: "Iniciar SonarQube, Ejecutar Análisis y Abrir Aplicación",
      success: "Secuencia de SonarQube iniciada para {{projectName}}",
      error: "Error al iniciar la secuencia de SonarQube",
      configureFirst: "Por favor, configura los proyectos primero en el comando 'Ejecutar Análisis de SonarQube'.",
    },
    
    startAnalyzeOpenSonarQube: {
      title: "Iniciar, Analizar SonarQube y Abrir Aplicación",
      description: "Inicia SonarQube, luego selecciona un proyecto para ejecutar análisis y abrir la aplicación. Gestiona proyectos desde este comando.",
      initializing: "Inicializando entorno de SonarQube...",
      startingAnalysis: "Iniciando análisis de SonarQube...",
      openingResults: "Abriendo resultados de SonarQube...",
      allInOneSuccess: "SonarQube iniciado, análisis completado y resultados abiertos",
      allInOneError: "Error al completar el flujo de trabajo de SonarQube",
    },
  },
  
  projects: {
    management: {
      title: "Gestión de Proyectos",
      addProject: "Añadir Proyecto",
      editProject: "Editar Proyecto",
      deleteProject: "Eliminar Proyecto",
      confirmDelete: "¿Estás seguro de que quieres eliminar este proyecto?",
      goToManager: "Ir al Gestor de Proyectos",
      notImplemented: "Esto navegaría al gestor de proyectos (no implementado)",
    },
    form: {
      name: "Nombre del Proyecto",
      path: "Ruta del Proyecto",
      namePlaceholder: "Ingresa el nombre del proyecto",
      pathPlaceholder: "Ingresa la ruta completa al proyecto",
      nameRequired: "El nombre del proyecto es obligatorio",
      pathRequired: "La ruta del proyecto es obligatoria",
      saveSuccess: "Proyecto guardado correctamente",
      saveError: "Error al guardar el proyecto",
      deleteSuccess: "Proyecto eliminado correctamente",
      deleteError: "Error al eliminar el proyecto",
    },
  },
  
  terminal: {
    executing: "Ejecutando: {{command}}",
    preparation: "Preparando entorno...",
    commandRunning: "Comando en progreso...",
    commandSuccess: "Comando completado correctamente",
    commandError: "Error en el comando: {{error}}",
    openingTerminal: "Abriendo terminal...",
    progressTracking: "Progreso: {{status}}",
    completed: "Todas las operaciones completadas correctamente",
  },
  
  errors: {
    commandNotFound: "Comando no encontrado. Asegúrate de que todas las herramientas requeridas estén instaladas.",
    permissionDenied: "Permiso denegado. Intenta ejecutar con los permisos adecuados.",
    fileNotFound: "Archivo o directorio no encontrado. Verifica que todas las rutas sean correctas.",
    connectionFailed: "Error de conexión. Verifica tu configuración de red.",
    connectionRefused: "Conexión rechazada. Asegúrate de que el servicio esté en ejecución.",
    cannotConnect: "No se puede conectar. Verifica que el servicio esté en ejecución y accesible.",
    timeout: "Tiempo de espera agotado. El servicio podría estar lento o no disponible.",
    appleScriptError: "Error de AppleScript. Intenta de nuevo o reinicia Raycast.",
    terminalIssue: "Problema con Terminal. Asegúrate de que la aplicación Terminal esté disponible.",
    generic: "Se produjo un error: {{message}}",
  },
  
  preferences: {
    sonarqubePodmanDir: {
      title: "Directorio de Podman para SonarQube",
      description: "Directorio que contiene la configuración de Podman para SonarQube.",
      placeholder: "/ruta/al/directorio_podman_sonarqube",
    },
    useCustomSonarQubeApp: {
      title: "Usar Ruta/URL Personalizada de SonarQube",
      label: "Especificar una aplicación o URL personalizada de SonarQube para abrir.",
      description: "Si está marcado, especifica una ruta de aplicación o URL personalizada de SonarQube en el campo siguiente. De lo contrario, se usará http://localhost:9000.",
    },
    sonarqubeAppPath: {
      title: "Ruta/URL Personalizada de la Aplicación SonarQube",
      description: "Ruta o URL para tu SonarQube. Se usa solo si 'Usar Ruta/URL Personalizada de SonarQube' está marcado (en ajustes de extensión). Puede dejarse en blanco si no se usa una ruta personalizada.",
      placeholder: "p.ej., /Aplicaciones/Sonar.app o http://custom.sonar:9000 o dejar en blanco",
    },
    language: {
      title: "Idioma",
      description: "Idioma de la interfaz para la extensión. Si no se establece, se intentará usar el idioma del sistema.",
      options: {
        en: "Inglés (English)",
        es: "Español",
        auto: "Detección automática (Idioma del sistema)",
      },
    },
  },
};

export default translations;
