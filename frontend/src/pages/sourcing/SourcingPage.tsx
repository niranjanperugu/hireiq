import React, { useState, useEffect } from 'react'
import {
  Box, Typography, Paper, TextField, Button, Chip, Grid,
  Card, CardContent, CardActions, Skeleton, Alert, Switch,
  FormControlLabel, Dialog, DialogTitle, DialogContent,
  DialogActions, Snackbar, Tooltip, Divider, ToggleButtonGroup,
  ToggleButton, Avatar, LinearProgress,
} from '@mui/material'
import {
  PersonSearch, WorkOutlined, LocationOnOutlined,
  OpenInNew, PersonAdd, CalendarToday, Search as SearchIcon,
  TuneOutlined, CheckCircle,
} from '@mui/icons-material'
import {
  uid, loadPipeline, savePipeline, DEFAULT_STAGES,
  loadJobBoardConfig, JobBoardConfig,
} from '@utils/pipelineStorage'
import { useAppSelector } from '@hooks/redux'
import { useNavigate } from 'react-router-dom'

const ORANGE = '#6366F1'

// ── Platform meta ─────────────────────────────────────────────────────────────
const PLATFORMS = [
  { key: 'dice',     name: 'Dice',     color: '#E8581F', logo: 'D', bg: '#FFF4F0' },
  { key: 'monster',  name: 'Monster',  color: '#6D1FE8', logo: 'M', bg: '#F5F0FF' },
  { key: 'linkedin', name: 'LinkedIn', color: '#0077B5', logo: 'in', bg: '#F0F8FF' },
] as const

type PlatformKey = 'dice' | 'monster' | 'linkedin'

// ── Mock candidate profiles per platform ──────────────────────────────────────
function generateMockResults(
  jobTitle: string, location: string, platform: PlatformKey, count = 6,
) {
  const pools: Record<PlatformKey, Array<{ name: string; role: string; skills: string[]; exp: string; company: string }>> = {
    dice: [
      { name: 'Arjun Mehta',      role: 'Senior Software Engineer', skills: ['Java','Spring Boot','AWS','Microservices'], exp: '7 yrs', company: 'Infosys' },
      { name: 'Priya Sharma',     role: 'Full Stack Developer',      skills: ['React','Node.js','TypeScript','MongoDB'],   exp: '5 yrs', company: 'TCS' },
      { name: 'Kiran Reddy',      role: 'DevOps Engineer',           skills: ['Kubernetes','Docker','CI/CD','Terraform'],  exp: '6 yrs', company: 'Wipro' },
      { name: 'Sneha Patel',      role: 'Data Engineer',             skills: ['Python','Spark','Airflow','Snowflake'],     exp: '4 yrs', company: 'HCL' },
      { name: 'Rohan Gupta',      role: 'Backend Developer',         skills: ['Go','PostgreSQL','Redis','gRPC'],           exp: '5 yrs', company: 'Zensar' },
      { name: 'Anita Verma',      role: 'Cloud Architect',           skills: ['AWS','Azure','Terraform','CloudFormation'], exp: '9 yrs', company: 'Cognizant' },
    ],
    monster: [
      { name: 'James Wilson',     role: 'Product Manager',           skills: ['Agile','Jira','Roadmapping','Analytics'],   exp: '8 yrs', company: 'Oracle' },
      { name: 'Sarah Johnson',    role: 'UX Designer',               skills: ['Figma','User Research','Prototyping','CSS'], exp: '5 yrs', company: 'Adobe' },
      { name: 'Michael Brown',    role: 'QA Engineer',               skills: ['Selenium','Cypress','Jest','TestNG'],        exp: '6 yrs', company: 'IBM' },
      { name: 'Emily Davis',      role: 'Business Analyst',          skills: ['SQL','Tableau','Excel','BPMN'],              exp: '4 yrs', company: 'Capgemini' },
      { name: 'Chris Martinez',   role: 'Mobile Developer',          skills: ['Flutter','Dart','iOS','Android'],            exp: '5 yrs', company: 'Accenture' },
      { name: 'Jessica Lee',      role: 'Security Engineer',         skills: ['SIEM','Pen Testing','SOC','OWASP'],          exp: '7 yrs', company: 'Deloitte' },
    ],
    linkedin: [
      { name: 'Rahul Kapoor',     role: 'Engineering Manager',       skills: ['Leadership','Java','System Design','OKRs'], exp: '12 yrs', company: 'Google' },
      { name: 'Divya Nair',       role: 'ML Engineer',               skills: ['Python','TensorFlow','PyTorch','NLP'],       exp: '6 yrs', company: 'Amazon' },
      { name: 'Vikram Singh',     role: 'Solutions Architect',       skills: ['AWS','Kafka','System Design','Java'],        exp: '10 yrs', company: 'Microsoft' },
      { name: 'Pooja Iyer',       role: 'Frontend Engineer',         skills: ['React','Next.js','GraphQL','Tailwind'],      exp: '5 yrs', company: 'Stripe' },
      { name: 'Arun Kumar',       role: 'SRE',                       skills: ['SLO/SLA','Prometheus','Grafana','Python'],   exp: '8 yrs', company: 'Netflix' },
      { name: 'Meera Krishnan',   role: 'Data Scientist',            skills: ['R','Python','Spark','Statistics'],           exp: '7 yrs', company: 'Uber' },
    ],
  }
  return pools[platform].slice(0, count).map((p, i) => ({
    ...p,
    id: `${platform}_${i}_${uid()}`,
    platform,
    location: location || ['Bangalore', 'Hyderabad', 'Mumbai', 'Delhi', 'Pune', 'Chennai'][i % 6],
    availability: ['Immediately', '2 weeks', '1 month', '30 days'][i % 4],
    matchScore: Math.floor(68 + Math.random() * 30),
    appliedAt: new Date(Date.now() - i * 86400000 * 3).toISOString(),
    profileUrl: '#',
  }))
}

interface CandidateResult {
  id: string
  name: string
  role: string
  skills: string[]
  exp: string
  company: string
  platform: PlatformKey
  location: string
  availability: string
  matchScore: number
  appliedAt: string
  profileUrl: string
}

export default function SourcingPage() {
  const navigate   = useNavigate()
  const jobs       = useAppSelector(s => s.jobs.jobs)

  const [jbConfig,      setJbConfig]      = useState<JobBoardConfig>(loadJobBoardConfig)
  const [jobTitle,      setJobTitle]      = useState('')
  const [location,      setLocation]      = useState('')
  const [activePlatforms, setActivePlatforms] = useState<PlatformKey[]>(['dice', 'monster', 'linkedin'])
  const [loading,       setLoading]       = useState(false)
  const [results,       setResults]       = useState<CandidateResult[]>([])
  const [searched,      setSearched]      = useState(false)

  const [importOpen,    setImportOpen]    = useState(false)
  const [selected,      setSelected]      = useState<CandidateResult | null>(null)
  const [targetJobId,   setTargetJobId]   = useState('')
  const [toast,         setToast]         = useState<string | null>(null)

  useEffect(() => { setJbConfig(loadJobBoardConfig()) }, [])

  const enabledCount = PLATFORMS.filter(p => jbConfig[p.key].enabled).length

  const handleSearch = async () => {
    if (!jobTitle.trim()) return
    setLoading(true)
    setResults([])
    setSearched(false)

    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800))

    const all: CandidateResult[] = []
    for (const pk of activePlatforms) {
      if (jbConfig[pk].enabled) {
        all.push(...generateMockResults(jobTitle, location, pk, 6))
      }
    }
    // Sort by match score desc
    all.sort((a, b) => b.matchScore - a.matchScore)
    setResults(all)
    setSearched(true)
    setLoading(false)
  }

  const openImport = (c: CandidateResult) => {
    setSelected(c)
    setTargetJobId(jobs[0] ? String(jobs[0].id) : '')
    setImportOpen(true)
  }

  const handleImport = () => {
    if (!targetJobId || !selected) return
    const targetJob = jobs.find(j => String(j.id) === targetJobId)
    const pipeline  = loadPipeline(targetJobId)
    const stages    = pipeline.stages.length > 0 ? pipeline.stages : DEFAULT_STAGES
    const candidateId = `sourced_${uid()}`
    pipeline.candidates.push({
      id: candidateId, name: selected.name, role: selected.role,
      email: `${selected.name.toLowerCase().replace(/\s/g,'.')}@example.com`,
      phone: '', atsScore: selected.matchScore, experience: 0,
      education: '', matchedSkills: selected.skills.slice(0, 5),
      addedAt: new Date().toISOString(), source: 'manual',
    })
    pipeline.stageMap[candidateId] = stages[0]?.id ?? 'shortlisted'
    savePipeline(targetJobId, pipeline)
    setToast(`${selected.name} added to pipeline for "${targetJob?.title}"`)
    setImportOpen(false)
  }

  const platformBadge = (pk: PlatformKey) => {
    const p = PLATFORMS.find(x => x.key === pk)!
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5,
        px: 0.75, py: 0.25, borderRadius: 1, bgcolor: p.bg }}>
        <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: p.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontSize: 7, fontWeight: 900, color: '#fff', fontFamily: 'serif',
            lineHeight: 1 }}>{p.logo}</Typography>
        </Box>
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: p.color }}>{p.name}</Typography>
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: ORANGE + '15' }}>
            <PersonSearch sx={{ color: ORANGE, fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} color="#1E293B">Source Candidates</Typography>
            <Typography variant="body2" color="text.secondary">
              Search across Dice, Monster & LinkedIn for candidates matching your open positions
            </Typography>
          </Box>
        </Box>
        {enabledCount === 0 && (
          <Button variant="outlined" size="small" startIcon={<TuneOutlined />}
            onClick={() => navigate('/integrations')}
            sx={{ fontSize: 12, textTransform: 'none', borderColor: ORANGE + '55', color: ORANGE }}>
            Configure Integrations
          </Button>
        )}
      </Box>

      {/* No platforms warning */}
      {enabledCount === 0 && (
        <Alert severity="warning" sx={{ mb: 2.5, fontSize: 12 }}>
          No job board integrations are configured. Go to{' '}
          <Box component="span" sx={{ fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => navigate('/integrations')}>
            Integrations
          </Box>{' '}
          to connect Dice, Monster, or LinkedIn first.
        </Alert>
      )}

      {/* Platform toggles */}
      <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E2E8F0', borderRadius: 2.5, mb: 2.5 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase',
          letterSpacing: '0.08em', mb: 1.5 }}>Search Platforms</Typography>
        <Box display="flex" gap={1.25} flexWrap="wrap" mb={2.5}>
          {PLATFORMS.map(p => {
            const enabled   = jbConfig[p.key].enabled
            const active    = activePlatforms.includes(p.key)
            return (
              <Box key={p.key} onClick={() => {
                if (!enabled) return
                setActivePlatforms(prev =>
                  prev.includes(p.key) ? prev.filter(x => x !== p.key) : [...prev, p.key])
              }} sx={{
                display: 'flex', alignItems: 'center', gap: 1.25, px: 1.75, py: 1,
                borderRadius: 2, border: `2px solid ${active && enabled ? p.color : '#E2E8F0'}`,
                bgcolor: active && enabled ? p.bg : '#FAFAFA',
                cursor: enabled ? 'pointer' : 'not-allowed',
                opacity: enabled ? 1 : 0.4,
                transition: 'all 0.15s',
              }}>
                <Box sx={{ width: 26, height: 26, borderRadius: 1, bgcolor: p.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: p.logo.length > 1 ? 10 : 15,
                    fontFamily: 'serif', lineHeight: 1 }}>{p.logo}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#1E293B', lineHeight: 1.2 }}>
                    {p.name}
                  </Typography>
                  <Typography sx={{ fontSize: 10, fontWeight: 600,
                    color: enabled ? (active ? p.color : '#94A3B8') : '#CBD5E1' }}>
                    {enabled ? (active ? 'Selected' : 'Click to add') : 'Not configured'}
                  </Typography>
                </Box>
                {active && enabled && <CheckCircle sx={{ color: p.color, fontSize: 16 }} />}
              </Box>
            )
          })}
        </Box>

        {/* Search fields */}
        <Box display="flex" gap={2} alignItems="flex-end" flexWrap="wrap">
          <TextField size="small" sx={{ flex: '1 1 220px', '& .MuiOutlinedInput-root': { fontSize: 13 } }}
            label="Job Title / Skills" value={jobTitle}
            onChange={e => setJobTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. React Developer, Java Engineer"
            InputProps={{ startAdornment: <WorkOutlined sx={{ mr: 1, color: '#94A3B8', fontSize: 18 }} /> }}
          />
          <TextField size="small" sx={{ flex: '1 1 180px', '& .MuiOutlinedInput-root': { fontSize: 13 } }}
            label="Location (optional)" value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="e.g. Bangalore, Remote"
            InputProps={{ startAdornment: <LocationOnOutlined sx={{ mr: 1, color: '#94A3B8', fontSize: 18 }} /> }}
          />
          <Button variant="contained" disabled={loading || !jobTitle.trim() || activePlatforms.length === 0}
            onClick={handleSearch} startIcon={<SearchIcon />}
            sx={{ textTransform: 'none', fontWeight: 700, fontSize: 13, minWidth: 140,
              background: `linear-gradient(135deg, ${ORANGE}, #4338CA)` }}>
            {loading ? 'Searching…' : 'Search'}
          </Button>
        </Box>
        {loading && <LinearProgress sx={{ mt: 1.5, borderRadius: 1, '& .MuiLinearProgress-bar': { bgcolor: ORANGE } }} />}
      </Paper>

      {/* Skeleton */}
      {loading && (
        <Grid container spacing={2}>
          {[1,2,3,4,5,6].map(i => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Results */}
      {!loading && searched && results.length > 0 && (
        <>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography sx={{ fontSize: 13, color: '#64748B' }}>
              Found <Box component="strong" sx={{ color: '#1E293B' }}>{results.length}</Box> candidates
              for <Box component="strong" sx={{ color: '#1E293B' }}>"{jobTitle}"</Box>
            </Typography>
            <Box display="flex" gap={1}>
              {activePlatforms.filter(pk => jbConfig[pk].enabled).map(pk => {
                const cnt = results.filter(r => r.platform === pk).length
                const p = PLATFORMS.find(x => x.key === pk)!
                return (
                  <Chip key={pk} size="small" label={`${p.name}: ${cnt}`}
                    sx={{ height: 22, fontSize: 11, fontWeight: 600, bgcolor: p.bg, color: p.color }} />
                )
              })}
            </Box>
          </Box>

          <Grid container spacing={2}>
            {results.map(c => {
              const p = PLATFORMS.find(x => x.key === c.platform)!
              return (
                <Grid item xs={12} sm={6} md={4} key={c.id}>
                  <Card elevation={0} sx={{ border: `1.5px solid ${p.color}25`,
                    borderTop: `3px solid ${p.color}`, borderRadius: 2,
                    height: '100%', display: 'flex', flexDirection: 'column',
                    '&:hover': { borderColor: p.color + '60', boxShadow: `0 4px 16px ${p.color}15` },
                    transition: 'all 0.15s' }}>
                    <CardContent sx={{ flex: 1, p: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.25}>
                        <Box display="flex" gap={1.25} alignItems="center">
                          <Avatar sx={{ width: 38, height: 38, fontSize: 13, fontWeight: 700,
                            bgcolor: p.color + '20', color: p.color }}>
                            {c.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#1E293B', lineHeight: 1.2 }}>
                              {c.name}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: '#64748B' }}>{c.company}</Typography>
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography sx={{ fontSize: 14, fontWeight: 800, color: p.color }}>{c.matchScore}%</Typography>
                          <Typography sx={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>MATCH</Typography>
                        </Box>
                      </Box>

                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#374151', mb: 0.75 }}>{c.role}</Typography>

                      <Box display="flex" gap={1.5} mb={1.25} flexWrap="wrap">
                        <Box display="flex" alignItems="center" gap={0.4}>
                          <LocationOnOutlined sx={{ fontSize: 12, color: '#94A3B8' }} />
                          <Typography sx={{ fontSize: 11, color: '#64748B' }}>{c.location}</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={0.4}>
                          <CalendarToday sx={{ fontSize: 11, color: '#94A3B8' }} />
                          <Typography sx={{ fontSize: 11, color: '#64748B' }}>{c.exp} exp</Typography>
                        </Box>
                        <Chip label={`Available: ${c.availability}`} size="small"
                          sx={{ height: 18, fontSize: 10, bgcolor: '#DCFCE7', color: '#16A34A' }} />
                      </Box>

                      <Box display="flex" flexWrap="wrap" gap={0.5} mb={1.25}>
                        {c.skills.slice(0, 5).map(s => (
                          <Chip key={s} label={s} size="small"
                            sx={{ height: 20, fontSize: 10, bgcolor: '#F1F5F9', color: '#475569' }} />
                        ))}
                      </Box>

                      {platformBadge(c.platform)}
                    </CardContent>

                    <Divider />
                    <CardActions sx={{ px: 2, py: 1, gap: 1 }}>
                      <Button size="small" component="a" href={c.profileUrl} target="_blank"
                        startIcon={<OpenInNew sx={{ fontSize: 13 }} />}
                        sx={{ fontSize: 11, textTransform: 'none', color: '#64748B' }}>
                        View Profile
                      </Button>
                      <Button size="small" variant="outlined"
                        startIcon={<PersonAdd sx={{ fontSize: 13 }} />}
                        onClick={() => openImport(c)}
                        sx={{ fontSize: 11, textTransform: 'none', fontWeight: 600, ml: 'auto',
                          borderColor: p.color + '55', color: p.color,
                          '&:hover': { borderColor: p.color, bgcolor: p.bg } }}>
                        Add to Pipeline
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </>
      )}

      {!loading && searched && results.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <PersonSearch sx={{ fontSize: 64, color: '#CBD5E1', mb: 2 }} />
          <Typography color="text.secondary">
            No candidates found. Make sure at least one platform is enabled and try different keywords.
          </Typography>
          <Button sx={{ mt: 2, textTransform: 'none', color: ORANGE }}
            onClick={() => navigate('/integrations')}>
            Configure Integrations →
          </Button>
        </Box>
      )}

      {/* Import Dialog */}
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 2.5 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 15, pb: 1 }}>Add Candidate to Pipeline</DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          {selected && (
            <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: PLATFORMS.find(p => p.key === selected.platform)!.bg,
              mb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 36, height: 36, fontSize: 12, fontWeight: 700,
                bgcolor: PLATFORMS.find(p => p.key === selected.platform)!.color + '20',
                color: PLATFORMS.find(p => p.key === selected.platform)!.color }}>
                {selected.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#1E293B' }}>{selected.name}</Typography>
                <Typography sx={{ fontSize: 11, color: '#64748B' }}>{selected.role} · {selected.company}</Typography>
                <Box mt={0.5}>{platformBadge(selected.platform)}</Box>
              </Box>
            </Box>
          )}
          <TextField select fullWidth size="small" label="Add to Job Pipeline *"
            value={targetJobId} onChange={e => setTargetJobId(e.target.value)}
            SelectProps={{ native: true }}
            sx={{ '& .MuiOutlinedInput-root': { fontSize: 13 } }}>
            <option value="">Select a job…</option>
            {jobs.map(j => <option key={j.id} value={String(j.id)}>{j.title}</option>)}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setImportOpen(false)} sx={{ textTransform: 'none', color: '#64748B' }}>
            Cancel
          </Button>
          <Button variant="contained" disabled={!targetJobId}
            onClick={handleImport}
            sx={{ textTransform: 'none', fontWeight: 700, fontSize: 13,
              background: `linear-gradient(135deg, ${ORANGE}, #4338CA)` }}>
            Add to Pipeline
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="success" onClose={() => setToast(null)} sx={{ fontSize: 13 }}>{toast}</Alert>
      </Snackbar>
    </Box>
  )
}
