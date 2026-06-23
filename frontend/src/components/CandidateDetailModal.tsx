import React, { useEffect, useState, useCallback } from 'react'
import {
  Dialog, Box, Typography, Avatar, Chip, Tabs, Tab,
  IconButton, Button, Divider, TextField,
  Snackbar, Alert, CircularProgress, LinearProgress
} from '@mui/material'
import {
  Close, Email, CalendarMonth, ArrowForward,
  Download, OpenInNew, NoteAlt, LocalOffer,
  School, Phone, AutoAwesome, Send, Star
} from '@mui/icons-material'
import apiClient from '@services/apiClient'
import {
  loadPipeline, savePipeline,
  DEFAULT_STAGES, PipelineCandidate, loadSettings,
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

// ── Main modal ────────────────────────────────────────────────────────────────
export default function CandidateDetailModal({ open, data, onClose, onSchedule, onPromote }: Props) {
  const jobs = useAppSelector(s => s.jobs.jobs)

  const [tab,        setTab]       = useState(0)
  const [analysis,   setAnalysis]  = useState<ResumeAnalysis | null>(null)
  const [loading,    setLoading]   = useState(false)
  const [stageName,  setStageName] = useState<string | null>(null)
  const [stageColor, setStgColor]  = useState(TEXT2)
  const [notes,      setNotes]     = useState('')
  const [toast,      setToast]     = useState<string | null>(null)
  const [toastErr,   setToastErr]  = useState(false)

  const jobId      = data?.jobId ?? ''
  const pKey = data?.analysisId
    ? `applied_${data.analysisId}`
    : data?.pipelineCandidate?.id ?? ''
  const jobTitle = data?.jobTitle || jobs.find(j => j.id === jobId)?.title || ''

  const loadLocal = useCallback(() => {
    if (!jobId || !pKey) return
    const pl     = loadPipeline(jobId)
    const stages = pl.stages.length ? pl.stages : DEFAULT_STAGES
    const stage  = stages.find(s => s.id === pl.stageMap[pKey])
    setStageName(stage?.label ?? null)
    setStgColor(stage?.color ?? TEXT2)
    const n = pl.notes[pKey] || []
    setNotes(Array.isArray(n) ? n.join('\n') : '')
  }, [jobId, pKey])

  useEffect(() => {
    if (!open || !data) return
    setTab(0); setAnalysis(null); setLoading(true)

    if (data.pipelineCandidate && !data.analysisId) {
      const c = data.pipelineCandidate
      setAnalysis({ id: c.id, candidateName: c.name, currentRole: c.role, email: c.email,
        phone: c.phone ?? null, atsScore: c.atsScore, matchedSkills: c.matchedSkills ?? [],
        missingSkills: [], yearsOfExperience: c.experience, education: c.education ?? '',
        professionalSummary: '', resumeFileName: c.resumeFileName ?? '', resumeS3Url: null,
        rating: c.atsScore >= 80 ? 'EXCELLENT' : c.atsScore >= 60 ? 'GOOD' : 'FAIR', jobId, jobTitle })
      setLoading(false); loadLocal(); return
    }

    ;(async () => {
      try {
        const res = await apiClient.get(`/resume-analysis/job/${jobId}/applied`)
        const items: ResumeAnalysis[] = res.data?.content ?? res.data ?? []
        const found = items.find((a: ResumeAnalysis) => a.id === data.analysisId)
        if (found) { setAnalysis(found); setLoading(false); loadLocal(); return }
      } catch {}
      try { const r = await apiClient.get(`/resume-analysis/${data.analysisId}`); setAnalysis(r.data) } catch {}
      setLoading(false); loadLocal()
    })()
  }, [open, data, jobId, loadLocal])

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

  // ── Tab content ───────────────────────────────────────────────────────────
  const TabOverview = (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
      {/* Left column */}
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

      {/* Right column */}
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
              {stageName && (
                <Chip label={stageName} size="small"
                  sx={{ height: 22, fontSize: 11, fontWeight: 700, borderRadius: 1,
                    bgcolor: stageColor + '18', color: stageColor, border: `1px solid ${stageColor}35` }} />
              )}
              {isAIPick && (
                <Chip
                  icon={<AutoAwesome sx={{ fontSize: '13px !important', color: ORANGE }} />}
                  label="AI Pick" size="small"
                  sx={{ height: 22, fontSize: 11, fontWeight: 700, borderRadius: 1,
                    bgcolor: ORANGE + '15', color: ORANGE, border: `1px solid ${ORANGE}35` }}
                />
              )}
            </Box>
            <Typography sx={{ fontSize: 13, color: TEXT2, fontWeight: 400 }}>
              {[
                analysis?.currentRole ?? data.pipelineCandidate?.role,
                analysis?.yearsOfExperience != null ? `${analysis.yearsOfExperience} yrs exp` : null,
                appliedDate ? `Applied ${appliedDate}` : null,
                jobTitle || null,
              ].filter(Boolean).join('  ·  ')}
            </Typography>
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
            <Tab label="Interview Rounds" />
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
                    stages={loadPipeline(jobId).stages}
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

                {/* Quick actions */}
                <Box sx={{ p: 2.5 }}>
                  <SectionLabel>Quick Actions</SectionLabel>

                  <Button fullWidth variant="contained" color="primary"
                    startIcon={<CalendarMonth sx={{ fontSize: 16 }} />}
                    onClick={() => { onSchedule?.(); onClose() }}
                    sx={{ mb: 1.25, py: 1.15, fontSize: 13, justifyContent: 'flex-start' }}>
                    Schedule Interview
                  </Button>

                  <Button fullWidth variant="outlined" color="primary"
                    startIcon={<ArrowForward sx={{ fontSize: 16 }} />}
                    onClick={() => { onPromote?.(); onClose() }}
                    sx={{ mb: 1.25, py: 1, fontSize: 13, justifyContent: 'flex-start',
                      borderColor: BORDER, color: TEXT1,
                      '&:hover': { borderColor: ORANGE, bgcolor: ORANGE + '08' } }}>
                    Promote to Next Round
                  </Button>

                  <Button fullWidth variant="outlined" color="primary"
                    startIcon={<Send sx={{ fontSize: 16 }} />}
                    onClick={() => sendEmail('shortlist')}
                    sx={{ mb: 1.25, py: 1, fontSize: 13, justifyContent: 'flex-start',
                      borderColor: BORDER, color: TEXT1,
                      '&:hover': { borderColor: ORANGE, bgcolor: ORANGE + '08' } }}>
                    Send Email
                  </Button>

                  <Divider sx={{ my: 1.5 }} />

                  <Button fullWidth variant="text"
                    onClick={handleReject}
                    sx={{ py: 0.9, fontSize: 13, color: '#DC2626', fontWeight: 600,
                      border: `1px solid #FECACA`, borderRadius: 1.5,
                      '&:hover': { bgcolor: '#FEF2F2', borderColor: '#FCA5A5' } }}>
                    Reject Candidate
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
