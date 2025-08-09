export async function deleteDialog() {
    let delMode = game.settings.get("utopia", "deleteSave");
    //No Save Delete / No Choice
    if (delMode == false) return true;
    //Dialog
    //Wait for Choice
    return new Promise((resolve, reject) => {
        let choice = false;
        let d = new Dialog({
            title: game.i18n.localize("utopia.dialog.savedelete"),
            content: game.i18n.localize("utopia.dialog.savedeleteT"),
            buttons: {
                one: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize("utopia.dialog.y"),
                callback: () => {choice = true; return resolve(choice)}
                },
                two: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize("utopia.dialog.n"),
                callback: () => {return resolve(choice)}
                }
            },
            default: "two",
            rejectClose: true,
            close: () => {return resolve(choice)}
            });
        d.render(true);
    });
};

export async function diceOfFavor(value = 0, title, content) {
    if (title == null) title = game.i18n.localize("utopia.dialog.rollFavor");
    if (content == null) content = game.i18n.localize("utopia.dialog.rollFavorT");
    //Dialog
    //Wait for Choice
    let favor = await new Promise((resolve, reject) => {
        let choice = 0;
        let d = new Dialog({
            title: title,
            content: content + `<br> <input id="input" type="number" value="${value}" placeholder="${game.i18n.localize("utopia.dialog.rollFavorPlaceholder")}"/>`,
            buttons: {
                one: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize("utopia.dialog.favorP"),
                callback: () => {choice = +1; return resolve(choice)}
                },
                two: {
                icon: '<i class="fa-solid fa-wave-sine"></i>',
                label: game.i18n.localize("utopia.dialog.favorN"),
                callback: () => {return resolve(choice)}
                },
                three: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize("utopia.dialog.favorM"),
                callback: () => {choice = -1; return resolve(choice)}
                }
            },
            default: "two",
            rejectClose: true,
            close: () => {choice = "close";return resolve(choice)}
            });
        d.render(true);
    });
    let input = Number(document.getElementById("input").value);
    if(favor === "close") return favor;
    favor += input;
    return favor;
}

export async function EditLanguage(event, obj) {
    const a = event.currentTarget.closest("a");
    const lang = obj.system.lang;
    let action = "";
    let index = 0;
    if(a == null){
        action = event.currentTarget.closest("input").dataset.action;
        index = event.currentTarget.closest("input").dataset.index;
    }else{
        action = a.dataset.action;
        index = a.dataset.index;
    }
    switch(action){
        case "create":
            lang.push("New Language");
            return obj.update({"system.lang": lang});

        case "edit":
            let inner = event.currentTarget;
            lang[index] = inner.value;
            return obj.update({"system.lang": lang});
            
        case "delete":
            let choice = await deleteDialog();
            if (choice == false){
                return;
            };
            lang.splice(index, 1);
            return obj.update({"system.lang": lang});
    };
}

export async function relativeMath(curValue, sysValue, fixed = 0) {
	if (sysValue == undefined) {
		return curValue;
	}else{
		// Remove any whitespaces around the string
		curValue = curValue.trim();

		const regex = /^([+-/*]\d+(\.\d+)?|\d+(\.\d+)?)/;
		const match = curValue.match(regex);
		if (match) {
			const operator = curValue.charAt(0);
			let number = parseFloat(match[0].slice(1)) || parseFloat(match[0]);

			number = Number(number.toFixed(fixed));
			let newvalue;
			// Check if there's a math operator at the start
			if (operator === "+") {
				newvalue = sysValue + number;
			} else if (operator === "-") {
				newvalue = sysValue - number;
			} else if (operator === "*") {
				newvalue = sysValue * number;
			} else if (operator === "/") {
				newvalue = sysValue / number;
			} else {
				// If no operator (just a number), overwrite X with the number
				newvalue = parseFloat(match[0]);
			}
			return newvalue;
		} else {
			//No Match
			return sysValue;
		};
	};
	
}