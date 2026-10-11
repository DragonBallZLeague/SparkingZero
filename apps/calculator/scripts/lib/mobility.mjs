/**
 * A character's mobility from the FModel snapshot: movement ki costs and the short-dash traits.
 * Movement speed is the same for every character (walk, run, fly, Dragon Dash and vanish speeds are
 * identical in every file), so only costs and the short dash's acceleration differ.
 *
 * Costs are in ki bars (the files' 10,000 = 1 bar), as the files hold them: no class coefficient is
 * known to apply. `IN` is the cost to start a move and `LP` the cost while it lasts, read as per second
 * (to confirm in game). A value the file leaves out is Unreal's default, which the export doesn't
 * show, so it is null. Giant-class characters have no Z Burst Dash loop cost in their files.
 */
import { round } from './fields.mjs';

export function mobilityOf(fm, id) {
  const bars = (asset, field) => {
    const v = fm.raw(id, asset, field);
    return v === undefined ? null : round(Number(v) / 10000, 4);
  };
  const flag = (f) => fm.raw(id, 'Character', `AbilityFlag.${f}`);
  const accel = Number(fm.raw(id, 'Steps', 'StepShortDash.MaxAcceleration') ?? 60000);
  return {
    canFly: String(flag('bCanFly') ?? 'true') !== 'false',
    slowShortDash: accel < 60000,
    stepCancelCost: bars('Steps', 'StepCancelShortDash.SpCost'),
    dragonDash: { start: bars('DragonDash', 'SpCostIN'), perSecond: bars('DragonDash', 'SpCostLP'),
      // High-Speed Dragon Dash: a Dragon Dash started with no direction rushes at the opponent
      highSpeedPerSecond: bars('DragonDash', 'HighSpeedSpCostLP'),
      // the file's SpCostBK; what it charges for is not known yet
      bk: bars('DragonDash', 'SpCostBK') },
    zBurstDash: { start: bars('ZBurstDash', 'SpCostIN'), perSecond: bars('ZBurstDash', 'SpCostLP'),
      burstSmashPerSecond: bars('ZBurstDash', 'BurstSmashSpCostLP') },
    dashUp: { start: bars('DashUpDown', 'SpCostUpIN'), perSecond: bars('DashUpDown', 'SpCostUpLP') },
    dashDown: { start: bars('DashUpDown', 'SpCostDownIN'), perSecond: bars('DashUpDown', 'SpCostDownLP') },
    dragonHoming: { start: bars('DragonHoming', 'SpCostIN'), perSecond: bars('DragonHoming', 'SpCostLP') },
  };
}
