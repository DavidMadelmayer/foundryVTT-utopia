export const utopia = {};

//Stats

//Types
utopia.weaponType = {
    melee: "utopia.type.melee",
    ranged: "utopia.type.ranged",
    effect: "utopia.type.effect"
};
utopia.equipmentType = {
    armor: "utopia.type.armor",
    clothing: "utopia.type.clothing",
};
utopia.equipmentSlot = {
    shield: "utopia.type.shield",
    head: "utopia.type.head",
    neck: "utopia.type.neck",
    back: "utopia.type.back",
    chest: "utopia.type.chest",
    waist: "utopia.type.waist",
    hands: "utopia.type.hands",
    ring: "utopia.type.ring",
    feet: "utopia.type.feet",
};

utopia.materialType = {
    component: "utopia.type.component",
    material: "utopia.type.material",
    resource: "utopia.type.resource",
    loot: "utopia.type.loot",
    art: "utopia.type.art",
    junk: "utopia.type.junk",
};
utopia.consumableType = {
    consumable: "utopia.type.consumable",
    tool: "utopia.type.tool",
    food: "utopia.type.food",
    drink: "utopia.type.drink",
    disposable: "utopia.type.disposable",
};
utopia.talentType = {
    talent: "utopia.type.talent",
    special: "utopia.type.special",
};
utopia.talentTreeType = {
    core: "utopia.type.core",
    species: "utopia.type.species",
};
utopia.damageType = {
    cold: "utopia.type.cold",
    light: "utopia.type.light",
    fire: "utopia.type.fire",
    phys: "utopia.type.phys",
    mind: "utopia.type.mind",
};
utopia.attackHP = {
    shpF: "utopia.attType.shpF",
    shpD: "utopia.attType.shpD",
    dhpF: "utopia.attType.dhpF",
    dhpD: "utopia.attType.dhpD",
}
utopia.charConstr = {
    traits: {
        agi: {type: "body",subTraits: ["speed","dex"]},
        str: {type: "body",subTraits: ["pow","fort"]},
        int: {type: "mind",subTraits: ["engi","memory"]},
        wil: {type: "mind",subTraits: ["resolve","aware"]},
        dis: {type: "soul",subTraits: ["port","stunt"]},
        cha: {type: "soul",subTraits: ["appeal","lang"]},
    },
    def: {
        cold: {icon: "fa-snowflake"},
        light: {icon: "fa-bolt"},
        fire: {icon: "fa-fire"},
        phys: {icon: "fa-swords"},
        mind: {icon: "fa-brain"}
    },
    speed: {
        land: {icon: "fa-mountains"},
        water: {icon: "fa-wave"},
        air: {icon: "fa-cloud"},
    },
    quickActions:{
        aim: {stamUse: 0, action: 1},
        deepbreath: {stamUse: -1, action: 1},
        leap: {stamUse: 3, action: 3},
        grapple: {stamUse: 2, action: 3},
        scale: {stamUse: 4, action: 3},
        holdAction: {stamUse: 0, action: 2},
    }
};
utopia.npcConstr = {
    first: ["shp","dhp","stamina"],
    block: ["block","dodge"],
}

utopia.sim = {
    reactionUse: {
        default: "utopia.sim.default",
        first: "utopia.sim.first",
        strong: "utopia.sim.strong",
    },
    actionUse: {
        default: "utopia.sim.default",
        attack: "utopia.sim.attack",
        ranged: "utopia.sim.ranged",
    },
    target: {
        default: "utopia.sim.default",
        lowHP: "utopia.sim.target.lowHP",
        highHP: "utopia.sim.target.highHP",
        lowDPS: "utopia.sim.target.lowDPS",
        highDPS: "utopia.sim.target.highDPS",
    },
    action: {
        attack: "utopia.item.attack",
        noStamina: "utopia.sim.noStamina",
        noShp: "utopia.sim.noShp",
        buff: "utopia.sim.buff",
        debuff: "utopia.sim.debuff",
    },
    
}
export default utopia;