import { deleteDialog, EditLanguage } from "../helpers/multi.js";

export default class utopiaItemSheet extends ItemSheet {
    get template() {
        //return `systems/utopia/templates/item/baseItem-sheet.hbs`;
		return `systems/utopia/templates/item/${this.item.type}-sheet.hbs`;
	};

    static get defaultOptions() {
        const options = super.defaultOptions;
        return foundry.utils.mergeObject(options, {
            resizable: true,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes" }]
        });
    }

    async getData() {
		const data = super.getData();
        const item = data.item;

        let sheetData = {
            owner: this.item.isOwner,
            editable: this.item.isOwner,
            item: item,
            system: item.system,
            effects: item.effects.contents,
            config: CONFIG.utopia,
        };

        sheetData.description = await TextEditor.enrichHTML(this.item.system.description, {async: true, secrets: this.item.isOwner, relativeTo: this.item});
		return sheetData;
	}

    activateListeners(html) {
        super.activateListeners(html);
        //Owner Only Listeners
        if (this.item.isOwner){
			html.find(".effect-control").click(this._controlEffect.bind(this));

            html.find(".treeEdit-gift").click(this._editGifted.bind(this));
            html.find(".editLang").click(this._editLang.bind(this));
            html.find(".editLangIN").change(this._editLang.bind(this));
            
            html.find(".add-talent").click(this._addTalent.bind(this));
            html.find(".remove-talent").click(this._removeTalent.bind(this));
            html.find(".buyTalent").click(this._buyTalent.bind(this));

            html.find(".sim-item").click(this._SimItem.bind(this));
        };

        const dragDrop = new DragDrop({
            dragSelector: ".item",
            dropSelector: ".drop-field",
            permissions: { drop: this._onDropItem.bind(this) },
            callbacks: {drop: this._onDropItem.bind(this),}
        });
        dragDrop.bind(html[0]);

    };

    //Add New Empty Active Effect
    async _controlEffect(event) {
        event.preventDefault();
        const owner = this.item;
        const a = event.currentTarget;
        const loop = a.closest("div.itemRow");
        let createdisable = ["equipment", "consumable"];
        let effect;
        if(loop !== null){
            effect = loop.dataset.effectId ? owner.effects.get(loop.dataset.effectId) : null;
        };
        switch (a.dataset.action){
            case "create":
                if(createdisable.includes(owner.type)){
                    await owner.createEmbeddedDocuments("ActiveEffect", [{name: "New Effect", icon: "icons/svg/aura.svg", origin: owner.uuid, disabled: true}]);
                }else{
                    await owner.createEmbeddedDocuments("ActiveEffect", [{name: "New Effect", icon: "icons/svg/aura.svg", origin: owner.uuid, disabled: false}]);
                };
                break;
            case "edit":
                await effect.sheet.render(true);
                break;
            case "toggle":
                let disabled = effect.disabled;
                await effect.update({disabled: !disabled});
                break;
            case "delete":
                let choice = await deleteDialog();
                if (choice == false){
                    return;
                };
                await effect.delete();
                break;
        };
        let actor = this.actor;
		//item is in Actor
		if(actor){
			//Update Actor Effect
			let actorEffects = actor.effects;
			let itemEffects = owner.effects;
			let thisID = null;
			if(effect){
				thisID = effect._id;
			};
			let actorOrigin = `Actor.${actor._id}.Item.${owner._id}`;
			let actorEffectsFromItem = actorEffects.filter(e => e.origin.includes(`Item.${owner._id}`));
			
			switch (a.dataset.action){
				case "create":
				case "edit":
				case "update":
                case "toggle":
					//Update All effect from this Item
					for (let i = 0; i < Array.from(itemEffects).length; i++) {
						let effect = Array.from(itemEffects)[i];
						let actorEffect = actorEffectsFromItem[i];

						let newEffect = {
							changes: effect.changes,
							description: effect.description,
							disabled: effect.disabled,
							duration: effect.duration,
							img: effect.img,
							name: effect.name,
							origin: actorOrigin,
							tint: effect.tint,
						};
						if(actorEffect == undefined){
							await actor.createEmbeddedDocuments("ActiveEffect", [newEffect]);
							continue;
						};
						if(JSON.stringify(actorEffect) != JSON.stringify(newEffect)){
							await actorEffect.update(newEffect);
						};
					};
					break;
				case "delete":
					let actorEffect = actorEffects.filter(e => e.origin == actorOrigin);
					if(actorEffect[0]){
						await actorEffect[0].delete();
					};
					break;
			};
		};
        return;
    };


    async _editGifted(event) {
        event.preventDefault();
        const item = this.item;
        let text = item.system.gifted?.text ?? "";
        let dialogContent = `<input id="text" type="text" value="${text}" placeholder="${game.i18n.localize("utopia.dialog.text")}"/><br>`;
        const traitsArr = CONFIG.utopia.charConstr.traits;
        let subTraitArr = [];
        for (const [key, trait] of Object.entries(traitsArr)) {
            for (let j = 0; j < trait.subTraits.length; j++) {
                const subTrait = trait.subTraits[j];
                let checked = item.system.gifted?.[subTrait] ?? false;
                checked = (checked) ? "checked" : "";
                dialogContent += `<input id="${subTrait}" ${checked} type="checkbox"/>
                <lable for="${subTrait}">${game.i18n.localize("utopia.subtraits."+subTrait)}</label><br>`;
                subTraitArr.push(subTrait);
            };
        };

        let d = new Dialog({
            title: game.i18n.localize("utopia.dialog.editGifted"),
            content: dialogContent,
            buttons: {
                one: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize("utopia.dialog.y"),
                callback: () => dialogfinished(item, subTraitArr)
                },
                two: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize("utopia.dialog.n")
                }
            },
            rejectClose: true,
            });
        d.render(true);
        function dialogfinished(item, subTraitArr) {
            let settings = {text: document.getElementById("text").value};
            for (let i = 0; i < subTraitArr.length; i++) {
                const elem = subTraitArr[i];
                let checked = document.getElementById(elem).checked;
                settings[elem] = checked
            };
            item.update({ "system.gifted": settings});
        };
    }

    async _editLang(event) {
        event.preventDefault();
        EditLanguage(event, this.item);
        return;
    }

    async _onDropItem(event){
        if(event == ".drop-field") return;
        //This Item
        const item = this.item;
        //Dropped Item
        let data = JSON.parse(event.originalEvent.dataTransfer.getData("text/plain"));
        const droppedItem = await fromUuid(data.uuid);
        if (!droppedItem) return; 
        if(droppedItem?.type !== "talent") return;
        //Add to What Column
        const columnID = event.target.closest(".drop-field").dataset.columnId;
        //Get Column from Item
        let column = item.system.talents[columnID];
        //Prepare Droped Item;
        let newItem = {
            system: droppedItem.system,
            name: droppedItem.name,
            type: "talent",
            img: droppedItem.img
        };
    }

    async _addTalent(event){
        event.preventDefault();
        const item = this.item;
        //Add to What Column
        const columnID = event.target.closest(".add-talent").dataset.columnId;
        let content = `<div id="drop-area" class="drop-field" data-column-id="${columnID}">${game.i18n.localize("utopia.item.dropHere")}</div><ul id='item-list'></ul>`;

        let d = new Dialog({
            title: game.i18n.localize("utopia.dialog.addTalent"),
            content: content,
            buttons: {
                one: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize("utopia.dialog.y"),
                callback: () => dialogfinished(item)
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
                    let droppedItem = await fromUuid(data.uuid);
                    if(droppedItem?.type !== "talent" ) return;
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
        async function dialogfinished(item) {
            const columnID = Number(document.getElementById("drop-area").dataset.columnId);
            let list = document.getElementById("item-list");
            let itemArr = Array.from(list.children);

            if (!itemArr.length) return ui.notifications.warn(game.i18n.localize("utopia.info.noItemsAdd"));

            let talent = [];
            for (let itemEl of itemArr) {
                let item = await fromUuid(itemEl.dataset.itemUuid);
                if (!item) continue;
                let newItem = {
                    system: item.system,
                    name: item.name,
                    _id: item._id,
                    img: item.img,
                    uuid: item.uuid,
                    bought: false
                };
                
                talent.push(newItem);
            };
            if (talent.length == 0) return ui.notifications.warn(game.i18n.localize("utopia.info.noTalentFound"));

            let talentsArr = item.system.talents;

            talentsArr[columnID].push(...talent);

            item.update({system: {talents: talentsArr}});
        };
    }

    async _removeTalent(event){
        event.preventDefault();
        const item = this.item;
        let choice = await deleteDialog();
        if (choice == false){
            return;
        };
        let columnID = event.target.closest(".talentColumn").dataset.columnId;
        let talentID = event.target.closest(".traittext").dataset.talentId;
        let talentColumn = item.system.talents;
        let talentArr = talentColumn[columnID];
        let talent = talentArr.find(t => t._id == talentID);
        if(!talent) return ui.notifications.warn(game.i18n.localize("utopia.info.noTalentFound"));
        talentColumn[columnID].splice(talentArr.indexOf(talent), 1);
        item.update({system: {talents: talentColumn}});
    }

    

    async _buyTalent(event){
        event.preventDefault();
        const item = this.item;
        const owner = this.actor;
        if(owner == null) return ui.notifications.warn(game.i18n.localize("utopia.info.hasToBeInActor"));
        const columnID = event.target.closest(".talentColumn").dataset.columnId;

        const talentID = event.target.closest(".traittext").dataset.talentId;
        const uuid = event.target.closest(".traittext").dataset.uuid;
        //Clicked on Trash
        let trash = event.target.closest("a");
        if(trash) return;
        //Find Talent
        const talentArr = item.system.talents[columnID];
        const talent = talentArr.find(t => t._id == talentID);
        const newItem = await fromUuid(uuid);

        //Item Exists
        if(!talent || !newItem) return ui.notifications.warn(game.i18n.localize("utopia.info.noTalentFound"));

        //Talent Already Bought
        if(talent.bought) return ui.notifications.warn(game.i18n.localize("utopia.info.alreadyBought"));

        //Check Points
        let pointConst  = newItem.system.cost;
        let cost = pointConst.body + pointConst.mind + pointConst.soul;
        let playerPoints = owner.system.talent.points;
        if(cost > playerPoints) return ui.notifications.warn(game.i18n.localize("utopia.info.notEnoughPoints"));

        //Dialog Ask if Buy

        let content = `<h3>${game.i18n.localize("utopia.dialog.buyTalentT")}: ${newItem.name}</h3> <p> ${game.i18n.localize("utopia.dialog.cost")}: ${cost} </p>`
        let d = new Dialog({
            title: game.i18n.localize("utopia.dialog.buyTalent"),
            content:  content,
            buttons: {
                one: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize("utopia.dialog.y"),
                callback: () => buyTalent(newItem, cost)
                },
                two: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize("utopia.dialog.n")
                }
            }
        })
        d.render(true);
        async function buyTalent(newItem, cost) {
            //Reduce Points for Actor
            await owner.update({system: {talent: {points: owner.system.talent.points - cost}}});
            //change Talent in Item to Bought
            let talentColumn = item.system.talents;
            let talentArr = talentColumn[columnID];
            let talent = talentArr.find(t => t._id == talentID);
            let Index = talentArr.indexOf(talent);
            talentColumn[columnID][Index].bought = true;
            await item.update({system: {talents: talentColumn}});
            //Add Talent to Character
            await owner.createEmbeddedDocuments("Item", [newItem]);
        }
    }

    async _SimItem(event) {
        event.preventDefault();
        const item = this.item;
        let obj = item.system.actionsArr;
        let internalItemArr = [];
        if(!Array.isArray(obj)){
            internalItemArr = Object.keys(obj).map((key) => obj[key]);
        }else{
            internalItemArr = obj;
        }
        let action = event.currentTarget.closest("a").dataset.action;
        let index = 0;
        if(action == 'delete'){
            index = event.currentTarget.closest("a").dataset.index;
        };
        switch (action){
            case 'create':
                //Add Item to actionsArr
                internalItemArr.push({name: "New Item", type: "attack", damage: "1d8", damageType: "phys", stamina: 3, action: 2, shp: 0, dhp: 0, amount: -1})
                return item.update({system: {actionsArr: internalItemArr}});

            case 'delete':
                //Delete Item
                internalItemArr.splice(index, 1);
                return item.update({system: {actionsArr: internalItemArr}});
        };
        return;  
    };

    
}