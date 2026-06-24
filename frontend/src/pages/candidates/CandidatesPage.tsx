import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@hooks/redux'
import { fetchJobs } from '@store/jobsSlice'
import {
  Box, Typography, Card, CardContent, Grid, Avatar, Chip, Button,
  TextField, InputAdornment, Select, MenuItem, FormControl, InputLabel,
  Table, TableHead, TableBody, TableRow, TableCell, TablePagination,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Divider,
  LinearProgress, CircularProgress, Snackbar, Alert, Tooltip,
} from '@mui/material'
import {
  Search, Close, CheckCircle, Cancel, PauseCircle,
  AccountTree, PersonAddAlt1, Work, School,
  PeopleAlt, HourglassTop, Block, Pending, Visibility,
  Edit, Delete, Archive, ArrowForward, ExpandMore,
} from '@mui/icons-material'
import apiClient from '@services/apiClient'
import {
  loadPipeline, savePipeline, PipelineCandidate,
  DEFAULT_STAGES, loadSettings,
} from '@utils/pipelineStorage'
import { sendShortlistEmail, sendRejectionEmail } from '@services/notificationApi'
import CandidateDetailModal, { CandidateModalData } from '@components/CandidateDetailModal'

// ── Tokens ─────────────────────────────────────────────────────────────────────
const ORANGE   = '#6366F1'
const BG       = '#EEF0FF'
const CARD     = '#FFFFFF'
const BORDER   = '#E2E8F0'
const TEXT1    = '#1E293B'
const TEXT2    = '#64748B'
const TEXT3    = '#94A3B8'
const GREEN    = '#16A34A'

const ARCHIVE_KEY  = 'hs_archived_candidates'
const HOLDS_KEY    = 'hs_candidate_holds'
const REJECTS_KEY  = 'hs_candidate_explicit_rejects'

// ── Types ──────────────────────────────────────────────────────────────────────
interface AppliedCandidate {
  id: string
  candidateName: string
  currentRole: string | null
  email: string
  phone: string | null
  atsScore: number
  rating: string | null
  matchedSkills: string[]
  missingSkills: string[]
  yearsOfExperience: number
  education: string | null
  professionalSummary: string | null
  resumeFileName: string
  analyzedAt: string | null
  jobId: string
  jobCode?: string
  jobTitle: string
  totalApplications?: number
  appliedJobTitles?: string[]
}

type CandidateStatus = 'APPLIED' | 'IN_PIPELINE' | 'ON_HOLD' | 'REJECTED'

interface EnrichedCandidate extends AppliedCandidate {
  status: CandidateStatus
  stageLabel: string
  stageColor: string
  stageType: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const scoreColor = (s: number) => s >= 80 ? '#22C55E' : s >= 60 ? '#F59E0B' : '#EF4444'
const scoreBg    = (s: number) => s >= 80 ? '#22C55E18' : s >= 60 ? '#F59E0B18' : '#EF444418'
const scoreLabel = (s: number) => s >= 80 ? 'Excellent' : s >= 60 ? 'Good' : 'Fair'

const pKey = (c: AppliedCandidate) => `${c.jobId}_applied_${c.id}`

function loadSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')) } catch { return new Set() }
}
function saveSet(key: string, set: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...set]))
}

const STAGE_COLORS: Record<string, string> = {
  shortlist: '#38BDF8', round: '#A78BFA', offer: '#22C55E', hired: '#0F766E', rejected: '#EF4444',
}

function getStatus(c: AppliedCandidate): Pick<EnrichedCandidate, 'status'|'stageLabel'|'stageColor'|'stageType'> {
  const holds   = loadSet(HOLDS_KEY)
  const rejects = loadSet(REJECTS_KEY)
  const pl      = loadPipeline(c.jobId)
  const key     = pKey(c)
  const match   = pl.candidates.find(p => p.id === `applied_${c.id}` || p.email?.toLowerCase() === c.email?.toLowerCase())
  if (match) {
    const stageId = pl.stageMap[match.id]
    const stage   = pl.stages.find(s => s.id === stageId)
    if (stage?.type === 'rejected' || rejects.has(key))
      return { status:'REJECTED',  stageLabel:'Rejected',  stageColor:'#EF4444', stageType:'rejected' }
    return { status:'IN_PIPELINE', stageLabel:stage?.label ?? 'Shortlisted',
      stageColor:STAGE_COLORS[stage?.type ?? 'shortlist'] ?? '#38BDF8', stageType:stage?.type ?? 'shortlist' }
  }
  if (rejects.has(key)) return { status:'REJECTED',  stageLabel:'Rejected', stageColor:'#EF4444', stageType:'rejected' }
  if (holds.has(key))   return { status:'ON_HOLD',   stageLabel:'On Hold',  stageColor:'#F59E0B', stageType:'hold' }
  return { status:'APPLIED', stageLabel:'Applied', stageColor:'#38BDF8', stageType:'applied' }
}

// ── Score Ring ─────────────────────────────────────────────────────────────────
const ScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 56 }) => {
  const r    = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <Box sx={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={BORDER} strokeWidth={6}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={scoreColor(score)} strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
      </svg>
      <Box sx={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
        justifyContent:'center', flexDirection:'column' }}>
        <Typography sx={{ fontWeight:800, fontSize:'0.75rem', color:scoreColor(score), lineHeight:1 }}>
          {Math.round(score)}%
        </Typography>
        <Typography sx={{ fontSize:'0.4rem', color:TEXT3 }}>ATS</Typography>
      </Box>
    </Box>
  )
}

// ── Status Chip ────────────────────────────────────────────────────────────────
const StatusChip: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <Chip label={label} size="small" sx={{
    height:20, fontSize:'0.63rem', fontWeight:700,
    bgcolor:`${color}18`, color, border:`1px solid ${color}35`,
  }}/>
)

// ── Edit + Action Modal ────────────────────────────────────────────────────────
type EditView = 'main' | 'pick_stage'

interface EditModalProps {
  open: boolean
  candidate: EnrichedCandidate | null
  organizationId: string
  onClose: () => void
  onSaved: (updated: Partial<AppliedCandidate>) => void
  onAction: (action: 'move'|'hold'|'reject', stageId?: string, stageLabel?: string) => void
}

const EditCandidateModal: React.FC<EditModalProps> = ({
  open, candidate, organizationId, onClose, onSaved, onAction
}) => {
  const [view,    setView]    = useState<EditView>('main')
  const [saving,  setSaving]  = useState(false)
  const [chosen,  setChosen]  = useState('')
  const [form,    setForm]    = useState({
    candidateName:'', email:'', phone:'', currentRole:'', yearsOfExperience:0, education:'',
  })

  useEffect(() => {
    if (open && candidate) {
      setView('main')
      setChosen('')
      setForm({
        candidateName: candidate.candidateName,
        email:         candidate.email,
        phone:         candidate.phone ?? '',
        currentRole:   candidate.currentRole ?? '',
        yearsOfExperience: candidate.yearsOfExperience ?? 0,
        education:     candidate.education ?? '',
      })
    }
  }, [open, candidate])

  if (!candidate) return null

  const stages = (loadPipeline(candidate.jobId).stages ?? DEFAULT_STAGES).filter(s => s.type !== 'rejected')

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiClient.put(
        `/resume-analysis/${candidate.id}?organizationId=${encodeURIComponent(organizationId)}`,
        {
          candidateName:     form.candidateName,
          email:             form.email,
          phone:             form.phone,
          currentRole:       form.currentRole,
          yearsOfExperience: Number(form.yearsOfExperience),
          education:         form.education,
        }
      )
      onSaved(form)
      onClose()
    } catch { /* silent */ } finally { setSaving(false) }
  }

  const f = (field: string, value: any) => setForm(p => ({ ...p, [field]: value }))

  const infoRows = [
    { label:'Name',       field:'candidateName',     type:'text' },
    { label:'Email',      field:'email',             type:'email' },
    { label:'Phone',      field:'phone',             type:'text' },
    { label:'Current Role',field:'currentRole',      type:'text' },
    { label:'Education',  field:'education',         type:'text' },
    { label:'Experience (years)', field:'yearsOfExperience', type:'number' },
  ]

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx:{ borderRadius:3, overflow:'hidden' } }}>

      {/* Header */}
      <Box sx={{ background:'linear-gradient(135deg, #0B0F1A 0%, #1a2a45 100%)',
        px:3, py:2.5, display:'flex', alignItems:'center', gap:2 }}>
        <Avatar sx={{ width:48, height:48, fontWeight:800, fontSize:'1rem', flexShrink:0,
          bgcolor:scoreColor(candidate.atsScore)+'30', color:scoreColor(candidate.atsScore) }}>
          {candidate.candidateName.split(' ').map(w=>w[0]).slice(0,2).join('')}
        </Avatar>
        <Box flex={1} minWidth={0}>
          <Typography sx={{ fontWeight:800, color:'#fff', fontSize:'1rem', lineHeight:1.2 }}>
            {candidate.candidateName}
          </Typography>
          <Typography sx={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.55)', mt:0.25 }}>
            {candidate.currentRole || 'Applicant'} · {candidate.jobTitle}
          </Typography>
        </Box>
        <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
          <Box sx={{ textAlign:'center' }}>
            <Typography sx={{ fontWeight:800, fontSize:'1.25rem', color:scoreColor(candidate.atsScore), lineHeight:1 }}>
              {Math.round(candidate.atsScore)}%
            </Typography>
            <Typography sx={{ fontSize:'0.55rem', color:'rgba(255,255,255,0.4)' }}>ATS</Typography>
          </Box>
          <Chip label={candidate.stageLabel} size="small"
            sx={{ height:22, fontSize:'0.65rem', fontWeight:700,
              bgcolor:`${candidate.stageColor}25`, color:candidate.stageColor,
              border:`1px solid ${candidate.stageColor}40` }}/>
          <IconButton size="small" onClick={onClose} sx={{ color:'rgba(255,255,255,0.5)' }}>
            <Close sx={{ fontSize:18 }}/>
          </IconButton>
        </Box>
      </Box>

      <DialogContent sx={{ p:0 }}>
        {view === 'main' ? (
          <>
            {/* ── Editable fields ───────────────────────────────────── */}
            <Box sx={{ px:3, py:2.5, bgcolor:CARD }}>
              <Typography sx={{ fontSize:'0.65rem', fontWeight:700, color:TEXT3,
                textTransform:'uppercase', letterSpacing:'0.08em', mb:2 }}>
                Candidate Information
              </Typography>
              <Grid container spacing={1.75}>
                {infoRows.map(row => (
                  <Grid item xs={12} sm={row.field === 'candidateName' || row.field === 'email' ? 12 : 6} key={row.field}>
                    <TextField
                      fullWidth size="small" label={row.label}
                      type={row.type}
                      value={(form as any)[row.field]}
                      onChange={e => f(row.field, row.type === 'number' ? parseInt(e.target.value)||0 : e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root':{ fontSize:'0.82rem', bgcolor:BG } }}
                    />
                  </Grid>
                ))}
              </Grid>

              {/* Applied for (read-only) */}
              <Box sx={{ mt:2, p:1.5, bgcolor:BG, borderRadius:1.5, border:`1px solid ${BORDER}`,
                display:'flex', alignItems:'center', gap:1 }}>
                <Work sx={{ fontSize:15, color:TEXT3, flexShrink:0 }}/>
                <Box>
                  <Typography sx={{ fontSize:'0.6rem', color:TEXT3, textTransform:'uppercase',
                    letterSpacing:'0.06em' }}>Applied For</Typography>
                  <Typography sx={{ fontSize:'0.8rem', fontWeight:600, color:TEXT1 }}>
                    {candidate.jobTitle}
                  </Typography>
                </Box>
              </Box>

              {/* Matched skills */}
              {candidate.matchedSkills?.length > 0 && (
                <Box sx={{ mt:1.5 }}>
                  <Typography sx={{ fontSize:'0.6rem', fontWeight:700, color:TEXT3,
                    textTransform:'uppercase', letterSpacing:'0.06em', mb:0.75 }}>
                    Matched Skills
                  </Typography>
                  <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5 }}>
                    {candidate.matchedSkills.slice(0,8).map(sk => (
                      <Chip key={sk} label={sk} size="small"
                        sx={{ height:18, fontSize:'0.6rem', bgcolor:'#22C55E18', color:'#22C55E' }}/>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>

            <Divider />

            {/* ── Pipeline Actions ───────────────────────────────────── */}
            <Box sx={{ px:3, py:2.5, bgcolor:BG }}>
              <Typography sx={{ fontSize:'0.65rem', fontWeight:700, color:TEXT3,
                textTransform:'uppercase', letterSpacing:'0.08em', mb:2 }}>
                Pipeline Actions
              </Typography>

              {/* Shortlist / Move */}
              <Box onClick={() => {
                  if (candidate.status === 'IN_PIPELINE') {
                    setView('pick_stage')
                  } else {
                    // Directly move to first pipeline stage without showing picker
                    const pl     = loadPipeline(candidate.jobId)
                    const stages = pl.stages.length ? pl.stages : DEFAULT_STAGES
                    const first  = stages[0]
                    if (first) onAction('move', first.id, first.label)
                  }
                }}
                sx={{ display:'flex', alignItems:'center', gap:2, p:2, mb:1.5,
                  borderRadius:2, border:`1px solid ${BORDER}`, bgcolor:CARD, cursor:'pointer',
                  '&:hover':{ borderColor:'#38BDF8', bgcolor:'#38BDF808' } }}>
                <Box sx={{ width:38, height:38, borderRadius:2, bgcolor:'#38BDF818',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <AccountTree sx={{ color:'#38BDF8', fontSize:'1.1rem' }}/>
                </Box>
                <Box flex={1}>
                  <Typography sx={{ fontWeight:700, color:TEXT1, fontSize:'0.88rem' }}>
                    {candidate.status === 'IN_PIPELINE' ? 'Move to Another Stage' : 'Move To Interview Pipeline'}
                  </Typography>
                  <Typography sx={{ fontSize:'0.72rem', color:TEXT2 }}>
                    {candidate.status === 'IN_PIPELINE'
                      ? `Currently: ${candidate.stageLabel}`
                      : 'Start the interview process for this candidate'}
                  </Typography>
                </Box>
                <ArrowForward sx={{ color:TEXT3, fontSize:'1rem' }}/>
              </Box>

              {/* Hold */}
              <Box onClick={() => candidate.status !== 'ON_HOLD' && onAction('hold')}
                sx={{ display:'flex', alignItems:'center', gap:2, p:2, mb:1.5,
                  borderRadius:2, border:`1px solid ${BORDER}`, bgcolor:CARD,
                  cursor: candidate.status === 'ON_HOLD' ? 'default' : 'pointer',
                  opacity: candidate.status === 'ON_HOLD' ? 0.5 : 1,
                  '&:hover': candidate.status !== 'ON_HOLD' ? { borderColor:'#F59E0B', bgcolor:'#F59E0B08' } : {} }}>
                <Box sx={{ width:38, height:38, borderRadius:2, bgcolor:'#F59E0B18',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <PauseCircle sx={{ color:'#F59E0B', fontSize:'1.1rem' }}/>
                </Box>
                <Box flex={1}>
                  <Typography sx={{ fontWeight:700, color:TEXT1, fontSize:'0.88rem' }}>
                    {candidate.status === 'ON_HOLD' ? 'Currently On Hold' : 'Put On Hold'}
                  </Typography>
                  <Typography sx={{ fontSize:'0.72rem', color:TEXT2 }}>
                    Pause review — keep for later consideration
                  </Typography>
                </Box>
                {candidate.status === 'ON_HOLD' && <HourglassTop sx={{ color:'#F59E0B', fontSize:'1rem' }}/>}
              </Box>

              {/* Reject */}
              <Box onClick={() => candidate.status !== 'REJECTED' && onAction('reject')}
                sx={{ display:'flex', alignItems:'center', gap:2, p:2,
                  borderRadius:2, border:`1px solid ${BORDER}`, bgcolor:CARD,
                  cursor: candidate.status === 'REJECTED' ? 'default' : 'pointer',
                  opacity: candidate.status === 'REJECTED' ? 0.5 : 1,
                  '&:hover': candidate.status !== 'REJECTED' ? { borderColor:'#EF4444', bgcolor:'#EF444408' } : {} }}>
                <Box sx={{ width:38, height:38, borderRadius:2, bgcolor:'#EF444418',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Cancel sx={{ color:'#EF4444', fontSize:'1.1rem' }}/>
                </Box>
                <Box flex={1}>
                  <Typography sx={{ fontWeight:700, color:TEXT1, fontSize:'0.88rem' }}>
                    {candidate.status === 'REJECTED' ? 'Already Rejected' : 'Reject Candidate'}
                  </Typography>
                  <Typography sx={{ fontSize:'0.72rem', color:TEXT2 }}>
                    Mark as not suitable for this position
                  </Typography>
                </Box>
                {candidate.status === 'REJECTED' && <Block sx={{ color:'#EF4444', fontSize:'1rem' }}/>}
              </Box>
            </Box>
          </>
        ) : (
          /* ── Stage Picker ─────────────────────────────────────────── */
          <Box sx={{ px:3, py:2.5 }}>
            <Button size="small" onClick={() => setView('main')}
              sx={{ fontSize:'0.72rem', color:TEXT2, mb:2, pl:0,
                '&:hover':{ color:ORANGE, bgcolor:'transparent' } }}>
              ← Back
            </Button>
            <Typography sx={{ fontSize:'0.78rem', color:TEXT2, mb:2 }}>
              Select which stage to move <strong style={{ color:TEXT1 }}>{candidate.candidateName}</strong> into:
            </Typography>
            <Box sx={{ display:'flex', flexDirection:'column', gap:0.75, mb:2.5 }}>
              {stages.map(s => (
                <Box key={s.id} onClick={() => setChosen(s.id)}
                  sx={{ display:'flex', alignItems:'center', gap:1.5, p:1.5, borderRadius:1.5,
                    cursor:'pointer', transition:'all 0.12s',
                    border:`1.5px solid ${chosen === s.id ? s.color : BORDER}`,
                    bgcolor: chosen === s.id ? `${s.color}12` : CARD,
                    '&:hover':{ borderColor:s.color, bgcolor:`${s.color}08` } }}>
                  <Box sx={{ width:10, height:10, borderRadius:'50%', bgcolor:s.color, flexShrink:0 }}/>
                  <Typography sx={{ fontSize:'0.82rem', color:chosen===s.id?s.color:TEXT2,
                    fontWeight:chosen===s.id?700:400, flex:1 }}>
                    {s.label}
                  </Typography>
                  {chosen === s.id && <CheckCircle sx={{ fontSize:'0.9rem', color:s.color }}/>}
                </Box>
              ))}
            </Box>
            <Box sx={{ display:'flex', gap:1 }}>
              <Button fullWidth variant="outlined" onClick={() => setView('main')}
                sx={{ fontSize:'0.78rem', borderColor:BORDER, color:TEXT2 }}>
                Cancel
              </Button>
              <Button fullWidth variant="contained" disabled={!chosen}
                onClick={() => {
                  const s = stages.find(x => x.id === chosen)
                  if (s) onAction('move', s.id, s.label)
                }}
                sx={{ fontSize:'0.78rem', bgcolor:ORANGE, '&:hover':{ bgcolor:'#4338CA' },
                  '&.Mui-disabled':{ bgcolor:BORDER } }}>
                Move to Stage
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>

      {/* Footer save */}
      {view === 'main' && (
        <DialogActions sx={{ px:3, py:2, borderTop:`1px solid ${BORDER}`, bgcolor:CARD }}>
          <Button onClick={onClose} sx={{ color:TEXT2, fontSize:'0.78rem' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit"/> : undefined}
            sx={{ bgcolor:ORANGE, '&:hover':{ bgcolor:'#4338CA' }, fontSize:'0.78rem' }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  )
}

// ── Delete Confirm Dialog ──────────────────────────────────────────────────────
const DeleteDialog: React.FC<{
  open: boolean
  candidate: EnrichedCandidate | null
  deleting: boolean
  onClose: () => void
  onConfirm: () => void
}> = ({ open, candidate, deleting, onClose, onConfirm }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
    PaperProps={{ sx:{ borderRadius:2.5 } }}>
    <DialogTitle sx={{ pb:1, display:'flex', alignItems:'center', gap:1.5 }}>
      <Archive sx={{ color:'#EF4444', fontSize:22 }}/>
      <Typography sx={{ fontWeight:700, fontSize:'1rem' }}>Archive Candidate?</Typography>
    </DialogTitle>
    <DialogContent>
      <Typography sx={{ fontSize:'0.82rem', color:TEXT2, lineHeight:1.7 }}>
        This will archive <strong style={{ color:TEXT1 }}>{candidate?.candidateName}</strong>'s
        application for <strong style={{ color:TEXT1 }}>{candidate?.jobTitle}</strong>.
        The record will be removed from the active candidates list.
      </Typography>
      {candidate?.status === 'IN_PIPELINE' && (
        <Alert severity="warning" sx={{ mt:1.5, fontSize:'0.75rem' }}>
          This candidate is currently in the interview pipeline. Archiving will remove them from the pipeline as well.
        </Alert>
      )}
    </DialogContent>
    <DialogActions sx={{ px:3, pb:2.5 }}>
      <Button onClick={onClose} disabled={deleting} sx={{ color:TEXT2 }}>Cancel</Button>
      <Button variant="contained" color="error" onClick={onConfirm} disabled={deleting}
        startIcon={deleting ? <CircularProgress size={14} color="inherit"/> : <Archive sx={{ fontSize:16 }}/>}>
        {deleting ? 'Archiving…' : 'Archive'}
      </Button>
    </DialogActions>
  </Dialog>
)

// ── Main Page ──────────────────────────────────────────────────────────────────
const CandidatesPage: React.FC = () => {
  const dispatch = useAppDispatch()
  const { organizationId } = useAppSelector(s => s.auth)
  const { jobs }           = useAppSelector(s => s.jobs)

  const [candidates,  setCandidates]  = useState<AppliedCandidate[]>([])
  const [loading,     setLoading]     = useState(false)
  const [search,      setSearch]      = useState('')
  const [statusFilt,  setStatusFilt]  = useState<CandidateStatus | 'ALL'>('ALL')
  const [jobFilt,     setJobFilt]     = useState('ALL')
  const [page,        setPage]        = useState(0)
  const [rpp,         setRpp]         = useState(20)
  const [version,     setVersion]     = useState(0)
  const [toast,       setToast]       = useState<{ msg:string; sev:'success'|'info'|'warning'|'error' }|null>(null)

  // Modal states
  const [viewData,    setViewData]    = useState<CandidateModalData | null>(null)
  const [editTarget,  setEditTarget]  = useState<EnrichedCandidate | null>(null)
  const [deleteTarget,setDeleteTarget]= useState<EnrichedCandidate | null>(null)
  const [deleting,    setDeleting]    = useState(false)

  // Fetch candidates — single org-level call, no N+1
  const fetchAll = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    try {
      const archived = loadSet(ARCHIVE_KEY)
      const res = await apiClient.get(`/resume-analysis/org/${organizationId}/applied`)
      const rows: AppliedCandidate[] = (res.data?.data ?? [])
        .filter((d: any) => !archived.has(`${d.jobId}_${d.id}`))
      setCandidates(rows)
    } catch { /* silent */ } finally { setLoading(false) }
  }, [organizationId])

  useEffect(() => {
    if (organizationId) dispatch(fetchJobs({ organizationId, page:0, size:100 }))
  }, [organizationId, dispatch])

  useEffect(() => { fetchAll() }, [fetchAll, version])

  // Enrich with status + jobCode from Redux jobs list
  const enriched: EnrichedCandidate[] = useMemo(
    () => candidates.map(c => ({
      ...c,
      jobCode: c.jobCode ?? jobs.find(j => String(j.id) === c.jobId)?.jobCode,
      ...getStatus(c),
    })),
    [candidates, jobs, version]
  )

  // Job options for filter
  const jobOptions = useMemo(() => {
    const map = new Map<string, string>()
    candidates.forEach(c => map.set(c.jobId, c.jobTitle))
    return [...map.entries()]
  }, [candidates])

  // Stats
  const stats = useMemo(() => ({
    total:    enriched.length,
    applied:  enriched.filter(c => c.status === 'APPLIED').length,
    pipeline: enriched.filter(c => c.status === 'IN_PIPELINE').length,
    hold:     enriched.filter(c => c.status === 'ON_HOLD').length,
    rejected: enriched.filter(c => c.status === 'REJECTED').length,
  }), [enriched])

  // Filter + sort
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return enriched.filter(c => {
      if (statusFilt !== 'ALL' && c.status !== statusFilt) return false
      if (jobFilt   !== 'ALL' && c.jobId !== jobFilt)      return false
      if (q && !c.candidateName.toLowerCase().includes(q)
           && !(c.email||'').toLowerCase().includes(q)
           && !(c.currentRole||'').toLowerCase().includes(q)) return false
      return true
    }).sort((a, b) => b.atsScore - a.atsScore)
  }, [enriched, statusFilt, jobFilt, search])

  const paginated = useMemo(
    () => filtered.slice(page * rpp, page * rpp + rpp),
    [filtered, page, rpp]
  )

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleAction = (action: 'move'|'hold'|'reject', stageId?: string, stageLabel?: string) => {
    const c = editTarget
    if (!c) return
    const holds   = loadSet(HOLDS_KEY)
    const rejects = loadSet(REJECTS_KEY)
    const key     = pKey(c)

    if (action === 'move' && stageId) {
      const pl    = loadPipeline(c.jobId)
      const exist = pl.candidates.find(p => p.id === `applied_${c.id}` || p.email?.toLowerCase() === c.email?.toLowerCase())
      if (exist) {
        pl.stageMap[exist.id] = stageId
      } else {
        const nc: PipelineCandidate = {
          id:`applied_${c.id}`, name:c.candidateName, email:c.email, phone:c.phone ?? '',
          role:c.currentRole ?? '', atsScore:c.atsScore, experience:c.yearsOfExperience,
          education:c.education ?? '', matchedSkills:c.matchedSkills ?? [],
          source:'analysis', addedAt:new Date().toISOString(),
        }
        pl.candidates.push(nc)
        pl.stageMap[nc.id] = stageId
      }
      savePipeline(c.jobId, pl)
      holds.delete(key); rejects.delete(key)
      saveSet(HOLDS_KEY, holds); saveSet(REJECTS_KEY, rejects)
      setToast({ msg:`${c.candidateName} moved to ${stageLabel}`, sev:'success' })
      const settings = loadSettings()
      if (settings.emailOnShortlist) sendShortlistEmail(c.email, c.candidateName, c.jobTitle).catch(()=>{})
      setEditTarget(null)
    }

    if (action === 'hold') {
      holds.add(key); rejects.delete(key)
      saveSet(HOLDS_KEY, holds); saveSet(REJECTS_KEY, rejects)
      setToast({ msg:`${c.candidateName} put on hold`, sev:'info' })
      setEditTarget(null)
    }

    if (action === 'reject') {
      const pl    = loadPipeline(c.jobId)
      const exist = pl.candidates.find(p => p.id === `applied_${c.id}` || p.email?.toLowerCase() === c.email?.toLowerCase())
      if (exist) {
        const rs = pl.stages.find(s => s.type === 'rejected')
        if (rs) { pl.stageMap[exist.id] = rs.id; savePipeline(c.jobId, pl) }
      }
      rejects.add(key); holds.delete(key)
      saveSet(REJECTS_KEY, rejects); saveSet(HOLDS_KEY, holds)
      setToast({ msg:`${c.candidateName} rejected`, sev:'warning' })
      const settings = loadSettings()
      if (settings.emailOnReject) sendRejectionEmail(c.email, c.candidateName, c.jobTitle).catch(()=>{})
      setEditTarget(null)
    }

    setVersion(v => v + 1)
  }

  const handleSaved = (updated: Partial<AppliedCandidate>) => {
    setCandidates(prev => prev.map(c =>
      c.id === editTarget?.id && c.jobId === editTarget?.jobId
        ? { ...c, ...updated }
        : c
    ))
    setToast({ msg:'Candidate updated', sev:'success' })
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      // Archive locally (soft-hide)
      const archived = loadSet(ARCHIVE_KEY)
      archived.add(`${deleteTarget.jobId}_${deleteTarget.id}`)
      saveSet(ARCHIVE_KEY, archived)
      // Remove from pipeline if in it
      const pl    = loadPipeline(deleteTarget.jobId)
      const exist = pl.candidates.findIndex(p =>
        p.id === `applied_${deleteTarget.id}` || p.email?.toLowerCase() === deleteTarget.email?.toLowerCase()
      )
      if (exist >= 0) {
        pl.candidates.splice(exist, 1)
        delete pl.stageMap[`applied_${deleteTarget.id}`]
        savePipeline(deleteTarget.jobId, pl)
      }
      // Clean up hold/reject sets
      const key = pKey(deleteTarget)
      const holds   = loadSet(HOLDS_KEY); holds.delete(key); saveSet(HOLDS_KEY, holds)
      const rejects = loadSet(REJECTS_KEY); rejects.delete(key); saveSet(REJECTS_KEY, rejects)
      // Backend delete (best-effort)
      try {
        await apiClient.delete(`/resume-analysis/${deleteTarget.id}?organizationId=${encodeURIComponent(organizationId||'')}`)
      } catch { /* archived locally even if backend fails */ }
      setCandidates(prev => prev.filter(c => !(c.id === deleteTarget.id && c.jobId === deleteTarget.jobId)))
      setToast({ msg:`${deleteTarget.candidateName} archived`, sev:'info' })
      setDeleteTarget(null)
    } finally { setDeleting(false) }
  }

  // Header style
  const TH = {
    bgcolor:BG, borderBottom:`1px solid ${BORDER}`,
    fontSize:'0.62rem', fontWeight:700, color:TEXT3,
    textTransform:'uppercase' as const, letterSpacing:'0.06em',
    py:1.25, whiteSpace:'nowrap' as const,
  }

  return (
    <Box>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight:800, color:TEXT1 }}>Candidates</Typography>
          <Typography sx={{ fontSize:'0.8rem', color:TEXT2 }}>
            {stats.total} applicant{stats.total !== 1 ? 's' : ''} across {jobOptions.length} job{jobOptions.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      </Box>

      {/* ── KPI chips ──────────────────────────────────────────────────── */}
      <Grid container spacing={1.5} mb={2.5}>
        {[
          { label:'Total',       value:stats.total,    color:TEXT1,      icon:<PeopleAlt   sx={{ fontSize:28 }}/>, key:'ALL'         as const },
          { label:'Awaiting',    value:stats.applied,  color:'#38BDF8',  icon:<Pending     sx={{ fontSize:28 }}/>, key:'APPLIED'     as const },
          { label:'In Pipeline', value:stats.pipeline, color:'#A78BFA',  icon:<AccountTree sx={{ fontSize:28 }}/>, key:'IN_PIPELINE' as const },
          { label:'On Hold',     value:stats.hold,     color:'#F59E0B',  icon:<HourglassTop sx={{ fontSize:28 }}/>,key:'ON_HOLD'     as const },
          { label:'Rejected',    value:stats.rejected, color:'#EF4444',  icon:<Block       sx={{ fontSize:28 }}/>, key:'REJECTED'    as const },
        ].map(k => (
          <Grid item xs={6} sm={4} md key={k.label}>
            <Card onClick={() => setStatusFilt(p => p === k.key ? 'ALL' : k.key)}
              sx={{ bgcolor:statusFilt===k.key?`${k.color}12`:CARD,
                border:`1px solid ${statusFilt===k.key?k.color:BORDER}`,
                borderRadius:2, cursor:'pointer', transition:'all 0.15s',
                '&:hover':{ borderColor:k.color, bgcolor:`${k.color}08` } }}>
              <CardContent sx={{ p:2, '&:last-child':{ pb:2 } }}>
                <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <Box>
                    <Typography sx={{ fontSize:'0.6rem', color:TEXT2, textTransform:'uppercase',
                      letterSpacing:'0.06em', fontWeight:600 }}>{k.label}</Typography>
                    <Typography sx={{ fontWeight:800, fontSize:'1.75rem', color:k.color, lineHeight:1.1, mt:0.5 }}>
                      {k.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color:k.color, opacity:0.18, mt:0.5 }}>{k.icon}</Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <Card sx={{ bgcolor:CARD, border:`1px solid ${BORDER}`, borderRadius:2, mb:2 }}>
        <CardContent sx={{ p:1.5, '&:last-child':{ pb:1.5 } }}>
          <Box sx={{ display:'flex', gap:1.5, flexWrap:'wrap', alignItems:'center' }}>
            <TextField size="small" placeholder="Search by name, email or role…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              InputProps={{ startAdornment:<InputAdornment position="start"><Search sx={{ fontSize:'0.95rem', color:TEXT3 }}/></InputAdornment> }}
              sx={{ flex:1, minWidth:200, '& .MuiOutlinedInput-root':{ fontSize:'0.8rem' } }}/>

            <FormControl size="small" sx={{ minWidth:140 }}>
              <InputLabel sx={{ fontSize:'0.78rem' }}>Status</InputLabel>
              <Select value={statusFilt} label="Status" onChange={e => { setStatusFilt(e.target.value as any); setPage(0) }}
                sx={{ fontSize:'0.78rem' }}>
                {[['ALL','All Statuses'],['APPLIED','Applied'],['IN_PIPELINE','In Pipeline'],['ON_HOLD','On Hold'],['REJECTED','Rejected']].map(([v,l]) => (
                  <MenuItem key={v} value={v} sx={{ fontSize:'0.78rem' }}>{l}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth:180 }}>
              <InputLabel sx={{ fontSize:'0.78rem' }}>Job</InputLabel>
              <Select value={jobFilt} label="Job" onChange={e => { setJobFilt(e.target.value); setPage(0) }}
                sx={{ fontSize:'0.78rem' }}>
                <MenuItem value="ALL" sx={{ fontSize:'0.78rem' }}>All Jobs</MenuItem>
                {jobOptions.map(([id, title]) => (
                  <MenuItem key={id} value={id} sx={{ fontSize:'0.78rem' }}>{title}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography sx={{ fontSize:'0.72rem', color:TEXT3, ml:'auto' }}>
              {filtered.length} / {enriched.length}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <Card sx={{ bgcolor:CARD, border:`1px solid ${BORDER}`, borderRadius:2 }}>
        {loading ? (
          <Box sx={{ textAlign:'center', py:8 }}><CircularProgress sx={{ color:ORANGE }}/></Box>
        ) : (
          <Box sx={{ overflowX:'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th':TH }}>
                  <TableCell sx={{ pl:2.5 }}>Candidate</TableCell>
                  <TableCell>Applied For</TableCell>
                  <TableCell align="center">ATS Score</TableCell>
                  <TableCell>Experience</TableCell>
                  <TableCell>Matched Skills</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center" sx={{ minWidth:160 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign:'center', py:7, color:TEXT2, border:'none' }}>
                      <PeopleAlt sx={{ fontSize:40, color:TEXT3, display:'block', mx:'auto', mb:1 }}/>
                      {enriched.length === 0
                        ? 'No candidates yet — share job apply links to receive applications'
                        : 'No candidates match the current filters'}
                    </TableCell>
                  </TableRow>
                ) : paginated.map(c => (
                  <TableRow key={`${c.id}_${c.jobId}`}
                    sx={{ borderBottom:`1px solid ${BORDER}`, '&:last-child td':{ border:'none' },
                      '&:hover':{ bgcolor:'#F8FAFC' } }}>

                    {/* Candidate */}
                    <TableCell sx={{ py:1.5, pl:2.5 }}>
                      <Box sx={{ display:'flex', alignItems:'center', gap:1.25 }}>
                        <Avatar sx={{ width:34, height:34, fontSize:'0.72rem', fontWeight:800,
                          flexShrink:0, bgcolor:scoreColor(c.atsScore)+'22', color:scoreColor(c.atsScore) }}>
                          {c.candidateName.split(' ').map(w=>w[0]).slice(0,2).join('')}
                        </Avatar>
                        <Box>
                          <Box display="flex" alignItems="center" gap={0.75}>
                            <Typography sx={{ fontSize:'0.82rem', fontWeight:700, color:TEXT1, lineHeight:1.2 }}>
                              {c.candidateName}
                            </Typography>
                            {(c.totalApplications ?? 1) > 1 && (
                              <Tooltip title={`Applied to ${c.totalApplications} jobs: ${(c.appliedJobTitles ?? []).join(', ')}`} arrow>
                                <Chip label={`${c.totalApplications} jobs`} size="small"
                                  sx={{ height:16, fontSize:'0.58rem', fontWeight:700, cursor:'help',
                                    bgcolor:'#EFF6FF', color:'#1D4ED8', border:'1px solid #BFDBFE' }} />
                              </Tooltip>
                            )}
                          </Box>
                          <Typography sx={{ fontSize:'0.65rem', color:TEXT3 }}>{c.email}</Typography>
                          {c.currentRole && (
                            <Typography sx={{ fontSize:'0.65rem', color:TEXT2 }}>{c.currentRole}</Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Job */}
                    <TableCell sx={{ py:1.5 }}>
                      <Box sx={{ display:'flex', alignItems:'flex-start', gap:0.75 }}>
                        <Work sx={{ fontSize:13, color:TEXT3, flexShrink:0, mt:0.2 }}/>
                        <Box>
                          <Typography sx={{ fontSize:'0.72rem', color:TEXT1, fontWeight:600,
                            maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {c.jobTitle}
                          </Typography>
                          {c.jobCode && (
                            <Typography sx={{ fontSize:'0.6rem', color:TEXT3, fontFamily:'monospace',
                              maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {c.jobCode}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    {/* ATS Score */}
                    <TableCell align="center" sx={{ py:1.5 }}>
                      <Box sx={{ display:'flex', flexDirection:'column', alignItems:'center', gap:0.25 }}>
                        <Typography sx={{ fontWeight:800, fontSize:'0.88rem', color:scoreColor(c.atsScore) }}>
                          {Math.round(c.atsScore)}%
                        </Typography>
                        <Box sx={{ width:48, height:3, borderRadius:99, bgcolor:BORDER, overflow:'hidden' }}>
                          <Box sx={{ width:`${c.atsScore}%`, height:'100%', bgcolor:scoreColor(c.atsScore), borderRadius:99 }}/>
                        </Box>
                        <Typography sx={{ fontSize:'0.55rem', color:TEXT3 }}>{scoreLabel(c.atsScore)}</Typography>
                      </Box>
                    </TableCell>

                    {/* Experience */}
                    <TableCell sx={{ py:1.5 }}>
                      <Typography sx={{ fontSize:'0.75rem', color:TEXT2, fontWeight:500 }}>
                        {c.yearsOfExperience ?? 0} yr{c.yearsOfExperience !== 1 ? 's' : ''}
                      </Typography>
                      {c.education && (
                        <Typography sx={{ fontSize:'0.62rem', color:TEXT3 }}>{c.education}</Typography>
                      )}
                    </TableCell>

                    {/* Skills */}
                    <TableCell sx={{ py:1.5 }}>
                      <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.4 }}>
                        {(c.matchedSkills ?? []).slice(0,3).map(sk => (
                          <Chip key={sk} label={sk} size="small"
                            sx={{ height:17, fontSize:'0.58rem', bgcolor:'#22C55E18', color:'#22C55E' }}/>
                        ))}
                        {(c.matchedSkills ?? []).length > 3 && (
                          <Typography sx={{ fontSize:'0.62rem', color:TEXT3, alignSelf:'center' }}>
                            +{c.matchedSkills.length - 3}
                          </Typography>
                        )}
                        {!(c.matchedSkills?.length) && (
                          <Typography sx={{ fontSize:'0.62rem', color:TEXT3 }}>—</Typography>
                        )}
                      </Box>
                    </TableCell>

                    {/* Status */}
                    <TableCell sx={{ py:1.5 }}>
                      <StatusChip label={c.stageLabel} color={c.stageColor}/>
                    </TableCell>

                    {/* THREE BUTTONS */}
                    <TableCell align="center" sx={{ py:1.5 }}>
                      <Box sx={{ display:'flex', gap:0.75, justifyContent:'center', flexWrap:'nowrap' }}>

                        {/* View */}
                        <Tooltip title="View full profile">
                          <Button size="small" variant="outlined"
                            startIcon={<Visibility sx={{ fontSize:'0.85rem !important' }}/>}
                            onClick={() => setViewData({ analysisId:c.id, jobId:c.jobId, jobTitle:c.jobTitle })}
                            sx={{ fontSize:'0.68rem', py:0.4, px:1, minWidth:0,
                              borderColor:`${ORANGE}55`, color:ORANGE,
                              '&:hover':{ bgcolor:`${ORANGE}08`, borderColor:ORANGE } }}>
                            View
                          </Button>
                        </Tooltip>

                        {/* Edit */}
                        <Tooltip title="Edit & manage">
                          <Button size="small" variant="outlined"
                            startIcon={<Edit sx={{ fontSize:'0.85rem !important' }}/>}
                            onClick={() => setEditTarget({ ...c, ...getStatus(c) })}
                            sx={{ fontSize:'0.68rem', py:0.4, px:1, minWidth:0,
                              borderColor:`#2563EB55`, color:'#2563EB',
                              '&:hover':{ bgcolor:'#2563EB08', borderColor:'#2563EB' } }}>
                            Edit
                          </Button>
                        </Tooltip>

                        {/* Delete */}
                        <Tooltip title="Archive candidate">
                          <Button size="small" variant="outlined"
                            startIcon={<Delete sx={{ fontSize:'0.85rem !important' }}/>}
                            onClick={() => setDeleteTarget({ ...c, ...getStatus(c) })}
                            sx={{ fontSize:'0.68rem', py:0.4, px:1, minWidth:0,
                              borderColor:'#EF444455', color:'#EF4444',
                              '&:hover':{ bgcolor:'#EF444408', borderColor:'#EF4444' } }}>
                            Delete
                          </Button>
                        </Tooltip>

                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
        <TablePagination component="div" count={filtered.length} page={page}
          onPageChange={(_,p) => setPage(p)} rowsPerPage={rpp}
          onRowsPerPageChange={e => { setRpp(parseInt(e.target.value)); setPage(0) }}
          rowsPerPageOptions={[10,20,50]}
          sx={{ borderTop:`1px solid ${BORDER}`, '& .MuiTablePagination-toolbar':{ fontSize:'0.75rem' } }}/>
      </Card>

      {/* ── View Modal (CandidateDetailModal) ─────────────────────────── */}
      {viewData && (
        <CandidateDetailModal
          open={!!viewData}
          data={viewData}
          onClose={() => setViewData(null)}
        />
      )}

      {/* ── Edit Modal ────────────────────────────────────────────────── */}
      <EditCandidateModal
        open={!!editTarget}
        candidate={editTarget}
        organizationId={organizationId || ''}
        onClose={() => setEditTarget(null)}
        onSaved={handleSaved}
        onAction={handleAction}
      />

      {/* ── Delete Confirm ────────────────────────────────────────────── */}
      <DeleteDialog
        open={!!deleteTarget}
        candidate={deleteTarget}
        deleting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)}
        anchorOrigin={{ vertical:'bottom', horizontal:'center' }}>
        <Alert severity={toast?.sev ?? 'info'} onClose={() => setToast(null)}
          sx={{ borderRadius:2, fontWeight:500 }}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default CandidatesPage
