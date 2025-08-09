import { applyTheme } from "../utopia.js";

const registerSystemSettings = () => {
	game.settings.register(game.system.id, "theme", {
		name: "SETTINGS.themeN",
		hint: "SETTINGS.themeL",
		scope: "client",
		config: true,
		type: new foundry.data.fields.StringField({
			required: true,
			choices: {
				default: "SETTINGS.theme1",
				darkmode: "SETTINGS.theme3"
			},
			initial: "default",
		}),
		default: "default",
		onChange: value => applyTheme(value),
	});
    // Save Delete mode
    game.settings.register("utopia", "deleteSave", {
        name: "SETTINGS.deleteSaveN",
        hint: "SETTINGS.deleteSaveL",
        scope: "client",
        config: true,
        default: false,
        type: Boolean
    });
    // Money Name
    game.settings.register("utopia", "moneyName", {
        name: "SETTINGS.moneyNameN",
        hint: "SETTINGS.moneyNameL",
        scope: "world",
        config: true,
        default: "Gold",
        type: String
    });
    // Money Decimal
    game.settings.register("utopia", "moneyDecimal", {
        name: "SETTINGS.moneyDecimalN",
        hint: "SETTINGS.moneyDecimalL",
        scope: "world",
        config: true,
        default: 2,
		type: Number,
		range: {
			min: 0,
			max: 10,
			step: 1
		}
    });
    // Auto Calculation
	game.settings.register("utopia", "autoCombat", {
		name: "SETTINGS.autoCombatN",
		hint: "SETTINGS.autoCombatL",
		scope: "world",
		config: true,
		default: "force",
		type: String,
		choices: {
			none: "SETTINGS.autoCombat1",
			use: "SETTINGS.autoCombat2",
			force: "SETTINGS.autoCombat3"
		}
	});

    // Auto Damage apply
	game.settings.register("utopia", "autodamageapply", {
		name: "SETTINGS.autodamageapplyN",
		hint: "SETTINGS.autodamageapplyL",
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	});

    //Reaction timer
	game.settings.register("utopia", "reactiontimer", {
		name: "SETTINGS.reactiontimerN",
		hint: "SETTINGS.reactiontimerL",
		scope: "world",
		config: true,
		default: 30,
		type: Number,
		range: {
			min: 1,
			max: 60,
			step: 1
		}
	});
};

export default registerSystemSettings;