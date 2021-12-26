const MODULE_ID = 'qol-maximize-reopened-sheets'
const currentlyOpenedSheetWindows = {}
// special workaround for all the "new" objects created and immediately rendered
const SPECIAL_SHEETS = [
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
 *
 * (overrides both DocumentSheet.render() and Application.render())
 */
function renderWrapper (wrapped, ...args) {
  // Avoid wrapping if module is disabled through settings
  if (game.settings.get(MODULE_ID, 'disable-for-current-user')) {
    return wrapped(...args)
  }
  const sheetId = this.id
  if (BAD_SHEETS.some(badSheetId => badSheetId === sheetId)) {
    // For some reason Foundry doesn't assign separate IDs to some config sheets, so only one window acn be opened.  probably a foundry bug?
    return wrapped(...args)
  }
  // If the sheet is already rendered:
  if (this.rendered) {
    this.bringToTop()
    return this.maximize()
  }
  // Special workaround check for some special settings sheets
  const existingOpenSheet = currentlyOpenedSheetWindows[sheetId]
  if (existingOpenSheet) {
    // If an existing sheet is already rendered (as a different instance), reuse it and ignore the new one
    if(existingOpenSheet.rendered) {
      existingOpenSheet.bringToTop()
      return existingOpenSheet.maximize()
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
  // Otherwise render the sheet as normal
  // (keeping it in memory if it needs a workaround later)
  if (SPECIAL_SHEETS.some(specialSheetId => sheetId.startsWith(specialSheetId))) {
    currentlyOpenedSheetWindows[sheetId] = this
  }
  return wrapped(...args)
}

Hooks.once('setup', function () {
  if (typeof(libWrapper) === 'undefined' || !libWrapper) return ui.notifications.error('LibWrapper should be installed')
  libWrapper.register(
    MODULE_ID,
    'DocumentSheet.prototype.render',
    renderWrapper,
    libWrapper.MIXED,
  )
  libWrapper.register(
    MODULE_ID,
    'Application.prototype.render',
    renderWrapper,
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