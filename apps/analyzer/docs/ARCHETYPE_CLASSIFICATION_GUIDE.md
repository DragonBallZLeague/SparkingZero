# Capsule Archetype Classification Guide
**Reference for Build Analysis System**

**Last Updated**: November 5, 2025  
**Version**: 1.0

---

## Overview

This document defines how capsules are classified into build archetypes for the Meta Analysis system. Each capsule is assigned a **primary archetype** based on its most prominent effect, with additional tags for secondary effects.

---

## Archetype Definitions

### 🗡️ **Aggressive**
**Focus**: Maximizing damage output

**Effect Keywords**:
- Increases damage (any type)
- Increases attack (Rush, Smash, Ki Blast, Blast, Ultimate)
- Burst damage
- Power boosts
- Combo damage increases

**Example Capsules**:
- Rush Attack Boost 3
- Blast Attack Boost 3
- Divine Blow
- Fury!
- Master Strike
- Power Unleashed
- Super Warrior

---

### 🛡️ **Defensive**
**Focus**: Survival, mitigation, and sustainability

**Effect Keywords**:
- Damage reduction/resistance
- Armor (combatives, bullet, armor break)
- Guard enhancements
- Defense increases
- Health (maximum HP, HP recovery)
- Counters (Z-Counter, Super Counter, Revenge Counter)
- Switching/Tagging (team battle mechanics)
- Flinch resistance
- Damage taken reduction

**Example Capsules**:
- Power Body
- Light Body
- Draconic Aura
- Perfect Guard
- The Secret to Counters
- Master Roshi Training
- King Kai Training
- God of Destruction Training
- Dendes Healing Ability
- Warming Up (health recovery on standby)
- Ready for Anything (ki recovery on standby)
- Proof of Friendship (switch gauge)
- Battle Control (switch gauge recovery)
- Latent Power! (damage resistance)

---

### ⚙️ **Technical**
**Focus**: Resource management, mobility, and utility

**Effect Keywords**:
- Ki cost reduction
- Ki recovery/gain
- Ki gauge benefits
- Dash improvements (Z-Burst Dash, Dragon Dash, Short Dash)
- Movement enhancements
- Speed increases
- Skill gauge (recovery, requirements)
- Skill count
- Transformations
- Fusions
- Sparking Mode duration/cost
- Charging time reduction

**Example Capsules**:
- God Ki
- Indomitable Fighting Spirit
- Active Heart
- Z-Burst Dash Master
- The Secret to Z-Burst Dashes
- Dragon Spirit (skill gauge recovery)
- Super Transformation
- The Secret to Dragon Dashes
- Ki Control
- Speed Up
- Rising Fighting Spirit (ki gauge starts max)
- Latent Power Unleashed 1/2 (ki gauge start bonus)
- Rising Tension (ki recovery over time)
- Sparking! Plus (sparking duration)
- Style of the Strong (sparking duration)

---

## Multi-Category Capsules

Some capsules have effects that span multiple archetypes. These are assigned to their **most prominent** archetype based on the primary benefit.

### Decision Rule
**Assign to the archetype of the PRIMARY effect**

### Examples

| Capsule | Effects | Primary | Reasoning |
|---------|---------|---------|-----------|
| **The Secret to Counters** | Reduces Skill Count for Super Z-Counters | **Defensive** | Primary benefit is more counters (defensive mechanic), skill efficiency is secondary |
| **Master Strike** | +5% melee damage, -5,000 max HP | **Aggressive** | Primary effect is damage increase, HP reduction is a penalty/trade-off |
| **Power Body** | +3 armor, -20% melee defense, -10% blast defense | **Defensive** | Net defensive gain (armor level 3 beats the defense reduction in most cases) |
| **Sparking! Plus** | +15% sparking duration, -20% melee defense, -10% blast defense | **Technical** | Primary benefit is sparking mode utility, defense reduction is trade-off |
| **Master Ki Blast** | +5% ki blast speed, -5% ki blast cost, -5,000 max HP | **Technical** | Primary effects are ki management, HP reduction is penalty |
| **Warming Up** | +50% health recovery on standby | **Defensive** | Healing + tag synergy = defensive |
| **Ready for Anything** | +50% ki recovery on standby | **Defensive** | Tag synergy (defensive team mechanic), though ki recovery is technical |
| **God Ki** | -50% blast ki cost, +1 ki bar on blast miss | **Technical** | Pure ki management |

---

## Archetype Composition in Builds

### Pure Builds
- **Pure Aggressive**: 5-7 aggressive capsules (glass cannon)
- **Pure Defensive**: 5-7 defensive capsules (tank)
- **Pure Technical**: 5-7 technical capsules (utility/setup specialist)

### Hybrid Builds
- **Dominant Archetype**: 4+ capsules of one type, 1-3 supporting
  - Example: 4 Aggressive + 2 Technical = "Aggressive (Technical Support)"
  
### Balanced Builds
- **Even Distribution**: 2-3 from each category
  - Example: 2 Aggressive + 2 Defensive + 2 Technical

---

## Pattern Matching Reference

### Aggressive Patterns
```javascript
/increases.*damage/i
/increases.*attack/i
/blast.*damage/i
/ultimate.*damage/i
/burst.*damage/i
/power/i
/combo.*damage/i
```

### Defensive Patterns
```javascript
/reduces.*damage taken/i
/armor/i
/guard/i
/defense/i
/health.*recovery/i
/HP.*recovery|recovers.*HP/i
/maximum health|max.*HP/i
/counter/i
/switch/i
/tag/i
/standby/i
/damage resistance/i
/flinch/i
```

### Technical Patterns
```javascript
/ki.*cost/i
/ki.*recovery|ki.*gain/i
/ki gauge/i
/dash/i
/movement/i
/skill.*gauge|skill count/i
/transformation|fusion/i
/sparking mode/i
/charging time/i
/speed/i
```

---

## Edge Cases & Special Considerations

### Costume/Sparking BGM Items
- **Type**: Not capsules (excluded from analysis)
- **IDs**: Start with `00_1_` (costumes) or `00_6_` (BGM)

### AI Strategies
- **Type**: Not capsules (but tracked separately for synergy analysis)
- **IDs**: Start with `00_7_`

### Capsules with No Clear Archetype
- **Fallback**: Assign to `utility` category
- **Examples**: Cosmetic effects, Brolys Ring (prevents transformation)

### Map-Specific Capsules
- **Primary Archetype**: Aggressive (damage boost)
- **Examples**: Power of Namek, Power of Earth, Power of the Universe
- **Note**: May warrant special handling for map-based analysis in future phases

---

## Usage in Code

```javascript
const capsule = {
  id: "00_0_0037",
  name: "The Secret to Counters",
  cost: 5,
  effect: "Reduces Skill Count needed for Super Z-Counters by 1 (minimum 1)",
  primaryArchetype: "defensive",  // Assigned based on this guide
  allTags: ["defensive", "technical"],  // All applicable archetypes
  archetypeWeight: {
    aggressive: 0,
    defensive: 1,  // Counters = defensive mechanic
    technical: 1   // Skill count = technical mechanic
  }
};
```

---

## Validation Checklist

When implementing archetype classification:

- [ ] All capsules (Type = "Capsule") are categorized
- [ ] Multi-category capsules have primary archetype assigned
- [ ] Edge cases (costumes, BGM, AI) are excluded
- [ ] Pattern matching is case-insensitive
- [ ] Effect descriptions are parsed from CSV
- [ ] Archetype assignments are logged for review
- [ ] Build recommendations respect archetype composition rules

---

## Future Enhancements

**Potential Additions**:
- **Weighted Scoring**: Assign numeric weights to effects (major vs minor)
- **Character Affinity**: Some characters may favor certain archetypes
- **Meta-Dependent**: Archetype effectiveness may shift seasonally
- **Synergy Multipliers**: Certain archetype combinations may have special bonuses

---

**Document Status**: ✅ Approved Reference  
**Next Review**: When new capsules are added or archetypes need rebalancing
