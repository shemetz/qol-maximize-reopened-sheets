const MODULE_ID = 'qol-maximize-reopened-sheets'

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
  // If the sheet is already rendered:
  if (this.rendered) {
    this.bringToTop()
    return this.maximize()
  }
  // Otherwise render the sheet
  else return wrapped(...args)
}

Hooks.once('setup', function () {
  libWrapper.register(
    MODULE_ID,
    'DocumentSheet.prototype.render',
    renderWrapper,
    'MIXED',
  )
  libWrapper.register(
    MODULE_ID,
    'Application.prototype.render',
    renderWrapper,
    'MIXED',
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