function installTestApi() {
  globalThis.__MSPM0_TEST_API__ = {
    SCHEMA_VERSION,
    PROJECT_DATA_VERSION,
    MAX_PROJECTS,
    STORAGE_KEY,
    DEVICE_ORDER: [...DEVICE_ORDER],
    DEVICE_CONFIG,
    createProjectState,
    createPresetState,
    createProject,
    createWorkspace,
    ensureProjectCapacity,
    normalizeLoaded,
    normalizeProject,
    normalizeWorkspace,
    loadWorkspace,
    projectSourcesFromImportPayload,
    projectCreationRequired,
    resolveProjectTarget,
    isValidProjectTarget,
    sanitizeAssignments,
    sanitizeView,
    setState(nextState, name = '测试工程') {
      state = normalizeLoaded(nextState);
      const project = createProject(name, state);
      workspace = { version: SCHEMA_VERSION, activeProjectId: project.id, projects: [project] };
      elements.searchInput.value = '';
    },
    getState() { return JSON.parse(JSON.stringify(state)); },
    getWorkspace() { return JSON.parse(JSON.stringify(workspace)); },
    setAssignment(number, value) { assignments()[String(number)] = { ...emptyAssignment(), ...value }; },
    searchPinNames(query) {
      elements.searchInput.value = query;
      const conflicts = conflictMap();
      return currentPackage().pins.filter(pin => pinMatches(pin, conflicts)).map(pin => pin.name);
    },
    boardResourceConflictPins(resourceId) {
      const resource = boardResourceById(resourceId);
      return resource ? boardResourceConflicts(resource).map(item => item.number) : [];
    },
    applyBoardResource(resourceId, enabled) {
      const resource = boardResourceById(resourceId);
      if (resource) applyBoardResourceToggle(resource, enabled);
      return JSON.parse(JSON.stringify(state));
    },
    resetHistory() { historyByProject.clear(); },
    recordHistory(label, mergeKey = '') { recordSnapshot(label, JSON.stringify(state), mergeKey); },
    historySummary() {
      const history = projectHistory();
      return {
        undo: history.undo.map(entry => ({ label: entry.label, mergeKey: entry.mergeKey })),
        redoCount: history.redo.length
      };
    },
    planIssues() { return planIssues().map(issue => ({ ...issue })); },
    exportProjectJson,
    exportWorkspaceJson,
    exportCsv,
    exportGroupedCsv,
    exportConnectorCsv,
    exportKicadCsv,
    csvEscape,
    safeFileName,
    escapeHtml
  };
}
