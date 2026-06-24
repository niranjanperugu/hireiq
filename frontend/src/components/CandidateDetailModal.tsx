import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Dialog, Box, Typography, Avatar, Chip, Tabs, Tab,
  IconButton, Button, Divider, TextField,
  Snackbar, Alert, CircularProgress, LinearProgress,
  Table, TableBody, TableCell, TableHead, TableRow,
  Select, MenuItem, FormControl,
} from '@mui/material'
import {
  Close, Email, CalendarMonth, ArrowForward,
  Download, OpenInNew, NoteAlt, LocalOffer,
  School, Phone, AutoAwesome, Send, Star, Work,
  AssignmentTurnedIn, FlagOutlined, Cancel,
} from '@mui/icons-material'
import apiClient from '@services/apiClient'
import {
  loadPipeline, savePipeline,
  DEFAULT_STAGES, PipelineCandidate, loadSettings,
  saveAppFlowEvent, uid,
} from '@utils/pipelineStorage'
import { useAppSelector } from '@hooks/redux'
import { sendShortlistEmail, sendRejectionEmail, sendOfferEmail } from '@services/notificationApi'
import InterviewRoundsTab from '@components/InterviewRoundsTab'

// ── Theme tokens (match main.tsx) ─────────────────────────────────────────────
const ORANGE   = '#6366F1'
const ORANGE_D = '#4338CA'
const NAVY     = '#0B0F1A'
const BG       = '#EEF0FF'
const CARD     = '#FFFFFF'
const BORDER   = '#E2E8F0'
const TEXT1    = '#1E293B'
const TEXT2    = '#64748B'
const TEXT3    = '#94A3B8'

// ── Types ─────────────────────────────────────────────────────────────────────
interface SkillEvidence {
  skill: string
  evidence_level: number
  evidence: string
}

interface FullAnalysis {
  overall_score?: number
  recommendation?: string
  job_description_match?: {
    score: number
    matched_responsibilities: string[]
    missing_responsibilities: string[]
    matched_qualifications: string[]
    missing_qualifications: string[]
  }
  required_skills_match?: {
    score: number
    required_skills_count: number
    matched_skills_count: number
    matched_skills: string[]
    partially_matched_skills: string[]
    missing_skills: string[]
    skill_evidence: SkillEvidence[]
  }
  experience_match?: { score: number; required_years: number; candidate_years: number }
  job_title_match?: { score: number; candidate_title: string; target_title: string }
  location_match?: { score: number; candidate_location: string; job_location: string; match_type: string }
  seniority_match?: { score: number; candidate_level: string; required_level: string }
  achievement_impact?: { score: number; achievements: string[] }
  education_certifications?: { score: number }
  ats_readability?: { score: number }
  critical_missing_requirements?: string[]
  top_strengths?: string[]
  high_priority_gaps?: string[]
  improvement_recommendations?: string[]
  interview_probability?: { percentage: number; assessment: string }
  recruiter_summary?: string
  hiring_manager_summary?: string
}

interface ResumeAnalysis {
  id: string
  candidateName: string
  currentRole: string | null
  email: string
  phone: string | null
  atsScore: number
  matchedSkills: string[]
  missingSkills: string[]
  yearsOfExperience: number
  education: string
  professionalSummary: string
  resumeFileName: string
  resumeS3Url: string | null
  rating: string | null
  jobId: string
  jobTitle: string
  analyzedAt?: string
  hiringRecommendation?: string | null
  fullAnalysis?: FullAnalysis | null
}

export interface CandidateModalData {
  analysisId?: string
  pipelineCandidate?: PipelineCandidate
  jobId: string
  jobTitle?: string
}

interface Props {
  open: boolean
  data: CandidateModalData | null
  onClose: () => void
  onSchedule?: () => void
  onPromote?: () => void
}

// ── Skill category helpers ────────────────────────────────────────────────────
const CORE_LANGS  = new Set(['java','python','javascript','typescript','c#','c++','go','rust','kotlin','swift','ruby','php','scala','sql'])
const FRAMEWORKS  = new Set(['react','angular','vue','vue.js','next.js','spring','spring boot','django','flask','fastapi','node.js','express','.net','laravel'])
const CLOUD_INFRA = new Set(['aws','azure','gcp','google cloud','docker','kubernetes','terraform','ansible','jenkins','linux','ci/cd','devops'])

function skillCat(s: string): 'core'|'framework'|'cloud'|'domain' {
  const l = s.toLowerCase()
  if (CORE_LANGS.has(l))  return 'core'
  if (FRAMEWORKS.has(l))  return 'framework'
  if (CLOUD_INFRA.has(l)) return 'cloud'
  return 'domain'
}

function catScore(matched: string[], missing: string[], cat: 'core'|'framework'|'cloud'|'domain', fallback: number) {
  const all = [...matched, ...missing]
  const catAll   = all.filter(s => skillCat(s) === cat)
  const catMatch = matched.filter(s => skillCat(s) === cat)
  if (!catAll.length) return fallback
  return Math.round((catMatch.length / catAll.length) * 100)
}

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const r    = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const fill = circ - (circ * Math.min(score, 100)) / 100
  const clr  = score >= 80 ? '#22C55E' : score >= 60 ? '#F59E0B' : '#EF4444'
  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={BORDER} strokeWidth={10}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={clr}   strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}/>
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontWeight: 800, fontSize: size > 80 ? 26 : 16, color: clr, lineHeight: 1, fontFamily: 'inherit' }}>
          {Math.round(score)}
        </Typography>
        <Typography sx={{ fontSize: size > 80 ? 11 : 9, color: TEXT3, fontWeight: 600, letterSpacing: '0.06em' }}>
          ATS
        </Typography>
      </Box>
    </Box>
  )
}

// ── Skill gap bar ─────────────────────────────────────────────────────────────
function GapBar({ label, pct }: { label: string; pct: number }) {
  const clr = pct >= 80 ? '#22C55E' : pct >= 60 ? '#F59E0B' : '#EF4444'
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
      <Typography sx={{ width: 100, fontSize: 13, color: TEXT2, flexShrink: 0, fontWeight: 500 }}>{label}</Typography>
      <Box sx={{ flex: 1, height: 8, bgcolor: BG, borderRadius: 99, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
        <Box sx={{ width: `${pct}%`, height: '100%', borderRadius: 99, transition: 'width 0.7s ease',
          background: `linear-gradient(90deg, ${clr}CC, ${clr})` }} />
      </Box>
      <Typography sx={{ width: 40, fontSize: 13, fontWeight: 700, color: clr, textAlign: 'right', flexShrink: 0 }}>
        {pct}%
      </Typography>
    </Box>
  )
}

// ── Recommendation badge ──────────────────────────────────────────────────────
function RecBadge({ rec }: { rec: string }) {
  const map: Record<string, [string, string]> = {
    ADVANCE: ['Advance', '#2563EB'],
    HIRE:    ['Hire',    '#16A34A'],
    REJECT:  ['Reject',  '#DC2626'],
    HOLD:    ['On Hold', '#D97706'],
  }
  const [label, color] = map[rec] ?? [rec, TEXT2]
  return (
    <Chip label={label} size="small"
      sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: color + '18', color,
        border: `1px solid ${color}35`, borderRadius: 1 }} />
  )
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 10, fontWeight: 700, color: TEXT3, textTransform: 'uppercase',
      letterSpacing: '0.1em', mb: 1.25 }}>
      {children}
    </Typography>
  )
}

// ── AI component score bar ────────────────────────────────────────────────────
function AiBar({ label, score, weight }: { label: string; score: number; weight: string }) {
  const clr = score >= 70 ? '#22C55E' : score >= 40 ? '#F59E0B' : '#EF4444'
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.25 }}>
      <Typography sx={{ width: 100, fontSize: 12, color: TEXT2, flexShrink: 0, fontWeight: 500 }}>{label}</Typography>
      <Typography sx={{ width: 26, fontSize: 10, color: TEXT3, flexShrink: 0 }}>{weight}</Typography>
      <Box sx={{ flex: 1, height: 7, bgcolor: BG, borderRadius: 99, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
        <Box sx={{ width: `${Math.min(score, 100)}%`, height: '100%', borderRadius: 99,
          background: `linear-gradient(90deg, ${clr}CC, ${clr})`, transition: 'width 0.6s ease' }} />
      </Box>
      <Typography sx={{ width: 28, fontSize: 12, fontWeight: 700, color: clr, textAlign: 'right', flexShrink: 0 }}>
        {Math.round(score)}
      </Typography>
    </Box>
  )
}

// ── Evidence level badge ──────────────────────────────────────────────────────
function EvidenceBadge({ level }: { level: number }) {
  const map: Record<number, { label: string; bg: string; color: string }> = {
    0: { label: 'Missing',      bg: '#FEF2F2', color: '#DC2626' },
    1: { label: 'Mentioned',    bg: '#FFFBEB', color: '#D97706' },
    2: { label: 'Demonstrated', bg: '#EFF6FF', color: '#2563EB' },
    3: { label: 'Strong',       bg: '#F0FDF4', color: '#15803D' },
    4: { label: 'Expert',       bg: '#FAF5FF', color: '#7C3AED' },
  }
  const { label, bg, color } = map[level] ?? map[0]
  return (
    <Box component="span" sx={{
      fontSize: 10, fontWeight: 700, px: 0.75, py: 0.25, borderRadius: 1,
      bgcolor: bg, color, border: `1px solid ${color}30`, whiteSpace: 'nowrap',
    }}>{label}</Box>
  )
}

// ── Recommendation chip ────────────────────────────────────────────────────────
function AiRecChip({ rec }: { rec: string }) {
  const map: Record<string, string> = {
    'Top Candidate':   '#059669',
    'Strong Interview': '#2563EB',
    'Interview':       '#7C3AED',
    'Consider':        '#D97706',
    'Reject':          '#DC2626',
  }
  const color = map[rec] ?? TEXT2
  return (
    <Chip label={rec} size="small" sx={{
      height: 22, fontSize: 11, fontWeight: 700, borderRadius: 1,
      bgcolor: color + '18', color, border: `1px solid ${color}35`,
    }} />
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function CandidateDetailModal({ open, data, onClose, onSchedule, onPromote }: Props) {
  const jobs = useAppSelector(s => s.jobs.jobs)
  const auth = useAppSelector(s => s.auth)

  const [tab,        setTab]       = useState(0)
  const [analysis,   setAnalysis]  = useState<ResumeAnalysis | null>(null)
  const [loading,    setLoading]   = useState(false)
  const [stageName,  setStageName] = useState<string | null>(null)
  const [stageColor, setStgColor]  = useState(TEXT2)
  const [notes,      setNotes]     = useState('')
  const [toast,      setToast]     = useState<string | null>(null)
  const [toastErr,   setToastErr]  = useState(false)

  // ── Multi-job state ───────────────────────────────────────────────────────
  // activeJobId / activePKey track which job the user is viewing in the dropdown.
  // They are set on open (from data.jobId) and updated by switchJob().
  const [activeJobId, setActiveJobId] = useState('')
  const [activePKey,  setActivePKey]  = useState('')

  // Derived: the job + pKey currently being viewed
  const jobId = activeJobId || data?.jobId || ''
  const pKey  = activePKey  || (data?.analysisId ? `applied_${data.analysisId}` : data?.pipelineCandidate?.id ?? '')

  // All jobs where this candidate (identified by email) appears in any pipeline.
  // Computed AFTER analysis loads (email source). Kept in state so it persists across re-renders.
  const [jobsForCandidate, setJobsForCandidate] = useState<
    { jobId: string; jobCode?: string; jobTitle: string; candidateId: string }[]
  >([])

  // Rebuild jobsForCandidate whenever analysis email or jobs list changes
  useEffect(() => {
    const email = analysis?.email || data?.pipelineCandidate?.email
    const initialJobId = data?.jobId ?? ''
    const initialTitle = data?.jobTitle || jobs.find(j => String(j.id) === initialJobId)?.title || ''
    const initialCandId = data?.pipelineCandidate?.id
      || (data?.analysisId ? `applied_${data.analysisId}` : '')

    const found: typeof jobsForCandidate = []
    if (email) {
      jobs.forEach(job => {
        const pl = loadPipeline(String(job.id))
        const c  = pl.candidates.find(c2 => c2.email?.toLowerCase() === email.toLowerCase())
        if (c) found.push({ jobId: String(job.id), jobCode: job.jobCode, jobTitle: job.title, candidateId: c.id })
      })
    }
    // Always ensure the currently-open job is present (even if candidate isn't in pipeline yet)
    if (initialJobId && !found.find(j => j.jobId === initialJobId)) {
      const initJob = jobs.find(j => String(j.id) === initialJobId)
      found.unshift({ jobId: initialJobId, jobCode: initJob?.jobCode, jobTitle: initialTitle, candidateId: initialCandId })
    }
    setJobsForCandidate(found)
  }, [analysis?.email, data?.pipelineCandidate?.email, data?.jobId, data?.jobTitle,
      data?.pipelineCandidate?.id, data?.analysisId, jobs])

  const activeJobEntry = jobsForCandidate.find(j => j.jobId === jobId)
  const jobTitle = activeJobEntry?.jobTitle
    || data?.jobTitle
    || jobs.find(j => String(j.id) === jobId)?.title
    || ''
  const jobCode = activeJobEntry?.jobCode ?? jobs.find(j => String(j.id) === jobId)?.jobCode

  // Load pipeline-specific data (stage chip, notes) for the given job + pKey
  const loadLocal = useCallback((jId: string, pK: string) => {
    if (!jId || !pK) return
    const pl     = loadPipeline(jId)
    const stages = pl.stages.length ? pl.stages : DEFAULT_STAGES
    const stage  = stages.find(s => s.id === pl.stageMap[pK])
    setStageName(stage?.label ?? null)
    setStgColor(stage?.color ?? TEXT2)
    const n = pl.notes[pK] || []
    setNotes(Array.isArray(n) ? n.join('\n') : '')
  }, [])

  // Switch to a different job in the dropdown
  const switchJob = useCallback((newJobId: string) => {
    const entry = jobsForCandidate.find(j => j.jobId === newJobId)
    if (!entry) return
    setActiveJobId(newJobId)
    setActivePKey(entry.candidateId)
    loadLocal(newJobId, entry.candidateId)
    setTab(2) // jump to Application Flow so user immediately sees the new job's data
  }, [jobsForCandidate, loadLocal])

  // Load candidate analysis — only re-runs when the MODAL DATA changes (not on job switch)
  useEffect(() => {
    if (!open || !data) return
    setTab(0)
    setAnalysis(null)
    setLoading(true)
    const initialJobId    = data.jobId
    const initialCandidId = data.analysisId
      ? `applied_${data.analysisId}`
      : data.pipelineCandidate?.id ?? ''
    setActiveJobId(initialJobId)
    setActivePKey(initialCandidId)

    // Pipeline-candidate path — no API call needed
    if (data.pipelineCandidate && !data.analysisId) {
      const c  = data.pipelineCandidate
      const jt = data.jobTitle || jobs.find(j => String(j.id) === initialJobId)?.title || ''
      setAnalysis({
        id: c.id, candidateName: c.name, currentRole: c.role, email: c.email,
        phone: c.phone ?? null, atsScore: c.atsScore, matchedSkills: c.matchedSkills ?? [],
        missingSkills: [], yearsOfExperience: c.experience, education: c.education ?? '',
        professionalSummary: '', resumeFileName: c.resumeFileName ?? '', resumeS3Url: null,
        rating: c.atsScore >= 80 ? 'EXCELLENT' : c.atsScore >= 60 ? 'GOOD' : 'FAIR',
        jobId: initialJobId, jobTitle: jt,
      })
      setLoading(false)
      loadLocal(initialJobId, initialCandidId)
      return
    }

    // API path — fetch by analysisId
    ;(async () => {
      try {
        const res = await apiClient.get(`/resume-analysis/job/${initialJobId}/applied`)
        const items: ResumeAnalysis[] = res.data?.content ?? res.data ?? []
        const found = items.find((a: ResumeAnalysis) => a.id === data.analysisId)
        if (found) { setAnalysis(found); setLoading(false); loadLocal(initialJobId, initialCandidId); return }
      } catch {}
      try {
        const r = await apiClient.get(`/resume-analysis/${data.analysisId}`)
        setAnalysis(r.data)
      } catch {}
      setLoading(false)
      loadLocal(initialJobId, initialCandidId)
    })()
  // Only re-run when the modal data object identity changes (open/close or new candidate)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, data])

  const saveNotes = () => {
    if (!jobId || !pKey) return
    const pl = loadPipeline(jobId)
    pl.notes[pKey] = notes ? [notes] : []
    savePipeline(jobId, pl)
    setToast('Notes saved'); setToastErr(false)
  }

  const sendEmail = async (type: 'shortlist'|'reject'|'offer') => {
    if (!analysis) return
    const s = loadSettings()
    try {
      if (type === 'shortlist' && s.emailOnShortlist) await sendShortlistEmail(analysis.email, analysis.candidateName, jobTitle)
      if (type === 'reject'    && s.emailOnReject)    await sendRejectionEmail(analysis.email, analysis.candidateName, jobTitle)
      if (type === 'offer'     && s.emailOnOffer)     await sendOfferEmail(analysis.email, analysis.candidateName, jobTitle)
      setToast(`Email sent to ${analysis.email}`); setToastErr(false)
    } catch { setToast('Email failed — check SES config'); setToastErr(true) }
  }

  const handleReject = () => {
    if (!jobId || !pKey) return
    const pl  = loadPipeline(jobId)
    const ex  = pl.candidates.find(c => c.id === pKey)
    if (ex) {
      const rej = (pl.stages.length ? pl.stages : DEFAULT_STAGES).find(s => s.type === 'rejected')
      if (rej) { pl.stageMap[ex.id] = rej.id; savePipeline(jobId, pl) }
    }
    setStageName('Rejected'); setStgColor('#DC2626')
    sendEmail('reject')
  }

  // Move candidate to a pipeline stage (no email) — used by right-panel action buttons
  const handleStageMove = (stageType: 'shortlist' | 'offer' | 'rejected') => {
    if (!jobId || !pKey) return
    const pl     = loadPipeline(jobId)
    const stages = pl.stages.length ? pl.stages : DEFAULT_STAGES
    const target = stages.find(s => s.type === stageType)
    if (!target) return
    pl.stageMap[pKey] = target.id
    savePipeline(jobId, pl)
    const authName = `${auth.user?.firstName ?? ''} ${auth.user?.lastName ?? ''}`.trim() || 'HR Admin'
    const authRole = (auth.user?.role as string) ?? 'HR_ADMINISTRATOR'
    saveAppFlowEvent({
      id: uid(), candidateId: pKey, jobId,
      type: 'STATUS_CHANGE',
      label: `Stage changed to ${target.label}`,
      by: authName, byRole: authRole,
      timestamp: new Date().toISOString(),
    })
    setStageName(target.label)
    setStgColor(target.color)
    setToast(`Moved to ${target.label}`)
    setToastErr(false)
  }

  if (!data) return null

  const name      = analysis?.candidateName ?? data.pipelineCandidate?.name ?? 'Candidate'
  const initials  = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const score     = analysis?.atsScore ?? data.pipelineCandidate?.atsScore ?? 0
  const scoreClr  = score >= 80 ? '#22C55E' : score >= 60 ? '#F59E0B' : '#EF4444'
  const matched   = analysis?.matchedSkills ?? data.pipelineCandidate?.matchedSkills ?? []
  const missing   = analysis?.missingSkills ?? []
  const isAIPick  = score >= 80

  const gap = {
    core:      catScore(matched, missing, 'core',      score),
    framework: catScore(matched, missing, 'framework', Math.round(score * 0.92)),
    cloud:     catScore(matched, missing, 'cloud',     Math.round(score * 0.97)),
    domain:    Math.min(100, Math.round((analysis?.yearsOfExperience ?? data.pipelineCandidate?.experience ?? 3) * 10 + 40)),
  }

  const appliedDate = analysis?.analyzedAt
    ? new Date(analysis.analyzedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  const fa = analysis?.fullAnalysis
  const hasAi = !!(fa && (fa.job_description_match || fa.required_skills_match || fa.top_strengths?.length))

  // ── Tab content ───────────────────────────────────────────────────────────
  const TabOverview = hasAi ? (
    /* ── Full AI Analysis View ─────────────────────────────────────────── */
    <Box sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 3 }}>

      {/* ── LEFT: Summaries + JD Match + Skills Evidence ── */}
      <Box>

        {/* Recommendation + interview probability */}
        {(fa!.recommendation || fa!.interview_probability) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
            {fa!.recommendation && <AiRecChip rec={fa!.recommendation} />}
            {fa!.interview_probability?.percentage != null && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{
                  width: 36, height: 36, borderRadius: '50%',
                  bgcolor: fa!.interview_probability.percentage >= 70 ? '#F0FDF4' : fa!.interview_probability.percentage >= 40 ? '#FFFBEB' : '#FEF2F2',
                  border: `2px solid ${fa!.interview_probability.percentage >= 70 ? '#22C55E' : fa!.interview_probability.percentage >= 40 ? '#F59E0B' : '#EF4444'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 11,
                  color: fa!.interview_probability.percentage >= 70 ? '#15803D' : fa!.interview_probability.percentage >= 40 ? '#D97706' : '#DC2626',
                }}>{fa!.interview_probability.percentage}%</Box>
                <Typography sx={{ fontSize: 12, color: TEXT2 }}>
                  interview probability
                  {fa!.interview_probability.assessment ? ` — ${fa!.interview_probability.assessment}` : ''}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Recruiter Summary */}
        {(fa!.recruiter_summary || analysis?.professionalSummary) && (
          <Box sx={{ bgcolor: '#FFF8F5', border: `1px solid ${ORANGE}25`, borderRadius: 2,
            p: 2.5, mb: 2.5, borderLeft: `3px solid ${ORANGE}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Star sx={{ color: ORANGE, fontSize: 16 }} />
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: ORANGE,
                textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                AI Recruiter Summary
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 13.5, color: TEXT1, lineHeight: 1.7 }}>
              {fa!.recruiter_summary || analysis!.professionalSummary}
            </Typography>
          </Box>
        )}

        {/* Hiring Manager View */}
        {fa!.hiring_manager_summary && (
          <Box sx={{ bgcolor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 2,
            p: 2, mb: 2.5, borderLeft: '3px solid #2563EB' }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#2563EB',
              textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.75 }}>
              Hiring Manager View
            </Typography>
            <Typography sx={{ fontSize: 13, color: TEXT1, lineHeight: 1.65 }}>
              {fa!.hiring_manager_summary}
            </Typography>
          </Box>
        )}

        {/* JD Match */}
        {fa!.job_description_match && (
          <Box sx={{ mb: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.25 }}>
              <SectionLabel>JD Match (50%)</SectionLabel>
              <Chip label={`${Math.round(fa!.job_description_match.score)}/100`} size="small" sx={{
                height: 18, fontSize: 10, fontWeight: 700, mb: 1.25,
                bgcolor: fa!.job_description_match.score >= 70 ? '#DCFCE7' : fa!.job_description_match.score >= 40 ? '#FEF3C7' : '#FEE2E2',
                color:   fa!.job_description_match.score >= 70 ? '#15803D' : fa!.job_description_match.score >= 40 ? '#D97706'  : '#DC2626',
              }} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              {(fa!.job_description_match.matched_responsibilities?.length > 0) && (
                <Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#15803D', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Matched Responsibilities
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {fa!.job_description_match.matched_responsibilities.map((r, i) => (
                      <Typography key={i} component="li" sx={{ fontSize: 12, color: TEXT1, mb: 0.25, lineHeight: 1.5 }}>{r}</Typography>
                    ))}
                  </Box>
                </Box>
              )}
              {(fa!.job_description_match.missing_responsibilities?.length > 0) && (
                <Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#DC2626', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Missing Responsibilities
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {fa!.job_description_match.missing_responsibilities.map((r, i) => (
                      <Typography key={i} component="li" sx={{ fontSize: 12, color: TEXT1, mb: 0.25, lineHeight: 1.5 }}>{r}</Typography>
                    ))}
                  </Box>
                </Box>
              )}
              {(fa!.job_description_match.matched_qualifications?.length > 0) && (
                <Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#15803D', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Matched Qualifications
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {fa!.job_description_match.matched_qualifications.map((q, i) => (
                      <Chip key={i} label={q} size="small" sx={{ fontSize: 10, height: 20, bgcolor: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }} />
                    ))}
                  </Box>
                </Box>
              )}
              {(fa!.job_description_match.missing_qualifications?.length > 0) && (
                <Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#DC2626', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Missing Qualifications
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {fa!.job_description_match.missing_qualifications.map((q, i) => (
                      <Chip key={i} label={q} size="small" sx={{ fontSize: 10, height: 20, bgcolor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }} />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Skills Evidence Table */}
        {fa!.required_skills_match && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <SectionLabel>
                Skills (10%) — {fa!.required_skills_match.matched_skills_count ?? 0}/{fa!.required_skills_match.required_skills_count ?? 0} matched
              </SectionLabel>
              <Chip label={`${Math.round(fa!.required_skills_match.score)}/100`} size="small" sx={{
                height: 18, fontSize: 10, fontWeight: 700, mb: 1.25,
                bgcolor: fa!.required_skills_match.score >= 70 ? '#DCFCE7' : fa!.required_skills_match.score >= 40 ? '#FEF3C7' : '#FEE2E2',
                color:   fa!.required_skills_match.score >= 70 ? '#15803D' : fa!.required_skills_match.score >= 40 ? '#D97706'  : '#DC2626',
              }} />
            </Box>
            {(fa!.required_skills_match.skill_evidence?.length > 0) ? (
              <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: BG }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11, color: TEXT2, py: 1 }}>Skill</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11, color: TEXT2, py: 1 }}>Level</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11, color: TEXT2, py: 1 }}>Evidence</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fa!.required_skills_match.skill_evidence.map((se, i) => (
                      <TableRow key={i} sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ fontSize: 12, fontWeight: 600, py: 0.75, color: TEXT1 }}>{se.skill}</TableCell>
                        <TableCell sx={{ py: 0.75 }}><EvidenceBadge level={se.evidence_level} /></TableCell>
                        <TableCell sx={{ fontSize: 11, color: TEXT2, py: 0.75, maxWidth: 180 }}>{se.evidence || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {(fa!.required_skills_match.matched_skills || []).map(s => (
                  <Chip key={s} label={s} size="small" sx={{ height: 24, fontSize: 11, bgcolor: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }} />
                ))}
                {(fa!.required_skills_match.missing_skills || []).map(s => (
                  <Chip key={s} label={s} size="small" sx={{ height: 24, fontSize: 11, bgcolor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }} />
                ))}
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* ── RIGHT: Score breakdown + Insights ── */}
      <Box>

        {/* Component score bars */}
        <Box sx={{ bgcolor: BG, borderRadius: 2, p: 2, border: `1px solid ${BORDER}`, mb: 2.5 }}>
          <SectionLabel>Score Breakdown</SectionLabel>
          <AiBar label="JD Match"     score={fa!.job_description_match?.score ?? 0}    weight="50%" />
          <AiBar label="Skills"       score={fa!.required_skills_match?.score ?? 0}    weight="10%" />
          <AiBar label="Experience"   score={fa!.experience_match?.score ?? 0}         weight="10%" />
          <AiBar label="Job Title"    score={fa!.job_title_match?.score ?? 0}          weight="5%" />
          <AiBar label="Location"     score={fa!.location_match?.score ?? 0}           weight="5%" />
          <AiBar label="Seniority"    score={fa!.seniority_match?.score ?? 0}          weight="5%" />
          <AiBar label="Achievements" score={fa!.achievement_impact?.score ?? 0}       weight="5%" />
          <AiBar label="Education"    score={fa!.education_certifications?.score ?? 0} weight="3%" />
          <AiBar label="ATS Format"   score={fa!.ats_readability?.score ?? 0}          weight="2%" />
        </Box>

        {/* Experience / Title / Seniority details */}
        {(fa!.experience_match || fa!.job_title_match || fa!.seniority_match) && (
          <Box sx={{ bgcolor: BG, borderRadius: 2, p: 2, border: `1px solid ${BORDER}`, mb: 2.5 }}>
            <SectionLabel>Candidate vs Role</SectionLabel>
            {fa!.experience_match && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography sx={{ fontSize: 12, color: TEXT2 }}>Experience</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: TEXT1 }}>
                  {fa!.experience_match.candidate_years} yrs (need {fa!.experience_match.required_years})
                </Typography>
              </Box>
            )}
            {fa!.job_title_match && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography sx={{ fontSize: 12, color: TEXT2 }}>Title</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: TEXT1, textAlign: 'right', maxWidth: '60%' }}>
                  {fa!.job_title_match.candidate_title || '—'}
                </Typography>
              </Box>
            )}
            {fa!.seniority_match && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography sx={{ fontSize: 12, color: TEXT2 }}>Seniority</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: TEXT1 }}>
                  {fa!.seniority_match.candidate_level || '—'} (need {fa!.seniority_match.required_level || '—'})
                </Typography>
              </Box>
            )}
            {fa!.location_match && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 12, color: TEXT2 }}>Location</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: TEXT1 }}>
                  {fa!.location_match.match_type || fa!.location_match.candidate_location || '—'}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Top Strengths */}
        {(fa!.top_strengths?.length ?? 0) > 0 && (
          <Box sx={{ mb: 2 }}>
            <SectionLabel>Top Strengths</SectionLabel>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              {fa!.top_strengths!.map((s, i) => (
                <Typography key={i} component="li" sx={{ fontSize: 12, color: '#15803D', mb: 0.3, lineHeight: 1.5 }}>{s}</Typography>
              ))}
            </Box>
          </Box>
        )}

        {/* High Priority Gaps */}
        {(fa!.high_priority_gaps?.length ?? 0) > 0 && (
          <Box sx={{ mb: 2 }}>
            <SectionLabel>Priority Gaps</SectionLabel>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              {fa!.high_priority_gaps!.map((g, i) => (
                <Typography key={i} component="li" sx={{ fontSize: 12, color: '#DC2626', mb: 0.3, lineHeight: 1.5 }}>{g}</Typography>
              ))}
            </Box>
          </Box>
        )}

        {/* Critical Missing */}
        {(fa!.critical_missing_requirements?.length ?? 0) > 0 && (
          <Box sx={{ mb: 2 }}>
            <SectionLabel>Critical Missing</SectionLabel>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {fa!.critical_missing_requirements!.map((r, i) => (
                <Chip key={i} label={r} size="small" sx={{ fontSize: 10, height: 20, bgcolor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }} />
              ))}
            </Box>
          </Box>
        )}

        {/* Improvement Recommendations */}
        {(fa!.improvement_recommendations?.length ?? 0) > 0 && (
          <Box>
            <SectionLabel>Recommendations</SectionLabel>
            <Box component="ol" sx={{ m: 0, pl: 2 }}>
              {fa!.improvement_recommendations!.map((r, i) => (
                <Typography key={i} component="li" sx={{ fontSize: 12, color: TEXT2, mb: 0.3, lineHeight: 1.5 }}>{r}</Typography>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  ) : (
    /* ── Fallback: basic view for seeded / pre-AI data ─────────────────── */
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
      <Box>
        {analysis?.professionalSummary && (
          <Box sx={{ bgcolor: '#FFF8F5', border: `1px solid ${ORANGE}25`, borderRadius: 2,
            p: 2.5, mb: 3, borderLeft: `3px solid ${ORANGE}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
              <Star sx={{ color: ORANGE, fontSize: 16 }} />
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: ORANGE,
                textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                AI Candidate Summary
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 14, color: TEXT1, lineHeight: 1.7 }}>
              {analysis.professionalSummary}
            </Typography>
          </Box>
        )}
        <SectionLabel>Skill Gap vs Job Requirements</SectionLabel>
        <Box sx={{ bgcolor: BG, borderRadius: 2, p: 2, border: `1px solid ${BORDER}` }}>
          <GapBar label="Core Skills"   pct={gap.core} />
          <GapBar label="Frameworks"    pct={gap.framework} />
          <GapBar label="Cloud / Infra" pct={gap.cloud} />
          <GapBar label="Domain Exp"    pct={gap.domain} />
        </Box>
      </Box>
      <Box>
        {matched.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <SectionLabel>Matched Skills</SectionLabel>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {matched.map(sk => (
                <Chip key={sk} label={sk} size="small"
                  sx={{ height: 28, fontSize: 12, fontWeight: 500,
                    bgcolor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', borderRadius: 1.5 }} />
              ))}
            </Box>
          </Box>
        )}
        {missing.length > 0 && (
          <Box>
            <SectionLabel>Missing Skills</SectionLabel>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {missing.map(sk => (
                <Chip key={sk} label={sk} size="small"
                  sx={{ height: 28, fontSize: 12, fontWeight: 500,
                    bgcolor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 1.5 }} />
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )

  const TabResume = (
    <Box>
      {analysis?.resumeS3Url ? (
        <>
          <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
            <Button variant="contained" color="primary" startIcon={<OpenInNew />}
              onClick={() => window.open(analysis.resumeS3Url!, '_blank')}>
              View Resume
            </Button>
            <Button variant="outlined" color="primary" startIcon={<Download />}
              component="a" href={analysis.resumeS3Url} download={analysis.resumeFileName} target="_blank">
              Download PDF
            </Button>
          </Box>
          {analysis.resumeFileName && (
            <Typography sx={{ fontSize: 13, color: TEXT2, mb: 2 }}>File: {analysis.resumeFileName}</Typography>
          )}
          {analysis.resumeS3Url.toLowerCase().includes('.pdf') && (
            <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, overflow: 'hidden', height: 480 }}>
              <iframe src={analysis.resumeS3Url} width="100%" height="100%"
                style={{ border: 'none' }} title="Resume Preview" />
            </Box>
          )}
        </>
      ) : (
        <Box sx={{ textAlign: 'center', py: 8, bgcolor: BG, borderRadius: 2, border: `1px dashed ${BORDER}` }}>
          <Download sx={{ fontSize: 48, color: TEXT3, mb: 1.5 }} />
          <Typography color="text.secondary" fontWeight={500}>No resume file available</Typography>
          <Typography variant="caption" color="text.disabled">Resume will appear here once uploaded</Typography>
        </Box>
      )}
    </Box>
  )

  const TabNotes = (
    <Box>
      <SectionLabel>HR Notes</SectionLabel>
      <TextField fullWidth multiline rows={10}
        placeholder="Add your notes about this candidate — interview impressions, concerns, action items…"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        sx={{ mb: 2,
          '& .MuiOutlinedInput-root': { bgcolor: BG, borderRadius: 2, fontSize: 14, lineHeight: 1.65 }
        }}
      />
      <Button variant="contained" color="primary" startIcon={<NoteAlt />} onClick={saveNotes}>
        Save Notes
      </Button>
    </Box>
  )

  const TabOffer = (() => {
    const pl       = loadPipeline(jobId)
    const decision = pl.hireDecisions?.[pKey]
    if (!decision) return (
      <Box sx={{ textAlign: 'center', py: 8, bgcolor: BG, borderRadius: 2, border: `1px dashed ${BORDER}` }}>
        <LocalOffer sx={{ fontSize: 48, color: TEXT3, mb: 1.5 }} />
        <Typography color="text.secondary" fontWeight={500} mb={2}>No offer has been released yet</Typography>
        <Button variant="contained"
          onClick={() => sendEmail('offer')}
          sx={{ bgcolor: '#16A34A', background: 'linear-gradient(135deg,#22C55E,#16A34A)',
            '&:hover': { bgcolor: '#15803D' } }}>
          Send Offer Email
        </Button>
      </Box>
    )
    return (
      <Box sx={{ maxWidth: 480 }}>
        <Chip label="Offer Released" sx={{ bgcolor: '#DCFCE7', color: '#16A34A', fontWeight: 700, mb: 3, borderRadius: 2 }} />
        {decision.offerSalary && (
          <Box sx={{ mb: 2.5, p: 2, bgcolor: BG, borderRadius: 2, border: `1px solid ${BORDER}` }}>
            <SectionLabel>Salary Offer</SectionLabel>
            <Typography sx={{ fontSize: 24, fontWeight: 800, color: TEXT1 }}>{decision.offerSalary}</Typography>
          </Box>
        )}
        {decision.startDate && (
          <Box sx={{ mb: 2.5 }}>
            <SectionLabel>Start Date</SectionLabel>
            <Typography sx={{ fontSize: 16, color: TEXT1, fontWeight: 600 }}>{decision.startDate}</Typography>
          </Box>
        )}
        {decision.notes && (
          <Box>
            <SectionLabel>Notes</SectionLabel>
            <Typography sx={{ fontSize: 14, color: TEXT2, lineHeight: 1.65 }}>{decision.notes}</Typography>
          </Box>
        )}
      </Box>
    )
  })()

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth={false}
        PaperProps={{
          sx: {
            width: '80vw',
            maxWidth: '80vw',
            height: '82vh',
            maxHeight: '82vh',
            borderRadius: 3,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: CARD,
            boxShadow: '0 25px 60px rgba(0,0,0,0.18)',
          }
        }}
      >
        {/* ── Header bar ──────────────────────────────────────────────────── */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 2,
          px: 3, py: 2,
          borderBottom: `1px solid ${BORDER}`,
          bgcolor: CARD, flexShrink: 0,
        }}>
          {/* Avatar */}
          <Avatar sx={{
            width: 52, height: 52, fontSize: 18, fontWeight: 800, flexShrink: 0,
            background: `linear-gradient(135deg, ${ORANGE} 0%, ${ORANGE_D} 100%)`,
            color: '#fff', boxShadow: `0 4px 12px ${ORANGE}40`
          }}>
            {initials}
          </Avatar>

          {/* Identity */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.4 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 20, color: NAVY, lineHeight: 1.2 }}>
                {name}
              </Typography>
              <Chip
                label={stageName || 'Applied'}
                size="small"
                sx={{ height: 22, fontSize: 11, fontWeight: 700, borderRadius: 1,
                  bgcolor: stageName ? stageColor + '18' : '#EFF6FF',
                  color: stageName ? stageColor : '#2563EB',
                  border: `1px solid ${stageName ? stageColor + '35' : '#BFDBFE'}` }}
              />
              {isAIPick && (
                <Chip
                  icon={<AutoAwesome sx={{ fontSize: '13px !important', color: ORANGE }} />}
                  label="AI Pick" size="small"
                  sx={{ height: 22, fontSize: 11, fontWeight: 700, borderRadius: 1,
                    bgcolor: ORANGE + '15', color: ORANGE, border: `1px solid ${ORANGE}35` }}
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 13, color: TEXT2, fontWeight: 400 }}>
                {[
                  analysis?.currentRole ?? data.pipelineCandidate?.role,
                  analysis?.yearsOfExperience != null ? `${analysis.yearsOfExperience} yrs exp` : null,
                  appliedDate ? `Applied ${appliedDate}` : null,
                ].filter(Boolean).join('  ·  ')}
              </Typography>
              {/* Job selector — shows dropdown when candidate applied to multiple jobs */}
              {jobsForCandidate.length > 1 ? (
                <FormControl size="small"
                  sx={{ minWidth: 200,
                    '& .MuiOutlinedInput-root': { fontSize: 12, height: 30 },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER } }}>
                  <Select
                    value={jobId}
                    onChange={e => switchJob(e.target.value)}
                    renderValue={val => {
                      const j = jobsForCandidate.find(x => x.jobId === val)
                      return j ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Work sx={{ fontSize: 12, color: ORANGE, flexShrink: 0 }} />
                          <Box>
                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: TEXT1, lineHeight: 1.2 }} noWrap>
                              {j.jobTitle}
                            </Typography>
                            {j.jobCode && (
                              <Typography sx={{ fontSize: 10, color: TEXT3, fontFamily: 'monospace', lineHeight: 1 }} noWrap>
                                {j.jobCode}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ) : val
                    }}>
                    {jobsForCandidate.map(j => (
                      <MenuItem key={j.jobId} value={j.jobId}
                        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', py: 1 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: TEXT1, lineHeight: 1.3 }}>
                          {j.jobTitle}
                        </Typography>
                        {j.jobCode && (
                          <Typography sx={{ fontSize: 10, color: TEXT3, fontFamily: 'monospace' }}>
                            {j.jobCode}
                          </Typography>
                        )}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                jobTitle && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Work sx={{ fontSize: 12, color: TEXT3, flexShrink: 0 }} />
                    <Box>
                      <Typography sx={{ fontSize: 12, color: TEXT2, lineHeight: 1.2 }}>{jobTitle}</Typography>
                      {jobCode && (
                        <Typography sx={{ fontSize: 10, color: TEXT3, fontFamily: 'monospace', lineHeight: 1 }}>{jobCode}</Typography>
                      )}
                    </Box>
                  </Box>
                )
              )}
            </Box>
          </Box>

          {/* Mini score ring */}
          <ScoreRing score={score} size={52} />

          {/* Close */}
          <IconButton onClick={onClose} size="small"
            sx={{ color: TEXT3, bgcolor: BG, border: `1px solid ${BORDER}`, borderRadius: 1.5,
              '&:hover': { bgcolor: '#E2E8F0' }, ml: 0.5 }}>
            <Close fontSize="small" />
          </IconButton>
        </Box>

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <Box sx={{ borderBottom: `1px solid ${BORDER}`, bgcolor: CARD, px: 3, flexShrink: 0 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
            minHeight: 44,
            '& .MuiTab-root': {
              minHeight: 44, py: 0, fontSize: 13.5, fontWeight: 500,
              color: TEXT2, textTransform: 'none', mr: 0.5
            },
            '& .Mui-selected': { color: ORANGE, fontWeight: 700 },
            '& .MuiTabs-indicator': {
              bgcolor: ORANGE, height: 2.5, borderRadius: '2px 2px 0 0'
            },
          }}>
            <Tab label="Overview" />
            <Tab label="Resume" />
            <Tab label="Application Flow" />
            <Tab label="Notes" />
            <Tab label="Offer" />
          </Tabs>
        </Box>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          {loading ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: BG }}>
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress sx={{ color: ORANGE, mb: 2 }} />
                <Typography sx={{ color: TEXT2, fontSize: 13 }}>Loading candidate profile…</Typography>
              </Box>
            </Box>
          ) : (
            <>
              {/* ── Main tab content ────────────────────────────────────── */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 3.5, bgcolor: BG, minWidth: 0 }}>
                {tab === 0 && TabOverview}
                {tab === 1 && TabResume}
                {tab === 2 && (
                  <InterviewRoundsTab
                    jobId={jobId}
                    jobTitle={jobTitle}
                    candidateId={pKey}
                    candidateName={name}
                    candidateEmail={analysis?.email ?? data.pipelineCandidate?.email}
                    candidateRole={analysis?.currentRole ?? data.pipelineCandidate?.role}
                    atsScore={score}
                    appliedAt={analysis?.analyzedAt ?? data.pipelineCandidate?.addedAt}
                    stages={loadPipeline(jobId).stages}
                    onStageChange={(label, color) => { setStageName(label); setStgColor(color) }}
                  />
                )}
                {tab === 3 && TabNotes}
                {tab === 4 && TabOffer}
              </Box>

              {/* ── Right panel ─────────────────────────────────────────── */}
              <Box sx={{
                width: 272, flexShrink: 0,
                borderLeft: `1px solid ${BORDER}`,
                bgcolor: CARD,
                overflow: 'auto',
                display: 'flex', flexDirection: 'column',
              }}>
                {/* ATS score section */}
                <Box sx={{ p: 3, borderBottom: `1px solid ${BORDER}`, textAlign: 'center' }}>
                  <SectionLabel>ATS Score</SectionLabel>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
                    <ScoreRing score={score} size={100} />
                  </Box>
                  <LinearProgress variant="determinate" value={score}
                    sx={{ height: 6, borderRadius: 99, mb: 1.5, bgcolor: BORDER,
                      '& .MuiLinearProgress-bar': {
                        background: `linear-gradient(90deg, ${scoreClr}88, ${scoreClr})`
                      } }} />
                  {stageName && (
                    <Chip label={stageName}
                      sx={{ fontWeight: 700, fontSize: 12, borderRadius: 1.5, px: 0.5,
                        bgcolor: stageColor + '18', color: stageColor, border: `1px solid ${stageColor}35` }} />
                  )}
                </Box>

                {/* Contact info */}
                {(analysis?.email || analysis?.phone || analysis?.education) && (
                  <Box sx={{ p: 2.5, borderBottom: `1px solid ${BORDER}` }}>
                    <SectionLabel>Contact</SectionLabel>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {analysis?.email && (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <Email sx={{ fontSize: 14, color: TEXT3, mt: 0.2, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: 12, color: TEXT2, wordBreak: 'break-all', lineHeight: 1.4 }}>
                            {analysis.email}
                          </Typography>
                        </Box>
                      )}
                      {analysis?.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Phone sx={{ fontSize: 14, color: TEXT3, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: 12, color: TEXT2 }}>{analysis.phone}</Typography>
                        </Box>
                      )}
                      {analysis?.education && (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <School sx={{ fontSize: 14, color: TEXT3, mt: 0.2, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: 12, color: TEXT2, lineHeight: 1.4 }}>{analysis.education}</Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}

                {/* Stage Actions */}
                <Box sx={{ px: 2.5, pb: 2.5, borderTop: `1px solid ${BORDER}`, pt: 2 }}>
                  <SectionLabel>Stage Actions</SectionLabel>

                  <Button fullWidth variant="contained" size="small"
                    startIcon={<AssignmentTurnedIn sx={{ fontSize: 15 }} />}
                    onClick={() => handleStageMove('shortlist')}
                    sx={{ mb: 1, py: 1, fontSize: 12.5, fontWeight: 700, justifyContent: 'flex-start',
                      textTransform: 'none',
                      background: 'linear-gradient(135deg,#22C55E,#16A34A)',
                      '&:hover': { background: 'linear-gradient(135deg,#16A34A,#15803D)' } }}>
                    Selected for Position
                  </Button>

                  <Button fullWidth variant="contained" size="small"
                    startIcon={<FlagOutlined sx={{ fontSize: 15 }} />}
                    onClick={() => handleStageMove('offer')}
                    sx={{ mb: 1, py: 1, fontSize: 12.5, fontWeight: 700, justifyContent: 'flex-start',
                      textTransform: 'none',
                      background: 'linear-gradient(135deg,#6366F1,#4338CA)',
                      '&:hover': { background: 'linear-gradient(135deg,#4338CA,#3730A3)' } }}>
                    Release Offer
                  </Button>

                  <Button fullWidth variant="outlined" size="small"
                    startIcon={<Cancel sx={{ fontSize: 15 }} />}
                    onClick={() => handleStageMove('rejected')}
                    sx={{ py: 1, fontSize: 12.5, fontWeight: 700, justifyContent: 'flex-start',
                      textTransform: 'none', color: '#DC2626', borderColor: '#FECACA',
                      '&:hover': { bgcolor: '#FEF2F2', borderColor: '#FCA5A5' } }}>
                    Reject
                  </Button>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toastErr ? 'error' : 'success'} onClose={() => setToast(null)}
          sx={{ borderRadius: 2, fontFamily: 'inherit' }}>
          {toast}
        </Alert>
      </Snackbar>
    </>
  )
}
