//Actor Defaults
import actorDefaults from "../../system/actor-defaults.js";

export default class utopiaActor extends Actor {
	prepareData() {
		super.prepareData();
    };

    prepareDerivedData() {
        super.prepareDerivedData();
        const actorData = this;

        this._prepareCharacterData(actorData);
        this._prepareNpcData(actorData);
        this._prepareSimData(actorData);
    }

    _prepareCharacterData(actorData) {
        if (actorData.type !== 'character') return;
        this.charAutoTrait(actorData);
        //AutoBlock(this);
        this.AutoArmor(actorData);
        //console.log(actorData.system.block);
    }

    _prepareNpcData(actorData) {
        if (actorData.type !== 'npc') return;
        let autoTrait = actorData.system.autoChalc;
        if(autoTrait){
            actorData.system.hp = {
                value: Number(actorData.system.dhp.value) + Number(actorData.system.shp.value),
                max: Number(actorData.system.dhp.max) + Number(actorData.system.shp.max),
            };
        };
        //this.AutoArmor(actorData);
    }

    _prepareSimData(actorData) {
        if (actorData.type !== 'simulation') return;
        
    }

    async charAutoTrait(actorData) {
        if(!actorData.system.autoChalc) return;
        const trait = CONFIG.utopia.charConstr;
        //Loop Character Traits
        for (const [key, value] of Object.entries(trait.traits)) {
            let total = 0;
            for (const subTrait of value.subTraits) {
                if(actorData.system.subtraits[subTrait]?.value != undefined){
                    let value = Number(actorData.system.subtraits[subTrait].value);
                    total += value;
                    let modifier = value-4;
                    if(actorData.system.subtraits[subTrait]?.chk == true){
                        modifier = Math.max(0, modifier);
                    };
                    actorData.system.subtraits[subTrait].mod = modifier;
                };
            };
            actorData.system.traits[key] = {
                value: total,
                mod: total-4
            };
        };

        //Level
        //Test level up value > max
        //xp.max = level*100
        let xp = actorData.system.xp;
        let level = Number(actorData.system.level);
        xp.max = level*100;
        if(Number(xp.value) >= xp.max){
            xp.value -= xp.max;
            actorData.system.level++;
            actorData.system.talent.points++;
            actorData.system.traits.points++;
            xp.max = actorData.system.level*100;

            actorData.system.stamina.value++;
            actorData.system.dhp.value++;
            actorData.system.shp.value++;
        };
        
        //Deep Health Points (DHP) =  Soul * Effervescence + level
        //Surface Health Points (SHP) = Body * Constitution + level
        //DHP + SHP = HP
        let dhpMax = actorData.system.talent.soul * actorData.system.attributes.eff + actorData.system.level;
        let shpMax = actorData.system.talent.body * actorData.system.attributes.con + actorData.system.level;
        actorData.system.dhp.max = dhpMax;
        actorData.system.shp.max = shpMax;
        actorData.system.hp.max = dhpMax + shpMax;
        actorData.system.hp.value = Number(actorData.system.dhp.value) + Number(actorData.system.shp.value);

        //Stamina = mind * endurance + level
        let staminaMax = actorData.system.talent.mind * actorData.system.attributes.end + actorData.system.level;
        actorData.system.stamina.max = staminaMax;

        //Spellcap
        let spellcap = Number(actorData.system.subtraits?.resolve?.value) || 0;
        actorData.system.mods.effect.Spellcap = spellcap;

        //Count talent points
        let talent = {
            body: 0,
            mind: 0,
            soul: 0
        };
        let talentArr = actorData.items.filter(i => i.type == "talent");
        for (const talentItem of talentArr) {
            talent.body += talentItem.system.cost.body;
            talent.mind += talentItem.system.cost.mind;
            talent.soul += talentItem.system.cost.soul;
        };
        actorData.system.talent.body = talent.body;
        actorData.system.talent.mind = talent.mind;
        actorData.system.talent.soul = talent.soul;
    }

    AutoArmor(actorData) {
        if(!actorData.system.autoChalc) {
            //no Auto Calc
            actorData.system.block = actorData.system.base.block;
            actorData.system.dodge = actorData.system.base.dodge;
            return;
        };
        let armorArr = actorData.items.filter(i => i.type == "equipment" && i.system.type == "armor" && i.system.equipped == true);
        let traitArr = actorData.items.filter(i =>i.type == "talent" && (i.system.block !== "" || i.system.dodge !== "") && i.system.diabled !== true);
        armorArr.push(...traitArr);
        let [blockDice, blockString] = seperateDice(actorData.system.base.block);
        let [dodgeDice, dodgeString] = seperateDice(actorData.system.base.dodge);

        for (let i = 0; i < armorArr.length; i++) {
            let armorItem = armorArr[i];
            if(armorItem.system.block !== undefined || armorItem.system.block !== ""){
                [blockDice, blockString] = seperateDice(armorItem.system.block, blockDice, blockString);
            };
            if(armorItem.system.dodge !== undefined || armorItem.system.dodge !== ""){
                [dodgeDice, dodgeString] = seperateDice(armorItem.system.dodge, dodgeDice, dodgeString);
            };
        };

        let main = {
            block: {dice: blockDice, compex: blockString, string: ""},
            dodge: {dice: dodgeDice, compex: dodgeString, string: ""}
        };

        for (const [key, value] of Object.entries(main)) {
            let compex = value.compex;
            let dice = value.dice;
            let string = value.string;
            let Extravalue = 0;
            //if dice and compex is empty
            if(Object.keys(main[key].dice).length == 0 && main[key].compex == ""){
                continue;
            };

            for (const [key1, value1] of Object.entries(dice)) {
                if(key1 == "add" || key1 == "sub"){
                    if(key1 == "add"){
                        Extravalue += value1;
                    }else{
                        Extravalue += value1;
                    };
                }else{
                    if(string == ""){
                        string += value1.amount + "d" + key1;
                    }else{
                        string += "+" + value1.amount + "d" + key1;
                    }
                }
            };
            if(Extravalue !== 0){
                if(string == ""){
                    string += Extravalue;
                }else{
                    string += "+" + Extravalue;
                };
            };
            if(compex !== ""){
                if(string == ""){
                    string += compex;
                }else{
                    string += "+" + compex;
                };
            };
            main[key].string = string;
        };

        actorData.system.block = main.block.string;
        actorData.system.dodge = main.dodge.string;
        //console.log(`Block: ${actorData.system.block}, Dodge: ${actorData.system.dodge}`);
        return;
    }

	_preCreate(data, options, user) {
        if ( (super._preCreate(data, options, user)) === false ) return false;
    
        const sourceId = this.getFlag("core", "sourceId");
        if ( sourceId?.startsWith("Compendium.") ) return;
    
        // Configure prototype token settings
        const prototypeToken = {};
        let settings = actorDefaults[this.type];
        if (settings !== undefined) {
            Object.assign(prototypeToken, settings.prototypeToken);
        };
        this.updateSource({ prototypeToken });
    };
};

function seperateDice(diceString, dice = {}, string = "") {
    //If diceString contains compex Math: multiply divide and keep highest (kh)
    if(diceString == "") return [dice, string];
    let compexArr = ["*", "/", "kh", "kl", "k", "dl", "dh", "r", "x", "min", "max", "c", "even", "odd", "sf", "ms"];
    let compex = compexArr.find(compex => diceString.includes(compex));
    if(compex){
        if(string == ""){
            string = diceString;
        }else{
            string += "+" + diceString;
        };
        return [dice, string];
    };
    let diceArr = diceString.split(/([\+\-])/g);
    for (let i = 0; i < diceArr.length; i++) {
        let part = diceArr[i];
        if(part.includes("d")){
            //Dice
            let DiceAmount = Number(part.match(/[0-9]+(?=d)/g));
            let DiceFace = Number(part.match(/d[0-9]+/g)[0].replace("d", "")); 
            dice[DiceFace] = dice[DiceFace] || {amount: 0};
            dice[DiceFace].amount += DiceAmount;
        }else{
            //math
            switch(part){
                case "-":
                    dice.sub = dice.sub || 0;
                    dice.sub += Number(diceArr[i+1]);
                    break;
                case "+":
                default:
                    dice.add = dice.add || 0;
                    dice.add += Number(diceArr[i+1]);
                    break;
            }
        }
    };
    return [dice, string];
};