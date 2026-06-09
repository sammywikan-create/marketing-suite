# Requirements Document

## Introduction

The Affiliate Action-Driven enhancement transforms the existing Affiliate Manager module from an analytics dashboard into a daily operating system for the single admin managing FreshVision's ~2,000 registered TikTok Shop creators. Today the module surfaces what IS (metrics, segmentation, Pareto), but the admin needs what to DO next — which creator to follow up, which sample to chase, which program is underdelivering, which dormant star to reactivate.

This feature adds eight coordinated capabilities on top of the existing `affiliate_creators` / `affiliate_summaries` tables:

- **A. Today's Action List** — auto-prioritized daily task queue with composable rules
- **B. Video Production Tracker** — reframes team KPI (video count) as the hero metric
- **C. Sample & Endorse Tracker** — replaces WhatsApp-as-system with a proper log
- **D. Special Commission & Program Tracker** — ROI tracking for paid/targeted programs
- **E. New Creator Pipeline** — Kanban for sourcing and onboarding new prospects
- **F. Re-activation Candidates** — derived view for dormant high-value creators
- **G. Quick Notes per Creator** — chronological mini-CRM log per creator
- **H. Bulk Actions & WA Broadcast Helper** — multi-select with templated copy-to-clipboard

All state persists in Supabase so the admin can work across devices on the live Vercel deployment. There is no multi-tenant RBAC — a single admin user is assumed. All date/time references in this specification evaluate against the **Asia/Jakarta (UTC+7)** timezone unless otherwise stated.

This feature is additive — no existing Affiliate screen behaviour is removed, and existing `affiliate_summaries` and `affiliate_creators` data remains the authoritative source for summary metrics, channel mix, creator rankings, and tier breakdowns. All new tables are scoped per store via a `store_id` foreign key consistent with the existing multi-store schema.

## Glossary

- **Affiliate_Action_System**: The overall feature being specified. Composed of the sub-systems below.
- **Today_Action_Panel**: UI panel at the top of the Affiliate dashboard that displays the ranked list of open Actions for the current day.
- **Video_Tracker**: Sub-system that computes, displays, and paces video-count progress against a configured Video_Target.
- **Sample_Tracker**: Sub-system that records Sample records and their status transitions.
- **Endorsement_Tracker**: Sub-system that records Endorsement records and their fulfilment against Committed_Videos.
- **Program_Tracker**: Sub-system that records Programs and computes Program_ROI.
- **Prospect_Pipeline**: Sub-system that records Prospects and their Stage transitions.
- **Reactivation_View**: Derived view computing Recovery_Potential for dormant creators.
- **Creator_Notes_System**: Sub-system that records chronological notes per creator.
- **Broadcast_Helper**: Sub-system that generates Broadcast_Text from Templates and logs a Broadcast_Sent Action_Completion for selected creators.
- **Creator**: A TikTok Shop affiliate creator present in the existing `affiliate_creators` table. Identified by `creator_username`.
- **Prospect**: A not-yet-onboarded creator being sourced. Identified by `creator_username` on the external platform. A Prospect becomes a Creator when a matching row appears in `affiliate_creators`.
- **Sample**: A product unit shipped to a Creator for review and potential content. Tracked via `affiliate_samples` table.
- **Sample_Status**: One of {Sent, Received, Posted, Sold, Failed}. Monotonic forward along {Sent → Received → Posted → Sold}; Failed is a terminal absorbing state reachable from any non-terminal state.
- **Endorsement**: A paid content commitment between the admin and a Creator. Tracked via `affiliate_endorsements` table. Has a `fee_amount`, `committed_videos`, `committed_posts`, and `period`.
- **Program**: A broader engagement agreement (targeted program, custom commission, or endorsement) tracked via `affiliate_programs` table. Has a `program_type` of {targeted, endorse, custom_commission} and a `status` of {Active, Completed, Cancelled, Breached}.
- **Program_Bertarget**: An Indonesian term used by the admin; synonymous with a targeted program — a Creator committed to hit a `target_gmv` or `target_videos` over a defined period in exchange for non-default treatment.
- **Committed_Videos**: The count of videos a Creator has agreed to produce under an Endorsement or Program within its `period`.
- **Action**: A single unit of work recommended to the admin, consisting of (Creator, Action_Type, Trigger_Reason, Created_At, Due_At, Status). Status ∈ {Open, Done, Snoozed, Expired}.
- **Action_Type**: One of {Follow_Up_Sample, Recover_Star, Chase_Delivery, Reward_Momentum, Investigate_Refunds, Reactivation_Candidate, Follow_Up_Broadcast}. Each type has exactly one Trigger_Condition.
- **Trigger_Condition**: A boolean predicate over the creator's derived state that, when true, causes an Action of the corresponding Action_Type to be Open.
- **Action_Completion**: A persisted record marking an Action as Done by the admin. Once an Action is Done, the same (Creator, Action_Type) pair SHALL NOT generate another Action until the Trigger_Condition transitions from false back to true.
- **Snooze**: A timed suppression that moves an Action to Snoozed status until the Snooze_Until timestamp, at which point the Action returns to Open if the Trigger_Condition still holds.
- **Dormant**: A Creator with zero affiliate GMV and zero video uploads for a configurable number of days, default 45.
- **Recovery_Potential**: A scalar computed as `max_historical_monthly_gmv × recency_weight` used to rank Reactivation candidates.
- **Recency_Weight**: A monotonically non-increasing function of months-since-last-activity, defined in Requirement 6.
- **Broadcast**: A copy-to-clipboard batch message operation targeting multiple selected Creators.
- **Template**: A stored message body containing zero or more Variables delimited by `{{` and `}}`.
- **Variable**: A placeholder inside a Template that is substituted per-Creator from the Variable_Substitution_Map.
- **Round_Trip_Property**: A correctness property stating that `parse(serialize(x)) = x` and `serialize(parse(s)) = s` for all valid `x` and `s` in the respective domains.
- **Video_Target**: An admin-configured integer representing the team's committed video count over the currently selected period.
- **Pacing_Rate**: `(Video_Target − videos_done) / days_remaining_in_period`, displayed as "Need N/day".
- **Supabase_DB**: The project's Supabase Postgres instance. All new tables (`affiliate_actions`, `affiliate_samples`, `affiliate_endorsements`, `affiliate_programs`, `affiliate_prospects`, `affiliate_creator_notes`, `affiliate_broadcast_templates`, `affiliate_broadcast_log`, `affiliate_settings`) SHALL be persisted here.
- **Store_Scoping**: Every new table SHALL include a non-null `store_id uuid` column referencing `stores(id)`. All read queries SHALL be filtered by the currently active `store_id` from `useStoreManager`. No record SHALL be visible across stores.
- **Additive_Constraint**: The existing read paths in `AffiliateScreen.tsx` (KPI cards, channel mix, creator list, tier breakdown, Pareto, segmentation, target vs achievement against `affiliate_targets`) SHALL continue to function unchanged. New capabilities are rendered in new panels, tabs, modals, or drill-downs.
- **Affiliate_Targets_Table**: The existing `affiliate_targets` persistence defined in `src/lib/types.ts` as `AffiliateTarget { id, period, targetGMV, targetVideos, targetLive, targetOrders, targetActiveCreators, targetCommission, notes }`, scoped per store via the existing Zustand store manager. The Video_Tracker SHALL read Video_Target from this table's `targetVideos` field for the selected `period`.

## Requirements

### Requirement 1: Today's Action List

**User Story:** As the sole admin, I want a ranked daily task queue that tells me which creators need attention today and why, so that I can act instead of scanning metrics.

#### Acceptance Criteria

1. WHEN the Affiliate dashboard is opened, THE Today_Action_Panel SHALL display all Actions with Status = Open, sorted descending by Action_Priority with ascending Action.created_at as a tiebreaker, paginated at 50 Actions per page with a control to load additional pages.
2. THE Today_Action_Panel SHALL group Actions per Creator such that a single Creator with multiple Open Actions is displayed with one row per Action, not one aggregated row.
3. WHEN the Trigger_Condition of Action_Type = Follow_Up_Sample evaluates as true (a Sample with Status ∈ {Sent, Received} whose `date_sent` is more than Sample_Follow_Up_Days before today and whose Creator has zero new affiliate videos in that window), THE Affiliate_Action_System SHALL create exactly one Open Action of type Follow_Up_Sample for that (Creator, Sample) pair.
4. WHEN the Trigger_Condition of Action_Type = Recover_Star evaluates as true (the Creator was in the top Recover_Star_Top_N by GMV in the previous calendar month AND has zero videos and zero GMV in the current calendar month), THE Affiliate_Action_System SHALL create exactly one Open Action of type Recover_Star per (Creator, current calendar month) pair.
5. WHEN the Trigger_Condition of Action_Type = Chase_Delivery evaluates as true (the Creator has an active Endorsement or Program whose `end_date` is Chase_Delivery_Window_Days or fewer days away AND whose `committed_videos` exceeds the actual video count in the Endorsement or Program period so far), THE Affiliate_Action_System SHALL create exactly one Open Action of type Chase_Delivery per (Creator, Endorsement|Program) pair.
6. WHEN the Trigger_Condition of Action_Type = Reward_Momentum evaluates as true (the Creator's current-calendar-month GMV is at least Momentum_Multiplier times the prior calendar month's GMV AND prior-month GMV is greater than zero), THE Affiliate_Action_System SHALL create exactly one Open Action of type Reward_Momentum per (Creator, current calendar month) pair.
7. WHEN the Trigger_Condition of Action_Type = Investigate_Refunds evaluates as true (the Creator's current-calendar-month refund rate exceeds their own 3-calendar-month trailing median refund rate by more than 10 percentage points AND current-calendar-month refunded GMV exceeds 100,000 IDR), THE Affiliate_Action_System SHALL create exactly one Open Action of type Investigate_Refunds per (Creator, current calendar month) pair.
8. WHEN the Trigger_Condition of Action_Type = Reactivation_Candidate evaluates as true (the Creator's historical maximum single-month GMV is at least Reactivation_Min_Max_GMV AND the Creator has zero affiliate GMV and zero videos for more than the configured Dormant_Threshold_Days, which defaults to 45 when not configured), THE Affiliate_Action_System SHALL create exactly one Open Action of type Reactivation_Candidate per Creator, which persists until manually marked Done or until the Creator records any affiliate activity.
9. THE Today_Action_Panel SHALL render each Action with (Creator_Username, Action_Type_Chip, Why_Now_Text, Quick_Action_Buttons), where Quick_Action_Buttons are exactly {Copy WA, Add Note, Mark Done, Snooze}.
10. WHEN the admin clicks Mark Done on an Action, THE Affiliate_Action_System SHALL set that Action's Status to Done and SHALL record an Action_Completion row with `completed_at = now()`.
11. WHEN the admin clicks Snooze on an Action and selects a duration D where 1 hour ≤ D ≤ 30 days, THE Affiliate_Action_System SHALL set that Action's Status to Snoozed and SHALL overwrite any existing `snooze_until` with `now() + D`.
12. IF the admin submits a Snooze with a duration D outside the range 1 hour ≤ D ≤ 30 days, THEN THE Affiliate_Action_System SHALL reject the request, leave the Action's Status and `snooze_until` unchanged, and return an error indicating the allowed duration range.
13. WHEN the current time exceeds an Action's `snooze_until` AND the Action's Trigger_Condition still evaluates as true, THE Affiliate_Action_System SHALL set that Action's Status back to Open.
14. WHEN an Action's Trigger_Condition evaluates as false during a recompute, THE Affiliate_Action_System SHALL set that Action's Status to Expired and SHALL NOT display it in the Today_Action_Panel.
15. THE Affiliate_Action_System SHALL recompute Trigger_Conditions on each Affiliate dashboard mount and whenever the admin triggers a manual refresh.
16. THE Action_Priority of an Action SHALL be computed as `action_type_base_weight × creator_max_historical_gmv_scale` where Action_Type base weights are {Chase_Delivery: 100, Investigate_Refunds: 90, Follow_Up_Sample: 70, Recover_Star: 60, Reactivation_Candidate: 40, Reward_Momentum: 30, Follow_Up_Broadcast: 20}, and `creator_max_historical_gmv_scale` is defined piecewise on the Creator's historical maximum single-month GMV G as: 1.0 when G < 1,000,000 IDR; 1.25 when 1,000,000 ≤ G < 10,000,000 IDR; 1.5 when 10,000,000 ≤ G < 100,000,000 IDR; 2.0 when G ≥ 100,000,000 IDR.
17. WHEN the admin filters the Today_Action_Panel by Action_Type, THE Today_Action_Panel SHALL display only Open Actions whose Action_Type matches the filter selection.
18. THE Affiliate_Action_System SHALL evaluate all references to "today", "now()", "calendar month", and `end_date`/`date_sent` comparisons in this requirement using the Asia/Jakarta (UTC+7) timezone.
19. WHEN an Action with Status = Done has its Trigger_Condition evaluate as false in a later recompute and subsequently evaluate as true again, THE Affiliate_Action_System SHALL create a new Open Action with a distinct Action identifier rather than reopening the existing Done Action, subject to the same per-pair or per-month uniqueness rules defined for that Action_Type.
20. IF a Creator is deleted from `affiliate_creators`, THEN THE Affiliate_Action_System SHALL set the Status of that Creator's Open and Snoozed Actions to Expired and SHALL NOT display those Actions in the Today_Action_Panel.

### Requirement 2: Video Production Tracker

**User Story:** As the admin, I want video count to be the hero metric with pacing guidance, so that I know each day whether the team is on track for the monthly video target.

#### Acceptance Criteria

1. THE Video_Tracker SHALL display a Progress_Ring showing (Video_Target, videos_done, videos_remaining) for the currently selected period, where videos_remaining is `max(0, Video_Target − videos_done)`.
2. THE Video_Tracker SHALL display Pacing_Rate as the integer ceiling of `(Video_Target − videos_done) / days_remaining_in_period`.
3. WHEN `days_remaining_in_period` is zero or negative, THE Video_Tracker SHALL display the literal text "Period ended" in place of Pacing_Rate.
4. WHEN Video_Target for the selected period is zero or unset, THE Video_Tracker SHALL display the literal text "No target set" in place of Pacing_Rate and SHALL render the pacing indicator in neutral (grey).
5. THE Video_Tracker SHALL compute the trailing N-day average daily video rate as `sum(daily_videos over last min(7, available_days)) / min(7, available_days)`, and SHALL treat the resulting rate as zero when no video data exists in the trailing window.
6. IF Pacing_Rate is less than or equal to zero (ahead of target) OR Pacing_Rate is within 0 to 1.2 times the trailing 7-day average daily video rate, THEN THE Video_Tracker SHALL render the pacing indicator in green.
7. IF Pacing_Rate is greater than 1.2 and at most 2.0 times the trailing 7-day average daily video rate, THEN THE Video_Tracker SHALL render the pacing indicator in amber.
8. IF Pacing_Rate is greater than 2.0 times the trailing 7-day average daily video rate OR the trailing 7-day average is zero while Pacing_Rate is positive, THEN THE Video_Tracker SHALL render the pacing indicator in red.
9. THE Video_Tracker SHALL display a 30-day daily video production trend chart with one data point per day, where the attribution date of each video is the video's upload date (date published to TikTok) in the Asia/Jakarta timezone.
10. THE Video_Tracker SHALL display a breakdown of videos produced in the selected period by source bucket, where source bucket is one of {endorse, program_bertarget, organic}, determined by the Creator's active Program or Endorsement at the video's upload date.
11. WHERE a Creator has both an active Program with program_type = targeted AND an active Endorsement at a video's upload date, THE Video_Tracker SHALL attribute the video to the program_bertarget bucket (Program type takes precedence over Endorsement type); creators with no active Program or Endorsement at the video's upload date SHALL be bucketed as organic.
12. THE Video_Tracker SHALL display a leaderboard of the top 20 Creators by video count in the selected period, ranked descending by video count, with ties broken by GMV descending then creator_username ascending.
13. WHEN a Creator has an active Endorsement or Program with `committed_videos > 0` AND the Creator's video count in the period is less than `committed_videos × elapsed_fraction_of_period`, THE Video_Tracker SHALL flag that Creator as behind-commitment in the leaderboard.
14. WHEN the admin edits the Video_Target for a period to a non-negative integer, THE Affiliate_Action_System SHALL persist the new value in the existing `affiliate_targets` source (the `targetVideos` field of the row matching the active store and `period`) and SHALL NOT introduce a parallel video-target store; IF no row exists for the active store and `period`, THEN one SHALL be created with other fields defaulted to zero; IF the admin submits a negative or non-integer Video_Target, THEN THE Affiliate_Action_System SHALL reject the change and return an error.

### Requirement 3: Sample & Endorse Tracker

**User Story:** As the admin, I want to log samples and endorsements in the system so that I stop losing history in WhatsApp chats and can enforce follow-up.

#### Acceptance Criteria

1. THE Sample_Tracker SHALL provide a form to record a new Sample with required fields (creator_username, sku, date_sent, expected_post_date, status) and optional fields (cost, notes), where creator_username is 1–100 characters, sku is 1–100 characters, cost is a non-negative integer up to 100,000,000 IDR, and notes is at most 1,000 characters.
2. THE Sample_Tracker SHALL persist each submitted Sample as one row in `affiliate_samples`.
3. THE Sample_Tracker SHALL render a Kanban board with exactly five columns in this order: Sent, Received, Posted, Sold, Failed.
4. WHEN the admin drags a Sample card from one column to another OR selects a new status from a dropdown, THE Sample_Tracker SHALL update that Sample's `status` only if the transition is one of the Sample_Status_Allowed_Transitions: {Sent→Received, Sent→Posted, Sent→Failed, Received→Posted, Received→Failed, Posted→Sold, Posted→Failed, Sold→Failed}.
5. IF the admin attempts a transition not in Sample_Status_Allowed_Transitions, THEN THE Sample_Tracker SHALL reject the transition, retain the Sample's existing status, and display a message stating the transition is not permitted.
6. WHEN a Sample has Status ∈ {Sent, Received} AND the current date in Asia/Jakarta timezone is past `expected_post_date`, THE Sample_Tracker SHALL display the Sample with a visible overdue indicator that is visually distinct from cards that are not overdue.
7. THE Sample_Tracker SHALL provide a "Copy pending list" button that, when clicked, copies to the clipboard a newline-separated list of all Samples with Status ∈ {Sent, Received} formatted as `@{creator_username} — {sku} — sent {date_sent}`.
8. THE Endorsement_Tracker SHALL provide a form to record a new Endorsement with required fields (creator_username, fee_amount, committed_videos, committed_posts, period_start, period_end, status) and optional field notes, where fee_amount is a non-negative integer up to 1,000,000,000 IDR, committed_videos and committed_posts are non-negative integers up to 10,000, and notes is at most 1,000 characters.
9. THE Endorsement_Tracker SHALL persist each submitted Endorsement as one row in `affiliate_endorsements`.
10. THE Endorsement_Tracker SHALL compute `endorsement_fulfilment_percent = actual_videos_in_period / committed_videos × 100` for each Endorsement, where `actual_videos_in_period` is the Creator's affiliate video count within [period_start, period_end] in Asia/Jakarta timezone; WHEN committed_videos is zero, fulfilment percent SHALL be 100.
11. WHEN the admin marks an Endorsement as Completed AND `endorsement_fulfilment_percent < 100` at the time of marking, THE Endorsement_Tracker SHALL record the final status as Breached.
12. THE Sample_Tracker SHALL match a Sample's Posted status against new affiliate videos by matching the Creator's new video upload dates within the window [date_sent, date_sent + 21 days] in Asia/Jakarta timezone; WHEN a matching new video is detected, THE Sample_Tracker SHALL display a suggestion UI element on the Sample card proposing the transition to Posted, without mutating the Sample's status automatically.
13. IF a Sample or Endorsement form is submitted with a missing required field, or with a value outside the documented bounds, or with `expected_post_date < date_sent`, or with `period_end < period_start`, THEN THE Sample_Tracker or Endorsement_Tracker SHALL reject the submission and display an error identifying the offending field.
14. IF a Sample or Endorsement form is submitted with a creator_username that matches no row in `affiliate_creators`, THEN THE Sample_Tracker or Endorsement_Tracker SHALL accept the submission and display a visible "prospect" indicator on the resulting record.
15. THE Sample_Tracker SHALL render the Sample form's status field as a dropdown whose initial value defaults to Sent and whose selectable options are exactly the values permitted by Sample_Status_Allowed_Transitions as entry points (Sent, Received, Posted, Sold, Failed).

### Requirement 4: Special Commission & Program Tracker

**User Story:** As the admin, I want to track custom-commission, targeted, and paid-endorsement programs with their ROI, so that I can stop renewing programs that don't pay back.

#### Acceptance Criteria

1. THE Program_Tracker SHALL provide a form to record a Program with required fields (creator_username, program_type, start_date, end_date, status) and optional fields (commission_rate, target_gmv, target_videos, fee_amount, notes), where commission_rate is between 0.0 and 1.0 inclusive, target_gmv and fee_amount are non-negative integers up to 10,000,000,000 IDR, and target_videos is a non-negative integer up to 100,000.
2. THE Program_Tracker SHALL persist each submitted Program as one row in `affiliate_programs` with Status ∈ {Active, Completed, Cancelled, Breached}.
3. IF the admin submits a Program where `start_date > end_date`, or where any numeric field is outside its documented bounds, or where a Program with the same (creator_username, program_type) already exists with Status = Active and overlapping [start_date, end_date], THEN THE Program_Tracker SHALL reject the submission and display an error identifying the conflict or invalid field.
4. THE Program_Tracker SHALL permit a Creator to have multiple concurrent Programs with Status = Active as long as their `program_type` values are distinct.
5. THE Program_Tracker SHALL compute `program_gmv` over [start_date, end_date] by pro-rating each month's creator GMV by the fraction of that month overlapping the Program window; when the existing `affiliate_creators` data has monthly granularity, a month partially contained in the window contributes `(days_of_overlap / days_in_month) × monthly_gmv`.
6. THE Program_Tracker SHALL compute `program_cost = fee_amount + commission_overpayment`, where `commission_overpayment = max(0, (commission_rate − default_commission_rate) × program_gmv)` and `default_commission_rate` is stored in `affiliate_settings.default_commission_rate`.
7. THE Program_Tracker SHALL compute `program_roi = program_gmv / program_cost` whenever `program_cost > 0`, and SHALL display "N/A" otherwise.
8. THE Program_Tracker SHALL display a list of Programs with Status = Active showing (creator_username, program_type, target_gmv, program_gmv, target_videos, actual_videos, program_cost, program_roi).
9. WHEN a Program has `fee_amount > 0` AND `elapsed_fraction_of_period ≥ 0.25` AND either (`program_gmv < target_gmv × elapsed_fraction_of_period × 0.8`) OR (`actual_videos < target_videos × elapsed_fraction_of_period × 0.8`), THE Program_Tracker SHALL flag that Program as underperforming.
10. THE Program_Tracker SHALL display aggregate totals per `program_type`: (total_program_cost, total_program_gmv, aggregate_roi) where `aggregate_roi = total_program_gmv / total_program_cost` when total_program_cost > 0, otherwise "N/A".
11. WHEN a Program has `program_gmv > 0`, the fields `creator_username`, `program_type`, `start_date`, `end_date`, `commission_rate`, and `fee_amount` SHALL become immutable; only `target_gmv`, `target_videos`, `status`, and `notes` remain editable.
12. WHEN the admin changes `affiliate_settings.default_commission_rate`, THE Program_Tracker SHALL recompute all displayed `commission_overpayment`, `program_cost`, and `program_roi` values on the next dashboard mount or manual refresh using the new rate; historical `program_gmv` remains unchanged.

### Requirement 5: New Creator Pipeline

**User Story:** As the admin, I want a pipeline board for sourcing and onboarding new creators, so that I can systematically grow the creator base.

#### Acceptance Criteria

1. THE Prospect_Pipeline SHALL provide a form to record a new Prospect with required fields (creator_username 1–100 characters, source, stage) and optional fields (notes up to 1,000 characters, added_date defaulting to today in Asia/Jakarta timezone).
2. THE Prospect_Pipeline SHALL persist each submitted Prospect as one row in `affiliate_prospects`.
3. THE Prospect_Pipeline SHALL render a Kanban board with exactly six columns in this order: Prospect, Contacted, Replied, Sample_Sent, First_Video, Active.
4. THE Prospect_Pipeline SHALL permit forward stage transitions from any stage to any later stage in the order above.
5. WHEN the admin attempts to transition a Prospect to an earlier stage, THE Prospect_Pipeline SHALL require a non-empty `revert_reason` text input of 1–500 characters and SHALL append the reason to the Prospect's `notes` field with an ISO-8601 timestamp prefix `[REVERT 2026-05-08T14:30:00+07:00] {reason}`.
6. THE Prospect_Pipeline SHALL display a funnel chart showing the count of Prospects currently in each stage, the cumulative count that ever passed through each stage, and the drop-off percentage between adjacent stages rounded to one decimal place.
7. THE Prospect_Pipeline SHALL provide a CSV import function that accepts columns (creator_username, source, stage, notes) with case-insensitive header matching, rejects rows where creator_username is empty or already exists in `affiliate_prospects` with exact case-sensitive match, creates one Prospect per valid row, limits each import to 10,000 rows, and reports every invalid or skipped row to the admin with the row number and reason.
8. WHEN a Prospect's stage is transitioned to Active, THE Prospect_Pipeline SHALL check for a matching row in `affiliate_creators` by case-insensitive `creator_username` match; IF found, THE Prospect_Pipeline SHALL link the Prospect to the Creator record by storing the matched `creator_username` in the Prospect's `linked_creator_username` field; IF not found, THE Prospect_Pipeline SHALL display a confirmation dialog noting no match exists and permitting the admin to proceed or cancel.
9. WHEN a Prospect is in stage First_Video AND a matching row appears in `affiliate_creators` with `affiliate_shoppable_videos ≥ 1` for any period, THE Prospect_Pipeline SHALL display a suggestion UI element on the Prospect card proposing the transition to Active, without mutating the Prospect's stage automatically.
10. WHEN a new Prospect is created AND a matching row exists in `affiliate_creators` by case-insensitive `creator_username` match AND that Creator has `affiliate_shoppable_videos ≥ 1` for any period, THE Prospect_Pipeline SHALL default the Prospect's `stage` to Active and populate `linked_creator_username`.
11. THE Prospect_Pipeline SHALL maintain a stage-transition audit trail by persisting one row per transition in the Prospect's `notes` field with an ISO-8601 timestamp prefix `[STAGE {from}→{to} 2026-05-08T14:30:00+07:00]`, or in a dedicated `affiliate_prospect_stage_log` table keyed by prospect_id, timestamp, from_stage, to_stage, reason.

### Requirement 6: Re-activation Candidates

**User Story:** As the admin, I want to see dormant creators ranked by recovery potential, so that I can prioritize reactivation outreach.

#### Acceptance Criteria

1. THE Reactivation_View SHALL display Creators whose historical maximum single-month affiliate GMV is at least Reactivation_Min_Max_GMV (default 500,000 IDR) AND whose most recent month with any affiliate GMV or video activity is more than 60 calendar days before today in Asia/Jakarta timezone.
2. THE Reactivation_View SHALL rank listed Creators descending by Recovery_Potential, with ties broken by max_historical_monthly_gmv descending then creator_username ascending, where `Recovery_Potential = max_historical_monthly_gmv × recency_weight(months_since_last_activity)`.
3. THE Reactivation_View SHALL compute `months_since_last_activity(c) = floor((today_date - last_activity_date) / 30)` in calendar days, and SHALL compute `recency_weight(m) = max(0.2, 1.0 − 0.1 × m)` for months-since-last-activity `m`, with the floor value of 0.2 applying to all `m ≥ 8`.
4. THE Reactivation_View SHALL display for each listed Creator (creator_username, max_historical_monthly_gmv, months_since_last_activity, baseline_refund_rate, recovery_potential), where `baseline_refund_rate = sum(monthly_refunded_gmv) / sum(monthly_gmv)` over all months with monthly_gmv > 0, and SHALL display "N/A" when that denominator is zero.
5. THE Reactivation_View SHALL permit multi-select via checkboxes and SHALL provide a "Copy usernames" button.
6. WHEN the admin clicks "Copy usernames" with at least one Creator selected, THE Reactivation_View SHALL copy to the clipboard the selected creators' usernames as a newline-separated list and SHALL display a confirmation showing the count of copied usernames.
7. IF the admin clicks "Copy usernames" or "Copy message from template" while zero Creators are selected, THEN THE Reactivation_View SHALL display a validation error indicating at least one Creator must be selected and SHALL NOT write to the clipboard.
8. WHEN the admin clicks "Copy message from template" with at least one Creator selected and a Template chosen, THE Reactivation_View SHALL delegate to the Broadcast_Helper as defined in Requirement 8.

### Requirement 7: Quick Notes per Creator

**User Story:** As the admin, I want to attach notes to creators so that I remember past conversations, complaints, and commission requests without hunting through WhatsApp.

#### Acceptance Criteria

1. THE Creator_Notes_System SHALL persist each note as one row in `affiliate_creator_notes` with fields (creator_username, note_text, note_type, created_at, created_by), where note_text is 1–2,000 characters and created_at is set by the system at insert time in Asia/Jakarta timezone.
2. THE Creator_Notes_System SHALL accept `note_type` values from exactly this set: {chat, issue, commission_request, feedback, other}.
3. WHERE a Creator has at least one note, THE Creator_Notes_System SHALL display a note icon with a count badge next to that Creator in the creator list view.
4. WHEN the admin expands a Creator row, THE Creator_Notes_System SHALL display that Creator's notes sorted by `created_at` descending (newest first), each note showing (created_at, note_type, note_text).
5. WHEN the admin submits a search query of at least one character, THE Creator_Notes_System SHALL return all notes whose `note_text` contains the query as a case-insensitive substring, grouped by Creator with groups ordered by most-recent note `created_at` descending and notes within each group sorted by `created_at` descending.
6. WHEN an admin saves a new note, THE Creator_Notes_System SHALL store the note's `created_by` as the string "admin" (reserved for future multi-user).
7. IF a note submission has empty note_text, or note_text exceeding 2,000 characters, or a note_type outside the permitted set, THEN THE Creator_Notes_System SHALL reject the submission and display an error identifying the offending field.
8. THE Creator_Notes_System SHALL treat notes as append-only history: once a note is persisted, its `note_text`, `note_type`, and `created_at` SHALL be immutable and no UI or API path SHALL delete the row. Corrections SHALL be made by adding a new note. The only permitted mutation path is the Rename_Creator RPC in criterion 9, which rewrites `creator_username` only.
9. THE Creator_Notes_System SHALL store notes keyed by `creator_username`. WHEN the admin invokes Rename_Creator with (old_username, new_username), THE Creator_Notes_System SHALL atomically update `creator_username` on all of that Creator's notes, Samples, Endorsements, Programs, and Prospects in a single Supabase RPC call; IF the RPC fails for any reason, THEN no partial updates SHALL remain, and the original `creator_username` values SHALL be preserved.

### Requirement 8: Bulk Actions & WA Broadcast Helper

**User Story:** As the admin, I want to multi-select creators and generate templated WhatsApp broadcast text, so that I can send targeted messages without re-typing each time.

#### Acceptance Criteria

1. THE Broadcast_Helper SHALL render a checkbox in each row of the Affiliate creator list view and a "select all filtered" checkbox in the list header that, when toggled on, selects every Creator matching the currently applied filters up to a maximum of 1,000 Creators per selection.
2. WHEN the admin clicks "Copy phone/username for broadcast" with at least one Creator selected, THE Broadcast_Helper SHALL copy to the clipboard the selected Creators' usernames separated by a single newline (`\n`) character, with no trailing newline.
3. THE Broadcast_Helper SHALL maintain a Template library in `affiliate_broadcast_templates` seeded with at least four Templates named {Follow-Up Sample, Retention Push, Commission Offer, Refund Complaint}, SHALL permit the admin to create, edit, and delete Templates, and SHALL enforce that each Template body is between 1 and 4,000 characters inclusive.
4. THE Broadcast_Helper SHALL support Variables delimited by `{{` and `}}` inside Template bodies; the permitted Variable names are exactly {creator_name, last_gmv, sku_name, last_video_date, custom_note}, matched case-sensitively after trimming ASCII whitespace inside the delimiters.
5. WHEN the admin selects one or more Creators and a Template, THE Broadcast_Helper SHALL render a preview per Creator by substituting each Variable with that Creator's corresponding value from the Variable_Substitution_Map, and SHALL substitute an empty string for any Variable whose resolved value is null, undefined, or missing.
6. IF a Template contains an undefined Variable (any token between `{{` and `}}` whose trimmed name is not in the permitted list), THEN THE Broadcast_Helper SHALL display a validation error listing the offending Variable name and SHALL NOT permit copying or marking the broadcast sent.
7. WHERE a Template body contains only permitted Variables, THE Broadcast_Helper SHALL guarantee the Round_Trip_Property: parsing the body into a sequence of (literal, variable) tokens and re-serializing SHALL produce the original body byte-for-byte.
8. WHEN the admin clicks "Copy full broadcast text" with at least one Creator selected and a Template chosen, THE Broadcast_Helper SHALL copy to the clipboard the concatenation of all per-Creator rendered messages separated by exactly two newline (`\n\n`) characters, with no trailing newlines.
9. IF the admin clicks "Copy phone/username for broadcast", "Copy full broadcast text", or "Mark broadcast sent" while zero Creators are selected or while no Template is chosen (for actions that require a Template), THEN THE Broadcast_Helper SHALL display a validation error indicating which prerequisite is missing and SHALL NOT write to the clipboard nor insert any log rows.
10. WHEN the admin clicks "Mark broadcast sent" with at least one Creator selected and a Template chosen, THE Broadcast_Helper SHALL insert exactly one row into `affiliate_broadcast_log` per selected Creator containing (creator_username, template_id, sent_at, action_id_closed).
11. WHERE the selected Template maps to an Action_Type per criterion 13's fixed mapping, WHEN the admin clicks "Mark broadcast sent", THE Broadcast_Helper SHALL set Status = Done on all Open Actions for each selected Creator whose Action_Type equals the mapped value, and SHALL record each closed Action's identifier in the corresponding log row's action_id_closed field.
12. IF the selected Template has no entry in the Template-to-Action_Type mapping (e.g., an admin-created custom Template), THEN THE Broadcast_Helper SHALL still insert the broadcast log rows with action_id_closed set to null and SHALL NOT modify the Status of any Open Actions.
13. THE Broadcast_Helper SHALL map Templates to Action_Types via the fixed mapping: Follow-Up Sample → Follow_Up_Sample, Retention Push → Reactivation_Candidate, Commission Offer → Reward_Momentum, Refund Complaint → Investigate_Refunds.
14. WHEN the admin clicks "Copy full broadcast text", "Mark broadcast sent", "Bulk tag", or "Bulk export CSV" on a multi-selection, THE Broadcast_Helper SHALL first display a preview panel showing (count of selected Creators, list of selected usernames truncated to first 20 with an ellipsis beyond that, resolved action summary including which Open Actions would be closed per criterion 11) and SHALL require explicit confirmation before performing the action.
15. THE Broadcast_Helper SHALL provide a "Bulk set tag" action that, when confirmed, writes a single append-only note per selected Creator via the Creator_Notes_System with `note_type = other` and `note_text` equal to a system-generated string of the form `[BULK TAG] {tag_value}` where `tag_value` is 1–100 characters; tags are not a separate schema, they are surfaced via the notes search in Requirement 7.
16. THE Broadcast_Helper SHALL provide a "Bulk export CSV" action that, when confirmed, produces a UTF-8 CSV file with header row `creator_username,last_gmv,last_video_date,notes_count,active_program_type` and one row per selected Creator, with values drawn from the Variable_Substitution_Map, and SHALL trigger a browser download named `affiliate-export-{YYYYMMDD-HHMMSS}.csv` in Asia/Jakarta timezone.
17. FOR ALL bulk operations defined in this requirement, applying the same operation twice in succession with the same selection and the same Template SHALL produce the same observable persisted state as applying it once (idempotence): the second apply SHALL NOT insert additional `affiliate_broadcast_log` rows for the same (creator_username, template_id, and the admin session's most recent "Mark broadcast sent" timestamp), SHALL NOT re-close already-Done Actions, and SHALL NOT append duplicate `[BULK TAG] ...` notes within the same admin session for the same tag value and creator_username.

### Requirement 9: Persistence and Cross-Device Sync

**User Story:** As the admin, I want all feature state to be available on every device I use, so that I can work from laptop, tablet, or phone.

#### Acceptance Criteria

1. THE Affiliate_Action_System SHALL persist all new records (Actions, Samples, Endorsements, Programs, Prospects, Notes, Templates, Broadcast Log, Settings) in Supabase_DB.
2. WHEN the admin writes a record on one device, THE Affiliate_Action_System SHALL make that record available to any other authenticated device on the next read with no local-only drift.
3. IF Supabase_DB is unreachable at write time, THEN THE Affiliate_Action_System SHALL display a non-blocking error toast naming the affected record type and SHALL NOT silently drop the write.
4. THE Affiliate_Action_System SHALL NOT store any of the new record types exclusively in `localStorage` or Zustand's persisted state.
5. THE Affiliate_Action_System SHALL include a non-null `store_id uuid` column referencing `stores(id)` on every new table (`affiliate_actions`, `affiliate_samples`, `affiliate_endorsements`, `affiliate_programs`, `affiliate_prospects`, `affiliate_creator_notes`, `affiliate_broadcast_templates`, `affiliate_broadcast_log`, `affiliate_settings`, `affiliate_prospect_stage_log` when used) and SHALL filter every read query by the active `store_id` from `useStoreManager`.
6. WHEN the admin switches the active store in `useStoreManager`, THE Affiliate_Action_System SHALL invalidate in-memory caches of Actions, Samples, Endorsements, Programs, Prospects, Notes, and Broadcast Log, and SHALL reload them filtered by the new `store_id` on the next panel render.
7. THE Affiliate_Action_System SHALL NOT modify, remove, or regress any existing behaviour of `AffiliateScreen.tsx`, `src/lib/affiliateParser.ts`, `src/lib/db.ts`, or the `affiliate_summaries` / `affiliate_creators` / `affiliate_targets` data paths. New UI SHALL be rendered as additional panels, tabs, or drill-downs that coexist with the current Dashboard, Kreator, and Perbandingan views.
8. IF Supabase_DB is not configured (`isSupabaseConfigured === false`), THEN THE Affiliate_Action_System SHALL render each new panel with a visible "Requires Supabase" empty state explaining that action-driven features need server persistence, and SHALL disable write controls; existing read-only Affiliate views SHALL remain fully functional.

### Requirement 10: Configurable Thresholds

**User Story:** As the admin, I want to tune the thresholds that drive action rules, so that the system adapts as the creator base grows.

#### Acceptance Criteria

1. THE Affiliate_Action_System SHALL store tunable thresholds in `affiliate_settings` as a key-value table with at least these keys: Dormant_Threshold_Days (default 45, valid range 7–365), Sample_Follow_Up_Days (default 3, valid range 1–30), Chase_Delivery_Window_Days (default 7, valid range 1–30), Momentum_Multiplier (default 1.5, valid range 1.1–5.0), Recover_Star_Top_N (default 20, valid range 5–100), Reactivation_Min_Max_GMV (default 500,000 IDR, valid range 100,000–100,000,000), Default_Commission_Rate (default 0.08, valid range 0.0–1.0).
2. THE Affiliate_Action_System SHALL provide a Settings panel UI to edit each of the keys listed in acceptance criterion 1.
3. WHEN the admin changes a threshold value, THE Affiliate_Action_System SHALL recompute all dependent Trigger_Conditions on the next dashboard mount or manual refresh.
4. IF a threshold value is set to a value outside its documented valid range, THEN THE Affiliate_Action_System SHALL reject the change and SHALL display the valid range.

## Correctness Properties

The following properties SHALL be executable as property-based tests against the Affiliate_Action_System's pure business logic (action-rule evaluation, sample state machine, prospect state machine, program-ROI arithmetic, template parse/serialize).

1. **Action persistence**: FOR ALL Actions A, IF A.status = Open at time t₀ AND A's Trigger_Condition still holds at time t₁ > t₀ AND no Mark_Done has been recorded for A between t₀ and t₁, THEN A.status = Open at t₁.
2. **Action closure by condition**: FOR ALL Actions A, IF A's Trigger_Condition holds at t₀ and does not hold at t₁ > t₀, THEN A.status at t₁ is Expired (not Open).
3. **Snooze wake-up**: FOR ALL Actions A with A.status = Snoozed at t₀ and A.snooze_until ≤ t₁, IF A's Trigger_Condition holds at t₁ THEN A.status at t₁ is Open; IF A's Trigger_Condition does not hold at t₁ THEN A.status at t₁ is Expired.
4. **Sample state-machine monotonicity**: FOR ALL Samples s and all sequences of transitions τ applied to s, each individual transition in τ SHALL be a member of Sample_Status_Allowed_Transitions; no sequence SHALL move s from Sold back to Posted, Received, or Sent.
5. **Prospect forward-only under normal flow**: FOR ALL Prospects p, IF no revert_reason is provided, THEN every transition of p.stage SHALL be to a stage strictly later in the pipeline ordering.
6. **Program ROI formula**: FOR ALL Programs P with program_cost > 0, `program_roi(P) = program_gmv(P) / program_cost(P)`, where `program_cost(P) = fee_amount + max(0, (commission_rate − default_commission_rate) × program_gmv(P))`.
7. **One active program per type**: FOR ALL Creators c and all Program_Types t, the set of Programs P where `P.creator_username = c AND P.program_type = t AND P.status = Active AND today ∈ [P.start_date, P.end_date]` SHALL have cardinality at most 1.
8. **Multi-type concurrent programs**: FOR ALL Creators c, the set of distinct Program_Types across c's currently Active Programs SHALL equal the count of those Active Programs (no duplicates).
9. **Template round-trip**: FOR ALL Template bodies b whose only `{{…}}` tokens reference permitted Variable names, `serialize(parse(b)) = b` and `parse(serialize(parse(b))) = parse(b)`.
10. **Action-type idempotence of Mark_Done**: FOR ALL Actions A, applying Mark_Done(A) once and applying Mark_Done(A) twice SHALL produce the same persisted state (A.status = Done, exactly one Action_Completion row).
11. **Broadcast closes matching actions**: FOR ALL Broadcast operations B using Template T with `action_type_mapping(T) = AT`, WHEN B is marked sent targeting Creators C, every Open Action A with `A.creator_username ∈ C AND A.action_type = AT` SHALL have A.status = Done after the operation.
12. **Priority ordering**: FOR ALL pairs of Actions (A₁, A₂) displayed in the Today_Action_Panel at the same time, IF A₁ appears above A₂ in the list THEN `priority(A₁) ≥ priority(A₂)`.
13. **Recency weight monotonicity**: FOR ALL pairs of months-since-last-activity (m₁, m₂), IF m₁ < m₂ THEN `recency_weight(m₁) ≥ recency_weight(m₂)`, and `recency_weight(m) ≥ 0.2` for all m ≥ 0.
14. **Pro-rated program GMV correctness**: FOR ALL Programs P, `program_gmv(P)` equals the sum of `(days_of_overlap_with_month / days_in_month) × monthly_gmv(creator, month)` over all months intersecting [P.start_date, P.end_date].
15. **Notes append-only**: FOR ALL note rows N inserted at time t₀ and any later time t₁ > t₀, IF no Rename_Creator RPC has been invoked between t₀ and t₁, THEN N.note_text, N.note_type, and N.created_at at t₁ equal their values at t₀, and N still exists (no row has been deleted). The history of notes for any Creator is monotonically non-decreasing in length between Rename_Creator invocations.
16. **Bulk action idempotence**: FOR ALL bulk operations B (broadcast send, bulk tag, CSV export, bulk status change) over selection S with Template T within a single admin session, applying B twice produces the same persisted state as applying it once, as detailed in Requirement 8 criterion 17.
17. **Store isolation**: FOR ALL stores s₁ ≠ s₂ and any record type R ∈ {Actions, Samples, Endorsements, Programs, Prospects, Notes, Broadcast Log, Settings, Templates}, the set of R records visible when `active_store_id = s₁` SHALL be disjoint from the set visible when `active_store_id = s₂`, with respect to the `store_id` column.
18. **Reactivation excludes actively trending**: FOR ALL Creators c listed in the Reactivation_View at time t, c SHALL have zero affiliate GMV and zero video activity within the 60 calendar days preceding t; in particular, no Creator with current-calendar-month GMV greater than zero SHALL appear in the view.

## Open Design Questions Resolved Here

- **Action granularity**: per (Creator, Action_Type, trigger-instance). A Creator with three pending samples overdue yields three Follow_Up_Sample Actions, one per Sample.
- **Conflict resolution for simultaneous triggers**: no resolution needed — each Trigger_Condition produces its own Action independently; the panel ranks them by priority.
- **Sample Posted matching against video data**: date-proximity heuristic (new video within 21 days of `date_sent`) produces a suggestion; the admin confirms manually. Not auto-applied.
- **Dormant definition**: configurable via `Dormant_Threshold_Days` in `affiliate_settings`, default 45 days.
- **Prospect First_Video → Active trigger**: suggestion generated when `affiliate_creators` shows a matching username with `affiliate_shoppable_videos ≥ 1`; admin confirms.
- **Preserving notes across username changes**: admin manually invokes a Rename_Creator RPC that atomically updates all dependent rows.
- **Timezone**: Asia/Jakarta (UTC+7) for all date evaluations.
- **Partial-month program GMV**: pro-rated by days-of-overlap ÷ days-in-month against monthly GMV from `affiliate_creators`.
