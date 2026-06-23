import React, { useState, useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '@hooks/redux'
import { fetchJobs } from '@store/jobsSlice'
import {
  Box, Typography, Card, CardContent, Button, Chip, Avatar, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, FormControl, InputLabel, MenuItem, Divider, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell,
  InputAdornment, Snackbar, Alert
} from '@mui/material'
import {
  CalendarMonth, Add, Delete, VideoCall, Phone, Business,
  Edit, Search, CheckCircle, LinkOutlined
} from '@mui/icons-material'
import {
  loadPipeline, loadSchedules, saveSchedule, deleteSchedule,
  loadPanels, loadPanelAssignments, loadPanelMembers, uid,
  InterviewSchedule, PipelineCandidate, loadSettings
} from '@utils/pipelineStorage'
import { sendInterviewEmail } from '@services/notificationApi'

const NAVY    = '#F8FAFC'
const NAVY_MID= '#FFFFFF'
const NAVY_LT = '#E2E8F0'
const ORANGE  = '#6366F1'

const TYPE_COLOR: Record<string, string> = { VIDEO: '#38BDF8', PHONE: '#A78BFA', IN_PERSON: '#34D399' }
const STATUS_COLOR: Record<string, string> = { SCHEDULED: '#38BDF8', COMPLETED: '#22C55E', CANCELLED: '#EF4444' }
const MODES = ['VIDEO', 'IN_PERSON', 'PHONE'] as const

interface CandidateRow {
  candidate: PipelineCandidate
  jobId: string
  jobTitle: string
  stageName: string
  panelNames: string
  schedule: InterviewSchedule | null
}

const emptyForm = (): Partial<InterviewSchedule> => ({
  dateTime: '', duration: 60, type: 'VIDEO', panelMembers: [],
  location: '', meetingLink: '', notes: '', status: 'SCHEDULED'
})

const SchedulePage: React.FC = () => {
  const dispatch = useAppDispatch()
  const { organizationId } = useAppSelector(s => s.auth)
  const { jobs }           = useAppSelector(s => s.jobs)

  const [rows,     setRows]     = useState<CandidateRow[]>([])
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState<'ALL'|'SCHEDULED'|'COMPLETED'|'UNSCHEDULED'>('ALL')
  const [dialogCr, setDialogCr] = useState<CandidateRow | null>(null)
  const [editSch,  setEditSch]  = useState<InterviewSchedule | null>(null)
  const [form,     setForm]     = useState<Partial<InterviewSchedule>>(emptyForm())
  const [toast,    setToast]    = useState<string|null>(null)

  const rebuild = () => {
    const schedules    = loadSchedules()
    const panels       = loadPanels()
    const panelMembers = loadPanelMembers()
    const assignments  = loadPanelAssignments()
    const out: CandidateRow[] = []

    jobs.forEach(job => {
      const pl = loadPipeline(String(job.id))
      pl.candidates.forEach(c => {
        const sid   = pl.stageMap[c.id] ?? pl.stages[0]?.id ?? ''
        const stage = pl.stages.find(s => s.id === sid)
        const asgn  = assignments.find(a => a.candidateId === c.id && a.jobId === String(job.id))
        // Support both new memberIds and legacy panelId
        let panelNames = ''
        if (asgn?.memberIds?.length) {
          panelNames = asgn.memberIds.map(id => panelMembers.find(m => m.id === id)?.name ?? '').filter(Boolean).join(', ')
        } else if (asgn?.panelId) {
          const panel = panels.find(p => p.id === asgn.panelId)
          panelNames  = panel?.members.join(', ') ?? ''
        }
        const sch   = schedules.find(s => s.candidateId === c.id && s.jobId === String(job.id) && s.status !== 'CANCELLED') ?? null
        out.push({
          candidate: c, jobId: String(job.id), jobTitle: job.title,
          stageName: stage?.label ?? 'Unknown',
          panelNames,
          schedule: sch,
        })
      })
    })
    setRows(out)
  }

  useEffect(() => { if (organizationId) dispatch(fetchJobs({ organizationId, page: 0, size: 50 })) }, [organizationId, dispatch])
  useEffect(() => { rebuild() }, [jobs])

  const filtered = useMemo(() => {
    let r = rows
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(x => x.candidate.name.toLowerCase().includes(q) || x.candidate.email?.toLowerCase().includes(q))
    }
    if (filter === 'SCHEDULED')   r = r.filter(x => x.schedule?.status === 'SCHEDULED')
    if (filter === 'COMPLETED')   r = r.filter(x => x.schedule?.status === 'COMPLETED')
    if (filter === 'UNSCHEDULED') r = r.filter(x => !x.schedule)
    return r
  }, [rows, search, filter])

  const openSchedule = (row: CandidateRow, existing?: InterviewSchedule) => {
    setDialogCr(row)
    if (existing) {
      setEditSch(existing)
      setForm({ ...existing, panelMembers: existing.panelMembers })
    } else {
      setEditSch(null)
      setForm({ ...emptyForm(), panelMembers: row.panelNames ? row.panelNames.split(',').map(s=>s.trim()) : [] })
    }
  }

  const handleSave = () => {
    if (!dialogCr) return
    const s: InterviewSchedule = {
      id: editSch?.id ?? uid(),
      jobId: dialogCr.jobId,
      jobTitle: dialogCr.jobTitle,
      candidateId: dialogCr.candidate.id,
      candidateName: dialogCr.candidate.name,
      stageId: '',
      stageName: dialogCr.stageName,
      dateTime: form.dateTime ?? '',
      duration: form.duration ?? 60,
      type: form.type as InterviewSchedule['type'] ?? 'VIDEO',
      panelMembers: Array.isArray(form.panelMembers)
        ? form.panelMembers
        : String(form.panelMembers ?? '').split(',').map(x=>x.trim()).filter(Boolean),
      location: form.location ?? '',
      meetingLink: form.meetingLink ?? '',
      notes: form.notes ?? '',
      status: form.status as InterviewSchedule['status'] ?? 'SCHEDULED',
    }
    saveSchedule(s)
    rebuild()
    setDialogCr(null)
    setToast(editSch ? 'Interview updated' : 'Interview scheduled')

    // Fire interview invitation email for new schedules
    if (!editSch) {
      const settings = loadSettings()
      if (settings.emailOnInterview && dialogCr.candidate.email) {
        sendInterviewEmail(
          dialogCr.candidate.email,
          dialogCr.candidate.name,
          dialogCr.jobTitle,
          s.dateTime,
          s.type,
          s.meetingLink ?? ''
        ).catch(() => {})
      }
    }
  }

  const handleMarkDone = (s: InterviewSchedule) => {
    saveSchedule({ ...s, status: 'COMPLETED' })
    rebuild()
  }

  const handleDelete = (id: string) => {
    deleteSchedule(id)
    rebuild()
  }

  const SH = {
    bgcolor: NAVY, borderBottom: `1px solid ${NAVY_LT}`,
    fontSize: '0.68rem', fontWeight: 700, color: '#475569',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em',
    py: 1.25, whiteSpace: 'nowrap' as const
  }

  const scheduled   = rows.filter(r => r.schedule?.status === 'SCHEDULED').length
  const completed   = rows.filter(r => r.schedule?.status === 'COMPLETED').length
  const unscheduled = rows.filter(r => !r.schedule).length

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#E2E8F0' }}>Schedule Interviews</Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            {scheduled} upcoming · {completed} completed · {unscheduled} unscheduled
          </Typography>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`, borderRadius: 2, mb: 2 }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box display="flex" gap={1.5} flexWrap="wrap" alignItems="center">
            <TextField size="small" placeholder="Search by name or email…"
              value={search} onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: '1rem', color: '#475569' }} /></InputAdornment> }}
              sx={{ flex: 1, minWidth: 200, '& .MuiOutlinedInput-root': { fontSize: '0.8rem' }, '& fieldset': { borderColor: NAVY_LT } }} />
            <Box display="flex" gap={1}>
              {(['ALL', 'UNSCHEDULED', 'SCHEDULED', 'COMPLETED'] as const).map(f => (
                <Chip key={f} label={f.replace('_',' ')} size="small" clickable onClick={() => setFilter(f)}
                  sx={{
                    fontWeight: 600, fontSize: '0.68rem',
                    bgcolor: filter === f ? `${ORANGE}22` : NAVY_LT,
                    border: `1px solid ${filter === f ? ORANGE : 'transparent'}`,
                    color: filter === f ? ORANGE : '#64748B'
                  }} />
              ))}
            </Box>
            <Typography variant="caption" sx={{ color: '#475569', ml: 'auto', flexShrink: 0 }}>
              {filtered.length} / {rows.length}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Table */}
      <Card sx={{ bgcolor: NAVY_MID, border: `1px solid ${NAVY_LT}`, borderRadius: 2 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': SH }}>
                <TableCell>Candidate</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Assigned Panel</TableCell>
                <TableCell>Current Round</TableCell>
                <TableCell>Schedule Date</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Mode</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 6, color: '#334155', border: 'none' }}>
                    {rows.length === 0
                      ? 'No candidates in any pipeline — add candidates via Jobs → Hiring Pipeline'
                      : 'No candidates match the filter'}
                  </TableCell>
                </TableRow>
              ) : filtered.map(r => {
                const s   = r.schedule
                const dt  = s ? new Date(s.dateTime) : null
                const hasLink = s?.meetingLink

                return (
                  <TableRow key={`${r.candidate.id}_${r.jobId}`}
                    sx={{ borderBottom: `1px solid ${NAVY_LT}`, '&:last-child td': { border: 'none' },
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.015)' },
                      borderLeft: s ? `2px solid ${STATUS_COLOR[s.status]}` : '2px solid transparent' }}>

                    <TableCell sx={{ py: 1.25 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: '0.65rem', fontWeight: 700, bgcolor: NAVY_LT, flexShrink: 0 }}>
                          {r.candidate.name.split(' ').map(w=>w[0]).slice(0,2).join('')}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#E2E8F0', lineHeight: 1.2 }}>
                            {r.candidate.name}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#64748B' }}>{r.jobTitle}</Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell sx={{ fontSize: '0.72rem', color: '#64748B', py: 1.25 }}>
                      {r.candidate.email || '—'}
                    </TableCell>

                    <TableCell sx={{ py: 1.25 }}>
                      {r.panelNames ? (
                        <Typography variant="caption" sx={{ fontSize: '0.72rem', color: '#A78BFA' }}>
                          {r.panelNames}
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ fontSize: '0.68rem', color: '#334155', fontStyle: 'italic' }}>Unassigned</Typography>
                      )}
                    </TableCell>

                    <TableCell sx={{ py: 1.25 }}>
                      <Typography variant="caption" sx={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>
                        {r.stageName}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ py: 1.25 }}>
                      {dt ? (
                        <Typography variant="caption" sx={{ fontSize: '0.72rem', color: '#E2E8F0', whiteSpace: 'nowrap' }}>
                          {dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Typography>
                      ) : <Typography variant="caption" sx={{ color: '#334155', fontSize: '0.68rem' }}>—</Typography>}
                    </TableCell>

                    <TableCell sx={{ py: 1.25 }}>
                      {dt ? (
                        <Typography variant="caption" sx={{ fontSize: '0.72rem', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                          {dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      ) : <Typography variant="caption" sx={{ color: '#334155', fontSize: '0.68rem' }}>—</Typography>}
                    </TableCell>

                    <TableCell sx={{ py: 1.25 }}>
                      {s ? (
                        <FormControl size="small" sx={{ minWidth: 110 }}>
                          <Select value={s.type} size="small"
                            onChange={e => { saveSchedule({ ...s, type: e.target.value as any }); rebuild() }}
                            sx={{ fontSize: '0.72rem', color: TYPE_COLOR[s.type], '& fieldset': { borderColor: NAVY_LT },
                              '& .MuiSelect-icon': { fontSize: '1rem' } }}>
                            {MODES.map(m => <MenuItem key={m} value={m} sx={{ fontSize: '0.72rem' }}>{m.replace('_',' ')}</MenuItem>)}
                          </Select>
                        </FormControl>
                      ) : (
                        <FormControl size="small" sx={{ minWidth: 110 }}>
                          <Select value="" displayEmpty size="small"
                            onChange={e => {
                              if (!e.target.value) return
                              openSchedule(r)
                            }}
                            renderValue={() => <Typography sx={{ color: '#334155', fontSize: '0.72rem' }}>Select</Typography>}
                            sx={{ fontSize: '0.72rem', '& fieldset': { borderColor: NAVY_LT } }}>
                            {MODES.map(m => <MenuItem key={m} value={m} sx={{ fontSize: '0.72rem' }}>{m.replace('_',' ')}</MenuItem>)}
                          </Select>
                        </FormControl>
                      )}
                    </TableCell>

                    <TableCell align="center" sx={{ py: 1 }}>
                      <Box display="flex" gap={0.5} justifyContent="center">
                        {s ? (
                          <>
                            {s.status === 'SCHEDULED' && (
                              <Tooltip title="Mark Completed">
                                <IconButton size="small" onClick={() => handleMarkDone(s)}
                                  sx={{ color: '#22C55E', '&:hover': { bgcolor: 'rgba(34,197,94,0.1)' } }}>
                                  <CheckCircle sx={{ fontSize: '0.9rem' }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {hasLink && (
                              <Tooltip title="Join Meeting">
                                <IconButton size="small" component="a" href={s.meetingLink} target="_blank"
                                  sx={{ color: '#38BDF8', '&:hover': { bgcolor: 'rgba(56,189,248,0.1)' } }}>
                                  <LinkOutlined sx={{ fontSize: '0.9rem' }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => openSchedule(r, s)}
                                sx={{ color: '#64748B', '&:hover': { color: ORANGE } }}>
                                <Edit sx={{ fontSize: '0.9rem' }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" onClick={() => handleDelete(s.id)}
                                sx={{ color: '#64748B', '&:hover': { color: '#EF4444' } }}>
                                <Delete sx={{ fontSize: '0.9rem' }} />
                              </IconButton>
                            </Tooltip>
                          </>
                        ) : (
                          <Button size="small" variant="outlined" startIcon={<CalendarMonth sx={{ fontSize: '0.75rem !important' }} />}
                            onClick={() => openSchedule(r)}
                            sx={{ fontSize: '0.62rem', py: 0.25, px: 0.75, borderColor: `${ORANGE}55`, color: ORANGE,
                              '&:hover': { bgcolor: `${ORANGE}11`, borderColor: ORANGE } }}>
                            Schedule
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Box>
      </Card>

      {/* Schedule Dialog */}
      <Dialog open={!!dialogCr} onClose={() => setDialogCr(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: NAVY_MID, fontWeight: 700, fontSize: '0.95rem', pb: 1 }}>
          {editSch ? 'Edit Interview' : 'Schedule Interview'}
          {dialogCr && (
            <Typography variant="caption" display="block" sx={{ color: '#64748B', fontWeight: 400 }}>
              {dialogCr.candidate.name} · {dialogCr.stageName} · {dialogCr.jobTitle}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: NAVY_MID, pt: '16px !important' }}>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField label="Date & Time" type="datetime-local" size="small" fullWidth
              value={form.dateTime ?? ''} onChange={e => setForm(f => ({...f, dateTime: e.target.value}))}
              InputLabelProps={{ shrink: true }}
              sx={{ '& fieldset': { borderColor: NAVY_LT } }} />
            <Box display="flex" gap={2}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel sx={{ fontSize: '0.85rem' }}>Mode</InputLabel>
                <Select value={form.type ?? 'VIDEO'} label="Mode"
                  onChange={e => setForm(f => ({...f, type: e.target.value as any}))}
                  sx={{ '& fieldset': { borderColor: NAVY_LT } }}>
                  <MenuItem value="VIDEO">Online (Video)</MenuItem>
                  <MenuItem value="IN_PERSON">Offline (In Person)</MenuItem>
                  <MenuItem value="PHONE">Phone</MenuItem>
                </Select>
              </FormControl>
              <TextField label="Duration (min)" type="number" size="small" sx={{ flex: 1, '& fieldset': { borderColor: NAVY_LT } }}
                value={form.duration ?? 60} onChange={e => setForm(f => ({...f, duration: Number(e.target.value)}))} />
            </Box>
            <TextField label="Panel Members (comma-separated)" size="small" fullWidth
              value={Array.isArray(form.panelMembers) ? form.panelMembers.join(', ') : form.panelMembers ?? ''}
              onChange={e => setForm(f => ({...f, panelMembers: e.target.value.split(',').map(x=>x.trim())}))}
              placeholder="Jane Doe, John Smith"
              sx={{ '& fieldset': { borderColor: NAVY_LT } }} />
            <Box display="flex" gap={2}>
              <TextField label="Location / Room" size="small" sx={{ flex: 1, '& fieldset': { borderColor: NAVY_LT } }}
                value={form.location ?? ''} onChange={e => setForm(f => ({...f, location: e.target.value}))} />
              <TextField label="Meeting Link" size="small" sx={{ flex: 1, '& fieldset': { borderColor: NAVY_LT } }}
                value={form.meetingLink ?? ''} onChange={e => setForm(f => ({...f, meetingLink: e.target.value}))} />
            </Box>
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={form.status ?? 'SCHEDULED'} label="Status"
                onChange={e => setForm(f => ({...f, status: e.target.value as any}))}
                sx={{ '& fieldset': { borderColor: NAVY_LT } }}>
                <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Notes" size="small" fullWidth multiline rows={2}
              value={form.notes ?? ''} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
              sx={{ '& fieldset': { borderColor: NAVY_LT } }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: NAVY_MID, borderTop: `1px solid ${NAVY_LT}` }}>
          <Button onClick={() => setDialogCr(null)} sx={{ color: '#94A3B8' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.dateTime}
            sx={{ bgcolor: ORANGE, '&:hover': { bgcolor: '#4338CA' } }}>
            {editSch ? 'Update' : 'Schedule'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)} sx={{ bgcolor: '#111827', color: '#22C55E' }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default SchedulePage
