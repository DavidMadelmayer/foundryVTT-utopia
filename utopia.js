import {utopia} from "./system/config.js";
import utopiaItem from "./module/documents/item.js";
import utopiaActor from "./module/documents/actor.js";
import utopiaActorSheet from "./module/sheets/actor-sheet.js";
import utopiaShopSheet from "./module/sheets/shop-sheet.js";

import utopiaItemSheet from "./module/sheets/item-sheet.js";
//Handelbar Helpers
import registerHandlebarsHelpers from "./system/register-helpers.js";
//System settings
import registerSystemSettings from "./system/settings.js";

import { utopiaSockets } from "./system/sockets.js";

import { mocha } from "./system/testing.js";

async function preloadHandlebarsTemplates() {
	const templatePaths = [
		"systems/utopia/templates/actor/parts/attributes-block.hbs",
		"systems/utopia/templates/actor/parts/effects-block.hbs",
		"systems/utopia/templates/actor/parts/features-block.hbs",
		"systems/utopia/templates/actor/parts/inventory-block.hbs",

		"systems/utopia/templates/actor/parts/consumable-partial.hbs",
		"systems/utopia/templates/actor/parts/material-partial.hbs",
		"systems/utopia/templates/actor/parts/weapon-partial.hbs",
		"systems/utopia/templates/actor/parts/equipment-partial.hbs",
		"systems/utopia/templates/actor/parts/talent-partial.hbs",
		"systems/utopia/templates/actor/parts/talentTree-partial.hbs",

		"systems/utopia/templates/actor/parts/item-Header.hbs",

		"systems/utopia/templates/item/parts/header-weight.hbs",
		"systems/utopia/templates/item/parts/footer-weight.hbs",

		"systems/utopia/templates/actor/parts/simItem-partial.hbs",

		"systems/utopia/templates/actor/parts/shop-item-partial.hbs",
	];
	
	return loadTemplates(templatePaths);
};

Hooks.once('init', function() {
	console.log("Utopia Initialising");
	
	CONFIG.utopia = utopia;
	CONFIG.Item.documentClass = utopiaItem;
	CONFIG.Actor.documentClass = utopiaActor;

	//Register new sheets And make default
	Actors.unregisterSheet("core", ActorSheet);
	Actors.registerSheet("utopia", utopiaActorSheet, { makeDefault: true });
	Actors.registerSheet("utopia", utopiaShopSheet, { makeDefault: false });
	//Loot sheet Here
	Items.unregisterSheet("core", ItemSheet);
	Items.registerSheet("utopia", utopiaItemSheet, {makeDefault: true});

	// Handelbar Templates
	preloadHandlebarsTemplates();

	// Handelbar Helpers
	registerHandlebarsHelpers();

	// Register System Settings
	registerSystemSettings();

	// Sockets
	utopiaSockets.register();
});

//Close Windows on delete, if it's a Token with no linked data
Hooks.on("deleteToken", (tokenDocument) => {
	if (!tokenDocument.isLinked) {
	const tokenId = tokenDocument.id;
	const seceneId = tokenDocument.parent._id;
	const currentWindows = Object.values(ui.windows);
	const Id = `utopiaActorSheet-Scene-${seceneId}-Token-${tokenId}`
	currentWindows.forEach((window) => {
		if (window.id === Id) {
		window.close();
		}
	});
	}
});

Hooks.once("ready", () => {
  const theme = game.settings.get("utopia", "theme");
  applyTheme(theme);
});

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
};

//Reset Reactions
//Hook when combat starts
Hooks.on("combatStart", async (combat) => {
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor) continue;
    //Reset reactions to 2
    await actor.update({ "system.reactions": 2 });
  }
});

//Hook on each new round
Hooks.on("combatRound", async (combat) => {
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor) continue;
    //Reset reactions to 2
    await actor.update({ "system.reactions": 2 });
  }
});

Hooks.on("quenchReady", (quench) => mocha(quench));