export const utopiaSockets = {
    register() {
        console.log("Sockets ON");
        game.socket.on("system.utopia", async (data) => {
            console.log("Socket Received");
            if (data.type === "blockRequest" && game.user.id === data.userId) {
                let targetActor = await fromUuid(data.actorUUID);
                
                const damageArr = data.damageArr;
                const item = data.item;
                if (!targetActor) return;

                const reactionTime = data.reactionTime;
                if(item.system.blockable == true && Number(targetActor.system.reactions) > 0){
                    let block = await blockDialogSocket(targetActor, reactionTime, damageArr, item);
                    await applyDamage(targetActor, damageArr, item, block);
                }else{
                    await applyDamage(targetActor, damageArr, item, "none");
                };
            }
            if (data.type === "testing") {
                console.log(data);
            };
        });
    }
};

//Block
export async function blockDialogSocket(targetActor, reactionTime, damageArr, item,) {
    return new Promise((resolve) => {
        let progressBar = `
          <div style="position: relative; width: 100%; height: 20px; background: #ccc; border-radius: 5px; overflow: hidden;">
            <div id="progress-bar" style="width: 100%; height: 100%; background: #3e8e41; transition: width 0.1s linear;"></div>
          </div>
        `;

        //Timer logic in ms
        //update interval
        const interval = 100;
        const totalIntervals = (reactionTime * 1000) / interval;
        let currentInterval = 0;

        //Function to update the progress bar
        const updateProgressBar = () => {
            currentInterval++;
            const progressPercentage = Math.max(0, 100 - (currentInterval / totalIntervals) * 100);
            const progressElement = document.getElementById("progress-bar");
            if (progressElement) {
                progressElement.style.width = `${progressPercentage}%`;
            }
        };

        //Timer auto-resolve
        const timer = setInterval(() => {
            updateProgressBar();
            if (++currentInterval >= totalIntervals) {
                clearInterval(timer);
                dialog.close();
                //Resolve with no block
                resolve({roll: 0});
            }
        }, interval);

        //Create the dialog
        const dialog = new Dialog({
            title: game.i18n.localize("utopia.dialog.blockreaction"),
            content: `
                <p>${targetActor.name} ${game.i18n.localize("utopia.dialog.blockreactiondesc")}</p>
                ${progressBar}
            `,
            buttons: {
                block: {
                    label: game.i18n.localize("utopia.char.block"),
                    callback: async () => {
                        clearInterval(timer);
                        //block calculation
                        let flavor = `${targetActor.name} ${game.i18n.localize("utopia.dialog.blockYesFlavor")}`;
                        let result = await blockRoll(targetActor, "block", flavor);
                        resolve(result); //with block + roll total
                    },
                },
                dodge:{
                    label: game.i18n.localize("utopia.char.dodge"),
                    callback: async () => {
                        clearInterval(timer);
                        // dodge calculation
                        let flavor = `${targetActor.name} ${game.i18n.localize("utopia.dialog.dodgeYesFlavor")}`;
                        let result = await blockRoll(targetActor, "dodge", flavor);
                        resolve(result); //with dodge + roll total
                    },
                },
                noblock: {
                    label: game.i18n.localize("utopia.dialog.blockNo"),
                    callback: async () => {
                        clearInterval(timer);
                        resolve("none") // No block
                    },
                },
            },
            default: "noblock",
            close: async () => {
                //Do nothing: Interval will clear itself
            },
        });

        dialog.render(true);
    });
}

export async function applyDamage(targetActor, damageArr, item, blockResult){
    //Get Attack Target
    let actor = targetActor;
    let damageMath = item.system.dmgToHP;
    let totalDamage = 0;

    //Armor Before Block and Dodge
    //Reduce by Armor
    if(damageMath !== "shpD" && damageMath !== "dhpD"){
        let armor = actor.system.def;
        for (let i = 0; i < damageArr.length; i++) {
            const elem = damageArr[i];
            let value = Number(elem.value) - Number(armor[elem.type]);
            value = Math.max(value, 0);
            totalDamage += value;
        };
    }else{
        for (let i = 0; i < damageArr.length; i++) {
            const elem = damageArr[i];
            totalDamage += elem.value;
        };
    };
    //No Damage
    if(totalDamage == 0)return;
    //Block
    if(blockResult.type == "block"){
        totalDamage = Math.max(totalDamage-blockResult.value,0);
        if(totalDamage == 0)return;
    };
    //Dodge
    if(blockResult.type == "dodge" && totalDamage <= blockResult.value){
        return;
    };

    //Apply Damage
    let shp = Number(actor.system.shp.value);
    let dhp = Number(actor.system.dhp.value);
    //SHP
    if(damageMath !== "dhpF" && damageMath !== "dhpD"){
        //SHP First
        if(shp >= totalDamage){
            shp = shp-totalDamage;
            totalDamage = 0;
        }else{
            totalDamage = totalDamage - shp;
            shp = 0;
        };
    };
    //DHP
    if(totalDamage > 0){
        dhp = dhp-totalDamage;
    };
    //Update
    let updateData = {system:{
        shp: {value: shp},
        dhp: {value: dhp},
        hp: {value: shp+dhp},
    }}
    await targetActor.update(updateData);
    return;
};

async function blockRoll(targetActor, name, flavor) {
    //block or Dodge calculation
    let result = {
        type: name,
        value: 0,
    };
    let dice = targetActor.system[name];
    //Dice not defined == no Block
    if(dice == "" || dice == undefined){
        return "none";
    };
    let r = await new Roll(dice, {})._evaluate();
    
    result.value = r.total;

    //reduce Reaction
    let reactions = Number(targetActor.system.reactions - 1);
    await targetActor.update({"system.reactions": reactions})

    let diceData = {
        total: r.total,
        formula: r.formula,
        tooltip: await r.getTooltip()
    };

    let template = "systems/utopia/templates/inchat/chat-roll.hbs";
    const alias = targetActor.name;
    let chatData = {user: game.user.id,};
    let cardData = {
        ...diceData,
        owner: targetActor.id
    };
    chatData.speaker = { targetActor, alias };
    chatData.flavor = flavor;
    chatData.rollMode = "roll";
    chatData.content = await renderTemplate(template, cardData);
    await ChatMessage.create(chatData);

    return result;
}