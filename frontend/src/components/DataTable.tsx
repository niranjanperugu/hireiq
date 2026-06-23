import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  CircularProgress,
  Box,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  Typography
} from '@mui/material'
import { MoreVert as MoreVertIcon } from '@mui/icons-material'

export interface Column<T> {
  id: keyof T
  label: string
  minWidth?: number
  align?: 'left' | 'right' | 'center'
  format?: (value: any) => string | React.ReactNode
  sortable?: boolean
}

interface Action<T> {
  label: string
  icon?: React.ReactNode
  onClick: (row: T) => void
  color?: 'inherit' | 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[]
  rows: T[]
  loading?: boolean
  pagination?: {
    page: number
    size: number
    totalElements: number
    totalPages: number
  }
  onPageChange?: (page: number, size: number) => void
  actions?: Action<T>[]
  onRowClick?: (row: T) => void
  selectable?: boolean
  onSelectionChange?: (selectedIds: string[]) => void
  emptyMessage?: string
}

const DataTable = React.forwardRef<HTMLDivElement, DataTableProps<any>>(
  ({
    columns,
    rows,
    loading = false,
    pagination,
    onPageChange,
    actions,
    onRowClick,
    selectable = false,
    onSelectionChange,
    emptyMessage = 'No data found'
  }, ref) => {
    const [page, setPage] = React.useState(pagination?.page || 0)
    const [rowsPerPage, setRowsPerPage] = React.useState(pagination?.size || 10)
    const [selectedIds, setSelectedIds] = React.useState<string[]>([])
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
    const [currentRow, setCurrentRow] = React.useState<any>(null)

    const handlePageChange = (event: unknown, newPage: number) => {
      setPage(newPage)
      onPageChange?.(newPage, rowsPerPage)
    }

    const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setRowsPerPage(parseInt(event.target.value, 10))
      setPage(0)
      onPageChange?.(0, parseInt(event.target.value, 10))
    }

    const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.checked) {
        const newSelected = rows.map(row => row.id)
        setSelectedIds(newSelected)
        onSelectionChange?.(newSelected)
      } else {
        setSelectedIds([])
        onSelectionChange?.([])
      }
    }

    const handleSelectRow = (id: string) => {
      const newSelected = selectedIds.includes(id)
        ? selectedIds.filter(sid => sid !== id)
        : [...selectedIds, id]
      setSelectedIds(newSelected)
      onSelectionChange?.(newSelected)
    }

    const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, row: any) => {
      event.stopPropagation()
      setAnchorEl(event.currentTarget)
      setCurrentRow(row)
    }

    const handleActionMenuClose = () => {
      setAnchorEl(null)
      setCurrentRow(null)
    }

    const handleActionClick = (action: Action<any>) => {
      action.onClick(currentRow)
      handleActionMenuClose()
    }

    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      )
    }

    if (rows.length === 0) {
      return (
        <Paper ref={ref} sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">
            {emptyMessage}
          </Typography>
        </Paper>
      )
    }

    return (
      <Paper ref={ref} sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table stickyHeader aria-label="sticky table">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                {selectable && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedIds.length > 0 && selectedIds.length < rows.length}
                      checked={selectedIds.length === rows.length && rows.length > 0}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                )}
                {columns.map(column => (
                  <TableCell
                    key={String(column.id)}
                    align={column.align || 'left'}
                    style={{ minWidth: column.minWidth }}
                    sx={{ fontWeight: 600 }}
                  >
                    {column.label}
                  </TableCell>
                ))}
                {actions && actions.length > 0 && (
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    Actions
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(row => (
                <TableRow
                  key={row.id}
                  hover
                  onClick={() => onRowClick?.(row)}
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    backgroundColor: selectedIds.includes(row.id) ? '#f0f0f0' : 'transparent'
                  }}
                >
                  {selectable && (
                    <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                      />
                    </TableCell>
                  )}
                  {columns.map(column => {
                    const value = row[column.id]
                    return (
                      <TableCell
                        key={String(column.id)}
                        align={column.align || 'left'}
                      >
                        {column.format ? column.format(value) : value}
                      </TableCell>
                    )
                  })}
                  {actions && actions.length > 0 && (
                    <TableCell align="center" onClick={e => e.stopPropagation()}>
                      <IconButton
                        size="small"
                        onClick={e => handleActionMenuOpen(e, row)}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 100]}
          component="div"
          count={pagination?.totalElements || rows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleActionMenuClose}
        >
          {actions?.map((action, index) => (
            <MenuItem key={index} onClick={() => handleActionClick(action)}>
              {action.label}
            </MenuItem>
          ))}
        </Menu>
      </Paper>
    )
  }
)

DataTable.displayName = 'DataTable'

export default DataTable
