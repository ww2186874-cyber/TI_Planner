if (globalThis.__MSPM0_TEST_MODE__) {
  installTestApi();
} else {
  bindEvents();
  saveState();
  if (state) render();
  else createNewProject();
}
