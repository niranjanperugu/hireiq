import React, { useEffect, useState, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@hooks/redux'
import { fetchJobs, createJob, updateJob, deleteJob, publishJob, unpublishJob, Job } from '@store/jobsSlice'
import {
  Box, Button, TextField, Typography, Chip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, Select, FormControl, InputLabel,
  Pagination, Stack, Snackbar, Alert, Switch, FormControlLabel,
  InputAdornment
} from '@mui/material'
import {
  Add as AddIcon, Visibility as ViewIcon, Edit as EditIcon,
  Delete as DeleteIcon, Download as DownloadIcon, Search as SearchIcon,
  FilterList as FilterIcon, Star as StarIcon,
  PublishedWithChanges as PublishIcon, Unpublished as UnpublishIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

const INDIGO = '#6366F1'

const EMPLOYMENT_TYPES = [
  'FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE', 'TEMPORARY'
]
const WORK_MODES = ['REMOTE', 'HYBRID', 'ON_SITE']

function typeLabel(job: Job): string {
  if (job.workMode === 'REMOTE') return 'Remote'
  if (job.workMode === 'HYBRID') return 'Hybrid'
  const map: Record<string, string> = {
    FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract',
    INTERNSHIP: 'Internship', FREELANCE: 'Freelance', TEMPORARY: 'Temporary'
  }
  return map[job.employmentType] ?? job.employmentType
}

function typeColor(job: Job): { bg: string; color: string } {
  const t = typeLabel(job)
  const map: Record<string, { bg: string; color: string }> = {
    Remote:     { bg: '#EFF6FF', color: '#1D4ED8' },
    Hybrid:     { bg: '#F5F3FF', color: '#6D28D9' },
    Internship: { bg: '#FFF7ED', color: '#C2410C' },
    Freelance:  { bg: '#EFF6FF', color: '#0369A1' },
    Temporary:  { bg: '#FFF1F2', color: '#BE185D' },
    Contract:   { bg: '#FFFBEB', color: '#B45309' },
    'Part-time':{ bg: '#F0FFFE', color: '#0E7490' },
    'Full-time':{ bg: '#F0FDF4', color: '#15803D' },
  }
  return map[t] ?? { bg: '#F1F5F9', color: '#475569' }
}

function fmtSalary(min?: number, max?: number, currency?: string): string {
  if (!min && !max) return '—'
  const fmt = (n: number) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  if (min && max) return `${fmt(min)} - ${fmt(max)}`
  if (min) return `From ${fmt(min)}`
  return `Up to ${fmt(max!)}`
}

function fmtDate(d?: string): string {
  if (!d) return '—'
  return new Date(d).toISOString().slice(0, 10)
}

const emptyForm = {
  title: '', description: '', employmentType: 'FULL_TIME', workMode: 'HYBRID',
  location: '', salaryMin: '', salaryMax: '', salaryCurrency: 'USD',
  minExperienceYears: '', maxExperienceYears: '', deadline: '', featured: false,
  departmentId: '', status: 'DRAFT'
}

const JobsPage: React.FC = () => {
  const navigate   = useNavigate()
  const dispatch   = useAppDispatch()
  const { organizationId } = useAppSelector(s => s.auth)
  const { jobs, pagination, loading } = useAppSelector(s => s.jobs)

  const [search,     setSearch]     = useState('')
  const [rpp,        setRpp]        = useState(10)
  const [page,       setPage]       = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing,    setEditing]    = useState<Job | null>(null)
  const [delJob,     setDelJob]     = useState<Job | null>(null)
  const [form,       setForm]       = useState({ ...emptyForm })
  const [saving,     setSaving]     = useState(false)
  const [toast,      setToast]      = useState<{ msg: string; sev: 'success' | 'error' } | null>(null)
  const [depts,      setDepts]      = useState<{ id: string; name: string }[]>([])

  const load = useCallback((p = page, r = rpp, q = search) => {
    if (!organizationId) return
    dispatch(fetchJobs({ organizationId, page: p - 1, size: r, search: q }))
  }, [organizationId, dispatch, page, rpp, search])

  useEffect(() => { load(1) }, [organizationId])

  useEffect(() => {
    if (!organizationId) return
    import('@services/apiClient').then(({ default: api }) => {
      api.get(`/organizations/${organizationId}/departments`).then(r => {
        const list = (r.data?.data ?? []).map((d: any) => ({ id: d.id, name: d.name }))
        setDepts(list)
      }).catch(() => {})
    })
  }, [organizationId])

  const doSearch = () => { setPage(1); load(1, rpp, search) }

  const openAdd  = () => {
    setEditing(null)
    setForm({ ...emptyForm, departmentId: depts[0]?.id ?? '' })
    setDialogOpen(true)
  }
  const openEdit = (j: Job) => {
    setEditing(j)
    setForm({
      title: j.title, description: j.description,
      employmentType: j.employmentType, workMode: j.workMode,
      location: j.location, salaryMin: String(j.salaryMin ?? ''),
      salaryMax: String(j.salaryMax ?? ''), salaryCurrency: j.salaryCurrency ?? 'USD',
      minExperienceYears: String(j.minExperienceYears ?? ''),
      maxExperienceYears: String(j.maxExperienceYears ?? ''),
      deadline: j.deadline ? j.deadline.slice(0, 10) : '',
      featured: j.featured ?? false,
      departmentId: j.departmentId ?? '',
      status: j.status ?? 'DRAFT'
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!organizationId || !form.title.trim() || !form.location.trim()) return
    setSaving(true)
    const payload = {
      ...form,
      salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
      salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
      minExperienceYears: form.minExperienceYears ? Number(form.minExperienceYears) : null,
      maxExperienceYears: form.maxExperienceYears ? Number(form.maxExperienceYears) : null,
      deadline: form.deadline ? `${form.deadline}T23:59:00` : null,
      departmentId: form.departmentId || (depts[0]?.id ?? null)
    }
    try {
      if (editing) {
        await dispatch(updateJob({ organizationId, jobId: editing.id, jobData: payload })).unwrap()
        setToast({ msg: 'Job updated successfully', sev: 'success' })
      } else {
        await dispatch(createJob({ organizationId, jobData: payload })).unwrap()
        setToast({ msg: 'Job created successfully', sev: 'success' })
      }
      setDialogOpen(false)
      load()
    } catch {
      setToast({ msg: 'Failed to save job', sev: 'error' })
    } finally { setSaving(false) }
  }

  const handleTogglePublish = async (j: Job) => {
    if (!organizationId) return
    if (j.status === 'OPEN') {
      await dispatch(unpublishJob({ organizationId, jobId: j.id, currentData: { title: j.title, description: j.description, employmentType: j.employmentType, workMode: j.workMode, location: j.location, salaryMin: j.salaryMin, salaryMax: j.salaryMax, salaryCurrency: j.salaryCurrency, minExperienceYears: j.minExperienceYears, maxExperienceYears: j.maxExperienceYears, deadline: j.deadline, featured: j.featured, departmentId: j.departmentId } }))
      setToast({ msg: `"${j.title}" moved back to Draft`, sev: 'success' })
    } else {
      await dispatch(publishJob({ organizationId, jobId: j.id }))
      setToast({ msg: `"${j.title}" published successfully`, sev: 'success' })
    }
  }

  const handleDelete = async () => {
    if (!organizationId || !delJob) return
    try {
      await dispatch(deleteJob({ organizationId, jobId: delJob.id })).unwrap()
      setToast({ msg: 'Job deleted', sev: 'success' })
      setDelJob(null)
      load()
    } catch { setToast({ msg: 'Failed to delete job', sev: 'error' }) }
  }

  const handleDownload = (j: Job) => {
    const text = `Job: ${j.title}\nCode: ${j.jobCode ?? ''}\nLocation: ${j.location}\nSalary: ${fmtSalary(j.salaryMin, j.salaryMax)}\nStatus: ${j.status}\n\n${j.description}`
    const blob = new Blob([text], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${j.jobCode ?? j.id}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = pagination?.totalPages ?? 1
  const totalEls   = pagination?.totalElements ?? 0

  const f = form as any
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const headCell = { fontSize: '0.78rem', fontWeight: 700, color: '#64748B', py: 1.25, px: 1.5, whiteSpace: 'nowrap' as const, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }
  const cell     = { fontSize: '0.82rem', color: '#1E293B', py: 1.25, px: 1.5, borderBottom: '1px solid #F1F5F9' }

  return (
    <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100%', pb: 4 }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', color: '#0B0F1A' }}>
          Job Postings
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}
          sx={{ bgcolor: '#22C55E', '&:hover': { bgcolor: '#16A34A' }, fontWeight: 700, textTransform: 'none', borderRadius: 1.5, px: 2.5 }}>
          Add Job Posting
        </Button>
      </Box>

      {/* ── Search / Filters bar ────────────────────────────────────────── */}
      <Box display="flex" alignItems="center" gap={1.5} mb={2} sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: 2, px: 2, py: 1.5 }}>
        <TextField size="small" placeholder="Search..." value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch()}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#94A3B8', fontSize: '1.1rem' }} /></InputAdornment> }}
          sx={{ flex: 1, '& .MuiOutlinedInput-root': { fontSize: '0.85rem' } }} />
        <Button variant="contained" startIcon={<SearchIcon />} onClick={doSearch}
          sx={{ bgcolor: INDIGO, '&:hover': { bgcolor: '#4338CA' }, textTransform: 'none', fontWeight: 600, px: 2.5, borderRadius: 1.5 }}>
          Search
        </Button>
        <Button variant="outlined" startIcon={<FilterIcon />}
          sx={{ borderColor: '#CBD5E1', color: '#475569', textTransform: 'none', borderRadius: 1.5 }}>
          Filters
        </Button>
        <Box flex={1} />
        <Typography sx={{ fontSize: '0.8rem', color: '#64748B', whiteSpace: 'nowrap' }}>Per Page:</Typography>
        <Select size="small" value={rpp}
          onChange={e => { const v = Number(e.target.value); setRpp(v); setPage(1); load(1, v) }}
          sx={{ fontSize: '0.82rem', minWidth: 64 }}>
          {[10, 25, 50].map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
        </Select>
      </Box>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['#','Code','Title','Type','Location','Salary Range','Applications','Published','Status','Deadline','Actions']
                  .map(h => <TableCell key={h} sx={headCell}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} sx={{ color: INDIGO }} />
                </TableCell></TableRow>
              ) : jobs.length === 0 ? (
                <TableRow><TableCell colSpan={11} align="center" sx={{ py: 6, color: '#94A3B8', fontSize: '0.85rem' }}>
                  No job postings found. Click "+ Add Job Posting" to create one.
                </TableCell></TableRow>
              ) : jobs.map((j, idx) => {
                const tc = typeColor(j)
                const rowNum = (page - 1) * rpp + idx + 1
                return (
                  <TableRow key={j.id} hover sx={{ '&:hover': { bgcolor: '#F8FAFC' }, cursor: 'pointer' }}
                    onClick={() => navigate(`/jobs/${j.id}`)}>
                    <TableCell sx={{ ...cell, color: '#64748B', width: 36 }}>{rowNum}</TableCell>
                    <TableCell sx={{ ...cell, fontFamily: 'monospace', fontSize: '0.75rem', color: '#6366F1', width: 110 }}>
                      {j.jobCode ?? '—'}
                    </TableCell>
                    <TableCell sx={{ ...cell, minWidth: 160 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F172A' }}>{j.title}</Typography>
                        {j.featured && (
                          <Chip label="Featured" size="small" icon={<StarIcon sx={{ fontSize: '0.65rem !important' }} />}
                            sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700, bgcolor: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', mt: 0.25, '& .MuiChip-icon': { color: '#B45309' } }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ ...cell, width: 110 }}>
                      <Box sx={{ display: 'inline-block', px: 1, py: 0.25, borderRadius: 1, bgcolor: tc.bg, color: tc.color, fontSize: '0.75rem', fontWeight: 600 }}>
                        {typeLabel(j)}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ ...cell, minWidth: 150, color: '#2563EB', fontSize: '0.78rem' }}>{j.location}</TableCell>
                    <TableCell sx={{ ...cell, minWidth: 160, fontSize: '0.78rem' }}>{fmtSalary(j.salaryMin, j.salaryMax, j.salaryCurrency)}</TableCell>
                    <TableCell sx={{ ...cell, textAlign: 'center', width: 90 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>{j.applicationCount ?? 0}</Typography>
                    </TableCell>
                    <TableCell sx={{ ...cell, width: 80 }}>
                      {j.published
                        ? <Chip label="Yes" size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }} />
                        : <Chip label="No"  size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }} />
                      }
                    </TableCell>
                    <TableCell sx={{ ...cell, width: 100 }}>
                      {j.status === 'OPEN'
                        ? <Chip label="Published" size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }} />
                        : j.status === 'DRAFT'
                        ? <Chip label="Draft" size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }} />
                        : <Chip label={j.status} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                      }
                    </TableCell>
                    <TableCell sx={{ ...cell, width: 100, fontSize: '0.78rem' }}>{fmtDate(j.deadline)}</TableCell>
                    <TableCell sx={{ ...cell, width: 130 }} onClick={e => e.stopPropagation()}>
                      <Box display="flex" gap={0.25}>
                        <Tooltip title="View"><IconButton size="small" onClick={() => navigate(`/jobs/${j.id}`)}
                          sx={{ color: '#3B82F6', '&:hover': { bgcolor: '#EFF6FF' } }}>
                          <ViewIcon sx={{ fontSize: '1rem' }} /></IconButton></Tooltip>
                        <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(j)}
                          sx={{ color: '#F59E0B', '&:hover': { bgcolor: '#FFFBEB' } }}>
                          <EditIcon sx={{ fontSize: '1rem' }} /></IconButton></Tooltip>
                        <Tooltip title={j.status === 'OPEN' ? 'Move to Draft' : 'Publish'}>
                          <IconButton size="small" onClick={() => handleTogglePublish(j)}
                            sx={{ color: j.status === 'OPEN' ? '#94A3B8' : '#22C55E', '&:hover': { bgcolor: j.status === 'OPEN' ? '#F1F5F9' : '#F0FDF4' } }}>
                            {j.status === 'OPEN' ? <UnpublishIcon sx={{ fontSize: '1rem' }} /> : <PublishIcon sx={{ fontSize: '1rem' }} />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download"><IconButton size="small" onClick={() => handleDownload(j)}
                          sx={{ color: '#6366F1', '&:hover': { bgcolor: '#EEF2FF' } }}>
                          <DownloadIcon sx={{ fontSize: '1rem' }} /></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton size="small" onClick={() => setDelJob(j)}
                          sx={{ color: '#EF4444', '&:hover': { bgcolor: '#FFF1F2' } }}>
                          <DeleteIcon sx={{ fontSize: '1rem' }} /></IconButton></Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <Box display="flex" justifyContent="space-between" alignItems="center"
          sx={{ px: 2, py: 1.5, borderTop: '1px solid #E2E8F0', bgcolor: '#FAFAFA' }}>
          <Typography sx={{ fontSize: '0.78rem', color: '#64748B' }}>
            {totalEls === 0 ? 'No job postings' : `Showing ${(page-1)*rpp+1} to ${Math.min(page*rpp, totalEls)} of ${totalEls} job postings`}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Button size="small" variant="outlined" disabled={page <= 1}
              onClick={() => { const p = page - 1; setPage(p); load(p) }}
              sx={{ minWidth: 72, textTransform: 'none', fontSize: '0.78rem', borderColor: '#E2E8F0', color: '#475569' }}>
              Previous
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <Button key={p} size="small" variant={p === page ? 'contained' : 'outlined'}
                onClick={() => { setPage(p); load(p) }}
                sx={{ minWidth: 36, fontWeight: p === page ? 700 : 400, fontSize: '0.78rem',
                  bgcolor: p === page ? INDIGO : 'transparent', borderColor: '#E2E8F0',
                  color: p === page ? '#fff' : '#475569', '&:hover': { bgcolor: p === page ? '#4338CA' : '#F8FAFC' } }}>
                {p}
              </Button>
            ))}
            <Button size="small" variant="outlined" disabled={page >= totalPages}
              onClick={() => { const p = page + 1; setPage(p); load(p) }}
              sx={{ minWidth: 48, textTransform: 'none', fontSize: '0.78rem', borderColor: '#E2E8F0', color: '#475569' }}>
              Next
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* ── Add / Edit Dialog ───────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', borderBottom: '1px solid #E2E8F0', pb: 1.5 }}>
          {editing ? 'Edit Job Posting' : 'Add Job Posting'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField label="Job Title *" size="small" fullWidth value={f.title} onChange={e => set('title', e.target.value)} />
            <TextField label="Description *" size="small" fullWidth multiline rows={3} value={f.description} onChange={e => set('description', e.target.value)} />
            <Box display="flex" gap={2}>
              <TextField select label="Employment Type" size="small" fullWidth value={f.employmentType} onChange={e => set('employmentType', e.target.value)}>
                {EMPLOYMENT_TYPES.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
              <TextField select label="Work Mode" size="small" fullWidth value={f.workMode} onChange={e => set('workMode', e.target.value)}>
                {WORK_MODES.map(m => <MenuItem key={m} value={m}>{m.replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
            </Box>
            <TextField label="Location *" size="small" fullWidth value={f.location} onChange={e => set('location', e.target.value)} />
            <Box display="flex" gap={2}>
              <TextField label="Salary Min ($)" size="small" fullWidth type="number" value={f.salaryMin} onChange={e => set('salaryMin', e.target.value)} />
              <TextField label="Salary Max ($)" size="small" fullWidth type="number" value={f.salaryMax} onChange={e => set('salaryMax', e.target.value)} />
            </Box>
            <Box display="flex" gap={2}>
              <TextField label="Min Experience (yrs)" size="small" fullWidth type="number" value={f.minExperienceYears} onChange={e => set('minExperienceYears', e.target.value)} />
              <TextField label="Max Experience (yrs)" size="small" fullWidth type="number" value={f.maxExperienceYears} onChange={e => set('maxExperienceYears', e.target.value)} />
            </Box>
            {depts.length > 0 && (
              <TextField select label="Department" size="small" fullWidth value={f.departmentId} onChange={e => set('departmentId', e.target.value)}>
                {depts.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </TextField>
            )}
            <Box display="flex" gap={2}>
              <TextField label="Application Deadline" size="small" fullWidth type="date"
                value={f.deadline} onChange={e => set('deadline', e.target.value)}
                InputLabelProps={{ shrink: true }} />
              <TextField select label="Status" size="small" fullWidth value={f.status} onChange={e => set('status', e.target.value)}>
                <MenuItem value="DRAFT">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#F59E0B' }} />
                    Draft
                  </Box>
                </MenuItem>
                <MenuItem value="OPEN">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22C55E' }} />
                    Published
                  </Box>
                </MenuItem>
              </TextField>
            </Box>
            <FormControlLabel control={<Switch checked={f.featured} onChange={e => set('featured', e.target.checked)} size="small" />}
              label={<Typography sx={{ fontSize: '0.85rem' }}>Mark as Featured</Typography>} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, borderTop: '1px solid #E2E8F0', pt: 1.5 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !f.title.trim() || !f.location.trim()}
            sx={{ bgcolor: INDIGO, '&:hover': { bgcolor: '#4338CA' }, textTransform: 'none', fontWeight: 700, minWidth: 100 }}>
            {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : (editing ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm ──────────────────────────────────────────────── */}
      <Dialog open={!!delJob} onClose={() => setDelJob(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>Delete Job Posting</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.88rem', color: '#475569' }}>
            Are you sure you want to delete <strong>"{delJob?.title}"</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDelJob(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Toast ───────────────────────────────────────────────────────── */}
      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast?.sev ?? 'success'} onClose={() => setToast(null)} sx={{ fontWeight: 600 }}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default JobsPage
