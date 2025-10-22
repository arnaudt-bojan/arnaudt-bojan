'use client';

import {
  DataGrid,
  GridColDef,
  GridRowSelectionModel,
} from '@mui/x-data-grid';

interface CampaignListTableProps {
  campaigns: any[];
  columns: GridColDef[];
  loading?: boolean;
  onRowSelectionChange?: (selection: GridRowSelectionModel) => void;
  testId?: string;
}

export default function CampaignListTable({
  campaigns,
  columns,
  loading = false,
  onRowSelectionChange,
  testId = 'table-campaigns',
}: CampaignListTableProps) {
  return (
    <div style={{ height: 600, width: '100%' }} data-testid={testId}>
      <DataGrid
        rows={campaigns}
        columns={columns}
        loading={loading}
        checkboxSelection
        onRowSelectionModelChange={onRowSelectionChange}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 10 },
          },
        }}
        pageSizeOptions={[10, 25, 50]}
        disableRowSelectionOnClick
      />
    </div>
  );
}
