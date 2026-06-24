import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppSelector } from '@hooks/redux'
import {
  Box, Typography, Button, Card, CardContent, Chip, IconButton, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Menu,
  MenuItem, LinearProgress, Tooltip, Paper, Divider, Rating, Tabs, Tab,
  Select, FormControl, InputLabel, Badge
} from '@mui/material'
import {
  ArrowBack, Settings, Add, MoreVert, CalendarMonth, Assessment,
  CheckCircle, Cancel, Edit, Delete, NoteAdd, Star, PersonAdd,
  DragIndicator, KeyboardArrowRight, Refresh, FilterList
} from '@mui/icons-material'
import { apiClient } from '@services/apiClient'
import {
  PipelineState, PipelineStage, PipelineCandidate, InterviewSchedule,
  loadPipeline, savePipeline, loadSchedules, saveSchedule,
  uid, DEFAULT_STAGES, loadSettings, saveAppFlowEvent,
} from '@utils/pipelineStorage'
import { sendShortlistEmail, sendRejectionEmail, sendOfferEmail } from '@services/notificationApi'
import CandidateDetailModal, { CandidateModalData } from '@components/CandidateDetailModal'

const NAVY     = '#F8FAFC'
const NAVY_MID = '#FFFFFF'
const NAVY_LT  = '#E2E8F0'
const ORANGE   = '#6366F1'

// ─── Candidate Card ───────────────────────────────────────────────────────────

interface CardProps {
  candidate: PipelineCandidate
  stageId: string
  stages: PipelineStage[]
  notes: string[]
  rating: number
  evaluationCount: number
  scheduleCount: number
  jobId: string
  onMove: (candidateId: string, stageId: string) => void
  onSchedule: (c: PipelineCandidate, stageId: string) => void
  onEvaluate: (c: PipelineCandidate, stageId: string) => void
  onNote: (c: PipelineCandidate) => void
  onHire: (c: PipelineCandidate) => void
  onRemove: (id: string) => void
  onViewDetail: (data: CandidateModalData) => void
}

const CandidateCard: React.FC<CardProps> = ({
  candidate, stageId, stages, notes, rating, evaluationCount, scheduleCount,
  jobId, onMove, onSchedule, onEvaluate, onNote, onHire, onRemove, onViewDetail
}) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const stage = stages.find(s => s.id === stageId)

  return (
    <Card sx={{
      mb: 1.5, bgcolor: '#0A1E35', border: `1px solid ${NAVY_LT}`,
      borderRadius: 2, transition: 'all 0.2s',
      '&:hover': { borderColor: ORANGE, boxShadow: `0 4px 16px rgba(99,102,241,0.15)` }
    }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>

        {/* Name + menu */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box display="flex" gap={1} alignItems="center" flex={1} minWidth={0}>
            <Avatar sx={{ width: 30, height: 30, fontSize: '0.7rem', fontWeight: 700,
              background: `linear-gradient(135deg, ${ORANGE} 0%, #4338CA 100%)`, flexShrink: 0 }}>
              {candidate.name.split(' ').map(w => w[0]).slice(0,2).join('')}
            </Avatar>
            <Box minWidth={0}>
              <Typography variant="body2"
                onClick={() => onViewDetail({ pipelineCandidate: candidate, jobId, jobTitle: '' })}
                sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#E2E8F0', lineHeight: 1.2,
                  cursor: 'pointer', '&:hover': { color: ORANGE, textDecoration: 'underline' } }}>
                {candidate.name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.68rem',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                {candidate.role || '—'}
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={e => setAnchor(e.currentTarget)} sx={{ color: '#475569', flexShrink: 0 }}>
            <MoreVert fontSize="small" />
          </IconButton>
        </Box>

        {/* ATS Score bar */}
        <Box sx={{ my: 1.2 }}>
          <Box display="flex" justifyContent="space-between" mb={0.4}>
            <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.65rem' }}>ATS Score</Typography>
            <Typography variant="caption" sx={{ color: ORANGE, fontWeight: 700, fontSize: '0.65rem' }}>
              {candidate.atsScore}%
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={candidate.atsScore}
            sx={{ height: 4, borderRadius: 2, bgcolor: NAVY_LT,
              '& .MuiLinearProgress-bar': {
                background: candidate.atsScore >= 80 ? `linear-gradient(90deg, #16A34A, #22C55E)`
                          : candidate.atsScore >= 60 ? `linear-gradient(90deg, ${ORANGE}, #818CF8)`
                          : `linear-gradient(90deg, #DC2626, #EF4444)`
              }
            }}
          />
        </Box>

        {/* Meta chips */}
        <Box display="flex" gap={0.5} flexWrap="wrap" mb={1}>
          <Chip label={`${candidate.experience}y`} size="small"
            sx={{ fontSize: '0.6rem', height: 18, bgcolor: NAVY_LT, color: '#94A3B8' }} />
          <Chip label={candidate.education} size="small"
            sx={{ fontSize: '0.6rem', height: 18, bgcolor: NAVY_LT, color: '#94A3B8' }} />
          {evaluationCount > 0 && (
            <Chip label={`${evaluationCount} eval${evaluationCount > 1 ? 's' : ''}`} size="small"
              sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'rgba(34,197,94,0.15)', color: '#22C55E' }} />
          )}
          {scheduleCount > 0 && (
            <Chip label={`${scheduleCount} sched.`} size="small"
              sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'rgba(56,189,248,0.15)', color: '#38BDF8' }} />
          )}
        </Box>

        {/* HR Rating */}
        {rating > 0 && (
          <Box display="flex" alignItems="center" gap={0.5} mb={0.8}>
            <Rating value={rating} readOnly size="small" max={5}
              sx={{ '& .MuiRating-iconFilled': { color: ORANGE }, fontSize: '0.8rem' }} />
          </Box>
        )}

        {/* Actions */}
        <Box display="flex" gap={0.5}>
          <Button size="small" startIcon={<CalendarMonth sx={{ fontSize: '0.75rem !important' }} />}
            onClick={() => onSchedule(candidate, stageId)}
            sx={{ fontSize: '0.65rem', py: 0.25, px: 0.75, minWidth: 0, color: '#38BDF8',
              borderColor: 'rgba(56,189,248,0.3)', border: '1px solid', borderRadius: 1,
              '&:hover': { bgcolor: 'rgba(56,189,248,0.1)' } }}>
            Schedule
          </Button>
          <Button size="small" startIcon={<Assessment sx={{ fontSize: '0.75rem !important' }} />}
            onClick={() => onEvaluate(candidate, stageId)}
            sx={{ fontSize: '0.65rem', py: 0.25, px: 0.75, minWidth: 0, color: '#A78BFA',
              borderColor: 'rgba(167,139,250,0.3)', border: '1px solid', borderRadius: 1,
              '&:hover': { bgcolor: 'rgba(167,139,250,0.1)' } }}>
            Evaluate
          </Button>
          {(stageId === 'offer' || stageId === 'round_3') && (
            <Button size="small" startIcon={<CheckCircle sx={{ fontSize: '0.75rem !important' }} />}
              onClick={() => onHire(candidate)}
              sx={{ fontSize: '0.65rem', py: 0.25, px: 0.75, minWidth: 0, color: '#22C55E',
                borderColor: 'rgba(34,197,94,0.3)', border: '1px solid', borderRadius: 1,
                '&:hover': { bgcolor: 'rgba(34,197,94,0.1)' } }}>
              Hire
            </Button>
          )}
        </Box>
      </CardContent>

      {/* Context Menu */}
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}
        PaperProps={{ sx: { bgcolor: '#111827', border: `1px solid ${NAVY_LT}`, minWidth: 180 } }}>
        <MenuItem sx={{ fontSize: '0.8rem', color: '#E2E8F0', fontWeight: 600, py: 0.5, pointerEvents: 'none' }}>
          Move to Stage
        </MenuItem>
        <Divider sx={{ borderColor: NAVY_LT }} />
        {stages.filter(s => s.id !== stageId).map(s => (
          <MenuItem key={s.id} onClick={() => { onMove(candidate.id, s.id); setAnchor(null) }}
            sx={{ fontSize: '0.8rem', gap: 1, py: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color, flexShrink: 0 }} />
            {s.label}
          </MenuItem>
        ))}
        <Divider sx={{ borderColor: NAVY_LT }} />
        <MenuItem onClick={() => { onNote(candidate); setAnchor(null) }}
          sx={{ fontSize: '0.8rem', gap: 1, py: 0.5 }}>
          <NoteAdd sx={{ fontSize: '1rem', color: '#64748B' }} /> Add Note
        </MenuItem>
        <MenuItem onClick={() => { onRemove(candidate.id); setAnchor(null) }}
          sx={{ fontSize: '0.8rem', gap: 1, py: 0.5, color: '#EF4444' }}>
          <Delete sx={{ fontSize: '1rem' }} /> Remove
        </MenuItem>
      </Menu>
    </Card>
  )
}

// ─── Main Pipeline Page ────────────────────────────────────────────────────────

const JobPipelinePage: React.FC = () => {
  const { id: jobId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { organizationId } = useAppSelector(s => s.auth)
  const { jobs } = useAppSelector(s => s.jobs)

  const job = jobs.find(j => j.id === jobId)

  const [pipeline, setPipeline] = useState<PipelineState>(loadPipeline(jobId!))
  const [analysisRecords, setAnalysisRecords] = useState<any[]>([])
  const [evaluations, setEvaluations] = useState<any[]>([])
  const [schedules, setSchedules] = useState<InterviewSchedule[]>([])

  // Dialogs
  const [configOpen,   setConfigOpen]   = useState(false)
  const [addOpen,      setAddOpen]      = useState(false)
  const [schedOpen,    setSchedOpen]    = useState(false)
  const [evalOpen,     setEvalOpen]     = useState(false)
  const [noteOpen,     setNoteOpen]     = useState(false)
  const [hireOpen,     setHireOpen]     = useState(false)

  const [activeCandidate, setActiveCandidate] = useState<PipelineCandidate | null>(null)
  const [activeStageId,   setActiveStageId]   = useState<string>('shortlisted')
  const [detailData,      setDetailData]      = useState<CandidateModalData | null>(null)

  // Stage config state
  const [editStages, setEditStages] = useState<PipelineStage[]>([])

  // Note state
  const [noteText, setNoteText] = useState('')

  // Hire decision state
  const [hireNotes,  setHireNotes]  = useState('')
  const [hireSalary, setHireSalary] = useState('')
  const [hireDate,   setHireDate]   = useState('')
  const [hireRating, setHireRating] = useState(3)

  // Schedule state
  const [schedDateTime,     setSchedDateTime]     = useState('')
  const [schedDuration,     setSchedDuration]     = useState('60')
  const [schedType,         setSchedType]         = useState('VIDEO')
  const [schedPanel,        setSchedPanel]        = useState('')
  const [schedLocation,     setSchedLocation]     = useState('')
  const [schedMeetingLink,  setSchedMeetingLink]  = useState('')
  const [schedNotes,        setSchedNotes]        = useState('')

  // Evaluation state
  const [evalPanel,         setEvalPanel]         = useState('')
  const [evalSkills,        setEvalSkills]        = useState<{ skill: string; rating: number }[]>([
    { skill: 'Technical Knowledge', rating: 0 },
    { skill: 'Problem Solving',     rating: 0 },
    { skill: 'Communication',       rating: 0 },
    { skill: 'Team Fit',            rating: 0 },
  ])
  const [evalNewSkill,      setEvalNewSkill]      = useState('')
  const [evalOverall,       setEvalOverall]       = useState(0)
  const [evalComments,      setEvalComments]      = useState('')
  const [evalRec,           setEvalRec]           = useState<'ADVANCE'|'HIRE'|'REJECT'|'HOLD'>('ADVANCE')

  const persist = useCallback((next: PipelineState) => {
    setPipeline(next)
    savePipeline(jobId!, next)
  }, [jobId])

  useEffect(() => {
    if (!organizationId) return
    apiClient.get(`/resume-analysis/org?organizationId=${organizationId}&size=100`)
      .then(r => setAnalysisRecords(r.data.content ?? r.data ?? []))
      .catch(() => {})
    const evls = JSON.parse(localStorage.getItem('hs_evaluations') || '[]')
    setEvaluations(evls)
    setSchedules(loadSchedules())
  }, [organizationId])

  const handleMove = (candidateId: string, stageId: string) => {
    const fromStageId = pipeline.stageMap[candidateId]
    const fromStage   = pipeline.stages.find(s => s.id === fromStageId)
    const toStage     = pipeline.stages.find(s => s.id === stageId)
    const candidate   = pipeline.candidates.find(c => c.id === candidateId)
    if (toStage && fromStage?.id !== toStage.id) {
      saveAppFlowEvent({
        id: uid(), candidateId, jobId: jobId!,
        type: toStage.type === 'rejected' ? 'REJECTED'
            : toStage.type === 'hired'    ? 'HIRED'
            : toStage.type === 'offer'    ? 'OFFER'
            : 'STATUS_CHANGE',
        label: `${candidate?.name ?? 'Candidate'} moved to ${toStage.label}`,
        fromStage: fromStage?.label,
        toStage: toStage.label,
        timestamp: new Date().toISOString(),
      })
    }
    const next = { ...pipeline, stageMap: { ...pipeline.stageMap, [candidateId]: stageId } }
    persist(next)
  }

  const handleRemove = (candidateId: string) => {
    const next = {
      ...pipeline,
      candidates: pipeline.candidates.filter(c => c.id !== candidateId),
      stageMap: Object.fromEntries(Object.entries(pipeline.stageMap).filter(([k]) => k !== candidateId))
    }
    persist(next)
  }

  const handleAddFromAnalysis = (record: any) => {
    if (pipeline.candidates.some(c => c.id === record.id)) return
    const c: PipelineCandidate = {
      id: record.id,
      name: record.candidateName ?? 'Unknown',
      role: record.currentRole ?? '',
      email: record.email ?? '',
      phone: record.phone ?? '',
      atsScore: Math.round(record.atsScore ?? 0),
      experience: record.yearsOfExperience ?? 0,
      education: record.education ?? '',
      matchedSkills: record.matchedSkills ?? [],
      resumeFileName: record.resumeFileName,
      addedAt: new Date().toISOString(),
      source: 'analysis'
    }
    const firstStage = pipeline.stages[0] ?? DEFAULT_STAGES[0]
    const next = {
      ...pipeline,
      candidates: [...pipeline.candidates, c],
      stageMap: { ...pipeline.stageMap, [c.id]: 'shortlisted' }
    }
    persist(next)
    saveAppFlowEvent({
      id: uid(), candidateId: c.id, jobId: jobId!,
      type: 'SHORTLISTED',
      label: `${c.name} added to pipeline – ${firstStage.label}`,
      toStage: firstStage.label,
      timestamp: new Date().toISOString(),
    })
  }

  const openSchedule = (c: PipelineCandidate, stageId: string) => {
    setActiveCandidate(c)
    setActiveStageId(stageId)
    setSchedDateTime('')
    setSchedPanel('')
    setSchedNotes('')
    setSchedMeetingLink('')
    setSchedLocation('')
    setSchedOpen(true)
  }

  const submitSchedule = () => {
    if (!activeCandidate || !schedDateTime) return
    const stage = pipeline.stages.find(s => s.id === activeStageId)
    const s: InterviewSchedule = {
      id: uid(),
      jobId: jobId!,
      jobTitle: job?.title ?? '',
      candidateId: activeCandidate.id,
      candidateName: activeCandidate.name,
      stageId: activeStageId,
      stageName: stage?.label ?? activeStageId,
      dateTime: schedDateTime,
      duration: parseInt(schedDuration) || 60,
      type: schedType as any,
      panelMembers: schedPanel.split(',').map(s => s.trim()).filter(Boolean),
      location: schedLocation,
      meetingLink: schedMeetingLink,
      notes: schedNotes,
      status: 'SCHEDULED'
    }
    saveSchedule(s)
    setSchedules(loadSchedules())
    setSchedOpen(false)
  }

  const openEvaluate = (c: PipelineCandidate, stageId: string) => {
    setActiveCandidate(c)
    setActiveStageId(stageId)
    setEvalPanel('')
    setEvalSkills([
      { skill: 'Technical Knowledge', rating: 0 },
      { skill: 'Problem Solving',     rating: 0 },
      { skill: 'Communication',       rating: 0 },
      { skill: 'Team Fit',            rating: 0 },
    ])
    setEvalOverall(0)
    setEvalComments('')
    setEvalRec('ADVANCE')
    setEvalOpen(true)
  }

  const submitEvaluation = () => {
    if (!activeCandidate) return
    const stage = pipeline.stages.find(s => s.id === activeStageId)
    const e = {
      id: uid(),
      jobId: jobId!,
      jobTitle: job?.title ?? '',
      candidateId: activeCandidate.id,
      candidateName: activeCandidate.name,
      stageId: activeStageId,
      stageName: stage?.label ?? activeStageId,
      panelMember: evalPanel,
      skillRatings: evalSkills.filter(s => s.rating > 0),
      overallRating: evalOverall,
      comments: evalComments,
      recommendation: evalRec,
      submittedAt: new Date().toISOString()
    }
    const all = JSON.parse(localStorage.getItem('hs_evaluations') || '[]')
    all.push(e)
    localStorage.setItem('hs_evaluations', JSON.stringify(all))
    setEvaluations(all)
    setEvalOpen(false)
    saveAppFlowEvent({
      id: uid(), candidateId: activeCandidate.id, jobId: jobId!,
      type: 'EVALUATION_ADDED',
      label: `Evaluation by ${evalPanel} – ${evalRec === 'ADVANCE' ? 'Proceed' : evalRec === 'HIRE' ? 'Strong Hire' : evalRec === 'REJECT' ? 'Reject' : 'Hold'}`,
      detail: `${stage?.label} · ${evalOverall}/5 stars${evalComments ? ' · ' + evalComments.slice(0,60) : ''}`,
      by: evalPanel,
      timestamp: new Date().toISOString(),
    })

    // Fire email based on recommendation
    const settings = loadSettings()
    const email    = activeCandidate.email
    const name     = activeCandidate.name
    const jobTitle = job?.title ?? ''

    // If ADVANCE, ask to move to next stage
    if (evalRec === 'ADVANCE') {
      const idx = pipeline.stages.findIndex(s => s.id === activeStageId)
      const next = pipeline.stages[idx + 1]
      if (next && next.type !== 'rejected') handleMove(activeCandidate.id, next.id)
      if (settings.emailOnShortlist && email) sendShortlistEmail(email, name, jobTitle).catch(() => {})
    } else if (evalRec === 'HIRE') {
      handleMove(activeCandidate.id, 'hired')
      if (settings.emailOnOffer && email) sendOfferEmail(email, name, jobTitle).catch(() => {})
    } else if (evalRec === 'REJECT') {
      handleMove(activeCandidate.id, 'rejected')
      if (settings.emailOnReject && email) sendRejectionEmail(email, name, jobTitle).catch(() => {})
    }
  }

  const submitNote = () => {
    if (!activeCandidate || !noteText.trim()) return
    const prev = pipeline.notes[activeCandidate.id] ?? []
    const next = { ...pipeline, notes: { ...pipeline.notes, [activeCandidate.id]: [...prev, noteText.trim()] } }
    persist(next)
    setNoteText('')
    setNoteOpen(false)
  }

  const submitHire = () => {
    if (!activeCandidate) return
    const next = {
      ...pipeline,
      stageMap: { ...pipeline.stageMap, [activeCandidate.id]: 'hired' },
      hireDecisions: {
        ...pipeline.hireDecisions,
        [activeCandidate.id]: {
          hired: true,
          notes: hireNotes,
          offerSalary: hireSalary,
          startDate: hireDate,
          finalRating: hireRating,
          decidedAt: new Date().toISOString()
        }
      },
      ratings: { ...pipeline.ratings, [activeCandidate.id]: hireRating }
    }
    persist(next)
    setHireOpen(false)
  }

  const saveStageConfig = () => {
    const next = { ...pipeline, stages: editStages }
    persist(next)
    setConfigOpen(false)
  }

  // Stats
  const stageStats = pipeline.stages.map(s => ({
    ...s,
    count: pipeline.candidates.filter(c => (pipeline.stageMap[c.id] ?? 'shortlisted') === s.id).length
  }))

  const totalAdded   = pipeline.candidates.length
  const totalHired   = stageStats.find(s => s.id === 'hired')?.count ?? 0
  const totalRejected= stageStats.find(s => s.id === 'rejected')?.count ?? 0

  // Candidates not yet in pipeline (from analysis)
  const unAdded = analysisRecords.filter(r => !pipeline.candidates.some(c => c.id === r.id))

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(`/jobs/${jobId}`)}
          sx={{ color: '#64748B', fontSize: '0.8rem' }}>
          Back
        </Button>
        <Box flex={1} minWidth={0}>
          <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#E2E8F0' }}>
            {job?.title ?? 'Job'} — Hiring Pipeline
          </Typography>
          <Typography variant="caption" sx={{ color: '#475569' }}>
            {totalAdded} candidate{totalAdded !== 1 ? 's' : ''} • {totalHired} hired • {totalRejected} rejected
          </Typography>
        </Box>
        <Button variant="outlined" size="small" startIcon={<PersonAdd />}
          onClick={() => setAddOpen(true)}
          sx={{ borderColor: NAVY_LT, color: '#94A3B8', '&:hover': { borderColor: ORANGE, color: ORANGE } }}>
          Add Candidates
        </Button>
        <Button variant="outlined" size="small" startIcon={<Settings />}
          onClick={() => { setEditStages([...pipeline.stages]); setConfigOpen(true) }}
          sx={{ borderColor: NAVY_LT, color: '#94A3B8', '&:hover': { borderColor: ORANGE, color: ORANGE } }}>
          Configure Rounds
        </Button>
      </Box>

      {/* ── Stage Stats Bar ── */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {stageStats.map(s => (
          <Chip key={s.id} label={`${s.label}: ${s.count}`} size="small"
            sx={{ bgcolor: s.count > 0 ? `${s.color}22` : NAVY_LT,
              border: `1px solid ${s.count > 0 ? s.color + '55' : 'transparent'}`,
              color: s.count > 0 ? s.color : '#475569', fontWeight: 600, fontSize: '0.7rem' }}
          />
        ))}
      </Box>

      {/* ── Kanban Board ── */}
      <Box sx={{
        display: 'flex', gap: 1.5, overflowX: 'auto', flex: 1, pb: 2, alignItems: 'flex-start',
        '&::-webkit-scrollbar': { height: 6 },
        '&::-webkit-scrollbar-track': { bgcolor: NAVY },
        '&::-webkit-scrollbar-thumb': { bgcolor: NAVY_LT, borderRadius: 3 }
      }}>
        {pipeline.stages.map(stage => {
          const stageCandidates = pipeline.candidates
            .filter(c => (pipeline.stageMap[c.id] ?? 'shortlisted') === stage.id)

          return (
            <Box key={stage.id} sx={{ minWidth: 240, maxWidth: 240, flexShrink: 0 }}>
              {/* Column header */}
              <Box sx={{
                p: 1.25, mb: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1,
                background: `linear-gradient(135deg, ${stage.color}22 0%, transparent 100%)`,
                border: `1px solid ${stage.color}33`
              }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: stage.color, flexShrink: 0 }} />
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.78rem', flex: 1, color: '#E2E8F0' }}>
                  {stage.label}
                </Typography>
                <Chip label={stageCandidates.length} size="small"
                  sx={{ height: 18, fontSize: '0.65rem', bgcolor: `${stage.color}33`, color: stage.color, fontWeight: 700 }} />
              </Box>

              {/* Cards */}
              <Box sx={{ minHeight: 100 }}>
                {stageCandidates.map(c => (
                  <CandidateCard
                    key={c.id}
                    candidate={c}
                    stageId={stage.id}
                    stages={pipeline.stages}
                    notes={pipeline.notes[c.id] ?? []}
                    rating={pipeline.ratings[c.id] ?? 0}
                    evaluationCount={evaluations.filter(e => e.candidateId === c.id).length}
                    scheduleCount={schedules.filter(s => s.candidateId === c.id).length}
                    jobId={jobId ?? ''}
                    onMove={handleMove}
                    onSchedule={openSchedule}
                    onEvaluate={openEvaluate}
                    onNote={(c) => { setActiveCandidate(c); setNoteText(''); setNoteOpen(true) }}
                    onHire={(c) => { setActiveCandidate(c); setHireNotes(''); setHireSalary(''); setHireDate(''); setHireRating(4); setHireOpen(true) }}
                    onRemove={handleRemove}
                    onViewDetail={setDetailData}
                  />
                ))}
                {stageCandidates.length === 0 && (
                  <Box sx={{ p: 2, textAlign: 'center', border: `1px dashed ${NAVY_LT}`, borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ color: '#334155', fontSize: '0.7rem' }}>
                      No candidates
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )
        })}
      </Box>

      {/* ─────────── Dialogs ─────────── */}

      {/* Add Candidates */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700, bgcolor: NAVY_MID }}>
          Add Candidates to Pipeline
          <Typography variant="caption" display="block" sx={{ color: '#64748B', fontWeight: 400 }}>
            From analyzed resumes • {unAdded.length} available
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: NAVY_MID, p: 0 }}>
          <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
            {unAdded.length === 0 ? (
              <Box p={3} textAlign="center">
                <Typography variant="body2" sx={{ color: '#64748B' }}>
                  All analyzed candidates are already in the pipeline.
                  <br />Go to Analysis tab to analyze more resumes.
                </Typography>
                <Button variant="outlined" size="small" sx={{ mt: 2, borderColor: ORANGE, color: ORANGE }}
                  onClick={() => navigate('/analysis')}>
                  Go to Analysis
                </Button>
              </Box>
            ) : unAdded.map(r => (
              <Box key={r.id} sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 2,
                borderBottom: `1px solid ${NAVY_LT}`, '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                <Avatar sx={{ width: 32, height: 32, fontSize: '0.7rem', bgcolor: NAVY_LT }}>
                  {(r.candidateName ?? '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                </Avatar>
                <Box flex={1} minWidth={0}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#E2E8F0' }}>
                    {r.candidateName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.68rem' }}>
                    {r.currentRole || r.email} • ATS {Math.round(r.atsScore ?? 0)}%
                  </Typography>
                </Box>
                <Button size="small" variant="contained" onClick={() => handleAddFromAnalysis(r)}
                  sx={{ fontSize: '0.7rem', py: 0.25, bgcolor: ORANGE, '&:hover': { bgcolor: '#4338CA' } }}>
                  Add
                </Button>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: NAVY_MID, borderTop: `1px solid ${NAVY_LT}` }}>
          <Button onClick={() => setAddOpen(false)} sx={{ color: '#94A3B8' }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Configure Rounds */}
      <Dialog open={configOpen} onClose={() => setConfigOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: NAVY_MID, fontWeight: 700, fontSize: '1rem' }}>
          Configure Interview Rounds
        </DialogTitle>
        <DialogContent sx={{ bgcolor: NAVY_MID }}>
          <Typography variant="caption" sx={{ color: '#64748B', mb: 2, display: 'block' }}>
            Rename, add, or remove interview rounds for this pipeline.
          </Typography>
          {editStages.map((s, i) => (
            <Box key={s.id} display="flex" alignItems="center" gap={1} mb={1}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: s.color, flexShrink: 0 }} />
              <TextField size="small" value={s.label} fullWidth
                disabled={s.type === 'hired' || s.type === 'rejected' || s.type === 'shortlist'}
                onChange={e => setEditStages(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                sx={{ '& .MuiOutlinedInput-root fieldset': { borderColor: NAVY_LT }, '& input': { fontSize: '0.85rem', color: '#E2E8F0' } }}
              />
              {s.type === 'round' && (
                <IconButton size="small" onClick={() => setEditStages(prev => prev.filter((_, j) => j !== i))}
                  sx={{ color: '#EF4444' }}>
                  <Delete fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))}
          <Button startIcon={<Add />} size="small" onClick={() => {
            const rounds = editStages.filter(s => s.type === 'round')
            const colors = ['#7C3AED', '#DB2777', '#EA580C', '#0EA5E9', '#10B981']
            const nextColor = colors[rounds.length % colors.length]
            const insertAt = editStages.findIndex(s => s.type === 'offer')
            const newStage: PipelineStage = {
              id: `round_${uid()}`,
              label: `Round ${rounds.length + 1} - New Round`,
              color: nextColor,
              type: 'round',
              roundNumber: rounds.length + 1
            }
            setEditStages(prev => [...prev.slice(0, insertAt), newStage, ...prev.slice(insertAt)])
          }}
            sx={{ mt: 1, color: ORANGE, borderColor: `${ORANGE}55`, border: '1px solid', borderRadius: 1, px: 1.5 }}>
            Add Round
          </Button>
        </DialogContent>
        <DialogActions sx={{ bgcolor: NAVY_MID, borderTop: `1px solid ${NAVY_LT}` }}>
          <Button onClick={() => setConfigOpen(false)} sx={{ color: '#94A3B8' }}>Cancel</Button>
          <Button variant="contained" onClick={saveStageConfig}
            sx={{ bgcolor: ORANGE, '&:hover': { bgcolor: '#4338CA' } }}>
            Save Configuration
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Interview */}
      <Dialog open={schedOpen} onClose={() => setSchedOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: NAVY_MID, fontWeight: 700, fontSize: '1rem' }}>
          Schedule Interview — {activeCandidate?.name}
          <Typography variant="caption" display="block" sx={{ color: '#64748B', fontWeight: 400 }}>
            Stage: {pipeline.stages.find(s => s.id === activeStageId)?.label}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: NAVY_MID }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Date & Time" type="datetime-local" size="small" fullWidth value={schedDateTime}
              onChange={e => setSchedDateTime(e.target.value)} InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root fieldset': { borderColor: NAVY_LT } }} />
            <Box display="flex" gap={2}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Type</InputLabel>
                <Select value={schedType} label="Type" onChange={e => setSchedType(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: NAVY_LT } }}>
                  <MenuItem value="VIDEO">Video Call</MenuItem>
                  <MenuItem value="IN_PERSON">In Person</MenuItem>
                  <MenuItem value="PHONE">Phone</MenuItem>
                </Select>
              </FormControl>
              <TextField label="Duration (min)" size="small" value={schedDuration} type="number"
                onChange={e => setSchedDuration(e.target.value)} sx={{ flex: 1,
                  '& .MuiOutlinedInput-root fieldset': { borderColor: NAVY_LT } }} />
            </Box>
            <TextField label="Panel Members (comma-separated)" size="small" fullWidth value={schedPanel}
              onChange={e => setSchedPanel(e.target.value)} placeholder="John Smith, Jane Doe"
              sx={{ '& .MuiOutlinedInput-root fieldset': { borderColor: NAVY_LT } }} />
            <TextField label="Location / Room" size="small" fullWidth value={schedLocation}
              onChange={e => setSchedLocation(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root fieldset': { borderColor: NAVY_LT } }} />
            <TextField label="Meeting Link" size="small" fullWidth value={schedMeetingLink}
              onChange={e => setSchedMeetingLink(e.target.value)} placeholder="https://meet.google.com/..."
              sx={{ '& .MuiOutlinedInput-root fieldset': { borderColor: NAVY_LT } }} />
            <TextField label="Notes" size="small" fullWidth multiline rows={2} value={schedNotes}
              onChange={e => setSchedNotes(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root fieldset': { borderColor: NAVY_LT } }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: NAVY_MID, borderTop: `1px solid ${NAVY_LT}` }}>
          <Button onClick={() => setSchedOpen(false)} sx={{ color: '#94A3B8' }}>Cancel</Button>
          <Button variant="contained" onClick={submitSchedule} disabled={!schedDateTime}
            sx={{ bgcolor: ORANGE, '&:hover': { bgcolor: '#4338CA' } }}>
            Schedule Interview
          </Button>
        </DialogActions>
      </Dialog>

      {/* Evaluate */}
      <Dialog open={evalOpen} onClose={() => setEvalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: NAVY_MID, fontWeight: 700, fontSize: '1rem' }}>
          Interview Evaluation — {activeCandidate?.name}
          <Typography variant="caption" display="block" sx={{ color: '#64748B', fontWeight: 400 }}>
            {pipeline.stages.find(s => s.id === activeStageId)?.label}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: NAVY_MID }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Panel Member / Interviewer" size="small" fullWidth value={evalPanel}
              onChange={e => setEvalPanel(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root fieldset': { borderColor: NAVY_LT } }} />

            <Typography variant="body2" sx={{ fontWeight: 600, color: '#94A3B8' }}>Skill Ratings</Typography>
            {evalSkills.map((sk, i) => (
              <Box key={i} display="flex" alignItems="center" gap={2}>
                <Typography variant="body2" sx={{ flex: 1, fontSize: '0.8rem', color: '#E2E8F0' }}>{sk.skill}</Typography>
                <Rating value={sk.rating} max={5}
                  onChange={(_, v) => setEvalSkills(prev => prev.map((x, j) => j === i ? { ...x, rating: v ?? 0 } : x))}
                  sx={{ '& .MuiRating-iconFilled': { color: ORANGE } }}
                />
                <IconButton size="small" onClick={() => setEvalSkills(prev => prev.filter((_, j) => j !== i))}
                  sx={{ color: '#334155' }}>
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Box display="flex" gap={1}>
              <TextField size="small" placeholder="Add skill..." value={evalNewSkill}
                onChange={e => setEvalNewSkill(e.target.value)} flex={1}
                sx={{ flex: 1, '& .MuiOutlinedInput-root fieldset': { borderColor: NAVY_LT } }} />
              <Button size="small" variant="outlined" onClick={() => {
                if (evalNewSkill.trim()) {
                  setEvalSkills(prev => [...prev, { skill: evalNewSkill.trim(), rating: 0 }])
                  setEvalNewSkill('')
                }
              }} sx={{ borderColor: NAVY_LT, color: '#94A3B8', whiteSpace: 'nowrap' }}>
                + Add
              </Button>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#94A3B8', mb: 0.5 }}>Overall Rating</Typography>
              <Rating value={evalOverall} max={5} onChange={(_, v) => setEvalOverall(v ?? 0)}
                sx={{ '& .MuiRating-iconFilled': { color: ORANGE } }} />
            </Box>

            <TextField label="Detailed Comments" multiline rows={3} fullWidth value={evalComments}
              onChange={e => setEvalComments(e.target.value)} size="small"
              sx={{ '& .MuiOutlinedInput-root fieldset': { borderColor: NAVY_LT } }} />

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#94A3B8', mb: 1 }}>Recommendation</Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {(['ADVANCE','HIRE','HOLD','REJECT'] as const).map(rec => (
                  <Button key={rec} size="small" variant={evalRec === rec ? 'contained' : 'outlined'}
                    onClick={() => setEvalRec(rec)}
                    sx={{
                      fontSize: '0.75rem',
                      ...(evalRec === rec
                        ? { bgcolor: rec === 'HIRE' ? '#16A34A' : rec === 'REJECT' ? '#DC2626' : rec === 'ADVANCE' ? ORANGE : '#D97706',
                            '&:hover': { bgcolor: rec === 'HIRE' ? '#15803D' : rec === 'REJECT' ? '#B91C1C' : rec === 'ADVANCE' ? '#4338CA' : '#B45309' } }
                        : { borderColor: NAVY_LT, color: '#94A3B8' })
                    }}>
                    {rec === 'ADVANCE' ? 'Advance to Next' : rec}
                  </Button>
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: NAVY_MID, borderTop: `1px solid ${NAVY_LT}` }}>
          <Button onClick={() => setEvalOpen(false)} sx={{ color: '#94A3B8' }}>Cancel</Button>
          <Button variant="contained" onClick={submitEvaluation}
            sx={{ bgcolor: ORANGE, '&:hover': { bgcolor: '#4338CA' } }}>
            Submit Evaluation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Note */}
      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: NAVY_MID, fontWeight: 700, fontSize: '1rem' }}>
          Add Note — {activeCandidate?.name}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: NAVY_MID }}>
          <TextField multiline rows={4} fullWidth value={noteText} onChange={e => setNoteText(e.target.value)}
            placeholder="Add your observation, comment, or decision note..." sx={{ mt: 1,
              '& .MuiOutlinedInput-root fieldset': { borderColor: NAVY_LT } }} />
          {(pipeline.notes[activeCandidate?.id ?? ''] ?? []).length > 0 && (
            <Box mt={2}>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>Previous Notes</Typography>
              {(pipeline.notes[activeCandidate?.id ?? ''] ?? []).map((n, i) => (
                <Box key={i} sx={{ mt: 0.5, p: 1, bgcolor: NAVY, borderRadius: 1, fontSize: '0.78rem', color: '#94A3B8' }}>
                  {n}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: NAVY_MID, borderTop: `1px solid ${NAVY_LT}` }}>
          <Button onClick={() => setNoteOpen(false)} sx={{ color: '#94A3B8' }}>Cancel</Button>
          <Button variant="contained" onClick={submitNote} disabled={!noteText.trim()}
            sx={{ bgcolor: ORANGE, '&:hover': { bgcolor: '#4338CA' } }}>Save Note</Button>
        </DialogActions>
      </Dialog>

      {/* Hire Decision */}
      <Dialog open={hireOpen} onClose={() => setHireOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: NAVY_MID, fontWeight: 700, fontSize: '1rem' }}>
          Hire Decision — {activeCandidate?.name}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: NAVY_MID }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#94A3B8', mb: 0.5 }}>Final Rating</Typography>
              <Rating value={hireRating} max={5} onChange={(_, v) => setHireRating(v ?? 0)}
                sx={{ '& .MuiRating-iconFilled': { color: ORANGE } }} />
            </Box>
            <TextField label="Offer Salary" size="small" fullWidth value={hireSalary}
              onChange={e => setHireSalary(e.target.value)} placeholder="e.g. ₹18,00,000 / $90,000"
              sx={{ '& .MuiOutlinedInput-root fieldset': { borderColor: NAVY_LT } }} />
            <TextField label="Proposed Start Date" type="date" size="small" fullWidth value={hireDate}
              onChange={e => setHireDate(e.target.value)} InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root fieldset': { borderColor: NAVY_LT } }} />
            <TextField label="Decision Notes / Offer Letter Notes" multiline rows={3} fullWidth value={hireNotes}
              onChange={e => setHireNotes(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root fieldset': { borderColor: NAVY_LT } }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: NAVY_MID, borderTop: `1px solid ${NAVY_LT}` }}>
          <Button onClick={() => setHireOpen(false)} sx={{ color: '#94A3B8' }}>Cancel</Button>
          <Button variant="contained" onClick={submitHire}
            sx={{ bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' } }}>
            Confirm Hire
          </Button>
        </DialogActions>
      </Dialog>

      {/* Candidate detail modal */}
      <CandidateDetailModal
        open={!!detailData}
        data={detailData}
        onClose={() => setDetailData(null)}
        onSchedule={() => detailData?.pipelineCandidate && openSchedule(detailData.pipelineCandidate, activeStageId)}
      />
    </Box>
  )
}

export default JobPipelinePage
