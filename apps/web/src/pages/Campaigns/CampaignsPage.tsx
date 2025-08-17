import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import {
  Add,
  PlayArrow,
  Pause,
  Stop,
  Edit,
  Delete,
  Visibility,
  FilterList,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchCampaigns, startCampaign, pauseCampaign, stopCampaign } from '../../store/slices/campaignsSlice';
import { Campaign } from '../../store/slices/campaignsSlice';

const statusColors = {
  draft: 'default',
  scheduled: 'info',
  active: 'success',
  paused: 'warning',
  completed: 'success',
  failed: 'error',
};

const priorityColors = {
  low: 'default',
  normal: 'info',
  high: 'warning',
  urgent: 'error',
};

export const CampaignsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { campaigns, loading, pagination } = useSelector((state: RootState) => state.campaigns);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    dispatch(fetchCampaigns());
  }, [dispatch]);

  const handleCreateCampaign = () => {
    setDialogMode('create');
    setSelectedCampaign(null);
    setOpenDialog(true);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setDialogMode('edit');
    setSelectedCampaign(campaign);
    setOpenDialog(true);
  };

  const handleStartCampaign = (id: string) => {
    dispatch(startCampaign(id));
  };

  const handlePauseCampaign = (id: string) => {
    dispatch(pauseCampaign(id));
  };

  const handleStopCampaign = (id: string) => {
    dispatch(stopCampaign(id));
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Campaign Name',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={statusColors[params.value as keyof typeof statusColors] as any}
          size="small"
        />
      ),
    },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={priorityColors[params.value as keyof typeof priorityColors] as any}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'scheduledAt',
      headerName: 'Scheduled',
      width: 150,
      valueFormatter: (params) => {
        if (!params.value) return 'Not scheduled';
        return new Date(params.value).toLocaleDateString();
      },
    },
    {
      field: 'metrics',
      headerName: 'Performance',
      width: 200,
      renderCell: (params) => {
        const metrics = params.value || {};
        return (
          <Box>
            <Typography variant="caption" display="block">
              Sent: {metrics.sent || 0}
            </Typography>
            <Typography variant="caption" display="block">
              Open: {metrics.openRate || 0}%
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 200,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<Visibility />}
          label="View"
          onClick={() => handleEditCampaign(params.row)}
        />,
        <GridActionsCellItem
          icon={<Edit />}
          label="Edit"
          onClick={() => handleEditCampaign(params.row)}
        />,
        <GridActionsCellItem
          icon={<PlayArrow />}
          label="Start"
          onClick={() => handleStartCampaign(params.row.id)}
          disabled={params.row.status !== 'draft' && params.row.status !== 'paused'}
        />,
        <GridActionsCellItem
          icon={<Pause />}
          label="Pause"
          onClick={() => handlePauseCampaign(params.row.id)}
          disabled={params.row.status !== 'active'}
        />,
        <GridActionsCellItem
          icon={<Stop />}
          label="Stop"
          onClick={() => handleStopCampaign(params.row.id)}
          disabled={params.row.status === 'completed' || params.row.status === 'failed'}
        />,
      ],
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Campaigns
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
          >
            Filters
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateCampaign}
          >
            Create Campaign
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Campaigns
              </Typography>
              <Typography variant="h4">
                {campaigns.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Campaigns
              </Typography>
              <Typography variant="h4">
                {campaigns.filter(c => c.status === 'active').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Draft Campaigns
              </Typography>
              <Typography variant="h4">
                {campaigns.filter(c => c.status === 'draft').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h4">
                {campaigns.filter(c => c.status === 'completed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Campaigns Data Grid */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <DataGrid
            rows={campaigns}
            columns={columns}
            loading={loading}
            autoHeight
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 10 },
              },
            }}
            sx={{
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid #f0f0f0',
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#fafafa',
                borderBottom: '2px solid #e0e0e0',
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Campaign Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Create New Campaign' : 'Edit Campaign'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Campaign Name"
                defaultValue={selectedCampaign?.name || ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Campaign Type</InputLabel>
                <Select label="Campaign Type" defaultValue={selectedCampaign?.type || 'single_email'}>
                  <MenuItem value="single_email">Single Email</MenuItem>
                  <MenuItem value="sequence">Email Sequence</MenuItem>
                  <MenuItem value="drip">Drip Campaign</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                defaultValue={selectedCampaign?.description || ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select label="Priority" defaultValue={selectedCampaign?.priority || 'normal'}>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Scheduled Date"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                defaultValue={selectedCampaign?.scheduledAt || ''}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained">
            {dialogMode === 'create' ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
