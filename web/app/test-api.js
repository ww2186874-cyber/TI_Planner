function installTestApi() {
  globalThis.__MSPM0_TEST_API__ = {
    SCHEMA_VERSION,
    PROJECT_DATA_VERSION,
    DEVICE_ORDER: [...DEVICE_ORDER],
    DEVICE_CONFIG,
    createEmptyState,
    createPresetState,
    createWorkspace,
    normalizeLoaded,
    normalizeWorkspace,
    migrateLegacy,
    loadWorkspace,
    sanitizeAssignments,
    sanitizeView,
    dataFromLegacyExport,
    setState(nextState) {
      state = normalizeLoaded(nextState);
      const project = createProject('测试工程', state);
      workspace = { version: SCHEMA_VERSION, activeProjectId: project.id, projects: [project] };
      elements.searchInput.value = '';
    },
    getState() { return JSON.parse(JSON.stringify(state)); },
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
    csvEscape,
    safeFileName,
    escapeHtml
  };
}
