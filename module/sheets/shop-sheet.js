import { deleteDialog } from "../helpers/multi.js";

export default class utopiaShopSheet extends ActorSheet {
    get template() {
		return `systems/utopia/templates/actor/shop-sheet.hbs`;
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


        if (this.actor.isOwner){
			html.find(".item-edit").click(this._onItemEdit.bind(this));
        }

        html.find(".shop-buy").click(this._buy.bind(this));
        html.find(".loot-money").click(this._lootMoney.bind(this));
    }

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

    //Open Item for Edit
	//if Item == Ammo&Gear chalculate total cost
	_onItemEdit(event) {
		event.preventDefault();
		let element = event.currentTarget;
		let itemId = element.closest(".item").dataset.itemId;
		let item = this.actor.items.get(itemId);
		item.sheet.render(true);
	}
    //Primary use as Loot sheet (to convert defeated enemies into loot)
    async _buy(event) {
        event.preventDefault();
        let element = event.currentTarget;
        let itemId = element.closest(".item").dataset.itemId;
        let shopActor = this.actor;
        let item = shopActor.items.get(itemId);
        let user = game.user;
        let userActor = user.character;
        if(!userActor){
            ui.notifications.warn(game.i18n.localize("utopia.info.noCharacterDefined"));
            return;
        };
        //Check money
        let isShop = shopActor.system.isShop;
        if(isShop){
            let money = userActor.system.money;
            let cost = item.system.value;
            if (money < cost){
                ui.notifications.warn(game.i18n.localize("utopia.info.notenoughmoney"));
                return;
            };
        };
        //Check stock
        let infStock = shopActor.system.infStock;
        let stock = Number(item.system.amount);
        if(!infStock){
            if(stock <= 0){
                ui.notifications.warn(game.i18n.localize("utopia.info.nostock"));
                return;
            };
        };
        //Dialog
        let choice = await buyDialog(isShop, item, stock, infStock);
        if (choice == false)return;
        let amount = 1;
        let newAmount = document.getElementById("amount")?.value;
        newAmount = Math.floor(newAmount);
        if(newAmount){
            amount = Math.max(amount, Number(newAmount));
        };
        if(!infStock){
            if(amount > stock){
                amount = stock;
            };
        };
        //reduce money
        if(isShop){
            let cost = item.system.value * amount;
            if(userActor.system.money < cost){
                ui.notifications.warn(game.i18n.localize("utopia.info.notenoughmoney"));
                return;
            };
            await userActor.update({
                "system.money": userActor.system.money - cost
            });
            //add money to shop
            await shopActor.update({
                "system.money": shopActor.system.money + cost
            });
        };
        //Add Item to Actor
        const stackableItem = ["consumable", "material"];
        if(stackableItem.includes(item.type)){
            let newItem = foundry.utils.duplicate(item);
            newItem.system.amount = amount;
            await userActor.createEmbeddedDocuments("Item", [newItem]);
        }else{
            let newItem = foundry.utils.duplicate(item);
            newItem.system.amount = 1;
            //Add Item amount times
            for(let i = 0; i < amount; i++){
                await userActor.createEmbeddedDocuments("Item", [newItem]);
            };
        };
        //Update Stock
        if(!infStock){
            await item.update({
                "system.amount": stock - amount
            });
            //remove empty Item if Looted
            if(isShop == false && item.system.amount <= 0){
                await item.delete();
            };
        };
    }

    async _lootMoney(event) {
        event.preventDefault();
        let user = game.user;
        let userActor = user.character;
        if(!userActor){
            ui.notifications.warn(game.i18n.localize("utopia.info.noCharacterDefined"));
            return;
        };
        let shopActor = this.actor;
        let newMoney = Number(userActor.system.money) + Number(shopActor.system.money);
        await userActor.update({
            "system.money": newMoney
        });
        await shopActor.update({
            "system.money": 0
        });
    }

    //Override Drag and Drop Item
    async _onDropItem(event, data) {
        if ( !this.actor.isOwner ) return false;
        const item = await Item.implementation.fromDropData(data);
        const itemData = item.toObject();
        const sourceID = item.parent?.uuid;
        const source = await fromUuid(sourceID);
        //Stack all items in Shop
        const stackableItem = ["consumable", "material", "weapon", "equipment"];
        const unTransferable = ["talent", "talentTree"];
        //No Items on a Simulation Actor
        if(this.actor.type == "simulation"){
            return false;
        };
        // Handle item sorting within the same Actor
        if ( this.actor.uuid === item.parent?.uuid ) return this._onSortItem(event, itemData);
        //No Talents on Shop
        if(unTransferable.includes(itemData.type))return false;
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
        // Create the owned item
        await this._onDropItemCreate(itemData, event);
        //Delete Old on Actor
        if (sourceID !== undefined) {
            await source.deleteEmbeddedDocuments("Item", [itemData._id])
        };
    }
}

async function buyDialog(isShop=false, item, stock=0, infStock=false) {
    //always Loot 1 Item
    if(isShop == false && stock == 1){
        return true;
    };
    let title = game.i18n.localize("utopia.dialog.loot");
    let content = game.i18n.localize("utopia.dialog.lootT");
    if(isShop){
        title = game.i18n.localize("utopia.dialog.buy");
        content = game.i18n.localize("utopia.dialog.buyT");
    };

    //Add input
    if(stock > 1 || infStock == true){
        content += `<br> <input id="amount" min="1" max="${stock}" type="number" value="1" placeholder="${game.i18n.localize("utopia.dialog.buyAmount")}"/>`;
    };
    return new Promise((resolve, reject) => {
        let choice = false;
        let d = new Dialog({
            title: title + " " + item.name,
            content: content,
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
}
