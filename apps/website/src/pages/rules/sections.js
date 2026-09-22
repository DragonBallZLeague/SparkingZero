// Single registry of rules sections: the nav label, the page component used by the
// site, the presentational view used by the CMS preview pane, and the YAML file the
// section is stored in. Add a rules section here (plus its component and a matching
// entry in public/cms/config.yml) and both the site and the CMS pick it up.
import HowToParticipate, { HowToParticipateView } from './HowToParticipate';
import LeagueWideRules, { LeagueWideRulesView } from './LeagueWideRules';
import LegalPotaras, { LegalPotarasView } from './LegalPotaras';
import BuildRules, { BuildRulesView } from './BuildRules';
import AIDescriptions, { AIDescriptionsView } from './AIDescriptions';
import BenchRules, { BenchRulesView } from './BenchRules';
import CoachingRules, { CoachingRulesView } from './CoachingRules';
import StaffOnTeamRules, { StaffOnTeamRulesView } from './StaffOnTeamRules';
import OffSeasonSchedule, { OffSeasonScheduleView } from './OffSeasonSchedule';
import PostSeasonSeeding, { PostSeasonSeedingView } from './PostSeasonSeeding';
import TestingRules, { TestingRulesView } from './TestingRules';
import Mods, { ModsView } from './Mods';

export const RULE_SECTIONS = {
  'how-to-participate': { label: 'How to Participate', Page: HowToParticipate, View: HowToParticipateView },
  'league-wide-rules': { label: 'League Wide Rules', Page: LeagueWideRules, View: LeagueWideRulesView },
  'legal-potaras': { label: 'Legal Capsules', Page: LegalPotaras, View: LegalPotarasView },
  'build-rules': { label: 'Build Rules', Page: BuildRules, View: BuildRulesView },
  'ai-descriptions': { label: 'AI Descriptions', Page: AIDescriptions, View: AIDescriptionsView },
  'bench-rules': { label: 'Bench Rules', Page: BenchRules, View: BenchRulesView },
  'coaching-rules': { label: 'Coaching Rules', Page: CoachingRules, View: CoachingRulesView },
  'staff-on-team-rules': { label: 'Staff on Team Rules', Page: StaffOnTeamRules, View: StaffOnTeamRulesView },
  'off-season-schedule': { label: 'Off-Season Schedule', Page: OffSeasonSchedule, View: OffSeasonScheduleView },
  'post-season-seeding': { label: 'Post Season Seeding', Page: PostSeasonSeeding, View: PostSeasonSeedingView },
  'testing-rules': { label: 'Testing Rules', Page: TestingRules, View: TestingRulesView },
  'mods': { label: 'Mods', Page: Mods, View: ModsView },
};

/** The sidebar grouping on /rules, in display order. */
export const NAV_GROUPS = [
  { label: 'Getting Started', ids: ['how-to-participate'] },
  { label: 'League Rules', ids: ['league-wide-rules', 'legal-potaras', 'build-rules', 'ai-descriptions'] },
  { label: 'Team Operations', ids: ['bench-rules', 'coaching-rules', 'staff-on-team-rules'] },
  { label: 'Season Structure', ids: ['off-season-schedule', 'post-season-seeding'] },
  { label: 'Testing & Mods', ids: ['testing-rules', 'mods'] },
].map((g) => ({
  label: g.label,
  items: g.ids.map((id) => ({ id, label: RULE_SECTIONS[id].label })),
}));
