import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DataTable, { Column } from '@components/DataTable'

describe('DataTable Component', () => {
  interface TestRow {
    id: string
    name: string
    email: string
    status: string
  }

  const mockRows: TestRow[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', status: 'Active' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'Active' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', status: 'Inactive' }
  ]

  const mockColumns: Column<TestRow>[] = [
    { id: 'name', label: 'Name', minWidth: 170 },
    { id: 'email', label: 'Email', minWidth: 200 },
    { id: 'status', label: 'Status', minWidth: 100 }
  ]

  const mockPagination = {
    page: 0,
    size: 10,
    totalElements: 3,
    totalPages: 1
  }

  const mockOnPageChange = vi.fn()
  const mockOnRowClick = vi.fn()

  const renderDataTable = (props: any = {}) => {
    const defaultProps = {
      columns: mockColumns,
      rows: mockRows,
      pagination: mockPagination,
      onPageChange: mockOnPageChange,
      onRowClick: mockOnRowClick,
      loading: false,
      selectable: false
    }

    return render(<DataTable<TestRow> {...defaultProps} {...props} />)
  }

  it('should render table with all rows', () => {
    renderDataTable()

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
  })

  it('should render column headers', () => {
    renderDataTable()

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('should handle row click', () => {
    renderDataTable()

    const firstRow = screen.getByText('John Doe')
    fireEvent.click(firstRow)

    expect(mockOnRowClick).toHaveBeenCalledWith(mockRows[0])
  })

  it('should display loading spinner', () => {
    renderDataTable({ loading: true })

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should display empty message', () => {
    renderDataTable({ rows: [], emptyMessage: 'No data found' })

    expect(screen.getByText('No data found')).toBeInTheDocument()
  })

  it('should show pagination info', () => {
    renderDataTable()

    expect(screen.getByText(/1–3 of 3/)).toBeInTheDocument()
  })

  it('should handle selectable rows', () => {
    renderDataTable({ selectable: true })

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThan(0)
  })

  it('should display actions menu when actions provided', () => {
    const mockActions = [
      { label: 'Edit', onClick: vi.fn() },
      { label: 'Delete', onClick: vi.fn(), color: 'error' as const }
    ]

    renderDataTable({ actions: mockActions })

    // Action menu button should be present
    const actionButtons = screen.getAllByRole('button')
    expect(actionButtons.length).toBeGreaterThan(0)
  })
})
