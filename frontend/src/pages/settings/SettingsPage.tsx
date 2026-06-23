import React, { useState } from 'react'
import {
  Box, Typography, Paper, Slider, Switch, FormControlLabel,
  Button, Chip, Divider, Snackbar, Alert, Stack
} from '@mui/material'
import {
  SettingsOutlined, EmailOutlined, TuneOutlined, AutoAwesomeOutlined
} from '@mui/icons-material'
import { loadSettings, saveSettings, HsSettings, DEFAULT_SETTINGS } from '@utils/pipelineStorage'

const ORANGE = '#6366F1'
const NAVY   = '#0B0F1A'

function ScoreChip({ label, color }: { label: string; color: string }) {
  return (
    <Chip label={label} size="small"
      sx={{ bgcolor: color + '18', color, border: `1px solid ${color}40`, fontWeight: 600, fontSize: 12 }} />
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<HsSettings>(loadSettings)
  const [saved,    setSaved]    = useState(false)

  const update = (patch: Partial<HsSettings>) =>
    setSettings(prev => ({ ...prev, ...patch }))

  const handleSave = () => {
    saveSettings(settings)
    setSaved(true)
  }

  const handleReset = () => {
    setSettings({ ...DEFAULT_SETTINGS })
  }

  const threshold = settings.atsThreshold
  const excellentColor = threshold <= 80 ? '#22C55E' : '#22C55E'
  const goodColor      = '#F59E0B'
  const fairColor      = '#EF4444'

  return (
    <Box sx={{ p: 3, maxWidth: 760, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box sx={{ p: 1, borderRadius: 2, bgcolor: ORANGE + '15' }}>
          <SettingsOutlined sx={{ color: ORANGE, fontSize: 28 }} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700} color={NAVY}>Settings</Typography>
          <Typography variant="body2" color="text.secondary">Configure platform defaults for ATS scoring and notifications</Typography>
        </Box>
      </Box>

      {/* ── ATS Scoring ─────────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 2, mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TuneOutlined sx={{ color: ORANGE }} />
          <Typography fontWeight={700} color={NAVY}>ATS Scoring</Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" mb={3}>
          Set the minimum ATS score required for a candidate to be shortlisted.
          Candidates scoring below this threshold will be highlighted as low-match.
        </Typography>

        <Box sx={{ px: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" fontWeight={600} color="text.primary">
              Minimum ATS Score to Shortlist
            </Typography>
            <Chip
              label={`${threshold}%`}
              sx={{ bgcolor: ORANGE, color: '#fff', fontWeight: 700, fontSize: 15, px: 0.5 }}
            />
          </Box>
          <Slider
            value={threshold}
            onChange={(_, v) => update({ atsThreshold: v as number })}
            min={0} max={100} step={5}
            marks={[
              { value: 0,   label: '0%' },
              { value: 50,  label: '50%' },
              { value: 80,  label: '80%' },
              { value: 100, label: '100%' },
            ]}
            sx={{
              color: ORANGE,
              '& .MuiSlider-markLabel': { fontSize: 11, color: '#64748B' },
            }}
          />
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" fontWeight={600} color="text.secondary" mb={1.5}>
            Score Bands Preview
          </Typography>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <ScoreChip label={`Excellent  ≥ 80%`}        color={excellentColor} />
            <ScoreChip label={`Good  60–79%`}             color={goodColor}     />
            <ScoreChip label={`Below Threshold  < ${threshold}%`} color={fairColor} />
          </Stack>
        </Box>
      </Paper>

      {/* ── Email Notifications ──────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 2, mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <EmailOutlined sx={{ color: ORANGE }} />
          <Typography fontWeight={700} color={NAVY}>Email Notifications</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2.5}>
          Control which emails are sent automatically when HR performs actions.
          Emails are sent via AWS SES from <strong>noreply@hireiq.ai</strong>.
        </Typography>

        {([
          ['emailOnShortlist',  'Send email when candidate is shortlisted'],
          ['emailOnReject',     'Send email when candidate is rejected'],
          ['emailOnInterview',  'Send interview invitation when interview is scheduled'],
          ['emailOnOffer',      'Send offer letter email when offer is released'],
        ] as [keyof HsSettings, string][]).map(([key, label]) => (
          <Box key={key}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings[key] as boolean}
                  onChange={e => update({ [key]: e.target.checked })}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: ORANGE },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: ORANGE },
                  }}
                />
              }
              label={<Typography variant="body2" color="text.primary">{label}</Typography>}
              sx={{ mb: 1, display: 'flex' }}
            />
          </Box>
        ))}
      </Paper>

      {/* ── Pipeline ─────────────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AutoAwesomeOutlined sx={{ color: ORANGE }} />
          <Typography fontWeight={700} color={NAVY}>Pipeline Automation</Typography>
        </Box>
        <FormControlLabel
          control={
            <Switch
              checked={settings.autoPromoteEnabled}
              onChange={e => update({ autoPromoteEnabled: e.target.checked })}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: ORANGE },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: ORANGE },
              }}
            />
          }
          label={
            <Box>
              <Typography variant="body2" fontWeight={600} color="text.primary">
                Auto-promote candidates that meet the ATS threshold
              </Typography>
              <Typography variant="caption" color="text.secondary">
                When enabled, candidates scoring ≥ {threshold}% are automatically moved to Shortlisted
              </Typography>
            </Box>
          }
        />
      </Paper>

      <Divider sx={{ mb: 3 }} />

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          sx={{ bgcolor: ORANGE, '&:hover': { bgcolor: '#c43d1f' }, px: 4 }}
        >
          Save Settings
        </Button>
        <Button variant="outlined" color="inherit" onClick={handleReset}>
          Reset to Defaults
        </Button>
      </Box>

      <Snackbar open={saved} autoHideDuration={3000} onClose={() => setSaved(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="success" onClose={() => setSaved(false)}>Settings saved successfully</Alert>
      </Snackbar>
    </Box>
  )
}
