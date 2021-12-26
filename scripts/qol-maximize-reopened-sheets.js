const MODULE_ID = 'qol-maximize-reopened-sheets'
const currentlyOpenedSheetWindows = {}
// special workaround for all the "new" objects created and immediately rendered
const SINGLE_INSTANCE_APPLICATION_SHEETS = [
  // in _onSettingsButton()
  'module-management',
  'world-config',
  'support-details',
  'keybindings',
  'invitation-links',
  // others where only 1 instance should exist at any given moment
  'grid-config',
  'chat-popout',
  'combat-tracker-config',
]

// bad sheet windows that don't include a specific document ID.  we can't be compatible with them :(
// see https://gitlab.com/foundrynet/foundryvtt/-/issues/6379
const BAD_SHEETS = [
  'user-config',
  'folder-config',
  'drawing-config',
]

/**
 * When trying to render a sheet window that is already opened, the code will maximize it and bring
 * it in front of other sheets.
 *
 * This is already what happens when you click things in the sidebar (see _onClickDocumentName) and
 * when you double-click a token (see _onClickLeft2). This module simply applies the same behavior in all
 * situations instead of only some situations.
 */
function documentSheetRenderWrapper (wrapped, force, options) {
  // Avoid wrapping if module is disabled through settings
  if (game.settings.get(MODULE_ID, 'disable-for-current-user')) {
    return wrapped(force, options)
  }
  if (!force) {
    return wrapped(force, options)
  }
  // If the sheet is already rendered:
  if (this.rendered) {
    maximizeAndBringToTopIfNeeded(this)
  }
  return wrapped(force, options)
}

/**
 * When trying to render a sheet window that is already opened, the code will maximize it and bring
 * it in front of other sheets.
 *
 * This is already what happens when you click things in the sidebar (see _onClickDocumentName) and
 * when you double-click a token (see _onClickLeft2). This module simply applies the same behavior in all
 * situations instead of only some situations.
 *
 * (overrides Application.render())
 */
function applicationRenderWrapper (wrapped, force, options) {
  // Avoid wrapping if module is disabled through settings
  if (game.settings.get(MODULE_ID, 'disable-for-current-user')) {
    return wrapped(force, options)
  }
  if (!force) {
    return wrapped(force, options)
  }
  const sheetId = this.id
  const isSingleInstance = SINGLE_INSTANCE_APPLICATION_SHEETS.some(specialSheetId => specialSheetId === sheetId)
  const isCompatibleApplicationSheet = !BAD_SHEETS.some(badSheetId => badSheetId === sheetId)
  if (!isSingleInstance && !isCompatibleApplicationSheet) {
    return wrapped(force, options)
  }
  if (this.rendered) {
    maximizeAndBringToTopIfNeeded(this)
  // Special workaround check for some special settings sheets
  } else if (isSingleInstance) {
    const existingOpenSheet = currentlyOpenedSheetWindows[sheetId]
    if (existingOpenSheet) {
      // If an existing sheet is already rendered (as a different instance), reuse it and ignore the new one
      if (existingOpenSheet.rendered) {
        maximizeAndBringToTopIfNeeded(existingOpenSheet)
        return
      } else {
        // If we got here it means there's old invalid data in currentlyOpenedSheetWindows
        // so we'll clean it up
        for (const [id, sheet] of Object.entries(currentlyOpenedSheetWindows)) {
          if (!sheet.rendered) {
            delete currentlyOpenedSheetWindows[id]
          }
        }
      }
    }
    // Keep it in memory before rendering it;  next time we try to rerender it we might use this as the existing one
    currentlyOpenedSheetWindows[sheetId] = this
  }
  // Render the sheet as normal
  return wrapped(force, options)
}

const maximizeAndBringToTopIfNeeded = (sheet) => {
  if (document.defaultView.getComputedStyle(sheet.element[0]).zIndex < _maxZ) {
    sheet.bringToTop()
  }
  if (sheet._minimized) {
    sheet.maximize()
  }
}

Hooks.once('setup', function () {
  if (typeof(libWrapper) === 'undefined' || !libWrapper) return ui.notifications.error('LibWrapper should be installed')
  libWrapper.register(
    MODULE_ID,
    'DocumentSheet.prototype.render',
    documentSheetRenderWrapper,
    libWrapper.MIXED,
  )
  libWrapper.register(
    MODULE_ID,
    'Application.prototype.render',
    applicationRenderWrapper,
    libWrapper.MIXED,
  )
})

Hooks.once('init', function () {
  game.settings.register(MODULE_ID, 'disable-for-current-user', {
    name: 'Disable for current user',
    hint: "You can disable this if you don't this minor QoL improvement for yourself (but other users want it)." +
      "  When not disabled, this module causes minimized/hidden sheets to always maximize and come to front, instead of" +
      " staying as they were.",
    scope: 'client',
    config: true,
    type: Boolean,
    default: false,
  })
})