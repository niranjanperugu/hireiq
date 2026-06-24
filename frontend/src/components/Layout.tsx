import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@hooks/redux'
import { logout } from '@store/authSlice'
import {
  Box,
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Typography,
  Container,
  useTheme,
  useMediaQuery,
  Divider,
  Tooltip
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  People as CandidatesIcon,
  Work as JobsIcon,
  Assignment as ApplicationsIcon,
  Analytics as AnalyticsIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
  ChevronLeft as ChevronLeftIcon,
  AccountTree as PipelineIcon,
  CalendarMonth as CalendarIcon,
  EventNote as EvalIcon,
  Schedule as ScheduleIcon,
  ManageSearch as AnalysisIcon,
  PersonSearch as PersonSearchIcon,
  IntegrationInstructions as IntegrationIcon
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'

const DRAWER_WIDTH = 260

const NAVY     = '#0B0F1A'
const NAVY_LT  = '#1E2D40'
const ORANGE   = '#6366F1'

const Layout: React.FC = () => {
  const navigate   = useNavigate()
  const location   = useLocation()
  const dispatch   = useAppDispatch()
  const theme      = useTheme()
  const isMobile   = useMediaQuery(theme.breakpoints.down('md'))

  const { user } = useAppSelector(state => state.auth)

  const [openDrawer, setOpenDrawer] = useState(!isMobile)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleMenuOpen  = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const handleMenuClose = () => setAnchorEl(null)

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/login')
  }

  // Nav sections
  const navSections = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', icon: <DashboardIcon />, path: '/' },
      ]
    },
    {
      title: 'HR / Hiring Manager',
      items: [
        { label: 'Jobs',               icon: <JobsIcon />,         path: '/jobs' },
        { label: 'Candidates',         icon: <CandidatesIcon />,   path: '/candidates' },
        { label: 'Resume Analysis',    icon: <AnalysisIcon />,     path: '/analysis' },
        { label: 'Pipeline',            icon: <PipelineIcon />,     path: '/pipeline' },
      ]
    },
    {
      title: 'Panel Member',
      items: [
        { label: 'Calendar',       icon: <CalendarIcon />,  path: '/calendar' },
        { label: 'Evaluations',    icon: <EvalIcon />,      path: '/evaluations' },
      ]
    },
    {
      title: 'Reports',
      items: [
        { label: 'Analytics',          icon: <AnalyticsIcon />,    path: '/analytics' },
      ]
    },
    {
      title: 'Configuration',
      items: [
        { label: 'Source Candidates',  icon: <PersonSearchIcon />,  path: '/sourcing' },
        { label: 'Integrations',       icon: <IntegrationIcon />,   path: '/integrations' },
        { label: 'Settings',           icon: <SettingsIcon />,      path: '/settings' },
      ]
    }
  ]

  // Flat list for "active" detection
  const navItems = navSections.flatMap(s => s.items)

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: NAVY }}>

      {/* Brand Logo */}
      <Box sx={{
        px: 3, py: 2.5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${NAVY_LT}`
      }}>
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              fontSize: '1.25rem',
              letterSpacing: '-0.5px',
              lineHeight: 1,
              fontFamily: '"Poppins", sans-serif',
              color: '#E2E8F0'
            }}
          >
            Hire<Box component="span" sx={{ color: ORANGE }}>IQ</Box>
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.68rem', mt: 0.25, display: 'block' }}>
            Intelligent Recruitment
          </Typography>
        </Box>
        {isMobile && (
          <IconButton size="small" onClick={() => setOpenDrawer(false)} sx={{ color: '#64748B' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, py: 1, overflow: 'auto' }}>
        {navSections.map((section, si) => (
          <Box key={si} mb={0.5}>
            <Typography variant="caption" sx={{
              px: 2.5, py: 0.75, display: 'block',
              color: '#334155', fontWeight: 700, fontSize: '0.6rem',
              letterSpacing: '0.1em', textTransform: 'uppercase'
            }}>
              {section.title}
            </Typography>
            <List sx={{ py: 0, px: 0 }}>
              {section.items.map((item) => {
                const active = isActive(item.path)
                return (
                  <ListItemButton
                    key={item.path}
                    selected={active}
                    onClick={() => {
                      navigate(item.path)
                      if (isMobile) setOpenDrawer(false)
                    }}
                    sx={{
                      mx: 1.5, mb: 0.25, px: 1.25, py: 0.75,
                      borderRadius: '8px', position: 'relative',
                      ...(active && {
                        '&::before': {
                          content: '""', position: 'absolute',
                          left: 0, top: '20%', height: '60%', width: 3,
                          borderRadius: '0 3px 3px 0', backgroundColor: ORANGE
                        }
                      })
                    }}
                  >
                    <ListItemIcon sx={{
                      minWidth: 32, color: active ? ORANGE : '#475569',
                      '& svg': { fontSize: '1.05rem' }
                    }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.label} primaryTypographyProps={{
                      fontSize: '0.82rem', fontWeight: active ? 600 : 400,
                      fontFamily: '"Poppins", sans-serif',
                      color: active ? '#FFFFFF' : '#94A3B8'
                    }} />
                  </ListItemButton>
                )
              })}
            </List>
            {si < navSections.length - 1 && (
              <Divider sx={{ borderColor: '#0D2035', mx: 2, mt: 0.75 }} />
            )}
          </Box>
        ))}
      </Box>

      {/* Bottom: User info */}
      <Box sx={{ borderTop: `1px solid ${NAVY_LT}`, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
          onClick={handleMenuOpen}>
          <Avatar
            sx={{
              width: 34, height: 34, fontSize: '0.8rem', fontWeight: 600,
              background: `linear-gradient(135deg, ${ORANGE} 0%, #4338CA 100%)`
            }}
          >
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.3, color: '#E2E8F0' }}>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.68rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#EEF0FF' }}>

      {/* ─── AppBar ─── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: NAVY,
          borderBottom: `1px solid ${NAVY_LT}`,
          width: { md: openDrawer ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          ml:    { md: openDrawer ? `${DRAWER_WIDTH}px` : 0 },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen
          })
        }}
      >
        <Toolbar sx={{ minHeight: '56px !important', px: 2 }}>
          <IconButton
            color="inherit"
            onClick={() => setOpenDrawer(v => !v)}
            sx={{ mr: 1.5, color: '#64748B', '&:hover': { color: ORANGE } }}
          >
            {openDrawer && !isMobile ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>

          {/* Current page title */}
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.95rem', color: '#E2E8F0' }}>
            {navItems.find(n => isActive(n.path))?.label ?? 'HireIQ'}
          </Typography>

          <Box sx={{ flex: 1 }} />

          {/* User avatar */}
          <Tooltip title="Account settings">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
              onClick={handleMenuOpen}>
              <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.2, color: '#E2E8F0' }}>
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.68rem' }}>
                  Administrator
                </Typography>
              </Box>
              <Avatar
                sx={{
                  width: 34, height: 34, fontSize: '0.8rem', fontWeight: 700,
                  background: `linear-gradient(135deg, ${ORANGE} 0%, #4338CA 100%)`
                }}
              >
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </Avatar>
            </Box>
          </Tooltip>

          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}
            PaperProps={{ sx: { bgcolor: NAVY, border: `1px solid ${NAVY_LT}`, minWidth: 160,
              '& .MuiMenuItem-root': { color: '#94A3B8', '&:hover': { color: '#E2E8F0', bgcolor: 'rgba(255,255,255,0.06)' } } } }}>
            <MenuItem onClick={() => { navigate('/settings'); handleMenuClose() }}
              sx={{ fontSize: '0.875rem', gap: 1 }}>
              <SettingsIcon sx={{ fontSize: '1rem', color: '#64748B' }} /> Settings
            </MenuItem>
            <Divider sx={{ borderColor: NAVY_LT }} />
            <MenuItem onClick={handleLogout} sx={{ fontSize: '0.875rem', gap: 1, color: ORANGE }}>
              <LogoutIcon sx={{ fontSize: '1rem' }} /> Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* ─── Sidebar (desktop permanent) ─── */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: openDrawer ? DRAWER_WIDTH : 0,
            flexShrink: 0,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen
            }),
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              bgcolor: NAVY,
              borderRight: `1px solid ${NAVY_LT}`,
              transform: openDrawer ? 'none' : `translateX(-${DRAWER_WIDTH}px)`,
              transition: theme.transitions.create('transform', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen
              }),
              overflow: 'hidden'
            }
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* ─── Mobile Drawer ─── */}
      {isMobile && (
        <Drawer
          anchor="left"
          open={openDrawer}
          onClose={() => setOpenDrawer(false)}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, bgcolor: NAVY } }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* ─── Main Content ─── */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,
        ml: { md: openDrawer ? 0 : `-${DRAWER_WIDTH}px` },
        transition: theme.transitions.create('margin', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen
        })
      }}>
        <Box sx={{
          flex: 1,
          overflow: 'auto',
          pt: '56px',
          bgcolor: '#EEF0FF'
        }}>
          <Container maxWidth="xl" sx={{ py: 3 }}>
            <Outlet />
          </Container>
        </Box>
      </Box>
    </Box>
  )
}

export default Layout
