'use client';

import { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  Chip,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  CloudUpload,
  Download,
  Close,
  CheckCircle,
  Error,
  FileDownload,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

interface CSVRow {
  [key: string]: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ImportHistory {
  id: string;
  date: string;
  fileName: string;
  total: number;
  success: number;
  failed: number;
  status: 'completed' | 'failed' | 'in_progress';
}

const REQUIRED_FIELDS = ['Name', 'Price', 'SKU'];
const OPTIONAL_FIELDS = ['Description', 'Stock', 'Category', 'Images'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function BulkUploadPage() {
  const _router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCSVHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<{ [key: string]: string }>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [skipErrors, setSkipErrors] = useState(true);
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'validating' | 'importing' | 'complete'>('idle');
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  
  const [importHistory] = useState<ImportHistory[]>([
    {
      id: '1',
      date: '2025-10-19 14:30',
      fileName: 'products_batch_1.csv',
      total: 150,
      success: 148,
      failed: 2,
      status: 'completed',
    },
    {
      id: '2',
      date: '2025-10-18 09:15',
      fileName: 'inventory_update.csv',
      total: 320,
      success: 320,
      failed: 0,
      status: 'completed',
    },
  ]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      handleFileSelect(droppedFile);
    } else {
      alert('Please upload a CSV file');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.size > MAX_FILE_SIZE) {
      alert('File size exceeds 10MB limit');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').filter(row => row.trim());
      
      if (rows.length > 0) {
        const headers = rows[0].split(',').map(h => h.trim());
        setCSVHeaders(headers);
        
        const data = rows.slice(1, 11).map(row => {
          const values = row.split(',');
          const rowData: CSVRow = {};
          headers.forEach((header, index) => {
            rowData[header] = values[index]?.trim() || '';
          });
          return rowData;
        });
        
        setCSVData(data);
        
        const mapping: { [key: string]: string } = {};
        [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].forEach(field => {
          const matchedHeader = headers.find(h => 
            h.toLowerCase() === field.toLowerCase() ||
            h.toLowerCase().includes(field.toLowerCase())
          );
          if (matchedHeader) {
            mapping[field] = matchedHeader;
          }
        });
        setColumnMapping(mapping);
        
        validateCSV(data, mapping);
      }
    };
    
    reader.readAsText(selectedFile);
  };

  const validateCSV = (data: CSVRow[], mapping: { [key: string]: string }) => {
    const errors: ValidationError[] = [];
    
    data.forEach((row, index) => {
      REQUIRED_FIELDS.forEach(field => {
        const mappedField = mapping[field];
        if (!mappedField || !row[mappedField]) {
          errors.push({
            row: index + 2,
            field,
            message: `Missing required field: ${field}`,
          });
        }
      });
      
      const priceField = mapping['Price'];
      if (priceField && row[priceField]) {
        const price = parseFloat(row[priceField]);
        if (isNaN(price) || price < 0) {
          errors.push({
            row: index + 2,
            field: 'Price',
            message: 'Invalid price value',
          });
        }
      }
      
      const stockField = mapping['Stock'];
      if (stockField && row[stockField]) {
        const stock = parseInt(row[stockField]);
        if (isNaN(stock) || stock < 0) {
          errors.push({
            row: index + 2,
            field: 'Stock',
            message: 'Invalid stock value',
          });
        }
      }
    });
    
    setValidationErrors(errors);
  };

  const handleImport = async () => {
    setImporting(true);
    setImportStatus('validating');
    setImportProgress(10);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    setImportProgress(30);
    
    setImportStatus('importing');
    
    for (let i = 30; i <= 90; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setImportProgress(i);
    }
    
    setImportProgress(100);
    setImportStatus('complete');
    
    const validRows = csvData.length - (skipErrors ? validationErrors.length : 0);
    setImportResult({
      success: validRows,
      failed: skipErrors ? validationErrors.length : 0,
    });
    
    setImporting(false);
  };

  const downloadTemplate = () => {
    const template = 'Name,Price,SKU,Description,Stock,Category,Images\n' +
      'Sample Product,29.99,SKU001,A sample product description,100,Electronics,https://example.com/image.jpg\n' +
      'Another Product,49.99,SKU002,Another description,50,Clothing,https://example.com/image2.jpg';
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'product_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadErrorLog = () => {
    const errorLog = validationErrors.map(error => 
      `Row ${error.row}: ${error.field} - ${error.message}`
    ).join('\n');
    
    const blob = new Blob([errorLog], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'import_errors.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const validProductsCount = csvData.length - validationErrors.filter(e => REQUIRED_FIELDS.includes(e.field)).length;

  return (
    <DashboardLayout title="Bulk Upload">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              Bulk CSV Upload
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Import products in bulk using CSV files
            </Typography>
          </Box>
          <Link href="/dashboard">
            <Button
              variant="outlined"
            >
              Back to Dashboard
            </Button>
          </Link>
        </Box>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Upload CSV File
          </Typography>
          
          <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              border: '2px dashed',
              borderColor: isDragging ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              bgcolor: isDragging ? 'action.hover' : 'background.default',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              style={{ display: 'none' }}
              id="csv-file-input"
              data-testid="input-file-upload"
            />
            <label htmlFor="csv-file-input">
              <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {file ? file.name : 'Drag & drop CSV file here'}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                or click to browse (Maximum file size: 10MB)
              </Typography>
              <Button variant="contained" component="span">
                Choose File
              </Button>
            </label>
          </Box>

          <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              startIcon={<Download />}
              onClick={downloadTemplate}
              data-testid="button-download-template"
            >
              Download Sample Template
            </Button>
            <Typography variant="caption" color="text.secondary">
              Required fields: Name, Price, SKU
            </Typography>
          </Box>
        </Paper>

        {csvData.length > 0 && (
          <>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                CSV Preview (First 10 rows)
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Column Mapping
                </Typography>
                <Grid container spacing={2}>
                  {[...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map(field => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={field}>
                      <FormControl fullWidth size="small">
                        <InputLabel>{field} {REQUIRED_FIELDS.includes(field) && '*'}</InputLabel>
                        <Select
                          value={columnMapping[field] || ''}
                          label={`${field} ${REQUIRED_FIELDS.includes(field) ? '*' : ''}`}
                          onChange={(e) => {
                            setColumnMapping({
                              ...columnMapping,
                              [field]: e.target.value,
                            });
                            validateCSV(csvData, {
                              ...columnMapping,
                              [field]: e.target.value,
                            });
                          }}
                        >
                          <MenuItem value="">
                            <em>Not mapped</em>
                          </MenuItem>
                          {csvHeaders.map(header => (
                            <MenuItem key={header} value={header}>
                              {header}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small" data-testid="table-csv-preview">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      {csvHeaders.map((header, index) => (
                        <TableCell key={index}>{header}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {csvData.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        <TableCell>{rowIndex + 2}</TableCell>
                        {csvHeaders.map((header, colIndex) => (
                          <TableCell key={colIndex}>{row[header]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {validationErrors.length > 0 && (
                <Alert
                  severity="warning"
                  sx={{ mt: 2 }}
                  action={
                    <Button size="small" onClick={() => setShowErrorDialog(true)}>
                      View Details
                    </Button>
                  }
                >
                  {validationErrors.length} validation error(s) found
                </Alert>
              )}
            </Paper>

            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Import Settings
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={updateExisting}
                      onChange={(e) => setUpdateExisting(e.target.checked)}
                    />
                  }
                  label="Update existing products (match by SKU)"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={skipErrors}
                      onChange={(e) => setSkipErrors(e.target.checked)}
                    />
                  }
                  label="Skip products with errors"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={publishImmediately}
                      onChange={(e) => setPublishImmediately(e.target.checked)}
                    />
                  }
                  label="Publish immediately"
                />
              </Box>
            </Paper>

            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Import Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        Total Rows
                      </Typography>
                      <Typography variant="h4">{csvData.length}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        Valid Products
                      </Typography>
                      <Typography variant="h4" color="success.main">
                        {validProductsCount}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        Invalid Products
                      </Typography>
                      <Typography variant="h4" color="error.main">
                        {validationErrors.filter(e => REQUIRED_FIELDS.includes(e.field)).length}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        Estimated Time
                      </Typography>
                      <Typography variant="h4">~{Math.ceil(csvData.length / 10)}s</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleImport}
                  disabled={importing || validProductsCount === 0}
                  data-testid="button-start-import"
                >
                  Start Import
                </Button>
              </Box>
            </Paper>

            {importing && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Import Progress
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={importProgress}
                    sx={{ height: 10, borderRadius: 5 }}
                    data-testid="progress-import"
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {importStatus === 'validating' && 'Validating...'}
                      {importStatus === 'importing' && 'Importing...'}
                      {importStatus === 'complete' && 'Complete!'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {importProgress}%
                    </Typography>
                  </Box>
                </Box>

                {importResult && (
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Chip
                      icon={<CheckCircle />}
                      label={`Success: ${importResult.success}`}
                      color="success"
                    />
                    <Chip
                      icon={<Error />}
                      label={`Failed: ${importResult.failed}`}
                      color="error"
                    />
                    {importResult.failed > 0 && (
                      <Button
                        size="small"
                        startIcon={<FileDownload />}
                        onClick={downloadErrorLog}
                      >
                        Download Error Log
                      </Button>
                    )}
                  </Box>
                )}
              </Paper>
            )}
          </>
        )}

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Import History
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>File Name</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Success</TableCell>
                  <TableCell align="right">Failed</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {importHistory.map((history) => (
                  <TableRow key={history.id}>
                    <TableCell>{history.date}</TableCell>
                    <TableCell>{history.fileName}</TableCell>
                    <TableCell align="right">{history.total}</TableCell>
                    <TableCell align="right">{history.success}</TableCell>
                    <TableCell align="right">{history.failed}</TableCell>
                    <TableCell>
                      <Chip
                        label={history.status}
                        color={
                          history.status === 'completed'
                            ? 'success'
                            : history.status === 'failed'
                            ? 'error'
                            : 'default'
                        }
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Dialog
          open={showErrorDialog}
          onClose={() => setShowErrorDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Validation Errors
            <IconButton
              onClick={() => setShowErrorDialog(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Row</TableCell>
                    <TableCell>Field</TableCell>
                    <TableCell>Error</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validationErrors.map((error, index) => (
                    <TableRow key={index}>
                      <TableCell>{error.row}</TableCell>
                      <TableCell>{error.field}</TableCell>
                      <TableCell>{error.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={downloadErrorLog} startIcon={<FileDownload />}>
              Download Error Log
            </Button>
            <Button onClick={() => setShowErrorDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </DashboardLayout>
  );
}
