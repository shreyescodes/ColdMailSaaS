import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { campaignsAPI } from '../../services/api';

export interface Campaign {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  organizationId: string;
  createdByUserId: string;
  assignedUserId?: string;
  primaryMailboxId?: string;
  config: any;
  sequence: any;
  targeting: any;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  sendingConfig: any;
  limits: any;
  abTesting: any;
  settings: any;
  progress: any;
  metrics: any;
  isActive: boolean;
  notes?: string;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

interface CampaignsState {
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  loading: boolean;
  error: string | null;
  filters: {
    status: string[];
    type: string[];
    priority: string[];
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

const initialState: CampaignsState = {
  campaigns: [],
  currentCampaign: null,
  loading: false,
  error: null,
  filters: {
    status: [],
    type: [],
    priority: [],
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
  },
};

// Async thunks
export const fetchCampaigns = createAsyncThunk(
  'campaigns/fetchCampaigns',
  async (params?: any) => {
    const response = await campaignsAPI.getAll(params);
    return response.data;
  }
);

export const fetchCampaignById = createAsyncThunk(
  'campaigns/fetchCampaignById',
  async (id: string) => {
    const response = await campaignsAPI.getById(id);
    return response.data;
  }
);

export const createCampaign = createAsyncThunk(
  'campaigns/createCampaign',
  async (campaignData: Partial<Campaign>) => {
    const response = await campaignsAPI.create(campaignData);
    return response.data;
  }
);

export const updateCampaign = createAsyncThunk(
  'campaigns/updateCampaign',
  async ({ id, data }: { id: string; data: Partial<Campaign> }) => {
    const response = await campaignsAPI.update(id, data);
    return response.data;
  }
);

export const deleteCampaign = createAsyncThunk(
  'campaigns/deleteCampaign',
  async (id: string) => {
    await campaignsAPI.delete(id);
    return id;
  }
);

export const startCampaign = createAsyncThunk(
  'campaigns/startCampaign',
  async (id: string) => {
    const response = await campaignsAPI.start(id);
    return response.data;
  }
);

export const pauseCampaign = createAsyncThunk(
  'campaigns/pauseCampaign',
  async (id: string) => {
    const response = await campaignsAPI.pause(id);
    return response.data;
  }
);

export const stopCampaign = createAsyncThunk(
  'campaigns/stopCampaign',
  async (id: string) => {
    const response = await campaignsAPI.stop(id);
    return response.data;
  }
);

const campaignsSlice = createSlice({
  name: 'campaigns',
  initialState,
  reducers: {
    setCurrentCampaign: (state, action: PayloadAction<Campaign | null>) => {
      state.currentCampaign = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<CampaignsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPagination: (state, action: PayloadAction<Partial<CampaignsState['pagination']>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch campaigns
      .addCase(fetchCampaigns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCampaigns.fulfilled, (state, action) => {
        state.loading = false;
        state.campaigns = action.payload.campaigns || action.payload;
        state.pagination.total = action.payload.total || action.payload.length;
      })
      .addCase(fetchCampaigns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch campaigns';
      })
      // Fetch campaign by ID
      .addCase(fetchCampaignById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCampaignById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCampaign = action.payload;
      })
      .addCase(fetchCampaignById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch campaign';
      })
      // Create campaign
      .addCase(createCampaign.fulfilled, (state, action) => {
        state.campaigns.unshift(action.payload);
        state.currentCampaign = action.payload;
      })
      // Update campaign
      .addCase(updateCampaign.fulfilled, (state, action) => {
        const index = state.campaigns.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.campaigns[index] = action.payload;
        }
        if (state.currentCampaign?.id === action.payload.id) {
          state.currentCampaign = action.payload;
        }
      })
      // Delete campaign
      .addCase(deleteCampaign.fulfilled, (state, action) => {
        state.campaigns = state.campaigns.filter(c => c.id !== action.payload);
        if (state.currentCampaign?.id === action.payload) {
          state.currentCampaign = null;
        }
      })
      // Start campaign
      .addCase(startCampaign.fulfilled, (state, action) => {
        const index = state.campaigns.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.campaigns[index] = action.payload;
        }
        if (state.currentCampaign?.id === action.payload.id) {
          state.currentCampaign = action.payload;
        }
      })
      // Pause campaign
      .addCase(pauseCampaign.fulfilled, (state, action) => {
        const index = state.campaigns.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.campaigns[index] = action.payload;
        }
        if (state.currentCampaign?.id === action.payload.id) {
          state.currentCampaign = action.payload;
        }
      })
      // Stop campaign
      .addCase(stopCampaign.fulfilled, (state, action) => {
        const index = state.campaigns.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.campaigns[index] = action.payload;
        }
        if (state.currentCampaign?.id === action.payload.id) {
          state.currentCampaign = action.payload;
        }
      });
  },
});

export const { setCurrentCampaign, setFilters, setPagination, clearError } = campaignsSlice.actions;
export default campaignsSlice.reducer;
