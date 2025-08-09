import utopia from "./config.js";

export default function registerHandlebarsHelpers() {
    console.log("Helpers Active");
    console.log(utopia);

    Handlebars.registerHelper("isGM", function(options) {
		let result = "";
		if (game.user.isGM == true) {
			return options.fn(this);
		} else {
			return options.inverse(this);
		};
	});

    Handlebars.registerHelper("noGM", function(content) {
		let result = "";
		if (game.user.isGM == false) {
			result += content.fn(0);
		};
		return result;
	});

    Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {
		switch (operator) {
			case '==':
				return (v1 == v2) ? options.fn(this) : options.inverse(this);
			case '===':
				return (v1 === v2) ? options.fn(this) : options.inverse(this);
			case '!=':
				return (v1 != v2) ? options.fn(this) : options.inverse(this);
			case '!==':
				return (v1 !== v2) ? options.fn(this) : options.inverse(this);
			case '<':
				return (v1 < v2) ? options.fn(this) : options.inverse(this);
			case '<=':
				return (v1 <= v2) ? options.fn(this) : options.inverse(this);
			case '>':
				return (v1 > v2) ? options.fn(this) : options.inverse(this);
			case '>=':
				return (v1 >= v2) ? options.fn(this) : options.inverse(this);
			case '&&':
				return (v1 && v2) ? options.fn(this) : options.inverse(this);
			case '||':
				return (v1 || v2) ? options.fn(this) : options.inverse(this);
			default:
				return options.inverse(this);
		}
	});

	Handlebars.registerHelper("talentIndex", function(v1) {
		return 100-v1;
	});

	Handlebars.registerHelper("talentPos", function(v1) {
		return 0*v1;
	});

	Handlebars.registerHelper("talentColor", function(v1, v2) {
		let color = "transparent"
		if(v1[v2+1] !== undefined) {
			let nextElement = v1[v2+1];
			let nextColor = nextElement.system.color;
			color = nextColor;
		}
		return color;
	});

	Handlebars.registerHelper("ifItemNotOwned", function (options) {
		// Item has Parrent
		let parrent = options.data.root.item.parent;
		if (!parrent || !(parrent instanceof Actor)) {
			//No Parrent
			return options.fn(this);
		} else {
			return options.inverse(this);
		};
	});

	Handlebars.registerHelper("moneyName", function(v1) {
		return game.settings.get("utopia", "moneyName");
	});
};