// ─── Shared types & localStorage helpers for the hiring pipeline ──────────────

export interface PipelineStage {
  id: string
  label: string
  color: string
  type: 'shortlist' | 'round' | 'offer' | 'hired' | 'rejected'
  roundNumber?: number
}

export interface PipelineCandidate {
  id: string
  name: string
  role: string
  email: string
  phone?: string
  atsScore: number
  experience: number
  education: string
  matchedSkills: string[]
  resumeFileName?: string
  addedAt: string
  source: 'analysis' | 'manual'
}

export interface InterviewSchedule {
  id: string
  jobId: string
  jobTitle: string
  candidateId: string
  candidateName: string
  stageId: string
  stageName: string
  dateTime: string      // ISO string
  duration: number      // minutes
  type: 'VIDEO' | 'IN_PERSON' | 'PHONE'
  panelMembers: string[]
  location: string
  meetingLink: string
  notes: string
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
}

export interface SkillRating {
  skill: string
  rating: number   // 1-5
}

export type EvalType   = 'TECHNICAL' | 'BEHAVIORAL' | 'COMMUNICATION'
export type RoundType  = 'TECHNICAL' | 'BEHAVIORAL' | 'HR' | 'LEADERSHIP' | 'DESIGN' | 'FINAL'
export type RoundStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'

export interface InterviewRound {
  id: string
  candidateId: string
  jobId: string
  roundNumber: number
  title: string
  type: RoundType
  assignedPanelMemberIds: string[]
  assignedPanelMemberNames: string[]
  createdBy: string
  createdByEmail: string
  createdAt: string
  status: RoundStatus
}

const INTERVIEW_ROUNDS_KEY = 'hs_interview_rounds'

export function loadInterviewRounds(candidateId: string, jobId: string): InterviewRound[] {
  try {
    const all: InterviewRound[] = JSON.parse(localStorage.getItem(INTERVIEW_ROUNDS_KEY) ?? '[]')
    return all
      .filter(r => r.candidateId === candidateId && r.jobId === jobId)
      .sort((a, b) => a.roundNumber - b.roundNumber)
  } catch { return [] }
}

export function saveInterviewRound(round: InterviewRound): void {
  try {
    const all: InterviewRound[] = JSON.parse(localStorage.getItem(INTERVIEW_ROUNDS_KEY) ?? '[]')
    const idx = all.findIndex(r => r.id === round.id)
    if (idx >= 0) all[idx] = round; else all.push(round)
    localStorage.setItem(INTERVIEW_ROUNDS_KEY, JSON.stringify(all))
  } catch {}
}

export function deleteInterviewRound(id: string): void {
  try {
    const all: InterviewRound[] = JSON.parse(localStorage.getItem(INTERVIEW_ROUNDS_KEY) ?? '[]')
    localStorage.setItem(INTERVIEW_ROUNDS_KEY, JSON.stringify(all.filter(r => r.id !== id)))
  } catch {}
}

export interface Evaluation {
  id: string
  jobId: string
  jobTitle: string
  candidateId: string
  candidateName: string
  stageId: string
  stageName: string
  interviewRoundId?: string   // links to an InterviewRound
  panelMember: string
  submitterEmail?: string
  evaluationType?: EvalType
  skillRatings: SkillRating[]
  technicalComments?: string
  behavioralComments?: string
  communicationComments?: string
  overallRating: number   // 1-5
  comments: string
  recommendation: 'ADVANCE' | 'HIRE' | 'REJECT' | 'HOLD'
  submittedAt: string
  isDraft?: boolean
}

export interface HireDecision {
  hired: boolean
  notes: string
  offerSalary?: string
  startDate?: string
  finalRating: number
  decidedAt: string
}

export interface PipelineState {
  stages: PipelineStage[]
  candidates: PipelineCandidate[]
  stageMap: Record<string, string>           // candidateId → stageId
  notes: Record<string, string[]>            // candidateId → note[]
  ratings: Record<string, number>            // candidateId → overall HR rating
  hireDecisions: Record<string, HireDecision>
}

export const DEFAULT_STAGES: PipelineStage[] = [
  { id: 'shortlisted',  label: 'Interviewing',        color: '#2563EB', type: 'shortlist' },
  { id: 'round_1',      label: 'Round 1 - Technical', color: '#7C3AED', type: 'round', roundNumber: 1 },
  { id: 'round_2',      label: 'Round 2 - HR',        color: '#DB2777', type: 'round', roundNumber: 2 },
  { id: 'offer',        label: 'Offer Released',       color: '#16A34A', type: 'offer' },
  { id: 'hired',        label: 'Hired',                color: '#0F766E', type: 'hired' },
  { id: 'rejected',     label: 'Rejected',             color: '#DC2626', type: 'rejected' },
]

const pipelineKey  = (jobId: string) => `pipeline_${jobId}`
const schedulesKey = () => `hs_schedules`
const evalsKey     = () => `hs_evaluations`

// ── Pipeline ──────────────────────────────────────────────────────────────────

export function loadPipeline(jobId: string): PipelineState {
  try {
    const raw = localStorage.getItem(pipelineKey(jobId))
    if (raw) {
      const state: PipelineState = JSON.parse(raw)
      // Migrate: rename old "Shortlisted" label to "Interviewing"
      let migrated = false
      state.stages = state.stages.map(s => {
        if (s.id === 'shortlisted' && s.label === 'Shortlisted') {
          migrated = true
          return { ...s, label: 'Interviewing' }
        }
        return s
      })
      if (migrated) localStorage.setItem(pipelineKey(jobId), JSON.stringify(state))
      return state
    }
  } catch {}
  return { stages: DEFAULT_STAGES, candidates: [], stageMap: {}, notes: {}, ratings: {}, hireDecisions: {} }
}

export function savePipeline(jobId: string, state: PipelineState): void {
  localStorage.setItem(pipelineKey(jobId), JSON.stringify(state))
}

// ── Schedules ─────────────────────────────────────────────────────────────────

export function loadSchedules(): InterviewSchedule[] {
  try {
    const raw = localStorage.getItem(schedulesKey())
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function saveSchedule(s: InterviewSchedule): void {
  const all = loadSchedules()
  const idx = all.findIndex(x => x.id === s.id)
  if (idx >= 0) all[idx] = s
  else all.push(s)
  localStorage.setItem(schedulesKey(), JSON.stringify(all))
}

export function deleteSchedule(id: string): void {
  const all = loadSchedules().filter(s => s.id !== id)
  localStorage.setItem(schedulesKey(), JSON.stringify(all))
}

// ── Evaluations ───────────────────────────────────────────────────────────────

export function loadEvaluations(): Evaluation[] {
  try {
    const raw = localStorage.getItem(evalsKey())
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function saveEvaluation(e: Evaluation): void {
  const all = loadEvaluations()
  const idx = all.findIndex(x => x.id === e.id)
  if (idx >= 0) all[idx] = e
  else all.push(e)
  localStorage.setItem(evalsKey(), JSON.stringify(all))
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// ── Shortlist Records ─────────────────────────────────────────────────────────

export interface ShortlistRecord {
  id: string
  candidateId: string           // resumeAnalysisId or pipeline key
  jobId: string
  candidateName: string
  candidateEmail?: string
  shortlistedBy: string         // display name of HR / hiring manager
  shortlistedByRole: string     // HR_ADMINISTRATOR, HIRING_MANAGER, RECRUITER, etc.
  shortlistedByEmail: string
  method: 'MANUAL' | 'AI'
  atsScore?: number
  notes?: string
  shortlistedAt: string
}

const SHORTLIST_KEY = 'hs_shortlist_records'

export function loadShortlistRecords(): ShortlistRecord[] {
  try { return JSON.parse(localStorage.getItem(SHORTLIST_KEY) ?? '[]') } catch { return [] }
}

export function saveShortlistRecord(r: ShortlistRecord): void {
  const all = loadShortlistRecords().filter(x => !(x.candidateId === r.candidateId && x.jobId === r.jobId))
  all.push(r)
  localStorage.setItem(SHORTLIST_KEY, JSON.stringify(all))
}

export function getShortlistRecord(candidateId: string, jobId: string): ShortlistRecord | null {
  return loadShortlistRecords().find(r => r.candidateId === candidateId && r.jobId === jobId) ?? null
}

// ── Candidate Interview Notes ─────────────────────────────────────────────────

export interface CandidateNote {
  id: string
  candidateId: string
  jobId: string
  text: string
  addedBy: string
  addedByRole: string
  addedAt: string
}

const CANDIDATE_NOTES_KEY = 'hs_candidate_interview_notes'

export function loadCandidateNotes(candidateId: string, jobId: string): CandidateNote[] {
  try {
    const all: CandidateNote[] = JSON.parse(localStorage.getItem(CANDIDATE_NOTES_KEY) ?? '[]')
    return all
      .filter(n => n.candidateId === candidateId && n.jobId === jobId)
      .sort((a, b) => +new Date(b.addedAt) - +new Date(a.addedAt))
  } catch { return [] }
}

export function saveCandidateNote(note: CandidateNote): void {
  const all: CandidateNote[] = JSON.parse(localStorage.getItem(CANDIDATE_NOTES_KEY) ?? '[]')
  all.push(note)
  localStorage.setItem(CANDIDATE_NOTES_KEY, JSON.stringify(all))
}

// ── Panel Members (individual interviewers) ───────────────────────────────────

export interface PanelMember {
  id: string
  name: string
  position: string
  email: string
  department: string
  avatarColor: string
}

const PANEL_MEMBERS_KEY = 'hs_panel_members'

export const SEEDED_PANEL_MEMBERS: PanelMember[] = [
  // Engineering
  { id: 'pm_01', name: 'Sarah Chen',        position: 'Principal Software Engineer',  email: 'sarah.chen@hiresmart.com',        department: 'Engineering',       avatarColor: '#2563EB' },
  { id: 'pm_02', name: 'Michael Torres',    position: 'Senior Backend Engineer',       email: 'michael.torres@hiresmart.com',    department: 'Engineering',       avatarColor: '#7C3AED' },
  { id: 'pm_03', name: 'Priya Sharma',      position: 'Frontend Architect',            email: 'priya.sharma@hiresmart.com',      department: 'Engineering',       avatarColor: '#DB2777' },
  { id: 'pm_04', name: 'Emma Davis',        position: 'Senior Full-Stack Developer',   email: 'emma.davis@hiresmart.com',        department: 'Engineering',       avatarColor: '#16A34A' },
  { id: 'pm_05', name: 'Natalie Brown',     position: 'Mobile Engineering Lead',       email: 'natalie.brown@hiresmart.com',     department: 'Engineering',       avatarColor: '#D97706' },
  { id: 'pm_06', name: 'David Kim',         position: 'QA Lead Engineer',              email: 'david.kim@hiresmart.com',         department: 'Quality Assurance', avatarColor: '#0891B2' },
  // Infrastructure / DevOps
  { id: 'pm_07', name: 'James Wilson',      position: 'DevOps Lead',                   email: 'james.wilson@hiresmart.com',      department: 'Infrastructure',    avatarColor: '#DC2626' },
  { id: 'pm_08', name: 'Carlos Rodriguez',  position: 'Cloud Solutions Architect',     email: 'carlos.rodriguez@hiresmart.com',  department: 'Infrastructure',    avatarColor: '#059669' },
  // AI / Data
  { id: 'pm_09', name: 'Rahul Gupta',       position: 'ML Engineer',                   email: 'rahul.gupta@hiresmart.com',       department: 'AI & Data',         avatarColor: '#7C3AED' },
  { id: 'pm_10', name: 'Lisa Patel',        position: 'Data Scientist',                email: 'lisa.patel@hiresmart.com',        department: 'AI & Data',         avatarColor: '#0891B2' },
  { id: 'pm_11', name: 'Kevin Zhang',       position: 'Platform Engineer',             email: 'kevin.zhang@hiresmart.com',       department: 'AI & Data',         avatarColor: '#16A34A' },
  // Security
  { id: 'pm_12', name: 'Aisha Johnson',     position: 'Security Engineer',             email: 'aisha.johnson@hiresmart.com',     department: 'Security',          avatarColor: '#DC2626' },
  { id: 'pm_13', name: 'Omar Hassan',       position: 'Cybersecurity Analyst',         email: 'omar.hassan@hiresmart.com',       department: 'Security',          avatarColor: '#D97706' },
  // Human Resources
  { id: 'pm_14', name: 'Jennifer Martinez', position: 'HR Manager',                    email: 'jennifer.martinez@hiresmart.com', department: 'Human Resources',   avatarColor: '#DB2777' },
  { id: 'pm_15', name: 'Robert Taylor',     position: 'Talent Acquisition Lead',       email: 'robert.taylor@hiresmart.com',     department: 'Human Resources',   avatarColor: '#2563EB' },
  { id: 'pm_16', name: 'Sandra Williams',   position: 'People Operations Partner',     email: 'sandra.williams@hiresmart.com',   department: 'Human Resources',   avatarColor: '#16A34A' },
  { id: 'pm_17', name: 'Mark Thompson',     position: 'Compensation & Benefits Spec',  email: 'mark.thompson@hiresmart.com',     department: 'Human Resources',   avatarColor: '#059669' },
  // Leadership / Product
  { id: 'pm_18', name: 'Angela White',      position: 'VP of Technology',              email: 'angela.white@hiresmart.com',      department: 'Leadership',        avatarColor: '#0891B2' },
  { id: 'pm_19', name: 'Kevin Lee',         position: 'Product Manager',               email: 'kevin.lee@hiresmart.com',         department: 'Product',           avatarColor: '#7C3AED' },
  { id: 'pm_20', name: 'Patricia Jackson',  position: 'Director of Engineering',       email: 'patricia.jackson@hiresmart.com',  department: 'Leadership',        avatarColor: '#D97706' },
]

export function loadPanelMembers(): PanelMember[] {
  try {
    const raw = localStorage.getItem(PANEL_MEMBERS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.length > 0) return parsed
    }
  } catch {}
  // Auto-seed on first load
  localStorage.setItem(PANEL_MEMBERS_KEY, JSON.stringify(SEEDED_PANEL_MEMBERS))
  return SEEDED_PANEL_MEMBERS
}

export function savePanelMembers(members: PanelMember[]): void {
  localStorage.setItem(PANEL_MEMBERS_KEY, JSON.stringify(members))
}

export function resetPanelMembers(): void {
  localStorage.setItem(PANEL_MEMBERS_KEY, JSON.stringify(SEEDED_PANEL_MEMBERS))
}

// ── Panels (named groups, kept for schedule/eval backward compat) ─────────────

export interface Panel {
  id: string
  name: string
  members: string[]
  createdAt: string
}

export interface PanelAssignment {
  candidateId: string
  jobId: string
  memberIds: string[]    // individual PanelMember IDs
  panelId?: string       // legacy — kept for backward compat
  assignedAt: string
}

const panelsKey      = () => 'hs_panels'
const assignmentsKey = () => 'hs_panel_assignments'

export function loadPanels(): Panel[] {
  try {
    const raw = localStorage.getItem(panelsKey())
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function savePanel(p: Panel): void {
  const all = loadPanels()
  const idx = all.findIndex(x => x.id === p.id)
  if (idx >= 0) all[idx] = p; else all.push(p)
  localStorage.setItem(panelsKey(), JSON.stringify(all))
}

export function deletePanel(id: string): void {
  localStorage.setItem(panelsKey(), JSON.stringify(loadPanels().filter(p => p.id !== id)))
}

export function loadPanelAssignments(): PanelAssignment[] {
  try {
    const raw = localStorage.getItem(assignmentsKey())
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function savePanelAssignment(a: PanelAssignment): void {
  const all = loadPanelAssignments()
  const idx = all.findIndex(x => x.candidateId === a.candidateId && x.jobId === a.jobId)
  if (idx >= 0) all[idx] = a; else all.push(a)
  localStorage.setItem(assignmentsKey(), JSON.stringify(all))
}

export function removePanelAssignment(candidateId: string, jobId: string): void {
  localStorage.setItem(
    assignmentsKey(),
    JSON.stringify(loadPanelAssignments().filter(
      a => !(a.candidateId === candidateId && a.jobId === jobId)
    ))
  )
}

// ── Global HR Settings ────────────────────────────────────────────────────────

export interface HsSettings {
  atsThreshold: number          // minimum ATS score to shortlist (0-100)
  autoPromoteEnabled: boolean   // auto-promote candidates meeting threshold
  emailOnShortlist: boolean
  emailOnReject: boolean
  emailOnInterview: boolean
  emailOnOffer: boolean
}

const SETTINGS_KEY = 'hs_settings'

export const DEFAULT_SETTINGS: HsSettings = {
  atsThreshold: 60,
  autoPromoteEnabled: false,
  emailOnShortlist: true,
  emailOnReject: true,
  emailOnInterview: true,
  emailOnOffer: true,
}

export function loadSettings(): HsSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {}
  return { ...DEFAULT_SETTINGS }
}

export function saveSettings(s: HsSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

// ── Application Flow Events ───────────────────────────────────────────────────

export type AppFlowEventType =
  | 'APPLIED' | 'SHORTLISTED' | 'STATUS_CHANGE' | 'ROUND_ADDED'
  | 'ROUND_COMPLETED' | 'NOTE_ADDED' | 'EVALUATION_ADDED' | 'REJECTED' | 'OFFER' | 'HIRED'

export interface AppFlowEvent {
  id: string
  candidateId: string
  jobId: string
  type: AppFlowEventType
  label: string
  detail?: string
  fromStage?: string
  toStage?: string
  by?: string
  byRole?: string
  timestamp: string
}

const APP_FLOW_KEY = 'hs_app_flow_events'

export function loadAppFlowEvents(candidateId: string, jobId: string): AppFlowEvent[] {
  try {
    const all: AppFlowEvent[] = JSON.parse(localStorage.getItem(APP_FLOW_KEY) ?? '[]')
    return all
      .filter(e => e.candidateId === candidateId && e.jobId === jobId)
      .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))
  } catch { return [] }
}

export function saveAppFlowEvent(event: AppFlowEvent): void {
  try {
    const all: AppFlowEvent[] = JSON.parse(localStorage.getItem(APP_FLOW_KEY) ?? '[]')
    all.push(event)
    localStorage.setItem(APP_FLOW_KEY, JSON.stringify(all))
  } catch {}
}

// ── Job Board Integration Config ──────────────────────────────────────────────

export interface JobBoardPlatformConfig {
  enabled: boolean
  apiKey: string
  clientId: string
  clientSecret: string
  accessToken: string
  siteId: string       // Monster-specific
}

export interface JobBoardConfig {
  dice:     JobBoardPlatformConfig
  monster:  JobBoardPlatformConfig
  linkedin: JobBoardPlatformConfig
}

export interface JobPostingRecord {
  id: string
  jobId: string
  jobTitle: string
  platform: 'dice' | 'monster' | 'linkedin'
  postedAt: string
  status: 'SUCCESS' | 'FAILED' | 'PENDING'
  externalId?: string
  error?: string
}

const DEFAULT_PLATFORM: JobBoardPlatformConfig = {
  enabled: false, apiKey: '', clientId: '', clientSecret: '', accessToken: '', siteId: '',
}

const JOB_BOARD_CONFIG_KEY   = 'hs_job_board_config'
const JOB_POSTING_HISTORY_KEY = 'hs_job_posting_history'

export function loadJobBoardConfig(): JobBoardConfig {
  try {
    const raw = localStorage.getItem(JOB_BOARD_CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        dice:     { ...DEFAULT_PLATFORM, ...parsed.dice },
        monster:  { ...DEFAULT_PLATFORM, ...parsed.monster },
        linkedin: { ...DEFAULT_PLATFORM, ...parsed.linkedin },
      }
    }
  } catch {}
  return { dice: { ...DEFAULT_PLATFORM }, monster: { ...DEFAULT_PLATFORM }, linkedin: { ...DEFAULT_PLATFORM } }
}

export function saveJobBoardConfig(cfg: JobBoardConfig): void {
  localStorage.setItem(JOB_BOARD_CONFIG_KEY, JSON.stringify(cfg))
}

export function loadJobPostingHistory(): JobPostingRecord[] {
  try { return JSON.parse(localStorage.getItem(JOB_POSTING_HISTORY_KEY) ?? '[]') } catch { return [] }
}

export function saveJobPostingRecord(r: JobPostingRecord): void {
  const all = loadJobPostingHistory()
  const idx = all.findIndex(x => x.id === r.id)
  if (idx >= 0) all[idx] = r; else all.unshift(r)
  localStorage.setItem(JOB_POSTING_HISTORY_KEY, JSON.stringify(all))
}
