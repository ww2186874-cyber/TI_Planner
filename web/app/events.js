function bindEvents() {
  const handlePinClick = event => {
    const button = event.target.closest('.pin-button');
    if (!button || !elements.packageStage.contains(button)) return;
    const pin = currentPackage().pins.find(item => item.number === Number(button.dataset.pin));
    if (!pin) return;
    const value = assignmentFor(pin.number);
    if (!pin.fixed && selectedSignal && value.function !== selectedSignal && assignSignalToPin(pin, selectedSignal)) { render(); return; }
    if (selectedPinNumber === pin.number) {
      selectedPinNumber = null;
      renderStage();
      renderInspector();
      return;
    }
    selectedPinNumber = pin.number;
    renderStage();
    renderInspector();
  };

  const handleBoardResourceChange = event => {
    const toggle = event.target.closest('.board-resource-toggle');
    if (!toggle || !elements.boardResourceControls.contains(toggle)) return;
    const resourceId = toggle.closest('[data-resource]')?.dataset.resource;
    const resource = boardResourceById(resourceId);
    if (!resource) return;
    setBoardResourceEnabled(resource.id, toggle.checked);
    if (isBoardResourceEnabled(resource) !== toggle.checked) renderBoardHardwarePanel();
  };

  const handleCategoryClick = event => {
    const button = event.target.closest('[data-category]');
    if (!button || !elements.categoryList.contains(button)) return;
    activeCategory = button.dataset.category;
    render();
  };

  const handleResourceListClick = event => {
    const groupButton = event.target.closest('[data-resource-group]');
    if (groupButton && elements.resourceList.contains(groupButton)) {
      const groupKey = groupButton.dataset.resourceGroup;
      expandedGroups.has(groupKey) ? expandedGroups.delete(groupKey) : expandedGroups.add(groupKey);
      renderResources();
      return;
    }
    const button = event.target.closest('.resource-instance');
    if (!button || !elements.resourceList.contains(button)) return;
    button.blur();
    const selected = resourceInstance(button.dataset.resource);
    preserveSidebarScroll(() => {
      selectedResourceId = selectedResourceId === button.dataset.resource ? '' : button.dataset.resource;
      selectedSignal = '';
      if (selectedResourceId && selected) expandedGroups.add(selected.group.key);
      elements.resourceList.querySelectorAll('.resource-instance').forEach(item => {
        item.classList.toggle('active', item.dataset.resource === selectedResourceId);
      });
      renderResourceDetail();
      renderStage();
    });
  };

  const handleResourceSignalClick = event => {
    const button = event.target.closest('.resource-signal');
    if (!button || !elements.resourceSignals.contains(button)) return;
    selectedSignal = selectedSignal === button.dataset.signal ? '' : button.dataset.signal;
    elements.resourceSignals.querySelectorAll('.resource-signal').forEach(item => {
      item.classList.toggle('active', item.dataset.signal === selectedSignal);
    });
    renderStage();
  };

  const endPan = event => {
    if (!panState || panState.pointerId !== event.pointerId) return;
    panState = null;
    elements.canvasScroller.classList.remove('panning');
    saveState();
  };

  function beginResize(event, side) {
    resizeState = {
      side,
      startX: event.clientX,
      leftWidth: state.layout.leftWidth,
      rightWidth: state.layout.rightWidth
    };
    const handle = side === 'left' ? elements.leftResizer : elements.rightResizer;
    handle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    event.preventDefault();
  }

  function moveResize(event) {
    if (!resizeState) return;
    const delta = event.clientX - resizeState.startX;
    if (resizeState.side === 'left') {
      const maxLeft = Math.max(190, Math.min(460, window.innerWidth - state.layout.rightWidth - 434));
      state.layout.leftWidth = Math.min(maxLeft, Math.max(190, resizeState.leftWidth + delta));
    } else {
      const maxRight = Math.max(260, Math.min(540, window.innerWidth - state.layout.leftWidth - 434));
      state.layout.rightWidth = Math.min(maxRight, Math.max(260, resizeState.rightWidth - delta));
    }
    applyLayout();
  }

  function endResize() {
    if (!resizeState) return;
    elements.leftResizer.classList.remove('dragging');
    elements.rightResizer.classList.remove('dragging');
    document.body.style.cursor = '';
    resizeState = null;
    saveState();
  }

  elements.projectSelect.addEventListener('change', () => activateProject(elements.projectSelect.value));
  elements.projectMenuBtn.addEventListener('click', event => { event.stopPropagation(); toggleMenu(elements.projectMenuBtn, elements.projectMenu); });
  elements.projectMenu.addEventListener('click', event => {
    const button = event.target.closest('[data-project-action]');
    if (!button) return;
    closeMenus();
    const actions = { new: createNewProject, rename: renameCurrentProject, duplicate: duplicateCurrentProject, 'restore-preset': restoreBoardDefaults, delete: deleteCurrentProject };
    actions[button.dataset.projectAction]?.();
  });
  elements.projectForm.addEventListener('submit', event => {
    event.preventDefault();
    const name = elements.projectNameInput.value.trim();
    if (!name) return;
    if (projectDialogMode === 'new') {
      const presetId = elements.projectPresetSelect.value;
      const project = createProject(uniqueProjectName(name), presetId ? createPresetState(presetId) : createEmptyState());
      workspace.projects.push(project);
      workspace.activeProjectId = project.id;
      state = project.data;
      resetTransientSelection();
      saveState();
      render();
    } else {
      const project = currentProjectRecord();
      project.name = name.slice(0, 48);
      project.updatedAt = new Date().toISOString();
      saveState();
      renderProjectSelect();
    }
    elements.projectDialog.close();
  });
  elements.deviceSelect.addEventListener('change', () => {
    state.activeDevice = elements.deviceSelect.value;
    expandedGroups = new Set(['Timer']);
    resetTransientSelection();
    saveState();
    render();
  });
  elements.packageSelect.addEventListener('change', () => {
    currentDeviceState().activePackage = elements.packageSelect.value;
    resetTransientSelection();
    saveState();
    render();
  });
  elements.sidebarViewTabs.addEventListener('click', event => {
    const button = event.target.closest('[data-view]');
    if (!button) return;
    sidebarView = button.dataset.view;
    if (sidebarView === 'pins') { selectedResourceId = ''; selectedSignal = ''; }
    render();
  });
  elements.searchInput.addEventListener('input', () => {
    if (sidebarView === 'resources') resourceCatalog().forEach(group => expandedGroups.add(group.key));
    render();
  });
  elements.filterTabs.addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    activeFilter = button.dataset.filter;
    render();
  });
  elements.categoryList.addEventListener('click', handleCategoryClick);
  elements.resourceList.addEventListener('click', handleResourceListClick);
  elements.resourceSignals.addEventListener('click', handleResourceSignalClick);
  elements.packageStage.addEventListener('click', handlePinClick);
  elements.boardResourceControls.addEventListener('change', handleBoardResourceChange);
  elements.zoomSlider.addEventListener('input', () => setZoom(Number(elements.zoomSlider.value)));
  elements.rotateCcwBtn.addEventListener('click', () => {
    currentView().rotation = (currentView().rotation + 270) % 360;
    saveState();
    render();
  });
  elements.rotateCwBtn.addEventListener('click', () => {
    currentView().rotation = (currentView().rotation + 90) % 360;
    saveState();
    render();
  });
  elements.fitViewBtn.addEventListener('click', () => fitView());
  elements.centerViewBtn.addEventListener('click', () => centerView());
  elements.canvasScroller.addEventListener('wheel', event => {
    event.preventDefault();
    const rect = elements.canvasScroller.getBoundingClientRect();
    const factor = Math.exp(-event.deltaY * 0.0015);
    setZoom(currentView().zoom * factor, { x: event.clientX - rect.left, y: event.clientY - rect.top });
  }, { passive: false });
  elements.canvasScroller.addEventListener('contextmenu', event => event.preventDefault());
  elements.canvasScroller.addEventListener('pointerdown', event => {
    const touchPan = event.pointerType === 'touch' && !event.target.closest('.pin-button');
    if (event.button !== 2 && !touchPan) return;
    panState = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: currentView().x, y: currentView().y };
    elements.canvasScroller.setPointerCapture(event.pointerId);
    elements.canvasScroller.classList.add('panning');
    event.preventDefault();
  });
  elements.canvasScroller.addEventListener('pointermove', event => {
    if (!panState || panState.pointerId !== event.pointerId) return;
    currentView().x = panState.x + event.clientX - panState.startX;
    currentView().y = panState.y + event.clientY - panState.startY;
    currentView().initialized = true;
    applyView();
  });
  elements.canvasScroller.addEventListener('pointerup', endPan);
  elements.canvasScroller.addEventListener('pointercancel', endPan);
  elements.undoBtn.addEventListener('click', undo);
  elements.redoBtn.addEventListener('click', redo);
  elements.exportMenuBtn.addEventListener('click', event => { event.stopPropagation(); toggleMenu(elements.exportMenuBtn, elements.exportMenu); });
  elements.exportMenu.addEventListener('click', event => {
    const button = event.target.closest('[data-export]');
    if (button) runExport(button.dataset.export);
  });
  elements.checkBtn.addEventListener('click', showCheckDialog);
  elements.aboutBtn.addEventListener('click', showAboutDialog);
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.closeDialog)?.close()));
  document.addEventListener('click', event => {
    if (!event.target.closest('.menu-wrap')) closeMenus();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenus();
    const editing = event.target.matches?.('input, textarea, select');
    if (editing || !(event.ctrlKey || event.metaKey)) return;
    if (event.key.toLowerCase() === 'z' && !event.shiftKey) { event.preventDefault(); undo(); }
    if (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey)) { event.preventDefault(); redo(); }
  });
  elements.leftResizer.addEventListener('mousedown', event => beginResize(event, 'left'));
  elements.rightResizer.addEventListener('mousedown', event => beginResize(event, 'right'));
  window.addEventListener('mousemove', moveResize);
  window.addEventListener('mouseup', endResize);
  elements.functionSelect.addEventListener('change', () => updateSelectedAssignment({ function: elements.functionSelect.value }));
  elements.aliasInput.addEventListener('input', () => updateSelectedAssignment({ alias: elements.aliasInput.value }, false, `alias-${selectedPinNumber}`));
  elements.connectorInput.addEventListener('input', () => updateSelectedAssignment({ connector: elements.connectorInput.value }, false, `connector-${selectedPinNumber}`));
  elements.noteInput.addEventListener('input', () => updateSelectedAssignment({ note: elements.noteInput.value }, false, `note-${selectedPinNumber}`));
  elements.clearPinBtn.addEventListener('click', () => {
    const pin = selectedPin();
    if (!pin) return;
    commitMutation(`清除 Pin ${pin.number}`, () => { delete assignments()[String(pin.number)]; });
  });
  elements.importBtn.addEventListener('click', () => elements.importFile.click());
  elements.importFile.addEventListener('change', () => { const file = elements.importFile.files?.[0]; if (file) importJson(file); });
  elements.resetBtn.addEventListener('click', () => {
    const pkg = currentPackage();
    if (!window.confirm(`确定清空 ${state.activeDevice} ${pkg.label} 的全部引脚安排吗？其他芯片和封装不会受影响。`)) return;
    selectedPinNumber = null;
    selectedSignal = '';
    commitMutation(`清空 ${state.activeDevice} ${pkg.label}`, () => {
      currentDeviceState().packages[currentDeviceState().activePackage].assignments = {};
      // Clearing a package also clears board-resource planning state. Keep the
      // board identity and its permanent annotations so switching back remains
      // informative without silently re-enabling hardware.
      state.enabledBoardResources = [];
    });
  });
  new ResizeObserver(() => { if (!currentView().initialized) fitView(false); }).observe(elements.canvasScroller);
}
