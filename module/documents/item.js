export default class utopiaItem extends Item {
    prepareData() {
        super.prepareData();
        //console.log("prepare Item");
        let itemData = this;
        if(itemData.type == "weapon"){
            //let updateData = {system: {}};
            let type = itemData.system.type;
            if(type == "ranged"){
                itemData.system.isRanged = true;
            };
            if(type == "melee"){
                itemData.system.isRanged = false;
            };
            //itemData.update(updateData);
        }
    }

}