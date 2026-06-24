import React, { useState, useEffect, useCallback } from 'react'
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Checkbox, Chip,
  CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, Grid, IconButton, InputAdornment, MenuItem, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
  TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import {
  Analytics as AnalyzeIcon, CloudUpload as UploadIcon, Delete as DeleteIcon,
  Edit as EditIcon, FileDownload as ImportIcon, Search as SearchIcon,
  Visibility as ViewIcon, Work as WorkIcon, Tune as TuneIcon,
  CheckCircle as CheckCircleIcon, ExpandMore,
} from '@mui/icons-material'
import apiClient from '@services/apiClient'
import { loadPipeline, savePipeline, DEFAULT_STAGES, uid } from '@utils/pipelineStorage'

// ── Types ─────────────────────────────────────────────────────────────────────
interface JobRequirement {
  id?: string
  requirementType: string    // 'SKILL' | 'CERTIFICATION' | 'EDUCATION'
  requirementValue: string
  isMandatory?: boolean
  priorityLevel?: number
}

interface Job {
  id: string
  title: string
  description?: string
  employmentType?: string
  workMode?: string
  minExperienceYears?: number
  maxExperienceYears?: number
  requirements?: JobRequirement[]
  status?: string
  location?: string
}

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
  email: string | null
  phone: string | null
  atsScore: number
  matchedSkills: string[]
  missingSkills: string[]
  yearsOfExperience: number
  education: string | null
  professionalSummary: string | null
  resumeFileName: string
  resumeS3Url: string | null
  rating: string | null
  analyzedAt: string | null
  isApplied?: boolean
  appliedAt?: string | null
  hiringRecommendation?: string | null
  fullAnalysis?: FullAnalysis
  isDuplicate?: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const atsColor = (s: number) => s >= 80 ? '#4caf50' : s >= 60 ? '#ff9800' : '#f44336'
const atsLabel = (s: number) => s >= 80 ? 'Excellent' : s >= 60 ? 'Good' : 'Fair'

const EMP_LABELS: Record<string, string> = {
  FULL_TIME:'Full Time', PART_TIME:'Part Time', CONTRACT:'Contract', INTERNSHIP:'Internship',
}
const WORK_LABELS: Record<string, string> = {
  REMOTE:'Remote', HYBRID:'Hybrid', ON_SITE:'On-Site',
}

const ORANGE = '#6366F1'
const BG     = '#EEF0FF'
const BORDER = '#E2E8F0'
const TEXT1  = '#1E293B'
const TEXT2  = '#64748B'
const TEXT3  = '#94A3B8'

const recBg = (r?: string | null) => {
  if (!r) return '#94a3b8'
  if (r === 'Top Candidate')   return '#059669'
  if (r === 'Strong Interview') return '#2563eb'
  if (r === 'Interview')       return '#7c3aed'
  if (r === 'Consider')        return '#d97706'
  return '#dc2626'
}

const evidenceBadge = (level: number) => {
  const map: Record<number, { label: string; color: string }> = {
    0: { label: 'Missing',  color: '#dc2626' },
    1: { label: 'Mentioned', color: '#d97706' },
    2: { label: 'Demonstrated', color: '#2563eb' },
    3: { label: 'Strong', color: '#059669' },
    4: { label: 'Expert', color: '#7c3aed' },
  }
  return map[level] ?? map[0]
}

// Compact hover tooltip content
const AiSummaryTooltip: React.FC<{ result: ResumeAnalysis }> = ({ result }) => {
  const fa = result.fullAnalysis
  const summary = fa?.recruiter_summary || result.professionalSummary
  if (!summary) return null
  return (
    <Box sx={{ p: 1, maxWidth: 340 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
        <Box sx={{
          width: 32, height: 32, borderRadius: '50%', bgcolor: atsColor(result.atsScore),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0,
        }}>{Math.round(result.atsScore)}</Box>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{result.candidateName}</Typography>
          {fa?.recommendation && (
            <Box component="span" sx={{
              fontSize: 10, fontWeight: 700, px: 0.75, py: 0.25, borderRadius: 1,
              bgcolor: recBg(fa.recommendation), color: '#fff',
            }}>{fa.recommendation}</Box>
          )}
        </Box>
      </Box>
      <Typography sx={{ fontSize: 12, lineHeight: 1.5, color: '#e2e8f0' }}>{summary}</Typography>
      {fa?.interview_probability?.percentage != null && (
        <Typography sx={{ fontSize: 11, mt: 0.75, color: '#94a3b8' }}>
          Interview probability: <strong style={{ color: '#fff' }}>{fa.interview_probability.percentage}%</strong>
          {fa.interview_probability.assessment ? ` — ${fa.interview_probability.assessment}` : ''}
        </Typography>
      )}
    </Box>
  )
}

// ── View Dialog ───────────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ label: string; score?: number }> = ({ label, score }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, mb: 1 }}>
    <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6, color: '#64748b', fontSize: 10 }}>
      {label}
    </Typography>
    {score != null && (
      <Chip label={`${Math.round(score)}/100`} size="small" sx={{
        height: 16, fontSize: 9, fontWeight: 700,
        bgcolor: score >= 70 ? '#dcfce7' : score >= 40 ? '#fef3c7' : '#fee2e2',
        color: score >= 70 ? '#15803d' : score >= 40 ? '#d97706' : '#dc2626',
      }} />
    )}
    <Box sx={{ flex: 1, height: '1px', bgcolor: '#e2e8f0' }} />
  </Box>
)

const ViewDialog: React.FC<{ result: ResumeAnalysis | null; onClose: () => void }> = ({ result, onClose }) => {
  const fa = result?.fullAnalysis
  return (
    <Dialog open={!!result} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { maxHeight: '92vh' } }}>
      {result && (
        <>
          <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: 52, height: 52, borderRadius: '50%', bgcolor: atsColor(result.atsScore),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0,
              }}>
                {Math.round(result.atsScore)}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{result.candidateName}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {result.currentRole || '—'} · {result.yearsOfExperience ?? 0} yrs exp · {result.education || '—'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                {fa?.recommendation && (
                  <Chip label={fa.recommendation} size="small"
                    sx={{ bgcolor: recBg(fa.recommendation), color: '#fff', fontWeight: 700 }} />
                )}
                {fa?.interview_probability?.percentage != null && (
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    {fa.interview_probability.percentage}% interview probability
                  </Typography>
                )}
              </Box>
            </Box>
          </DialogTitle>

          <DialogContent dividers sx={{ p: 2 }}>
            <Grid container spacing={2}>

              {/* ── LEFT COLUMN ── */}
              <Grid item xs={12} md={7}>

                {/* Contact */}
                <SectionHeader label="Contact" />
                <Grid container spacing={1}>
                  {[
                    { label: 'Email', value: result.email },
                    { label: 'Phone', value: result.phone },
                    { label: 'Location', value: fa?.location_match?.candidate_location },
                    { label: 'Resume', value: result.resumeFileName },
                  ].map(({ label, value }) => (
                    <Grid item xs={6} key={label}>
                      <Typography variant="caption" color="textSecondary">{label}</Typography>
                      <Typography variant="body2" sx={{ fontSize: 12 }}>{value || '—'}</Typography>
                    </Grid>
                  ))}
                </Grid>

                {/* Recruiter Summary */}
                {(fa?.recruiter_summary || result.professionalSummary) && (
                  <>
                    <SectionHeader label="Recruiter Summary" />
                    <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.7, fontSize: 13 }}>
                      {fa?.recruiter_summary || result.professionalSummary}
                    </Typography>
                  </>
                )}

                {/* Hiring Manager Summary */}
                {fa?.hiring_manager_summary && (
                  <>
                    <SectionHeader label="Hiring Manager View" />
                    <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.7, fontSize: 13 }}>
                      {fa.hiring_manager_summary}
                    </Typography>
                  </>
                )}

                {/* JD Match */}
                {fa?.job_description_match && (
                  <>
                    <SectionHeader label="JD Match (50%)" score={fa.job_description_match.score} />
                    <Grid container spacing={1}>
                      {(fa.job_description_match.matched_responsibilities?.length > 0) && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 700 }}>
                            Matched Responsibilities
                          </Typography>
                          <Box component="ul" sx={{ m: 0, pl: 2 }}>
                            {fa.job_description_match.matched_responsibilities.map((r, i) => (
                              <Typography key={i} component="li" variant="body2" sx={{ fontSize: 12, color: '#374151', mb: 0.15 }}>{r}</Typography>
                            ))}
                          </Box>
                        </Grid>
                      )}
                      {(fa.job_description_match.missing_responsibilities?.length > 0) && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700 }}>
                            Missing Responsibilities
                          </Typography>
                          <Box component="ul" sx={{ m: 0, pl: 2 }}>
                            {fa.job_description_match.missing_responsibilities.map((r, i) => (
                              <Typography key={i} component="li" variant="body2" sx={{ fontSize: 12, color: '#374151', mb: 0.15 }}>{r}</Typography>
                            ))}
                          </Box>
                        </Grid>
                      )}
                      {(fa.job_description_match.matched_qualifications?.length > 0) && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 700 }}>
                            Matched Qualifications
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.25 }}>
                            {fa.job_description_match.matched_qualifications.map((q, i) => (
                              <Chip key={i} label={q} size="small" color="success" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                            ))}
                          </Box>
                        </Grid>
                      )}
                      {(fa.job_description_match.missing_qualifications?.length > 0) && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700 }}>
                            Missing Qualifications
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.25 }}>
                            {fa.job_description_match.missing_qualifications.map((q, i) => (
                              <Chip key={i} label={q} size="small" color="error" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                            ))}
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </>
                )}

                {/* Skills Evidence Table */}
                {fa?.required_skills_match && (
                  <>
                    <SectionHeader
                      label={`Skills (10%) — ${fa.required_skills_match.matched_skills_count ?? 0}/${fa.required_skills_match.required_skills_count ?? 0} matched`}
                      score={fa.required_skills_match.score}
                    />
                    {(fa.required_skills_match.skill_evidence?.length > 0) ? (
                      <Table size="small" sx={{ '& td, & th': { py: 0.5, px: 1, fontSize: 12 } }}>
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#f8fafc' }}>
                            <TableCell sx={{ fontWeight: 700 }}>Skill</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Level</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Evidence</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {fa.required_skills_match.skill_evidence.map((se, i) => {
                            const badge = evidenceBadge(se.evidence_level)
                            return (
                              <TableRow key={i}>
                                <TableCell sx={{ fontWeight: 600 }}>{se.skill}</TableCell>
                                <TableCell>
                                  <Box component="span" sx={{
                                    fontSize: 10, fontWeight: 700, px: 0.75, py: 0.25, borderRadius: 1,
                                    bgcolor: badge.color + '20', color: badge.color, border: `1px solid ${badge.color}40`,
                                  }}>{badge.label}</Box>
                                </TableCell>
                                <TableCell sx={{ color: '#64748b', maxWidth: 200 }}>{se.evidence || '—'}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {(fa.required_skills_match.matched_skills || []).map(s => (
                          <Chip key={s} label={s} size="small" color="success" variant="outlined" />
                        ))}
                        {(fa.required_skills_match.missing_skills || []).map(s => (
                          <Chip key={s} label={s} size="small" color="error" variant="outlined" />
                        ))}
                      </Box>
                    )}
                  </>
                )}

              </Grid>

              {/* ── RIGHT COLUMN ── */}
              <Grid item xs={12} md={5}>

                {/* Component Scores */}
                <SectionHeader label="Score Breakdown" />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {[
                    { label: 'JD Match',    score: fa?.job_description_match?.score,    weight: '50%' },
                    { label: 'Skills',      score: fa?.required_skills_match?.score,    weight: '10%' },
                    { label: 'Experience',  score: fa?.experience_match?.score,         weight: '10%' },
                    { label: 'Job Title',   score: fa?.job_title_match?.score,          weight: '5%' },
                    { label: 'Location',    score: fa?.location_match?.score,           weight: '5%' },
                    { label: 'Seniority',   score: fa?.seniority_match?.score,          weight: '5%' },
                    { label: 'Achievements',score: fa?.achievement_impact?.score,       weight: '5%' },
                    { label: 'Education',   score: fa?.education_certifications?.score, weight: '3%' },
                    { label: 'ATS Format',  score: fa?.ats_readability?.score,          weight: '2%' },
                  ].map(({ label, score, weight }) => {
                    const s = score ?? 0
                    return (
                      <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: 12, width: 90, color: '#374151', flexShrink: 0 }}>{label}</Typography>
                        <Typography sx={{ fontSize: 10, color: '#94a3b8', width: 28, flexShrink: 0 }}>{weight}</Typography>
                        <Box sx={{
                          flex: 1, height: 6, borderRadius: 3, bgcolor: '#e2e8f0', overflow: 'hidden',
                        }}>
                          <Box sx={{
                            width: `${s}%`, height: '100%', borderRadius: 3,
                            bgcolor: s >= 70 ? '#22c55e' : s >= 40 ? '#f59e0b' : '#ef4444',
                            transition: 'width 0.4s ease',
                          }} />
                        </Box>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, width: 26, textAlign: 'right', color: s >= 70 ? '#15803d' : s >= 40 ? '#d97706' : '#dc2626' }}>
                          {Math.round(s)}
                        </Typography>
                      </Box>
                    )
                  })}
                </Box>

                {/* Experience / Title / Location details */}
                {fa?.experience_match && (
                  <>
                    <SectionHeader label="Experience" score={fa.experience_match.score} />
                    <Typography variant="body2" sx={{ fontSize: 12, color: '#374151' }}>
                      Required: {fa.experience_match.required_years} yrs · Candidate: {fa.experience_match.candidate_years} yrs
                    </Typography>
                  </>
                )}
                {fa?.job_title_match && (
                  <>
                    <SectionHeader label="Job Title Match" score={fa.job_title_match.score} />
                    <Typography variant="body2" sx={{ fontSize: 12, color: '#374151' }}>
                      {fa.job_title_match.candidate_title || '—'} vs {fa.job_title_match.target_title || '—'}
                    </Typography>
                  </>
                )}
                {fa?.seniority_match && (
                  <>
                    <SectionHeader label="Seniority" score={fa.seniority_match.score} />
                    <Typography variant="body2" sx={{ fontSize: 12, color: '#374151' }}>
                      Candidate: {fa.seniority_match.candidate_level || '—'} · Required: {fa.seniority_match.required_level || '—'}
                    </Typography>
                  </>
                )}

                {/* Achievements */}
                {(fa?.achievement_impact?.achievements?.length ?? 0) > 0 && (
                  <>
                    <SectionHeader label="Achievements" score={fa!.achievement_impact!.score} />
                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                      {fa!.achievement_impact!.achievements.map((a, i) => (
                        <Typography key={i} component="li" variant="body2" sx={{ fontSize: 12, color: '#374151', mb: 0.15 }}>{a}</Typography>
                      ))}
                    </Box>
                  </>
                )}

                {/* Top Strengths */}
                {(fa?.top_strengths?.length ?? 0) > 0 && (
                  <>
                    <SectionHeader label="Top Strengths" />
                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                      {fa!.top_strengths!.map((s, i) => (
                        <Typography key={i} component="li" variant="body2" sx={{ fontSize: 12, color: '#15803d', mb: 0.15 }}>{s}</Typography>
                      ))}
                    </Box>
                  </>
                )}

                {/* High Priority Gaps */}
                {(fa?.high_priority_gaps?.length ?? 0) > 0 && (
                  <>
                    <SectionHeader label="Priority Gaps" />
                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                      {fa!.high_priority_gaps!.map((g, i) => (
                        <Typography key={i} component="li" variant="body2" sx={{ fontSize: 12, color: '#dc2626', mb: 0.15 }}>{g}</Typography>
                      ))}
                    </Box>
                  </>
                )}

                {/* Critical Missing */}
                {(fa?.critical_missing_requirements?.length ?? 0) > 0 && (
                  <>
                    <SectionHeader label="Critical Missing Requirements" />
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {fa!.critical_missing_requirements!.map((r, i) => (
                        <Chip key={i} label={r} size="small" sx={{ bgcolor: '#fee2e2', color: '#dc2626', fontSize: 10, height: 20 }} />
                      ))}
                    </Box>
                  </>
                )}

                {/* Improvement Recommendations */}
                {(fa?.improvement_recommendations?.length ?? 0) > 0 && (
                  <>
                    <SectionHeader label="Recommendations" />
                    <Box component="ol" sx={{ m: 0, pl: 2 }}>
                      {fa!.improvement_recommendations!.map((r, i) => (
                        <Typography key={i} component="li" variant="body2" sx={{ fontSize: 12, color: '#374151', mb: 0.15 }}>{r}</Typography>
                      ))}
                    </Box>
                  </>
                )}

                {result.resumeS3Url && (
                  <Box sx={{ mt: 2 }}>
                    <Button size="small" variant="outlined" href={result.resumeS3Url} target="_blank" rel="noopener noreferrer">
                      Download Resume
                    </Button>
                  </Box>
                )}
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Close</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}

// ── Edit Dialog ───────────────────────────────────────────────────────────────
const EditDialog: React.FC<{
  result: ResumeAnalysis | null; organizationId: string;
  onClose: () => void; onSaved: (u: ResumeAnalysis) => void
}> = ({ result, organizationId, onClose, onSaved }) => {
  const [form, setForm] = useState<Partial<ResumeAnalysis>>({})
  const [saving, setSaving] = useState(false)
  const [err, setErr]     = useState<string | null>(null)

  useEffect(() => { if (result) setForm({ ...result }) }, [result])

  const handleSave = async () => {
    if (!result) return
    setSaving(true); setErr(null)
    try {
      const resp = await apiClient.put(
        `/resume-analysis/${result.id}?organizationId=${encodeURIComponent(organizationId)}`,
        { candidateName:form.candidateName, email:form.email, phone:form.phone,
          currentRole:form.currentRole, yearsOfExperience:Number(form.yearsOfExperience ?? 0),
          education:form.education, atsScore:Number(form.atsScore ?? result.atsScore) }
      )
      onSaved(resp.data as ResumeAnalysis); onClose()
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  const f = (field: keyof ResumeAnalysis, value: any) => setForm(p => ({ ...p, [field]: value }))

  return (
    <Dialog open={!!result} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Candidate Data</DialogTitle>
      <DialogContent dividers>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Candidate Name"
              value={form.candidateName ?? ''} onChange={e => f('candidateName', e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Current Role"
              value={form.currentRole ?? ''} onChange={e => f('currentRole', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Email"
              value={form.email ?? ''} onChange={e => f('email', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Phone"
              value={form.phone ?? ''} onChange={e => f('phone', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Years of Experience" type="number"
              value={form.yearsOfExperience ?? 0}
              onChange={e => f('yearsOfExperience', parseInt(e.target.value))}
              inputProps={{ min:0, max:50 }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth select size="small" label="Education"
              value={form.education ?? ''} onChange={e => f('education', e.target.value)}>
              {["PhD","Master's","Bachelor's","Diploma","High School"].map(e => (
                <MenuItem key={e} value={e}>{e}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="ATS Score (0–100)" type="number"
              value={form.atsScore ?? 0}
              onChange={e => f('atsScore', parseFloat(e.target.value))}
              inputProps={{ min:0, max:100 }} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Analysis Popup ─────────────────────────────────────────────────────────────
const AnalysisPopup: React.FC<{
  open: boolean; results: ResumeAnalysis[]; jobId: string; jobTitle: string;
  onClose: () => void; onImport: (s: ResumeAnalysis[]) => void
}> = ({ open, results, jobId, jobTitle, onClose, onImport }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) setSelected(new Set(results.map(r => r.id)))
  }, [open, results])

  const allChecked = selected.size === results.length
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(results.map(r => r.id)))
  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const sorted = [...results].sort((a, b) => b.atsScore - a.atsScore)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight:700 }}>
              ATS Analysis Results — {jobTitle}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {results.length} resume{results.length !== 1 ? 's' : ''} analyzed · Select profiles to import
            </Typography>
          </Box>
          <Box sx={{ display:'flex', gap:1 }}>
            <Chip label={`Avg: ${results.length ? (results.reduce((s,r)=>s+r.atsScore,0)/results.length).toFixed(1):0}`}
              size="small" color="primary" variant="outlined" />
            <Chip label={`Excellent: ${results.filter(r=>r.atsScore>=80).length}`}
              size="small" sx={{color:'#4caf50',borderColor:'#4caf50'}} variant="outlined" />
            <Chip label={`Good: ${results.filter(r=>r.atsScore>=60&&r.atsScore<80).length}`}
              size="small" sx={{color:'#ff9800',borderColor:'#ff9800'}} variant="outlined" />
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p:0 }}>
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ bgcolor:'#f5f5f5' }}>
                  <Checkbox checked={allChecked} indeterminate={selected.size>0&&!allChecked}
                    onChange={toggleAll} size="small" />
                </TableCell>
                {['Candidate','Current Role','Email','Phone','Exp','Education','Matched Skills','Missing Skills','ATS Score'].map(h=>(
                  <TableCell key={h} sx={{fontWeight:600,bgcolor:'#f5f5f5'}}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map(r=>(
                <TableRow key={r.id} hover selected={selected.has(r.id)}
                  onClick={()=>toggle(r.id)} sx={{cursor:'pointer'}}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={selected.has(r.id)} size="small"
                      onChange={()=>toggle(r.id)} onClick={e=>e.stopPropagation()} />
                  </TableCell>
                  <TableCell onClick={e=>e.stopPropagation()}>
                    {r.isDuplicate ? (
                      <Box>
                        <Box sx={{display:'flex',alignItems:'center',gap:0.75,mb:0.25}}>
                          <Typography variant="body2" sx={{fontWeight:500,color:'#64748B'}}>{r.candidateName}</Typography>
                          <Chip label="Duplicate Record" size="small" sx={{
                            height:18,fontSize:9,fontWeight:700,
                            bgcolor:'#FEF2F2',color:'#DC2626',border:'1px solid #FECACA',borderRadius:1
                          }}/>
                        </Box>
                        <Typography variant="caption" color="textSecondary">Analysis skipped — profile already exists for this job</Typography>
                      </Box>
                    ) : (
                      <Tooltip
                        title={(r.fullAnalysis?.recruiter_summary || r.professionalSummary) ? <AiSummaryTooltip result={r} /> : ''}
                        placement="right" arrow
                        componentsProps={{ tooltip: { sx: { bgcolor: '#1e293b', maxWidth: 360, p: 0 } }, arrow: { sx: { color: '#1e293b' } } }}
                      >
                        <Box sx={{ cursor: 'default' }}>
                          <Typography variant="body2" sx={{fontWeight:500}}>{r.candidateName}</Typography>
                          <Typography variant="caption" color="textSecondary">{r.resumeFileName}</Typography>
                        </Box>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell><Typography variant="body2">{r.currentRole||'—'}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{r.email||'—'}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{r.phone||'—'}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{r.yearsOfExperience??0} yrs</Typography></TableCell>
                  <TableCell><Typography variant="body2">{r.education||'—'}</Typography></TableCell>
                  <TableCell>
                    <Box sx={{display:'flex',flexWrap:'wrap',gap:0.5}}>
                      {(r.matchedSkills||[]).slice(0,3).map(s=><Chip key={s} label={s} size="small" color="success" variant="outlined"/>)}
                      {(r.matchedSkills||[]).length>3&&<Chip label={`+${r.matchedSkills.length-3}`} size="small" variant="outlined"/>}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{display:'flex',flexWrap:'wrap',gap:0.5}}>
                      {(r.missingSkills||[]).slice(0,3).map(s=><Chip key={s} label={s} size="small" color="error" variant="outlined"/>)}
                      {(r.missingSkills||[]).length>3&&<Chip label={`+${r.missingSkills.length-3}`} size="small" variant="outlined"/>}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {r.isDuplicate ? (
                      <Typography variant="caption" sx={{color:'#DC2626',fontWeight:600}}>—</Typography>
                    ) : (
                      <Box sx={{display:'inline-flex',flexDirection:'column',alignItems:'center',gap:0.25}}>
                        <Box sx={{width:42,height:42,borderRadius:'50%',bgcolor:atsColor(r.atsScore),
                          display:'flex',alignItems:'center',justifyContent:'center',
                          color:'#fff',fontWeight:700,fontSize:13}}>
                          {Math.round(r.atsScore)}
                        </Box>
                        <Typography variant="caption" sx={{fontWeight:600,fontSize:10}}>{atsLabel(r.atsScore)}</Typography>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions sx={{px:3,py:2,justifyContent:'space-between'}}>
        <Typography variant="body2" color="textSecondary">
          {selected.size} of {results.length} selected
        </Typography>
        <Box sx={{display:'flex',gap:1}}>
          <Button onClick={onClose}>Close</Button>
          <Button variant="contained" disabled={selected.size===0}
            startIcon={<ImportIcon/>}
            onClick={()=>onImport(results.filter(r=>selected.has(r.id)))}>
            Import Selected ({selected.size})
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}

// ── Results Table ─────────────────────────────────────────────────────────────
const ResultsTable: React.FC<{
  results: ResumeAnalysis[]
  onView:   (r: ResumeAnalysis) => void
  onEdit:   (r: ResumeAnalysis) => void
  onDelete: (id: string) => void
  onImport: (r: ResumeAnalysis) => Promise<void>
}> = ({ results, onView, onEdit, onDelete, onImport }) => {
  const [search,     setSearch]     = useState('')
  const [page,       setPage]       = useState(0)
  const [rpp,        setRpp]        = useState(10)
  const [importing,  setImporting]  = useState<Set<string>>(new Set())

  const filtered = results.filter(r => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return r.candidateName.toLowerCase().includes(q)
      || (r.email||'').toLowerCase().includes(q)
      || (r.currentRole||'').toLowerCase().includes(q)
      || (r.resumeFileName||'').toLowerCase().includes(q)
  })
  const paginated = filtered.slice(page * rpp, page * rpp + rpp)

  const handleRowImport = async (r: ResumeAnalysis) => {
    setImporting(p => new Set(p).add(r.id))
    try { await onImport(r) } finally {
      setImporting(p => { const n = new Set(p); n.delete(r.id); return n })
    }
  }

  const pending   = results.filter(r => !r.isApplied).length
  const imported  = results.filter(r =>  r.isApplied).length

  return (
    <Card sx={{ mt:4 }}>
      <CardContent>
        <Box sx={{display:'flex',alignItems:'center',justifyContent:'space-between',mb:2,flexWrap:'wrap',gap:2}}>
          <Box>
            <Typography variant="h6" sx={{fontWeight:600}}>Analyzed Candidates</Typography>
            <Box sx={{display:'flex',gap:1,mt:0.5,flexWrap:'wrap',alignItems:'center'}}>
              <Typography variant="body2" color="textSecondary">
                {filtered.length} candidate{filtered.length!==1?'s':''}
                {search?` matching "${search}"`:''} ·
              </Typography>
              <Chip label={`${imported} Imported`} size="small"
                sx={{height:18,fontSize:'0.6rem',fontWeight:700,bgcolor:'#EFF6FF',color:'#2563EB',border:'1px solid #BFDBFE'}}/>
              {pending > 0 && (
                <Chip label={`${pending} Pending`} size="small"
                  sx={{height:18,fontSize:'0.6rem',fontWeight:700,bgcolor:'#FFF7ED',color:'#EA580C',border:'1px solid #FED7AA'}}/>
              )}
            </Box>
          </Box>
          <TextField size="small" placeholder="Search by name, email or role…"
            value={search} onChange={e=>{setSearch(e.target.value);setPage(0)}} sx={{width:280}}
            InputProps={{startAdornment:<InputAdornment position="start"><SearchIcon fontSize="small"/></InputAdornment>}}/>
        </Box>

        {results.length>0&&(
          <Grid container spacing={2} sx={{mb:2}}>
            {[
              {label:'Total',value:results.length,color:'text.primary'},
              {label:'Avg Score',value:(results.reduce((s,r)=>s+r.atsScore,0)/results.length).toFixed(1),color:'#1976d2'},
              {label:'Excellent (≥80)',value:results.filter(r=>r.atsScore>=80).length,color:'#4caf50'},
              {label:'Good (60–79)',value:results.filter(r=>r.atsScore>=60&&r.atsScore<80).length,color:'#ff9800'},
            ].map(({label,value,color})=>(
              <Grid item xs={6} sm={3} key={label}>
                <Box sx={{p:1.5,borderRadius:1,bgcolor:'#f9f9f9',textAlign:'center'}}>
                  <Typography variant="caption" color="textSecondary">{label}</Typography>
                  <Typography variant="h6" sx={{fontWeight:700,color}}>{value}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{bgcolor:'#f5f5f5'}}>
                {['Candidate','Status','Current Role','Email','Exp','Matched Skills','Missing Skills','ATS Score','Actions'].map(h=>(
                  <TableCell key={h} sx={{fontWeight:600,textAlign:h==='ATS Score'||h==='Actions'?'center':undefined}}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length===0?(
                <TableRow>
                  <TableCell colSpan={9} sx={{textAlign:'center',py:5,color:'text.secondary'}}>
                    {results.length===0?'No candidates yet. Analyze resumes above and import profiles.':'No results match your search.'}
                  </TableCell>
                </TableRow>
              ):paginated.map(r=>(
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Tooltip
                      title={(r.fullAnalysis?.recruiter_summary || r.professionalSummary) ? <AiSummaryTooltip result={r} /> : ''}
                      placement="right" arrow
                      componentsProps={{ tooltip: { sx: { bgcolor: '#1e293b', maxWidth: 380, p: 0 } }, arrow: { sx: { color: '#1e293b' } } }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{fontWeight:500,cursor:'default'}}>{r.candidateName}</Typography>
                        <Typography variant="caption" color="textSecondary" noWrap sx={{maxWidth:160,display:'block'}}>
                          {r.resumeFileName}
                        </Typography>
                        {r.fullAnalysis?.recommendation && (
                          <Box component="span" sx={{
                            fontSize: 9, fontWeight: 700, px: 0.5, py: 0.2, borderRadius: 0.5,
                            bgcolor: recBg(r.fullAnalysis.recommendation), color: '#fff', display: 'inline-block', mt: 0.25,
                          }}>{r.fullAnalysis.recommendation}</Box>
                        )}
                      </Box>
                    </Tooltip>
                  </TableCell>

                  {/* Status column */}
                  <TableCell>
                    {r.isApplied
                      ? <Chip label="Imported" size="small"
                          sx={{height:20,fontSize:'0.6rem',fontWeight:700,
                            bgcolor:'#EFF6FF',color:'#2563EB',border:'1px solid #BFDBFE'}}/>
                      : <Chip label="Pending Import" size="small"
                          sx={{height:20,fontSize:'0.6rem',fontWeight:700,
                            bgcolor:'#FFF7ED',color:'#EA580C',border:'1px solid #FED7AA'}}/>
                    }
                  </TableCell>

                  <TableCell><Typography variant="body2">{r.currentRole||'—'}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{r.email||'—'}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{r.yearsOfExperience??0} yrs</Typography></TableCell>
                  <TableCell>
                    <Box sx={{display:'flex',flexWrap:'wrap',gap:0.5}}>
                      {(r.matchedSkills||[]).slice(0,2).map(s=><Chip key={s} label={s} size="small" color="success" variant="outlined"/>)}
                      {(r.matchedSkills||[]).length>2&&<Chip label={`+${r.matchedSkills.length-2}`} size="small" variant="outlined"/>}
                      {!r.matchedSkills?.length&&<Typography variant="caption" color="textSecondary">—</Typography>}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{display:'flex',flexWrap:'wrap',gap:0.5}}>
                      {(r.missingSkills||[]).slice(0,2).map(s=><Chip key={s} label={s} size="small" color="error" variant="outlined"/>)}
                      {(r.missingSkills||[]).length>2&&<Chip label={`+${r.missingSkills.length-2}`} size="small" variant="outlined"/>}
                      {!r.missingSkills?.length&&<Typography variant="caption" color="textSecondary">—</Typography>}
                    </Box>
                  </TableCell>
                  <TableCell sx={{textAlign:'center'}}>
                    <Box sx={{display:'inline-flex',flexDirection:'column',alignItems:'center',gap:0.25}}>
                      <Box sx={{width:42,height:42,borderRadius:'50%',bgcolor:atsColor(r.atsScore),
                        display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:13}}>
                        {Math.round(r.atsScore)}
                      </Box>
                      <Typography variant="caption" sx={{fontWeight:600,fontSize:10}}>{atsLabel(r.atsScore)}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{textAlign:'center'}}>
                    <Box sx={{display:'flex',justifyContent:'center',alignItems:'center',gap:0.25}}>
                      {/* Import button — only for Pending Import rows */}
                      {!r.isApplied && (
                        <Tooltip title="Import to candidates">
                          <span>
                            <IconButton size="small" disabled={importing.has(r.id)}
                              onClick={() => handleRowImport(r)}
                              sx={{ color:'#2563EB', '&:hover':{ bgcolor:'#EFF6FF' } }}>
                              {importing.has(r.id)
                                ? <CircularProgress size={14} sx={{color:'#2563EB'}}/>
                                : <ImportIcon fontSize="small"/>}
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                      <Tooltip title="View"><IconButton size="small" color="primary" onClick={()=>onView(r)}><ViewIcon fontSize="small"/></IconButton></Tooltip>
                      <Tooltip title="Edit"><IconButton size="small" onClick={()=>onEdit(r)}><EditIcon fontSize="small"/></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={()=>onDelete(r.id)}><DeleteIcon fontSize="small"/></IconButton></Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={filtered.length} page={page}
          onPageChange={(_,p)=>setPage(p)} rowsPerPage={rpp}
          onRowsPerPageChange={e=>{setRpp(parseInt(e.target.value));setPage(0)}}
          rowsPerPageOptions={[5,10,25,50]}/>
      </CardContent>
    </Card>
  )
}

// ── Existing Job Panel ─────────────────────────────────────────────────────────
const ExistingJobPanel: React.FC<{
  jobs: Job[]; loadingJobs: boolean;
  selectedJob: Job | null; onSelect: (j: Job | null) => void;
}> = ({ jobs, loadingJobs, selectedJob, onSelect }) => (
  <Box>
    {/* Searchable autocomplete */}
    <Autocomplete
      options={jobs}
      loading={loadingJobs}
      value={selectedJob}
      onChange={(_,v)=>onSelect(v)}
      getOptionLabel={o=>o.title}
      isOptionEqualToValue={(o,v)=>o.id===v.id}
      renderInput={params=>(
        <TextField {...params} label="Search & select a job posting" size="small"
          placeholder="Type job title to search…"
          InputProps={{
            ...params.InputProps,
            startAdornment: <><SearchIcon sx={{color:'#94A3B8',fontSize:18,mr:0.5}}/>{params.InputProps.startAdornment}</>,
            endAdornment: (
              <>
                {loadingJobs && <CircularProgress size={16}/>}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props} sx={{py:1.25, px:2}}>
          <Box sx={{display:'flex',alignItems:'center',gap:1.5,width:'100%'}}>
            <WorkIcon sx={{color:'#94A3B8',fontSize:18,flexShrink:0}}/>
            <Box sx={{flex:1,minWidth:0}}>
              <Typography sx={{fontSize:13,fontWeight:600,color:TEXT1}}>{option.title}</Typography>
              <Box sx={{display:'flex',gap:1,mt:0.25,flexWrap:'wrap'}}>
                {option.department&&<Typography sx={{fontSize:11,color:TEXT2}}>{option.department}</Typography>}
                {option.location&&<Typography sx={{fontSize:11,color:TEXT3}}>· {option.location}</Typography>}
                {option.employmentType&&<Chip label={EMP_LABELS[option.employmentType]??option.employmentType}
                  size="small" sx={{height:17,fontSize:9,borderRadius:1}}/>}
                {option.workMode&&<Chip label={WORK_LABELS[option.workMode]??option.workMode}
                  size="small" sx={{height:17,fontSize:9,borderRadius:1,bgcolor:'#EEF0FF',color:TEXT2}}/>}
              </Box>
            </Box>
            {(() => {
              const skillCount = (option.requirements||[]).filter(r=>r.requirementType==='SKILL').length
              return skillCount > 0 ? (
                <Typography sx={{fontSize:10,color:TEXT3,flexShrink:0}}>
                  {skillCount} skills
                </Typography>
              ) : null
            })()}
          </Box>
        </Box>
      )}
      noOptionsText={loadingJobs ? 'Loading jobs…' : 'No job postings found'}
      sx={{ mb: selectedJob ? 2.5 : 0 }}
    />

    {/* Selected job details card */}
    {selectedJob && (
      <Box sx={{
        border:`1.5px solid ${ORANGE}35`, borderRadius:2, overflow:'hidden',
        bgcolor:CARD, boxShadow:'0 2px 8px rgba(99,102,241,0.08)'
      }}>
        {/* Header */}
        <Box sx={{px:2.5,py:1.75,bgcolor:ORANGE+'0A',borderBottom:`1px solid ${ORANGE}20`,
          display:'flex',alignItems:'center',gap:1.5}}>
          <Box sx={{width:40,height:40,borderRadius:1.5,bgcolor:ORANGE+'18',
            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <WorkIcon sx={{color:ORANGE,fontSize:20}}/>
          </Box>
          <Box sx={{flex:1,minWidth:0}}>
            <Typography sx={{fontSize:15,fontWeight:800,color:TEXT1}}>{selectedJob.title}</Typography>
            <Box sx={{display:'flex',gap:1,mt:0.25,flexWrap:'wrap',alignItems:'center'}}>
              {selectedJob.department&&(
                <Typography sx={{fontSize:11,color:TEXT2}}>{selectedJob.department}</Typography>
              )}
              {selectedJob.employmentType&&(
                <Chip label={EMP_LABELS[selectedJob.employmentType]??selectedJob.employmentType}
                  size="small" sx={{height:18,fontSize:9,borderRadius:1}}/>
              )}
              {selectedJob.workMode&&(
                <Chip label={WORK_LABELS[selectedJob.workMode]??selectedJob.workMode}
                  size="small" sx={{height:18,fontSize:9,borderRadius:1,bgcolor:BG,color:TEXT2}}/>
              )}
            </Box>
          </Box>
          <Chip icon={<CheckCircleIcon sx={{fontSize:'13px !important'}}/>}
            label="Selected" size="small"
            sx={{height:22,fontSize:10,fontWeight:700,bgcolor:'#DCFCE7',color:'#16A34A',
              border:'1px solid #BBF7D0',flexShrink:0}}/>
        </Box>

        <Box sx={{p:2.5}}>
          <Grid container spacing={2}>
            {/* Experience */}
            {(selectedJob.minExperienceYears != null || selectedJob.maxExperienceYears != null) && (
              <Grid item xs={12} sm={4}>
                <Typography sx={{fontSize:10,fontWeight:700,color:TEXT3,textTransform:'uppercase',
                  letterSpacing:'0.07em',mb:0.5}}>Experience</Typography>
                <Typography sx={{fontSize:13,color:TEXT1,fontWeight:600}}>
                  {selectedJob.minExperienceYears ?? 0}–{selectedJob.maxExperienceYears ?? 10} years
                </Typography>
              </Grid>
            )}
            {selectedJob.location && (
              <Grid item xs={12} sm={4}>
                <Typography sx={{fontSize:10,fontWeight:700,color:TEXT3,textTransform:'uppercase',
                  letterSpacing:'0.07em',mb:0.5}}>Location</Typography>
                <Typography sx={{fontSize:13,color:TEXT1,fontWeight:600}}>{selectedJob.location}</Typography>
              </Grid>
            )}

            {/* Description */}
            {selectedJob.description && (
              <Grid item xs={12}>
                <Typography sx={{fontSize:10,fontWeight:700,color:TEXT3,textTransform:'uppercase',
                  letterSpacing:'0.07em',mb:0.75}}>Job Description</Typography>
                <Typography sx={{fontSize:12,color:TEXT2,lineHeight:1.7,
                  bgcolor:BG,p:1.5,borderRadius:1.5,maxHeight:80,overflow:'hidden',
                  maskImage:'linear-gradient(to bottom, black 70%, transparent 100%)'}}>
                  {selectedJob.description}
                </Typography>
              </Grid>
            )}

            {/* Skills extracted from requirements */}
            {selectedJob.requirements && selectedJob.requirements.filter(r=>r.requirementType==='SKILL').length > 0 && (
              <Grid item xs={12}>
                {(() => {
                  const skills = selectedJob.requirements!.filter(r=>r.requirementType==='SKILL')
                  return (
                    <>
                      <Typography sx={{fontSize:10,fontWeight:700,color:TEXT3,textTransform:'uppercase',
                        letterSpacing:'0.07em',mb:0.75}}>
                        Required Skills ({skills.length})
                      </Typography>
                      <Box sx={{display:'flex',flexWrap:'wrap',gap:0.75}}>
                        {skills.map(r=>(
                          <Chip key={r.requirementValue} label={r.requirementValue}
                            size="small" color="primary" variant="outlined"
                            sx={{height:24,fontSize:11,fontWeight:500,
                              opacity:r.isMandatory===false?0.7:1}}/>
                        ))}
                      </Box>
                    </>
                  )
                })()}
              </Grid>
            )}
          </Grid>
        </Box>
      </Box>
    )}

    {!selectedJob && !loadingJobs && jobs.length === 0 && (
      <Box sx={{textAlign:'center',py:4,bgcolor:BG,borderRadius:2,border:`1px dashed ${BORDER}`,mt:2}}>
        <WorkIcon sx={{fontSize:36,color:TEXT3,mb:1}}/>
        <Typography sx={{fontSize:13,color:TEXT2,fontWeight:500}}>No job postings found</Typography>
        <Typography sx={{fontSize:11,color:TEXT3,mt:0.5}}>
          Create a job posting first from the Jobs section
        </Typography>
      </Box>
    )}
  </Box>
)

const CARD = '#FFFFFF'

// ── Main Page ─────────────────────────────────────────────────────────────────
const JobAnalysisPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0)   // 0 = Existing Job, 1 = Manual

  // Jobs for "Existing Job" tab
  const [jobs, setJobs]             = useState<Job[]>([])
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  // Manual form state
  const [manualDetails, setManualDetails] = useState({
    title:'', description:'', employmentType:'FULL_TIME', workMode:'HYBRID',
    minExperience:0, maxExperience:10, requiredSkills:[] as string[],
  })
  const [newSkill, setNewSkill] = useState('')

  // Upload + analysis state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [analyzing, setAnalyzing]         = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  // Popup state
  const [freshResults, setFreshResults] = useState<ResumeAnalysis[]>([])
  const [showPopup, setShowPopup]       = useState(false)
  const [popupJobTitle, setPopupJobTitle] = useState('')
  const [popupJobId, setPopupJobId]       = useState('')

  // Table state
  const [tableResults, setTableResults] = useState<ResumeAnalysis[]>([])

  // Detail dialogs
  const [viewResult, setViewResult] = useState<ResumeAnalysis | null>(null)
  const [editResult, setEditResult] = useState<ResumeAnalysis | null>(null)
  const [deleteId, setDeleteId]     = useState<string | null>(null)
  const [deleting, setDeleting]     = useState(false)

  const organizationId = localStorage.getItem('organizationId') || ''

  // Load previous analyses
  const fetchPrevious = useCallback(async () => {
    if (!organizationId) return
    try {
      const resp = await apiClient.get(
        `/resume-analysis/org?organizationId=${encodeURIComponent(organizationId)}&q=&size=200`
      )
      setTableResults(resp.data.content || [])
    } catch {}
  }, [organizationId])

  // Load jobs for existing job tab
  const fetchJobs = useCallback(async () => {
    if (!organizationId) return
    setLoadingJobs(true)
    try {
      // Endpoint: GET /api/v1/organizations/{orgId}/jobs/open → ApiResponse<List<JobDTO>>
      const resp = await apiClient.get(`/organizations/${organizationId}/jobs/open`)
      // ApiResponse wraps: { success, message, data: [...] }
      const jobList: Job[] = resp.data?.data ?? []
      setJobs(jobList)
    } catch {
      // Silently fall back to empty list
    } finally {
      setLoadingJobs(false)
    }
  }, [organizationId])

  useEffect(() => { fetchPrevious(); fetchJobs() }, [fetchPrevious, fetchJobs])

  // ── Derive job details for analysis based on active tab ─────────────────────
  const activeJobDetails = activeTab === 0 && selectedJob
    ? {
        id:            selectedJob.id,
        title:         selectedJob.title,
        description:   selectedJob.description   ?? '',
        employmentType:selectedJob.employmentType ?? 'FULL_TIME',
        workMode:      selectedJob.workMode       ?? 'HYBRID',
        minExperience: selectedJob.minExperienceYears ?? 0,
        maxExperience: selectedJob.maxExperienceYears ?? 10,
        // Extract skill names from requirements array
        requiredSkills: (selectedJob.requirements ?? [])
          .filter(r => r.requirementType === 'SKILL')
          .map(r => r.requirementValue),
      }
    : {
        id: `adhoc-${Date.now()}`,
        ...manualDetails,
      }

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleManualChange = (field: string, value: any) =>
    setManualDetails(p => ({ ...p, [field]: value }))

  const handleAddSkill = () => {
    if (newSkill.trim()) {
      setManualDetails(p => ({ ...p, requiredSkills:[...p.requiredSkills, newSkill.trim()] }))
      setNewSkill('')
    }
  }
  const handleRemoveSkill = (skill: string) =>
    setManualDetails(p => ({ ...p, requiredSkills:p.requiredSkills.filter(s=>s!==skill) }))

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setUploadedFiles(p=>[...p,...Array.from(e.target.files||[])])
  }
  const handleRemoveFile = (i: number) =>
    setUploadedFiles(p=>p.filter((_,idx)=>idx!==i))

  const canAnalyze = () => {
    if (uploadedFiles.length === 0) return false
    if (activeTab === 0) return !!selectedJob
    return !!manualDetails.title.trim()
  }

  const handleAnalyzeResumes = async () => {
    if (!canAnalyze()) {
      setError(uploadedFiles.length===0
        ? 'Please upload at least one resume'
        : activeTab===0 ? 'Please select a job posting' : 'Please enter a Job Title')
      return
    }
    setError(null); setAnalyzing(true)
    const jd = activeJobDetails
    try {
      const formData = new FormData()
      formData.append('organizationId', organizationId)
      formData.append('jobId',          jd.id ?? `adhoc-${Date.now()}`)
      formData.append('jobTitle',       jd.title)
      formData.append('jobDescription', jd.description)
      formData.append('minExperience',  String(jd.minExperience))
      formData.append('maxExperience',  String(jd.maxExperience))
      jd.requiredSkills.forEach(s=>formData.append('requiredSkills',s))
      uploadedFiles.forEach(f=>formData.append('files',f))

      const response = await apiClient.post('/resume-analysis/analyze', formData,
        { headers:{'Content-Type':'multipart/form-data'} })
      const results: ResumeAnalysis[] = response.data.results || []
      setFreshResults(results)
      setPopupJobTitle(jd.title)
      setPopupJobId(jd.id ?? '')
      setShowPopup(true)
      setUploadedFiles([])
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to analyze resumes')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleImport = async (selected: ResumeAnalysis[]) => {
    // Persist isApplied=true in DB so Dashboard picks them up
    try {
      await apiClient.patch('/resume-analysis/bulk-import', { ids: selected.map(r => r.id) })
    } catch { /* best-effort — still update UI */ }

    // Mark them as imported in local state
    const importedIds = new Set(selected.map(r => r.id))
    setTableResults(prev => {
      const existingIds = new Set(prev.map(r => r.id))
      // Update isApplied for existing rows
      const updated = prev.map(r => importedIds.has(r.id) ? { ...r, isApplied: true } : r)
      // Prepend brand-new ones (not yet in table)
      const newOnes = selected
        .filter(r => !existingIds.has(r.id))
        .map(r => ({ ...r, isApplied: true }))
      return [...newOnes, ...updated]
    })
    setShowPopup(false)
  }

  const handleRowImport = async (r: ResumeAnalysis) => {
    await handleImport([r])
  }

  const handleSavedEdit = (updated: ResumeAnalysis) =>
    setTableResults(prev=>prev.map(r=>r.id===updated.id?updated:r))

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await apiClient.delete(`/resume-analysis/${deleteId}?organizationId=${encodeURIComponent(organizationId)}`)
      setTableResults(prev=>prev.filter(r=>r.id!==deleteId))
      setDeleteId(null)
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Delete failed')
      setDeleteId(null)
    } finally { setDeleting(false) }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb:4 }}>
        <Typography variant="h4" sx={{ fontWeight:700, mb:0.5 }}>
          Resume Analysis & ATS Scoring
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Analyze resumes against job requirements using AI and import matching profiles
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb:3 }} onClose={()=>setError(null)}>{error}</Alert>
      )}

      {/* ── TABS ────────────────────────────────────────────────────────────── */}
      <Card sx={{ mb:3 }}>
        {/* Tab bar */}
        <Box sx={{
          borderBottom:`1px solid ${BORDER}`,
          background:`linear-gradient(135deg, #0B0F1A 0%, #1a2a45 100%)`,
          borderRadius:'12px 12px 0 0',
          px:0.5,
        }}>
          <Tabs
            value={activeTab}
            onChange={(_,v)=>setActiveTab(v)}
            sx={{
              minHeight:48,
              '& .MuiTab-root':{
                color:'rgba(255,255,255,0.55)',fontSize:13,fontWeight:600,
                textTransform:'none',minHeight:48,px:3,
                '&:hover':{color:'rgba(255,255,255,0.85)'},
              },
              '& .Mui-selected':{color:'#fff !important'},
              '& .MuiTabs-indicator':{
                bgcolor:ORANGE,height:3,borderRadius:'3px 3px 0 0',
              },
            }}
          >
            <Tab
              icon={<WorkIcon sx={{fontSize:16}}/>}
              iconPosition="start"
              label="Existing Job Posting"
            />
            <Tab
              icon={<TuneIcon sx={{fontSize:16}}/>}
              iconPosition="start"
              label="Manual Details"
            />
          </Tabs>
        </Box>

        <CardContent sx={{ pt:3 }}>
          {/* ── TAB 0: Existing Job ─────────────────────────────────────────── */}
          {activeTab === 0 && (
            <ExistingJobPanel
              jobs={jobs}
              loadingJobs={loadingJobs}
              selectedJob={selectedJob}
              onSelect={setSelectedJob}
            />
          )}

          {/* ── TAB 1: Manual Details ───────────────────────────────────────── */}
          {activeTab === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Job Title *" value={manualDetails.title}
                  onChange={e=>handleManualChange('title',e.target.value)}
                  placeholder="e.g., Senior React Developer" size="small"/>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth select label="Employment Type" value={manualDetails.employmentType}
                  onChange={e=>handleManualChange('employmentType',e.target.value)} size="small">
                  <MenuItem value="FULL_TIME">Full Time</MenuItem>
                  <MenuItem value="PART_TIME">Part Time</MenuItem>
                  <MenuItem value="CONTRACT">Contract</MenuItem>
                  <MenuItem value="INTERNSHIP">Internship</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth select label="Work Mode" value={manualDetails.workMode}
                  onChange={e=>handleManualChange('workMode',e.target.value)} size="small">
                  <MenuItem value="REMOTE">Remote</MenuItem>
                  <MenuItem value="HYBRID">Hybrid</MenuItem>
                  <MenuItem value="ON_SITE">On-Site</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth label="Min Experience (years)" type="number"
                  value={manualDetails.minExperience}
                  onChange={e=>handleManualChange('minExperience',parseInt(e.target.value))}
                  size="small" inputProps={{min:0}}/>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth label="Max Experience (years)" type="number"
                  value={manualDetails.maxExperience}
                  onChange={e=>handleManualChange('maxExperience',parseInt(e.target.value))}
                  size="small" inputProps={{min:0}}/>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Job Description" value={manualDetails.description}
                  onChange={e=>handleManualChange('description',e.target.value)}
                  placeholder="Enter job description and responsibilities"
                  multiline rows={3} size="small"/>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{display:'flex',gap:1,mb:1.5}}>
                  <TextField label="Add Required Skill" value={newSkill}
                    onChange={e=>setNewSkill(e.target.value)} size="small"
                    placeholder="e.g., React, TypeScript" sx={{flex:1}}
                    onKeyPress={e=>{if(e.key==='Enter')handleAddSkill()}}/>
                  <Button variant="outlined" onClick={handleAddSkill}
                    sx={{minWidth:100,borderColor:ORANGE,color:ORANGE,
                      '&:hover':{borderColor:ORANGE,bgcolor:ORANGE+'0A'}}}>
                    Add Skill
                  </Button>
                </Box>
                {manualDetails.requiredSkills.length>0&&(
                  <Box sx={{display:'flex',flexWrap:'wrap',gap:1}}>
                    {manualDetails.requiredSkills.map(skill=>(
                      <Chip key={skill} label={skill}
                        onDelete={()=>handleRemoveSkill(skill)}
                        color="primary" variant="outlined"/>
                    ))}
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* ── UPLOAD SECTION (shared) ──────────────────────────────────────────── */}
      <Card sx={{ mb:3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight:600, mb:2 }}>Upload Resumes</Typography>
          <Box
            component="label"
            sx={{
              display:'flex', alignItems:'center', gap:3,
              border:'2px dashed #ccc', borderRadius:2, p:3, cursor:'pointer',
              transition:'all 0.2s',
              '&:hover':{ borderColor:ORANGE, bgcolor:ORANGE+'05' },
            }}
          >
            <input type="file" multiple accept=".pdf,.doc,.docx" hidden onChange={handleFileUpload}/>
            <Box sx={{ display:'flex', flexDirection:'column', alignItems:'center', p:1.5,
              borderRadius:2, border:`1.5px dashed #ccc`, bgcolor:'#f8faff', minWidth:180 }}>
              <UploadIcon sx={{ fontSize:32, color:'#1976d2', mb:0.5 }}/>
              <Typography variant="caption" color="textSecondary" sx={{ textAlign:'center' }}>
                PDF, DOC, DOCX<br/>(Max 50MB each)
              </Typography>
            </Box>
            <Box>
              <Typography variant="body1" sx={{ fontWeight:600, mb:0.5 }}>
                Click to upload or drag and drop
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Upload one or more resume files to analyze against the selected job
              </Typography>
            </Box>
          </Box>

          {uploadedFiles.length>0&&(
            <Box sx={{mt:2}}>
              <Typography variant="subtitle2" sx={{fontWeight:600,mb:1}}>
                Queued Files ({uploadedFiles.length})
              </Typography>
              {uploadedFiles.map((file,index)=>(
                <Box key={index} sx={{
                  display:'flex',justifyContent:'space-between',alignItems:'center',
                  p:1.5,mb:1,bgcolor:'#f5f5f5',borderRadius:1,
                }}>
                  <Box>
                    <Typography variant="body2" sx={{fontWeight:500}}>{file.name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {(file.size/1024/1024).toFixed(2)} MB
                    </Typography>
                  </Box>
                  <Button size="small" color="error" onClick={()=>handleRemoveFile(index)}>Remove</Button>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── ANALYZE BUTTON (shared) ──────────────────────────────────────────── */}
      <Box sx={{ mb:2 }}>
        <Button
          variant="contained" size="large"
          startIcon={analyzing ? <CircularProgress size={20} color="inherit"/> : <AnalyzeIcon/>}
          onClick={handleAnalyzeResumes}
          disabled={analyzing || !canAnalyze()}
          sx={{
            px:4, py:1.5, fontSize:15, fontWeight:700, textTransform:'none',
            bgcolor:ORANGE, background:`linear-gradient(135deg, #6366F1, #C43A1D)`,
            boxShadow:`0 4px 14px ${ORANGE}40`,
            '&:hover':{ background:`linear-gradient(135deg, #D4441F, #B03318)` },
            '&:disabled':{ opacity:0.55 },
          }}
        >
          {analyzing ? 'Analyzing with AI…' : 'Analyze Resumes'}
        </Button>
        {!canAnalyze() && !analyzing && (
          <Typography sx={{ fontSize:11, color:TEXT3, mt:0.75, ml:0.5 }}>
            {uploadedFiles.length===0
              ? 'Upload at least one resume to continue'
              : activeTab===0 ? 'Select a job posting to continue'
              : 'Enter a job title to continue'}
          </Typography>
        )}
      </Box>

      {/* ── RESULTS TABLE ───────────────────────────────────────────────────── */}
      <ResultsTable
        results={tableResults}
        onView={setViewResult}
        onEdit={setEditResult}
        onDelete={setDeleteId}
        onImport={handleRowImport}
      />

      {/* Dialogs */}
      <AnalysisPopup open={showPopup} results={freshResults} jobId={popupJobId} jobTitle={popupJobTitle}
        onClose={()=>setShowPopup(false)} onImport={handleImport}/>
      <ViewDialog result={viewResult} onClose={()=>setViewResult(null)}/>
      <EditDialog result={editResult} organizationId={organizationId}
        onClose={()=>setEditResult(null)} onSaved={handleSavedEdit}/>
      <Dialog open={!!deleteId} onClose={()=>setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Analysis?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This will permanently remove this candidate's analysis record. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setDeleteId(null)} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} disabled={deleting}
            startIcon={deleting?<CircularProgress size={16} color="inherit"/>:<DeleteIcon/>}>
            {deleting?'Deleting…':'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default JobAnalysisPage
