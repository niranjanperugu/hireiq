import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Box, Typography, Button, Chip, Avatar, Divider,
  Select, MenuItem, FormControl, InputLabel, TextField,
  Collapse, IconButton, ToggleButtonGroup, ToggleButton,
  Table, TableBody, TableCell, TableRow, Tooltip, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Autocomplete,
} from '@mui/material'
import {
  ExpandMore, ExpandLess, Edit, CheckCircle, Cancel,
  PauseCircle, ArrowForward, NoteAlt, Send,
  Add, Groups, VideoCall, ContentCopy, OpenInNew,
  RadioButtonUnchecked, AssignmentTurnedIn, FlagOutlined, Schedule, EditCalendar, AccessTime,
} from '@mui/icons-material'
import {
  loadEvaluations, saveEvaluation, loadPanelMembers,
  DEFAULT_STAGES, uid, Evaluation, EvalType, RoundType, RoundStatus,
  InterviewRound, loadInterviewRounds, saveInterviewRound, deleteInterviewRound,
  InterviewSchedule, loadSchedules, saveSchedule,
  PipelineCandidate, loadPipeline, savePipeline, loadSettings,
  ShortlistRecord, saveShortlistRecord, getShortlistRecord,
  CandidateNote, loadCandidateNotes, saveCandidateNote,
  AppFlowEvent, saveAppFlowEvent, loadAppFlowEvents,
} from '@utils/pipelineStorage'
import { useAppSelector } from '@hooks/redux'
import apiClient from '@services/apiClient'
import { sendInterviewEmail, sendShortlistEmail, sendRejectionEmail, sendOfferEmail } from '@services/notificationApi'

// ── Tokens ────────────────────────────────────────────────────────────────────
const ORANGE = '#6366F1'
const BG     = '#EEF0FF'
const CARD   = '#FFFFFF'
const BORDER = '#E2E8F0'
const TEXT1  = '#1E293B'
const TEXT2  = '#64748B'
const TEXT3  = '#94A3B8'
const GREEN  = '#16A34A'
const PURPLE = '#7C3AED'

// ── Round type config ─────────────────────────────────────────────────────────
const ROUND_TYPES: { value: RoundType; label: string; color: string; evalDefault: EvalType }[] = [
  { value:'TECHNICAL',  label:'Technical',        color:'#2563EB', evalDefault:'TECHNICAL'     },
  { value:'BEHAVIORAL', label:'Behavioral',        color:'#7C3AED', evalDefault:'BEHAVIORAL'    },
  { value:'HR',         label:'HR Round',          color:'#DB2777', evalDefault:'COMMUNICATION' },
  { value:'LEADERSHIP', label:'Leadership',         color:'#D97706', evalDefault:'BEHAVIORAL'    },
  { value:'DESIGN',     label:'Design Review',      color:'#0891B2', evalDefault:'TECHNICAL'     },
  { value:'FINAL',      label:'Final Interview',    color:'#16A34A', evalDefault:'COMMUNICATION' },
]
const roundTypeCfg = (t: RoundType) => ROUND_TYPES.find(r=>r.value===t) ?? ROUND_TYPES[0]

const STATUS_CFG: Record<RoundStatus,{label:string;color:string;bg:string}> = {
  PENDING:     {label:'Pending',     color:'#D97706', bg:'#FEF9C3'},
  IN_PROGRESS: {label:'In Progress', color:'#2563EB', bg:'#DBEAFE'},
  COMPLETED:   {label:'Completed',   color:'#16A34A', bg:'#DCFCE7'},
}

// ── Eval type config ──────────────────────────────────────────────────────────
const SKILL_SETS: Record<EvalType, string[]> = {
  TECHNICAL:     ['Problem Solving','Code Quality','System Design','Architecture Knowledge','Tech Communication'],
  BEHAVIORAL:    ['Leadership','Teamwork','Adaptability','Initiative','Conflict Resolution'],
  COMMUNICATION: ['Clarity','Active Listening','Articulation','Confidence','Presentation Skills'],
}
const EVAL_LABELS: Record<EvalType,string> = {
  TECHNICAL:'Technical', BEHAVIORAL:'Behavioral', COMMUNICATION:'Communication',
}
const EVAL_COLORS: Record<EvalType,string> = {
  TECHNICAL:'#2563EB', BEHAVIORAL:'#7C3AED', COMMUNICATION:'#059669',
}
const RATING_LABELS: Record<number,string> = {
  1:'Poor',2:'Fair',3:'Average',4:'Good',5:'Excellent',
}
const REC_OPTIONS = [
  {value:'ADVANCE',label:'Proceed to Next Round'},
  {value:'HIRE',   label:'Strong Hire'},
  {value:'HOLD',   label:'Hold – Review Later'},
  {value:'REJECT', label:'Do Not Proceed'},
]
const REC_COLORS: Record<string,string> = {
  ADVANCE:'#2563EB',HIRE:'#16A34A',HOLD:'#D97706',REJECT:'#DC2626',
}
const ROLE_DISPLAY: Record<string,string> = {
  HR_ADMINISTRATOR:'HR Administrator',HIRING_MANAGER:'Hiring Manager',
  RECRUITER:'Recruiter',INTERVIEW_PANEL_MEMBER:'Panel Member',
}

// ── Star components ───────────────────────────────────────────────────────────
const STAR_CLIP = 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)'
function StarRow({value,max=5}:{value:number;max?:number}) {
  return (
    <Box sx={{display:'flex',gap:0.3}}>
      {Array.from({length:max}).map((_,i)=>(
        <Box key={i} component="span" sx={{
          display:'inline-block',width:13,height:13,flexShrink:0,
          clipPath:STAR_CLIP, bgcolor:i<value?'#F59E0B':'#CBD5E1',
        }}/>
      ))}
    </Box>
  )
}
function StarPicker({value,onChange}:{value:number;onChange:(v:number)=>void}) {
  const [hover,setHover] = useState(0)
  return (
    <Box sx={{display:'flex',alignItems:'center',gap:0.5}}>
      {[1,2,3,4,5].map(i=>(
        <Box key={i} component="span"
          onClick={()=>onChange(i)} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(0)}
          sx={{ display:'inline-block',width:22,height:22,cursor:'pointer',flexShrink:0,
            clipPath:STAR_CLIP, bgcolor:i<=(hover||value)?'#F59E0B':'#CBD5E1',
            transition:'transform 0.1s', transform:i===(hover||value)?'scale(1.2)':'scale(1)' }}/>
      ))}
      {value>0 && <Typography sx={{fontSize:12,color:TEXT2,fontWeight:600,ml:0.5}}>
        {value} – {RATING_LABELS[value]}
      </Typography>}
    </Box>
  )
}
function RecBadge({rec}:{rec:string}) {
  const label = REC_OPTIONS.find(r=>r.value===rec)?.label ?? rec
  const color = REC_COLORS[rec] ?? TEXT2
  return <Chip label={label} size="small" sx={{height:22,fontSize:11,fontWeight:700,borderRadius:1,
    bgcolor:color+'18',color,border:`1px solid ${color}35`}}/>
}

// ── Feedback form (used inside each round card) ───────────────────────────────
interface FeedbackFormProps {
  round: InterviewRound
  jobId: string
  jobTitle: string
  candidateId: string
  candidateName: string
  authName: string
  authEmail: string
  authRole: string
  authRoleLabel: string
  submitterOptions: {id:string;name:string;position:string;email:string;color:string}[]
  editEval?: Evaluation
  onSaved: () => void
  onCancel: () => void
}

function FeedbackForm({round,jobId,jobTitle,candidateId,candidateName,
  authName,authEmail,authRole,authRoleLabel,submitterOptions,editEval,onSaved,onCancel}: FeedbackFormProps) {
  const defaultType = roundTypeCfg(round.type).evalDefault
  const [submitterId, setSubmitterId] = useState(()=>{
    if (editEval) return submitterOptions.find(s=>s.email===editEval.submitterEmail)?.id ?? '__hr__'
    return '__hr__'
  })
  const [evalType,    setEvalType]    = useState<EvalType>(editEval?.evaluationType ?? defaultType)
  const [skills,      setSkills]      = useState(()=>
    editEval?.skillRatings?.length ? editEval.skillRatings : SKILL_SETS[editEval?.evaluationType??defaultType].map(s=>({skill:s,rating:0}))
  )
  const [techComment, setTechComment] = useState(editEval?.technicalComments ?? '')
  const [behaComment, setBehaComment] = useState(editEval?.behavioralComments ?? '')
  const [commComment, setCommComment] = useState(editEval?.communicationComments ?? '')
  const [overallRating, setOverall]   = useState(editEval?.overallRating ?? 0)
  const [recommendation,setRec]       = useState<'ADVANCE'|'HIRE'|'REJECT'|'HOLD'>(editEval?.recommendation ?? 'ADVANCE')

  const switchType = (type: EvalType) => {
    setEvalType(type)
    if (!editEval) setSkills(SKILL_SETS[type].map(s=>({skill:s,rating:0})))
  }
  const setSkillRating = (skill:string,rating:number) =>
    setSkills(prev=>prev.map(s=>s.skill===skill?{...s,rating}:s))

  const active = submitterOptions.find(s=>s.id===submitterId) ?? submitterOptions[0]
  const typeColor = EVAL_COLORS[evalType]

  const save = (isDraft: boolean) => {
    const ev: Evaluation = {
      id: editEval?.id ?? uid(),
      jobId, jobTitle, candidateId, candidateName,
      stageId: round.id, stageName: round.title,
      interviewRoundId: round.id,
      panelMember: active.name, submitterEmail: active.email,
      evaluationType: evalType,
      skillRatings: skills.filter(s=>s.rating>0),
      technicalComments:     evalType==='TECHNICAL'     ? techComment : '',
      behavioralComments:    evalType==='BEHAVIORAL'    ? behaComment : '',
      communicationComments: evalType==='COMMUNICATION' ? commComment : '',
      overallRating: overallRating||3,
      comments: [techComment,behaComment,commComment].filter(Boolean).join('\n\n'),
      recommendation, submittedAt: new Date().toISOString(), isDraft,
    }
    saveEvaluation(ev)
    onSaved()
  }

  return (
    <Box sx={{borderTop:`1px solid ${BORDER}`,pt:2,mt:1}}>
      <Typography sx={{fontSize:11,fontWeight:700,color:TEXT2,mb:1.5,
        textTransform:'uppercase',letterSpacing:'0.08em'}}>
        {editEval ? 'Edit Feedback' : 'Add Feedback'}
      </Typography>

      {/* Submitting As + Eval Type */}
      <Box sx={{display:'grid',gridTemplateColumns:'1fr auto',gap:1.5,mb:2}}>
        <FormControl size="small" fullWidth>
          <InputLabel sx={{fontSize:12}}>Submitting As</InputLabel>
          <Select value={submitterId} label="Submitting As"
            onChange={e=>setSubmitterId(e.target.value)}
            renderValue={v=>{
              const s=submitterOptions.find(o=>o.id===v)
              return <Box sx={{display:'flex',alignItems:'center',gap:1}}>
                <Avatar sx={{width:18,height:18,fontSize:8,fontWeight:700,bgcolor:s?.color+'30',color:s?.color}}>
                  {s?.name.split(' ').map(w=>w[0]).join('').slice(0,2)}
                </Avatar>
                <Typography sx={{fontSize:12}}>{s?.name}</Typography>
              </Box>
            }}
            sx={{fontSize:12}}>
            {submitterOptions.map(s=>(
              <MenuItem key={s.id} value={s.id} sx={{gap:1,py:0.75}}>
                <Avatar sx={{width:24,height:24,fontSize:9,fontWeight:700,bgcolor:s.color+'25',color:s.color}}>
                  {s.name.split(' ').map(w=>w[0]).join('').slice(0,2)}
                </Avatar>
                <Box>
                  <Typography sx={{fontSize:12,fontWeight:600,lineHeight:1.2}}>{s.name}</Typography>
                  <Typography sx={{fontSize:10,color:TEXT3}}>{s.position}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <ToggleButtonGroup value={evalType} exclusive size="small"
          onChange={(_,v)=>v&&switchType(v as EvalType)}
          sx={{ height:40,
            '& .MuiToggleButton-root':{fontSize:11,fontWeight:600,px:1.25,textTransform:'none',borderColor:BORDER,color:TEXT2},
            '& .Mui-selected':{bgcolor:`${typeColor}18 !important`,color:`${typeColor} !important`,borderColor:`${typeColor}50 !important`},
          }}>
          {(Object.keys(SKILL_SETS) as EvalType[]).map(t=>(
            <ToggleButton key={t} value={t} sx={{whiteSpace:'nowrap'}}>{EVAL_LABELS[t]}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Skill ratings */}
      <Box sx={{mb:2,bgcolor:BG,borderRadius:1.5,p:1.75,border:`1px solid ${BORDER}`}}>
        <Typography sx={{fontSize:10,fontWeight:700,color:TEXT3,textTransform:'uppercase',
          letterSpacing:'0.08em',mb:1.25,color:typeColor}}>
          {EVAL_LABELS[evalType]} Skill Ratings
        </Typography>
        {skills.map(sr=>(
          <Box key={sr.skill} sx={{display:'flex',alignItems:'center',mb:1.25,'&:last-child':{mb:0}}}>
            <Typography sx={{width:170,fontSize:12,color:TEXT2,fontWeight:500,flexShrink:0}}>{sr.skill}</Typography>
            <StarPicker value={sr.rating} onChange={v=>setSkillRating(sr.skill,v)}/>
          </Box>
        ))}
      </Box>

      {/* Comment */}
      <TextField fullWidth multiline rows={2} size="small"
        label={`${EVAL_LABELS[evalType]} Comments`}
        placeholder="Observations, strengths, concerns…"
        value={evalType==='TECHNICAL' ? techComment : evalType==='BEHAVIORAL' ? behaComment : commComment}
        onChange={e=>{
          if(evalType==='TECHNICAL')     setTechComment(e.target.value)
          if(evalType==='BEHAVIORAL')    setBehaComment(e.target.value)
          if(evalType==='COMMUNICATION') setCommComment(e.target.value)
        }}
        sx={{mb:2,'& .MuiOutlinedInput-root':{fontSize:13,bgcolor:BG}}}/>

      {/* Rating + Recommend */}
      <Box sx={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1.5,mb:2}}>
        <FormControl size="small" fullWidth>
          <InputLabel sx={{fontSize:12}}>Overall Rating</InputLabel>
          <Select value={overallRating} label="Overall Rating"
            onChange={e=>setOverall(Number(e.target.value))} displayEmpty
            renderValue={v=>v===0
              ? <Typography sx={{color:TEXT3,fontSize:12}}>Select…</Typography>
              : <Box sx={{display:'flex',alignItems:'center',gap:1}}>
                  <StarRow value={v as number}/>
                  <Typography sx={{fontSize:11,color:TEXT2,fontWeight:600}}>
                    {v} – {RATING_LABELS[v as number]}
                  </Typography>
                </Box>}
            sx={{fontSize:12}}>
            {[1,2,3,4,5].map(n=>(
              <MenuItem key={n} value={n} sx={{gap:1,py:0.75}}>
                <StarRow value={n}/>
                <Typography sx={{fontSize:12,fontWeight:600}}>{n} – {RATING_LABELS[n]}</Typography>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel sx={{fontSize:12}}>Recommend</InputLabel>
          <Select value={recommendation} label="Recommend"
            onChange={e=>setRec(e.target.value as any)} sx={{fontSize:12}}>
            {REC_OPTIONS.map(o=>(
              <MenuItem key={o.value} value={o.value}>
                <Box sx={{display:'flex',alignItems:'center',gap:1}}>
                  {o.value==='ADVANCE'?<ArrowForward sx={{fontSize:13,color:'#2563EB'}}/>
                  :o.value==='HIRE'   ?<CheckCircle  sx={{fontSize:13,color:'#16A34A'}}/>
                  :o.value==='HOLD'   ?<PauseCircle  sx={{fontSize:13,color:'#D97706'}}/>
                  :<Cancel sx={{fontSize:13,color:'#DC2626'}}/>}
                  <Typography sx={{fontSize:12}}>{o.label}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{display:'flex',justifyContent:'flex-end',gap:1}}>
        <Button size="small" onClick={onCancel}
          sx={{fontSize:12,textTransform:'none',color:TEXT2,borderColor:BORDER,border:'1px solid',
            '&:hover':{bgcolor:BG}}}>Cancel</Button>
        <Button size="small" onClick={()=>save(true)}
          sx={{fontSize:12,textTransform:'none',color:TEXT2,borderColor:BORDER,border:'1px solid',
            '&:hover':{bgcolor:BG}}}>Save Draft</Button>
        <Button variant="contained" color="primary" size="small"
          disabled={overallRating===0}
          startIcon={<Send sx={{fontSize:13}}/>}
          onClick={()=>save(false)}
          sx={{fontSize:12,textTransform:'none',fontWeight:700}}>
          Submit
        </Button>
      </Box>
    </Box>
  )
}

// ── Feedback mini-card inside round ──────────────────────────────────────────
function FeedbackMini({ev,canEdit,onEdit}:
  {ev:Evaluation;canEdit:boolean;onEdit:()=>void}) {
  const [expanded,setExpanded]=useState(true) // default expanded
  const typeColor = ev.evaluationType ? EVAL_COLORS[ev.evaluationType] : TEXT2
  return (
    <Box sx={{border:`1px solid ${BORDER}`,borderRadius:1.5,overflow:'hidden',mb:1}}>
      <Box sx={{display:'flex',alignItems:'center',gap:1,px:1.5,py:1,
        bgcolor:ev.isDraft?'#FFFBEB':CARD,
        borderBottom:expanded?`1px solid ${BORDER}`:'none'}}>
        <Avatar sx={{width:26,height:26,fontSize:10,fontWeight:700,flexShrink:0,
          bgcolor:typeColor+'25',color:typeColor}}>
          {ev.panelMember.split(' ').map((w:string)=>w[0]).join('').slice(0,2)}
        </Avatar>
        <Box sx={{flex:1,minWidth:0}}>
          <Box sx={{display:'flex',alignItems:'center',gap:0.75,flexWrap:'wrap'}}>
            <Typography sx={{fontSize:12,fontWeight:700,color:TEXT1}}>{ev.panelMember}</Typography>
            {ev.evaluationType && <Chip label={EVAL_LABELS[ev.evaluationType]} size="small"
              sx={{height:17,fontSize:9,fontWeight:700,borderRadius:1,
                bgcolor:typeColor+'15',color:typeColor,border:`1px solid ${typeColor}30`}}/>}
            {ev.isDraft && <Chip label="Draft" size="small"
              sx={{height:17,fontSize:9,bgcolor:'#FEF9C3',color:'#92400E',borderRadius:1}}/>}
            <RecBadge rec={ev.recommendation}/>
          </Box>
        </Box>
        <StarRow value={ev.overallRating}/>
        {canEdit && (
          <Tooltip title="Edit"><IconButton size="small" onClick={onEdit}
            sx={{color:ORANGE,p:0.25,'&:hover':{bgcolor:ORANGE+'12'}}}>
            <Edit sx={{fontSize:13}}/>
          </IconButton></Tooltip>
        )}
        <IconButton size="small" onClick={()=>setExpanded(e=>!e)} sx={{color:TEXT3,p:0.25}}>
          {expanded?<ExpandLess sx={{fontSize:15}}/>:<ExpandMore sx={{fontSize:15}}/>}
        </IconButton>
      </Box>
      <Collapse in={expanded}>
        <Box sx={{px:2,py:1.5,bgcolor:BG}}>
          {ev.skillRatings?.length>0 && (
            <Table size="small" sx={{'& td':{border:'none',py:0.4,px:0}}}>
              <TableBody>
                {ev.skillRatings.map((sr:any)=>(
                  <TableRow key={sr.skill}>
                    <TableCell sx={{width:160}}><Typography sx={{fontSize:11,color:TEXT2}}>{sr.skill}</Typography></TableCell>
                    <TableCell><StarRow value={sr.rating}/></TableCell>
                    <TableCell><Typography sx={{fontSize:10,color:TEXT3}}>{RATING_LABELS[sr.rating]}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {[
            {label:'Technical',    text:ev.technicalComments,    color:EVAL_COLORS.TECHNICAL},
            {label:'Behavioral',   text:ev.behavioralComments,   color:EVAL_COLORS.BEHAVIORAL},
            {label:'Communication',text:ev.communicationComments,color:EVAL_COLORS.COMMUNICATION},
          ].filter(c=>c.text).map(c=>(
            <Box key={c.label} sx={{mt:1}}>
              <Typography sx={{fontSize:9,color:c.color,fontWeight:700,mb:0.25}}>{c.label}</Typography>
              <Typography sx={{fontSize:12,color:TEXT2,lineHeight:1.6,
                bgcolor:CARD,p:1,borderRadius:1,borderLeft:`2px solid ${c.color}`}}>
                {c.text}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  )
}

// ── Round card ─────────────────────────────────────────────────────────────────
interface RoundCardProps {
  round: InterviewRound
  allEvals: Evaluation[]
  authName: string
  authEmail: string
  authRole: string
  authRoleLabel: string
  submitterOptions: {id:string;name:string;position:string;email:string;color:string}[]
  jobId: string
  jobTitle: string
  candidateId: string
  candidateName: string
  onRoundChange: () => void
  schedule?: InterviewSchedule
  onEditSchedule: (round: InterviewRound, existing?: InterviewSchedule) => void
}

function RoundCard({round,allEvals,authName,authEmail,authRole,authRoleLabel,
  submitterOptions,jobId,jobTitle,candidateId,candidateName,onRoundChange,
  schedule,onEditSchedule}: RoundCardProps) {
  const cfg = roundTypeCfg(round.type)
  const evals = allEvals.filter(e=>e.interviewRoundId===round.id)
  const [showForm, setShowForm]     = useState(false)
  const [editEval, setEditEval]     = useState<Evaluation|undefined>()
  const [collapsed, setCollapsed]   = useState(false)

  // Auto-derive status
  const autoStatus: RoundStatus = evals.filter(e=>!e.isDraft).length === 0 ? 'PENDING'
    : evals.filter(e=>!e.isDraft).length >= round.assignedPanelMemberIds.length
      ? 'COMPLETED' : 'IN_PROGRESS'
  const stCfg = STATUS_CFG[round.status || autoStatus]

  const canEditEval = (ev: Evaluation) =>
    ev.submitterEmail===authEmail || authRole==='HR_ADMINISTRATOR'

  const markComplete = () => {
    saveInterviewRound({...round, status:'COMPLETED'})
    onRoundChange()
  }

  // Which panel members haven't submitted yet
  const submittedEmails = evals.filter(e=>!e.isDraft).map(e=>e.submitterEmail)
  const pendingMembers  = submitterOptions.filter(s=>
    round.assignedPanelMemberIds.includes(s.id) && !submittedEmails.includes(s.email)
  )

  return (
    <Box sx={{ border:`1.5px solid ${BORDER}`, borderRadius:2.5, overflow:'hidden', mb:2.5,
      boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>

      {/* Round header */}
      <Box sx={{ px:2.5, py:1.75, bgcolor:CARD, borderBottom:`1px solid ${BORDER}`,
        display:'flex', alignItems:'center', gap:1.5 }}>
        <Box sx={{ width:4, height:36, borderRadius:99, bgcolor:cfg.color, flexShrink:0 }}/>
        <Box sx={{ flex:1, minWidth:0 }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1, flexWrap:'wrap' }}>
            <Typography sx={{ fontSize:14, fontWeight:800, color:TEXT1 }}>{round.title}</Typography>
            <Chip label={cfg.label} size="small"
              sx={{ height:20, fontSize:10, fontWeight:700, borderRadius:1,
                bgcolor:cfg.color+'15', color:cfg.color, border:`1px solid ${cfg.color}30` }}/>
            <Chip label={stCfg.label} size="small"
              sx={{ height:20, fontSize:10, fontWeight:700, borderRadius:1,
                bgcolor:stCfg.bg, color:stCfg.color }}/>
          </Box>
          <Typography sx={{ fontSize:11, color:TEXT3 }}>
            Created by {round.createdBy} · {new Date(round.createdAt).toLocaleDateString('en-US',
              {month:'short',day:'numeric',year:'numeric'})}
          </Typography>
        </Box>
        <Box sx={{ display:'flex', gap:0.5, flexShrink:0, alignItems:'center' }}>
          {schedule && (
            <Chip
              icon={<AccessTime sx={{fontSize:'11px !important'}}/>}
              label={new Date(schedule.dateTime).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
              size="small"
              sx={{ height:20, fontSize:10, fontWeight:600, bgcolor:'#6366F115', color:ORANGE,
                border:`1px solid ${ORANGE}30`, cursor:'pointer' }}
              onClick={()=>onEditSchedule(round, schedule)}
            />
          )}
          <Tooltip title={schedule ? 'Edit Schedule' : 'Schedule Interview'}>
            <IconButton size="small" onClick={()=>onEditSchedule(round, schedule)}
              sx={{ color: schedule ? ORANGE : TEXT3, '&:hover':{ bgcolor:ORANGE+'12', color:ORANGE } }}>
              <EditCalendar sx={{fontSize:17}}/>
            </IconButton>
          </Tooltip>
          {round.status!=='COMPLETED' && (
            <Tooltip title="Mark as Completed">
              <IconButton size="small" onClick={markComplete}
                sx={{ color:GREEN, '&:hover':{ bgcolor:GREEN+'12' } }}>
                <AssignmentTurnedIn sx={{fontSize:17}}/>
              </IconButton>
            </Tooltip>
          )}
          <IconButton size="small" onClick={()=>setCollapsed(c=>!c)} sx={{color:TEXT3}}>
            {collapsed ? <ExpandMore sx={{fontSize:18}}/> : <ExpandLess sx={{fontSize:18}}/>}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={!collapsed}>
        <Box sx={{ px:2.5, py:2, bgcolor:BG }}>

          {/* ── Interview schedule details ── */}
          {schedule && (
            <Box sx={{ mb:2, p:1.75, borderRadius:2, bgcolor:CARD,
              border:`1.5px solid ${ORANGE}25`, display:'grid',
              gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:1.5 }}>
              <Box>
                <Typography sx={{fontSize:9,fontWeight:700,color:TEXT3,textTransform:'uppercase',letterSpacing:'0.08em',mb:0.4}}>DATE & TIME</Typography>
                <Typography sx={{fontSize:13,fontWeight:700,color:TEXT1}}>
                  {new Date(schedule.dateTime).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}
                </Typography>
                <Typography sx={{fontSize:12,color:ORANGE,fontWeight:600}}>
                  {new Date(schedule.dateTime).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{fontSize:9,fontWeight:700,color:TEXT3,textTransform:'uppercase',letterSpacing:'0.08em',mb:0.4}}>FORMAT</Typography>
                <Box sx={{display:'flex',alignItems:'center',gap:0.5}}>
                  {schedule.type==='VIDEO'     && <VideoCall sx={{fontSize:16,color:'#38BDF8'}}/>}
                  {schedule.type==='PHONE'     && <Typography sx={{fontSize:14}}>📞</Typography>}
                  {schedule.type==='IN_PERSON' && <Typography sx={{fontSize:14}}>🏢</Typography>}
                  <Typography sx={{fontSize:12,fontWeight:600,color:TEXT1}}>
                    {schedule.type.replace('_',' ')}
                  </Typography>
                </Box>
              </Box>
              {schedule.panelMembers.length>0 && (
                <Box sx={{gridColumn:'1 / -1'}}>
                  <Typography sx={{fontSize:9,fontWeight:700,color:TEXT3,textTransform:'uppercase',letterSpacing:'0.08em',mb:0.4}}>PANEL</Typography>
                  <Typography sx={{fontSize:12,color:TEXT2}}>{schedule.panelMembers.join(' · ')}</Typography>
                </Box>
              )}
              {schedule.meetingLink && (
                <Box sx={{gridColumn:'1 / -1'}}>
                  <Typography sx={{fontSize:9,fontWeight:700,color:TEXT3,textTransform:'uppercase',letterSpacing:'0.08em',mb:0.4}}>MEETING LINK</Typography>
                  <Typography component="a" href={schedule.meetingLink} target="_blank"
                    sx={{fontSize:11,color:'#38BDF8',wordBreak:'break-all',textDecoration:'none','&:hover':{textDecoration:'underline'}}}>
                    {schedule.meetingLink}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Panel members */}
          {round.assignedPanelMemberIds.length>0 && (
            <Box sx={{ mb:2 }}>
              <Typography sx={{ fontSize:10, fontWeight:700, color:TEXT3,
                textTransform:'uppercase', letterSpacing:'0.08em', mb:1 }}>
                Panel Members ({round.assignedPanelMemberIds.length})
              </Typography>
              <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.75 }}>
                {round.assignedPanelMemberNames.map((name, i) => {
                  const hasSubmitted = submittedEmails.includes(
                    submitterOptions.find(s=>s.id===round.assignedPanelMemberIds[i])?.email
                  )
                  return (
                    <Box key={i} sx={{ display:'flex', alignItems:'center', gap:0.75,
                      px:1, py:0.4, borderRadius:1.5, bgcolor:CARD, border:`1px solid ${BORDER}` }}>
                      <Avatar sx={{ width:20, height:20, fontSize:9, fontWeight:700,
                        bgcolor: hasSubmitted ? GREEN+'25' : BORDER,
                        color:   hasSubmitted ? GREEN : TEXT3 }}>
                        {name.split(' ').map(w=>w[0]).join('').slice(0,2)}
                      </Avatar>
                      <Typography sx={{ fontSize:12, color:TEXT1, fontWeight:500 }}>{name}</Typography>
                      {hasSubmitted
                        ? <CheckCircle sx={{fontSize:13,color:GREEN}}/>
                        : <RadioButtonUnchecked sx={{fontSize:13,color:TEXT3}}/>}
                    </Box>
                  )
                })}
              </Box>
            </Box>
          )}

          {/* Submitted feedback */}
          {evals.length > 0 && (
            <Box sx={{ mb:2 }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:1 }}>
                <Typography sx={{ fontSize:10, fontWeight:700, color:TEXT3,
                  textTransform:'uppercase', letterSpacing:'0.08em', flex:1 }}>
                  Feedback ({evals.length})
                </Typography>
                {pendingMembers.length > 0 && (
                  <Typography sx={{ fontSize:10, color:'#D97706' }}>
                    {pendingMembers.length} pending
                  </Typography>
                )}
              </Box>
              {evals.map(ev=>(
                <FeedbackMini key={ev.id} ev={ev}
                  canEdit={canEditEval(ev)}
                  onEdit={()=>{ setEditEval(ev); setShowForm(true) }}
                />
              ))}
            </Box>
          )}

          {/* Pending notice */}
          {evals.length===0 && round.assignedPanelMemberIds.length>0 && (
            <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:2,
              p:1.25, bgcolor:CARD, borderRadius:1.5, border:`1px dashed ${BORDER}` }}>
              <FlagOutlined sx={{fontSize:16,color:TEXT3}}/>
              <Typography sx={{ fontSize:12, color:TEXT2 }}>
                Awaiting feedback from {round.assignedPanelMemberNames.join(', ')}
              </Typography>
            </Box>
          )}

          {/* Add Feedback button + inline form */}
          {!showForm ? (
            <Button size="small" variant="outlined"
              startIcon={<Add sx={{fontSize:14}}/>}
              onClick={()=>{ setEditEval(undefined); setShowForm(true) }}
              sx={{ fontSize:12, textTransform:'none', fontWeight:600,
                borderColor:ORANGE, color:ORANGE,
                '&:hover':{ bgcolor:ORANGE+'08', borderColor:ORANGE } }}>
              Add Feedback
            </Button>
          ) : (
            <FeedbackForm
              round={round} jobId={jobId} jobTitle={jobTitle}
              candidateId={candidateId} candidateName={candidateName}
              authName={authName} authEmail={authEmail}
              authRole={authRole} authRoleLabel={authRoleLabel}
              submitterOptions={submitterOptions}
              editEval={editEval}
              onSaved={()=>{ setShowForm(false); setEditEval(undefined); onRoundChange() }}
              onCancel={()=>{ setShowForm(false); setEditEval(undefined) }}
            />
          )}
        </Box>
      </Collapse>
    </Box>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  jobId: string
  jobTitle: string
  candidateId: string
  candidateName: string
  candidateEmail?: string
  candidateRole?: string
  atsScore?: number
  appliedAt?: string
  stages?: {id:string;label:string;type?:string}[]
  onStageChange?: (stageName: string, stageColor: string) => void
}

// ── Email template types ───────────────────────────────────────────────────────
type EmailTemplate = 'shortlist' | 'offer' | 'rejection' | 'interview' | 'custom'
const EMAIL_TEMPLATES: { value: EmailTemplate; label: string; color: string; icon: string }[] = [
  { value: 'shortlist',  label: 'Shortlist Notification', color: '#16A34A', icon: '✓' },
  { value: 'offer',      label: 'Offer Letter',           color: '#6366F1', icon: '◎' },
  { value: 'rejection',  label: 'Rejection',              color: '#DC2626', icon: '✕' },
  { value: 'interview',  label: 'Interview Invitation',   color: '#2563EB', icon: '⊕' },
  { value: 'custom',     label: 'Custom Email',           color: '#7C3AED', icon: '✎' },
]

// ── Email action types ────────────────────────────────────────────────────────
type ActionType = 'selected' | 'offer' | 'reject' | null

// ── Main ──────────────────────────────────────────────────────────────────────
export default function InterviewRoundsTab({
  jobId,jobTitle,candidateId,candidateName,candidateEmail,candidateRole,atsScore,appliedAt,onStageChange,
}: Props) {
  const auth         = useAppSelector(s=>s.auth)
  const panelMembers = loadPanelMembers()
  const settings     = loadSettings()

  // ── Action email dialog state ─────────────────────────────────────────────
  const [actionType,    setActionType]    = useState<ActionType>(null)
  const [actionSubject, setActionSubject] = useState('')
  const [actionBody,    setActionBody]    = useState('')
  const [actionSending, setActionSending] = useState(false)
  const [sendEmailOpen, setSendEmailOpen] = useState(false)   // template picker dialog

  const authName      = `${auth.user?.firstName??''} ${auth.user?.lastName??''}`.trim()||'HR Admin'
  const authEmail     = auth.user?.email ?? ''
  const authRole      = (auth.user?.role as string) ?? 'HR_ADMINISTRATOR'
  const authRoleLabel = ROLE_DISPLAY[authRole] ?? authRole

  const submitterOptions = [
    {id:'__hr__',name:authName,position:authRoleLabel,email:authEmail,color:ORANGE},
    ...panelMembers.map(m=>({id:m.id,name:m.name,position:m.position,email:m.email,color:m.avatarColor})),
  ]

  // ── Panels ────────────────────────────────────────────────────────────────
  const [showAddRound,  setShowAddRound]  = useState(false)
  const [showNoteForm,  setShowNoteForm]  = useState(false)

  // ── Shortlist record (read-only, for timeline display) ────────────────────
  const [shortlistRecord, setShortlistRecord] = useState<ShortlistRecord|null>(null)

  useEffect(()=>{
    setShortlistRecord(getShortlistRecord(candidateId, jobId))
  },[candidateId,jobId])

  // ── Rounds ────────────────────────────────────────────────────────────────
  const [roundsVer, setRoundsVer] = useState(0)
  const rounds = useMemo(()=>loadInterviewRounds(candidateId, jobId),[candidateId,jobId,roundsVer])

  const [allEvals, setAllEvals] = useState<Evaluation[]>([])
  useEffect(()=>{
    setAllEvals(loadEvaluations().filter(e=>e.candidateId===candidateId&&e.jobId===jobId))
  },[candidateId,jobId,roundsVer])

  const [storedEvents, setStoredEvents] = useState<AppFlowEvent[]>([])
  useEffect(()=>{
    setStoredEvents(loadAppFlowEvents(candidateId, jobId))
  },[candidateId,jobId,roundsVer])

  const refreshRounds = useCallback(()=>setRoundsVer(v=>v+1),[])

  // ── Move candidate to a pipeline stage ───────────────────────────────────
  const moveToStage = (stageType: 'shortlist' | 'offer' | 'rejected') => {
    const pl     = loadPipeline(jobId)
    const stages = pl.stages.length ? pl.stages : DEFAULT_STAGES
    const target = stages.find(s => s.type === stageType)
    if (!target) return
    pl.stageMap[candidateId] = target.id
    savePipeline(jobId, pl)
    saveAppFlowEvent({
      id: uid(), candidateId, jobId,
      type: 'STATUS_CHANGE',
      label: `Stage changed to ${target.label}`,
      by: authName, byRole: authRoleLabel,
      timestamp: new Date().toISOString(),
    })
    onStageChange?.(target.label, target.color)
    setStoredEvents(loadAppFlowEvents(candidateId, jobId))
  }

  // ── Build email body for a template ──────────────────────────────────────
  const buildTemplate = (tmpl: EmailTemplate) => {
    let subject = '', body = ''
    if (tmpl === 'shortlist' || tmpl === 'selected' as any) {
      subject = `Congratulations! You've been selected – ${jobTitle}`
      body = `Dear ${candidateName},\n\nWe are thrilled to inform you that after careful consideration, you have been selected for the position of ${jobTitle}.\n\nYour skills, experience, and enthusiasm impressed our team, and we are excited to welcome you to the next stage of our recruitment process.\n\nOur HR team will reach out to you shortly with the details regarding the next steps, including scheduling, documentation, and further information about the role.\n\nCongratulations once again! We look forward to working with you.\n\nBest regards,\nHR Team`
    } else if (tmpl === 'offer') {
      subject = `Offer Letter – ${jobTitle}`
      body = `Dear ${candidateName},\n\nWe are pleased to extend this formal offer of employment for the position of ${jobTitle}.\n\nPlease find the details of your offer below:\n• Position: ${jobTitle}\n• Start Date: [To be confirmed]\n• Compensation: [To be confirmed]\n• Benefits: [To be confirmed]\n\nKindly review and revert with your acceptance at the earliest. Should you have any questions, please don't hesitate to reach out.\n\nWe look forward to welcoming you to the team.\n\nBest regards,\nHR Team`
    } else if (tmpl === 'rejection') {
      subject = `Update on Your Application – ${jobTitle}`
      body = `Dear ${candidateName},\n\nThank you for taking the time to apply for the ${jobTitle} position and for your interest in joining our team.\n\nAfter careful consideration of all applications, we regret to inform you that we will not be moving forward with your application at this time. This was a difficult decision given the high caliber of candidates we received.\n\nWe appreciate the time and effort you invested in our hiring process, and we encourage you to apply for future openings that match your skills and experience.\n\nWe wish you the best in your job search and future endeavors.\n\nBest regards,\nHR Team`
    } else if (tmpl === 'interview') {
      subject = `Interview Invitation – ${jobTitle}`
      body = `Dear ${candidateName},\n\nWe are pleased to invite you for an interview for the ${jobTitle} position.\n\nInterview Details:\n• Date & Time: [To be confirmed]\n• Format: [Video / In-Person]\n• Meeting Link: [To be added]\n\nPlease confirm your availability by replying to this email.\n\nWe look forward to speaking with you.\n\nBest regards,\nHR Team`
    } else {
      subject = `Regarding Your Application – ${jobTitle}`
      body = `Dear ${candidateName},\n\n\n\nBest regards,\nHR Team`
    }
    return { subject, body }
  }

  // ── Action email helpers ──────────────────────────────────────────────────
  const openAction = (type: ActionType, skipStageMove = false) => {
    if (!skipStageMove) {
      if (type === 'selected') moveToStage('shortlist')
      if (type === 'offer')    moveToStage('offer')
      if (type === 'reject')   moveToStage('rejected')
    }
    const tmpl = type === 'selected' ? 'shortlist' as EmailTemplate
               : type === 'offer'    ? 'offer'     as EmailTemplate
               : type === 'reject'   ? 'rejection' as EmailTemplate
               : 'custom'            as EmailTemplate
    const { subject, body } = buildTemplate(tmpl)
    setActionSubject(subject)
    setActionBody(body)
    setActionType(type)
  }

  // ── Open Send Email dialog with chosen template (no stage move) ───────────
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplate | null>(null)

  const openSendEmail = (tmpl: EmailTemplate) => {
    setSendEmailOpen(false)
    setEmailTemplate(tmpl)
    const { subject, body } = buildTemplate(tmpl)
    setActionSubject(subject)
    setActionBody(body)
    // Map template to ActionType for dialog styling (interview/custom use 'selected' styling)
    const actionForTmpl: ActionType =
      tmpl === 'shortlist'  ? 'selected'
    : tmpl === 'offer'      ? 'offer'
    : tmpl === 'rejection'  ? 'reject'
    :                         'selected'
    setActionType(actionForTmpl)
  }

  const sendAction = async () => {
    if (!actionType || !candidateEmail) return
    setActionSending(true)
    try {
      // Determine which API to call. emailTemplate is set when coming from "Send Email" (no stage move).
      const tmpl = emailTemplate
      if (tmpl === 'interview') {
        await sendInterviewEmail(candidateEmail, candidateName, jobTitle, 'TBD', 'VIDEO', '')
      } else if (tmpl === 'custom' || tmpl === 'shortlist' || (!tmpl && actionType === 'selected')) {
        await sendShortlistEmail(candidateEmail, candidateName, jobTitle)
      } else if (tmpl === 'offer' || (!tmpl && actionType === 'offer')) {
        await sendOfferEmail(candidateEmail, candidateName, jobTitle)
      } else if (tmpl === 'rejection' || (!tmpl && actionType === 'reject')) {
        await sendRejectionEmail(candidateEmail, candidateName, jobTitle)
      }

      // Determine label for event log
      const labelMap: Record<string, string> = {
        selected:  `Selected for Position – congratulations email sent to ${candidateName}`,
        offer:     `Offer Released – offer letter sent to ${candidateName}`,
        reject:    `Rejected – rejection email sent to ${candidateName}`,
      }
      const tmplLabelMap: Record<EmailTemplate, string> = {
        shortlist:  `Shortlist notification sent to ${candidateName}`,
        offer:      `Offer letter sent to ${candidateName}`,
        rejection:  `Rejection email sent to ${candidateName}`,
        interview:  `Interview invitation sent to ${candidateName}`,
        custom:     `Email sent to ${candidateName}`,
      }
      const typeMap: Record<string, AppFlowEvent['type']> = {
        selected: 'SHORTLISTED', offer: 'OFFER', reject: 'REJECTED',
      }
      saveAppFlowEvent({
        id: uid(), candidateId, jobId,
        type: tmpl ? 'STATUS_CHANGE' : (typeMap[actionType] ?? 'STATUS_CHANGE'),
        label: tmpl ? tmplLabelMap[tmpl] : (labelMap[actionType] ?? `Email sent to ${candidateName}`),
        detail: `Subject: ${actionSubject}`,
        timestamp: new Date().toISOString(),
      })
      setStoredEvents(loadAppFlowEvents(candidateId, jobId))
      setToast({ msg: `Email sent to ${candidateEmail}`, err: false })
    } catch {
      setToast({ msg: 'Email failed — check SES config', err: true })
    }
    setActionSending(false)
    setActionType(null)
    setEmailTemplate(null)
  }

  // ── Add Round form ────────────────────────────────────────────────────────
  const [newRoundTitle,    setNewRoundTitle]   = useState('')
  const [newRoundType,     setNewRoundType]    = useState<RoundType>('TECHNICAL')
  const [selectedMemberIds,setSelectedMembers] = useState<string[]>([])
  const [newRoundDateTime, setNewRoundDT]      = useState('')
  const [newRoundMode,     setNewRoundMode]    = useState<'VIDEO'|'PHONE'|'IN_PERSON'>('VIDEO')
  const [newRoundLink,     setNewRoundLink]    = useState('')

  const openAddRound = () => {
    const n = rounds.length + 1
    const cfg = roundTypeCfg('TECHNICAL')
    setNewRoundTitle(`Round ${n} – ${cfg.label}`)
    setNewRoundType('TECHNICAL')
    setSelectedMembers([])
    setNewRoundDT('')
    setNewRoundMode('VIDEO')
    setNewRoundLink('')
    setShowAddRound(true)
  }

  const handleRoundTypeChange = (type: RoundType) => {
    setNewRoundType(type)
    const n = rounds.length + 1
    setNewRoundTitle(`Round ${n} – ${roundTypeCfg(type).label}`)
  }

  const createRound = () => {
    if (!newRoundTitle.trim()) return
    const names = selectedMemberIds.map(id=>
      panelMembers.find(m=>m.id===id)?.name ?? id
    )
    const round: InterviewRound = {
      id: uid(), candidateId, jobId,
      roundNumber: rounds.length + 1,
      title: newRoundTitle.trim(),
      type: newRoundType,
      assignedPanelMemberIds: selectedMemberIds,
      assignedPanelMemberNames: names,
      createdBy: authName, createdByEmail: authEmail,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
    }
    saveInterviewRound(round)
    // Advance pipeline stageMap to match this round number
    const pl = loadPipeline(jobId)
    const stages = pl.stages.length ? pl.stages : DEFAULT_STAGES
    // Find a 'round' stage matching this round number, or any 'round' stage, or fallback to first
    const roundStage = stages.find(s => s.type === 'round' && (s as any).roundNumber === round.roundNumber)
      ?? stages.find(s => s.type === 'round')
      ?? stages[0]
    if (roundStage) {
      pl.stageMap[candidateId] = roundStage.id
      savePipeline(jobId, pl)
      onStageChange?.(round.title, roundTypeCfg(round.type).color)
    }
    saveAppFlowEvent({
      id: uid(), candidateId, jobId,
      type: 'ROUND_ADDED',
      label: `Round added: ${round.title}`,
      detail: names.length ? `Assigned to: ${names.join(', ')}` : undefined,
      by: authName, byRole: authRoleLabel,
      timestamp: round.createdAt,
    })
    // Auto-save schedule immediately if date was provided in the form
    if (newRoundDateTime) {
      const sched: InterviewSchedule = {
        id: round.id,
        jobId, jobTitle: jobTitle ?? '',
        candidateId, candidateName: candidateName ?? '',
        stageId: round.id, stageName: round.title,
        dateTime: newRoundDateTime, duration: 60,
        type: newRoundMode,
        panelMembers: names,
        location: '', meetingLink: newRoundLink, notes: '',
        status: 'SCHEDULED',
      }
      saveSchedule(sched)
      saveAppFlowEvent({
        id: uid(), candidateId, jobId,
        type: 'EVALUATION_ADDED',
        label: `Interview scheduled: ${round.title}`,
        detail: `${newRoundMode.replace('_',' ')} · ${new Date(newRoundDateTime).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})}${names.length ? ` · Panel: ${names.join(', ')}` : ''}`,
        by: authName, byRole: authRoleLabel,
        timestamp: new Date().toISOString(),
      })
      reloadSchedules()
    }
    setShowAddRound(false)
    refreshRounds()
    // Open scheduling email dialog
    const subject = `Interview Invitation – ${round.title} | ${jobTitle}`
    const body = [
      `Dear ${candidateName},`,
      '',
      `We are pleased to invite you for the ${cfg.label} interview round for the ${jobTitle} position at our organization.`,
      '',
      `Round: ${round.title}`,
      `Type: ${cfg.label}`,
      names.length ? `Panel Members: ${names.join(', ')}` : '',
      `Meeting Link: [Teams / Video link will be added]`,
      '',
      `Please confirm your availability. We look forward to speaking with you.`,
      '',
      `Best regards,`,
      `${authName}`,
      `${authRoleLabel}`,
    ].filter(l => l !== undefined && l !== null ? true : false).join('\n')
    setSchedRound(round)
    setSchedSubject(subject)
    setSchedBody(body)
    setSchedDateTime(newRoundDateTime)
    setSchedMode(newRoundMode)
    setSchedTeamsLink(newRoundLink)
    setSchedOpen(true)
  }

  // ── Scheduling email dialog state ─────────────────────────────────────────
  const [schedules,      setSchedules]      = useState<InterviewSchedule[]>(() => loadSchedules())
  const reloadSchedules = () => setSchedules(loadSchedules())

  const [schedOpen,      setSchedOpen]      = useState(false)
  const [schedRound,     setSchedRound]     = useState<InterviewRound|null>(null)
  const [schedSubject,   setSchedSubject]   = useState('')
  const [schedBody,      setSchedBody]      = useState('')
  const [schedDateTime,  setSchedDateTime]  = useState('')
  const [schedMode,      setSchedMode]      = useState<'VIDEO'|'PHONE'|'IN_PERSON'>('VIDEO')
  const [schedTeamsLink, setSchedTeamsLink] = useState('')
  const [schedSending,   setSchedSending]   = useState(false)
  const [schedCopied,    setSchedCopied]    = useState(false)

  const persistSchedule = () => {
    if (!schedRound || !schedDateTime) return
    const sched: InterviewSchedule = {
      id: schedRound.id,
      jobId, jobTitle: jobTitle ?? '',
      candidateId, candidateName: candidateName ?? '',
      stageId: schedRound.id,
      stageName: schedRound.title,
      dateTime: schedDateTime,
      duration: 60,
      type: schedMode,
      panelMembers: schedRound.assignedPanelMemberNames ?? [],
      location: '',
      meetingLink: schedTeamsLink,
      notes: '',
      status: 'SCHEDULED',
    }
    saveSchedule(sched)
    reloadSchedules()
  }

  const openEditSchedule = (round: InterviewRound, existing?: InterviewSchedule) => {
    setSchedRound(round)
    const subject = `Interview Invitation – ${round.title} | ${jobTitle}`
    setSchedSubject(existing ? `Interview Invitation – ${round.title} | ${jobTitle}` : subject)
    if (existing) {
      setSchedDateTime(existing.dateTime)
      setSchedMode(existing.type)
      setSchedTeamsLink(existing.meetingLink ?? '')
    } else {
      setSchedDateTime('')
      setSchedMode('VIDEO')
      setSchedTeamsLink('')
    }
    const cfg = roundTypeCfg(round.type)
    const names = round.assignedPanelMemberNames ?? []
    const body = [
      `Dear ${candidateName},`,
      '',
      `We are pleased to invite you for the ${cfg.label} interview round for the ${jobTitle} position at our organization.`,
      '',
      `Round: ${round.title}`,
      `Type: ${cfg.label}`,
      names.length ? `Panel Members: ${names.join(', ')}` : '',
      `Meeting Link: [Teams / Video link will be added]`,
      '',
      `Please confirm your availability. We look forward to speaking with you.`,
      '',
      `Best regards,`,
      `${authName}`,
      `${authRoleLabel}`,
    ].filter(l => l !== null && l !== undefined ? true : false).join('\n')
    setSchedBody(body)
    setSchedOpen(true)
  }

  const openTeamsMeeting = () => {
    const subject = encodeURIComponent(schedSubject)
    const attendee = encodeURIComponent(candidateEmail ?? '')
    const base = 'https://teams.microsoft.com/l/meeting/new'
    const params = [`subject=${subject}`, attendee ? `attendees=${attendee}` : '']
      .filter(Boolean).join('&')
    window.open(`${base}?${params}`, '_blank')
  }

  const copyTeamsLink = () => {
    if (schedTeamsLink) {
      navigator.clipboard.writeText(schedTeamsLink).then(()=>{ setSchedCopied(true); setTimeout(()=>setSchedCopied(false),2000) })
    }
  }

  const sendScheduleEmail = async () => {
    if (!candidateEmail) { showToast('No candidate email address', true); return }
    persistSchedule()
    setSchedSending(true)
    try {
      const bodyWithLink = schedTeamsLink
        ? schedBody.replace('[Teams / Video link will be added]', schedTeamsLink)
        : schedBody
      await sendInterviewEmail(
        candidateEmail, candidateName, jobTitle,
        schedDateTime || 'TBD', schedMode, schedTeamsLink || bodyWithLink
      )
      saveAppFlowEvent({
        id:uid(), candidateId, jobId,
        type:'EVALUATION_ADDED',
        label:`Interview scheduled: ${schedRound?.title}`,
        detail: `${schedMode.replace('_',' ')}${schedDateTime ? ' · ' + new Date(schedDateTime).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : ''} · Invitation sent`,
        by:authName, byRole:authRoleLabel,
        timestamp:new Date().toISOString(),
      })
      showToast('Scheduling email sent to ' + candidateName)
      setSchedOpen(false)
    } catch(e) {
      showToast('Email send failed – check SES configuration', true)
    } finally { setSchedSending(false) }
  }

  const saveScheduleOnly = () => {
    persistSchedule()
    if (schedDateTime && schedRound) {
      saveAppFlowEvent({
        id:uid(), candidateId, jobId,
        type:'EVALUATION_ADDED',
        label:`Interview scheduled: ${schedRound.title}`,
        detail: `${schedMode.replace('_',' ')} · ${new Date(schedDateTime).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}`,
        by:authName, byRole:authRoleLabel,
        timestamp:new Date().toISOString(),
      })
      showToast('Schedule saved — visible in Calendar')
    }
    setSchedOpen(false)
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  const [noteText, setNoteText] = useState('')
  const [noteVer,  setNoteVer]  = useState(0)
  const notes = useMemo(()=>loadCandidateNotes(candidateId, jobId),[candidateId,jobId,noteVer])

  // ── Shortlist action ──────────────────────────────────────────────────────
  const [toast, setToast] = useState<{msg:string;err?:boolean}|null>(null)
  const showToast = (msg:string,err=false)=>{ setToast({msg,err}); setTimeout(()=>setToast(null),3000) }

  const addNote = () => {
    if (!noteText.trim()) return
    const ts = new Date().toISOString()
    saveCandidateNote({id:uid(),candidateId,jobId,text:noteText.trim(),
      addedBy:authName,addedByRole:authRoleLabel,addedAt:ts})
    saveAppFlowEvent({
      id:uid(), candidateId, jobId,
      type:'NOTE_ADDED',
      label:`Note added`,
      detail: noteText.trim().length > 80 ? noteText.trim().slice(0,80)+'…' : noteText.trim(),
      by:authName, byRole:authRoleLabel,
      timestamp:ts,
    })
    setNoteText(''); setNoteVer(v=>v+1); showToast('Note added')
  }

  // ── Build Application Flow timeline from all sources ──────────────────────
  const timelineEvents = useMemo(() => {
    type TimelineEntry = {
      id: string; type: string; label: string; detail?: string;
      by?: string; byRole?: string; timestamp: string; color: string; icon: string;
      pinFirst?: boolean
    }
    const seenIds = new Set<string>()
    const entries: TimelineEntry[] = []

    const push = (e: TimelineEntry) => {
      if (!seenIds.has(e.id)) { seenIds.add(e.id); entries.push(e) }
    }

    // ── 1. Applied event — always pins to top ─────────────────────────────
    if (appliedAt) {
      push({
        id: candidateId+'_applied', type: 'APPLIED', pinFirst: true,
        label: `${candidateName} applied for ${jobTitle}`,
        timestamp: appliedAt, color: '#2563EB', icon: '→',
      })
    }

    // ── 2. Shortlist record (from CandidatesPage shortlist action) ─────────
    if (shortlistRecord) {
      push({
        id: shortlistRecord.id, type: 'SHORTLISTED',
        label: `Shortlisted by ${shortlistRecord.shortlistedBy}`,
        detail: shortlistRecord.notes,
        by: shortlistRecord.shortlistedBy, byRole: shortlistRecord.shortlistedByRole,
        timestamp: shortlistRecord.shortlistedAt, color: '#16A34A', icon: '✓',
      })
    }

    // ── 3. Pipeline-level events only (no round/note/eval — those come from arrays below)
    // This prevents duplicates: round/note/eval are saved both as AppFlowEvents AND
    // in dedicated localStorage arrays; we show them only from the arrays (richer data).
    const PIPELINE_ONLY_TYPES = new Set(['STATUS_CHANGE','SHORTLISTED','REJECTED','OFFER','HIRED'])
    const colorMap: Record<string, string> = {
      STATUS_CHANGE:'#6366F1', SHORTLISTED:'#16A34A',
      REJECTED:'#DC2626', OFFER:'#16A34A', HIRED:'#0F766E',
    }
    const iconMap: Record<string, string> = {
      STATUS_CHANGE:'⇒', SHORTLISTED:'✓', REJECTED:'✕', OFFER:'◎', HIRED:'★',
    }
    storedEvents
      .filter(ev => PIPELINE_ONLY_TYPES.has(ev.type))
      .forEach(ev => {
        push({
          id: ev.id, type: ev.type,
          label: ev.label, detail: ev.detail,
          by: ev.by, byRole: ev.byRole,
          timestamp: ev.timestamp,
          color: colorMap[ev.type] ?? '#6366F1',
          icon: iconMap[ev.type] ?? '•',
        })
      })

    // ── 4. Interview rounds (from dedicated array — canonical source) ──────
    rounds.forEach(r => {
      const members = r.assignedPanelMemberNames?.join(', ')
      push({
        id: r.id+'_added', type: 'ROUND_ADDED',
        label: `${r.title} created`,
        detail: members ? `Panel: ${members}` : undefined,
        by: r.createdBy, timestamp: r.createdAt, color: '#6366F1', icon: '⊕',
      })
      if (r.status === 'COMPLETED') {
        push({
          id: r.id+'_done', type: 'ROUND_COMPLETED',
          label: `${r.title} completed`,
          timestamp: r.createdAt, color: '#16A34A', icon: '◉',
        })
      }
    })

    // ── 5. Evaluations (from dedicated array) ──────────────────────────────
    allEvals.forEach(e => {
      push({
        id: e.id+'_eval', type: 'EVALUATION_ADDED',
        label: `Evaluation by ${e.panelMember}`,
        detail: `${e.stageName} · ${e.recommendation === 'ADVANCE' ? 'Proceed' : e.recommendation === 'HIRE' ? 'Strong Hire' : e.recommendation === 'REJECT' ? 'Do Not Proceed' : 'Hold'} · ${e.overallRating}/5 stars`,
        by: e.panelMember, timestamp: e.submittedAt, color: '#7C3AED', icon: '★',
      })
    })

    // ── 6. Notes (from dedicated array) ────────────────────────────────────
    notes.forEach(n => {
      push({
        id: n.id+'_note', type: 'NOTE_ADDED',
        label: `Note by ${n.addedBy}`,
        detail: n.text.length > 100 ? n.text.slice(0,100)+'…' : n.text,
        by: n.addedBy, byRole: n.addedByRole, timestamp: n.addedAt, color: '#7C3AED', icon: '✎',
      })
    })

    // Sort: pinFirst items always first, then ascending by timestamp (oldest at top)
    return entries.sort((a, b) => {
      if (a.pinFirst && !b.pinFirst) return -1
      if (b.pinFirst && !a.pinFirst) return 1
      return +new Date(a.timestamp) - +new Date(b.timestamp)
    })
  }, [shortlistRecord, rounds, allEvals, notes, storedEvents, appliedAt, candidateId, candidateName, jobTitle])

  // ── Gate: can only add a new round when latest round has submitted feedback ──
  const latestRound = rounds.length > 0 ? rounds[rounds.length - 1] : null
  const latestRoundEvals = latestRound
    ? allEvals.filter(e => e.interviewRoundId === latestRound.id && !e.isDraft)
    : []
  const canAddRound = rounds.length === 0 || latestRoundEvals.length > 0

  // ── Stage label from latest round ────────────────────────────────────────
  // Notify parent when rounds change so stage chip updates
  useEffect(() => {
    if (latestRound) {
      const cfg = roundTypeCfg(latestRound.type)
      onStageChange?.(latestRound.title, cfg.color)
    }
  }, [latestRound?.id])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      {toast && <Alert severity={toast.err?'error':'success'} onClose={()=>setToast(null)}
        sx={{mb:2,borderRadius:2,fontSize:12}}>{toast.msg}</Alert>}

      {/* ── ACTION BUTTONS ────────────────────────────────────────────────── */}
      <Box sx={{display:'flex',gap:1.5,mb:3,flexWrap:'wrap',alignItems:'center'}}>
        <Tooltip title={!canAddRound ? `Submit feedback for "${latestRound?.title}" before creating the next round` : ''}>
          <span>
            <Button variant="contained" color="primary"
              startIcon={<Add sx={{fontSize:15}}/>}
              onClick={openAddRound}
              disabled={!canAddRound}
              sx={{fontSize:13,textTransform:'none',fontWeight:700}}>
              Add Round
            </Button>
          </span>
        </Tooltip>

        <Button variant="outlined"
          startIcon={<NoteAlt sx={{fontSize:15}}/>}
          onClick={()=>setShowNoteForm(s=>!s)}
          sx={{fontSize:13,textTransform:'none',fontWeight:600,
            borderColor:showNoteForm?PURPLE:BORDER,color:showNoteForm?PURPLE:TEXT1,
            '&:hover':{borderColor:PURPLE,color:PURPLE,bgcolor:PURPLE+'08'}}}>
          {showNoteForm?'Hide Notes':'Add Note'}
          {notes.length>0&&<Chip label={notes.length} size="small"
            sx={{ml:1,height:18,fontSize:10,bgcolor:PURPLE+'18',color:PURPLE}}/>}
        </Button>

        <Button variant="outlined"
          startIcon={<Send sx={{fontSize:14}}/>}
          onClick={()=>setSendEmailOpen(true)}
          sx={{fontSize:13,textTransform:'none',fontWeight:600,
            borderColor:ORANGE+'50',color:ORANGE,
            '&:hover':{bgcolor:ORANGE+'08',borderColor:ORANGE}}}>
          Send Email
        </Button>
      </Box>

      {/* ── APPLICATION FLOW TIMELINE ──────────────────────────────────────── */}
      {timelineEvents.length > 0 && (
        <Box sx={{mb:3}}>
          <Typography sx={{fontSize:10,fontWeight:700,color:TEXT3,
            textTransform:'uppercase',letterSpacing:'0.1em',mb:1.5}}>
            Application Flow
          </Typography>
          <Box sx={{position:'relative',pl:2.5}}>
            {/* Vertical line */}
            <Box sx={{position:'absolute',left:9,top:8,bottom:8,width:2,
              bgcolor:`${BORDER}`,borderRadius:99}}/>
            {timelineEvents.map((ev, idx) => (
              <Box key={ev.id} sx={{display:'flex',alignItems:'flex-start',gap:1.5,mb:1.5,position:'relative'}}>
                {/* Dot */}
                <Box sx={{
                  position:'absolute',left:-16,top:4,
                  width:14,height:14,borderRadius:'50%',flexShrink:0,
                  bgcolor:ev.color+'20',border:`2px solid ${ev.color}`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:7,color:ev.color,fontWeight:900,zIndex:1,
                }}>{ev.icon}</Box>
                {/* Content */}
                <Box sx={{flex:1,p:1.5,bgcolor:CARD,borderRadius:1.5,
                  border:`1px solid ${ev.color}20`,
                  borderLeft:`3px solid ${ev.color}`}}>
                  <Box sx={{display:'flex',alignItems:'center',gap:1,flexWrap:'wrap',mb:0.3}}>
                    <Typography sx={{fontSize:12.5,fontWeight:700,color:TEXT1}}>{ev.label}</Typography>
                    {ev.byRole&&(
                      <Chip label={ROLE_DISPLAY[ev.byRole]??ev.byRole} size="small"
                        sx={{height:16,fontSize:9,bgcolor:ev.color+'12',color:ev.color,borderRadius:1}}/>
                    )}
                    <Typography sx={{fontSize:10,color:TEXT3,ml:'auto',flexShrink:0}}>
                      {new Date(ev.timestamp).toLocaleDateString('en-US',
                        {month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                    </Typography>
                  </Box>
                  {ev.detail&&(
                    <Typography sx={{fontSize:11,color:TEXT2,lineHeight:1.5,fontStyle:'italic'}}>
                      {ev.detail}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* ── ADD ROUND FORM ────────────────────────────────────────────────── */}
      <Collapse in={showAddRound}>
        <Box sx={{border:`1.5px solid ${ORANGE}35`,borderRadius:2.5,overflow:'hidden',mb:3}}>
          <Box sx={{px:2.5,py:1.5,bgcolor:ORANGE+'0A',borderBottom:`1px solid ${ORANGE}25`,
            display:'flex',alignItems:'center',gap:1,justifyContent:'space-between'}}>
            <Box sx={{display:'flex',alignItems:'center',gap:1}}>
              <Groups sx={{color:ORANGE,fontSize:18}}/>
              <Typography sx={{fontSize:13,fontWeight:700,color:TEXT1}}>Create Interview Round</Typography>
            </Box>
            <IconButton size="small" onClick={()=>setShowAddRound(false)} sx={{color:TEXT3}}>
              <Cancel sx={{fontSize:16}}/>
            </IconButton>
          </Box>
          <Box sx={{p:2.5,bgcolor:CARD}}>
            {/* Title + Type */}
            <Box sx={{display:'grid',gridTemplateColumns:'1fr auto',gap:1.5,mb:2.5}}>
              <TextField size="small" label="Round Title" value={newRoundTitle}
                onChange={e=>setNewRoundTitle(e.target.value)}
                sx={{'& .MuiOutlinedInput-root':{fontSize:13}}}/>
              <FormControl size="small" sx={{minWidth:160}}>
                <InputLabel sx={{fontSize:13}}>Round Type</InputLabel>
                <Select value={newRoundType} label="Round Type"
                  onChange={e=>handleRoundTypeChange(e.target.value as RoundType)} sx={{fontSize:13}}>
                  {ROUND_TYPES.map(rt=>(
                    <MenuItem key={rt.value} value={rt.value}>
                      <Box sx={{display:'flex',alignItems:'center',gap:1}}>
                        <Box sx={{width:8,height:8,borderRadius:'50%',bgcolor:rt.color,flexShrink:0}}/>
                        <Typography sx={{fontSize:13}}>{rt.label}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Assign panel members — searchable multi-select */}
            <Box sx={{mb:2.5}}>
              <Typography sx={{fontSize:11,fontWeight:700,color:TEXT2,mb:1.25,
                textTransform:'uppercase',letterSpacing:'0.07em'}}>
                Assign Panel Members
              </Typography>
              <Autocomplete
                multiple
                options={panelMembers}
                getOptionLabel={m => m.name}
                value={panelMembers.filter(m => selectedMemberIds.includes(m.id))}
                onChange={(_, newValue) => setSelectedMembers(newValue.map(m => m.id))}
                filterOptions={(options, { inputValue }) =>
                  options.filter(o =>
                    o.name.toLowerCase().includes(inputValue.toLowerCase()) ||
                    (o.department ?? '').toLowerCase().includes(inputValue.toLowerCase()) ||
                    (o.position ?? '').toLowerCase().includes(inputValue.toLowerCase())
                  )
                }
                renderOption={(props, option) => (
                  <Box component="li" {...props} sx={{gap:1,py:1}}>
                    <Avatar sx={{width:28,height:28,fontSize:10,fontWeight:700,flexShrink:0,
                      bgcolor:option.avatarColor+'25',color:option.avatarColor}}>
                      {option.name.split(' ').map(w=>w[0]).join('').slice(0,2)}
                    </Avatar>
                    <Box>
                      <Typography sx={{fontSize:12,fontWeight:600,color:TEXT1,lineHeight:1.2}}>{option.name}</Typography>
                      <Typography sx={{fontSize:10,color:TEXT3}}>{option.position || option.department}</Typography>
                    </Box>
                  </Box>
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index })
                    return (
                      <Chip key={key} {...tagProps}
                        label={option.name} size="small"
                        avatar={
                          <Avatar sx={{bgcolor:option.avatarColor+'30 !important',color:option.avatarColor+' !important',fontSize:'8px !important',fontWeight:700}}>
                            {option.name.split(' ').map(w=>w[0]).join('').slice(0,2)}
                          </Avatar>
                        }
                        sx={{height:24,fontSize:11,fontWeight:600,
                          bgcolor:option.avatarColor+'12',color:TEXT1,
                          border:`1px solid ${option.avatarColor}30`}}
                      />
                    )
                  })
                }
                renderInput={params => (
                  <TextField {...params} size="small" label="Search panel members"
                    placeholder="Type to search by name or department…"
                    sx={{'& .MuiOutlinedInput-root':{fontSize:13,bgcolor:BG}}}/>
                )}
                noOptionsText={
                  <Typography sx={{fontSize:12,color:TEXT3,textAlign:'center',py:1}}>
                    No panel members found. Add them in Settings.
                  </Typography>
                }
              />
            </Box>

            {/* Schedule interview */}
            <Box sx={{mb:2.5,p:2,borderRadius:2,border:`1.5px solid ${ORANGE}25`,bgcolor:ORANGE+'04'}}>
              <Box sx={{display:'flex',alignItems:'center',gap:0.75,mb:1.5}}>
                <Schedule sx={{fontSize:14,color:ORANGE}}/>
                <Typography sx={{fontSize:11,fontWeight:700,color:ORANGE,
                  textTransform:'uppercase',letterSpacing:'0.07em'}}>
                  Schedule Interview
                </Typography>
                <Typography sx={{fontSize:10,color:TEXT3,ml:0.5}}>(optional)</Typography>
              </Box>
              <Box sx={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1.5,mb:1.5}}>
                <TextField size="small" label="Date & Time" type="datetime-local"
                  value={newRoundDateTime} onChange={e=>setNewRoundDT(e.target.value)}
                  InputLabelProps={{shrink:true}}
                  sx={{'& .MuiOutlinedInput-root':{fontSize:12,bgcolor:CARD}}}/>
                <FormControl size="small">
                  <InputLabel sx={{fontSize:12}}>Meeting Format</InputLabel>
                  <Select value={newRoundMode} label="Meeting Format"
                    onChange={e=>setNewRoundMode(e.target.value as any)} sx={{fontSize:12,bgcolor:CARD}}>
                    <MenuItem value="VIDEO"><Box sx={{display:'flex',alignItems:'center',gap:1}}><VideoCall sx={{fontSize:15,color:'#7B68EE'}}/><Typography sx={{fontSize:12}}>Video Call</Typography></Box></MenuItem>
                    <MenuItem value="PHONE"><Box sx={{display:'flex',alignItems:'center',gap:1}}><Typography sx={{fontSize:12}}>📞 Phone Call</Typography></Box></MenuItem>
                    <MenuItem value="IN_PERSON"><Box sx={{display:'flex',alignItems:'center',gap:1}}><Typography sx={{fontSize:12}}>🏢 In-Person</Typography></Box></MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <TextField size="small" fullWidth
                label="Meeting Link (Teams / Zoom / Meet)"
                placeholder="https://teams.microsoft.com/l/meetup-join/…"
                value={newRoundLink} onChange={e=>setNewRoundLink(e.target.value)}
                sx={{'& .MuiOutlinedInput-root':{fontSize:12,bgcolor:CARD}}}/>
              {newRoundDateTime && (
                <Typography sx={{fontSize:10,color:ORANGE,mt:1}}>
                  Scheduling email will be pre-filled and ready to review before sending.
                </Typography>
              )}
            </Box>

            <Box sx={{display:'flex',gap:1.5,justifyContent:'flex-end'}}>
              <Button size="small" onClick={()=>setShowAddRound(false)}
                sx={{fontSize:12,color:TEXT2,textTransform:'none'}}>Cancel</Button>
              <Button variant="contained" color="primary" size="small"
                disabled={!newRoundTitle.trim()} onClick={createRound}
                startIcon={<Add sx={{fontSize:14}}/>}
                sx={{fontSize:12,textTransform:'none',fontWeight:700}}>
                Create Round
              </Button>
            </Box>
          </Box>
        </Box>
      </Collapse>

      {/* ── NOTES ─────────────────────────────────────────────────────────── */}
      {(notes.length>0||showNoteForm)&&(
        <Box sx={{border:`1.5px solid ${PURPLE}25`,borderRadius:2,overflow:'hidden',mb:3}}>
          <Box sx={{px:2.5,py:1.5,bgcolor:'#F5F3FF',borderBottom:'1px solid #DDD6FE',
            display:'flex',alignItems:'center',gap:1}}>
            <NoteAlt sx={{color:PURPLE,fontSize:16}}/>
            <Typography sx={{fontSize:12,fontWeight:700,color:'#4C1D95',flex:1}}>Interview Notes</Typography>
            {notes.length>0&&<Chip label={`${notes.length} note${notes.length>1?'s':''}`} size="small"
              sx={{height:18,fontSize:10,bgcolor:PURPLE+'18',color:PURPLE,borderRadius:1}}/>}
          </Box>
          <Box sx={{p:2,bgcolor:CARD}}>
            {notes.map(n=>(
              <Box key={n.id} sx={{mb:1.5,p:1.5,bgcolor:BG,borderRadius:1.5,
                border:`1px solid ${BORDER}`,borderLeft:`3px solid ${PURPLE}`}}>
                <Box sx={{display:'flex',alignItems:'center',gap:1,mb:0.4,flexWrap:'wrap'}}>
                  <Avatar sx={{width:20,height:20,fontSize:9,fontWeight:700,
                    bgcolor:PURPLE+'25',color:PURPLE}}>
                    {n.addedBy.split(' ').map(w=>w[0]).join('').slice(0,2)}
                  </Avatar>
                  <Typography sx={{fontSize:12,fontWeight:700,color:TEXT1}}>{n.addedBy}</Typography>
                  <Chip label={n.addedByRole} size="small"
                    sx={{height:16,fontSize:9,bgcolor:PURPLE+'12',color:PURPLE,borderRadius:1}}/>
                  <Typography sx={{fontSize:10,color:TEXT3,ml:'auto'}}>
                    {new Date(n.addedAt).toLocaleDateString('en-US',
                      {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                  </Typography>
                </Box>
                <Typography sx={{fontSize:12,color:TEXT2,lineHeight:1.6}}>{n.text}</Typography>
              </Box>
            ))}
            <Collapse in={showNoteForm}>
              <Box sx={{display:'flex',alignItems:'flex-start',gap:1.5,
                borderTop:notes.length>0?`1px solid ${BORDER}`:'none',
                pt:notes.length>0?2:0}}>
                <Avatar sx={{width:26,height:26,fontSize:10,fontWeight:700,mt:0.5,flexShrink:0,
                  bgcolor:ORANGE+'25',color:ORANGE}}>
                  {authName.split(' ').map(w=>w[0]).join('').slice(0,2)}
                </Avatar>
                <Box sx={{flex:1}}>
                  <TextField fullWidth multiline rows={2} size="small"
                    placeholder={`Add note as ${authName} (${authRoleLabel})…`}
                    value={noteText} onChange={e=>setNoteText(e.target.value)}
                    onKeyDown={e=>{if(e.ctrlKey&&e.key==='Enter')addNote()}}
                    sx={{mb:1,'& .MuiOutlinedInput-root':{fontSize:13,bgcolor:BG}}}/>
                  <Box sx={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <Typography sx={{fontSize:10,color:TEXT3}}>Ctrl+Enter to save</Typography>
                    <Button variant="contained" color="primary" size="small"
                      disabled={!noteText.trim()} onClick={addNote}
                      sx={{fontSize:11,textTransform:'none',fontWeight:600}}>Add Note</Button>
                  </Box>
                </Box>
              </Box>
            </Collapse>
          </Box>
        </Box>
      )}

      {/* ── INTERVIEW ROUNDS ──────────────────────────────────────────────── */}
      {rounds.length>0 ? (
        <Box>
          <Box sx={{display:'flex',alignItems:'center',gap:1,mb:1.5}}>
            <Typography sx={{fontSize:10,fontWeight:700,color:TEXT3,
              textTransform:'uppercase',letterSpacing:'0.1em',flex:1}}>
              Interview Rounds ({rounds.length})
            </Typography>
          </Box>
          {rounds.map(r=>(
            <RoundCard key={r.id} round={r}
              allEvals={allEvals}
              authName={authName} authEmail={authEmail}
              authRole={authRole} authRoleLabel={authRoleLabel}
              submitterOptions={submitterOptions}
              jobId={jobId} jobTitle={jobTitle}
              candidateId={candidateId} candidateName={candidateName}
              onRoundChange={refreshRounds}
              schedule={schedules.find(s => s.id === r.id)}
              onEditSchedule={openEditSchedule}
            />
          ))}
        </Box>
      ) : (
        <Box sx={{textAlign:'center',py:5,bgcolor:BG,borderRadius:2,border:`1px dashed ${BORDER}`}}>
          <Groups sx={{fontSize:40,color:TEXT3,mb:1}}/>
          <Typography sx={{color:TEXT2,fontWeight:500,fontSize:13}}>
            No interview rounds yet
          </Typography>
          <Typography sx={{fontSize:11,color:TEXT3,mt:0.5,mb:2}}>
            Click "Add Round" to schedule the first interview
          </Typography>
          <Button variant="contained" color="primary" size="small"
            startIcon={<Add sx={{fontSize:14}}/>} onClick={openAddRound}
            sx={{fontSize:12,textTransform:'none',fontWeight:700}}>
            Add First Round
          </Button>
        </Box>
      )}

      {/* ── HR ACTION EMAIL DIALOG ────────────────────────────────────────── */}
      <Dialog open={!!actionType} onClose={()=>setActionType(null)} maxWidth="sm" fullWidth
        PaperProps={{sx:{borderRadius:2.5}}}>
        <DialogTitle sx={{display:'flex',alignItems:'center',gap:1.5,pb:1,
          borderBottom:`1px solid ${BORDER}`,fontFamily:'inherit'}}>
          <Box sx={{
            width:36,height:36,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
            bgcolor: actionType==='selected' ? '#DCFCE7' : actionType==='offer' ? ORANGE+'15' : '#FEE2E2',
          }}>
            {actionType==='selected' && <AssignmentTurnedIn sx={{fontSize:18,color:'#16A34A'}}/>}
            {actionType==='offer'    && <FlagOutlined       sx={{fontSize:18,color:ORANGE}}/>}
            {actionType==='reject'   && <Cancel             sx={{fontSize:18,color:'#DC2626'}}/>}
          </Box>
          <Box sx={{flex:1}}>
            <Typography sx={{fontSize:15,fontWeight:800,color:TEXT1,fontFamily:'inherit'}}>
              {emailTemplate
                ? EMAIL_TEMPLATES.find(t=>t.value===emailTemplate)?.label ?? 'Send Email'
                : actionType==='selected' ? 'Selected for Position'
                : actionType==='offer'    ? 'Release Offer'
                : 'Reject Candidate'}
            </Typography>
            <Typography sx={{fontSize:11,color:TEXT3}}>
              {emailTemplate ? 'Review and send email to ' : 'Stage moved · send email to '}
              {candidateName}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{pt:2.5,pb:1}}>
          <Box sx={{mb:2}}>
            <Typography sx={{fontSize:11,fontWeight:700,color:TEXT3,mb:0.5}}>TO</Typography>
            <Box sx={{px:1.5,py:1,bgcolor:BG,borderRadius:1.5,border:`1px solid ${BORDER}`,fontSize:13,color:TEXT1}}>
              {candidateName} &lt;{candidateEmail ?? 'No email on file'}&gt;
            </Box>
          </Box>
          <TextField fullWidth size="small" label="Subject" value={actionSubject}
            onChange={e=>setActionSubject(e.target.value)}
            sx={{mb:2,'& .MuiOutlinedInput-root':{fontSize:13}}}/>
          <TextField fullWidth multiline rows={12} label="Email Body" value={actionBody}
            onChange={e=>setActionBody(e.target.value)}
            sx={{'& .MuiOutlinedInput-root':{fontSize:13,lineHeight:1.7,fontFamily:'inherit'}}}/>
        </DialogContent>

        <DialogActions sx={{px:3,py:2,borderTop:`1px solid ${BORDER}`,gap:1}}>
          <Button onClick={()=>setActionType(null)}
            sx={{fontSize:13,textTransform:'none',color:TEXT2}}>
            Cancel
          </Button>
          <Button variant="contained" disabled={actionSending || !candidateEmail}
            startIcon={<Send sx={{fontSize:15}}/>}
            onClick={sendAction}
            sx={{
              fontSize:13,textTransform:'none',fontWeight:700,
              background: actionType==='selected' ? 'linear-gradient(135deg,#22C55E,#16A34A)'
                        : actionType==='offer'    ? `linear-gradient(135deg,${ORANGE},#4338CA)`
                        : 'linear-gradient(135deg,#EF4444,#DC2626)',
            }}>
            {actionSending ? 'Sending…' : 'Send Email'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── SEND EMAIL TEMPLATE PICKER ───────────────────────────────────── */}
      <Dialog open={sendEmailOpen} onClose={()=>setSendEmailOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{sx:{borderRadius:2.5}}}>
        <DialogTitle sx={{pb:1,borderBottom:`1px solid ${BORDER}`,fontFamily:'inherit'}}>
          <Box sx={{display:'flex',alignItems:'center',gap:1}}>
            <Send sx={{color:ORANGE,fontSize:20}}/>
            <Box>
              <Typography sx={{fontSize:15,fontWeight:800,color:TEXT1,fontFamily:'inherit'}}>
                Send Email
              </Typography>
              <Typography sx={{fontSize:11,color:TEXT3}}>
                Choose a template to send to {candidateName}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{pt:2,pb:1}}>
          <Box sx={{display:'flex',flexDirection:'column',gap:1}}>
            {EMAIL_TEMPLATES.map(t=>(
              <Box key={t.value} onClick={()=>openSendEmail(t.value)}
                sx={{
                  display:'flex',alignItems:'center',gap:1.5,
                  p:1.5,borderRadius:2,cursor:'pointer',
                  border:`1.5px solid ${BORDER}`,bgcolor:CARD,
                  transition:'all 0.15s',
                  '&:hover':{borderColor:t.color,bgcolor:t.color+'08',transform:'translateX(2px)'},
                }}>
                <Box sx={{
                  width:36,height:36,borderRadius:'50%',flexShrink:0,
                  bgcolor:t.color+'15',display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:16,color:t.color,fontWeight:700,
                }}>{t.icon}</Box>
                <Box>
                  <Typography sx={{fontSize:13,fontWeight:700,color:TEXT1}}>{t.label}</Typography>
                  <Typography sx={{fontSize:11,color:TEXT3}}>
                    {t.value==='shortlist'  && 'Congratulate on shortlisting'}
                    {t.value==='offer'      && 'Formal offer of employment'}
                    {t.value==='rejection'  && 'Thank you & rejection notice'}
                    {t.value==='interview'  && 'Schedule an interview'}
                    {t.value==='custom'     && 'Write your own message'}
                  </Typography>
                </Box>
                <ArrowForward sx={{fontSize:15,color:TEXT3,ml:'auto'}}/>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{px:3,py:1.5,borderTop:`1px solid ${BORDER}`}}>
          <Button onClick={()=>setSendEmailOpen(false)}
            sx={{fontSize:13,textTransform:'none',color:TEXT2}}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── SCHEDULING EMAIL DIALOG ────────────────────────────────────────── */}
      <Dialog open={schedOpen} onClose={()=>setSchedOpen(false)} maxWidth="md" fullWidth
        PaperProps={{sx:{borderRadius:2.5}}}>
        <DialogTitle sx={{display:'flex',alignItems:'center',gap:1.5,pb:1,
          borderBottom:`1px solid ${BORDER}`,fontFamily:'inherit'}}>
          <Schedule sx={{color:ORANGE,fontSize:22}}/>
          <Box>
            <Typography sx={{fontSize:15,fontWeight:700,color:'#1E293B',lineHeight:1.2}}>
              Schedule Interview – {schedRound?.title}
            </Typography>
            <Typography sx={{fontSize:12,color:TEXT2,fontWeight:400}}>
              Review and send the scheduling invitation to the candidate
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{pt:2.5,pb:1}}>
          {/* To / Subject row */}
          <Box sx={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:2,mb:2}}>
            <TextField size="small" label="To" value={candidateEmail??''} disabled
              sx={{'& .MuiOutlinedInput-root':{fontSize:13,bgcolor:BG}}}/>
            <TextField size="small" label="Subject" value={schedSubject}
              onChange={e=>setSchedSubject(e.target.value)}
              sx={{'& .MuiOutlinedInput-root':{fontSize:13}}}/>
          </Box>

          {/* DateTime / Mode */}
          <Box sx={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:2,mb:2}}>
            <TextField size="small" label="Interview Date & Time" type="datetime-local"
              value={schedDateTime} onChange={e=>setSchedDateTime(e.target.value)}
              InputLabelProps={{shrink:true}}
              sx={{'& .MuiOutlinedInput-root':{fontSize:13}}}/>
            <FormControl size="small">
              <InputLabel sx={{fontSize:13}}>Meeting Format</InputLabel>
              <Select value={schedMode} label="Meeting Format"
                onChange={e=>setSchedMode(e.target.value as any)} sx={{fontSize:13}}>
                <MenuItem value="VIDEO">Video Call</MenuItem>
                <MenuItem value="PHONE">Phone Call</MenuItem>
                <MenuItem value="IN_PERSON">In-Person</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Teams Meeting Link */}
          <Box sx={{mb:2,p:2,borderRadius:2,border:`1.5px solid #7B68EE35`,bgcolor:'#F5F3FF'}}>
            <Box sx={{display:'flex',alignItems:'center',gap:1,mb:1.5}}>
              <VideoCall sx={{color:'#7B68EE',fontSize:18}}/>
              <Typography sx={{fontSize:12,fontWeight:700,color:'#4C1D95',flex:1}}>
                Microsoft Teams Meeting
              </Typography>
              <Button size="small" variant="outlined"
                startIcon={<OpenInNew sx={{fontSize:13}}/>}
                onClick={openTeamsMeeting}
                sx={{fontSize:11,textTransform:'none',borderColor:'#7B68EE55',color:'#7B68EE',
                  '&:hover':{bgcolor:'#7B68EE0F',borderColor:'#7B68EE'}}}>
                Create in Teams
              </Button>
            </Box>
            <Typography sx={{fontSize:11,color:'#6D28D9',mb:1.25}}>
              Click "Create in Teams" to open Microsoft Teams and create a meeting. Copy the join link from Teams and paste it below.
            </Typography>
            <Box sx={{display:'flex',gap:1,alignItems:'center'}}>
              <TextField size="small" fullWidth
                label="Paste Teams Meeting Link here"
                placeholder="https://teams.microsoft.com/l/meetup-join/..."
                value={schedTeamsLink} onChange={e=>setSchedTeamsLink(e.target.value)}
                sx={{'& .MuiOutlinedInput-root':{fontSize:12,bgcolor:CARD}}}/>
              {schedTeamsLink&&(
                <Tooltip title={schedCopied?'Copied!':'Copy link'}>
                  <IconButton size="small" onClick={copyTeamsLink}
                    sx={{color:schedCopied?GREEN:'#7B68EE',bgcolor:schedCopied?GREEN+'12':'#7B68EE0A',
                      border:`1px solid ${schedCopied?GREEN:'#7B68EE'}35`}}>
                    <ContentCopy sx={{fontSize:15}}/>
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Editable email body */}
          <Box>
            <Typography sx={{fontSize:11,fontWeight:700,color:TEXT2,mb:0.75,
              textTransform:'uppercase',letterSpacing:'0.07em'}}>
              Email Body
            </Typography>
            <TextField fullWidth multiline rows={10} size="small"
              value={schedBody} onChange={e=>setSchedBody(e.target.value)}
              sx={{'& .MuiOutlinedInput-root':{fontSize:12.5,lineHeight:1.7,
                bgcolor:'#FAFAFA',fontFamily:'monospace'}}}/>
            <Typography sx={{fontSize:10,color:TEXT3,mt:0.5}}>
              The Teams meeting link will be inserted automatically when you send.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{px:3,py:2,borderTop:`1px solid ${BORDER}`,gap:1}}>
          <Button onClick={()=>setSchedOpen(false)}
            sx={{textTransform:'none',fontSize:13,color:TEXT2}}>
            Cancel
          </Button>
          <Button variant="outlined" disabled={!schedDateTime}
            startIcon={<Schedule sx={{fontSize:15}}/>}
            onClick={saveScheduleOnly}
            sx={{textTransform:'none',fontSize:13,fontWeight:600,borderColor:ORANGE+'55',color:ORANGE,
              '&:hover':{bgcolor:ORANGE+'0A',borderColor:ORANGE}}}>
            Save Schedule
          </Button>
          <Button variant="contained" disabled={schedSending||!candidateEmail||!schedDateTime}
            startIcon={schedSending?undefined:<Send sx={{fontSize:15}}/>}
            onClick={sendScheduleEmail}
            sx={{textTransform:'none',fontSize:13,fontWeight:700,bgcolor:ORANGE,
              background:`linear-gradient(135deg,${ORANGE},#4338CA)`,minWidth:140}}>
            {schedSending ? 'Sending…' : 'Save & Send Invitation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
