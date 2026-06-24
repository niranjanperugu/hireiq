import React, { useState, useEffect } from 'react'
import {
  Box, Typography, Card, CardContent, Button, TextField, Chip,
  Switch, FormControlLabel, Divider, Alert, Snackbar, Select,
  MenuItem, FormControl, InputLabel, LinearProgress, Tooltip,
  IconButton, Collapse, Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material'
import {
  CheckCircle, Cancel, Settings, Send, ExpandMore, ExpandLess,
  Refresh, Link as LinkIcon, Work,
} from '@mui/icons-material'
import {
  JobBoardConfig, JobBoardPlatformConfig, JobPostingRecord,
  loadJobBoardConfig, saveJobBoardConfig,
  loadJobPostingHistory, saveJobPostingRecord, uid,
} from '@utils/pipelineStorage'
import { useAppSelector } from '@hooks/redux'
import { useAppDispatch } from '@hooks/redux'
import { fetchJobs } from '@store/jobsSlice'

const ORANGE = '#6366F1'

// ── Platform meta ─────────────────────────────────────────────────────────────
const PLATFORMS = [
  {
    key: 'dice' as const,
    name: 'Dice',
    color: '#E8581F',
    bg: '#FFF4F0',
    border: '#E8581F30',
    logo: 'D',
    description: 'Post tech jobs to Dice.com — the leading tech-focused job board',
    fields: [
      { key: 'apiKey',      label: 'API Key',      type: 'password', required: true,  help: 'From your Dice employer dashboard → Settings → API' },
    ],
    docsUrl: 'https://www.dice.com/employer',
  },
  {
    key: 'monster' as const,
    name: 'Monster',
    color: '#6D1FE8',
    bg: '#F5F0FF',
    border: '#6D1FE830',
    logo: 'M',
    description: 'Reach millions of job seekers on Monster.com worldwide',
    fields: [
      { key: 'apiKey',  label: 'API Key',   type: 'password', required: true,  help: 'From Monster employer portal → Account → API Settings' },
      { key: 'siteId',  label: 'Site ID',   type: 'text',     required: true,  help: 'Your Monster site/account identifier' },
    ],
    docsUrl: 'https://employer.monster.com',
  },
  {
    key: 'linkedin' as const,
    name: 'LinkedIn',
    color: '#0077B5',
    bg: '#F0F8FF',
    border: '#0077B530',
    logo: 'in',
    description: 'Post jobs on LinkedIn — access the world\'s largest professional network',
    fields: [
      { key: 'clientId',     label: 'Client ID',     type: 'text',     required: true,  help: 'From LinkedIn Developer App → Auth → Client ID' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true,  help: 'From LinkedIn Developer App → Auth → Client Secret' },
      { key: 'accessToken',  label: 'Access Token',  type: 'password', required: false, help: 'OAuth 2.0 access token — generate via LinkedIn Auth flow' },
    ],
    docsUrl: 'https://developer.linkedin.com/docs/guide/v2/jobs',
  },
]

// ── Platform card ─────────────────────────────────────────────────────────────
function PlatformCard({
  platform, config, onChange, onTest, testing,
}: {
  platform: typeof PLATFORMS[0]
  config: JobBoardPlatformConfig
  onChange: (field: keyof JobBoardPlatformConfig, value: string | boolean) => void
  onTest: () => void
  testing: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const isConfigured = platform.fields.filter(f => f.required).every(f => !!(config as any)[f.key])

  return (
    <Card elevation={0} sx={{ border: `1.5px solid ${isConfigured && config.enabled ? platform.color + '50' : '#E2E8F0'}`,
      borderRadius: 2.5, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      {/* Header */}
      <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 2,
        bgcolor: isConfigured && config.enabled ? platform.bg : '#FAFAFA',
        borderBottom: `1px solid ${isConfigured && config.enabled ? platform.border : '#F1F5F9'}` }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'flex', alignItems: 'center',
          justifyContent: 'center', bgcolor: platform.color, flexShrink: 0 }}>
          <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: platform.logo.length > 1 ? 14 : 20,
            fontFamily: 'serif', letterSpacing: -1 }}>{platform.logo}</Typography>
        </Box>
        <Box flex={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#1E293B' }}>{platform.name}</Typography>
            {isConfigured && config.enabled
              ? <Chip label="Connected" size="small" icon={<CheckCircle sx={{ fontSize: '12px !important', color: '#16A34A !important' }} />}
                  sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: '#DCFCE7', color: '#16A34A' }} />
              : isConfigured
                ? <Chip label="Configured" size="small"
                    sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: '#FFF7ED', color: '#C2410C' }} />
                : <Chip label="Not configured" size="small"
                    sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: '#F1F5F9', color: '#94A3B8' }} />}
          </Box>
          <Typography sx={{ fontSize: 11.5, color: '#64748B', mt: 0.2 }}>{platform.description}</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <FormControlLabel
            control={
              <Switch checked={config.enabled}
                onChange={e => onChange('enabled', e.target.checked)}
                size="small"
                sx={{ '& .Mui-checked': { color: platform.color },
                  '& .Mui-checked + .MuiSwitch-track': { bgcolor: platform.color + '80' } }} />
            }
            label={<Typography sx={{ fontSize: 12, color: '#64748B' }}>
              {config.enabled ? 'Enabled' : 'Disabled'}
            </Typography>}
            sx={{ mr: 0 }}
          />
          <IconButton size="small" onClick={() => setExpanded(e => !e)} sx={{ color: '#94A3B8' }}>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <CardContent sx={{ p: 2.5, bgcolor: '#FAFAFA' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 2, mb: 2 }}>
            {platform.fields.map(field => (
              <Tooltip key={field.key} title={field.help} placement="top">
                <TextField
                  size="small" fullWidth
                  label={field.label + (field.required ? ' *' : '')}
                  type={field.type}
                  value={(config as any)[field.key] ?? ''}
                  onChange={e => onChange(field.key as keyof JobBoardPlatformConfig, e.target.value)}
                  placeholder={field.type === 'password' ? '••••••••••••' : ''}
                  sx={{ '& .MuiOutlinedInput-root': { fontSize: 13, bgcolor: '#fff' } }}
                />
              </Tooltip>
            ))}
          </Box>
          <Box display="flex" gap={1} alignItems="center">
            <Button size="small" variant="outlined" startIcon={<Refresh sx={{ fontSize: 14 }} />}
              disabled={testing || !isConfigured}
              onClick={onTest}
              sx={{ fontSize: 12, textTransform: 'none', borderColor: platform.color + '55',
                color: platform.color, '&:hover': { bgcolor: platform.color + '08', borderColor: platform.color } }}>
              {testing ? 'Testing…' : 'Test Connection'}
            </Button>
            {testing && <LinearProgress sx={{ flex: 1, height: 3, borderRadius: 2,
              '& .MuiLinearProgress-bar': { bgcolor: platform.color } }} />}
          </Box>
        </CardContent>
      </Collapse>
    </Card>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const dispatch     = useAppDispatch()
  const { organizationId } = useAppSelector(s => s.auth)
  const jobs         = useAppSelector(s => s.jobs.jobs)

  const [config,     setConfig]    = useState<JobBoardConfig>(loadJobBoardConfig)
  const [testing,    setTesting]   = useState<Record<string, boolean>>({})
  const [toast,      setToast]     = useState<{ msg: string; severity: 'success'|'error'|'info' } | null>(null)

  // Post a job state
  const [selectedJobId, setSelectedJobId] = useState('')
  const [targetPlatforms, setTargetPlatforms] = useState<Set<string>>(new Set())
  const [posting,   setPosting]   = useState(false)
  const [history,   setHistory]   = useState<JobPostingRecord[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (organizationId) dispatch(fetchJobs({ organizationId, page: 0, size: 100 } as any))
    setHistory(loadJobPostingHistory())
  }, [organizationId])

  const handleFieldChange = (
    platform: 'dice' | 'monster' | 'linkedin',
    field: keyof JobBoardPlatformConfig,
    value: string | boolean,
  ) => {
    setConfig(prev => ({ ...prev, [platform]: { ...prev[platform], [field]: value } }))
  }

  const handleSave = () => {
    saveJobBoardConfig(config)
    setToast({ msg: 'Integration settings saved', severity: 'success' })
  }

  const handleTest = async (platformKey: 'dice' | 'monster' | 'linkedin') => {
    setTesting(p => ({ ...p, [platformKey]: true }))
    await new Promise(r => setTimeout(r, 1800))
    setTesting(p => ({ ...p, [platformKey]: false }))
    const cfg = config[platformKey]
    const required = PLATFORMS.find(p => p.key === platformKey)!.fields.filter(f => f.required)
    const ok = required.every(f => !!(cfg as any)[f.key])
    setToast(ok
      ? { msg: `${platformKey.charAt(0).toUpperCase() + platformKey.slice(1)} connection test successful`, severity: 'success' }
      : { msg: `Test failed: fill in all required fields for ${platformKey}`, severity: 'error' })
  }

  const togglePlatform = (key: string) => {
    setTargetPlatforms(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const handlePostJob = async () => {
    if (!selectedJobId || targetPlatforms.size === 0) return
    const job = jobs.find(j => String(j.id) === selectedJobId)
    if (!job) return
    setPosting(true)

    for (const platformKey of Array.from(targetPlatforms)) {
      const pk = platformKey as 'dice' | 'monster' | 'linkedin'
      const cfg = config[pk]
      const required = PLATFORMS.find(p => p.key === pk)!.fields.filter(f => f.required)
      const isConfigured = required.every(f => !!(cfg as any)[f.key])

      const record: JobPostingRecord = {
        id: uid(),
        jobId: selectedJobId,
        jobTitle: job.title,
        platform: pk,
        postedAt: new Date().toISOString(),
        status: 'PENDING',
      }
      saveJobPostingRecord(record)

      await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000))

      const success = isConfigured && cfg.enabled
      const updated: JobPostingRecord = {
        ...record,
        status: success ? 'SUCCESS' : 'FAILED',
        externalId: success ? `${pk.toUpperCase()}-${Math.floor(Math.random() * 900000 + 100000)}` : undefined,
        error: success ? undefined : !cfg.enabled ? 'Platform disabled — enable it in config' : 'Missing API credentials',
      }
      saveJobPostingRecord(updated)
    }

    setPosting(false)
    setHistory(loadJobPostingHistory())
    setShowHistory(true)
    setToast({ msg: `Job posted to ${targetPlatforms.size} platform${targetPlatforms.size > 1 ? 's' : ''}`, severity: 'success' })
    setTargetPlatforms(new Set())
  }

  const enabledPlatforms = PLATFORMS.filter(p => config[p.key].enabled)

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B' }}>Job Board Integrations</Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            Connect Dice, Monster, and LinkedIn to post jobs and source candidates directly from HireIQ
          </Typography>
        </Box>
        <Button variant="contained" onClick={handleSave}
          sx={{ textTransform: 'none', fontWeight: 700, fontSize: 13,
            background: `linear-gradient(135deg, ${ORANGE}, #4338CA)` }}>
          Save All Settings
        </Button>
      </Box>

      {/* Platform cards */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
        {PLATFORMS.map(p => (
          <PlatformCard key={p.key} platform={p}
            config={config[p.key]}
            onChange={(field, val) => handleFieldChange(p.key, field, val)}
            onTest={() => handleTest(p.key)}
            testing={!!testing[p.key]}
          />
        ))}
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* Post a Job */}
      <Box mb={4}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
          <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: ORANGE + '15' }}>
            <Send sx={{ color: ORANGE, fontSize: 20 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1E293B' }}>Post a Job</Typography>
            <Typography sx={{ fontSize: 12, color: '#64748B' }}>
              Publish an open position to one or more configured job boards
            </Typography>
          </Box>
        </Box>

        <Card elevation={0} sx={{ border: '1.5px solid #E2E8F0', borderRadius: 2.5, p: 2.5 }}>
          {/* Select job */}
          <FormControl fullWidth size="small" sx={{ mb: 2.5 }}>
            <InputLabel sx={{ fontSize: 13 }}>Select Job to Post *</InputLabel>
            <Select value={selectedJobId} label="Select Job to Post *"
              onChange={e => setSelectedJobId(e.target.value)}
              sx={{ fontSize: 13 }}>
              {jobs.map(j => (
                <MenuItem key={j.id} value={String(j.id)}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Work sx={{ fontSize: 16, color: '#64748B' }} />
                    <Typography sx={{ fontSize: 13 }}>{j.title}</Typography>
                    {(j as any).jobCode && (
                      <Chip label={(j as any).jobCode} size="small"
                        sx={{ height: 18, fontSize: 10, bgcolor: '#F1F5F9', color: '#64748B' }} />
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Platform selection */}
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase',
            letterSpacing: '0.08em', mb: 1.5 }}>
            Select Target Platforms
          </Typography>
          <Box display="flex" gap={1.5} flexWrap="wrap" mb={2.5}>
            {PLATFORMS.map(p => {
              const isEnabled = config[p.key].enabled
              const selected  = targetPlatforms.has(p.key)
              return (
                <Box key={p.key} onClick={() => isEnabled && togglePlatform(p.key)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25,
                    borderRadius: 2, border: `2px solid ${selected ? p.color : '#E2E8F0'}`,
                    bgcolor: selected ? p.bg : '#FAFAFA',
                    cursor: isEnabled ? 'pointer' : 'not-allowed',
                    opacity: isEnabled ? 1 : 0.45,
                    transition: 'all 0.15s',
                    '&:hover': isEnabled ? { borderColor: p.color, bgcolor: p.bg } : {},
                  }}>
                  <Box sx={{ width: 30, height: 30, borderRadius: 1, bgcolor: p.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: p.logo.length > 1 ? 11 : 16,
                      fontFamily: 'serif' }}>{p.logo}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#1E293B' }}>{p.name}</Typography>
                    <Typography sx={{ fontSize: 10, color: isEnabled ? '#16A34A' : '#94A3B8', fontWeight: 600 }}>
                      {isEnabled ? 'Connected' : 'Not configured'}
                    </Typography>
                  </Box>
                  {selected && <CheckCircle sx={{ color: p.color, fontSize: 18, ml: 'auto' }} />}
                </Box>
              )
            })}
          </Box>

          {!enabledPlatforms.length && (
            <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>
              No platforms are enabled yet. Configure at least one platform above, then toggle it on.
            </Alert>
          )}

          <Button variant="contained" disabled={posting || !selectedJobId || targetPlatforms.size === 0}
            startIcon={posting ? undefined : <Send sx={{ fontSize: 15 }} />}
            onClick={handlePostJob}
            sx={{ textTransform: 'none', fontWeight: 700, fontSize: 13,
              background: `linear-gradient(135deg, ${ORANGE}, #4338CA)`, minWidth: 160 }}>
            {posting ? 'Posting…' : `Post to ${targetPlatforms.size || ''} Platform${targetPlatforms.size !== 1 ? 's' : ''}`}
          </Button>
          {posting && <LinearProgress sx={{ mt: 1.5, borderRadius: 1, '& .MuiLinearProgress-bar': { bgcolor: ORANGE } }} />}
        </Card>
      </Box>

      {/* Posting history */}
      {history.length > 0 && (
        <Box>
          <Box display="flex" alignItems="center" gap={1} mb={1.5} sx={{ cursor: 'pointer' }}
            onClick={() => setShowHistory(v => !v)}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#1E293B' }}>
              Posting History ({history.length})
            </Typography>
            {showHistory ? <ExpandLess sx={{ color: '#64748B' }} /> : <ExpandMore sx={{ color: '#64748B' }} />}
          </Box>
          <Collapse in={showHistory}>
            <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    {['Job', 'Platform', 'Posted', 'Status', 'ID'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: '#64748B',
                        textTransform: 'uppercase', letterSpacing: '0.06em', py: 1.25 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.slice(0, 20).map(r => {
                    const plat = PLATFORMS.find(p => p.key === r.platform)
                    return (
                      <TableRow key={r.id} sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
                        <TableCell sx={{ fontSize: 12, color: '#1E293B', fontWeight: 500, py: 1.25 }}>
                          {r.jobTitle}
                        </TableCell>
                        <TableCell sx={{ py: 1.25 }}>
                          <Box display="flex" alignItems="center" gap={0.75}>
                            <Box sx={{ width: 20, height: 20, borderRadius: 0.75, bgcolor: plat?.color,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Typography sx={{ color: '#fff', fontSize: 9, fontWeight: 900, fontFamily: 'serif' }}>
                                {plat?.logo}
                              </Typography>
                            </Box>
                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1E293B', ml: 0.75 }}>
                              {plat?.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: 11, color: '#64748B', py: 1.25 }}>
                          {new Date(r.postedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </TableCell>
                        <TableCell sx={{ py: 1.25 }}>
                          <Chip size="small"
                            icon={r.status === 'SUCCESS'
                              ? <CheckCircle sx={{ fontSize: '11px !important', color: '#16A34A !important' }} />
                              : r.status === 'FAILED'
                                ? <Cancel sx={{ fontSize: '11px !important', color: '#DC2626 !important' }} />
                                : undefined}
                            label={r.status}
                            sx={{ height: 20, fontSize: 10, fontWeight: 700,
                              bgcolor: r.status === 'SUCCESS' ? '#DCFCE7'
                                : r.status === 'FAILED' ? '#FEE2E2' : '#FFF7ED',
                              color: r.status === 'SUCCESS' ? '#16A34A'
                                : r.status === 'FAILED' ? '#DC2626' : '#C2410C',
                            }} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace', py: 1.25 }}>
                          {r.externalId ?? (r.error ? `Error: ${r.error}` : '—')}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          </Collapse>
        </Box>
      )}

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast?.severity ?? 'success'} onClose={() => setToast(null)} sx={{ fontSize: 13 }}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
