if (globalThis.__MSPM0_TEST_MODE__) {
  installTestApi();
} else {
  bindEvents();
  render();
  saveState();
}
