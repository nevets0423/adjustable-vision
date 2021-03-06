const moduleName = "adjustable-vision";
const altDimDistance = "altDimDistance";
const altBrightDistance = "altBrightDistance";
const dimDistance = "realDimDistance";
const brightDistance = "realBrightDistance";
const useAltVision = "useAltVision";
const numberInputRenderConfigTemplate = Handlebars.compile(`\
    {{#*inline "settingPartial"}}
    <div class="form-group">
        <label>{{this.name}}{{#if this.units}} <span class="units">({{ this.units }})</span>{{/if}}:</label>
        <input type="number" step="0.1" name="flags.{{this.module}}.{{this.key}}" value="{{this.value}}"/>
    </div>
    {{/inline}}

    {{#each settings}}
    {{> settingPartial}}
    {{/each}}`
);
const checkBoxInputRenderConfigTemplate = Handlebars.compile(`\
    {{#*inline "settingPartial"}}
    <div class="form-group">
      <label>{{this.name}}:</label>
      <input type="checkbox" name="flags.{{this.module}}.{{this.key}}" data-dtype="Boolean" {{checked this.value}}/>
    </div>
    {{/inline}}

    {{#each settings}}
    {{> settingPartial}}
    {{/each}}`
);
const tokenHUDButtonTemplate = $(`<div class="control-icon avtoggle"><i class="adjustableVision-eye"></i></div>`);

Hooks.on("init", RegisterGameSettings);
Hooks.on("ready", SetupAllTokensAlreadyOnTheBoard);
Hooks.on("createToken", SetDefaultTokenValues);
Hooks.on("updateToken", UpdateToken);
Hooks.on("renderTokenConfig", renderConfig);
Hooks.on("renderTokenHUD", RenderTokenHUD);

function RegisterGameSettings(){
  RegisterGlobalGameSetting(altDimDistance, "Default Alt Dim Vision", "Default Alternent Value for the tokens Dim Vision", Number, 0);
  RegisterGlobalGameSetting(altBrightDistance, "Default Alt Bright Vision", "Default Alternent Value for the tokens Bright Vision", Number, 0);
}

function RegisterGlobalGameSetting(setting, name, hint, type, defaultValue){
  game.settings.register(moduleName, setting, {
    name: name,
    hint: hint,
    scope: "world",
    config: true,
    type: type,
    default: defaultValue
  });
}

function SetupAllTokensAlreadyOnTheBoard(){
  canvas.tokens.placeables.forEach(token => {
    SetDefaultTokenValues(token, null, null)
  });
}

function SetDefaultTokenValues(token, options, userId){
  token.data.document.setFlag(moduleName, brightDistance, token.data.brightSight);
  token.data.document.setFlag(moduleName, dimDistance, token.data.dimSight);
  token.data.document.setFlag(moduleName, altBrightDistance, game.settings.get(moduleName, altBrightDistance));
  token.data.document.setFlag(moduleName, altDimDistance, game.settings.get(moduleName, altDimDistance));
}

function RenderTokenHUD(app, html, data){
  if(!game.user.isGM){
    return;
  }

  var tokenHUDButton = GetTokenHUDButtonHTML(data._id);
  html.find(".col.left").prepend(tokenHUDButton);

  html.find(".col.left").on("click", ".control-icon.avtoggle", (event) => {
    TokenHUDButtonOnClick(data._id, tokenHUDButton)
  });
}

function GetTokenHUDButtonHTML(tokenId){
  var token = canvas.tokens.controlled.find(t => t.data._id == tokenId);
  let $tokenHUDButton = tokenHUDButtonTemplate;
  $tokenHUDButton.toggleClass("active", token.data.document.getFlag(moduleName, useAltVision) || false);
  return $tokenHUDButton;
}

function TokenHUDButtonOnClick(tokenId){
  var token = canvas.tokens.controlled.find(t => t.data._id == tokenId);
  var selected = !token.data.document.getFlag(moduleName, useAltVision);

  ToggleTokenHUDActive(selected);
  token.document.setFlag(moduleName, useAltVision, selected);
}

function UpdateToken(token, updates){
  if(updates == null || !("flags" in updates) || !(moduleName in updates.flags)){
    return;
  }
  SetSightInfo(token, token.data.document.getFlag(moduleName, useAltVision) || false);
}

function ToggleTokenHUDActive(active){
  $('.adjustableVision-eye').parent().toggleClass("active", active);
}

function SetSightInfo(token, useAltVision){
  var document = token.data.document;
  var change = CreateChangeSet(document.getFlag(moduleName, brightDistance), 0, document.getFlag(moduleName, dimDistance), 0);

  if(useAltVision){
    change = CreateChangeSet(
      document.getFlag(moduleName, altBrightDistance),
      game.settings.get(moduleName, altBrightDistance),
      document.getFlag(moduleName, altDimDistance), 
      game.settings.get(moduleName, altDimDistance)
    );
  }
  document.update(change);
  ToggleTokenHUDActive(useAltVision);
}

function CreateChangeSet(brightValue, brightDefault, dimValue, dimDefault){
  return {
    brightSight: (brightValue == null || brightValue == undefined) ? brightDefault : brightValue, 
    dimSight: (dimValue == null || dimValue == undefined) ? dimDefault : dimValue
  }
}

function renderConfig(sheet, html, data) {
  if (!sheet instanceof TokenConfig) {
    return;
  }

  let document = sheet.token;
  const numberInputConfig = numberInputRenderConfigTemplate({
    settings: [
      CreateTokenConfigItem(moduleName, brightDistance, 0, document, "Bright Vision", "Distance"),
      CreateTokenConfigItem(moduleName, dimDistance, 0, document, "Dim Vision", "Distance"),
      CreateTokenConfigItem(moduleName, altDimDistance, game.settings.get(moduleName, altDimDistance), document, "Alt Dim Vision", "Distance"),
      CreateTokenConfigItem(moduleName, altBrightDistance, game.settings.get(moduleName, altBrightDistance), document, "Alt Bright Vision", "Distance")
    ]
  }, {
      allowProtoMethodsByDefault: true,
      allowProtoPropertiesByDefault: true
  });

  const checkBoxConfig = checkBoxInputRenderConfigTemplate({
    settings: [
      CreateTokenConfigItem(moduleName, useAltVision, false, document, "Use Alt Vision", null)
    ]
  }, {
      allowProtoMethodsByDefault: true,
      allowProtoPropertiesByDefault: true
  });

  html.find(`input[name="brightSight"]`).parent().after(numberInputConfig);
  html.find(`input[name="vision"]`).parent().after(checkBoxConfig);

  $('input[name="dimSight"]').parent().hide();
  $('input[name="brightSight"]').parent().hide();
}

function CreateTokenConfigItem(module, key, _default, document, name, units){
  var value = document.getFlag(module, key);
  return {
    module: module,
    key: key,
    value: (value == null || value == undefined) ? _default : value,
    name: name,
    units: units
  };
}