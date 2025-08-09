import { deleteDialog, diceOfFavor, EditLanguage, relativeMath } from "../helpers/multi.js";
import { blockDialogSocket, applyDamage } from "../../system/sockets.js";

export default class utopiaActorSheet extends ActorSheet {
    get template() {
		return `systems/utopia/templates/actor/${this.actor.type}-sheet.hbs`;
	};
    async getData() {
		const data = super.getData();

        data.charConstr = CONFIG.utopia.charConstr;
        data.npc = CONFIG.utopia.npcConstr;

        //Inventory
        data.weapons = data.items.filter(i => i.type === "weapon");
        data.equipment = data.items.filter(i => i.type === "equipment");
        data.consumable = data.items.filter(i => i.type === "consumable");
        data.material = data.items.filter(i => i.type === "material");
        //Attributes
        data.talent = data.items.filter(i => i.type === "talent");
        data.talentTree = data.items.filter(i => i.type === "talentTree");

        //Favorites
        data.favWeapon = data.weapons.filter(i => i.system.favor === true);
        data.favEquipment = data.equipment.filter(i => i.system.favor === true);
        data.favConsumable = data.consumable.filter(i => i.system.favor === true);
        data.favMaterial = data.material.filter(i => i.system.favor === true);
        data.favTalent = data.talent.filter(i => i.system.favor === true);

        //Simulation
        data.simItemFriend = data.items.filter(i => i.type === "simItem" && i.system.IFF == true);
        data.simItemFoe = data.items.filter(i => i.type === "simItem" && i.system.IFF == false);

        return data;

    };

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["character", "npc", "vehicle"],
            width: 675,
            height: 765,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes" }]
        });
    }
    
    activateListeners(html) {
        super.activateListeners(html);
        new ContextMenu(html, ".rightmenu", this.itemConextMenu);
        new ContextMenu(html, ".splitmenu", this.itemMenuwSplit);
        //Owner Only Listeners
        if (this.actor.isOwner){
			html.find(".item-edit").click(this._onItemEdit.bind(this));
            html.find(".trait-roll").click(this.rollTrait.bind(this));
            html.find(".inline-edit").change(this._onInlineEdit.bind(this));
            //Toggle Active Effects
            html.find(".toggle-effect").click(this._onToggleEffect.bind(this));
            //USe Effect
            html.find(".item-use").click(this._onTriggerEffect.bind(this));
            //Edit Languages
            html.find(".editLang").click(this._editLang.bind(this));
            html.find(".editLangIN").change(this._editLang.bind(this));

            html.find(".edit-rel").change(this._onEditwRelActor.bind(this));

            html.find(".quickAction").click(this._quickAction.bind(this));

            html.find(".sim-switchTeam").click(this._switchTeam.bind(this));
            html.find(".add-simItem").click(this._addSimItem.bind(this));
            html.find(".simulate").click(this._simulate.bind(this));
            //Toggle Equip
            html.find(".toggle-equip").click(this._toggleEquip.bind(this));
        };
        html.find(".weapon-atk").click(this._attack.bind(this));
        html.find(".select-all").focus(this._onSelectAll.bind(this));
    };

    itemConextMenu = [
		{
			name: game.i18n.localize("utopia.char.itemedit"),
			icon: '<i class="fas fa-edit"></i>',
			callback: element => {
				let itemId = element.closest(".item").data("itemId");
				let item = this.actor.items.get(itemId);
				item.sheet.render(true);
			}
		},
		{
			name: game.i18n.localize("utopia.char.trash"),
			icon: '<i class="fas fa-trash" style="color: #ee3227;"></i>',
			callback: async element => {
                let choice = await deleteDialog();
                if (choice == false){
                    return;
                };
                return this.actor.deleteEmbeddedDocuments("Item", [element.data("itemId")]);
			}
		}
	]

    itemMenuwSplit = [
		{
			name: game.i18n.localize("utopia.char.itemedit"),
			icon: '<i class="fas fa-edit"></i>',
			callback: element => {
				let itemId = element.closest(".item").data("itemId");
				let item = this.actor.items.get(itemId);
				item.sheet.render(true);
			}
		},
		{
			name: game.i18n.localize("utopia.char.split"),
			icon: '<img class="icon" src="systems/utopia/assets/icons/system/split.svg" width="auto" height="14"></img> &nbsp;&nbsp;',
			callback: element => {
				let itemId = element.closest(".item").data("itemId");
				const item = this.actor.items.get(itemId);
				const actor = this.actor;
				if (item.system.amount <= 1) {
					ui.notifications.error(game.i18n.localize("utopia.info.noamount"));
					return;
				};
				let d = new Dialog({
				 title: game.i18n.localize("utopia.dialog.split"),
				 content: game.i18n.localize("utopia.dialog.splitT") + "<input name='nrsplit' class='' id='nrsplit' type='number' data-dtype='Number' value='' />",
				 buttons: {
				  zero: {
				   icon: '<i class="fas fa-check"></i>',
				   label: game.i18n.localize("utopia.dialog.y"),
				   callback: () => dialogfinished(actor, item)
				  },
				  one: {
				   icon: '<i class="fas fa-times"></i>',
				   label: game.i18n.localize("utopia.dialog.n")
				  }
				 },
				rejectClose: true,
				});
				d.render(true);
				async function dialogfinished(actor, item) {
					let nrsplit = document.getElementById("nrsplit").value;
					let nrstack = item.system.amount;
                    //Empty = Half
					if (nrsplit == 0 || nrsplit == "") {
						nrsplit = Math.floor(nrstack / 2);
					};
                    nrsplit = Math.floor(nrsplit);
                    //New item has more Amount than old
					if (nrsplit >= nrstack) {
						return;
					};
                    //New Item
					let newamount = item.system.amount - nrsplit;
					let newitem = {
						system: item.system,
						img: item.img,
						name: item.name,
						permission: item.permission,
						type: item.type,
					};
					item.system.amount = newamount;
					//let wait = item.update({system: {amount: newamount}});
                    await item.update({system: {amount: newamount}});

					newitem.system.amount = nrsplit;
                    return actor.createEmbeddedDocuments("Item", [newitem]);

					wait.then(function(){
						return actor.createEmbeddedDocuments("Item", [newitem]);
					});
				};
			}
		},
		{
			name: game.i18n.localize("utopia.char.merge"),
			icon: '<img class="icon" src="systems/utopia/assets/icons/system/merge.svg" width="auto" height="14"></img> &nbsp;&nbsp;',
			callback: async element => {
				let itemId = element.closest(".item").data("itemId");
				const item = this.actor.items.get(itemId);
				const actor = this.actor;

				let sameNameMerge = actor.items.filter(i => i.type == item.type && i.name == item.name);
				if (sameNameMerge.length < 2) {
					ui.notifications.error(game.i18n.localize("utopia.info.lessthantwo"));
					return;
				};
                //Item System Type
                if(item.system.type !== undefined || item.system.type !== ""){
                    sameNameMerge = sameNameMerge.filter(i => i.system.type == item.system.type);
                }

				let totalamount = 0;
				let ids = []
                //Loop every exept first
				for (let i = 1; i < sameNameMerge.length; i++) {
					totalamount += Number(sameNameMerge[i].system.amount);
					ids.push(sameNameMerge[i]._id);
				};
                let firstItem = sameNameMerge[0];
				//let firstamount = sameNameMerge[0].system.amount;
				let sumamount = Number(sameNameMerge[0].system.amount) + Number(totalamount);
				
				firstItem.system.amount = sumamount;
                await firstItem.update({system: {amount: sumamount}});

                return actor.deleteEmbeddedDocuments("Item", ids);
			}
		},
		{
			name: game.i18n.localize("utopia.char.trash"),
			icon: '<i class="fas fa-trash" style="color: #ee3227;"></i>',
			callback: async element => {
                let choice = await deleteDialog();
                if (choice == false){
                    return;
                };
                return this.actor.deleteEmbeddedDocuments("Item", [element.data("itemId")]);
			}
		}
	]
    
    //Open Item for Edit
	//if Item == Ammo&Gear chalculate total cost
	_onItemEdit(event) {
		event.preventDefault();
		let element = event.currentTarget;
		let itemId = element.closest(".item").dataset.itemId;
		let item = this.actor.items.get(itemId);
		item.sheet.render(true);
	}

    //Edit Item insheet
	_onEdit(event) {
		event.preventDefault();
		let element = event.currentTarget;
		let itemId = element.closest(".item").dataset.itemId;
		let item = this.actor.items.get(itemId);
		let field = element.dataset.field;
		return item.update({ [field]: element.value });
	}

    async _onToggleEffect(event) {
        event.preventDefault();
        const itemID = event.currentTarget.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemID);
        const effectsArr = this.actor.effects.contents;
        const effect = effectsArr.filter(e => e.origin.endsWith(itemID));

        if(effect.length == 0){
            return;
        };
        let newStatus = !item.system?.diabled;
        //Loop
        for(const e of effect){
            await e.update({ disabled: newStatus });
        };
        return item.update({ "system.diabled": newStatus });
    }

    async _onTriggerEffect(event) {
        event.preventDefault();
        const actor = this.actor;
        const itemID = event.currentTarget.closest(".item").dataset.itemId;
        const item = actor.items.get(itemID);
        const itemEffect = item.effects.contents;
        let actorChanges = {};
        //Every Effect on Item
        for (const e of itemEffect){
            let changes = e.changes;
            //let disabled = e.disabled;
            //if(disabled)continue;

            //Every Change on Effect
            for (const c of changes){
                let key = c.key;
                if(!key.includes("once."))continue;
                key = key.replace("once.", "");
                let value = Number(c.value);
                if(value === NaN)continue;
                let mode = c.mode;
                let keyArr = key.split(".");
                let actorValue = keyArr.reduce((o, key) => o?.[key], actor);
                let newValue = Number(actorValue) + Number(value); //Base is ADD
                
                switch (mode) {
                    case 0: //Custom
                        //Use Base
                        break;
                    case 1: //Multiply
                        newValue = Number(actorValue) + Number(value);
                        break;
                    case 2: //Add
                        //Use Base
                        break;
                    case 3: //Downgrade
                        newValue = Math.min(Number(actorValue), Number(value));
                        break;
                    case 4: //Upgrade
                        newValue = Math.max(Number(actorValue), Number(value));
                        break;
                    case 5: //Override
                        newValue = Number(value);
                        break;
                    default:
                        newValue = actorValue; //No Change
                        break;
                }
                if(key.includes("value")){
                    let maxKey = key.replace("value", "max");
                    let maxKeyArr = maxKey.split(".");
                    let actorMax = maxKeyArr.reduce((o, key) => o?.[key], actor);
                    if(newValue > actorMax) newValue = actorMax;
                };
                if(newValue < 0){
                    ui.notifications.warn(game.i18n.localize("utopia.info.negativeValue"));
                    return;
                };
                actorChanges[key] = newValue;

                //await actor.update({ [key]: newValue });
            };
        };
        await actor.update(actorChanges);
        ui.notifications.info(game.i18n.localize("utopia.info.usedEffect") + item.name);
        return;
    }

    async rollTrait(event) {
        event.preventDefault();
        const mod = event.currentTarget.closest("div").dataset.value;
        const name = event.currentTarget.innerText;
        const actor = this.actor;

        await traitToRoll(actor, name, mod);
        return;
    }

    //Override Drag and Drop Item
    async _onDropItem(event, data) {
        if ( !this.actor.isOwner ) return false;
        const item = await Item.implementation.fromDropData(data);
        const itemData = item.toObject();
        const sourceID = item.parent?.uuid;
        const source = await fromUuid(sourceID);
        const stackableItem = ["consumable", "material"];
        const unTransferable = ["talent", "talentTree"];

        //If Actor is Simulation only allow simItem
        if(this.actor.type == "simulation"){
            if(itemData.type != "simItem"){
                return false;
            };
        };
        //If Actor is not Simulation don't allow simItem
        if(this.actor.type !== "simulation"){
            if(itemData.type == "simItem"){
                return false;
            };
        };
    
        // Handle item sorting within the same Actor
        if ( this.actor.uuid === item.parent?.uuid ) return this._onSortItem(event, itemData);

        //Item can not be transfered from one Actor to another
        //Only from Compendium
        if(unTransferable.includes(itemData.type) && sourceID !== undefined){
            return false;
        };

        //Item is stackable
        if (stackableItem.includes(itemData.type)) {
            //Check Existing
            const sameType = this.actor.items.filter(item => item.type == itemData.type && item.img == itemData.img);
            const first = sameType.find(item => item.name == itemData.name);
            if (first) {
                //Update Amount
                let newAmount = first.system.amount + itemData.system.amount;
                await first.update({ "system.amount": newAmount });
                //Delete Old on Actor
                if (sourceID !== undefined) {
                    await source.deleteEmbeddedDocuments("Item", [itemData._id])
                };
                return;
            };
        };
        //Item is new species
        if(itemData.type == "talentTree" && itemData.system.type == "species"){
            let newSpecies = false;
            newSpecies = await overrideSpecies(this.actor, itemData);
            if(!newSpecies) return;
        };
        // Create the owned item
        await this._onDropItemCreate(itemData, event);
        //Delete Old on Actor
        if (sourceID !== undefined) {
            await source.deleteEmbeddedDocuments("Item", [itemData._id])
        };
    }

    async _attack(event) {
        event.preventDefault();
        const itemID = event.currentTarget.closest(".item").dataset.itemId;
        const actor = this.actor;
        const item = actor.items.get(itemID);
        let action = event.currentTarget.closest("a").dataset.action;
        let skipRanged = true;
        if(action == "hit"){
            skipRanged = false;
        };

        await attackPrepare(actor, item, skipRanged);
    };


    async _editLang(event) {
        event.preventDefault();
        EditLanguage(event, this.actor);
        return;
    }

    async _onEditwRelActor(event) {
		event.preventDefault();
		let element = event.currentTarget;
		let actor = this.actor

        let field = element.name
		let value = Number(element.defaultValue);
		let setValue = element.value;
        let fixed = 0;
        if(element.name == "system.money") {
            fixed = game.settings.get("utopia", "moneyDecimal");
        };
		let newvalue = await relativeMath(setValue, value, fixed);

		//Update after 200ms, to prevent reverting of the value
		setTimeout(RelativeActorRun, 100);
		function RelativeActorRun() {
			actor.update({ [field]: newvalue });
		};
		return;
	}

    _onInlineEdit(event) {
        event.preventDefault();
		let element = event.currentTarget;
		let itemId = element.closest(".item").dataset.itemId;
		let item = this.actor.items.get(itemId);
		let field = element.name;
		return item.update({ [field]: element.value });
    };

    _onSelectAll(event) {
		event.preventDefault();
		let element = event.currentTarget;
		element.select();
	};

    async _quickAction(event) {
        event.preventDefault();
        let element = event.currentTarget;
        let action = element.dataset.action;
        let actor = this.actor;
        await quickAction(actor, action);
    };

    async _switchTeam(event){
        event.preventDefault();
        let element = event.currentTarget;
        let itemId = element.closest(".item").dataset.itemId;
        let item = this.actor.items.get(itemId);
        let iff = item.system.IFF;
        await item.update({ "system.IFF": !iff });
        return;
    };

    async _addSimItem(event) {
        event.preventDefault();
        let element = event.currentTarget;
        let party = element.dataset.party;
        let actor = this.actor;
        await addSimItem(actor, party);
    };

    async _simulate(event) {
        event.preventDefault();
        let actor = this.actor;
        let result = await simulate(actor);
        await renderSimResult(actor, result, event);
        return;
    };

    async _toggleEquip(event) {
        event.preventDefault();
        let element = event.currentTarget;
        let itemId = element.closest(".item").dataset.itemId;
        let item = this.actor.items.get(itemId);
        //New status
        let equipped = !item.system.equipped;
        await item.update({ "system.equipped": equipped });
        //If Item type to toggle Effects
        if(item.type == "equipment"){
            await toggleEffects(this.actor, itemId, !equipped);
            this.render(true);
        };
        return;
    };

}

//END of Class

async function traitToRoll(actor, name, mod, extraFavor = 0) {
    let favor = Number(actor.system.diceOfFavor) + Number(actor.system.tempDOfFav) + extraFavor;
    let choice = await diceOfFavor(favor);
    if (choice === "close")return;

    //Reset TempFavor
    await actor.update({"system.tempDOfFav": 0});

    let dice = Math.max(3+choice, 0);
    //Auto Fail
    if(dice == 0) {
        let messageData = {
            speaker: { actor: actor, alias: actor.name },
            flavor: `<h3>${game.i18n.localize("utopia.dialog.RollFor")} ${name} </h3> <p>${game.i18n.localize("utopia.info.rollAutoFail")}</p>`
        }
        await ChatMessage.create(messageData);
        return;
    };
    
    let rollFormular = `${dice}d6 + @mod`;
    let rollData = {mod: mod};
    let r = await new Roll(rollFormular, rollData)._evaluate();

    //Dice3D Compatibility
    if(game.dice3d !== undefined) {
        game.dice3d.showForRoll({dice: r.dice});
    };

    //Find All d6 that rolled a 6 or 1
    let crit = 0;
    let fail = 0;
    let diceNumber = 0;
    let diceData = {};
    let extra = "";
    for (const die of r.dice[0].results) {
        if (die.result == 6) crit++;
        if (die.result == 1) fail++;
        diceNumber += die.result;
    };
    //Crit Roll = Double Roll
    diceData.total = r._total;
    diceData.tooltip = await r.getTooltip();
	diceData.formula = dice +"d6 + " + r.data.mod;
    if(crit >= 3) {
        diceData.total = diceNumber * 2 + Number(r.data.mod);
        diceData.formula = dice +"d6 * 2 + " + r.data.mod;
        extra = `<p>${game.i18n.localize("utopia.info.rollCrit") }</p>`;
    };
    //Crit Fail = Zero
    if(fail == dice) {
        diceData.total = 0;
        extra = `<p>${game.i18n.localize("utopia.info.rollFail")}</p>`;
    };

    //Message Custom
    //Vanilla template
    //template: "templates/sidebar/chat-message.html",
    let template = "systems/utopia/templates/inchat/chat-roll.hbs";
    const alias = actor.name;
    let chatData = {user: game.user.id,};
    let cardData = {
        ...diceData,
        owner: actor.id
    };
    chatData.speaker = { actor, alias };
    chatData.flavor = `<h3>${game.i18n.localize("utopia.dialog.RollFor")} ${name}</h3>${extra}`;
    chatData.rollMode = "roll";
    chatData.content = await renderTemplate(template, cardData);
    await ChatMessage.create(chatData);

    return diceData.total;
};

async function overrideSpecies(actor, item) {
    //ask if override
    let choice = await new Promise((resolve, reject) => {
        let choice = false;
        let d = new Dialog({
            title: game.i18n.localize("utopia.dialog.inportSpecies"),
            content: game.i18n.localize("utopia.dialog.inportSpeciesT"),
            buttons: {
                one: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize("utopia.dialog.override"),
                callback: () => {choice = true; return resolve(choice)}
                },
                two: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize("utopia.dialog.inportOnly"),
                callback: () => {choice = "importOnly"; return resolve(choice)}
                }
            },
            default: "two",
            rejectClose: true,
            close: () => {return resolve(choice)}
            });
        d.render(true);
    });
    if(!choice) return choice;
    if(choice === "importOnly") return true;  

    let update= {
        system: {
            species: item.name,
            base: {
                block: item.system.blockRating,
                dodge: item.system.dodgeRating,
            },
            attributes: item.system.attributes,
            subtraits: {}
        },
    };
    let langArr = actor.system.lang;
    langArr.push(...item.system.lang);
    update.system.lang = Array.from(new Set(langArr));

    //loop through gifted object
    for (const [key, value] of Object.entries(item.system.gifted)) {
        if(value == true){
            update.system.subtraits[key] = {chk: value};
        };
    };


    await actor.update(update);
    return choice;
}

export async function attackPrepare(actor, item, skipRanged = true) {
    const atkType = item.system.type;
    let ranged = item.system.isRanged;
    let Variable = item.system.variableSet;
    let varNumber = 1;

    let automation = game.settings.get("utopia", "autoCombat");
    //Check Tagets
    let targets = await targetCulling(actor, item);
    if(targets == "Error" && automation == "force"){
        return;
    };
    if(targets?.length == 0  && automation == "force"){
        return ui.notifications.warn(game.i18n.localize("utopia.info.noTargetinRange"));
    };
    if(targets?.length == 0)targets = "Error";
    //AOE Center
    let isAOE = item.system.aoe;
    //AOE Error
    if(automation == "force" && targets.length > 1 && !isAOE){
        //Multi & not AOE
        return ui.notifications.error(game.i18n.localize("utopia.info.weaponNotAOE"));
    };
    let rangeToTarget = 0;
    if(targets !== "Error"){
        if(targets.length >= 1){
            rangeToTarget = targets[0].range;
        };
        if(isAOE && targets.length > 1){
            let aoeCenter = await aoeCenter(targets);
            let actorToken = canvas.tokens.placeables.find(token => token.actor?.id === actor.id);
            if(actorToken){
                rangeToTarget =  canvas.grid.measurePath([actorToken.center, aoeCenter]);
            };
        };
    };

    let staminaCost = item.system.staminaCost;
    let actionCost = item.system.actionCost;
    let damage = item.system.damage;
    let checkArr = [staminaCost, actionCost, damage];
    if(Variable){
        //Variable Dialog
        varNumber = await VariableDialog(); 
        if(varNumber === "close") return;
        //Check for Variable
        for(let i = 0; i < checkArr.length; i++){
            let elem = checkArr[i];
            if(!isNumeric(elem)){
                checkArr[i] = elem.replaceAll("X", varNumber);
                if(i <= 1){
                    let r = await new Roll(checkArr[i], {})._evaluate();
                    checkArr[i] = r.total;
                };
            }else{
                checkArr[i] = Number(elem);
            };
        };
    };

    //Check Stamina
    staminaCost = checkArr[0];
    let staminaMod = actor.system?.mods?.[atkType]?.StamRedu || 0;
    let staminaRedcution = 0;
    if(staminaCost > 0){
        staminaRedcution = Math.max(staminaCost-staminaMod, 1);
    };
    let newStamina = actor.system.stamina.value - staminaRedcution;
    if(newStamina < 0) {
        return ui.notifications.warn(game.i18n.localize("utopia.info.noStamina"));
    };

    //ranged Attack Dex Check
    let rangedRoll = 0;
    if(ranged && skipRanged == false){
        let rangeItem = item.system.range;
        let rangeItemLong = item.system.rangeLong;
        let extraFavor = 0;
        if(targets !== "Error"){
            if(rangeToTarget <= rangeItemLong){
                //Long
                extraFavor = -1;
            };
            if(rangeToTarget <= rangeItem){
                //Close
                extraFavor = 1;
            };
        };
        let name = game.i18n.localize("utopia.subtraits.dex");
        let mod = actor.system?.subtraits?.dex?.mod || 0;
        rangedRoll = await traitToRoll(actor, name, mod, extraFavor);
        //Cancel Roll
        if(rangedRoll == undefined)return;
        //Range Validate
        if(rangedRoll < rangeToTarget)return;
    };

    //remove Stamina from Actor
    await actor.update({"system.stamina.value": newStamina});

    //No Targets Check Can't be Validted
    if(skipRanged == false && targets === "Error")return;

    //Damage
    let damageResult = await damageRoll(actor, item, checkArr[2]);
    let damageType = item.system.damageType;
    if(damageResult == "noDamage")return;
    //No Target
    if(targets === "Error")return;

    let damageArr = [{value: damageResult, type: damageType}]

    //Send hit and damage to Target Player
    let reactionTime = game.settings.get("utopia", "reactiontimer");
    let blockPromises = [];
    let extra = [];
    //For every Target
    for (let i = 0; i < targets.length; i++) {
        let target = targets[i].target;
        let targetActor = target.actor;
        let targetUUID = targetActor.uuid;

        //user that is active;
        const targetUsers = game.users.filter(user => targetActor.testUserPermission(user, "OWNER") && user.active === true);
        if (targetUsers.length === 0) continue; // No owners? Exit.
        let targetUser;
        //GM + 1 Remove GM
        if(targetUsers.length > 1) {
            //first not GM 
            targetUser = targetUsers.find(user => user.isGM === false);
        }else{
            targetUser = targetUsers[0];
        };

        if(targetUser.id == game.user.id){
            //User Is me
            if(item.system.blockable == true && Number(targetActor.system.reactions) > 0){
                blockPromises.push(blockDialogSocket(targetActor, reactionTime, damageArr, item));
                extra.push([targetActor, damageArr, item]);
            }else{
                await applyDamage(targetActor, damageArr, item, "none");
            };
            const results = await Promise.all(blockPromises);

            for (let i = 0; i < results.length; i++) {
                const elem = results[i];
                const dmgItem = extra[i];
                await applyDamage(dmgItem[0], dmgItem[1], dmgItem[2], elem);
            };
        }else{
            initiateBlockRequest(targetUUID, targetUser.id, reactionTime, damageArr, item);
        };
    };
    
};

async function damageRoll(actor, item, damage) {
    const hasDmg = item.system.hasDmg;
    const chatFlavor = item.system.chatFlavor;
    let flavor = `<h3>${item.name}</h3>`;
    if(chatFlavor !== "")flavor += `<p>${chatFlavor}</p>`;
    //No Damage
    if(!hasDmg){
        let messageData = {
            speaker: { actor: actor, alias: actor.name },
            flavor: flavor
        }
        await ChatMessage.create(messageData);
        return "noDamage";
    };
    //Damage Here
    const damageType = item.system.damageType;
    const bonusName = item.system.bonusName;
    let bonus = 0;
    if(actor.system.traits[bonusName]){
        bonus = actor.system.traits[bonusName].mod;
    };
    if(actor.system.subtraits[bonusName]){
        bonus = actor.system.subtraits[bonusName].mod;
    };
    //@mod in Damage Formula für bonus
    let rollData = {mod: bonus};
    let r = await new Roll(damage, rollData)._evaluate();
    let diceData = {
        total: r.total,
        formula: r.formula,
        tooltip: await r.getTooltip()
    };
    let damageResult = r.total;

    //Dice3D Compatibility
    if(game.dice3d !== undefined) {
        game.dice3d.showForRoll({dice: r.dice});
    };

    //Message
    let template = "systems/utopia/templates/inchat/chat-roll.hbs";
    const alias = actor.name;
    let chatData = {user: game.user.id,};
    let cardData = {
        ...diceData,
        owner: actor.id
    };
    chatData.speaker = { actor, alias };
    chatData.flavor = flavor;
    chatData.rollMode = "roll";
    chatData.content = await renderTemplate(template, cardData);
    await ChatMessage.create(chatData);

    return damageResult;
}

async function quickAction(actor, action) {
    let data = CONFIG.utopia.charConstr.quickActions[action];
    let stamUse = data.stamUse;
    let actionUse = data.action;

    let updateData = {
        system: {
            stamina: {
                value: Number(actor.system.stamina.value) - Number(stamUse),
            },
            actions: Number(actor.system.actions) - Number(actionUse),
        }
    };
    if(updateData.system.actions < 0) {
        return ui.notifications.warn(game.i18n.localize("utopia.info.noTurnActions"));
    };
    if(updateData.system.stamina.value < 0 ){
        return ui.notifications.warn(game.i18n.localize("utopia.info.noStamina")); 
    };

    //Special
    switch(action){
        case "aim":
            updateData.system.tempDOfFav = Number(actor.system.tempDOfFav) + 1;
            break;
        case "holdAction":
            updateData.system.reactions = Number(actor.system.reactions) + 1;
            break;
    };

    await actor.update(updateData);

    return;
}

async function VariableDialog(title, content) {
    if (title == null) title = game.i18n.localize("utopia.dialog.VariableSet");
    if (content == null) content = game.i18n.localize("utopia.dialog.VariableSetT");
    //Dialog
    //Wait for Choice
    let favor = await new Promise((resolve, reject) => {
        let choice = 0;
        let d = new Dialog({
            title: title,
            content: content + `<br> <input id="input" type="number" value="1" placeholder="${game.i18n.localize("utopia.dialog.VariableSetPlaceholder")}"/>`,
            buttons: {
                one: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize("utopia.dialog.y"),
                callback: () => {choice = 1; return resolve(choice)}
                },
                two: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize("utopia.dialog.n"),
                callback: () => {choice = "close"; return resolve(choice)}
                }
            },
            default: "two",
            rejectClose: true,
            close: () => {choice = "close"; return resolve(choice)}
            });
        d.render(true);
    });
    let input = Number(document.getElementById("input").value);
    if(favor === "close") return favor;
    return input;
}


function isNumeric(str) {
    if (typeof str != "string") return false
    return !isNaN(str) && !isNaN(parseFloat(str)) 
}

async function targetCulling(actor, item) {
    let weaponType = item.system.type;
	let maxrange = Number(item.system.range);
	let actorId = actor.id;
    let isToken = actor.isToken;
	let actorToken = canvas.tokens.placeables.find(token => token.actor?.id === actorId);
    let tokenCenter = actorToken.center;
    if(isToken){
        tokenCenter = {x: actor.parent.x, y: actor.parent.y};
    };
    
    let automation = game.settings.get("utopia", "autoCombat");
    
	if(actorToken == undefined){
        if(automation == "force"){
            ui.notifications.warn(game.i18n.localize("utopia.info.TokennotOnScene"));
        };
		return "Error";
	};
	if(weaponType == "ranged"){
		maxrange = Number(item.system.rangeLong);
	};
	//For Diagonal Squares;
	let gridDistance = game.scenes.viewed.grid.distance;
	maxrange += Math.round(gridDistance * 41.5)/100;
    //AOE (Add Radius)
    if(item.system.aoe){
        maxrange += Number(item.system.aoeValue);
    };
	let targetArr = Array.from(game.user.targets)
	let newTargets = [];
	if(targetArr.length <= 0){
        if(automation == "force"){
            ui.notifications.warn(game.i18n.localize("NoTargetSelected"));
        };
		return "Error";
	};
	targetArr.forEach(elem => {
		let tokenRange = canvas.grid.measurePath([tokenCenter, elem.center]);
		let range = tokenRange.distance;
		//Check Range and do Culling (max Distance + 0.415 * Square/unit + AOE Radius)
		if(range <= maxrange){
            let newElem = {
                target: elem,
                range: range,
            };
			newTargets.push(newElem);
		};
	});
    if(newTargets.length <= 0){
        if(automation == "force"){
            ui.notifications.warn(game.i18n.localize("NoTargetSelected"));
        };
		return "Error";
	};
	return newTargets;
}

async function aoeCenter(targetArr) {
    if(targetArr.length == 1){
        return targetArr[0].target.center;
    };
    //X, Y Median between maximum and minimum (not average)
    let xArr = targetArr.map(elem => elem.target.center.x);
    let yArr = targetArr.map(elem => elem.target.center.y);
    let x = Math.round((Math.max(...xArr) + Math.min(...xArr)) / 2);
    let y = Math.round((Math.max(...yArr) + Math.min(...yArr)) / 2);
    return {x: x, y: y};
}

async function initiateBlockRequest(ActorUUD, targetUserId, reactionTime, damageArr, item) {
    // Emit block request to the target user
    game.socket.emit("system.utopia", {
        type: "blockRequest",
        userId: targetUserId,
        actorUUID: ActorUUD,
        reactionTime: reactionTime,
        damageArr: damageArr,
        item: item,
    });
    return;
}

async function addSimItem(actor, party) {
    // Open dialog to drag and drop Actor
    //Add to What Column
    let content = `<div id="drop-area" class="drop-field" data-iff="${party}">${game.i18n.localize("utopia.item.dropHere")}</div><ul id='item-list'></ul>`;

    let d = new Dialog({
        title: game.i18n.localize("utopia.dialog.addSimActor"),
        content: content,
        buttons: {
            one: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize("utopia.dialog.y"),
                callback: () => dialogfinished(actor)
            },
            two: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize("utopia.dialog.n")
            }
        },
        render: (html) => {
            const itemList = html.find("#item-list");
            const dropArea = html.find("#drop-area");

            dropArea.on("drop", async (event) => {
                event.preventDefault();
                let data = JSON.parse(event.originalEvent.dataTransfer.getData("text/plain"));
                if (data.type !== "Actor") return;
                let droppedItem = await fromUuid(data.uuid);
                if(droppedItem?.type == "simulation" ) return;
                // Prevent duplicate entries
                let existing = itemList.find(`li[data-item-uuid='${droppedItem.uuid}']`);
                if (existing.length) return;
                // Add item to list
                let li = $(`<li data-item-uuid='${droppedItem.uuid}' style="display: flex; align-items: center; justify-content: space-between;">
                        ${droppedItem.name} 
                        <span class='remove-item' style='cursor: pointer;'>❌</span>
                    </li>`);
                li.find(".remove-item").on("click", () => li.remove());
                itemList.append(li);
            });

            dropArea.on("dragover", (event) => event.preventDefault());
        }
    })
    d.render(true);
    async function dialogfinished(actor) {
        const party = document.getElementById("drop-area").dataset.iff;
        let list = document.getElementById("item-list");
        let itemArr = Array.from(list.children);

        if (!itemArr.length) return ui.notifications.warn(game.i18n.localize("utopia.info.noItemsAdd"));
        let documents = [];
        for (let itemEl of itemArr) {
            let addActor = await fromUuid(itemEl.dataset.itemUuid);
            if (!addActor) continue;
            let modSumm = 0;
            let modifirs = addActor.system.subtraits
            let modCount = 0;
            //For loop over modifirsArr Array
            for (const [key, value] of Object.entries(modifirs)) {
                modSumm += value.mod;
                modCount++;
            };
            let modAverage = modSumm / modCount;
            let IFF = false;
            if(party == "friend"){
                IFF = true;
            };

            let newItem = {
                system: {
                    IFF:	IFF,
                    actionsArr:[],
                    amount: 1,
                    arrives: 1,
                    block: addActor.system.block,
                    dodge: addActor.system.dodge,
                    shp: addActor.system.shp.max,
                    dhp: addActor.system.dhp.max,
                    stamina: addActor.system.stamina.max,
                    actions: 6,
                    reactions: 2,
                    speed: addActor.system.subtraits.speed.mod,
                    dexMod: addActor.system.subtraits.dex.mod,
                    averageMod: modAverage,
                    def: addActor.system.def,
                    reactionUse: "default",
                    actionUse: "default",
                    target: "default"
                },
                type: "simItem",
                name: addActor.name,
                img: addActor.img
            };
            //for item.items
            let itemArr = Array.from(addActor.items);
            let weapons = itemArr.filter(item => item.type === "weapon" && item.system.hasDmg === true);
            for (let i = 0; i < weapons.length; i++){
                let addActorItem = weapons[i];
                let weaponItem = {
                    name: addActorItem.name, 
                    damage: addActorItem.system.damage, 
                    damageType: addActorItem.system.damageType, 
                    stamina: addActorItem.system.staminaCost, 
                    action: addActorItem.system.actionCost, 
                    ranged: addActorItem.system.isRanged
                };
                newItem.system.actionsArr.push(weaponItem);
            };
            
            documents.push(newItem);
        };

        await actor.createEmbeddedDocuments("Item", documents);
        return;
    };
}

async function simulate(actor=[], round=0, rounddata=[], result=[]) {
    let defaultValue = {
        friend: {target: "lowHP", reactionUse: "strong", actionUse: "attack"}, 
        foe: {target: "highHP", reactionUse: "first", actionUse: "attack"}
    };
    // Set up
    if(rounddata.length == 0){
        let items = Array.from(actor.items);
        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            let count = item.system.amount;
            for (let j = 0; j < count; j++) {
                let newID = crypto.randomUUID();
                rounddata.push({
                    name: item.name,
                    system: foundry.utils.deepClone(item.system),
                    id: newID,
                    img: item.img,
                    maxStamina: item.system.stamina,
                    maxShp: item.system.shp,
                    maxDhp: item.system.dhp,
                });
            }
        };
        if(rounddata.length == 0) return;
        let friend = rounddata.filter(item => item.system.IFF == true);
        let foe = rounddata.filter(item => item.system.IFF == false);
        if(friend.length == 0) return;
        if(foe.length == 0) return;
        //Item Set up with damage/stamina/Action
        for (let i = 0; i < rounddata.length; i++) {
            let item = rounddata[i];
            if(!Array.isArray(item.system.actionsArr)){
                item.system.actionsArr = Object.keys(item.system.actionsArr).map((key) => item.system.actionsArr[key]);
            }
            let attacks = item.system.actionsArr.filter(attack => attack.type == "attack");
            attacks.forEach((attack, index) => {
                let damage = 0;
                if(isNumeric(attack.damage)){
                    damage = Number(attack.damage);
                }else{
                    damage = diceToAverage(attack.damage);
                    rounddata[i].system.actionsArr[index].damage = damage;
                };
                rounddata[i].system.actionsArr[index].dmgStamAct = damage/Number(attack.stamina)/Number(attack.action);
                rounddata[i].system.actionsArr[index].dmgPerAct = damage/Number(attack.action);
            });
            //Combine HP
            item.system.hp = item.system.shp + item.system.dhp;
            //Sort strongest Action
            item.system.actionsArr.sort((a, b) => b.dmgPerAct - a.dmgPerAct);
            //Max Damage per Round (One Round 6 Actions)
            let dmgPerRound = 0;
            let actions = item.system.actions;
            for (let j = 0; j < actions;) {
                let attack = item.system.actionsArr.find(item => item.action <= actions);
                if(attack !== undefined){
                    //Attack can be used
                    dmgPerRound += attack.damage;
                    actions -= attack.action;
                }else{
                    //No more Actions
                    if(actions >= 3){
                        //Hold Action
                        item.system.reactions++;
                        actions -= 2;
                    }
                    if(actions >= 1){
                        //Deep Breath
                        item.system.stamina++;
                        actions -= 1;
                    }
                };
            };
            item.system.dmgPerRound = dmgPerRound;
        };
    };
    //console.log(`Round ${round+1}`);
    //Add 6 Stamina to each Creature
    if(round !== 0){
        for (let i = 0; i < rounddata.length; i++) {
            //Add 6 Stamina
            let newStamina = rounddata[i].system.stamina + 6;
            rounddata[i].system.stamina = Math.min(newStamina, rounddata[i].maxStamina);
            //Combine HP
            rounddata[i].system.hp = rounddata[i].system.shp + rounddata[i].system.dhp;
        };
    };
    //Add new Data to Result Round
    if(result[round] == undefined){
        result[round] = foundry.utils.deepClone(rounddata);
    };
    //One Round (both attack)
    for (let i = 0; i < rounddata.length; i++) {
        let creature = rounddata[i];
        //Already Dead
        if(creature?.dead == true) continue;
        if(creature?.dead != undefined){
            creature.dead = true;
        };

        creature.round = round;

        //Get Team
        let team = creature.system.IFF;
        let targets = rounddata.filter(item => item.system.IFF != team);

        //Get Default
        let defaultSetting = defaultValue[team ? "friend" : "foe"];
        let settings = {
            target: creature.system.target,
            reactionUse: creature.system.reactionUse,
            actionUse: creature.system.actionUse
        };
        if(settings.target == "default") settings.target = defaultSetting.target;
        if(settings.reactionUse == "default") settings.reactionUse = defaultSetting.reactionUse;
        if(settings.actionUse == "default") settings.actionUse = defaultSetting.actionUse;
        //Actions
        let actions = creature.system.actions;

        //Get First Alive - Test
        let target = targets.find(item => item.system.dhp > 0)
        if(target?.id == undefined) continue; //All Target Dead

        for (let j = 0; j < actions; ) {
            //Target Priority
            switch(settings.target){
                case "highHP":
                    targets.sort((a, b) => b.system.hp - a.system.hp);
                    break;
                case "lowHP":
                    targets.sort((a, b) => a.system.hp - b.system.hp);
                    break;
                case "highDPS":
                    targets.sort((a, b) => b.system.dmgPerRound - a.system.dmgPerRound);
                    break;
                case "lowDPS":
                    targets.sort((a, b) => a.system.dmgPerRound - b.system.dmgPerRound);
                    break;
                default:
                    break;
            };
            //Get First Alive
            let target = foundry.utils.deepClone(targets.find(item => item.system.dhp > 0));
            if(target?.id == undefined) break; //All Target Dead
            
            //Sort by stamina
            let Action = "attack"
            let sortObj = {
                attack: ["dmgPerAct", "high"],
                noStamina: ["stamina", "low"],
                halfStamina: ["stamina", "low"],
                noShp: ["shp", "high"],
                halfShp: ["shp", "high"],
            };
            let newAction = "attack";
            if(!target){
                Action = "halfStamina";
            };
            let availableActions = creature.system.actionsArr.filter(action => action.amount !== 0 && action.stamina <= creature.system.stamina && action.action <= actions);
            let FilterActions = [];
            if(creature.system.stamina <= creature.maxStamina/2){
                newAction = "halfStamina";
            };
            if(creature.system.shp <= creature.maxShp/2){
                newAction = "halfShp";
            };
            if(creature.system.shp <= 1){
                newAction = "noShp";
            };
            [Action, FilterActions] = await simFilterAction(availableActions, newAction, Action);
            if(FilterActions == undefined){
                newAction = "noStamina";
                [Action, FilterActions] = await simFilterAction(availableActions, newAction, Action);
            };
            if(FilterActions.length == 0){
                //Deep Breath Fallback
                if(actions >= 1){
                    //Deep Breath
                    creature.system.stamina++;
                    actions -= 1;
                };
                continue;
            };
            //Action
            //Sort Actions
            let sortType = sortObj[Action][0];
            let sortDir = sortObj[Action][1];
            if(sortDir == "high"){
                FilterActions.sort((a, b) => b[sortType] - a[sortType]);
            }else{
                FilterActions.reverse((a, b) => a[sortType] - b[sortType]);
            };
            //Use Action
            let action = FilterActions[0];
            creature.system.stamina = Math.min(creature.system.stamina - (action.stamina || 0), creature.maxStamina);
            actions -= action.action;
            //Heal
            creature.system.shp = Math.min(creature.system.shp + (action.shp || 0), creature.maxShp);
            creature.system.dhp = Math.min(creature.system.dhp + (action.dhp || 0), creature.maxDhp);
            if(action.amount > 0){
                action.amount--;
            };
            //is Attack
            if(Action == "attack"){
                if(target?.id == undefined) {
                    //console.log("No Target");
                    continue;
                };
                let resulttarget = result[round].find(item => item.id == target?.id);

                //console.log(`Atk: ${creature.name} -> ${resulttarget.name} ${action.damage} ${action.damageType}`);

                //Damage
                let reaction = resulttarget.system.reactions
                let damage = action.damage;
                let damageType = action.damageType;
                
                //Apply Armor
                damage = Math.max(damage-resulttarget.system.def[damageType], 0);

                //Block Dodge
                if(reaction > 0){
                    resulttarget.system.reactions--;
                    //Block
                    let blockAverage = diceToAverage(resulttarget.system.block);
                    //Dodge
                    let dodgeAverage = Math.round(diceToPercent(resulttarget.system.dodge)); //~less than 84% (μ - σ)

                    if(blockAverage < dodgeAverage && dodgeAverage >= damage){
                        //Dodge 80% chance
                        damage = 0;
                    }else{
                        //Block
                        damage = Math.max(damage-blockAverage, 0);
                    };
                };
                //No Damage
                if(damage == 0) continue;
                // resulttarget.damage = resulttarget.damage + damage || damage;
                // continue

                //OLD Damage Apply
                let targetcreature = rounddata.find(item => item.id == target.id);
                //Apply Damage
                if(targetcreature.system.shp > damage){
                    targetcreature.system.shp -= damage;
                    damage = 0;
                }else{
                    damage -= targetcreature.system.shp;
                    targetcreature.system.shp = 0;
                };
                if(damage > 0){
                    targetcreature.system.dhp -= damage;
                };
                if(targetcreature.system.dhp <= 0){
                    //Target is Dead can still play if he has't played this round
                    targetcreature.dead = false;
                    //Target has played this round and is Dead
                    if(targetcreature?.round == round){
                        targetcreature.dead = true;
                    };
                };
                //Update Total HP Value
                targetcreature.system.hp = targetcreature.system.shp + targetcreature.system.dhp;
            };
        };
        
    };
    //console.log(...result[round]);
    //End (one party is dead or gone)
    let aliveFriend = rounddata.find(item => item.system.IFF == true && item.system.dhp > 0);
    let aliveFoe = rounddata.find(item => item.system.IFF == false && item.system.dhp > 0);
    if(!aliveFriend || !aliveFoe){
        //Add Last Round
        result.push(rounddata);
        return result
    };

    //Continue (next round)
    return simulate([], round+1, rounddata, result);
}

async function simFilterAction(availableActions, newAction, Action){
    let FilterActions = availableActions.filter(attack => attack.type == newAction);
    if(FilterActions.length !== 0){
        return [newAction, FilterActions];
    };
    FilterActions = availableActions.filter(attack => attack.type == Action);
    if(FilterActions.length !== 0){
        return [Action, FilterActions];
    };
    return [Action, []];
}

function diceToAverage(dice) {
    if(!isNaN(dice)) return dice;
    if(isNumeric(dice)) return dice;
    let diceArr = dice.split(/([\+\-\*\/])/g);
    let average = 0;
    for (let i = 0; i < diceArr.length; i++) {
        let part = diceArr[i];
        if(part.includes("d")){
            //Dice
            let DiceAmount = Number(part.match(/[0-9]+(?=d)/g));
            let DiceFace = Number(part.match(/d[0-9]+/g)[0].replace("d", "")); 
            let diceAver = (DiceFace + 1)/2;
            average += diceAver*DiceAmount;
        }else{
            //math
            switch(part){
                case "+":
                    average += Number(diceArr[i+1]);
                    break;
                case "-":
                    average -= Number(diceArr[i+1]);
                    break;
                default:
                    average += Number(part);
                    break;
            }
        }
    }
    return average;
};

function diceToPercent(dice, percent=-1) {
    if(!isNaN(dice)) return dice;
    if(isNumeric(dice)) return dice;
    let diceArr = dice.split(/([\+\-\*\/])/g);
    let average = 0;
    let diviation = 0;
    for (let i = 0; i < diceArr.length; i++) {
        let part = diceArr[i];
        if(part.includes("d")){
            //Dice
            let DiceAmount = Number(part.match(/[0-9]+(?=d)/g));
            let DiceFace = Number(part.match(/d[0-9]+/g)[0].replace("d", "")); 
            diviation += Math.sqrt(DiceAmount*((DiceFace ** 2)-1)/12);
            let diceAver = (DiceFace + 1)/2;
            average += diceAver*DiceAmount;
        }else{
            //math
            switch(part){
                case "+":
                    average += Number(diceArr[i+1]);
                    break;
                case "-":
                    average -= Number(diceArr[i+1]);
                    break;
                default:
                    average += Number(part);
                    break;
            }
        }
    };
    let result = average + diviation*percent;
    return result;
};

async function renderSimResult(actor, result, event) {
    let endFriend = document.getElementById("endFriend");
    let endFoe = document.getElementById("endFoe");
    endFriend.innerHTML = `<span class="simheader">${game.i18n.localize("utopia.char.friend")}</span>`;
    endFoe.innerHTML = `<span class="simheader">${game.i18n.localize("utopia.char.foe")}</span>`;

    endFriend.innerHTML += await genSimResult(result, true);
    endFoe.innerHTML += await genSimResult(result, false);
};

async function genSimResult(result, IFF=false) {
    let resultStr = "";
    for (let i = 0; i < result.length; i++) {
        let elem = result[i];
        let side = elem.filter(item => item.system.IFF == IFF);
        let Creatures = "";
        for (let j = 0; j < side.length; j++) {
            let creature = side[j];
            let shpPercent = Math.floor((Math.max(creature.system.shp, 0)/creature.maxShp)*100);
            let dhpPercent = Math.floor((Math.max(creature.system.dhp, 0)/creature.maxDhp)*100);
            Creatures += `
            <div>
                <div class="HPbar">
                    <div class="HPslider" style="width: ${shpPercent}px;"></div>
                    <div class="HPvalue">${creature.system.shp}/${creature.maxShp} SHP</div>
                </div>
                <div class="HPbar">
                    <div class="HPslider" style="width: ${dhpPercent}px;"></div>
                    <div class="HPvalue">${creature.system.dhp}/${creature.maxDhp} DHP</div>
                </div>
                <div>${creature.name}</div>
            </div>`;
        };
        if(IFF){
            resultStr += `<div class="simRound"><span>Round ${i+1}</span><div class="simResult">${Creatures}</div></div>`;
        }else{
            resultStr += `<div class="simRound"><span>&nbsp;</span><div class="simResult">${Creatures}</div></div>`;
        };
    };
    return resultStr;
};



async function toggleEffects(actor, itemID, newStatus) {
	const effectsArr = actor.effects.contents;
	const effect = effectsArr.filter(e => e.origin.endsWith(itemID));
	if(effect.length == 0){
		return;
	};
	for(const e of effect){
		await e.update({ disabled: newStatus });
	};
	return;
};