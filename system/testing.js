import * as utopiaActorSheet from "../module/sheets/actor-sheet.js";
import { blockDialogSocket, applyDamage } from "./sockets.js";

export function mocha(quench) {
    quench.registerBatch(
        "utopia Attack No target",
        (context) => {
            const { describe, it, assert, before, after } = context;

            describe("attack", function () {
                let actor;
                let item;
                let chat = Array.from(game.messages);
                before(async function () {
                    game.settings.set("utopia", "autoCombat", "none");
                    //Create a mock actor
                    actor = await Actor.create({ name: "Old Name", type: "character" });
                    await actor.update({system: {stamina:{value:10}}});
                    //Create an item on actor
                    item = await actor.createEmbeddedDocuments("Item", [{ name: "Sword", type: "weapon" }]);
                });
                it("prepare attack", async function () {
                    await utopiaActorSheet.attackPrepare(actor, item[0]);
                    let result = true;
                    //Chat Card
                    let newChat = Array.from(game.messages);
                    if(newChat.length > chat.length){
                        console.log("chat result added");
                    }else{
                        result = false;
                    };
                    //Stamina Reduced
                    if(actor.system.stamina.value !== 8){
                        result = false;
                    };
                    
                    assert.ok(result);
                });

                after(async function () {
                    //Cleanup
                    await actor.delete();
                });
            });

            
        },
        { displayName: "QUENCH: Attack Test No target" },
    );

    quench.registerBatch(
        "utopia Apply Damage",
        (context) => {
            const { describe, it, assert, before, after } = context;

            describe("attack", function () {
                let actor;
                let item;
                before(async function () {
                    //Create a mock actor
                    actor = await Actor.create({ name: "Old Name", type: "character" });
                    await actor.update({system: {stamina:{value:10}, shp:{value:10}, dhp:{value:10}}});
                    //Create an item on actor
                    item = await actor.createEmbeddedDocuments("Item", [{ name: "Sword", type: "weapon" }]);
                });

                it("Damage Two Phys reduce One SHP", async function () {
                    //Two Damage
                    await applyDamage(actor, [{value: 2, type: "phys"}], item[0], "none");
                    let result = true;
                    //HP reduced by 1 (1 base Armor)
                    if(actor.system.shp.value !== 9){
                        result = false;
                    };
                    if(actor.system.dhp.value !== 10){
                        result = false;
                    };
                    assert.ok(result);
                });
                it("Damage Four Phys Block All", async function () {
                    //Four Damage All Blocked
                    await applyDamage(actor, [{value: 4, type: "phys"}], item[0], {type: "block", value: 4});
                    let result = true;
                    //HP reduced by 0 (1 base Armor + 4 Block) Same value as Above
                    if(actor.system.shp.value !== 9){
                        result = false;
                    };
                    if(actor.system.dhp.value !== 10){
                        result = false;
                    };
                    assert.ok(result);
                });

                it("Damage 12 Phys reduce 9 SHP and 2 DHP", async function () {
                    //11 Damage
                    await applyDamage(actor, [{value: 12, type: "phys"}], item[0], "none");
                    let result = true;
                    //HP reduced by 11 (1 base Armor)
                    if(actor.system.shp.value !== 0){
                        result = false;
                    };
                    if(actor.system.dhp.value !== 8){
                        result = false;
                    };
                    assert.ok(result);
                });

                after(async function () {
                    //Cleanup
                    await actor.delete();
                });
            });
            
        },
        { displayName: "QUENCH: Apply Damage" },
    );
}