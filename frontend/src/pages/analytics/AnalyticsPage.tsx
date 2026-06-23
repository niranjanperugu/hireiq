import React, { useEffect, useState } from 'react'
import {
  Box, Typography, Card, CardContent, Grid, Chip, CircularProgress, Alert
} from '@mui/material'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  PeopleAlt, Work, Assessment, TrendingUp
} from '@mui/icons-material'
import { useAppSelector } from '@hooks/redux'
import apiClient from '@services/apiClient'

const NAVY   = '#0B0F1A'
const INDIGO = '#6366F1'
const COLORS = ['#6366F1','#22C55E','#F59E0B','#EF4444','#06B6D4','#A78BFA','#F472B6','#34D399','#FB923C','#60A5FA']

interface AnalyticsData {
  totalProfiles: number
  totalApplied: number
  openJobs: number
  avgAtsScore: number
  atsDistribution: { label: string; count: number }[]
  applicationsByJob: { jobTitle: string; count: number; avgScore: number }[]
  jobStatusDistribution: { status: string; count: number }[]
  sourceBreakdown: { label: string; count: number }[]
  experienceDistribution: { label: string; count: number }[]
  ratingBreakdown: { rating: string; count: number }[]
  topSkills: { skill: string; count: number }[]
}

const KPI: React.FC<{ label: string; value: string | number; sub: string; icon: React.ReactNode; color: string }> =
  ({ label, value, sub, icon, color }) => (
  <Card sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: 2, height: '100%' }}>
    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {label}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color, fontSize: '2rem', lineHeight: 1.1, mt: 0.5 }}>
            {value}
          </Typography>
          <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.7rem' }}>{sub}</Typography>
        </Box>
        <Box sx={{ color, opacity: 0.15, fontSize: 48 }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
)

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#1E293B', mb: 2 }}>
    {children}
  </Typography>
)

const CHART_STYLE = {
  bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: 2
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <Box sx={{ bgcolor: NAVY, border: '1px solid #1E2D40', borderRadius: 1.5, px: 1.5, py: 1 }}>
      {label && <Typography sx={{ color: '#94A3B8', fontSize: '0.7rem', mb: 0.5 }}>{label}</Typography>}
      {payload.map((p: any, i: number) => (
        <Typography key={i} sx={{ color: '#E2E8F0', fontSize: '0.78rem', fontWeight: 600 }}>
          {p.name ? `${p.name}: ` : ''}{p.value}
        </Typography>
      ))}
    </Box>
  )
}

const AnalyticsPage: React.FC = () => {
  const { organizationId } = useAppSelector(s => s.auth)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!organizationId) return
    apiClient.get<AnalyticsData>(`/analytics/dashboard?organizationId=${organizationId}`)
      .then(r => { setData(r.data); setLoading(false) })
      .catch(() => { setError('Failed to load analytics data.'); setLoading(false) })
  }, [organizationId])

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
      <CircularProgress sx={{ color: INDIGO }} />
    </Box>
  )
  if (error) return <Alert severity="error">{error}</Alert>
  if (!data)  return null

  const jobStatusFiltered = data.jobStatusDistribution.filter(d => d.count > 0)
  const sourceFiltered    = data.sourceBreakdown.filter(d => d.count > 0)
  const hiringRate = data.totalApplied > 0
    ? Math.round((data.atsDistribution[0]?.count / data.totalApplied) * 100)
    : 0

  return (
    <Box sx={{ bgcolor: '#EEF0FF', minHeight: '100%', pb: 4 }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0B0F1A', letterSpacing: '-0.3px' }}>
            Recruitment Analytics
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            Live data from your recruitment pipeline
          </Typography>
        </Box>
        <Chip label="Live" size="small"
          sx={{ bgcolor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', fontWeight: 700, fontSize: '0.7rem' }} />
      </Box>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <KPI label="Total Profiles" value={data.totalProfiles} sub="in resume database"
            icon={<PeopleAlt sx={{ fontSize: 'inherit' }} />} color="#6366F1" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPI label="Total Applied" value={data.totalApplied} sub="candidates in pipeline"
            icon={<Assessment sx={{ fontSize: 'inherit' }} />} color="#0EA5E9" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPI label="Open Jobs" value={data.openJobs} sub="actively hiring"
            icon={<Work sx={{ fontSize: 'inherit' }} />} color="#22C55E" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPI label="Avg ATS Score" value={`${data.avgAtsScore}%`} sub="across all applications"
            icon={<TrendingUp sx={{ fontSize: 'inherit' }} />} color="#F59E0B" />
        </Grid>
      </Grid>

      {/* ── Row 1: ATS Distribution + Applications by Job ─────────────────── */}
      <Grid container spacing={2.5} mb={2.5}>
        <Grid item xs={12} md={6}>
          <Card sx={CHART_STYLE}>
            <CardContent sx={{ p: 2.5 }}>
              <SectionTitle>ATS Score Distribution</SectionTitle>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.atsDistribution} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Candidates" radius={[6, 6, 0, 0]}>
                    {data.atsDistribution.map((_, i) => (
                      <Cell key={i} fill={['#22C55E','#6366F1','#F59E0B','#EF4444'][i] ?? INDIGO} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={CHART_STYLE}>
            <CardContent sx={{ p: 2.5 }}>
              <SectionTitle>Applications by Job</SectionTitle>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.applicationsByJob} layout="vertical" barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                  <YAxis dataKey="jobTitle" type="category" width={160}
                    tick={{ fontSize: 10, fill: '#64748B' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="count" name="Applicants" fill={INDIGO} radius={[0, 6, 6, 0]} />
                  <Bar dataKey="avgScore" name="Avg Score" fill="#0EA5E9" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Row 2: Experience + Source + Job Status ────────────────────────── */}
      <Grid container spacing={2.5} mb={2.5}>
        <Grid item xs={12} md={4}>
          <Card sx={{ ...CHART_STYLE, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <SectionTitle>Experience Level</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.experienceDistribution} dataKey="count" nameKey="label"
                    cx="50%" cy="50%" outerRadius={80} labelLine={false}
                    label={({ name, percent }) => percent > 0.05 ? `${Math.round(percent * 100)}%` : ''}>
                    {data.experienceDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ ...CHART_STYLE, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <SectionTitle>Candidate Source</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={sourceFiltered.length ? sourceFiltered : [{label:'No data',count:1}]}
                    dataKey="count" nameKey="label"
                    cx="50%" cy="50%" outerRadius={80} labelLine={false}
                    label={({ percent }) => percent > 0.05 ? `${Math.round(percent * 100)}%` : ''}>
                    {(sourceFiltered.length ? sourceFiltered : [{label:'No data',count:1}]).map((_, i) => (
                      <Cell key={i} fill={['#6366F1','#2563EB'][i] ?? COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ ...CHART_STYLE, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <SectionTitle>Job Status Distribution</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={jobStatusFiltered.length ? jobStatusFiltered : [{status:'No data',count:1}]}
                    dataKey="count" nameKey="status"
                    cx="50%" cy="50%" outerRadius={80} labelLine={false}
                    label={({ percent }) => percent > 0.05 ? `${Math.round(percent * 100)}%` : ''}>
                    {(jobStatusFiltered.length ? jobStatusFiltered : [{status:'No data',count:1}]).map((_, i) => (
                      <Cell key={i} fill={['#22C55E','#EF4444','#0EA5E9','#F59E0B'][i] ?? COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Row 3: Top Skills + Key Metrics ───────────────────────────────── */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          <Card sx={CHART_STYLE}>
            <CardContent sx={{ p: 2.5 }}>
              <SectionTitle>Top Matched Skills</SectionTitle>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.topSkills} layout="vertical" barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                  <YAxis dataKey="skill" type="category" width={110}
                    tick={{ fontSize: 10, fill: '#64748B' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Candidates" radius={[0, 6, 6, 0]}>
                    {data.topSkills.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ ...CHART_STYLE, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <SectionTitle>Key Metrics</SectionTitle>
              <Box display="flex" flexDirection="column" gap={2}>
                {[
                  { label: 'Excellent Profiles', value: `${data.atsDistribution[0]?.count ?? 0}`, sub: 'ATS score ≥ 80%', color: '#22C55E' },
                  { label: 'Avg ATS Score', value: `${data.avgAtsScore}%`, sub: 'across all applicants', color: '#6366F1' },
                  { label: 'Top-Rated Share', value: `${hiringRate}%`, sub: 'profiles rated Excellent', color: '#F59E0B' },
                  { label: 'HR Imported', value: `${data.sourceBreakdown.find(s => s.label === 'Imported by HR')?.count ?? 0}`, sub: 'via Resume Analyzer', color: '#2563EB' },
                  { label: 'External Applies', value: `${data.sourceBreakdown.find(s => s.label === 'Applied Externally')?.count ?? 0}`, sub: 'via public apply link', color: '#0EA5E9' },
                  { label: 'Active Roles', value: `${data.openJobs}`, sub: 'jobs currently open', color: '#16A34A' },
                ].map(m => (
                  <Box key={m.label} display="flex" justifyContent="space-between" alignItems="center"
                    sx={{ py: 1.25, borderBottom: '1px solid #F1F5F9', '&:last-child': { borderBottom: 'none' } }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E293B' }}>{m.label}</Typography>
                      <Typography sx={{ fontSize: '0.68rem', color: '#94A3B8' }}>{m.sub}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: m.color }}>{m.value}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default AnalyticsPage
