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
  var change = {
    brightSight: document.getFlag(moduleName, brightDistance), 
    dimSight: document.getFlag(moduleName, dimDistance)
  }

  if(useAltVision){
    change = {
      brightSight: document.getFlag(moduleName, altBrightDistance), 
      dimSight: document.getFlag(moduleName, altDimDistance)
    }
  }

  document.update(change);
  ToggleTokenHUDActive(useAltVision);
}

function renderConfig(sheet, html, data) {
  if (!sheet instanceof TokenConfig) {
    return;
  }

  let document = sheet.token;
  const numberInputConfig = numberInputRenderConfigTemplate({
    settings: [
      CreateTokenConfigItem(moduleName, brightDistance, document, "Bright Vision", "Distance"),
      CreateTokenConfigItem(moduleName, dimDistance, document, "Dim Vision", "Distance"),
      CreateTokenConfigItem(moduleName, altDimDistance, document, "Alt Dim Vision", "Distance"),
      CreateTokenConfigItem(moduleName, altBrightDistance, document, "Alt Bright Vision", "Distance")
    ]
  }, {
      allowProtoMethodsByDefault: true,
      allowProtoPropertiesByDefault: true
  });

  const checkBoxConfig = checkBoxInputRenderConfigTemplate({
    settings: [
      CreateTokenConfigItem(moduleName, useAltVision, document, "Use Alt Vision", null)
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

function CreateTokenConfigItem(module, key, document, name, units){
  return {
    module: module,
    key: key,
    value: document.getFlag(module, key),
    name: name,
    units: units
  };
}