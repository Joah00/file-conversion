import React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
} from '@mui/material';

function DOGRTableComponent({
  columns,
  data,
  onRowClick = () => {},
  pagination = false,
  maxHeight = 440, 
  minHeight = 300,
  customRender = false
}) {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = event => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const emptyRows =
    rowsPerPage - Math.min(rowsPerPage, data.length - page * rowsPerPage);

  return (
    <Paper
      sx={{
        width: '100%',
        overflow: 'hidden',
        background: '#293846',
        color: 'white', 
      }}
    >
      <TableContainer sx={{ maxHeight: maxHeight, minHeight: minHeight }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  style={{
                    minWidth: column.minWidth || 170,
                    backgroundColor: '#1e3547',
                    color: 'white',
                  }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {(rowsPerPage > 0
              ? data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              : data
            ).map((row, index) => (
              <TableRow
                hover
                key={row.id || index}
                onClick={() => onRowClick(row)}
                sx={{
                  '&:last-child td, &:last-child th': { border: 0 },
                  '&:hover': { backgroundColor: '#1ab394' },
                  cursor: 'pointer',
                }}
              >
                {columns.map((column) => (
                  <TableCell key={column.id} align={column.align || 'left'}
                    sx={{
                      background: '#293846',
                      color: column.id === 'status'
                        ? (row.status === "Converted"
                            ? '#1ab394'
                            : row.status === "New"
                            ? '#f0ad4e'
                            : '#d9534f')
                        : 'white', 
                      borderColor: '#4c5b5b',
                    }}
                  >
                    {customRender && column.renderCell ? column.renderCell(row) : row[column.id]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {emptyRows > 0 && (
              <TableRow style={{ height: 53 * emptyRows }}>
                <TableCell colSpan={6} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {pagination && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={data.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ color: 'white' }}
        />
      )}
    </Paper>
  );
}

export default DOGRTableComponent;
